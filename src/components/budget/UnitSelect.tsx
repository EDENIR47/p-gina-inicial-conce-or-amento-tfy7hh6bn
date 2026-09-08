/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Seletor de Unidades de Medida para Engenharia de Custos
 *
 * Características:
 * - Exibe lista categorizada completa (m², m, m³, kg, t, un, gl, vb, ml, %, etc.)
 * - Permite busca instantânea por símbolo ou descrição
 * - Permite digitação livre de unidade personalizada (preserva retrocompatibilidade 100%)
 * - Pílulas rápidas com as unidades mais frequentes da construção civil
 * - Suporta variantes de tamanho (padrão para modal ou compacto para inline na tabela)
 * - Posicionamento robusto com fallback anti-overflow
 */

import React, { useState, useRef, useEffect, useId } from 'react'
import { ChevronDown, Check, Sparkles, Plus, Search } from 'lucide-react'
import {
  STANDARD_MEASUREMENT_UNITS,
  getGroupedMeasurementUnits,
  MeasurementUnitOption,
  normalizeUnit,
} from '@/lib/measurementUnits'

// Pílulas das unidades mais frequentes em orçamentos para clique rápido com 1 toque
const FREQUENT_UNITS = ['m²', 'm³', 'm', 'kg', 'un', 'h', 't', 'vb', 'gl', 'L']

interface UnitSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
  showQuickPills?: boolean
  id?: string
  name?: string
  required?: boolean
  ariaLabel?: string
}

export const UnitSelect: React.FC<UnitSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Selecione ou digite...',
  className = '',
  size = 'md',
  showQuickPills = false,
  id,
  name,
  required = false,
  ariaLabel = 'Unidade de medida',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputSearchRef = useRef<HTMLInputElement>(null)
  const autoId = useId()
  const elementId = id || autoId

  const groupedUnits = getGroupedMeasurementUnits()

  // Garante que o valor atual seja exibido adequadamente
  const normalizedCurrent = (value || '').trim()
  const matchedUnit = STANDARD_MEASUREMENT_UNITS.find(
    (u) => u.symbol.toLowerCase() === normalizedCurrent.toLowerCase(),
  )

  // Filtra opções com base na busca
  const cleanSearch = search.trim().toLowerCase()
  const filteredGroups = groupedUnits
    .map((grp) => ({
      ...grp,
      units: grp.units.filter(
        (u) =>
          u.symbol.toLowerCase().includes(cleanSearch) ||
          u.label.toLowerCase().includes(cleanSearch) ||
          (u.description && u.description.toLowerCase().includes(cleanSearch)),
      ),
    }))
    .filter((grp) => grp.units.length > 0)

  // Fecha dropdown ao clicar fora ou pressionar ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      // Foca automaticamente no input de busca ao abrir
      setTimeout(() => {
        inputSearchRef.current?.focus()
      }, 50)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (unitSymbol: string) => {
    onChange(unitSymbol)
    setIsOpen(false)
    setSearch('')
  }

  const handleCustomUnitSubmit = () => {
    if (search.trim()) {
      const formatted = normalizeUnit(search.trim())
      onChange(formatted)
      setIsOpen(false)
      setSearch('')
    }
  }

  const isSm = size === 'sm'

  return (
    <div className={`relative inline-block w-full text-left ${className}`} ref={containerRef}>
      {/* Gatilho Principal (Botão que exibe a unidade atual e abre o dropdown) */}
      <button
        type="button"
        id={elementId}
        name={name}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev)
            setSearch('')
          }
        }}
        className={`w-full flex items-center justify-between rounded-lg border bg-white text-left font-bold transition-all ${
          isSm
            ? 'px-2 py-1 text-xs border-[#171A1F]/20 hover:border-[#294C87]'
            : 'px-3 py-2 text-xs border-[#171A1F]/20 hover:border-[#294C87] shadow-xs'
        } ${
          isOpen ? 'border-[#294C87] ring-2 ring-[#294C87]/20' : 'hover:bg-[#171A1F]/[0.02]'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {normalizedCurrent ? (
            <>
              <span className="font-mono text-[#294C87] font-extrabold tracking-wide">
                {normalizedCurrent}
              </span>
              {matchedUnit && (
                <span className="text-[11px] text-[#171A1F]/50 font-normal truncate hidden sm:inline">
                  — {matchedUnit.category}
                </span>
              )}
            </>
          ) : (
            <span className="text-[#171A1F]/40 font-normal truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#171A1F]/60 transition-transform shrink-0 ml-1 ${
            isOpen ? 'rotate-180 text-[#294C87]' : ''
          }`}
        />
      </button>

      {/* Input oculto para formulários HTML com required */}
      {required && (
        <input
          type="text"
          value={value}
          readOnly
          tabIndex={-1}
          required={required}
          className="sr-only"
        />
      )}

      {/* Pílulas de Acesso Rápido opcionais (renderizadas logo abaixo do gatilho) */}
      {showQuickPills && !disabled && (
        <div className="mt-1.5 flex flex-wrap gap-1 items-center">
          <span className="text-[10px] text-[#171A1F]/50 font-medium">Sugestões:</span>
          {FREQUENT_UNITS.slice(0, 6).map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => onChange(pill)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                normalizedCurrent.toLowerCase() === pill.toLowerCase()
                  ? 'bg-[#294C87] text-white'
                  : 'bg-[#171A1F]/5 text-[#171A1F]/70 hover:bg-[#294C87]/10 hover:text-[#294C87]'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      )}

      {/* Painel Dropdown Flutuante */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 mt-1 w-72 max-w-[90vw] sm:w-80 bg-white rounded-xl shadow-2xl border border-[#171A1F]/15 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
          style={{ maxHeight: '340px' }}
        >
          {/* Cabeçalho do Dropdown com Busca e Inserção Livre */}
          <div className="p-2.5 bg-[#F8F9FA] border-b border-[#171A1F]/10 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#171A1F]/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputSearchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (filteredGroups.length > 0 && filteredGroups[0].units.length > 0) {
                      handleSelect(filteredGroups[0].units[0].symbol)
                    } else {
                      handleCustomUnitSubmit()
                    }
                  }
                }}
                placeholder="Buscar (ex: m², kg, un, vb)..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-[#171A1F]/20 focus:outline-none focus:border-[#294C87] bg-white font-medium"
              />
            </div>

            {/* Pílulas de atalho rápido */}
            <div className="flex flex-wrap gap-1 items-center pt-0.5">
              <span className="text-[10px] text-[#171A1F]/50 font-bold uppercase tracking-wider">
                Frequentes:
              </span>
              {FREQUENT_UNITS.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => handleSelect(pill)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    normalizedCurrent.toLowerCase() === pill.toLowerCase()
                      ? 'bg-[#294C87] text-white shadow-xs'
                      : 'bg-white border border-[#171A1F]/15 text-[#171A1F] hover:bg-[#294C87] hover:text-white hover:border-[#294C87]'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Lista com scroll das unidades categorizadas */}
          <div className="overflow-y-auto max-h-56 divide-y divide-[#171A1F]/5 p-1">
            {/* Se houver texto digitado que não existe na lista oficial, permite adicionar livremente */}
            {cleanSearch &&
              !STANDARD_MEASUREMENT_UNITS.some((u) => u.symbol.toLowerCase() === cleanSearch) && (
                <div className="p-1">
                  <button
                    type="button"
                    onClick={handleCustomUnitSubmit}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-[#FF6B1F]/10 hover:bg-[#FF6B1F]/20 text-[#FF6B1F] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Usar unidade personalizada:</span>
                      <strong className="font-mono text-sm underline">{search.trim()}</strong>
                    </div>
                    <span className="text-[10px] uppercase font-semibold">Enter ↵</span>
                  </button>
                </div>
              )}

            {filteredGroups.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#171A1F]/50">
                <p>Nenhuma unidade padrão encontrada para "{search}".</p>
                <button
                  type="button"
                  onClick={handleCustomUnitSubmit}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#294C87] text-white text-xs font-bold hover:bg-[#171A1F] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#FF6B1F]" />
                  <span>Usar "{search.trim()}" mesmo assim</span>
                </button>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.category} className="py-1">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#294C87] bg-[#294C87]/5 rounded flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-[#FF6B1F]" />
                    <span>{group.label}</span>
                  </div>

                  <div className="mt-1 space-y-0.5">
                    {group.units.map((u: MeasurementUnitOption) => {
                      const isSelected = normalizedCurrent.toLowerCase() === u.symbol.toLowerCase()

                      return (
                        <button
                          key={u.symbol}
                          type="button"
                          onClick={() => handleSelect(u.symbol)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#294C87] text-white font-bold'
                              : 'hover:bg-[#171A1F]/5 text-[#171A1F]'
                          }`}
                        >
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span
                              className={`font-mono text-xs font-extrabold w-9 shrink-0 ${
                                isSelected ? 'text-white' : 'text-[#294C87]'
                              }`}
                            >
                              {u.symbol}
                            </span>
                            <span
                              className={`text-[11px] truncate ${
                                isSelected ? 'text-white/90' : 'text-[#171A1F]/80'
                              }`}
                            >
                              {u.label.replace(`${u.symbol} — `, '')}
                            </span>
                          </div>

                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#FF6B1F] shrink-0 ml-1" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé informativo */}
          <div className="p-2 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex items-center justify-between text-[10px] text-[#171A1F]/60">
            <span>Padrão CONCE / SINAPI / SICRO</span>
            {normalizedCurrent && (
              <span className="font-mono font-bold text-[#294C87]">Ativo: {normalizedCurrent}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
