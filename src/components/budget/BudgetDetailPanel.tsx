/**
 * CONCE — Painel de Detalhes do Orçamento.
 * Abre ao clicar em uma linha compacta da lista de orçamentos: exibe as informações
 * completas (cliente, obra, datas, valores, BDI, autor, presença de edição) e as
 * ações principais. Apenas um painel de LEITURA — nunca altera cálculos nem a regra
 * "última edição salva vence".
 */

import React from 'react'
import {
  X,
  Layers,
  Edit2,
  Trash2,
  Copy,
  Landmark,
  Hash,
  Calendar,
  User,
  MapPin,
  FileText,
  ChevronRight,
  Download,
} from 'lucide-react'
import {
  BudgetStatusDropdown,
  BUDGET_STATUS_CONFIG,
} from '@/components/budget/BudgetStatusDropdown'
import { EditPresenceBadge } from '@/components/budget/EditPresenceBadge'
import { formatCurrencyBRL, formatBudgetDeadline } from '@/lib/formatters'
import type { FullBudget, CalculationSummary } from '@/types/budgetEngine'
import type { BudgetStatus } from '@/types/conce'
import type { BudgetEditPresence } from '@/services/editPresenceService'

interface BudgetDetailPanelProps {
  budget: FullBudget
  summary: CalculationSummary
  isOpen: boolean
  onClose: () => void
  creatorName?: string
  editors: BudgetEditPresence[]
  canDelete: boolean
  onChangeStatus: (newStatus: BudgetStatus) => void
  onOpenEditor: () => void
  onEditData: () => void
  onDuplicate: () => void
  onDelete: () => void
  onExportSpreadsheet: () => void
}

const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#171A1F]/45">
      {label}
    </span>
    <span className="block text-xs sm:text-sm text-[#171A1F] font-medium break-words">
      {value || <span className="text-[#171A1F]/40">Não informado</span>}
    </span>
  </div>
)

export const BudgetDetailPanel: React.FC<BudgetDetailPanelProps> = ({
  budget,
  summary,
  isOpen,
  onClose,
  creatorName,
  editors,
  canDelete,
  onChangeStatus,
  onOpenEditor,
  onEditData,
  onDuplicate,
  onDelete,
  onExportSpreadsheet,
}) => {
  if (!isOpen) return null

  const statusConfig = BUDGET_STATUS_CONFIG[(budget.status as BudgetStatus) || 'em_andamento']
  const observations = budget.observations || budget.notes || budget.commercialNotes

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#171A1F]/50 backdrop-blur-[2px] p-0 sm:p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do orçamento ${budget.code}`}
    >
      <div
        className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#171A1F]/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho compacto */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#171A1F]/10 px-5 py-4 flex items-start justify-between gap-3 rounded-t-2xl">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded bg-[#294C87] text-white inline-flex items-center gap-1">
                <Hash className="w-3 h-3" aria-hidden="true" />
                {budget.code}
              </span>
              <BudgetStatusDropdown
                currentStatus={(budget.status as BudgetStatus) || 'em_andamento'}
                budgetCode={budget.code}
                onChangeStatus={onChangeStatus}
                size="sm"
              />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#171A1F] tracking-tight truncate">
              {budget.title || budget.work.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#171A1F]/5 text-[#171A1F]/60 hover:text-[#171A1F] transition-colors shrink-0 cursor-pointer"
            title="Fechar detalhes"
            aria-label="Fechar painel de detalhes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Presença de edição */}
          {editors.length > 0 && <EditPresenceBadge editors={editors} variant="banner" />}

          {/* Valor em destaque */}
          <div className="flex items-end justify-between gap-4 rounded-xl bg-gradient-to-r from-[#294C87]/10 to-[#FF6B1F]/10 border border-[#294C87]/15 px-4 py-3">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#171A1F]/50">
                Valor Total da Obra
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-[#FF6B1F] tracking-tight">
                {formatCurrencyBRL(summary.finalSalePrice)}
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
              {statusConfig.label}
            </span>
          </div>

          {/* Resumo quantitativo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Etapas', value: String(budget.stages.length) },
              { label: 'Serviços', value: String(summary.servicesCount) },
              { label: 'Insumos', value: String(summary.inputsCount) },
              { label: 'BDI', value: `${summary.bdiRate.toFixed(2)}%` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 px-3 py-2 text-center"
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#171A1F]/45">
                  {item.label}
                </span>
                <span className="block text-sm font-extrabold text-[#294C87]">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Cliente */}
          <section className="space-y-3">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#294C87]">
              <User className="w-3.5 h-3.5" aria-hidden="true" />
              Cliente
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-[#171A1F]/10 p-4">
              <DetailRow label="Nome" value={budget.client.name} />
              <DetailRow label="CPF / CNPJ" value={budget.client.document} />
              <DetailRow label="Telefone" value={budget.client.phone} />
              <DetailRow label="E-mail" value={budget.client.email} />
              <div className="sm:col-span-2">
                <DetailRow
                  label="Endereço do Cliente"
                  value={
                    budget.client.address
                      ? `${budget.client.address}${budget.client.city ? ` — ${budget.client.city}/${budget.client.state}` : ''}`
                      : ''
                  }
                />
              </div>
            </div>
          </section>

          {/* Obra */}
          <section className="space-y-3">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#294C87]">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              Obra
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-[#171A1F]/10 p-4">
              <DetailRow label="Nome da Obra" value={budget.work.name} />
              <DetailRow
                label="Endereço da Obra"
                value={
                  budget.work.address
                    ? `${budget.work.address} — ${budget.work.city}/${budget.work.state}`
                    : `${budget.work.city}/${budget.work.state}`
                }
              />
              <DetailRow label="Prazo" value={formatBudgetDeadline(budget.work)} />
              <DetailRow
                label="Início Previsto"
                value={
                  budget.work.startDate ? budget.work.startDate.split('-').reverse().join('/') : ''
                }
              />
              <DetailRow label="Descrição" value={budget.work.description} />
              {budget.executionDeadline && (
                <div className="sm:col-span-2">
                  <DetailRow label="Prazo de Execução (escopo)" value={budget.executionDeadline} />
                </div>
              )}
            </div>
          </section>

          {/* Condições comerciais */}
          <section className="space-y-3">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#294C87]">
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              Condições Comerciais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-[#171A1F]/10 p-4">
              <DetailRow label="Forma de Pagamento" value={budget.paymentTerms} />
              <DetailRow
                label="Validade da Proposta"
                value={
                  budget.validityDays
                    ? `${budget.validityDays} dia(s) ${budget.validityDaysType === 'corridos' ? 'corridos' : 'úteis'}`
                    : ''
                }
              />
              <DetailRow
                label="Regime Tributário"
                value={
                  summary.taxRegime === 'simples_nacional'
                    ? 'Simples Nacional'
                    : summary.taxRegime === 'com_desoneracao'
                      ? 'Com Desoneração'
                      : summary.taxRegime === 'sem_desoneracao'
                        ? 'Sem Desoneração'
                        : 'Não informado'
                }
              />
              <DetailRow
                label="UF de Referência"
                value={budget.chargesConfig?.uf || budget.work.state}
              />
              {observations && (
                <div className="sm:col-span-2">
                  <DetailRow label="Observações" value={observations} />
                </div>
              )}
            </div>
          </section>

          {/* Autoria e rodapé de metadados */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#171A1F]/60 border-t border-[#171A1F]/10 pt-4">
            {creatorName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#171A1F]/5 text-[#171A1F]/70 border border-[#171A1F]/10">
                Criado por: {creatorName}
              </span>
            )}
            {budget.createdAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                Criado em {budget.createdAt.split('-').reverse().join('/')}
              </span>
            )}
            {budget.publicWork?.enabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F]">
                <Landmark className="w-3 h-3" /> Obras Públicas ({budget.publicWork.modality})
              </span>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="sticky bottom-0 bg-white border-t border-[#171A1F]/10 px-5 py-3.5 flex flex-wrap items-center justify-end gap-2 rounded-b-2xl">
          <button
            type="button"
            onClick={onExportSpreadsheet}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#171A1F]/5 hover:bg-[#171A1F]/10 text-[#171A1F] text-xs font-bold transition-colors cursor-pointer"
            title="Exportar Planilha Excel/CSV"
          >
            <Download className="w-3.5 h-3.5 text-green-600" />
            <span>Planilha</span>
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#171A1F]/5 hover:bg-[#171A1F]/10 text-[#171A1F] text-xs font-bold transition-colors cursor-pointer"
            title="Duplicar este orçamento"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicar</span>
          </button>
          <button
            type="button"
            onClick={onEditData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#294C87]/10 hover:bg-[#294C87] text-[#294C87] hover:text-white text-xs font-bold transition-colors cursor-pointer"
            title="Editar dados cadastrais, cliente, obra e status"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Editar Dados</span>
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              title="Excluir este orçamento definitivamente"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenEditor}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#294C87] hover:bg-[#1f3b6c] text-white text-xs font-bold transition-colors shadow-md cursor-pointer"
            title="Abrir e editar o núcleo completo do orçamento"
          >
            <Layers className="w-3.5 h-3.5 text-[#FF6B1F]" />
            <span>Abrir / Editar Orçamento</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default BudgetDetailPanel
