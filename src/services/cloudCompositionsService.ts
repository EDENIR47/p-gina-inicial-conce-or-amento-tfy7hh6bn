/**
 * CONCE — Composições no Skip Cloud (coleção "composicoes")
 *
 * A Biblioteca de Composições é um recurso COMPARTILHADO da empresa:
 * todo usuário logado VÊ e USA (importa em orçamentos) TODAS as
 * composições, independentemente de quem criou (regras API liberadas
 * pela migração 0026). Update/delete continua restrito ao dono.
 */

import pb from '@/lib/pocketbase/client'
import { CONCE_CANONICAL_COMPOSITIONS } from '@/lib/compositionsData'
import { getStoredCompositions, saveStoredCompositions } from '@/lib/budgetsStorage'
import type { BudgetComposition } from '@/types/budgetEngine'

interface CloudComposicaoRecord {
  id: string
  user: string
  code: string
  description: string
  specialty?: string
  unit?: string
  source?: string
  version?: string
  inputs?: unknown
  local_id?: string
  updated?: string
}

const OWNER_NAME_FALLBACK = 'Equipe CONCE'

/**
 * Nome amigável do criador: resolve em lote os usuários citados nas
 * composições do cloud (1 consulta por usuário distinto, com cache).
 */
export interface CreatorInfo {
  id: string
  name: string
}

const creatorCache = new Map<string, string>()

export async function fetchCreatorsInfo(userIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const missing: string[] = []

  for (const id of userIds) {
    if (!id) continue
    const cached = creatorCache.get(id)
    if (cached) result.set(id, cached)
    else missing.push(id)
  }

  // Consulta em lote por OR (a coleção users já é listável entre autenticados)
  if (missing.length > 0) {
    const filter = missing.map((id) => `id="${id}"`).join(' || ')
    try {
      const records = await pb.collection('users').getList(1, 100, {
        filter,
        fields: 'id,name',
      })
      for (const rec of records.items) {
        const name = (rec as any).name?.trim() || (rec as any).email || OWNER_NAME_FALLBACK
        creatorCache.set(rec.id, name)
        result.set(rec.id, name)
      }
    } catch {
      /* silencioso: UI mostra fallback */
    }
  }

  for (const id of userIds) {
    if (id && !result.has(id)) result.set(id, OWNER_NAME_FALLBACK)
  }
  return result
}

/**
 * Converte um registro do cloud em BudgetComposition da UI.
 * Marca createdByUserId (quem criou) e createdByUserName (resolvido quando possível).
 */
export function cloudRecordToComposition(
  rec: CloudComposicaoRecord,
  creatorName?: string,
): BudgetComposition {
  const comp: BudgetComposition & {
    createdByUserId?: string
    createdByUserName?: string
    updatedAt?: string
  } = {
    id: rec.id,
    code: rec.code || '',
    description: rec.description || '',
    specialty: rec.specialty || 'Serviços Preliminares',
    unit: rec.unit || 'un',
    source: (rec.source as BudgetComposition['source']) || 'CONCE',
    version: rec.version || 'v1.0',
    inputs: Array.isArray(rec.inputs) ? (rec.inputs as BudgetComposition['inputs']) : [],
    createdByUserId: rec.user,
    createdByUserName: creatorName,
    updatedAt: rec.updated,
  }
  return comp
}

/**
 * Converte uma composição da UI no payload do cloud (coleção composicoes).
 * O campo user (dono) é obrigatório na coleção.
 */
export function compositionToCloudPayload(comp: any, ownerId: string) {
  return {
    user: ownerId,
    code: comp.code || '',
    description: comp.description || '',
    specialty: comp.specialty || '',
    unit: comp.unit || '',
    source: comp.source || 'CONCE',
    version: comp.version || 'v1.0',
    inputs: comp.inputs || [],
    local_id: comp.local_id || comp.id || '',
  }
}

/**
 * Busca TODAS as composições do cloud (de todos os usuários) e mescla com a
 * biblioteca local. Composição do cloud vence por versão/updatedAt; composições
 * locais que não existem no cloud são preservadas (e o chamador pode subi-las).
 */
export async function fetchAndMergeSharedCompositions(): Promise<{
  merged: any[]
  cloudOnly: any[]
}> {
  const local = getStoredCompositions() as any[]
  let cloudRecords: CloudComposicaoRecord[] = []

  // Busca TODAS as páginas do cloud (de todos os usuários, sem filtro por dono).
  // Paginação manual: nunca corta a lista em uma página única.
  try {
    const perPage = 200
    let page = 1
    let totalPages = 1
    const all: CloudComposicaoRecord[] = []
    do {
      const res = await pb.collection('composicoes').getList(page, perPage, {
        sort: '-updated',
      })
      all.push(...(res.items as unknown as CloudComposicaoRecord[]))
      totalPages = res.totalPages || 1
      page++
    } while (page <= totalPages)
    cloudRecords = all
  } catch {
    // Sem cloud / sem sessão: mantém a biblioteca local como está
    return { merged: local, cloudOnly: [] }
  }

  if (cloudRecords.length === 0) {
    return { merged: local, cloudOnly: [] }
  }

  const creatorNames = await fetchCreatorsInfo(cloudRecords.map((r) => r.user).filter(Boolean))

  const cloudComps = cloudRecords.map((r) => cloudRecordToComposition(r, creatorNames.get(r.user)))

  const localByStableKey = new Map<string, any>()
  for (const c of local) {
    if (c?.code) localByStableKey.set(`code:${String(c.code).trim().toLowerCase()}`, c)
    if (c?.id) localByStableKey.set(`id:${String(c.id)}`, c)
    if ((c as any)?.local_id) {
      localByStableKey.set(`lid:${String((c as any).local_id)}`, c)
    }
  }

  const merged: any[] = []
  const coveredLocal = new Set<any>()

  for (const cc of cloudComps) {
    const keys = [
      `id:${cc.id}`,
      `lid:${(cc as any).local_id || ''}`,
      `code:${String(cc.code || '')
        .trim()
        .toLowerCase()}`,
    ]
    let localMatch: any = undefined
    for (const k of keys) {
      const found = localByStableKey.get(k)
      if (found) {
        localMatch = found
        coveredLocal.add(found)
        break
      }
    }

    if (!localMatch) {
      merged.push(cc)
      continue
    }

    // Cloud vence: registro do cloud é mais recente (preserva histórico local se for mais novo)
    const localUpdated = Date.parse((localMatch as any).updatedAt || '') || 0
    const cloudUpdated = Date.parse((cc as any).updatedAt || '') || 0
    if (localUpdated > cloudUpdated && localMatch.id === cc.id) {
      merged.push({
        ...localMatch,
        createdByUserId: (cc as any).createdByUserId,
        createdByUserName: (cc as any).createdByUserName,
      })
    } else {
      merged.push(cc)
    }
  }

  // Locais que não existem no cloud continuam visíveis (podem ser enviadas depois)
  for (const c of local) {
    if (!coveredLocal.has(c)) merged.push(c)
  }

  const cloudOnly = cloudComps.filter(
    (cc) =>
      !local.some(
        (c) =>
          String(c.id) === cc.id ||
          (c.code && c.code.trim().toLowerCase() === String(cc.code).trim().toLowerCase()),
      ),
  )

  return { merged, cloudOnly }
}

/**
 * Persiste a biblioteca mesclada no localStorage (cache para leitura síncrona).
 */
export function saveMergedCompositionsCache(merged: any[]) {
  const safe = (merged || []).filter((c) => c && c.code && c.description)
  saveStoredCompositions(safe)
}

/**
 * Envia ao cloud as composições locais reais (não SINAPI) que ainda não existem lá.
 * Idempotente: composição existente (por id/local_id/code) não é recriada.
 */
export async function pushLocalCompositionsToCloud(onProgress?: (step: string) => void) {
  const local = (getStoredCompositions() as any[]) || []
  const candidates = local.filter((c) => c && c.source !== 'SINAPI' && c.code)
  if (candidates.length === 0) return { uploaded: 0 }

  let cloudRecords: CloudComposicaoRecord[] = []
  try {
    cloudRecords = (await pb.collection('composicoes').getFullList({
      fields: 'id,code,local_id,user',
    })) as unknown as CloudComposicaoRecord[]
  } catch {
    return { uploaded: 0 }
  }

  const ownerId = pb.authStore.record?.id || ''
  if (!ownerId) return { uploaded: 0 }

  const cloudKeys = new Set<string>()
  for (const r of cloudRecords) {
    if (r.code) cloudKeys.add(`code:${String(r.code).trim().toLowerCase()}`)
    if (r.local_id) cloudKeys.add(`lid:${String(r.local_id)}`)
    cloudKeys.add(`id:${r.id}`)
  }

  let uploaded = 0
  for (const comp of candidates) {
    const keys = [
      `id:${comp.id}`,
      `lid:${String(comp.local_id || '')}`,
      `code:${String(comp.code || '')
        .trim()
        .toLowerCase()}`,
    ]
    if (keys.some((k) => cloudKeys.has(k))) continue

    onProgress?.(`Enviando composição ${comp.code}...`)
    try {
      await pb.collection('composicoes').create(compositionToCloudPayload(comp, ownerId))
      uploaded++
    } catch {
      /* composição individual falhou: segue com as demais */
    }
  }

  return { uploaded }
}
