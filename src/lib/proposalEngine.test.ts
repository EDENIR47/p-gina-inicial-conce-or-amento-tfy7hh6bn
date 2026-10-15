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

  it('Seção 1 (Objetivo) cita etapas e serviços reais de forma qualitativa, SEM quantitativos numéricos de volume/área/unidade', () => {
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
    expect(fullText).toContain('2 etapa(s) e 3 item(ns) de serviço')

    // Remoção de quantitativos numéricos de volume/área/unidade na proposta a pedido do usuário
    expect(fullText).not.toContain('120,0 m²')
    expect(fullText).not.toContain('80,0 m²')
    expect(fullText).not.toContain('200,0 m²')
    expect(fullText).not.toContain('120 m²')
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

  it('Seção 3 (Complexidade) avalia a complexidade técnica sem expor cifras numéricas de área', () => {
    const budget = makeBudget()
    const summary = calculateFullBudget(budget)
    const analysis = analyzeBudgetForProposal(budget)
    const sections = buildProposalSections(budget, summary, analysis)
    const complexidade = sections[2]

    const fullText = [...complexidade.paragraphs, ...(complexidade.items || [])].join(' ')
    expect(fullText).toContain('3 serviço(s)')
    // Área numérica não é mais citada na proposta a pedido do usuário
    expect(fullText).not.toContain('180 m²')
    // Escopo pequeno: complexidade não é "elevada"
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

  it('Seção 5 (Fiscalização) cita o responsável técnico, ART, conferência de etapas e qualificação técnica LEED BD+C verbatim', () => {
    const budget = makeBudget()
    const summary = calculateFullBudget(budget)
    const analysis = analyzeBudgetForProposal(budget)
    const sections = buildProposalSections(budget, summary, analysis)
    const fiscalizacao = sections[4]

    const fullText = [...fiscalizacao.paragraphs, ...(fiscalizacao.items || [])].join(' ')
    expect(fullText).toContain('EDENIR SOUZA DA ROSA')
    expect(fullText).toContain('CREA/RS-252397')
    expect(fullText).toContain('LEED BD+C para Novas Construções e Grandes Reformas')
    expect(fullText).toContain('17/04/2026')
    expect(fullText).toContain('05:00 Horas')
    expect(fullText).toContain('Green Building Council')
    expect(fullText).toContain('ART')
    expect(fullText).toContain('DEMOLIÇÃO E REMOÇÃO DE REVESTIMENTOS')
    expect(fullText).toContain('ORC-2025-777')
  })

  it('Seção 6 (Volume de material removido) é qualitativa, cita serviços de remoção e normas CONAMA 307/NBRs, SEM tabela numérica nem quantitativos de volume/área', () => {
    const budget = makeBudget()
    const sections = buildProposalSections(
      budget,
      calculateFullBudget(budget),
      analyzeBudgetForProposal(budget),
    )
    const volume = sections[5]

    // Tabela numérica removida a pedido do usuário
    expect(volume.table).toBeUndefined()
    expect(volume.items).toBeDefined()
    expect(volume.items?.length).toBe(2)

    const volumeText = [...volume.paragraphs, ...(volume.items || [])].join(' ')
    // Cita os serviços reais de remoção
    expect(volumeText).toContain('Demolição de revestimento de parede em alvenaria')
    expect(volumeText).toContain('Remoção de piso cerâmico existente')
    // Cita as normas técnicas e classes de resíduo
    expect(volumeText).toContain('CONAMA nº 307/2002')
    expect(volumeText).toContain('NBR 15.112')
    expect(volumeText).toContain('Classe A')
    expect(volumeText).toContain('planejamento executivo')

    // SEM quantitativos numéricos de volume/área/caçambas
    expect(volumeText).not.toContain('m³')
    expect(volumeText).not.toContain('m²')
    expect(volumeText).not.toContain('caçamba(s) basculante(s) estanque(s) de 5 m³')
    expect(volumeText).not.toContain('120,0')
    expect(volumeText).not.toContain('80,0')
  })

  it('Seção 6 declara ausência de serviços de grande porte quando não há remoções no escopo', () => {
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
    expect(volumeText).toContain('não há, no escopo técnico')
    expect(volume.table).toBeUndefined()
  })

  it('análise de remoção detecta serviços e etapas declaradas pelo usuário', () => {
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

  it('instalações no escopo elevam complexidade, mas JAMAIS adicionam autorização de concessionárias na Seção 7', () => {
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
    // Regra rígida: nenhuma menção a concessionárias
    expect(fullText.toLowerCase()).not.toContain('concessionária')
    expect(fullText.toLowerCase()).not.toContain('concessionaria')
  })

  it('Seção 7 inclui complemento "quando necessário" em ocupação de via pública e declaração da SIMPLE ESTRUTURAL', () => {
    const budget = makeBudget()
    const analysis = analyzeBudgetForProposal(budget)
    const sections = buildProposalSections(budget, calculateFullBudget(budget), analysis)
    const prazo = sections[6]
    const fullText = [...prazo.paragraphs, ...(prazo.items || [])].join(' ')

    // 1. Ausência de concessionárias
    expect(fullText.toLowerCase()).not.toContain('concessionária')
    expect(fullText.toLowerCase()).not.toContain('concessionaria')

    // 2. Complemento "quando necessário" no item de ocupação de via pública
    const viaPublicaItem = prazo.items?.find((i) =>
      i.toLowerCase().includes('ocupação de via pública'),
    )
    expect(viaPublicaItem).toBeDefined()
    expect(viaPublicaItem?.toLowerCase()).toContain('quando necessário')
    expect(viaPublicaItem).toContain('responsabilidade: Contratante')

    // 3. Presença obrigatória da declaração da empresa SIMPLE ESTRUTURAL
    expect(fullText).toContain('SIMPLE ESTRUTURAL')
    expect(fullText).toContain('projeto estrutural complementar')
  })

  it('declaração institucional da SIMPLE ESTRUTURAL permanece presente mesmo em orçamento sem demolição ou remoção', () => {
    const cleanBudget: FullBudget = {
      ...makeBudget(),
      stages: [
        {
          id: 'stage-pnt',
          order: 1,
          code: '01',
          name: 'PINTURA',
          services: [
            {
              id: 'srv-pnt',
              order: 1,
              code: '01.01',
              description: 'Pintura látex acrílica em paredes internas',
              unit: 'm2',
              quantity: 100,
              composition: makeComposition('Pintura', [
                {
                  description: 'Tinta acrílica',
                  category: 'material',
                  coefficient: 1,
                  unitCost: 10,
                },
              ]),
            },
          ],
        },
      ],
    }

    const analysis = analyzeBudgetForProposal(cleanBudget)
    const sections = buildProposalSections(cleanBudget, calculateFullBudget(cleanBudget), analysis)
    const prazo = sections[6]
    const fullText = [...prazo.paragraphs, ...(prazo.items || [])].join(' ')

    expect(fullText).toContain('SIMPLE ESTRUTURAL')
    expect(fullText).toContain('projeto estrutural complementar')
    expect(fullText.toLowerCase()).not.toContain('concessionária')
  })

  it('motor normaliza acentos e é puro (determinístico entre execuções)', () => {
    expect(normalizeKeyword('Remoção de REVESTIMENTOS')).toBe('remocao de revestimentos')

    const budget = makeBudget()
    const a = analyzeBudgetForProposal(budget)
    const b = analyzeBudgetForProposal(budget)
    expect(a).toEqual(b)
  })
})
