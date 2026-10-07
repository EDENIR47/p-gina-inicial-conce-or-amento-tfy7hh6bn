/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Rota Oficial /cotacoes: Módulo Completo de Comparativo de Cotações de Fornecedores
 * - Substitui o antigo StubPage "Em construção"
 * - Integração direta aos orçamentos persistidos em localStorage
 * - Mínimo de 3 cotações por insumo (com indicador visual de conformidade)
 * - Indicador da Melhor Cotação e Média de Mercado
 * - Registro oficial da proposta vencedora com justificativa técnica e homologação
 * - Dispersão de preços e economia potencial frente ao orçamento base
 */

import React, { useState, useEffect } from 'react'
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  ArrowRight,
  TrendingDown,
  Building,
  Edit2,
  Trash2,
  DollarSign,
  Download,
  Calendar,
} from 'lucide-react'
import { FullBudget, InputCategory } from '@/types/budgetEngine'
import { InputQuoteComparison } from '@/types/intelligence'
import { getStoredFullBudgets, purgeTestBudgetsFromStorage } from '@/lib/budgetsStorage'
import { purgeTestIntelligenceData } from '@/lib/intelligenceStorage'
import {
  getStoredQuotes,
  seedQuotesForBudgetIfEmpty,
  saveInputQuoteComparison,
} from '@/lib/intelligenceStorage'
import { formatCurrencyBRL } from '@/lib/formatters'
import { QuoteComparisonModal } from '@/components/budget/QuoteComparisonModal'
import { computeAbcCurve } from '@/lib/abcAnalysis'

export const QuotesScreen: React.FC = () => {
  // Orçamentos disponíveis
  const [budgets] = useState<FullBudget[]>(() => getStoredFullBudgets())
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>(() =>
    budgets.length > 0 ? budgets[0].id : '',
  )

  const activeBudget = budgets.find((b) => b.id === selectedBudgetId) || budgets[0]

  // Limpeza de resíduos de teste
  useEffect(() => {
    purgeTestBudgetsFromStorage()
    purgeTestIntelligenceData()
  }, [])

  // Cotações do orçamento ativo
  const [quotesList, setQuotesList] = useState<InputQuoteComparison[]>([])
  const [selectedComparison, setSelectedComparison] = useState<InputQuoteComparison | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Carrega cotações persistidas do orçamento ativo
  useEffect(() => {
    if (activeBudget) {
      const quotes = getStoredQuotes(activeBudget.id)
      setQuotesList(quotes)
    }
  }, [activeBudget])

  const refreshQuotes = () => {
    if (activeBudget) {
      setQuotesList(getStoredQuotes(activeBudget.id))
    }
  }

  // Estatísticas do Módulo de Cotações
  const totalCotados = quotesList.length
  const homologados = quotesList.filter((q) => q.status === 'homologada').length
  const comTresOuMais = quotesList.filter((q) => q.quotes.length >= 3).length

  // Economia gerada (soma das diferenças entre custo orçado e melhor cotação)
  let totalEconomia = 0
  quotesList.forEach((q) => {
    if (q.quotes.length > 0) {
      const validPrices = q.quotes.map((sq) => sq.unitPrice).filter((p) => p > 0)
      if (validPrices.length > 0) {
        const best = Math.min(...validPrices)
        if (best < q.budgetedUnitCost) {
          totalEconomia += (q.budgetedUnitCost - best) * q.requiredQuantity
        }
      }
    }
  })

  // Insumos da Classe A da Curva ABC disponíveis para adicionar cotação
  const abc = activeBudget ? computeAbcCurve(activeBudget) : null
  const availableClassAInputs = abc
    ? abc.classA.items.filter((it) => !quotesList.some((q) => q.inputCode === it.code))
    : []

  const handleCreateNewQuoteForInput = (item: (typeof availableClassAInputs)[0]) => {
    if (!activeBudget) return
    const resolvedCategory: InputCategory =
      item.category === 'servico' ? 'servico_terceiro' : item.category

    const newComp: InputQuoteComparison = {
      id: `quote-${activeBudget.id}-${item.code}-${Date.now()}`,
      budgetId: activeBudget.id,
      inputCode: item.code,
      inputDescription: item.description,
      unit: item.unit,
      category: resolvedCategory,
      budgetedUnitCost: item.unitCost,
      requiredQuantity: item.totalQuantity,
      quotes: [],
      status: 'aberta',
      lastUpdated: new Date().toISOString(),
    }
    saveInputQuoteComparison(newComp)
    refreshQuotes()
    setSelectedComparison(newComp)
    setIsModalOpen(true)
  }

  const filteredQuotes = quotesList.filter((q) => {
    const matchesSearch =
      q.inputDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.inputCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quotes.some((sq) => sq.supplierName.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'todos' || q.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#171A1F]/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF6B1F]/15 text-[#FF6B1F] text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              Módulo de Suprimentos & Cotações CONCE
            </span>
            <span className="text-xs text-[#171A1F]/50 hidden sm:inline">
              • Equalização Técnica de Mercado
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#171A1F] tracking-tight">
            Comparativo de Cotações
          </h1>

          <p className="text-sm sm:text-base text-[#171A1F]/70 mt-1 max-w-2xl">
            Equalização comercial de fornecedores com no mínimo 3 cotações, indicador de menor
            preço, média de mercado e homologação oficial da proposta vencedora.
          </p>
        </div>

        {/* Seletor de Orçamento Ativo */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#171A1F] whitespace-nowrap">Orçamento:</label>
          <select
            value={selectedBudgetId}
            onChange={(e) => setSelectedBudgetId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#171A1F]/20 text-xs sm:text-sm font-bold text-[#171A1F] focus:outline-none focus:border-[#294C87] shadow-xs"
          >
            {budgets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.work.name.slice(0, 32)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CARDS DE RESUMO E INDICADORES DE SUPRIMENTOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#171A1F]/10 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#171A1F]/60 block">
            Insumos em Cotação
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] block mt-1">
            {totalCotados}
          </span>
          <span className="text-[10px] text-[#171A1F]/50">Mapeados para o orçamento</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#171A1F]/10 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#294C87] block">
            Homologados / Vencedores
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#294C87] block mt-1">
            {homologados} / {totalCotados}
          </span>
          <span className="text-[10px] text-[#294C87]/70 font-semibold">
            {totalCotados > 0 ? Math.round((homologados / totalCotados) * 100) : 0}% concluídos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#171A1F]/10 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#3E8E5A] block">
            Conformidade Mín. 3 Cotações
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#3E8E5A] block mt-1">
            {comTresOuMais} / {totalCotados}
          </span>
          <span className="text-[10px] text-[#3E8E5A]/80 font-semibold">
            {comTresOuMais === totalCotados ? '100% em conformidade' : 'Exige atenção da equipe'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FF6B1F]/15 via-white to-white border-2 border-[#FF6B1F] shadow-xs">
          <span className="text-[10px] uppercase font-extrabold text-[#FF6B1F] block">
            Economia Potencial Gerada
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-[#FF6B1F] block mt-1">
            {formatCurrencyBRL(totalEconomia)}
          </span>
          <span className="text-[10px] text-[#171A1F]/60">vs. Preços base orçados</span>
        </div>
      </div>

      {/* SUGESTÕES DA CLASSE A (ITENS AINDA NÃO COTADOS) */}
      {availableClassAInputs.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#FF6B1F]/5 border border-[#FF6B1F]/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#FF6B1F]" />
              <h3 className="font-extrabold text-sm sm:text-base text-[#171A1F]">
                Insumos de Classe A Pendentes de Cotação ({availableClassAInputs.length})
              </h3>
            </div>
            <span className="text-xs text-[#FF6B1F] font-bold">Prioridade Máxima</span>
          </div>

          <p className="text-xs text-[#171A1F]/70">
            Estes insumos pertencem aos 80% de maior peso no orçamento e ainda não possuem mapa de
            fornecedores cadastrado:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {availableClassAInputs.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-white border border-[#171A1F]/10 flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#294C87] text-white">
                      {item.code}
                    </span>
                    <span className="text-xs font-bold text-[#171A1F] truncate">
                      {item.description}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#171A1F]/60 block mt-0.5">
                    Orçado: {formatCurrencyBRL(item.unitCost)} / {item.unit} • Qtd:{' '}
                    {item.totalQuantity.toLocaleString('pt-BR')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCreateNewQuoteForInput(item)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-[10px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  Criar Mapa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-[#171A1F]/10 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#171A1F]/40 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por código do insumo, descrição ou nome do fornecedor cotado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#294C87]"
          >
            <option value="todos">Todos os Status</option>
            <option value="homologada">Homologadas</option>
            <option value="equalizada">Em Equalização</option>
            <option value="aberta">Abertas / Em Cotação</option>
          </select>
        </div>
      </div>

      {/* CARDS COMPARATIVOS DOS INSUMOS */}
      <div className="space-y-4">
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-[#171A1F]/20 space-y-3">
            <ShoppingBag className="w-12 h-12 text-[#171A1F]/30 mx-auto" />
            <h4 className="text-base font-bold text-[#171A1F]">
              Nenhum mapa de cotação cadastrado ainda
            </h4>
            <p className="text-xs text-[#171A1F]/60 max-w-sm mx-auto">
              Adicione cotações reais para os insumos do orçamento utilizando a lista de sugestões
              de Classe A acima ou criando um mapa personalizado.
            </p>
          </div>
        ) : (
          filteredQuotes.map((comp) => {
            const validPrices = comp.quotes.map((q) => q.unitPrice).filter((p) => p > 0)
            const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0
            const avgPrice =
              validPrices.length > 0
                ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
                : 0

            const winningQuote = comp.quotes.find((q) => q.id === comp.winningQuoteId)
            const isCompliant = comp.quotes.length >= 3

            return (
              <div
                key={comp.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-[#171A1F]/10 hover:border-[#294C87]/40 transition-all space-y-4"
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded bg-[#294C87] text-white">
                        {comp.inputCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          comp.status === 'homologada'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {comp.status === 'homologada' ? 'Homologado' : 'Em Cotação'}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isCompliant ? 'bg-[#3E8E5A]/10 text-[#3E8E5A]' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {isCompliant
                          ? `${comp.quotes.length} Fornecedores (Conforme)`
                          : `${comp.quotes.length}/3 Fornecedores (Pendente)`}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-[#171A1F]">
                      {comp.inputDescription}
                    </h3>

                    <p className="text-xs text-[#171A1F]/60">
                      Demanda da Obra:{' '}
                      <strong className="text-[#171A1F]">
                        {comp.requiredQuantity.toLocaleString('pt-BR')} {comp.unit}
                      </strong>{' '}
                      • Preço Base Orçado:{' '}
                      <strong className="text-[#171A1F]">
                        {formatCurrencyBRL(comp.budgetedUnitCost)}
                      </strong>{' '}
                      / {comp.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedComparison(comp)
                        setIsModalOpen(true)
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#FF6B1F]" />
                      <span>Gerenciar Cotações</span>
                    </button>
                  </div>
                </div>

                {/* Grade dos Fornecedores Cadastrados */}
                {comp.quotes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {comp.quotes.map((q) => {
                      const isBest = q.unitPrice === minPrice
                      const isWinning = q.id === comp.winningQuoteId

                      return (
                        <div
                          key={q.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isWinning
                              ? 'border-2 border-[#FF6B1F] bg-[#FF6B1F]/[0.05]'
                              : isBest
                                ? 'border-green-300 bg-green-50/40'
                                : 'border-[#171A1F]/10 bg-[#F8F9FA]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs text-[#171A1F] truncate">
                              {q.supplierName}
                            </span>
                            {isWinning && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#FF6B1F] text-white uppercase">
                                Vencedor
                              </span>
                            )}
                            {isBest && !isWinning && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-green-600 text-white uppercase">
                                Menor R$
                              </span>
                            )}
                          </div>

                          <div className="text-base sm:text-lg font-extrabold text-[#171A1F] tracking-tight">
                            {formatCurrencyBRL(q.unitPrice)}
                            <span className="text-[10px] font-normal text-[#171A1F]/60 ml-1">
                              /{comp.unit}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#171A1F]/70 pt-1.5 border-t border-[#171A1F]/5 mt-1.5">
                            <span>Prazo: {q.deliveryDays} dias</span>
                            <span>{q.paymentTerms || 'À vista'}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-[#171A1F]/15 text-center text-xs text-[#171A1F]/60">
                    Nenhuma cotação cadastrada ainda. Clique em "Gerenciar Cotações" para adicionar.
                  </div>
                )}

                {/* Justificativa da Vencedora Homologada */}
                {winningQuote && (
                  <div className="p-3 rounded-xl bg-[#294C87]/5 border border-[#294C87]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#FF6B1F] flex-shrink-0" />
                      <span className="text-[#171A1F]/80">
                        <strong>Homologação Técnica:</strong>{' '}
                        {comp.winningReason || 'Menor preço equalizado com entrega compatível.'}
                      </span>
                    </div>

                    <div className="text-right whitespace-nowrap text-[11px] text-[#294C87] font-semibold">
                      Média de Mercado: {formatCurrencyBRL(avgPrice)} / {comp.unit}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* MODAL DE COTAÇÕES */}
      {selectedComparison && (
        <QuoteComparisonModal
          comparison={selectedComparison}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            refreshQuotes()
          }}
        />
      )}
    </div>
  )
}
export default QuotesScreen
