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
    title: 'Construção Civil — Edifício Residencial Horizonte Jardins',
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
      tenderNumber: 'LIC-2025/044-SP',
      contractNumber: 'CT-9820/2025',
      agency: 'Prefeitura do Município de São Paulo - SIURB',
      modality: 'Concorrência',
      sinapiReferenceMonth: '04/2025',
      sicroReferenceMonth: '03/2025',
      hasDisallowanceClause: true,
    },
    chargesConfig: {
      uf: 'SP',
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
        totalTaxes: 7.65,
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
export function createPublicDemoBudget(): FullBudget {
  const compConcreto = CONCE_CANONICAL_COMPOSITIONS[0]
  const compArmacao = CONCE_CANONICAL_COMPOSITIONS[1]
  const compAlvenaria = CONCE_CANONICAL_COMPOSITIONS[2]

  return {
    id: 'budget-public-002',
    code: 'ORC-PUB-2025-014',
    title: 'Edificação Escolar Técnica Estadual — Bloco Pedagógico e Poliesportivo',
    status: 'em_analise',
    createdAt: '2025-04-14',
    updatedAt: new Date().toISOString(),
    author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
    paymentTerms:
      'Medições mensais com liquidação em até 30 dias após emissão da NF e ateste fiscal.',
    validityDays: 60,
    commercialNotes:
      'Proposta em conformidade com a Lei Federal nº 14.133/2021 e Acórdão 2.622/2013-TCU.',
    client: {
      name: 'Secretaria de Obras e Serviços Públicos do Estado',
      document: '46.379.400/0001-50',
      email: 'licitacoes@obras.gov.br',
      phone: '(11) 3218-4000',
      address: 'Palácio dos Bandeirantes, Av. Morumbi 4500',
      city: 'São Paulo',
      state: 'SP',
    },
    work: {
      name: 'Construção de Escola Técnica Estadual — 12 Salas e Quadra Poliesportiva',
      address: 'Estrada do Campo Limpo, 890',
      city: 'São Paulo',
      state: 'SP',
      description:
        'Edificação escolar completa com bloco administrativo, salas de aula, laboratórios e quadra coberta.',
      deadlineMonths: 12,
      startDate: '2025-07-01',
      expectedEndDate: '2026-06-30',
      totalAreaM2: 3200.0,
    },
    publicWork: {
      enabled: true,
      tenderNumber: 'EDITAL-CP-009/2025-FDE',
      contractNumber: 'CT-FDE-1044/2025',
      agency: 'FDE - Fundação para o Desenvolvimento da Educação',
      modality: 'Concorrência',
      sinapiReferenceMonth: '04/2025 com desoneração',
      sicroReferenceMonth: '03/2025',
      hasDisallowanceClause: true,
    },
    chargesConfig: {
      uf: 'SP',
      isRelieved: true, // Com desoneração (77.97% em SP)
      taxRegime: 'com_desoneracao',
      simplesDasRate: 0,
    },
    bdiConfig: {
      administrationCentral: 3.8,
      risk: 1.1,
      insuranceAndGuarantee: 0.8,
      financialExpenses: 1.05,
      profit: 6.85,
      taxes: {
        iss: 3.0,
        pis: 0.65,
        cofins: 3.0,
        inssOrCprb: 4.5, // CPRB Lei 12.546/2011 desonerado
        totalTaxes: 11.15,
      },
      calculatedBdi: 26.15,
      differentiatedEquipBdi: 14.5,
    },
    stages: [
      {
        id: 'stage-pub-1',
        order: 1,
        code: '01',
        name: 'ESTRUTURA DE CONCRETO ARMADO',
        notes: 'Conforme projeto executivo estrutural FDE-2025',
        services: [
          {
            id: 'serv-pub-1',
            order: 1,
            code: '01.01',
            description: 'Concreto FCK 25MPa com betoneira',
            unit: 'm³',
            quantity: 320.0,
            composition: compConcreto,
          },
          {
            id: 'serv-pub-2',
            order: 2,
            code: '01.02',
            description: 'Aço CA-50 10mm montado e posicionado',
            unit: 'kg',
            quantity: 22500.0,
            composition: compArmacao,
          },
        ],
      },
      {
        id: 'stage-pub-2',
        order: 2,
        code: '02',
        name: 'ALVENARIAS E FECHAMENTOS',
        notes: 'Paredes em bloco cerâmico e divisórias técnicas',
        services: [
          {
            id: 'serv-pub-3',
            order: 1,
            code: '02.01',
            description: 'Alvenaria de vedação 9x19x19cm argamassa mista',
            unit: 'm²',
            quantity: 1400.0,
            composition: compAlvenaria,
          },
        ],
      },
    ],
  }
}

/**
 * Lê todos os orçamentos completos persistidos
 */
export function getStoredFullBudgets(): FullBudget[] {
  if (typeof window === 'undefined') {
    return [createCanonicalDemoBudget(), createPublicDemoBudget()]
  }

  const raw = localStorage.getItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migração de sanitização:
        // - No Simples Nacional: regra do usuário Eng. Edenir Souza da Rosa:
        //   Encargos trabalhistas (Grupos A, B, C e D) devem ficar ZERADOS (0,00%).
        //   Tributação exclusiva pelo DAS preenchido manualmente.
        // - Nos demais regimes (sem ou com desoneração): se todos os grupos somarem 0 sem isExplicitZero,
        //   restaura os grupos oficiais SINAPI da UF para proteger integridade.
        let hasFixed = false
        const sanitized = parsed.map((b: FullBudget) => {
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

          // 2. Sanitização tributária e encargos
          if (regime === 'simples_nacional') {
            const hasNonZeroGroups =
              (updatedBudget.chargesConfig?.customGroupA ?? 0) > 0 ||
              (updatedBudget.chargesConfig?.customGroupB ?? 0) > 0 ||
              (updatedBudget.chargesConfig?.customGroupC ?? 0) > 0 ||
              (updatedBudget.chargesConfig?.customGroupD ?? 0) > 0

            if (hasNonZeroGroups || !updatedBudget.chargesConfig?.isExplicitZero) {
              hasFixed = true
              return {
                ...updatedBudget,
                chargesConfig: {
                  ...updatedBudget.chargesConfig,
                  taxRegime: 'simples_nacional' as const,
                  customGroupA: 0,
                  customGroupB: 0,
                  customGroupC: 0,
                  customGroupD: 0,
                  isExplicitZero: true,
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
                const uf = updatedBudget.chargesConfig.uf || 'SP'
                const isRel = regime === 'com_desoneracao'
                const stateData = BRAZIL_STATES_CHARGES[uf] || BRAZIL_STATES_CHARGES['SP']
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
      // Ignora erro e regenera
    }
  }

  const initial = [createCanonicalDemoBudget(), createPublicDemoBudget()]
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
