/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Tipagens para Módulos de Inteligência: Curva ABC (Pareto), Cotações, Auditoria e Exportação
 */

import { BudgetInput, InputCategory, FullBudget } from './budgetEngine'

// 1. Curva ABC (Pareto)
export type AbcClass = 'A' | 'B' | 'C'

export interface AbcCalculatedItem {
  id: string
  code: string
  description: string
  category: InputCategory
  unit: string
  totalQuantity: number
  unitCost: number
  totalCost: number
  percentageOfTotal: number
  accumulatedPercentage: number
  classification: AbcClass
  rank: number
  servicesCount: number
  serviceOccurrences: Array<{
    stageCode: string
    stageName: string
    serviceCode: string
    serviceDescription: string
    quantity: number
  }>
}

export interface AbcCurveAnalysis {
  budgetId: string
  budgetCode: string
  budgetName: string
  totalDirectCost: number
  totalItemsCount: number
  classA: {
    itemsCount: number
    percentageOfItems: number
    totalCost: number
    percentageOfCost: number
    items: AbcCalculatedItem[]
  }
  classB: {
    itemsCount: number
    percentageOfItems: number
    totalCost: number
    percentageOfCost: number
    items: AbcCalculatedItem[]
  }
  classC: {
    itemsCount: number
    percentageOfItems: number
    totalCost: number
    percentageOfCost: number
    items: AbcCalculatedItem[]
  }
  allItems: AbcCalculatedItem[]
}

// 2. Comparativo de Cotações de Insumos
export interface SupplierQuote {
  id: string
  supplierName: string
  supplierCnpjOrDoc?: string
  supplierContact?: string
  supplierPhone?: string
  quoteDate: string // YYYY-MM-DD
  unitPrice: number
  deliveryDays: number
  paymentTerms?: string
  freightIncluded: boolean
  freightCost?: number
  validityDays?: number
  notes?: string
  attachmentName?: string
  attachmentUrl?: string
}

export interface InputQuoteComparison {
  id: string
  budgetId: string
  inputCode: string
  inputDescription: string
  unit: string
  category: InputCategory
  budgetedUnitCost: number // Preço orçado inicialmente na composição
  requiredQuantity: number
  quotes: SupplierQuote[]
  winningQuoteId?: string
  winningReason?: string // ex: "Menor preço equalizado", "Melhor prazo de entrega", "Fornecedor homologado"
  status: 'aberta' | 'equalizada' | 'homologada' | 'cancelada'
  lastUpdated: string
}

// 3. Histórico e Trilha de Auditoria
export type AuditActionType =
  | 'criacao_orcamento'
  | 'adicao_item'
  | 'edicao_geral'
  | 'edicao_etapa'
  | 'edicao_servico'
  | 'edicao_composicao'
  | 'edicao_insumo'
  | 'edicao_custo'
  | 'edicao_bdi'
  | 'edicao_encargos'
  | 'edicao_regime_tributario'
  | 'troca_composicao'
  | 'exclusao_item'
  | 'cotacao_homologada'
  | 'revisao_gerada'
  | 'revisao_restaurada'
  | 'exportacao_pdf'
  | 'exportacao_excel'

export interface AuditLogEntry {
  id: string
  budgetId: string
  timestamp: string // ISO string
  userName: string
  userRole?: string
  action: AuditActionType
  title: string
  details: string
  oldValue?: string | number
  newValue?: string | number
  metadata?: Record<string, any>
}

export interface BudgetRevision {
  id: string
  budgetId: string
  revisionNumber: number // 0, 1, 2, ...
  revisionCode: string // "Rev. 0", "Rev. 1"
  date: string
  author: string
  description: string
  totalSalePrice: number
  totalDirectCost: number
  bdiRate: number
  snapshot: FullBudget // Cópia exata e restaurável
}
