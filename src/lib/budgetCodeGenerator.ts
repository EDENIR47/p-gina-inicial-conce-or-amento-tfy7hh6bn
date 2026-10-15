/**
 * CONCE — Gerador de Código de Orçamento (padrão vigente desde 2026)
 *
 * Regra do usuário (literal): "ORC - 2026 - 100 E SIGA ESSA SEQUÊNCIA"
 *  - Formato: ORC-ANO-NÚMERO, com o ANO CORRENTE real (dinâmico via new Date().getFullYear()).
 *  - A contagem de CADA ANO começa em 100: o primeiro orçamento do ano é ORC-2026-100,
 *    o seguinte ORC-2026-101, depois 102, 103... (em 2027 recomeça em ORC-2027-100).
 *  - O próximo número é SEMPRE (maior número já usado no ano corrente) + 1, somando os
 *    orçamentos do localStorage E os sincronizados no cloud PocketBase (coleção orcamentos).
 *  - Orçamentos existentes (ex.: ORC-2025-006) NÃO são renomeados — a regra vale para NOVOS.
 */

/** Número inicial da sequência de cada ano (regra CONCE a partir de 2026). */
export const BUDGET_CODE_SEQUENCE_START = 100

/** Objeto mínimo necessário para ler o código de um orçamento (local ou cloud). */
export interface BudgetCodeLike {
  code?: string
}

/**
 * Extrai ano e número sequencial de um código canônico ORC-ANO-NÚMERO.
 * Aceita variações de caixa/separador ("orc 2026 100", "ORC-2026-100") e sufixos
 * de cópia ("ORC-2026-100-COP"). Retorna null para códigos fora do padrão
 * (ex.: "ORC-DEMO-001", "ORC-001", "ORC-0015/2025", títulos livres do usuário).
 */
export function extractBudgetCodeParts(code: string | undefined | null): {
  year: number
  number: number
} | null {
  if (!code || typeof code !== 'string') return null
  const match = code
    .trim()
    .toUpperCase()
    .match(/^ORC[-_ ](\d{4})[-_ ](\d+)(?:\b.*)?$/)
  if (!match) return null
  const year = Number(match[1])
  const number = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(number)) return null
  return { year, number }
}

/**
 * Maior número sequencial já usado no ano informado, considerando uma lista de códigos
 * (aceita strings cruas ou objetos com campo `code`). Retorna null se nenhum código
 * canônico daquele ano for encontrado.
 */
export function getMaxBudgetNumberForYear(
  codes: Array<string | BudgetCodeLike>,
  year: number,
): number | null {
  let max: number | null = null
  for (const entry of codes) {
    const raw = typeof entry === 'string' ? entry : entry?.code
    const parts = extractBudgetCodeParts(raw)
    if (!parts || parts.year !== year) continue
    if (max === null || parts.number > max) max = parts.number
  }
  return max
}

/**
 * Gera o próximo código de orçamento para o ano informado:
 * maior número usado no ano + 1, ou BUDGET_CODE_SEQUENCE_START (100) se o ano estiver vazio.
 * Função PURA (sem acesso a storage/cloud) — usada diretamente nos testes unitários.
 */
export function generateNextBudgetCode(
  codes: Array<string | BudgetCodeLike>,
  year: number,
  sequenceStart: number = BUDGET_CODE_SEQUENCE_START,
): string {
  const max = getMaxBudgetNumberForYear(codes, year)
  const next = max === null ? sequenceStart : Math.max(max + 1, sequenceStart)
  return `ORC-${year}-${next}`
}

/**
 * Gera o próximo código usando o ANO CORRENTE real e somando as duas fontes de verdade:
 *  1. orçamentos do localStorage (getStoredFullBudgets, lido na hora — sem cache defasado);
 *  2. orçamentos sincronizados no cloud PocketBase (coleção orcamentos).
 * Se o cloud estiver indisponível (offline / sem login), segue apenas com o local.
 * Usado por BudgetsScreen (novo orçamento em branco) e AiBudgetModal (geração com IA).
 */
export async function generateNextBudgetCodeForCurrentYear(
  referenceYear?: number,
): Promise<string> {
  const year = referenceYear ?? new Date().getFullYear()
  const codes: string[] = []

  // 1. Orçamentos locais (localStorage) — leitura fresca a cada chamada
  try {
    const { getStoredFullBudgets } = await import('./budgetsStorage')
    for (const b of getStoredFullBudgets()) {
      if (b?.code) codes.push(b.code)
    }
  } catch {
    /* ambiente sem storage: segue apenas com o cloud */
  }

  // 2. Orçamentos sincronizados no cloud PocketBase
  try {
    const { fetchCloudOrcamentos } = await import('../services/cloudBudgetsService')
    const cloudBudgets = await fetchCloudOrcamentos()
    for (const b of cloudBudgets) {
      if (b?.code) codes.push(b.code)
    }
  } catch {
    /* offline ou sem sessão cloud: a sequência considera somente o local */
  }

  return generateNextBudgetCode(codes, year)
}
