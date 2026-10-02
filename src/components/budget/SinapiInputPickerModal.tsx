/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Selecionar Insumo diretamente do Catálogo SINAPI
 * Usado pelo CompositionEditModal para adicionar insumos com coeficiente e preço comprovado.
 */

import React, { useState, useMemo } from 'react'
import {
  X,
  Search,
  Filter,
  Check,
  Building2,
  Calendar,
  AlertCircle,
  Layers,
  Sparkles,
  Info,
  SlidersHorizontal,
} from 'lucide-react'
import { SinapiCatalogItem } from '@/types/sinapi'
import { getConsolidatedSinapiCatalog, getSinapiImportMetadata } from '@/lib/sinapiStorage'
import { formatCurrencyBRL } from '@/lib/formatters'
import { SPECIALTIES_LIST } from '@/lib/compositionsData'

interface SinapiInputPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: SinapiCatalogItem, coefficient: number) => void
  initialCategory?: string
}

export const SinapiInputPickerModal: React.FC<SinapiInputPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [search, setSearch] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('Todas')
  const [selectedCategory, setSelectedCategory] = useState<string>('todas')
  const [selectedType, setSelectedType] = useState<'todos' | 'insumo' | 'composicao'>('todos')
  const [coefficientInput, setCoefficientInput] = useState<number>(1.0)
  const [selectedItem, setSelectedItem] = useState<SinapiCatalogItem | null>(null)

  const metadata = useMemo(() => getSinapiImportMetadata(), [isOpen])
  const catalog = useMemo(() => {
    if (!isOpen) return []
    return getConsolidatedSinapiCatalog()
  }, [isOpen])

  // Filtragem memoizada e busca por palavras-chave
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    const tokens = q ? q.split(/\s+/) : []

    return catalog.filter((item) => {
      // Tipo
      if (selectedType !== 'todos' && item.type !== selectedType) {
        return false
      }

      // Categoria
      if (selectedCategory !== 'todas' && item.category !== selectedCategory) {
        return false
      }

      // Especialidade
      if (selectedSpecialty !== 'Todas' && item.specialty !== selectedSpecialty) {
        return false
      }

      // Busca por tokens (descrição, código ou código numérico)
      if (tokens.length > 0) {
        const fullTarget =
          `${item.code} ${item.numericCode} ${item.description} ${item.specialty} ${item.unit}`.toLowerCase()
        const matchesAll = tokens.every((tok) => fullTarget.includes(tok))
        if (!matchesAll) return false
      }

      return true
    })
  }, [catalog, search, selectedType, selectedCategory, selectedSpecialty])

  if (!isOpen) return null

  const handleConfirmSelection = (itemToSelect?: SinapiCatalogItem) => {
    const target = itemToSelect || selectedItem
    if (!target) return
    const coef = coefficientInput > 0 ? coefficientInput : 1.0
    onSelect(target, coef)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-[#171A1F]/20 overflow-hidden">
        {/* Header CONCE */}
        <div className="p-4 sm:p-5 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-[#294C87] text-white">
              <Building2 className="w-5 h-5 text-[#FF6B1F]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold">
                  Catálogo SINAPI Oficial / Referência
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#FF6B1F]/20 text-[#FF6B1F] text-[10px] font-extrabold uppercase">
                  CPU CONCE
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/70">
                Selecione insumos ou composições para alimentar o custo da composição
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

        {/* Barra de Filtros rápidos */}
        <div className="p-3 sm:p-4 border-b border-[#171A1F]/10 bg-[#F8F9FA] space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#171A1F]/40 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por código SINAPI (ex: 88309, 1379, 87255) ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#171A1F]/20 text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-white border border-[#171A1F]/20 text-xs font-semibold focus:outline-none focus:border-[#294C87]"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="insumo">Insumos (Materiais/MO)</option>
                <option value="composicao">Composições SINAPI</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-[#171A1F]/20 text-xs font-semibold focus:outline-none focus:border-[#294C87]"
              >
                <option value="todas">Todas Categorias</option>
                <option value="material">Material</option>
                <option value="mao_de_obra">Mão de Obra</option>
                <option value="equipamento">Equipamento</option>
                <option value="servico_terceiro">Terceiros</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#171A1F]/60">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>{filteredItems.length} itens encontrados</span>
              <span>•</span>
              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 font-medium">
                Valores de referência editáveis (variação por UF/mês)
              </span>
            </div>

            {metadata && (
              <span className="hidden sm:inline text-[#294C87] font-semibold">
                Tabela importada: {metadata.referenceState} ({metadata.referenceMonth})
              </span>
            )}
          </div>
        </div>

        {/* Relação de Itens SINAPI */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 divide-y divide-[#171A1F]/5">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <AlertCircle className="w-8 h-8 text-[#171A1F]/30 mx-auto" />
              <p className="text-sm font-semibold text-[#171A1F]">Nenhum item SINAPI localizado</p>
              <p className="text-xs text-[#171A1F]/50">
                Tente buscar pelo código numérico ou termos genéricos como "pedreiro",
                "porcelanato", "cabo".
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`pt-2.5 pb-2.5 px-3 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#294C87]/10 border-2 border-[#294C87]'
                      : 'hover:bg-[#F8F9FA] border border-transparent'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#294C87] text-white">
                        {item.code}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-[#171A1F]/5 text-[#171A1F]/80">
                        {item.type === 'composicao' ? 'Composição' : 'Insumo'}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#FF6B1F]/10 text-[#FF6B1F]">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-semibold text-[#171A1F]/60">
                        Unid.: <strong className="text-[#171A1F]">{item.unit}</strong>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-[#171A1F]/70">
                        {item.priceOrigin === 'api_autosinapi'
                          ? `autoSINAPI (${item.referenceState || 'UF'})`
                          : item.priceOrigin === 'api_orcamentador'
                            ? `Orçamentador (${item.referenceState || 'UF'})`
                            : item.priceOrigin === 'importada_usuario'
                              ? `Importado (${item.referenceState || 'UF'})`
                              : 'Referência Embutida'}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-[#171A1F] leading-snug">
                      {item.description}
                    </p>

                    {item.notes && (
                      <p className="text-[11px] text-[#171A1F]/50 italic">{item.notes}</p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 border-t sm:border-t-0 border-[#171A1F]/10 pt-2 sm:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-[#171A1F]/50 uppercase block">
                        Ref. Base / {item.unit}
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-[#FF6B1F]">
                        {formatCurrencyBRL(item.referencePrice)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConfirmSelection(item)
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 text-[#FF6B1F]" />
                      <span>Inserir</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé com ajuste de coeficiente e confirmação */}
        <div className="p-3 sm:p-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#171A1F] whitespace-nowrap">
              Coeficiente de Consumo:
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={coefficientInput}
              onChange={(e) => setCoefficientInput(parseFloat(e.target.value) || 1)}
              className="w-24 px-2 py-1 rounded-lg border border-[#171A1F]/20 text-xs font-bold text-[#FF6B1F] bg-white text-right focus:outline-none focus:border-[#294C87]"
            />
            {selectedItem && (
              <span className="text-xs text-[#171A1F]/60">
                Subtotal:{' '}
                <strong className="text-[#171A1F]">
                  {formatCurrencyBRL((selectedItem.referencePrice || 0) * (coefficientInput || 1))}
                </strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#171A1F]/20 hover:bg-white text-xs font-semibold text-[#171A1F]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!selectedItem}
              onClick={() => handleConfirmSelection()}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedItem
                  ? 'bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white shadow-md cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Adicionar Insumo à CPU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
