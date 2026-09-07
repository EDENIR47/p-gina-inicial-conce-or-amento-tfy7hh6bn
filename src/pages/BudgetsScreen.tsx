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
} from 'lucide-react'
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

export const BudgetsScreen: React.FC = () => {
  // Lista de todos os orçamentos persistidos
  const [budgetsList, setBudgetsList] = useState<FullBudget[]>(() => getStoredFullBudgets())

  // Orçamento atualmente em edição (ou null se estiver na listagem)
  const [activeBudget, setActiveBudget] = useState<FullBudget | null>(null)

  // Aba ativa dentro do editor do orçamento: 'geral' | 'arvore' | 'encargos' | 'bdi'
  const [editorTab, setEditorTab] = useState<'geral' | 'arvore' | 'encargos' | 'bdi'>('arvore')

  // Filtros de listagem
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

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
      status: 'em_andamento',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
      work: {
        ...b.work,
        name: `${b.work.name} (Cópia)`,
      },
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

  // Salvar orçamento ativo
  const handleSaveActiveBudget = () => {
    if (!activeBudget) return

    const isValid = validateBudget(activeBudget)
    if (!isValid) {
      showToast('Por favor, preencha os campos obrigatórios em Dados da Obra.')
      setEditorTab('geral')
      return
    }

    setIsSaving(true)
    saveSingleBudget(activeBudget)

    // Atualiza a lista na memória
    const currentBudgets = getStoredFullBudgets()
    setBudgetsList(currentBudgets)

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

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded bg-[#294C87] text-white">
                    {activeBudget.code}
                  </span>
                  <span className="text-xs font-bold text-[#171A1F]/70">
                    {activeBudget.work.name || 'Sem título'}
                  </span>
                  {activeBudget.publicWork.enabled && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F] flex items-center gap-1">
                      <Landmark className="w-3 h-3" /> Modo Obras Públicas
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#171A1F] mt-0.5">
                  Núcleo de Engenharia de Custos CONCE
                </h1>
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
            </div>
          </div>

          {/* BARRA DE TOTAIS FIXA NO TOPO DO CONTEÚDO */}
          <BudgetTotalsBar
            summary={activeSummary}
            budget={activeBudget}
            onSave={handleSaveActiveBudget}
            isSaving={isSaving}
            validationErrors={validationErrors}
          />

          {/* CONTEÚDO DA ABA SELECIONADA */}
          {editorTab === 'arvore' && (
            <div className="space-y-4 animate-fade-in">
              <BudgetHierarchyTree
                budget={activeBudget}
                onChange={(updated) => setActiveBudget(updated)}
              />
            </div>
          )}

          {editorTab === 'geral' && (
            <div className="space-y-4 animate-fade-in">
              <BudgetHeaderForm
                budget={activeBudget}
                onChange={(updated) => setActiveBudget(updated)}
                validationErrors={validationErrors}
              />
            </div>
          )}

          {editorTab === 'encargos' && (
            <div className="space-y-4 animate-fade-in">
              <SocialChargesSelector
                uf={activeBudget.chargesConfig?.uf || 'SP'}
                isRelieved={activeBudget.chargesConfig?.isRelieved || false}
                customGroupA={activeBudget.chargesConfig?.customGroupA}
                customGroupB={activeBudget.chargesConfig?.customGroupB}
                customGroupC={activeBudget.chargesConfig?.customGroupC}
                customGroupD={activeBudget.chargesConfig?.customGroupD}
                onUfChange={(newUf) =>
                  setActiveBudget({
                    ...activeBudget,
                    chargesConfig: {
                      ...activeBudget.chargesConfig,
                      uf: newUf,
                    },
                  })
                }
                onRelievedChange={(newRelieved) =>
                  setActiveBudget({
                    ...activeBudget,
                    chargesConfig: {
                      ...activeBudget.chargesConfig,
                      isRelieved: newRelieved,
                    },
                  })
                }
                onCustomGroupsChange={(groups) =>
                  setActiveBudget({
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
                onChange={(newBdi) =>
                  setActiveBudget({
                    ...activeBudget,
                    bdiConfig: newBdi,
                  })
                }
              />
            </div>
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

            <button
              type="button"
              onClick={handleCreateNewBudget}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Orçamento</span>
            </button>
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
                Crie um novo orçamento técnico para começar a compor as etapas e serviços.
              </p>
              <button
                type="button"
                onClick={handleCreateNewBudget}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#294C87] text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4 text-[#FF6B1F]" />
                <span>Criar Novo Orçamento</span>
              </button>
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
                              {b.chargesConfig?.isRelieved ? 'Desonerado' : 'Sem desoneração'}
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
                          {b.work.name}
                        </h3>

                        <p className="text-xs text-[#171A1F]/70">
                          Cliente:{' '}
                          <strong className="text-[#171A1F]">
                            {b.client.name || 'Não informado'}
                          </strong>{' '}
                          • Local: {b.work.city}/{b.work.state} • Prazo: {b.work.deadlineMonths}{' '}
                          meses
                        </p>

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
        </div>
      )}
    </div>
  )
}
export default BudgetsScreen
