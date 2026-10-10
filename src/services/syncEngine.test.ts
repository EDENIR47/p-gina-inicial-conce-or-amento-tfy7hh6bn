import { describe, it, expect, beforeEach, vi } from 'vitest'
import { syncEngine } from '@/services/syncEngine'
import { FullBudget } from '@/types/budgetEngine'
import {
  fullBudgetToCloudPayload,
  cloudOrcamentoToFullBudget,
  dataUrlToFile,
} from '@/services/cloudBudgetsService'

describe('Camada de Sincronização Cloud (PocketBase)', () => {
  const sampleBudget: FullBudget = {
    id: 'budget-test-real-001',
    code: 'ORC-2025-006',
    title: 'Reforma e Estrutura Residencial — Apto 1803',
    status: 'em_andamento',
    createdAt: '2025-04-10',
    updatedAt: '2025-04-10T12:00:00.000Z',
    author: 'Eng. Edenir Souza da Rosa',
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
      description: '',
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
      sicroReferenceMonth: '03/2025',
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
    stages: [],
  }

  beforeEach(() => {
    localStorage.clear()
  })

  it('converte FullBudget para payload de PocketBase com todos os campos estruturados', () => {
    const payload = fullBudgetToCloudPayload(sampleBudget, 'user_123')

    expect(payload.code).toBe('ORC-2025-006')
    expect(payload.client_name).toBe('Andreia de Oliveira da Costa e Jader da Costa')
    expect(payload.work_address).toBe('Rua Tomaz Gonzaga, 610, Apartamento 1803')
    expect(payload.user).toBe('user_123')
    expect(payload.local_id).toBe('budget-test-real-001')
    expect(payload.payload).toEqual(sampleBudget)
  })

  it('converte registro do PocketBase de volta para FullBudget preservando integridade', () => {
    const record = {
      id: 'pb_rec_999',
      local_id: 'budget-test-real-001',
      code: 'ORC-2025-006',
      title: 'Reforma e Estrutura Residencial — Apto 1803',
      status: 'em_andamento',
      client_data: sampleBudget.client,
      work_data: sampleBudget.work,
      created: '2025-04-10T12:00:00.000Z',
      updated: '2025-04-10T14:00:00.000Z',
      payload: sampleBudget,
    }

    const restored = cloudOrcamentoToFullBudget(record)
    expect(restored.id).toBe('budget-test-real-001')
    expect(restored.code).toBe('ORC-2025-006')
    expect(restored.client?.name).toBe('Andreia de Oliveira da Costa e Jader da Costa')
  })

  it('converte dataUrl base64 em File real para upload como anexo', () => {
    // 1x1 transparent gif base64
    const dataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    const file = dataUrlToFile(dataUrl, 'etapa-1.gif')

    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('etapa-1.gif')
    expect(file.type).toBe('image/gif')
    expect(file.size).toBeGreaterThan(0)
  })

  it('gerencia fila de mutações com enqueue de gravação e deleção', () => {
    syncEngine.enqueueBudgetSave(sampleBudget)
    const status = syncEngine.getStatus()
    expect(status.pendingCount).toBeGreaterThanOrEqual(1)

    // Se deletar o mesmo orçamento, remove o upsert anterior da fila
    syncEngine.enqueueBudgetDelete(sampleBudget.id)
    const queueRaw = localStorage.getItem('conce_sync_queue')
    expect(queueRaw).toBeTruthy()
    const queue = JSON.parse(queueRaw!)
    expect(
      queue.some((t: any) => t.type === 'delete_budget' && t.budgetId === sampleBudget.id),
    ).toBe(true)
    expect(
      queue.some((t: any) => t.type === 'upsert_budget' && t.budget?.id === sampleBudget.id),
    ).toBe(false)
  })
})
