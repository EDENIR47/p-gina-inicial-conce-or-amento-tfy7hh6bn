import pb from '@/lib/pocketbase/client'
import { FullBudget } from '@/types/budgetEngine'
import { InputQuoteComparison } from '@/types/intelligence'
import { isPbAuthenticated } from '@/services/authService'

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
export function fullBudgetToCloudPayload(budget: FullBudget, userId: string) {
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
    sale_value: Number(budget.bdiConfig?.calculatedBdi ? 0 : 0), // pode ser enriquecido pelo caller se disponível
    direct_cost: 0,
    bdi_rate: Number(budget.bdiConfig?.calculatedBdi || 0),
    tax_regime: budget.chargesConfig?.taxRegime || 'simples_nacional',
    simples_das_rate: Number(budget.chargesConfig?.simplesDasRate || 11.0),
    client_data: budget.client || {},
    work_data: budget.work || {},
    bdi_config: budget.bdiConfig || {},
    charges_config: budget.chargesConfig || {},
    payload: budget,
    local_id: budget.id,
    user: userId,
  }
}

/**
 * Converte um registro do PocketBase de volta para FullBudget
 */
export function cloudOrcamentoToFullBudget(record: any): FullBudget {
  const payload = record.payload || {}
  return {
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
    updatedAt: record.updated || payload.updatedAt || new Date().toISOString(),
  }
}

/**
 * Busca todos os orçamentos salvos no cloud para o usuário logado
 */
export async function fetchCloudOrcamentos(): Promise<FullBudget[]> {
  if (!isPbAuthenticated()) return []

  try {
    const records = await pb.collection('orcamentos').getFullList({
      sort: '-updated',
    })

    return records.map(cloudOrcamentoToFullBudget)
  } catch (err) {
    console.warn('Falha ao buscar orçamentos do PocketBase:', err)
    return []
  }
}

/**
 * Salva ou atualiza um orçamento no cloud (PocketBase)
 */
export async function saveCloudOrcamento(budget: FullBudget): Promise<string | null> {
  if (!isPbAuthenticated()) return null
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId) return null

  const data = fullBudgetToCloudPayload(budget, currentUserId)

  // Verifica se já existe orçamento com esse local_id ou code para esse usuário
  try {
    const existing = await pb
      .collection('orcamentos')
      .getFirstListItem(
        `user = "${currentUserId}" && (local_id = "${budget.id}" || code = "${budget.code}")`,
      )
    if (existing) {
      const updated = await pb.collection('orcamentos').update(existing.id, data)
      return updated.id
    }
  } catch (err: any) {
    // 404 significa que não existe, pode criar
  }

  const created = await pb.collection('orcamentos').create(data)
  return created.id
}

/**
 * Remove um orçamento do cloud pelo ID local ou ID do PocketBase
 */
export async function deleteCloudOrcamento(budgetId: string): Promise<boolean> {
  if (!isPbAuthenticated()) return false
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId) return false

  try {
    // Tenta primeiro encontrar pelo local_id
    const existing = await pb
      .collection('orcamentos')
      .getFirstListItem(
        `user = "${currentUserId}" && (local_id = "${budgetId}" || id = "${budgetId}")`,
      )
    if (existing) {
      await pb.collection('orcamentos').delete(existing.id)
      return true
    }
  } catch {
    // ignora
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
    if (!c.code) continue
    try {
      const payload = {
        user: currentUserId,
        code: c.code,
        description: c.description || '',
        specialty: c.specialty || '',
        unit: c.unit || '',
        source: c.source || '',
        version: c.version || '',
        inputs: c.inputs || [],
        local_id: c.id || c.code,
      }

      try {
        const existing = await pb
          .collection('composicoes')
          .getFirstListItem(`user = "${currentUserId}" && code = "${c.code}"`)
        if (existing) {
          await pb.collection('composicoes').update(existing.id, payload)
          continue
        }
      } catch {
        /* intentionally ignored */
      }

      await pb.collection('composicoes').create(payload)
    } catch (e) {
      console.warn('Falha ao salvar composição no PocketBase:', e)
    }
  }
}
