/**
 * CONCE — Selo visual de presença de edição ("{Nome} está editando este orçamento agora").
 * Apenas um AVISO: não bloqueia a edição (last-write-wins).
 */

import React from 'react'
import { PenLine } from 'lucide-react'
import type { BudgetEditPresence } from '@/services/editPresenceService'

interface EditPresenceBadgeProps {
  editors: BudgetEditPresence[]
  /** 'card' = selo compacto inline; 'banner' = faixa discreta dentro do editor */
  variant?: 'card' | 'banner' | 'table'
}

function formatNames(editors: BudgetEditPresence[]): string {
  if (editors.length === 1) return editors[0].userName
  if (editors.length === 2) return `${editors[0].userName} e ${editors[1].userName}`
  return `${editors[0].userName} e mais ${editors.length - 1}`
}

export const EditPresenceBadge: React.FC<EditPresenceBadgeProps> = ({
  editors,
  variant = 'card',
}) => {
  if (editors.length === 0) return null

  if (variant === 'banner') {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-300/60 text-amber-900 shadow-sm animate-fade-in"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
        </span>
        <span className="text-xs sm:text-sm font-semibold">
          {formatNames(editors)}{' '}
          {editors.length === 1
            ? 'está editando este orçamento agora'
            : 'estão editando este orçamento agora'}
        </span>
      </div>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300/70 whitespace-nowrap ${
        variant === 'table' ? 'px-2 py-0.5' : ''
      }`}
      role="status"
      aria-live="polite"
      title={`${formatNames(editors)} ${
        editors.length === 1
          ? 'está editando este orçamento agora'
          : 'estão editando este orçamento agora'
      }`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <PenLine className="w-3 h-3 text-amber-600 shrink-0" aria-hidden="true" />
      <span className="truncate max-w-[220px]">
        {formatNames(editors)}{' '}
        {editors.length === 1
          ? 'está editando este orçamento agora'
          : 'estão editando este orçamento agora'}
      </span>
    </span>
  )
}
