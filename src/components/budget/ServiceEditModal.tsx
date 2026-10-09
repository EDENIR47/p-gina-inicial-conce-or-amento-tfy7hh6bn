/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Criar ou Editar Serviço de uma Etapa
 * Agora com recurso "Melhorar com IA" via Agente Nativo Skip Cloud (service-description-improver)
 * com pré-visualização, aprovação explícita ("Aplicar" / "Descartar") e fallback resiliente.
 */

import React, { useState, useEffect } from 'react'
import {
  X,
  Check,
  FileSpreadsheet,
  AlertCircle,
  BookOpen,
  Sparkles,
  Loader2,
  Undo2,
  CheckCircle2,
} from 'lucide-react'
import { BudgetComposition, BudgetService, BudgetStage } from '@/types/budgetEngine'
import { CompositionPickerModal } from './CompositionPickerModal'
import { formatCurrencyBRL } from '@/lib/formatters'
import { calculateCompositionUnitCost } from '@/lib/budgetEngine'
import { UnitSelect } from './UnitSelect'
import { areUnitsEquivalent } from '@/lib/measurementUnits'
import pb from '@/lib/pocketbase/client'

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
  // Se for serviço novo ou existente, verificar se a composição possui insumos
  const defaultCompInputs = defaultComp.inputs || []
  const hasCompInputs = defaultCompInputs.length > 0
  const initialCompCost = hasCompInputs ? calculateCompositionUnitCost(defaultComp) : 0

  const [unitPrice, setUnitPrice] = useState<string>(() => {
    if (initialService?.unitPrice !== undefined) {
      return String(initialService.unitPrice)
    }
    // Para novo serviço com insumos de composição, preenche com o custo unitário da composição
    if (hasCompInputs) {
      return String(initialCompCost)
    }
    return ''
  })

  const [unitPriceSource, setUnitPriceSource] = useState<string>(() => {
    if (initialService?.unitPriceSource) {
      return initialService.unitPriceSource
    }
    // Se possui insumos na composição vinculada, a fonte primária é Composição
    if (hasCompInputs) {
      return defaultComp.source || 'Composição'
    }
    return 'Usuário'
  })
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [error, setError] = useState('')

  // Estados para melhoria de descrição com IA nativa Skip Cloud
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [aiNotice, setAiNotice] = useState<string | null>(null)

  // Sincroniza e popula os dados do serviço ao abrir a modal ou alterar initialService
  useEffect(() => {
    if (isOpen) {
      const targetStageId = currentStageId || (stages.length > 0 ? stages[0].id : '')
      setSelectedStageId(targetStageId)

      const currActiveStage = stages.find((s) => s.id === targetStageId)
      const currStageCode = currActiveStage ? currActiveStage.code : defaultStageCode
      const currNextOrder = currActiveStage ? currActiveStage.services.length + 1 : nextOrder

      if (initialService) {
        setCode(
          initialService.code ||
            `${currStageCode}.${String(initialService.order || currNextOrder).padStart(2, '0')}`,
        )
        setDescription(initialService.description || '')
        setUnit(initialService.unit || 'un')
        setQuantity(initialService.quantity !== undefined ? initialService.quantity : 1)

        const comp = initialService.composition || {
          id: `comp-custom-${Date.now()}`,
          code: `CPU-${initialService.code || currStageCode}`,
          description: initialService.description || '',
          specialty: 'Geral',
          unit: initialService.unit || 'un',
          inputs: [],
          version: 'v1.0',
          source: 'CONCE',
        }
        setComposition(comp)

        setCustomBdiPercent(
          initialService.customBdiPercent !== undefined
            ? String(initialService.customBdiPercent)
            : '',
        )
        setLaborSharePercent(
          initialService.laborSharePercent !== undefined
            ? String(initialService.laborSharePercent)
            : '40',
        )
        setNotes(initialService.notes || '')

        const compInputs = comp.inputs || []
        const compCost = compInputs.length > 0 ? calculateCompositionUnitCost(comp) : 0

        if (initialService.unitPrice !== undefined) {
          setUnitPrice(String(initialService.unitPrice))
        } else if (compInputs.length > 0) {
          setUnitPrice(String(compCost))
        } else {
          setUnitPrice('')
        }

        if (initialService.unitPriceSource) {
          setUnitPriceSource(initialService.unitPriceSource)
        } else if (compInputs.length > 0) {
          setUnitPriceSource(comp.source || 'Composição')
        } else {
          setUnitPriceSource('Usuário')
        }
      } else {
        const freshComp: BudgetComposition = {
          id: `comp-custom-${Date.now()}`,
          code: `CPU-${currStageCode}.${String(currNextOrder).padStart(2, '0')}`,
          description: '',
          specialty: 'Geral',
          unit: 'un',
          inputs: [],
          version: 'v1.0',
          source: 'CONCE',
        }
        setCode(`${currStageCode}.${String(currNextOrder).padStart(2, '0')}`)
        setDescription('')
        setUnit('un')
        setQuantity(1)
        setComposition(freshComp)
        setCustomBdiPercent('')
        setLaborSharePercent('40')
        setNotes('')
        setUnitPrice('')
        setUnitPriceSource('Usuário')
      }
      setError('')
      setAiSuggestion(null)
      setAiNotice(null)
      setIsAiLoading(false)
    }
  }, [isOpen, initialService, currentStageId])

  if (!isOpen) return null

  const handleSelectComposition = (comp: BudgetComposition) => {
    // Clona a composição com novos IDs para seus insumos, garantindo total isolamento
    const isolatedComposition: BudgetComposition = {
      ...comp,
      id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      inputs: (comp.inputs || []).map((inp, idx) => ({
        ...inp,
        id: `inp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      })),
    }

    setComposition(isolatedComposition)
    // Se a descrição do serviço estava vazia ou era igual à anterior, sincroniza
    if (!description.trim() || description === composition.description) {
      setDescription(isolatedComposition.description)
    }
    setUnit(isolatedComposition.unit)
    // Se selecionou composição com insumos, podemos limpar o unitPrice manual para calcular pela composição
    if (isolatedComposition.inputs && isolatedComposition.inputs.length > 0) {
      const calculatedCost = calculateCompositionUnitCost(isolatedComposition)
      setUnitPrice(String(calculatedCost))
      setUnitPriceSource(isolatedComposition.source || 'Composição')
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

  // Aciona o Agente Nativo Skip Cloud para aprimorar a descrição do serviço
  const handleImproveWithAi = async () => {
    const trimmedDesc = description.trim()
    if (!trimmedDesc || trimmedDesc.length < 2) {
      setError('Digite pelo menos 2 caracteres na descrição para que a IA possa aprimorá-la.')
      return
    }

    setIsAiLoading(true)
    setError('')
    setAiNotice(null)
    setAiSuggestion(null)

    try {
      const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
      const res = await fetch(`${baseUrl}/backend/v1/improve-service-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
        },
        body: JSON.stringify({
          description: trimmedDesc,
          unit: unit.trim() || undefined,
          stageName: activeStage?.name || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error || 'O serviço de IA está temporariamente indisponível no momento.',
        )
      }

      const improved = data.improvedDescription ? String(data.improvedDescription).trim() : ''
      if (!improved) {
        throw new Error('A IA não gerou uma sugestão válida.')
      }

      setAiSuggestion(improved)
      setAiNotice('Sugestão técnica gerada! Revise abaixo e decida se deseja Aplicar ou Descartar.')
    } catch (err: any) {
      // Mensagem amigável de indisponibilidade mantendo campo editável manualmente
      setAiNotice(
        err?.message ||
          'Assistente de IA temporariamente indisponível. Você pode continuar editando a descrição manualmente com total liberdade.',
      )
    } finally {
      setIsAiLoading(false)
    }
  }

  // Aplica a sugestão gerada pela IA na descrição (ação explícita do usuário)
  const handleApplyAiSuggestion = () => {
    if (aiSuggestion) {
      setDescription(aiSuggestion)
      setAiSuggestion(null)
      setAiNotice('Descrição atualizada com a versão técnica sugerida!')
      if (error) setError('')
    }
  }

  // Descarta a sugestão gerada pela IA mantendo a descrição original intacta
  const handleDiscardAiSuggestion = () => {
    setAiSuggestion(null)
    setAiNotice(null)
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

    // Salvar preserva estritamente os insumos atuais do serviço (sem buscar composição do catálogo nem reimportar)
    const currentInputs =
      initialService?.composition?.inputs !== undefined &&
      composition === initialService.composition
        ? initialService.composition.inputs
        : composition.inputs || []

    const finalComposition: BudgetComposition = {
      ...composition,
      description: composition.description?.trim() || description.trim(),
      unit: (composition.inputs || []).length === 0 ? unit.trim() : composition.unit,
      code: composition.code?.trim() || `CPU-${code.trim()}`,
      inputs: [...currentInputs],
    }

    // Se o usuário digitou preço unitário manual ou se a composição não tem insumos
    const parsedUnitPrice =
      unitPrice.trim() !== '' ? Math.max(0, parseFloat(unitPrice) || 0) : undefined

    const hasFinalInputs = (finalComposition.inputs || []).length > 0
    const finalCpuCost = calculateCompositionUnitCost(finalComposition)

    // Se possui insumos na composição e unitPriceSource não foi explicitamente alterado para Usuário:
    // garantir que adote 'Composição' e o custo da composição
    let effectiveUnitPrice = parsedUnitPrice
    let effectiveUnitPriceSource =
      parsedUnitPrice !== undefined ? unitPriceSource || 'Usuário' : undefined

    if (hasFinalInputs) {
      if (unitPriceSource !== 'Usuário') {
        effectiveUnitPriceSource = finalComposition.source || 'Composição'
        effectiveUnitPrice = finalCpuCost
      }
    } else {
      // Sem insumos, é preço direto ('Usuário')
      if (effectiveUnitPrice !== undefined && !effectiveUnitPriceSource) {
        effectiveUnitPriceSource = 'Usuário'
      }
    }

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
        unitPrice: effectiveUnitPrice,
        unitPriceSource: effectiveUnitPriceSource,
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

  // Validação: alerta apenas se a unidade do serviço for genuinamente incompatível após normalização semântica
  const unitMismatch = !areUnitsEquivalent(unit, composition.unit)

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
            <button onClick={onClose} className="text-white/70 hover:text-white cursor-pointer">
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

            {/* Descrição do Serviço com Botão "Melhorar com IA" */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#171A1F] block">
                  Descrição do Serviço *
                </label>

                {/* Botão de IA Nativa Skip Cloud */}
                <button
                  type="button"
                  onClick={handleImproveWithAi}
                  disabled={isAiLoading || !description.trim()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#294C87] to-[#1F3B6C] hover:from-[#171A1F] hover:to-[#294C87] text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                  title="Aprimorar redação técnica do serviço com agente de IA nativo Skip Cloud para propostas de obras"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF6B1F]" />
                      <span>Aprimorando com IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#FF6B1F]" />
                      <span>Melhorar com IA</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setError('')
                }}
                placeholder="Ex: Execução de alvenaria em tijolos cerâmicos furados 9x19x19 cm..."
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
              />

              {/* Card de Pré-visualização da Sugestão da IA (regra anti-sobrescrita silenciosa: nada grava sem clique em Aplicar) */}
              {aiSuggestion && (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50/70 to-indigo-50/60 border-2 border-[#294C87]/30 space-y-2.5 shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#294C87]">
                      <Sparkles className="w-4 h-4 text-[#FF6B1F]" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Versão Técnica Sugerida pela IA
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-[#171A1F]/60">
                      Pré-visualização (nada foi salvo ainda)
                    </span>
                  </div>

                  <p className="text-xs text-[#171A1F] font-medium leading-relaxed bg-white p-3 rounded-lg border border-[#294C87]/20">
                    {aiSuggestion}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDiscardAiSuggestion}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F]/80 hover:bg-white hover:text-red-600 transition-colors cursor-pointer"
                      title="Descartar sugestão e manter a descrição atual"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Descartar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyAiSuggestion}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Substituir a descrição atual pela versão sugerida"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B1F]" />
                      <span>Aplicar na Descrição</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Aviso / Notificação amigável de status da IA */}
              {aiNotice && !aiSuggestion && (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-[#294C87] flex items-center justify-between">
                  <span>{aiNotice}</span>
                  <button
                    type="button"
                    onClick={() => setAiNotice(null)}
                    className="text-[#294C87]/60 hover:text-[#294C87] text-xs font-bold cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              )}
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
                      className="px-2.5 py-1 rounded-lg border border-[#171A1F]/20 text-[#171A1F]/70 hover:text-red-600 hover:bg-white text-[11px] font-semibold transition-colors cursor-pointer"
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
                className="px-4 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-colors cursor-pointer"
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
