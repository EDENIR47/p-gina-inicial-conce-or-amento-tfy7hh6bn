/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Persistência e Sementes de Orçamentos Completos em localStorage
 */

import { FullBudget, BudgetComposition, BudgetInput } from '@/types/budgetEngine'
import { CONCE_CANONICAL_COMPOSITIONS } from './compositionsData'
import { DEFAULT_BDI_CONFIG, calculateCompositionUnitCost, calculateTcuBdi } from './budgetEngine'
import { BRAZIL_STATES_CHARGES } from './chargesData'

export const STORAGE_KEYS_BUDGETS = {
  FULL_BUDGETS: 'conce_full_budgets',
  COMPOSITIONS_LIBRARY: 'conce_compositions_library',
  ACTIVE_BUDGET_ID: 'conce_active_budget_id',
  REMOVED_COMPOSITION_INPUTS: 'conce_removed_composition_inputs',
} as const

export interface RemovedCompositionInputItem {
  id: string // id do registro do histórico
  compositionKey: string // código ou id da composição
  input: BudgetInput // dados completos do insumo no momento da exclusão
  removedAt: string // ISO string da data/hora
  removedBy?: string
  originalIndex?: number // índice em que estava na lista de insumos
}

export interface CleanupResult {
  demoBudgetsRemoved: number
  obsoleteKeysRemoved: number
  orphanedRevisionsRemoved: number
  orphanedQuotesRemoved: number
  orphanedLogsRemoved: number
  orphanedTrashRemoved: number
  totalItemsCleaned: number
  cleanedDetails: string[]
}

/**
 * Executa uma varredura profunda no localStorage para purgar todos os dados de demonstração,
 * obras fictícias e chaves obsoletas ou órfãs, preservando rigorosamente os orçamentos reais.
 */
export function purgeTestBudgetsFromStorage(): CleanupResult {
  const result: CleanupResult = {
    demoBudgetsRemoved: 0,
    obsoleteKeysRemoved: 0,
    orphanedRevisionsRemoved: 0,
    orphanedQuotesRemoved: 0,
    orphanedLogsRemoved: 0,
    orphanedTrashRemoved: 0,
    totalItemsCleaned: 0,
    cleanedDetails: [],
  }

  if (typeof window === 'undefined') return result

  // 1. Limpa orçamentos de demonstração da lista principal
  let validBudgetIds = new Set<string>()
  const rawBudgets = localStorage.getItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS)
  if (rawBudgets) {
    try {
      const list = JSON.parse(rawBudgets)
      if (Array.isArray(list)) {
        const real = list.filter((b: FullBudget) => !isDemoOrTestBudget(b))
        const removedCount = list.length - real.length
        if (removedCount > 0) {
          result.demoBudgetsRemoved = removedCount
          result.cleanedDetails.push(
            `${removedCount} orçamento(s) de demonstração/fictício(s) removido(s)`,
          )
          localStorage.setItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS, JSON.stringify(real))
        }
        real.forEach((b: FullBudget) => {
          if (b.id) validBudgetIds.add(b.id)
        })
      }
    } catch {
      /* ignore */
    }
  }

  // 2. Chaves obsoletas de versões antigas do schema ou dados temporários
  const obsoleteKeys = [
    'conce_demo_data',
    'conce_demo_budgets',
    'conce_mock_budgets',
    'conce_sample_data',
    'conce_test_data',
    'conce_temp_budget',
    'conce_legacy_data',
  ]
  obsoleteKeys.forEach((key) => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key)
      result.obsoleteKeysRemoved++
      result.cleanedDetails.push(`Chave obsoleta removida: ${key}`)
    }
  })

  // 3. Limpeza de revisões órfãs ou de demo
  try {
    const rawRevs = localStorage.getItem('conce_budget_revisions')
    if (rawRevs) {
      const revs = JSON.parse(rawRevs)
      if (Array.isArray(revs)) {
        const cleanRevs = revs.filter((r: any) => {
          if (!r || !r.budgetId) return false
          if (r.budgetId === 'budget-public-002') return false
          // Se tiver orçamentos reais no sistema, garante que aponta para um deles
          if (validBudgetIds.size > 0 && !validBudgetIds.has(r.budgetId)) return false
          const authorLower = (r.author || '').toLowerCase()
          const descLower = (r.description || '').toLowerCase()
          if (descLower.includes('bloco pedagógico') || descLower.includes('escola técnica'))
            return false
          return true
        })
        const removed = revs.length - cleanRevs.length
        if (removed > 0) {
          result.orphanedRevisionsRemoved = removed
          result.cleanedDetails.push(`${removed} revisão(ões) de versão órfã(s) removida(s)`)
          localStorage.setItem('conce_budget_revisions', JSON.stringify(cleanRevs))
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 4. Limpeza de cotações órfãs ou de demo
  try {
    const rawQuotes = localStorage.getItem('conce_input_quotes')
    if (rawQuotes) {
      const quotes = JSON.parse(rawQuotes)
      if (Array.isArray(quotes)) {
        const cleanQuotes = quotes.filter((q: any) => {
          if (!q || !q.budgetId) return false
          if (q.budgetId === 'budget-public-002') return false
          if (validBudgetIds.size > 0 && !validBudgetIds.has(q.budgetId)) return false
          return true
        })
        const removed = quotes.length - cleanQuotes.length
        if (removed > 0) {
          result.orphanedQuotesRemoved = removed
          result.cleanedDetails.push(`${removed} cotação(ões) órfã(s) removida(s)`)
          localStorage.setItem('conce_input_quotes', JSON.stringify(cleanQuotes))
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 5. Limpeza de logs de auditoria órfãos ou de demo
  try {
    const rawLogs = localStorage.getItem('conce_audit_logs')
    if (rawLogs) {
      const logs = JSON.parse(rawLogs)
      if (Array.isArray(logs)) {
        const cleanLogs = logs.filter((l: any) => {
          if (!l) return false
          if (l.budgetId === 'budget-public-002') return false
          const titleLower = (l.title || '').toLowerCase()
          const detailsLower = (l.details || '').toLowerCase()
          if (
            detailsLower.includes('bloco pedagógico') ||
            detailsLower.includes('escola técnica') ||
            titleLower.includes('escola técnica')
          ) {
            return false
          }
          if (validBudgetIds.size > 0 && l.budgetId && !validBudgetIds.has(l.budgetId)) {
            return false
          }
          return true
        })
        const removed = logs.length - cleanLogs.length
        if (removed > 0) {
          result.orphanedLogsRemoved = removed
          result.cleanedDetails.push(`${removed} registro(s) de auditoria órfão(s) removido(s)`)
          localStorage.setItem('conce_audit_logs', JSON.stringify(cleanLogs))
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 6. Limpeza de lixeira de insumos órfãos apontando para orçamentos inexistentes
  try {
    const rawTrash = localStorage.getItem(STORAGE_KEYS_BUDGETS.REMOVED_COMPOSITION_INPUTS)
    if (rawTrash) {
      const trash = JSON.parse(rawTrash)
      if (Array.isArray(trash)) {
        const cleanTrash = trash.filter((item: any) => {
          if (!item || !item.compositionKey) return false
          const key = String(item.compositionKey)
          if (key.includes(':')) {
            const budgetId = key.split(':')[0]
            if (budgetId === 'budget-public-002') return false
            if (validBudgetIds.size > 0 && !validBudgetIds.has(budgetId)) return false
          }
          return true
        })
        const removed = trash.length - cleanTrash.length
        if (removed > 0) {
          result.orphanedTrashRemoved = removed
          result.cleanedDetails.push(`${removed} insumo(s) órfão(s) na lixeira removido(s)`)
          localStorage.setItem(
            STORAGE_KEYS_BUDGETS.REMOVED_COMPOSITION_INPUTS,
            JSON.stringify(cleanTrash),
          )
        }
      }
    }
  } catch {
    /* ignore */
  }

  // Se o active_budget_id apontar para um orçamento demo que foi removido, limpa
  const activeId = localStorage.getItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID)
  if (activeId && validBudgetIds.size > 0 && !validBudgetIds.has(activeId)) {
    localStorage.removeItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID)
    result.obsoleteKeysRemoved++
  }

  result.totalItemsCleaned =
    result.demoBudgetsRemoved +
    result.obsoleteKeysRemoved +
    result.orphanedRevisionsRemoved +
    result.orphanedQuotesRemoved +
    result.orphanedLogsRemoved +
    result.orphanedTrashRemoved

  return result
}

/**
 * Reset completo e destrutivo de todos os dados locais do aplicativo CONCE em localStorage.
 * Uso consciente sob dupla confirmação na tela de configurações.
 */
export function resetAllLocalConceData(): void {
  if (typeof window === 'undefined') return
  const keysToRemove = [
    STORAGE_KEYS_BUDGETS.FULL_BUDGETS,
    STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID,
    STORAGE_KEYS_BUDGETS.COMPOSITIONS_LIBRARY,
    STORAGE_KEYS_BUDGETS.REMOVED_COMPOSITION_INPUTS,
    'conce_demo_data',
    'conce_budget_revisions',
    'conce_input_quotes',
    'conce_audit_logs',
    'conce_sinapi_catalog_custom',
    'conce_sinapi_import_metadata',
    'conce_sinapi_api_key',
    'conce_autosinapi_base_url',
    'conce_autosinapi_api_key',
  ]
  keysToRemove.forEach((k) => {
    localStorage.removeItem(k)
  })
}

export function createCanonicalDemoBudget(): FullBudget {
  const compConcreto = CONCE_CANONICAL_COMPOSITIONS[0] // SINAPI-94964
  const compArmacao = CONCE_CANONICAL_COMPOSITIONS[1] // SINAPI-92778
  const compAlvenaria = CONCE_CANONICAL_COMPOSITIONS[2] // SINAPI-87529
  const compEmboco = CONCE_CANONICAL_COMPOSITIONS[3] // SINAPI-87775
  const compPintura = CONCE_CANONICAL_COMPOSITIONS[4] // SINAPI-88489
  const compImpermeabilizacao = CONCE_CANONICAL_COMPOSITIONS[6] // CONCE-IMP-002

  return {
    id: 'budget-conce-001',
    code: 'ORC-2025-001',
    title: 'Reforma e Estrutura Residencial — Apto 1803',
    status: 'em_andamento',
    createdAt: '2025-04-10',
    updatedAt: new Date().toISOString(),
    author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
    paymentTerms:
      '30% de entrada; 30% na entrega dos projetos base; 20% após montagem das estruturas metálicas; saldo após vistoria de entrega.',
    validityDays: 5,
    validityDaysType: 'uteis',
    executionDeadline:
      'PRAZO DE EXECUÇÃO: PROJETOS 15 DIAS UTEIS APOS ACEITE DA PROPOSTA E ASSINATURA DO CONTRATO, E DA EXECUÇÃO É UM ITEM DO ESCOPO DE GESTÃO POIS ESSE PRAZO DEPENDE DA CONTRATAÇÃO DA EMPREZA PARA PRODUZIR E MONTAR A ESTRUTURA METÁLICA',
    technicalResponsibilityText:
      '• Emissão de Anotação de Responsabilidade Técnica (ART) junto ao CREA/RS sob responsabilidade do RT Eng. Edenir Souza da Rosa (CREA/RS-252397). Garantia técnica quinquenal conforme preconiza o Artigo 618 do Código Civil Brasileiro.',
    technicalObligationsText:
      '• Emissão obrigatória da Anotação de Responsabilidade Técnica (ART) vinculada ao CREA/RS sob responsabilidade do RT Eng. Edenir Souza da Rosa - CREA/RS-252397.\n• Garantia legal de 5 (cinco) anos para estabilidade e solidez da obra, conforme previsto no Artigo 618 do Código Civil Brasileiro.\n• Atendimento irrestrito às normas técnicas da ABNT e NRs de Segurança e Saúde no Trabalho da Construção Civil.',
    commercialNotes:
      'Preços com impostos inclusos (Simples Nacional). Emissão de ART vinculada ao CREA/RS-252397.',
    client: {
      name: 'Andreia de Oliveira da Costa e Jader da Costa',
      document: '',
      email: '',
      phone: '',
      address: '',
      city: 'Porto Alegre',
      state: 'RS',
    },
    work: {
      name: 'Reforma e Estrutura Residencial — Apto 1803',
      address: 'Rua Tomaz Gonzaga, 610, Apartamento 1803',
      city: 'Porto Alegre',
      state: 'RS',
      description:
        'Reforma e execução estrutural residencial, projetos complementares e gestão de montagem de estrutura metálica.',
      deadlineMonths: 6,
      startDate: '2025-05-01',
      expectedEndDate: '2025-11-01',
      totalAreaM2: 185.0,
      executionDeadline:
        'PRAZO DE EXECUÇÃO: PROJETOS 15 DIAS UTEIS APOS ACEITE DA PROPOSTA E ASSINATURA DO CONTRATO, E DA EXECUÇÃO É UM ITEM DO ESCOPO DE GESTÃO POIS ESSE PRAZO DEPENDE DA CONTRATAÇÃO DA EMPREZA PARA PRODUZIR E MONTAR A ESTRUTURA METÁLICA',
    },
    publicWork: {
      enabled: false,
      tenderNumber: '',
      contractNumber: '',
      agency: '',
      modality: 'Concorrência',
      sinapiReferenceMonth: '04/2025',
      sicroReferenceMonth: '03/2025',
      hasDisallowanceClause: false,
    },
    chargesConfig: {
      uf: 'RS',
      isRelieved: false,
      taxRegime: 'simples_nacional', // CONCE trabalha no Simples Nacional
      simplesCollectionOption: 'cpp_inclusa_das',
      simplesDasRate: 11.0, // Alíquota DAS efetiva informada (11%)
      customGroupA: 0.0, // Simples Nacional: encargos trabalhistas zerados
      customGroupB: 0.0,
      customGroupC: 0.0,
      customGroupD: 0.0,
      isExplicitZero: true, // Flag explícita
    },
    bdiConfig: {
      ...DEFAULT_BDI_CONFIG,
      administrationCentral: 4.5,
      risk: 1.25,
      insuranceAndGuarantee: 0.85,
      financialExpenses: 1.15,
      profit: 7.8,
      taxes: {
        iss: 4.0,
        pis: 0.65,
        cofins: 3.0,
        inssOrCprb: 0.0,
        totalTaxes: 11.0,
        simplesDas: 11.0,
      },
      // BDI TCU calculado dinamicamente com base nos parâmetros acima e tributos DAS 11%
      calculatedBdi: calculateTcuBdi({
        administrationCentral: 4.5,
        risk: 1.25,
        insuranceAndGuarantee: 0.85,
        financialExpenses: 1.15,
        profit: 7.8,
        taxesTotal: 11.0,
      }).bdiPercent,
    },
    stages: [
      {
        id: 'stage-1',
        order: 1,
        code: '01',
        name: 'SERVIÇOS PRELIMINARES E COBERTURA',
        notes: 'Proteções perimetrais e impermeabilização da laje de cobertura',
        services: [
          {
            id: 'serv-1-1',
            order: 1,
            code: '01.01',
            description:
              'Impermeabilização de laje com manta asfáltica elastomérica 4mm tipo III com alumínio refletivo',
            unit: 'm²',
            quantity: 420.0,
            composition: compImpermeabilizacao,
          },
        ],
      },
      {
        id: 'stage-2',
        order: 2,
        code: '02',
        name: 'INFRAESTRUTURA E SUPERESTRUTURA',
        notes: 'Concretagem de pilares, vigas e lajes protendidas',
        services: [
          {
            id: 'serv-2-1',
            order: 1,
            code: '02.01',
            description: 'Concreto FCK 25MPa para vigas, lajes e pilares com preparo mecânico',
            unit: 'm³',
            quantity: 185.0,
            composition: compConcreto,
          },
          {
            id: 'serv-2-2',
            order: 2,
            code: '02.02',
            description:
              'Armação de estrutura convencional com aço CA-50 de 10,0mm cortado e dobrado',
            unit: 'kg',
            quantity: 14200.0,
            composition: compArmacao,
          },
        ],
      },
      {
        id: 'stage-3',
        order: 3,
        code: '03',
        name: 'ALVENARIA, REVESTIMENTOS E PINTURA',
        notes: 'Paredes divisórias dos apartamentos e áreas comuns',
        services: [
          {
            id: 'serv-3-1',
            order: 1,
            code: '03.01',
            description: 'Alvenaria de vedação com bloco cerâmico 9x19x19cm com argamassa mista',
            unit: 'm²',
            quantity: 850.0,
            composition: compAlvenaria,
          },
          {
            id: 'serv-3-2',
            order: 2,
            code: '03.02',
            description: 'Emboço interno espessura 20mm traço 1:2:8 aplicado manualmente',
            unit: 'm²',
            quantity: 1650.0,
            composition: compEmboco,
          },
          {
            id: 'serv-3-3',
            order: 3,
            code: '03.03',
            description: 'Pintura acrílica interna duas demãos acabamento fosco lavável',
            unit: 'm²',
            quantity: 1650.0,
            composition: compPintura,
          },
        ],
      },
    ],
  }
}

/**
 * Cria orçamento público modelo
 */
// Orçamento público fictício de demonstração descontinuado conforme solicitação do usuário

/**
 * Lê todos os orçamentos completos persistidos
 */
/**
 * Verifica se um orçamento é de teste/demonstração fictício para limpeza.
 * Os orçamentos reais dos clientes "Andreia" e "Jader" ou endereço "Tomaz Gonzaga"
 * JAMAIS devem ser classificados como demo.
 */
/**
 * Normaliza descrições de insumos/serviços de acordo com os padrões da CONCE:
 * 1. "encarregado de obra" ou "encarregado obra" -> "encarregado da obra"
 * 2. "caçamba de entulho" -> "caçamba de entulhos"
 * 3. "sacos de ráfia" -> "saco de ráfia" (singular)
 * Case-insensitive, tolerando acentuação e preservando casing natural aproximado.
 */
export function normalizeInputDescription(desc?: string | null): string {
  if (!desc) return ''
  let result = desc

  // 1. "encarregado de obra" ou "encarregado obra" -> "encarregado da obra"
  // Suporta variações com/sem acento e maiúsculas/minúsculas
  result = result.replace(/\bencarregad[oa]s?\s+(?:de\s+)?obra\b/gi, (match) => {
    const isUpper = match === match.toUpperCase()
    const isTitle = /^[A-Z]/.test(match)
    if (isUpper) return 'ENCARREGADO DA OBRA'
    if (isTitle) return 'Encarregado da obra'
    return 'encarregado da obra'
  })

  // 2. "caçamba(s) de entulho" -> "caçamba(s) de entulhos"
  result = result.replace(/\bca[cç]ambas?\s+de\s+entulho\b/gi, (match) => {
    const isUpper = match === match.toUpperCase()
    const isPluralCacamba = /^ca[cç]ambas/i.test(match)
    const isTitle = /^[A-Z]/.test(match)
    const baseCacamba = isPluralCacamba ? 'caçambas' : 'caçamba'
    if (isUpper) return `${baseCacamba.toUpperCase()} DE ENTULHOS`
    if (isTitle) return `${isPluralCacamba ? 'Caçambas' : 'Caçamba'} de entulhos`
    return `${baseCacamba} de entulhos`
  })

  // 3. "sacos de ráfia" -> "saco de ráfia" (singular)
  result = result.replace(/\bsacos\s+de\s+r[aá]fias?\b/gi, (match) => {
    const isUpper = match === match.toUpperCase()
    const isTitle = /^[A-Z]/.test(match)
    if (isUpper) return 'SACO DE RÁFIA'
    if (isTitle) return 'Saco de ráfia'
    return 'saco de ráfia'
  })

  return result
}

/**
 * Sanitiza recursivamente as descrições de serviços e insumos em memória
 */
function sanitizeBudgetDescriptions(budget: FullBudget): FullBudget {
  if (!budget.stages || !Array.isArray(budget.stages)) return budget

  let anyChanged = false
  const updatedStages = budget.stages.map((stage) => {
    let stageChanged = false
    const updatedServices = (stage.services || []).map((service) => {
      let serviceChanged = false
      const normServiceDesc = normalizeInputDescription(service.description)
      if (normServiceDesc !== service.description) {
        serviceChanged = true
      }

      let updatedComp = service.composition
      if (service.composition) {
        let compChanged = false
        const normCompDesc = normalizeInputDescription(service.composition.description)
        if (normCompDesc !== service.composition.description) {
          compChanged = true
        }

        const normInputs = (service.composition.inputs || []).map((inp) => {
          const normInpDesc = normalizeInputDescription(inp.description)
          if (normInpDesc !== inp.description) {
            compChanged = true
            return { ...inp, description: normInpDesc }
          }
          return inp
        })

        if (compChanged) {
          serviceChanged = true
          updatedComp = {
            ...service.composition,
            description: normCompDesc,
            inputs: normInputs,
          }
        }
      }

      if (serviceChanged) {
        stageChanged = true
        return {
          ...service,
          description: normServiceDesc,
          composition: updatedComp,
        }
      }
      return service
    })

    if (stageChanged) {
      anyChanged = true
      return { ...stage, services: updatedServices }
    }
    return stage
  })

  if (anyChanged) {
    return { ...budget, stages: updatedStages }
  }
  return budget
}

export function isDemoOrTestBudget(budget: FullBudget): boolean {
  if (!budget) return true

  const id = (budget.id || '').toLowerCase()
  const code = (budget.code || '').toLowerCase()
  const title = (budget.title || '').toLowerCase()
  const clientName = (budget.client?.name || '').toLowerCase()
  const workName = (budget.work?.name || '').toLowerCase()
  const address = (budget.work?.address || '').toLowerCase()

  // REGRA DE OURO — Orçamentos REAIS sagrados do usuário:
  // "Andreia", "Jader", "Rua Tomaz Gonzaga 610", "Apto 1803" NUNCA devem ser apagados ou classificados como demo
  const isRealUserBudget =
    clientName.includes('andreia') ||
    clientName.includes('jader') ||
    address.includes('tomaz gonzaga') ||
    address.includes('tomaz') ||
    (workName.includes('apto 1803') && !workName.includes('demo') && !workName.includes('fict')) ||
    (title.includes('apto 1803') && !title.includes('demo') && !title.includes('fict'))

  if (isRealUserBudget) {
    return false
  }

  // Se o ID for exatamente o do seed canônico antigo ('budget-conce-001')
  // mas o cliente NÃO for Andreia/Jader, é resíduo de demonstração antigo alterado
  if (
    id === 'budget-conce-001' &&
    !clientName.includes('andreia') &&
    !clientName.includes('jader')
  ) {
    return true
  }

  // 1. IDs explícitos de demonstração/teste
  if (
    id.startsWith('demo-') ||
    id.startsWith('seed-') ||
    id.startsWith('test-') ||
    id === 'budget-public-002' ||
    id === 'orc-demo-001'
  ) {
    return true
  }

  // 2. Códigos identificados como demo
  if (
    code.startsWith('demo') ||
    code.startsWith('orc-demo') ||
    code.startsWith('orc-test') ||
    code === 'orc-pub-2025-014'
  ) {
    return true
  }

  // 3. Nomes de clientes fictícios usados no seed do sistema
  const demoClients = [
    'incorporadora horizonte',
    'família albuquerque',
    'familia albuquerque',
    'grupo vértice',
    'grupo vertice',
    'secretaria mun. de obras',
    'secretaria de obras e serviços públicos',
    'condomínio altos do morumbi',
    'condominio altos do morumbi',
    'dra. camila vasconcelos',
    'tech park empreendimentos',
    'hospital santa mônica',
    'hospital santa monica',
    'colégio renascença',
    'colegio renascenca',
    'cliente demonstração',
    'cliente demonstracao',
    'cliente fictício',
    'cliente ficticio',
    'cliente teste',
  ]
  if (demoClients.some((dc) => clientName.includes(dc))) {
    return true
  }

  // 4. Nomes de obras fictícias conhecidas
  const demoWorks = [
    'escola técnica estadual',
    'bloco pedagógico',
    'residência jardins',
    'residencia jardins',
    'edifício centro',
    'edificio centro',
    'reforma comercial paulista',
    'obra pública — escola',
    'obra publica — escola',
    'obra pública - escola',
    'cond. bosque',
    'reforma cobertura duplex',
    'construção galpão logístico',
    'construcao galpao logistico',
    'reforço estrutural torre norte',
    'reforco estrutural torre norte',
    'retrofit fachada ventilada',
    'obra fictícia',
    'obra ficticia',
    'obra teste',
    'obra demonstrativa',
    'obra de demonstração',
  ]
  if (demoWorks.some((dw) => workName.includes(dw) || title.includes(dw))) {
    return true
  }

  // 5. Flags no título ou descrição
  if (
    title.includes('[demo]') ||
    title.includes('(demo)') ||
    title.includes('demonstração') ||
    title.includes('demonstrativo') ||
    title.includes('exemplo fictício') ||
    workName.includes('[demo]') ||
    workName.includes('(demo)')
  ) {
    return true
  }

  return false
}

/**
 * Lê todos os orçamentos completos persistidos
 */
export function getStoredFullBudgets(): FullBudget[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = localStorage.getItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filtrar e remover orçamentos de teste fictícios (ex: budget-public-002, obras demo),
        // preservando os orçamentos reais do usuário ("Andreia", "Jader", "Rua Tomaz Gonzaga 610").
        const realBudgets = parsed.filter((b: FullBudget) => !isDemoOrTestBudget(b))

        let hasFixed = false
        if (realBudgets.length !== parsed.length) {
          hasFixed = true
        }

        // Se após filtrar orçamentos demo a lista for vazia, NÃO injeta mais dados de demonstração
        const listToProcess = realBudgets

        const sanitized = listToProcess.map((b: FullBudget) => {
          const regime =
            b.chargesConfig?.taxRegime ||
            (b.chargesConfig?.isRelieved ? 'com_desoneracao' : 'sem_desoneracao')

          let updatedBudget = b

          // 1. Sanitização de referências a IA e correção de "Denir" -> "Edenir" em author, code, workName e tenderNumber
          const rawAuthor = b.author || ''
          let cleanAuthor = rawAuthor
            .replace(/\s*\([^)]*(?:ia|agente|gerad|inteligên)[^)]*\)/gi, '')
            .trim()
          cleanAuthor = cleanAuthor.replace(/(?<![A-Za-zÀ-ÿ])[Dd]enir(?![A-Za-zÀ-ÿ])/g, 'Edenir')
          const rawCode = b.code || ''
          const cleanCode = rawCode.replace(/\bORC-IA-/gi, 'ORC-')
          const rawWorkName = b.work?.name || ''
          const cleanWorkName = rawWorkName.toLowerCase().includes('obra planejada via agente')
            ? 'Empreendimento de Engenharia Civil'
            : rawWorkName.replace(/\s*(?:via\s+agente\s+ia|via\s+agente)/gi, '').trim()
          const rawTender = b.publicWork?.tenderNumber || ''
          const cleanTender = rawTender.replace(/\bLIC-IA-/gi, 'LIC-')

          if (
            cleanAuthor !== rawAuthor ||
            cleanCode !== rawCode ||
            cleanWorkName !== rawWorkName ||
            cleanTender !== rawTender
          ) {
            hasFixed = true
            updatedBudget = {
              ...updatedBudget,
              author: cleanAuthor || 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
              code: cleanCode,
              work: {
                ...updatedBudget.work,
                name: cleanWorkName || 'Empreendimento de Engenharia Civil',
              },
              publicWork: {
                ...updatedBudget.publicWork,
                tenderNumber: cleanTender,
              },
            }
          }

          // 1.1 Garantir valores padrão para novos campos de proposta comercial e sanitização solicitada
          // Se for o orçamento ativo padrão (budget-conce-001 ou ORC-2025-001) e ainda estiver com dados legados de demonstração, sincroniza com os dados exatos pedidos pelo Eng. Edenir:
          if (
            (updatedBudget.id === 'budget-conce-001' || updatedBudget.code === 'ORC-2025-001') &&
            (!updatedBudget.client?.name ||
              updatedBudget.client.name.includes('Horizonte') ||
              updatedBudget.client.name.includes('Dr. Roberto') ||
              !updatedBudget.client.name.includes('Andreia de Oliveira da Costa'))
          ) {
            hasFixed = true
            updatedBudget = {
              ...updatedBudget,
              title: 'Reforma e Estrutura Residencial — Apto 1803',
              client: {
                ...updatedBudget.client,
                name: 'Andreia de Oliveira da Costa e Jader da Costa',
                document: '',
                email: '',
                phone: '',
                address: '',
                city: 'Porto Alegre',
                state: 'RS',
              },
              work: {
                ...updatedBudget.work,
                name: 'Reforma e Estrutura Residencial — Apto 1803',
                address: 'Rua Tomaz Gonzaga, 610, Apartamento 1803',
                city: 'Porto Alegre',
                state: 'RS',
                deadlineMonths: 6,
                executionDeadline:
                  'PRAZO DE EXECUÇÃO: PROJETOS 15 DIAS UTEIS APOS ACEITE DA PROPOSTA E ASSINATURA DO CONTRATO, E DA EXECUÇÃO É UM ITEM DO ESCOPO DE GESTÃO POIS ESSE PRAZO DEPENDE DA CONTRATAÇÃO DA EMPREZA PARA PRODUZIR E MONTAR A ESTRUTURA METÁLICA',
              },
              executionDeadline:
                'PRAZO DE EXECUÇÃO: PROJETOS 15 DIAS UTEIS APOS ACEITE DA PROPOSTA E ASSINATURA DO CONTRATO, E DA EXECUÇÃO É UM ITEM DO ESCOPO DE GESTÃO POIS ESSE PRAZO DEPENDE DA CONTRATAÇÃO DA EMPREZA PARA PRODUZIR E MONTAR A ESTRUTURA METÁLICA',
              paymentTerms:
                '30% de entrada; 30% na entrega dos projetos base; 20% após montagem das estruturas metálicas; saldo após vistoria de entrega.',
              validityDays: 5,
              validityDaysType: 'uteis',
            }
          }

          // 1.2 Garantir alíquota DAS padrão de 11% e tributos sincronizados para propostas reais no Simples Nacional
          // Respeita a regra de ouro do usuário ("Alíquota DAS padrão da CONCE é 11%"): novos e existentes no Simples
          // devem ter simplesDasRate: 11% e bdiConfig.taxes.totalTaxes/simplesDas: 11% sincronizados se estiverem zerados ou não definidos.
          if (
            regime === 'simples_nacional' &&
            (!updatedBudget.chargesConfig?.simplesDasRate ||
              updatedBudget.chargesConfig.simplesDasRate === 0 ||
              !updatedBudget.bdiConfig?.taxes?.simplesDas ||
              updatedBudget.bdiConfig.taxes.simplesDas === 0)
          ) {
            hasFixed = true
            const currentRate =
              updatedBudget.chargesConfig?.simplesDasRate &&
              updatedBudget.chargesConfig.simplesDasRate > 0
                ? updatedBudget.chargesConfig.simplesDasRate
                : updatedBudget.bdiConfig?.taxes?.simplesDas &&
                    updatedBudget.bdiConfig.taxes.simplesDas > 0
                  ? updatedBudget.bdiConfig.taxes.simplesDas
                  : 11.0

            const tcuRecalc = calculateTcuBdi({
              administrationCentral:
                updatedBudget.bdiConfig?.administrationCentral ??
                DEFAULT_BDI_CONFIG.administrationCentral,
              risk: updatedBudget.bdiConfig?.risk ?? DEFAULT_BDI_CONFIG.risk,
              insuranceAndGuarantee:
                updatedBudget.bdiConfig?.insuranceAndGuarantee ??
                DEFAULT_BDI_CONFIG.insuranceAndGuarantee,
              financialExpenses:
                updatedBudget.bdiConfig?.financialExpenses ?? DEFAULT_BDI_CONFIG.financialExpenses,
              profit: updatedBudget.bdiConfig?.profit ?? DEFAULT_BDI_CONFIG.profit,
              taxesTotal: currentRate,
            })

            updatedBudget = {
              ...updatedBudget,
              chargesConfig: {
                ...updatedBudget.chargesConfig,
                taxRegime: 'simples_nacional' as const,
                simplesDasRate: currentRate,
                customGroupA: 0,
                customGroupB: 0,
                customGroupC: 0,
                customGroupD: 0,
                isExplicitZero: true,
              },
              bdiConfig: {
                ...updatedBudget.bdiConfig,
                calculatedBdi: tcuRecalc.bdiPercent,
                taxes: {
                  ...updatedBudget.bdiConfig?.taxes,
                  simplesDas: currentRate,
                  totalTaxes: currentRate,
                  iss: updatedBudget.bdiConfig?.taxes?.iss ?? 0,
                  pis: updatedBudget.bdiConfig?.taxes?.pis ?? 0,
                  cofins: updatedBudget.bdiConfig?.taxes?.cofins ?? 0,
                  inssOrCprb: 0,
                },
              },
            }
          }
          if (!updatedBudget.title) {
            hasFixed = true
            updatedBudget = {
              ...updatedBudget,
              title: updatedBudget.work?.name || 'Orçamento de Engenharia Civil',
            }
          }
          if (!updatedBudget.paymentTerms) {
            hasFixed = true
            updatedBudget = {
              ...updatedBudget,
              paymentTerms:
                '30% de entrada; 30% na entrega dos projetos base; 20% após montagem das estruturas metálicas; saldo após vistoria de entrega.',
            }
          }
          if (!updatedBudget.validityDays) {
            hasFixed = true
            updatedBudget = {
              ...updatedBudget,
              validityDays: 5,
              validityDaysType: 'uteis',
            }
          }
          if (!updatedBudget.validityDaysType) {
            hasFixed = true
            updatedBudget = {
              ...updatedBudget,
              validityDaysType: updatedBudget.validityDays === 5 ? 'uteis' : 'corridos',
            }
          }
          if (!updatedBudget.executionDeadline) {
            hasFixed = true
            updatedBudget = {
              ...updatedBudget,
              executionDeadline:
                updatedBudget.work?.executionDeadline ||
                'PRAZO DE EXECUÇÃO: PROJETOS 15 DIAS UTEIS APOS ACEITE DA PROPOSTA E ASSINATURA DO CONTRATO, E DA EXECUÇÃO É UM ITEM DO ESCOPO DE GESTÃO POIS ESSE PRAZO DEPENDE DA CONTRATAÇÃO DA EMPREZA PARA PRODUZIR E MONTAR A ESTRUTURA METÁLICA',
            }
          }

          // 2. Sanitização tributária e encargos — Alíquota DAS padrão da CONCE é 11%
          if (regime === 'simples_nacional') {
            const hasNonZeroGroups =
              (updatedBudget.chargesConfig?.customGroupA ?? 0) > 0 ||
              (updatedBudget.chargesConfig?.customGroupB ?? 0) > 0 ||
              (updatedBudget.chargesConfig?.customGroupC ?? 0) > 0 ||
              (updatedBudget.chargesConfig?.customGroupD ?? 0) > 0

            const currentDas = updatedBudget.chargesConfig?.simplesDasRate
            const needsDasFix = currentDas === undefined || currentDas === null || currentDas === 0

            if (hasNonZeroGroups || !updatedBudget.chargesConfig?.isExplicitZero || needsDasFix) {
              hasFixed = true
              const effectiveDas = needsDasFix ? 11.0 : currentDas
              const tcuRecalc = calculateTcuBdi({
                administrationCentral:
                  updatedBudget.bdiConfig?.administrationCentral ??
                  DEFAULT_BDI_CONFIG.administrationCentral,
                risk: updatedBudget.bdiConfig?.risk ?? DEFAULT_BDI_CONFIG.risk,
                insuranceAndGuarantee:
                  updatedBudget.bdiConfig?.insuranceAndGuarantee ??
                  DEFAULT_BDI_CONFIG.insuranceAndGuarantee,
                financialExpenses:
                  updatedBudget.bdiConfig?.financialExpenses ??
                  DEFAULT_BDI_CONFIG.financialExpenses,
                profit: updatedBudget.bdiConfig?.profit ?? DEFAULT_BDI_CONFIG.profit,
                taxesTotal: effectiveDas,
              })
              return {
                ...updatedBudget,
                chargesConfig: {
                  ...updatedBudget.chargesConfig,
                  taxRegime: 'simples_nacional' as const,
                  simplesDasRate: effectiveDas,
                  customGroupA: 0,
                  customGroupB: 0,
                  customGroupC: 0,
                  customGroupD: 0,
                  isExplicitZero: true,
                },
                bdiConfig: {
                  ...updatedBudget.bdiConfig,
                  calculatedBdi: tcuRecalc.bdiPercent,
                  taxes: {
                    ...updatedBudget.bdiConfig?.taxes,
                    simplesDas: effectiveDas,
                    totalTaxes: effectiveDas,
                  },
                },
              }
            }
          } else {
            // Regimes sem_desoneracao ou com_desoneracao: proteção contra zeramento indevido
            if (updatedBudget.chargesConfig?.customGroupA !== undefined) {
              const totalSum =
                (updatedBudget.chargesConfig.customGroupA || 0) +
                (updatedBudget.chargesConfig.customGroupB || 0) +
                (updatedBudget.chargesConfig.customGroupC || 0) +
                (updatedBudget.chargesConfig.customGroupD || 0)

              if (totalSum === 0 && !updatedBudget.chargesConfig.isExplicitZero) {
                hasFixed = true
                const uf = updatedBudget.chargesConfig.uf || 'RS'
                const isRel = regime === 'com_desoneracao'
                const stateData =
                  BRAZIL_STATES_CHARGES[uf] ||
                  BRAZIL_STATES_CHARGES['RS'] ||
                  BRAZIL_STATES_CHARGES['SP']
                const base = isRel ? stateData.relieved : stateData.nonRelieved
                return {
                  ...updatedBudget,
                  chargesConfig: {
                    ...updatedBudget.chargesConfig,
                    customGroupA: base.groupA,
                    customGroupB: base.groupB,
                    customGroupC: base.groupC,
                    customGroupD: base.groupD,
                    isExplicitZero: false,
                  },
                }
              }
            }
          }
          // Sanitização em memória de descrições dos serviços e insumos (encarregado da obra, caçamba de entulhos, saco de ráfia)
          updatedBudget = sanitizeBudgetDescriptions(updatedBudget)

          return updatedBudget
        })
        // A sanitização opera ESTRITAMENTE EM MEMÓRIA ao carregar.
        // O estado da aplicação reflete os dados sanitizados para exibição e cálculo correto,
        // mas o localStorage só é gravado quando o usuário executa uma ação real e explícita
        // de salvar, excluir ou restaurar revisão, impedindo alterações silenciosas no storage.
        return sanitized
      }
    } catch {
      // Ignora erro
    }
  }

  // Primeiro acesso ou storage vazio: NÃO semear orçamento fictício.
  // Retorna lista vazia para exibição do estado vazio de alta qualidade.
  return []
}

/**
 * Salva a lista de orçamentos no localStorage
 */
export function saveFullBudgets(budgets: FullBudget[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS, JSON.stringify(budgets))
}

/**
 * Salva ou atualiza um orçamento específico
 */
export function saveSingleBudget(budget: FullBudget): void {
  const current = getStoredFullBudgets()
  const idx = current.findIndex((b) => b.id === budget.id)
  budget.updatedAt = new Date().toISOString()

  let updated: FullBudget[]
  if (idx >= 0) {
    updated = [...current]
    updated[idx] = budget
  } else {
    updated = [budget, ...current]
  }

  saveFullBudgets(updated)
}

/**
 * Exclui um orçamento pelo ID e retorna a lista atualizada
 */
export function deleteSingleBudget(id: string): FullBudget[] {
  const current = getStoredFullBudgets()
  const updated = current.filter((b) => b.id !== id)
  saveFullBudgets(updated)
  return updated
}

/**
 * Obtém a biblioteca de composições (padrão CONCE + importadas pelo usuário)
 */
export function getStoredCompositions() {
  if (typeof window === 'undefined') {
    return CONCE_CANONICAL_COMPOSITIONS
  }

  const raw = localStorage.getItem(STORAGE_KEYS_BUDGETS.COMPOSITIONS_LIBRARY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    } catch {
      // Ignora erro e regenera
    }
  }

  localStorage.setItem(
    STORAGE_KEYS_BUDGETS.COMPOSITIONS_LIBRARY,
    JSON.stringify(CONCE_CANONICAL_COMPOSITIONS),
  )
  return CONCE_CANONICAL_COMPOSITIONS
}

/**
 * Salva a biblioteca de composições
 */
export function saveStoredCompositions(compositions: any[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS_BUDGETS.COMPOSITIONS_LIBRARY, JSON.stringify(compositions))
}

/**
 * Heurística para identificar códigos genéricos / auto-gerados / ambíguos de composição.
 * Códigos genéricos (ex: "CPU-01.01", "CPU-custom-...", "CPU-", "CONCE-CPU", "CPU-temp")
 * NÃO devem ser usados para propagação cega da biblioteca para orçamentos, pois
 * podem coincidir entre serviços totalmente diferentes (ex: demolição vs porcelanato).
 * Para propagação segura por código, o código deve ser um identificador canônico específico
 * (ex: SINAPI-87529, SICRO-2S0110000, CONCE-ALV-001, CONCE-IMP-002).
 */
export function isGenericCompositionCode(code?: string | null): boolean {
  if (!code) return true
  const trimmed = code.trim().toUpperCase()
  if (
    !trimmed ||
    trimmed === 'GLOBAL' ||
    trimmed === 'TEMP' ||
    trimmed === 'UNDEFINED' ||
    trimmed === 'NULL'
  ) {
    return true
  }

  // Padrões genéricos conhecidos
  if (
    trimmed === 'CPU' ||
    trimmed === 'CPU-' ||
    trimmed === 'CONCE-CPU' ||
    trimmed === 'CONCE-CPU-' ||
    trimmed === 'CONCE-001' ||
    trimmed.startsWith('CPU-CUSTOM') ||
    trimmed.startsWith('COMP-CUSTOM') ||
    trimmed.startsWith('CUSTOM-') ||
    trimmed.startsWith('TEMP-') ||
    trimmed.startsWith('RM-')
  ) {
    return true
  }

  // Padrão de código auto-gerado por etapa/serviço: "CPU-01.01", "CPU-1.1", "CPU-02", "01.01", "1.1", etc.
  if (/^CPU-\d+([.-]\d+)*$/i.test(trimmed)) {
    return true
  }
  if (/^\d+([.-]\d+)+$/.test(trimmed)) {
    return true
  }

  return false
}

/**
 * Constrói uma chave única e isolada para a lixeira/histórico de insumos removidos de um serviço.
 * Indexa por `${budgetId}:${stageId}:${serviceId}` (ou `${stageId}:${serviceId}` ou `${serviceId}`).
 * NUNCA recorre a códigos genéricos (ex: "CPU-01.01", "01.01") para evitar contaminação cruzada.
 */
export function buildServiceTrashKey(
  serviceId: string,
  stageId?: string,
  budgetId?: string,
): string {
  const cleanSrv = (serviceId || '').trim()
  if (!cleanSrv) return ''
  const cleanStage = (stageId || '').trim()
  const cleanBudget = (budgetId || '').trim()

  if (cleanBudget && cleanStage) {
    return `${cleanBudget}:${cleanStage}:${cleanSrv}`
  }
  if (cleanStage) {
    return `${cleanStage}:${cleanSrv}`
  }
  return cleanSrv
}

/**
 * Propaga a atualização de uma composição da biblioteca para todos os orçamentos persistidos.
 * Endurecido: casamento SOMENTE por ID explícito e não-vazio e com correspondência técnica exata
 * de descrição e código técnico canônico (nunca genérico).
 * Se o orçamento for especificado em options.targetBudgetId, propaga APENAS para ele.
 * NUNCA propaga entre serviços sem correspondência exata de escopo ou descrição técnica,
 * e composições com ID personalizado/auto-gerado não casam em cascata.
 */
export function propagateCompositionUpdateToBudgets(
  savedComposition: BudgetComposition,
  options?: { optIn?: boolean; targetBudgetId?: string },
): {
  affectedBudgetsCount: number
  affectedServicesCount: number
} {
  // A propagação é estritamente opt-in para nunca sobrescrever personalizações locais em massa.
  // Se não houver opt-in explícito, retorna sem modificar nenhum orçamento.
  if (!options?.optIn) {
    return { affectedBudgetsCount: 0, affectedServicesCount: 0 }
  }

  if (typeof window === 'undefined' || !savedComposition) {
    return { affectedBudgetsCount: 0, affectedServicesCount: 0 }
  }

  const currentBudgets = getStoredFullBudgets()
  let affectedBudgetsCount = 0
  let affectedServicesCount = 0
  const newCpuCost = calculateCompositionUnitCost(savedComposition)

  const savedCompId = savedComposition.id?.trim()
  const savedCompCode = savedComposition.code?.trim().toUpperCase()
  const savedCompDesc = (savedComposition.description || '').trim().toLowerCase()

  if (!savedCompId || isGenericCompositionCode(savedCompCode)) {
    // Bloqueia propagação se código for genérico ou sem ID explícito
    return { affectedBudgetsCount: 0, affectedServicesCount: 0 }
  }

  const updatedBudgets = currentBudgets.map((budget) => {
    // Se foi definido um targetBudgetId específico, restringe a esse orçamento
    if (options.targetBudgetId && budget.id !== options.targetBudgetId) {
      return budget
    }

    // Regra estrita de segurança: nunca propagar alterações para orçamentos que não estejam em rascunho
    // (ex.: aprovado, em_andamento, vencido, fechado não devem ser alterados em cascata)
    const isDraft =
      (budget.status as string) === 'rascunho' || (budget.status as string) === 'em_analise'
    if (!isDraft) {
      return budget
    }

    let budgetModified = false

    const newStages = budget.stages.map((stage) => {
      let stageModified = false

      const newServices = stage.services.map((service) => {
        const servComp = service.composition
        if (!servComp) return service

        const servCompId = servComp.id?.trim()
        const servCompCode = (servComp.code || '').trim().toUpperCase()
        const servCompDesc = (servComp.description || '').trim().toLowerCase()

        // Propagar APENAS quando o serviço tiver vínculo explícito e confiável com a composição salva
        // (id específico não-derivado-de-template/não-genérico). Se houver qualquer dúvida de vínculo, não propagar.
        const isDerivedFromTemplate =
          !servCompId ||
          servCompId === 'temp' ||
          servCompId.startsWith('comp-custom-') ||
          servCompId.startsWith('comp-srv-') ||
          servCompId.startsWith('comp-sinapi-') ||
          servCompId.startsWith('comp-conce-') ||
          servCompId === 'comp-concreto-fck25' ||
          servCompId === 'comp-armacao-aco-ca50' ||
          servCompId === 'comp-alvenaria-bloco-ceramico' ||
          servCompId === 'comp-emboço-interno' ||
          servCompId === 'comp-pintura-acrilica' ||
          servCompId === 'comp-ponto-eletrico' ||
          servCompId === 'comp-conce-impermeabilizacao' ||
          servCompId === 'comp-escavacao-mecanizada'

        // Endurecido: casamento exige ID idêntico não-derivado E código técnico idêntico E descrição compatível
        const matchesExplicitId = Boolean(
          servCompId && savedCompId && servCompId === savedCompId && !isDerivedFromTemplate,
        )
        const matchesExplicitCode = Boolean(
          savedCompCode &&
          servCompCode &&
          servCompCode === savedCompCode &&
          !isGenericCompositionCode(servCompCode),
        )

        // Se ambos id e código forem idênticos ou código técnico canônico for o mesmo com descrição compatível
        const isEligibleMatch =
          (matchesExplicitId &&
            (!servCompDesc || !savedCompDesc || servCompDesc === savedCompDesc)) ||
          (matchesExplicitCode && servCompDesc && savedCompDesc && servCompDesc === savedCompDesc)

        // Se houver qualquer dúvida de vínculo, não propagar
        if (!isEligibleMatch) {
          return service
        }

        budgetModified = true
        stageModified = true
        affectedServicesCount++

        // NUNCA sobrescrever em cascata o array inputs do serviço (preserva itens locais customizados do serviço)
        const updatedComp: BudgetComposition = {
          ...servComp,
          code: savedComposition.code || servComp.code,
          description: savedComposition.description || servComp.description,
          specialty: savedComposition.specialty || servComp.specialty,
          unit: savedComposition.unit || servComp.unit,
          version: savedComposition.version || servComp.version,
          source: savedComposition.source || servComp.source,
          // Preserva estritamente os inputs já existentes no serviço
          inputs: servComp.inputs ? [...servComp.inputs] : [],
        }

        const isUserManualPrice = service.unitPriceSource === 'Usuário'
        const updatedUnitPrice = isUserManualPrice ? service.unitPrice : newCpuCost
        const updatedSource = isUserManualPrice ? service.unitPriceSource : 'Composição'

        return {
          ...service,
          composition: updatedComp,
          unitPrice: updatedUnitPrice,
          unitPriceSource: updatedSource,
        }
      })

      if (stageModified) {
        return { ...stage, services: newServices }
      }
      return stage
    })

    if (budgetModified) {
      affectedBudgetsCount++
      return {
        ...budget,
        updatedAt: new Date().toISOString(),
        stages: newStages,
      }
    }

    return budget
  })

  if (affectedBudgetsCount > 0) {
    saveFullBudgets(updatedBudgets)
  }

  return { affectedBudgetsCount, affectedServicesCount }
}

/**
 * Normaliza a chave da composição para armazenamento no histórico de itens removidos.
 * - Bloqueia terminantemente códigos genéricos (ex: "CPU-01.01", "01.01", "CPU-", "CONCE-001").
 *   Se for genérico, NÃO o usa como chave de composição para não colidir entre serviços.
 * - Prioriza o código técnico canônico (ex: "SINAPI-94964", "CONCE-IMP-002") quando NÃO for genérico.
 * - Para chaves compostas de serviço (ex: "budget-1:stage-1:serv-1" ou "serv-1"), preserva integralmente.
 */
export function getCompositionStorageKey(
  comp: Partial<BudgetComposition> | string | undefined | null,
): string {
  if (!comp) return ''
  if (typeof comp === 'string') {
    const trimmed = comp.trim()
    const upper = trimmed.toUpperCase()
    if (upper === 'GLOBAL' || upper === 'TEMP' || upper === 'UNDEFINED' || upper === 'NULL') {
      return ''
    }
    // Se for uma chave de serviço (contém dois-pontos ou prefixo serv-/stage-)
    if (trimmed.includes(':') || trimmed.startsWith('serv-') || trimmed.startsWith('stage-')) {
      return trimmed
    }
    // Se for um código genérico, descarta para evitar colisão entre serviços
    if (isGenericCompositionCode(trimmed)) {
      return ''
    }
    return upper
  }
  // Objeto Partial<BudgetComposition>
  if (comp.code && comp.code.trim() && !isGenericCompositionCode(comp.code)) {
    return comp.code.trim().toUpperCase()
  }
  if (comp.id && comp.id.trim()) {
    const trimmedId = comp.id.trim()
    const upperId = trimmedId.toUpperCase()
    if (upperId !== 'GLOBAL' && upperId !== 'TEMP' && !trimmedId.startsWith('comp-custom-')) {
      return trimmedId
    }
  }
  return ''
}

/**
 * Obtém insumos removidos gravados em localStorage.
 * Endurecido para eliminar cross-contaminação:
 * - Se compositionKey for informada, busca estritamente pela chave normalizada.
 *   Se a chave de busca for vazia ou inválida, retorna array vazio para JAMAIS vazar
 *   itens de outras composições.
 * - Registros legados antigos com chave 'global' ou vazia são ignorados quando
 *   se busca por uma composição específica.
 * - Se compositionKey NÃO for informada, retorna a lista completa (para auditoria ou inspeção geral).
 */
export function getRemovedCompositionInputs(
  compositionKey?: string,
): RemovedCompositionInputItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS_BUDGETS.REMOVED_COMPOSITION_INPUTS)
    if (!raw) return []
    const parsed: RemovedCompositionInputItem[] = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    if (compositionKey === undefined) return parsed

    const rawTarget = (compositionKey || '').trim()
    if (!rawTarget) return []

    // 1. Se for uma chave de serviço (ex.: "orc-1:stage-1:serv-1" ou "serv-1")
    if (
      rawTarget.includes(':') ||
      rawTarget.startsWith('serv-') ||
      rawTarget.startsWith('stage-')
    ) {
      return parsed.filter((item) => {
        const itemRaw = (item.compositionKey || '').trim()
        if (itemRaw === rawTarget) return true
        // Fallback para sufixo de serviceId quando item gravou `${budgetId}:${stageId}:${serviceId}`
        if (rawTarget.includes(':')) {
          const parts = rawTarget.split(':')
          const lastSrvId = parts[parts.length - 1]
          if (itemRaw === lastSrvId || itemRaw.endsWith(`:${lastSrvId}`)) return true
        } else {
          // rawTarget é apenas serviceId
          if (itemRaw.endsWith(`:${rawTarget}`)) return true
        }
        return false
      })
    }

    // 2. Chave normalizada para composições da biblioteca ou código técnico canônico
    const targetKey = getCompositionStorageKey(compositionKey)
    if (!targetKey) {
      // Se era código genérico ("CPU-01.01", "01.01") ou inválido: bloqueia para evitar contaminação
      return []
    }

    return parsed.filter((item) => {
      const itemKey = getCompositionStorageKey(item.compositionKey)
      return Boolean(itemKey && itemKey === targetKey)
    })
  } catch {
    return []
  }
}

/**
 * Salva a lista completa de insumos removidos em localStorage.
 */
export function saveAllRemovedCompositionInputs(items: RemovedCompositionInputItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEYS_BUDGETS.REMOVED_COMPOSITION_INPUTS,
      JSON.stringify(items.slice(0, 100)), // Limita aos 100 mais recentes
    )
  } catch {
    /* ignore storage quota */
  }
}

/**
 * Registra a exclusão de um insumo de uma composição no histórico persistente de localStorage.
 * Garante que a composição pai seja devidamente identificada (chave confiável). Se a chave
 * for vazia, gera uma chave estável contextual para não vazar e permitir restauração segura.
 */
export function recordRemovedCompositionInput(
  compositionKey: string,
  input: BudgetInput,
  originalIndex?: number,
  removedBy: string = 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
): RemovedCompositionInputItem {
  const rawKey = (compositionKey || '').trim()
  let finalKey = ''

  // 1. Se já for chave de serviço isolada (com dois-pontos ou ID de serviço)
  if (rawKey.includes(':') || rawKey.startsWith('serv-') || rawKey.startsWith('stage-')) {
    finalKey = rawKey
  } else {
    // 2. Tenta chave canônica não-genérica
    finalKey = getCompositionStorageKey(rawKey)
    if (!finalKey) {
      // Se for genérica ou vazia, gera identificador isolado de contexto
      finalKey = `COMP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    }
  }

  const all = getRemovedCompositionInputs()

  // Evita duplicata idêntica sequencial
  const record: RemovedCompositionInputItem = {
    id: `rm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    compositionKey: finalKey,
    input: { ...input },
    removedAt: new Date().toISOString(),
    removedBy,
    originalIndex,
  }

  const updated = [record, ...all]
  saveAllRemovedCompositionInputs(updated)
  return record
}

/**
 * Remove um registro específico do histórico de excluídos (usado após restauração ou descarte permanente).
 */
export function purgeRemovedCompositionInputRecord(recordId: string): void {
  const all = getRemovedCompositionInputs()
  const filtered = all.filter((r) => r.id !== recordId)
  saveAllRemovedCompositionInputs(filtered)
}

/**
 * Limpa o histórico de insumos removidos de uma composição (ou geral se compositionKey não informada).
 * Endurecido para não remover itens de outras composições quando a chave for inválida.
 */
export function clearRemovedCompositionInputs(compositionKey?: string): void {
  if (!compositionKey) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS_BUDGETS.REMOVED_COMPOSITION_INPUTS)
    }
    return
  }
  const rawKey = compositionKey.trim()
  const all = getRemovedCompositionInputs()

  if (rawKey.includes(':') || rawKey.startsWith('serv-') || rawKey.startsWith('stage-')) {
    const filtered = all.filter((r) => {
      const rKey = (r.compositionKey || '').trim()
      if (rKey === rawKey) return false
      if (
        rawKey.includes(':') &&
        (rKey.endsWith(`:${rawKey.split(':').pop()}`) || rawKey.endsWith(`:${rKey}`))
      ) {
        return false
      }
      return true
    })
    saveAllRemovedCompositionInputs(filtered)
    return
  }

  const normKey = getCompositionStorageKey(compositionKey)
  if (!normKey) return

  const filtered = all.filter((r) => getCompositionStorageKey(r.compositionKey) !== normKey)
  saveAllRemovedCompositionInputs(filtered)
}
