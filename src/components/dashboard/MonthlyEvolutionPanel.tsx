import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { MonthlyEvolutionItem } from '@/types/conce'
import { formatCurrencyBRL } from '@/lib/formatters'

interface MonthlyEvolutionPanelProps {
  items: MonthlyEvolutionItem[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as MonthlyEvolutionItem
    return (
      <div className="bg-[#171A1F] text-white p-3 rounded-lg shadow-xl border border-white/10 text-xs">
        <p className="font-bold text-sm text-[#FF6B1F] mb-1">{data.monthFull} / 2024-2025</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/70">Orçamentos emitidos:</span>
            <span className="font-bold text-white text-sm">{data.count} propostas</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/70">Volume financeiro:</span>
            <span className="font-bold text-[#FF6B1F]">{formatCurrencyBRL(data.totalValue)}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export const MonthlyEvolutionPanel: React.FC<MonthlyEvolutionPanelProps> = ({ items }) => {
  return (
    <div className="bg-white rounded-[12px] p-6 shadow-[0_4px_16px_rgba(23,26,31,0.06)] flex flex-col justify-between h-full">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#294C87]/10 text-[#294C87] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#171A1F] tracking-tight">
                Evolução de Orçamentos
              </h3>
            </div>
            <p className="text-xs text-[#171A1F]/60 mt-1 pl-10">
              Série histórica dos últimos 6 meses (quantidade de propostas geradas)
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#294C87]/10 text-[#294C87] text-xs font-semibold">
            <span>Últimos 6 meses</span>
          </div>
        </div>

        {/* Gráfico de Linha / Área com paleta CONCE */}
        {items.length === 0 ? (
          <div className="w-full h-[200px] flex items-center justify-center text-xs text-[#171A1F]/50">
            Nenhuma movimentação mensal registrada.
          </div>
        ) : (
          <div className="w-full h-[250px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={items} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                <defs>
                  {/* Preenchimento Cobalt a 10% */}
                  <linearGradient id="cobaltArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#294C87" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#294C87" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#171A1F"
                  strokeOpacity={0.08}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#171A1F', fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: '#171A1F', strokeOpacity: 0.15 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#171A1F', fontSize: 11 }}
                  axisLine={{ stroke: '#171A1F', strokeOpacity: 0.15 }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#294C87"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#cobaltArea)"
                  dot={{
                    fill: '#FF6B1F',
                    stroke: '#FFFFFF',
                    strokeWidth: 2,
                    r: 4.5,
                  }}
                  activeDot={{
                    fill: '#FF6B1F',
                    stroke: '#294C87',
                    strokeWidth: 2,
                    r: 6,
                  }}
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Rodapé explicativo */}
      <div className="mt-4 pt-3 border-t border-[#171A1F]/10 flex items-center justify-between text-[11px] text-[#171A1F]/60">
        <span>Crescimento de +150% na elaboração de propostas no período.</span>
        <span className="font-semibold text-[#294C87]">Ritmo de expansão ativo</span>
      </div>
    </div>
  )
}
export default MonthlyEvolutionPanel
