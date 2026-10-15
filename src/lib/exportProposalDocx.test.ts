import { describe, it, expect } from 'vitest'
import { buildProposalDocxDocument, getProposalDocxFilename } from '@/lib/exportProposalDocx'
import { PROPOSAL_DOCUMENT_TITLE } from '@/lib/proposalEngine'
import { CONCE_COMPANY } from '@/lib/conceCompany'
import { FullBudget } from '@/types/budgetEngine'
import { Packer } from 'docx'

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
    id: 'budget-docx-test',
    code: 'ORC-2026-106',
    title: 'Reforma Geral Comercial',
    status: 'em_andamento',
    createdAt: '2026-04-10',
    updatedAt: '2026-04-10T10:00:00Z',
    author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
    client: {
      name: 'Cliente Corporativo Teste Ltda',
      document: '12.345.678/0001-90',
      email: 'contato@cliente.com',
      phone: '(51) 98765-4321',
      address: 'Av. Ipiranga, 6681',
      city: 'Porto Alegre',
      state: 'RS',
    },
    work: {
      name: 'Reforma do Pavimento Comercial',
      address: 'Rua Mostardeiro, 800',
      city: 'Porto Alegre',
      state: 'RS',
      description: 'Reforma completa de conjunto comercial com remoções e acabamentos.',
      deadlineMonths: 2,
      deadlineValue: 45,
      deadlineUnit: 'dias',
      startDate: '2026-05-01',
      totalAreaM2: 240,
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
      sinapiReferenceMonth: '04/2026',
      hasDisallowanceClause: false,
    },
    stages: [
      {
        id: 'stage-1',
        order: 1,
        code: '01',
        name: 'DEMOLIÇÕES E REMOÇÕES',
        services: [
          {
            id: 'srv-1',
            order: 1,
            code: '01.01',
            description: 'Demolição de paredes de alvenaria',
            unit: 'm²',
            quantity: 50,
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
            id: 'srv-2',
            order: 1,
            code: '02.01',
            description: 'Pintura látex acrílica',
            unit: 'm²',
            quantity: 150,
            composition: pinturaComposition,
          },
        ],
      },
    ],
    ...overrides,
  } as FullBudget
}

describe('Motor de Exportação em Word (.docx) — Proposta Técnica e Comercial', () => {
  it('gera o nome do arquivo no padrão especificado (Proposta-Tecnica-e-Comercial-ORC-XXXX-XXX.docx)', () => {
    expect(getProposalDocxFilename('ORC-2026-106')).toBe(
      'Proposta-Tecnica-e-Comercial-ORC-2026-106.docx',
    )
    expect(getProposalDocxFilename('ORC/2026/999')).toBe(
      'Proposta-Tecnica-e-Comercial-ORC_2026_999.docx',
    )
  })

  it('constrói objeto Document do docx sem lançar exceção', () => {
    const budget = makeBudget()
    const doc = buildProposalDocxDocument(budget)
    expect(doc).toBeDefined()
  })

  it('compila arquivo binário via Packer.toBlob / toBuffer com sucesso', async () => {
    const budget = makeBudget()
    const doc = buildProposalDocxDocument(budget)
    const buffer = await Packer.toBuffer(doc)
    expect(buffer).toBeDefined()
    expect(buffer.length).toBeGreaterThan(1000)
    // Verifica assinatura de arquivo ZIP (PK..) que forma o container OpenXML (.docx)
    expect(buffer[0]).toBe(0x50) // 'P'
    expect(buffer[1]).toBe(0x4b) // 'K'
  })

  it('garante que os dados cadastrais da CONCE e do RT estão preservados', () => {
    expect(CONCE_COMPANY.responsavelTecnico).toBe('Eng. Edenir Souza da Rosa')
    expect(CONCE_COMPANY.registroCrea).toBe('CREA/RS-252397')
    expect(CONCE_COMPANY.cnpjFormatado).toBe('57.149.101/0001-46')
  })

  it('respeita todas as restrições anti-regressão na proposta: sem LEED, sem BDI exposto, SIMPLES ESTRUTURAL com S', async () => {
    const budget = makeBudget()
    const doc = buildProposalDocxDocument(budget)

    // Serializa o documento para validar o XML gerado internamente
    const buffer = await Packer.toBuffer(doc)
    const xmlContent = buffer.toString('utf-8')

    // 1. Título do documento
    expect(PROPOSAL_DOCUMENT_TITLE).toBe('PROPOSTA TÉCNICA E COMERCIAL')

    // 2. Restrições anti-regressão no arquivo compilado
    expect(xmlContent).not.toMatch(/\bBDI\b/i)
    expect(xmlContent).not.toMatch(/LEED/i)
    expect(xmlContent).not.toMatch(/Green Building Council/i)
    expect(xmlContent.toLowerCase()).not.toContain('ficha de descarte')
    expect(xmlContent.toLowerCase()).not.toContain('concessionária')
    expect(xmlContent.toLowerCase()).not.toContain('concessionaria')

    // 3. Cláusulas obrigatórias da Seção 8 no documento
    expect(xmlContent).toContain('15%')
    expect(xmlContent).toContain('DIAS 2 E 15')
    expect(xmlContent).toContain('5 (cinco) dias')
    expect(xmlContent).toContain('Seguro de Obra')
    expect(xmlContent).toContain('Art. 618')
    expect(xmlContent).toContain('SIMPLES ESTRUTURAL')
    expect(xmlContent).not.toContain('SIMPLE ESTRUTURAL')

    // 4. Rodapé institucional
    expect(xmlContent).toContain('CONCE ENGENHARIA E CONSULTORIA')
    expect(xmlContent).toContain('57.149.101/0001-46')
    expect(xmlContent).toContain('CONCE é Conceito. CONCE é Concreto.')
  })
})
