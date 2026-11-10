import React, { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { BudgetStatus } from '@/types/conce'

export interface BudgetStatusOption {
  status: BudgetStatus
  label: string
  bgClass: string
  textClass: string
  borderClass: string
  hoverBgClass: string
  dotClass: string
}

export const BUDGET_STATUS_CONFIG: Record<BudgetStatus, BudgetStatusOption> = {
  em_andamento: {
    status: 'em_andamento',
    label: 'Em Andamento',
    bgClass: 'bg-[#294C87]/15',
    textClass: 'text-[#294C87]',
    borderClass: 'border-[#294C87]/30',
    hoverBgClass: 'hover:bg-[#294C87]/25',
    dotClass: 'bg-[#294C87]',
  },
  aprovado: {
    status: 'aprovado',
    label: 'Aprovado',
    bgClass: 'bg-[#3E8E5A]/15',
    textClass: 'text-[#3E8E5A]',
    borderClass: 'border-[#3E8E5A]/30',
    hoverBgClass: 'hover:bg-[#3E8E5A]/25',
    dotClass: 'bg-[#3E8E5A]',
  },
  em_analise: {
    status: 'em_analise',
    label: 'Em Análise',
    bgClass: 'bg-[#171A1F]/15',
    textClass: 'text-[#171A1F]',
    borderClass: 'border-[#171A1F]/30',
    hoverBgClass: 'hover:bg-[#171A1F]/25',
    dotClass: 'bg-[#171A1F]',
  },
  vencido: {
    status: 'vencido',
    label: 'Vencido',
    bgClass: 'bg-[#C4453C]/15',
    textClass: 'text-[#C4453C]',
    borderClass: 'border-[#C4453C]/30',
    hoverBgClass: 'hover:bg-[#C4453C]/25',
    dotClass: 'bg-[#C4453C]',
  },
}

export const BUDGET_STATUS_LIST: BudgetStatusOption[] = [
  BUDGET_STATUS_CONFIG.em_andamento,
  BUDGET_STATUS_CONFIG.aprovado,
  BUDGET_STATUS_CONFIG.em_analise,
  BUDGET_STATUS_CONFIG.vencido,
]

interface BudgetStatusDropdownProps {
  currentStatus: BudgetStatus
  budgetCode?: string
  onChangeStatus: (newStatus: BudgetStatus) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export const BudgetStatusDropdown: React.FC<BudgetStatusDropdownProps> = ({
  currentStatus,
  budgetCode,
  onChangeStatus,
  disabled = false,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeConfig = BUDGET_STATUS_CONFIG[currentStatus] || BUDGET_STATUS_CONFIG.em_andamento

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (status: BudgetStatus, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsOpen(false)
    if (status !== currentStatus) {
      onChangeStatus(status)
    }
  }

  const isSmall = size === 'sm'

  return (
    <div
      ref={containerRef}
      className="relative inline-block text-left"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          if (!disabled) setIsOpen((prev) => !prev)
        }}
        className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all border shadow-xs cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#294C87]/40 ${
          activeConfig.bgClass
        } ${activeConfig.textClass} ${activeConfig.borderClass} ${activeConfig.hoverBgClass} ${
          isSmall ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
        title={`Clique para alterar o status do orçamento ${budgetCode || ''}`}
        aria-label={`Status: ${activeConfig.label}. Clique para alterar.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${activeConfig.dotClass}`} aria-hidden="true" />
        <span>{activeConfig.label}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Opções de status do orçamento"
          className="absolute z-50 mt-1.5 w-44 rounded-xl bg-white border border-[#171A1F]/15 shadow-xl py-1 text-xs animate-in fade-in-0 zoom-in-95 left-0 sm:left-auto sm:right-0 md:left-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-[#171A1F]/50 uppercase tracking-wider border-b border-[#171A1F]/10">
            Atualizar Status
          </div>

          <div className="p-1 space-y-0.5">
            {BUDGET_STATUS_LIST.map((option) => {
              const isSelected = option.status === currentStatus
              return (
                <button
                  key={option.status}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={(e) => handleSelect(option.status, e)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? `${option.bgClass} ${option.textClass}`
                      : 'hover:bg-[#171A1F]/5 text-[#171A1F]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${option.dotClass}`} />
                    <span className="text-xs">{option.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
