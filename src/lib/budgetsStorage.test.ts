import { describe, it, expect, beforeEach } from 'vitest'
import {
  getStoredFullBudgets,
  purgeTestBudgetsFromStorage,
  isDemoOrTestBudget,
  createCanonicalDemoBudget,
  resetAllLocalConceData,
  copyStageToBudget,
  STORAGE_KEYS_BUDGETS,
} from './budgetsStorage'
import { FullBudget, BudgetStage } from '@/types/budgetEngine'

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

  it('(d) nenhum resíduo demo sobrevive e dados reais preservam detalhes originais', () => {
    const realOther: FullBudget = {
      id: 'orc-real-jader-002',
      code: 'ORC-2025-055',
      title: 'Obra Residencial Tomaz Gonzaga',
      status: 'aprovado',
      author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      createdAt: '2025-04-12',
      updatedAt: '2025-04-12T12:00:00Z',
      client: {
        name: 'Jader da Costa',
        document: '',
        email: '',
        phone: '',
        address: 'Rua Tomaz Gonzaga',
        city: 'Porto Alegre',
        state: 'RS',
      },
      work: {
        name: 'Apartamento 1803',
        address: 'Rua Tomaz Gonzaga, 610',
        city: 'Porto Alegre',
        state: 'RS',
        description: 'Reforma e execução',
        startDate: '2025-05-01',
        deadlineMonths: 4,
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

    localStorage.setItem(STORAGE_KEYS_BUDGETS.FULL_BUDGETS, JSON.stringify([realOther]))

    const list = getStoredFullBudgets()
    expect(list.length).toBe(1)
    expect(list[0].id).toBe('orc-real-jader-002')
    expect(list[0].client.name).toBe('Jader da Costa')
    expect(list[0].work.address).toBe('Rua Tomaz Gonzaga, 610')
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
      id: 'budget-public-002',
      code: 'ORC-PUB-2025-014',
      client: { name: 'Prefeitura' },
      work: { name: 'Edifício Centro' },
    }
    expect(isDemoOrTestBudget(demo2)).toBe(true)

    // Obras fictícias expandidas e clientes de demonstração adicionais
    const demo3: any = {
      id: 'orc-15',
      code: 'ORC-0015/2025',
      client: { name: 'Cliente Desconhecido' },
      work: { name: 'Reforma Comercial Paulista' },
    }
    expect(isDemoOrTestBudget(demo3)).toBe(true)

    const demo4: any = {
      id: 'custom-id-99',
      code: 'ORC-X-99',
      client: { name: 'Eng. Marcelo Peixoto' },
      work: { name: 'Construção Galpão Logístico #2' },
    }
    expect(isDemoOrTestBudget(demo4)).toBe(true)
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

  it('copyStageToBudget copia etapa com desacoplamento total de IDs, resequenciamento e auto-save no destino', () => {
    const baseClient = {
      name: 'Cliente Origem',
      document: '',
      email: '',
      phone: '',
      address: '',
      city: 'Porto Alegre',
      state: 'RS',
    }

    const baseWork = {
      name: 'Obra Origem',
      address: '',
      city: 'Porto Alegre',
      state: 'RS',
      description: '',
      startDate: '2025-05-01',
      deadlineMonths: 6,
    }

    const sourceBudget: FullBudget = {
      id: 'orc-origem-001',
      code: 'ORC-ORIGEM',
      title: 'Obra Origem',
      status: 'em_andamento',
      author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      createdAt: '2025-04-10',
      updatedAt: '2025-04-10T10:00:00Z',
      client: { ...baseClient, name: 'Cliente Origem' },
      work: { ...baseWork, name: 'Obra Origem' },
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
          iss: 0,
          pis: 0,
          cofins: 0,
          inssOrCprb: 0,
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
      stages: [
        {
          id: 'stage-origem-1',
          code: '01',
          order: 1,
          name: 'Demolições e Retiradas',
          services: [
            {
              id: 'serv-origem-101',
              code: '01.01',
              order: 1,
              description: 'Demolição de piso cerâmico existente',
              quantity: 25.5,
              unit: 'm²',
              unitPrice: 35.0,
              unitPriceSource: 'Usuário',
              composition: {
                id: 'comp-origem-101',
                code: 'CPU-DEM-01',
                description: 'Demolição de piso cerâmico',
                unit: 'm²',
                version: 'v1.0',
                specialty: 'Demolição',
                source: 'CONCE',
                inputs: [
                  {
                    id: 'inp-origem-1001',
                    code: 'SINAPI-88316',
                    description: 'Servente com encargos complementares',
                    category: 'mao_de_obra',
                    coefficient: 0.8,
                    unit: 'H',
                    unitCost: 22.5,
                    source: 'SINAPI',
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const targetBudget: FullBudget = {
      id: 'orc-destino-002',
      code: 'ORC-DESTINO',
      title: 'Obra Destino',
      status: 'em_andamento',
      author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      createdAt: '2025-04-10',
      updatedAt: '2025-04-10T10:00:00Z',
      client: { ...baseClient, name: 'Cliente Destino' },
      work: { ...baseWork, name: 'Obra Destino' },
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
          iss: 0,
          pis: 0,
          cofins: 0,
          inssOrCprb: 0,
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
      stages: [
        {
          id: 'stage-destino-1',
          code: '01',
          order: 1,
          name: 'Serviços Preliminares',
          services: [
            {
              id: 'serv-destino-101',
              code: '01.01',
              order: 1,
              description: 'Placa de obra em lona com estrutura de madeira',
              quantity: 1,
              unit: 'un',
              unitPrice: 450.0,
              composition: {
                id: 'comp-destino-101',
                code: 'CPU-PRE-01',
                description: 'Placa de obra',
                unit: 'un',
                version: 'v1.0',
                specialty: 'Preliminares',
                source: 'CONCE',
                inputs: [],
              },
            },
          ],
        },
      ],
    }

    // Persiste os dois orçamentos no localStorage
    localStorage.setItem(
      STORAGE_KEYS_BUDGETS.FULL_BUDGETS,
      JSON.stringify([sourceBudget, targetBudget]),
    )

    const stageToCopy = sourceBudget.stages[0]
    const result = copyStageToBudget(sourceBudget.id, targetBudget.id, stageToCopy)

    expect(result.success).toBe(true)
    expect(result.targetBudget).toBeDefined()
    expect(result.copiedStage).toBeDefined()

    // 1. Orçamento de destino agora tem 2 etapas (não sobrescreveu a primeira)
    const updatedTarget = result.targetBudget!
    expect(updatedTarget.stages.length).toBe(2)
    expect(updatedTarget.stages[0].id).toBe('stage-destino-1')
    expect(updatedTarget.stages[0].code).toBe('01')

    // 2. A etapa copiada entrou no fim e com numeração correta re-sequenciada
    const copiedStageInDest = updatedTarget.stages[1]
    expect(copiedStageInDest.code).toBe('02')
    expect(copiedStageInDest.order).toBe(2)
    expect(copiedStageInDest.name).toBe('Demolições e Retiradas')

    // 3. Regra CRÍTICA de Desacoplamento de IDs:
    // O ID da etapa copiada DEVE ser diferente do ID de origem
    expect(copiedStageInDest.id).not.toBe(stageToCopy.id)

    // O serviço copiado tem ID novo, código resequenciado (02.01) e preserva dados
    expect(copiedStageInDest.services.length).toBe(1)
    const copiedSrv = copiedStageInDest.services[0]
    expect(copiedSrv.id).not.toBe(stageToCopy.services[0].id)
    expect(copiedSrv.code).toBe('02.01')
    expect(copiedSrv.order).toBe(1)
    expect(copiedSrv.description).toBe('Demolição de piso cerâmico existente')
    expect(copiedSrv.quantity).toBe(25.5)
    expect(copiedSrv.unit).toBe('m²')
    expect(copiedSrv.unitPrice).toBe(35.0)

    // A composição copiada tem ID novo
    expect(copiedSrv.composition.id).not.toBe(stageToCopy.services[0].composition.id)

    // O insumo da composição copiada tem ID novo
    expect(copiedSrv.composition.inputs.length).toBe(1)
    const copiedInput = copiedSrv.composition.inputs[0]
    expect(copiedInput.id).not.toBe(stageToCopy.services[0].composition.inputs[0].id)
    expect(copiedInput.code).toBe('SINAPI-88316')
    expect(copiedInput.coefficient).toBe(0.8)
    expect(copiedInput.unitCost).toBe(22.5)

    // 4. Verificação no localStorage: o orçamento destino foi salvo
    const storedBudgets = getStoredFullBudgets()
    const storedDest = storedBudgets.find((b) => b.id === targetBudget.id)
    expect(storedDest).toBeDefined()
    expect(storedDest?.stages.length).toBe(2)

    // O orçamento de origem NÃO teve suas etapas alteradas
    const storedSource = storedBudgets.find((b) => b.id === sourceBudget.id)
    expect(storedSource?.stages.length).toBe(1)
  })
})
