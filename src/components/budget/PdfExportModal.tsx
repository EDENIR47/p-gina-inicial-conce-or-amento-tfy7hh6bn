/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal e Documento de Exportação Profissional em PDF
 * - Capa Institucional: Wordmark CONCE oficial, slogan, dados do cliente/obra, data, número de orçamento
 * - Resumo Executivo e Indicadores Financeiros
 * - Planilha de Etapas e Serviços (com quantitativos, custos unitários e totais com BDI)
 * - Relatório Analítico de Composição de Custo Unitário (CPU com coeficientes e custos de insumos)
 * - Curva ABC (Princípio de Pareto) com destaque de Classe A
 * - Memória de Cálculo de BDI (TCU Acórdão 2.622/2013) e Encargos Sociais
 * - Condições Comerciais, Prazos de Validade e Campo Oficial de Assinaturas (Contratante e RT CREA)
 * - Rodapé em todas as páginas: "Conce é conceito. Conce é concreto."
 */

import React, { useRef } from 'react'
import {
  Printer,
  Download,
  X,
  FileText,
  ShieldCheck,
  Building,
  Calendar,
  Layers,
  Calculator,
  Award,
  CheckCircle2,
} from 'lucide-react'
import { ConceLogo } from '@/components/ConceLogo'
import { FullBudget } from '@/types/budgetEngine'
import { calculateFullBudget } from '@/lib/budgetEngine'
import { computeAbcCurve } from '@/lib/abcAnalysis'
import { formatCurrencyBRL, formatPercent } from '@/lib/formatters'
import { logAuditEvent } from '@/lib/intelligenceStorage'

interface PdfExportModalProps {
  budget: FullBudget
  isOpen: boolean
  onClose: () => void
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ budget, isOpen, onClose }) => {
  const printContainerRef = useRef<HTMLDivElement>(null)

  const summary = calculateFullBudget(budget)
  const abc = computeAbcCurve(budget)

  if (!isOpen) return null

  const handlePrint = () => {
    logAuditEvent({
      budgetId: budget.id,
      action: 'exportacao_pdf',
      title: 'Emissão de Proposta Técnica em PDF',
      details: `Proposta gerada para impressão com capa institucional, CPU detalhado e memória TCU. Valor: ${formatCurrencyBRL(summary.finalSalePrice)}`,
    })
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#171A1F]/80 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 print:p-0 print:bg-white print:fixed-none">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="w-full max-w-5xl bg-[#171A1F] text-white rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl border border-white/20 print:hidden sticky top-2 z-50">
        <div className="flex items-center gap-3">
          <ConceLogo height={26} variant="dark" />
          <div className="h-5 w-px bg-white/20 hidden sm:block" />
          <span className="text-xs sm:text-sm font-semibold text-white/90">
            Relatório Técnico Oficial de Orçamento • {budget.code}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar em PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Fechar Visualização"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ÁREA DO DOCUMENTO FORMATADA PARA IMPRESSÃO / PDF A4 */}
      <div
        ref={printContainerRef}
        className="w-full max-w-5xl bg-white text-[#171A1F] rounded-2xl shadow-2xl p-6 sm:p-12 mb-12 space-y-12 print:shadow-none print:m-0 print:p-8 print:max-w-none print:w-full print:rounded-none"
        id="conce-printable-proposal"
      >
        {/* ============================================================ */}
        {/* 1. CAPA INSTITUCIONAL CONCE */}
        {/* ============================================================ */}
        <section className="min-h-[920px] flex flex-col justify-between border-4 border-[#171A1F] p-8 sm:p-12 relative overflow-hidden bg-gradient-to-b from-white via-[#F8F9FA] to-white rounded-xl print:min-h-screen print:border-4 print:page-break-after-always">
          {/* Faixa decorativa superior Cobalt + Pumpkin */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#294C87] via-[#FF6B1F] to-[#294C87]" />

          {/* Topo da Capa: Logo Oficial */}
          <div className="flex items-start justify-between pt-4">
            <div>
              <ConceLogo height={44} variant="light" />
              <p className="text-[11px] font-bold tracking-widest text-[#294C87] uppercase mt-2">
                SERVIÇO DE ENGENHARIA E CONSULTORIA LTDA
              </p>
              <p className="text-[10px] text-[#171A1F]/60">
                CNPJ: 42.109.876/0001-33 • CREA/SP: 219803-SP
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded bg-[#171A1F] text-white font-mono text-xs font-bold uppercase tracking-wider">
                {budget.code}
              </span>
              <p className="text-[11px] text-[#171A1F]/60 mt-1 font-mono">
                Emissão: {new Date().toLocaleDateString('pt-BR')}
              </p>
              {budget.publicWork.enabled && (
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F]">
                  Licitação Pública ({budget.publicWork.modality})
                </span>
              )}
            </div>
          </div>

          {/* Miolo da Capa: Título do Empreendimento e Proposta */}
          <div className="my-auto py-12 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6B1F]/10 border border-[#FF6B1F]/30 text-[#FF6B1F] text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Proposta Técnica & Orçamento Executivo de Obras</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#171A1F] tracking-tight leading-tight">
              {budget.work.name}
            </h1>

            <p className="text-sm sm:text-base text-[#171A1F]/80 max-w-2xl leading-relaxed">
              {budget.work.description ||
                'Orçamento analítico e discriminado de obras civis com detalhamento de insumos, encargos sociais e cálculo do BDI em conformidade com o Acórdão 2.622/2013 do Plenário do Tribunal de Contas da União.'}
            </p>

            {/* Caixa Destacada com Valor da Obra */}
            <div className="p-6 rounded-2xl bg-[#171A1F] text-white border-l-8 border-[#FF6B1F] shadow-xl max-w-xl space-y-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#FF6B1F]">
                VALOR TOTAL GLOBAL DA PROPOSTA
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {formatCurrencyBRL(summary.finalSalePrice)}
              </div>
              <p className="text-xs text-white/70">
                Preço de venda com BDI de {summary.bdiRate.toFixed(2)}% e Leis Sociais de{' '}
                {summary.socialChargesRate.toFixed(2)}% ({budget.chargesConfig.uf})
              </p>
            </div>
          </div>

          {/* Dados de Identificação do Cliente e Obra */}
          <div className="border-t-2 border-[#171A1F]/15 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-[#294C87] block text-[10px]">
                Contratante / Cliente
              </span>
              <p className="font-bold text-sm text-[#171A1F]">
                {budget.client.name || 'A Definir'}
              </p>
              <p className="text-[#171A1F]/70">CNPJ/CPF: {budget.client.document || '---'}</p>
              <p className="text-[#171A1F]/70">{budget.client.address || '---'}</p>
              <p className="text-[#171A1F]/70">
                {budget.client.city}/{budget.client.state} • {budget.client.phone}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-[#294C87] block text-[10px]">
                Local e Responsável Técnico
              </span>
              <p className="font-bold text-sm text-[#171A1F]">
                {budget.work.city} / {budget.work.state}
              </p>
              <p className="text-[#171A1F]/70">{budget.work.address || 'Endereço da obra'}</p>
              <p className="text-[#171A1F]/70">
                Prazo de Execução: {budget.work.deadlineMonths} meses
              </p>
              <p className="font-semibold text-[#171A1F] pt-1">
                Responsável Técnico: {budget.author || 'Eng. Denir Souza - CREA/SP'}
              </p>
            </div>
          </div>

          {/* Rodapé da Capa com Slogan */}
          <div className="pt-8 border-t border-[#171A1F]/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="italic font-bold text-[#FF6B1F]">
                "Conce é conceito. Conce é concreto."
              </span>
            </div>
            <span className="text-[#171A1F]/50 text-[11px]">
              Página 1 • Capa Institucional CONCE
            </span>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 2. RESUMO EXECUTIVO E INDICADORES DA OBRA */}
        {/* ============================================================ */}
        <section className="space-y-6 print:page-break-after-always">
          <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                SEÇÃO 1 • VISÃO GERAL
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#171A1F]">
                Resumo Executivo do Orçamento
              </h2>
            </div>
            <ConceLogo height={22} variant="light" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10">
              <span className="text-[10px] uppercase font-bold text-[#171A1F]/60 block">
                Custo Direto Base
              </span>
              <span className="text-base sm:text-lg font-bold text-[#171A1F] block mt-1">
                {formatCurrencyBRL(summary.directCostInputs)}
              </span>
              <span className="text-[10px] text-[#171A1F]/50">Materiais, MO e Máquinas</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10">
              <span className="text-[10px] uppercase font-bold text-[#171A1F]/60 block">
                Encargos Sociais ({budget.chargesConfig.uf})
              </span>
              <span className="text-base sm:text-lg font-bold text-[#294C87] block mt-1">
                {formatCurrencyBRL(summary.socialChargesAmount)}
              </span>
              <span className="text-[10px] text-[#171A1F]/50">
                Taxa de {summary.socialChargesRate.toFixed(2)}%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10">
              <span className="text-[10px] uppercase font-bold text-[#171A1F]/60 block">
                BDI TCU Acórdão 2.622
              </span>
              <span className="text-base sm:text-lg font-bold text-[#FF6B1F] block mt-1">
                {formatCurrencyBRL(summary.bdiAmount)}
              </span>
              <span className="text-[10px] text-[#171A1F]/50">
                Taxa de {summary.bdiRate.toFixed(2)}%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#171A1F] text-white border border-[#171A1F]">
              <span className="text-[10px] uppercase font-bold text-[#FF6B1F] block">
                Preço de Venda Final
              </span>
              <span className="text-base sm:text-lg font-bold text-white block mt-1">
                {formatCurrencyBRL(summary.finalSalePrice)}
              </span>
              <span className="text-[10px] text-white/60">Valor Global Fechado</span>
            </div>
          </div>

          {/* Distribuição por Macrogrupos de Custo */}
          <div className="p-5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A1F]/80">
              Apropriação dos Custos Diretos por Categoria
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-white rounded-lg border border-[#171A1F]/10">
                <span className="text-[#171A1F]/60 block">Materiais</span>
                <span className="font-bold text-[#171A1F] text-sm">
                  {formatCurrencyBRL(summary.materialDirectCost)}
                </span>
                <span className="text-[10px] text-[#294C87] block font-semibold">
                  {summary.totalDirectCost > 0
                    ? ((summary.materialDirectCost / summary.totalDirectCost) * 100).toFixed(1)
                    : 0}
                  % do direto
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-[#171A1F]/10">
                <span className="text-[#171A1F]/60 block">Mão de Obra c/ Leis</span>
                <span className="font-bold text-[#171A1F] text-sm">
                  {formatCurrencyBRL(summary.laborDirectCost + summary.socialChargesAmount)}
                </span>
                <span className="text-[10px] text-[#294C87] block font-semibold">
                  {summary.totalDirectCost > 0
                    ? (
                        ((summary.laborDirectCost + summary.socialChargesAmount) /
                          summary.totalDirectCost) *
                        100
                      ).toFixed(1)
                    : 0}
                  % do direto
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-[#171A1F]/10">
                <span className="text-[#171A1F]/60 block">Equipamentos</span>
                <span className="font-bold text-[#171A1F] text-sm">
                  {formatCurrencyBRL(summary.equipmentDirectCost)}
                </span>
                <span className="text-[10px] text-[#294C87] block font-semibold">
                  {summary.totalDirectCost > 0
                    ? ((summary.equipmentDirectCost / summary.totalDirectCost) * 100).toFixed(1)
                    : 0}
                  % do direto
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-[#171A1F]/10">
                <span className="text-[#171A1F]/60 block">Serviços de Terceiros</span>
                <span className="font-bold text-[#171A1F] text-sm">
                  {formatCurrencyBRL(summary.subcontractDirectCost)}
                </span>
                <span className="text-[10px] text-[#294C87] block font-semibold">
                  {summary.totalDirectCost > 0
                    ? ((summary.subcontractDirectCost / summary.totalDirectCost) * 100).toFixed(1)
                    : 0}
                  % do direto
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. PLANILHA ORÇAMENTÁRIA DETALHADA (ETAPAS E SERVIÇOS COM BDI) */}
        {/* ============================================================ */}
        <section className="space-y-4 print:page-break-after-always">
          <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                SEÇÃO 2 • DISCRIMINAÇÃO TÉCNICA
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#171A1F]">
                Planilha Orçamentária por Etapa e Serviço
              </h2>
            </div>
            <span className="font-mono text-xs text-[#171A1F]/60">
              Total de Etapas: {budget.stages.length}
            </span>
          </div>

          <div className="overflow-x-auto border border-[#171A1F]/20 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#171A1F] text-white uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-16">Item</th>
                  <th className="py-3 px-3">Discriminação das Etapas e Serviços</th>
                  <th className="py-3 px-3 w-16 text-center">Unid.</th>
                  <th className="py-3 px-3 w-20 text-right">Qtd.</th>
                  <th className="py-3 px-3 w-28 text-right">Unitário Direto</th>
                  <th className="py-3 px-3 w-28 text-right">Unitário c/ BDI</th>
                  <th className="py-3 px-3 w-32 text-right">Total c/ BDI</th>
                  <th className="py-3 px-2 w-16 text-right">Peso %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171A1F]/10">
                {budget.stages.map((stage) => {
                  const stageSummary = summary.stagesSubtotals.find((s) => s.stageId === stage.id)

                  return (
                    <React.Fragment key={stage.id}>
                      {/* Linha da Etapa */}
                      <tr className="bg-[#294C87]/10 font-extrabold text-[#171A1F] border-t-2 border-[#294C87]/40">
                        <td className="py-2.5 px-3 font-mono text-[#294C87]">{stage.code}</td>
                        <td className="py-2.5 px-3 uppercase text-xs" colSpan={4}>
                          {stage.name}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[11px] text-[#171A1F]/60">
                          Subtotal Etapa:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#294C87] text-sm">
                          {formatCurrencyBRL(stageSummary ? stageSummary.withBdi : 0)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-[#FF6B1F]">
                          {stageSummary ? `${stageSummary.percentageOfTotal}%` : '0%'}
                        </td>
                      </tr>

                      {/* Linhas dos Serviços da Etapa */}
                      {stage.services.map((service) => {
                        const sQty = Number(service.quantity) || 0
                        const compUnit = service.composition?.unitCost || 0
                        const serviceBdi = service.customBdiPercent ?? summary.bdiRate
                        const unitWithBdi = compUnit * (1 + serviceBdi / 100)
                        const totalWithBdi = unitWithBdi * sQty
                        const weight =
                          summary.finalSalePrice > 0
                            ? (totalWithBdi / summary.finalSalePrice) * 100
                            : 0

                        return (
                          <tr key={service.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-2 px-3 font-mono text-[#171A1F]/60 font-semibold">
                              {service.code}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-[#171A1F]">
                                {service.description}
                              </span>
                              {service.composition && (
                                <span className="block font-mono text-[10px] text-[#171A1F]/50">
                                  Comp: {service.composition.code} ({service.composition.source})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-mono">{service.unit}</td>
                            <td className="py-2 px-3 text-right font-mono">
                              {sQty.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-[#171A1F]/70">
                              {formatCurrencyBRL(compUnit)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-[#294C87]">
                              {formatCurrencyBRL(unitWithBdi)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#171A1F]">
                              {formatCurrencyBRL(totalWithBdi)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-[11px] text-[#171A1F]/60">
                              {weight.toFixed(1)}%
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
              <tfoot className="bg-[#171A1F] text-white font-extrabold text-xs">
                <tr>
                  <td className="py-3 px-3 uppercase text-right" colSpan={6}>
                    VALOR TOTAL GERAL DA PROPOSTA (PREÇO DE VENDA COM BDI):
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-[#FF6B1F]">
                    {formatCurrencyBRL(summary.finalSalePrice)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-[#FF6B1F]">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. COMPOSIÇÕES DE CUSTOS UNITÁRIOS (CPU DETALHADA) */}
        {/* ============================================================ */}
        <section className="space-y-4 print:page-break-after-always">
          <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                SEÇÃO 3 • ENGENHARIA DE DETALHAMENTO
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#171A1F]">
                Composição de Custos Unitários (CPU Analítica)
              </h2>
            </div>
            <Calculator className="w-5 h-5 text-[#294C87]" />
          </div>

          <p className="text-xs text-[#171A1F]/70 leading-relaxed">
            Detalhamento de coeficientes de consumo, categorias (material, mão de obra,
            equipamentos) e custos base que formam as composições de referência utilizadas neste
            orçamento.
          </p>

          <div className="space-y-4">
            {budget.stages.flatMap((st) =>
              st.services.map((serv) => {
                const comp = serv.composition
                if (!comp || !comp.inputs || comp.inputs.length === 0) return null

                return (
                  <div
                    key={serv.id}
                    className="border border-[#171A1F]/15 rounded-xl overflow-hidden bg-white shadow-xs"
                  >
                    <div className="bg-[#F4F6F9] px-4 py-2.5 border-b border-[#171A1F]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#294C87] text-white text-[10px]">
                          {comp.code}
                        </span>
                        <span className="font-bold text-[#171A1F]">{serv.description}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[#171A1F]/70 text-[11px]">
                        <span>
                          Unidade: <strong className="text-[#171A1F] font-mono">{comp.unit}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Custo Unitário Direto:{' '}
                          <strong className="text-[#FF6B1F] font-mono">
                            {formatCurrencyBRL(comp.unitCost || 0)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#171A1F]/5 text-[#171A1F]/70 text-[10px] font-bold uppercase">
                        <tr>
                          <th className="py-2 px-3 w-24">Código Insumo</th>
                          <th className="py-2 px-3">Descrição do Insumo / Parcela</th>
                          <th className="py-2 px-3 w-28">Tipo</th>
                          <th className="py-2 px-3 w-16 text-center">Unid.</th>
                          <th className="py-2 px-3 w-24 text-right">Coeficiente</th>
                          <th className="py-2 px-3 w-24 text-right">Custo Unit. (R$)</th>
                          <th className="py-2 px-3 w-24 text-right">Total Parcela (R$)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#171A1F]/5">
                        {comp.inputs.map((inp, idx) => {
                          const coef = Number(inp.coefficient) || 0
                          const unitCost = Number(inp.unitCost) || 0
                          const parcelCost = coef * unitCost

                          return (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="py-1.5 px-3 font-mono text-[11px] text-[#294C87]">
                                {inp.code}
                              </td>
                              <td className="py-1.5 px-3 font-medium text-[#171A1F]">
                                {inp.description}
                              </td>
                              <td className="py-1.5 px-3 uppercase text-[10px] font-semibold text-[#171A1F]/60">
                                {inp.category.replace('_', ' ')}
                              </td>
                              <td className="py-1.5 px-3 text-center font-mono text-[11px]">
                                {inp.unit}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono text-[11px]">
                                {coef.toFixed(4)}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono text-[11px]">
                                {formatCurrencyBRL(unitCost)}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-semibold text-[#171A1F]">
                                {formatCurrencyBRL(parcelCost)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              }),
            )}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. CURVA ABC DE INSUMOS (PARETO) */}
        {/* ============================================================ */}
        <section className="space-y-4 print:page-break-after-always">
          <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                SEÇÃO 4 • ANÁLISE DE PARETO
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#171A1F]">
                Curva ABC dos Insumos de Maior Impacto
              </h2>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FF6B1F]/15 text-[#FF6B1F] text-xs font-bold">
              <span>Classe A: Destaque Pumpkin Orange</span>
            </div>
          </div>

          {/* Cards com os blocos A, B e C */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#FF6B1F]/10 border-2 border-[#FF6B1F]">
              <span className="text-xs font-bold text-[#FF6B1F] uppercase block">
                Classe A (Prioridade Máxima)
              </span>
              <div className="text-lg font-extrabold text-[#171A1F] mt-1">
                {formatCurrencyBRL(abc.classA.totalCost)}
              </div>
              <p className="text-[11px] text-[#171A1F]/70 mt-0.5">
                {abc.classA.itemsCount} itens ({abc.classA.percentageOfItems}%) representam{' '}
                <strong>{abc.classA.percentageOfCost}%</strong> do custo direto
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#294C87]/10 border border-[#294C87]/40">
              <span className="text-xs font-bold text-[#294C87] uppercase block">
                Classe B (Impacto Médio)
              </span>
              <div className="text-lg font-extrabold text-[#171A1F] mt-1">
                {formatCurrencyBRL(abc.classB.totalCost)}
              </div>
              <p className="text-[11px] text-[#171A1F]/70 mt-0.5">
                {abc.classB.itemsCount} itens ({abc.classB.percentageOfItems}%) representam{' '}
                <strong>{abc.classB.percentageOfCost}%</strong> do custo
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#171A1F]/5 border border-[#171A1F]/15">
              <span className="text-xs font-bold text-[#171A1F]/70 uppercase block">
                Classe C (Itens Secundários)
              </span>
              <div className="text-lg font-extrabold text-[#171A1F] mt-1">
                {formatCurrencyBRL(abc.classC.totalCost)}
              </div>
              <p className="text-[11px] text-[#171A1F]/70 mt-0.5">
                {abc.classC.itemsCount} itens ({abc.classC.percentageOfItems}%) somam{' '}
                <strong>{abc.classC.percentageOfCost}%</strong>
              </p>
            </div>
          </div>

          {/* Tabela dos Principais Itens da Curva ABC */}
          <div className="overflow-x-auto border border-[#171A1F]/20 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#171A1F] text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3 w-14 text-center">Rank</th>
                  <th className="py-2.5 px-3 w-16 text-center">Classe</th>
                  <th className="py-2.5 px-3 w-24">Código</th>
                  <th className="py-2.5 px-3">Descrição do Insumo</th>
                  <th className="py-2.5 px-3 w-20">Tipo</th>
                  <th className="py-2.5 px-3 w-20 text-right">Qtd. Total</th>
                  <th className="py-2.5 px-3 w-24 text-right">Custo Unit.</th>
                  <th className="py-2.5 px-3 w-28 text-right">Custo Total</th>
                  <th className="py-2.5 px-3 w-20 text-right">% Acumulada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171A1F]/10">
                {abc.allItems.slice(0, 15).map((item) => (
                  <tr
                    key={item.id}
                    className={
                      item.classification === 'A'
                        ? 'bg-[#FF6B1F]/10 font-medium'
                        : 'hover:bg-gray-50'
                    }
                  >
                    <td className="py-2 px-3 text-center font-bold text-[#171A1F]">#{item.rank}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          item.classification === 'A'
                            ? 'bg-[#FF6B1F] text-white'
                            : item.classification === 'B'
                              ? 'bg-[#294C87] text-white'
                              : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {item.classification}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-[#294C87] font-bold">
                      {item.code}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#171A1F]">{item.description}</td>
                    <td className="py-2 px-3 uppercase text-[10px] text-[#171A1F]/60">
                      {item.category.replace('_', ' ')}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[11px]">
                      {item.totalQuantity.toLocaleString('pt-BR')} {item.unit}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[11px]">
                      {formatCurrencyBRL(item.unitCost)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#171A1F]">
                      {formatCurrencyBRL(item.totalCost)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-bold ${
                        item.classification === 'A' ? 'text-[#FF6B1F]' : 'text-[#294C87]'
                      }`}
                    >
                      {item.accumulatedPercentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 6. MEMÓRIA DE BDI (TCU) E ENCARGOS SOCIAIS */}
        {/* ============================================================ */}
        <section className="space-y-4 print:page-break-after-always">
          <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                SEÇÃO 5 • CONFORMIDADE LEGAL
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#171A1F]">
                Memória de Cálculo de BDI TCU & Encargos Sociais
              </h2>
            </div>
            <ShieldCheck className="w-5 h-5 text-[#294C87]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Tabela de BDI */}
            <div className="border border-[#171A1F]/15 rounded-xl p-4 space-y-3 bg-[#F8F9FA]">
              <div className="flex items-center justify-between border-b border-[#171A1F]/10 pb-2">
                <span className="font-bold text-[#171A1F]">
                  Parâmetros de BDI (Acórdão 2.622/2013)
                </span>
                <span className="font-mono font-bold text-[#FF6B1F] text-sm">
                  {summary.bdiRate.toFixed(2)}%
                </span>
              </div>

              <div className="space-y-1.5 text-[#171A1F]/80">
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Administração Central (AC):</span>
                  <span className="font-mono font-bold">
                    {budget.bdiConfig.administrationCentral.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Taxa de Risco (R):</span>
                  <span className="font-mono font-bold">{budget.bdiConfig.risk.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Seguro e Garantia (S + G):</span>
                  <span className="font-mono font-bold">
                    {budget.bdiConfig.insuranceAndGuarantee.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Despesas Financeiras (DF):</span>
                  <span className="font-mono font-bold">
                    {budget.bdiConfig.financialExpenses.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Lucro Operacional (L):</span>
                  <span className="font-mono font-bold">{budget.bdiConfig.profit.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Tributos Totais (ISS+PIS+COFINS+CPRB):</span>
                  <span className="font-mono font-bold">{summary.totalTaxesRate.toFixed(2)}%</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-[#171A1F]/10 text-[11px] text-[#171A1F]/70">
                <strong>Fórmula Oficial:</strong> BDI = [((1 + AC + R + S + G) × (1 + DF) × (1 + L))
                / (1 - T) - 1] × 100
              </div>
            </div>

            {/* Tabela de Encargos Sociais */}
            <div className="border border-[#171A1F]/15 rounded-xl p-4 space-y-3 bg-[#F8F9FA]">
              <div className="flex items-center justify-between border-b border-[#171A1F]/10 pb-2">
                <span className="font-bold text-[#171A1F]">
                  Encargos Sociais ({budget.chargesConfig.uf})
                </span>
                <span className="font-mono font-bold text-[#294C87] text-sm">
                  {summary.socialChargesRate.toFixed(2)}%
                </span>
              </div>

              <div className="space-y-1.5 text-[#171A1F]/80">
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Regime de Desoneração:</span>
                  <span className="font-bold text-[#171A1F]">
                    {budget.chargesConfig.isRelieved
                      ? 'Desonerado (CPRB Lei 12.546)'
                      : 'Sem Desoneração (Padrão CLT)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Grupo A (Obrigações Básicas Previdenciárias):</span>
                  <span className="font-mono font-semibold">Conforme tabela estadual</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Grupo B (Descanso Remunerado, Férias, Feriados):</span>
                  <span className="font-mono font-semibold">Conforme tabela estadual</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Grupo C (Aviso Prévio e Rescisões):</span>
                  <span className="font-mono font-semibold">Conforme tabela estadual</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Grupo D (Reincidências Cumulativas):</span>
                  <span className="font-mono font-semibold">Conforme tabela estadual</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                  <span>Montante R$ Aplicado sobre Mão de Obra:</span>
                  <span className="font-mono font-bold text-[#294C87]">
                    {formatCurrencyBRL(summary.socialChargesAmount)}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-[#171A1F]/10 text-[11px] text-[#171A1F]/70">
                Tabelas de encargos sociais regionalizadas e atualizadas para a UF:{' '}
                <strong>{budget.chargesConfig.uf}</strong>.
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 7. CONDIÇÕES COMERCIAIS & ASSINATURAS OFICIAIS */}
        {/* ============================================================ */}
        <section className="space-y-6 print:page-break-inside-avoid">
          <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                SEÇÃO 6 • FECHAMENTO
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#171A1F]">
                Condições Comerciais e Assinaturas
              </h2>
            </div>
            <Award className="w-5 h-5 text-[#FF6B1F]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2">
              <span className="font-bold uppercase tracking-wider text-[#294C87] text-[10px] block">
                Condições de Pagamento e Faturamento
              </span>
              <p className="text-[#171A1F]/80">
                • Medições quinzenais com base no avanço físico comprovado em diário de obra.
              </p>
              <p className="text-[#171A1F]/80">
                • Prazo para emissão de nota fiscal e liquidação: até 10 dias após aprovação da
                medição.
              </p>
              <p className="text-[#171A1F]/80">
                • Validade da presente proposta: 30 (trinta) dias corridos a contar da data de
                emissão.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2">
              <span className="font-bold uppercase tracking-wider text-[#294C87] text-[10px] block">
                Garantia e Obrigações Técnicas
              </span>
              <p className="text-[#171A1F]/80">
                • Emissão obrigatória da Anotação de Responsabilidade Técnica (ART) junto ao
                CREA/SP.
              </p>
              <p className="text-[#171A1F]/80">
                • Garantia quinquenal conforme previsto no Artigo 618 do Código Civil Brasileiro.
              </p>
              <p className="text-[#171A1F]/80">
                • Atendimento irrestrito às normas da ABNT e NRs de Segurança e Saúde no Trabalho.
              </p>
            </div>
          </div>

          {/* Campos Oficiais de Assinatura */}
          <div className="pt-12 grid grid-cols-1 sm:grid-cols-2 gap-12 text-center text-xs">
            <div className="space-y-2">
              <div className="w-64 mx-auto border-t-2 border-[#171A1F]" />
              <p className="font-bold text-sm text-[#171A1F]">
                {budget.author || 'Eng. Denir Souza'}
              </p>
              <p className="text-[#171A1F]/70">CONCE — Serviço de Engenharia e Consultoria LTDA</p>
              <p className="text-[11px] text-[#294C87] font-semibold">
                Responsável Técnico • CREA/SP
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-64 mx-auto border-t-2 border-[#171A1F]" />
              <p className="font-bold text-sm text-[#171A1F]">
                {budget.client.name || 'Cliente Contratante'}
              </p>
              <p className="text-[#171A1F]/70">CNPJ/CPF: {budget.client.document || '---'}</p>
              <p className="text-[11px] text-[#294C87] font-semibold">
                De Acordo / Representante Legal
              </p>
            </div>
          </div>

          {/* Rodapé Final com Logo e Slogan */}
          <div className="pt-8 border-t border-[#171A1F]/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <ConceLogo height={20} variant="light" />
              <span className="italic font-bold text-[#FF6B1F]">
                "Conce é conceito. Conce é concreto."
              </span>
            </div>
            <span className="text-[#171A1F]/50 text-[11px]">
              Documento Técnico Oficial emitido por CONCE Engenharia
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
