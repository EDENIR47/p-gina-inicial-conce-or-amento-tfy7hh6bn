/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Cliente de Integração com autoSINAPI API (github.com/LAMP-LUCAS/autoSINAPI_API)
 * Distribuição RESTful/JSON de alto desempenho dos dados públicos oficiais do SINAPI (Caixa Econômica Federal)
 * Autenticação via header X-API-KEY, paginação e normalização para o catálogo CONCE.
 */

import { SinapiCatalogItem } from '@/types/sinapi'
import { InputCategory } from '@/types/budgetEngine'
import { getStoredAutosinapiBaseUrl, getStoredAutosinapiApiKey } from '@/lib/sinapiStorage'
import pb from '@/lib/pocketbase/client'

export interface AutosinapiSyncOptions {
  baseUrl?: string // Ex: "http://localhost:8000" ou URL pública da instância/ngrok
  apiKey?: string // Header X-API-KEY
  state: string // Ex: "SP", "RS", "RJ"
  referenceDate?: string // Formato autoSINAPI "AAAA.MM" ou "AAAA-MM" ou "MM/AAAA"
  regime?: 'NAO_DESONERADO' | 'DESONERADO' | 'SEM_ENCARGOS' | 'TODOS'
  includeInsumos?: boolean
  includeComposicoes?: boolean
  maxPagesPerResource?: number // Limite seguro de páginas por ciclo
  limitPerPage?: number // Máximo 100
  onProgress?: (progress: AutosinapiSyncProgress) => void
  signal?: AbortSignal
}

export interface AutosinapiSyncProgress {
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

export interface AutosinapiItemRaw {
  codigo?: string | number
  code?: string | number
  item_codigo?: string | number
  descricao?: string
  description?: string
  nome?: string
  unidade?: string
  unit?: string
  classificacao?: string
  classification?: string
  grupo?: string
  group?: string
  status?: string
  tipo?: string
  type?: string
  tipo_item?: string
  preco?: string | number
  price?: string | number
  preco_mediano?: string | number
  custo_total?: string | number
  valor_total?: string | number
  regime?: string
  uf?: string
  data_referencia?: string
  // BOM / Itens de composição analítica
  itens?: Array<{
    item_codigo?: string | number
    codigo?: string | number
    descricao?: string
    unidade?: string
    coeficiente?: number | string
    tipo_item?: string
    custo_unitario?: number | string
  }>
  estrutura?: Array<{
    item_codigo?: string | number
    codigo?: string | number
    descricao?: string
    unidade?: string
    coeficiente?: number | string
    tipo_item?: string
    custo_unitario?: number | string
  }>
}

/**
 * Normaliza formato de data de referência da autoSINAPI (ex: "2024.07" ou "2024_07" ou "2024-07")
 */
export function formatToAutosinapiDate(dateStr: string): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()

  // Se já vier no formato AAAA.MM
  if (/^\d{4}\.\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // Formato AAAA-MM ou AAAA-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)
  if (isoMatch) {
    return `${isoMatch[1]}.${isoMatch[2]}`
  }

  // Formato AAAA_MM
  const underMatch = trimmed.match(/^(\d{4})_(\d{2})$/)
  if (underMatch) {
    return `${underMatch[1]}.${underMatch[2]}`
  }

  // Formato MM/AAAA
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0')
    const year = slashMatch[2]
    return `${year}.${month}`
  }

  return trimmed
}

/**
 * Converte data autoSINAPI "AAAA.MM" para exibição amigável "MM/AAAA"
 */
export function formatAutosinapiDateToDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const match = dateStr.trim().match(/^(\d{4})\.(\d{2})$/)
  if (match) {
    return `${match[2]}/${match[1]}`
  }
  return dateStr
}

/**
 * Normaliza a categoria do insumo autoSINAPI para os tipos padrão CONCE
 */
export function normalizeAutosinapiCategory(
  classificacao?: string,
  tipo?: string,
  unidade?: string,
): InputCategory {
  const text = `${classificacao || ''} ${tipo || ''} ${unidade || ''}`.toUpperCase()

  if (
    text.includes('MAO DE OBRA') ||
    text.includes('MÃO DE OBRA') ||
    text.includes('ENCARGOS') ||
    text.includes('HORISTA') ||
    text.includes('MENSALISTA') ||
    text.includes('PEDREIRO') ||
    text.includes('SERVENTE') ||
    text.includes('PINTOR') ||
    text.includes('ELETRICISTA') ||
    text.includes('CARPINTEIRO') ||
    text.includes('ENCANADOR') ||
    text === 'H' ||
    text === 'HORA'
  ) {
    return 'mao_de_obra'
  }

  if (
    text.includes('EQUIP') ||
    text.includes('MAQUINA') ||
    text.includes('MÁQUINA') ||
    text.includes('LOCACAO') ||
    text.includes('LOCAÇÃO') ||
    text.includes('CHI') ||
    text.includes('CHP') ||
    text.includes('VEICULO') ||
    text.includes('CAMINHAO')
  ) {
    return 'equipamento'
  }

  if (
    text.includes('SERVICO') ||
    text.includes('SERVIÇO') ||
    text.includes('TERCEIR') ||
    text.includes('SUBEMPREIT')
  ) {
    return 'servico_terceiro'
  }

  return 'material'
}

/**
 * Mapeia item bruto do autoSINAPI para o modelo SinapiCatalogItem da CONCE
 */
export function mapAutosinapiItemToSinapi(
  raw: AutosinapiItemRaw,
  type: 'insumo' | 'composicao',
  state: string,
  referenceDate: string,
  regime: 'NAO_DESONERADO' | 'DESONERADO' | 'SEM_ENCARGOS' | 'TODOS' = 'NAO_DESONERADO',
): SinapiCatalogItem | null {
  const codeRaw = String(raw.codigo ?? raw.code ?? raw.item_codigo ?? '').trim()
  if (!codeRaw) return null

  const numericCode = codeRaw.replace(/\D/g, '') || codeRaw
  const code = codeRaw.toUpperCase().startsWith('SINAPI-')
    ? codeRaw.toUpperCase()
    : `SINAPI-${codeRaw}`

  const description = String(
    raw.descricao || raw.description || raw.nome || 'Item SINAPI Oficial',
  ).trim()
  const unit = String(raw.unidade || raw.unit || (type === 'composicao' ? 'm²' : 'un')).trim()

  // Extrai preço numérico mediano ou custo total
  const rawPrice =
    raw.preco ?? raw.price ?? raw.preco_mediano ?? raw.custo_total ?? raw.valor_total ?? 0
  let price =
    typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(',', '.')) || 0

  const category = normalizeAutosinapiCategory(
    raw.classificacao || raw.classification || raw.grupo || raw.group,
    raw.tipo || raw.type || raw.tipo_item,
    unit,
  )

  const specialty = String(
    raw.grupo ||
      raw.group ||
      raw.classificacao ||
      (type === 'composicao' ? 'Composições Gerais' : 'Materiais & Insumos'),
  ).trim()

  // BOM / Composição Analítica se presente no payload
  const rawBOM = raw.itens || raw.estrutura
  let compositionInputs: SinapiCatalogItem['compositionInputs']
  if (Array.isArray(rawBOM) && rawBOM.length > 0) {
    compositionInputs = rawBOM.map((child) => {
      const childCodeRaw = String(child.codigo ?? child.item_codigo ?? '').trim()
      const childNumeric = childCodeRaw.replace(/\D/g, '') || childCodeRaw
      const childUnit = String(child.unidade || 'un').trim()
      const childCost = Number(child.custo_unitario) || 0
      const childCoef = Number(child.coeficiente) || 1

      return {
        code: childCodeRaw.toUpperCase().startsWith('SINAPI-')
          ? childCodeRaw.toUpperCase()
          : `SINAPI-${childNumeric}`,
        description: String(child.descricao || 'Sub-insumo SINAPI').trim(),
        unit: childUnit,
        category: normalizeAutosinapiCategory('', child.tipo_item, childUnit),
        coefficient: childCoef,
        unitCost: childCost,
      }
    })
  }

  const displayDate = formatAutosinapiDateToDisplay(referenceDate)

  return {
    id: `autosinapi-${type}-${numericCode}`,
    code,
    numericCode,
    type,
    description,
    unit,
    category,
    specialty,
    referencePrice: Math.abs(price),
    priceOrigin: 'api_autosinapi',
    referenceMonth: displayDate || referenceDate || 'Oficial Atual',
    referenceState: state.toUpperCase(),
    notes: `SINAPI Oficial via autoSINAPI (${state.toUpperCase()} • ${referenceDate || 'Atual'} • ${regime})`,
    compositionInputs,
  }
}

/**
 * Chamada HTTP à autoSINAPI:
 * Tenta primeiro via proxy backend PocketBase (evita bloqueios de CORS do browser e protege segredos)
 * e faz fallback para fetch direto caso o proxy encontre rota local acessível pelo browser.
 */
export async function callAutosinapi(
  endpoint: string,
  params: Record<string, any>,
  options?: {
    baseUrl?: string
    apiKey?: string
    method?: 'GET' | 'POST'
    payload?: any
    signal?: AbortSignal
  },
): Promise<any> {
  const baseUrl = (options?.baseUrl || getStoredAutosinapiBaseUrl()).trim().replace(/\/+$/, '')
  const apiKey = (options?.apiKey || getStoredAutosinapiApiKey()).trim()
  const cleanEndpoint = endpoint.trim().replace(/^\/+/, '')

  // Tentativa 1: Via proxy do backend Skip Cloud (PocketBase /backend/v1/autosinapi-proxy)
  try {
    const proxyRes: any = await pb.send('/backend/v1/autosinapi-proxy', {
      method: 'POST',
      body: {
        baseUrl,
        apiKey,
        endpoint: cleanEndpoint,
        params,
        method: options?.method || 'GET',
        payload: options?.payload,
      },
      signal: options?.signal,
    })

    if (proxyRes) {
      if (proxyRes.success && proxyRes.data !== undefined) {
        return proxyRes.data
      }
      if (proxyRes.error) {
        throw new Error(proxyRes.error)
      }
      return proxyRes
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err

    const status = err.status || err.statusCode
    if (status === 401 || status === 403) {
      const msg =
        err.data?.error ||
        'Chave X-API-KEY da autoSINAPI inválida ou ausente. Verifique a chave de acesso da instância.'
      throw new Error(msg)
    }

    // Se o backend retornou mensagem clara e específica, propaga
    if (
      err.data?.error ||
      err.message?.includes('autoSINAPI') ||
      err.message?.includes('X-API-KEY') ||
      err.message?.includes('não permitido')
    ) {
      // Se não for erro de conexão do proxy, propaga
      if (!err.message?.includes('Falha na comunicação com a instância autoSINAPI')) {
        throw new Error(err.data?.error || err.message)
      }
    }
    // Caso de proxy inacessível ao localhost do usuário (ex: PB na nuvem não alcança http://localhost:8000 sem túnel):
    // Faz tentativa direta do browser para o localhost do usuário!
  }

  // Tentativa 2: Direto pelo navegador (especialmente útil quando baseUrl = http://localhost:8000)
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      query.set(k, String(v))
    }
  }

  let directUrl = `${baseUrl}/${cleanEndpoint}`
  const queryString = query.toString()
  if (queryString) {
    directUrl += (directUrl.includes('?') ? '&' : '?') + queryString
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (apiKey) {
    headers['X-API-KEY'] = apiKey
  }

  const directRes = await fetch(directUrl, {
    method: options?.method || 'GET',
    headers,
    body: options?.payload ? JSON.stringify(options.payload) : undefined,
    signal: options?.signal,
  })

  if (!directRes.ok) {
    if (directRes.status === 401 || directRes.status === 403) {
      throw new Error('Chave X-API-KEY da autoSINAPI inválida ou não autorizada.')
    }
    if (directRes.status === 404) {
      throw new Error(
        `Endpoint '${cleanEndpoint}' não encontrado na instância autoSINAPI (HTTP 404).`,
      )
    }
    const errText = await directRes.text().catch(() => '')
    let errParsed: any = null
    try {
      errParsed = JSON.parse(errText)
    } catch {
      /* ignore */
    }
    throw new Error(
      errParsed?.detail ||
        errParsed?.erro ||
        errParsed?.message ||
        `Erro na instância autoSINAPI (HTTP ${directRes.status})`,
    )
  }

  return directRes.json()
}

/**
 * Testa conectividade com a instância autoSINAPI (URL base + X-API-KEY)
 * Verifica rota raiz "/", "/health", "/status" ou consulta de insumos.
 */
export async function testAutosinapiConnection(
  baseUrl: string,
  apiKey: string,
): Promise<{ valid: boolean; message: string; version?: string }> {
  const cleanUrl = (baseUrl || '').trim().replace(/\/+$/, '')
  if (!cleanUrl) {
    return { valid: false, message: 'URL base da autoSINAPI não informada.' }
  }

  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return {
      valid: false,
      message: 'A URL da instância deve iniciar com http:// ou https://',
    }
  }

  try {
    // Tenta primeiro o endpoint de status ou raiz
    let testEndpoints = ['', 'health', 'status', 'insumos']
    let lastError = ''

    for (const ep of testEndpoints) {
      try {
        const queryParams = ep === 'insumos' ? { limit: 1 } : {}
        const data = await callAutosinapi(ep, queryParams, {
          baseUrl: cleanUrl,
          apiKey: apiKey.trim(),
        })

        if (data !== undefined && data !== null) {
          const versionInfo =
            data?.version || data?.versao || data?.app_version || 'autoSINAPI FastAPI'
          return {
            valid: true,
            message: `Conexão estabelecida com sucesso com a instância autoSINAPI! (${cleanUrl})`,
            version: typeof versionInfo === 'string' ? versionInfo : undefined,
          }
        }
      } catch (innerErr: any) {
        lastError = innerErr.message || String(innerErr)
        // Se for erro de autorização 401/403, já sabemos que a URL existe mas a chave está errada
        if (
          lastError.includes('X-API-KEY') ||
          lastError.includes('401') ||
          lastError.includes('403')
        ) {
          return {
            valid: false,
            message:
              'Instância autoSINAPI encontrada, porém a chave X-API-KEY informada foi rejeitada.',
          }
        }
      }
    }

    return {
      valid: false,
      message:
        lastError ||
        'Não foi possível conectar à instância autoSINAPI. Se estiver em localhost, utilize um túnel (ngrok, localtunnel ou Cloudflare) ou verifique se o serviço está ativo na porta informada.',
    }
  } catch (err: any) {
    return {
      valid: false,
      message:
        err.message ||
        'Falha ao conectar à instância autoSINAPI. Verifique a URL e se o serviço está em execução.',
    }
  }
}

/**
 * Extrai lista de itens de múltiplos formatos comuns da API REST autoSINAPI:
 * - array direto [...]
 * - envelope { data: [...], total: N }
 * - envelope { items: [...], total: N }
 * - envelope { insumos: [...] } ou { composicoes: [...] }
 * - envelope { results: [...] }
 */
function extractListFromAutosinapiResponse(data: any): AutosinapiItemRaw[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.results)) return data.results
  if (Array.isArray(data.insumos)) return data.insumos
  if (Array.isArray(data.composicoes)) return data.composicoes
  if (Array.isArray(data.itens)) return data.itens
  if (data.codigo || data.code || data.item_codigo) return [data]
  return []
}

/**
 * Executa a sincronização paginada e incremental com a autoSINAPI API
 */
export async function fetchFullSinapiFromAutosinapi(options: AutosinapiSyncOptions): Promise<{
  items: SinapiCatalogItem[]
  totalPages: number
  totalItems: number
  state: string
  referenceMonth: string
}> {
  const baseUrl = (options.baseUrl || getStoredAutosinapiBaseUrl()).trim().replace(/\/+$/, '')
  const apiKey = (options.apiKey || getStoredAutosinapiApiKey()).trim()
  const state = (options.state || 'SP').trim().toUpperCase()
  const referenceDate = options.referenceDate ? formatToAutosinapiDate(options.referenceDate) : ''
  const limit = Math.min(100, Math.max(10, options.limitPerPage || 100))
  const maxPages = options.maxPagesPerResource || 30
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
      message: `Iniciando consulta de Insumos na autoSINAPI (${state} • ${referenceDate || 'Atual'})...`,
      percent: 5,
    })

    for (let page = 1; page <= maxPages; page++) {
      if (options.signal?.aborted) throw new Error('Sincronização cancelada pelo usuário.')

      try {
        const offset = (page - 1) * limit
        const queryParams: Record<string, any> = {
          uf: state,
          estado: state,
          limit,
          offset,
          page,
          regime,
        }
        if (referenceDate) {
          queryParams.data_referencia = referenceDate
          queryParams.data_ref = referenceDate
          queryParams.referencia = referenceDate
        }

        // Tenta endpoint 'insumos'
        const res = await callAutosinapi('insumos', queryParams, {
          baseUrl,
          apiKey,
          signal: options.signal,
        })

        const batch = extractListFromAutosinapiResponse(res)
        if (!batch || batch.length === 0) {
          break
        }

        for (const raw of batch) {
          const item = mapAutosinapiItemToSinapi(
            raw,
            'insumo',
            state,
            referenceDate || 'Atual',
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
          message: `autoSINAPI Insumos (${state}): lote ${page} (${allItems.length} itens)...`,
          percent,
        })

        if (batch.length < limit) break

        await new Promise((r) => setTimeout(r, 40))
      } catch (err: any) {
        if (err.name === 'AbortError') throw err
        if (page === 1) throw err
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
      message: `Iniciando consulta de Composições na autoSINAPI (${state} • ${referenceDate || 'Atual'})...`,
      percent: 50,
    })

    for (let page = 1; page <= maxPages; page++) {
      if (options.signal?.aborted) throw new Error('Sincronização cancelada pelo usuário.')

      try {
        const offset = (page - 1) * limit
        const queryParams: Record<string, any> = {
          uf: state,
          estado: state,
          limit,
          offset,
          page,
          regime,
        }
        if (referenceDate) {
          queryParams.data_referencia = referenceDate
          queryParams.data_ref = referenceDate
          queryParams.referencia = referenceDate
        }

        const res = await callAutosinapi('composicoes', queryParams, {
          baseUrl,
          apiKey,
          signal: options.signal,
        })

        const batch = extractListFromAutosinapiResponse(res)
        if (!batch || batch.length === 0) {
          break
        }

        for (const raw of batch) {
          const item = mapAutosinapiItemToSinapi(
            raw,
            'composicao',
            state,
            referenceDate || 'Atual',
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
          message: `autoSINAPI Composições (${state}): lote ${page} (${allItems.length} itens totais)...`,
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

  const displayDate = formatAutosinapiDateToDisplay(referenceDate)

  options.onProgress?.({
    status: 'completed',
    currentPage: totalPagesProcessed,
    totalPagesEstimate: totalPagesProcessed,
    currentResource: 'composicoes',
    itemsFetched: allItems.length,
    message: `Sincronização concluída com sucesso: ${allItems.length} itens obtidos via autoSINAPI API.`,
    percent: 100,
  })

  return {
    items: allItems,
    totalPages: totalPagesProcessed,
    totalItems: allItems.length,
    state,
    referenceMonth: displayDate || referenceDate || 'Oficial Atual',
  }
}
