import React, { useState, useEffect } from 'react'
import {
  Calendar,
  HardHat,
  FileSpreadsheet,
  Plus,
  Layers,
  BarChart3,
  CheckCircle2,
} from 'lucide-react'
import {
  clearDemoData,
  computeDashboardFromRealBudgets,
  getAuthSession,
  resetOnboarding,
} from '@/lib/mockData'
import {
  getStoredFullBudgets,
  saveFullBudgets,
  saveSingleBudget,
  deleteSingleBudget,
  purgeTestBudgetsFromStorage,
} from '@/lib/budgetsStorage'
import { purgeTestIntelligenceData } from '@/lib/intelligenceStorage'
import { ConceDemoData } from '@/types/conce'
import { FullBudget } from '@/types/budgetEngine'
import { formatCurrentDatePTBR } from '@/lib/formatters'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { ProfitabilityPanel } from '@/components/dashboard/ProfitabilityPanel'
import { AbcCurvePanel } from '@/components/dashboard/AbcCurvePanel'
import { BudgetComparisonPanel } from '@/components/dashboard/BudgetComparisonPanel'
import { MonthlyEvolutionPanel } from '@/components/dashboard/MonthlyEvolutionPanel'
import { StatusDistributionPanel } from '@/components/dashboard/StatusDistributionPanel'
import { BudgetsTable } from '@/components/dashboard/BudgetsTable'
import { ManageBudgetsPanel } from '@/components/dashboard/ManageBudgetsPanel'
import {
  QuickEditBudgetModal,
  DeleteBudgetConfirmModal,
} from '@/components/budget/ManageBudgetModals'
import { useNavigate, Link } from 'react-router-dom'

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState<ConceDemoData | null>(null)
  const [fullBudgets, setFullBudgets] = useState<FullBudget[]>([])
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'gerenciar'>('visao_geral')

  // Modais de Edição e Exclusão
  const [editingBudget, setEditingBudget] = useState<FullBudget | null>(null)
  const [deletingBudget, setDeletingBudget] = useState<FullBudget | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const session = getAuthSession()
  const currentDate = formatCurrentDatePTBR()

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Recarrega todos os dados e recalcula instantaneamente os indicadores a partir dos orçamentos restantes
  const reloadBudgets = () => {
    const realBudgets = getStoredFullBudgets()
    setFullBudgets(realBudgets)
    const data = computeDashboardFromRealBudgets(realBudgets)
    setDashboardData(data)
  }

  // Listener para evento customizado de orçamento atualizado ou limpo
  useEffect(() => {
    const handleUpdated = () => {
      reloadBudgets()
    }
    window.addEventListener('conce_budget_updated', handleUpdated)
    return () => window.removeEventListener('conce_budget_updated', handleUpdated)
  }, [])

  useEffect(() => {
    // 1. Limpa resíduos de dados de teste/demonstração fictícios em localStorage
    clearDemoData()
    purgeTestBudgetsFromStorage()
    purgeTestIntelligenceData()

    // 2. Calcula os indicadores do Dashboard exclusivamente a partir dos orçamentos reais
    reloadBudgets()
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

  // Ações de gerenciamento: salvar edição
  const handleSaveBudgetEdit = (updated: FullBudget) => {
    saveSingleBudget(updated)
    reloadBudgets()
    setEditingBudget(null)
    showToast(`Orçamento ${updated.code} atualizado com sucesso!`)
  }

  // Ações de gerenciamento: confirmar exclusão
  const handleConfirmDelete = () => {
    if (!deletingBudget) return
    const code = deletingBudget.code
    deleteSingleBudget(deletingBudget.id)
    reloadBudgets()
    setDeletingBudget(null)
    showToast(`Orçamento ${code} excluído com sucesso!`)
  }

  // Abrir editor completo em /orcamentos
  const handleOpenFullEditor = (b: FullBudget) => {
    navigate('/orcamentos', { state: { openBudgetId: b.id } })
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

      {/* Toast flutuante */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-fade-in-down flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171A1F] text-white shadow-xl border border-white/20 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-[#FF6B1F]" />
          <span>{toastMessage}</span>
        </div>
      )}

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

      {/* SELETOR DE ABAS PRINCIPAIS: VISÃO GERAL VS. GERENCIAR */}
      <div className="flex items-center justify-between border-b border-[#171A1F]/15 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('visao_geral')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'visao_geral'
                ? 'bg-[#294C87] text-white shadow-md'
                : 'text-[#171A1F]/70 hover:bg-[#171A1F]/5 hover:text-[#171A1F]'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#FF6B1F]" />
            <span>Visão Geral & Indicadores</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gerenciar')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'gerenciar'
                ? 'bg-[#FF6B1F] text-white shadow-md'
                : 'text-[#171A1F]/70 hover:bg-[#171A1F]/5 hover:text-[#171A1F]'
            }`}
          >
            <Layers className="w-4 h-4 text-white" />
            <span>Gerenciar Orçamentos</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'gerenciar' ? 'bg-white text-[#FF6B1F]' : 'bg-[#294C87] text-white'
              }`}
            >
              {fullBudgets.length}
            </span>
          </button>
        </div>

        <Link
          to="/orcamentos"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#294C87] hover:underline"
        >
          <span>Ir para Módulo Completo /orcamentos →</span>
        </Link>
      </div>

      {/* ABA 1: VISÃO GERAL (GRÁFICOS E TABELA) */}
      {activeTab === 'visao_geral' && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
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

          {/* 5. Tabela Relação de Orçamentos com Botões de Editar e Excluir integrados */}
          <section aria-label="Lista de Orçamentos">
            <BudgetsTable
              budgets={dashboardData.budgets}
              onEdit={(id) => {
                const found = fullBudgets.find((b) => b.id === id)
                if (found) setEditingBudget(found)
              }}
              onDelete={(id) => {
                const found = fullBudgets.find((b) => b.id === id)
                if (found) setDeletingBudget(found)
              }}
            />
          </section>
        </div>
      )}

      {/* ABA 2: GERENCIAR (LISTA DETALHADA COM EDIÇÃO E EXCLUSÃO) */}
      {activeTab === 'gerenciar' && (
        <section aria-label="Gerenciamento Direto de Orçamentos">
          <ManageBudgetsPanel
            budgets={fullBudgets}
            onEdit={(budget) => setEditingBudget(budget)}
            onDelete={(budget) => setDeletingBudget(budget)}
            onOpenFullEditor={handleOpenFullEditor}
          />
        </section>
      )}

      {/* MODAL DE EDIÇÃO RÁPIDA */}
      {editingBudget && (
        <QuickEditBudgetModal
          budget={editingBudget}
          isOpen={!!editingBudget}
          onClose={() => setEditingBudget(null)}
          onSave={handleSaveBudgetEdit}
          onOpenFullEditor={handleOpenFullEditor}
        />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingBudget && (
        <DeleteBudgetConfirmModal
          budget={deletingBudget}
          isOpen={!!deletingBudget}
          onClose={() => setDeletingBudget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}
export default DashboardScreen
