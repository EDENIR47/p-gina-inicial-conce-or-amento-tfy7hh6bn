/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Tela Completa da Curva ABC (Princípio de Pareto)
 *
 * Funcionalidades Avançadas e Integridade de Custos:
 * - Padrão CONCE: Valor de Venda com BDI (reflete fielmente o orçamento comercial do cliente)
 * - Alternância opcional para Custo Direto (com encargos sociais de acordo com o regime tributário)
 * - Visão dupla: Curva ABC de Insumos (Materiais/Mão de Obra/Equipamentos) e Curva ABC de Serviços
 * - Exibição explícita de Custo Direto vs. Venda c/ BDI na tabela analítica
 * - Classificação rigorosa de Pareto (Engenharia de Custos):
 *     Classe A: até ~80% do valor acumulado
 *     Classe B: de ~80% a ~95%
 *     Classe C: os 5% restantes
 * - Destaque visual Pumpkin Orange para Classe A
 * - Filtros rápidos por Categoria e por Classe (A, B, C)
 * - Busca instantânea e modal de cotação integrado
 */

import React, { useState, useMemo } from 'react'
import {
  Layers,
  Search,
  Award,
  TrendingUp,
  Download,
  ShoppingBag,
  ChevronDown,
  DollarSign,
  Briefcase,
  Package,
} from 'lucide-react'
import { FullBudget } from '@/types/budgetEngine'
import { AbcCalculatedItem, AbcAnalysisMode, AbcValueBasis } from '@/types/intelligence'
import { computeAbcCurve } from '@/lib/abcAnalysis'
import { formatCurrencyBRL } from '@/lib/formatters'
import { exportBudgetSpreadsheet } from '@/lib/exportSpreadsheet'
import { QuoteComparisonModal } from '@/components/budget/QuoteComparisonModal'
import { getStoredQuotes, createNewQuoteComparison } from '@/lib/intelligenceStorage'

interface AbcCurveScreenProps {
  budget: FullBudget
  onOpenQuotesTab?: () => void
}

export const AbcCurveScreen: React.FC<AbcCurveScreenProps> = ({ budget }) => {
  // Configurações de análise da Curva ABC
  // Padrão CONCE: 'venda_bdi' (valor de venda com BDI)
  const [valueBasis, setValueBasis] = useState<AbcValueBasis>('venda_bdi')
  // Visão: 'insumos' (padrão) ou 'servicos'
  const [analysisMode, setAnalysisMode] = useState<AbcAnalysisMode>('insumos')

  const [categoryFilter, setCategoryFilter] = useState<string>('todos')
  const [classFilter, setClassFilter] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  // Modal de Cotação
  const [selectedQuoteComparison, setSelectedQuoteComparison] = useState<any | null>(null)
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)

  // Cálculo da Curva ABC em tempo real sobre os dados do orçamento ativo
  const abc = useMemo(
    () =>
      computeAbcCurve(budget, {
        mode: analysisMode,
        valueBasis,
      }),
    [budget, analysisMode, valueBasis],
  )

  // Filtragem dos itens da lista
  const filteredItems = useMemo(() => {
    return abc.allItems.filter((item) => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCat = categoryFilter === 'todos' || item.category === categoryFilter
      const matchesClass = classFilter === 'todos' || item.classification === classFilter

      return matchesSearch && matchesCat && matchesClass
    })
  }, [abc.allItems, searchTerm, categoryFilter, classFilter])

  // Abertura rápida do comparativo de cotação para o insumo
  const handleOpenQuoteForInput = (item: AbcCalculatedItem) => {
    const existingQuotes = getStoredQuotes(budget.id)
    let comp = existingQuotes.find((q) => q.inputCode === item.code)

    if (!comp) {
      comp = createNewQuoteComparison(
        budget.id,
        item.code,
        item.description,
        item.unit,
        item.category === 'servico' ? 'servico_terceiro' : item.category,
        item.unitCost,
        item.totalQuantity,
      )
    }

    setSelectedQuoteComparison(comp)
    setIsQuoteModalOpen(true)
  }

  const isBasisBdi = valueBasis === 'venda_bdi'

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Cabeçalho da Curva ABC */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#171A1F]/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF6B1F]/15 text-[#FF6B1F] text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              Inteligência de Custos • Princípio de Pareto
            </span>
            <span className="text-xs text-[#171A1F]/50 hidden sm:inline">
              • Orçamento: <strong>{budget.code}</strong> — {budget.title || budget.work.name}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] tracking-tight">
            Curva ABC {analysisMode === 'servicos' ? 'de Serviços' : 'de Insumos'}
          </h2>

          <p className="text-xs sm:text-sm text-[#171A1F]/70 mt-0.5">
            Classificação rigorosa em <strong>Classe A</strong> (~80% do valor),{' '}
            <strong>Classe B</strong> (~80–95%) e <strong>Classe C</strong> (demais itens). Base
            ativa:{' '}
            <strong className="text-[#FF6B1F]">
              {isBasisBdi ? 'Valor de Venda com BDI (Padrão CONCE)' : 'Custo Direto'}
            </strong>
            .
          </p>
        </div>

        {/* Controles de Modo e Base de Valor */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Modo: Insumos vs Serviços */}
          <div className="inline-flex rounded-xl p-1 bg-[#171A1F]/5 border border-[#171A1F]/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAnalysisMode('insumos')
                setCategoryFilter('todos')
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                analysisMode === 'insumos'
                  ? 'bg-[#294C87] text-white shadow-xs'
                  : 'text-[#171A1F]/70 hover:text-[#171A1F]'
              }`}
              title="Curva ABC consolidada por Insumos (materiais, mão de obra, equipamentos)"
            >
              <Package className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>Insumos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAnalysisMode('servicos')
                setCategoryFilter('todos')
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                analysisMode === 'servicos'
                  ? 'bg-[#294C87] text-white shadow-xs'
                  : 'text-[#171A1F]/70 hover:text-[#171A1F]'
              }`}
              title="Curva ABC macro por Serviços da Obra"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>Serviços</span>
            </button>
          </div>

          {/* Seletor de Base: Venda c/ BDI vs Custo Direto */}
          <div className="inline-flex rounded-xl p-1 bg-[#171A1F]/5 border border-[#171A1F]/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setValueBasis('venda_bdi')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                isBasisBdi
                  ? 'bg-[#FF6B1F] text-white shadow-xs'
                  : 'text-[#171A1F]/70 hover:text-[#171A1F]'
              }`}
              title="Classificação pelo Valor de Venda com BDI (Padrão CONCE)"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Venda c/ BDI</span>
            </button>
            <button
              type="button"
              onClick={() => setValueBasis('custo_direto')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                !isBasisBdi
                  ? 'bg-[#294C87] text-white shadow-xs'
                  : 'text-[#171A1F]/70 hover:text-[#171A1F]'
              }`}
              title="Classificação pelo Custo Direto com Encargos Sociais"
            >
              <span>Custo Direto</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportBudgetSpreadsheet(budget, 'abc')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#171A1F]/20 hover:border-[#294C87] text-xs font-bold text-[#171A1F] transition-all shadow-xs cursor-pointer"
            title="Exportar planilha analítica da Curva ABC em CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#294C87]" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE METAS E CONCENTRAÇÃO PARETO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CLASSE A - DESTAQUE EM PUMPKIN ORANGE */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#FF6B1F]/15 via-white to-white border-2 border-[#FF6B1F] shadow-[0_4px_20px_rgba(255,107,31,0.12)] space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#FF6B1F] text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                A
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-[#171A1F]">
                Classe A • Prioridade Máxima
              </h3>
            </div>
            <span className="font-mono text-xs font-extrabold text-[#FF6B1F] px-2 py-0.5 rounded bg-[#FF6B1F]/10">
              {abc.classA.percentageOfCost}% do Total
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] tracking-tight">
              {formatCurrencyBRL(abc.classA.evaluatedValue)}
            </div>
            <p className="text-xs text-[#171A1F]/70">
              Apenas{' '}
              <strong>
                {abc.classA.itemsCount} {analysisMode === 'servicos' ? 'serviços' : 'insumos'}
              </strong>{' '}
              ({abc.classA.percentageOfItems}% do total) concentram{' '}
              <strong>{abc.classA.percentageOfCost}%</strong> do orçamento (
              {isBasisBdi ? 'Venda c/ BDI' : 'Custo Direto'}).
            </p>
            <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-[#171A1F]/60">
              <span>
                Venda: <strong>{formatCurrencyBRL(abc.classA.totalSalePrice)}</strong>
              </span>
              <span>•</span>
              <span>
                Direto: <strong>{formatCurrencyBRL(abc.classA.totalCost)}</strong>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#FF6B1F]/20 text-[11px] text-[#FF6B1F] font-semibold flex items-center gap-1">
            <Award className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Foco prioritário da CONCE para cotações e negociação direta.</span>
          </div>
        </div>

        {/* CLASSE B - COBALT */}
        <div className="p-5 rounded-2xl bg-white border border-[#294C87]/30 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#294C87] text-white flex items-center justify-center font-extrabold text-xs">
                B
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-[#171A1F]">
                Classe B • Atenção Moderada
              </h3>
            </div>
            <span className="font-mono text-xs font-extrabold text-[#294C87] px-2 py-0.5 rounded bg-[#294C87]/10">
              {abc.classB.percentageOfCost}% do Total
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] tracking-tight">
              {formatCurrencyBRL(abc.classB.evaluatedValue)}
            </div>
            <p className="text-xs text-[#171A1F]/70">
              <strong>
                {abc.classB.itemsCount} {analysisMode === 'servicos' ? 'serviços' : 'insumos'}
              </strong>{' '}
              ({abc.classB.percentageOfItems}% do total) compõem a faixa intermediária de controle
              (80% a 95%).
            </p>
            <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-[#171A1F]/60">
              <span>
                Venda: <strong>{formatCurrencyBRL(abc.classB.totalSalePrice)}</strong>
              </span>
              <span>•</span>
              <span>
                Direto: <strong>{formatCurrencyBRL(abc.classB.totalCost)}</strong>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#171A1F]/10 text-[11px] text-[#171A1F]/60">
            Monitoramento de tabelas de referência e índices de reajuste.
          </div>
        </div>

        {/* CLASSE C - MIRAGE */}
        <div className="p-5 rounded-2xl bg-white border border-[#171A1F]/15 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#171A1F] text-white flex items-center justify-center font-extrabold text-xs">
                C
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-[#171A1F]">
                Classe C • Itens Secundários
              </h3>
            </div>
            <span className="font-mono text-xs font-extrabold text-[#171A1F]/80 px-2 py-0.5 rounded bg-[#171A1F]/10">
              {abc.classC.percentageOfCost}% do Total
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] tracking-tight">
              {formatCurrencyBRL(abc.classC.evaluatedValue)}
            </div>
            <p className="text-xs text-[#171A1F]/70">
              <strong>
                {abc.classC.itemsCount} {analysisMode === 'servicos' ? 'serviços' : 'insumos'}
              </strong>{' '}
              ({abc.classC.percentageOfItems}% do total) somam apenas{' '}
              <strong>{abc.classC.percentageOfCost}%</strong> do orçamento.
            </p>
            <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-[#171A1F]/60">
              <span>
                Venda: <strong>{formatCurrencyBRL(abc.classC.totalSalePrice)}</strong>
              </span>
              <span>•</span>
              <span>
                Direto: <strong>{formatCurrencyBRL(abc.classC.totalCost)}</strong>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#171A1F]/10 text-[11px] text-[#171A1F]/60">
            Itens de menor valor individual, consumo sob demanda e almoxarifado.
          </div>
        </div>
      </div>

      {/* BARRA VISUAL DE DISTRIBUIÇÃO ACUMULADA */}
      <div className="bg-white p-4 rounded-xl border border-[#171A1F]/10 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold text-[#171A1F]">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#FF6B1F]" />
            Curva de Distribuição Cumulativa ({isBasisBdi ? 'Venda com BDI' : 'Custo Direto'})
          </span>
          <div className="flex items-center gap-3 font-mono text-xs text-[#171A1F]/70">
            <span>
              Total Analisado:{' '}
              <strong className="text-[#FF6B1F]">
                {formatCurrencyBRL(abc.totalAnalyzedValue)}
              </strong>
            </span>
            <span>•</span>
            <span>
              Custo Direto: <strong>{formatCurrencyBRL(abc.totalDirectCost)}</strong>
            </span>
            <span>•</span>
            <span>
              Venda c/ BDI: <strong>{formatCurrencyBRL(abc.totalSalePrice)}</strong>
            </span>
          </div>
        </div>

        <div className="h-4 w-full bg-[#171A1F]/10 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${abc.classA.percentageOfCost}%` }}
            className="h-full bg-[#FF6B1F] flex items-center justify-center text-[10px] font-extrabold text-white"
            title={`Classe A: ${abc.classA.percentageOfCost}%`}
          >
            A ({abc.classA.percentageOfCost}%)
          </div>

          <div
            style={{ width: `${abc.classB.percentageOfCost}%` }}
            className="h-full bg-[#294C87] border-l border-white/40 flex items-center justify-center text-[10px] font-bold text-white"
            title={`Classe B: ${abc.classB.percentageOfCost}%`}
          >
            B ({abc.classB.percentageOfCost}%)
          </div>

          <div
            style={{ width: `${abc.classC.percentageOfCost}%` }}
            className="h-full bg-[#171A1F] border-l border-white/40 flex items-center justify-center text-[10px] font-bold text-white"
            title={`Classe C: ${abc.classC.percentageOfCost}%`}
          >
            C
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS E BUSCA */}
      <div className="bg-white p-4 rounded-xl border border-[#171A1F]/10 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#171A1F]/40 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={
              analysisMode === 'servicos'
                ? 'Buscar serviço por código, descrição ou palavra-chave...'
                : 'Buscar insumo por código, descrição ou palavra-chave...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#F8F9FA] border border-[#171A1F]/20 text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
          />
        </div>

        <div className="w-full sm:w-44">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-[#F8F9FA] border border-[#171A1F]/20 text-xs font-semibold focus:outline-none focus:border-[#294C87]"
          >
            <option value="todos">Todas as Classes (A, B, C)</option>
            <option value="A">Somente Classe A</option>
            <option value="B">Somente Classe B</option>
            <option value="C">Somente Classe C</option>
          </select>
        </div>

        {analysisMode === 'insumos' && (
          <div className="w-full sm:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#F8F9FA] border border-[#171A1F]/20 text-xs font-semibold focus:outline-none focus:border-[#294C87]"
            >
              <option value="todos">Todas as Categorias</option>
              <option value="material">Materiais</option>
              <option value="mao_de_obra">Mão de Obra</option>
              <option value="equipamento">Equipamentos</option>
              <option value="servico_terceiro">Terceiros</option>
            </select>
          </div>
        )}
      </div>

      {/* TABELA PRINCIPAL DA CURVA ABC */}
      <div className="bg-white rounded-2xl border border-[#171A1F]/15 shadow-xs overflow-hidden">
        <div className="p-4 bg-[#171A1F] text-white flex items-center justify-between">
          <span className="font-extrabold text-xs sm:text-sm uppercase tracking-wider">
            Ranking Decrescente ({filteredItems.length} de {abc.totalItemsCount}) —{' '}
            {analysisMode === 'servicos' ? 'Serviços' : 'Insumos'} da Obra
          </span>
          <span className="text-[11px] text-white/70">
            Base:{' '}
            <strong className="text-[#FF6B1F]">
              {isBasisBdi ? 'Venda com BDI' : 'Custo Direto'}
            </strong>{' '}
            • Destaque: Classe A
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] text-[#171A1F]/70 uppercase text-[10px] font-bold border-b border-[#171A1F]/10">
              <tr>
                <th className="py-3 px-3 w-14 text-center">Rank</th>
                <th className="py-3 px-3 w-16 text-center">Classe</th>
                <th className="py-3 px-3 w-28">Código</th>
                <th className="py-3 px-4">
                  Descrição do {analysisMode === 'servicos' ? 'Serviço' : 'Insumo'}
                </th>
                {analysisMode === 'insumos' && <th className="py-3 px-3 w-24">Categoria</th>}
                <th className="py-3 px-3 w-20 text-right">Qtd. Total</th>
                <th className="py-3 px-3 w-24 text-right">Custo Direto</th>
                <th className="py-3 px-3 w-28 text-right">Venda c/ BDI</th>
                <th className="py-3 px-3 w-28 text-right bg-[#FF6B1F]/5 text-[#FF6B1F]">
                  Valor Base ({isBasisBdi ? 'Venda' : 'Direto'})
                </th>
                <th className="py-3 px-2 w-16 text-right">Peso %</th>
                <th className="py-3 px-3 w-20 text-right">% Acum.</th>
                <th className="py-3 px-3 w-24 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171A1F]/10">
              {filteredItems.map((item) => {
                const isClassA = item.classification === 'A'
                const isExpanded = expandedItem === item.id

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`transition-colors ${
                        isClassA
                          ? 'bg-[#FF6B1F]/[0.08] hover:bg-[#FF6B1F]/[0.13] font-medium'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                            isClassA
                              ? 'bg-[#FF6B1F] text-white shadow-xs'
                              : 'bg-[#171A1F]/10 text-[#171A1F]'
                          }`}
                        >
                          {item.rank}
                        </span>
                      </td>

                      {/* Classe */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            item.classification === 'A'
                              ? 'bg-[#FF6B1F] text-white'
                              : item.classification === 'B'
                                ? 'bg-[#294C87] text-white'
                                : 'bg-[#171A1F]/20 text-[#171A1F]'
                          }`}
                        >
                          Classe {item.classification}
                        </span>
                      </td>

                      {/* Código */}
                      <td className="py-3 px-3 font-mono font-bold text-[11px] text-[#294C87]">
                        {item.code}
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#171A1F] text-xs sm:text-sm">
                          {item.description}
                        </div>
                        {item.servicesCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                            className="text-[10px] text-[#294C87] hover:underline font-semibold flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <span>
                              {analysisMode === 'servicos'
                                ? `Presente em ${item.servicesCount} etapa(s)`
                                : `Presente em ${item.servicesCount} serviço(s)`}
                            </span>
                            <ChevronDown
                              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                        )}
                      </td>

                      {/* Categoria */}
                      {analysisMode === 'insumos' && (
                        <td className="py-3 px-3 uppercase text-[10px] font-semibold text-[#171A1F]/60">
                          {item.category.replace('_', ' ')}
                        </td>
                      )}

                      {/* Quantidade Total */}
                      <td className="py-3 px-3 text-right font-mono text-[11px] whitespace-nowrap">
                        {item.totalQuantity.toLocaleString('pt-BR')} {item.unit}
                      </td>

                      {/* Custo Direto */}
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-[#171A1F]/80">
                        {formatCurrencyBRL(item.totalCost)}
                        <span className="block text-[9px] text-[#171A1F]/50">
                          {formatCurrencyBRL(item.unitCost)}/{item.unit}
                        </span>
                      </td>

                      {/* Venda c/ BDI */}
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-[#294C87] font-semibold">
                        {formatCurrencyBRL(item.totalSalePrice)}
                        <span className="block text-[9px] text-[#294C87]/70">
                          {formatCurrencyBRL(item.unitSalePrice)}/{item.unit}
                        </span>
                      </td>

                      {/* Valor Base Utilizado no Ranking */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-xs sm:text-sm bg-[#FF6B1F]/5 text-[#171A1F]">
                        {formatCurrencyBRL(item.evaluatedValue)}
                      </td>

                      {/* % Parcela */}
                      <td className="py-3 px-2 text-right font-mono text-[11px] font-semibold text-[#171A1F]/70">
                        {item.percentageOfTotal.toFixed(1)}%
                      </td>

                      {/* % Acumulado */}
                      <td
                        className={`py-3 px-3 text-right font-mono font-extrabold text-xs ${
                          isClassA ? 'text-[#FF6B1F]' : 'text-[#294C87]'
                        }`}
                      >
                        {item.accumulatedPercentage.toFixed(1)}%
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenQuoteForInput(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-[10px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
                          title="Abrir mapa de cotações para este item"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>Cotar</span>
                        </button>
                      </td>
                    </tr>

                    {/* Expansão com os serviços onde o insumo é consumido */}
                    {isExpanded && (
                      <tr className="bg-gray-100/80">
                        <td colSpan={analysisMode === 'insumos' ? 12 : 11} className="py-3 px-6">
                          <div className="space-y-1.5 text-xs">
                            <span className="font-bold text-[#171A1F] block text-[11px] uppercase tracking-wider">
                              {analysisMode === 'servicos'
                                ? 'Apropriação do serviço nas etapas da obra:'
                                : 'Apropriação do insumo nas composições do orçamento:'}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {item.serviceOccurrences.map((occ, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 rounded-lg bg-white border border-[#171A1F]/10 flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <span className="font-mono font-bold text-[#294C87] mr-1.5">
                                      {occ.serviceCode}
                                    </span>
                                    <span className="text-[#171A1F] font-medium">
                                      {occ.serviceDescription}
                                    </span>
                                    <span className="block text-[10px] text-[#171A1F]/50">
                                      Etapa {occ.stageCode}: {occ.stageName}
                                    </span>
                                  </div>
                                  <span className="font-mono font-bold text-[#FF6B1F] text-xs whitespace-nowrap ml-2">
                                    {occ.quantity.toLocaleString('pt-BR')} {item.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cotações Integrado */}
      {selectedQuoteComparison && (
        <QuoteComparisonModal
          comparison={selectedQuoteComparison}
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          onSaved={() => {
            setIsQuoteModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
export default AbcCurveScreen
