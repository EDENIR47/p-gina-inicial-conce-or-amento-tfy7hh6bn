/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Persistência e Sementes de Orçamentos Completos em localStorage
 */

import { FullBudget } from '@/types/budgetEngine'
import { CONCE_CANONICAL_COMPOSITIONS } from './compositionsData'
import { DEFAULT_BDI_CONFIG } from './budgetEngine'
import { BRAZIL_STATES_CHARGES } from './chargesData'

export const STORAGE_KEYS_BUDGETS = {
  FULL_BUDGETS: 'conce_full_budgets',
  COMPOSITIONS_LIBRARY: 'conce_compositions_library',
  ACTIVE_BUDGET_ID: 'conce_active_budget_id',
} as const

/**
 * Remove qualquer orçamento de teste/demonstração que tenha sido gravado anteriormente em localStorage,
 * garantindo a preservação exclusiva dos orçamentos reais ("Andreia", "Jader", "Tomaz Gonzaga").
 */
export function purgeTestBudgetsFromStorage(): void {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS)
  if (!raw) return
  try {
    const list = JSON.parse(raw)
    if (Array.isArray(list)) {
      const real = list.filter((b: FullBudget) => !isDemoOrTestBudget(b))
      localStorage.setItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS, JSON.stringify(real))
    }
  } catch {
    /* ignore */
  }
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
      calculatedBdi: 24.32,
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
export function isDemoOrTestBudget(budget: FullBudget): boolean {
  // Orçamentos reais sagrados:
  const clientName = (budget.client?.name || '').toLowerCase()
  const workName = (budget.work?.name || '').toLowerCase()
  const address = (budget.work?.address || '').toLowerCase()

  if (
    clientName.includes('andreia') ||
    clientName.includes('jader') ||
    address.includes('tomaz gonzaga') ||
    budget.id === 'budget-conce-001'
  ) {
    return false
  }

  // Exemplos fictícios de teste / demonstração conhecidos
  if (
    budget.id === 'budget-public-002' ||
    budget.code === 'ORC-PUB-2025-014' ||
    clientName.includes('secretaria de obras e serviços públicos') ||
    workName.includes('escola técnica estadual') ||
    workName.includes('bloco pedagógico') ||
    clientName.includes('incorporadora horizonte') ||
    clientName.includes('família albuquerque') ||
    clientName.includes('grupo vértice') ||
    clientName.includes('secretaria mun. de obras') ||
    clientName.includes('condomínio altos do morumbi')
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
    return [createCanonicalDemoBudget()]
  }

  const raw = localStorage.getItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filtrar e remover orçamentos de teste fictícios (ex: budget-public-002),
        // preservando os orçamentos reais do usuário ("Andreia", "Jader", "Rua Tomaz Gonzaga 610").
        const realBudgets = parsed.filter((b: FullBudget) => !isDemoOrTestBudget(b))

        let hasFixed = false
        if (realBudgets.length !== parsed.length) {
          hasFixed = true
        }

        const listToProcess = realBudgets.length > 0 ? realBudgets : [createCanonicalDemoBudget()]
        if (realBudgets.length === 0) {
          hasFixed = true
        }

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
          return updatedBudget
        })
        if (hasFixed) {
          saveFullBudgets(sanitized)
        }
        return sanitized
      }
    } catch {
      // Ignora erro
    }
  }

  const initial = [createCanonicalDemoBudget()]
  localStorage.setItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS, JSON.stringify(initial))
  return initial
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
