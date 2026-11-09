/**
 * CONCE — Feedback e diagnóstico de falhas de sincronização (pt-BR)
 *
 * Toda falha de gravação na nuvem (Skip Cloud / PocketBase) passa por aqui:
 * o motivo é traduzido para português, guardado no localStorage (sobrevive a
 * recarregar a página) e notificado aos ouvintes da UI (indicador de sync,
 * Dashboard, Orçamentos), que exibem o aviso em vez de falhar em silêncio.
 */

import { ClientResponseError } from 'pocketbase'

export const SYNC_ERROR_KEY = 'conce_last_sync_error'

export interface SyncErrorInfo {
  message: string
  /** Mensagem técnica original (para diagnóstico), quando disponível */
  raw?: string
  status?: number
  at: string
}

type Listener = (info: SyncErrorInfo | null) => void

const listeners = new Set<Listener>()

function notify(info: SyncErrorInfo | null) {
  listeners.forEach((fn) => {
    try {
      fn(info)
    } catch {
      /* ouvinte com falha não derruba o motor de sync */
    }
  })
}

export function subscribeSyncError(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getLastSyncError(): SyncErrorInfo | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SYNC_ERROR_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SyncErrorInfo
    return parsed && parsed.message ? parsed : null
  } catch {
    return null
  }
}

export function clearSyncError(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SYNC_ERROR_KEY)
  } catch {
    /* intentionally ignored */
  }
  notify(null)
}

function persist(info: SyncErrorInfo): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SYNC_ERROR_KEY, JSON.stringify(info))
    } catch {
      /* quota — segue só em memória */
    }
  }
  notify(info)
}

/** Traduz um erro do PocketBase para uma mensagem clara em pt-BR. */
export function translateSyncError(err: unknown, context?: string): string {
  const ctx = context ? `${context}: ` : ''

  if (err instanceof ClientResponseError) {
    const status = err.status
    if (status === 0 || (err.originalError as any)?.isNetworkError) {
      return `${ctx}sem conexão com a nuvem — verifique sua internet e tente novamente.`
    }
    if (status === 400 || status === 403) {
      return `${ctx}a nuvem recusou a gravação (permissão negada ou dados inválidos). Faça login novamente e, se persistir, contate o suporte.`
    }
    if (status === 401) {
      return `${ctx}sessão expirada, faça login novamente.`
    }
    if (status === 404) {
      return `${ctx}registro não encontrado na nuvem (pode ter sido excluído em outro dispositivo).`
    }
    if (status === 429) {
      return `${ctx}muitas tentativas em sequência — aguarde alguns segundos e sincronize de novo.`
    }
    if (status >= 500) {
      return `${ctx}a nuvem CONCE está instável neste momento — tente sincronizar novamente em instantes.`
    }
    return `${ctx}falha na sincronização (erro ${status}).`
  }

  if (err instanceof Error) {
    if (/Failed to fetch|NetworkError|load failed/i.test(err.message)) {
      return `${ctx}sem conexão com a nuvem — verifique sua internet e tente novamente.`
    }
    return `${ctx}${err.message}`
  }

  return `${ctx}falha desconhecida na sincronização.`
}

/**
 * Registra uma falha de sincronização: traduz, persiste e notifica a UI.
 * Retorna a mensagem pronta para uso em toasts.
 */
export function reportSyncError(err: unknown, context?: string): string {
  const message = translateSyncError(err, context)
  const raw = err instanceof Error ? err.message : undefined
  const status =
    err instanceof ClientResponseError ? err.status : (err as { status?: number } | null)?.status
  persist({
    message,
    raw,
    status: typeof status === 'number' ? status : undefined,
    at: new Date().toISOString(),
  })
  return message
}

/**
 * Registra uma falha de SESSÃO na nuvem (token expirado/ausente): grava o
 * aviso "Sessão expirada, faça login novamente." para a UI exibir com botão.
 */
export function reportSessionExpired(context?: string): string {
  const message = 'Sessão expirada, faça login novamente.'
  persist({
    message,
    raw: context,
    status: 401,
    at: new Date().toISOString(),
  })
  return message
}
