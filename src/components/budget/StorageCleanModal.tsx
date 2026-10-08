import React, { useState } from 'react'
import {
  Trash2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Layers,
  Database,
  Info,
} from 'lucide-react'
import {
  CleanupResult,
  purgeTestBudgetsFromStorage,
  resetAllLocalConceData,
} from '@/lib/budgetsStorage'
import { clearDemoData } from '@/lib/mockData'
import { purgeTestIntelligenceData } from '@/lib/intelligenceStorage'

interface StorageCleanModalProps {
  isOpen: boolean
  onClose: () => void
  onCleanSuccess?: () => void
}

export const StorageCleanModal: React.FC<StorageCleanModalProps> = ({
  isOpen,
  onClose,
  onCleanSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'demo' | 'reset'>('demo')
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)
  const [confirmFullReset, setConfirmFullReset] = useState('')

  if (!isOpen) return null

  const handleCleanDemoData = () => {
    setIsCleaning(true)
    setTimeout(() => {
      clearDemoData()
      purgeTestIntelligenceData()
      const result = purgeTestBudgetsFromStorage()
      setCleanupResult(result)
      setIsCleaning(false)
      if (onCleanSuccess) {
        onCleanSuccess()
      }
    }, 400)
  }

  const handleFullReset = () => {
    if (confirmFullReset.trim().toUpperCase() !== 'LIMPAR') return
    setIsCleaning(true)
    setTimeout(() => {
      clearDemoData()
      resetAllLocalConceData()
      setIsCleaning(false)
      if (onCleanSuccess) {
        onCleanSuccess()
      }
      onClose()
      window.location.reload()
    }, 500)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="storage-clean-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#171A1F]/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#171A1F]/10 bg-[#171A1F] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FF6B1F]/20 text-[#FF6B1F]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 id="storage-clean-title" className="text-base sm:text-lg font-bold">
                Gerenciamento e Limpeza de Dados
              </h3>
              <p className="text-xs text-white/70">
                Remova registros fictícios e garanta a integridade do app
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-[#171A1F]/10 bg-[#F8F9FA] px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('demo')
              setCleanupResult(null)
            }}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'demo'
                ? 'border-[#294C87] text-[#294C87]'
                : 'border-transparent text-[#171A1F]/60 hover:text-[#171A1F]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#FF6B1F]" />
            <span>Limpar Dados de Demonstração</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('reset')
              setCleanupResult(null)
            }}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'reset'
                ? 'border-[#C4453C] text-[#C4453C]'
                : 'border-transparent text-[#171A1F]/60 hover:text-[#171A1F]'
            }`}
          >
            <Trash2 className="w-4 h-4 text-[#C4453C]" />
            <span>Redefinir Todos os Dados Locais</span>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'demo' && (
            <>
              <div className="p-4 rounded-xl bg-[#294C87]/10 border border-[#294C87]/20 space-y-2">
                <div className="flex items-center gap-2 text-[#294C87] font-bold text-sm">
                  <Info className="w-4 h-4" />
                  <span>Limpeza Segura de Resíduos Fictícios</span>
                </div>
                <p className="text-xs text-[#171A1F]/80 leading-relaxed">
                  Esta ação busca e remove orçamentos de demonstração (como obras fictícias, escolas
                  e exemplos antigos do seed), chaves de armazenamento obsoletas e itens órfãos na
                  lixeira.
                </p>
                <div className="text-[11px] font-semibold text-[#294C87] bg-white/70 p-2.5 rounded-lg border border-[#294C87]/20">
                  🛡️ <strong>Garantia de integridade:</strong> os orçamentos reais do usuário (como
                  os de Andreia de Oliveira da Costa e Jader da Costa, na Rua Tomaz Gonzaga 610) são
                  rigorosamente preservados e nunca serão excluídos.
                </div>
              </div>

              {cleanupResult ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Varredura e Limpeza Concluídas!</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-950">
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <span className="block text-emerald-600 font-semibold">Orçamentos Demo:</span>
                      <strong className="text-sm font-extrabold">
                        {cleanupResult.demoBudgetsRemoved}
                      </strong>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <span className="block text-emerald-600 font-semibold">
                        Chaves Obsoletas:
                      </span>
                      <strong className="text-sm font-extrabold">
                        {cleanupResult.obsoleteKeysRemoved}
                      </strong>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <span className="block text-emerald-600 font-semibold">Revisões Órfãs:</span>
                      <strong className="text-sm font-extrabold">
                        {cleanupResult.orphanedRevisionsRemoved}
                      </strong>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <span className="block text-emerald-600 font-semibold">Lixeira Órfã:</span>
                      <strong className="text-sm font-extrabold">
                        {cleanupResult.orphanedTrashRemoved}
                      </strong>
                    </div>
                  </div>

                  {cleanupResult.cleanedDetails.length > 0 ? (
                    <div className="text-xs text-emerald-900 bg-white/70 p-2.5 rounded-lg max-h-32 overflow-y-auto space-y-1">
                      {cleanupResult.cleanedDetails.map((detail, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-800 italic">
                      Nenhum resíduo de demonstração foi encontrado. Seu ambiente já está
                      completamente limpo!
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-xs text-[#171A1F]/70 space-y-2">
                  <p>O que será examinado e limpo:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Orçamentos canônicos antigos de teste (obras públicas demo, residências
                      fictícias)
                    </li>
                    <li>Chaves antigas de demonstração (conce_demo_data e similares)</li>
                    <li>Cotações e trilhas de auditoria apontando para obras inexistentes</li>
                    <li>Histórico de insumos removidos órfãos</li>
                  </ul>
                </div>
              )}
            </>
          )}

          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-[#C4453C]">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>Atenção: Ação Destrutiva e Irreversível</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Esta opção apagará{' '}
                  <strong>
                    todos os orçamentos, composições customizadas e dados locais salvos neste
                    navegador
                  </strong>
                  . Utilize apenas se desejar redefinir o sistema ao estado zero absoluto.
                </p>
                <p className="text-xs font-semibold text-[#C4453C]">
                  Os orçamentos criados nesta máquina serão permanentemente excluídos.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-reset-input"
                  className="block text-xs font-bold text-[#171A1F] uppercase tracking-wider"
                >
                  Digite <strong className="text-[#C4453C]">LIMPAR</strong> para confirmar o reset
                  total:
                </label>
                <input
                  id="confirm-reset-input"
                  type="text"
                  value={confirmFullReset}
                  onChange={(e) => setConfirmFullReset(e.target.value)}
                  placeholder="LIMPAR"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-sm font-mono tracking-wider focus:outline-none focus:border-[#C4453C]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#171A1F]/70 hover:bg-[#171A1F]/10 transition-colors"
          >
            {cleanupResult ? 'Fechar' : 'Cancelar'}
          </button>

          {activeTab === 'demo' && !cleanupResult && (
            <button
              type="button"
              onClick={handleCleanDemoData}
              disabled={isCleaning}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#294C87] hover:bg-[#1f3b6c] text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isCleaning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FF6B1F]" />
                  <span>Realizando Varredura...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#FF6B1F]" />
                  <span>Executar Limpeza de Demonstração</span>
                </>
              )}
            </button>
          )}

          {activeTab === 'reset' && (
            <button
              type="button"
              onClick={handleFullReset}
              disabled={isCleaning || confirmFullReset.trim().toUpperCase() !== 'LIMPAR'}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C4453C] hover:bg-[#a6372f] text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isCleaning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Apagando tudo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Apagar Todos os Dados Locais</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default StorageCleanModal
