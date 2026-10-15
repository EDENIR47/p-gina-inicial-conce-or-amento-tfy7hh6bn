/**
 * Testes unitários do gerador de código de orçamento CONCE (ORC-ANO-NÚMERO).
 * Regra vigente desde 2026: sequência anual começa em 100 (ORC-2026-100, 101, ...),
 * próximo = (maior número usado no ano) + 1, ano dinâmico via new Date().getFullYear().
 * Registros locais e do cloud PocketBase entram na mesma contagem.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  BUDGET_CODE_SEQUENCE_START,
  extractBudgetCodeParts,
  getMaxBudgetNumberForYear,
  generateNextBudgetCode,
  generateNextBudgetCodeForCurrentYear,
} from './budgetCodeGenerator'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('extractBudgetCodeParts', () => {
  it('extrai ano e número de um código canônico', () => {
    expect(extractBudgetCodeParts('ORC-2026-100')).toEqual({ year: 2026, number: 100 })
    expect(extractBudgetCodeParts('ORC-2025-006')).toEqual({ year: 2025, number: 6 })
    expect(extractBudgetCodeParts('orc_2026_102')).toEqual({ year: 2026, number: 102 })
    expect(extractBudgetCodeParts('ORC-2026-100-COP')).toEqual({ year: 2026, number: 100 })
  })

  it('rejeita códigos fora do padrão canônico (não interfere na contagem)', () => {
    expect(extractBudgetCodeParts('ORC-DEMO-001')).toBeNull()
    expect(extractBudgetCodeParts('ORC-001')).toBeNull()
    expect(extractBudgetCodeParts('ORC-0015/2025')).toBeNull()
    expect(extractBudgetCodeParts('ORC-X-99')).toBeNull()
    expect(extractBudgetCodeParts('')).toBeNull()
    expect(extractBudgetCodeParts(undefined)).toBeNull()
    expect(extractBudgetCodeParts(null)).toBeNull()
  })
})

describe('getMaxBudgetNumberForYear', () => {
  it('retorna null quando o ano não tem nenhum código canônico', () => {
    const codes = ['ORC-2025-006', 'ORC-DEMO-001', 'ORC-001']
    expect(getMaxBudgetNumberForYear(codes, 2026)).toBeNull()
  })

  it('ignora registros de outros anos e códigos livres do usuário', () => {
    const codes = [
      'ORC-2025-006', // orçamento real existente (mantém código; não entra na contagem de 2026)
      { code: 'ORC-2026-100' },
      'ORC-DEMO-001',
      { code: 'ORC-2026-102' },
      'ORC-0015/2025',
    ]
    expect(getMaxBudgetNumberForYear(codes, 2026)).toBe(102)
    expect(getMaxBudgetNumberForYear(codes, 2025)).toBe(6)
  })
})

describe('generateNextBudgetCode (função pura)', () => {
  it('ano vazio: primeiro código do ano é ORC-2026-100 (sequência começa em 100)', () => {
    expect(BUDGET_CODE_SEQUENCE_START).toBe(100)
    expect(generateNextBudgetCode([], 2026)).toBe('ORC-2026-100')
  })

  it('sequência incremental: 100 → 101 → 102', () => {
    const first = generateNextBudgetCode([], 2026)
    const second = generateNextBudgetCode([{ code: first }], 2026)
    const third = generateNextBudgetCode([{ code: first }, { code: second }], 2026)
    expect(first).toBe('ORC-2026-100')
    expect(second).toBe('ORC-2026-101')
    expect(third).toBe('ORC-2026-102')
  })

  it('maior número no meio da lista: existindo 100 e 102, o próximo é 103', () => {
    const codes = [
      { code: 'ORC-2026-100' },
      { code: 'ORC-2026-102' }, // maior número, fora da ordem
      { code: 'ORC-2026-101' },
      { code: 'ORC-2025-055' }, // outro ano: ignorado
    ]
    expect(generateNextBudgetCode(codes, 2026)).toBe('ORC-2026-103')
  })

  it('nunca volta para baixo do início da sequência (100)', () => {
    expect(generateNextBudgetCode([{ code: 'ORC-2026-007' }], 2026)).toBe('ORC-2026-100')
  })

  it('ano dinâmico: em 2027 recomeça em ORC-2027-100', () => {
    const codes = [{ code: 'ORC-2026-104' }, { code: 'ORC-2025-006' }]
    expect(generateNextBudgetCode(codes, 2027)).toBe('ORC-2027-100')
  })

  it('soma registros vindos do cloud e do localStorage na mesma contagem', () => {
    const localOnly = [{ code: 'ORC-2026-100' }]
    const cloudOnly = [{ code: 'ORC-2026-101' }, { code: 'ORC-2026-105' }]
    expect(generateNextBudgetCode([...localOnly, ...cloudOnly], 2026)).toBe('ORC-2026-106')
  })
})

describe('generateNextBudgetCodeForCurrentYear (integração local + cloud)', () => {
  it('usa o ano corrente real (new Date().getFullYear())', async () => {
    const currentYear = new Date().getFullYear()
    vi.doMock('./budgetsStorage', () => ({
      getStoredFullBudgets: () => [{ code: 'ORC-2025-006' }],
    }))
    vi.doMock('../services/cloudBudgetsService', () => ({
      fetchCloudOrcamentos: async () => [{ code: `ORC-${currentYear}-102` }],
    }))
    const { generateNextBudgetCodeForCurrentYear: genFresh } = await import('./budgetCodeGenerator')
    expect(await genFresh()).toBe(`ORC-${currentYear}-103`)
  })

  it('sem nenhum orçamento do ano corrente: começa em 100', async () => {
    vi.doMock('./budgetsStorage', () => ({ getStoredFullBudgets: () => [] }))
    vi.doMock('../services/cloudBudgetsService', () => ({ fetchCloudOrcamentos: async () => [] }))
    const { generateNextBudgetCodeForCurrentYear: genFresh } = await import('./budgetCodeGenerator')
    const code = await genFresh()
    expect(code).toBe(`ORC-${new Date().getFullYear()}-100`)
  })

  it('cloud indisponível: sequência segue considerando somente o localStorage', async () => {
    vi.doMock('./budgetsStorage', () => ({
      getStoredFullBudgets: () => [{ code: `ORC-${new Date().getFullYear()}-100` }],
    }))
    vi.doMock('../services/cloudBudgetsService', () => ({
      fetchCloudOrcamentos: async () => {
        throw new Error('offline')
      },
    }))
    const { generateNextBudgetCodeForCurrentYear: genFresh } = await import('./budgetCodeGenerator')
    expect(await genFresh()).toBe(`ORC-${new Date().getFullYear()}-101`)
  })

  it('ano corrente vazio mas ano anterior cheio: novo ano NÃO herda a sequência', async () => {
    const currentYear = new Date().getFullYear()
    vi.doMock('./budgetsStorage', () => ({
      getStoredFullBudgets: () => [{ code: `ORC-${currentYear - 1}-214` }],
    }))
    vi.doMock('../services/cloudBudgetsService', () => ({ fetchCloudOrcamentos: async () => [] }))
    const { generateNextBudgetCodeForCurrentYear: genFresh } = await import('./budgetCodeGenerator')
    expect(await genFresh()).toBe(`ORC-${currentYear}-100`)
  })

  it('usa o ano de referência informado quando passado explicitamente (2026)', async () => {
    vi.doMock('./budgetsStorage', () => ({
      getStoredFullBudgets: () => [{ code: 'ORC-2026-100' }],
    }))
    vi.doMock('../services/cloudBudgetsService', () => ({ fetchCloudOrcamentos: async () => [] }))
    const { generateNextBudgetCodeForCurrentYear: genFresh } = await import('./budgetCodeGenerator')
    expect(await genFresh(2026)).toBe('ORC-2026-101')
  })
})
