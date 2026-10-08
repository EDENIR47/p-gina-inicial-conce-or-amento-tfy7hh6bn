/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Tela Principal de Orçamentos: Lista Geral + Editor Completo do Núcleo Funcional
 */

import React, { useState, useEffect } from 'react'
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeft,
  Edit2,
  Trash2,
  Copy,
  Landmark,
  Building,
  DollarSign,
  Download,
  AlertTriangle,
  RotateCcw,
  Award,
  Sparkles,
  History,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { AiBudgetModal } from '@/components/budget/AiBudgetModal'
import { FullBudget } from '@/types/budgetEngine'
import {
  getStoredFullBudgets,
  saveFullBudgets,
  saveSingleBudget,
  createCanonicalDemoBudget,
  purgeTestBudgetsFromStorage,
} from '@/lib/budgetsStorage'
import { purgeTestIntelligenceData } from '@/lib/intelligenceStorage'
import { calculateFullBudget, calculateTcuBdi } from '@/lib/budgetEngine'
import { formatCurrencyBRL, formatBudgetDeadline } from '@/lib/formatters'
import { BudgetHeaderForm } from '@/components/budget/BudgetHeaderForm'
import { BudgetHierarchyTree } from '@/components/budget/BudgetHierarchyTree'
import { SocialChargesSelector } from '@/components/budget/SocialChargesSelector'
import { BdiEditor } from '@/components/budget/BdiEditor'
import { BudgetTotalsBar } from '@/components/budget/BudgetTotalsBar'
import { PdfExportModal, PdfExportMode } from '@/components/budget/PdfExportModal'
import { MemorialDescritivoModal } from '@/components/budget/MemorialDescritivoModal'
import { RevisionsModal } from '@/components/budget/RevisionsModal'
import { AuditTrailModal } from '@/components/budget/AuditTrailModal'
import { StorageCleanModal } from '@/components/budget/StorageCleanModal'
import { AbcCurveScreen } from '@/pages/AbcCurveScreen'
import { exportBudgetSpreadsheet } from '@/lib/exportSpreadsheet'
import { logAuditEvent, ensureInitialRevision } from '@/lib/intelligenceStorage'
import {
  QuickEditBudgetModal,
  DeleteBudgetConfirmModal,
} from '@/components/budget/ManageBudgetModals'

export const BudgetsScreen: React.FC = () => {
  const location = useLocation()
  // Limpeza de dados de teste na inicialização
  useEffect(() => {
    purgeTestBudgetsFromStorage()
    purgeTestIntelligenceData()
  }, [])

  // Listener para atualização automática caso uma composição da biblioteca seja editada
  useEffect(() => {
    const handleBudgetsUpdated = () => {
      const stored = getStoredFullBudgets()
      setBudgetsList(stored)
      setActiveBudget((prev) => {
        if (!prev) return prev
        const updated = stored.find((b) => b.id === prev.id)
        return updated || prev
      })
    }

    window.addEventListener('conce_budget_updated', handleBudgetsUpdated)
    return () => {
      window.removeEventListener('conce_budget_updated', handleBudgetsUpdated)
    }
  }, [])

  // Lista de todos os orçamentos persistidos
  const [budgetsList, setBudgetsList] = useState<FullBudget[]>(() => getStoredFullBudgets())

  // Orçamento atualmente em edição (por padrão abre o primeiro orçamento se existir)
  const [activeBudget, setActiveBudget] = useState<FullBudget | null>(() => {
    const stored = getStoredFullBudgets()
    return stored.length > 0 ? stored[0] : null
  })
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  // Ao navegar com state.openBudgetId, abre imediatamente o selecionado
  useEffect(() => {
    const targetId = (location.state as any)?.openBudgetId
    if (targetId) {
      const all = getStoredFullBudgets()
      const found = all.find((b) => b.id === targetId)
      if (found) {
        setBudgetsList(all)
        setActiveBudget(found)
        setEditorTab('arvore')
      }
    }
  }, [location.state])

  // Aba ativa dentro do editor do orçamento: 'geral' | 'arvore' | 'encargos' | 'bdi' | 'abc'
  const [editorTab, setEditorTab] = useState<'geral' | 'arvore' | 'encargos' | 'bdi' | 'abc'>(
    'arvore',
  )

  // Filtros de listagem
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Modais de Inteligência e Exportação
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfInitialMode, setPdfInitialMode] = useState<PdfExportMode>('valor_final')
  const [isMemorialModalOpen, setIsMemorialModalOpen] = useState(false)
  const [isRevisionsModalOpen, setIsRevisionsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false)

  // Modo de exibição na tela de orçamentos: 'cards' ou 'gerenciar'
  const [viewMode, setViewMode] = useState<'cards' | 'gerenciar'>('cards')

  // Modais de Edição Rápida e Exclusão Segura
  const [editingBudgetModal, setEditingBudgetModal] = useState<FullBudget | null>(null)
  const [deletingBudgetModal, setDeletingBudgetModal] = useState<FullBudget | null>(null)

  // Feedback e Validações
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Criação de novo orçamento em branco (sem herdar itens de demonstração)
  const handleCreateNewBudget = () => {
    const newId = `budget-${Date.now()}`
    const codeNum = budgetsList.length + 1
    const todayStr = new Date().toISOString().split('T')[0]

    const newBudget: FullBudget = {
      id: newId,
      code: `ORC-2025-${String(codeNum).padStart(3, '0')}`,
      title: 'Novo Orçamento de Engenharia',
      status: 'em_andamento',
      createdAt: todayStr,
      updatedAt: new Date().toISOString(),
      author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      paymentTerms:
        '30% de entrada; 30% na entrega dos projetos base; 20% após montagem das estruturas metálicas; saldo após vistoria de entrega.',
      validityDays: 5,
      validityDaysType: 'uteis',
      executionDeadline:
        'PRAZO DE EXECUÇÃO: PROJETOS 15 DIAS UTEIS APOS ACEITE DA PROPOSTA E ASSINATURA DO CONTRATO, E DA EXECUÇÃO É UM ITEM DO ESCOPO DE GESTÃO POIS ESSE PRAZO DEPENDE DA CONTRATAÇÃO DA EMPREZA PARA PRODUZIR E MONTAR A ESTRUTURA METÁLICA',
      technicalResponsibilityText:
        '• Emissão de Anotação de Responsabilidade Técnica (ART) junto ao CREA/RS sob responsabilidade do RT Eng. Edenir Souza da Rosa (CREA/RS-252397). Garantia técnica quinquenal conforme preconiza o Artigo 618 do Código Civil Brasileiro.',
      technicalObligationsText:
        '• Emissão obrigatória da Anotação de Responsabilidade Técnica (ART) vinculada ao CREA/RS sob responsabilidade do RT Eng. Edenir Souza da Rosa - CREA/RS-252397.\n• Garantia legal de 5 (cinco) anos para estabilidade e solidez da obra, conforme previsto no Artigo 618 do Código Civil Brasileiro.\n• Atendimento irrestrito às normas técnicas da ABNT e NRs de Segurança e Saúde no Trabalho da Construção Civil.',
      commercialNotes:
        'Preços com impostos inclusos (Simples Nacional). Emissão de ART vinculada ao CREA/RS-252397.',
      client: {
        name: '',
        document: '',
        email: '',
        phone: '',
        address: '',
        city: 'Porto Alegre',
        state: 'RS',
      },
      work: {
        name: '',
        address: '',
        city: 'Porto Alegre',
        state: 'RS',
        description: 'Construção civil conforme projetos e especificações técnicas.',
        deadlineMonths: 6,
        startDate: todayStr,
      },
      chargesConfig: {
        uf: 'RS',
        isRelieved: false,
        taxRegime: 'simples_nacional',
        simplesCollectionOption: 'cpp_inclusa_das',
        simplesDasRate: 11.0,
        customGroupA: 0.0,
        customGroupB: 0.0,
        customGroupC: 0.0,
        customGroupD: 0.0,
        isExplicitZero: true,
      },
      bdiConfig: {
        administrationCentral: 4.5,
        risk: 1.25,
        insuranceAndGuarantee: 0.85,
        financialExpenses: 1.15,
        profit: 7.8,
        taxes: {
          iss: 4.0,
          pis: 0.65,
          cofins: 3.0,
          inssOrCprb: 0.0,
          totalTaxes: 11.0,
          simplesDas: 11.0,
        },
        calculatedBdi: calculateTcuBdi({
          administrationCentral: 4.5,
          risk: 1.25,
          insuranceAndGuarantee: 0.85,
          financialExpenses: 1.15,
          profit: 7.8,
          taxesTotal: 11.0,
        }).bdiPercent,
      },
      publicWork: {
        enabled: false,
        tenderNumber: '',
        contractNumber: '',
        agency: '',
        modality: 'Concorrência',
        sinapiReferenceMonth: '04/2025',
        sicroReferenceMonth: '03/2025',
        hasDisallowanceClause: false,
      },
      stages: [],
    }

    setActiveBudget(newBudget)
    setEditorTab('geral')
    setValidationErrors({})
  }

  // Duplicar orçamento existente (desacopla estritamente os IDs de etapas, serviços e insumos)
  const handleDuplicateBudget = (b: FullBudget) => {
    const newBudgetId = `budget-${Date.now()}`
    const duplicatedStages = (b.stages || []).map((stage, stIdx) => {
      const newStageId = `stage-${Date.now()}-${stIdx}`
      const duplicatedServices = (stage.services || []).map((srv, srvIdx) => {
        const newSrvId = `serv-${Date.now()}-${stIdx}-${srvIdx}`
        const newCompId = `comp-${Date.now()}-${stIdx}-${srvIdx}-${Math.random().toString(36).substring(2, 6)}`
        const duplicatedInputs = (srv.composition?.inputs || []).map((inp, inpIdx) => ({
          ...inp,
          id: `inp-${Date.now()}-${stIdx}-${srvIdx}-${inpIdx}-${Math.random().toString(36).substring(2, 6)}`,
        }))

        return {
          ...srv,
          id: newSrvId,
          composition: {
            ...srv.composition,
            id: newCompId,
            inputs: duplicatedInputs,
          },
        }
      })

      return {
        ...stage,
        id: newStageId,
        services: duplicatedServices,
      }
    })

    const duplicated: FullBudget = {
      ...JSON.parse(JSON.stringify(b)),
      id: newBudgetId,
      code: `${b.code}-COP`,
      title: b.title ? `${b.title} (Cópia)` : `${b.work.name} (Cópia)`,
      status: 'em_andamento',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
      stages: duplicatedStages,
      work: {
        ...b.work,
        name: `${b.work.name} (Cópia)`,
      },
      paymentTerms:
        b.paymentTerms ||
        'Medições quinzenais com base no avanço físico comprovado em diário de obra; pagamento em até 10 dias.',
      validityDays: b.validityDays || 30,
    }
    const updated = [duplicated, ...budgetsList]
    setBudgetsList(updated)
    saveFullBudgets(updated)
    showToast(`Orçamento ${b.code} duplicado com sucesso!`)
  }

  // Excluir orçamento com modal seguro
  const handleDeleteBudget = (id: string, code: string) => {
    const found = budgetsList.find((b) => b.id === id)
    if (found) {
      setDeletingBudgetModal(found)
    }
  }

  const handleConfirmDelete = () => {
    if (!deletingBudgetModal) return
    const code = deletingBudgetModal.code
    const updated = budgetsList.filter((b) => b.id !== deletingBudgetModal.id)
    setBudgetsList(updated)
    saveFullBudgets(updated)
    setDeletingBudgetModal(null)
    showToast(`Orçamento ${code} excluído com sucesso!`)
  }

  const handleSaveQuickEdit = (updatedBudget: FullBudget) => {
    saveSingleBudget(updatedBudget)
    const all = getStoredFullBudgets()
    setBudgetsList(all)
    if (activeBudget && activeBudget.id === updatedBudget.id) {
      setActiveBudget(updatedBudget)
    }
    setEditingBudgetModal(null)
    showToast(`Orçamento ${updatedBudget.code} atualizado!`)
  }

  // Validação dos dados do formulário
  const validateBudget = (budget: FullBudget): boolean => {
    const errors: Record<string, string> = {}

    if (!budget.client.name.trim()) {
      errors['client.name'] = 'Nome do cliente é obrigatório'
    }
    // Observação do usuário: "ANDREIA DE OLIVEIRA DA COSTA E JADER DA COSTA PARA A PROPOSTA SOMENTE ESTES DADOS."
    // CPF/CNPJ, telefone e e-mail são opcionais para não bloquear propostas preliminares quando o cliente não tiver informado
    if (!budget.work.name.trim()) {
      errors['work.name'] = 'Nome da obra é obrigatório'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Atualizar orçamento ativo e limpar erros corrigidos
  const handleUpdateActiveBudget = (updated: FullBudget) => {
    setActiveBudget(updated)
    if (validationErrors['work.name'] && updated.work.name.trim()) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next['work.name']
        return next
      })
    }
    if (validationErrors['client.name'] && updated.client.name.trim()) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next['client.name']
        return next
      })
    }
  }

  // Salvar orçamento ativo
  const handleSaveActiveBudget = () => {
    if (!activeBudget) return

    const isValid = validateBudget(activeBudget)
    if (!isValid) {
      showToast('Por favor, preencha os campos obrigatórios em Dados da Obra.')
      setEditorTab('geral')
      return
    }

    // Identifica alterações específicas para trilha de auditoria
    const previousBudget = budgetsList.find((b) => b.id === activeBudget.id)
    if (previousBudget) {
      // 1. Alteração de título
      if (
        (previousBudget.title || previousBudget.work.name) !==
        (activeBudget.title || activeBudget.work.name)
      ) {
        logAuditEvent({
          budgetId: activeBudget.id,
          action: 'edicao_titulo',
          title: 'Título do Orçamento Atualizado',
          details: `Título alterado para "${activeBudget.title || activeBudget.work.name}".`,
          oldValue: previousBudget.title || previousBudget.work.name,
          newValue: activeBudget.title || activeBudget.work.name,
          userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
        })
      }

      // 2. Alteração de dados do cliente
      if (
        previousBudget.client.name !== activeBudget.client.name ||
        previousBudget.client.document !== activeBudget.client.document ||
        previousBudget.client.address !== activeBudget.client.address
      ) {
        logAuditEvent({
          budgetId: activeBudget.id,
          action: 'edicao_cliente',
          title: 'Dados do Cliente Atualizados',
          details: `Cliente: ${activeBudget.client.name} | Doc: ${activeBudget.client.document} | Endereço: ${activeBudget.client.address || 'Não informado'}`,
          userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
        })
      }

      // 3. Alteração de endereço da obra
      if (
        previousBudget.work.address !== activeBudget.work.address ||
        previousBudget.work.city !== activeBudget.work.city ||
        previousBudget.work.state !== activeBudget.work.state
      ) {
        logAuditEvent({
          budgetId: activeBudget.id,
          action: 'edicao_obra',
          title: 'Local / Endereço da Obra Atualizado',
          details: `Endereço: ${activeBudget.work.address || 'Não informado'} - ${activeBudget.work.city}/${activeBudget.work.state}`,
          userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
        })
      }

      // 4. Alteração de prazo contratual
      const prevDeadline = formatBudgetDeadline(previousBudget.work)
      const currDeadline = formatBudgetDeadline(activeBudget.work)
      if (
        previousBudget.work.deadlineValue !== activeBudget.work.deadlineValue ||
        previousBudget.work.deadlineUnit !== activeBudget.work.deadlineUnit ||
        previousBudget.work.deadlineMonths !== activeBudget.work.deadlineMonths
      ) {
        logAuditEvent({
          budgetId: activeBudget.id,
          action: 'edicao_prazo',
          title: 'Prazo Contratual Atualizado',
          details: `Prazo alterado de "${prevDeadline}" para "${currDeadline}".`,
          oldValue: prevDeadline,
          newValue: currDeadline,
          userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
          metadata: {
            previous: {
              value: previousBudget.work.deadlineValue,
              unit: previousBudget.work.deadlineUnit,
              months: previousBudget.work.deadlineMonths,
            },
            current: {
              value: activeBudget.work.deadlineValue,
              unit: activeBudget.work.deadlineUnit,
              months: activeBudget.work.deadlineMonths,
            },
            signedBy: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
          },
        })
      }

      // 5. Alteração de forma de pagamento
      if (previousBudget.paymentTerms !== activeBudget.paymentTerms) {
        logAuditEvent({
          budgetId: activeBudget.id,
          action: 'edicao_pagamento',
          title: 'Condições de Pagamento Atualizadas',
          details: `Forma de pagamento: ${activeBudget.paymentTerms || 'Não especificada'}`,
          oldValue: previousBudget.paymentTerms,
          newValue: activeBudget.paymentTerms,
          userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
        })
      }

      // 5.1 Alteração de Garantia e Responsabilidade Técnica
      const prevResp =
        previousBudget.technicalResponsibilityText ??
        previousBudget.work?.technicalResponsibilityText
      const currResp =
        activeBudget.technicalResponsibilityText ?? activeBudget.work?.technicalResponsibilityText
      if (prevResp !== currResp) {
        logAuditEvent({
          budgetId: activeBudget.id,
          action: 'edicao_garantia',
          title: 'Garantia e Responsabilidade Técnica Atualizada',
          details: 'Texto de garantia e responsabilidade técnica editado no orçamento.',
          oldValue: prevResp || 'Padrão CONCE (ART CREA/RS + Art. 618 Código Civil)',
          newValue: currResp || 'Padrão CONCE (ART CREA/RS + Art. 618 Código Civil)',
          userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
          metadata: {
            field: 'technicalResponsibilityText',
            signedBy: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
          },
        })
      }

      // 5.2 Alteração de Garantia e Obrigações Técnicas
      const prevOblig =
        previousBudget.technicalObligationsText ?? previousBudget.work?.technicalObligationsText
      const currOblig =
        activeBudget.technicalObligationsText ?? activeBudget.work?.technicalObligationsText
      if (prevOblig !== currOblig) {
        logAuditEvent({
          budgetId: activeBudget.id,
          action: 'edicao_garantia',
          title: 'Garantia e Obrigações Técnicas Atualizada',
          details: 'Texto de garantia e obrigações técnicas editado no orçamento.',
          oldValue: prevOblig || 'Padrão CONCE (ART CREA/RS + Art. 618 Código Civil + ABNT/NRs)',
          newValue: currOblig || 'Padrão CONCE (ART CREA/RS + Art. 618 Código Civil + ABNT/NRs)',
          userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
          metadata: {
            field: 'technicalObligationsText',
            signedBy: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
          },
        })
      }

      // 5. Alteração de regime tributário
      const prevReg =
        previousBudget.chargesConfig?.taxRegime ||
        (previousBudget.chargesConfig?.isRelieved ? 'com_desoneracao' : 'sem_desoneracao')
      const currReg =
        activeBudget.chargesConfig?.taxRegime ||
        (activeBudget.chargesConfig?.isRelieved ? 'com_desoneracao' : 'sem_desoneracao')
      if (prevReg !== currReg) {
        const regimeLabels: Record<string, string> = {
          simples_nacional: 'Simples Nacional',
          sem_desoneracao: 'Sem Desoneração',
          com_desoneracao: 'Com Desoneração',
        }
        logAuditEvent({
          budgetId: activeBudget.id,
          action: 'edicao_regime_tributario',
          title: 'Regime Tributário Alterado',
          details: `Regime alterado de "${regimeLabels[prevReg] || prevReg}" para "${regimeLabels[currReg] || currReg}". Base de encargos: ${currReg === 'com_desoneracao' ? 'Com Desoneração (CPRB)' : 'Sem Desoneração (CLT)'}.`,
          oldValue: prevReg,
          newValue: currReg,
          userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
        })
      }

      // 5.3 Alteração de Observações do Orçamento
      const prevObs = previousBudget.observations ?? ''
      const currObs = activeBudget.observations ?? ''
      if (prevObs !== currObs) {
        logAuditEvent({
          budgetId: activeBudget.id,
          action: 'edicao_observacoes',
          title: 'Observações do Orçamento Atualizadas',
          details: `Observações atualizadas: "${currObs.slice(0, 80)}${currObs.length > 80 ? '...' : ''}"`,
          oldValue: prevObs,
          newValue: currObs,
          userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
          metadata: {
            field: 'observations',
            signedBy: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
          },
        })
      }
    }

    setIsSaving(true)
    saveSingleBudget(activeBudget)

    // Atualiza a lista na memória
    const currentBudgets = getStoredFullBudgets()
    setBudgetsList(currentBudgets)

    // Registra auditoria
    logAuditEvent({
      budgetId: activeBudget.id,
      action: 'edicao_geral',
      title: 'Alterações Salvas no Orçamento',
      details: `Orçamento ${activeBudget.code} atualizado por ${activeBudget.author || 'Eng. Edenir Souza da Rosa - CREA/RS-252397'}. Valor: ${formatCurrencyBRL(activeSummary?.finalSalePrice || 0)}`,
      userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
    })

    setTimeout(() => {
      setIsSaving(false)
      showToast(`Orçamento ${activeBudget.code} salvo com sucesso!`)
    }, 400)
  }

  // Cálculo em tempo real do orçamento ativo
  const activeSummary = activeBudget ? calculateFullBudget(activeBudget) : null

  // Filtragem da lista geral
  const filteredBudgets = budgetsList.filter((b) => {
    const matchesSearch =
      b.work.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'todos' || b.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Toast flutuante */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-fade-in-down flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171A1F] text-white shadow-xl border border-white/20 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-[#FF6B1F]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CASO 1: MODO EDITOR DO NÚCLEO FUNCIONAL DE ORÇAMENTO */}
      {activeBudget && activeSummary ? (
        <div className="space-y-6">
          {/* Header Superior do Editor com botão de Voltar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#171A1F]/10 pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveBudget(null)
                  setValidationErrors({})
                }}
                className="p-2 rounded-xl border border-[#171A1F]/20 hover:bg-[#171A1F]/5 text-[#171A1F] transition-colors"
                title="Voltar à Relação de Orçamentos"
              >
                <ArrowLeft className="w-5 h-5 text-[#294C87]" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded bg-[#294C87] text-white">
                    {activeBudget.code}
                  </span>
                  {activeBudget.publicWork?.enabled && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F] flex items-center gap-1">
                      <Landmark className="w-3 h-3" /> Modo Obras Públicas
                    </span>
                  )}
                  <span className="text-[11px] text-[#171A1F]/50">
                    Cliente:{' '}
                    <strong className="text-[#171A1F]">
                      {activeBudget.client?.name || 'A definir'}
                    </strong>
                  </span>

                  {/* Botão de Memorial Descritivo no topo */}
                  <button
                    type="button"
                    onClick={() => setIsMemorialModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#294C87]/10 hover:bg-[#294C87] text-[#294C87] hover:text-white border border-[#294C87]/30 text-[11px] font-bold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#294C87] cursor-pointer"
                    title="Gerar Memorial Descritivo Técnico Automático da Obra"
                    aria-label="Abrir memorial descritivo automático da obra"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#FF6B1F] shrink-0" aria-hidden="true" />
                    <span>Memorial Descritivo</span>
                  </button>

                  {/* Acesso rápido ao Restaurador de Revisões no topo do orçamento */}
                  <button
                    type="button"
                    onClick={() => {
                      ensureInitialRevision(activeBudget)
                      setIsRevisionsModalOpen(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF6B1F]/10 hover:bg-[#FF6B1F] text-[#FF6B1F] hover:text-white border border-[#FF6B1F]/30 text-[11px] font-bold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B1F] cursor-pointer"
                    title="Restaurar versões anteriores ou criar novo marco de revisão"
                    aria-label="Abrir restaurador de revisões do orçamento"
                  >
                    <History className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Revisões</span>
                  </button>
                </div>

                {/* Edição inline do título do orçamento */}
                <div className="mt-1 flex items-center gap-2 group">
                  <input
                    type="text"
                    value={activeBudget.title ?? activeBudget.work.name ?? ''}
                    onChange={(e) => {
                      const newTitle = e.target.value
                      handleUpdateActiveBudget({
                        ...activeBudget,
                        title: newTitle,
                      })
                    }}
                    placeholder="Título do Orçamento / Proposta"
                    className="text-lg sm:text-2xl font-extrabold text-[#171A1F] bg-transparent border-b border-transparent hover:border-[#294C87]/40 focus:border-[#294C87] focus:bg-white px-1 py-0.5 rounded-sm transition-all outline-none w-full max-w-2xl"
                    title="Clique para editar o título deste orçamento diretamente"
                  />
                  <Edit2 className="w-4 h-4 text-[#294C87]/40 group-hover:text-[#294C87] shrink-0" />
                </div>
              </div>
            </div>

            {/* Abas de Navegação do Editor */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#171A1F]/5 border border-[#171A1F]/10">
              <button
                type="button"
                onClick={() => setEditorTab('arvore')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  editorTab === 'arvore'
                    ? 'bg-[#294C87] text-white shadow-sm'
                    : 'text-[#171A1F]/70 hover:text-[#171A1F] hover:bg-white/60'
                }`}
              >
                <Layers className="w-4 h-4 text-[#FF6B1F]" />
                <span>Árvore de 4 Níveis</span>
              </button>

              <button
                type="button"
                onClick={() => setEditorTab('geral')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  editorTab === 'geral'
                    ? 'bg-[#294C87] text-white shadow-sm'
                    : 'text-[#171A1F]/70 hover:text-[#171A1F] hover:bg-white/60'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Cliente & Obra</span>
                {Object.keys(validationErrors).length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setEditorTab('encargos')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  editorTab === 'encargos'
                    ? 'bg-[#294C87] text-white shadow-sm'
                    : 'text-[#171A1F]/70 hover:text-[#171A1F] hover:bg-white/60'
                }`}
              >
                <span className="font-mono text-xs font-extrabold text-[#FF6B1F]">
                  {activeBudget.chargesConfig?.uf || 'SP'}
                </span>
                <span>Encargos por UF</span>
              </button>

              <button
                type="button"
                onClick={() => setEditorTab('bdi')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  editorTab === 'bdi'
                    ? 'bg-[#294C87] text-white shadow-sm'
                    : 'text-[#171A1F]/70 hover:text-[#171A1F] hover:bg-white/60'
                }`}
              >
                <span>BDI TCU ({activeSummary.bdiRate.toFixed(1)}%)</span>
              </button>

              <button
                type="button"
                onClick={() => setEditorTab('abc')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  editorTab === 'abc'
                    ? 'bg-[#FF6B1F] text-white shadow-sm'
                    : 'text-[#171A1F]/70 hover:text-[#171A1F] hover:bg-white/60'
                }`}
              >
                <Award className="w-4 h-4 text-white" />
                <span>Curva ABC (Pareto)</span>
              </button>
            </div>
          </div>

          {/* BARRA DE TOTAIS FIXA NO TOPO DO CONTEÚDO */}
          <BudgetTotalsBar
            summary={activeSummary}
            budget={activeBudget}
            onSave={handleSaveActiveBudget}
            onOpenPdfModal={() => {
              setPdfInitialMode('valor_final')
              setIsPdfModalOpen(true)
            }}
            onOpenExcelExport={() => exportBudgetSpreadsheet(activeBudget, 'completo')}
            onOpenMemorialModal={() => setIsMemorialModalOpen(true)}
            onOpenRevisionsModal={() => {
              ensureInitialRevision(activeBudget)
              setIsRevisionsModalOpen(true)
            }}
            onOpenAuditModal={() => setIsAuditModalOpen(true)}
            isSaving={isSaving}
            validationErrors={validationErrors}
          />

          {/* CONTEÚDO DA ABA SELECIONADA */}
          {editorTab === 'arvore' && (
            <div className="space-y-4 animate-fade-in">
              <BudgetHierarchyTree budget={activeBudget} onChange={handleUpdateActiveBudget} />
            </div>
          )}

          {editorTab === 'geral' && (
            <div className="space-y-4 animate-fade-in">
              <BudgetHeaderForm
                budget={activeBudget}
                onChange={handleUpdateActiveBudget}
                onSaveObservations={(newObs) => {
                  const updated: FullBudget = {
                    ...activeBudget,
                    observations: newObs,
                  }
                  setActiveBudget(updated)
                  saveSingleBudget(updated)
                  setBudgetsList(getStoredFullBudgets())
                  logAuditEvent({
                    budgetId: activeBudget.id,
                    action: 'edicao_observacoes',
                    title: 'Observações do Orçamento Atualizadas',
                    details: `Observações salvas no orçamento: "${newObs.slice(0, 80)}${newObs.length > 80 ? '...' : ''}"`,
                    oldValue: activeBudget.observations ?? '',
                    newValue: newObs,
                    userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                    metadata: {
                      field: 'observations',
                      signedBy: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                    },
                  })
                  showToast('Observações salvas com sucesso!')
                }}
                validationErrors={validationErrors}
              />
            </div>
          )}

          {editorTab === 'encargos' && (
            <div className="space-y-4 animate-fade-in">
              <SocialChargesSelector
                uf={activeBudget.chargesConfig?.uf || 'SP'}
                isRelieved={activeBudget.chargesConfig?.isRelieved || false}
                taxRegime={activeBudget.chargesConfig?.taxRegime}
                simplesCollectionOption={
                  activeBudget.chargesConfig?.simplesCollectionOption || 'cpp_inclusa_das'
                }
                simplesDasRate={activeBudget.chargesConfig?.simplesDasRate}
                customGroupA={activeBudget.chargesConfig?.customGroupA}
                customGroupB={activeBudget.chargesConfig?.customGroupB}
                customGroupC={activeBudget.chargesConfig?.customGroupC}
                customGroupD={activeBudget.chargesConfig?.customGroupD}
                isExplicitZero={activeBudget.chargesConfig?.isExplicitZero}
                onUfChange={(newUf) => {
                  const oldUf = activeBudget.chargesConfig?.uf
                  handleUpdateActiveBudget({
                    ...activeBudget,
                    chargesConfig: {
                      ...activeBudget.chargesConfig,
                      uf: newUf,
                    },
                  })
                  if (oldUf !== newUf) {
                    logAuditEvent({
                      budgetId: activeBudget.id,
                      action: 'edicao_encargos',
                      title: 'UF de Encargos Alterada',
                      details: `UF de encargos alterada de ${oldUf || 'SP'} para ${newUf}.`,
                    })
                  }
                }}
                onRelievedChange={(newRelieved) =>
                  handleUpdateActiveBudget({
                    ...activeBudget,
                    chargesConfig: {
                      ...activeBudget.chargesConfig,
                      isRelieved: newRelieved,
                      taxRegime: newRelieved ? 'com_desoneracao' : 'sem_desoneracao',
                    },
                  })
                }
                onTaxRegimeChange={(newRegime, dasRate) => {
                  const oldRegime =
                    activeBudget.chargesConfig?.taxRegime ||
                    (activeBudget.chargesConfig?.isRelieved ? 'com_desoneracao' : 'sem_desoneracao')
                  const isRel = newRegime === 'com_desoneracao'
                  const activeDas =
                    dasRate !== undefined
                      ? dasRate
                      : (activeBudget.chargesConfig?.simplesDasRate ?? 0)

                  const newTaxesTotal =
                    newRegime === 'simples_nacional'
                      ? activeDas
                      : (activeBudget.bdiConfig.taxes.iss || 0) +
                        (activeBudget.bdiConfig.taxes.pis || 0) +
                        (activeBudget.bdiConfig.taxes.cofins || 0) +
                        (newRegime === 'com_desoneracao' ? 4.5 : 0.0)

                  const recalculatedBdi = calculateTcuBdi({
                    administrationCentral: activeBudget.bdiConfig.administrationCentral,
                    risk: activeBudget.bdiConfig.risk,
                    insuranceAndGuarantee: activeBudget.bdiConfig.insuranceAndGuarantee,
                    financialExpenses: activeBudget.bdiConfig.financialExpenses,
                    profit: activeBudget.bdiConfig.profit,
                    taxesTotal: newTaxesTotal,
                  })

                  const updatedWithRegime: FullBudget = {
                    ...activeBudget,
                    chargesConfig: {
                      ...activeBudget.chargesConfig,
                      taxRegime: newRegime,
                      isRelieved: isRel,
                      simplesCollectionOption:
                        newRegime === 'simples_nacional'
                          ? activeBudget.chargesConfig?.simplesCollectionOption || 'cpp_inclusa_das'
                          : undefined,
                      simplesDasRate:
                        newRegime === 'simples_nacional'
                          ? activeDas
                          : activeBudget.chargesConfig?.simplesDasRate,
                      ...(newRegime === 'simples_nacional'
                        ? {
                            customGroupA: 0,
                            customGroupB: 0,
                            customGroupC: 0,
                            customGroupD: 0,
                            isExplicitZero: true,
                          }
                        : {}),
                    },
                    bdiConfig: {
                      ...activeBudget.bdiConfig,
                      taxes: {
                        ...activeBudget.bdiConfig.taxes,
                        inssOrCprb: newRegime === 'com_desoneracao' ? 4.5 : 0.0,
                        simplesDas: newRegime === 'simples_nacional' ? activeDas : undefined,
                        totalTaxes: newTaxesTotal,
                      },
                      calculatedBdi: recalculatedBdi.bdiPercent,
                    },
                  }

                  handleUpdateActiveBudget(updatedWithRegime)
                  saveSingleBudget(updatedWithRegime)
                  setBudgetsList(getStoredFullBudgets())
                  if (oldRegime !== newRegime) {
                    const regimeLabels: Record<string, string> = {
                      simples_nacional: 'Simples Nacional',
                      sem_desoneracao: 'Sem Desoneração',
                      com_desoneracao: 'Com Desoneração',
                    }
                    logAuditEvent({
                      budgetId: activeBudget.id,
                      action: 'edicao_regime_tributario',
                      title: 'Regime Tributário Alterado',
                      details:
                        newRegime === 'simples_nacional'
                          ? `Regime alterado de "${regimeLabels[oldRegime] || oldRegime}" para "${regimeLabels[newRegime] || newRegime}". Encargos trabalhistas zerados (0,00%); tributação exclusiva pelo DAS manual (${activeDas.toFixed(2)}%).`
                          : `Regime alterado de "${regimeLabels[oldRegime] || oldRegime}" para "${regimeLabels[newRegime] || newRegime}". Base de encargos: ${newRegime === 'com_desoneracao' ? 'Com Desoneração (CPRB)' : 'Sem Desoneração (CLT)'}.`,
                      oldValue: oldRegime,
                      newValue: newRegime,
                      userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                    })
                  }
                }}
                onSimplesCollectionOptionChange={(newOption, newGroups) => {
                  const oldOption =
                    activeBudget.chargesConfig?.simplesCollectionOption || 'cpp_inclusa_das'
                  handleUpdateActiveBudget({
                    ...activeBudget,
                    chargesConfig: {
                      ...activeBudget.chargesConfig,
                      simplesCollectionOption: newOption,
                      ...newGroups,
                    },
                  })

                  if (oldOption !== newOption) {
                    const optionLabels: Record<string, string> = {
                      cpp_inclusa_das: 'CPP inclusa no DAS (Padrão CONCE — Grupo A a 0%)',
                      cpp_guia_separada: 'CPP em guia separada (Anexo IV — Tabela integral)',
                    }
                    logAuditEvent({
                      budgetId: activeBudget.id,
                      action: 'edicao_subopcao_recolhimento',
                      title: 'Modalidade de Recolhimento da CPP Alterada',
                      details: `Recolhimento previdenciário alterado de "${optionLabels[oldOption] || oldOption}" para "${optionLabels[newOption] || newOption}". Grupo A: ${newGroups.customGroupA.toFixed(2)}%.`,
                      oldValue: oldOption,
                      newValue: newOption,
                      userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                    })
                  }
                }}
                onCustomGroupsChange={(groups) =>
                  handleUpdateActiveBudget({
                    ...activeBudget,
                    chargesConfig: {
                      ...activeBudget.chargesConfig,
                      ...groups,
                    },
                  })
                }
              />
            </div>
          )}

          {editorTab === 'bdi' && (
            <div className="space-y-4 animate-fade-in">
              <BdiEditor
                bdiConfig={activeBudget.bdiConfig}
                taxRegime={activeBudget.chargesConfig?.taxRegime}
                simplesDasRate={activeBudget.chargesConfig?.simplesDasRate}
                onSimplesDasChange={(rate) => {
                  const oldRate = activeBudget.chargesConfig?.simplesDasRate ?? 0
                  const cleanRate = Math.max(0, Number(rate) || 0)
                  const tcuCalc = calculateTcuBdi({
                    administrationCentral: activeBudget.bdiConfig.administrationCentral,
                    risk: activeBudget.bdiConfig.risk,
                    insuranceAndGuarantee: activeBudget.bdiConfig.insuranceAndGuarantee,
                    financialExpenses: activeBudget.bdiConfig.financialExpenses,
                    profit: activeBudget.bdiConfig.profit,
                    taxesTotal: cleanRate,
                  })

                  const updatedBudget: FullBudget = {
                    ...activeBudget,
                    chargesConfig: {
                      ...activeBudget.chargesConfig,
                      simplesDasRate: cleanRate,
                    },
                    bdiConfig: {
                      ...activeBudget.bdiConfig,
                      taxes: {
                        ...activeBudget.bdiConfig.taxes,
                        simplesDas: cleanRate,
                        totalTaxes: cleanRate,
                      },
                      calculatedBdi: tcuCalc.bdiPercent,
                    },
                  }

                  handleUpdateActiveBudget(updatedBudget)
                  saveSingleBudget(updatedBudget)
                  setBudgetsList(getStoredFullBudgets())

                  if (oldRate !== cleanRate) {
                    logAuditEvent({
                      budgetId: activeBudget.id,
                      action: 'edicao_bdi',
                      title: 'Alíquota DAS Atualizada no Simples Nacional',
                      details: `Alíquota efetiva do DAS alterada de ${oldRate.toFixed(2)}% para ${cleanRate.toFixed(2)}%. BDI recalculado TCU: ${tcuCalc.bdiPercent.toFixed(2)}%.`,
                    })
                  }
                }}
                onChange={(newBdi) => {
                  const updatedBudget: FullBudget = {
                    ...activeBudget,
                    bdiConfig: newBdi,
                  }
                  handleUpdateActiveBudget(updatedBudget)
                  saveSingleBudget(updatedBudget)
                  setBudgetsList(getStoredFullBudgets())
                }}
              />
            </div>
          )}

          {editorTab === 'abc' && (
            <div className="space-y-4 animate-fade-in">
              <AbcCurveScreen budget={activeBudget} />
            </div>
          )}

          {/* Modais de inteligência e exportação */}
          {/* PdfExportModal agora é montado uma única vez na raiz do componente (abaixo) */}

          {isRevisionsModalOpen && (
            <RevisionsModal
              budget={activeBudget}
              isOpen={isRevisionsModalOpen}
              onClose={() => setIsRevisionsModalOpen(false)}
              onRestoreRevision={(restored) => {
                setActiveBudget(restored)
                saveSingleBudget(restored)
                setBudgetsList(getStoredFullBudgets())
                showToast(`Orçamento restaurado com sucesso!`)
              }}
            />
          )}

          {isAuditModalOpen && (
            <AuditTrailModal
              budget={activeBudget}
              isOpen={isAuditModalOpen}
              onClose={() => setIsAuditModalOpen(false)}
            />
          )}
        </div>
      ) : (
        /* CASO 2: RELAÇÃO GERAL DE ORÇAMENTOS */
        <div className="space-y-6">
          {/* Header da Listagem */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#171A1F]/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-[#294C87]/10 text-[#294C87] text-xs font-bold uppercase tracking-wider">
                  Módulo de Engenharia
                </span>
                <span className="text-xs text-[#171A1F]/50 hidden sm:inline">
                  • Orçamentos Paramétricos e Propostas Técnicas
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#171A1F] tracking-tight">
                Orçamentos de Obra
              </h1>

              <p className="text-sm sm:text-base text-[#171A1F]/70 mt-1">
                Gerencie propostas com detalhamento de 4 níveis, encargos por estado e BDI conforme
                TCU.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsCleanModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#171A1F]/5 hover:bg-[#171A1F]/10 text-[#171A1F] text-xs sm:text-sm font-semibold transition-all border border-[#171A1F]/10 cursor-pointer"
                title="Limpeza profunda de dados de demonstração e registros órfãos"
              >
                <Sparkles className="w-4 h-4 text-[#FF6B1F]" />
                <span>Limpar Demo</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B1F] to-[#FF8945] hover:from-[#e55d17] hover:to-[#FF6B1F] text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer border border-white/20"
                title="Criar proposta estruturada por inteligência artificial"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>✨ Gerar com IA</span>
              </button>

              <button
                type="button"
                onClick={handleCreateNewBudget}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#294C87] hover:bg-[#1f3b6c] text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#FF6B1F]" />
                <span>Novo Orçamento</span>
              </button>
            </div>
          </div>
          {/* Seletor de visualização: Grade de Propostas vs. Aba Gerenciar Orçamentos */}
          <div className="flex items-center justify-between border-b border-[#171A1F]/15 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-[#294C87] text-white shadow-md'
                    : 'text-[#171A1F]/70 hover:bg-[#171A1F]/5 hover:text-[#171A1F]'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-[#FF6B1F]" />
                <span>Relação de Propostas</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('gerenciar')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  viewMode === 'gerenciar'
                    ? 'bg-[#FF6B1F] text-white shadow-md'
                    : 'text-[#171A1F]/70 hover:bg-[#171A1F]/5 hover:text-[#171A1F]'
                }`}
              >
                <Layers className="w-4 h-4 text-white" />
                <span>Aba Gerenciar</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    viewMode === 'gerenciar' ? 'bg-white text-[#FF6B1F]' : 'bg-[#294C87] text-white'
                  }`}
                >
                  {budgetsList.length}
                </span>
              </button>
            </div>

            <span className="text-xs text-[#171A1F]/60 hidden sm:inline">
              Gerencie, edite ou exclua orçamentos diretamente
            </span>
          </div>
          {/* MODO 1: CARDS DETALHADOS DE ORÇAMENTO */}
          {viewMode === 'cards' && (
            <>
              {/* Barra de Filtros da Lista */}
              <div className="bg-white p-4 rounded-2xl border border-[#171A1F]/10 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#171A1F]/40 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar por código, nome da obra ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
                  />
                </div>

                <div className="w-full sm:w-60">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#294C87]"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="em_analise">Em Análise</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>
              </div>

              {/* Cards dos Orçamentos */}
              {filteredBudgets.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 sm:p-14 text-center border border-[#171A1F]/10 shadow-sm space-y-5 animate-fade-in">
                  <div className="w-20 h-20 rounded-2xl bg-[#294C87]/10 text-[#294C87] flex items-center justify-center mx-auto border border-[#294C87]/20 shadow-inner">
                    <FileSpreadsheet className="w-10 h-10 text-[#294C87]" />
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <h4 className="text-xl sm:text-2xl font-extrabold text-[#171A1F] tracking-tight">
                      {budgetsList.length === 0
                        ? 'Nenhum orçamento ainda'
                        : 'Nenhum orçamento encontrado'}
                    </h4>
                    <p className="text-xs sm:text-sm text-[#171A1F]/70 leading-relaxed font-normal">
                      {budgetsList.length === 0
                        ? 'Seu ambiente está pronto e limpo, sem obras fictícias. Comece criando o seu primeiro orçamento de engenharia com custos reais, BDI TCU e encargos oficiais.'
                        : 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar o termo de busca ou o filtro de status.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCreateNewBudget}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#294C87] hover:bg-[#1f3b6c] text-white text-xs sm:text-sm font-bold shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-[#FF6B1F]" />
                      <span>Criar Primeiro Orçamento</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B1F] to-[#FF8945] hover:from-[#e55d17] hover:to-[#FF6B1F] text-white text-xs sm:text-sm font-bold shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer border border-white/20"
                    >
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span>✨ Gerar Proposta com IA</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredBudgets.map((b) => {
                    const summary = calculateFullBudget(b)
                    const statusBadges: Record<string, { label: string; class: string }> = {
                      em_andamento: {
                        label: 'Em Andamento',
                        class: 'bg-[#294C87]/15 text-[#294C87]',
                      },
                      aprovado: {
                        label: 'Aprovado',
                        class: 'bg-[#3E8E5A]/15 text-[#3E8E5A]',
                      },
                      em_analise: {
                        label: 'Em Análise',
                        class: 'bg-[#171A1F]/15 text-[#171A1F]',
                      },
                      vencido: {
                        label: 'Vencido',
                        class: 'bg-[#C4453C]/15 text-[#C4453C]',
                      },
                    }

                    const badge = statusBadges[b.status] || statusBadges.em_andamento

                    return (
                      <div
                        key={b.id}
                        className="bg-white rounded-[16px] p-5 shadow-[0_4px_20px_rgba(23,26,31,0.05)] border border-[#171A1F]/10 hover:border-[#294C87]/40 transition-all space-y-4"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded bg-[#294C87]/10 text-[#294C87]">
                                {b.code}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded ${badge.class}`}
                              >
                                {badge.label}
                              </span>
                              <span className="text-xs text-[#171A1F]/60">
                                UF da Obra:{' '}
                                <strong className="text-[#171A1F]">
                                  {b.chargesConfig?.uf || b.work.state || 'RS'}
                                </strong>
                              </span>
                              {b.publicWork.enabled && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F] flex items-center gap-1">
                                  <Landmark className="w-3 h-3" /> Obras Públicas (
                                  {b.publicWork.modality})
                                </span>
                              )}
                            </div>

                            <h3 className="text-base sm:text-lg font-bold text-[#171A1F]">
                              {b.title || b.work.name}
                            </h3>

                            {b.title && b.title !== b.work.name && (
                              <p className="text-xs text-[#294C87] font-semibold">
                                Obra: {b.work.name}
                              </p>
                            )}

                            <p className="text-xs text-[#171A1F]/70">
                              Cliente:{' '}
                              <strong className="text-[#171A1F]">
                                {b.client.name || 'Não informado'}
                              </strong>{' '}
                              {b.client.document && `(${b.client.document}) `}• Endereço Obra:{' '}
                              {b.work.address ? `${b.work.address}, ` : ''}
                              {b.work.city}/{b.work.state} • Prazo: {formatBudgetDeadline(b.work)}
                            </p>

                            {b.paymentTerms && (
                              <p className="text-[11px] text-[#171A1F]/60 line-clamp-1">
                                <span className="font-semibold text-[#294C87]">
                                  Forma de Pagamento:
                                </span>{' '}
                                {b.paymentTerms}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#171A1F]/60 pt-1">
                              <span>{b.stages.length} etapas</span>
                              <span>•</span>
                              <span>{summary.servicesCount} serviços</span>
                              <span>•</span>
                              <span>{summary.inputsCount} insumos</span>
                              <span>•</span>
                              <span>BDI: {summary.bdiRate.toFixed(2)}%</span>
                            </div>
                          </div>

                          {/* Valor e Ações */}
                          <div className="flex items-center md:flex-col items-end justify-between md:justify-start gap-3 border-t md:border-t-0 border-[#171A1F]/10 pt-3 md:pt-0">
                            <div className="text-left md:text-right">
                              <span className="text-[10px] text-[#171A1F]/50 uppercase font-bold block">
                                Valor Total da Obra
                              </span>
                              <span className="text-xl sm:text-2xl font-extrabold text-[#FF6B1F] tracking-tight">
                                {formatCurrencyBRL(summary.finalSalePrice)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDuplicateBudget(b)}
                                className="p-2 rounded-lg bg-[#171A1F]/5 hover:bg-[#171A1F]/10 text-[#171A1F] transition-colors"
                                title="Duplicar Orçamento"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  exportBudgetSpreadsheet(b, 'completo')
                                  showToast(`Planilha ${b.code} exportada!`)
                                }}
                                className="p-2 rounded-lg bg-[#171A1F]/5 hover:bg-[#171A1F]/10 text-[#171A1F] transition-colors"
                                title="Exportar Planilha Excel/CSV"
                              >
                                <Download className="w-4 h-4 text-green-600" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveBudget(b)
                                  setIsMemorialModalOpen(true)
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#294C87]/10 hover:bg-[#294C87] text-[#294C87] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                                title="Abrir Memorial Descritivo Automático de Obra"
                              >
                                <Layers className="w-3.5 h-3.5 text-[#FF6B1F]" />
                                <span className="hidden sm:inline">Memorial</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveBudget(b)
                                  setPdfInitialMode('valor_final')
                                  setIsPdfModalOpen(true)
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#171A1F]/5 hover:bg-[#294C87] text-[#171A1F] hover:text-white text-xs font-bold transition-colors"
                                title="Exportar Proposta PDF (Valor Final, Simplificado, Etapas ou Completo)"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-[#FF6B1F]" />
                                <span className="hidden sm:inline">Exportar PDF</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  ensureInitialRevision(b)
                                  setActiveBudget(b)
                                  setIsRevisionsModalOpen(true)
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-600 text-amber-900 hover:text-white border border-amber-400/40 text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
                                title="Histórico de Revisões e Restauração de Versões Anteriores"
                                aria-label={`Histórico e restaurador de revisões do orçamento ${b.code}`}
                              >
                                <History
                                  className="w-3.5 h-3.5 text-[#FF6B1F]"
                                  aria-hidden="true"
                                />
                                <span>Revisões</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingBudgetModal(b)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#294C87]/10 hover:bg-[#294C87] text-[#294C87] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                                title="Editar dados cadastrais, cliente, obra e status"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveBudget(b)
                                  setEditorTab('arvore')
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-colors cursor-pointer"
                                title="Abrir e Editar Núcleo Completo (Árvore de 4 níveis)"
                              >
                                <Layers className="w-3.5 h-3.5 text-[#FF6B1F]" />
                                <span>Abrir Núcleo</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingBudgetModal(b)}
                                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                                title="Excluir Orçamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
          {/* MODO 2: ABA GERENCIAR ORÇAMENTOS (TABELA DETALHADA COM EDIÇÃO E EXCLUSÃO) */}
          {viewMode === 'gerenciar' && (
            <div className="bg-white rounded-[16px] p-6 shadow-[0_4px_20px_rgba(23,26,31,0.06)] border border-[#171A1F]/10 space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#171A1F]/10">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#171A1F]">
                    Gerenciamento Geral de Orçamentos
                  </h3>
                  <p className="text-xs text-[#171A1F]/60">
                    Altere dados cadastrais, status ou exclua orçamentos que não foram realizados de
                    verdade.
                  </p>
                </div>
              </div>

              {/* Tabela de Gerenciamento */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#171A1F]/10 text-[11px] font-bold uppercase tracking-wider text-[#171A1F]/60 bg-[#171A1F]/[0.02]">
                      <th className="py-3 px-3">Código</th>
                      <th className="py-3 px-3">Obra / Endereço</th>
                      <th className="py-3 px-3">Cliente</th>
                      <th className="py-3 px-3 text-center">Criação</th>
                      <th className="py-3 px-3 text-right">Valor Total</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171A1F]/5">
                    {budgetsList.map((b) => {
                      const summary = calculateFullBudget(b)
                      const statusBadges: Record<string, { label: string; class: string }> = {
                        em_andamento: {
                          label: 'Em Andamento',
                          class: 'bg-[#294C87]/15 text-[#294C87]',
                        },
                        aprovado: {
                          label: 'Aprovado',
                          class: 'bg-[#3E8E5A]/15 text-[#3E8E5A]',
                        },
                        em_analise: {
                          label: 'Em Análise',
                          class: 'bg-[#171A1F]/15 text-[#171A1F]',
                        },
                        vencido: {
                          label: 'Vencido',
                          class: 'bg-[#C4453C]/15 text-[#C4453C]',
                        },
                      }
                      const badge = statusBadges[b.status] || statusBadges.em_andamento

                      return (
                        <tr key={b.id} className="hover:bg-[#294C87]/[0.03] transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-[#294C87]">{b.code}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-xs text-[#171A1F]">
                              {b.title || b.work?.name}
                            </div>
                            <div className="text-[11px] text-[#171A1F]/60 truncate max-w-xs">
                              {b.work?.address || `${b.work?.city}/${b.work?.state}`}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-[#171A1F]">
                            {b.client?.name || 'Não informado'}
                          </td>
                          <td className="py-3 px-3 text-center text-[#171A1F]/70 text-[11px]">
                            {b.createdAt ? b.createdAt.split('-').reverse().join('/') : '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-sm text-[#FF6B1F]">
                            {formatCurrencyBRL(summary.finalSalePrice)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.class}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveBudget(b)
                                  setIsMemorialModalOpen(true)
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#294C87]/10 hover:bg-[#294C87] text-[#294C87] hover:text-white font-bold text-xs transition-colors cursor-pointer"
                                title="Abrir Memorial Descritivo deste orçamento"
                              >
                                <Layers className="w-3.5 h-3.5 text-[#FF6B1F]" />
                                <span>Memorial</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  ensureInitialRevision(b)
                                  setActiveBudget(b)
                                  setIsRevisionsModalOpen(true)
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-600 text-amber-900 hover:text-white border border-amber-400/40 font-bold text-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
                                title="Histórico de Revisões e Restauração de Versões Anteriores"
                                aria-label={`Histórico e restaurador de revisões do orçamento ${b.code}`}
                              >
                                <History
                                  className="w-3.5 h-3.5 text-[#FF6B1F]"
                                  aria-hidden="true"
                                />
                                <span>Revisões</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingBudgetModal(b)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#294C87]/10 hover:bg-[#294C87] text-[#294C87] hover:text-white font-bold text-xs transition-colors cursor-pointer"
                                title="Editar dados deste orçamento"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveBudget(b)
                                  setEditorTab('arvore')
                                }}
                                className="p-1.5 rounded-lg bg-[#171A1F]/5 hover:bg-[#171A1F]/15 text-[#171A1F] transition-colors cursor-pointer"
                                title="Abrir editor completo de serviços e insumos"
                              >
                                <Layers className="w-4 h-4 text-[#294C87]" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingBudgetModal(b)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                                title="Excluir este orçamento definitivamente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Modal de geração por IA */}
          <AiBudgetModal
            isOpen={isAiModalOpen}
            onClose={() => setIsAiModalOpen(false)}
            onBudgetCreated={(createdBudget: FullBudget) => {
              const updated = [createdBudget, ...budgetsList]
              setBudgetsList(updated)
              setActiveBudget(createdBudget)
              setEditorTab('arvore')
              showToast(`Orçamento ${createdBudget.code} gerado com sucesso!`)
            }}
          />
          {/* Modal de Limpeza de Dados de Demonstração */}
          <StorageCleanModal
            isOpen={isCleanModalOpen}
            onClose={() => setIsCleanModalOpen(false)}
            onCleanSuccess={() => {
              const current = getStoredFullBudgets()
              setBudgetsList(current)
              if (activeBudget && !current.some((b) => b.id === activeBudget.id)) {
                setActiveBudget(current[0] || null)
              }
              showToast('Varredura e limpeza concluídas com sucesso!')
            }}
          />{' '}
        </div>
      )}

      {/* Modal de Edição Rápida */}
      {editingBudgetModal && (
        <QuickEditBudgetModal
          budget={editingBudgetModal}
          isOpen={!!editingBudgetModal}
          onClose={() => setEditingBudgetModal(null)}
          onSave={handleSaveQuickEdit}
          onOpenFullEditor={(b) => {
            setActiveBudget(b)
            setEditorTab('arvore')
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingBudgetModal && (
        <DeleteBudgetConfirmModal
          budget={deletingBudgetModal}
          isOpen={!!deletingBudgetModal}
          onClose={() => setDeletingBudgetModal(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Modal único de PDF de exportação CONCE (acessível no Editor e na Listagem) */}
      {isPdfModalOpen && activeBudget && (
        <PdfExportModal
          key={`${activeBudget.id}-${pdfInitialMode}`}
          budget={activeBudget}
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          initialMode={pdfInitialMode}
        />
      )}

      {/* Modal do Memorial Descritivo Automático de Obras CONCE */}
      {isMemorialModalOpen && activeBudget && (
        <MemorialDescritivoModal
          key={`memorial-${activeBudget.id}`}
          budget={activeBudget}
          isOpen={isMemorialModalOpen}
          onClose={() => setIsMemorialModalOpen(false)}
          onSaveMemorialToBudget={(updatedWithMemorial) => {
            setActiveBudget(updatedWithMemorial)
            saveSingleBudget(updatedWithMemorial)
            setBudgetsList(getStoredFullBudgets())
            logAuditEvent({
              budgetId: updatedWithMemorial.id,
              action: 'edicao_memorial',
              title: 'Memorial Descritivo Salvo no Orçamento',
              details: `Memorial descritivo técnico com ${updatedWithMemorial.savedMemorial?.stages.length || 0} etapas salvo no orçamento.`,
              userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
              metadata: {
                field: 'savedMemorial',
                signedBy: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
              },
            })
            showToast('Memorial descritivo salvo no orçamento com sucesso!')
          }}
        />
      )}
    </div>
  )
}
export default BudgetsScreen
