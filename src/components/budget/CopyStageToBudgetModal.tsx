/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Cópia de Etapa Completa entre Orçamentos Diferentes
 *
 * Requisitos:
 * 1. Lista todos os outros orçamentos cadastrados no sistema (excluindo o atual).
 * 2. Mostra informações de identificação: Código, Nome da Obra, Cliente, Qtd de Etapas existentes.
 * 3. Mostra resumo da etapa que será copiada (código, nome, quantidade de serviços, custo direto estimado).
 * 4. Permite confirmar e executar a cópia ou cancelar.
 * 5. Se não houver outros orçamentos além do atual, mostra estado de vazio amigável com explicação clara.
 */

import React, { useState, useMemo } from 'react'
import {
  Copy,
  X,
  Search,
  Building,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react'
import { BudgetStage, FullBudget } from '@/types/budgetEngine'
import { formatCurrencyBRL } from '@/lib/formatters'
import { calculateStageDirectCost, getBudgetLaborMultiplier } from '@/lib/budgetEngine'

interface CopyStageToBudgetModalProps {
  isOpen: boolean
  onClose: () => void
  sourceStage: BudgetStage | null
  currentBudgetId: string
  availableBudgets: FullBudget[]
  onConfirmCopy: (targetBudgetId: string, sourceStage: BudgetStage) => void
  disabled?: boolean
}

export const CopyStageToBudgetModal: React.FC<CopyStageToBudgetModalProps> = ({
  isOpen,
  onClose,
  sourceStage,
  currentBudgetId,
  availableBudgets,
  onConfirmCopy,
  disabled = false,
}) => {
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtra orçamentos disponíveis: exclui o orçamento de origem
  const otherBudgets = useMemo(() => {
    return availableBudgets.filter((b) => b && b.id !== currentBudgetId)
  }, [availableBudgets, currentBudgetId])

  // Filtragem pela busca (código, nome da obra, cliente)
  const filteredBudgets = useMemo(() => {
    if (!searchTerm.trim()) return otherBudgets
    const term = searchTerm.toLowerCase().trim()
    return otherBudgets.filter((b) => {
      const code = (b.code || '').toLowerCase()
      const title = (b.title || '').toLowerCase()
      const workName = (b.work?.name || '').toLowerCase()
      const clientName = (b.client?.name || '').toLowerCase()
      return (
        code.includes(term) ||
        title.includes(term) ||
        workName.includes(term) ||
        clientName.includes(term)
      )
    })
  }, [otherBudgets, searchTerm])

  if (!isOpen || !sourceStage) return null

  const laborMultiplier = 1.0 // Referência padrão para preview
  const stageDirectCost = calculateStageDirectCost(sourceStage, laborMultiplier)
  const servicesCount = sourceStage.services?.length || 0
  const inputsCount = (sourceStage.services || []).reduce(
    (acc, srv) => acc + (srv.composition?.inputs?.length || 0),
    0,
  )

  const selectedBudget = otherBudgets.find((b) => b.id === selectedBudgetId)

  const handleConfirm = () => {
    if (!selectedBudgetId || !sourceStage || disabled || isSubmitting) return
    setIsSubmitting(true)
    try {
      onConfirmCopy(selectedBudgetId, sourceStage)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-[#171A1F]/15 overflow-hidden">
        {/* Topo do Modal */}
        <div className="px-6 py-4 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#294C87] text-white flex items-center justify-center font-bold shadow-sm">
              <Copy className="w-5 h-5 text-[#FF6B1F]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Copiar Etapa para Outro Orçamento</h2>
              <p className="text-xs text-white/70">
                Transfira esta etapa com todos os seus serviços, composições e insumos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo da Etapa de Origem */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-[#294C87]/10 via-[#294C87]/5 to-transparent border-b border-[#171A1F]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#294C87] text-white">
              Etapa {sourceStage.code}
            </span>
            <div className="min-w-0">
              <strong className="text-sm font-bold text-[#171A1F] block truncate max-w-md">
                {sourceStage.name}
              </strong>
              <span className="text-[11px] text-[#171A1F]/60">
                {servicesCount} serviço(s) • {inputsCount} insumo(s) na composição
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-[10px] text-[#171A1F]/60 block uppercase tracking-wider font-semibold">
              Custo Direto:
            </span>
            <strong className="text-sm font-extrabold text-[#294C87]">
              {formatCurrencyBRL(stageDirectCost)}
            </strong>
          </div>
        </div>

        {/* Corpo do Modal com Busca e Seleção de Destino */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {otherBudgets.length === 0 ? (
            /* Estado Vazio: Nenhum outro orçamento cadastrado */
            <div className="p-8 text-center rounded-xl border border-dashed border-[#171A1F]/20 bg-[#F8F9FA] space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-[#171A1F]">
                Nenhum outro orçamento cadastrado
              </h3>
              <p className="text-xs text-[#171A1F]/70 max-w-md mx-auto">
                Para copiar uma etapa para outro orçamento, é necessário ter pelo menos um outro
                orçamento criado no sistema. Atualmente você possui apenas o orçamento em edição.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#294C87] text-white text-xs font-bold hover:bg-[#1f3b6c] transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Barra de Pesquisa */}
              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1.5">
                  Selecione o Orçamento de Destino:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#171A1F]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por código, obra ou cliente..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#171A1F]/20 focus:border-[#294C87] focus:ring-1 focus:ring-[#294C87] outline-none"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#171A1F]/50 hover:text-[#171A1F]"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Orçamentos Disponíveis */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredBudgets.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#171A1F]/60 bg-[#F8F9FA] rounded-xl border border-dashed border-[#171A1F]/15">
                    Nenhum orçamento encontrado para o termo &quot;{searchTerm}&quot;.
                  </div>
                ) : (
                  filteredBudgets.map((b) => {
                    const isSelected = selectedBudgetId === b.id
                    const stagesCount = b.stages?.length || 0
                    const nextOrder = stagesCount + 1
                    const nextCode = String(nextOrder).padStart(2, '0')

                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBudgetId(b.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-[#294C87] bg-[#294C87]/5 ring-2 ring-[#294C87]/30 shadow-sm'
                            : 'border-[#171A1F]/10 hover:border-[#294C87]/50 hover:bg-[#F8F9FA]'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <input
                            type="radio"
                            name="target_budget"
                            checked={isSelected}
                            onChange={() => setSelectedBudgetId(b.id)}
                            className="mt-1 h-4 w-4 text-[#294C87] border-[#171A1F]/20 focus:ring-[#294C87] cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#171A1F]/10 text-[#171A1F]">
                                {b.code}
                              </span>
                              <span className="text-xs font-bold text-[#171A1F] truncate">
                                {b.title || b.work?.name || 'Sem título'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-[#171A1F]/60 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3 text-[#FF6B1F]" />
                                Cliente: {b.client?.name || 'Não informado'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-[#294C87]" />
                                {stagesCount} etapa(s) existente(s)
                              </span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#294C87] text-white">
                              Entrará como Etapa {nextCode}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Caixa Informativa sobre Regras de Integridade */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/60 text-xs text-[#294C87] space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#294C87] shrink-0" />
                  <span>Regras de Cópia e Integridade do Destino:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-blue-900/80 pl-1">
                  <li>
                    <strong>Novos IDs únicos:</strong> a etapa, serviços, composições e insumos
                    receberão IDs novos para não contaminar vínculos nem histórico de lixeira.
                  </li>
                  <li>
                    <strong>Re-sequenciamento automático:</strong> a etapa será anexada ao fim do
                    destino e reordenada (
                    {selectedBudget
                      ? `Etapa ${String((selectedBudget.stages?.length || 0) + 1).padStart(2, '0')}`
                      : 'próxima numeração'}
                    ).
                  </li>
                  <li>
                    <strong>Gravação imediata:</strong> o orçamento de destino será salvo com data
                    de atualização recente. O orçamento de origem permanece intacto.
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="px-6 py-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#171A1F]/60">
            {selectedBudget ? (
              <span>
                Destino:{' '}
                <strong className="text-[#171A1F]">
                  {selectedBudget.code} — {selectedBudget.title || selectedBudget.work?.name}
                </strong>
              </span>
            ) : (
              <span>Nenhum orçamento selecionado</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedBudgetId || disabled || isSubmitting || otherBudgets.length === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#294C87] hover:bg-[#1f3b6c] disabled:opacity-40 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            >
              <Copy className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>{isSubmitting ? 'Copiando...' : 'Copiar para Destino'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
