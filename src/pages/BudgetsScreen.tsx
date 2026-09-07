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
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { AiBudgetModal } from '@/components/budget/AiBudgetModal'
import { FullBudget } from '@/types/budgetEngine'
import {
  getStoredFullBudgets,
  saveFullBudgets,
  saveSingleBudget,
  createCanonicalDemoBudget,
} from '@/lib/budgetsStorage'
import { calculateFullBudget } from '@/lib/budgetEngine'
import { formatCurrencyBRL } from '@/lib/formatters'
import { BudgetHeaderForm } from '@/components/budget/BudgetHeaderForm'
import { BudgetHierarchyTree } from '@/components/budget/BudgetHierarchyTree'
import { SocialChargesSelector } from '@/components/budget/SocialChargesSelector'
import { BdiEditor } from '@/components/budget/BdiEditor'
import { BudgetTotalsBar } from '@/components/budget/BudgetTotalsBar'
import { PdfExportModal, PdfExportMode } from '@/components/budget/PdfExportModal'
import { RevisionsModal } from '@/components/budget/RevisionsModal'
import { AuditTrailModal } from '@/components/budget/AuditTrailModal'
import { AbcCurveScreen } from '@/pages/AbcCurveScreen'
import { exportBudgetSpreadsheet } from '@/lib/exportSpreadsheet'
import { logAuditEvent, ensureInitialRevision } from '@/lib/intelligenceStorage'

export const BudgetsScreen: React.FC = () => {
  const location = useLocation()
  // Lista de todos os orçamentos persistidos
  const [budgetsList, setBudgetsList] = useState<FullBudget[]>(() => getStoredFullBudgets())

  // Orçamento atualmente em edição (ou null se estiver na listagem)
  const [activeBudget, setActiveBudget] = useState<FullBudget | null>(null)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  // Ao navegar com state.openBudgetId, abre imediatamente
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
  const [pdfInitialMode, setPdfInitialMode] = useState<PdfExportMode>('simplificado')
  const [isRevisionsModalOpen, setIsRevisionsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)

  // Feedback e Validações
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Criação de novo orçamento em branco
  const handleCreateNewBudget = () => {
    const newId = `budget-${Date.now()}`
    const codeNum = budgetsList.length + 1
    const newBudget: FullBudget = {
      ...createCanonicalDemoBudget(),
      id: newId,
      code: `ORC-2025-${String(codeNum).padStart(3, '0')}`,
      status: 'em_andamento',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
      client: {
        name: '',
        document: '',
        email: '',
        phone: '',
        address: '',
        city: 'São Paulo',
        state: 'SP',
      },
      work: {
        name: 'Novo Projeto de Engenharia',
        address: '',
        city: 'São Paulo',
        state: 'SP',
        description: 'Construção civil conforme projetos e especificações técnicas.',
        deadlineMonths: 12,
        startDate: new Date().toISOString().split('T')[0],
      },
      publicWork: {
        enabled: false,
        tenderNumber: '',
        contractNumber: '',
        agency: '',
        modality: 'Concorrência',
        sinapiReferenceMonth: '04/2025 sem desoneração',
        hasDisallowanceClause: false,
      },
      stages: [],
    }

    setActiveBudget(newBudget)
    setEditorTab('geral')
    setValidationErrors({})
  }

  // Duplicar orçamento existente
  const handleDuplicateBudget = (b: FullBudget) => {
    const duplicated: FullBudget = {
      ...JSON.parse(JSON.stringify(b)),
      id: `budget-${Date.now()}`,
      code: `${b.code}-COP`,
      title: b.title ? `${b.title} (Cópia)` : `${b.work.name} (Cópia)`,
      status: 'em_andamento',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
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

  // Excluir orçamento
  const handleDeleteBudget = (id: string, code: string) => {
    if (confirm(`Tem certeza que deseja excluir o orçamento ${code}?`)) {
      const updated = budgetsList.filter((b) => b.id !== id)
      setBudgetsList(updated)
      saveFullBudgets(updated)
      showToast(`Orçamento ${code} excluído.`)
    }
  }

  // Validação dos dados do formulário
  const validateBudget = (budget: FullBudget): boolean => {
    const errors: Record<string, string> = {}

    if (!budget.client.name.trim()) {
      errors['client.name'] = 'Nome do cliente é obrigatório'
    }
    if (!budget.client.document.trim()) {
      errors['client.document'] = 'CPF/CNPJ do cliente é obrigatório'
    }
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

      // 4. Alteração de forma de pagamento
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
                  {activeBudget.publicWork.enabled && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F] flex items-center gap-1">
                      <Landmark className="w-3 h-3" /> Modo Obras Públicas
                    </span>
                  )}
                  <span className="text-[11px] text-[#171A1F]/50">
                    Cliente:{' '}
                    <strong className="text-[#171A1F]">
                      {activeBudget.client.name || 'A definir'}
                    </strong>
                  </span>
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
              setPdfInitialMode('simplificado')
              setIsPdfModalOpen(true)
            }}
            onOpenExcelExport={() => exportBudgetSpreadsheet(activeBudget, 'completo')}
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

                  handleUpdateActiveBudget({
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
                        totalTaxes:
                          newRegime === 'simples_nacional'
                            ? activeDas
                            : (activeBudget.bdiConfig.taxes.iss || 0) +
                              (activeBudget.bdiConfig.taxes.pis || 0) +
                              (activeBudget.bdiConfig.taxes.cofins || 0) +
                              (newRegime === 'com_desoneracao' ? 4.5 : 0.0),
                      },
                    },
                  })
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
                  handleUpdateActiveBudget({
                    ...activeBudget,
                    chargesConfig: {
                      ...activeBudget.chargesConfig,
                      simplesDasRate: rate,
                    },
                  })
                  if (oldRate !== rate) {
                    logAuditEvent({
                      budgetId: activeBudget.id,
                      action: 'edicao_bdi',
                      title: 'Alíquota DAS Atualizada no Simples Nacional',
                      details: `Alíquota efetiva do DAS alterada de ${oldRate.toFixed(2)}% para ${rate.toFixed(2)}%.`,
                    })
                  }
                }}
                onChange={(newBdi) =>
                  handleUpdateActiveBudget({
                    ...activeBudget,
                    bdiConfig: newBdi,
                  })
                }
              />
            </div>
          )}

          {editorTab === 'abc' && (
            <div className="space-y-4 animate-fade-in">
              <AbcCurveScreen budget={activeBudget} />
            </div>
          )}

          {/* Modais de inteligência e exportação */}
          {isPdfModalOpen && (
            <PdfExportModal
              budget={activeBudget}
              isOpen={isPdfModalOpen}
              onClose={() => setIsPdfModalOpen(false)}
              initialMode={pdfInitialMode}
            />
          )}

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
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-[#171A1F]/20 space-y-3">
              <FileSpreadsheet className="w-12 h-12 text-[#171A1F]/30 mx-auto" />
              <h4 className="text-base font-bold text-[#171A1F]">Nenhum orçamento encontrado</h4>
              <p className="text-xs text-[#171A1F]/60 max-w-sm mx-auto">
                Crie um novo orçamento técnico ou descreva o projeto para o agente de inteligência
                artificial.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B1F] text-white text-xs font-bold shadow-md hover:bg-[#FF6B1F]/90"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>✨ Gerar com IA</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewBudget}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#294C87] text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Manualmente</span>
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
                            UF:{' '}
                            <strong className="text-[#171A1F]">
                              {b.chargesConfig?.uf || 'SP'}
                            </strong>
                          </span>
                          <span className="text-xs text-[#171A1F]/60">
                            Regime:{' '}
                            <strong className="text-[#171A1F]">
                              {b.chargesConfig?.taxRegime === 'simples_nacional'
                                ? 'Simples Nacional'
                                : b.chargesConfig?.taxRegime === 'com_desoneracao' ||
                                    b.chargesConfig?.isRelieved
                                  ? 'Com Desoneração'
                                  : 'Sem Desoneração'}
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
                          {b.work.city}/{b.work.state} • Prazo: {b.work.deadlineMonths} meses
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
                              setPdfInitialMode('simplificado')
                              setIsPdfModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#171A1F]/5 hover:bg-[#294C87] text-[#171A1F] hover:text-white text-xs font-bold transition-colors"
                            title="Exportar Proposta PDF (Simplificado ou Completo)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-[#FF6B1F]" />
                            <span className="hidden sm:inline">Exportar PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveBudget(b)
                              setEditorTab('arvore')
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-colors"
                            title="Abrir e Editar Núcleo"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#FF6B1F]" />
                            <span>Abrir Núcleo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBudget(b.id, b.code)}
                            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
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

          {/* Modal de geração por IA */}
          <AiBudgetModal
            isOpen={isAiModalOpen}
            onClose={() => setIsAiModalOpen(false)}
            onBudgetCreated={(created) => {
              const updated = getStoredFullBudgets()
              setBudgetsList(updated)
              setActiveBudget(created)
              setEditorTab('arvore')
              showToast(`Orçamento ${created.code} gerado com sucesso por IA!`)
            }}
          />

          {/* Modal de PDF também acessível a partir da listagem geral */}
          {isPdfModalOpen && activeBudget && (
            <PdfExportModal
              budget={activeBudget}
              isOpen={isPdfModalOpen}
              onClose={() => setIsPdfModalOpen(false)}
              initialMode={pdfInitialMode}
            />
          )}
        </div>
      )}
    </div>
  )
}
export default BudgetsScreen
