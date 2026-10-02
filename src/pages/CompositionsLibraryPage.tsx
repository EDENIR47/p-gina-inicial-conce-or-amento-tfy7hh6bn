/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Tela Principal da Biblioteca de Composições
 * Especialidades, CRUD completo, Duplicação, Versionamento e Importação SINAPI/SICRO
 */

import React, { useState } from 'react'
import {
  Calculator,
  Plus,
  Upload,
  Search,
  Filter,
  Copy,
  Edit2,
  Trash2,
  BookOpen,
  GitCommit,
  CheckCircle2,
  Sparkles,
  Download,
} from 'lucide-react'
import { BudgetComposition } from '@/types/budgetEngine'
import {
  getStoredCompositions,
  saveStoredCompositions,
  propagateCompositionUpdateToBudgets,
} from '@/lib/budgetsStorage'
import { SPECIALTIES_LIST } from '@/lib/compositionsData'
import { calculateCompositionUnitCost } from '@/lib/budgetEngine'
import { formatCurrencyBRL } from '@/lib/formatters'
import { CompositionEditModal } from '@/components/budget/CompositionEditModal'
import { ImportCompositionsModal } from '@/components/budget/ImportCompositionsModal'

export const CompositionsLibraryPage: React.FC = () => {
  const [compositions, setCompositions] = useState<BudgetComposition[]>(() =>
    getStoredCompositions(),
  )
  const [search, setSearch] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('Todas')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modais
  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean
    composition: BudgetComposition | null
  }>({ isOpen: false, composition: null })

  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Salva no localStorage e state
  const updateCompositionsList = (newList: BudgetComposition[]) => {
    setCompositions(newList)
    saveStoredCompositions(newList)
  }

  const handleSaveComposition = (saved: BudgetComposition) => {
    const exists = compositions.some((c) => c.id === saved.id)
    let updated: BudgetComposition[]
    if (exists) {
      updated = compositions.map((c) => (c.id === saved.id ? saved : c))
      showToast(`Composição ${saved.code} atualizada com sucesso!`)
    } else {
      updated = [saved, ...compositions]
      showToast(`Composição ${saved.code} cadastrada com sucesso!`)
    }
    updateCompositionsList(updated)

    // Propaga a atualização para todos os serviços que usam esta composição nos orçamentos
    const { affectedBudgetsCount, affectedServicesCount } =
      propagateCompositionUpdateToBudgets(saved)

    if (affectedBudgetsCount > 0) {
      showToast(
        `Composição ${saved.code} atualizada! ${affectedServicesCount} item(ns) em ${affectedBudgetsCount} orçamento(s) recalculado(s).`,
      )
    }

    // Dispara evento customizado para que telas abertas (ex: BudgetsScreen) sincronizem os orçamentos
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('conce_budget_updated', {
          detail: { compositionCode: saved.code, affectedBudgetsCount },
        }),
      )
    }
  }

  const handleDeleteComposition = (id: string, code: string) => {
    if (confirm(`Tem certeza que deseja excluir a composição ${code}?`)) {
      const updated = compositions.filter((c) => c.id !== id)
      updateCompositionsList(updated)
      showToast(`Composição ${code} excluída.`)
    }
  }

  const handleDuplicateComposition = (comp: BudgetComposition) => {
    const duplicated: BudgetComposition = {
      ...JSON.parse(JSON.stringify(comp)),
      id: `comp-${Date.now()}`,
      code: `${comp.code}-COP`,
      description: `${comp.description} (CÓPIA)`,
      version: 'v1.0',
      versionsHistory: [
        {
          version: 'v1.0',
          date: new Date().toISOString().split('T')[0],
          author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
          changelog: `Duplicada a partir de ${comp.code} (${comp.version})`,
        },
      ],
    }
    const updated = [duplicated, ...compositions]
    updateCompositionsList(updated)
    showToast(`Composição ${comp.code} duplicada com sucesso!`)
  }

  const handleImportSuccess = (importedList: BudgetComposition[]) => {
    const updated = [...importedList, ...compositions]
    updateCompositionsList(updated)
    showToast(`${importedList.length} composições importadas com sucesso!`)
  }

  // Filtragem
  const filtered = compositions.filter((comp) => {
    const matchesSearch =
      comp.description.toLowerCase().includes(search.toLowerCase()) ||
      comp.code.toLowerCase().includes(search.toLowerCase()) ||
      comp.specialty.toLowerCase().includes(search.toLowerCase())

    const matchesSpecialty = selectedSpecialty === 'Todas' || comp.specialty === selectedSpecialty

    return matchesSearch && matchesSpecialty
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

      {/* Header da Página */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#171A1F]/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#294C87]/10 text-[#294C87] text-xs font-bold uppercase tracking-wider">
              Banco Técnico CONCE
            </span>
            <span className="text-xs text-[#171A1F]/50 hidden sm:inline">
              • Composições Unitárias de Custos (CPU)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#171A1F] tracking-tight">
            Biblioteca de Composições
          </h1>

          <p className="text-sm sm:text-base text-[#171A1F]/70 mt-1">
            Catálogo completo de composições próprias da CONCE e referências SINAPI / SICRO.
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#294C87]/30 bg-[#294C87]/10 hover:bg-[#294C87]/20 text-[#294C87] text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4 text-[#FF6B1F]" />
            <span>Importar CSV/JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setEditModalState({ isOpen: true, composition: null })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Composição</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Especialidades */}
      <div className="bg-white p-4 rounded-2xl border border-[#171A1F]/10 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#171A1F]/40 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Pesquisar por código, descrição ou especialidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
            />
          </div>

          <div className="w-full sm:w-72">
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#294C87] cursor-pointer"
            >
              {SPECIALTIES_LIST.map((spec) => (
                <option key={spec} value={spec}>
                  Especialidade: {spec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Especialidades Rápidas em Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {SPECIALTIES_LIST.map((spec) => {
            const isSelected = selectedSpecialty === spec
            return (
              <button
                key={spec}
                type="button"
                onClick={() => setSelectedSpecialty(spec)}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                  isSelected
                    ? 'bg-[#294C87] text-white font-bold shadow-sm'
                    : 'bg-[#171A1F]/5 text-[#171A1F]/70 hover:bg-[#171A1F]/10'
                }`}
              >
                {spec}
              </button>
            )
          })}
        </div>
      </div>

      {/* Relação de Composições */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-[#171A1F]/20 space-y-3">
          <BookOpen className="w-12 h-12 text-[#171A1F]/30 mx-auto" />
          <h4 className="text-base font-bold text-[#171A1F]">Nenhuma composição encontrada</h4>
          <p className="text-xs text-[#171A1F]/60 max-w-sm mx-auto">
            Tente outros termos de busca ou utilize o importador CSV/JSON para carregar seu banco
            SINAPI.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((comp) => {
            const unitCost = calculateCompositionUnitCost(comp)
            const latestHistory = comp.versionsHistory?.[0]

            return (
              <div
                key={comp.id}
                className="bg-white rounded-[16px] p-5 shadow-[0_4px_20px_rgba(23,26,31,0.05)] border border-[#171A1F]/10 hover:border-[#294C87]/40 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded bg-[#294C87]/10 text-[#294C87]">
                        {comp.code}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#171A1F]/5 text-[#171A1F]/80">
                        {comp.specialty}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FF6B1F]/15 text-[#FF6B1F]">
                        {comp.source} {comp.version}
                      </span>
                      <span className="text-xs text-[#171A1F]/70 font-semibold">
                        Unidade: <strong className="text-[#171A1F]">{comp.unit}</strong>
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-[#171A1F] leading-snug">
                      {comp.description}
                    </h3>

                    {/* Dados de Versionamento e Autoria */}
                    {latestHistory && (
                      <div className="flex items-center gap-2 text-[11px] text-[#171A1F]/60">
                        <GitCommit className="w-3.5 h-3.5 text-[#294C87]" />
                        <span>
                          Versão {comp.version} em {latestHistory.date} por{' '}
                          <strong className="text-[#171A1F]">{latestHistory.author}</strong>
                        </span>
                        {latestHistory.changelog && (
                          <span className="italic text-[#171A1F]/50 hidden md:inline">
                            — "{latestHistory.changelog}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Custo Unitário e Ações */}
                  <div className="flex items-center sm:flex-col items-end justify-between sm:justify-start gap-3 border-t sm:border-t-0 border-[#171A1F]/10 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-[#171A1F]/50 uppercase font-bold block">
                        Custo Base / {comp.unit}
                      </span>
                      <span className="text-xl sm:text-2xl font-extrabold text-[#FF6B1F] tracking-tight">
                        {formatCurrencyBRL(unitCost)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDuplicateComposition(comp)}
                        className="p-2 rounded-lg bg-[#171A1F]/5 hover:bg-[#171A1F]/10 text-[#171A1F] transition-colors"
                        title="Duplicar Composição"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditModalState({ isOpen: true, composition: comp })}
                        className="p-2 rounded-lg bg-[#294C87]/10 hover:bg-[#294C87]/20 text-[#294C87] transition-colors"
                        title="Editar Composição e Insumos"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteComposition(comp.id, comp.code)}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                        title="Excluir Composição"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Resumo de Insumos da CPU */}
                <div className="pt-2 border-t border-[#171A1F]/10">
                  <div className="flex items-center justify-between text-xs text-[#171A1F]/70 mb-2">
                    <span className="font-bold">
                      Insumos Vinculados ({comp.inputs?.length || 0})
                    </span>
                    <span className="text-[11px] text-[#171A1F]/50">
                      Calculado por coeficiente e custo unitário direto
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {comp.inputs?.slice(0, 6).map((inp) => (
                      <div
                        key={inp.id}
                        className="p-2 rounded-lg bg-[#F8F9FA] border border-[#171A1F]/5 text-[11px] flex items-center justify-between gap-2"
                      >
                        <div className="truncate flex-1">
                          <span className="font-mono text-[#294C87] font-bold mr-1">
                            {inp.code}
                          </span>
                          <span className="text-[#171A1F]/80 truncate">{inp.description}</span>
                        </div>
                        <span className="font-bold text-[#FF6B1F] whitespace-nowrap">
                          {inp.coefficient} {inp.unit}
                        </span>
                      </div>
                    ))}
                    {(comp.inputs?.length || 0) > 6 && (
                      <div className="p-2 rounded-lg bg-[#171A1F]/5 text-[11px] font-bold text-[#171A1F]/60 flex items-center justify-center">
                        + {(comp.inputs?.length || 0) - 6} outros insumos
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modais */}
      <CompositionEditModal
        isOpen={editModalState.isOpen}
        onClose={() => setEditModalState({ isOpen: false, composition: null })}
        onSave={handleSaveComposition}
        initialComposition={editModalState.composition}
      />

      <ImportCompositionsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  )
}
export default CompositionsLibraryPage
