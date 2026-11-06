/**
 * CONCE — Detector e removedor de RESQUÍCIOS na árvore do orçamento
 *
 * Origem do problema: orçamentos criados por DUPLICAÇÃO (ex.: ORC-2026-108, obra de
 * demolição/remoção, duplicado do ORC-2026-100, obra de construção nova) podem carregar
 * na árvore serviços que NÃO são escopo da obra: montagem da estrutura metálica,
 * montagem e concretagem da laje, impermeabilização, armação/armadura CA-50, formas,
 * pilares, vigas, concreto FCK, alvenaria de elevação, emboço/pintura de obra nova etc.
 *
 * Regras (decisão do usuário):
 * - O detector SUGERE candidatos; NADA é apagado automaticamente por palavra-chave.
 * - A limpeza parte SEMPRE do orçamento aberto e é confirmada tela a tela.
 * - Orçamentos de construção legítimos (ex.: ORC-2026-100) não são alvo por padrão.
 * - Funções PURAS: sem acesso a storage, cloud ou React.
 */

import type { FullBudget } from '@/types/budgetEngine'

/** Vocabulário construtivo conhecido da fonte da contaminação (obra nova / estrutura). */
const RESIDUE_KEYWORDS: string[] = [
  'estrutura metalica',
  'montagem da estrutura',
  'montagem e concretagem',
  'concretagem',
  'laje',
  'concreto',
  'fck',
  'armacao',
  'armadura',
  'ca-50',
  'ca 50',
  'formas',
  'cimbra',
  'escoramento',
  'pilar',
  'viga',
  'impermeabiliza',
  'manta asfaltica',
  'alvenaria de elevacao',
  'elevacao de alvenaria',
  'embarro',
  'emboco',
  'reboco',
  'chapa grossa',
  'massa unica',
  'pintura acrilica',
  'textura acrilica',
  'contrapiso',
]

/** Contexto de demolição/remoção: descreve o ESCOPO LEGÍTIMO do orçamento de demolição. */
const DEMOLITION_CONTEXT_KEYWORDS = [
  'demoli',
  'remocao',
  'remover',
  'retirada',
  'retirar',
  'destinac',
  'carga e transporte',
  'carga',
  'transporte',
  'corte',
  'desmontagem de esquadria',
]

const keywordMatchers = RESIDUE_KEYWORDS.map((keyword) => ({
  keyword,
  pattern: new RegExp(`(^|[^a-z0-9])${keyword.split(' ').join('[ ]+')}([^a-z0-9]|$)`),
}))

/** Normaliza texto para comparação: minúsculas, sem acentos, espaços colapsados. */
export function normalizeResidueText(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Palavras-chave de resquício presentes no texto (vazio se nenhuma). */
export function matchResidueVocabulary(text: string): string[] {
  const norm = normalizeResidueText(text)
  if (!norm) return []
  return keywordMatchers.filter((m) => m.pattern.test(norm)).map((m) => m.keyword)
}

/** O texto descreve o próprio escopo de demolição/remoção (não é resquício). */
export function isDemolitionContext(text: string): boolean {
  const norm = normalizeResidueText(text)
  if (!norm) return false
  return DEMOLITION_CONTEXT_KEYWORDS.some((k) => norm.includes(k))
}

export interface ResidueServiceItem {
  serviceId: string
  serviceCode: string
  description: string
  unit: string
  quantity: number
  reasons: string[]
}

export interface ResidueStageGroup {
  stageId: string
  stageCode: string
  stageName: string
  /** true quando TODOS os serviços da etapa são candidatos (oferece remover a etapa inteira). */
  wholeStage: boolean
  services: ResidueServiceItem[]
}

export interface ResidueScanResult {
  groups: ResidueStageGroup[]
  totalCandidates: number
}

/**
 * Varre a árvore do orçamento aberto e lista os serviços SUSPEITOS de resquício.
 * Serviços cuja própria descrição é de demolição/remoção (escopo legítimo) são ignorados.
 */
export function scanBudgetForResidues(budget: FullBudget): ResidueScanResult {
  const groups: ResidueStageGroup[] = []
  let totalCandidates = 0

  for (const stage of budget.stages || []) {
    const services: ResidueServiceItem[] = []

    for (const service of stage.services || []) {
      const ownText = normalizeResidueText(service.description || '')
      if (!ownText || isDemolitionContext(ownText)) continue

      const reasons = matchResidueVocabulary(
        `${service.description || ''} ${service.composition?.description || ''}`,
      )
      if (reasons.length === 0) continue

      services.push({
        serviceId: service.id,
        serviceCode: service.code,
        description: service.description,
        unit: service.unit,
        quantity: service.quantity,
        reasons,
      })
    }

    if (services.length === 0) continue

    groups.push({
      stageId: stage.id,
      stageCode: stage.code,
      stageName: stage.name,
      wholeStage:
        (stage.services || []).length > 0 && services.length === (stage.services || []).length,
      services,
    })
    totalCandidates += services.length
  }

  return { groups, totalCandidates }
}

export interface ResidueCleanupSummary {
  removedStages: number
  removedServices: number
  perStage: Array<{
    stageCode: string
    stageName: string
    removedServices: number
    wholeStage: boolean
  }>
}

/**
 * Remove da árvore APENAS a seleção confirmada pelo usuário:
 * - etapas inteiras marcadas (todos os serviços, composições e insumos vão junto);
 * - serviços individuais marcados (a composição e os insumos pertencem ao serviço).
 * Re-sequencia códigos (01, 02... / 01.01, 01.02...) e NÃO altera nenhum valor,
 * BDI, DAS ou configuração tributária do orçamento.
 *
 * Se algo foi removido, o anexo de apresentação e o memorial gravados (gerados da
 * árvore anterior, possivelmente contaminada) são retirados para forçar a
 * regeneração a partir das etapas limpas — regra permanente da Proposta Técnica e
 * Comercial: base exclusiva nas etapas do orçamento aberto.
 */
export function removeResidueSelection(
  budget: FullBudget,
  wholeStageIds: string[],
  serviceKeys: string[],
): { cleaned: FullBudget; summary: ResidueCleanupSummary } {
  const stageIdSet = new Set(wholeStageIds)
  const serviceKeySet = new Set(serviceKeys)

  const stats = new Map<string, { code: string; name: string; services: number; whole: boolean }>()
  const record = (
    stageId: string,
    code: string,
    name: string,
    services: number,
    whole: boolean,
  ) => {
    const current = stats.get(stageId)
    if (current) {
      current.services += services
      current.whole = current.whole || whole
    } else {
      stats.set(stageId, { code, name, services, whole })
    }
  }

  let removedServices = 0

  // 1. Etapas inteiras marcadas
  const keptStages = (budget.stages || []).filter((st) => {
    if (stageIdSet.has(st.id)) {
      record(st.id, st.code, st.name, (st.services || []).length, true)
      removedServices += (st.services || []).length
      return false
    }
    return true
  })

  // 2. Serviços individuais marcados
  const filteredStages = keptStages.map((st) => {
    const keptServices = (st.services || []).filter((sv) => {
      if (serviceKeySet.has(`${st.id}::${sv.id}`)) {
        record(st.id, st.code, st.name, 1, false)
        removedServices++
        return false
      }
      return true
    })
    return { ...st, services: keptServices }
  })

  // 3. Etapa que ficou sem nenhum serviço por causa da limpeza também sai (derivada da confirmação)
  const finalStages = filteredStages.filter((st) => {
    if (st.services.length === 0 && stats.has(st.id)) {
      record(st.id, st.code, st.name, 0, true)
      return false
    }
    return true
  })

  const perStage = [...stats.values()]
    .filter((s) => s.services > 0 || s.whole)
    .map((s) => ({
      stageCode: s.code,
      stageName: s.name,
      removedServices: s.services,
      wholeStage: s.whole,
    }))

  const removedStages = perStage.filter((s) => s.wholeStage).length
  const anythingRemoved = removedServices > 0 || removedStages > 0

  // 4. Re-sequenciamento de códigos e ordem (mantém textos/descrições intactos)
  const resequencedStages = finalStages.map((st, i) => {
    const stageNumber = String(i + 1).padStart(2, '0')
    return {
      ...st,
      order: i + 1,
      code: stageNumber,
      services: (st.services || []).map((sv, j) => ({
        ...sv,
        order: j + 1,
        code: `${stageNumber}.${String(j + 1).padStart(2, '0')}`,
      })),
    }
  })

  const cleaned: FullBudget = {
    ...budget,
    stages: resequencedStages,
    updatedAt: new Date().toISOString(),
  }

  if (anythingRemoved) {
    delete cleaned.presentationDocument
    delete cleaned.savedMemorial
  }

  return {
    cleaned,
    summary: {
      removedStages,
      removedServices,
      perStage,
    },
  }
}
