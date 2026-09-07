/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Persistência e Sementes de Orçamentos Completos em localStorage
 */

import { FullBudget } from '@/types/budgetEngine'
import { CONCE_CANONICAL_COMPOSITIONS } from './compositionsData'
import { DEFAULT_BDI_CONFIG } from './budgetEngine'

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
    status: 'em_andamento',
    createdAt: '2025-04-10',
    updatedAt: new Date().toISOString(),
    author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
    client: {
      name: 'Incorporadora Horizonte Empreendimentos S/A',
      document: '42.871.932/0001-50',
      email: 'engenharia@horizonteimoveis.com.br',
      phone: '(11) 3455-8900',
      address: 'Avenida Brigadeiro Faria Lima, 2800 - Itaim Bibi',
      city: 'São Paulo',
      state: 'SP',
    },
    work: {
      name: 'Edifício Residencial Horizonte Jardins — Bloco A',
      address: 'Rua Oscar Freire, 1420 - Cerqueira César',
      city: 'São Paulo',
      state: 'SP',
      description:
        'Construção de edifício residencial multifamiliar com 18 pavimentos tipo, subsolo de garagens e área de lazer suspensa no rooftop.',
      deadlineMonths: 18,
      startDate: '2025-06-01',
      expectedEndDate: '2026-11-30',
      totalAreaM2: 6450.0,
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
      isRelieved: false, // Sem desoneração (84.53% em SP)
      taxRegime: 'simples_nacional', // CONCE trabalha hoje no Simples Nacional
      simplesDasRate: 0, // Alíquota DAS editável pelo usuário
      customGroupA: 16.8,
      customGroupB: 44.15,
      customGroupC: 16.48,
      customGroupD: 7.1,
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
    status: 'em_analise',
    createdAt: '2025-04-14',
    updatedAt: new Date().toISOString(),
    author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
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
        // Migração de sanitização: se houver orçamento no Simples Nacional com grupos zerados,
        // repara para não persistir taxa de encargos zerada
        let hasFixed = false
        const sanitized = parsed.map((b: FullBudget) => {
          if (
            b.chargesConfig?.taxRegime === 'simples_nacional' &&
            b.chargesConfig.customGroupA !== undefined
          ) {
            const sum =
              (b.chargesConfig.customGroupA || 0) +
              (b.chargesConfig.customGroupB || 0) +
              (b.chargesConfig.customGroupC || 0) +
              (b.chargesConfig.customGroupD || 0)
            if (sum === 0 && !b.chargesConfig.isExplicitZero) {
              hasFixed = true
              return {
                ...b,
                chargesConfig: {
                  ...b.chargesConfig,
                  customGroupA: 16.8,
                  customGroupB: 44.15,
                  customGroupC: 16.48,
                  customGroupD: 7.1,
                },
              }
            }
          }
          return b
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
