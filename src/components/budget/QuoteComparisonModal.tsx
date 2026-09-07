/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Gerenciamento de Cotações de um Insumo Específico:
 * - Cadastro de no mínimo 3 cotações de fornecedores
 * - Fornecedor, Data, Preço Unitário, Prazo de Entrega, Condições de Pagamento, Frete, Anexo
 * - Cálculo automático da Melhor Cotação (menor preço) e Média de Mercado
 * - Registro oficial da Cotação Vencedora com justificativa técnica
 */

import React, { useState } from 'react'
import {
  ShoppingBag,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Award,
  Calendar,
  Clock,
  DollarSign,
  TrendingDown,
  Trash2,
  X,
  FileUp,
  Tag,
} from 'lucide-react'
import { InputQuoteComparison, SupplierQuote } from '@/types/intelligence'
import { formatCurrencyBRL } from '@/lib/formatters'
import { saveInputQuoteComparison, logAuditEvent } from '@/lib/intelligenceStorage'

interface QuoteComparisonModalProps {
  comparison: InputQuoteComparison
  isOpen: boolean
  onClose: () => void
  onSaved: (updated: InputQuoteComparison) => void
}

export const QuoteComparisonModal: React.FC<QuoteComparisonModalProps> = ({
  comparison,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [quotes, setQuotes] = useState<SupplierQuote[]>(comparison.quotes || [])
  const [winningId, setWinningId] = useState<string | undefined>(comparison.winningQuoteId)
  const [winningReason, setWinningReason] = useState<string>(
    comparison.winningReason || 'Menor preço equalizado com prazo e qualidade atendidos',
  )
  const [status, setStatus] = useState(comparison.status)

  // Formulário de Nova Cotação
  const [isAdding, setIsAdding] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [supplierDoc, setSupplierDoc] = useState('')
  const [supplierContact, setSupplierContact] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0])
  const [unitPrice, setUnitPrice] = useState<number | ''>('')
  const [deliveryDays, setDeliveryDays] = useState<number | ''>(3)
  const [paymentTerms, setPaymentTerms] = useState('28 ddl boleto')
  const [freightIncluded, setFreightIncluded] = useState(true)
  const [freightCost, setFreightCost] = useState<number | ''>('')
  const [validityDays, setValidityDays] = useState<number | ''>(15)
  const [notes, setNotes] = useState('')
  const [attachmentName, setAttachmentName] = useState('')

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  if (!isOpen) return null
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Estatísticas das Cotações Cadastradas
  const validPrices = quotes.map((q) => q.unitPrice).filter((p) => p > 0)
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0
  const avgPrice =
    validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0

  const handleAddQuote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierName.trim()) {
      showToast('Nome do fornecedor é obrigatório.')
      return
    }
    if (!unitPrice || Number(unitPrice) <= 0) {
      showToast('Preço unitário deve ser maior que zero.')
      return
    }

    const newQuote: SupplierQuote = {
      id: `sq-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      supplierName: supplierName.trim(),
      supplierCnpjOrDoc: supplierDoc.trim() || undefined,
      supplierContact: supplierContact.trim() || undefined,
      supplierPhone: supplierPhone.trim() || undefined,
      quoteDate: quoteDate || new Date().toISOString().split('T')[0],
      unitPrice: Number(unitPrice),
      deliveryDays: Number(deliveryDays) || 3,
      paymentTerms: paymentTerms.trim() || 'À vista',
      freightIncluded,
      freightCost: freightIncluded ? undefined : Number(freightCost) || 0,
      validityDays: Number(validityDays) || 15,
      notes: notes.trim() || undefined,
      attachmentName: attachmentName.trim() || undefined,
    }

    const updatedQuotes = [...quotes, newQuote]
    setQuotes(updatedQuotes)

    // Se ainda não havia vencedora definida ou este for o menor preço, sugere
    if (!winningId || newQuote.unitPrice < minPrice) {
      setWinningId(newQuote.id)
    }

    // Limpa formulário
    setSupplierName('')
    setSupplierDoc('')
    setSupplierContact('')
    setSupplierPhone('')
    setUnitPrice('')
    setNotes('')
    setAttachmentName('')
    setIsAdding(false)
    showToast(`Cotação de ${newQuote.supplierName} adicionada com sucesso!`)
  }

  const handleDeleteQuote = (id: string) => {
    if (confirm('Excluir esta cotação de fornecedor?')) {
      const updated = quotes.filter((q) => q.id !== id)
      setQuotes(updated)
      if (winningId === id) {
        setWinningId(updated.length > 0 ? updated[0].id : undefined)
      }
      showToast('Cotação removida.')
    }
  }

  const handleSaveComparison = () => {
    if (quotes.length < 3) {
      if (
        !confirm(
          `Atenção: A CONCE recomenda no mínimo 3 cotações de fornecedores para equalização técnica adequada (você possui ${quotes.length}). Deseja salvar mesmo assim?`,
        )
      ) {
        return
      }
    }

    const updatedComparison: InputQuoteComparison = {
      ...comparison,
      quotes,
      winningQuoteId: winningId,
      winningReason,
      status: winningId ? 'homologada' : 'equalizada',
      lastUpdated: new Date().toISOString(),
    }

    saveInputQuoteComparison(updatedComparison)

    const winningQuote = quotes.find((q) => q.id === winningId)
    logAuditEvent({
      budgetId: comparison.budgetId,
      action: 'cotacao_homologada',
      title: `Cotação do Insumo ${comparison.inputCode}`,
      details: winningQuote
        ? `Vencedor: ${winningQuote.supplierName} por ${formatCurrencyBRL(winningQuote.unitPrice)} (${winningReason}). Média de mercado: ${formatCurrencyBRL(avgPrice)}`
        : `Cotações atualizadas (${quotes.length} fornecedores)`,
    })

    onSaved(updatedComparison)
    showToast('Comparativo salvo com sucesso!')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#171A1F]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#171A1F]/15 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#294C87] text-white flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#FF6B1F]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-[#FF6B1F] text-white">
                  {comparison.inputCode}
                </span>
                <span className="text-xs text-white/60">
                  Categoria: {comparison.category.toUpperCase()}
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                {comparison.inputDescription}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback flutuante */}
        {toastMessage && (
          <div className="bg-[#3E8E5A] text-white text-xs font-semibold px-4 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Corpo do Modal */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Métricas do Insumo e Cotações */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10">
              <span className="text-[10px] uppercase font-bold text-[#171A1F]/60 block">
                Preço Base Orçado
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[#171A1F] block mt-0.5">
                {formatCurrencyBRL(comparison.budgetedUnitCost)} / {comparison.unit}
              </span>
              <span className="text-[10px] text-[#171A1F]/50">
                Demanda: {comparison.requiredQuantity.toLocaleString('pt-BR')} {comparison.unit}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-green-50 border border-green-200">
              <span className="text-[10px] uppercase font-bold text-green-700 block">
                Melhor Cotação
              </span>
              <span className="text-sm sm:text-base font-extrabold text-green-800 block mt-0.5">
                {minPrice > 0 ? `${formatCurrencyBRL(minPrice)} / ${comparison.unit}` : '---'}
              </span>
              <span className="text-[10px] text-green-600 font-semibold">
                {minPrice > 0 && comparison.budgetedUnitCost > 0
                  ? `${(((minPrice - comparison.budgetedUnitCost) / comparison.budgetedUnitCost) * 100).toFixed(1)}% vs. Orçado`
                  : 'Aguardando cotações'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#294C87]/10 border border-[#294C87]/30">
              <span className="text-[10px] uppercase font-bold text-[#294C87] block">
                Média de Mercado
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[#294C87] block mt-0.5">
                {avgPrice > 0 ? `${formatCurrencyBRL(avgPrice)} / ${comparison.unit}` : '---'}
              </span>
              <span className="text-[10px] text-[#294C87]/70">
                {quotes.length} fornecedores cotados
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#171A1F]/5 border border-[#171A1F]/10">
              <span className="text-[10px] uppercase font-bold text-[#171A1F]/60 block">
                Dispersão Máxima
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[#171A1F] block mt-0.5">
                {minPrice > 0 && maxPrice > 0 ? formatCurrencyBRL(maxPrice - minPrice) : '---'}
              </span>
              <span className="text-[10px] text-[#171A1F]/50">
                Variação: {minPrice > 0 ? (((maxPrice - minPrice) / minPrice) * 100).toFixed(1) : 0}
                %
              </span>
            </div>
          </div>

          {/* Alerta de Cotação Mínima de 3 Fornecedores */}
          {quotes.length < 3 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-[#FF6B1F] flex-shrink-0" />
              <span>
                <strong>Regra CONCE de Suprimentos:</strong> Cadastre no mínimo 3 cotações de
                fornecedores independentes para validar a equalização técnica da Classe A.
              </span>
            </div>
          )}

          {/* Relação de Cotações Cadastradas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#171A1F]/70">
                Mapa Equalizado de Fornecedores ({quotes.length})
              </h4>

              {!isAdding && (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B1F] text-white text-xs font-bold hover:bg-[#FF6B1F]/90 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Fornecedor</span>
                </button>
              )}
            </div>

            {/* Formulário de Nova Cotação */}
            {isAdding && (
              <form
                onSubmit={handleAddQuote}
                className="p-4 rounded-xl bg-[#F8F9FA] border-2 border-[#294C87]/40 space-y-4 animate-fade-in"
              >
                <div className="flex items-center justify-between border-b border-[#171A1F]/10 pb-2">
                  <span className="text-xs font-bold uppercase text-[#294C87]">
                    Nova Cotação de Fornecedor
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-xs text-[#171A1F]/50 hover:text-[#171A1F]"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#171A1F] block mb-1">
                      Razão Social / Fornecedor *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Polimix, Gerdau, Amanco..."
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#171A1F] block mb-1">
                      CNPJ / Documento
                    </label>
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={supplierDoc}
                      onChange={(e) => setSupplierDoc(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#171A1F] block mb-1">
                      Contato / Telefone
                    </label>
                    <input
                      type="text"
                      placeholder="Nome e telefone"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#171A1F] block mb-1">
                      Preço Unitário (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={unitPrice}
                      onChange={(e) =>
                        setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-bold focus:outline-none focus:border-[#294C87]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#171A1F] block mb-1">
                      Prazo Entrega (dias)
                    </label>
                    <input
                      type="number"
                      value={deliveryDays}
                      onChange={(e) =>
                        setDeliveryDays(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#171A1F] block mb-1">
                      Condição de Pagamento
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 28 ddl, 30/60 dias"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#171A1F] block mb-1">
                      Data da Proposta
                    </label>
                    <input
                      type="date"
                      value={quoteDate}
                      onChange={(e) => setQuoteDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="freight"
                      checked={freightIncluded}
                      onChange={(e) => setFreightIncluded(e.target.checked)}
                      className="rounded border-[#171A1F]/20 text-[#294C87] focus:ring-0"
                    />
                    <label htmlFor="freight" className="text-xs font-semibold text-[#171A1F]">
                      Frete CIF incluso no preço
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                      Observações Técnicas / Anexo Referência
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Cotação #8892 - laudo de qualidade anexo"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-[#294C87] text-white text-xs font-bold"
                  >
                    Salvar Fornecedor
                  </button>
                </div>
              </form>
            )}

            {/* Tabela Comparativa de Fornecedores */}
            {quotes.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-[#171A1F]/20 rounded-xl space-y-2">
                <ShoppingBag className="w-8 h-8 text-[#171A1F]/30 mx-auto" />
                <p className="text-xs text-[#171A1F]/70">
                  Nenhuma cotação cadastrada para este insumo.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#FF6B1F] text-white text-xs font-bold"
                >
                  Cadastrar 1ª Cotação
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#171A1F]/15 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#171A1F] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Vencedor</th>
                      <th className="py-2.5 px-3">Fornecedor / Documento</th>
                      <th className="py-2.5 px-3 w-24">Data</th>
                      <th className="py-2.5 px-3 w-28 text-right">Preço Unit.</th>
                      <th className="py-2.5 px-3 w-24 text-center">Prazo</th>
                      <th className="py-2.5 px-3">Condições</th>
                      <th className="py-2.5 px-3 w-20 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171A1F]/10">
                    {quotes.map((q) => {
                      const isBestPrice = q.unitPrice === minPrice
                      const isWinning = q.id === winningId

                      return (
                        <tr
                          key={q.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            isWinning ? 'bg-amber-50/60 font-medium' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="radio"
                              name="winningQuote"
                              checked={isWinning}
                              onChange={() => setWinningId(q.id)}
                              className="w-4 h-4 text-[#FF6B1F] cursor-pointer"
                              title="Marcar como Fornecedor Vencedor"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#171A1F]">{q.supplierName}</span>
                              {isBestPrice && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-green-600 text-white uppercase">
                                  Menor Preço
                                </span>
                              )}
                              {isWinning && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#FF6B1F] text-white uppercase">
                                  Homologado
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#171A1F]/60 block">
                              {q.supplierCnpjOrDoc || 'Doc n/i'} • Tel: {q.supplierPhone || 'n/i'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {new Date(q.quoteDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-sm text-[#171A1F]">
                            {formatCurrencyBRL(q.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                            {q.deliveryDays} dias
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-[#171A1F]/80">
                            <div>{q.paymentTerms || 'À vista'}</div>
                            <span className="text-[10px] text-[#171A1F]/50">
                              {q.freightIncluded ? 'Frete CIF' : 'Frete FOB'} • Validade:{' '}
                              {q.validityDays} dias
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuote(q.id)}
                              className="p-1 rounded text-red-500 hover:bg-red-50"
                              title="Excluir Cotação"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Justificativa da Vencedora */}
          <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2">
            <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#FF6B1F]" />
              <span>Justificativa Técnica do Fornecedor Homologado *</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Menor preço equalizado, capacidade de fornecimento imediato e prazo compatível."
              value={winningReason}
              onChange={(e) => setWinningReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
            />
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex items-center justify-between">
          <span className="text-xs text-[#171A1F]/60">
            {quotes.length} cotações • Status: <strong>{status.toUpperCase()}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#171A1F]/20 text-xs font-bold text-[#171A1F]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveComparison}
              className="px-5 py-2 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Homologar Cotação
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
