/**
 * Engine da Planilha de Orçamento de Execução (CONCE).
 *
 * EXPORTAÇÃO: gera um .xlsx com a estrutura do orçamento aberto (etapas → serviços),
 * colunas de identificação preenchidas e colunas VAZIAS para o colaborador preencher
 * (Preço de Execução). Regra permanente: usa EXCLUSIVAMENTE o orçamento aberto,
 * sem fallbacks hard-coded de cliente/obra — campo vazio fica em branco.
 *
 * IMPORTAÇÃO: lê o .xlsx preenchido de volta, valida que pertence ao mesmo
 * orçamento (pelo código ORC-AAAA-XXX + id interno) e aplica os preços por
 * correspondência exata de serviceId (coluna oculta) — nunca duplica itens e
 * preserva a estrutura existente (mesma filosofia do presentationGuard).
 */
import * as XLSX from 'xlsx'
import type { BudgetStage, FullBudget } from '@/types/budgetEngine'

export const EXEC_SHEET_NAME = 'Planilha de Execução'
export const EXEC_SHEET_README_NAME = 'Leia-me'

const COL_BUDGET_CODE = 'Código do Orçamento'
const COL_BUDGET_NAME = 'Nome do Orçamento'
const COL_CLIENT = 'Cliente'
const COL_WORK = 'Obra'
const COL_STAGE = 'Etapa'
const COL_STAGE_CODE = 'Cód. Etapa'
const COL_SERVICE_CODE = 'Código Serviço'
const COL_SERVICE = 'Serviço'
const COL_UNIT = 'Unidade'
const COL_QTY = 'Quantidade'
const COL_EXEC_PRICE = 'Preço de Execução (R$)'
const COL_NOTES = 'Observações do Colaborador'
const COL_INTERNAL_ID = 'ID Interno (não remover)'

const ROW_HEADERS = [
  COL_BUDGET_CODE,
  COL_BUDGET_NAME,
  COL_CLIENT,
  COL_WORK,
  COL_STAGE_CODE,
  COL_STAGE,
  COL_SERVICE_CODE,
  COL_SERVICE,
  COL_UNIT,
  COL_QTY,
  COL_EXEC_PRICE,
  COL_NOTES,
  COL_INTERNAL_ID,
]

export interface ExecutionSheetServiceRow {
  serviceId: string
  budgetCode: string
  stageCode: string
  stageName: string
  serviceCode: string
  serviceName: string
  unit: string
  quantity: number
  execPrice: number | null
  notes: string
}

export interface ExecutionSheetResult {
  success: boolean
  error?: string
  blob?: Blob
  filename?: string
  rows?: ExecutionSheetServiceRow[]
}

function emptyToBlank(value?: string | null): string {
  const trimmed = (value ?? '').toString().trim()
  return trimmed
}

function toNumberOrNull(value: unknown): number | null {
  const n = normalizeExecSheetNumber(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Interpreta números digitados no formato brasileiro (1.234,56) ou americano
 * (1234.56), com ou sem "R$". Retorna 0 quando não der para interpretar.
 */
export function normalizeExecSheetNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const raw = String(value).trim()
  if (!raw) return 0
  let cleaned = raw.replace(/[Rr]\$\s?/g, '').replace(/\s/g, '')
  // Se tem vírgula, é separador decimal brasileiro (remove pontos de milhar)
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  }
  const n = Number(cleaned.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function normalizeCodeKey(code?: string | null): string {
  return (code ?? '').toString().trim().toUpperCase()
}

function sanitizeFilenamePart(part?: string | null): string {
  return (part ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function collectServiceRows(budget: FullBudget): ExecutionSheetServiceRow[] {
  const rows: ExecutionSheetServiceRow[] = []
  const stages: BudgetStage[] = Array.isArray(budget.stages) ? budget.stages : []

  for (const stage of stages) {
    const services = Array.isArray(stage.services) ? stage.services : []
    for (const service of services) {
      rows.push({
        serviceId: String((service as any).id ?? ''),
        budgetCode: emptyToBlank(budget.code),
        stageCode: emptyToBlank(stage.code),
        stageName: emptyToBlank(stage.name),
        serviceCode: emptyToBlank((service as any).code),
        serviceName: emptyToBlank((service as any).name ?? (service as any).description),
        unit: emptyToBlank((service as any).unit),
        quantity: toNumberOrNull((service as any).quantity) ?? 0,
        execPrice: null,
        notes: '',
      })
    }
  }
  return rows
}

function buildLeiaMeSheet(budget: FullBudget, rows: ExecutionSheetServiceRow[]): XLSX.WorkSheet {
  const clientName = emptyToBlank(budget.client?.name)
  const workName = emptyToBlank(budget.work?.name || budget.title)

  const info: (string | number)[][] = [
    ['PLANILHA DE ORÇAMENTO DE EXECUÇÃO — CONCE ENGENHARIA'],
    [''],
    ['Código do Orçamento', emptyToBlank(budget.code)],
    ['Nome do Orçamento', workName],
    ['Cliente', clientName],
    ['Total de serviços', rows.length],
    [''],
    ['INSTRUÇÕES'],
    ['1. Preencha SOMENTE as colunas "Preço de Execução (R$)" e "Observações do Colaborador".'],
    [
      '2. Não altere as demais colunas (Código do Orçamento, Etapa, Serviço, Quantidade, Unidade, ID Interno).',
    ],
    [
      '3. Use ponto ou vírgula como separador decimal — a planilha aceita o formato brasileiro (ex.: 1.250,00).',
    ],
    [
      '4. Não remova linhas: serviços sem preço preenchido permanecem com o valor atual do orçamento.',
    ],
    ['5. Devolva este arquivo para ser importado de volta no sistema, no mesmo orçamento.'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(info)
  ws['!cols'] = [{ wch: 24 }, { wch: 95 }]
  return ws
}

/**
 * Exporta a Planilha de Orçamento de Execução do orçamento aberto (.xlsx).
 */
export function buildExecutionSheet(budget: FullBudget): ExecutionSheetResult {
  if (!budget || !budget.id || !budget.code) {
    return { success: false, error: 'Orçamento inválido para gerar a planilha de execução.' }
  }

  const rows = collectServiceRows(budget)
  if (rows.length === 0) {
    return {
      success: false,
      error: 'Este orçamento não possui serviços cadastrados para gerar a planilha de execução.',
    }
  }

  const clientName = emptyToBlank(budget.client?.name)
  const workName = emptyToBlank(budget.work?.name || budget.title)

  const aoa: (string | number | null)[][] = rows.map((row) => [
    row.budgetCode,
    workName,
    clientName,
    row.stageCode,
    row.stageName,
    row.serviceCode,
    row.serviceName,
    row.unit,
    row.quantity > 0 ? row.quantity : null,
    null,
    null,
    row.serviceId,
  ])

  const ws = XLSX.utils.aoa_to_sheet([ROW_HEADERS, ...aoa])
  ws['!cols'] = [
    { wch: 18 }, // Código do Orçamento
    { wch: 34 }, // Nome do Orçamento
    { wch: 28 }, // Cliente
    { wch: 10 }, // Cód. Etapa
    { wch: 30 }, // Etapa
    { wch: 14 }, // Código Serviço
    { wch: 46 }, // Serviço
    { wch: 10 }, // Unidade
    { wch: 12 }, // Quantidade
    { wch: 22 }, // Preço de Execução (R$)
    { wch: 34 }, // Observações
    { wch: 24 }, // ID Interno
  ]
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: ROW_HEADERS.length - 1 } }),
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, EXEC_SHEET_NAME)
  XLSX.utils.book_append_sheet(wb, buildLeiaMeSheet(budget, rows), EXEC_SHEET_README_NAME)

  try {
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    const blob = new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const filename = `Planilha-Execucao-${sanitizeFilenamePart(budget.code)}${
      workName ? `-${sanitizeFilenamePart(workName).slice(0, 40)}` : ''
    }.xlsx`
    return { success: true, blob, filename, rows }
  } catch (err) {
    console.error('[executionSheetEngine] Falha ao gerar o .xlsx', err)
    return { success: false, error: 'Falha ao gerar o arquivo Excel. Tente novamente.' }
  }
}

export interface ExecutionSheetApplyResult {
  success: boolean
  error?: string
  budget?: FullBudget
  updatedCount?: number
}

function findServiceById(budget: FullBudget, serviceId: string): any | null {
  for (const stage of budget.stages ?? []) {
    for (const service of stage.services ?? []) {
      if (String((service as any).id ?? '') === serviceId) return service
    }
  }
  return null
}

/**
 * Importa a planilha preenchida de volta para o orçamento.
 *
 * Validações (nenhuma alteração acontece se falharem):
 * 1. O arquivo precisa ser um .xlsx legível com a aba/execução esperada;
 * 2. O código do orçamento na planilha precisa ser EXATAMENTE o do orçamento aberto;
 * 3. Pelo menos um preço de execução deve estar preenchido;
 * 4. Toda linha com preço precisa casar com um serviço existente (por ID interno).
 */
export async function applyExecutionSheetPrices(
  budget: FullBudget,
  file: Blob,
): Promise<ExecutionSheetApplyResult> {
  let workbook: XLSX.WorkBook
  try {
    const buffer = await file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array' })
  } catch {
    return {
      success: false,
      error:
        'Arquivo inválido: não foi possível ler a planilha. Envie o arquivo Excel (.xlsx) gerado pelo sistema.',
    }
  }

  const sheetName = workbook.SheetNames.find((n) => n.trim() === EXEC_SHEET_NAME)
  if (!sheetName || !workbook.Sheets[sheetName]) {
    return {
      success: false,
      error: `Planilha inválida: não encontramos a aba "${EXEC_SHEET_NAME}". Use o arquivo Excel gerado pelo sistema.`,
    }
  }

  const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: null,
  })
  if (parsed.length === 0) {
    return {
      success: false,
      error: 'Planilha inválida: a aba "Planilha de Execução" está vazia.',
    }
  }

  const first = parsed[0] ?? {}
  const sheetBudgetCode = normalizeCodeKey(first[COL_BUDGET_CODE] as string)
  const currentBudgetCode = normalizeCodeKey(budget.code)
  if (!sheetBudgetCode || sheetBudgetCode !== currentBudgetCode) {
    return {
      success: false,
      error: `Planilha de outro orçamento: este arquivo pertence ao orçamento "${sheetBudgetCode || 'desconhecido'}", mas você está com o orçamento "${currentBudgetCode}" aberto. Nada foi alterado.`,
    }
  }

  if (!('ID Interno (não remover)' in first) && !('__EMPTY' in first)) {
    return {
      success: false,
      error:
        'Planilha inválida: a coluna oculta "ID Interno (não remover)" foi removida — sem ela não é possível identificar os serviços. Baixe a planilha novamente pelo sistema.',
    }
  }

  type PendingUpdate = { service: any; price: number; notes: string; label: string }
  const updates: PendingUpdate[] = []
  const unmatched: string[] = []

  for (const row of parsed) {
    const price = normalizeExecSheetNumber(row[COL_EXEC_PRICE])
    if (!price || price <= 0) continue

    const serviceId = String(row[COL_INTERNAL_ID] ?? '').trim()
    if (!serviceId) {
      unmatched.push(String(row[COL_SERVICE_CODE] ?? '(sem código)'))
      continue
    }
    const service = findServiceById(budget, serviceId)
    if (!service) {
      unmatched.push(String(row[COL_SERVICE_CODE] ?? '(sem código)'))
      continue
    }
    updates.push({
      service,
      price,
      notes: emptyToBlank(row[COL_NOTES] as string),
      label: `${row[COL_SERVICE_CODE] ?? ''} — ${row[COL_SERVICE] ?? ''}`.trim(),
    })
  }

  if (updates.length === 0) {
    const suffix = unmatched.length
      ? ` Linhas ignoradas por não corresponderem a serviços deste orçamento: ${unmatched.join(', ')}.`
      : ''
    return {
      success: false,
      error:
        'Nenhum preço de execução válido foi encontrado na coluna "Preço de Execução (R$)".' +
        suffix,
    }
  }

  if (unmatched.length > 0) {
    return {
      success: false,
      error:
        `Planilha incompatível: ${unmatched.length} linha(s) com preço não correspondem a serviços deste orçamento (${unmatched
          .slice(0, 5)
          .join(', ')}${unmatched.length > 5 ? '…' : ''}). ` +
        'Não alteramos nada para não misturar dados de outro orçamento. Baixe a planilha novamente pelo sistema.',
    }
  }

  // Aplica em uma CÓPIA profunda do orçamento (nunca muta o original).
  // O preço entra exatamente como uma edição manual na UI: unitPrice +
  // unitPriceSource 'Usuário' — é assim que o budgetEngine reconhece preço travado.
  const clone = JSON.parse(JSON.stringify(budget)) as FullBudget
  let updated = 0
  for (const upd of updates) {
    const service = findServiceById(clone, upd.service.id)
    if (!service) continue
    service.unitPrice = upd.price
    service.unitPriceSource = 'Usuário'
    if (upd.notes) {
      const existingNotes = emptyToBlank(service.notes)
      service.notes = existingNotes ? `${existingNotes} | ${upd.notes}` : upd.notes
    }
    updated += 1
  }

  if (updated === 0) {
    return { success: false, error: 'Não foi possível aplicar os preços. Nada foi alterado.' }
  }

  return { success: true, budget: clone, updatedCount: updated }
}
