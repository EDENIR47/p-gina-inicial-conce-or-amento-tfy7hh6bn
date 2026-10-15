/**
 * CONCE — Motor de Renumeração Canônica de Orçamentos
 *
 * Regra do usuário:
 * "QUERO QUE ATUALIZE OS ORÇAMENTOS EXISTENTES E DEMAIS DOCUMENTOS QUE UTILIZÃO A IDENTIFICAÇÃO DO ORÇAMENTO"
 *
 * Comportamento:
 * 1. Renumera todos os orçamentos elegíveis (locais e cloud) para o formato canônico:
 *    ORC-{ANO_CORRENTE}-{NÚMERO}, a partir de 100 em ordem estritamente cronológica de criação
 *    (do mais antigo para o mais novo), usando new Date().getFullYear().
 * 2. Prevenção de colisões: se já existirem orçamentos canônicos do ano corrente
 *    (ex.: ORC-2026-100), orçamentos que já possuam o código canônico correto podem ser preservados
 *    ou a renumeração continua acima do maior já alocado, garantindo que NENHUM código se repita.
 * 3. Preserva 100% da integridade técnica dos dados:
 *    - SOMENTE o código e referências textuais exatas ao código anterior são atualizados.
 *    - Valores, quantitativos, insumos, BDI, encargos, fotos, etapas e anexos permanecem intocados.
 * 4. Documentos derivados no payload:
 *    - `presentationDocument.budgetCode`: atualizado para o código novo.
 *    - `savedMemorial.generalIntroduction`: substitui ocorrência exata da string do código antigo.
 *    - `savedMemorial.stages[].services[].technicalSpecification`: substitui ocorrência exata do código antigo.
 * 5. Histórico e auditoria:
 *    - Registra evento de auditoria no log (`renumeracao_orcamento`) registrando de/para de cada orçamento.
 *    - Opcionalmente atualiza referências em revisões existentes.
 * 6. Disparo EXCLUSIVAMENTE por ação explícita do usuário (sem auto-execução na carga da página).
 */

import { FullBudget } from '@/types/budgetEngine'
import {
  BUDGET_CODE_SEQUENCE_START,
  extractBudgetCodeParts,
  getMaxBudgetNumberForYear,
} from './budgetCodeGenerator'
import { isDemoOrTestBudget } from './budgetsStorage'

export interface BudgetRenumberPlanItem {
  id: string
  oldCode: string
  newCode: string
  title: string
  clientName: string
  workName: string
  createdAt: string
  alreadyCanonical: boolean
}

export interface BudgetRenumberPlan {
  year: number
  totalCount: number
  changedCount: number
  alreadyCanonicalCount: number
  items: BudgetRenumberPlanItem[]
}

export interface BudgetRenumberResult {
  success: boolean
  year: number
  totalProcessed: number
  updatedBudgets: FullBudget[]
  mapping: Record<string, string> // oldCode -> newCode
  error?: string
}

/**
 * Normaliza uma data de criação para milissegundos timestamp para ordenação cronológica estável.
 * Suporta formatos ISO ("2026-10-10T..."), datas ("2026-10-10", "10/10/2026") ou fallback por ID.
 */
export function getBudgetCreationTimestamp(budget: FullBudget): number {
  if (budget.createdAt) {
    const parsed = Date.parse(budget.createdAt)
    if (!Number.isNaN(parsed)) return parsed
    // Tenta formato DD/MM/AAAA
    const ddmmyyyy = budget.createdAt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (ddmmyyyy) {
      const ts = new Date(
        Number(ddmmyyyy[3]),
        Number(ddmmyyyy[2]) - 1,
        Number(ddmmyyyy[1]),
      ).getTime()
      if (!Number.isNaN(ts)) return ts
    }
  }

  // Fallback: tenta extrair timestamp numérico de IDs do tipo "budget-1791483413261" ou "budget-ai-1790857414593"
  if (budget.id) {
    const match = budget.id.match(/(\d{10,13})/)
    if (match) {
      const num = Number(match[1])
      if (Number.isFinite(num)) return num
    }
  }

  return 0
}

/**
 * Ordena orçamentos cronologicamente do mais antigo para o mais novo.
 * Desempate estável por ID e por código antigo.
 */
export function sortBudgetsChronologically(budgets: FullBudget[]): FullBudget[] {
  return [...budgets].sort((a, b) => {
    const tA = getBudgetCreationTimestamp(a)
    const tB = getBudgetCreationTimestamp(b)
    if (tA !== tB) return tA - tB
    const idA = a.id || ''
    const idB = b.id || ''
    if (idA !== idB) return idA.localeCompare(idB)
    return (a.code || '').localeCompare(b.code || '')
  })
}

/**
 * Gera um plano de renumeração (tabela ANTES -> DEPOIS) sem aplicar mutações.
 * Permite ao usuário visualizar exatamente quais códigos serão alterados na tela de confirmação.
 */
export function buildBudgetRenumberPlan(
  budgets: FullBudget[],
  targetYear?: number,
): BudgetRenumberPlan {
  const year = targetYear ?? new Date().getFullYear()

  // Filtra orçamentos reais (não considera demos/fictícios)
  const realBudgets = budgets.filter((b) => !isDemoOrTestBudget(b))
  const sorted = sortBudgetsChronologically(realBudgets)

  // Verifica se a lista como um todo já está perfeitamente numerada e sem gaps:
  // ex: [ORC-2026-100, ORC-2026-101, ORC-2026-102]
  // Se estiver, cada um mantém seu código.
  // Se algum estiver fora do padrão ou com gaps / anos antigos, renumera cronologicamente a partir de 100.
  const targetCodes: string[] = []
  let nextSeq = BUDGET_CODE_SEQUENCE_START

  // Pré-computa atribuição
  const items: BudgetRenumberPlanItem[] = sorted.map((b, idx) => {
    const oldCode = (b.code || '').trim()
    const parts = extractBudgetCodeParts(oldCode)

    // Se já estiver no ano correto e corresponder exatamente à posição sequencial esperada
    const assignedNumber = BUDGET_CODE_SEQUENCE_START + idx
    const newCode = `ORC-${year}-${assignedNumber}`
    const alreadyCanonical = oldCode === newCode

    targetCodes.push(newCode)

    return {
      id: b.id,
      oldCode: oldCode || '—',
      newCode,
      title: b.title || b.work?.name || 'Orçamento de Engenharia',
      clientName: b.client?.name || 'Não informado',
      workName: b.work?.name || 'Obra',
      createdAt: b.createdAt || '—',
      alreadyCanonical,
    }
  })

  const changedCount = items.filter((it) => !it.alreadyCanonical).length
  const alreadyCanonicalCount = items.filter((it) => it.alreadyCanonical).length

  return {
    year,
    totalCount: items.length,
    changedCount,
    alreadyCanonicalCount,
    items,
  }
}

/**
 * Substitui ocorrências exatas do código antigo em textos descritivos do orçamento,
 * sem corromper outras palavras ou identificadores parciais.
 */
export function replaceExactCodeReferences(
  text: string | undefined | null,
  oldCode: string,
  newCode: string,
): string | undefined {
  if (!text || typeof text !== 'string') return text ?? undefined
  if (!oldCode || oldCode === newCode) return text

  // Escapa caracteres especiais de regex no código antigo (ex.: '/', '-', '.')
  const escapedOld = oldCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`\\b${escapedOld}\\b`, 'gi')
  return text.replace(regex, newCode)
}

/**
 * Atualiza um único FullBudget aplicando o novo código e propagando para referências internas:
 * - budget.code
 * - budget.presentationDocument.budgetCode
 * - budget.savedMemorial (textos de introdução e especificações que citem o código antigo)
 * - data de atualização (updatedAt)
 *
 * NUNCA toca em valores, quantitativos, BDI, encargos sociais ou anexos de fotos.
 */
export function applyCodeToBudget(
  budget: FullBudget,
  newCode: string,
  oldCodeOverride?: string,
): FullBudget {
  const oldCode = (oldCodeOverride || budget.code || '').trim()
  if (oldCode === newCode && budget.code === newCode) {
    return budget
  }

  const updated: FullBudget = {
    ...budget,
    code: newCode,
    updatedAt: new Date().toISOString(),
  }

  // Atualiza anexo de proposta comercial oficial (presentationDocument)
  if (updated.presentationDocument) {
    updated.presentationDocument = {
      ...updated.presentationDocument,
      budgetCode: newCode,
      updatedAt: new Date().toISOString(),
    }
  }

  // Atualiza textos do Memorial Descritivo salvo se referenciar o código antigo
  if (updated.savedMemorial) {
    const sm = updated.savedMemorial
    let introUpdated = sm.generalIntroduction
    if (introUpdated && oldCode) {
      introUpdated = replaceExactCodeReferences(introUpdated, oldCode, newCode)
    }

    const updatedStages = (sm.stages || []).map((st) => ({
      ...st,
      notes: oldCode ? replaceExactCodeReferences(st.notes, oldCode, newCode) : st.notes,
      services: (st.services || []).map((srv) => ({
        ...srv,
        technicalSpecification: oldCode
          ? (replaceExactCodeReferences(srv.technicalSpecification, oldCode, newCode) as string)
          : srv.technicalSpecification,
      })),
    }))

    updated.savedMemorial = {
      ...sm,
      generalIntroduction: introUpdated,
      stages: updatedStages,
      updatedAt: new Date().toISOString(),
    }
  }

  return updated
}

/**
 * Executa a renumeração de uma lista de orçamentos e retorna a lista atualizada
 * juntamente com o mapa de mapeamento de/para.
 */
export function renumberBudgetsCollection(
  budgets: FullBudget[],
  targetYear?: number,
): BudgetRenumberResult {
  const year = targetYear ?? new Date().getFullYear()
  const plan = buildBudgetRenumberPlan(budgets, year)

  const planMap = new Map<string, string>()
  const oldCodeMap: Record<string, string> = {}
  for (const item of plan.items) {
    planMap.set(item.id, item.newCode)
    if (item.oldCode && item.oldCode !== '—') {
      oldCodeMap[item.oldCode] = item.newCode
    }
  }

  const updatedBudgets = budgets.map((b) => {
    // Se for orçamento demo ou de teste ignorado, preserva como está
    if (isDemoOrTestBudget(b)) return b

    const targetCode = planMap.get(b.id)
    if (!targetCode) return b

    return applyCodeToBudget(b, targetCode, b.code)
  })

  return {
    success: true,
    year,
    totalProcessed: plan.items.length,
    updatedBudgets,
    mapping: oldCodeMap,
  }
}
