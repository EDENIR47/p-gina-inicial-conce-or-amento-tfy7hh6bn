/**
 * CONCE — Testes do Motor de Fichas de Descarte e Certificado de Destino Final
 * Verifica classificação por insumo (CONAMA 307) e versionamento incremental
 */

import { describe, it, expect } from 'vitest'
import {
  classifyWasteInput,
  generateDisposalSheetsFromBudget,
  buildDisposalDocument,
  WASTE_GROUPS,
} from './disposalEngine'
import { BudgetInput, FullBudget } from '@/types/budgetEngine'

describe('disposalEngine — Classificação de Resíduos CONAMA 307', () => {
  it('classifica insumos minerais/alvenaria/concreto/cerâmica como Classe A', () => {
    const cimento: BudgetInput = {
      id: 'i-1',
      code: 'SINAPI-1379',
      description: 'Cimento portland composto CP II-32',
      unit: 'kg',
      category: 'material',
      coefficient: 50,
      unitCost: 0.9,
    }
    const resCimento = classifyWasteInput(cimento)
    expect(resCimento.groupId).toBe('entulho_alvenaria')
    expect(WASTE_GROUPS[resCimento.groupId].conamaClass).toBe('Classe A')

    const tijolo: BudgetInput = {
      id: 'i-2',
      code: 'SINAPI-7271',
      description: 'Bloco cerâmico de vedação 9x19x19 cm',
      unit: 'mil',
      category: 'material',
      coefficient: 0.5,
      unitCost: 800,
    }
    const resTijolo = classifyWasteInput(tijolo)
    expect(resTijolo.groupId).toBe('entulho_alvenaria')
  })

  it('classifica madeiras e compensados como Classe B', () => {
    const madeira: BudgetInput = {
      id: 'i-3',
      code: 'SINAPI-4491',
      description: 'Pontalete de madeira de pinus nao aparelhada 7,5 x 7,5 cm',
      unit: 'm',
      category: 'material',
      coefficient: 12,
      unitCost: 15.5,
    }
    const resMadeira = classifyWasteInput(madeira)
    expect(resMadeira.groupId).toBe('madeira')
    expect(WASTE_GROUPS[resMadeira.groupId].conamaClass).toBe('Classe B')
  })

  it('classifica aço armado e perfis metálicos como Classe B', () => {
    const aco: BudgetInput = {
      id: 'i-4',
      code: 'SINAPI-32',
      description: 'Aco CA-50, 10,0 mm, vergalhao',
      unit: 'kg',
      category: 'material',
      coefficient: 45,
      unitCost: 9.8,
    }
    const resAco = classifyWasteInput(aco)
    expect(resAco.groupId).toBe('metal_aco')
    expect(WASTE_GROUPS[resAco.groupId].conamaClass).toBe('Classe B')
  })

  it('classifica tubos e conexões de PVC como Classe B', () => {
    const pvc: BudgetInput = {
      id: 'i-5',
      code: 'SINAPI-9868',
      description: 'Tubo de pvc serie normal, esgoto predial, dn 100 mm',
      unit: 'm',
      category: 'material',
      coefficient: 6,
      unitCost: 22.4,
    }
    const resPvc = classifyWasteInput(pvc)
    expect(resPvc.groupId).toBe('plastico_pvc')
    expect(WASTE_GROUPS[resPvc.groupId].conamaClass).toBe('Classe B')
  })

  it('classifica tintas, solventes e impermeabilizantes como Classe D (Perigosos)', () => {
    const tinta: BudgetInput = {
      id: 'i-6',
      code: 'SINAPI-7348',
      description: 'Tinta latex acrilica premium antimofo',
      unit: 'l',
      category: 'material',
      coefficient: 18,
      unitCost: 28.5,
    }
    const resTinta = classifyWasteInput(tinta)
    expect(resTinta.groupId).toBe('tintas_solventes')
    expect(WASTE_GROUPS[resTinta.groupId].conamaClass).toBe('Classe D')

    const solvente: BudgetInput = {
      id: 'i-7',
      code: 'SINAPI-1111',
      description: 'Solvente thinner para diluição de esmalte sintético',
      unit: 'l',
      category: 'material',
      coefficient: 2,
      unitCost: 19.0,
    }
    const resSolvente = classifyWasteInput(solvente)
    expect(resSolvente.groupId).toBe('tintas_solventes')
    expect(WASTE_GROUPS[resSolvente.groupId].conamaClass).toBe('Classe D')
  })

  it('classifica gesso acartonado / drywall conforme CONAMA 431', () => {
    const drywall: BudgetInput = {
      id: 'i-8',
      code: 'SINAPI-39430',
      description: 'Chapa de gesso acartonado standard ST 12.5mm',
      unit: 'm2',
      category: 'material',
      coefficient: 25,
      unitCost: 35.0,
    }
    const resDrywall = classifyWasteInput(drywall)
    expect(resDrywall.groupId).toBe('gesso')
    expect(WASTE_GROUPS[resDrywall.groupId].conamaClass).toBe('Classe B')
  })
})

describe('disposalEngine — Geração e Versionamento de Fichas de Descarte', () => {
  const sampleBudget: FullBudget = {
    id: 'orc-teste-descarte-01',
    code: 'ORC-2025-777',
    title: 'Obra de Teste com Gerenciamento de Resíduos',
    status: 'em_andamento',
    author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
    createdAt: '2025-05-01',
    updatedAt: '2025-05-01T10:00:00Z',
    client: {
      name: 'Cliente Real Construtora',
      document: '12.345.678/0001-99',
      email: 'contato@cliente.com',
      phone: '51988887777',
      address: 'Av. Ipiranga, 100',
      city: 'Porto Alegre',
      state: 'RS',
    },
    work: {
      name: 'Edifício Residencial Solarium',
      address: 'Rua Tomaz Gonzaga, 610',
      city: 'Porto Alegre',
      state: 'RS',
      description: 'Reforma geral de instalações e alvenaria',
      deadlineMonths: 6,
      startDate: '2025-06-01',
    },
    chargesConfig: {
      uf: 'RS',
      isRelieved: false,
      taxRegime: 'simples_nacional',
      simplesDasRate: 11.0,
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
        id: 'st-1',
        order: 1,
        code: '01',
        name: '01. ESTRUTURA E ALVENARIA',
        services: [
          {
            id: 'srv-1',
            order: 1,
            code: '01.01',
            description: 'Alvenaria de vedação com blocos cerâmicos',
            unit: 'm²',
            quantity: 50,
            composition: {
              id: 'comp-1',
              code: 'C-01',
              description: 'Alvenaria 1/2 vez',
              specialty: 'Alvenaria',
              unit: 'm²',
              source: 'CONCE',
              version: 'v1.0',
              inputs: [
                {
                  id: 'inp-1',
                  code: 'MAT-BLOCO',
                  description: 'Bloco cerâmico 9x19x19 cm',
                  unit: 'un',
                  category: 'material',
                  coefficient: 25,
                  unitCost: 1.2,
                },
                {
                  id: 'inp-2',
                  code: 'MAT-ARGAMASSA',
                  description: 'Argamassa mista de cimento, cal e areia',
                  unit: 'm³',
                  category: 'material',
                  coefficient: 0.02,
                  unitCost: 450,
                },
              ],
            },
          },
          {
            id: 'srv-2',
            order: 2,
            code: '01.02',
            description: 'Pintura acrílica em paredes',
            unit: 'm²',
            quantity: 100,
            composition: {
              id: 'comp-2',
              code: 'C-02',
              description: 'Pintura 2 demãos',
              specialty: 'Pintura',
              unit: 'm²',
              source: 'CONCE',
              version: 'v1.0',
              inputs: [
                {
                  id: 'inp-3',
                  code: 'MAT-TINTA',
                  description: 'Tinta acrílica fosca antimofo',
                  unit: 'l',
                  category: 'material',
                  coefficient: 0.3,
                  unitCost: 32,
                },
              ],
            },
          },
        ],
      },
    ],
  }

  it('gera fichas agrupadas por tipo com itens e identificação da obra', () => {
    const sheets = generateDisposalSheetsFromBudget(sampleBudget)
    expect(sheets.length).toBeGreaterThanOrEqual(2)

    const mineralSheet = sheets.find((s) => s.wasteGroup === 'entulho_alvenaria')
    expect(mineralSheet).toBeDefined()
    expect(mineralSheet?.conamaClass).toBe('Classe A')
    expect(mineralSheet?.items.length).toBe(2) // Bloco cerâmico + Argamassa
    expect(mineralSheet?.estimatedWeightKg).toBeGreaterThan(0)
    expect(mineralSheet?.certificate.status).toBe('pendente')

    const hazardousSheet = sheets.find((s) => s.wasteGroup === 'tintas_solventes')
    expect(hazardousSheet).toBeDefined()
    expect(hazardousSheet?.conamaClass).toBe('Classe D')
    expect(hazardousSheet?.items.length).toBe(1) // Tinta acrílica
    expect(hazardousSheet?.recommendedDestination).toContain('Co-processamento')
  })

  it('buildDisposalDocument gera versionamento incremental v1, v2...', () => {
    // Versão 1 inicial
    const docV1 = buildDisposalDocument(sampleBudget)
    expect(docV1.version).toBe(1)
    expect(docV1.budgetCode).toBe('ORC-2025-777')
    expect(docV1.technicalResponsible).toBe('Eng. Edenir Souza da Rosa')
    expect(docV1.technicalCrea).toBe('CREA/RS-252397')
    expect(docV1.totalEstimatedWeightKg).toBeGreaterThan(0)

    // Simula orçamento que já tinha a v1 anexada
    const budgetWithV1: FullBudget = {
      ...sampleBudget,
      disposalDocument: docV1,
    }

    // Gerar nova versão deve incrementar para v2
    const docV2 = buildDisposalDocument(budgetWithV1)
    expect(docV2.version).toBe(2)
    expect(docV2.attachedAt).toBe(docV1.attachedAt) // Preserva primeira anexação
    expect(new Date(docV2.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(docV1.updatedAt).getTime(),
    )
  })

  it('preserva dados do certificado preenchidos pelo usuário ao re-gerar ou atualizar versão', () => {
    const sheetsInitial = generateDisposalSheetsFromBudget(sampleBudget)
    const mineralSheet = sheetsInitial.find((s) => s.wasteGroup === 'entulho_alvenaria')!

    // Usuário preenche certificado de destino final
    mineralSheet.certificate = {
      status: 'emitido',
      transporterName: 'Trans-Entulho Ambiental LTDA',
      transporterCnpj: '11.222.333/0001-44',
      destinationCompany: 'EcoBrita Reciclagem de RCD',
      destinationCnpj: '55.666.777/0001-88',
      destinationType: 'Central de Britagem e Reciclagem de RCD',
      certificateOrManifestNumber: 'MTR-2025-08991',
      environmentalLicense: 'LO-FEPAM-1248/2023',
      disposalDate: '2025-05-15',
      responsibleTechnician: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      notes: 'Caçambas lacradas e destinadas para britagem móvel',
    }

    const docV1 = buildDisposalDocument(sampleBudget, sheetsInitial)
    const budgetWithCert: FullBudget = {
      ...sampleBudget,
      disposalDocument: docV1,
    }

    // Ao gerar novamente a partir do orçamento com dados salvos, os certificados preenchidos devem ser reaproveitados
    const sheetsNext = generateDisposalSheetsFromBudget(budgetWithCert)
    const preservedSheet = sheetsNext.find((s) => s.wasteGroup === 'entulho_alvenaria')!

    expect(preservedSheet.certificate.status).toBe('emitido')
    expect(preservedSheet.certificate.transporterName).toBe('Trans-Entulho Ambiental LTDA')
    expect(preservedSheet.certificate.certificateOrManifestNumber).toBe('MTR-2025-08991')
    expect(preservedSheet.certificate.environmentalLicense).toBe('LO-FEPAM-1248/2023')
  })
})
