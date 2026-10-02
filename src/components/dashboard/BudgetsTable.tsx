import React, { useState } from 'react'
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { Budget, BudgetStatus } from '@/types/conce'
import { formatCurrencyBRL, formatPercent } from '@/lib/formatters'

interface BudgetsTableProps {
  budgets: Budget[]
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

export const BudgetsTable: React.FC<BudgetsTableProps> = ({ budgets }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [page, setPage] = useState(1)
  const pageSize = 8

  // Filtragem combinada
  const filtered = budgets.filter((b) => {
    const matchesSearch =
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.workName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.client.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'todos' || b.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="bg-white rounded-[12px] p-6 shadow-[0_4px_16px_rgba(23,26,31,0.06)]">
      {/* Topo do painel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#294C87]/10 text-[#294C87] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#171A1F] tracking-tight">
              Relação de Orçamentos Recentes
            </h3>
          </div>
          <p className="text-xs text-[#171A1F]/60 mt-1 pl-10">
            Listagem detalhada dos orçamentos, clientes, custos e margens operacionais
          </p>
        </div>

        {/* Controles de Busca e Filtro */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca por texto */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#171A1F]/40" />
            <input
              type="text"
              placeholder="Buscar obra, código ou cliente..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] focus:ring-1 focus:ring-[#294C87] outline-none"
            />
          </div>

          {/* Filtro de Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="pl-3 pr-8 py-1.5 text-xs rounded-lg border border-[#171A1F]/20 focus:border-[#294C87] bg-white text-[#171A1F] font-medium outline-none cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="aprovado">Aprovados</option>
              <option value="vencido">Vencidos</option>
              <option value="em_analise">Em Análise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela Responsiva */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#171A1F]/10 text-[11px] font-bold uppercase tracking-wider text-[#171A1F]/60 bg-[#171A1F]/[0.02]">
              <th className="py-3 px-3">Código</th>
              <th className="py-3 px-3">Obra / Descrição</th>
              <th className="py-3 px-3">Cliente</th>
              <th className="py-3 px-3 text-right">Valor Orçado</th>
              <th className="py-3 px-3 text-right">Custo Direto</th>
              <th className="py-3 px-3 text-center">Margem</th>
              <th className="py-3 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#171A1F]/5">
            {paginated.length > 0 ? (
              paginated.map((b) => {
                const badge = statusBadgeConfig[b.status]
                const BadgeIcon = badge.icon
                return (
                  <tr key={b.id} className="hover:bg-[#171A1F]/[0.02] transition-colors group">
                    <td className="py-3 px-3 font-mono font-semibold text-[#294C87]">{b.code}</td>
                    <td className="py-3 px-3 font-medium text-[#171A1F]">
                      <div className="font-semibold text-xs sm:text-sm">{b.workName}</div>
                      <div className="text-[10px] text-[#171A1F]/50">Ref.: {b.month}/2025</div>
                    </td>
                    <td className="py-3 px-3 text-[#171A1F]/80">{b.client}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#171A1F]">
                      {formatCurrencyBRL(b.budgetedValue)}
                    </td>
                    <td className="py-3 px-3 text-right text-[#171A1F]/70">
                      {formatCurrencyBRL(b.directCost)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold text-[#294C87] px-2 py-0.5 rounded bg-[#294C87]/10">
                        {formatPercent(b.marginPercent)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text}`}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#171A1F]/50">
                  Nenhum orçamento encontrado com os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="mt-4 pt-3 border-t border-[#171A1F]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#171A1F]/60">
        <div>
          Exibindo{' '}
          <span className="font-bold text-[#171A1F]">
            {filtered.length > 0 ? (page - 1) * pageSize + 1 : 0}
          </span>{' '}
          a{' '}
          <span className="font-bold text-[#171A1F]">
            {Math.min(page * pageSize, filtered.length)}
          </span>{' '}
          de <span className="font-bold text-[#171A1F]">{filtered.length}</span> orçamentos
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border border-[#171A1F]/20 disabled:opacity-40 hover:bg-[#171A1F]/5 font-medium transition-colors cursor-pointer"
          >
            Anterior
          </button>
          <span className="font-semibold text-[#171A1F] px-2">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border border-[#171A1F]/20 disabled:opacity-40 hover:bg-[#171A1F]/5 font-medium transition-colors cursor-pointer"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  )
}
export default BudgetsTable
