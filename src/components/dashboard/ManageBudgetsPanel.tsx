import React, { useState } from 'react'
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  Edit2,
  Trash2,
  Layers,
  Building,
  User,
  Calendar,
  DollarSign,
  Plus,
  ArrowUpRight,
} from 'lucide-react'
import { FullBudget } from '@/types/budgetEngine'
import { BudgetStatus } from '@/types/conce'
import { formatCurrencyBRL, formatPercent } from '@/lib/formatters'
import { calculateFullBudget } from '@/lib/budgetEngine'
import { useNavigate } from 'react-router-dom'

interface ManageBudgetsPanelProps {
  budgets: FullBudget[]
  onEdit: (budget: FullBudget) => void
  onDelete: (budget: FullBudget) => void
  onOpenFullEditor: (budget: FullBudget) => void
}

const statusBadgeConfig: Record<
  BudgetStatus,
  { label: string; bg: string; text: string; icon: any }
> = {
  em_andamento: {
    label: 'Em Andamento',
    bg: 'bg-[#294C87]/10 border-[#294C87]/30',
    text: 'text-[#294C87]',
    icon: Clock,
  },
  aprovado: {
    label: 'Aprovado',
    bg: 'bg-[#3E8E5A]/10 border-[#3E8E5A]/30',
    text: 'text-[#3E8E5A]',
    icon: CheckCircle2,
  },
  vencido: {
    label: 'Vencido',
    bg: 'bg-[#C4453C]/10 border-[#C4453C]/30',
    text: 'text-[#C4453C]',
    icon: AlertTriangle,
  },
  em_analise: {
    label: 'Em Análise',
    bg: 'bg-[#171A1F]/10 border-[#171A1F]/30',
    text: 'text-[#171A1F]',
    icon: HelpCircle,
  },
}

export const ManageBudgetsPanel: React.FC<ManageBudgetsPanelProps> = ({
  budgets,
  onEdit,
  onDelete,
  onOpenFullEditor,
}) => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  const filtered = budgets.filter((b) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      (b.code || '').toLowerCase().includes(term) ||
      (b.title || '').toLowerCase().includes(term) ||
      (b.work?.name || '').toLowerCase().includes(term) ||
      (b.work?.address || '').toLowerCase().includes(term) ||
      (b.client?.name || '').toLowerCase().includes(term)

    const matchesStatus = statusFilter === 'todos' || b.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="bg-white rounded-[16px] p-6 shadow-[0_4px_20px_rgba(23,26,31,0.06)] border border-[#171A1F]/10 space-y-6 animate-fade-in">
      {/* Topo do Painel de Gerenciamento */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#171A1F]/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B1F]/15 text-[#FF6B1F] flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#171A1F] tracking-tight">
              Gerenciar Orçamentos Salvos
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#294C87] text-white text-xs font-extrabold">
              {budgets.length} {budgets.length === 1 ? 'orçamento' : 'orçamentos'}
            </span>
          </div>
          <p className="text-xs text-[#171A1F]/60 mt-1 pl-10">
            Edite dados cadastrais, altere status ou remova orçamentos do sistema. As alterações
            refletem imediatamente nos indicadores e gráficos consolidados.
          </p>
        </div>

        {/* Controles de Busca e Filtro */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#171A1F]/40" />
            <input
              type="text"
              placeholder="Buscar cliente, obra ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] focus:ring-1 focus:ring-[#294C87] outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-8 py-1.5 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] bg-white text-[#171A1F] font-semibold outline-none cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="aprovado">Aprovados</option>
            <option value="vencido">Vencidos</option>
            <option value="em_analise">Em Análise</option>
          </select>

          <button
            type="button"
            onClick={() => navigate('/orcamentos')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#294C87] hover:bg-[#1f3b6c] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#FF6B1F]" />
            <span>Novo Orçamento</span>
          </button>
        </div>
      </div>

      {/* Tabela de Gerenciamento Completa */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-[#171A1F]/50 space-y-2">
          <FileText className="w-10 h-10 text-[#171A1F]/30 mx-auto" />
          <p className="text-sm font-semibold">Nenhum orçamento encontrado.</p>
          <p className="text-xs text-[#171A1F]/40">
            Tente alterar o filtro ou limpar os termos de pesquisa.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#171A1F]/10 text-[11px] font-bold uppercase tracking-wider text-[#171A1F]/60 bg-[#171A1F]/[0.02]">
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Obra / Endereço</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3 text-center">Criação</th>
                <th className="py-3 px-3 text-right">Valor Total</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center min-w-[200px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171A1F]/5">
              {filtered.map((b) => {
                const summary = calculateFullBudget(b)
                const badge = statusBadgeConfig[b.status] || statusBadgeConfig.em_andamento
                const BadgeIcon = badge.icon
                const workTitle = b.title || b.work?.name || 'Obra sem nome'
                const clientName = b.client?.name || 'Não informado'
                const address = b.work?.address
                  ? `${b.work.address} - ${b.work.city || 'Porto Alegre'}/${b.work.state || 'RS'}`
                  : `${b.work?.city || 'Porto Alegre'}/${b.work?.state || 'RS'}`

                return (
                  <tr key={b.id} className="hover:bg-[#294C87]/[0.03] transition-colors group">
                    {/* Código */}
                    <td className="py-3.5 px-3 font-mono font-extrabold text-[#294C87]">
                      {b.code}
                    </td>

                    {/* Obra / Endereço */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-xs text-[#171A1F]">{workTitle}</div>
                      <div className="text-[11px] text-[#171A1F]/60 truncate max-w-xs mt-0.5">
                        {address}
                      </div>
                      <div className="text-[10px] text-[#294C87] font-semibold mt-0.5">
                        {b.stages?.length || 0} etapas • {summary.servicesCount} serviços
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-[#171A1F]">{clientName}</div>
                      {b.client?.phone && (
                        <div className="text-[10px] text-[#171A1F]/50">{b.client.phone}</div>
                      )}
                    </td>

                    {/* Data de Criação */}
                    <td className="py-3.5 px-3 text-center text-[#171A1F]/70 text-[11px]">
                      {b.createdAt ? b.createdAt.split('-').reverse().join('/') : '—'}
                    </td>

                    {/* Valor Total */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="font-extrabold text-sm text-[#FF6B1F]">
                        {formatCurrencyBRL(summary.finalSalePrice)}
                      </div>
                      <div className="text-[10px] text-[#171A1F]/50">
                        Custo: {formatCurrencyBRL(summary.totalDirectCost)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text}`}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </td>

                    {/* Ações: Editar e Excluir */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(b)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#294C87]/10 hover:bg-[#294C87] text-[#294C87] hover:text-white font-bold text-xs transition-colors cursor-pointer"
                          title="Editar dados cadastrais, cliente, obra e status"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenFullEditor(b)}
                          className="p-1.5 rounded-lg bg-[#171A1F]/5 hover:bg-[#171A1F]/15 text-[#171A1F] transition-colors cursor-pointer"
                          title="Abrir editor completo de serviços e insumos em /orcamentos"
                        >
                          <ArrowUpRight className="w-4 h-4 text-[#294C87]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(b)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                          title="Excluir este orçamento definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
