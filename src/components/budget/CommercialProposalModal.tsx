/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal de Apresentação Comercial de Alto Impacto ("Apresentação da Proposta")
 *
 * Estrutura:
 * 7 Slides/Seções estratégicos orientados a conversão e vendas para cliente:
 *  1. Capa Institucional CONCE (dual C, dados da empresa, responsável técnico Eng. Edenir Souza da Rosa CREA/RS-252397)
 *  2. Panorama Executivo da Obra (visão estratégica para cliente leigo: segurança, durabilidade, conformidade)
 *  3. Escopo Didático por Etapas (o que está incluído com clareza em cada etapa real do orçamento)
 *  4. Investimento & Transparência (valor de venda com BDI em Pumpkin Orange, valor por m², DAS 11% sem surpresas)
 *  5. Diferenciais de Engenharia CONCE (precisão SINAPI/TCU, ART CREA/RS, garantia quinquenal Art. 618 CC, gestão transparente)
 *  6. Condições Comerciais (pagamento, validade expressa, cronograma e execução)
 *  7. Encerramento & Call-to-Action (convite à formalização, termo de aceite, canais diretos)
 *
 * Navegação fluida: anterior/próximo, setas do teclado (ArrowLeft/ArrowRight), mini-indicadores interativos.
 * "Baixar PDF": Exportação A4 Paisagem, 1 slide por folha, via createPortal no document.body.
 * ZERO termos de IA. Identidade visual CONCE (Mirage #171A1F, Cobalt #294C87, Pumpkin #FF6B1F).
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  FileCheck2,
  HardHat,
  Briefcase,
  ExternalLink,
} from 'lucide-react'
import { FullBudget } from '@/types/budgetEngine'
import { calculateFullBudget } from '@/lib/budgetEngine'
import { CONCE_COMPANY } from '@/lib/conceCompany'
import { ConceLogo } from '@/components/ConceLogo'
import {
  formatCurrencyBRL,
  formatPercent,
  formatBudgetDeadline,
  formatCurrentDatePTBR,
  sanitizeDocumentText,
  getTechnicalResponsibilityText,
} from '@/lib/formatters'
import { logAuditEvent } from '@/lib/intelligenceStorage'

export interface CommercialProposalModalProps {
  budget: FullBudget
  isOpen: boolean
  onClose: () => void
}

export const CommercialProposalModal: React.FC<CommercialProposalModalProps> = ({
  budget,
  isOpen,
  onClose,
}) => {
  const [currentSlide, setCurrentSlide] = useState<number>(1)
  const totalSlides = 7

  const summary = useMemo(() => calculateFullBudget(budget), [budget])

  // Isolar impressão
  useEffect(() => {
    if (!isOpen) return
    document.body.classList.add('conce-printing')
    return () => {
      document.body.classList.remove('conce-printing')
    }
  }, [isOpen])

  // Navegação por teclado
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentSlide((prev) => Math.min(totalSlides, prev + 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentSlide((prev) => Math.max(1, prev - 1))
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [isOpen, onClose, totalSlides],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen) return null

  // Dados reais sanitizados
  const cleanCode = sanitizeDocumentText(budget.code) || 'ORC-CONCE'
  const cleanTitle =
    sanitizeDocumentText(budget.title) ||
    sanitizeDocumentText(budget.work.name) ||
    'Proposta Técnico-Comercial de Engenharia'
  const cleanWorkName = sanitizeDocumentText(budget.work.name) || 'Empreendimento de Engenharia'
  const cleanWorkAddress = budget.work.address
    ? `${sanitizeDocumentText(budget.work.address)}, ${budget.work.city || 'Porto Alegre'}/${budget.work.state || 'RS'}`
    : `${budget.work.city || 'Porto Alegre'}/${budget.work.state || 'RS'}`
  const cleanClientName = sanitizeDocumentText(budget.client.name) || 'Cliente Contratante'
  const cleanClientDoc = sanitizeDocumentText(budget.client.document)
  const cleanClientEmail = sanitizeDocumentText(budget.client.email)
  const cleanClientPhone = sanitizeDocumentText(budget.client.phone)

  const cleanPaymentTerms =
    budget.paymentTerms ||
    '30% de entrada na formalização contratual; medições quinzenais conforme evolução física comprovada; saldo após entrega técnica e termo de aceite.'
  const cleanValidityDays = budget.validityDays ?? 10
  const cleanValidityType = budget.validityDaysType || 'uteis'
  const cleanDeadline = formatBudgetDeadline(budget.work)

  // Cálculo da área e valor por m² se especificado
  const areaM2 = Number(budget.work?.totalAreaM2) || 0
  const pricePerM2 = areaM2 > 0 ? Number((summary.finalSalePrice / areaM2).toFixed(2)) : 0

  const handlePrint = () => {
    logAuditEvent({
      budgetId: budget.id,
      action: 'exportacao_pdf',
      title: 'Apresentação Comercial Emitida em PDF',
      details: `Caderno comercial de 7 lâminas da proposta ${cleanCode} gerado. Valor: ${formatCurrencyBRL(
        summary.finalSalePrice,
      )}. Cliente: ${cleanClientName}.`,
      userName: CONCE_COMPANY.responsavelTecnicoCompleto,
    })
    window.print()
  }

  const slideTitles = [
    'Capa Institucional',
    'Panorama Executivo',
    'Escopo por Etapas',
    'Investimento & BDI',
    'Diferenciais de Engenharia',
    'Condições Comerciais',
    'Encerramento & Aceite',
  ]

  const modalContent = (
    <div className="conce-presentation-modal-overlay fixed inset-0 z-50 bg-[#171A1F]/90 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible">
      {/* BARRA SUPERIOR DE COMANDOS (Oculta na Impressão) */}
      <header className="w-full max-w-6xl bg-[#171A1F] text-white rounded-2xl p-3.5 mb-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl border border-white/20 print:hidden sticky top-2 z-50">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <ConceLogo height={24} variant="dark" />
          <div className="h-5 w-px bg-white/20 hidden md:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-gradient-to-r from-[#FF6B1F] to-[#FF8945] text-white text-[10px] font-extrabold uppercase tracking-wider">
                Apresentação Comercial
              </span>
              <span className="font-mono text-xs font-bold text-white/90">{cleanCode}</span>
            </div>
            <span className="text-[11px] text-white/60 line-clamp-1">
              {cleanTitle} • {cleanClientName}
            </span>
          </div>
        </div>

        {/* Controles de Slides no Topo */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="inline-flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setCurrentSlide((p) => Math.max(1, p - 1))}
              disabled={currentSlide === 1}
              className="p-1.5 rounded-lg text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Slide Anterior (Seta Esquerda)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs font-bold px-2 text-white">
              Lâmina <strong className="text-[#FF6B1F]">{currentSlide}</strong> / {totalSlides}
            </span>
            <button
              type="button"
              onClick={() => setCurrentSlide((p) => Math.min(totalSlides, p + 1))}
              disabled={currentSlide === totalSlides}
              className="p-1.5 rounded-lg text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Próximo Slide (Seta Direita)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B1F] to-[#FF8945] hover:from-[#e55d17] hover:to-[#FF6B1F] text-white text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/20 transition-all cursor-pointer active:scale-95 border border-white/20"
            title="Exportar ou Imprimir em PDF formato Paisagem (1 lâmina por folha)"
          >
            <Printer className="w-4 h-4" />
            <span>Baixar PDF (Paisagem)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Fechar Apresentação (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* NAVEGAÇÃO EM TABS/INDICADORES (Oculta na Impressão) */}
      <nav
        aria-label="Navegação das lâminas da proposta"
        className="w-full max-w-6xl mb-4 print:hidden"
      >
        <div className="bg-[#171A1F]/90 backdrop-blur border border-white/15 rounded-xl p-1.5 flex items-center justify-between gap-1 overflow-x-auto">
          {slideTitles.map((title, idx) => {
            const slideNum = idx + 1
            const isActive = currentSlide === slideNum
            return (
              <button
                key={slideNum}
                type="button"
                onClick={() => setCurrentSlide(slideNum)}
                className={`flex-1 min-w-[120px] py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center truncate cursor-pointer ${
                  isActive
                    ? 'bg-[#FF6B1F] text-white shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="font-mono mr-1">0{slideNum}.</span>
                <span>{title}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ============================================================ */}
      {/* ÁREA DOS SLIDES (TELA INTERATIVA + DOCUMENTO IMPRIMÍVEL) */}
      {/* Na tela: exibe o slide ativo 'currentSlide' em widescreen. */}
      {/* Na impressão (PDF): exibe os 7 slides como páginas A4 paisagem sequenciais. */}
      {/* ============================================================ */}
      <main
        className="w-full max-w-6xl space-y-4 print:space-y-0"
        id="conce-printable-presentation"
      >
        {/* ======================================================== */}
        {/* SLIDE 1: CAPA INSTITUCIONAL CONCE */}
        {/* ======================================================== */}
        <section
          className={`conce-presentation-page ${
            currentSlide === 1 ? 'block' : 'hidden print:block'
          } bg-white text-[#171A1F] rounded-3xl p-8 sm:p-14 shadow-2xl border-4 border-[#171A1F] relative overflow-hidden flex flex-col justify-between min-h-[580px] print:min-h-[175mm] print:rounded-none print:border-2 print:p-8`}
        >
          {/* Faixa decorativa superior */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#294C87] via-[#FF6B1F] to-[#294C87]" />

          {/* Cabeçalho da Capa */}
          <div className="flex items-start justify-between gap-4 pt-2">
            <div className="space-y-1">
              <ConceLogo height={38} variant="light" />
              <p className="text-xs text-[#294C87] font-extrabold uppercase tracking-widest pt-1">
                {CONCE_COMPANY.razaoSocial}
              </p>
              <p className="text-[11px] text-[#171A1F]/60">
                CNPJ {CONCE_COMPANY.cnpjFormatado} • Registro CREA/RS
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full bg-[#FF6B1F]/15 text-[#FF6B1F] text-xs font-black uppercase tracking-wider">
                Proposta Comercial Oficial
              </span>
              <div className="font-mono text-xs text-[#171A1F]/60 mt-1">
                Código: <strong className="text-[#294C87]">{cleanCode}</strong>
              </div>
              <div className="text-[11px] text-[#171A1F]/50">Data: {formatCurrentDatePTBR()}</div>
            </div>
          </div>

          {/* Centro da Capa: Título de Alto Impacto */}
          <div className="my-auto py-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#294C87]/10 text-[#294C87] text-xs font-bold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-[#FF6B1F]" />
              Apresentação de Proposta Técnico-Comercial de Engenharia
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#171A1F] tracking-tight leading-tight">
              {cleanTitle}
            </h1>

            {cleanTitle !== cleanWorkName && (
              <p className="text-lg sm:text-xl font-bold text-[#294C87]">Obra: {cleanWorkName}</p>
            )}

            <div className="w-24 h-1.5 bg-[#FF6B1F] rounded-full" />

            <p className="text-sm sm:text-base text-[#171A1F]/70 max-w-2xl leading-relaxed">
              Solução de engenharia desenvolvida com rigor técnico, critérios de conformidade
              normativa ABNT, parametrização oficial SINAPI e planejamento executivo transparente
              para a máxima segurança e valorização do seu patrimônio.
            </p>
          </div>

          {/* Rodapé da Capa: Dados do Cliente e Responsável Técnico */}
          <div className="border-t-2 border-[#171A1F]/10 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[#FF6B1F] tracking-wider block">
                Cliente Contratante:
              </span>
              <p className="font-bold text-[#171A1F] text-sm">{cleanClientName}</p>
              {cleanClientDoc && (
                <p className="text-[11px] text-[#171A1F]/60">Documento: {cleanClientDoc}</p>
              )}
              <p className="text-[11px] text-[#171A1F]/60">Local da Obra: {cleanWorkAddress}</p>
            </div>

            <div className="sm:text-right space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[#294C87] tracking-wider block">
                Responsável Técnico:
              </span>
              <p className="font-bold text-[#171A1F] text-sm">{CONCE_COMPANY.responsavelTecnico}</p>
              <p className="text-[11px] font-semibold text-[#294C87]">
                {CONCE_COMPANY.registroCrea}
              </p>
              <p className="text-[10px] text-[#171A1F]/50 italic">{CONCE_COMPANY.slogan}</p>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SLIDE 2: PANORAMA EXECUTIVO DA OBRA (Linguagem para leigo) */}
        {/* ======================================================== */}
        <section
          className={`conce-presentation-page ${
            currentSlide === 2 ? 'block' : 'hidden print:block'
          } bg-white text-[#171A1F] rounded-3xl p-8 sm:p-12 shadow-2xl border-4 border-[#171A1F] relative overflow-hidden flex flex-col justify-between min-h-[580px] print:min-h-[175mm] print:rounded-none print:border-2 print:p-8`}
        >
          <div className="flex items-center justify-between border-b border-[#171A1F]/10 pb-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF6B1F] block">
                Lâmina 02 • Panorama Executivo
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] tracking-tight">
                Visão Geral do Empreendimento
              </h2>
            </div>
            <ConceLogo height={22} variant="light" />
          </div>

          <div className="my-auto py-6 space-y-6">
            <div className="bg-[#F8F9FA] p-5 rounded-2xl border border-[#171A1F]/10 space-y-2">
              <span className="text-xs uppercase font-extrabold text-[#294C87] tracking-wider block">
                Objetivo Central da Obra:
              </span>
              <p className="text-sm sm:text-base text-[#171A1F] leading-relaxed font-medium">
                {budget.work.description ||
                  `Execução técnica completa do escopo contratado para ${cleanWorkName}, assegurando fidelidade aos projetos, acabamento de padrão superior e garantia técnica total de estabilidade e durabilidade.`}
              </p>
            </div>

            {/* Três Pilares de Valor para o Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#294C87]/10 to-transparent border border-[#294C87]/30 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#294C87] text-white flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-5 h-5 text-[#FF6B1F]" />
                </div>
                <h3 className="font-extrabold text-[#171A1F] text-base">Segurança & Proteção</h3>
                <p className="text-xs text-[#171A1F]/70 leading-relaxed">
                  Dimensionamento rigoroso, especificações estruturais certificadas e execução
                  assistida por engenheiro credenciado perante o CREA/RS.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#FF6B1F]/10 to-transparent border border-[#FF6B1F]/30 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B1F] text-white flex items-center justify-center shadow-md">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-[#171A1F] text-base">Durabilidade & Conforto</h3>
                <p className="text-xs text-[#171A1F]/70 leading-relaxed">
                  Insumos com certificação de procedência e métodos construtivos que reduzem a
                  manutenção futura e valorizam o imóvel.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-50 to-transparent border border-emerald-200 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-[#171A1F] text-base">
                  Previsibilidade Financeira
                </h3>
                <p className="text-xs text-[#171A1F]/70 leading-relaxed">
                  Orçamento de engenharia sem custos ocultos ou surpresas durante a execução. Todas
                  as obrigações fiscais e sociais já incluídas.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#171A1F]/10 pt-4 flex items-center justify-between text-xs text-[#171A1F]/60">
            <span>Proposta Comercial CONCE • {cleanCode}</span>
            <span>
              Prazo estimado: <strong className="text-[#171A1F]">{cleanDeadline}</strong>
            </span>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SLIDE 3: ESCOPO DIDÁTICO POR ETAPAS */}
        {/* ======================================================== */}
        <section
          className={`conce-presentation-page ${
            currentSlide === 3 ? 'block' : 'hidden print:block'
          } bg-white text-[#171A1F] rounded-3xl p-8 sm:p-12 shadow-2xl border-4 border-[#171A1F] relative overflow-hidden flex flex-col justify-between min-h-[580px] print:min-h-[175mm] print:rounded-none print:border-2 print:p-8`}
        >
          <div className="flex items-center justify-between border-b border-[#171A1F]/10 pb-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF6B1F] block">
                Lâmina 03 • Escopo de Trabalho
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] tracking-tight">
                O Que Está Incluído na Sua Obra
              </h2>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-[#294C87] px-2.5 py-1 rounded bg-[#294C87]/10">
                {budget.stages.length} Etapas Estruturadas
              </span>
            </div>
          </div>

          <div className="my-auto py-4 space-y-3">
            <p className="text-xs sm:text-sm text-[#171A1F]/70">
              Cada fase foi detalhada para permitir acompanhamento visual e medições claras de
              evolução:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {budget.stages.map((st, idx) => {
                const stageSub = summary.stagesSubtotals.find((s) => s.stageId === st.id)
                const percent = stageSub?.percentageOfTotal || 0

                return (
                  <div
                    key={st.id || idx}
                    className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 flex flex-col justify-between space-y-2 hover:border-[#294C87]/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#294C87] text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {st.code || idx + 1}
                        </span>
                        <h4 className="font-bold text-[#171A1F] text-xs sm:text-sm">{st.name}</h4>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[#FF6B1F] bg-[#FF6B1F]/10 px-2 py-0.5 rounded shrink-0">
                        {percent}% da obra
                      </span>
                    </div>

                    <ul className="space-y-1 text-[11px] text-[#171A1F]/75 pl-1">
                      {(st.services || []).slice(0, 3).map((srv, sIdx) => (
                        <li key={srv.id || sIdx} className="flex items-start gap-1.5 line-clamp-1">
                          <span className="text-[#FF6B1F] font-bold">•</span>
                          <span className="truncate">
                            {srv.description} ({srv.quantity} {srv.unit})
                          </span>
                        </li>
                      ))}
                      {(st.services || []).length > 3 && (
                        <li className="text-[10px] text-[#294C87] font-semibold italic">
                          + {(st.services || []).length - 3} serviço(s) complementar(es) nesta etapa
                        </li>
                      )}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-[#171A1F]/10 pt-4 flex items-center justify-between text-xs text-[#171A1F]/60">
            <span>Total de {summary.servicesCount} serviços especificados e orçados</span>
            <span>Garantia de integridade e atendimento às normas técnicas</span>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SLIDE 4: INVESTIMENTO & TRANSPARÊNCIA FISCAL */}
        {/* ======================================================== */}
        <section
          className={`conce-presentation-page ${
            currentSlide === 4 ? 'block' : 'hidden print:block'
          } bg-white text-[#171A1F] rounded-3xl p-8 sm:p-12 shadow-2xl border-4 border-[#171A1F] relative overflow-hidden flex flex-col justify-between min-h-[580px] print:min-h-[175mm] print:rounded-none print:border-2 print:p-8`}
        >
          <div className="flex items-center justify-between border-b border-[#171A1F]/10 pb-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF6B1F] block">
                Lâmina 04 • Investimento Total
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] tracking-tight">
                Valor da Proposta & Transparência
              </h2>
            </div>
            <ConceLogo height={22} variant="light" />
          </div>

          <div className="my-auto py-6 space-y-6">
            {/* Bloco de Destaque Pumpkin Orange com Valor Total */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#171A1F] via-[#1f2530] to-[#171A1F] text-white border-2 border-[#FF6B1F] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <span className="text-xs font-black uppercase tracking-widest text-[#FF6B1F] block">
                  VALOR TOTAL DE VENDA (COM BDI CONTRATUAL INCLUSO)
                </span>
                <div className="text-3xl sm:text-5xl font-black text-[#FF6B1F] tracking-tight">
                  {formatCurrencyBRL(summary.finalSalePrice)}
                </div>
                <p className="text-xs text-white/70">
                  Preço final fechado para execução integral do escopo acordado.
                </p>
              </div>

              {pricePerM2 > 0 && (
                <div className="p-4 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[200px]">
                  <span className="text-[10px] uppercase font-bold text-white/70 block">
                    Investimento por Área:
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                    {formatCurrencyBRL(pricePerM2)}/m²
                  </div>
                  <span className="text-[10px] text-[#FF6B1F] font-semibold">
                    Área Total: {areaM2} m²
                  </span>
                </div>
              )}
            </div>

            {/* Bloco de Transparência Fiscal e Sem Custos Surpresa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#294C87] font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#3E8E5A]" />
                  <span>Impostos DAS Inclusos</span>
                </div>
                <p className="text-[11px] text-[#171A1F]/70 leading-relaxed">
                  Tributação da CONCE pelo Simples Nacional com DAS efetivo apurado em 11,00% sobre
                  o faturamento, sem notas adicionais de impostos para o cliente.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#294C87] font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#3E8E5A]" />
                  <span>BDI Estruturado TCU</span>
                </div>
                <p className="text-[11px] text-[#171A1F]/70 leading-relaxed">
                  Taxa de {summary.bdiRate.toFixed(2)}% balizada pelo Acórdão 2.622/2013 do TCU,
                  cobrindo administração central, seguro, riscos técnicos e margem operacional.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#294C87] font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#3E8E5A]" />
                  <span>Sem Custos Surpresa</span>
                </div>
                <p className="text-[11px] text-[#171A1F]/70 leading-relaxed">
                  Todos os encargos trabalhistas, ferramentas, EPIs, caçambas de entulho e
                  mobilização já fazem parte da composição global do orçamento.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#171A1F]/10 pt-4 flex items-center justify-between text-xs text-[#171A1F]/60">
            <span>
              Validade da proposta:{' '}
              <strong>
                {cleanValidityDays} dias {cleanValidityType}
              </strong>
            </span>
            <span>Segurança contratual garantida pela CONCE</span>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SLIDE 5: DIFERENCIAIS DE ENGENHARIA CONCE */}
        {/* ======================================================== */}
        <section
          className={`conce-presentation-page ${
            currentSlide === 5 ? 'block' : 'hidden print:block'
          } bg-white text-[#171A1F] rounded-3xl p-8 sm:p-12 shadow-2xl border-4 border-[#171A1F] relative overflow-hidden flex flex-col justify-between min-h-[580px] print:min-h-[175mm] print:rounded-none print:border-2 print:p-8`}
        >
          <div className="flex items-center justify-between border-b border-[#171A1F]/10 pb-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF6B1F] block">
                Lâmina 05 • Por Que Escolher a CONCE
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] tracking-tight">
                Diferenciais & Garantias Técnicas
              </h2>
            </div>
            <ConceLogo height={22} variant="light" />
          </div>

          <div className="my-auto py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#294C87] text-white flex items-center justify-center">
                  <HardHat className="w-4 h-4 text-[#FF6B1F]" />
                </div>
                <h3 className="font-bold text-[#171A1F] text-sm">
                  Engenharia de Precisão (SINAPI & TCU)
                </h3>
              </div>
              <p className="text-xs text-[#171A1F]/70 leading-relaxed">
                Composições unitárias amparadas nos referenciais oficiais da Caixa Econômica Federal
                e acórdãos do Tribunal de Contas da União, garantindo índices realistas de consumo e
                preço justo de mercado.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FF6B1F] text-white flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#171A1F] text-sm">
                  Anotação de Responsabilidade Técnica (ART)
                </h3>
              </div>
              <p className="text-xs text-[#171A1F]/70 leading-relaxed">
                Emissão formal de ART perante o CREA/RS registrada pelo Eng. Edenir Souza da Rosa
                (CREA/RS-252397), conferindo respaldo jurídico e responsabilidade civil integral
                sobre os serviços executados.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#171A1F] text-white flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="font-bold text-[#171A1F] text-sm">
                  Garantia Quinquenal (Art. 618 Código Civil)
                </h3>
              </div>
              <p className="text-xs text-[#171A1F]/70 leading-relaxed">
                Garantia legal de 5 (cinco) anos quanto à solidez, segurança e estanqueidade dos
                elementos construtivos e estruturais executados pela CONCE.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#171A1F] text-sm">
                  Gestão & Comunicação Transparente
                </h3>
              </div>
              <p className="text-xs text-[#171A1F]/70 leading-relaxed">
                Relatórios fotográficos periódicos, cronograma físico de evolução e canal direto com
                o engenheiro responsável em todas as etapas da obra.
              </p>
            </div>
          </div>

          <div className="border-t border-[#171A1F]/10 pt-4 flex items-center justify-between text-xs text-[#171A1F]/60">
            <span>{CONCE_COMPANY.razaoSocial}</span>
            <span>CREA/RS-252397</span>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SLIDE 6: CONDIÇÕES COMERCIAIS DO ORÇAMENTO */}
        {/* ======================================================== */}
        <section
          className={`conce-presentation-page ${
            currentSlide === 6 ? 'block' : 'hidden print:block'
          } bg-white text-[#171A1F] rounded-3xl p-8 sm:p-12 shadow-2xl border-4 border-[#171A1F] relative overflow-hidden flex flex-col justify-between min-h-[580px] print:min-h-[175mm] print:rounded-none print:border-2 print:p-8`}
        >
          <div className="flex items-center justify-between border-b border-[#171A1F]/10 pb-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF6B1F] block">
                Lâmina 06 • Condições Contratuais
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] tracking-tight">
                Prazos & Condições de Pagamento
              </h2>
            </div>
            <ConceLogo height={22} variant="light" />
          </div>

          <div className="my-auto py-6 space-y-4">
            <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#171A1F]/15 space-y-2">
              <div className="flex items-center gap-2 text-[#294C87]">
                <Briefcase className="w-4 h-4 text-[#FF6B1F]" />
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  Condição e Fluxo de Pagamento Propostos:
                </h3>
              </div>
              <p className="text-sm text-[#171A1F] leading-relaxed font-medium bg-white p-3 rounded-xl border border-[#171A1F]/10">
                {cleanPaymentTerms}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1">
                <div className="flex items-center gap-2 text-[#294C87]">
                  <Calendar className="w-4 h-4 text-[#FF6B1F]" />
                  <span className="font-bold text-xs uppercase">Prazo de Execução:</span>
                </div>
                <p className="text-sm font-bold text-[#171A1F]">{cleanDeadline}</p>
                <p className="text-[11px] text-[#171A1F]/60">
                  {budget.executionDeadline ||
                    'Contado a partir da assinatura do contrato e liberação do canteiro.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1">
                <div className="flex items-center gap-2 text-[#294C87]">
                  <Calendar className="w-4 h-4 text-[#FF6B1F]" />
                  <span className="font-bold text-xs uppercase">Validade da Proposta:</span>
                </div>
                <p className="text-sm font-bold text-[#FF6B1F]">
                  {cleanValidityDays} dias {cleanValidityType}
                </p>
                <p className="text-[11px] text-[#171A1F]/60">
                  Garante os preços dos insumos e serviços cravados nesta data.
                </p>
              </div>
            </div>

            {budget.observations && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1">
                <span className="font-bold text-[#FF6B1F] block uppercase tracking-wide">
                  Observações Técnicas Especiais:
                </span>
                <p className="leading-relaxed">{sanitizeDocumentText(budget.observations)}</p>
              </div>
            )}
          </div>

          <div className="border-t border-[#171A1F]/10 pt-4 flex items-center justify-between text-xs text-[#171A1F]/60">
            <span>Proposta Comercial CONCE • {cleanCode}</span>
            <span>Garantia de atendimento e cumprimento rigoroso</span>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SLIDE 7: ENCERRAMENTO COM CALL-TO-ACTION & ACEITE */}
        {/* ======================================================== */}
        <section
          className={`conce-presentation-page ${
            currentSlide === 7 ? 'block' : 'hidden print:block'
          } bg-white text-[#171A1F] rounded-3xl p-8 sm:p-12 shadow-2xl border-4 border-[#171A1F] relative overflow-hidden flex flex-col justify-between min-h-[580px] print:min-h-[175mm] print:rounded-none print:border-2 print:p-8`}
        >
          <div className="flex items-center justify-between border-b border-[#171A1F]/10 pb-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF6B1F] block">
                Lâmina 07 • Próximos Passos
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] tracking-tight">
                Vamos Construir com Segurança
              </h2>
            </div>
            <ConceLogo height={22} variant="light" />
          </div>

          <div className="my-auto py-6 space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-[#171A1F]">
                Estamos prontos para iniciar o seu projeto.
              </h3>
              <p className="text-xs sm:text-sm text-[#171A1F]/70 leading-relaxed">
                Para darmos início imediato ao cronograma executivo, emissão da ART junto ao CREA/RS
                e reserva da equipe técnica, confirme o aceite desta proposta comercial.
              </p>
            </div>

            {/* Bloco de Assinaturas e Aceite Formal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#171A1F]/10 text-center space-y-2">
                <div className="w-48 h-px bg-[#171A1F] mx-auto mt-6" />
                <p className="font-bold text-[#171A1F] text-xs">
                  {CONCE_COMPANY.responsavelTecnico}
                </p>
                <p className="text-[10px] text-[#294C87] font-semibold">
                  {CONCE_COMPANY.registroCrea}
                </p>
                <p className="text-[10px] text-[#171A1F]/60">{CONCE_COMPANY.razaoSocial}</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#171A1F]/10 text-center space-y-2">
                <div className="w-48 h-px bg-[#171A1F] mx-auto mt-6" />
                <p className="font-bold text-[#171A1F] text-xs">{cleanClientName}</p>
                <p className="text-[10px] text-[#FF6B1F] font-bold">
                  Aceite da Proposta Técnico-Comercial
                </p>
                <p className="text-[10px] text-[#171A1F]/50">Data: ____/____/________</p>
              </div>
            </div>

            {/* Canais Diretos de Contato */}
            <div className="p-4 rounded-2xl bg-[#171A1F] text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#FF6B1F]" />
                <span>
                  Contato: <strong>(51) 98124-7833</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#FF6B1F]" />
                <span>
                  E-mail: <strong>engedenirsouza@gmail.com</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF6B1F]" />
                <span>Porto Alegre / RS</span>
              </div>
            </div>
          </div>

          <div className="border-t border-[#171A1F]/10 pt-4 flex items-center justify-between text-xs text-[#171A1F]/60">
            <div>
              <strong className="text-[#171A1F]">{CONCE_COMPANY.nomeFantasia}</strong> • CNPJ{' '}
              {CONCE_COMPANY.cnpjFormatado}
            </div>
            <div className="italic text-[#FF6B1F] font-semibold">{CONCE_COMPANY.slogan}</div>
          </div>
        </section>
      </main>

      {/* RODAPÉ DO VISUALIZADOR DE SLIDES (Oculto na Impressão) */}
      <footer className="w-full max-w-6xl mt-3 flex items-center justify-between text-white/60 text-xs px-2 print:hidden">
        <span>
          Use as setas do teclado (<strong>←</strong> / <strong>→</strong>) ou os botões para
          navegar entre os slides.
        </span>
        <span className="font-mono text-[11px]">Proposta {cleanCode} • CONCE Engenharia</span>
      </footer>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}

export default CommercialProposalModal
