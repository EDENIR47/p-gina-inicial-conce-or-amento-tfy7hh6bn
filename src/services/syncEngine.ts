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
 * 6. FALHA NUNCA MAIS SILENCIOSA: todo erro de gravação é traduzido para pt-BR
 *    (syncFeedback) e exposto na UI; o retry continua em background.
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
import {
  getLastSyncError,
  reportSessionExpired,
  reportSyncError,
  clearSyncError,
} from './syncFeedback'

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
    } else if (getLastSyncError()?.status === 401) {
      this.state = 'error'
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
   * Valida a sessão PocketBase antes de gravar (padrão usersService): faz
   * authRefresh; se o token estiver morto, limpa tudo e avisa a UI com
   * "Sessão expirada, faça login novamente." — não fica em retry infinito
   * com credencial inválida.
   */
  private async ensureFreshSession(): Promise<boolean> {
    const { default: pb } = await import('@/lib/pocketbase/client')
    if (!pb.authStore.isValid || !pb.authStore.token) {
      reportSessionExpired('gravar orçamento (sem token)')
      return false
    }
    try {
      await pb.collection('users').authRefresh()
      return true
    } catch {
      const { logoutPb } = await import('./authService')
      logoutPb()
      reportSessionExpired('gravar orçamento (token rejeitado)')
      return false
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
   * Executa a fila de sincronização com o PocketBase.
   * Nunca lança: falhas são reportadas via syncFeedback e retentadas com backoff.
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing) return
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

    if (!isPbAuthenticated()) {
      // Sessão ausente: não roda a fila, mas o usuário PRECISA saber por que
      // os dados "não estão chegando na nuvem".
      reportSessionExpired('sincronizar fila (sem sessão PocketBase)')
      this.notify()
      return
    }

    // Renova o token antes de qualquer gravação (padrão ensureFreshSession de usersService)
    const fresh = await this.ensureFreshSession()
    if (!fresh) {
      this.isProcessing = false
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
                      /* foto falhou: segue sem ela, o resto do orçamento sobe */
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
          clearSyncError()
          this.queue.shift()
          this.saveQueue()
        } catch (taskErr) {
          // Motivo em português vai para a UI (indicador de sync + toasts)
          reportSyncError(taskErr, 'Falha ao enviar orçamento para a nuvem')
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

      if (this.queue.length === 0) {
        clearSyncError()
        if (typeof window !== 'undefined') {
          localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
        }
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

        // Mescla com LAST-WRITE-WINS por updatedAt: o registro atualizado mais
        // recentemente (local ou cloud) prevalece. Isso impede que o pull sobrescreva
        // o estado local limpo/recém-editado pelo estado antigo do cloud.
        const getUpdatedAtMs = (b: FullBudget): number => {
          const raw = (b as unknown as { updatedAt?: string })?.updatedAt
          const ms = raw ? Date.parse(raw) : NaN
          return Number.isFinite(ms) ? ms : 0
        }

        const localById = new Map(currentLocal.map((lb) => [lb.id, lb]))
        const localByCode = new Map(
          currentLocal.filter((lb) => lb.code).map((lb) => [lb.code as string, lb]),
        )

        const merged: FullBudget[] = []

        for (const cb of cloudBudgets) {
          if (pendingUpsertIds.has(cb.id)) {
            const pending = this.queue.find((t) => t.budget?.id === cb.id)?.budget
            if (pending) merged.push(pending)
            else merged.push(cb)
            continue
          }

          const localMatch =
            localById.get(cb.id) ?? (cb.code ? localByCode.get(cb.code) : undefined)

          if (!localMatch) {
            merged.push(cb)
            continue
          }

          if (getUpdatedAtMs(localMatch) > getUpdatedAtMs(cb)) {
            // Local mais recente vence — e precisa voltar para o cloud
            merged.push(localMatch)
            this.enqueueBudgetSave(localMatch)
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

      // Cloud VAZIO para este usuário: orçamentos locais reais (ex. criados
      // enquanto a sessão do PocketBase estava inválida — caso ORC-2026-108)
      // precisam SUBIR para a nuvem. Antes a função apenas retornava o cache
      // local e esses orçamentos nunca chegavam ao cloud.
      const localAll = getStoredFullBudgets()
      const queuedIds = new Set(
        this.queue
          .filter((t) => t.type === 'upsert_budget' && t.budget?.id)
          .map((t) => t.budget!.id),
      )
      localAll
        .filter((lb) => !isDemoOrTestBudget(lb) && !queuedIds.has(lb.id))
        .forEach((lb) => this.enqueueBudgetSave(lb))
      this.notify()
      return localAll
    } catch (err) {
      reportSyncError(err, 'Falha ao buscar orçamentos da nuvem')
      return getStoredFullBudgets()
    } finally {
      this.isProcessing = false
      this.notify()
      // As tarefas enfileiradas durante o pull (processQueue sai cedo enquanto
      // isProcessing = true) precisam ser drenadas agora que o pull terminou.
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue().catch(() => {}), 300)
      }
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

      try {
        await saveCloudOrcamento(budgetToSend)
        budgetsUploaded++
      } catch (err) {
        reportSyncError(err, `Falha ao enviar orçamento ${b.code || b.title} para a nuvem`)
        throw err
      }
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
