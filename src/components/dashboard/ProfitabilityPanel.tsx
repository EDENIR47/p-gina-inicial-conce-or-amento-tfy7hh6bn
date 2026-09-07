import React, { useState, useEffect } from 'react'
import { TrendingUp, HelpCircle } from 'lucide-react'
import { WorkProfitability } from '@/types/conce'
import { formatPercent, getMarginColor, formatCurrencyBRL } from '@/lib/formatters'

interface ProfitabilityPanelProps {
  items: WorkProfitability[]
}

export const ProfitabilityPanel: React.FC<ProfitabilityPanelProps> = ({ items }) => {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    // Animação de entrada das barras da esquerda para a direita
    const timer = setTimeout(() => setAnimated(true), 150)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="bg-white rounded-[12px] p-6 shadow-[0_4px_16px_rgba(23,26,31,0.06)] flex flex-col justify-between h-full">
      <div>
        {/* Título e Subtítulo */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#294C87]/10 text-[#294C87] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#171A1F] tracking-tight">
                Lucratividade Estimada por Obra
              </h3>
            </div>
            <p className="text-xs text-[#171A1F]/60 mt-1 pl-10">
              Margem Líquida = (Venda − (Custo Direto + BDI)) / Venda
            </p>
          </div>
        </div>

        {/* Legenda dos Limiares de Lucratividade CONCE */}
        <div className="mb-6 flex flex-wrap items-center gap-2 sm:gap-4 p-2.5 rounded-lg bg-[#171A1F]/5 text-xs">
          <span className="font-semibold text-[#171A1F] text-[11px] uppercase tracking-wider">
            Faixas de Margem:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#294C87]" />
            <span className="text-[#171A1F]/80">&gt; 25% (Alta)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B1F]" />
            <span className="text-[#171A1F]/80">15% a 25% (Meta)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C4453C]" />
            <span className="text-[#171A1F]/80">&lt; 15% (Atenção)</span>
          </div>
        </div>

        {/* Barras Horizontais com animação */}
        <div className="space-y-4">
          {items.map((item) => {
            const colorInfo = getMarginColor(item.marginPercent)
            // Escala de largura máxima visual: 40% margem equivale a 100% da barra
            const barWidthPercent = Math.min(100, Math.round((item.marginPercent / 40) * 100))

            return (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-xs sm:text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-[#171A1F]">{item.workName}</span>
                    <span className="text-[11px] text-[#171A1F]/50 hidden sm:inline">
                      ({item.statusText})
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] text-[#171A1F]/60">
                      Venda: {formatCurrencyBRL(item.saleValue)}
                    </span>
                    <span
                      className="font-extrabold text-sm sm:text-base px-2 py-0.5 rounded"
                      style={{
                        color: colorInfo.hex,
                        backgroundColor: `${colorInfo.hex}15`,
                      }}
                    >
                      {formatPercent(item.marginPercent)}
                    </span>
                  </div>
                </div>

                {/* Trilho de fundo e barra preenchida */}
                <div className="h-3.5 w-full bg-[#171A1F]/10 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: animated ? `${barWidthPercent}%` : '0%',
                      backgroundColor: colorInfo.hex,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Nota técnica sobre BDI */}
      <div className="mt-6 pt-3 border-t border-[#171A1F]/10 text-[11px] text-[#171A1F]/60 flex items-center justify-between">
        <span>BDI médio praticado nos cálculos: 15% a 20% conforme diretrizes do IBRAOP.</span>
        <span className="font-semibold text-[#294C87]">CONCE Engenharia</span>
      </div>
    </div>
  )
}
export default ProfitabilityPanel
