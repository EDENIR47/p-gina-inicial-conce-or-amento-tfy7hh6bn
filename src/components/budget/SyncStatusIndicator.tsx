import React, { useState, useEffect } from 'react'
import {
  Cloud,
  CloudCheck,
  CloudUpload,
  CloudOff,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { syncEngine, SyncState } from '@/services/syncEngine'
import { isPbAuthenticated } from '@/services/authService'

interface SyncStatusIndicatorProps {
  onOpenMigration?: () => void
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ onOpenMigration }) => {
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false)

  useEffect(() => {
    const unsub = syncEngine.subscribe((state, count) => {
      setSyncState(state)
      setPendingCount(count)
    })
    return () => unsub()
  }, [])

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isPbAuthenticated()) {
      return
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

  // Visual e textos baseados no estado
  let icon = <Cloud className="w-3.5 h-3.5 text-green-400" />
  let label = 'Sincronizado'
  let badgeColor = 'bg-white/10 text-white/90 border-white/20'

  if (syncState === 'offline') {
    icon = <CloudOff className="w-3.5 h-3.5 text-amber-400" />
    label = 'Offline — salvo local'
    badgeColor = 'bg-amber-500/20 text-amber-200 border-amber-500/30'
  } else if (syncState === 'syncing' || isManualSyncing) {
    icon = <Loader2 className="w-3.5 h-3.5 text-[#FF6B1F] animate-spin" />
    label = 'Sincronizando…'
    badgeColor = 'bg-[#FF6B1F]/20 text-white border-[#FF6B1F]/40'
  } else if (pendingCount > 0) {
    icon = <CloudUpload className="w-3.5 h-3.5 text-[#FF6B1F]" />
    label = `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`
    badgeColor = 'bg-[#FF6B1F]/20 text-[#FF6B1F] border-[#FF6B1F]/40'
  }

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${badgeColor}`}
        title={`Status da Nuvem Skip Cloud: ${label}`}
      >
        {icon}
        <span className="hidden sm:inline font-mono">{label}</span>
      </div>

      {/* Botão Sincronizar Agora */}
      <button
        type="button"
        onClick={handleManualSync}
        disabled={isManualSyncing || syncState === 'offline'}
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
