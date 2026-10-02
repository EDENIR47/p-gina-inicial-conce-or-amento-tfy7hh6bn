import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { BudgetComparisonItem } from '@/types/conce'
import { formatCurrencyBRL } from '@/lib/formatters'

interface BudgetComparisonPanelProps {
  items: BudgetComparisonItem[]
}

// Tooltip estilizado na identidade visual CONCE
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const budgeted = payload.find((p: any) => p.dataKey === 'budgetedThousands')?.payload
      .budgetedFull
    const actual = payload.find((p: any) => p.dataKey === 'actualThousands')?.payload.actualFull

    const diff = actual - budgeted
    const diffPercent = budgeted ? ((diff / budgeted) * 100).toFixed(1) : '0'

    return (
      <div className="bg-[#171A1F] text-white p-3 rounded-lg shadow-xl border border-white/10 text-xs">
        <p className="font-bold text-sm text-white mb-2 pb-1 border-b border-white/10">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-white/80">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#294C87]" />
              Orçado:
            </span>
            <span className="font-bold text-white">{formatCurrencyBRL(budgeted)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-white/80">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FF6B1F]" />
              Realizado:
            </span>
            <span className="font-bold text-[#FF6B1F]">{formatCurrencyBRL(actual)}</span>
          </div>
          <div className="pt-1 mt-1 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-white/60">Variação:</span>
            <span className={`font-semibold ${diff <= 0 ? 'text-[#3E8E5A]' : 'text-[#C4453C]'}`}>
              {diff <= 0 ? 'Economia de ' : 'Acréscimo de '}
              {Math.abs(Number(diffPercent))}%
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export const BudgetComparisonPanel: React.FC<BudgetComparisonPanelProps> = ({ items }) => {
  // Subtítulo dinâmico baseado na quantidade real de itens
  const subtitle =
    items.length === 0
      ? 'Acompanhamento de obras em execução (valores em milhares de R$)'
      : items.length === 1
        ? 'Acompanhamento da obra em execução (valores em milhares de R$)'
        : `Acompanhamento das ${items.length} obras em execução (valores em milhares de R$)`

  // Cálculo da eficiência consolidada / aderência REAL a partir dos itens
  let adherenceFormatted: string | null = null
  if (items.length > 0) {
    const totalBudgeted = items.reduce((sum, it) => sum + (it.budgetedFull || 0), 0)
    const totalActual = items.reduce((sum, it) => sum + (it.actualFull || 0), 0)

    if (totalBudgeted > 0) {
      // Aderência: 100 - variação percentual absoluta (|realizado - orçado| / orçado * 100)
      const diff = Math.abs(totalActual - totalBudgeted)
      const adherence = Math.max(0, 100 - (diff / totalBudgeted) * 100)
      adherenceFormatted = adherence.toFixed(1).replace('.', ',')
    }
  }

  return (
    <div className="bg-white rounded-[12px] p-6 shadow-[0_4px_16px_rgba(23,26,31,0.06)]">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#294C87]/10 text-[#294C87] flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#171A1F] tracking-tight">
              Comparativo Orçado x Realizado
            </h3>
          </div>
          <p className="text-xs text-[#171A1F]/60 mt-1 pl-10">{subtitle}</p>
        </div>

        {/* Legenda Manual alinhada com as cores da marca */}
        <div className="flex items-center gap-4 text-xs font-medium self-start sm:self-center">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#294C87]" />
            <span className="text-[#171A1F]">Orçado (Cobalt)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#FF6B1F]" />
            <span className="text-[#171A1F]">Realizado (Pumpkin Orange)</span>
          </div>
        </div>
      </div>

      {/* Gráfico de Barras Agrupadas */}
      {items.length === 0 ? (
        <div className="w-full h-[200px] flex items-center justify-center text-xs text-[#171A1F]/50">
          Nenhuma obra cadastrada para comparação orçado versus realizado.
        </div>
      ) : (
        <div className="w-full h-[290px] sm:h-[330px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={items}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              barCategoryGap="20%"
              barGap={6}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#171A1F"
                strokeOpacity={0.08}
                vertical={false}
              />
              <XAxis
                dataKey="workName"
                tick={{ fill: '#171A1F', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: '#171A1F', strokeOpacity: 0.15 }}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: '#171A1F', fontSize: 11 }}
                axisLine={{ stroke: '#171A1F', strokeOpacity: 0.15 }}
                tickLine={false}
                tickFormatter={(v) => `R$ ${v}k`}
                dx={-5}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="budgetedThousands"
                name="Orçado"
                fill="#294C87"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
              <Bar
                dataKey="actualThousands"
                name="Realizado"
                fill="#FF6B1F"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Nota de rodapé da análise */}
      <div className="mt-4 pt-3 border-t border-[#171A1F]/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#171A1F]/60">
        <span>Controle de desvios orçamentários com tolerância máxima de 5% de contingência.</span>
        {adherenceFormatted ? (
          <span className="font-semibold text-[#171A1F]">
            Eficiência consolidada: {adherenceFormatted}% de aderência ao custo orçado
          </span>
        ) : (
          <span className="font-semibold text-[#171A1F]">
            Eficiência orçamentária monitorada em tempo real
          </span>
        )}
      </div>
    </div>
  )
}
export default BudgetComparisonPanel
