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
import {
  BudgetComposition,
  BudgetInput,
  BudgetService,
  BudgetStage,
  FullBudget,
} from '@/types/budgetEngine'
import {
  calculateCompositionUnitCost,
  calculateServiceDirectCost,
  calculateStageDirectCost,
  getServiceEffectiveUnitCost,
} from '@/lib/budgetEngine'
import { formatCurrencyBRL, getSourceBadgeInfo } from '@/lib/formatters'
import { logAuditEvent } from '@/lib/intelligenceStorage'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
    targetStageId?: string | null
  }>({ isOpen: false, stageId: null, stageCode: '01', service: null })

  const [inputModalState, setInputModalState] = useState<{
    isOpen: boolean
    stageId: string | null
    serviceId: string | null
    input: BudgetInput | null
  }>({ isOpen: false, stageId: null, serviceId: null, input: null })

  // Modal de Confirmação de Exclusão Amigável (Etapa, Serviço, Composição/Insumos da CPU, Insumo)
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    type: 'input' | 'composition' | 'service' | 'stage'
    stageId: string
    serviceId?: string
    inputId?: string
    title: string
    itemCode?: string
    itemName: string
    itemCategory?: string
    itemCost?: number
    isLastItem?: boolean
    emptyWarning?: string
  }>({
    isOpen: false,
    type: 'input',
    stageId: '',
    title: '',
    itemName: '',
  })

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

  const confirmDeleteStage = (stage: BudgetStage) => {
    setDeleteDialog({
      isOpen: true,
      type: 'stage',
      stageId: stage.id,
      title: 'Excluir Etapa?',
      itemCode: `Etapa ${stage.code}`,
      itemName: stage.name,
      isLastItem: budget.stages.length <= 1,
      emptyWarning:
        budget.stages.length <= 1
          ? 'Atenção: ao excluir esta etapa, o orçamento ficará sem nenhuma etapa cadastrada.'
          : undefined,
    })
  }

  const executeDeleteStage = (stageId: string) => {
    const stage = budget.stages.find((s) => s.id === stageId)
    const stageName = stage?.name || stageId
    const stageCost = stage ? calculateStageDirectCost(stage) : 0
    const servicesCount = stage?.services?.length || 0

    const newStages = budget.stages.filter((s) => s.id !== stageId)

    logAuditEvent({
      budgetId: budget.id,
      action: 'exclusao_item',
      title: `Exclusão de Etapa: ${stageName}`,
      details: `Etapa ${stage?.code || ''} "${stageName}" excluída com ${servicesCount} serviço(s). Subtotal anterior: ${formatCurrencyBRL(stageCost)}.`,
      userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      oldValue: stageCost,
      newValue: 0,
      metadata: { stageId, stageCode: stage?.code, servicesCount },
    })

    onChange({ ...budget, stages: newStages })
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
    const stage = budget.stages.find((s) => s.id === stageId)
    const exists = stage?.services.some((srv) => srv.id === savedService.id)
    const prevService = stage?.services.find((srv) => srv.id === savedService.id)
    const prevCost = prevService ? calculateServiceDirectCost(prevService) : 0
    const newCost = calculateServiceDirectCost(savedService)

    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      let updatedServices: BudgetService[]
      if (exists) {
        updatedServices = st.services.map((srv) =>
          srv.id === savedService.id ? savedService : srv,
        )
      } else {
        updatedServices = [...st.services, savedService]
        // Abre automaticamente a etapa e o novo serviço inserido
        setExpandedStages((prev) => ({ ...prev, [stageId]: true }))
        setExpandedServices((prev) => ({ ...prev, [savedService.id]: true }))
      }
      return { ...st, services: updatedServices }
    })

    // Registra evento na trilha de auditoria
    if (!exists) {
      logAuditEvent({
        budgetId: budget.id,
        action: 'adicao_item',
        title: `Novo Serviço Adicionado: ${savedService.description}`,
        details: `Serviço ${savedService.code} "${savedService.description}" inserido na etapa "${stage?.name || stageId}" com quantidade ${savedService.quantity} ${savedService.unit}. Custo unitário inicial: ${formatCurrencyBRL(calculateCompositionUnitCost(savedService.composition))}.`,
        userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
        oldValue: 0,
        newValue: newCost,
        metadata: {
          stageId,
          serviceId: savedService.id,
          serviceCode: savedService.code,
          unit: savedService.unit,
          quantity: savedService.quantity,
          inputsCount: savedService.composition.inputs?.length || 0,
        },
      })
    } else {
      logAuditEvent({
        budgetId: budget.id,
        action: 'edicao_servico',
        title: `Serviço Editado: ${savedService.description}`,
        details: `Serviço ${savedService.code} "${savedService.description}" atualizado. Custo anterior: ${formatCurrencyBRL(prevCost)}, novo custo: ${formatCurrencyBRL(newCost)}.`,
        userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
        oldValue: prevCost,
        newValue: newCost,
        metadata: {
          stageId,
          serviceId: savedService.id,
          serviceCode: savedService.code,
        },
      })
    }

    onChange({ ...budget, stages: newStages })
  }

  // Handler para adicionar serviço a partir do botão global
  const handleOpenGlobalAddService = () => {
    if (budget.stages.length === 0) {
      // Se não houver etapas, abre criação de etapa primeiro
      setStageModalState({ isOpen: true, stage: null })
      return
    }

    // Se houver etapa, usa a primeira etapa ou uma etapa aberta
    const defaultStage = budget.stages.find((st) => expandedStages[st.id]) || budget.stages[0]

    setServiceModalState({
      isOpen: true,
      stageId: defaultStage.id,
      stageCode: defaultStage.code,
      service: null,
      targetStageId: defaultStage.id,
    })
  }

  const confirmDeleteService = (stageId: string, service: BudgetService) => {
    const stage = budget.stages.find((s) => s.id === stageId)
    const isLastInStage = (stage?.services.length || 0) <= 1

    setDeleteDialog({
      isOpen: true,
      type: 'service',
      stageId,
      serviceId: service.id,
      title: 'Excluir Serviço?',
      itemCode: service.code,
      itemName: service.description,
      itemCost: calculateServiceDirectCost(service),
      isLastItem: isLastInStage,
      emptyWarning: isLastInStage
        ? `Aviso: esta etapa (${stage?.name || 'Etapa'}) ficará sem nenhum serviço cadastrado.`
        : undefined,
    })
  }

  const executeDeleteService = (stageId: string, serviceId: string) => {
    let serviceDesc = ''
    let serviceCode = ''
    let prevCost = 0
    const stage = budget.stages.find((s) => s.id === stageId)

    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      const srv = st.services.find((s) => s.id === serviceId)
      if (srv) {
        serviceDesc = srv.description
        serviceCode = srv.code
        prevCost = calculateServiceDirectCost(srv)
      }
      return {
        ...st,
        services: st.services.filter((s) => s.id !== serviceId),
      }
    })

    logAuditEvent({
      budgetId: budget.id,
      action: 'exclusao_item',
      title: `Exclusão de Serviço: ${serviceDesc}`,
      details: `Serviço ${serviceCode} "${serviceDesc}" removido da etapa "${stage?.name || stageId}". Custo anterior: ${formatCurrencyBRL(prevCost)}.`,
      userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      oldValue: prevCost,
      newValue: 0,
      metadata: { stageId, serviceId, serviceCode },
    })

    onChange({ ...budget, stages: newStages })
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
      unitPrice: service.unitPrice,
      unitPriceSource: service.unitPriceSource || 'Usuário',
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

  const confirmDeleteInput = (
    stageId: string,
    serviceId: string,
    input: BudgetInput,
    currentInputsCount: number,
  ) => {
    const isLast = currentInputsCount <= 1
    const sub = (Number(input.coefficient) || 0) * (Number(input.unitCost) || 0)

    setDeleteDialog({
      isOpen: true,
      type: 'input',
      stageId,
      serviceId,
      inputId: input.id,
      title: 'Excluir Insumo da Composição?',
      itemCode: input.code,
      itemName: input.description,
      itemCategory: input.category,
      itemCost: sub,
      isLastItem: isLast,
      emptyWarning: isLast
        ? 'Atenção: ao excluir este insumo, a composição ficará sem nenhum item na CPU (custo unitário zerado). Você poderá adicionar novos insumos quando quiser.'
        : undefined,
    })
  }

  const executeDeleteInput = (stageId: string, serviceId: string, inputId: string) => {
    let deletedInputDesc = ''
    let deletedInputCode = ''
    let deletedInputCost = 0
    let serviceDesc = ''

    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      const updatedServices = st.services.map((srv) => {
        if (srv.id !== serviceId) return srv
        serviceDesc = srv.description
        const targetInput = (srv.composition.inputs || []).find((inp) => inp.id === inputId)
        if (targetInput) {
          deletedInputDesc = targetInput.description
          deletedInputCode = targetInput.code
          deletedInputCost =
            (Number(targetInput.coefficient) || 0) * (Number(targetInput.unitCost) || 0)
        }
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

    logAuditEvent({
      budgetId: budget.id,
      action: 'exclusao_item',
      title: `Exclusão de Insumo: ${deletedInputDesc}`,
      details: `Insumo ${deletedInputCode} "${deletedInputDesc}" excluído do serviço "${serviceDesc}". Custo parcial anterior: ${formatCurrencyBRL(deletedInputCost)}. Recálculo automático executado.`,
      userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      oldValue: deletedInputCost,
      newValue: 0,
      metadata: {
        stageId,
        serviceId,
        inputId,
        inputCode: deletedInputCode,
      },
    })

    onChange({ ...budget, stages: newStages })
  }

  // Ação de exclusão / limpeza de todos os insumos da composição (Nível 3)
  const confirmClearCompositionInputs = (stageId: string, service: BudgetService) => {
    const inputsCount = service.composition.inputs?.length || 0
    const compCost = calculateCompositionUnitCost(service.composition)

    setDeleteDialog({
      isOpen: true,
      type: 'composition',
      stageId,
      serviceId: service.id,
      title: 'Limpar Insumos da Composição?',
      itemCode: service.composition.code,
      itemName: `${service.composition.description} (${inputsCount} insumos)`,
      itemCost: compCost,
      isLastItem: true,
      emptyWarning:
        'Atenção: todos os insumos que compõem este serviço serão removidos, deixando a composição vazia (R$ 0,00). O serviço permanecerá no orçamento.',
    })
  }

  const executeClearCompositionInputs = (stageId: string, serviceId: string) => {
    let serviceDesc = ''
    let compCode = ''
    let prevCompCost = 0
    let removedCount = 0

    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      const updatedServices = st.services.map((srv) => {
        if (srv.id !== serviceId) return srv
        serviceDesc = srv.description
        compCode = srv.composition.code
        prevCompCost = calculateCompositionUnitCost(srv.composition)
        removedCount = srv.composition.inputs?.length || 0
        return {
          ...srv,
          composition: {
            ...srv.composition,
            inputs: [],
          },
        }
      })
      return { ...st, services: updatedServices }
    })

    logAuditEvent({
      budgetId: budget.id,
      action: 'exclusao_item',
      title: `Limpeza de Insumos da Composição: ${compCode}`,
      details: `Removidos todos os ${removedCount} insumos da composição ${compCode} no serviço "${serviceDesc}". Custo unitário anterior: ${formatCurrencyBRL(prevCompCost)}.`,
      userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      oldValue: prevCompCost,
      newValue: 0,
      metadata: { stageId, serviceId, compCode, removedCount },
    })

    onChange({ ...budget, stages: newStages })
  }

  // Despacho central do diálogo de exclusão confirmada
  const handleConfirmDeleteDialog = () => {
    if (deleteDialog.type === 'input' && deleteDialog.serviceId && deleteDialog.inputId) {
      executeDeleteInput(deleteDialog.stageId, deleteDialog.serviceId, deleteDialog.inputId)
    } else if (deleteDialog.type === 'composition' && deleteDialog.serviceId) {
      executeClearCompositionInputs(deleteDialog.stageId, deleteDialog.serviceId)
    } else if (deleteDialog.type === 'service' && deleteDialog.serviceId) {
      executeDeleteService(deleteDialog.stageId, deleteDialog.serviceId)
    } else if (deleteDialog.type === 'stage') {
      executeDeleteStage(deleteDialog.stageId)
    }
    setDeleteDialog((prev) => ({ ...prev, isOpen: false }))
  }

  // Edição rápida de coeficiente ou custo do insumo inline com rastreamento de fonte "Usuário"
  const handleInlineInputUpdate = (
    stageId: string,
    serviceId: string,
    inputId: string,
    field: 'coefficient' | 'unitCost',
    value: number,
  ) => {
    let changedInputName = ''
    let prevVal: number | undefined
    const newVal = Math.max(0, value)

    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      const updatedServices = st.services.map((srv) => {
        if (srv.id !== serviceId) return srv
        const updatedInputs = (srv.composition.inputs || []).map((inp) => {
          if (inp.id !== inputId) return inp
          changedInputName = inp.description || inp.code
          prevVal = inp[field]
          return {
            ...inp,
            [field]: newVal,
            source: 'Usuário',
            sourceStatus: 'valido' as const,
          }
        })
        return {
          ...srv,
          composition: { ...srv.composition, inputs: updatedInputs },
        }
      })
      return { ...st, services: updatedServices }
    })

    // Registra trilha de auditoria para alteração manual de valor/coeficiente
    if (prevVal !== undefined && prevVal !== newVal) {
      logAuditEvent({
        budgetId: budget.id,
        action: 'edicao_insumo',
        title: `Edição Inline de ${field === 'unitCost' ? 'Custo Unitário' : 'Coeficiente'}: ${changedInputName}`,
        details: `Alterado ${field === 'unitCost' ? 'custo unitário' : 'coeficiente'} de ${prevVal} para ${newVal}. Fonte atualizada para "Usuário".`,
        userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397 (Usuário)',
        oldValue: prevVal,
        newValue: newVal,
        metadata: {
          stageId,
          serviceId,
          inputId,
          field,
          source: 'Usuário',
        },
      })
    }

    onChange({ ...budget, stages: newStages })
  }

  // Edição rápida de quantidade do serviço inline com auditoria
  const handleInlineServiceQtyUpdate = (stageId: string, serviceId: string, qty: number) => {
    let serviceDesc = ''
    let prevQty = 0
    const newQty = Math.max(0, qty)

    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      const updatedServices = st.services.map((srv) => {
        if (srv.id !== serviceId) return srv
        serviceDesc = srv.description
        prevQty = srv.quantity
        return { ...srv, quantity: newQty }
      })
      return { ...st, services: updatedServices }
    })

    if (prevQty !== newQty) {
      logAuditEvent({
        budgetId: budget.id,
        action: 'edicao_servico',
        title: `Ajuste de Quantidade de Serviço: ${serviceDesc}`,
        details: `Quantidade alterada de ${prevQty} para ${newQty}.`,
        userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397 (Usuário)',
        oldValue: prevQty,
        newValue: newQty,
        metadata: { stageId, serviceId },
      })
    }

    onChange({ ...budget, stages: newStages })
  }

  // Edição inline de Preço Unitário do Serviço com auditoria e recálculo imediato
  const handleInlineServiceUnitPriceUpdate = (
    stageId: string,
    serviceId: string,
    newPrice: number,
  ) => {
    let serviceDesc = ''
    let prevPrice = 0
    const clampedPrice = Math.max(0, Number(newPrice) || 0)

    const newStages = budget.stages.map((st) => {
      if (st.id !== stageId) return st
      const updatedServices = st.services.map((srv) => {
        if (srv.id !== serviceId) return srv
        serviceDesc = srv.description
        prevPrice =
          srv.unitPrice !== undefined && srv.unitPrice !== null
            ? Number(srv.unitPrice)
            : calculateCompositionUnitCost(srv.composition)
        return {
          ...srv,
          unitPrice: clampedPrice,
          unitPriceSource: 'Usuário',
        }
      })
      return { ...st, services: updatedServices }
    })

    if (prevPrice !== clampedPrice) {
      logAuditEvent({
        budgetId: budget.id,
        action: 'edicao_preco_servico',
        title: `Ajuste de Preço Unitário do Serviço: ${serviceDesc}`,
        details: `Preço unitário alterado de ${formatCurrencyBRL(prevPrice)} para ${formatCurrencyBRL(clampedPrice)} (Fonte: Usuário).`,
        userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397 (Usuário)',
        oldValue: prevPrice,
        newValue: clampedPrice,
        metadata: {
          stageId,
          serviceId,
          source: 'Usuário',
          signedBy: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
        },
      })
    }

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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenGlobalAddService}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#294C87] hover:bg-[#1f3b6c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:-translate-y-0.5 active:scale-95"
            title="Adicionar um novo serviço ao orçamento"
          >
            <Plus className="w-4 h-4 text-[#FF6B1F]" />
            <span>＋ Adicionar Serviço</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setStageModalState({
                isOpen: true,
                stage: null,
              })
            }
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#171A1F]/20 hover:bg-[#171A1F]/5 text-[#171A1F] text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Adicionar uma nova etapa de obra (Nível 1)"
          >
            <Plus className="w-4 h-4 text-[#FF6B1F]" />
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
                        className="px-2.5 py-1.5 rounded-lg bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                        title={`Adicionar novo serviço na Etapa ${stage.code}`}
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-xs">＋ Adicionar Serviço</span>
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
                        onClick={() => confirmDeleteStage(stage)}
                        disabled={disabled}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        title="Excluir Etapa (com confirmação)"
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#294C87] hover:bg-[#1f3b6c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-[#FF6B1F]" />
                          <span>＋ Adicionar Serviço Nesta Etapa</span>
                        </button>
                      </div>
                    ) : (
                      stage.services.map((service) => {
                        const isServiceOpen = !!expandedServices[service.id]
                        const comp = service.composition
                        const unitCost = getServiceEffectiveUnitCost(service)
                        const serviceTotal = calculateServiceDirectCost(service)
                        const hasCustomBdi =
                          service.customBdiPercent !== undefined &&
                          service.customBdiPercent !== null
                        const hasNoInputs = !comp.inputs || comp.inputs.length === 0
                        const isManualPrice =
                          service.unitPrice !== undefined && service.unitPrice !== null

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
                                    {hasNoInputs && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                        title="Serviço sem insumos na CPU — preço unitário digitado diretamente pelo orçamentista"
                                      >
                                        Sem composição (preço direto)
                                      </span>
                                    )}
                                    {isManualPrice && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200"
                                        title="Preço unitário fixado/editado manualmente pelo usuário"
                                      >
                                        Preço manual
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

                                  <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-[#171A1F]/60 block font-semibold">
                                        R$/{service.unit}
                                      </span>
                                      {service.unitPriceSource && (
                                        <span
                                          className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                            service.unitPriceSource === 'Usuário'
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-blue-100 text-blue-800'
                                          }`}
                                          title={`Fonte: ${service.unitPriceSource}`}
                                        >
                                          {service.unitPriceSource}
                                        </span>
                                      )}
                                    </div>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        disabled={disabled}
                                        value={
                                          service.unitPrice !== undefined &&
                                          service.unitPrice !== null
                                            ? service.unitPrice
                                            : unitCost
                                        }
                                        onChange={(e) =>
                                          handleInlineServiceUnitPriceUpdate(
                                            stage.id,
                                            service.id,
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                        title="Preço unitário do serviço editável inline (R$). Altera fonte para 'Usuário'."
                                        className={`w-24 px-1.5 py-1 text-right rounded font-mono text-xs font-bold focus:outline-none transition-all ${
                                          unitCost === 0 &&
                                          (!service.unitPrice || service.unitPrice === 0)
                                            ? 'border-2 border-[#FF6B1F] text-[#FF6B1F] bg-amber-50/50 ring-1 ring-[#FF6B1F]/30 focus:border-[#FF6B1F]'
                                            : service.unitPriceSource === 'Usuário'
                                              ? 'border-2 border-[#294C87] text-[#294C87] bg-blue-50/30 focus:border-[#171A1F]'
                                              : 'border border-[#171A1F]/20 text-[#171A1F] focus:border-[#294C87]'
                                        }`}
                                      />
                                    </div>
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
                                    onClick={() => confirmDeleteService(stage.id, service)}
                                    disabled={disabled}
                                    className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Excluir Serviço (com confirmação)"
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
                                    {comp.inputs && comp.inputs.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          confirmClearCompositionInputs(stage.id, service)
                                        }
                                        disabled={disabled}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-medium transition-colors cursor-pointer"
                                        title="Excluir todos os insumos desta composição"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                        <span>Limpar Insumos</span>
                                      </button>
                                    )}
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
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#294C87] hover:bg-[#171A1F] text-white text-[11px] font-bold transition-colors cursor-pointer"
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
                                          <th className="py-2 px-3">Fonte</th>
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
                                              colSpan={9}
                                              className="py-6 px-4 text-center text-[#171A1F]/60 text-xs bg-amber-50/50"
                                            >
                                              <div className="inline-flex flex-col items-center gap-1.5 max-w-md mx-auto">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                                                  !
                                                </div>
                                                <p className="font-semibold text-[#171A1F]">
                                                  Nenhum insumo associado a esta composição.
                                                </p>
                                                <p className="text-[11px] text-[#171A1F]/70">
                                                  Os insumos foram removidos ou ainda não foram
                                                  cadastrados. O custo unitário desta CPU é R$ 0,00.
                                                </p>
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
                                                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#294C87] text-white text-xs font-semibold hover:bg-[#171A1F] transition-colors cursor-pointer"
                                                >
                                                  <Plus className="w-3.5 h-3.5 text-[#FF6B1F]" />
                                                  <span>Adicionar Primeiro Insumo</span>
                                                </button>
                                              </div>
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
                                            const sourceInfo = getSourceBadgeInfo(
                                              inp.source,
                                              inp.sourceStatus,
                                            )
                                            const isSemFonte =
                                              sourceInfo.isPending || inp.unitCost === 0

                                            return (
                                              <tr
                                                key={inp.id}
                                                className={`transition-colors ${
                                                  isSemFonte
                                                    ? 'bg-[#FF6B1F]/10 hover:bg-[#FF6B1F]/15'
                                                    : 'hover:bg-[#171A1F]/[0.02]'
                                                }`}
                                              >
                                                <td className="py-2 px-3 font-mono text-[11px] text-[#294C87] font-semibold">
                                                  {inp.code}
                                                </td>
                                                <td
                                                  className="py-2 px-3 font-medium text-[#171A1F] max-w-xs truncate"
                                                  title={inp.description}
                                                >
                                                  {inp.description}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] whitespace-nowrap ${sourceInfo.badgeClass}`}
                                                    title={
                                                      isSemFonte
                                                        ? 'Item sem fonte oficial comprovada — preencha o custo manualmente'
                                                        : `Fonte: ${sourceInfo.label}`
                                                    }
                                                  >
                                                    <span
                                                      className={`w-1.5 h-1.5 rounded-full ${sourceInfo.dotClass}`}
                                                    />
                                                    {sourceInfo.label}
                                                  </span>
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
                                                    title="Coeficiente de consumo editável (altera fonte para 'Usuário')"
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
                                                    title="Custo unitário em R$ editável (altera fonte para 'Usuário')"
                                                    className={`w-24 px-1.5 py-0.5 text-right font-mono font-bold rounded focus:outline-none ${
                                                      isSemFonte
                                                        ? 'border-2 border-[#FF6B1F] text-[#FF6B1F] bg-white ring-1 ring-[#FF6B1F]/30'
                                                        : 'border border-[#171A1F]/15 text-[#FF6B1F] focus:border-[#FF6B1F]'
                                                    }`}
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
                                                      className="p-1 rounded text-[#171A1F]/50 hover:text-[#294C87] hover:bg-[#294C87]/10 transition-colors cursor-pointer sm:opacity-70 group-hover:opacity-100"
                                                      title="Editar Insumo"
                                                    >
                                                      <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        confirmDeleteInput(
                                                          stage.id,
                                                          service.id,
                                                          inp,
                                                          comp.inputs?.length || 0,
                                                        )
                                                      }
                                                      disabled={disabled}
                                                      className="p-1 rounded text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer sm:opacity-80 hover:opacity-100"
                                                      title="Excluir este insumo (material/mão de obra)"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
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
                                            colSpan={7}
                                            className="py-2 px-3 text-right text-[#171A1F]/70"
                                          >
                                            Custo Unitário da Composição ({comp.unit}):
                                          </td>
                                          <td className="py-2 px-3 text-right text-[#FF6B1F] font-extrabold">
                                            {formatCurrencyBRL(calculateCompositionUnitCost(comp))}
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
          stages={budget.stages}
          currentStageId={serviceModalState.stageId}
          onClose={() =>
            setServiceModalState({
              isOpen: false,
              stageId: null,
              stageCode: '01',
              service: null,
            })
          }
          onSave={(srv, selectedStageId) =>
            handleSaveService(srv, selectedStageId || serviceModalState.stageId!)
          }
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

      {/* Diálogo Amigável de Confirmação de Exclusão (Paleta Mirage #171A1F, Cobalt #294C87, Pumpkin #FF6B1F) */}
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => !open && setDeleteDialog((prev) => ({ ...prev, isOpen: false }))}
      >
        <AlertDialogContent className="max-w-md bg-white border border-[#171A1F]/15 rounded-2xl shadow-2xl p-6">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base sm:text-lg font-bold text-[#171A1F]">
                  {deleteDialog.title}
                </AlertDialogTitle>
                <p className="text-xs text-[#171A1F]/60">
                  Esta ação não pode ser desfeita e recalculará o orçamento imediatamente.
                </p>
              </div>
            </div>

            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-xs text-[#171A1F]/80">
                {/* Cartão de Detalhes do Item a ser Removido */}
                <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5 font-sans">
                  {deleteDialog.itemCode && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#171A1F]/60 uppercase font-semibold">Código:</span>
                      <span className="font-mono font-bold text-[#294C87]">
                        {deleteDialog.itemCode}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[#171A1F]/60 uppercase font-semibold shrink-0 text-[11px]">
                      Item:
                    </span>
                    <span className="font-bold text-[#171A1F] text-right text-xs">
                      {deleteDialog.itemName}
                    </span>
                  </div>
                  {deleteDialog.itemCategory && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#171A1F]/60 uppercase font-semibold">Categoria:</span>
                      <span className="font-medium text-[#171A1F]">
                        {deleteDialog.itemCategory === 'material'
                          ? 'Material'
                          : deleteDialog.itemCategory === 'mao_de_obra'
                            ? 'Mão de Obra'
                            : deleteDialog.itemCategory === 'equipamento'
                              ? 'Equipamento'
                              : deleteDialog.itemCategory === 'servico_terceiro'
                                ? 'Serviço de Terceiro'
                                : deleteDialog.itemCategory}
                      </span>
                    </div>
                  )}
                  {deleteDialog.itemCost !== undefined && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#171A1F]/10">
                      <span className="text-[#171A1F]/60 uppercase font-semibold">
                        Subtotal/Impacto:
                      </span>
                      <span className="font-bold text-[#FF6B1F]">
                        {formatCurrencyBRL(deleteDialog.itemCost)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Alerta de Segurança se Deixar Vazio */}
                {deleteDialog.emptyWarning && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">{deleteDialog.emptyWarning}</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-5 flex items-center justify-end gap-2 sm:gap-2">
            <AlertDialogCancel className="px-4 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteDialog}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
