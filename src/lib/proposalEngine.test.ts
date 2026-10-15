import { describe, it, expect } from 'vitest'
import {
  PROPOSAL_DOCUMENT_TITLE,
  analyzeBudgetForProposal,
  analyzeRemovedVolume,
  buildProposalSections,
  normalizeKeyword,
} from '@/lib/proposalEngine'
import { calculateFullBudget } from '@/lib/budgetEngine'
import { FullBudget } from '@/types/budgetEngine'

/**
 * Testes da PROPOSTA TÉCNICA E COMERCIAL (formato DOCUMENTO, não slides).
 * Valida as 7 seções obrigatórias, na ordem exigida, com conteúdo técnico
 * derivado dos dados reais do orçamento — e a ausência de regressão à
 * antiga feature "Ficha de Descarte".
 */

function makeComposition(
  specialty: string,
  inputs: Array<{ description: string; category: any; coefficient: number; unitCost: number }>,
) {
  return {
    id: `comp-${specialty}`,
    code: `CPU-${specialty}`,
    description: `Composição ${specialty}`,
    specialty,
    unit: 'm²',
    inputs: inputs.map((i, idx) => ({
      id: `in-${idx}`,
      code: `SINAPI-${1000 + idx}`,
      description: i.description,
      unit: 'un',
      category: i.category,
      coefficient: i.coefficient,
      unitCost: i.unitCost,
    })),
    version: 'v1.0',
    source: 'CONCE' as const,
  }
}

function makeBudget(overrides?: Partial<FullBudget>): FullBudget {
  const demolidaoComposition = makeComposition('Revestimentos', [
    { description: 'Mão de obra demolidor', category: 'mao_de_obra', coefficient: 1, unitCost: 20 },
    { description: 'Entulho caçamba', category: 'servico_terceiro', coefficient: 1, unitCost: 180 },
  ])
  const pinturaComposition = makeComposition('Pintura', [
    { description: 'Tinta látex acrílica', category: 'material', coefficient: 0.2, unitCost: 30 },
    { description: 'Mão de obra pintor', category: 'mao_de_obra', coefficient: 0.5, unitCost: 22 },
  ])

  return {
    id: 'budget-proposta-test',
    code: 'ORC-2025-777',
    title: 'Reforma Comercial de Loja',
    status: 'em_andamento',
    createdAt: '2025-04-10',
    updatedAt: '2025-04-10T10:00:00Z',
    author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
    client: {
      name: 'Cliente Teste Ltda',
      document: '12.345.678/0001-90',
      email: 'cliente@teste.com',
      phone: '(51) 99999-0000',
      address: 'Av. Teste, 100',
      city: 'Porto Alegre',
      state: 'RS',
    },
    work: {
      name: 'Reforma de Loja no Moinhos de Vento',
      address: 'Rua das Acácias, 250',
      city: 'Porto Alegre',
      state: 'RS',
      description: 'Reforma completa do pavimento térreo para novo uso comercial.',
      deadlineMonths: 3,
      deadlineValue: 60,
      deadlineUnit: 'dias',
      startDate: '2025-05-01',
      totalAreaM2: 180,
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
    stages: [
      {
        id: 'stage-1',
        order: 1,
        code: '01',
        name: 'DEMOLIÇÃO E REMOÇÃO DE REVESTIMENTOS',
        services: [
          {
            id: 'srv-1',
            order: 1,
            code: '01.01',
            description: 'Demolição de revestimento de parede em alvenaria',
            unit: 'm²',
            quantity: 120,
            composition: demolidaoComposition,
          },
          {
            id: 'srv-2',
            order: 2,
            code: '01.02',
            description: 'Remoção de piso cerâmico existente',
            unit: 'm²',
            quantity: 80,
            composition: demolidaoComposition,
          },
        ],
      },
      {
        id: 'stage-2',
        order: 2,
        code: '02',
        name: 'ACABAMENTOS',
        services: [
          {
            id: 'srv-3',
            order: 1,
            code: '02.01',
            description: 'Pintura de paredes internas',
            unit: 'm²',
            quantity: 200,
            composition: pinturaComposition,
          },
        ],
      },
    ],
    ...overrides,
  } as FullBudget
}

const EXPECTED_SECTIONS = [
  'OBJETIVO DO TRABALHO',
  'FORMA DE EXECUÇÃO',
  'COMPLEXIDADE DO SERVIÇO',
  'DESTINAÇÃO FINAL DOS RESÍDUOS',
  'FORMA DE FISCALIZAÇÃO UTILIZADA',
  'VOLUME ESTIMADO DE MATERIAL REMOVIDO',
  'PRAZO E AUTORIZAÇÕES PRÉVIAS PARA EXECUÇÃO',
]

describe('PROPOSTA TÉCNICA E COMERCIAL — documento (não slides)', () => {
  it('título do documento impresso é "PROPOSTA TÉCNICA E COMERCIAL"', () => {
    expect(PROPOSAL_DOCUMENT_TITLE).toBe('PROPOSTA TÉCNICA E COMERCIAL')
  })

  it('gera exatamente 7 seções, com os títulos obrigatórios na ordem definida pelo usuário', () => {
    const budget = makeBudget()
    const summary = calculateFullBudget(budget)
    const analysis = analyzeBudgetForProposal(budget)
    const sections = buildProposalSections(budget, summary, analysis)

    expect(sections).toHaveLength(7)
    expect(sections.map((s) => s.title)).toEqual(EXPECTED_SECTIONS)
    expect(sections.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('Seção 1 (Objetivo) cita etapa e serviços reais com quantidades e unidades do orçamento', () => {
    const budget = makeBudget()
    const summary = calculateFullBudget(budget)
    const analysis = analyzeBudgetForProposal(budget)
    const sections = buildProposalSections(budget, summary, analysis)
    const objetivo = sections[0]

    const fullText = [...objetivo.paragraphs, ...(objetivo.items || [])].join(' ')

    expect(fullText).toContain('DEMOLIÇÃO E REMOÇÃO DE REVESTIMENTOS')
    expect(fullText).toContain('Demolição de revestimento de parede em alvenaria')
    expect(fullText).toContain('Pintura de paredes internas')
    expect(fullText).toContain('ORC-2025-777')
    expect(fullText).toContain('m²')
    expect(fullText).toContain('2 etapa(s) e 3 serviço(s)')
  })

  it('Seção 2 (Forma de execução) descreve metodologia conforme serviços presentes (demolição + revestimentos/pintura) e não inclui seções ausentes', () => {
    const budget = makeBudget()
    const summary = calculateFullBudget(budget)
    const analysis = analyzeBudgetForProposal(budget)
    const sections = buildProposalSections(budget, summary, analysis)
    const execucao = sections[1]

    expect(execucao.items).toBeDefined()
    const itemsText = (execucao.items || []).join(' ')

    expect(itemsText).toContain('DEMOLIÇÕES, REMOÇÕES')
    expect(itemsText).toContain('REVESTIMENTOS, PISOS E ACABAMENTOS')
    // Escopo sem estrutura/alvenaria/instalações: não deve citar essas metodologias
    expect(itemsText).not.toContain('ESTRUTURA E FUNDAÇÕES')
    expect(itemsText).not.toContain('INSTALAÇÕES PREDIAIS')
    expect(analysis.hasInstallations).toBe(false)
  })

  it('Seção 3 (Complexidade) é proporcional ao escopo e cita fatores numéricos reais', () => {
    const budget = makeBudget()
    const summary = calculateFullBudget(budget)
    const analysis = analyzeBudgetForProposal(budget)
    const sections = buildProposalSections(budget, summary, analysis)
    const complexidade = sections[2]

    const fullText = [...complexidade.paragraphs, ...(complexidade.items || [])].join(' ')
    expect(fullText).toContain('3 serviço(s)')
    expect(fullText).toContain('180 m²')
    // Escopo pequeno: complexidade não pode ser "elevada"
    expect(analysis.complexityLevel).not.toBe('elevada')
    expect(fullText).toContain(analysis.complexityLevel.toUpperCase())
  })

  it('Seção 4 (Resíduos) é texto técnico CONAMA 307 com classes A/B/C/D e NÃO reintroduz a Ficha de Descarte', () => {
    const budget = makeBudget()
    const summary = calculateFullBudget(budget)
    const analysis = analyzeBudgetForProposal(budget)
    const sections = buildProposalSections(budget, summary, analysis)
    const residuos = sections[3]

    const fullText = residuos.paragraphs.join(' ')
    expect(fullText).toContain('CONAMA nº 307/2002')
    expect(fullText).toContain('classe A')
    expect(fullText).toContain('classe D')
    expect(fullText).toContain('licenciada')

    // Guarda anti-regressão: nada de Ficha de Descarte / certificado de descarte
    const allSectionsText = sections
      .map((s) => [...s.paragraphs, ...(s.items || [])].join(' '))
      .join(' ')
      .toLowerCase()
    expect(allSectionsText).not.toContain('ficha de descarte')
    expect(allSectionsText).not.toContain('certificado de descarte')
    expect(allSectionsText).not.toContain('disposalengine')
  })

  it('Seção 5 (Fiscalização) cita o responsável técnico, ART e conferência de etapas', () => {
    const budget = makeBudget()
    const summary = calculateFullBudget(budget)
    const analysis = analyzeBudgetForProposal(budget)
    const sections = buildProposalSections(budget, summary, analysis)
    const fiscalizacao = sections[4]

    const fullText = [...fiscalizacao.paragraphs, ...(fiscalizacao.items || [])].join(' ')
    expect(fullText).toContain('CREA/RS-252397')
    expect(fullText).toContain('ART')
    expect(fullText).toContain('DEMOLIÇÃO E REMOÇÃO DE REVESTIMENTOS')
    expect(fullText).toContain('ORC-2025-777')
  })

  it('Seção 6 (Volume) estima volumes a partir dos serviços de demolição/remoção com quantidades reais e marca como estimativa', () => {
    const budget = makeBudget()
    const sections = buildProposalSections(
      budget,
      calculateFullBudget(budget),
      analyzeBudgetForProposal(budget),
    )
    const volume = sections[5]

    expect(volume.table).toBeDefined()
    const volumeAnalysis = analyzeRemovedVolume(budget)
    expect(volumeAnalysis.hasRemovalServices).toBe(true)
    // 2 serviços de remoção identificados (demolição parede + remoção piso)
    expect(volumeAnalysis.removalServiceCount).toBe(2)
    // Demolição parede: 120 m² × 0,15 m = 18 m³; remoção piso: 80 m² × 0,05 m = 4 m³
    expect(volumeAnalysis.totalVolumeM3).toBeCloseTo(22, 1)

    const volumeText = [
      ...volume.paragraphs,
      ...(volume.items || []),
      ...volume.table.rows.flat(),
    ].join(' ')
    expect(volumeText).toContain('120,0')
    expect(volumeText).toContain('80,0')
    expect(volumeText.toLowerCase()).toContain('estimativ')
    expect(volume.footnotes?.length).toBeGreaterThan(0)
  })

  it('Seção 6 declara ausência de previsão significativa quando não há serviços de remoção', () => {
    const budget = makeBudget({
      stages: [
        {
          id: 'stage-1',
          order: 1,
          code: '01',
          name: 'ACABAMENTOS',
          services: [
            {
              id: 'srv-1',
              order: 1,
              code: '01.01',
              description: 'Pintura de paredes internas',
              unit: 'm²',
              quantity: 200,
              composition: makeComposition('Pintura', [
                {
                  description: 'Tinta látex acrílica',
                  category: 'material',
                  coefficient: 0.2,
                  unitCost: 30,
                },
              ]),
            },
          ],
        },
      ],
    })

    const analysis = analyzeRemovedVolume(budget)
    expect(analysis.hasRemovalServices).toBe(false)

    const sections = buildProposalSections(
      budget,
      calculateFullBudget(budget),
      analyzeBudgetForProposal(budget),
    )
    const volume = sections[5]
    const volumeText = volume.paragraphs.join(' ')
    expect(volumeText).toContain('não há previsão significativa')
    expect(volume.table).toBeUndefined()
  })

  it('volume declarado pelo usuário na etapa (volumeM3/weightKg) prevalece sobre a estimativa por serviço', () => {
    const budget = makeBudget()
    budget.stages[0].volumeM3 = 40
    budget.stages[0].weightKg = 52000

    const analysis = analyzeRemovedVolume(budget)
    expect(analysis.hasRemovalServices).toBe(true)
    const declared = analysis.rows.find((r) => r.isDeclaredByUser)
    expect(declared).toBeDefined()
    expect(declared?.estimatedVolumeM3).toBe(40)
    expect(declared?.estimatedWeightKg).toBe(52000)
    expect(analysis.totalVolumeM3).toBeCloseTo(40, 1)
  })

  it('Seção 7 (Prazo e autorizações) usa faixa de semanas proporcional, marca como estimativa e lista autorizações com responsabilidade', () => {
    const budget = makeBudget()
    const analysis = analyzeBudgetForProposal(budget)
    const sections = buildProposalSections(budget, calculateFullBudget(budget), analysis)
    const prazo = sections[6]

    const fullText = [...prazo.paragraphs, ...(prazo.items || [])].join(' ')
    expect(fullText).toContain(
      `${analysis.estimatedWeeksMin} a ${analysis.estimatedWeeksMax} semanas`,
    )
    expect(fullText.toLowerCase()).toContain('estimativa de planejamento')
    expect(fullText).toContain('condomínio')
    expect(fullText).toContain('Prefeitura')
    // Serviço de demolição/remoção gera autorização de caçamba em via pública
    expect(fullText).toContain('caçamba')
    // Responsabilidades declaradas
    expect(prazo.items?.some((i) => i.includes('responsabilidade: Contratante'))).toBe(true)
    expect(prazo.items?.some((i) => i.includes('responsabilidade: CONCE'))).toBe(true)
  })

  it('instalações no escopo elevam complexidade e adicionam autorização de concessionárias', () => {
    const budget = makeBudget()
    budget.stages.push({
      id: 'stage-3',
      order: 3,
      code: '03',
      name: 'INSTALAÇÕES',
      services: [
        {
          id: 'srv-4',
          order: 1,
          code: '03.01',
          description: 'Instalação elétrica de pontos de luz e tomadas',
          unit: 'un',
          quantity: 24,
          composition: makeComposition('Instalações Elétricas', [
            { description: 'Cabo flexível', category: 'material', coefficient: 1, unitCost: 5 },
            { description: 'Eletricista', category: 'mao_de_obra', coefficient: 1, unitCost: 25 },
          ]),
        },
      ],
    })

    const analysis = analyzeBudgetForProposal(budget)
    expect(analysis.hasInstallations).toBe(true)

    const sections = buildProposalSections(budget, calculateFullBudget(budget), analysis)
    const prazo = sections[6]
    const fullText = [...prazo.paragraphs, ...(prazo.items || [])].join(' ')
    expect(fullText).toContain('concessionária')
  })

  it('motor normaliza acentos e é puro (determinístico entre execuções)', () => {
    expect(normalizeKeyword('Remoção de REVESTIMENTOS')).toBe('remocao de revestimentos')

    const budget = makeBudget()
    const a = analyzeBudgetForProposal(budget)
    const b = analyzeBudgetForProposal(budget)
    expect(a).toEqual(b)
  })
})
