/**
 * CONCE — Serviço de presença de edição de orçamentos ("quem está editando agora")
 *
 * Coleção PocketBase: budget_edit_presence (migração 0028)
 * - um registro por (usuário, orçamento) enquanto a pessoa está no modo de edição
 * - heartbeat a cada ~20s atualizando last_heartbeat (autodate onUpdate)
 * - aviso expira sozinho no cliente após EDIT_PRESENCE_TIMEOUT_MS sem heartbeat (60s)
 * - aviso é apenas VISUAL: não bloqueia edição de ninguém (last-write-wins)
 */

import pb from '@/lib/pocketbase/client'
import { getCurrentPbUser } from '@/services/authService'

export const EDIT_PRESENCE_TIMEOUT_MS = 60_000
const HEARTBEAT_INTERVAL_MS = 20_000

export interface BudgetEditPresence {
  id: string
  userId: string
  userName: string
  budgetLocalId: string
  budgetCode: string
  lastHeartbeat: string // ISO
}

interface CloudPresenceRecord {
  id: string
  user: string
  budget_local_id?: string
  budget_code?: string
  user_name?: string
  last_heartbeat?: string
  updated?: string
  expand?: { user?: { name?: string; email?: string } }
}

/** Sessão de heartbeat ativa do usuário corrente (uma por aba, para o orçamento aberto) */
let activeSession: {
  budgetLocalId: string
  budgetCode: string
  recordId: string | null
  timer: ReturnType<typeof setInterval> | null
  stopped: boolean
} | null = null

function toIso(dt: any): string | undefined {
  if (!dt) return undefined
  if (typeof dt === 'string') return dt
  // PocketBase DateTime serializa { seconds, nanos } quando cruza o wire em alguns contextos
  if (typeof dt === 'object' && typeof dt.seconds === 'number') {
    return new Date(dt.seconds * 1000).toISOString()
  }
  return undefined
}

/**
 * Registra/atualiza a presença do usuário corrente como EDITOR de um orçamento.
 * Cria o registro uma vez e depois o mantém vivo via heartbeat (mesmo registro).
 */
export async function startEditPresence(budgetLocalId: string, budgetCode: string): Promise<void> {
  const currentUser = getCurrentPbUser()
  if (!currentUser || !budgetLocalId) return

  // Já está transmitindo presença para ESTE orçamento: apenas garante o heartbeat imediato
  if (activeSession && activeSession.budgetLocalId === budgetLocalId && !activeSession.stopped) {
    await beatOnce().catch(() => {})
    return
  }

  // Troca de orçamento ou chamada concorrente: encerra a sessão anterior primeiro
  await stopEditPresence()

  activeSession = {
    budgetLocalId,
    budgetCode: budgetCode || '',
    recordId: null,
    timer: null,
    stopped: false,
  }

  await beatOnce().catch(() => {})
  activeSession.timer = setInterval(() => {
    beatOnce().catch(() => {})
  }, HEARTBEAT_INTERVAL_MS)
}

/**
 * Atualiza o timestamp de heartbeat do registro de presença ativo (cria se necessário).
 * Robusto: se o registro desapareceu do cloud, recria na próxima batida.
 */
async function beatOnce(): Promise<void> {
  const session = activeSession
  const currentUser = getCurrentPbUser()
  if (!session || session.stopped || !currentUser) return

  const payload = {
    user: currentUser.id,
    budget_local_id: session.budgetLocalId,
    budget_code: session.budgetCode,
    user_name: currentUser.name || 'Colaborador CONCE',
  }

  if (session.recordId) {
    try {
      await pb.collection('budget_edit_presence').update(session.recordId, payload)
      return
    } catch {
      // registro pode ter sido apagado: cai para recriar
      session.recordId = null
    }
  }

  try {
    // Reaproveita registro antigo do MESMO usuário para o MESMO orçamento (reload/aba duplicada)
    const existing = await pb
      .collection('budget_edit_presence')
      .getFirstListItem(
        `user = "${currentUser.id}" && budget_local_id = "${session.budgetLocalId}"`,
      )
      .catch(() => null)

    if (existing) {
      const updated = await pb.collection('budget_edit_presence').update(existing.id, payload)
      session.recordId = updated.id
      return
    }

    const created = await pb.collection('budget_edit_presence').create(payload)
    session.recordId = created.id
  } catch (err) {
    console.warn('[editPresence] heartbeat falhou:', err)
  }
}

/**
 * Encerra a presença do usuário corrente (saída do editor / desmontagem da tela).
 * Remove o registro do cloud para que o aviso suma imediatamente para os outros.
 */
export async function stopEditPresence(): Promise<void> {
  const session = activeSession
  activeSession = null
  if (!session) return

  if (session.timer) clearInterval(session.timer)
  session.stopped = true

  if (!session.recordId) return
  try {
    await pb.collection('budget_edit_presence').delete(session.recordId)
  } catch {
    /* sem problema: o TTL de 60s expira o aviso mesmo sem delete */
  }
}

/**
 * Lista as presenças VIVAS (heartbeat dentro do TTL) de todos os usuários,
 * agrupadas por orçamento. Usado pelo polling da tela /orcamentos.
 */
export async function fetchActiveEditPresences(): Promise<Map<string, BudgetEditPresence[]>> {
  const result = new Map<string, BudgetEditPresence[]>()
  const currentUser = getCurrentPbUser()

  try {
    const records = await pb.collection('budget_edit_presence').getFullList({
      sort: '-updated',
    })

    const now = Date.now()
    for (const raw of records as unknown as CloudPresenceRecord[]) {
      const iso = toIso(raw.last_heartbeat) || toIso(raw.updated)
      if (!iso) continue
      if (now - new Date(iso).getTime() > EDIT_PRESENCE_TIMEOUT_MS) continue // TTL expirado

      const budgetLocalId = (raw.budget_local_id || '').trim()
      const budgetCode = (raw.budget_code || '').trim()
      if (!budgetLocalId && !budgetCode) continue

      const editorId = raw.user
      // O PRÓPRIO editor não vê aviso sobre si mesmo
      if (currentUser && editorId === currentUser.id) continue

      const key = budgetLocalId || budgetCode
      const list = result.get(key) || []
      list.push({
        id: raw.id,
        userId: editorId,
        userName: (raw.user_name || '').trim() || 'Colaborador CONCE',
        budgetLocalId,
        budgetCode,
        lastHeartbeat: iso,
      })
      result.set(key, list)
    }
  } catch {
    /* silencioso: sem aviso quando o cloud não responde */
  }

  return result
}

/**
 * Retorna o(s) editor(es) ativo(s) de um orçamento específico, a partir do mapa do polling.
 * O próprio usuário corrente já é filtrado em fetchActiveEditPresences.
 */
export function getEditorsForBudget(
  presencesByBudget: Map<string, BudgetEditPresence[]>,
  budgetLocalId: string,
  budgetCode?: string,
): BudgetEditPresence[] {
  const byLocal = presencesByBudget.get(budgetLocalId) || []
  if (byLocal.length > 0) return byLocal
  if (budgetCode) return presencesByBudget.get(budgetCode) || []
  return []
}
