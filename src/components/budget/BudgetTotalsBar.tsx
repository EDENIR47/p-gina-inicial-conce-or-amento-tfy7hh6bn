/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Barra Fixa de Totais do Orçamento em Tempo Real & Validações Globais
 * - Custo direto de insumos e mão de obra
 * - Encargos sociais aplicados
 * - BDI e impostos calculados
 * - Total Geral da Obra em Pumpkin Orange
 * - Conferência de integridade: somatório das etapas vs. total geral
 */

import React from 'react'
import {
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Save,
  Download,
  Share2,
  Eye,
} from 'lucide-react'
import { CalculationSummary, FullBudget } from '@/types/budgetEngine'
import { formatCurrencyBRL } from '@/lib/formatters'

interface BudgetTotalsBarProps {
  summary: CalculationSummary
  budget: FullBudget
  onSave: () => void
  isSaving?: boolean
  validationErrors?: Record<string, string>
}

export const BudgetTotalsBar: React.FC<BudgetTotalsBarProps> = ({
  summary,
  budget,
  onSave,
  isSaving = false,
  validationErrors = {},
}) => {
  // Conferência entre somatório das etapas e total geral
  const sumOfStages = summary.stagesSubtotals.reduce((acc, st) => acc + st.withBdi, 0)
  const difference = Math.abs(sumOfStages - summary.finalSalePrice)
  const isSumConsistent = difference < 0.05 // tolerância de arredondamento de centavos

  const errorCount = Object.keys(validationErrors).length

  return (
    <aside
      aria-label="Painel de Consolidação do Orçamento"
      className="bg-[#171A1F] text-white rounded-[20px] p-5 sm:p-6 shadow-[0_8px_32px_rgba(23,26,31,0.25)] border-2 border-[#294C87]/40 space-y-5"
    >
      {/* Alerta de Validação ou Sucesso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          {errorCount > 0 ? (
            <div className="flex items-center gap-2 text-[#FF6B1F]">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-bold">
                Atenção: {errorCount} {errorCount === 1 ? 'campo pendente' : 'campos pendentes'} no
                cadastro.
              </span>
            </div>
          ) : isSumConsistent ? (
            <div className="flex items-center gap-2 text-[#3E8E5A]">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-bold">
                Conferência de Integridade: Somatório das etapas coincide exatamente com o Total
                Geral.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-bold">
                Aviso: Divergência de arredondamento ({formatCurrencyBRL(difference)}).
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-sm font-bold transition-all shadow-lg hover:shadow-orange-500/20 active:scale-95 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Salvando...' : 'Salvar Orçamento'}</span>
        </button>
      </div>

      {/* Grade de Indicadores Financeiros */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Custo Direto Insumos */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[10px] text-white/60 uppercase font-semibold block">
            Custo Direto Base
          </span>
          <span className="text-sm sm:text-base font-bold text-white block mt-0.5">
            {formatCurrencyBRL(summary.directCostInputs)}
          </span>
          <span className="text-[10px] text-white/40">Insumos sem encargos</span>
        </div>

        {/* Mão de Obra e Encargos */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/60 uppercase font-semibold">
              Encargos Sociais
            </span>
            <span className="text-[10px] font-bold text-[#FF6B1F]">
              {summary.socialChargesRate.toFixed(1)}%
            </span>
          </div>
          <span className="text-sm sm:text-base font-bold text-white block mt-0.5">
            {formatCurrencyBRL(summary.socialChargesAmount)}
          </span>
          <span className="text-[10px] text-white/40">
            Sobre MO ({formatCurrencyBRL(summary.laborDirectCost)})
          </span>
        </div>

        {/* Custo Direto Total */}
        <div className="p-3 rounded-xl bg-[#294C87]/30 border border-[#294C87]/60">
          <span className="text-[10px] text-white/80 uppercase font-semibold block">
            Custo Direto Total
          </span>
          <span className="text-sm sm:text-base font-bold text-white block mt-0.5">
            {formatCurrencyBRL(summary.totalDirectCost)}
          </span>
          <span className="text-[10px] text-white/50">Materiais + MO c/ Leis</span>
        </div>

        {/* BDI TCU */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/60 uppercase font-semibold">
              BDI (TCU 2.622)
            </span>
            <span className="text-[10px] font-bold text-[#FF6B1F]">
              {summary.bdiRate.toFixed(2)}%
            </span>
          </div>
          <span className="text-sm sm:text-base font-bold text-white block mt-0.5">
            {formatCurrencyBRL(summary.bdiAmount)}
          </span>
          <span className="text-[10px] text-white/40">Adm + Lucro + Riscos</span>
        </div>

        {/* Tributos */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/60 uppercase font-semibold">Tributos (T)</span>
            <span className="text-[10px] font-bold text-white/80">
              {summary.totalTaxesRate.toFixed(2)}%
            </span>
          </div>
          <span className="text-sm sm:text-base font-bold text-white block mt-0.5">
            {formatCurrencyBRL(summary.totalTaxesAmount)}
          </span>
          <span className="text-[10px] text-white/40">ISS, PIS, COFINS</span>
        </div>

        {/* VALOR FINAL DE VENDA DA OBRA (PUMPKIN ORANGE) */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-[#FF6B1F]/20 to-[#FF6B1F]/10 border-2 border-[#FF6B1F] flex flex-col justify-center">
          <span className="text-[10px] text-[#FF6B1F] uppercase font-extrabold block">
            VALOR TOTAL DA OBRA
          </span>
          <span className="text-base sm:text-lg lg:text-xl font-extrabold text-[#FF6B1F] tracking-tight block">
            {formatCurrencyBRL(summary.finalSalePrice)}
          </span>
          <span className="text-[10px] text-white/60">Preço de Venda Final</span>
        </div>
      </div>

      {/* Relação Analítica de Subtotais por Etapa com % de Peso */}
      <div className="pt-2 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs text-white/70">
          <span className="font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#FF6B1F]" />
            Distribuição Físico-Financeira por Etapa da Obra:
          </span>
          <span className="font-mono text-[11px] text-white/50">
            {summary.stagesSubtotals.length} etapas cadastradas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {summary.stagesSubtotals.map((st) => (
            <div
              key={st.stageId}
              className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-xs"
            >
              <div className="truncate flex-1">
                <span className="font-mono font-bold text-[#FF6B1F] mr-1">{st.code}</span>
                <span className="text-white/80 truncate font-medium">{st.name}</span>
              </div>
              <div className="text-right whitespace-nowrap">
                <span className="font-bold text-white block">{formatCurrencyBRL(st.withBdi)}</span>
                <span className="text-[10px] text-[#FF6B1F] font-semibold">
                  {st.percentageOfTotal}% do total
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
