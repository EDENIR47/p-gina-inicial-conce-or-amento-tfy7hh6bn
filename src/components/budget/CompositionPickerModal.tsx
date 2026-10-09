/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Selecionar Composição da Biblioteca ou Criar Rápida
 */

import React, { useState } from 'react'
import { X, Search, Plus, BookOpen, Filter, Check, Tag, Building2 } from 'lucide-react'
import { BudgetComposition } from '@/types/budgetEngine'
import { getStoredCompositions } from '@/lib/budgetsStorage'
import { formatCurrencyBRL } from '@/lib/formatters'
import { SPECIALTIES_LIST } from '@/lib/compositionsData'
import { calculateCompositionUnitCost } from '@/lib/budgetEngine'
import { areUnitsEquivalent } from '@/lib/measurementUnits'

interface CompositionPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (composition: BudgetComposition) => void
  targetUnit?: string
}

export const CompositionPickerModal: React.FC<CompositionPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  targetUnit,
}) => {
  const [search, setSearch] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('Todas')
  const compositions = getStoredCompositions()

  if (!isOpen) return null

  const filtered = compositions.filter((comp) => {
    const matchesSearch =
      comp.description.toLowerCase().includes(search.toLowerCase()) ||
      comp.code.toLowerCase().includes(search.toLowerCase()) ||
      comp.specialty.toLowerCase().includes(search.toLowerCase())

    const matchesSpecialty = selectedSpecialty === 'Todas' || comp.specialty === selectedSpecialty

    return matchesSearch && matchesSpecialty
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-[#171A1F]/20 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-[#FF6B1F] text-white">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Biblioteca de Composições CONCE / SINAPI
              </h3>
              <p className="text-xs text-white/70">
                Selecione uma composição unitária para associar ao serviço do orçamento
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pesquisa e Filtros */}
        <div className="p-4 border-b border-[#171A1F]/10 bg-[#F8F9FA] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#171A1F]/40 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por código, descrição ou especialidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#171A1F]/20 text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#171A1F]/20 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#294C87]"
            >
              {SPECIALTIES_LIST.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Composições */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[#171A1F]/50 text-sm">
              Nenhuma composição encontrada com estes termos.
            </div>
          ) : (
            filtered.map((comp) => {
              const unitCost = calculateCompositionUnitCost(comp)
              const hasUnitMismatch = Boolean(
                targetUnit && !areUnitsEquivalent(targetUnit, comp.unit),
              )

              return (
                <div
                  key={comp.id}
                  className="p-4 rounded-xl border border-[#171A1F]/10 hover:border-[#294C87] hover:shadow-md transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-[#294C87]/10 text-[#294C87]">
                        {comp.code}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#171A1F]/5 text-[#171A1F]/80">
                        {comp.specialty}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F]">
                        {comp.source} {comp.version}
                      </span>
                      <span className="text-xs font-bold text-[#171A1F]/70">
                        Unidade: <strong className="text-[#171A1F]">{comp.unit}</strong>
                      </span>
                      {hasUnitMismatch && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Alerta: unidade ({comp.unit}) diferente do serviço ({targetUnit})
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-[#171A1F] line-clamp-2">
                      {comp.description}
                    </p>

                    <div className="text-[11px] text-[#171A1F]/60 flex items-center gap-3">
                      <span>{comp.inputs?.length || 0} insumos na CPU</span>
                      <span>•</span>
                      <span>Autor: {comp.versionsHistory?.[0]?.author || 'CONCE'}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#171A1F]/10">
                    <div className="text-right">
                      <div className="text-[10px] text-[#171A1F]/50 uppercase font-semibold">
                        Custo Base / {comp.unit}
                      </div>
                      <div className="text-base sm:text-lg font-bold text-[#FF6B1F]">
                        {formatCurrencyBRL(unitCost)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelect(comp)
                        onClose()
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all group-hover:scale-105"
                    >
                      <Check className="w-3.5 h-3.5 text-[#FF6B1F]" />
                      <span>Selecionar</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex items-center justify-between text-xs text-[#171A1F]/60">
          <span>{filtered.length} composições disponíveis</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#171A1F]/20 hover:bg-white text-xs font-semibold text-[#171A1F]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
