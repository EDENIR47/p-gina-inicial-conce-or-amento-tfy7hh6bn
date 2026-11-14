/**
 * Engine da Planilha de Orçamento de Execução (CONCE).
 *
 * EXPORTAÇÃO: gera um .xlsx com os serviços do orçamento aberto e exatamente 7 colunas:
 * Código, Serviço, Quantidade, Unidade, Valor Unitário, Valor Total, Observação.
 * As colunas Valor Unitário, Valor Total e Observação saem EM BRANCO para o colaborador
 * preencher. Regra permanente: usa EXCLUSIVAMENTE o orçamento aberto, sem fallbacks
 * hard-coded de cliente/obra — campo vazio fica em branco.
 *
 * IMPORTAÇÃO: lê o .xlsx preenchido de volta. Confere o código do orçamento (aba "Leia-me"),
 * casa cada linha com um serviço pelo CÓDIGO do serviço (único dentro do orçamento) e aplica
 * o Valor Unitário como preço de execução. Quantidade, Unidade e Valor Total são informativas
 * e não alteram nada. Nada é mutado até todas as validações passarem.
 */
import * as XLSX from 'xlsx'
import type { BudgetStage, FullBudget } from '@/types/budgetEngine'

export const EXEC_SHEET_NAME = 'Planilha de Execução'
export const EXEC_SHEET_README_NAME = 'Leia-me'

const README_BUDGET_CODE_LABEL = 'Código do Orçamento'
const COL_CODE = 'Código'
const COL_SERVICE = 'Serviço'
const COL_QTY = 'Quantidade'
const COL_UNIT = 'Unidade'
const COL_UNIT_PRICE = 'Valor Unitário'
const COL_TOTAL = 'Valor Total'
const COL_NOTES = 'Observação'

const ROW_HEADERS = [COL_CODE, COL_SERVICE, COL_QTY, COL_UNIT, COL_UNIT_PRICE, COL_TOTAL, COL_NOTES]

export interface ExecutionSheetServiceRow {
  serviceCode: string
  serviceName: string
  unit: string
  quantity: number
}

export interface ExecutionSheetResult {
  success: boolean
  error?: string
  blob?: Blob
  filename?: string
}

function emptyToBlank(value?: string | null): string {
  return (value ?? '').toString().trim()
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

function collectServices(budget: FullBudget): any[] {
  const services: any[] = []
  const stages: BudgetStage[] = Array.isArray(budget.stages) ? budget.stages : []
  for (const stage of stages) {
    for (const service of Array.isArray(stage.services) ? stage.services : []) {
      services.push(service)
    }
  }
  return services
}

/** Códigos de serviço repetidos dentro do orçamento (ambíguos para a importação). */
function findDuplicateServiceCodes(budget: FullBudget): string[] {
  const seen = new Map<string, number>()
  for (const service of collectServices(budget)) {
    const key = normalizeCodeKey(service.code)
    if (!key) continue
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([code]) => code)
}

function collectServiceRows(budget: FullBudget): ExecutionSheetServiceRow[] {
  return collectServices(budget).map((service) => ({
    serviceCode: emptyToBlank(service.code),
    serviceName: emptyToBlank(service.name ?? service.description),
    unit: emptyToBlank(service.unit),
    quantity: normalizeExecSheetNumber(service.quantity),
  }))
}

function buildLeiaMeSheet(budget: FullBudget, rows: ExecutionSheetServiceRow[]): XLSX.WorkSheet {
  const info: (string | number)[][] = [
    ['PLANILHA DE ORÇAMENTO DE EXECUÇÃO — CONCE ENGENHARIA'],
    [''],
    [README_BUDGET_CODE_LABEL, emptyToBlank(budget.code)],
    ['Nome do Orçamento', emptyToBlank(budget.work?.name || budget.title)],
    ['Cliente', emptyToBlank(budget.client?.name)],
    ['Total de serviços', rows.length],
    [''],
    ['INSTRUÇÕES'],
    [
      '1. Preencha a coluna "Valor Unitário" com o preço de execução de cada serviço (ex.: 1.250,00).',
    ],
    ['2. A coluna "Observação" é livre e opcional, para comentários sobre o serviço.'],
    [
      '3. A coluna "Valor Total" pode ficar em branco. O sistema não usa esta coluna na importação.',
    ],
    [
      '4. Não altere as colunas Código, Serviço, Quantidade e Unidade: o Código identifica cada serviço na importação.',
    ],
    [
      '5. Não remova nem inclua linhas. Serviços sem Valor Unitário permanecem com o valor atual do orçamento.',
    ],
    [
      '6. Mantenha esta aba: ela traz o código do orçamento, que a importação confere antes de aplicar qualquer preço.',
    ],
    ['7. Devolva o arquivo para importação no mesmo orçamento.'],
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

  const missingCode = rows.filter((r) => !normalizeCodeKey(r.serviceCode))
  if (missingCode.length > 0) {
    return {
      success: false,
      error: `Há ${missingCode.length} serviço(s) sem código. Informe o código de todos os serviços antes de gerar a planilha de execução.`,
    }
  }

  const duplicates = findDuplicateServiceCodes(budget)
  if (duplicates.length > 0) {
    return {
      success: false,
      error: `Os códigos de serviço precisam ser únicos dentro do orçamento para a planilha de execução. Códigos repetidos: ${duplicates.join(', ')}.`,
    }
  }

  // Colunas do colaborador (Valor Unitário, Valor Total, Observação) ficam null = em branco.
  const aoa: (string | number | null)[][] = rows.map((row) => [
    row.serviceCode,
    row.serviceName,
    row.quantity > 0 ? row.quantity : null,
    row.unit,
    null,
    null,
    null,
  ])

  const ws = XLSX.utils.aoa_to_sheet([ROW_HEADERS, ...aoa])
  ws['!cols'] = [
    { wch: 14 }, // Código
    { wch: 46 }, // Serviço
    { wch: 12 }, // Quantidade
    { wch: 10 }, // Unidade
    { wch: 18 }, // Valor Unitário
    { wch: 18 }, // Valor Total
    { wch: 34 }, // Observação
  ]
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: ROW_HEADERS.length - 1 } }),
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, EXEC_SHEET_NAME)
  XLSX.utils.book_append_sheet(wb, buildLeiaMeSheet(budget, rows), EXEC_SHEET_README_NAME)

  const workName = emptyToBlank(budget.work?.name || budget.title)
  try {
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    const blob = new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const filename = `Planilha-Execucao-${sanitizeFilenamePart(budget.code)}${
      workName ? `-${sanitizeFilenamePart(workName).slice(0, 40)}` : ''
    }.xlsx`
    return { success: true, blob, filename }
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
  for (const service of collectServices(budget)) {
    if (String(service.id ?? '') === serviceId) return service
  }
  return null
}

/** Lê o código do orçamento gravado na aba "Leia-me" (linha "Código do Orçamento"). */
function readBudgetCodeFromReadme(workbook: XLSX.WorkBook): string | null {
  const ws = workbook.Sheets[EXEC_SHEET_README_NAME]
  if (!ws) return null
  const info = XLSX.utils.sheet_to_json<{ A?: unknown; B?: unknown }>(ws, {
    header: 'A',
    defval: null,
  })
  const row = info.find((r) => String(r.A ?? '').trim() === README_BUDGET_CODE_LABEL)
  return row ? normalizeCodeKey(String(row.B ?? '')) : null
}

/**
 * Importa a planilha preenchida de volta para o orçamento.
 *
 * Validações (nenhuma alteração acontece se falharem):
 * 1. O arquivo precisa ser um .xlsx legível com a aba de execução esperada;
 * 2. O código do orçamento na aba "Leia-me" precisa ser EXATAMENTE o do orçamento aberto;
 * 3. As colunas Código e Valor Unitário precisam existir;
 * 4. Os códigos de serviço do orçamento precisam ser únicos;
 * 5. Pelo menos um Valor Unitário deve estar preenchido;
 * 6. Toda linha com Valor Unitário precisa casar com um serviço existente pelo código.
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

  const sheetBudgetCode = readBudgetCodeFromReadme(workbook)
  const currentBudgetCode = normalizeCodeKey(budget.code)
  if (!sheetBudgetCode || sheetBudgetCode !== currentBudgetCode) {
    return {
      success: false,
      error: `Planilha de outro orçamento: este arquivo pertence ao orçamento "${sheetBudgetCode || 'desconhecido'}", mas você está com o orçamento "${currentBudgetCode}" aberto. Nada foi alterado.`,
    }
  }

  const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: null,
  })
  if (parsed.length === 0) {
    return {
      success: false,
      error: `Planilha inválida: a aba "${EXEC_SHEET_NAME}" está vazia.`,
    }
  }

  const first = parsed[0] ?? {}
  if (!(COL_CODE in first) || !(COL_UNIT_PRICE in first)) {
    return {
      success: false,
      error: `Planilha inválida: as colunas "${COL_CODE}" e "${COL_UNIT_PRICE}" são obrigatórias. Baixe a planilha novamente pelo sistema.`,
    }
  }

  const duplicates = findDuplicateServiceCodes(budget)
  if (duplicates.length > 0) {
    return {
      success: false,
      error: `Não é possível importar: os códigos de serviço do orçamento se repetem (${duplicates.join(', ')}). Nada foi alterado.`,
    }
  }

  const serviceByCode = new Map<string, any>()
  for (const service of collectServices(budget)) {
    const key = normalizeCodeKey(service.code)
    if (key) serviceByCode.set(key, service)
  }

  type PendingUpdate = { serviceId: string; price: number; notes: string }
  const updates: PendingUpdate[] = []
  const unmatched: string[] = []

  for (const row of parsed) {
    const price = normalizeExecSheetNumber(row[COL_UNIT_PRICE])
    if (!price || price <= 0) continue

    const code = normalizeCodeKey(String(row[COL_CODE] ?? ''))
    const service = code ? serviceByCode.get(code) : undefined
    if (!service) {
      unmatched.push(code || '(sem código)')
      continue
    }
    updates.push({
      serviceId: String(service.id ?? ''),
      price,
      notes: emptyToBlank(row[COL_NOTES] as string),
    })
  }

  if (updates.length === 0) {
    const suffix = unmatched.length
      ? ` Linhas ignoradas por não corresponderem a serviços deste orçamento: ${unmatched.join(', ')}.`
      : ''
    return {
      success: false,
      error:
        `Planilha sem preços: nenhum preço de execução foi preenchido na coluna "${COL_UNIT_PRICE}".` +
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
    const service = findServiceById(clone, upd.serviceId)
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
