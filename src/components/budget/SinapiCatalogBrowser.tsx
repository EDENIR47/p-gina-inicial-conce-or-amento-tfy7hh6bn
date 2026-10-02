/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Navegador Completo do Catálogo SINAPI (Tabela de Consulta Técnica)
 * Busca performática memoizada, paginação, filtros por tipo, categoria, especialidade e origem.
 * Permite criar nova composição CONCE a partir de um item SINAPI ou inspecionar detalhes.
 */

import React, { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  Building2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileSpreadsheet,
  Info,
  CheckCircle2,
  Tag,
  ArrowUpDown,
  BookOpen,
  Globe,
  RefreshCw,
} from 'lucide-react'
import { SinapiCatalogItem } from '@/types/sinapi'
import { formatCurrencyBRL } from '@/lib/formatters'
import { SPECIALTIES_LIST } from '@/lib/compositionsData'
import { getSinapiImportMetadata } from '@/lib/sinapiStorage'

interface SinapiCatalogBrowserProps {
  catalog: SinapiCatalogItem[]
  onSelectToNewComposition?: (item: SinapiCatalogItem) => void
  onOpenImportModal: () => void
  onOpenSyncApiModal?: () => void
}

const ITEMS_PER_PAGE = 15

export const SinapiCatalogBrowser: React.FC<SinapiCatalogBrowserProps> = ({
  catalog,
  onSelectToNewComposition,
  onOpenImportModal,
  onOpenSyncApiModal,
}) => {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<'todos' | 'insumo' | 'composicao'>('todos')
  const [selectedCategory, setSelectedCategory] = useState<string>('todas')
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('Todas')
  const [selectedOrigin, setSelectedOrigin] = useState<
    'todos' | 'referencia_embutida' | 'importada_usuario' | 'api_orcamentador'
  >('todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'code' | 'description' | 'price'>('description')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const metadata = useMemo(() => getSinapiImportMetadata(), [catalog])

  // Filtragem e busca indexada por tokens
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    const tokens = q ? q.split(/\s+/) : []

    const list = catalog.filter((item) => {
      if (selectedType !== 'todos' && item.type !== selectedType) return false
      if (selectedCategory !== 'todas' && item.category !== selectedCategory) return false
      if (selectedSpecialty !== 'Todas' && item.specialty !== selectedSpecialty) return false
      if (selectedOrigin !== 'todos' && item.priceOrigin !== selectedOrigin) return false

      if (tokens.length > 0) {
        const targetStr =
          `${item.code} ${item.numericCode} ${item.description} ${item.specialty} ${item.unit} ${item.category}`.toLowerCase()
        if (!tokens.every((tok) => targetStr.includes(tok))) return false
      }

      return true
    })

    // Ordenação
    list.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'code') {
        comparison = a.code.localeCompare(b.code)
      } else if (sortBy === 'price') {
        comparison = a.referencePrice - b.referencePrice
      } else {
        comparison = a.description.localeCompare(b.description)
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return list
  }, [
    catalog,
    search,
    selectedType,
    selectedCategory,
    selectedSpecialty,
    selectedOrigin,
    sortBy,
    sortOrder,
  ])

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE))
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredItems.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredItems, currentPage])

  // Volta à página 1 quando filtros mudam
  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val)
    setCurrentPage(1)
  }

  const toggleSort = (field: 'code' | 'description' | 'price') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  return (
    <div className="space-y-4">
      {/* Banner de Origem e Metadados Técnicos */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#171A1F] to-[#294C87] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF6B1F] text-white text-[10px] font-extrabold uppercase tracking-wider">
              Base SINAPI / Caixa Econômica Federal
            </span>
            <span className="text-xs text-white/70">
              Total disponível: <strong className="text-white">{catalog.length} itens</strong>
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold">
            Catálogo Oficial SINAPI e Preços de Referência
          </h3>
          <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
            Insumos de mão de obra qualificada, materiais de construção civil, revestimentos,
            pintura e instalações.
            <strong className="text-[#FF6B1F] ml-1">Preços de referência editáveis</strong>{' '}
            (sujeitos à variação por estado e mês oficial).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {metadata ? (
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-xs">
              <span className="block font-bold text-[#FF6B1F]">
                {metadata.sourceType === 'api_orcamentador'
                  ? 'Tabela Oficial (API Orçamentador)'
                  : 'Tabela Importada pelo Usuário'}
              </span>
              <span className="text-[11px] text-white/80">
                {metadata.referenceState} • Mês {metadata.referenceMonth} ({metadata.itemsCount}{' '}
                itens)
              </span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-xs">
              <span className="block font-bold text-white">Referência Embutida</span>
              <span className="text-[11px] text-white/70">Padrão Nacional / RS (04/2025)</span>
            </div>
          )}

          {onOpenSyncApiModal && (
            <button
              type="button"
              onClick={onOpenSyncApiModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs font-bold transition-all shadow-md cursor-pointer whitespace-nowrap hover:-translate-y-0.5"
              title="Sincronizar acervo completo via API Orçamentador"
            >
              <Globe className="w-4 h-4" />
              <span>Sincronizar Oficial (API)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenImportModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer whitespace-nowrap"
            title="Importação manual alternativa via CSV ou JSON"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar CSV/JSON</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-[#171A1F]/10 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#171A1F]/40 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Pesquisar no catálogo SINAPI por código (ex: 88309, 1379, 87255) ou descrição..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
            />
          </div>

          {/* Filtro por Tipo */}
          <div className="w-full sm:w-48">
            <select
              value={selectedType}
              onChange={(e) => handleFilterChange(setSelectedType, e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#294C87] cursor-pointer"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="insumo">Insumos (Materiais/MO)</option>
              <option value="composicao">Composições SINAPI</option>
            </select>
          </div>

          {/* Filtro por Categoria de Insumo */}
          <div className="w-full sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => handleFilterChange(setSelectedCategory, e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#294C87] cursor-pointer"
            >
              <option value="todas">Todas as Categorias</option>
              <option value="material">Material</option>
              <option value="mao_de_obra">Mão de Obra</option>
              <option value="equipamento">Equipamento</option>
              <option value="servico_terceiro">Serviços de Terceiros</option>
            </select>
          </div>

          {/* Filtro por Origem do Preço */}
          <div className="w-full sm:w-48">
            <select
              value={selectedOrigin}
              onChange={(e) => handleFilterChange(setSelectedOrigin, e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#294C87] cursor-pointer"
            >
              <option value="todos">Todas as Origens</option>
              <option value="api_orcamentador">API Orçamentador (Oficial)</option>
              <option value="importada_usuario">Importada pelo Usuário</option>
              <option value="referencia_embutida">Ref. Embutida (Padrão)</option>
            </select>
          </div>
        </div>

        {/* Chips de Especialidades */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {SPECIALTIES_LIST.map((spec) => {
            const isSelected = selectedSpecialty === spec
            return (
              <button
                key={spec}
                type="button"
                onClick={() => handleFilterChange(setSelectedSpecialty, spec)}
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

      {/* Relação Tabular de Itens do Catálogo */}
      <div className="bg-white rounded-2xl border border-[#171A1F]/10 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-[#171A1F]/30 mx-auto" />
            <h4 className="text-base font-bold text-[#171A1F]">
              Nenhum item localizado no catálogo SINAPI
            </h4>
            <p className="text-xs text-[#171A1F]/60 max-w-sm mx-auto">
              Tente buscar por termos mais genéricos ou use o botão de "Importar Tabela UF/Mês" para
              carregar novas tabelas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#171A1F]/5 text-[#171A1F] font-bold text-[10px] uppercase border-b border-[#171A1F]/10">
                <tr>
                  <th
                    className="py-3 px-3.5 cursor-pointer hover:bg-[#171A1F]/10 transition-colors w-32"
                    onClick={() => toggleSort('code')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Código</span>
                      <ArrowUpDown className="w-3 h-3 text-[#171A1F]/40" />
                    </div>
                  </th>
                  <th className="py-3 px-3 w-24">Tipo / Cat.</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-[#171A1F]/10 transition-colors"
                    onClick={() => toggleSort('description')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Descrição Técnica SINAPI</span>
                      <ArrowUpDown className="w-3 h-3 text-[#171A1F]/40" />
                    </div>
                  </th>
                  <th className="py-3 px-3 w-32">Especialidade</th>
                  <th className="py-3 px-3 w-16 text-center">Unid.</th>
                  <th
                    className="py-3 px-3.5 text-right cursor-pointer hover:bg-[#171A1F]/10 transition-colors w-36"
                    onClick={() => toggleSort('price')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Preço Ref. (R$)</span>
                      <ArrowUpDown className="w-3 h-3 text-[#171A1F]/40" />
                    </div>
                  </th>
                  <th className="py-3 px-3 w-36">Origem Preço</th>
                  <th className="py-3 px-3 text-center w-28">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171A1F]/5">
                {paginatedItems.map((item) => {
                  const isCustom = item.priceOrigin === 'importada_usuario'

                  return (
                    <tr key={item.id} className="hover:bg-[#171A1F]/[0.02] transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-[#294C87] whitespace-nowrap">
                        {item.code}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              item.type === 'composicao'
                                ? 'bg-[#294C87]/15 text-[#294C87]'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="block text-[10px] text-[#171A1F]/60 font-medium">
                            {item.category}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-semibold text-[#171A1F] text-xs leading-snug">
                          {item.description}
                        </p>
                        {item.notes && (
                          <span className="text-[11px] text-[#171A1F]/50 italic block mt-0.5">
                            {item.notes}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[#171A1F]/70 font-medium whitespace-nowrap">
                        {item.specialty}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-[#171A1F]">
                        {item.unit}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <span className="font-mono font-extrabold text-sm text-[#FF6B1F]">
                          {formatCurrencyBRL(item.referencePrice)}
                        </span>
                        <span className="block text-[9px] text-[#171A1F]/40 uppercase font-semibold">
                          ref. editável
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.priceOrigin === 'api_orcamentador' ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-[#294C87] border border-[#294C87]/20 text-[10px] font-extrabold block w-fit">
                              API Orçamentador
                            </span>
                            <span className="text-[10px] text-[#171A1F]/60">
                              {item.referenceState || 'UF'} • {item.referenceMonth || 'Atual'}
                            </span>
                          </div>
                        ) : isCustom ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold block w-fit">
                              Tabela Usuário
                            </span>
                            <span className="text-[10px] text-[#171A1F]/60">
                              {item.referenceState || 'UF'} • {item.referenceMonth || 'Ref'}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-[#171A1F]/70 text-[10px] font-semibold block w-fit">
                              Referência Embutida
                            </span>
                            <span className="text-[10px] text-[#171A1F]/50">
                              {item.referenceMonth || '04/2025'}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {onSelectToNewComposition && (
                          <button
                            type="button"
                            onClick={() => onSelectToNewComposition(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#294C87]/10 hover:bg-[#294C87] text-[#294C87] hover:text-white text-[11px] font-bold transition-all shadow-xs"
                            title="Criar nova Composição CONCE a partir deste item"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#FF6B1F]" />
                            <span>Criar CPU</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé de Paginação */}
        <div className="p-3.5 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#171A1F]/70">
          <div>
            Mostrando <strong>{paginatedItems.length}</strong> de{' '}
            <strong>{filteredItems.length}</strong> itens filtrados ({catalog.length} total no
            banco).
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#171A1F]/20 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-semibold text-[#171A1F] px-2">
              Página {currentPage} de {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#171A1F]/20 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
