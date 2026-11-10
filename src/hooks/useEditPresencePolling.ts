/**
 * CONCE — Hook de polling das presenças de edição de orçamentos.
 *
 * Busca do cloud (budget_edit_presence) a cada ~30s quem está editando cada
 * orçamento. É polling leve de propósito (mais robusto que realtime aqui):
 * o aviso expira sozinho pelo TTL de 60s sem heartbeat, sem necessidade de
 * reload da tela.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { BudgetEditPresence, fetchActiveEditPresences } from '@/services/editPresenceService'

const POLLING_INTERVAL_MS = 30_000

export function useEditPresencePolling() {
  const [presencesByBudget, setPresencesByBudget] = useState<Map<string, BudgetEditPresence[]>>(
    new Map(),
  )
  const inFlightRef = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const map = await fetchActiveEditPresences()
      setPresencesByBudget(map)
    } finally {
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), POLLING_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  return { presencesByBudget, refreshPresences: refresh }
}
