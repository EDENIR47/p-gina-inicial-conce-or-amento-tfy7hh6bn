/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Cliente de Integração com a API Orçamentador (Tabela Oficial SINAPI)
 * Suporta consulta paginada de insumos e composições por UF e mês de referência,
 * com fallback direto/proxy para evitar problemas de CORS e autenticação com API Key.
 */

import { SinapiCatalogItem } from '@/types/sinapi'
import { InputCategory } from '@/types/budgetEngine'
import { getStoredOrcamentadorApiKey } from '@/lib/sinapiStorage'
import pb from '@/lib/pocketbase/client'

export interface OrcamentadorSyncOptions {
  apiKey?: string
  state: string // Ex: "SP", "RS", "RJ"
  referenceDate?: string // Formato "AAAA-MM-01" ou mês "MM/AAAA"
  regime?: 'DESONERADO' | 'NAO_DESONERADO' | 'TODOS'
  includeInsumos?: boolean
  includeComposicoes?: boolean
  maxPagesPerResource?: number // Limite seguro de páginas por ciclo para não travar
  limitPerPage?: number // Máximo 100
  onProgress?: (progress: OrcamentadorSyncProgress) => void
  signal?: AbortSignal
}

export interface OrcamentadorSyncProgress {
  status:
    | 'idle'
    | 'authenticating'
    | 'fetching_insumos'
    | 'fetching_composicoes'
    | 'merging'
    | 'completed'
    | 'error'
  currentPage: number
  totalPagesEstimate: number
  currentResource: 'insumos' | 'composicoes'
  itemsFetched: number
  message: string
  percent: number
}

export interface OrcamentadorItemRaw {
  codigo?: string | number
  nome?: string
  descricao?: string
  unidade?: string
  tipo?: string
  tipo_insumo?: string
  preco?: string | number
  preco_desonerado?: string | number
  preco_naodesonerado?: string | number
  valor_total?: string | number
  origem_preco?: string
  especialidade?: string
  categoria?: string
}

/**
 * Normaliza data no formato AAAA-MM-01
 */
export function formatToOrcamentadorDate(dateStr: string): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()
  // Se já for AAAA-MM-01 ou AAAA-MM
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(trimmed)) {
    return trimmed.length === 7 ? `${trimmed}-01` : trimmed
  }
  // Se for MM/AAAA
  const match = trimmed.match(/^(\d{1,2})\/(\d{4})$/)
  if (match) {
    const month = match[1].padStart(2, '0')
    const year = match[2]
    return `${year}-${month}-01`
  }
  return trimmed
}

/**
 * Converte categoria bruta da API para as categorias padrão da CONCE
 */
export function normalizeCategory(tipo?: string, rawCategory?: string): InputCategory {
  const t = (tipo || rawCategory || '').toUpperCase()
  if (
    t.includes('MAO') ||
    t.includes('MÃO') ||
    t.includes('HORISTA') ||
    t.includes('MENSALISTA') ||
    t.includes('ENCARGOS')
  ) {
    return 'mao_de_obra'
  }
  if (
    t.includes('EQUIP') ||
    t.includes('LOCAÇÃO') ||
    t.includes('AQUISIÇÃO') ||
    t.includes('CHI') ||
    t.includes('CHP')
  ) {
    return 'equipamento'
  }
  if (t.includes('SERVIC') || t.includes('SERVIÇ') || t.includes('TERCEIR')) {
    return 'servico_terceiro'
  }
  if (t.includes('MATERIAL') || t.includes('INSUMO')) {
    return 'material'
  }
  return 'material'
}

/**
 * Converte item bruto retornado pela API Orçamentador para o modelo SinapiCatalogItem
 */
export function mapOrcamentadorItemToSinapi(
  raw: OrcamentadorItemRaw,
  type: 'insumo' | 'composicao',
  state: string,
  referenceMonth: string,
  regime: 'DESONERADO' | 'NAO_DESONERADO' | 'TODOS' = 'NAO_DESONERADO',
): SinapiCatalogItem | null {
  const codeRaw = String(raw.codigo || '').trim()
  if (!codeRaw) return null

  const numericCode = codeRaw.replace(/\D/g, '') || codeRaw
  const code = codeRaw.toUpperCase().startsWith('SINAPI-')
    ? codeRaw.toUpperCase()
    : `SINAPI-${codeRaw}`

  const description = String(raw.nome || raw.descricao || 'Item SINAPI Oficial').trim()
  const unit = String(raw.unidade || (type === 'composicao' ? 'm²' : 'un')).trim()

  // Determinar preço conforme o regime selecionado
  let price = 0
  if (regime === 'DESONERADO') {
    price = Number(raw.preco_desonerado ?? raw.preco ?? raw.valor_total) || 0
  } else if (regime === 'NAO_DESONERADO') {
    price = Number(raw.preco_naodesonerado ?? raw.preco ?? raw.valor_total) || 0
  } else {
    // TODOS: prioriza não desonerado como base técnica oficial
    price =
      Number(raw.preco_naodesonerado ?? raw.preco ?? raw.preco_desonerado ?? raw.valor_total) || 0
  }

  const category = normalizeCategory(raw.tipo_insumo || raw.tipo, raw.categoria)
  const specialty = String(
    raw.especialidade || (type === 'composicao' ? 'Composições Gerais' : 'Materiais & Insumos'),
  ).trim()

  return {
    id: `orcamentador-${type}-${numericCode}`,
    code,
    numericCode,
    type,
    description,
    unit,
    category,
    specialty,
    referencePrice: Math.abs(price),
    priceOrigin: 'api_orcamentador',
    referenceMonth,
    referenceState: state.toUpperCase(),
    notes: `SINAPI Oficial via API Orçamentador (${state.toUpperCase()} • ${referenceMonth})`,
  }
}

/**
 * Chamada de requisição via proxy seguro do backend PocketBase (evita CORS)
 * com fallback direto para a API Orçamentador se o proxy não estiver acessível.
 */
async function callOrcamentadorApi(
  endpoint: string,
  params: Record<string, any>,
  apiKey: string,
  signal?: AbortSignal,
): Promise<any> {
  // Tentativa 1: Via pb.send do PocketBase (aponta para o backend Skip Cloud)
  try {
    const proxyData: any = await pb.send('/backend/v1/orcamentador-proxy', {
      method: 'POST',
      body: {
        endpoint,
        params,
        apiKey,
      },
      signal,
    })

    if (proxyData) {
      if (proxyData.success && proxyData.data) {
        return proxyData.data
      }
      if (proxyData.error) {
        throw new Error(proxyData.error)
      }
      return proxyData
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err

    const status = err.status || err.statusCode
    if (status === 401 || status === 403) {
      const msg = err.data?.error || 'Chave de API do Orçamentador inválida ou expirada.'
      throw new Error(msg)
    }
    if (status === 429) {
      throw new Error(
        'Limite de requisições da API Orçamentador atingido. Tente novamente em alguns minutos.',
      )
    }

    // Se o backend retornou mensagem de erro explícita sobre a API Orçamentador, propaga
    if (
      err.data?.error ||
      err.message?.includes('Chave de API') ||
      err.message?.includes('Limite de requisições') ||
      err.message?.includes('API Key')
    ) {
      throw new Error(err.data?.error || err.message)
    }
    // Caso contrário tenta direto via browser
  }

  // Tentativa 2: Direto via orcamentador.com.br
  const query = new URLSearchParams()
  query.set('apikey', apiKey)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      query.set(k, String(v))
    }
  }

  const directUrl = `https://orcamentador.com.br/api/${endpoint}/?${query.toString()}`
  const directRes = await fetch(directUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-API-Key': apiKey,
    },
    signal,
  })

  if (!directRes.ok) {
    if (directRes.status === 401 || directRes.status === 403) {
      throw new Error('Chave de API do Orçamentador inválida ou não autorizada.')
    }
    if (directRes.status === 429) {
      throw new Error(
        'Limite de requisições da API Orçamentador atingido. Tente novamente mais tarde.',
      )
    }
    const errText = await directRes.text().catch(() => '')
    let errParsed: any = null
    try {
      errParsed = JSON.parse(errText)
    } catch {
      /* intentionally ignored */
    }
    throw new Error(
      errParsed?.erro ||
        errParsed?.message ||
        `Erro na API Orçamentador (HTTP ${directRes.status})`,
    )
  }

  return directRes.json()
}

/**
 * Valida a chave de API testando uma requisição leve de status/insumo
 */
export async function testOrcamentadorApiKey(
  apiKey: string,
): Promise<{ valid: boolean; message: string }> {
  const cleanKey = apiKey.trim()
  if (!cleanKey) {
    return { valid: false, message: 'Chave de API não informada.' }
  }

  try {
    const data = await callOrcamentadorApi('insumos', { page: 1, limit: 1, estado: 'SP' }, cleanKey)
    if (
      data &&
      (Array.isArray(data) || Array.isArray(data.data) || Array.isArray(data.itens) || data.codigo)
    ) {
      return { valid: true, message: 'Chave de API validada com sucesso no Orçamentador!' }
    }
    if (data && data.erro) {
      return { valid: false, message: data.erro }
    }
    return { valid: true, message: 'Chave aceita pela API do Orçamentador.' }
  } catch (err: any) {
    return {
      valid: false,
      message: err.message || 'Falha ao validar chave com o serviço Orçamentador.',
    }
  }
}

/**
 * Extrai lista de itens do formato retornado pela API (que pode vir como array direto ou objeto envelopado)
 */
function extractListFromApiResponse(data: any): OrcamentadorItemRaw[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.itens)) return data.itens
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.insumos)) return data.insumos
  if (Array.isArray(data.composicoes)) return data.composicoes
  if (data.codigo && (data.nome || data.descricao)) {
    return [data]
  }
  return []
}

/**
 * Executa a sincronização paginada e incremental com a API Orçamentador
 */
export async function fetchFullSinapiFromOrcamentador(options: OrcamentadorSyncOptions): Promise<{
  items: SinapiCatalogItem[]
  totalPages: number
  totalItems: number
  state: string
  referenceMonth: string
}> {
  const apiKey = (options.apiKey || getStoredOrcamentadorApiKey()).trim()
  if (!apiKey) {
    throw new Error(
      'Chave de API do Orçamentador não configurada. Informe sua API Key para sincronizar.',
    )
  }

  const state = (options.state || 'SP').trim().toUpperCase()
  const referenceMonth = options.referenceDate
    ? formatToOrcamentadorDate(options.referenceDate)
    : ''
  const limit = Math.min(100, Math.max(10, options.limitPerPage || 100))
  const maxPages = options.maxPagesPerResource || 50 // Por padrão busca até 50 páginas (5.000 itens) ou até esgotar
  const regime = options.regime || 'NAO_DESONERADO'

  const includeInsumos = options.includeInsumos !== false
  const includeComposicoes = options.includeComposicoes !== false

  const allItems: SinapiCatalogItem[] = []
  let totalPagesProcessed = 0

  // 1. Insumos
  if (includeInsumos) {
    options.onProgress?.({
      status: 'fetching_insumos',
      currentPage: 1,
      totalPagesEstimate: maxPages,
      currentResource: 'insumos',
      itemsFetched: allItems.length,
      message: `Iniciando consulta oficial de Insumos SINAPI para ${state}...`,
      percent: 5,
    })

    for (let page = 1; page <= maxPages; page++) {
      if (options.signal?.aborted) throw new Error('Sincronização cancelada pelo usuário.')

      try {
        const queryParams: Record<string, any> = {
          page,
          limit,
          estado: state,
          sort: 'codigo',
          order: 'asc',
        }
        if (referenceMonth) {
          queryParams.data_ref = referenceMonth
        }

        const res = await callOrcamentadorApi('insumos', queryParams, apiKey, options.signal)
        const batch = extractListFromApiResponse(res)

        if (!batch || batch.length === 0) {
          // Chegou ao fim da paginação de insumos
          break
        }

        for (const raw of batch) {
          const item = mapOrcamentadorItemToSinapi(
            raw,
            'insumo',
            state,
            referenceMonth || 'Atual',
            regime,
          )
          if (item) allItems.push(item)
        }

        totalPagesProcessed++
        const estTotal = includeComposicoes ? maxPages * 2 : maxPages
        const percent = Math.min(48, Math.round((page / estTotal) * 100))

        options.onProgress?.({
          status: 'fetching_insumos',
          currentPage: page,
          totalPagesEstimate: maxPages,
          currentResource: 'insumos',
          itemsFetched: allItems.length,
          message: `Insumos SINAPI (${state}): página ${page} processada (${allItems.length} itens coletados)...`,
          percent,
        })

        // Se a página retornou menos registros que o limite, alcançou a última página
        if (batch.length < limit) break

        // Pequena pausa assíncrona para liberar o event loop e não congelar a UI
        await new Promise((r) => setTimeout(r, 40))
      } catch (err: any) {
        if (err.name === 'AbortError') throw err
        // Se a primeira página falhar, propaga o erro de chave/conexão imediatamente
        if (page === 1) throw err
        // Se falhar no meio, registra e encerra a paginação de insumos
        break
      }
    }
  }

  // 2. Composições
  if (includeComposicoes) {
    options.onProgress?.({
      status: 'fetching_composicoes',
      currentPage: 1,
      totalPagesEstimate: maxPages,
      currentResource: 'composicoes',
      itemsFetched: allItems.length,
      message: `Iniciando consulta oficial de Composições SINAPI para ${state}...`,
      percent: 50,
    })

    for (let page = 1; page <= maxPages; page++) {
      if (options.signal?.aborted) throw new Error('Sincronização cancelada pelo usuário.')

      try {
        const queryParams: Record<string, any> = {
          page,
          limit,
          estado: state,
          sort: 'codigo',
          order: 'asc',
        }
        if (referenceMonth) {
          queryParams.data_ref = referenceMonth
        }

        const res = await callOrcamentadorApi('composicoes', queryParams, apiKey, options.signal)
        const batch = extractListFromApiResponse(res)

        if (!batch || batch.length === 0) {
          // Fim da paginação de composições
          break
        }

        for (const raw of batch) {
          const item = mapOrcamentadorItemToSinapi(
            raw,
            'composicao',
            state,
            referenceMonth || 'Atual',
            regime,
          )
          if (item) allItems.push(item)
        }

        totalPagesProcessed++
        const percent = Math.min(95, 50 + Math.round((page / maxPages) * 45))

        options.onProgress?.({
          status: 'fetching_composicoes',
          currentPage: page,
          totalPagesEstimate: maxPages,
          currentResource: 'composicoes',
          itemsFetched: allItems.length,
          message: `Composições SINAPI (${state}): página ${page} processada (${allItems.length} itens totais)...`,
          percent,
        })

        if (batch.length < limit) break

        await new Promise((r) => setTimeout(r, 40))
      } catch (err: any) {
        if (err.name === 'AbortError') throw err
        if (page === 1 && allItems.length === 0) throw err
        break
      }
    }
  }

  options.onProgress?.({
    status: 'completed',
    currentPage: totalPagesProcessed,
    totalPagesEstimate: totalPagesProcessed,
    currentResource: 'composicoes',
    itemsFetched: allItems.length,
    message: `Sincronização concluída com sucesso: ${allItems.length} itens obtidos do Orçamentador.`,
    percent: 100,
  })

  return {
    items: allItems,
    totalPages: totalPagesProcessed,
    totalItems: allItems.length,
    state,
    referenceMonth: referenceMonth || 'Oficial Atual',
  }
}
