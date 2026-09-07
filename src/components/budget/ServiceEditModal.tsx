/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Criar ou Editar Serviço de uma Etapa
 */

import React, { useState } from 'react'
import { X, Check, FileSpreadsheet, AlertCircle, BookOpen } from 'lucide-react'
import { BudgetComposition, BudgetService, BudgetStage } from '@/types/budgetEngine'
import { CompositionPickerModal } from './CompositionPickerModal'
import { CONCE_CANONICAL_COMPOSITIONS } from '@/lib/compositionsData'
import { formatCurrencyBRL } from '@/lib/formatters'
import { calculateCompositionUnitCost } from '@/lib/budgetEngine'

interface ServiceEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (service: BudgetService, selectedStageId?: string) => void
  initialService?: BudgetService | null
  nextOrder: number
  stageCode: string
  stages?: BudgetStage[]
  currentStageId?: string | null
}

export const ServiceEditModal: React.FC<ServiceEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialService,
  nextOrder,
  stageCode: defaultStageCode,
  stages = [],
  currentStageId,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>(
    currentStageId || (stages.length > 0 ? stages[0].id : ''),
  )

  const activeStage = stages.find((s) => s.id === selectedStageId)
  const activeStageCode = activeStage ? activeStage.code : defaultStageCode
  const effectiveNextOrder = activeStage ? activeStage.services.length + 1 : nextOrder

  // Para novo serviço, inicia sem composição (vazia, R$ 0,00) ou a do serviço existente
  const defaultEmptyComp: BudgetComposition = {
    id: `comp-custom-${Date.now()}`,
    code: `CPU-${activeStageCode}.${String(effectiveNextOrder).padStart(2, '0')}`,
    description: '',
    specialty: 'Geral',
    unit: 'un',
    inputs: [],
    version: 'v1.0',
    source: 'CONCE',
  }

  const defaultComp = initialService?.composition || defaultEmptyComp

  const [description, setDescription] = useState(initialService?.description || '')
  const [code, setCode] = useState(
    initialService?.code || `${activeStageCode}.${String(effectiveNextOrder).padStart(2, '0')}`,
  )
  const [unit, setUnit] = useState(initialService?.unit || 'un')
  const [quantity, setQuantity] = useState<number>(initialService?.quantity ?? 1)
  const [composition, setComposition] = useState<BudgetComposition>(defaultComp)
  const [customBdiPercent, setCustomBdiPercent] = useState<string>(
    initialService?.customBdiPercent !== undefined ? String(initialService.customBdiPercent) : '',
  )
  const [notes, setNotes] = useState(initialService?.notes || '')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSelectComposition = (comp: BudgetComposition) => {
    setComposition(comp)
    // Se a descrição do serviço estava vazia ou era igual à anterior, sincroniza
    if (!description.trim() || description === composition.description) {
      setDescription(comp.description)
    }
    setUnit(comp.unit)
  }

  const handleClearComposition = () => {
    setComposition({
      id: `comp-custom-${Date.now()}`,
      code: `CPU-${code || activeStageCode}`,
      description: description.trim() || 'Composição Própria do Serviço',
      specialty: 'Geral',
      unit: unit.trim() || 'un',
      inputs: [],
      version: 'v1.0',
      source: 'CONCE',
    })
  }

  // Atualiza código sugerido ao trocar etapa se for criação
  const handleStageChange = (newStageId: string) => {
    setSelectedStageId(newStageId)
    if (!initialService) {
      const st = stages.find((s) => s.id === newStageId)
      if (st) {
        const nextIdx = st.services.length + 1
        setCode(`${st.code}.${String(nextIdx).padStart(2, '0')}`)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      setError('O nome / descrição do serviço é obrigatório.')
      return
    }
    if (!unit.trim()) {
      setError('A unidade de medida do serviço é obrigatória (ex.: m², m³, un, kg, vb).')
      return
    }
    if (quantity < 0) {
      setError('A quantidade não pode ser negativa.')
      return
    }

    const customBdi = customBdiPercent.trim() !== '' ? parseFloat(customBdiPercent) : undefined

    // Garante que a composição vinculada mantenha referência coerente
    const finalComposition: BudgetComposition = {
      ...composition,
      description: composition.description.trim() || description.trim(),
      unit: composition.inputs.length === 0 ? unit.trim() : composition.unit,
      code: composition.code.trim() || `CPU-${code.trim()}`,
    }

    onSave(
      {
        id: initialService?.id || `serv-${Date.now()}`,
        order: initialService?.order || effectiveNextOrder,
        code: code.trim() || `${activeStageCode}.${String(effectiveNextOrder).padStart(2, '0')}`,
        description: description.trim(),
        unit: unit.trim() || 'un',
        quantity: Number(quantity) || 0,
        composition: finalComposition,
        customBdiPercent: customBdi,
        notes: notes.trim(),
      },
      selectedStageId,
    )

    onClose()
  }

  const unitCost = calculateCompositionUnitCost(composition)
  const totalDirectCost = unitCost * quantity

  // Validação: alerta se unidade do serviço for incompatível com a composição
  const unitMismatch = unit.trim().toLowerCase() !== composition.unit.trim().toLowerCase()

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-[#171A1F]/20 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="p-4 bg-[#171A1F] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#FF6B1F]" />
              <h3 className="text-sm sm:text-base font-bold">
                {initialService ? 'Editar Serviço da Etapa' : 'Adicionar Novo Serviço'}
              </h3>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {unitMismatch && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção: Incompatibilidade de Unidade!</strong>
                  <p>
                    A unidade do serviço está como <strong>"{unit}"</strong> mas a composição
                    selecionada ({composition.code}) foi calculada por{' '}
                    <strong>"{composition.unit}"</strong>. Recomendamos alinhar para manter
                    coerência métrica.
                  </p>
                </div>
              </div>
            )}

            {/* Seletor de Etapa (se houver mais de uma etapa disponível) */}
            {stages.length > 0 && (
              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">
                  Etapa de Destino *
                </label>
                <select
                  value={selectedStageId}
                  onChange={(e) => handleStageChange(e.target.value)}
                  disabled={!!initialService} // Se estiver editando serviço existente, mantém na mesma etapa
                  className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-bold bg-[#F8F9FA] focus:outline-none focus:border-[#294C87] disabled:opacity-60"
                >
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>
                      Etapa {st.code} — {st.name} ({st.services.length} serviços)
                    </option>
                  ))}
                </select>
                {initialService && (
                  <p className="text-[10px] text-[#171A1F]/50 mt-0.5">
                    A etapa de um serviço existente não pode ser alterada diretamente.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">
                  Item / Código *
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: 01.01"
                  className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-bold focus:outline-none focus:border-[#294C87]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">Unidade *</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Ex: m², m³, un, vb, kg"
                  className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-bold focus:outline-none focus:border-[#294C87]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">Quantidade *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-bold focus:outline-none focus:border-[#294C87]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Descrição do Serviço *
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setError('')
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
              />
            </div>

            {/* Caixa de Composição Vinculada */}
            <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#294C87]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#294C87]">
                    Composição Unitária CPU (Nível 3)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {composition.inputs && composition.inputs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearComposition}
                      className="px-2.5 py-1 rounded-lg border border-[#171A1F]/20 text-[#171A1F]/70 hover:text-red-600 hover:bg-white text-[11px] font-semibold transition-colors"
                    >
                      Esvaziar Insumos
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    {composition.inputs && composition.inputs.length > 0
                      ? 'Trocar Composição'
                      : 'Importar da Biblioteca'}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white border border-[#171A1F]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#294C87]">
                      {composition.code || `CPU-${code || activeStageCode}`}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF6B1F]/15 text-[#FF6B1F]">
                      {composition.source || 'CONCE'}
                    </span>
                    <span className="text-xs text-[#171A1F]/60">
                      ({composition.inputs.length > 0 ? composition.unit : unit || 'un'})
                    </span>
                    {composition.inputs.length === 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Insumos vazios (R$ 0,00)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#171A1F] line-clamp-1 font-medium mt-0.5">
                    {composition.description ||
                      description ||
                      'Composição própria inicial zerada (adicione insumos após salvar)'}
                  </p>
                  <p className="text-[11px] text-[#171A1F]/50 mt-0.5">
                    {composition.inputs.length === 0
                      ? 'O serviço nascerá com custo R$ 0,00. Você poderá adicionar insumos (material, mão de obra, equipamento) na árvore quando quiser.'
                      : `${composition.inputs.length} insumo(s) cadastrado(s) nesta composição.`}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[#171A1F]/50 block">Custo Unit. CPU</span>
                  <span className="text-xs sm:text-sm font-bold text-[#FF6B1F]">
                    {formatCurrencyBRL(unitCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* BDI Diferenciado Opcional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">
                  BDI Diferenciado (%){' '}
                  <span className="text-[10px] text-[#171A1F]/50">(Opcional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Deixar em branco para usar o BDI geral"
                  value={customBdiPercent}
                  onChange={(e) => setCustomBdiPercent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">
                  Observações / Especificação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fornecimento e montagem inclusos"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
                />
              </div>
            </div>

            {/* Totalizador Prévio */}
            <div className="p-3 rounded-xl bg-[#171A1F]/5 border border-[#171A1F]/10 flex items-center justify-between text-xs">
              <span className="text-[#171A1F]/70">
                Subtotal Direto Previsto: {quantity} {unit} × {formatCurrencyBRL(unitCost)}
              </span>
              <span className="font-extrabold text-[#FF6B1F] text-sm">
                = {formatCurrencyBRL(totalDirectCost)}
              </span>
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
                <span>Salvar Serviço</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <CompositionPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleSelectComposition}
        targetUnit={unit}
      />
    </>
  )
}
