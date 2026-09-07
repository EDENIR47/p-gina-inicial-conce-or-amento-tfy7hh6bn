/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Árvore Hierárquica de 4 Níveis com Edição em Tempo Real
 * Nível 1: Etapa da Obra
 * Nível 2: Serviço
 * Nível 3: Composição (CPU)
 * Nível 4: Insumos (Material, Mão de Obra, Equipamento)
 */

import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Layers,
  FileSpreadsheet,
  BookOpen,
  Package,
  Plus,
  Trash2,
  Edit2,
  Copy,
  AlertTriangle,
  Info,
  Hammer,
  Clock,
  Sparkles,
} from 'lucide-react'
import { BudgetInput, BudgetService, BudgetStage, FullBudget } from '@/types/budgetEngine'
import {
  calculateCompositionUnitCost,
  calculateServiceDirectCost,
  calculateStageDirectCost,
} from '@/lib/budgetEngine'
import { formatCurrencyBRL } from '@/lib/formatters'
import { StageEditModal } from './StageEditModal'
import { ServiceEditModal } from './ServiceEditModal'
import { InputEditModal } from './InputEditModal'

interface BudgetHierarchyTreeProps {
  budget: FullBudget
  onChange: (updatedBudget: FullBudget) => void
  disabled?: boolean
}

export const BudgetHierarchyTree: React.FC<BudgetHierarchyTreeProps> = ({
  budget,
  onChange,
  disabled = false,
}) => {
  // Controle de expansão/colapso da árvore
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    budget.stages.forEach((s) => {
      init[s.id] = true // etapas abertas por padrão
    })
    return init
  })

  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    budget.stages.forEach((s) => {
      s.services.forEach((srv) => {
        init[srv.id] = true // serviços abertos por padrão
      })
    })
    return init
  })

  // Modais de Edição/Criação
  const [stageModalState, setStageModalState] = useState<{
    isOpen: boolean
    stage: BudgetStage | null
  }>({ isOpen: false, stage: null })

  const [serviceModalState, setServiceModalState] = useState<{
    isOpen: boolean
    stageId: string | null
    stageCode: string
    service: BudgetService | null
  }>({ isOpen: false, stageId: null, stageCode: '01', service: null })

  const [inputModalState, setInputModalState] = useState<{
    isOpen: boolean
    stageId: string | null
    serviceId: string | null
    input: BudgetInput | null
  }>({ isOpen: false, stageId: null, serviceId: null, input: null })

  // Alterna expansão de Etapa
  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => ({ ...prev, [stageId]: !prev[stageId] }))
  }

  // Alterna expansão de Serviço (Nível 2 -> 3 e 4)
  const toggleService = (serviceId: string) => {
    setExpandedServices((prev) => ({ ...prev, [serviceId]: !prev[serviceId] }))
  }

  // Ações em Etapas
  const handleSaveStage = (savedStage: BudgetStage) => {
    const exists = budget.stages.some((s) => s.id === savedStage.id)
    let newStages: BudgetStage[]

    if (exists) {
      newStages = budget.stages.map((s) => (s.id === savedStage.id ? savedStage : s))
    } else {
      newStages = [...budget.stages, savedStage]
      // Abre automaticamente a nova etapa
      setExpandedStages((prev) => ({ ...prev, [savedStage.id]: true }))
    }

    onChange({ ...budget, stages: newStages })
  }

  const handleDeleteStage = (stageId: string) => {
    if (confirm('Tem certeza que deseja excluir esta etapa e todos os seus serviços?')) {
      const newStages = budget.stages.filter((s) => s.id !== stageId)
      onChange({ ...budget, stages: newStages })
    }
  }

  const handleDuplicateStage = (stage: BudgetStage) => {
    const duplicatedStage: BudgetStage = {
      ...JSON.parse(JSON.stringify(stage)),
      id: `stage-${Date.now()}`,
      code: String(budget.stages.length + 1).padStart(2, '0'),
      name: `${stage.name} (CÓPIA)`,
      order: budget.stages.length + 1,
    }
    const newStages = [...budget.stages, duplicatedStage]
    setExpandedStages((prev) => ({ ...prev, [duplicatedStage.id]: true }))
    onChange({ ...budget, stages: newStages })
  }

  // Ações em Serviços
  const handleSaveService = (savedService: BudgetService, stageId: string) => {
    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      const exists = st.services.some((srv) => srv.id === savedService.id)
      let updatedServices: BudgetService[]
      if (exists) {
        updatedServices = st.services.map((srv) =>
          srv.id === savedService.id ? savedService : srv,
        )
      } else {
        updatedServices = [...st.services, savedService]
        setExpandedServices((prev) => ({ ...prev, [savedService.id]: true }))
      }
      return { ...st, services: updatedServices }
    })

    onChange({ ...budget, stages: newStages })
  }

  const handleDeleteService = (stageId: string, serviceId: string) => {
    if (confirm('Deseja excluir este serviço?')) {
      const newStages = budget.stages.map((st) => {
        if (st.id !== stageId) return st
        return {
          ...st,
          services: st.services.filter((s) => s.id !== serviceId),
        }
      })
      onChange({ ...budget, stages: newStages })
    }
  }

  const handleDuplicateService = (stageId: string, service: BudgetService) => {
    const stage = budget.stages.find((s) => s.id === stageId)
    if (!stage) return
    const duplicatedService: BudgetService = {
      ...JSON.parse(JSON.stringify(service)),
      id: `serv-${Date.now()}`,
      order: stage.services.length + 1,
      code: `${stage.code}.${String(stage.services.length + 1).padStart(2, '0')}`,
      description: `${service.description} (CÓPIA)`,
    }

    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      return { ...st, services: [...st.services, duplicatedService] }
    })
    setExpandedServices((prev) => ({ ...prev, [duplicatedService.id]: true }))
    onChange({ ...budget, stages: newStages })
  }

  // Ações em Insumos (Nível 4)
  const handleSaveInput = (savedInput: BudgetInput, stageId: string, serviceId: string) => {
    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      const updatedServices = st.services.map((srv) => {
        if (srv.id !== serviceId) return srv
        const comp = srv.composition
        const exists = comp.inputs?.some((inp) => inp.id === savedInput.id)
        let updatedInputs: BudgetInput[]
        if (exists) {
          updatedInputs = (comp.inputs || []).map((inp) =>
            inp.id === savedInput.id ? savedInput : inp,
          )
        } else {
          updatedInputs = [...(comp.inputs || []), savedInput]
        }
        return {
          ...srv,
          composition: {
            ...comp,
            inputs: updatedInputs,
          },
        }
      })
      return { ...st, services: updatedServices }
    })

    onChange({ ...budget, stages: newStages })
  }

  const handleDeleteInput = (stageId: string, serviceId: string, inputId: string) => {
    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      const updatedServices = st.services.map((srv) => {
        if (srv.id !== serviceId) return srv
        return {
          ...srv,
          composition: {
            ...srv.composition,
            inputs: (srv.composition.inputs || []).filter((inp) => inp.id !== inputId),
          },
        }
      })
      return { ...st, services: updatedServices }
    })

    onChange({ ...budget, stages: newStages })
  }

  // Edição rápida de coeficiente ou custo do insumo inline
  const handleInlineInputUpdate = (
    stageId: string,
    serviceId: string,
    inputId: string,
    field: 'coefficient' | 'unitCost',
    value: number,
  ) => {
    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      const updatedServices = st.services.map((srv) => {
        if (srv.id !== serviceId) return srv
        const updatedInputs = (srv.composition.inputs || []).map((inp) => {
          if (inp.id !== inputId) return inp
          return { ...inp, [field]: Math.max(0, value) }
        })
        return {
          ...srv,
          composition: { ...srv.composition, inputs: updatedInputs },
        }
      })
      return { ...st, services: updatedServices }
    })

    onChange({ ...budget, stages: newStages })
  }

  // Edição rápida de quantidade do serviço inline
  const handleInlineServiceQtyUpdate = (stageId: string, serviceId: string, qty: number) => {
    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      const updatedServices = st.services.map((srv) => {
        if (srv.id !== serviceId) return srv
        return { ...srv, quantity: Math.max(0, qty) }
      })
      return { ...st, services: updatedServices }
    })

    onChange({ ...budget, stages: newStages })
  }

  return (
    <div className="space-y-4">
      {/* Barra de Ações do Nível Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#171A1F]/10 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-[#294C87] text-white">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#171A1F]">
              Estrutura Analítica do Orçamento (EAP de 4 Níveis)
            </h3>
            <p className="text-xs text-[#171A1F]/60">
              Etapa (N1) → Serviço (N2) → Composição (N3) → Insumos (N4) com recálculo em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setStageModalState({
                isOpen: true,
                stage: null,
              })
            }
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Etapa</span>
          </button>
        </div>
      </div>

      {/* Árvore de Etapas */}
      {budget.stages.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-[#171A1F]/20 space-y-3">
          <Layers className="w-12 h-12 text-[#294C87]/40 mx-auto" />
          <h4 className="text-base font-bold text-[#171A1F]">Nenhuma etapa cadastrada</h4>
          <p className="text-xs text-[#171A1F]/60 max-w-sm mx-auto">
            Comece adicionando a primeira etapa da obra (ex.: Serviços Preliminares, Fundações,
            Estrutura).
          </p>
          <button
            type="button"
            onClick={() => setStageModalState({ isOpen: true, stage: null })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#294C87] text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4 text-[#FF6B1F]" />
            <span>Criar Primeira Etapa</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {budget.stages.map((stage) => {
            const isStageOpen = !!expandedStages[stage.id]
            const stageDirectCost = calculateStageDirectCost(stage)
            const servicesCount = stage.services?.length || 0

            return (
              <div
                key={stage.id}
                className="bg-white rounded-[16px] shadow-[0_4px_20px_rgba(23,26,31,0.05)] border border-[#171A1F]/10 overflow-hidden transition-all"
              >
                {/* NÍVEL 1: HEADER DA ETAPA (MIRAGE / COBALT) */}
                <div className="p-3.5 sm:p-4 bg-[#171A1F] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-8 border-[#294C87]">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleStage(stage.id)}
                      className="p-1.5 rounded-md hover:bg-white/10 text-white transition-colors"
                      title={isStageOpen ? 'Recolher Etapa' : 'Expandir Etapa'}
                    >
                      {isStageOpen ? (
                        <ChevronDown className="w-5 h-5 text-[#FF6B1F]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-white/70" />
                      )}
                    </button>

                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-[#294C87] text-white tracking-wider">
                      ETAPA {stage.code}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm sm:text-base font-extrabold text-white truncate tracking-wide">
                        {stage.name}
                      </h4>
                      {stage.notes && (
                        <p className="text-[11px] text-white/60 truncate">{stage.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Subtotal da Etapa e Ações */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0 border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-white/60 uppercase tracking-wider block">
                        Subtotal Etapa {stage.code} ({servicesCount}{' '}
                        {servicesCount === 1 ? 'item' : 'itens'})
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-[#FF6B1F]">
                        {formatCurrencyBRL(stageDirectCost)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setServiceModalState({
                            isOpen: true,
                            stageId: stage.id,
                            stageCode: stage.code,
                            service: null,
                          })
                        }
                        disabled={disabled}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-[#FF6B1F] text-white text-xs font-semibold transition-colors flex items-center gap-1"
                        title="Adicionar serviço nesta etapa"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline text-xs">Novo Serviço</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateStage(stage)}
                        disabled={disabled}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        title="Duplicar Etapa"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setStageModalState({ isOpen: true, stage })}
                        disabled={disabled}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        title="Editar Etapa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStage(stage.id)}
                        disabled={disabled}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                        title="Excluir Etapa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* CONTEÚDO DA ETAPA: SERVIÇOS (NÍVEL 2) */}
                {isStageOpen && (
                  <div className="p-3 sm:p-5 space-y-4 bg-[#F8F9FA]/50">
                    {stage.services.length === 0 ? (
                      <div className="p-6 text-center rounded-xl border border-dashed border-[#171A1F]/15 bg-white space-y-2">
                        <FileSpreadsheet className="w-8 h-8 text-[#171A1F]/30 mx-auto" />
                        <p className="text-xs text-[#171A1F]/60">
                          Nenhum serviço inserido nesta etapa.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setServiceModalState({
                              isOpen: true,
                              stageId: stage.id,
                              stageCode: stage.code,
                              service: null,
                            })
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#294C87] text-white text-xs font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#FF6B1F]" />
                          <span>Adicionar Serviço</span>
                        </button>
                      </div>
                    ) : (
                      stage.services.map((service) => {
                        const isServiceOpen = !!expandedServices[service.id]
                        const comp = service.composition
                        const unitCost = calculateCompositionUnitCost(comp)
                        const serviceTotal = calculateServiceDirectCost(service)
                        const hasCustomBdi =
                          service.customBdiPercent !== undefined &&
                          service.customBdiPercent !== null

                        // Validação de unidade incompatível
                        const isUnitMismatch =
                          service.unit.trim().toLowerCase() !== comp.unit.trim().toLowerCase()

                        return (
                          <div
                            key={service.id}
                            className="bg-white rounded-xl border border-[#171A1F]/15 overflow-hidden shadow-sm"
                          >
                            {/* NÍVEL 2: CABEÇALHO DO SERVIÇO */}
                            <div className="p-3 sm:p-3.5 bg-white border-b border-[#171A1F]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => toggleService(service.id)}
                                  className="p-1 rounded hover:bg-[#171A1F]/5 text-[#171A1F]/70 transition-colors mt-0.5 sm:mt-0"
                                  title={
                                    isServiceOpen
                                      ? 'Ocultar detalhes da composição'
                                      : 'Ver CPU e insumos'
                                  }
                                >
                                  {isServiceOpen ? (
                                    <ChevronDown className="w-4 h-4 text-[#294C87]" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-[#171A1F]/50" />
                                  )}
                                </button>

                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#171A1F]/5 text-[#171A1F] border border-[#171A1F]/10">
                                  {service.code}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h5 className="text-xs sm:text-sm font-bold text-[#171A1F]">
                                      {service.description}
                                    </h5>
                                    {isUnitMismatch && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                                        title={`Serviço em ${service.unit}, mas CPU em ${comp.unit}`}
                                      >
                                        <AlertTriangle className="w-3 h-3" />
                                        Unidade ≠ CPU
                                      </span>
                                    )}
                                    {hasCustomBdi && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F]">
                                        BDI: {service.customBdiPercent}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Quantidade Inline, Custo Unitário e Total do Serviço */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      disabled={disabled}
                                      value={service.quantity}
                                      onChange={(e) =>
                                        handleInlineServiceQtyUpdate(
                                          stage.id,
                                          service.id,
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                      className="w-20 px-2 py-1 text-right rounded border border-[#171A1F]/20 text-xs font-bold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
                                    />
                                    <span className="text-xs font-bold text-[#171A1F]/70">
                                      {service.unit}
                                    </span>
                                  </div>

                                  <span className="text-xs text-[#171A1F]/40 font-mono">×</span>

                                  <div className="text-right">
                                    <span className="text-[10px] text-[#171A1F]/50 block">
                                      Unit.
                                    </span>
                                    <span className="text-xs font-bold text-[#171A1F]">
                                      {formatCurrencyBRL(unitCost)}
                                    </span>
                                  </div>

                                  <span className="text-xs text-[#171A1F]/40 font-mono">=</span>

                                  <div className="text-right min-w-[100px]">
                                    <span className="text-[10px] text-[#171A1F]/50 block">
                                      Subtotal
                                    </span>
                                    <span className="text-xs sm:text-sm font-extrabold text-[#FF6B1F]">
                                      {formatCurrencyBRL(serviceTotal)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateService(stage.id, service)}
                                    disabled={disabled}
                                    className="p-1 rounded text-[#171A1F]/60 hover:text-[#171A1F] hover:bg-[#171A1F]/5 transition-colors"
                                    title="Duplicar Serviço"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setServiceModalState({
                                        isOpen: true,
                                        stageId: stage.id,
                                        stageCode: stage.code,
                                        service,
                                      })
                                    }
                                    disabled={disabled}
                                    className="p-1 rounded text-[#171A1F]/60 hover:text-[#294C87] hover:bg-[#171A1F]/5 transition-colors"
                                    title="Editar Serviço"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteService(stage.id, service.id)}
                                    disabled={disabled}
                                    className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                    title="Excluir Serviço"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* NÍVEL 3 (COMPOSIÇÃO) E NÍVEL 4 (INSUMOS) */}
                            {isServiceOpen && (
                              <div className="p-3 sm:p-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 space-y-3">
                                {/* Bloco Nível 3: Composição CPU */}
                                <div className="p-3 rounded-lg bg-white border border-[#294C87]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-[#294C87]" />
                                    <span className="text-xs font-bold text-[#294C87] uppercase tracking-wide">
                                      NÍVEL 3: COMPOSIÇÃO DE PREÇO UNITÁRIO (CPU)
                                    </span>
                                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-[#294C87]/10 text-[#294C87]">
                                      {comp.code}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#FF6B1F]/15 text-[#FF6B1F]">
                                      {comp.version}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setInputModalState({
                                          isOpen: true,
                                          stageId: stage.id,
                                          serviceId: service.id,
                                          input: null,
                                        })
                                      }
                                      disabled={disabled}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#294C87] hover:bg-[#171A1F] text-white text-[11px] font-bold transition-colors"
                                    >
                                      <Plus className="w-3 h-3 text-[#FF6B1F]" />
                                      <span>Adicionar Insumo à CPU</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Bloco Nível 4: Tabela de Insumos da Composição */}
                                <div className="bg-white rounded-lg border border-[#171A1F]/10 overflow-hidden shadow-sm">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-[#171A1F]/5 text-[#171A1F] font-bold uppercase tracking-wider text-[10px]">
                                        <tr>
                                          <th className="py-2 px-3">Código</th>
                                          <th className="py-2 px-3">
                                            Descrição do Insumo (Nível 4)
                                          </th>
                                          <th className="py-2 px-3">Categoria</th>
                                          <th className="py-2 px-3">Unid.</th>
                                          <th className="py-2 px-3 text-right">Coeficiente</th>
                                          <th className="py-2 px-3 text-right">Custo Unit. (R$)</th>
                                          <th className="py-2 px-3 text-right">
                                            Custo Parcial (R$)
                                          </th>
                                          <th className="py-2 px-2 text-center w-16">Ações</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#171A1F]/5">
                                        {!comp.inputs || comp.inputs.length === 0 ? (
                                          <tr>
                                            <td
                                              colSpan={8}
                                              className="py-4 text-center text-[#171A1F]/50 text-xs"
                                            >
                                              Nenhum insumo associado a esta composição.
                                            </td>
                                          </tr>
                                        ) : (
                                          comp.inputs.map((inp) => {
                                            const sub =
                                              (Number(inp.coefficient) || 0) *
                                              (Number(inp.unitCost) || 0)

                                            const categoryBadges: Record<
                                              string,
                                              { label: string; class: string }
                                            > = {
                                              material: {
                                                label: 'Material',
                                                class: 'bg-blue-100 text-blue-800',
                                              },
                                              mao_de_obra: {
                                                label: 'Mão de Obra',
                                                class: 'bg-orange-100 text-orange-800',
                                              },
                                              equipamento: {
                                                label: 'Equipamento',
                                                class: 'bg-purple-100 text-purple-800',
                                              },
                                              servico_terceiro: {
                                                label: 'Terceiro',
                                                class: 'bg-emerald-100 text-emerald-800',
                                              },
                                              outros: {
                                                label: 'Outros',
                                                class: 'bg-gray-100 text-gray-800',
                                              },
                                            }

                                            const badge =
                                              categoryBadges[inp.category] ||
                                              categoryBadges.material

                                            return (
                                              <tr
                                                key={inp.id}
                                                className="hover:bg-[#171A1F]/[0.02] transition-colors"
                                              >
                                                <td className="py-2 px-3 font-mono text-[11px] text-[#294C87] font-semibold">
                                                  {inp.code}
                                                </td>
                                                <td className="py-2 px-3 font-medium text-[#171A1F] max-w-xs truncate">
                                                  {inp.description}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <span
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.class}`}
                                                  >
                                                    {badge.label}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3 font-bold text-[#171A1F]/70">
                                                  {inp.unit}
                                                </td>
                                                <td className="py-2 px-3 text-right">
                                                  <input
                                                    type="number"
                                                    step="0.0001"
                                                    min="0"
                                                    disabled={disabled}
                                                    value={inp.coefficient}
                                                    onChange={(e) =>
                                                      handleInlineInputUpdate(
                                                        stage.id,
                                                        service.id,
                                                        inp.id,
                                                        'coefficient',
                                                        parseFloat(e.target.value) || 0,
                                                      )
                                                    }
                                                    className="w-20 px-1.5 py-0.5 text-right font-mono font-bold rounded border border-[#171A1F]/15 focus:outline-none focus:border-[#294C87]"
                                                  />
                                                </td>
                                                <td className="py-2 px-3 text-right">
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    disabled={disabled}
                                                    value={inp.unitCost}
                                                    onChange={(e) =>
                                                      handleInlineInputUpdate(
                                                        stage.id,
                                                        service.id,
                                                        inp.id,
                                                        'unitCost',
                                                        parseFloat(e.target.value) || 0,
                                                      )
                                                    }
                                                    className="w-24 px-1.5 py-0.5 text-right font-mono font-bold rounded border border-[#171A1F]/15 text-[#FF6B1F] focus:outline-none focus:border-[#FF6B1F]"
                                                  />
                                                </td>
                                                <td className="py-2 px-3 text-right font-bold text-[#171A1F]">
                                                  {formatCurrencyBRL(sub)}
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                  <div className="flex items-center justify-center gap-1">
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setInputModalState({
                                                          isOpen: true,
                                                          stageId: stage.id,
                                                          serviceId: service.id,
                                                          input: inp,
                                                        })
                                                      }
                                                      disabled={disabled}
                                                      className="p-1 text-[#171A1F]/50 hover:text-[#294C87] transition-colors"
                                                      title="Editar Insumo"
                                                    >
                                                      <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleDeleteInput(
                                                          stage.id,
                                                          service.id,
                                                          inp.id,
                                                        )
                                                      }
                                                      disabled={disabled}
                                                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                                      title="Excluir Insumo"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            )
                                          })
                                        )}
                                      </tbody>
                                      <tfoot className="bg-[#F8F9FA] font-bold text-xs border-t border-[#171A1F]/10">
                                        <tr>
                                          <td
                                            colSpan={6}
                                            className="py-2 px-3 text-right text-[#171A1F]/70"
                                          >
                                            Custo Unitário da Composição ({comp.unit}):
                                          </td>
                                          <td className="py-2 px-3 text-right text-[#FF6B1F] font-extrabold">
                                            {formatCurrencyBRL(unitCost)}
                                          </td>
                                          <td></td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modais */}
      <StageEditModal
        isOpen={stageModalState.isOpen}
        onClose={() => setStageModalState({ isOpen: false, stage: null })}
        onSave={handleSaveStage}
        initialStage={stageModalState.stage}
        nextOrder={budget.stages.length + 1}
      />

      {serviceModalState.stageId && (
        <ServiceEditModal
          isOpen={serviceModalState.isOpen}
          onClose={() =>
            setServiceModalState({
              isOpen: false,
              stageId: null,
              stageCode: '01',
              service: null,
            })
          }
          onSave={(srv) => handleSaveService(srv, serviceModalState.stageId!)}
          initialService={serviceModalState.service}
          nextOrder={
            (budget.stages.find((s) => s.id === serviceModalState.stageId)?.services.length || 0) +
            1
          }
          stageCode={serviceModalState.stageCode}
        />
      )}

      {inputModalState.stageId && inputModalState.serviceId && (
        <InputEditModal
          isOpen={inputModalState.isOpen}
          onClose={() =>
            setInputModalState({
              isOpen: false,
              stageId: null,
              serviceId: null,
              input: null,
            })
          }
          onSave={(inp) =>
            handleSaveInput(inp, inputModalState.stageId!, inputModalState.serviceId!)
          }
          initialInput={inputModalState.input}
        />
      )}
    </div>
  )
}
