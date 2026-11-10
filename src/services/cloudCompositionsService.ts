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
import {
  getStoredCompositions,
  saveStoredCompositions,
  isGenericCompositionCode,
} from '@/lib/budgetsStorage'
import { getCurrentPbUser } from '@/services/authService'
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

export const CANONICAL_BUILTIN_IDS = new Set([
  'comp-concreto-fck25',
  'comp-armacao-aco-ca50',
  'comp-alvenaria-bloco-ceramico',
  'comp-emboço-interno',
  'comp-pintura-acrilica',
  'comp-ponto-eletrico',
])

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
    local_id?: string
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
    local_id: rec.local_id || rec.id,
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
    if (c?.code && !isGenericCompositionCode(c.code)) {
      localByStableKey.set(`code:${String(c.code).trim().toLowerCase()}`, c)
    }
    if (c?.id) localByStableKey.set(`id:${String(c.id)}`, c)
    if ((c as any)?.local_id) {
      localByStableKey.set(`lid:${String((c as any).local_id)}`, c)
    }
    if (c?.code && c?.description) {
      localByStableKey.set(
        `desc:${String(c.code).trim().toLowerCase()}:${String(c.description).trim().toLowerCase()}`,
        c,
      )
    }
  }

  const merged: any[] = []
  const coveredLocal = new Set<any>()

  for (const cc of cloudComps) {
    const isGeneric = isGenericCompositionCode(cc.code)
    const keys: string[] = [`id:${cc.id}`, `lid:${(cc as any).local_id || ''}`]
    if (!isGeneric && cc.code) {
      keys.push(`code:${String(cc.code).trim().toLowerCase()}`)
    }
    if (cc.code && cc.description) {
      keys.push(
        `desc:${String(cc.code).trim().toLowerCase()}:${String(cc.description).trim().toLowerCase()}`,
      )
    }

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
/**
 * Localiza de forma segura se uma composição local já existe nos registros do cloud.
 * Não confunde códigos genéricos (ex.: "CONCE-CPU-"): para códigos genéricos, exige
 * correspondência exata de descrição ou casamento explícito por id/local_id.
 */
export function findMatchingCloudRecord(
  comp: any,
  cloudRecords: CloudComposicaoRecord[],
): CloudComposicaoRecord | undefined {
  if (!comp) return undefined
  const compId = comp.id ? String(comp.id) : ''
  const compLocalId = comp.local_id ? String(comp.local_id) : ''
  const compCode = comp.code ? String(comp.code).trim().toLowerCase() : ''
  const compDesc = comp.description ? String(comp.description).trim().toLowerCase() : ''
  const isGeneric = isGenericCompositionCode(comp.code)

  for (const r of cloudRecords) {
    const rId = String(r.id)
    const rLocalId = r.local_id ? String(r.local_id) : ''
    const rCode = r.code ? String(r.code).trim().toLowerCase() : ''
    const rDesc = r.description ? String(r.description).trim().toLowerCase() : ''

    // 1. Casamento direto por ID do PocketBase
    if (compId && (compId === rId || compId === rLocalId)) return r
    // 2. Casamento direto por local_id
    if (compLocalId && (compLocalId === rLocalId || compLocalId === rId)) return r

    // 3. Casamento por código
    if (compCode && rCode && compCode === rCode) {
      if (!isGeneric) {
        // Código canônico específico (ex: CONCE-IMP-002, SICRO-2S0110000, CONCE-ALV-001)
        return r
      }
      // Código genérico (ex: CONCE-CPU-): só casa se a descrição for exatamente a mesma
      if (compDesc && rDesc && compDesc === rDesc) {
        return r
      }
    }
  }

  return undefined
}

/**
 * Salva ou atualiza uma única composição no PocketBase.
 * Usada pelo syncEngine ao processar tarefas individuais da fila.
 */
export async function saveSingleCompositionToCloud(
  comp: BudgetComposition,
  ownerId?: string,
): Promise<{ success: boolean; cloudId?: string; isNew?: boolean }> {
  const currentUserId = ownerId || pb.authStore.record?.id || getCurrentPbUser()?.id || ''
  if (!currentUserId || !comp || !comp.code) {
    return { success: false }
  }

  const payload = compositionToCloudPayload(comp, currentUserId)

  // 1. Se já tem ID do PocketBase direto
  if (comp.id && !comp.id.startsWith('comp-')) {
    try {
      const rec = await pb.collection('composicoes').getOne(comp.id)
      if (rec && rec.user === currentUserId) {
        await pb.collection('composicoes').update(comp.id, payload)
        return { success: true, cloudId: comp.id, isNew: false }
      }
    } catch {
      /* rec não encontrado por ID direto: segue para busca geral */
    }
  }

  // 2. Busca lista para encontrar correspondência
  let cloudRecords: CloudComposicaoRecord[] = []
  try {
    cloudRecords = (await pb.collection('composicoes').getFullList({
      fields: 'id,code,local_id,user,description,updated',
    })) as unknown as CloudComposicaoRecord[]
  } catch {
    return { success: false }
  }

  const match = findMatchingCloudRecord(comp, cloudRecords)
  if (match) {
    if (match.user === currentUserId) {
      await pb.collection('composicoes').update(match.id, payload)
      return { success: true, cloudId: match.id, isNew: false }
    }
    // Pertence a outro usuário: regra API impede sobrescrita
    return { success: false }
  }

  // 3. Não existe no cloud: cria novo registro
  const created = await pb.collection('composicoes').create(payload)
  return { success: true, cloudId: created.id, isNew: true }
}

/**
 * Remove uma única composição do PocketBase, respeitando a regra de dono.
 */
export async function deleteSingleCompositionFromCloud(
  compId: string,
  ownerId?: string,
): Promise<boolean> {
  const currentUserId = ownerId || pb.authStore.record?.id || getCurrentPbUser()?.id || ''
  if (!currentUserId || !compId) return false

  // Se compId já é o ID do PocketBase
  if (!compId.startsWith('comp-')) {
    try {
      const rec = await pb.collection('composicoes').getOne(compId)
      if (rec && rec.user === currentUserId) {
        await pb.collection('composicoes').delete(compId)
        return true
      }
    } catch {
      /* segue para busca por local_id */
    }
  }

  try {
    const list = await pb.collection('composicoes').getList(1, 10, {
      filter: `local_id = "${compId}" && user = "${currentUserId}"`,
    })
    if (list.items.length > 0) {
      await pb.collection('composicoes').delete(list.items[0].id)
      return true
    }
  } catch {
    /* falha silenciosa */
  }

  return false
}

/**
 * Envia ao cloud as composições locais reais que ainda não existem lá ou que
 * foram editadas localmente pelo usuário logado.
 * Idempotente: não duplica registros existentes (inclusive os 4 canônicos já no cloud).
 */
export async function pushLocalCompositionsToCloud(onProgress?: (step: string) => void): Promise<{
  uploaded: number
  updated: number
}> {
  const local = (getStoredCompositions() as any[]) || []
  const ownerId = pb.authStore.record?.id || getCurrentPbUser()?.id || ''
  if (!ownerId) return { uploaded: 0, updated: 0 }

  // Restrição estrita de dono: envia APENAS composições pertencentes ao usuário logado
  // (ou criadas localmente por ele sem dono marcado). NUNCA recriar/reenviar composições
  // cujo dono seja outro usuário (createdByUserId !== ownerId).
  // Também não sobe os 6 templates estáticos SINAPI intocados.
  const candidates = local.filter((c) => {
    if (!c || !c.code || !c.description) return false
    const creatorId = (c as any).createdByUserId
    if (creatorId && creatorId !== ownerId) return false
    if (!creatorId && CANONICAL_BUILTIN_IDS.has(c.id)) return false
    return true
  })
  if (candidates.length === 0) return { uploaded: 0, updated: 0 }

  let cloudRecords: CloudComposicaoRecord[] = []
  try {
    cloudRecords = (await pb.collection('composicoes').getFullList({
      fields: 'id,code,local_id,user,description,updated',
    })) as unknown as CloudComposicaoRecord[]
  } catch {
    return { uploaded: 0, updated: 0 }
  }

  let uploaded = 0
  let updated = 0
  let cacheModified = false

  for (const comp of candidates) {
    const match = findMatchingCloudRecord(comp, cloudRecords)

    if (match) {
      // Se existe e pertence a este usuário, atualiza se necessário
      if (match.user === ownerId) {
        const localUpdated = Date.parse((comp as any).updatedAt || '') || 0
        const cloudUpdated = Date.parse(match.updated || '') || 0
        if (comp.id !== match.id || localUpdated > cloudUpdated) {
          try {
            await pb
              .collection('composicoes')
              .update(match.id, compositionToCloudPayload(comp, ownerId))
            updated++
            if (comp.id !== match.id) {
              comp.id = match.id
              ;(comp as any).local_id = match.local_id || comp.local_id
              cacheModified = true
            }
          } catch {
            /* segue */
          }
        }
      }
      continue
    }

    onProgress?.(`Enviando composição ${comp.code}...`)
    try {
      const payload = compositionToCloudPayload(comp, ownerId)
      const created = await pb.collection('composicoes').create(payload)
      uploaded++
      comp.id = created.id
      ;(comp as any).local_id = created.local_id || payload.local_id
      ;(comp as any).createdByUserId = ownerId
      cacheModified = true
    } catch {
      /* composição individual falhou: segue com as demais */
    }
  }

  if (cacheModified) {
    saveMergedCompositionsCache(local)
  }

  return { uploaded, updated }
}
