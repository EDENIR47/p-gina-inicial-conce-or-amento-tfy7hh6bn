import pb from '@/lib/pocketbase/client'
import { FullBudget } from '@/types/budgetEngine'
import { InputQuoteComparison } from '@/types/intelligence'
import { isPbAuthenticated } from '@/services/authService'
import { standardizeItemDescription } from '@/lib/budgetsStorage'

export interface CloudOrcamentoRecord {
  id: string
  code: string
  title: string
  client_name: string
  client_document: string
  work_name: string
  work_address: string
  status: 'em_andamento' | 'aprovado' | 'vencido' | 'em_analise'
  sale_value: number
  direct_cost: number
  bdi_rate: number
  tax_regime: string
  simples_das_rate: number
  client_data: any
  work_data: any
  bdi_config: any
  charges_config: any
  payload: FullBudget
  local_id: string
  user: string
  shared_with?: string[]
  created: string
  updated: string
}

/**
 * Converte um FullBudget local para os campos estruturados da coleção orcamentos
 */
export function fullBudgetToCloudPayload(budget: FullBudget, fallbackUserId: string) {
  // Preserva o dono original do orçamento se já registrado (ex.: criado pelo Edenir),
  // garantindo que uma edição salva por outro colaborador (ex.: Elizandro) não usurpe a autoria
  const effectiveUserId = (budget as any).cloudUserId || (budget as any).userId || fallbackUserId

  return {
    code: budget.code || 'ORC-2025-001',
    title: budget.title || budget.work?.name || 'Orçamento de Obra',
    client_name: budget.client?.name || '',
    client_document: budget.client?.document || '',
    work_name: budget.work?.name || '',
    work_address: budget.work?.address || '',
    status: (['em_andamento', 'aprovado', 'vencido', 'em_analise'].includes(budget.status)
      ? budget.status
      : 'em_andamento') as 'em_andamento' | 'aprovado' | 'vencido' | 'em_analise',
    sale_value: Number(budget.bdiConfig?.calculatedBdi ? 0 : 0),
    direct_cost: 0,
    bdi_rate: Number(budget.bdiConfig?.calculatedBdi || 0),
    tax_regime: budget.chargesConfig?.taxRegime || 'simples_nacional',
    simples_das_rate: Number(budget.chargesConfig?.simplesDasRate || 11.0),
    client_data: budget.client || {},
    work_data: budget.work || {},
    bdi_config: budget.bdiConfig || {},
    charges_config: budget.chargesConfig || {},
    payload: {
      ...budget,
      cloudUserId: effectiveUserId,
    },
    local_id: budget.id,
    user: effectiveUserId,
  }
}

/**
 * Converte um registro do PocketBase de volta para FullBudget
 */
export function cloudOrcamentoToFullBudget(record: any): FullBudget {
  const payload = record.payload || {}
  const rawBudget: FullBudget & {
    cloudRecordId?: string
    cloudUserId?: string
    cloudUserName?: string
  } = {
    ...payload,
    id: record.local_id || record.id,
    code: record.code || payload.code,
    title: record.title || payload.title,
    status: record.status || payload.status || 'em_andamento',
    client: record.client_data || payload.client,
    work: record.work_data || payload.work,
    bdiConfig: record.bdi_config || payload.bdiConfig,
    chargesConfig: record.charges_config || payload.chargesConfig,
    stages: payload.stages || [],
    createdAt: payload.createdAt || record.created?.split('T')[0],
    // REGRA: updatedAt reflete a data real mais recente entre o registro da coleção e o payload
    updatedAt: (() => {
      const recMs = record.updated ? Date.parse(record.updated) : 0
      const payMs = payload.updatedAt ? Date.parse(payload.updatedAt) : 0
      if (recMs > 0 && payMs > 0) {
        return recMs >= payMs ? record.updated : payload.updatedAt
      }
      return record.updated || payload.updatedAt || new Date().toISOString()
    })(),
    // Metadados de nuvem para controle de autoria / permissão de exclusão
    cloudRecordId: record.id,
    cloudUserId: record.user || payload.cloudUserId,
  }

  // Sanitiza descrições padronizando tipografia sem tocar em nenhum número
  if (Array.isArray(rawBudget.stages)) {
    rawBudget.stages = rawBudget.stages.map((stg) => ({
      ...stg,
      name: standardizeItemDescription(stg.name),
      services: (stg.services || []).map((srv) => ({
        ...srv,
        description: standardizeItemDescription(srv.description),
        composition: srv.composition
          ? {
              ...srv.composition,
              description: standardizeItemDescription(srv.composition.description),
              inputs: (srv.composition.inputs || []).map((inp) => ({
                ...inp,
                description: standardizeItemDescription(inp.description),
              })),
            }
          : srv.composition,
      })),
    }))
  }

  return rawBudget
}

/**
 * Busca todos os orçamentos salvos no cloud para o usuário logado
 */
export async function fetchCloudOrcamentos(): Promise<FullBudget[]> {
  if (!isPbAuthenticated()) return []

  try {
    // Dispara deduplicação no backend em segundo plano (melhor-esforço)
    // para limpar quaisquer duplicatas que possam ter sido inseridas
    try {
      fetch(`${pb.baseUrl}/backend/v1/dedupe-orcamentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}),
        },
      }).catch(() => {})
    } catch {
      /* ignora erro de trigger */
    }

    const records = await pb.collection('orcamentos').getFullList({
      sort: '-updated',
    })

    const creatorIds = Array.from(
      new Set(records.map((r: any) => r.user).filter((u: any): u is string => Boolean(u))),
    )

    let creatorNamesMap = new Map<string, string>()
    if (creatorIds.length > 0) {
      try {
        const { fetchCreatorsInfo } = await import('@/services/cloudCompositionsService')
        creatorNamesMap = await fetchCreatorsInfo(creatorIds)
      } catch {
        /* fallback silencioso */
      }
    }

    // Deduplica em memória pelo código / local_id:
    // Como os registros vêm ordenados por -updated, a primeira ocorrência é sempre a mais recente.
    const seen = new Set<string>()
    const deduplicatedList: FullBudget[] = []

    for (const rec of records) {
      const keyLocal = (rec.local_id || rec.id || '').trim()
      const keyCode = (rec.code || '').trim()

      if (keyLocal && seen.has(`local:${keyLocal}`)) continue
      if (keyCode && seen.has(`code:${keyCode}`)) continue

      if (keyLocal) seen.add(`local:${keyLocal}`)
      if (keyCode) seen.add(`code:${keyCode}`)

      const budget = cloudOrcamentoToFullBudget(rec)
      if (budget.cloudUserId && creatorNamesMap.has(budget.cloudUserId)) {
        budget.cloudUserName = creatorNamesMap.get(budget.cloudUserId)
      }
      deduplicatedList.push(budget)
    }

    return deduplicatedList
  } catch (err) {
    console.warn('Falha ao buscar orçamentos do PocketBase:', err)
    return []
  }
}

/**
 * Salva ou atualiza um orçamento no cloud (PocketBase).
 * Falha ALTO: sem sessão válida lança erro (traduzido pela syncFeedback) —
 * nunca mais retornar null silenciosamente e a fila tratar como sucesso.
 */
export async function saveCloudOrcamento(budget: FullBudget): Promise<string | null> {
  if (!isPbAuthenticated()) {
    throw new Error('Sessão expirada, faça login novamente.')
  }
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId) {
    throw new Error('Sessão expirada, faça login novamente.')
  }

  const data = fullBudgetToCloudPayload(budget, currentUserId)

  // Regra corporativa CONCE: orçamentos são compartilhados na empresa toda.
  // Busca por id, local_id ou code INDEPENDENTE do dono para atualizar o mesmo
  // registro no cloud sem duplicar. Se o registro pertencer a outro colaborador,
  // preserva o dono original no payload.
  try {
    const cloudRecordId = (budget as any).cloudRecordId
    let existing: any = null

    if (cloudRecordId) {
      try {
        existing = await pb.collection('orcamentos').getOne(cloudRecordId)
      } catch {
        /* tenta busca por código/local_id */
      }
    }

    if (!existing) {
      // Tenta primeiro por local_id exato
      if (budget.id) {
        try {
          existing = await pb
            .collection('orcamentos')
            .getFirstListItem(`local_id = "${budget.id}" || id = "${budget.id}"`)
        } catch {
          /* tenta por code */
        }
      }
      // Se não achou por local_id, tenta por code
      if (!existing && budget.code) {
        try {
          existing = await pb.collection('orcamentos').getFirstListItem(`code = "${budget.code}"`)
        } catch {
          /* não encontrado */
        }
      }
    }

    if (existing) {
      // REGRA: "A versão mais recente sempre vence e fica salva no cloud".
      // Se o registro existente no cloud tiver 'updated' ou 'payload.updatedAt' mais recente
      // que a cópia que está sendo enviada, o envio de uma versão mais antiga NÃO deve
      // sobrescrever o cloud.
      const parseTime = (val: any): number => {
        if (!val) return 0
        const ms = Date.parse(val)
        return Number.isFinite(ms) ? ms : 0
      }

      const cloudUpdatedMs = Math.max(
        parseTime(existing.updated),
        parseTime(existing.payload?.updatedAt),
      )
      const localUpdatedMs = parseTime(budget.updatedAt)

      // Margem de segurança de 1000ms para evitar falsos positivos de relógio
      if (cloudUpdatedMs > 0 && localUpdatedMs > 0 && cloudUpdatedMs > localUpdatedMs + 1000) {
        console.warn(
          `[saveCloudOrcamento] Versão do cloud para ${budget.code || budget.id} é mais recente (${new Date(cloudUpdatedMs).toISOString()}) que a local (${new Date(localUpdatedMs).toISOString()}). Gravação ignorada para preservar a edição mais nova.`,
        )
        // Dispara evento para a UI atualizar o cache e avisar que uma versão mais recente já está no cloud
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('conce_budget_conflict_newer_cloud', {
              detail: {
                budgetId: budget.id,
                code: budget.code,
                cloudUpdated: existing.updated,
              },
            }),
          )
        }
        return existing.id
      }

      // Preserva o criador original do registro
      const originalUserId = existing.user || currentUserId
      const updateData = fullBudgetToCloudPayload(
        { ...budget, cloudUserId: originalUserId } as any,
        originalUserId,
      )
      // Mantém o local_id consistente
      updateData.local_id = existing.local_id || budget.id
      const updated = await pb.collection('orcamentos').update(existing.id, updateData)
      return updated.id
    }
  } catch (err: any) {
    console.warn('Erro ao verificar orçamento existente antes do salvamento:', err)
  }

  const created = await pb.collection('orcamentos').create(data)
  return created.id
}

/**
 * Remove um orçamento do cloud pelo ID local ou ID do PocketBase.
 * Sem sessão válida lança erro em vez de retornar false silenciosamente.
 * REGRA: Exclusão no PocketBase é restrita ao dono original (deleteRule: user = @request.auth.id).
 */
export async function deleteCloudOrcamento(budgetId: string): Promise<boolean> {
  if (!isPbAuthenticated()) {
    throw new Error('Sessão expirada, faça login novamente.')
  }
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId) {
    throw new Error('Sessão expirada, faça login novamente.')
  }

  try {
    // Tenta primeiro encontrar pelo id do PocketBase ou pelo local_id
    let existing: any = null
    try {
      existing = await pb.collection('orcamentos').getOne(budgetId)
    } catch {
      /* tenta por local_id */
    }

    if (!existing) {
      try {
        existing = await pb
          .collection('orcamentos')
          .getFirstListItem(`local_id = "${budgetId}" || id = "${budgetId}"`)
      } catch {
        // ignora
      }
    }

    if (existing) {
      // Regra de segurança: só exclui se o usuário autenticado for o dono
      if (existing.user && existing.user !== currentUserId) {
        console.warn('Tentativa de exclusão bloqueada: orçamento pertence a outro usuário.')
        return false
      }
      await pb.collection('orcamentos').delete(existing.id)
      return true
    }
  } catch (err) {
    console.warn('Falha ao excluir orçamento do cloud:', err)
  }
  return false
}

/**
 * Converte data URL base64 para Blob/File para upload no PocketBase
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

/**
 * Faz upload de uma foto de etapa para a coleção fotos_etapa e retorna a URL pública gerada no PocketBase
 */
export async function uploadStagePhotoToCloud(
  stageId: string,
  photoDataUrl: string,
  orcamentoLocalId?: string,
): Promise<string | null> {
  if (!isPbAuthenticated() || !photoDataUrl.startsWith('data:image/')) return null
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId) return null

  try {
    const file = dataUrlToFile(photoDataUrl, `etapa-${stageId}.jpg`)
    const formData = new FormData()
    formData.append('user', currentUserId)
    formData.append('stage_id', stageId)
    if (orcamentoLocalId) {
      formData.append('orcamento_local_id', orcamentoLocalId)
    }
    formData.append('file', file)

    // Se já houver registro anterior para essa etapa, podemos atualizar ou criar novo
    let existingRecordId: string | null = null
    try {
      const existing = await pb
        .collection('fotos_etapa')
        .getFirstListItem(`user = "${currentUserId}" && stage_id = "${stageId}"`)
      if (existing) existingRecordId = existing.id
    } catch {
      /* intentionally ignored */
    }

    let record
    if (existingRecordId) {
      record = await pb.collection('fotos_etapa').update(existingRecordId, formData)
    } else {
      record = await pb.collection('fotos_etapa').create(formData)
    }

    // Gera a URL do arquivo no PocketBase
    if (record && record.file) {
      return pb.files.getURL(record, record.file)
    }
  } catch (err) {
    console.warn('Falha no upload da foto da etapa para o PocketBase:', err)
  }
  return null
}

/**
 * Salva cotações personalizadas no cloud
 */
export async function saveCloudQuotes(quotes: InputQuoteComparison[]): Promise<void> {
  if (!isPbAuthenticated()) return
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId || !quotes || quotes.length === 0) return

  for (const q of quotes) {
    try {
      const payload = {
        user: currentUserId,
        budgetId: q.budgetId,
        inputCode: q.inputCode,
        inputDescription: q.inputDescription,
        quotes: q.quotes,
        chosenSupplierId: q.winningQuoteId || '',
        local_id: q.id,
      }

      try {
        const existing = await pb
          .collection('cotacoes')
          .getFirstListItem(`user = "${currentUserId}" && local_id = "${q.id}"`)
        if (existing) {
          await pb.collection('cotacoes').update(existing.id, payload)
          continue
        }
      } catch {
        /* intentionally ignored */
      }

      await pb.collection('cotacoes').create(payload)
    } catch (e) {
      console.warn('Falha ao salvar cotação no PocketBase:', e)
    }
  }
}

/**
 * Busca cotações do cloud
 */
export async function fetchCloudQuotes(budgetId?: string): Promise<InputQuoteComparison[]> {
  if (!isPbAuthenticated()) return []
  try {
    const filter = budgetId ? `budgetId = "${budgetId}"` : ''
    const records = await pb.collection('cotacoes').getFullList({
      filter: filter || undefined,
      sort: '-updated',
    })
    return records.map((r: any) => ({
      id: r.local_id || r.id,
      budgetId: r.budgetId,
      inputCode: r.inputCode || '',
      inputDescription: r.inputDescription || '',
      unit: 'un',
      category: 'material' as const,
      budgetedUnitCost: 0,
      requiredQuantity: 1,
      quotes: r.quotes || [],
      winningQuoteId: r.chosenSupplierId || undefined,
      status: 'aberta' as const,
      lastUpdated: r.updated || new Date().toISOString(),
    }))
  } catch {
    return []
  }
}

/**
 * Salva composições customizadas no cloud
 */
export async function saveCloudCompositions(compositions: any[]): Promise<void> {
  if (!isPbAuthenticated()) return
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId || !compositions || compositions.length === 0) return

  for (const c of compositions) {
    if (!c || !c.code || !c.description) continue
    try {
      const { saveSingleCompositionToCloud } = await import('./cloudCompositionsService')
      await saveSingleCompositionToCloud(c, currentUserId)
    } catch (e) {
      console.warn('Falha ao salvar composição no PocketBase:', e)
    }
  }
}
