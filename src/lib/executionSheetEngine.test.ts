/**
 * Testes da engine da Planilha de Orçamento de Execução (.xlsx):
 * exportação (estrutura do orçamento + colunas em branco + aba "Leia-me")
 * e importação (match por serviceId, validação de código ORC, preservação de estrutura).
 */
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import type { FullBudget } from '@/types/budgetEngine'
import {
  applyExecutionSheetPrices,
  buildExecutionSheet,
  EXEC_SHEET_NAME,
  normalizeExecSheetNumber,
} from './executionSheetEngine'

function makeBudget(): FullBudget {
  return {
    id: 'budget-test-1',
    code: 'ORC-2026-120',
    title: 'Obra Teste Alpha',
    status: 'em_andamento',
    client: {
      name: 'Cliente Teste Ltda',
      document: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
    },
    work: {
      name: 'Obra Teste Alpha',
      address: '',
      city: '',
      state: '',
      description: '',
      deadlineMonths: 0,
      startDate: '',
    },
    stages: [
      {
        id: 'stage-1',
        code: '01',
        name: 'Serviços Preliminares',
        services: [
          {
            id: 'serv-1',
            code: '01.01',
            description: 'Limpeza do terreno',
            unit: 'm2',
            quantity: 250,
            unitPrice: 10,
            unitPriceSource: 'Usuário',
          },
          {
            id: 'serv-2',
            code: '01.02',
            description: 'Locação da obra',
            unit: 'm2',
            quantity: 250,
            composition: { id: 'cpu-1', code: 'CPU-1', unit: 'm2', inputs: [] },
          },
        ],
      },
    ],
  } as unknown as FullBudget
}

function buildWorkbookBlob(budget: FullBudget): Blob {
  const result = buildExecutionSheet(budget)
  if (!result.success || !result.blob) {
    throw new Error(result.error || 'Falha ao gerar a planilha')
  }
  return result.blob
}

async function readWorkbookRows(blob: Blob): Promise<Record<string, any>[]> {
  const buffer = await blob.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[EXEC_SHEET_NAME]
  expect(ws).toBeDefined()
  return XLSX.utils.sheet_to_json(ws, { defval: null })
}

async function makeFilledBlobFrom(
  budget: FullBudget,
  mutate: (rows: Record<string, any>[]) => void,
): Promise<Blob> {
  const rows = await readWorkbookRows(buildWorkbookBlob(budget))
  mutate(rows)
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, EXEC_SHEET_NAME)
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('buildExecutionSheet', () => {
  it('gera um .xlsx com uma linha por serviço e colunas em branco para preencher', async () => {
    const budget = makeBudget()
    const blob = buildWorkbookBlob(budget)
    expect(blob.size).toBeGreaterThan(0)

    const rows = await readWorkbookRows(blob)
    expect(rows).toHaveLength(2)
    expect(String(rows[0]['Código Serviço'])).toBe('01.01')
    expect(String(rows[0]['Serviço'])).toBe('Limpeza do terreno')
    expect(String(rows[0]['Unidade'])).toBe('m2')
    expect(rows[0]['Quantidade']).toBe(250)
    // Colunas do colaborador nascem em branco
    expect(rows[0]['Preço de Execução (R$)']).toBeNull()
    expect(rows[0]['Observações do Colaborador']).toBeNull()
  })

  it('preenche o cabeçalho com código, nome, cliente e obra do orçamento aberto', async () => {
    const rows = await readWorkbookRows(buildWorkbookBlob(makeBudget()))
    expect(rows.every((r) => String(r['Código do Orçamento']) === 'ORC-2026-120')).toBe(true)
    expect(rows.every((r) => String(r['Nome do Orçamento']) === 'Obra Teste Alpha')).toBe(true)
    expect(rows.every((r) => String(r['Cliente']) === 'Cliente Teste Ltda')).toBe(true)
  })

  it('não usa fallback hard-coded de cliente/obra: campo vazio fica em branco', async () => {
    const budget = makeBudget()
    budget.client = {
      name: '',
      document: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
    }
    budget.work = { ...budget.work, name: '' }
    const rows = await readWorkbookRows(buildWorkbookBlob(budget))
    expect(String(rows[0]['Cliente'] ?? '')).toBe('')
    expect(String(rows[0]['Obra'] ?? '')).toBe('')
  })

  it('inclui a aba "Leia-me" com a identificação do orçamento', async () => {
    const buffer = await buildWorkbookBlob(makeBudget()).arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    expect(wb.SheetNames).toContain('Leia-me')
    const info = XLSX.utils.sheet_to_json<{ A: string; B?: string }>(wb.Sheets['Leia-me'], {
      header: 'A',
    })
    const flat = info.map((r) => Object.values(r).join(' ')).join(' | ')
    expect(flat).toContain('ORC-2026-120')
  })
})

describe('normalizeExecSheetNumber', () => {
  it('interpreta números em formato brasileiro', () => {
    expect(normalizeExecSheetNumber('1.234,56')).toBeCloseTo(1234.56)
    expect(normalizeExecSheetNumber('R$ 12,50')).toBeCloseTo(12.5)
    expect(normalizeExecSheetNumber(7)).toBeCloseTo(7)
    expect(normalizeExecSheetNumber('')).toBe(0)
    expect(normalizeExecSheetNumber('abc')).toBe(0)
  })
})

describe('applyExecutionSheetPrices', () => {
  it('não muta o orçamento original (retorna uma cópia)', async () => {
    const budget = makeBudget()
    const blob = await makeFilledBlobFrom(budget, (rows) => {
      rows[0]['Preço de Execução (R$)'] = 15.5
    })
    const result = await applyExecutionSheetPrices(budget, blob)
    expect(result.success).toBe(true)
    if (result.success && result.budget) {
      const srv = result.budget.stages[0].services[0]
      expect(srv.unitPrice).toBeCloseTo(15.5)
      expect(srv.unitPriceSource).toBe('Usuário')
      // original intacto
      expect(budget.stages[0].services[0].unitPrice).toBeCloseTo(10)
      expect(budget.stages[0].services[1].unitPrice).toBeUndefined()
    }
  })

  it('aplica preços por linha e preserva serviços sem preço (não duplica itens)', async () => {
    const budget = makeBudget()
    const blob = await makeFilledBlobFrom(budget, (rows) => {
      rows[1]['Preço de Execução (R$)'] = 'R$ 20,00'
    })
    const result = await applyExecutionSheetPrices(budget, blob)
    expect(result.success).toBe(true)
    if (result.success && result.budget) {
      expect(result.budget.stages[0].services).toHaveLength(2)
      expect(result.budget.stages[0].services[0].unitPrice).toBeCloseTo(10)
      expect(result.budget.stages[0].services[1].unitPrice).toBeCloseTo(20)
      expect(result.budget.stages[0].services[1].unitPriceSource).toBe('Usuário')
    }
  })

  it('rejeita planilha de outro orçamento (código ORC divergente) sem alterar nada', async () => {
    const budget = makeBudget()
    const blob = await makeFilledBlobFrom(budget, (rows) => {
      rows[0]['Código do Orçamento'] = 'ORC-2026-101'
    })
    const result = await applyExecutionSheetPrices(budget, blob)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('ORC-2026-101')
      expect(result.error).toContain('ORC-2026-120')
    }
    // Nada foi alterado
    expect(budget.stages[0].services[0].unitPrice).toBeCloseTo(10)
  })

  it('rejeita arquivo inválido (não é .xlsx)', async () => {
    const result = await applyExecutionSheetPrices(makeBudget(), new Blob(['isto não é um xlsx']))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('inválido')
    }
  })

  it('rejeita planilha sem a coluna Preço de Execução', async () => {
    const blob = await makeFilledBlobFrom(makeBudget(), (rows) => {
      for (const r of rows) delete r['Preço de Execução (R$)']
    })
    const result = await applyExecutionSheetPrices(makeBudget(), blob)
    expect(result.success).toBe(false)
  })

  it('planilha sem nenhum preço preenchido é rejeitada com aviso claro', async () => {
    const blob = await makeFilledBlobFrom(makeBudget(), () => {})
    const result = await applyExecutionSheetPrices(makeBudget(), blob)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('nenhum preço')
    }
  })

  it('rejeita orçamento sem serviços ao exportar', () => {
    const budget = makeBudget()
    budget.stages[0].services = []
    const result = buildExecutionSheet(budget)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('não possui serviços')
    }
  })
})
