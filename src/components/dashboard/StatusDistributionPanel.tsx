import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PieChart as PieIcon } from 'lucide-react'
import { StatusDistributionItem } from '@/types/conce'
import { formatPercent } from '@/lib/formatters'

interface StatusDistributionPanelProps {
  items: StatusDistributionItem[]
  total: number
}

const CustomTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as StatusDistributionItem
    const percent = ((item.count / total) * 100).toFixed(1)
    return (
      <div className="bg-[#171A1F] text-white p-3 rounded-lg shadow-xl border border-white/10 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="font-bold text-sm text-white">{item.label}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-white/70">Quantidade:</span>
          <span className="font-bold text-white text-sm">{item.count} orçamentos</span>
        </div>
        <div className="flex items-center justify-between gap-4 mt-0.5">
          <span className="text-white/70">Representatividade:</span>
          <span className="font-bold text-[#FF6B1F]">{percent}%</span>
        </div>
      </div>
    )
  }
  return null
}

export const StatusDistributionPanel: React.FC<StatusDistributionPanelProps> = ({
  items,
  total,
}) => {
  return (
    <div className="bg-white rounded-[12px] p-6 shadow-[0_4px_16px_rgba(23,26,31,0.06)] flex flex-col justify-between h-full">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B1F]/10 text-[#FF6B1F] flex items-center justify-center">
                <PieIcon className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#171A1F] tracking-tight">
                Distribuição por Status
              </h3>
            </div>
            <p className="text-xs text-[#171A1F]/60 mt-1 pl-10">
              Proporção dos 42 orçamentos da carteira atual
            </p>
          </div>
        </div>

        {/* Gráfico de Rosca (Doughnut) com total no centro */}
        <div className="relative w-full h-[220px] sm:h-[240px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={
                  total > 0
                    ? items
                    : [{ status: 'nenhum', label: 'Sem orçamentos', count: 1, color: '#E5E7EB' }]
                }
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={total > 0 ? 3 : 0}
                dataKey="count"
                animationDuration={900}
              >
                {total > 0 ? (
                  items.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  ))
                ) : (
                  <Cell fill="#E5E7EB" stroke="#FFFFFF" strokeWidth={2} />
                )}
              </Pie>
              {total > 0 && <Tooltip content={<CustomTooltip total={total} />} />}
            </PieChart>
          </ResponsiveContainer>

          {/* Texto de Total no Centro da Rosca */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-extrabold text-[#171A1F] tracking-tight leading-none">
              {total}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#171A1F]/60 mt-0.5">
              {total === 1 ? 'Orçamento' : 'Orçamentos'}
            </span>
          </div>
        </div>

        {/* Legenda dos Status com contagem e percentual */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#171A1F]/10">
          {items.map((entry) => {
            const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0
            return (
              <div
                key={entry.status}
                className="flex items-center justify-between p-2 rounded-md bg-[#171A1F]/[0.03] text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="font-medium text-[#171A1F] truncate text-[11px] sm:text-xs">
                    {entry.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="font-bold text-[#171A1F]">{entry.count}</span>
                  <span className="text-[10px] text-[#171A1F]/50">({pct}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rodapé informativo */}
      <div className="mt-4 pt-3 border-t border-[#171A1F]/10 flex items-center justify-between text-[11px] text-[#171A1F]/60">
        <span>
          {total > 0
            ? `Taxa de conversão atual de propostas: ${Math.round(((items.find((i) => i.status === 'aprovado')?.count || 0) / total) * 100)}% de aprovação direta.`
            : 'Aguardando cadastro de propostas e aprovação de clientes.'}
        </span>
      </div>
    </div>
  )
}
export default StatusDistributionPanel
