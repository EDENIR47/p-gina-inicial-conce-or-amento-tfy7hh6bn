import { describe, it, expect, beforeEach } from 'vitest'
import {
  getStoredFullBudgets,
  purgeTestBudgetsFromStorage,
  isDemoOrTestBudget,
  createCanonicalDemoBudget,
  resetAllLocalConceData,
  STORAGE_KEYS_BUDGETS,
} from './budgetsStorage'
import { FullBudget } from '@/types/budgetEngine'

describe('budgetsStorage — Limpeza de demonstração e primeiro acesso', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('(a) primeiro acesso sem seed demo retorna lista vazia (sem semeadura automática)', () => {
    // Garante que o localStorage está virgem
    expect(localStorage.getItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS)).toBeNull()

    const list = getStoredFullBudgets()

    // Não deve semear nada automaticamente
    expect(list).toEqual([])
    expect(list.length).toBe(0)
    // O storage não deve ter sido populado com orçamento fictício silencioso
    expect(localStorage.getItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS)).toBeNull()
  })

  it('(b) registros demo/órfãos são identificados e filtrados na carga sem apagar dados reais', () => {
    // Cria um orçamento real do cliente Andreia e Jader
    const realBudget: FullBudget = {
      id: 'orc-real-andreia-001',
      code: 'ORC-2025-099',
      title: 'Reforma Residencial Apto 1803',
      status: 'em_andamento',
      author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      createdAt: '2025-04-10',
      updatedAt: '2025-04-10T10:00:00Z',
      client: {
        name: 'Andreia de Oliveira da Costa e Jader da Costa',
        document: '000.000.000-00',
        email: 'andreia@example.com',
        phone: '51999999999',
        address: 'Rua Tomaz Gonzaga, 610, Apto 1803',
        city: 'Porto Alegre',
        state: 'RS',
      },
      work: {
        name: 'Reforma e Estrutura Residencial — Apto 1803',
        address: 'Rua Tomaz Gonzaga, 610, Apartamento 1803',
        city: 'Porto Alegre',
        state: 'RS',
        description: 'Reforma residencial executiva',
        deadlineMonths: 6,
        startDate: '2025-05-01',
      },
      chargesConfig: {
        uf: 'RS',
        isRelieved: false,
        taxRegime: 'simples_nacional',
        simplesDasRate: 11.0,
        customGroupA: 0,
        customGroupB: 0,
        customGroupC: 0,
        customGroupD: 0,
        isExplicitZero: true,
      },
      bdiConfig: {
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
        calculatedBdi: 28.5,
      },
      publicWork: {
        enabled: false,
        tenderNumber: '',
        contractNumber: '',
        agency: '',
        modality: 'Concorrência',
        sinapiReferenceMonth: '04/2025',
        hasDisallowanceClause: false,
      },
      stages: [],
    }

    // Cria orçamentos fictícios conhecidos (antigo seed público e corporativo)
    const demoBudgetPublic: FullBudget = {
      ...createCanonicalDemoBudget(),
      id: 'budget-public-002',
      code: 'ORC-PUB-2025-014',
      title: 'Obra Pública — Escola Técnica Estadual',
      client: {
        name: 'Secretaria Mun. de Obras e Serviços Públicos',
        document: '',
        email: '',
        phone: '',
        address: '',
        city: 'Porto Alegre',
        state: 'RS',
      },
      work: {
        name: 'Escola Técnica Estadual — Bloco Pedagógico',
        address: 'Av. Ipiranga, 4500',
        city: 'Porto Alegre',
        state: 'RS',
        description: 'Obra fictícia de teste',
        deadlineMonths: 12,
        startDate: '2025-05-01',
      },
    }

    const demoBudgetHorizonte: FullBudget = {
      ...createCanonicalDemoBudget(),
      id: 'demo-corp-001',
      code: 'ORC-DEMO-001',
      title: 'Edifício Centro #2',
      client: {
        name: 'Incorporadora Horizonte',
        document: '',
        email: '',
        phone: '',
        address: '',
        city: 'São Paulo',
        state: 'SP',
      },
      work: {
        name: 'Edifício Centro',
        address: 'Av. Paulista, 1000',
        city: 'São Paulo',
        state: 'SP',
        description: 'Obra fictícia',
        deadlineMonths: 12,
        startDate: '2025-05-01',
      },
    }

    // Grava no storage misturando orçamentos demo e real
    localStorage.setItem(
      STORAGE_KEYS_BUDGETS.FULL_BUDGETS,
      JSON.stringify([demoBudgetPublic, realBudget, demoBudgetHorizonte]),
    )
    localStorage.setItem('conce_demo_data', JSON.stringify({ old: true }))

    // Executa a purga
    const cleanup = purgeTestBudgetsFromStorage()
    expect(cleanup.demoBudgetsRemoved).toBe(2)
    expect(cleanup.obsoleteKeysRemoved).toBeGreaterThanOrEqual(1)

    // Carrega os orçamentos persistidos
    const loaded = getStoredFullBudgets()

    // Deve conter APENAS o orçamento real do usuário
    expect(loaded.length).toBe(1)
    expect(loaded[0].id).toBe('orc-real-andreia-001')
    expect(loaded[0].client.name).toContain('Andreia de Oliveira da Costa')
    expect(loaded[0].work.address).toContain('Rua Tomaz Gonzaga, 610')
  })

  it('(c) retrocompatibilidade: um localStorage com orçamento real antigo carrega intacto com DAS 11%', () => {
    const legacyRealBudget: FullBudget = {
      id: 'budget-conce-001',
      code: 'ORC-2025-001',
      title: 'Reforma e Estrutura Residencial — Apto 1803',
      status: 'em_andamento',
      author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      createdAt: '2025-04-10',
      updatedAt: '2025-04-10T12:00:00Z',
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
        description: 'Reforma e execução estrutural residencial.',
        deadlineMonths: 6,
        startDate: '2025-05-01',
      },
      chargesConfig: {
        uf: 'RS',
        isRelieved: false,
        taxRegime: 'simples_nacional',
        simplesDasRate: 0, // simula DAS zerado legado
        customGroupA: 0,
        customGroupB: 0,
        customGroupC: 0,
        customGroupD: 0,
        isExplicitZero: false,
      },
      bdiConfig: {
        administrationCentral: 4.5,
        risk: 1.25,
        insuranceAndGuarantee: 0.85,
        financialExpenses: 1.15,
        profit: 7.8,
        taxes: {
          iss: 0,
          pis: 0,
          cofins: 0,
          inssOrCprb: 0,
          totalTaxes: 0,
          simplesDas: 0,
        },
        calculatedBdi: 15.0,
      },
      publicWork: {
        enabled: false,
        tenderNumber: '',
        contractNumber: '',
        agency: '',
        modality: 'Concorrência',
        sinapiReferenceMonth: '04/2025',
        hasDisallowanceClause: false,
      },
      stages: [],
    }

    localStorage.setItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS, JSON.stringify([legacyRealBudget]))

    const loaded = getStoredFullBudgets()
    expect(loaded.length).toBe(1)
    expect(loaded[0].client.name).toBe('Andreia de Oliveira da Costa e Jader da Costa')
    expect(loaded[0].work.address).toBe('Rua Tomaz Gonzaga, 610, Apartamento 1803')

    // Deve aplicar a regra de ouro DAS 11% da CONCE
    expect(loaded[0].chargesConfig.simplesDasRate).toBe(11.0)
    expect(loaded[0].bdiConfig.taxes?.simplesDas).toBe(11.0)
  })

  it('isDemoOrTestBudget identifica corretamente orçamentos demo e protege os reais', () => {
    // Orçamento real
    const real: any = {
      id: 'abc-123',
      code: 'ORC-001',
      client: { name: 'Jader da Costa' },
      work: { name: 'Reforma Ap 1803', address: 'Tomaz Gonzaga' },
    }
    expect(isDemoOrTestBudget(real)).toBe(false)

    // Orçamento demo
    const demo1: any = {
      id: 'demo-999',
      code: 'ORC-DEMO-001',
      client: { name: 'Família Albuquerque' },
      work: { name: 'Residência Jardins' },
    }
    expect(isDemoOrTestBudget(demo1)).toBe(true)

    const demo2: any = {
      id: 'xyz-888',
      code: 'ORC-002',
      client: { name: 'Incorporadora Horizonte' },
      work: { name: 'Edifício Centro' },
    }
    expect(isDemoOrTestBudget(demo2)).toBe(true)
  })

  it('resetAllLocalConceData limpa as chaves locais do CONCE', () => {
    localStorage.setItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS, '[]')
    localStorage.setItem('conce_demo_data', '{"demo":true}')
    localStorage.setItem('conce_audit_logs', '[]')

    resetAllLocalConceData()

    expect(localStorage.getItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS)).toBeNull()
    expect(localStorage.getItem('conce_demo_data')).toBeNull()
    expect(localStorage.getItem('conce_audit_logs')).toBeNull()
  })
})
