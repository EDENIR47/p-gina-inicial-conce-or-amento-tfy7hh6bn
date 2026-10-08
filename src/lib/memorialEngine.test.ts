import { describe, it, expect } from 'vitest'
import {
  generateServiceTechnicalSpecification,
  generateDefaultGeneralIntroduction,
  buildMemorialDocumentData,
} from './memorialEngine'
import { FullBudget, BudgetStage, BudgetService } from '@/types/budgetEngine'

describe('memorialEngine', () => {
  const mockServiceWithComposition: BudgetService = {
    id: 'srv-1',
    order: 1,
    code: '01.01',
    description: 'Assentamento de porcelanato polido 90x90 em piso',
    unit: 'm²',
    quantity: 150,
    composition: {
      id: 'comp-1',
      code: 'CONCE-PORC-01',
      description: 'Porcelanato 90x90 assentado com argamassa AC-III',
      specialty: 'Revestimentos',
      unit: 'm²',
      source: 'CONCE',
      version: 'v1.0',
      inputs: [
        {
          id: 'inp-1',
          code: 'MAT-01',
          description: 'Porcelanato polido 90x90 retificado extra',
          unit: 'm²',
          category: 'material',
          coefficient: 1.05,
          unitCost: 120,
        },
        {
          id: 'inp-2',
          code: 'MAT-02',
          description: 'Argamassa colante industrializada tipo AC-III cinza',
          unit: 'kg',
          category: 'material',
          coefficient: 6.0,
          unitCost: 2.5,
        },
        {
          id: 'inp-3',
          code: 'MO-01',
          description: 'Pedreiro de acabamento com encargos complementares',
          unit: 'h',
          category: 'mao_de_obra',
          coefficient: 0.8,
          unitCost: 35,
        },
        {
          id: 'inp-4',
          code: 'MO-02',
          description: 'Servente com encargos complementares',
          unit: 'h',
          category: 'mao_de_obra',
          coefficient: 0.4,
          unitCost: 22,
        },
      ],
    },
    notes: 'Juntas de assentamento de 1,5mm com niveladores plásticos',
  }

  const mockStage: BudgetStage = {
    id: 'stg-1',
    order: 1,
    code: '01',
    name: 'REVESTIMENTOS INTERNOS',
    notes: 'Superfícies limpas, desengorduradas e regularizadas antes do início do assentamento',
    services: [mockServiceWithComposition],
  }

  const mockBudget: FullBudget = {
    id: 'budget-test',
    code: 'ORC-2025-001',
    title: 'Reforma e Estrutura Residencial — Apto 1803',
    status: 'em_andamento',
    createdAt: '2025-04-10',
    updatedAt: '2025-04-10',
    author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
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
      description: 'Reforma residencial completa',
      deadlineMonths: 6,
      startDate: '2025-05-01',
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
    chargesConfig: {
      uf: 'RS',
      isRelieved: false,
      taxRegime: 'simples_nacional',
      simplesDasRate: 11.0,
      customGroupA: 0,
      customGroupB: 0,
      customGroupC: 0,
      customGroupD: 0,
    },
    bdiConfig: {
      administrationCentral: 4.5,
      risk: 1.25,
      insuranceAndGuarantee: 0.85,
      financialExpenses: 1.15,
      profit: 7.8,
      taxes: {
        iss: 4,
        pis: 0.65,
        cofins: 3,
        inssOrCprb: 0,
        simplesDas: 11,
        totalTaxes: 11,
      },
      calculatedBdi: 24.5,
    },
    stages: [mockStage],
  }

  it('redige especificação técnica com materiais e mão de obra sem menção a IA nem preços', () => {
    const spec = generateServiceTechnicalSpecification(mockServiceWithComposition, mockStage)
    expect(spec).toBeTruthy()
    // Contém referências aos insumos
    expect(spec.toLowerCase()).toContain('porcelanato polido')
    expect(spec.toLowerCase()).toContain('argamassa colante')
    expect(spec.toLowerCase()).toContain('pedreiro')
    // Contém as diretrizes da etapa e notas do serviço
    expect(spec).toContain('Juntas de assentamento de 1,5mm')
    expect(spec).toContain('Superfícies limpas')
    // Não menciona valores em reais nem BDI
    expect(spec).not.toContain('R$')
    expect(spec).not.toContain('BDI')
    // Não menciona IA
    expect(spec.toLowerCase()).not.toContain('ia')
    expect(spec.toLowerCase()).not.toContain('inteligência artificial')
    expect(spec.toLowerCase()).not.toContain('chatgpt')
  })

  it('gera memorial completo para orçamento com cliente Andreia e Jader', () => {
    const doc = buildMemorialDocumentData(mockBudget)
    expect(doc.budgetCode).toBe('ORC-2025-001')
    expect(doc.client.name).toContain('Andreia de Oliveira da Costa')
    expect(doc.work.address).toContain('Rua Tomaz Gonzaga, 610')
    expect(doc.stages.length).toBe(1)
    expect(doc.stages[0].services.length).toBe(1)
    expect(doc.stages[0].services[0].technicalSpecification.length).toBeGreaterThan(50)
  })

  it('suporta serviços sem composição gerando parágrafo a partir da descrição técnica', () => {
    const simpleService: BudgetService = {
      id: 'srv-2',
      order: 2,
      code: '01.02',
      description: 'Limpeza fina final de obra pós-reforma',
      unit: 'm²',
      quantity: 185,
      composition: {
        id: 'comp-empty',
        code: 'PROPRIA',
        description: 'Limpeza fina',
        specialty: 'Serviços Preliminares',
        unit: 'm²',
        source: 'PROPRIO',
        inputs: [],
        version: 'v1.0',
      },
    }

    const spec = generateServiceTechnicalSpecification(simpleService)
    expect(spec).toContain('Limpeza fina final de obra pós-reforma')
    expect(spec).not.toContain('R$')
  })

  it('remove totalmente o item/bloco de medição e a frase genérica de arremates/nivelamento/limpeza', () => {
    const spec = generateServiceTechnicalSpecification(mockServiceWithComposition, mockStage)
    // Bloco de medição removido
    expect(spec.toLowerCase()).not.toContain('a medição será efetuada')
    expect(spec.toLowerCase()).not.toContain('item de medição')
    expect(spec.toLowerCase()).not.toContain('critérios de medição')
    expect(spec.toLowerCase()).not.toContain('critério da etapa')
    // Frase genérica removida
    expect(spec.toLowerCase()).not.toContain('contemplando arremates')
    expect(spec.toLowerCase()).not.toContain('cortes necessários')
    expect(spec.toLowerCase()).not.toContain('nivelamento e limpeza')
  })

  it('garante capitalização com primeira letra SEMPRE maiúscula, preservando o restante (inclusive SINAPI em caixa alta)', () => {
    // 1. Descrição começando com minúscula em caixa alta SINAPI
    const sinapiService: BudgetService = {
      id: 'srv-sinapi',
      order: 1,
      code: '02.01',
      description: 'pISO DE CONCRETO POLIDO INDUSTRIAL FCK 30 MPA',
      unit: 'm²',
      quantity: 200,
      composition: {
        id: 'comp-sinapi-piso',
        code: 'SINAPI-99999',
        description: 'PISO DE CONCRETO POLIDO INDUSTRIAL FCK 30 MPA',
        specialty: 'Pisos e Pavimentações',
        unit: 'm²',
        source: 'SINAPI',
        inputs: [],
        version: 'v1.0',
      },
    }
    const specSinapi = generateServiceTechnicalSpecification(sinapiService)
    // A especificação deve começar com inicial maiúscula
    expect(specSinapi.charAt(0)).toMatch(/[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]/)
    expect(specSinapi.charAt(0)).toBe(specSinapi.charAt(0).toUpperCase())
    expect(specSinapi).toContain('PISO DE CONCRETO POLIDO INDUSTRIAL FCK 30 MPA')

    // 2. No buildMemorialDocumentData, tanto serviceDescription quanto technicalSpecification têm inicial maiúscula
    const budgetWithSinapi: FullBudget = {
      ...mockBudget,
      stages: [
        {
          ...mockStage,
          services: [sinapiService],
        },
      ],
    }
    const doc = buildMemorialDocumentData(budgetWithSinapi)
    const srvDoc = doc.stages[0].services[0]
    expect(srvDoc.serviceDescription.startsWith('PISO DE CONCRETO')).toBe(true)
    expect(srvDoc.technicalSpecification.charAt(0)).toBe(
      srvDoc.technicalSpecification.charAt(0).toUpperCase(),
    )

    // 3. Descrição iniciando com verbo de ação em minúsculo: "assentamento de piso cerâmico"
    const lowerVerbService: BudgetService = {
      id: 'srv-verb',
      order: 2,
      code: '02.02',
      description: 'assentamento de piso cerâmico esmaltado 60x60',
      unit: 'm²',
      quantity: 50,
      composition: {
        id: 'comp-piso-ceramico',
        code: 'SINAPI-88888',
        description: 'Piso cerâmico 60x60',
        specialty: 'Revestimentos',
        unit: 'm²',
        source: 'SINAPI',
        inputs: [],
        version: 'v1.0',
      },
    }
    const specVerb = generateServiceTechnicalSpecification(lowerVerbService)
    expect(specVerb.startsWith('Assentamento de piso cerâmico')).toBe(true)
  })

  it('gera introdução geral de engenharia civil formal', () => {
    const intro = generateDefaultGeneralIntroduction(mockBudget)
    expect(intro).toContain('Memorial Descritivo')
    expect(intro).toContain('CONCE')
    expect(intro).toContain('ABNT')
    expect(intro).toContain('Andreia de Oliveira da Costa')
  })

  it('restaura memorial salvo com pareamento resiliente por ID, código e índice de ordem', () => {
    const budgetWithSavedMemorial: FullBudget = {
      ...mockBudget,
      savedMemorial: {
        generatedAt: '2025-04-10T10:00:00.000Z',
        updatedAt: '2025-04-10T11:00:00.000Z',
        generalIntroduction: 'Introdução personalizada salva pelo engenheiro.',
        includeStagePhotos: true,
        includeSummary: true,
        stages: [
          {
            stageId: 'stg-1',
            stageCode: '01',
            stageName: 'REVESTIMENTOS INTERNOS',
            notes: 'Nota salva da etapa',
            photoUrl: null,
            services: [
              {
                serviceId: 'srv-1',
                serviceCode: '01.01',
                serviceDescription: 'Assentamento de porcelanato polido 90x90 em piso',
                unit: 'm²',
                quantity: 150,
                technicalSpecification:
                  'Especificação técnica customizada salva pelo usuário para o porcelanato.',
              },
            ],
          },
        ],
      },
    }

    // 1. Pareamento exato por ID
    const docExact = buildMemorialDocumentData(budgetWithSavedMemorial, {
      useSavedIfAvailable: true,
    })
    expect(docExact.generalIntroduction).toBe('Introdução personalizada salva pelo engenheiro.')
    expect(docExact.stages[0].services[0].technicalSpecification).toBe(
      'Especificação técnica customizada salva pelo usuário para o porcelanato.',
    )
    expect(docExact.stages[0].services[0].isCustomized).toBe(true)

    // 2. Pareamento resiliente quando ID do serviço é regenerado ou diferente, mas código ou posição batem
    const budgetWithDifferentIds: FullBudget = {
      ...budgetWithSavedMemorial,
      stages: [
        {
          ...mockStage,
          id: 'new-stg-uuid-999',
          code: '01', // mesmo código
          services: [
            {
              ...mockServiceWithComposition,
              id: 'new-srv-uuid-888', // id diferente
              code: '01.01', // mesmo código
            },
          ],
        },
      ],
    }

    const docFallbackCode = buildMemorialDocumentData(budgetWithDifferentIds, {
      useSavedIfAvailable: true,
    })
    expect(docFallbackCode.stages[0].services[0].technicalSpecification).toBe(
      'Especificação técnica customizada salva pelo usuário para o porcelanato.',
    )

    // 3. Pareamento resiliente quando até os códigos diferem, pareia por índice de ordem
    const budgetWithNoCodes: FullBudget = {
      ...budgetWithSavedMemorial,
      stages: [
        {
          ...mockStage,
          id: 'diff-stg-id',
          code: '',
          services: [
            {
              ...mockServiceWithComposition,
              id: 'diff-srv-id',
              code: '',
            },
          ],
        },
      ],
    }

    const docFallbackIndex = buildMemorialDocumentData(budgetWithNoCodes, {
      useSavedIfAvailable: true,
    })
    expect(docFallbackIndex.stages[0].services[0].technicalSpecification).toBe(
      'Especificação técnica customizada salva pelo usuário para o porcelanato.',
    )
  })
})
