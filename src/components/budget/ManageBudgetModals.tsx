import React, { useState } from 'react'
import {
  X,
  AlertTriangle,
  Building,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Save,
  CheckCircle2,
} from 'lucide-react'
import { FullBudget } from '@/types/budgetEngine'
import { BudgetStatus } from '@/types/conce'
import { formatCurrencyBRL } from '@/lib/formatters'
import { calculateFullBudget } from '@/lib/budgetEngine'

interface QuickEditBudgetModalProps {
  budget: FullBudget
  isOpen: boolean
  onClose: () => void
  onSave: (updated: FullBudget) => void
  onOpenFullEditor?: (budget: FullBudget) => void
}

export const QuickEditBudgetModal: React.FC<QuickEditBudgetModalProps> = ({
  budget,
  isOpen,
  onClose,
  onSave,
  onOpenFullEditor,
}) => {
  const [formData, setFormData] = useState({
    title: budget.title || budget.work?.name || '',
    code: budget.code || '',
    status: (budget.status || 'em_andamento') as BudgetStatus,
    clientName: budget.client?.name || '',
    clientDocument: budget.client?.document || '',
    clientPhone: budget.client?.phone || '',
    clientEmail: budget.client?.email || '',
    clientAddress: budget.client?.address || '',
    clientCity: budget.client?.city || '',
    clientState: budget.client?.state || 'RS',
    workName: budget.work?.name || '',
    workAddress: budget.work?.address || '',
    workCity: budget.work?.city || '',
    workState: budget.work?.state || 'RS',
    workDescription: budget.work?.description || '',
    startDate: budget.work?.startDate || '',
    paymentTerms: budget.paymentTerms || '',
    commercialNotes: budget.commercialNotes || '',
    validityDays: budget.validityDays ?? 5,
    validityDaysType: (budget.validityDaysType || 'uteis') as 'uteis' | 'corridos',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const summary = calculateFullBudget(budget)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Nome do cliente é obrigatório'
    }
    if (!formData.workName.trim()) {
      newErrors.workName = 'Nome da obra é obrigatório'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const updatedBudget: FullBudget = {
      ...budget,
      code: formData.code.trim() || budget.code,
      title: formData.title.trim() || formData.workName.trim(),
      status: formData.status,
      paymentTerms: formData.paymentTerms,
      commercialNotes: formData.commercialNotes,
      validityDays: formData.validityDays,
      validityDaysType: formData.validityDaysType,
      client: {
        ...budget.client,
        name: formData.clientName.trim(),
        document: formData.clientDocument.trim(),
        phone: formData.clientPhone.trim(),
        email: formData.clientEmail.trim(),
        address: formData.clientAddress.trim(),
        city: formData.clientCity.trim(),
        state: formData.clientState.trim(),
      },
      work: {
        ...budget.work,
        name: formData.workName.trim(),
        address: formData.workAddress.trim(),
        city: formData.workCity.trim(),
        state: formData.workState.trim(),
        description: formData.workDescription.trim(),
        startDate: formData.startDate,
      },
      updatedAt: new Date().toISOString(),
    }

    onSave(updatedBudget)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-[#171A1F]/15 overflow-hidden">
        {/* Topo do Modal */}
        <div className="px-6 py-4 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#294C87] text-white flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-[#FF6B1F]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-[#FF6B1F] font-bold">
                  {formData.code || budget.code}
                </span>
                <h2 className="text-base sm:text-lg font-bold">Editar Orçamento</h2>
              </div>
              <p className="text-xs text-white/60">
                Altere dados cadastrais, cliente, obra e status do orçamento
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo de Valores */}
        <div className="px-6 py-3 bg-[#294C87]/5 border-b border-[#171A1F]/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[#171A1F]/60">Valor total calculado:</span>{' '}
            <strong className="text-sm font-extrabold text-[#294C87]">
              {formatCurrencyBRL(summary.finalSalePrice)}
            </strong>
          </div>
          <div className="flex items-center gap-4 text-[#171A1F]/70">
            <span>
              Custo Direto: <strong>{formatCurrencyBRL(summary.totalDirectCost)}</strong>
            </span>
            <span>
              BDI: <strong>{summary.bdiRate.toFixed(2)}%</strong>
            </span>
            <span>
              Etapas: <strong>{budget.stages?.length || 0}</strong>
            </span>
          </div>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Status e Identificação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Título / Descrição da Proposta
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex.: Reforma e Estrutura Residencial"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] focus:ring-1 focus:ring-[#294C87] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as BudgetStatus })
                }
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] bg-white font-semibold outline-none cursor-pointer"
              >
                <option value="em_andamento">Em Andamento</option>
                <option value="aprovado">Aprovado</option>
                <option value="em_analise">Em Análise</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="space-y-3 pt-2 border-t border-[#171A1F]/10">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#294C87]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#294C87]">
                Dados do Cliente
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  Nome do Cliente / Razão Social *
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => {
                    setFormData({ ...formData, clientName: e.target.value })
                    if (errors.clientName) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.clientName
                        return next
                      })
                    }
                  }}
                  placeholder="Nome do cliente"
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border outline-none ${
                    errors.clientName
                      ? 'border-red-500 bg-red-50/50'
                      : 'border-[#171A1F]/20 focus:border-[#294C87]'
                  }`}
                />
                {errors.clientName && (
                  <span className="text-[11px] text-red-600 font-medium mt-1 block">
                    {errors.clientName}
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  CPF / CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.clientDocument}
                  onChange={(e) => setFormData({ ...formData, clientDocument: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">E-mail</label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  placeholder="cliente@exemplo.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  Cidade / UF do Cliente
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.clientCity}
                    onChange={(e) => setFormData({ ...formData, clientCity: e.target.value })}
                    placeholder="Cidade"
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] outline-none"
                  />
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.clientState}
                    onChange={(e) =>
                      setFormData({ ...formData, clientState: e.target.value.toUpperCase() })
                    }
                    placeholder="UF"
                    className="w-16 px-2 py-2 text-xs uppercase text-center rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dados da Obra */}
          <div className="space-y-3 pt-2 border-t border-[#171A1F]/10">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#FF6B1F]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B1F]">
                Dados da Obra & Local
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  Nome da Obra *
                </label>
                <input
                  type="text"
                  value={formData.workName}
                  onChange={(e) => {
                    setFormData({ ...formData, workName: e.target.value })
                    if (errors.workName) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.workName
                        return next
                      })
                    }
                  }}
                  placeholder="Nome do empreendimento ou reforma"
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border outline-none ${
                    errors.workName
                      ? 'border-red-500 bg-red-50/50'
                      : 'border-[#171A1F]/20 focus:border-[#294C87]'
                  }`}
                />
                {errors.workName && (
                  <span className="text-[11px] text-red-600 font-medium mt-1 block">
                    {errors.workName}
                  </span>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  Endereço da Obra
                </label>
                <input
                  type="text"
                  value={formData.workAddress}
                  onChange={(e) => setFormData({ ...formData, workAddress: e.target.value })}
                  placeholder="Rua, número, apto, bairro"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  Cidade / UF da Obra
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.workCity}
                    onChange={(e) => setFormData({ ...formData, workCity: e.target.value })}
                    placeholder="Cidade"
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] outline-none"
                  />
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.workState}
                    onChange={(e) =>
                      setFormData({ ...formData, workState: e.target.value.toUpperCase() })
                    }
                    placeholder="UF"
                    className="w-16 px-2 py-2 text-xs uppercase text-center rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  Data de Início Prevista
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  Condições de Pagamento
                </label>
                <textarea
                  rows={2}
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="Ex.: 30% de entrada; 30% projetos; 20% estruturas; saldo vistoria."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  Observações Comerciais
                </label>
                <input
                  type="text"
                  value={formData.commercialNotes}
                  onChange={(e) => setFormData({ ...formData, commercialNotes: e.target.value })}
                  placeholder="Notas adicionais, regras do Simples Nacional, etc."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] outline-none"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Rodapé de Ações */}
        <div className="px-6 py-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {onOpenFullEditor && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenFullEditor(budget)
                }}
                className="text-xs font-bold text-[#294C87] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Abrir Editor Completo de Serviços (4 Níveis, BDI e Insumos) →</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#FF6B1F]" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DeleteBudgetConfirmModalProps {
  budget: FullBudget | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export const DeleteBudgetConfirmModal: React.FC<DeleteBudgetConfirmModalProps> = ({
  budget,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !budget) return null

  const summary = calculateFullBudget(budget)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-red-200 animate-scale-up space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#171A1F]">
              Excluir Orçamento Definitivamente
            </h3>
            <p className="text-xs text-[#171A1F]/70 mt-1">
              Esta ação removerá o orçamento do sistema e atualizará todos os indicadores do
              Dashboard imediatamente.
            </p>
          </div>
        </div>

        {/* Detalhes do item a ser excluído */}
        <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200/80 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#171A1F]/60">Código:</span>
            <span className="font-mono font-bold text-[#294C87]">{budget.code}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#171A1F]/60">Obra:</span>
            <span className="font-bold text-[#171A1F] text-right truncate max-w-[220px]">
              {budget.title || budget.work?.name || 'Não informado'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#171A1F]/60">Cliente:</span>
            <span className="font-semibold text-[#171A1F] text-right truncate max-w-[220px]">
              {budget.client?.name || 'Não informado'}
            </span>
          </div>
          {budget.work?.address && (
            <div className="flex items-center justify-between">
              <span className="text-[#171A1F]/60">Endereço:</span>
              <span className="text-[#171A1F]/80 text-right truncate max-w-[220px]">
                {budget.work.address}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-red-200/60">
            <span className="text-[#171A1F]/60">Valor Orçado:</span>
            <span className="font-extrabold text-[#C4453C]">
              {formatCurrencyBRL(summary.finalSalePrice)}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[#171A1F]/60 leading-relaxed">
          Tem certeza de que deseja apagar este registro? Os dados do orçamento não poderão ser
          recuperados após a confirmação.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#171A1F]/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  )
}
