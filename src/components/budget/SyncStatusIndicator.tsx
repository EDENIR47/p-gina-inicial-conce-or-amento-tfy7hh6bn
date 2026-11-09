import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Cloud,
  CloudUpload,
  CloudOff,
  RefreshCw,
  Loader2,
  AlertTriangle,
  LogIn,
} from 'lucide-react'
import { syncEngine, SyncState } from '@/services/syncEngine'
import { isPbAuthenticated, validateAndRefreshPbSession } from '@/services/authService'
import {
  subscribeSyncError,
  getLastSyncError,
  clearSyncError,
  SyncErrorInfo,
} from '@/services/syncFeedback'

interface SyncStatusIndicatorProps {
  onOpenMigration?: () => void
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ onOpenMigration }) => {
  const navigate = useNavigate()
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false)
  const [lastError, setLastError] = useState<SyncErrorInfo | null>(getLastSyncError())

  useEffect(() => {
    const unsub = syncEngine.subscribe((state, count) => {
      setSyncState(state)
      setPendingCount(count)
    })
    const unsubErr = subscribeSyncError((info) => setLastError(info))
    return () => {
      unsub()
      unsubErr()
    }
  }, [])

  const sessionExpired = !!lastError && lastError.status === 401 && !isPbAuthenticated()

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation()

    // Renova a sessão antes de sincronizar (padrão ensureFreshSession);
    // sem sessão válida, avisa em vez de falhar em silêncio.
    if (!isPbAuthenticated()) {
      const ok = await validateAndRefreshPbSession().catch(() => false)
      if (!ok) {
        navigate('/login')
        return
      }
    }

    try {
      setIsManualSyncing(true)
      await syncEngine.processQueue()
      await syncEngine.pullFromCloud()
      window.dispatchEvent(new CustomEvent('conce_budget_updated'))
    } finally {
      setIsManualSyncing(false)
    }
  }

  const dismissError = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearSyncError()
    setLastError(null)
  }

  // Visual e textos baseados no estado
  let icon = <Cloud className="w-3.5 h-3.5 text-green-400" />
  let label = 'Sincronizado'
  let badgeColor = 'bg-white/10 text-white/90 border-white/20'
  let tooltip = 'Status da Nuvem Skip Cloud: sincronizado'

  if (lastError && (syncState === 'error' || (lastError.status === 401 && !isPbAuthenticated()))) {
    icon = <AlertTriangle className="w-3.5 h-3.5 text-[#C4453C]" />
    label = lastError.status === 401 ? 'Sessão expirada' : 'Falha no sync'
    badgeColor = 'bg-[#C4453C]/20 text-[#C4453C] border-[#C4453C]/40'
    tooltip = lastError.message
  } else if (syncState === 'offline') {
    icon = <CloudOff className="w-3.5 h-3.5 text-amber-400" />
    label = 'Offline — salvo local'
    badgeColor = 'bg-amber-500/20 text-amber-200 border-amber-500/30'
    tooltip = 'Sem internet: os dados estão salvos localmente e sobem quando a conexão voltar'
  } else if (syncState === 'syncing' || isManualSyncing) {
    icon = <Loader2 className="w-3.5 h-3.5 text-[#FF6B1F] animate-spin" />
    label = 'Sincronizando…'
    badgeColor = 'bg-[#FF6B1F]/20 text-white border-[#FF6B1F]/40'
    tooltip = 'Enviando dados para a nuvem Skip Cloud…'
  } else if (pendingCount > 0) {
    icon = <CloudUpload className="w-3.5 h-3.5 text-[#FF6B1F]" />
    label = `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`
    badgeColor = 'bg-[#FF6B1F]/20 text-[#FF6B1F] border-[#FF6B1F]/40'
    tooltip = `${pendingCount} gravação(ões) aguardando envio para a nuvem`
  }

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${badgeColor}`}
        title={tooltip}
      >
        {icon}
        <span className="hidden sm:inline font-mono">{label}</span>
      </div>

      {/* Mensagem de erro de sync em pt-BR + ação de relogin quando for sessão */}
      {lastError && (sessionExpired || syncState === 'error') && (
        <div className="flex items-center gap-1.5 max-w-[280px]">
          <span
            className="hidden md:inline text-[10px] leading-tight text-[#C4453C] truncate"
            title={lastError.message}
          >
            {lastError.message}
          </span>
          {sessionExpired && (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#C4453C] text-white text-[10px] font-semibold hover:bg-[#A93B33] transition-colors cursor-pointer whitespace-nowrap"
              title="Ir para a tela de login"
            >
              <LogIn className="w-3 h-3" />
              Entrar novamente
            </button>
          )}
          <button
            type="button"
            onClick={dismissError}
            className="text-[#C4453C]/60 hover:text-[#C4453C] text-xs leading-none cursor-pointer"
            title="Dispensar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* Botão Sincronizar Agora */}
      <button
        type="button"
        onClick={handleManualSync}
        disabled={isManualSyncing}
        className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
        title="Sincronizar dados agora com a nuvem Skip Cloud"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin text-[#FF6B1F]' : ''}`}
        />
      </button>

      {/* Atalho para Carga/Migração se houver handler */}
      {onOpenMigration && (
        <button
          type="button"
          onClick={onOpenMigration}
          className="p-1 rounded-full hover:bg-white/10 text-[#FF6B1F] hover:text-white transition-colors cursor-pointer hidden lg:inline-flex"
          title="Enviar orçamentos locais para a nuvem Skip Cloud"
        >
          <CloudUpload className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
export default SyncStatusIndicator
