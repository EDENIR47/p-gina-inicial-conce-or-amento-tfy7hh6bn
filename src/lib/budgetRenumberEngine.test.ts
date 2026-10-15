/**
 * Testes unitários do motor de renumeração canônica de orçamentos CONCE.
 *
 * Valida:
 * 1. Ordenação cronológica estável (do mais antigo para o mais novo).
 * 2. Atribuição sequencial começando em 100 no formato ORC-{ANO}-N.
 * 3. Prevenção de colisões com orçamentos já existentes no padrão canônico.
 * 4. Preservação de dados técnicos (etapas, serviços, insumos, BDI, valores).
 * 5. Propagação do código novo para presentationDocument e savedMemorial.
 * 6. Compatibilidade pós-renumeração: o próximo código gerado continua acima do maior código alocado.
 */

import { describe, it, expect } from 'vitest'
import {
  getBudgetCreationTimestamp,
  sortBudgetsChronologically,
  buildBudgetRenumberPlan,
  replaceExactCodeReferences,
  applyCodeToBudget,
  renumberBudgetsCollection,
} from './budgetRenumberEngine'
import { generateNextBudgetCode } from './budgetCodeGenerator'
import { FullBudget } from '@/types/budgetEngine'

function createMockBudget(partial: Partial<FullBudget> & { id: string; code: string }): FullBudget {
  return {
    id: partial.id,
    code: partial.code,
    title: partial.title || 'Reforma Comercial',
    status: partial.status || 'em_andamento',
    createdAt: partial.createdAt || '2025-01-10T10:00:00.000Z',
    updatedAt: partial.updatedAt || '2025-01-10T10:00:00.000Z',
    author: 'Eng. Edenir Souza da Rosa',
    paymentTerms: '30% entrada / saldo final',
    validityDays: 10,
    validityDaysType: 'uteis',
    client: {
      name: 'Cliente Teste',
      document: '000.000.000-00',
      email: 'cliente@exemplo.com',
      phone: '(51) 99999-9999',
      address: 'Rua das Flores, 10',
      city: 'Porto Alegre',
      state: 'RS',
    },
    work: {
      name: 'Obra Teste',
      address: 'Rua das Flores, 100',
      city: 'Porto Alegre',
      state: 'RS',
      description: 'Reforma geral',
      startDate: '2025-01-10',
      deadlineMonths: 3,
    },
    chargesConfig: {
      uf: 'RS',
      isRelieved: false,
      taxRegime: 'simples_nacional',
      simplesCollectionOption: 'cpp_inclusa_das',
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
        iss: 4,
        pis: 0.65,
        cofins: 3,
        inssOrCprb: 0,
        totalTaxes: 11,
        simplesDas: 11,
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
      sicroReferenceMonth: '03/2025',
      hasDisallowanceClause: false,
    },
    stages: [
      {
        id: `stg-${partial.id}-1`,
        code: '01',
        name: 'Serviços Preliminares',
        order: 1,
        services: [
          {
            id: `srv-${partial.id}-1`,
            code: '01.01',
            description: 'Locação da obra',
            unit: 'm2',
            order: 1,
            quantity: 150,
            unitPrice: 15,
            composition: {
              id: 'comp-1',
              code: 'CP-01',
              description: 'Locação da obra',
              specialty: 'Serviços Preliminares',
              unit: 'm2',
              version: 'v1.0',
              source: 'CONCE',
              unitCost: 10,
              inputs: [],
            },
          },
        ],
      },
    ],
    presentationDocument: partial.presentationDocument,
    savedMemorial: partial.savedMemorial,
  }
}

describe('budgetRenumberEngine', () => {
  describe('getBudgetCreationTimestamp e sortBudgetsChronologically', () => {
    it('ordena orçamentos estritamente por ordem cronológica de criação', () => {
      const b1 = createMockBudget({ id: 'b1', code: 'ORC-2025-006', createdAt: '2024-11-01' })
      const b2 = createMockBudget({ id: 'b2', code: 'ORC-001', createdAt: '2025-02-15' })
      const b3 = createMockBudget({ id: 'b3', code: 'ORC-DEMO-001', createdAt: '2024-05-10' })
      const b4 = createMockBudget({ id: 'b4', code: 'ORC-0015/2025', createdAt: '2025-08-20' })

      const sorted = sortBudgetsChronologically([b1, b2, b3, b4])
      expect(sorted.map((b) => b.id)).toEqual(['b3', 'b1', 'b2', 'b4'])
    })

    it('usa fallback de timestamp contido no ID se a data for inválida ou vazia', () => {
      const bA = createMockBudget({ id: 'budget-1700000000000', code: 'ORC-A', createdAt: '' })
      const bB = createMockBudget({ id: 'budget-1600000000000', code: 'ORC-B', createdAt: '' })

      const sorted = sortBudgetsChronologically([bA, bB])
      expect(sorted[0].id).toBe('budget-1600000000000')
      expect(sorted[1].id).toBe('budget-1700000000000')
    })
  })

  describe('buildBudgetRenumberPlan', () => {
    it('gera plano de renumeração a partir de 100 para o ano alvo (ex.: 2026)', () => {
      const b1 = createMockBudget({ id: 'b1', code: 'ORC-2025-006', createdAt: '2025-01-01' })
      const b2 = createMockBudget({ id: 'b2', code: 'ORC-DEMO-001', createdAt: '2025-02-01' })
      const b3 = createMockBudget({ id: 'b3', code: 'ORC-001', createdAt: '2025-03-01' })
      const b4 = createMockBudget({ id: 'b4', code: 'ORC-0015/2025', createdAt: '2025-04-01' })

      const plan = buildBudgetRenumberPlan([b4, b1, b3, b2], 2026)

      expect(plan.year).toBe(2026)
      expect(plan.totalCount).toBe(4)
      expect(plan.changedCount).toBe(4)

      // Ordem cronológica esperada: b1 -> b2 -> b3 -> b4
      expect(plan.items[0]).toMatchObject({
        id: 'b1',
        oldCode: 'ORC-2025-006',
        newCode: 'ORC-2026-100',
        alreadyCanonical: false,
      })
      expect(plan.items[1]).toMatchObject({
        id: 'b2',
        oldCode: 'ORC-DEMO-001',
        newCode: 'ORC-2026-101',
        alreadyCanonical: false,
      })
      expect(plan.items[2]).toMatchObject({
        id: 'b3',
        oldCode: 'ORC-001',
        newCode: 'ORC-2026-102',
        alreadyCanonical: false,
      })
      expect(plan.items[3]).toMatchObject({
        id: 'b4',
        oldCode: 'ORC-0015/2025',
        newCode: 'ORC-2026-103',
        alreadyCanonical: false,
      })
    })

    it('identifica corretamente orçamentos que já estão no padrão canônico', () => {
      const b1 = createMockBudget({ id: 'b1', code: 'ORC-2026-100', createdAt: '2026-01-01' })
      const b2 = createMockBudget({ id: 'b2', code: 'ORC-2026-101', createdAt: '2026-01-02' })
      const b3 = createMockBudget({ id: 'b3', code: 'ORC-OLD-999', createdAt: '2026-01-03' })

      const plan = buildBudgetRenumberPlan([b1, b2, b3], 2026)
      expect(plan.changedCount).toBe(1)
      expect(plan.alreadyCanonicalCount).toBe(2)
      expect(plan.items[0].alreadyCanonical).toBe(true)
      expect(plan.items[1].alreadyCanonical).toBe(true)
      expect(plan.items[2].alreadyCanonical).toBe(false)
      expect(plan.items[2].newCode).toBe('ORC-2026-102')
    })
  })

  describe('replaceExactCodeReferences', () => {
    it('substitui ocorrências exatas do código sem afetar palavras similares', () => {
      const text = 'Este documento refere-se ao orçamento ORC-2025-006 emitido para a CONCE.'
      const res = replaceExactCodeReferences(text, 'ORC-2025-006', 'ORC-2026-100')
      expect(res).toBe('Este documento refere-se ao orçamento ORC-2026-100 emitido para a CONCE.')
    })

    it('preserva strings quando o código antigo não ocorre', () => {
      const text = 'Nenhum código presente aqui.'
      expect(replaceExactCodeReferences(text, 'ORC-99', 'ORC-100')).toBe(
        'Nenhum código presente aqui.',
      )
    })
  })

  describe('applyCodeToBudget', () => {
    it('atualiza code e propaga para presentationDocument e memorial descritivo', () => {
      const original = createMockBudget({
        id: 'b-full',
        code: 'ORC-2025-006',
        presentationDocument: {
          version: 2,
          attachedAt: '2025-05-10T10:00:00Z',
          updatedAt: '2025-05-10T10:00:00Z',
          budgetCode: 'ORC-2025-006',
          budgetTitle: 'Obra Comercial',
          clientName: 'Cliente A',
          workName: 'Obra A',
          finalSalePrice: 150000,
          bdiRate: 28.5,
          stagesCount: 1,
          servicesCount: 1,
          documentTitle: 'PROPOSTA TÉCNICA E COMERCIAL',
          format: 'documento-a4-retrato',
          sections: [],
          complexityLevel: 'padrao',
        },
        savedMemorial: {
          generatedAt: '2025-05-10T10:00:00Z',
          updatedAt: '2025-05-10T10:00:00Z',
          generalIntroduction: 'Memorial técnico complementar do orçamento ORC-2025-006 da CONCE.',
          stages: [
            {
              stageId: 'stg-1',
              stageCode: '01',
              stageName: 'Fundação',
              services: [
                {
                  serviceId: 'srv-1',
                  serviceCode: '01.01',
                  serviceDescription: 'Brocas',
                  technicalSpecification: 'Especificação do serviço sob o orçamento ORC-2025-006.',
                  quantity: 10,
                  unit: 'un',
                },
              ],
            },
          ],
          includeStagePhotos: false,
          includeSummary: true,
        },
      })

      const updated = applyCodeToBudget(original, 'ORC-2026-100', 'ORC-2025-006')

      // 1. Código principal
      expect(updated.code).toBe('ORC-2026-100')

      // 2. Anexo da proposta
      expect(updated.presentationDocument?.budgetCode).toBe('ORC-2026-100')

      // 3. Memorial descritivo
      expect(updated.savedMemorial?.generalIntroduction).toBe(
        'Memorial técnico complementar do orçamento ORC-2026-100 da CONCE.',
      )
      expect(updated.savedMemorial?.stages[0].services[0].technicalSpecification).toBe(
        'Especificação do serviço sob o orçamento ORC-2026-100.',
      )

      // 4. Integridade dos dados técnicos mantida
      expect(updated.stages[0].services[0].composition?.unitCost).toBe(10)
      expect(updated.chargesConfig.simplesDasRate).toBe(11.0)
      expect(updated.bdiConfig.calculatedBdi).toBe(28.5)
    })
  })

  describe('renumberBudgetsCollection e compatibilidade com orçamentos novos', () => {
    it('renumera coleção e garante que próximo orçamento novo segue sequência correta', () => {
      const b1 = createMockBudget({ id: 'b1', code: 'ORC-2025-001', createdAt: '2025-01-01' })
      const b2 = createMockBudget({ id: 'b2', code: 'ORC-DEMO-X', createdAt: '2025-02-01' })
      const b3 = createMockBudget({ id: 'b3', code: 'ORC-999', createdAt: '2025-03-01' })

      const res = renumberBudgetsCollection([b1, b2, b3], 2026)
      expect(res.success).toBe(true)
      expect(res.totalProcessed).toBe(3)
      expect(res.updatedBudgets.map((b) => b.code)).toEqual([
        'ORC-2026-100',
        'ORC-2026-101',
        'ORC-2026-102',
      ])

      // Verifica que o motor de orçamentos novos da v0.0.113 agora gera ORC-2026-103
      const nextCode = generateNextBudgetCode(res.updatedBudgets, 2026)
      expect(nextCode).toBe('ORC-2026-103')
    })
  })
})
