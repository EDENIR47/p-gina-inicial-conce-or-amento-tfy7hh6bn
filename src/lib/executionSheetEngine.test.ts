/**
 * Testes da engine da Planilha de Orçamento de Execução (.xlsx):
 * exportação (7 colunas + colunas em branco + aba "Leia-me")
 * e importação (match por código do serviço, validação de código ORC, rejeição total).
 */
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import type { FullBudget } from '@/types/budgetEngine'
import {
  applyExecutionSheetPrices,
  buildExecutionSheet,
  EXEC_SHEET_NAME,
  EXEC_SHEET_README_NAME,
  normalizeExecSheetNumber,
} from './executionSheetEngine'

const EXPECTED_HEADERS = [
  'Código',
  'Serviço',
  'Quantidade',
  'Unidade',
  'Valor Unitário',
  'Valor Total',
  'Observação',
]

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

async function readExecRows(blob: Blob): Promise<Record<string, any>[]> {
  const buffer = await blob.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[EXEC_SHEET_NAME]
  expect(ws).toBeDefined()
  return XLSX.utils.sheet_to_json(ws, { defval: null })
}

/**
 * Simula o colaborador: exporta, altera as linhas da aba de execução e devolve
 * um novo arquivo mantendo a aba "Leia-me" (que carrega o código do orçamento).
 */
async function makeFilledBlobFrom(
  budget: FullBudget,
  mutate: (rows: Record<string, any>[]) => void,
): Promise<Blob> {
  const buffer = await buildWorkbookBlob(budget).arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[EXEC_SHEET_NAME], {
    defval: null,
  })
  mutate(rows)
  wb.Sheets[EXEC_SHEET_NAME] = XLSX.utils.json_to_sheet(rows)
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('buildExecutionSheet', () => {
  it('gera exatamente as 7 colunas na ordem pedida', async () => {
    const rows = await readExecRows(buildWorkbookBlob(makeBudget()))
    expect(Object.keys(rows[0])).toEqual(EXPECTED_HEADERS)
  })

  it('preenche Código, Serviço, Quantidade e Unidade a partir do orçamento', async () => {
    const rows = await readExecRows(buildWorkbookBlob(makeBudget()))
    expect(rows).toHaveLength(2)
    expect(String(rows[0]['Código'])).toBe('01.01')
    expect(String(rows[0]['Serviço'])).toBe('Limpeza do terreno')
    expect(rows[0]['Quantidade']).toBe(250)
    expect(String(rows[0]['Unidade'])).toBe('m2')
    expect(String(rows[1]['Código'])).toBe('01.02')
  })

  it('deixa Valor Unitário, Valor Total e Observação em branco', async () => {
    const rows = await readExecRows(buildWorkbookBlob(makeBudget()))
    for (const row of rows) {
      expect(row['Valor Unitário']).toBeNull()
      expect(row['Valor Total']).toBeNull()
      expect(row['Observação']).toBeNull()
    }
  })

  it('não expõe ID interno nem colunas de identificação do orçamento na tabela', async () => {
    const rows = await readExecRows(buildWorkbookBlob(makeBudget()))
    const keys = Object.keys(rows[0])
    expect(keys).not.toContain('ID Interno (não remover)')
    expect(keys).not.toContain('Código do Orçamento')
    expect(keys).not.toContain('Cliente')
    expect(keys).not.toContain('Obra')
    expect(keys).not.toContain('Etapa')
  })

  it('inclui a aba "Leia-me" com o código do orçamento aberto', async () => {
    const buffer = await buildWorkbookBlob(makeBudget()).arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    expect(wb.SheetNames).toContain(EXEC_SHEET_README_NAME)
    const info = XLSX.utils.sheet_to_json<{ A: string; B?: string }>(
      wb.Sheets[EXEC_SHEET_README_NAME],
      { header: 'A' },
    )
    const flat = info.map((r) => Object.values(r).join(' ')).join(' | ')
    expect(flat).toContain('ORC-2026-120')
    expect(flat).toContain('Valor Unitário')
  })

  it('não usa fallback hard-coded de cliente/obra: campo vazio fica em branco', () => {
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
    budget.title = ''
    const result = buildExecutionSheet(budget)
    expect(result.success).toBe(true)
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

  it('rejeita exportação quando há códigos de serviço repetidos', () => {
    const budget = makeBudget()
    budget.stages[0].services[1].code = '01.01'
    const result = buildExecutionSheet(budget)
    expect(result.success).toBe(false)
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
  it('exportar → preencher Valor Unitário → importar aplica o preço pelo código', async () => {
    const budget = makeBudget()
    const blob = await makeFilledBlobFrom(budget, (rows) => {
      rows[1]['Valor Unitário'] = 'R$ 20,00'
    })
    const result = await applyExecutionSheetPrices(budget, blob)
    expect(result.success).toBe(true)
    if (result.success && result.budget) {
      expect(result.updatedCount).toBe(1)
      expect(result.budget.stages[0].services).toHaveLength(2)
      expect(result.budget.stages[0].services[0].unitPrice).toBeCloseTo(10)
      expect(result.budget.stages[0].services[1].unitPrice).toBeCloseTo(20)
      expect(result.budget.stages[0].services[1].unitPriceSource).toBe('Usuário')
    }
  })

  it('não muta o orçamento original (retorna uma cópia)', async () => {
    const budget = makeBudget()
    const blob = await makeFilledBlobFrom(budget, (rows) => {
      rows[0]['Valor Unitário'] = 15.5
    })
    const result = await applyExecutionSheetPrices(budget, blob)
    expect(result.success).toBe(true)
    if (result.success && result.budget) {
      const srv = result.budget.stages[0].services[0]
      expect(srv.unitPrice).toBeCloseTo(15.5)
      expect(srv.unitPriceSource).toBe('Usuário')
      expect(budget.stages[0].services[0].unitPrice).toBeCloseTo(10)
      expect(budget.stages[0].services[1].unitPrice).toBeUndefined()
    }
  })

  it('Quantidade, Unidade e Valor Total não alteram o orçamento', async () => {
    const budget = makeBudget()
    const blob = await makeFilledBlobFrom(budget, (rows) => {
      rows[0]['Valor Unitário'] = 5
      rows[0]['Valor Total'] = 99999
      rows[0]['Quantidade'] = 1
      rows[0]['Unidade'] = 'un'
    })
    const result = await applyExecutionSheetPrices(budget, blob)
    expect(result.success).toBe(true)
    if (result.success && result.budget) {
      const srv = result.budget.stages[0].services[0]
      expect(srv.quantity).toBe(250)
      expect(srv.unit).toBe('m2')
      expect(srv.unitPrice).toBeCloseTo(5)
    }
  })

  it('Observação é anexada às notas do serviço', async () => {
    const budget = makeBudget()
    const blob = await makeFilledBlobFrom(budget, (rows) => {
      rows[0]['Valor Unitário'] = 5
      rows[0]['Observação'] = 'Inclui caçamba'
    })
    const result = await applyExecutionSheetPrices(budget, blob)
    expect(result.success).toBe(true)
    if (result.success && result.budget) {
      expect(result.budget.stages[0].services[0].notes).toBe('Inclui caçamba')
    }
  })

  it('rejeita planilha de outro orçamento (código ORC divergente) sem alterar nada', async () => {
    const budget = makeBudget()
    const buffer = await makeFilledBlobFrom(budget, (rows) => {
      rows[0]['Valor Unitário'] = 7
    }).then((b) => b.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'array' })
    const readme = XLSX.utils.sheet_to_json<{ A: string; B: string }>(
      wb.Sheets[EXEC_SHEET_README_NAME],
      { header: 'A' },
    )
    wb.Sheets[EXEC_SHEET_README_NAME] = XLSX.utils.aoa_to_sheet(
      readme.map((r) => [r.A, r.A === 'Código do Orçamento' ? 'ORC-2026-101' : r.B]),
    )
    const blob = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })])
    const result = await applyExecutionSheetPrices(budget, blob)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('ORC-2026-101')
      expect(result.error).toContain('ORC-2026-120')
    }
    expect(budget.stages[0].services[0].unitPrice).toBeCloseTo(10)
  })

  it('rejeita tudo se alguma linha com preço não casar com um código do orçamento', async () => {
    const budget = makeBudget()
    const blob = await makeFilledBlobFrom(budget, (rows) => {
      rows[0]['Valor Unitário'] = 3
      rows[1]['Valor Unitário'] = 4
      rows[1]['Código'] = '99.99'
    })
    const result = await applyExecutionSheetPrices(budget, blob)
    expect(result.success).toBe(false)
    expect(budget.stages[0].services[0].unitPrice).toBeCloseTo(10)
  })

  it('rejeita arquivo inválido (não é .xlsx)', async () => {
    const result = await applyExecutionSheetPrices(makeBudget(), new Blob(['isto não é um xlsx']))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('inválido')
    }
  })

  it('rejeita planilha sem a coluna Valor Unitário', async () => {
    const blob = await makeFilledBlobFrom(makeBudget(), (rows) => {
      for (const r of rows) delete r['Valor Unitário']
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
})
