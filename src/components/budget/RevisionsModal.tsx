/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Gerar e Restaurar Revisões do Orçamento (Rev. 0, 1, 2...)
 * com registro de autor, data, descrição e comparativo de valores
 */

import React, { useState } from 'react'
import {
  History,
  RotateCcw,
  Plus,
  Calendar,
  User,
  X,
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { FullBudget } from '@/types/budgetEngine'
import { BudgetRevision } from '@/types/intelligence'
import { getStoredRevisions, saveBudgetRevision, logAuditEvent } from '@/lib/intelligenceStorage'
import { formatCurrencyBRL } from '@/lib/formatters'

interface RevisionsModalProps {
  budget: FullBudget
  isOpen: boolean
  onClose: () => void
  onRestoreRevision: (restoredBudget: FullBudget) => void
}

export const RevisionsModal: React.FC<RevisionsModalProps> = ({
  budget,
  isOpen,
  onClose,
  onRestoreRevision,
}) => {
  const [revisions, setRevisions] = useState<BudgetRevision[]>(() => getStoredRevisions(budget.id))
  const [isCreating, setIsCreating] = useState(false)
  const [description, setDescription] = useState('')
  const [authorName, setAuthorName] = useState(budget.author || 'Eng. Denir Souza - CREA/SP')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleCreateRevision = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      showToast('Por favor, informe a descrição ou motivo da revisão.')
      return
    }

    const newRev = saveBudgetRevision(budget, description, authorName)
    setRevisions(getStoredRevisions(budget.id))
    setDescription('')
    setIsCreating(false)
    showToast(`${newRev.revisionCode} gravada com sucesso!`)
  }

  const handleRestore = (rev: BudgetRevision) => {
    if (
      confirm(
        `Tem certeza que deseja restaurar o orçamento para a versão "${rev.revisionCode}" emitida em ${new Date(rev.date).toLocaleDateString('pt-BR')}?\n\nAs alterações não salvas serão substituídas.`,
      )
    ) {
      logAuditEvent({
        budgetId: budget.id,
        action: 'revisao_restaurada',
        title: `Restauração para ${rev.revisionCode}`,
        details: `O orçamento foi revertido para o snapshot de ${rev.revisionCode} (${rev.description})`,
      })
      onRestoreRevision(rev.snapshot)
      showToast(`Orçamento revertido para ${rev.revisionCode}!`)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#171A1F]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#171A1F]/15 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#294C87] text-white flex items-center justify-center">
              <History className="w-5 h-5 text-[#FF6B1F]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Histórico de Revisões • {budget.code}
              </h3>
              <p className="text-xs text-white/70">
                Snapshots rastreáveis com capacidade de restauração integral
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback flutuante */}
        {toastMessage && (
          <div className="bg-[#3E8E5A] text-white text-xs font-semibold px-4 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Corpo do Modal */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Botão para abrir formulário de nova revisão */}
          {!isCreating ? (
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#171A1F]">
                  Criar Marco de Revisão Técnica (Rev. {revisions.length})
                </h4>
                <p className="text-xs text-[#171A1F]/60">
                  Gera um ponto de restauração congelando o estado atual do orçamento.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Revisão</span>
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleCreateRevision}
              className="p-4 rounded-xl bg-[#FF6B1F]/5 border-2 border-[#FF6B1F]/30 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FF6B1F] uppercase tracking-wider">
                  Registrar Rev. {revisions.length}
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-[#171A1F]/60 hover:text-[#171A1F]"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">
                  Motivo ou Descrição da Revisão *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Atualização do traço de concreto, renegociação de aço ou alteração de BDI"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">
                  Autor da Revisão
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F]"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#FF6B1F] text-white text-xs font-bold"
                >
                  Salvar Revisão
                </button>
              </div>
            </form>
          )}

          {/* Lista de Revisões Cadastradas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171A1F]/60">
              Versões Salvas ({revisions.length})
            </h4>

            {revisions.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-[#171A1F]/20 rounded-xl space-y-2">
                <History className="w-8 h-8 text-[#171A1F]/30 mx-auto" />
                <p className="text-xs text-[#171A1F]/70">
                  Nenhuma revisão técnica gravada ainda para este orçamento.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl border border-[#171A1F]/15 bg-white hover:border-[#294C87]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded bg-[#294C87] text-white">
                          {rev.revisionCode}
                        </span>
                        <span className="text-xs text-[#171A1F]/60 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#FF6B1F]" />
                          {new Date(rev.date).toLocaleDateString('pt-BR')}{' '}
                          {new Date(rev.date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-xs text-[#171A1F]/60 hidden sm:inline">•</span>
                        <span className="text-xs text-[#171A1F]/70 font-medium">{rev.author}</span>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-[#171A1F]">
                        {rev.description}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-[#171A1F]/70 pt-0.5">
                        <span>
                          Valor Total:{' '}
                          <strong className="text-[#FF6B1F] font-mono">
                            {formatCurrencyBRL(rev.totalSalePrice)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          BDI:{' '}
                          <strong className="text-[#171A1F] font-mono">
                            {rev.bdiRate ? rev.bdiRate.toFixed(2) : '---'}%
                          </strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestore(rev)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#294C87]/10 hover:bg-[#294C87] text-[#294C87] hover:text-white text-xs font-bold transition-colors cursor-pointer self-end sm:self-center"
                      title="Restaurar este snapshot de orçamento"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restaurar Esta Versão</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Fechar */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#171A1F] text-white text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
