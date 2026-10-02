import React, { useState, useEffect } from 'react'
import { Calendar, HardHat, FileSpreadsheet, Plus, Sparkles } from 'lucide-react'
import {
  clearDemoData,
  computeDashboardFromRealBudgets,
  getAuthSession,
  resetOnboarding,
} from '@/lib/mockData'
import { getStoredFullBudgets, purgeTestBudgetsFromStorage } from '@/lib/budgetsStorage'
import { purgeTestIntelligenceData } from '@/lib/intelligenceStorage'
import { ConceDemoData } from '@/types/conce'
import { formatCurrentDatePTBR } from '@/lib/formatters'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { ProfitabilityPanel } from '@/components/dashboard/ProfitabilityPanel'
import { AbcCurvePanel } from '@/components/dashboard/AbcCurvePanel'
import { BudgetComparisonPanel } from '@/components/dashboard/BudgetComparisonPanel'
import { MonthlyEvolutionPanel } from '@/components/dashboard/MonthlyEvolutionPanel'
import { StatusDistributionPanel } from '@/components/dashboard/StatusDistributionPanel'
import { BudgetsTable } from '@/components/dashboard/BudgetsTable'
import { useNavigate, Link } from 'react-router-dom'

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState<ConceDemoData | null>(null)
  const session = getAuthSession()
  const currentDate = formatCurrentDatePTBR()

  useEffect(() => {
    // 1. Limpa resíduos de dados de teste/demonstração fictícios em localStorage
    clearDemoData()
    purgeTestBudgetsFromStorage()
    purgeTestIntelligenceData()

    // 2. Calcula os indicadores do Dashboard exclusivamente a partir dos orçamentos reais
    const realBudgets = getStoredFullBudgets()
    const data = computeDashboardFromRealBudgets(realBudgets)
    setDashboardData(data)
  }, [])

  if (!dashboardData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#294C87] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-[#171A1F]/70">
            Carregando indicadores consolidados da CONCE...
          </span>
        </div>
      </div>
    )
  }

  const handleReviewOnboarding = () => {
    resetOnboarding()
    navigate('/onboarding')
  }

  const hasBudgets = dashboardData.budgets.length > 0

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Bloco de Título da Página com Pill de Data */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2 border-b border-[#171A1F]/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF6B1F]/10 text-[#FF6B1F] text-xs font-bold uppercase tracking-wider">
              Painel Executivo
            </span>
            <span className="text-xs text-[#171A1F]/50 hidden sm:inline">
              • Engenharia de Custos & Controle de Obras
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#171A1F] tracking-tight">
            Dashboard Gerencial
          </h1>

          <p className="text-sm sm:text-base text-[#171A1F]/70 mt-1">
            Visão consolidada dos orçamentos da CONCE.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pill Cobalt com data atual em pt-BR */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#294C87] text-white text-xs sm:text-sm font-semibold shadow-sm">
            <Calendar className="w-4 h-4 text-[#FF6B1F]" />
            <span>{currentDate}</span>
          </div>

          {/* Atalho para rever Onboarding */}
          <button
            onClick={handleReviewOnboarding}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#171A1F]/5 hover:bg-[#171A1F]/10 text-[#171A1F] text-xs font-semibold transition-colors cursor-pointer border border-[#171A1F]/10"
            title="Rever apresentação institucional da CONCE"
          >
            <HardHat className="w-3.5 h-3.5 text-[#FF6B1F]" />
            <span className="hidden sm:inline">Apresentação Institucional</span>
            <span className="sm:hidden">Institucional</span>
          </button>
        </div>
      </div>

      {/* 1. KPIs no Topo (Grade de 5 Cards) */}
      <section aria-label="Indicadores Principais">
        <SummaryCards summary={dashboardData.summary} />
      </section>

      {/* Se não houver orçamentos, exibe aviso gracioso de estado vazio */}
      {!hasBudgets && (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border-2 border-dashed border-[#171A1F]/20 space-y-4">
          <FileSpreadsheet className="w-12 h-12 text-[#294C87]/40 mx-auto" />
          <h3 className="text-lg font-bold text-[#171A1F]">Nenhum orçamento em andamento</h3>
          <p className="text-xs sm:text-sm text-[#171A1F]/60 max-w-md mx-auto">
            Todos os dados de teste foram limpos. Crie um novo orçamento técnico para visualizar os
            gráficos de lucratividade, curva ABC e evolução orçamentária em tempo real.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/orcamentos"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#294C87] hover:bg-[#171A1F] text-white text-xs sm:text-sm font-bold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4 text-[#FF6B1F]" />
              <span>Criar Novo Orçamento</span>
            </Link>
          </div>
        </div>
      )}

      {/* 2. Duas Colunas: Lucratividade Estimada (Esq) + Mini Curva ABC (Dir) */}
      <section
        aria-label="Lucratividade e Curva ABC"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <ProfitabilityPanel items={dashboardData.profitability} />
        <AbcCurvePanel items={dashboardData.abcItems} />
      </section>

      {/* 3. Comparativo Orçado x Realizado (Full-Width) */}
      <section aria-label="Comparativo Orçado versus Realizado">
        <BudgetComparisonPanel items={dashboardData.comparison} />
      </section>

      {/* 4. Duas Colunas: Evolução de Orçamentos (Esq) + Distribuição por Status (Dir) */}
      <section
        aria-label="Evolução Temporal e Distribuição de Status"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <MonthlyEvolutionPanel items={dashboardData.evolution} />
        <StatusDistributionPanel
          items={dashboardData.distribution}
          total={dashboardData.summary.totalBudgets}
        />
      </section>

      {/* 5. Tabela Relação de Orçamentos com Filtros e Paginação */}
      <section aria-label="Lista de Orçamentos">
        <BudgetsTable budgets={dashboardData.budgets} />
      </section>
    </div>
  )
}
export default DashboardScreen
