/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Persistência e Gerenciamento do Catálogo SINAPI em localStorage
 * Unifica o catálogo de referência embutido com itens importados pelo usuário
 */

import { SinapiCatalogItem, SinapiImportMetadata } from '@/types/sinapi'
import { SINAPI_REFERENCE_DATASET } from '@/data/sinapiReferenceCatalog'

export const STORAGE_KEYS_SINAPI = {
  CATALOG_CUSTOM: 'conce_sinapi_custom_items',
  IMPORT_METADATA: 'conce_sinapi_import_metadata',
  API_KEY: 'conce_orcamentador_api_key',
  LAST_SYNC_CONFIG: 'conce_orcamentador_sync_config',
  AUTOSINAPI_BASE_URL: 'conce_autosinapi_base_url',
  AUTOSINAPI_API_KEY: 'conce_autosinapi_api_key',
  AUTOSINAPI_SYNC_CONFIG: 'conce_autosinapi_sync_config',
} as const

/**
 * Lê itens customizados/importados pelo usuário
 */
export function getCustomSinapiItems(): SinapiCatalogItem[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEYS_SINAPI.CATALOG_CUSTOM)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Salva itens customizados/importados pelo usuário
 */
export function saveCustomSinapiItems(items: SinapiCatalogItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS_SINAPI.CATALOG_CUSTOM, JSON.stringify(items))
}

/**
 * Obtém os metadados da última importação realizada pelo usuário
 */
export function getSinapiImportMetadata(): SinapiImportMetadata | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEYS_SINAPI.IMPORT_METADATA)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Salva metadados da importação realizada
 */
export function saveSinapiImportMetadata(meta: SinapiImportMetadata): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS_SINAPI.IMPORT_METADATA, JSON.stringify(meta))
}

/**
 * Retorna o catálogo SINAPI consolidado:
 * Itens importados pelo usuário têm precedência sobre os itens de referência embutidos com o mesmo código.
 */
export function getConsolidatedSinapiCatalog(): SinapiCatalogItem[] {
  const customItems = getCustomSinapiItems()
  const customMap = new Map<string, SinapiCatalogItem>()

  for (const item of customItems) {
    const key = (item.code || '').trim().toUpperCase()
    if (key) customMap.set(key, item)
  }

  // Percorre o dataset de referência; se o usuário importou esse mesmo código, usa a versão do usuário
  const result: SinapiCatalogItem[] = []
  const seenCodes = new Set<string>()

  for (const refItem of SINAPI_REFERENCE_DATASET) {
    const key = (refItem.code || '').trim().toUpperCase()
    if (customMap.has(key)) {
      result.push(customMap.get(key)!)
      seenCodes.add(key)
    } else {
      result.push(refItem)
      seenCodes.add(key)
    }
  }

  // Adiciona itens novos trazidos pelo usuário que não estavam no dataset original
  for (const [key, item] of customMap.entries()) {
    if (!seenCodes.has(key)) {
      result.push(item)
      seenCodes.add(key)
    }
  }

  return result
}

/**
 * Mescla uma lista de itens importados com os customizados já existentes.
 * Atualiza por código sem apagar.
 */
export function mergeImportedSinapiItems(
  newItems: SinapiCatalogItem[],
  metadata: {
    referenceMonth: string
    referenceState: string
    fileName?: string
    priceOrigin?: 'importada_usuario' | 'api_orcamentador' | 'api_autosinapi'
    sourceType?: 'manual_import' | 'api_orcamentador' | 'api_autosinapi'
    syncedPages?: number
    lastSyncDurationMs?: number
  },
): { updatedCount: number; createdCount: number; totalCount: number } {
  const existing = getCustomSinapiItems()
  const existingMap = new Map<string, SinapiCatalogItem>()

  for (const item of existing) {
    const key = (item.code || '').trim().toUpperCase()
    if (key) existingMap.set(key, item)
  }

  let updatedCount = 0
  let createdCount = 0
  const chosenOrigin = metadata.priceOrigin || 'importada_usuario'

  for (const item of newItems) {
    const key = (item.code || '').trim().toUpperCase()
    if (!key) continue

    if (existingMap.has(key)) {
      updatedCount++
      const prev = existingMap.get(key)!
      existingMap.set(key, {
        ...prev,
        ...item,
        priceOrigin: chosenOrigin,
        referenceMonth: metadata.referenceMonth || prev.referenceMonth,
        referenceState: metadata.referenceState || prev.referenceState,
      })
    } else {
      createdCount++
      existingMap.set(key, {
        ...item,
        priceOrigin: chosenOrigin,
        referenceMonth: metadata.referenceMonth,
        referenceState: metadata.referenceState,
      })
    }
  }

  const mergedList = Array.from(existingMap.values())
  saveCustomSinapiItems(mergedList)

  const meta: SinapiImportMetadata = {
    importedAt: new Date().toISOString(),
    referenceMonth: metadata.referenceMonth,
    referenceState: metadata.referenceState,
    itemsCount: newItems.length,
    updatedCount,
    createdCount,
    fileName: metadata.fileName,
    sourceType:
      metadata.sourceType ||
      (chosenOrigin === 'api_autosinapi'
        ? 'api_autosinapi'
        : chosenOrigin === 'api_orcamentador'
          ? 'api_orcamentador'
          : 'manual_import'),
    syncedPages: metadata.syncedPages,
    lastSyncDurationMs: metadata.lastSyncDurationMs,
  }
  saveSinapiImportMetadata(meta)

  return {
    updatedCount,
    createdCount,
    totalCount: mergedList.length,
  }
}

/**
 * Armazena a API Key do Orçamentador no localStorage
 */
export function getStoredOrcamentadorApiKey(): string {
  if (typeof window === 'undefined') return ''
  return (
    localStorage.getItem(STORAGE_KEYS_SINAPI.API_KEY) ||
    (import.meta as any).env?.VITE_ORCAMENTADOR_API_KEY ||
    ''
  ).trim()
}

export function saveStoredOrcamentadorApiKey(key: string): void {
  if (typeof window === 'undefined') return
  if (!key.trim()) {
    localStorage.removeItem(STORAGE_KEYS_SINAPI.API_KEY)
  } else {
    localStorage.setItem(STORAGE_KEYS_SINAPI.API_KEY, key.trim())
  }
}

/**
 * Persistência para URL base e chave da autoSINAPI API (github.com/LAMP-LUCAS/autoSINAPI_API)
 */
export function getStoredAutosinapiBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8000'
  return (
    localStorage.getItem(STORAGE_KEYS_SINAPI.AUTOSINAPI_BASE_URL) ||
    (import.meta as any).env?.VITE_AUTOSINAPI_BASE_URL ||
    'http://localhost:8000'
  ).trim()
}

export function saveStoredAutosinapiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return
  const clean = url.trim().replace(/\/+$/, '')
  if (!clean) {
    localStorage.removeItem(STORAGE_KEYS_SINAPI.AUTOSINAPI_BASE_URL)
  } else {
    localStorage.setItem(STORAGE_KEYS_SINAPI.AUTOSINAPI_BASE_URL, clean)
  }
}

export function getStoredAutosinapiApiKey(): string {
  if (typeof window === 'undefined') return ''
  return (
    localStorage.getItem(STORAGE_KEYS_SINAPI.AUTOSINAPI_API_KEY) ||
    (import.meta as any).env?.VITE_AUTOSINAPI_API_KEY ||
    ''
  ).trim()
}

export function saveStoredAutosinapiApiKey(key: string): void {
  if (typeof window === 'undefined') return
  if (!key.trim()) {
    localStorage.removeItem(STORAGE_KEYS_SINAPI.AUTOSINAPI_API_KEY)
  } else {
    localStorage.setItem(STORAGE_KEYS_SINAPI.AUTOSINAPI_API_KEY, key.trim())
  }
}

/**
 * Remove itens customizados e restaura o catálogo para os valores de referência embutidos
 */
export function resetSinapiCatalogToDefaults(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS_SINAPI.CATALOG_CUSTOM)
  localStorage.removeItem(STORAGE_KEYS_SINAPI.IMPORT_METADATA)
}
