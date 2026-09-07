/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Adicionar ou Editar Insumo diretamente na Composição
 */

import React, { useState } from 'react'
import { X, Check, Package, AlertCircle } from 'lucide-react'
import { BudgetInput, InputCategory } from '@/types/budgetEngine'

interface InputEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (input: BudgetInput) => void
  initialInput?: BudgetInput | null
}

export const InputEditModal: React.FC<InputEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialInput,
}) => {
  const [code, setCode] = useState(initialInput?.code || 'SINAPI-')
  const [description, setDescription] = useState(initialInput?.description || '')
  const [unit, setUnit] = useState(initialInput?.unit || 'un')
  const [category, setCategory] = useState<InputCategory>(initialInput?.category || 'material')
  const [coefficient, setCoefficient] = useState<number>(initialInput?.coefficient || 1.0)
  const [unitCost, setUnitCost] = useState<number>(initialInput?.unitCost || 0)
  const [source, setSource] = useState<string>(initialInput?.source || 'Usuário')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      setError('A descrição do insumo é obrigatória.')
      return
    }
    if (coefficient <= 0) {
      setError('O coeficiente de consumo deve ser maior que zero.')
      return
    }
    if (unitCost < 0) {
      setError('O custo unitário não pode ser negativo.')
      return
    }

    const effectiveSource = source.trim() || 'Usuário'
    const isSemFonte = effectiveSource.toLowerCase().includes('sem fonte') || unitCost === 0

    onSave({
      id: initialInput?.id || `inp-${Date.now()}`,
      code: code.trim() || 'INSP-001',
      description: description.trim(),
      unit: unit.trim() || 'un',
      category,
      coefficient: Number(coefficient),
      unitCost: Number(unitCost),
      source: isSemFonte ? 'sem fonte — preencher manualmente' : effectiveSource,
      sourceStatus: isSemFonte ? 'sem_fonte' : 'valido',
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#171A1F]/20 overflow-hidden">
        <div className="p-4 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#FF6B1F]" />
            <h3 className="text-sm font-bold">
              {initialInput ? 'Editar Insumo da Composição' : 'Adicionar Insumo à Composição'}
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Código SINAPI/Próprio
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: SINAPI-88316"
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-mono focus:outline-none focus:border-[#294C87]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">Fonte do Custo</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-semibold focus:outline-none focus:border-[#294C87]"
              >
                <option value="Usuário">Usuário (Inserção manual)</option>
                <option value="SINAPI">SINAPI</option>
                <option value="SICRO">SICRO</option>
                <option value="Biblioteca CONCE">Biblioteca CONCE</option>
                <option value="sem fonte — preencher manualmente">Sem fonte (Pendente)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InputCategory)}
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
              >
                <option value="material">Material</option>
                <option value="mao_de_obra">Mão de Obra</option>
                <option value="equipamento">Equipamento</option>
                <option value="servico_terceiro">Serviço de Terceiros</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Descrição do Insumo *
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setError('')
              }}
              placeholder="Ex: Cimento Portland CP II-E-32 saco 50kg"
              className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">Unidade *</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Ex: kg, m², h"
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">Coeficiente *</label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={coefficient}
                onChange={(e) => setCoefficient(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-bold focus:outline-none focus:border-[#294C87]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Custo Unit. (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-bold text-[#FF6B1F] focus:outline-none focus:border-[#FF6B1F]"
              />
            </div>
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
              <span>Salvar Insumo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
