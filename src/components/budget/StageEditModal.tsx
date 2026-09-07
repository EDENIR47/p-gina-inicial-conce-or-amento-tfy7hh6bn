/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Criar ou Editar Etapa da Obra (Nível 1 da Árvore)
 */

import React, { useState } from 'react'
import { X, Check, Layers, AlertCircle } from 'lucide-react'
import { BudgetStage } from '@/types/budgetEngine'

interface StageEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (stage: BudgetStage) => void
  initialStage?: BudgetStage | null
  nextOrder: number
}

export const StageEditModal: React.FC<StageEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialStage,
  nextOrder,
}) => {
  const [name, setName] = useState(initialStage?.name || '')
  const [code, setCode] = useState(initialStage?.code || String(nextOrder).padStart(2, '0'))
  const [notes, setNotes] = useState(initialStage?.notes || '')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('O nome da etapa é obrigatório.')
      return
    }

    onSave({
      id: initialStage?.id || `stage-${Date.now()}`,
      order: initialStage?.order || nextOrder,
      code: code.trim() || '01',
      name: name.trim().toUpperCase(),
      services: initialStage?.services || [],
      notes: notes.trim(),
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#171A1F]/20 overflow-hidden">
        <div className="p-4 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FF6B1F]" />
            <h3 className="text-sm sm:text-base font-bold">
              {initialStage ? 'Editar Etapa da Obra' : 'Nova Etapa da Obra'}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-bold text-[#171A1F] block mb-1">Código</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="01"
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-bold focus:outline-none focus:border-[#294C87]"
              />
            </div>

            <div className="col-span-3">
              <label className="text-xs font-bold text-[#171A1F] block mb-1">Nome da Etapa *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                placeholder="Ex: FUNDAÇÕES E ESTRUTURA"
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-semibold focus:outline-none focus:border-[#294C87]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Observações / Critérios de Medição
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Medições quinzenais conforme diário de obra"
              className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#171A1F]/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>Salvar Etapa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
