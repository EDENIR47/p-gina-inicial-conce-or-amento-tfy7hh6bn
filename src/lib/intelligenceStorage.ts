/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Persistência e Lógica de Negócio para Módulos de Inteligência:
 * - Comparativo de Cotações (mínimo 3 fornecedores, equalização e vencedor)
 * - Trilha de Auditoria (registro de ações com data/hora e autor)
 * - Versionamento de Orçamentos (Rev 0, 1, 2... com restauração)
 */

import { FullBudget } from '@/types/budgetEngine'
import {
  InputQuoteComparison,
  SupplierQuote,
  AuditLogEntry,
  BudgetRevision,
  AuditActionType,
} from '@/types/intelligence'
import { calculateFullBudget } from './budgetEngine'
import { computeAbcCurve } from './abcAnalysis'

export const STORAGE_KEYS_INTELLIGENCE = {
  QUOTES: 'conce_input_quotes',
  AUDIT_LOGS: 'conce_audit_logs',
  REVISIONS: 'conce_budget_revisions',
} as const

// -------------------------------------------------------------
// AUDITORIA AUTOMÁTICA
// -------------------------------------------------------------

export function getStoredAuditLogs(budgetId?: string): AuditLogEntry[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEYS_INTELLIGENCE.AUDIT_LOGS)
  if (!raw) return []
  try {
    const list: AuditLogEntry[] = JSON.parse(raw)
    if (budgetId) {
      return list.filter((l) => l.budgetId === budgetId)
    }
    return list
  } catch {
    return []
  }
}

export function logAuditEvent(entry: {
  budgetId: string
  action: AuditActionType
  title: string
  details: string
  userName?: string
  oldValue?: string | number
  newValue?: string | number
  metadata?: Record<string, any>
}): void {
  if (typeof window === 'undefined') return

  const logs = getStoredAuditLogs()
  const newLog: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    budgetId: entry.budgetId,
    timestamp: new Date().toISOString(),
    userName: entry.userName || 'Eng. Denir Souza - CREA/SP',
    userRole: 'Engenheiro de Custos',
    action: entry.action,
    title: entry.title,
    details: entry.details,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    metadata: entry.metadata,
  }

  const updated = [newLog, ...logs].slice(0, 500) // Guarda os últimos 500 eventos
  localStorage.setItem(STORAGE_KEYS_INTELLIGENCE.AUDIT_LOGS, JSON.stringify(updated))
}

// -------------------------------------------------------------
// HISTÓRICO DE VERSÕES / REVISÕES DO ORÇAMENTO
// -------------------------------------------------------------

export function getStoredRevisions(budgetId?: string): BudgetRevision[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEYS_INTELLIGENCE.REVISIONS)
  if (!raw) return []
  try {
    const list: BudgetRevision[] = JSON.parse(raw)
    if (budgetId) {
      return list.filter((r) => r.budgetId === budgetId)
    }
    return list
  } catch {
    return []
  }
}

export function saveBudgetRevision(
  budget: FullBudget,
  description: string,
  author?: string,
): BudgetRevision {
  const revisions = getStoredRevisions(budget.id)
  const nextRevNumber = revisions.length
  const summary = calculateFullBudget(budget)

  const revision: BudgetRevision = {
    id: `rev-${budget.id}-${nextRevNumber}-${Date.now()}`,
    budgetId: budget.id,
    revisionNumber: nextRevNumber,
    revisionCode: `Rev. ${nextRevNumber}`,
    date: new Date().toISOString(),
    author: author || budget.author || 'Eng. Denir Souza - CREA/SP',
    description: description.trim() || `Revisão técnica ${nextRevNumber} do orçamento`,
    totalSalePrice: summary.finalSalePrice,
    totalDirectCost: summary.totalDirectCost,
    bdiRate: summary.bdiRate,
    snapshot: JSON.parse(JSON.stringify(budget)),
  }

  const allRevs = getStoredRevisions()
  const updated = [revision, ...allRevs]
  localStorage.setItem(STORAGE_KEYS_INTELLIGENCE.REVISIONS, JSON.stringify(updated))

  // Registra auditoria da geração da revisão
  logAuditEvent({
    budgetId: budget.id,
    action: 'revisao_gerada',
    title: `Geração de ${revision.revisionCode}`,
    details: `Descrição: ${revision.description}. Valor total: R$ ${summary.finalSalePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    userName: revision.author,
  })

  return revision
}

export function ensureInitialRevision(budget: FullBudget): void {
  const existing = getStoredRevisions(budget.id)
  if (existing.length === 0) {
    saveBudgetRevision(
      budget,
      'Versão Inicial de Concepção Técnica (Rev. 0) — Emissão base para aprovação e cotações',
      budget.author,
    )
  }
}

// -------------------------------------------------------------
// COMPARATIVO DE COTAÇÕES
// -------------------------------------------------------------

export function getStoredQuotes(budgetId?: string): InputQuoteComparison[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEYS_INTELLIGENCE.QUOTES)
  if (!raw) return []
  try {
    const list: InputQuoteComparison[] = JSON.parse(raw)
    if (budgetId) {
      return list.filter((q) => q.budgetId === budgetId)
    }
    return list
  } catch {
    return []
  }
}

export function saveAllQuotes(quotes: InputQuoteComparison[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS_INTELLIGENCE.QUOTES, JSON.stringify(quotes))
}

export function saveInputQuoteComparison(comparison: InputQuoteComparison): void {
  const current = getStoredQuotes()
  const idx = current.findIndex((q) => q.id === comparison.id)
  comparison.lastUpdated = new Date().toISOString()

  let updated: InputQuoteComparison[]
  if (idx >= 0) {
    updated = [...current]
    updated[idx] = comparison
  } else {
    updated = [comparison, ...current]
  }

  saveAllQuotes(updated)
}

/**
 * Semente inteligente inicial: caso o orçamento ainda não tenha cotações cadastradas,
 * analisa os itens de Classe A da Curva ABC e pré-popula mapas de cotação com 3 fornecedores
 * reais/típicos de engenharia civil paulista/brasileira, demonstrando o comparativo de mercado.
 */
export function seedQuotesForBudgetIfEmpty(budget: FullBudget): InputQuoteComparison[] {
  const existing = getStoredQuotes(budget.id)
  if (existing.length > 0) return existing

  const abc = computeAbcCurve(budget)
  const topItems = abc.classA.items.slice(0, 4) // Pega os 4 maiores insumos de Classe A

  const seededComparisons: InputQuoteComparison[] = topItems.map((item, index) => {
    const baseCost = item.unitCost
    const now = new Date()
    const d1 = new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0]
    const d2 = new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0]
    const d3 = new Date(now.getTime() - 1 * 86400000).toISOString().split('T')[0]

    let quotes: SupplierQuote[] = []

    if (item.category === 'material') {
      if (item.code.includes('94964') || item.description.toLowerCase().includes('concreto')) {
        quotes = [
          {
            id: `sq-${Date.now()}-1`,
            supplierName: 'Polimix Concreto Ltda',
            supplierCnpjOrDoc: '02.483.910/0001-84',
            supplierContact: 'Carlos Mendonça',
            supplierPhone: '(11) 3782-9000',
            quoteDate: d1,
            unitPrice: Number((baseCost * 0.96).toFixed(2)),
            deliveryDays: 3,
            paymentTerms: '28 ddl boleto',
            freightIncluded: true,
            validityDays: 15,
            notes: 'Inclui bomba lança para concretagem contínua',
          },
          {
            id: `sq-${Date.now()}-2`,
            supplierName: 'Supermix Concreto S/A',
            supplierCnpjOrDoc: '17.382.100/0001-92',
            supplierContact: 'Fernanda Lima',
            supplierPhone: '(11) 3991-4450',
            quoteDate: d2,
            unitPrice: Number((baseCost * 0.98).toFixed(2)),
            deliveryDays: 2,
            paymentTerms: '30/60 dias',
            freightIncluded: true,
            validityDays: 10,
            notes: 'Slump 12+/-2 com aditivo retardador',
          },
          {
            id: `sq-${Date.now()}-3`,
            supplierName: 'Engemix (Votorantim Cimentos)',
            supplierCnpjOrDoc: '63.025.530/0001-04',
            supplierContact: 'Roberto Silva',
            supplierPhone: '(11) 3240-8000',
            quoteDate: d3,
            unitPrice: Number((baseCost * 1.03).toFixed(2)),
            deliveryDays: 4,
            paymentTerms: '14 ddl',
            freightIncluded: true,
            validityDays: 20,
            notes: 'Certificação de resistência e laudos tecnológicos',
          },
        ]
      } else if (
        item.code.includes('92778') ||
        item.description.toLowerCase().includes('aço') ||
        item.description.toLowerCase().includes('armacao')
      ) {
        quotes = [
          {
            id: `sq-${Date.now()}-1`,
            supplierName: 'Gerdau Comercial de Aços S/A',
            supplierCnpjOrDoc: '33.611.500/0001-19',
            supplierContact: 'Valter Prado',
            supplierPhone: '(11) 3094-6600',
            quoteDate: d1,
            unitPrice: Number((baseCost * 0.95).toFixed(2)),
            deliveryDays: 5,
            paymentTerms: '30/60/90 ddl faturado',
            freightIncluded: true,
            validityDays: 15,
            notes: 'Aço CA-50 cortado e dobrado conforme romaneio de projeto',
          },
          {
            id: `sq-${Date.now()}-2`,
            supplierName: 'ArcelorMittal Distribuição Brasil',
            supplierCnpjOrDoc: '17.469.701/0001-77',
            supplierContact: 'Juliana Castro',
            supplierPhone: '(11) 3848-1200',
            quoteDate: d2,
            unitPrice: Number((baseCost * 0.97).toFixed(2)),
            deliveryDays: 4,
            paymentTerms: '28 ddl',
            freightIncluded: true,
            validityDays: 12,
            notes: 'Etiquetado por elemento estrutural (vigas/pilares)',
          },
          {
            id: `sq-${Date.now()}-3`,
            supplierName: 'Açotubo Indústria e Comércio',
            supplierCnpjOrDoc: '43.987.123/0001-50',
            supplierContact: 'Marcos Vinicius',
            supplierPhone: '(11) 2461-8800',
            quoteDate: d3,
            unitPrice: Number((baseCost * 1.01).toFixed(2)),
            deliveryDays: 3,
            paymentTerms: '30 ddl',
            freightIncluded: false,
            freightCost: 450,
            validityDays: 10,
            notes: 'Frete FOB Guarulhos',
          },
        ]
      } else {
        quotes = [
          {
            id: `sq-${Date.now()}-1`,
            supplierName: 'Distribuidora Central de Materiais Ltda',
            supplierCnpjOrDoc: '11.222.333/0001-44',
            supplierContact: 'Ana Paula',
            supplierPhone: '(11) 3311-2200',
            quoteDate: d1,
            unitPrice: Number((baseCost * 0.94).toFixed(2)),
            deliveryDays: 3,
            paymentTerms: '30 ddl',
            freightIncluded: true,
            validityDays: 15,
          },
          {
            id: `sq-${Date.now()}-2`,
            supplierName: 'ConstruShop Atacadista da Construção',
            supplierCnpjOrDoc: '22.333.444/0001-55',
            supplierContact: 'Lucas Martins',
            supplierPhone: '(11) 3450-7788',
            quoteDate: d2,
            unitPrice: Number((baseCost * 0.99).toFixed(2)),
            deliveryDays: 2,
            paymentTerms: '14/28 ddl',
            freightIncluded: true,
            validityDays: 10,
          },
          {
            id: `sq-${Date.now()}-3`,
            supplierName: 'MegaObra Suprimentos e Logística',
            supplierCnpjOrDoc: '33.444.555/0001-66',
            supplierContact: 'Danilo Ramos',
            supplierPhone: '(11) 3880-9900',
            quoteDate: d3,
            unitPrice: Number((baseCost * 1.04).toFixed(2)),
            deliveryDays: 1,
            paymentTerms: 'À vista com 3% desc.',
            freightIncluded: true,
            validityDays: 7,
          },
        ]
      }
    } else {
      // Mão de Obra ou Terceiros
      quotes = [
        {
          id: `sq-${Date.now()}-1`,
          supplierName: 'Empreiteira Alpha Estruturas & Serviços ME',
          supplierCnpjOrDoc: '14.555.666/0001-77',
          supplierContact: 'Mestre Valdemar',
          supplierPhone: '(11) 98765-4321',
          quoteDate: d1,
          unitPrice: Number((baseCost * 0.95).toFixed(2)),
          deliveryDays: 5,
          paymentTerms: 'Quinzenal por medição física',
          freightIncluded: true,
          validityDays: 30,
          notes: 'Equipe com 6 oficiais e 4 serventes com EPIs e NR-18/NR-35',
        },
        {
          id: `sq-${Date.now()}-2`,
          supplierName: 'Construtora & Terceirização Delta Ltda',
          supplierCnpjOrDoc: '25.666.777/0001-88',
          supplierContact: 'Eng. Maurício Ramos',
          supplierPhone: '(11) 97654-3210',
          quoteDate: d2,
          unitPrice: Number((baseCost * 0.98).toFixed(2)),
          deliveryDays: 3,
          paymentTerms: 'Mensal com retenção de 5%',
          freightIncluded: true,
          validityDays: 30,
          notes: 'Atestado de capacidade técnica em edifícios verticais',
        },
        {
          id: `sq-${Date.now()}-3`,
          supplierName: 'Engenharia e Mão de Obra Especializada Prime',
          supplierCnpjOrDoc: '36.777.888/0001-99',
          supplierContact: 'Thiago Alencar',
          supplierPhone: '(11) 96543-2109',
          quoteDate: d3,
          unitPrice: Number((baseCost * 1.02).toFixed(2)),
          deliveryDays: 2,
          paymentTerms: 'Conforme cronograma físico-financeiro',
          freightIncluded: true,
          validityDays: 20,
          notes: 'Certificação ISO 9001 e PBQP-H nível A',
        },
      ]
    }

    const winningQuote = quotes[0] // Menor preço como sugestão vencedora

    return {
      id: `quote-${budget.id}-${item.code}-${index}`,
      budgetId: budget.id,
      inputCode: item.code,
      inputDescription: item.description,
      unit: item.unit,
      category: item.category,
      budgetedUnitCost: baseCost,
      requiredQuantity: item.totalQuantity,
      quotes,
      winningQuoteId: winningQuote.id,
      winningReason:
        'Menor preço equalizado com atendimento aos requisitos de entrega e prazo da obra',
      status: 'homologada',
      lastUpdated: new Date().toISOString(),
    }
  })

  const allQuotes = getStoredQuotes()
  const updated = [...seededComparisons, ...allQuotes]
  saveAllQuotes(updated)

  return seededComparisons
}

/**
 * Cria cotações vazias ou parciais para um insumo selecionado pelo usuário
 */
import { InputCategory } from '@/types/budgetEngine'

export function createNewQuoteComparison(
  budgetId: string,
  inputCode: string,
  inputDescription: string,
  unit: string,
  category: InputCategory,
  budgetedUnitCost: number,
  requiredQuantity: number,
): InputQuoteComparison {
  const comparison: InputQuoteComparison = {
    id: `quote-${budgetId}-${inputCode}-${Date.now()}`,
    budgetId,
    inputCode,
    inputDescription,
    unit,
    category,
    budgetedUnitCost,
    requiredQuantity,
    quotes: [],
    status: 'aberta',
    lastUpdated: new Date().toISOString(),
  }

  saveInputQuoteComparison(comparison)
  return comparison
}
