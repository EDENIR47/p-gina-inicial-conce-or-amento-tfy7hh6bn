/**
 * CONCE — Gerenciador de Sincronização em Nuvem (Skip Cloud / PocketBase)
 *
 * Estratégia:
 * 1. Fila de mutações com retry automático (exponencial backoff).
 * 2. Cache local no localStorage como rede de segurança e modo offline.
 * 3. Resolução "cloud vence" para leituras no início de sessão / pull, mas
 *    atualizações locais não sincronizadas ficam preservadas na fila de saída.
 * 4. Migração e upload de fotos de etapas (base64 -> arquivos reais no PB).
 * 5. Notificação de status para a UI ("Sincronizado", "Sincronizando...", "N pendentes", "Offline").
 */

import { FullBudget } from '@/types/budgetEngine'
import {
  saveCloudOrcamento,
  deleteCloudOrcamento,
  fetchCloudOrcamentos,
  uploadStagePhotoToCloud,
  saveCloudQuotes,
  saveCloudCompositions,
} from './cloudBudgetsService'
import {
  getStoredFullBudgets,
  saveFullBudgets,
  isDemoOrTestBudget,
  getStoredCompositions,
} from '@/lib/budgetsStorage'
import { getStoredQuotes } from '@/lib/intelligenceStorage'
import { isPbAuthenticated } from './authService'

export type SyncState = 'idle' | 'syncing' | 'pending' | 'offline' | 'error'

export interface SyncTask {
  id: string
  type: 'upsert_budget' | 'delete_budget' | 'upload_photo'
  budgetId?: string
  budget?: FullBudget
  stageId?: string
  photoDataUrl?: string
  retries: number
  addedAt: number
}

const SYNC_QUEUE_KEY = 'conce_sync_queue'
const LAST_SYNC_KEY = 'conce_last_sync_time'

class SyncEngine {
  private queue: SyncTask[] = []
  private state: SyncState = 'idle'
  private listeners: ((state: SyncState, pendingCount: number) => void)[] = []
  private isProcessing = false
  private retryTimeout: any = null

  constructor() {
    this.loadQueue()
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true))
      window.addEventListener('offline', () => this.handleNetworkChange(false))
    }
  }

  private loadQueue() {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY)
      if (raw) {
        this.queue = JSON.parse(raw)
      }
    } catch {
      this.queue = []
    }
  }

  private saveQueue() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue))
    } catch {
      /* intentionally ignored */
    }
    this.notify()
  }

  public subscribe(fn: (state: SyncState, pendingCount: number) => void): () => void {
    this.listeners.push(fn)
    fn(this.state, this.queue.length)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn)
    }
  }

  private notify() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    if (!isOnline) {
      this.state = 'offline'
    } else if (this.isProcessing) {
      this.state = 'syncing'
    } else if (this.queue.length > 0) {
      this.state = 'pending'
    } else {
      this.state = 'idle'
    }

    this.listeners.forEach((fn) => fn(this.state, this.queue.length))
  }

  public getStatus(): { state: SyncState; pendingCount: number } {
    return { state: this.state, pendingCount: this.queue.length }
  }

  private handleNetworkChange(isOnline: boolean) {
    if (isOnline) {
      this.processQueue()
    } else {
      this.state = 'offline'
      this.notify()
    }
  }

  /**
   * Enfileira uma gravação de orçamento (upsert)
   */
  public enqueueBudgetSave(budget: FullBudget) {
    // Remove qualquer tarefa anterior pendente para esse mesmo orçamento
    this.queue = this.queue.filter(
      (t) => !(t.type === 'upsert_budget' && t.budget?.id === budget.id),
    )

    this.queue.push({
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'upsert_budget',
      budget,
      retries: 0,
      addedAt: Date.now(),
    })

    this.saveQueue()
    this.processQueue()
  }

  /**
   * Enfileira a exclusão de um orçamento
   */
  public enqueueBudgetDelete(budgetId: string) {
    // Remove upserts pendentes desse mesmo orçamento
    this.queue = this.queue.filter(
      (t) => !(t.type === 'upsert_budget' && t.budget?.id === budgetId),
    )

    this.queue.push({
      id: `task-del-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'delete_budget',
      budgetId,
      retries: 0,
      addedAt: Date.now(),
    })

    this.saveQueue()
    this.processQueue()
  }

  /**
   * Executa a fila de sincronização com o PocketBase
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing) return
    if (!isPbAuthenticated()) {
      this.notify()
      return
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    if (!isOnline) {
      this.state = 'offline'
      this.notify()
      return
    }

    if (this.queue.length === 0) {
      this.state = 'idle'
      this.notify()
      return
    }

    this.isProcessing = true
    this.state = 'syncing'
    this.notify()

    try {
      while (this.queue.length > 0) {
        const task = this.queue[0]

        try {
          if (task.type === 'upsert_budget' && task.budget) {
            // Se houver fotos em base64 nas etapas, sobe como arquivo primeiro
            let budgetToSend = task.budget
            if (budgetToSend.stages && Array.isArray(budgetToSend.stages)) {
              let photoChanged = false
              const stagesWithCloudPhotos = await Promise.all(
                budgetToSend.stages.map(async (st) => {
                  if (st.photoUrl && st.photoUrl.startsWith('data:image/')) {
                    try {
                      const cloudUrl = await uploadStagePhotoToCloud(
                        st.id,
                        st.photoUrl,
                        budgetToSend.id,
                      )
                      if (cloudUrl) {
                        photoChanged = true
                        return { ...st, photoUrl: cloudUrl }
                      }
                    } catch {
                      /* intentionally ignored */
                    }
                  }
                  return st
                }),
              )
              if (photoChanged) {
                budgetToSend = { ...budgetToSend, stages: stagesWithCloudPhotos }
              }
            }

            await saveCloudOrcamento(budgetToSend)
          } else if (task.type === 'delete_budget' && task.budgetId) {
            await deleteCloudOrcamento(task.budgetId)
          }

          // Tarefa concluída com sucesso
          this.queue.shift()
          this.saveQueue()
        } catch (taskErr) {
          console.warn('Falha na tarefa de sincronização:', taskErr)
          task.retries++
          if (task.retries > 5) {
            // Descarta após 5 tentativas mal-sucedidas para não travar a fila
            this.queue.shift()
            this.saveQueue()
          } else {
            // Deixa para tentar novamente com backoff
            break
          }
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
      }
    } finally {
      this.isProcessing = false
      this.notify()

      if (this.queue.length > 0) {
        clearTimeout(this.retryTimeout)
        this.retryTimeout = setTimeout(() => this.processQueue(), 5000)
      }
    }
  }

  /**
   * Puxa do cloud para sincronizar e atualizar o cache local.
   * Resolução: Cloud vence, exceto para orçamentos que tenham mutações locais pendentes na fila.
   */
  public async pullFromCloud(): Promise<FullBudget[]> {
    if (!isPbAuthenticated()) return getStoredFullBudgets()

    this.isProcessing = true
    this.state = 'syncing'
    this.notify()

    try {
      const cloudBudgets = await fetchCloudOrcamentos()

      if (cloudBudgets.length > 0) {
        // IDs com alterações locais pendentes
        const pendingUpsertIds = new Set(
          this.queue
            .filter((t) => t.type === 'upsert_budget' && t.budget?.id)
            .map((t) => t.budget!.id),
        )

        const currentLocal = getStoredFullBudgets()
        const localOnlyReal = currentLocal.filter(
          (lb) =>
            !isDemoOrTestBudget(lb) &&
            !cloudBudgets.some((cb) => cb.id === lb.id || cb.code === lb.code),
        )

        // Mescla: orçamentos do cloud (salvo os com pendência local de gravação) + locais reais não no cloud
        const merged: FullBudget[] = []

        for (const cb of cloudBudgets) {
          if (pendingUpsertIds.has(cb.id)) {
            const pending = this.queue.find((t) => t.budget?.id === cb.id)?.budget
            if (pending) merged.push(pending)
            else merged.push(cb)
          } else {
            merged.push(cb)
          }
        }

        for (const lb of localOnlyReal) {
          merged.push(lb)
          // Se não estiver na fila, enfileira para subir
          this.enqueueBudgetSave(lb)
        }

        saveFullBudgets(merged)
        return merged
      }

      return getStoredFullBudgets()
    } finally {
      this.isProcessing = false
      this.notify()
    }
  }

  /**
   * Carga inicial completa de orçamentos, cotações e composições locais reais para a nuvem
   */
  public async uploadAllLocalDataToCloud(onProgress?: (step: string) => void): Promise<{
    budgetsUploaded: number
    quotesUploaded: number
    compositionsUploaded: number
  }> {
    if (!isPbAuthenticated()) {
      throw new Error('Usuário não autenticado no PocketBase.')
    }

    onProgress?.('Verificando orçamentos locais reais...')
    const localBudgets = getStoredFullBudgets().filter((b) => !isDemoOrTestBudget(b))

    let budgetsUploaded = 0
    for (const b of localBudgets) {
      onProgress?.(`Enviando orçamento ${b.code || b.title}...`)
      // Processa fotos de etapas para que virem arquivos do PocketBase
      let budgetToSend = b
      if (b.stages && Array.isArray(b.stages)) {
        const stagesWithCloud = await Promise.all(
          b.stages.map(async (st) => {
            if (st.photoUrl && st.photoUrl.startsWith('data:image/')) {
              try {
                const cloudUrl = await uploadStagePhotoToCloud(st.id, st.photoUrl, b.id)
                if (cloudUrl) return { ...st, photoUrl: cloudUrl }
              } catch {
                /* intentionally ignored */
              }
            }
            return st
          }),
        )
        budgetToSend = { ...b, stages: stagesWithCloud }
      }

      await saveCloudOrcamento(budgetToSend)
      budgetsUploaded++
    }

    onProgress?.('Sincronizando cotações salvas...')
    const quotes = getStoredQuotes()
    if (quotes.length > 0) {
      await saveCloudQuotes(quotes)
    }

    onProgress?.('Sincronizando biblioteca de composições personalizadas...')
    const compositions = getStoredCompositions()
    const customComps = (compositions || []).filter((c: any) => c.source !== 'SINAPI' && c.code)
    if (customComps.length > 0) {
      await saveCloudCompositions(customComps)
    }

    onProgress?.('Carga concluída com sucesso!')
    this.state = 'idle'
    this.notify()

    return {
      budgetsUploaded,
      quotesUploaded: quotes.length,
      compositionsUploaded: customComps.length,
    }
  }
}

export const syncEngine = new SyncEngine()
