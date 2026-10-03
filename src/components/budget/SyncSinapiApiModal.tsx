/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal de Sincronização Oficial da Tabela SINAPI
 * Provedores suportados:
 * 1. API Orçamentador (SaaS proprietário orcamentador.com.br)
 * 2. API personalizada autoSINAPI (Open-Source github.com/LAMP-LUCAS/autoSINAPI_API)
 *
 * Recursos:
 * - Seleção de Provedor com abas intuitivas
 * - Na autoSINAPI: URL base da instância configurável (ex: http://localhost:8000 ou túnel ngrok) + header X-API-KEY
 * - Teste de conectividade com resposta em tempo real
 * - Formato de data SINAPI: AAAA.MM para autoSINAPI (ex: mês corrente) ou AAAA-MM-01 para Orçamentador
 * - Paginação incremental, barra de progresso, cancelamento seguro
 * - Merge por código SINAPI preservando composições e orçamentos do usuário
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Globe,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers,
  StopCircle,
  Server,
  Terminal,
  Cpu,
} from 'lucide-react'
import { BRAZIL_STATES_LIST } from '@/lib/chargesData'
import {
  getStoredOrcamentadorApiKey,
  saveStoredOrcamentadorApiKey,
  getStoredAutosinapiBaseUrl,
  saveStoredAutosinapiBaseUrl,
  getStoredAutosinapiApiKey,
  saveStoredAutosinapiApiKey,
  mergeImportedSinapiItems,
  getSinapiImportMetadata,
  getApiSyncedItemsCount,
  clearOfficialApiSyncedItems,
} from '@/lib/sinapiStorage'
import { Trash2 } from 'lucide-react'
import {
  fetchFullSinapiFromOrcamentador,
  testOrcamentadorApiKey,
  OrcamentadorSyncProgress,
} from '@/lib/orcamentadorService'
import {
  fetchFullSinapiFromAutosinapi,
  testAutosinapiConnection,
  AutosinapiSyncProgress,
  formatToAutosinapiDate,
} from '@/lib/autosinapiService'

export type SinapiApiProvider = 'orcamentador' | 'autosinapi'

interface SyncSinapiApiModalProps {
  isOpen: boolean
  onClose: () => void
  onSyncSuccess: (result: {
    updatedCount: number
    createdCount: number
    totalCount: number
  }) => void
  onCatalogCleaned?: () => void
}

export const SyncSinapiApiModal: React.FC<SyncSinapiApiModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
  onCatalogCleaned,
}) => {
  // Provedor selecionado
  const [provider, setProvider] = useState<SinapiApiProvider>('orcamentador')

  // Configurações Orçamentador
  const [orcamentadorKey, setOrcamentadorKey] = useState('')
  const [showOrcamentadorKeyInput, setShowOrcamentadorKeyInput] = useState(false)

  // Configurações autoSINAPI
  const [autosinapiBaseUrl, setAutosinapiBaseUrl] = useState('http://localhost:8000')
  const [autosinapiKey, setAutosinapiKey] = useState('')
  const [showAutosinapiKeyInput, setShowAutosinapiKeyInput] = useState(false)

  // Helpers para cálculo do mês corrente nos formatos de cada API
  const getCurrentMonthDates = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return {
      autosinapi: `${year}.${month}`,
      orcamentador: `${year}-${month}-01`,
      display: `${month}/${year}`,
    }
  }

  const currentMonthDates = getCurrentMonthDates()

  // Parâmetros comuns — Padrão RS (CONCE Engenharia) e mês corrente dinâmico
  const [referenceState, setReferenceState] = useState('RS')
  const [referenceDate, setReferenceDate] = useState(() => getCurrentMonthDates().orcamentador)
  const [regime, setRegime] = useState<'NAO_DESONERADO' | 'DESONERADO' | 'TODOS'>('NAO_DESONERADO')
  const [batchScope, setBatchScope] = useState<'all' | 'insumos' | 'composicoes'>('all')
  const [maxPages, setMaxPages] = useState<number>(30) // 30 páginas = até 3.000 itens por ciclo

  // Estados de confirmação antes de sincronizar
  const [showConfirmStep, setShowConfirmStep] = useState(false)

  // Estados de limpeza rápida de itens oficiais
  const [cleaningNotice, setCleaningNotice] = useState<string | null>(null)

  // Estados de teste de conexão
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    tested: boolean
    valid: boolean
    message: string
  } | null>(null)

  // Estados de sincronização
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{
    percent: number
    message: string
    itemsFetched: number
  } | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncSuccessResult, setSyncSuccessResult] = useState<{
    updatedCount: number
    createdCount: number
    totalCount: number
    sourceProvider: SinapiApiProvider
  } | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Carrega configurações salvas ao abrir o modal e reseta para valores seguros
  useEffect(() => {
    if (isOpen) {
      const storedOrcKey = getStoredOrcamentadorApiKey()
      setOrcamentadorKey(storedOrcKey)
      setShowOrcamentadorKeyInput(!storedOrcKey)

      const storedAutoUrl = getStoredAutosinapiBaseUrl()
      setAutosinapiBaseUrl(storedAutoUrl || 'http://localhost:8000')

      const storedAutoKey = getStoredAutosinapiApiKey()
      setAutosinapiKey(storedAutoKey)
      setShowAutosinapiKeyInput(!storedAutoKey)

      // Garante padrão dinâmico atualizado ao reabrir
      const dates = getCurrentMonthDates()
      setReferenceDate(provider === 'autosinapi' ? dates.autosinapi : dates.orcamentador)

      setShowConfirmStep(false)
      setCleaningNotice(null)
      setTestResult(null)
      setSyncError(null)
      setSyncSuccessResult(null)
      setSyncProgress(null)
    }
  }, [isOpen])

  // Ajusta formato padrão de data de acordo com o provedor dinamicamente com base no mês corrente
  const handleSelectProvider = (newProvider: SinapiApiProvider) => {
    setProvider(newProvider)
    setTestResult(null)
    setSyncError(null)
    setShowConfirmStep(false)
    const dates = getCurrentMonthDates()
    if (newProvider === 'autosinapi') {
      if (!referenceDate || referenceDate.includes('-')) {
        setReferenceDate(dates.autosinapi)
      }
    } else {
      if (!referenceDate || referenceDate.includes('.')) {
        setReferenceDate(dates.orcamentador)
      }
    }
  }

  if (!isOpen) return null

  // Testar conexão com o provedor selecionado
  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    setSyncError(null)

    try {
      if (provider === 'orcamentador') {
        if (!orcamentadorKey.trim()) {
          setTestResult({
            tested: true,
            valid: false,
            message: 'Informe a API Key do Orçamentador antes de testar.',
          })
          setIsTesting(false)
          return
        }
        const res = await testOrcamentadorApiKey(orcamentadorKey)
        setTestResult({
          tested: true,
          valid: res.valid,
          message: res.message,
        })
        if (res.valid) {
          saveStoredOrcamentadorApiKey(orcamentadorKey)
        }
      } else {
        // autoSINAPI
        const urlToTest = autosinapiBaseUrl.trim() || 'http://localhost:8000'
        saveStoredAutosinapiBaseUrl(urlToTest)
        if (autosinapiKey.trim()) {
          saveStoredAutosinapiApiKey(autosinapiKey)
        }

        const res = await testAutosinapiConnection(urlToTest, autosinapiKey)
        setTestResult({
          tested: true,
          valid: res.valid,
          message: res.message,
        })
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        valid: false,
        message: err.message || 'Falha ao testar conexão com o provedor.',
      })
    } finally {
      setIsTesting(false)
    }
  }

  // Executar sincronização efetiva
  const executeSync = async () => {
    setIsSyncing(true)
    setShowConfirmStep(false)
    setSyncError(null)
    setSyncSuccessResult(null)
    abortControllerRef.current = new AbortController()
    const startTime = Date.now()

    try {
      if (provider === 'orcamentador') {
        const keyToUse = orcamentadorKey.trim() || getStoredOrcamentadorApiKey()
        if (!keyToUse) {
          setSyncError(
            'É obrigatório informar uma chave de acesso da API Orçamentador para sincronizar.',
          )
          setShowOrcamentadorKeyInput(true)
          setIsSyncing(false)
          return
        }
        saveStoredOrcamentadorApiKey(keyToUse)

        const result = await fetchFullSinapiFromOrcamentador({
          apiKey: keyToUse,
          state: referenceState,
          referenceDate,
          regime,
          includeInsumos: batchScope === 'all' || batchScope === 'insumos',
          includeComposicoes: batchScope === 'all' || batchScope === 'composicoes',
          maxPagesPerResource: maxPages,
          limitPerPage: 100,
          signal: abortControllerRef.current.signal,
          onProgress: (p: OrcamentadorSyncProgress) => {
            setSyncProgress({
              percent: p.percent,
              message: p.message,
              itemsFetched: p.itemsFetched,
            })
          },
        })

        if (result.items.length === 0) {
          setSyncError(
            `Nenhum item SINAPI retornado pela API Orçamentador para o estado ${referenceState} na data selecionada.`,
          )
          setIsSyncing(false)
          return
        }

        const mergeStats = mergeImportedSinapiItems(result.items, {
          referenceMonth: referenceDate || 'Oficial Atual',
          referenceState,
          fileName: `API_Orcamentador_${referenceState}_${referenceDate || 'Atual'}`,
          priceOrigin: 'api_orcamentador',
          sourceType: 'api_orcamentador',
          syncedPages: result.totalPages,
          lastSyncDurationMs: Date.now() - startTime,
        })

        setSyncSuccessResult({ ...mergeStats, sourceProvider: 'orcamentador' })
        onSyncSuccess(mergeStats)
      } else {
        // Sincronização via autoSINAPI
        const urlToUse = (autosinapiBaseUrl || getStoredAutosinapiBaseUrl()).trim()
        const keyToUse = (autosinapiKey || getStoredAutosinapiApiKey()).trim()
        saveStoredAutosinapiBaseUrl(urlToUse)
        if (keyToUse) saveStoredAutosinapiApiKey(keyToUse)

        const formattedDate = formatToAutosinapiDate(referenceDate)

        const result = await fetchFullSinapiFromAutosinapi({
          baseUrl: urlToUse,
          apiKey: keyToUse,
          state: referenceState,
          referenceDate: formattedDate,
          regime,
          includeInsumos: batchScope === 'all' || batchScope === 'insumos',
          includeComposicoes: batchScope === 'all' || batchScope === 'composicoes',
          maxPagesPerResource: maxPages,
          limitPerPage: 100,
          signal: abortControllerRef.current.signal,
          onProgress: (p: AutosinapiSyncProgress) => {
            setSyncProgress({
              percent: p.percent,
              message: p.message,
              itemsFetched: p.itemsFetched,
            })
          },
        })

        if (result.items.length === 0) {
          setSyncError(
            `Nenhum item retornado pela autoSINAPI para a UF ${referenceState} na data ${formattedDate || 'selecionada'}. Verifique se a sua instância já executou 'make populate-db' para esse período ou consulte os logs do container.`,
          )
          setIsSyncing(false)
          return
        }

        const mergeStats = mergeImportedSinapiItems(result.items, {
          referenceMonth: result.referenceMonth || formattedDate || 'Oficial Atual',
          referenceState,
          fileName: `API_autoSINAPI_${referenceState}_${formattedDate || 'Atual'}`,
          priceOrigin: 'api_autosinapi',
          sourceType: 'api_autosinapi',
          syncedPages: result.totalPages,
          lastSyncDurationMs: Date.now() - startTime,
        })

        setSyncSuccessResult({ ...mergeStats, sourceProvider: 'autosinapi' })
        onSyncSuccess(mergeStats)
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('cancelada')) {
        setSyncError('Sincronização interrompida com segurança pelo usuário.')
      } else {
        setSyncError(
          err.message ||
            'Não foi possível concluir a sincronização com a API. Verifique a URL, chave de acesso e se o serviço está online.',
        )
      }
    } finally {
      setIsSyncing(false)
    }
  }

  // Pede confirmação antes de disparar sincronização
  const handleRequestSync = () => {
    setSyncError(null)
    setShowConfirmStep(true)
  }

  const handleCancelSync = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const existingMeta = getSinapiImportMetadata()

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-[#171A1F]/20 overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#171A1F] to-[#294C87] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#FF6B1F] text-white shadow-md">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  Sincronizar Catálogo Oficial SINAPI
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wide">
                  REST / JSON
                </span>
              </div>
              <p className="text-xs text-white/80">
                Integração oficial de insumos e composições por Estado e Data de Referência
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Provedor (Abas) */}
        <div className="bg-[#F8F9FA] border-b border-[#171A1F]/10 px-4 sm:px-6 pt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSelectProvider('orcamentador')}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              provider === 'orcamentador'
                ? 'bg-white text-[#294C87] border-[#294C87] shadow-sm -mb-[1px]'
                : 'text-[#171A1F]/60 border-transparent hover:text-[#171A1F]'
            }`}
          >
            <Globe className="w-4 h-4 text-[#FF6B1F]" />
            <span>API Orçamentador</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectProvider('autosinapi')}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              provider === 'autosinapi'
                ? 'bg-white text-[#294C87] border-[#294C87] shadow-sm -mb-[1px]'
                : 'text-[#171A1F]/60 border-transparent hover:text-[#171A1F]'
            }`}
          >
            <Server className="w-4 h-4 text-[#FF6B1F]" />
            <span>API Personalizada (autoSINAPI)</span>
            <span className="px-1.5 py-0.2 rounded bg-[#FF6B1F]/15 text-[#FF6B1F] text-[10px] font-extrabold uppercase">
              Open-Source
            </span>
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {/* Alerta de proteção de dados */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#171A1F]/80 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#294C87] flex-shrink-0 mt-0.5" />
            <div className="text-[11px] sm:text-xs leading-relaxed">
              <strong className="text-[#294C87]">Atualização segura por código SINAPI:</strong> seus
              orçamentos em andamento, BDI TCU e composições próprias da CONCE{' '}
              <strong>não serão apagados nem desconfigurados</strong>. A origem de cada item será
              gravada como{' '}
              <span className="font-bold text-[#FF6B1F]">
                {provider === 'autosinapi' ? 'API autoSINAPI' : 'API Orçamentador'}
              </span>
              .
            </div>
          </div>

          {/* Seção 1: Configuração do Provedor Selecionado */}
          {provider === 'autosinapi' ? (
            /* Formulário da autoSINAPI */
            <div className="p-4 rounded-xl border border-[#171A1F]/15 bg-[#F8F9FA] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-[#FF6B1F]" />
                  <span>Instância autoSINAPI (FastAPI REST)</span>
                </label>

                <a
                  href="https://github.com/LAMP-LUCAS/autoSINAPI_API"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-[#294C87] hover:underline inline-flex items-center gap-1"
                >
                  <span>Ver repositório no GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Informação sobre conectividade com o backend */}
              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] text-[#171A1F]/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#FF6B1F]">
                  <Info className="w-3.5 h-3.5" />
                  <span>Dica de Conexão com sua Instância autoSINAPI:</span>
                </div>
                <p>
                  A autoSINAPI pode ser auto-hospedada (Docker) ou consumida via serviço
                  profissional em{' '}
                  <a
                    href="https://mundoaec.com/autosinapi"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[#294C87] underline"
                  >
                    mundoaec.com/autosinapi
                  </a>
                  . Caso utilize <code>http://localhost:8000</code> na sua máquina, nosso cliente
                  tenta acesso direto pelo navegador e repassa requisições pelo proxy seguro. Para
                  instâncias remotas, use a URL pública da sua infraestrutura ou um túnel seguro
                  (ngrok / Cloudflare).
                </p>
              </div>

              {/* URL Base da Instância */}
              <div>
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  URL Base da Instância autoSINAPI *
                </label>
                <input
                  type="url"
                  value={autosinapiBaseUrl}
                  onChange={(e) => setAutosinapiBaseUrl(e.target.value)}
                  placeholder="http://localhost:8000 ou https://sua-instancia.ngrok-free.app"
                  className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 bg-white font-mono text-xs focus:outline-none focus:border-[#294C87]"
                />
              </div>

              {/* Header X-API-KEY */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#171A1F] flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-[#FF6B1F]" />
                    <span>Chave de Acesso (Header X-API-KEY)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAutosinapiKeyInput(!showAutosinapiKeyInput)}
                    className="text-[11px] font-bold text-[#294C87] hover:underline cursor-pointer"
                  >
                    {showAutosinapiKeyInput ? 'Ocultar' : 'Exibir / Alterar'}
                  </button>
                </div>

                {showAutosinapiKeyInput ? (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={autosinapiKey}
                      onChange={(e) => setAutosinapiKey(e.target.value)}
                      placeholder="Chave gerada no gateway (curl http://localhost:8001/consumers/...)"
                      className="flex-1 px-3 py-2 rounded-lg border border-[#171A1F]/20 bg-white font-mono text-xs focus:outline-none focus:border-[#294C87]"
                    />
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting || !autosinapiBaseUrl.trim()}
                      className="px-3.5 py-2 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      {isTesting ? 'Testando...' : 'Testar Conexão'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1 text-xs">
                    <span className="text-[#171A1F]/70">
                      {autosinapiKey
                        ? 'Chave X-API-KEY configurada no navegador'
                        : 'Nenhuma chave configurada (instâncias sem gateway podem operar sem autenticação)'}
                    </span>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="text-xs font-bold text-[#294C87] hover:underline cursor-pointer"
                    >
                      {isTesting ? 'Testando...' : 'Testar Conexão'}
                    </button>
                  </div>
                )}
              </div>

              {/* Feedback do Teste de Conexão */}
              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.valid
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {testResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          ) : (
            /* Formulário do Orçamentador */
            <div className="p-4 rounded-xl border border-[#171A1F]/15 bg-[#F8F9FA] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[#FF6B1F]" />
                  <span>Chave de Acesso (API Key Orçamentador)</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowOrcamentadorKeyInput(!showOrcamentadorKeyInput)}
                  className="text-[11px] font-bold text-[#294C87] hover:underline cursor-pointer"
                >
                  {showOrcamentadorKeyInput
                    ? 'Ocultar Campo'
                    : orcamentadorKey
                      ? 'Alterar Chave'
                      : 'Inserir Chave'}
                </button>
              </div>

              {showOrcamentadorKeyInput ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={orcamentadorKey}
                      onChange={(e) => setOrcamentadorKey(e.target.value)}
                      placeholder="Cole sua API Key do Orçamentador aqui..."
                      className="flex-1 px-3 py-2 rounded-lg border border-[#171A1F]/20 bg-white font-mono text-xs focus:outline-none focus:border-[#294C87]"
                    />
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting || !orcamentadorKey.trim()}
                      className="px-3.5 py-2 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      {isTesting ? 'Testando...' : 'Testar Chave'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#171A1F]/60">
                    <span>Salva no navegador (localStorage) e não exposta publicamente.</span>
                    <a
                      href="https://orcamentador.com.br/api/docs"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#294C87] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Obter chave no Orçamentador</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between py-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold text-[#171A1F]">
                      {orcamentadorKey
                        ? 'Chave de API configurada no navegador'
                        : 'Nenhuma chave configurada'}
                    </span>
                  </div>
                  {orcamentadorKey && (
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="text-xs font-bold text-[#294C87] hover:underline cursor-pointer"
                    >
                      {isTesting ? 'Testando...' : 'Verificar conexão'}
                    </button>
                  )}
                </div>
              )}

              {/* Status do Teste do Orçamentador */}
              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.valid
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {testResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Seção 2: Parâmetros da Consulta (UF, Data, Regime, Escopo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Estado UF */}
            <div>
              <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#294C87]" />
                <span>Estado da Tabela (UF) *</span>
              </label>
              <select
                value={referenceState}
                onChange={(e) => setReferenceState(e.target.value)}
                disabled={isSyncing}
                className="w-full px-3 py-2 rounded-xl border border-[#171A1F]/20 text-xs font-semibold bg-white focus:outline-none focus:border-[#294C87]"
              >
                {BRAZIL_STATES_LIST.map((st) => (
                  <option key={st.uf} value={st.uf}>
                    {st.uf} — {st.stateName}
                  </option>
                ))}
              </select>
            </div>

            {/* Data de Referência */}
            <div>
              <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-[#FF6B1F]" />
                <span>Data de Referência SINAPI *</span>
              </label>
              <input
                type="text"
                value={referenceDate}
                onChange={(e) => {
                  setReferenceDate(e.target.value)
                  setShowConfirmStep(false)
                }}
                disabled={isSyncing}
                placeholder={
                  provider === 'autosinapi'
                    ? `AAAA.MM (ex: ${currentMonthDates.autosinapi})`
                    : `AAAA-MM-01 (ex: ${currentMonthDates.orcamentador})`
                }
                className="w-full px-3 py-2 rounded-xl border border-[#171A1F]/20 text-xs font-semibold bg-white focus:outline-none focus:border-[#294C87]"
              />
              <span className="text-[10px] text-[#171A1F]/50 block mt-0.5">
                {provider === 'autosinapi'
                  ? `Formato da autoSINAPI: AAAA.MM (mês corrente: ${currentMonthDates.autosinapi}).`
                  : `Padrão Caixa: formato AAAA-MM-01 (mês corrente: ${currentMonthDates.orcamentador}).`}
              </span>
            </div>

            {/* Regime de Preço */}
            <div>
              <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-[#FF6B1F]" />
                <span>Regime de Encargos / Preço</span>
              </label>
              <select
                value={regime}
                onChange={(e) => setRegime(e.target.value as any)}
                disabled={isSyncing}
                className="w-full px-3 py-2 rounded-xl border border-[#171A1F]/20 text-xs font-semibold bg-white focus:outline-none focus:border-[#294C87]"
              >
                <option value="NAO_DESONERADO">Não Desonerado (CLT Padrão)</option>
                <option value="DESONERADO">Desonerado (CPRB Lei 12.546)</option>
                <option value="TODOS">Geral (Preços Base)</option>
              </select>
            </div>

            {/* Escopo de Itens */}
            <div>
              <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-[#294C87]" />
                <span>Escopo da Sincronização</span>
              </label>
              <select
                value={batchScope}
                onChange={(e) => setBatchScope(e.target.value as any)}
                disabled={isSyncing}
                className="w-full px-3 py-2 rounded-xl border border-[#171A1F]/20 text-xs font-semibold bg-white focus:outline-none focus:border-[#294C87]"
              >
                <option value="all">Tabela Completa (Insumos + Composições)</option>
                <option value="insumos">Apenas Insumos (Materiais e Mão de Obra)</option>
                <option value="composicoes">Apenas Composições Unitárias (CPU)</option>
              </select>
            </div>
          </div>

          {/* Ajuste de Volume por Ciclo */}
          <div className="p-3 rounded-xl bg-[#171A1F]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-xs text-[#171A1F] block">
                Profundidade da Consulta Paginada
              </span>
              <span className="text-[11px] text-[#171A1F]/60">
                Determina quantas páginas de 100 itens serão baixadas neste ciclo.
              </span>
            </div>

            <select
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg border border-[#171A1F]/20 bg-white text-xs font-semibold cursor-pointer"
            >
              <option value={10}>Até 1.000 itens (Rápido ~10s)</option>
              <option value={30}>Até 3.000 itens (Recomendado ~25s)</option>
              <option value={60}>Até 6.000 itens (Extenso ~45s)</option>
              <option value={150}>Tabela Completa (~15.000 itens oficiais)</option>
            </select>
          </div>

          {/* Progresso durante a sincronização */}
          {isSyncing && syncProgress && (
            <div className="p-4 rounded-xl bg-[#294C87]/10 border border-[#294C87]/20 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-[#294C87]">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FF6B1F]" />
                  <span>
                    {provider === 'autosinapi'
                      ? 'Sincronizando com a API autoSINAPI...'
                      : 'Sincronizando com a API do Orçamentador...'}
                  </span>
                </span>
                <span>{syncProgress.percent}%</span>
              </div>

              {/* Barra de progresso */}
              <div className="w-full bg-[#171A1F]/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#294C87] to-[#FF6B1F] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, syncProgress.percent)}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#171A1F]/70">
                <span className="truncate max-w-md">{syncProgress.message}</span>
                <span className="font-bold text-[#FF6B1F] whitespace-nowrap">
                  {syncProgress.itemsFetched} itens baixados
                </span>
              </div>
            </div>
          )}

          {/* Erro */}
          {syncError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Não foi possível sincronizar:</p>
                <p className="leading-relaxed">{syncError}</p>
                <p className="text-[11px] text-red-600/80">
                  Dica: Se sua instância autoSINAPI estiver rodando em Docker local, confira se o
                  serviço está online em <code>http://localhost:8000/docs</code> ou utilize a opção{' '}
                  <strong>"Importar Tabela UF/Mês"</strong> via arquivo CSV/JSON.
                </p>
              </div>
            </div>
          )}

          {/* Sucesso */}
          {syncSuccessResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>
                  Catálogo SINAPI sincronizado com sucesso via{' '}
                  {syncSuccessResult.sourceProvider === 'autosinapi'
                    ? 'autoSINAPI'
                    : 'Orçamentador'}
                  !
                </span>
              </div>
              <p className="text-emerald-800 leading-relaxed">
                A tabela oficial da UF <strong>{referenceState}</strong> foi incorporada ao catálogo
                do CONCE com origem identificada:
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-white/70 border border-emerald-200 text-center">
                  <span className="block text-[10px] uppercase font-bold text-emerald-700">
                    Novos Itens
                  </span>
                  <span className="text-base font-extrabold text-[#294C87]">
                    +{syncSuccessResult.createdCount}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white/70 border border-emerald-200 text-center">
                  <span className="block text-[10px] uppercase font-bold text-emerald-700">
                    Atualizados
                  </span>
                  <span className="text-base font-extrabold text-[#FF6B1F]">
                    {syncSuccessResult.updatedCount}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white/70 border border-emerald-200 text-center">
                  <span className="block text-[10px] uppercase font-bold text-emerald-700">
                    Total Ativo
                  </span>
                  <span className="text-base font-extrabold text-[#171A1F]">
                    {syncSuccessResult.totalCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bloco de Confirmação Pré-Sincronização (Identidade CONCE: Poppins, Mirage/Cobalt/Orange) */}
          {showConfirmStep && !isSyncing && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#171A1F] via-[#1E2E4A] to-[#294C87] text-white border-2 border-[#FF6B1F] shadow-xl space-y-3 animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#FF6B1F] text-white">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      Confirmação de Parâmetros SINAPI
                    </h4>
                    <p className="text-[11px] text-white/80">
                      Revise os dados abaixo antes de disparar a consulta à API oficial:
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmStep(false)}
                  className="text-white/60 hover:text-white p-1 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded-xl bg-white/10 border border-white/15">
                  <span className="block text-[10px] font-bold text-[#FF6B1F] uppercase">
                    Estado (UF)
                  </span>
                  <span className="text-sm font-extrabold text-white">
                    {referenceState}
                    {referenceState === 'RS' && (
                      <span className="ml-1 text-[10px] text-emerald-400 font-normal">
                        (CONCE/RS)
                      </span>
                    )}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white/10 border border-white/15">
                  <span className="block text-[10px] font-bold text-[#FF6B1F] uppercase">
                    Referência
                  </span>
                  <span className="text-sm font-extrabold text-white font-mono">
                    {referenceDate}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white/10 border border-white/15">
                  <span className="block text-[10px] font-bold text-[#FF6B1F] uppercase">
                    Regime
                  </span>
                  <span className="text-xs font-bold text-white truncate block">
                    {regime === 'NAO_DESONERADO'
                      ? 'Não Desonerado'
                      : regime === 'DESONERADO'
                        ? 'Desonerado'
                        : 'Preços Base'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white/10 border border-white/15">
                  <span className="block text-[10px] font-bold text-[#FF6B1F] uppercase">
                    Provedor
                  </span>
                  <span className="text-xs font-bold text-white truncate block">
                    {provider === 'autosinapi' ? 'autoSINAPI' : 'Orçamentador'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-white/15">
                <span className="text-[11px] text-white/75">
                  {maxPages * 100} itens estimados ({maxPages} páginas)
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowConfirmStep(false)}
                    className="px-3 py-1.5 rounded-lg border border-white/30 text-white text-xs font-semibold hover:bg-white/10"
                  >
                    Ajustar Parâmetros
                  </button>
                  <button
                    type="button"
                    onClick={executeSync}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs font-extrabold shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar e Sincronizar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notificação de limpeza */}
          {cleaningNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{cleaningNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setCleaningNotice(null)}
                className="text-emerald-700 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Botão de Limpeza no Modal caso existam itens de API já gravados */}
          {(() => {
            const apiCounts = getApiSyncedItemsCount()
            if (apiCounts.totalApiCount === 0) return null
            return (
              <div className="p-3 rounded-xl bg-red-50/70 border border-red-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="font-bold text-red-900 block">
                    Itens sincronizados anteriormente via API no catálogo:
                  </span>
                  <span className="text-[11px] text-red-700">
                    {apiCounts.totalApiCount} itens gravados ({apiCounts.orcamentadorCount}{' '}
                    Orçamentador, {apiCounts.autosinapiCount} autoSINAPI). Se gravados com chave
                    inválida ou referência indesejada, você pode removê-los.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const confirmed = window.confirm(
                      `Deseja remover ${apiCounts.totalApiCount} itens gravados por sincronizações de API?\n\n` +
                        `• ${apiCounts.orcamentadorCount} itens da API Orçamentador\n` +
                        `• ${apiCounts.autosinapiCount} itens da autoSINAPI\n\n` +
                        `Seus orçamentos, BDI TCU e composições próprias da CONCE serão integralmente preservados.`,
                    )
                    if (!confirmed) return
                    const res = clearOfficialApiSyncedItems()
                    setCleaningNotice(
                      `Limpeza efetuada: ${res.removedCount} itens sincronizados por API foram removidos.`,
                    )
                    if (onCatalogCleaned) onCatalogCleaned()
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] whitespace-nowrap shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar sincronização oficial</span>
                </button>
              </div>
            )
          })()}
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-[#171A1F]/60">
            {existingMeta ? (
              <span>
                Última tabela ativa: {existingMeta.referenceState} ({existingMeta.referenceMonth}) —{' '}
                {existingMeta.itemsCount} itens ({existingMeta.sourceType || 'api'})
              </span>
            ) : (
              <span>Nenhuma sincronização via API realizada anteriormente.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isSyncing ? (
              <button
                type="button"
                onClick={handleCancelSync}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span>Interromper</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-white cursor-pointer"
                >
                  {syncSuccessResult ? 'Concluir' : 'Fechar'}
                </button>

                {!showConfirmStep ? (
                  <button
                    type="button"
                    onClick={handleRequestSync}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:-translate-y-0.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>
                      {provider === 'autosinapi'
                        ? 'Sincronizar via autoSINAPI'
                        : 'Sincronizar via Orçamentador'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={executeSync}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#FF6B1F]" />
                    <span>Confirmar Início</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default SyncSinapiApiModal
