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
import { UnitSelect } from './UnitSelect'

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
  const [laborSharePercent, setLaborSharePercent] = useState<string>(
    initialService?.laborSharePercent !== undefined
      ? String(initialService.laborSharePercent)
      : '40',
  )
  const [notes, setNotes] = useState(initialService?.notes || '')
  const [unitPrice, setUnitPrice] = useState<string>(
    initialService?.unitPrice !== undefined ? String(initialService.unitPrice) : '',
  )
  const [unitPriceSource, setUnitPriceSource] = useState<string>(
    initialService?.unitPriceSource || 'Usuário',
  )
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
    // Se selecionou composição com insumos, podemos limpar o unitPrice manual para calcular pela composição
    if (comp.inputs && comp.inputs.length > 0) {
      const calculatedCost = calculateCompositionUnitCost(comp)
      setUnitPrice(String(calculatedCost))
      setUnitPriceSource(comp.source || 'Composição')
    }
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

    // Se o usuário digitou preço unitário manual ou se a composição não tem insumos
    const parsedUnitPrice =
      unitPrice.trim() !== '' ? Math.max(0, parseFloat(unitPrice) || 0) : undefined

    const parsedLaborShare =
      laborSharePercent.trim() !== ''
        ? Math.max(0, Math.min(100, parseFloat(laborSharePercent) || 40))
        : 40

    onSave(
      {
        id: initialService?.id || `serv-${Date.now()}`,
        order: initialService?.order || effectiveNextOrder,
        code: code.trim() || `${activeStageCode}.${String(effectiveNextOrder).padStart(2, '0')}`,
        description: description.trim(),
        unit: unit.trim() || 'un',
        quantity: Number(quantity) || 0,
        composition: finalComposition,
        unitPrice: parsedUnitPrice,
        unitPriceSource: parsedUnitPrice !== undefined ? unitPriceSource || 'Usuário' : undefined,
        customBdiPercent: customBdi,
        laborSharePercent: parsedLaborShare,
        notes: notes.trim(),
      },
      selectedStageId,
    )

    onClose()
  }

  const compCalculatedCost = calculateCompositionUnitCost(composition)
  const effectiveUnitCost =
    unitPrice.trim() !== '' ? Math.max(0, parseFloat(unitPrice) || 0) : compCalculatedCost
  const totalDirectCost = effectiveUnitCost * quantity

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

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                <UnitSelect
                  value={unit}
                  onChange={(val) => {
                    setUnit(val)
                    if (error) setError('')
                  }}
                  showQuickPills
                  placeholder="Selecione..."
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

              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">
                  Preço Unitário (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#171A1F]/50">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={compCalculatedCost > 0 ? compCalculatedCost.toFixed(2) : '0,00'}
                    value={unitPrice}
                    onChange={(e) => {
                      setUnitPrice(e.target.value)
                      setUnitPriceSource('Usuário')
                    }}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border-2 border-[#294C87]/40 text-xs font-mono font-bold text-[#171A1F] focus:outline-none focus:border-[#294C87] bg-white"
                  />
                </div>
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
                    {formatCurrencyBRL(compCalculatedCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco de Estimativa de Mão de Obra e BDI Diferenciado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">
                  Fração Mão de Obra (%)
                  <span className="text-[10px] text-[#171A1F]/50 block font-normal">
                    (Base de encargos em preço direto)
                  </span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  placeholder="40"
                  value={laborSharePercent}
                  onChange={(e) => setLaborSharePercent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-bold text-[#294C87] focus:outline-none focus:border-[#294C87]"
                  title="Fração de mão de obra sobre a qual incidirão os encargos sociais quando o serviço usa preço direto sem insumos de MO"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">
                  BDI Diferenciado (%)
                  <span className="text-[10px] text-[#171A1F]/50 block font-normal">
                    (Opcional / diferenciado)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Usar BDI geral"
                  value={customBdiPercent}
                  onChange={(e) => setCustomBdiPercent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#171A1F] block mb-1">
                  Observações / Especificação
                  <span className="text-[10px] text-[#171A1F]/50 block font-normal">
                    (Detalhe técnico)
                  </span>
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
            <div className="p-3.5 rounded-xl bg-[#171A1F]/5 border border-[#171A1F]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <span className="text-[#171A1F]/80 block font-medium">
                  Subtotal Direto Previsto:{' '}
                  <strong>
                    {quantity} {unit}
                  </strong>{' '}
                  ×{' '}
                  <strong className="text-[#294C87]">{formatCurrencyBRL(effectiveUnitCost)}</strong>
                </span>
                <span className="text-[11px] text-[#171A1F]/60 block">
                  Fonte do preço:{' '}
                  <span className="font-semibold text-[#294C87]">
                    {unitPrice.trim() !== '' ? unitPriceSource : composition.source || 'CPU'}
                  </span>
                  {unitPrice.trim() !== '' && (
                    <span className="ml-1 text-[10px] text-[#FF6B1F] font-bold">
                      (Preço manual definido pelo usuário)
                    </span>
                  )}
                </span>
              </div>
              <span className="font-extrabold text-[#FF6B1F] text-base text-right">
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
