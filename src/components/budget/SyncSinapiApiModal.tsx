/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal de Sincronização Oficial da Tabela SINAPI via API Orçamentador
 * - Gerenciamento e teste de API Key (salva em localStorage, lê env/secrets)
 * - Escolha de UF, data de referência e regime (Desonerado / Não Desonerado)
 * - Sincronização paginada em lote incremental sem travar a interface
 * - Tratamento amigável de erros (chave inválida, rate limit, rede)
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
  Check,
  StopCircle,
} from 'lucide-react'
import { BRAZIL_STATES_LIST } from '@/lib/chargesData'
import {
  getStoredOrcamentadorApiKey,
  saveStoredOrcamentadorApiKey,
  mergeImportedSinapiItems,
  getSinapiImportMetadata,
} from '@/lib/sinapiStorage'
import {
  fetchFullSinapiFromOrcamentador,
  testOrcamentadorApiKey,
  OrcamentadorSyncProgress,
} from '@/lib/orcamentadorService'

interface SyncSinapiApiModalProps {
  isOpen: boolean
  onClose: () => void
  onSyncSuccess: (result: {
    updatedCount: number
    createdCount: number
    totalCount: number
  }) => void
}

export const SyncSinapiApiModal: React.FC<SyncSinapiApiModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
}) => {
  const [apiKey, setApiKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [referenceState, setReferenceState] = useState('SP')
  const [referenceDate, setReferenceDate] = useState('2025-04-01')
  const [regime, setRegime] = useState<'NAO_DESONERADO' | 'DESONERADO' | 'TODOS'>('NAO_DESONERADO')
  const [batchScope, setBatchScope] = useState<'all' | 'insumos' | 'composicoes'>('all')
  const [maxPages, setMaxPages] = useState<number>(30) // 30 páginas = até 3.000 itens por ciclo

  // Estados de execução e teste de chave
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [keyTestStatus, setKeyTestStatus] = useState<{
    tested: boolean
    valid: boolean
    message: string
  } | null>(null)

  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<OrcamentadorSyncProgress | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncSuccessResult, setSyncSuccessResult] = useState<{
    updatedCount: number
    createdCount: number
    totalCount: number
  } | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Carrega chave salva ao abrir
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredOrcamentadorApiKey()
      setApiKey(stored)
      setShowKeyInput(!stored)
      setKeyTestStatus(null)
      setSyncError(null)
      setSyncSuccessResult(null)
      setSyncProgress(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSaveApiKey = () => {
    saveStoredOrcamentadorApiKey(apiKey)
    setKeyTestStatus({
      tested: true,
      valid: true,
      message: 'Chave salva com sucesso no armazenamento local do navegador.',
    })
  }

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      setKeyTestStatus({
        tested: true,
        valid: false,
        message: 'Digite ou cole uma chave de API antes de testar.',
      })
      return
    }

    setIsTestingKey(true)
    setKeyTestStatus(null)
    try {
      const res = await testOrcamentadorApiKey(apiKey)
      setKeyTestStatus({
        tested: true,
        valid: res.valid,
        message: res.message,
      })
      if (res.valid) {
        saveStoredOrcamentadorApiKey(apiKey)
      }
    } catch (err: any) {
      setKeyTestStatus({
        tested: true,
        valid: false,
        message: err.message || 'Falha ao testar chave.',
      })
    } finally {
      setIsTestingKey(false)
    }
  }

  const handleStartSync = async () => {
    const keyToUse = apiKey.trim() || getStoredOrcamentadorApiKey()
    if (!keyToUse) {
      setSyncError(
        'É obrigatório informar uma chave de acesso da API Orçamentador para sincronizar.',
      )
      setShowKeyInput(true)
      return
    }

    // Salva a chave caso não tenha salvo ainda
    saveStoredOrcamentadorApiKey(keyToUse)

    setIsSyncing(true)
    setSyncError(null)
    setSyncSuccessResult(null)
    abortControllerRef.current = new AbortController()

    const startTime = Date.now()

    try {
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
        onProgress: (p) => setSyncProgress(p),
      })

      if (result.items.length === 0) {
        setSyncError(
          `Nenhum item SINAPI retornado pela API para o estado ${referenceState} na data selecionada. Verifique se o mês é compatível com os dados oficiais cadastrados no Orçamentador.`,
        )
        setIsSyncing(false)
        return
      }

      // Executa o merge seguro no banco do app
      const mergeStats = mergeImportedSinapiItems(result.items, {
        referenceMonth: referenceDate || 'Oficial Atual',
        referenceState,
        fileName: `API_Orcamentador_${referenceState}_${referenceDate || 'Atual'}`,
        priceOrigin: 'api_orcamentador',
        sourceType: 'api_orcamentador',
        syncedPages: result.totalPages,
        lastSyncDurationMs: Date.now() - startTime,
      })

      setSyncSuccessResult(mergeStats)
      onSyncSuccess(mergeStats)
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('cancelada')) {
        setSyncError('Sincronização interrompida pelo usuário.')
      } else {
        setSyncError(
          err.message ||
            'Não foi possível concluir a sincronização com a API Orçamentador. Verifique sua chave e tente novamente.',
        )
      }
    } finally {
      setIsSyncing(false)
    }
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
                  Sincronizar com Tabela Oficial (API Orçamentador)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wide">
                  SINAPI Ao Vivo
                </span>
              </div>
              <p className="text-xs text-white/80">
                Acesse o acervo completo de ~15 mil itens oficiais atualizados por Estado e Mês
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSyncing}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {/* Alerta de proteção de dados */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#171A1F]/80 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#294C87] flex-shrink-0 mt-0.5" />
            <div className="text-[11px] sm:text-xs leading-relaxed">
              <strong className="text-[#294C87]">Atualização segura por código SINAPI:</strong> seus
              orçamentos, BDI TCU e composições próprias da CONCE{' '}
              <strong>não serão apagados nem desconfigurados</strong>. Os preços de referência são
              atualizados ou adicionados com a origem identificada como{' '}
              <span className="font-bold text-[#FF6B1F]">API Orçamentador</span>.
            </div>
          </div>

          {/* Configuração da Chave de API */}
          <div className="p-4 rounded-xl border border-[#171A1F]/15 bg-[#F8F9FA] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5">
                <Key className="w-4 h-4 text-[#FF6B1F]" />
                <span>Chave de Acesso (API Key Orçamentador)</span>
              </label>

              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="text-[11px] font-bold text-[#294C87] hover:underline cursor-pointer"
              >
                {showKeyInput ? 'Ocultar Campo' : apiKey ? 'Alterar Chave' : 'Inserir Chave'}
              </button>
            </div>

            {showKeyInput ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Cole sua API Key do Orçamentador aqui..."
                    className="flex-1 px-3 py-2 rounded-lg border border-[#171A1F]/20 bg-white font-mono text-xs focus:outline-none focus:border-[#294C87]"
                  />
                  <button
                    type="button"
                    onClick={handleTestApiKey}
                    disabled={isTestingKey || !apiKey.trim()}
                    className="px-3.5 py-2 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {isTestingKey ? 'Testando...' : 'Testar Chave'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#171A1F]/60">
                  <span>
                    A chave fica salva exclusivamente no seu navegador (localStorage) e não é
                    exposta.
                  </span>
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
                    {apiKey ? 'Chave de API configurada no navegador' : 'Nenhuma chave configurada'}
                  </span>
                </div>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleTestApiKey}
                    disabled={isTestingKey}
                    className="text-xs font-bold text-[#294C87] hover:underline cursor-pointer"
                  >
                    {isTestingKey ? 'Testando...' : 'Verificar conexão'}
                  </button>
                )}
              </div>
            )}

            {/* Status do Teste de Chave */}
            {keyTestStatus && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  keyTestStatus.valid
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {keyTestStatus.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <span>{keyTestStatus.message}</span>
              </div>
            )}
          </div>

          {/* Parâmetros da Sincronização */}
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

            {/* Mês / Data de Referência */}
            <div>
              <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-[#FF6B1F]" />
                <span>Data de Referência SINAPI</span>
              </label>
              <input
                type="text"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
                disabled={isSyncing}
                placeholder="AAAA-MM-01 (ex: 2025-04-01)"
                className="w-full px-3 py-2 rounded-xl border border-[#171A1F]/20 text-xs font-semibold bg-white focus:outline-none focus:border-[#294C87]"
              />
              <span className="text-[10px] text-[#171A1F]/50 block mt-0.5">
                Padrão Caixa: formato AAAA-MM-01 (dia 01 do mês).
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
                  <span>Sincronizando com a API do Orçamentador...</span>
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
                  Dica: Você também pode usar a opção <strong>"Importar Tabela UF/Mês"</strong> via
                  arquivo CSV ou JSON a qualquer momento.
                </p>
              </div>
            </div>
          )}

          {/* Sucesso */}
          {syncSuccessResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Catálogo SINAPI sincronizado com sucesso!</span>
              </div>
              <p className="text-emerald-800 leading-relaxed">
                A tabela oficial da UF <strong>{referenceState}</strong> foi incorporada ao banco de
                dados do sistema:
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
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-[#171A1F]/60">
            {existingMeta ? (
              <span>
                Última tabela ativa: {existingMeta.referenceState} ({existingMeta.referenceMonth}) —{' '}
                {existingMeta.itemsCount} itens
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

                <button
                  type="button"
                  onClick={handleStartSync}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:-translate-y-0.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sincronizar com Tabela Oficial</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
