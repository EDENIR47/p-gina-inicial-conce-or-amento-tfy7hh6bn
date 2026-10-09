import { describe, it, expect } from 'vitest'
import { resequenceBudgetStages, isRealSinapiComposition } from './budgetEngine'
import { BudgetStage, BudgetComposition } from '@/types/budgetEngine'

function mockComposition(overrides: Partial<BudgetComposition> = {}): BudgetComposition {
  return {
    id: 'comp-1',
    code: 'CPU-01.01',
    description: 'Composição de teste',
    specialty: 'Alvenaria & Vedações',
    unit: 'm2',
    inputs: [],
    version: 'v1.0',
    source: 'CONCE',
    unitCost: 10,
    ...overrides,
  }
}

describe('resequenceBudgetStages (Engenharia de Sequenciamento de Etapas e Serviços)', () => {
  it('re-sequencia etapas e serviços sequencialmente (order 1..n, code 01..n, stageCode.01..n)', () => {
    const rawStages: BudgetStage[] = [
      {
        id: 's1',
        name: 'Demolições',
        order: 5,
        code: '99',
        services: [
          {
            id: 'srv1',
            order: 10,
            code: '99.88',
            description: 'Demolição de alvenaria',
            unit: 'm2',
            quantity: 15,
            composition: mockComposition({
              id: 'c1',
              code: 'CPU-99.88',
              description: 'Demolição',
            }),
          },
        ],
      },
      {
        id: 's2',
        name: 'Alvenaria',
        order: 9,
        code: '15',
        services: [
          {
            id: 'srv2',
            order: 3,
            code: '15.03',
            description: 'Alvenaria de vedação',
            unit: 'm2',
            quantity: 40,
            composition: mockComposition({
              id: 'c2',
              code: 'CPU-ANTIGO',
              description: 'Alvenaria',
              unitCost: 50,
            }),
          },
        ],
      },
    ]

    const result = resequenceBudgetStages(rawStages)

    expect(result[0].order).toBe(1)
    expect(result[0].code).toBe('01')
    expect(result[0].services[0].order).toBe(1)
    expect(result[0].services[0].code).toBe('01.01')
    expect(result[0].services[0].composition?.code).toBe('CPU-01.01')

    expect(result[1].order).toBe(2)
    expect(result[1].code).toBe('02')
    expect(result[1].services[0].order).toBe(1)
    expect(result[1].services[0].code).toBe('02.01')
    expect(result[1].services[0].composition?.code).toBe('CPU-02.01')
  })

  it('exclusão no meio de etapas: fecha buracos sem deixar falhas (01, 02...)', () => {
    const threeStages: BudgetStage[] = [
      { id: 's1', name: 'Etapa 1', order: 1, code: '01', services: [] },
      { id: 's2', name: 'Etapa 2', order: 2, code: '02', services: [] },
      { id: 's3', name: 'Etapa 3', order: 3, code: '03', services: [] },
    ]

    // Remove a etapa 2 do meio
    const filtered = threeStages.filter((s) => s.id !== 's2')
    const resequenced = resequenceBudgetStages(filtered)

    expect(resequenced.length).toBe(2)
    expect(resequenced[0].code).toBe('01')
    expect(resequenced[0].order).toBe(1)
    expect(resequenced[1].name).toBe('Etapa 3')
    expect(resequenced[1].code).toBe('02')
    expect(resequenced[1].order).toBe(2)
  })

  it('exclusão no meio de serviços: fecha buracos de serviços dentro da etapa', () => {
    const stageWithThreeServices: BudgetStage = {
      id: 's1',
      name: 'Pisos e Revestimentos',
      order: 1,
      code: '01',
      services: [
        {
          id: 'srv-a',
          order: 1,
          code: '01.01',
          description: 'Contrapiso',
          unit: 'm2',
          quantity: 20,
          composition: mockComposition({
            id: 'ca',
            code: 'CPU-01.01',
            description: 'CP',
            unitCost: 30,
          }),
        },
        {
          id: 'srv-b',
          order: 2,
          code: '01.02',
          description: 'Porcelanato',
          unit: 'm2',
          quantity: 20,
          composition: mockComposition({
            id: 'cb',
            code: 'CPU-01.02',
            description: 'Porc',
            unitCost: 120,
          }),
        },
        {
          id: 'srv-c',
          order: 3,
          code: '01.03',
          description: 'Rodapé',
          unit: 'm',
          quantity: 15,
          composition: mockComposition({
            id: 'cc',
            code: 'CPU-01.03',
            description: 'Rod',
            unit: 'm',
            unitCost: 25,
          }),
        },
      ],
    }

    // Exclui o serviço do meio (Porcelanato)
    const filteredServices = stageWithThreeServices.services.filter((s) => s.id !== 'srv-b')
    const resequenced = resequenceBudgetStages([
      { ...stageWithThreeServices, services: filteredServices },
    ])

    expect(resequenced[0].services.length).toBe(2)
    expect(resequenced[0].services[0].code).toBe('01.01')
    expect(resequenced[0].services[0].description).toBe('Contrapiso')
    expect(resequenced[0].services[0].composition?.code).toBe('CPU-01.01')

    expect(resequenced[0].services[1].code).toBe('01.02')
    expect(resequenced[0].services[1].description).toBe('Rodapé')
    expect(resequenced[0].services[1].composition?.code).toBe('CPU-01.02')
  })

  it('duplicação de etapa e serviços: ajusta códigos e prefixos CPU sequencialmente', () => {
    const originalStage: BudgetStage = {
      id: 's1',
      name: 'Pintura',
      order: 1,
      code: '01',
      services: [
        {
          id: 'srv1',
          order: 1,
          code: '01.01',
          description: 'Massa corrida',
          unit: 'm2',
          quantity: 50,
          composition: mockComposition({
            id: 'c1',
            code: 'CPU-01.01',
            description: 'Massa',
            unitCost: 15,
          }),
        },
      ],
    }

    const duplicatedStage: BudgetStage = {
      id: 's2',
      name: 'Pintura (CÓPIA)',
      order: 2,
      code: '02',
      services: [
        {
          id: 'srv2',
          order: 1,
          code: '01.01', // ainda com o código da etapa original
          description: 'Massa corrida (CÓPIA)',
          unit: 'm2',
          quantity: 50,
          composition: mockComposition({
            id: 'c2',
            code: 'CPU-01.01',
            description: 'Massa',
            unitCost: 15,
          }),
        },
      ],
    }

    const resequenced = resequenceBudgetStages([originalStage, duplicatedStage])

    expect(resequenced[0].code).toBe('01')
    expect(resequenced[0].services[0].code).toBe('01.01')
    expect(resequenced[0].services[0].composition?.code).toBe('CPU-01.01')

    expect(resequenced[1].code).toBe('02')
    expect(resequenced[1].services[0].code).toBe('02.01')
    expect(resequenced[1].services[0].composition?.code).toBe('CPU-02.01')
  })

  it('reordenação (mover para cima / para baixo): atualiza códigos após inversão', () => {
    const stageA: BudgetStage = {
      id: 'sa',
      name: 'Etapa A',
      order: 1,
      code: '01',
      services: [
        {
          id: 'srvA',
          order: 1,
          code: '01.01',
          description: 'Serviço A',
          unit: 'un',
          quantity: 1,
          composition: mockComposition({
            id: 'cA',
            code: 'CPU-01.01',
            description: 'A',
            unit: 'un',
            unitCost: 10,
          }),
        },
      ],
    }
    const stageB: BudgetStage = {
      id: 'sb',
      name: 'Etapa B',
      order: 2,
      code: '02',
      services: [
        {
          id: 'srvB',
          order: 1,
          code: '02.01',
          description: 'Serviço B',
          unit: 'un',
          quantity: 1,
          composition: mockComposition({
            id: 'cB',
            code: 'CPU-02.01',
            description: 'B',
            unit: 'un',
            unitCost: 20,
          }),
        },
      ],
    }

    // Inverte a ordem das etapas: [stageB, stageA]
    const reordered = resequenceBudgetStages([stageB, stageA])

    expect(reordered[0].id).toBe('sb')
    expect(reordered[0].code).toBe('01')
    expect(reordered[0].services[0].code).toBe('01.01')
    expect(reordered[0].services[0].composition?.code).toBe('CPU-01.01')

    expect(reordered[1].id).toBe('sa')
    expect(reordered[1].code).toBe('02')
    expect(reordered[1].services[0].code).toBe('02.01')
    expect(reordered[1].services[0].composition?.code).toBe('CPU-02.01')
  })

  it('preserva estritamente códigos de CPU SINAPI real e NUNCA os sobrescreve com CPU-${serviceCode}', () => {
    const stageWithSinapi: BudgetStage = {
      id: 's1',
      name: 'Instalações Hidráulicas',
      order: 1,
      code: '01',
      services: [
        {
          id: 'srv1',
          order: 1,
          code: '01.01',
          description: 'Tubo PVC 100mm',
          unit: 'm',
          quantity: 10,
          composition: mockComposition({
            id: 'c-sinapi-1',
            code: '89512',
            description: 'TUBO PVC...',
            unit: 'm',
            unitCost: 35.5,
            source: 'SINAPI',
          }),
        },
        {
          id: 'srv2',
          order: 2,
          code: '01.02',
          description: 'Registro de gaveta',
          unit: 'un',
          quantity: 2,
          composition: mockComposition({
            id: 'c-sinapi-2',
            code: 'SINAPI-94793',
            description: 'REGISTRO...',
            unit: 'un',
            unitCost: 80,
            source: 'SINAPI',
          }),
        },
        {
          id: 'srv3',
          order: 3,
          code: '01.03',
          description: 'Composição própria da CONCE',
          unit: 'un',
          quantity: 1,
          composition: mockComposition({
            id: 'c-custom',
            code: 'CPU-ANTIGA',
            description: 'Própria',
            unit: 'un',
            unitCost: 100,
            source: 'CONCE',
          }),
        },
      ],
    }

    const resequenced = resequenceBudgetStages([stageWithSinapi])

    // Serviço 1 (SINAPI 89512): o serviço recebe 01.01, mas a composição mantém '89512'
    expect(resequenced[0].services[0].code).toBe('01.01')
    expect(resequenced[0].services[0].composition?.code).toBe('89512')

    // Serviço 2 (SINAPI-94793): mantém o código SINAPI real
    expect(resequenced[0].services[1].code).toBe('01.02')
    expect(resequenced[0].services[1].composition?.code).toBe('SINAPI-94793')

    // Serviço 3 (Própria CONCE): recebe CPU-01.03
    expect(resequenced[0].services[2].code).toBe('01.03')
    expect(resequenced[0].services[2].composition?.code).toBe('CPU-01.03')
  })

  it('isRealSinapiComposition detecta com precisão composições SINAPI e rejeita auto-geradas', () => {
    expect(isRealSinapiComposition(null)).toBe(false)
    expect(isRealSinapiComposition(undefined)).toBe(false)
    expect(isRealSinapiComposition(mockComposition({ code: '' }))).toBe(false)
    expect(isRealSinapiComposition(mockComposition({ code: 'CPU-01.01' }))).toBe(false)
    expect(isRealSinapiComposition(mockComposition({ code: 'CPU-02.05', source: 'CONCE' }))).toBe(
      false,
    )
    expect(isRealSinapiComposition(mockComposition({ code: 'CPU-01.01', source: 'SINAPI' }))).toBe(
      false,
    )

    // Reais
    expect(isRealSinapiComposition(mockComposition({ code: '87529', source: 'SINAPI' }))).toBe(true)
    expect(isRealSinapiComposition(mockComposition({ code: 'SINAPI-88309' }))).toBe(true)
    expect(isRealSinapiComposition(mockComposition({ code: '94793' }))).toBe(true)
  })
})
