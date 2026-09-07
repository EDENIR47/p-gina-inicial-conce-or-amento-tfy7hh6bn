/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Tipos e Estruturas de Dados do Sistema de Orçamento de Obra
 */

export type BudgetStatus = 'em_andamento' | 'aprovado' | 'vencido' | 'em_analise'

export interface Budget {
  id: string
  code: string
  workName: string
  client: string
  status: BudgetStatus
  budgetedValue: number
  actualValue: number
  directCost: number
  bdi: number
  saleValue: number
  marginPercent: number
  createdAt: string
  month: string // ex.: "Dez", "Jan", "Fev"
}

export interface AbcItem {
  rank: number
  name: string
  category: string
  value: number
  accumulatedPercent: number
  isClassA: boolean
}

export interface WorkProfitability {
  id: string
  workName: string
  client: string
  saleValue: number
  directCost: number
  bdi: number
  marginPercent: number
  statusText: string
}

export interface BudgetComparisonItem {
  workName: string
  budgetedThousands: number // em milhares de R$
  actualThousands: number // em milhares de R$
  budgetedFull: number
  actualFull: number
}

export interface MonthlyEvolutionItem {
  month: string
  monthFull: string
  count: number
  totalValue: number
}

export interface StatusDistributionItem {
  status: BudgetStatus
  label: string
  count: number
  color: string
}

export interface ConceAuthSession {
  user: string
  name: string
  role: string
  crea?: string
  loggedIn: boolean
  loginTime: string
}

export interface ConceDemoData {
  budgets: Budget[]
  abcItems: AbcItem[]
  profitability: WorkProfitability[]
  comparison: BudgetComparisonItem[]
  evolution: MonthlyEvolutionItem[]
  distribution: StatusDistributionItem[]
  summary: {
    totalBudgets: number
    totalBudgetedValue: number
    inProgressCount: number
    approvedCount: number
    expiredCount: number
    inReviewCount: number
  }
}
