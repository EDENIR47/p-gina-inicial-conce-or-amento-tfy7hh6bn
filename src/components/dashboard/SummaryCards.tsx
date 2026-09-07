import React from 'react'
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Building,
} from 'lucide-react'
import { formatCurrencyBRL } from '@/lib/formatters'

interface SummaryCardsProps {
  summary: {
    totalBudgets: number
    totalBudgetedValue: number
    inProgressCount: number
    approvedCount: number
    expiredCount: number
    inReviewCount: number
  }
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const cards = [
    {
      id: 'total',
      label: 'TOTAL DE ORÇAMENTOS',
      value: String(summary.totalBudgets),
      subtext: 'Portfólio cadastrado no sistema',
      icon: FileText,
      accentColor: '#294C87', // Cobalt
      accentBg: 'bg-[#294C87]/10',
      iconColor: 'text-[#294C87]',
      borderColor: 'border-l-4 border-[#294C87]',
    },
    {
      id: 'valor-total',
      label: 'VALOR TOTAL ORÇADO',
      value: formatCurrencyBRL(summary.totalBudgetedValue),
      subtext: 'Soma total das propostas ativas',
      icon: DollarSign,
      accentColor: '#FF6B1F', // Pumpkin Orange
      accentBg: 'bg-[#FF6B1F]/10',
      iconColor: 'text-[#FF6B1F]',
      borderColor: 'border-l-4 border-[#FF6B1F]',
      highlight: true,
    },
    {
      id: 'andamento',
      label: 'EM ANDAMENTO',
      value: String(summary.inProgressCount),
      subtext: 'Em elaboração e cálculo técnico',
      icon: Clock,
      accentColor: '#294C87', // Cobalt
      accentBg: 'bg-[#294C87]/10',
      iconColor: 'text-[#294C87]',
      borderColor: 'border-l-4 border-[#294C87]',
    },
    {
      id: 'aprovados',
      label: 'APROVADOS',
      value: String(summary.approvedCount),
      subtext: 'Contratos fechados e prontos',
      icon: CheckCircle2,
      accentColor: '#3E8E5A', // Verde suave
      accentBg: 'bg-[#3E8E5A]/10',
      iconColor: 'text-[#3E8E5A]',
      borderColor: 'border-l-4 border-[#3E8E5A]',
    },
    {
      id: 'vencidos',
      label: 'VENCIDOS',
      value: String(summary.expiredCount),
      subtext: 'Validade de 30 dias expirada',
      icon: AlertTriangle,
      accentColor: '#C4453C', // Vermelho suave
      accentBg: 'bg-[#C4453C]/10',
      iconColor: 'text-[#C4453C]',
      borderColor: 'border-l-4 border-[#C4453C]',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.id}
            className={`bg-white rounded-[12px] p-5 shadow-[0_4px_16px_rgba(23,26,31,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(23,26,31,0.12)] ${card.borderColor} flex flex-col justify-between group`}
          >
            <div>
              {/* Cabeçalho do Card */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#171A1F]/70">
                  {card.label}
                </span>
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${card.accentBg} ${card.iconColor}`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2.4} />
                </div>
              </div>

              {/* Valor Principal com clamp para responsividade perfeita */}
              <div
                className={`font-extrabold tracking-tight text-[#171A1F] ${
                  card.highlight
                    ? 'text-lg sm:text-xl lg:text-2xl text-[#FF6B1F]'
                    : 'text-2xl sm:text-3xl'
                }`}
                style={{
                  fontSize: card.highlight
                    ? 'clamp(1.1rem, 1.4vw, 1.55rem)'
                    : 'clamp(1.5rem, 1.8vw, 2rem)',
                }}
              >
                {card.value}
              </div>
            </div>

            {/* Subtítulo / Nota explicativa */}
            <div className="mt-3 pt-2.5 border-t border-[#171A1F]/5 text-[11px] text-[#171A1F]/55 flex items-center justify-between">
              <span>{card.subtext}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
export default SummaryCards
