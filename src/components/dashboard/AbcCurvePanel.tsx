import React from 'react'
import { Link } from 'react-router-dom'
import { Layers, Award, ArrowRight } from 'lucide-react'
import { AbcItem } from '@/types/conce'
import { formatCurrencyBRL, formatPercent } from '@/lib/formatters'

interface AbcCurvePanelProps {
  items: AbcItem[]
}

export const AbcCurvePanel: React.FC<AbcCurvePanelProps> = ({ items }) => {
  return (
    <div className="bg-white rounded-[12px] p-6 shadow-[0_4px_16px_rgba(23,26,31,0.06)] flex flex-col justify-between h-full">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B1F]/10 text-[#FF6B1F] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#171A1F] tracking-tight">
                Mini Curva ABC — 5 itens de maior peso
              </h3>
            </div>
            <p className="text-xs text-[#171A1F]/60 mt-1 pl-10">
              Concentração de custos diretos nas obras em carteira
            </p>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF6B1F]/10 text-[#FF6B1F] text-xs font-semibold">
            <Award className="w-3.5 h-3.5" />
            <span>Classe A: ~80% acumulado</span>
          </div>
        </div>

        {/* Barra fina empilhada visualizando a participação cumulativa */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#171A1F]/70 mb-1.5">
            <span>Distribuição de Impacto Orçamentário:</span>
            <span className="text-[#FF6B1F]">Top 2 itens = 79,8% do volume</span>
          </div>

          <div className="h-2.5 w-full bg-[#171A1F]/10 rounded-full overflow-hidden flex">
            {/* Item 1: 45.3% Pumpkin escuro */}
            <div
              style={{ width: '45.3%' }}
              className="h-full bg-[#FF6B1F] title='Concreto estrutural (45.3%)'"
            />
            {/* Item 2: 34.5% Pumpkin médio */}
            <div
              style={{ width: '34.5%' }}
              className="h-full bg-[#FF853E] border-l border-white/40 title='Aço CA-50 (34.5%)'"
            />
            {/* Item 3: 9.7% Cobalt */}
            <div
              style={{ width: '9.7%' }}
              className="h-full bg-[#294C87] border-l border-white/40 title='Alvenaria (9.7%)'"
            />
            {/* Item 4: 6.6% Cobalt claro */}
            <div
              style={{ width: '6.6%' }}
              className="h-full bg-[#466FB5] border-l border-white/40 title='Esquadrias (6.6%)'"
            />
            {/* Item 5: 3.9% Mirage */}
            <div
              style={{ width: '3.9%' }}
              className="h-full bg-[#171A1F] border-l border-white/40 title='Pintura (3.9%)'"
            />
          </div>
        </div>

        {/* Lista dos 5 itens com visualização de Classe A diferenciada */}
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.rank}
              className={`p-3 rounded-lg border transition-all duration-150 flex items-center justify-between gap-3 ${
                item.isClassA
                  ? 'border-l-4 border-l-[#FF6B1F] bg-[#FF6B1F]/[0.06] border-t-[#FF6B1F]/20 border-r-[#FF6B1F]/20 border-b-[#FF6B1F]/20'
                  : 'border-l-4 border-l-[#171A1F]/20 bg-white border-t-[#171A1F]/10 border-r-[#171A1F]/10 border-b-[#171A1F]/10'
              }`}
            >
              {/* Lado Esquerdo: Número e Nome */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    item.isClassA ? 'bg-[#FF6B1F] text-white shadow-sm' : 'bg-[#294C87] text-white'
                  }`}
                >
                  {item.rank}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-[#171A1F] truncate">
                      {item.name}
                    </span>
                    {item.isClassA && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#FF6B1F] text-white uppercase flex-shrink-0">
                        Classe A
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#171A1F]/50 block truncate">
                    {item.category}
                  </span>
                </div>
              </div>

              {/* Lado Direito: Valor e Percentual Acumulado */}
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-xs sm:text-sm text-[#171A1F]">
                  {formatCurrencyBRL(item.value)}
                </div>
                <div className="text-[11px] font-medium text-[#171A1F]/60">
                  Acum.:{' '}
                  <span
                    className={
                      item.isClassA ? 'font-bold text-[#FF6B1F]' : 'font-semibold text-[#294C87]'
                    }
                  >
                    {formatPercent(item.accumulatedPercent, 1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legenda explicativa de Curva ABC e Link para Módulo Completo */}
      <div className="mt-4 pt-3 border-t border-[#171A1F]/10 text-[11px] text-[#171A1F]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <span>Foco prioritário: cotação e negociação direta nos itens de Classe A.</span>
        <Link
          to="/cotacoes"
          className="inline-flex items-center gap-1 font-bold text-[#FF6B1F] hover:underline"
        >
          <span>Ir para Cotações</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
export default AbcCurvePanel
