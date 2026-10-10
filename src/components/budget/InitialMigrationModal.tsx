import React, { useState } from 'react'
import {
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileSpreadsheet,
  Database,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { syncEngine } from '@/services/syncEngine'
import { getStoredFullBudgets, isDemoOrTestBudget } from '@/lib/budgetsStorage'
import { getStoredQuotes } from '@/lib/intelligenceStorage'
import { getStoredCompositions } from '@/lib/budgetsStorage'

interface InitialMigrationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const InitialMigrationModal: React.FC<InitialMigrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [currentStep, setCurrentStep] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [stats, setStats] = useState<{ budgets: number; quotes: number; comps: number } | null>(
    null,
  )

  if (!isOpen) return null

  // Contagem de itens reais elegíveis
  const localBudgets = getStoredFullBudgets().filter((b) => !isDemoOrTestBudget(b))
  const localQuotes = getStoredQuotes()
  const localComps = (getStoredCompositions() || []).filter(
    (c: any) => c.source !== 'SINAPI' && c.code,
  )

  const handleStartMigration = async () => {
    setStatus('running')
    setErrorMessage('')

    try {
      const result = await syncEngine.uploadAllLocalDataToCloud((step) => {
        setCurrentStep(step)
      })

      setStats({
        budgets: result.budgetsUploaded,
        quotes: result.quotesUploaded,
        comps: result.compositionsUploaded,
      })
      setStatus('success')
      onSuccess?.()
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(err?.message || 'Falha ao migrar dados para o Skip Cloud.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#171A1F]/20 overflow-hidden">
        {/* Top Header */}
        <div className="p-4 bg-[#171A1F] text-white flex items-center justify-between border-b border-[#294C87]/40">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-[#FF6B1F]" />
            <h3 className="text-sm sm:text-base font-bold">Migração para o Skip Cloud</h3>
          </div>
          {status !== 'running' && (
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {status === 'idle' && (
            <>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#294C87]/10 text-[#294C87] flex items-center justify-center mx-auto">
                  <Database className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-[#171A1F]">
                  Enviar dados do navegador para a nuvem
                </h4>
                <p className="text-xs text-[#171A1F]/70 leading-relaxed">
                  Seus orçamentos agora são salvos com segurança no Skip Cloud. Acesse de qualquer
                  computador ou dispositivo com seu login e senha.
                </p>
              </div>

              {/* Resumo dos itens locais reais prontos para upload */}
              <div className="p-4 rounded-xl bg-[#F4F6F9] border border-[#171A1F]/10 space-y-2.5">
                <div className="text-xs font-bold text-[#171A1F] uppercase tracking-wider">
                  Itens locais detectados no navegador:
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-[#171A1F]/5">
                  <span className="flex items-center gap-2 text-[#171A1F]/80">
                    <FileSpreadsheet className="w-4 h-4 text-[#294C87]" />
                    Orçamentos de obra reais:
                  </span>
                  <span className="font-bold text-[#171A1F]">{localBudgets.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-[#171A1F]/5">
                  <span className="flex items-center gap-2 text-[#171A1F]/80">
                    <Database className="w-4 h-4 text-[#FF6B1F]" />
                    Cotações de fornecedores:
                  </span>
                  <span className="font-bold text-[#171A1F]">{localQuotes.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="flex items-center gap-2 text-[#171A1F]/80">
                    <ShieldCheck className="w-4 h-4 text-[#3E8E5A]" />
                    Composições personalizadas:
                  </span>
                  <span className="font-bold text-[#171A1F]">{localComps.length}</span>
                </div>
              </div>

              {localBudgets.length > 0 && (
                <div className="text-[11px] text-[#171A1F]/60 italic bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                  Inclui os orçamentos reais cadastrados (ex.: Andreia/Jader, Rua Tomaz Gonzaga 610)
                  e converte fotos das etapas em anexos reais da nuvem.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5 cursor-pointer"
                >
                  Depois
                </button>
                <button
                  type="button"
                  onClick={handleStartMigration}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <CloudUpload className="w-4 h-4 text-[#FF6B1F]" />
                  <span>Migrar para o Cloud Agora</span>
                </button>
              </div>
            </>
          )}

          {status === 'running' && (
            <div className="py-8 text-center space-y-4 animate-fade-in">
              <Loader2 className="w-10 h-10 text-[#FF6B1F] animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#171A1F]">
                  Sincronizando com o Skip Cloud...
                </h4>
                <p className="text-xs text-[#294C87] font-medium font-mono">
                  {currentStep || 'Processando dados...'}
                </p>
              </div>
              <p className="text-[11px] text-[#171A1F]/50">
                Por favor, aguarde enquanto transferimos seus dados com integridade.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4 text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-green-100 text-[#3E8E5A] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[#171A1F]">
                  Migração Concluída com Sucesso!
                </h4>
                <p className="text-xs text-[#171A1F]/70">
                  Seus dados estão protegidos no banco de dados do Skip Cloud.
                </p>
              </div>

              {stats && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 space-y-1 text-left">
                  <div>• {stats.budgets} orçamento(s) enviado(s)</div>
                  <div>• {stats.quotes} cotação(ões) sincronizada(s)</div>
                  <div>• {stats.comps} composição(ões) registrada(s)</div>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full mt-3 py-2.5 px-4 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Concluir e Continuar
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-red-100 text-[#C4453C] flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[#171A1F]">Falha na Migração</h4>
                <p className="text-xs text-[#C4453C] font-medium">{errorMessage}</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleStartMigration}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default InitialMigrationModal
