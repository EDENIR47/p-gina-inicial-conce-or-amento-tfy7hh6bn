/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal e Documento de Exportação Profissional em PDF com Níveis de Detalhamento:
 * 1. Simplificado / Comercial: apenas Itens (etapas e serviços) com nome e Preço Final (sem coeficientes, composições, insumos ou memória de cálculo)
 * 2. Resumo por Etapas: síntese físico-financeira das macroetapas com valores finais e percentuais (sem detalhe técnico)
 * 3. Completo / Técnico: capa, resumo executivo, planilha completa com BDI, CPU detalhado com coeficientes, Curva ABC (Pareto) e memória BDI TCU (Acórdão 2.622/2013)
 * Todos os formatos mantêm Capa Institucional CONCE oficial, dados do cliente/obra, slogan no rodapé e assinaturas formais.
 */

import React, { useRef, useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Printer,
  X,
  Calculator,
  Award,
  CheckCircle2,
  Briefcase,
  Layers,
  ChevronRight,
  ShieldCheck,
  Eye,
  FileText,
  SlidersHorizontal,
} from 'lucide-react'
import { ConceLogo } from '@/components/ConceLogo'
import { FullBudget } from '@/types/budgetEngine'
import { calculateFullBudget, getServiceEffectiveUnitCost } from '@/lib/budgetEngine'
import { computeAbcCurve } from '@/lib/abcAnalysis'
import {
  formatCurrencyBRL,
  formatBudgetDeadline,
  sanitizeDocumentSource,
  sanitizeDocumentText,
  getTechnicalResponsibilityText,
  getTechnicalObligationsText,
} from '@/lib/formatters'
import { logAuditEvent } from '@/lib/intelligenceStorage'

export type PdfExportMode = 'valor_final' | 'simplificado' | 'etapas' | 'completo'

interface PdfExportModalProps {
  budget: FullBudget
  isOpen: boolean
  onClose: () => void
  initialMode?: PdfExportMode
}

interface ExportModeOption {
  id: PdfExportMode
  title: string
  subtitle: string
  badge: string
  icon: React.ElementType
  description: string
  features: string[]
  recommendedFor: string
}

const EXPORT_MODE_OPTIONS: ExportModeOption[] = [
  {
    id: 'valor_final',
    title: 'Apenas Valor Final',
    subtitle: 'Proposta Simples — Valor Global',
    badge: 'Síntese Direta',
    icon: Award,
    description:
      'Proposta comercial direta contendo exclusivamente o valor final da obra como elemento central, identificação das partes, condições comerciais e termo de assinatura formal — sem nenhuma discriminação de serviços, itens ou custos internos.',
    features: [
      'Capa institucional enxuta (logo CONCE, razão social e CNPJ 57.149.101/0001-46)',
      'Identificação clara dos clientes e endereço completo da obra',
      'VALOR FINAL DA OBRA como elemento central, sóbrio e elegante em Poppins',
      'Condições comerciais: forma de pagamento, prazo de execução e validade',
      'Zero discriminação de itens, serviços, insumos, BDI ou dados técnicos',
      'Termo formal de aceite com assinatura do RT Eng. Edenir Souza da Rosa',
    ],
    recommendedFor:
      'Fechamentos rápidos, propostas de valor global e clientes que solicitam apenas o preço final.',
  },
  {
    id: 'simplificado',
    title: 'Comercial / Simplificado',
    subtitle: 'Itens, Quantitativos e Preço Final',
    badge: 'Recomendado p/ Clientes',
    icon: Briefcase,
    description:
      'Proposta comercial direta, sóbria e elegante para apresentação e aprovação com o cliente. Discriminação dos itens orçados, dados completos do cliente e da obra, condições formais de pagamento e fechamento com valor total discreto junto às condições comerciais.',
    features: [
      'Capa institucional limpa com identificação do cliente e endereço da obra',
      'Tabela simplificada com zebra sutil: Item | Discriminação | Quantidade | Valor (R$)',
      'Valor total sóbrio e discreto posicionado no fechamento da proposta',
      'Condições de pagamento editáveis e validade da proposta expressa',
      'Sem coeficientes internos, sem insumos e sem memória de cálculo técnica',
      'Bloco de assinatura CREA/RS-252397 e rodapé institucional CONCE',
    ],
    recommendedFor: 'Envio para diretores, clientes finais e propostas contratuais simplificadas.',
  },
  {
    id: 'etapas',
    title: 'Resumo por Etapas',
    subtitle: 'Macrovisão Financeira Físico-Orçamentária',
    badge: 'Visão Executiva',
    icon: Layers,
    description:
      'Apresenta o resumo executivo financeiro e a discriminação exclusiva por macroetapas da obra com percentual de participação, mantendo os custos técnicos internos ocultos.',
    features: [
      'Capa institucional com indicadores macroeconômicos da obra',
      'Quadro de macroetapas com valores consolidados e peso percentual',
      'Resumo financeiro executivo da obra',
      'Sem abertura de composições de custo unitário (CPU)',
      'Sem abertura de insumos ou coeficientes',
      'Termo de condições contratuais e fechamento de assinaturas',
    ],
    recommendedFor: 'Reuniões de diretoria, investidores e acompanhamento físico-financeiro.',
  },
  {
    id: 'completo',
    title: 'Técnico / Completo',
    subtitle: 'Caderno Completo de Engenharia de Custos',
    badge: 'Conformidade TCU / CREA',
    icon: Calculator,
    description:
      'Caderno analítico com discriminação completa de serviços, composições de custos unitários (CPU) com coeficientes, Curva ABC de Insumos (Pareto) e memória oficial de BDI TCU (Acórdão 2.622/2013).',
    features: [
      'Capa institucional com dados completos e registro do RT',
      'Resumo executivo com apropriação detalhada por categoria',
      'Planilha com quantitativos, custos diretos e unitários c/ BDI',
      'Composições CPU analíticas (insumos, índices e coeficientes)',
      'Curva ABC Pareto de Insumos (classes A, B e C destacadas)',
      'Memória oficial de cálculo do BDI (TCU) e Leis Sociais UF',
      'Condições técnicas, ART CREA/RS-252397 e assinaturas formais',
    ],
    recommendedFor:
      'Licitações públicas, auditorias, fiscais de obra e arquivo técnico permanente.',
  },
]

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  budget,
  isOpen,
  onClose,
  initialMode = 'simplificado',
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null)
  const [selectedMode, setSelectedMode] = useState<PdfExportMode>(initialMode)
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false)

  const summary = useMemo(() => calculateFullBudget(budget), [budget])
  const abc = useMemo(() => computeAbcCurve(budget), [budget])

  // Adiciona a classe conce-printing ao body enquanto o modal estiver aberto,
  // permitindo que o CSS de impressão isole estritamente o documento da proposta
  useEffect(() => {
    if (!isOpen) return
    document.body.classList.add('conce-printing')
    return () => {
      document.body.classList.remove('conce-printing')
    }
  }, [isOpen])

  if (!isOpen) return null

  const currentOption =
    EXPORT_MODE_OPTIONS.find((opt) => opt.id === selectedMode) || EXPORT_MODE_OPTIONS[0]

  const handlePrint = () => {
    const modeLabels: Record<PdfExportMode, string> = {
      valor_final: 'Apenas Valor Final (proposta de valor global)',
      simplificado: 'Simplificado / Comercial (itens e valores finais)',
      etapas: 'Resumo por Etapas (macrovisão físico-financeira)',
      completo: 'Técnico / Completo (CPU detalhado, ABC Pareto e BDI TCU)',
    }

    const modeTitleForLog =
      selectedMode === 'valor_final'
        ? 'Apenas Valor Final'
        : currentOption.title.split('/')[0].trim()

    logAuditEvent({
      budgetId: budget.id,
      action: 'exportacao_pdf',
      title: `Exportação PDF — ${modeTitleForLog}`,
      details: `Proposta gerada em formato ${modeLabels[selectedMode]}. Valor total: ${formatCurrencyBRL(
        summary.finalSalePrice,
      )}. Cliente: ${cleanClientName || 'Não informado'}.`,
      userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
    })
    window.print()
  }

  // Subtítulo descritivo da proposta conforme o formato
  const proposalTypeLabel =
    selectedMode === 'valor_final'
      ? 'Proposta Comercial — Valor Global'
      : selectedMode === 'simplificado'
        ? 'Proposta Comercial Simplificada'
        : selectedMode === 'etapas'
          ? 'Proposta Executiva Sintética por Etapas'
          : 'Proposta Técnica & Orçamento Executivo de Obras'

  // Dados sanitizados contra vazamento de termos de IA
  const cleanCode = sanitizeDocumentText(budget.code)
  const cleanProposalTitle =
    sanitizeDocumentText(budget.title) ||
    sanitizeDocumentText(budget.work.name) ||
    'Proposta Comercial de Engenharia Civil'
  const cleanWorkName =
    sanitizeDocumentText(budget.work.name) || 'Empreendimento de Engenharia Civil'
  const cleanWorkDesc = sanitizeDocumentText(budget.work.description)
  const cleanAuthor =
    sanitizeDocumentText(budget.author) || 'Eng. Edenir Souza da Rosa - CREA/RS-252397'
  const cleanClientName = sanitizeDocumentText(budget.client.name) || 'Cliente Contratante'
  const cleanPaymentTerms =
    budget.paymentTerms ||
    '30% de entrada; 30% na entrega dos projetos base; 20% após montagem das estruturas metálicas; saldo após vistoria de entrega.'
  const cleanValidityDays = budget.validityDays ?? 5
  const cleanValidityDaysType =
    budget.validityDaysType || (budget.validityDays === 5 ? 'uteis' : 'corridos')
  const cleanExecutionDeadline =
    budget.executionDeadline ||
    budget.work?.executionDeadline ||
    'PROJETOS 15 DIAS UTEIS APOS ACEITE DA PROPOSTA E ASSINATURA DO CONTRATO, E DA EXECUÇÃO É UM ITEM DO ESCOPO DE GESTÃO POIS ESSE PRAZO DEPENDE DA CONTRATAÇÃO DA EMPREZA PARA PRODUZIR E MONTAR A ESTRUTURA METÁLICA'
  const technicalResponsibilityText = getTechnicalResponsibilityText(budget)
  const technicalObligationsText = getTechnicalObligationsText(budget, cleanAuthor)

  const modalContent = (
    <div className="conce-pdf-modal-overlay fixed inset-0 z-50 bg-[#171A1F]/80 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 print:p-0 print:bg-white">
      {/* ============================================================ */}
      {/* BARRA SUPERIOR FIXA (Oculta na Impressão) */}
      {/* ============================================================ */}
      <div className="w-full max-w-5xl bg-[#171A1F] text-white rounded-2xl p-4 mb-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl border border-white/20 print:hidden sticky top-2 z-50">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <ConceLogo height={26} variant="dark" />
          <div className="h-5 w-px bg-white/20 hidden md:block" />
          <div className="text-left">
            <span className="text-xs sm:text-sm font-semibold text-white/90 block">
              Emissão de PDF • {cleanCode}
            </span>{' '}
            <span className="text-[11px] text-[#FF6B1F] font-bold">
              Formato ativo: {currentOption.title}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Botão de Alternar Opções / Níveis */}
          <button
            type="button"
            onClick={() => setShowConfigPanel((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              showConfigPanel
                ? 'bg-[#294C87] text-white border-white/40 shadow-inner'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
            }`}
            title="Alterar nível de detalhe do PDF"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF6B1F]" />
            <span>
              Opções de Formato (
              {selectedMode === 'valor_final'
                ? 'Valor Final'
                : selectedMode === 'simplificado'
                  ? 'Comercial'
                  : selectedMode === 'etapas'
                    ? 'Etapas'
                    : 'Técnico'}
              )
            </span>
          </button>

          {/* Botão de Impressão Oficial */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer active:scale-95"
            title="Imprimir ou Salvar PDF (Ctrl+P)"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Gerar PDF</span>
          </button>

          {/* Botão Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Fechar Visualização"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PAINEL SELETOR DE FORMATO CONCE (Cartões Interativos) */}
      {/* Visível inicialmente ou quando o usuário clica em Opções */}
      {/* ============================================================ */}
      <div className="w-full max-w-5xl mb-4 print:hidden">
        <div className="bg-[#171A1F] text-white rounded-2xl p-4 sm:p-5 border border-white/15 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                NÍVEL DE DETALHAMENTO DO PDF
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Escolha o formato da proposta antes de gerar
              </h3>
            </div>
            <span className="text-[11px] text-white/60 hidden sm:inline">
              O PDF respeita estritamente o formato selecionado abaixo
            </span>
          </div>

          {/* 4 Cartões com os Formatos Disponíveis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {EXPORT_MODE_OPTIONS.map((opt) => {
              const isSelected = selectedMode === opt.id
              const Icon = opt.icon

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedMode(opt.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all relative flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#294C87]/40 to-[#171A1F] border-[#FF6B1F] shadow-[0_0_20px_rgba(255,107,31,0.25)]'
                      : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10 text-white/80'
                  }`}
                >
                  {/* Badge superior */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isSelected ? 'bg-[#FF6B1F] text-white' : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {opt.badge}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        isSelected ? 'bg-[#FF6B1F] border-[#FF6B1F] text-white' : 'border-white/30'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Cabeçalho do Card */}
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`w-4 h-4 ${isSelected ? 'text-[#FF6B1F]' : 'text-white/60'}`}
                      />
                      <h4 className="font-extrabold text-sm sm:text-base text-white">
                        {opt.title}
                      </h4>
                    </div>
                    <p className="text-xs text-[#FF6B1F] font-semibold">{opt.subtitle}</p>
                  </div>

                  {/* Descrição resumida */}
                  <p className="text-[11px] text-white/70 leading-relaxed mb-3">
                    {opt.description}
                  </p>

                  {/* Lista de destaques */}
                  <div className="space-y-1 pt-2 border-t border-white/10 text-[10px] text-white/70">
                    {opt.features.slice(0, 3).map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#FF6B1F] font-bold">•</span>
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Rodapé do Card */}
                  <div className="mt-3 pt-2 text-[10px] italic text-white/50 border-t border-white/5">
                    {opt.recommendedFor}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Banner de Status do Formato Escolhido */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B1F] animate-pulse" />
              <span className="text-white/80">
                Visualizando proposta em modelo:{' '}
                <strong className="text-white">{currentOption.title}</strong>
              </span>
            </div>
            <span className="text-[11px] text-[#FF6B1F] font-bold">
              {selectedMode === 'valor_final' &&
                '✓ Apenas valor final da obra (sem itens, serviços ou detalhamento)'}
              {selectedMode === 'simplificado' &&
                '✓ Relação de itens e quantitativos comerciais sem memória técnica'}
              {selectedMode === 'etapas' && '✓ Síntese executiva e peso percentual das etapas'}
              {selectedMode === 'completo' && '✓ Relatório técnico pleno (TCU + ABC + CPU)'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ÁREA DO DOCUMENTO FORMATADA PARA IMPRESSÃO / PDF A4 */}
      {/* ============================================================ */}
      <div
        ref={printContainerRef}
        className="w-full max-w-5xl bg-white text-[#171A1F] rounded-2xl shadow-2xl p-6 sm:p-12 mb-12 space-y-8 print:space-y-2.5 print:shadow-none print:m-0 print:p-0 print:max-w-none print:w-full print:rounded-none"
        id="conce-printable-proposal"
      >
        {/* ============================================================ */}
        {/* FORMATO 4: APENAS VALOR FINAL (PROPOSTA SIMPLES — VALOR GLOBAL) */}
        {/* Documento de página única, sóbrio e elegante */}
        {/* Capa enxuta, identificação das partes, VALOR FINAL como elemento central, */}
        {/* condições comerciais, bloco de assinatura formal e slogan no rodapé. */}
        {/* Zero itens, zero serviços, zero coeficientes, zero BDI ou dados técnicos. */}
        {/* ============================================================ */}
        {selectedMode === 'valor_final' && (
          <section className="print-page-section print-single-page min-h-[960px] flex flex-col justify-between border-4 border-[#171A1F] p-8 sm:p-12 relative overflow-hidden bg-gradient-to-b from-white via-[#F8F9FA] to-white rounded-xl print:min-h-0 print:border-2 print:p-4 print:m-0 print:page-break-inside-avoid">
            {/* Faixa decorativa superior Cobalt + Pumpkin */}
            <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-[#294C87] via-[#FF6B1F] to-[#294C87]" />

            {/* Topo: Logo Oficial e Dados Cadastrais Enxutos */}
            <div className="flex items-start justify-between pt-2 border-b border-[#171A1F]/15 pb-2.5 print:pt-0.5 print:pb-2">
              <div>
                <ConceLogo height={34} variant="light" />
                <p className="text-[10.5px] font-bold tracking-widest text-[#294C87] uppercase mt-1 print:mt-0.5">
                  CONCE — SERVIÇO DE ENGENHARIA E CONSULTORIA LTDA
                </p>
                <p className="text-[9.5px] text-[#171A1F]/70 font-medium">
                  CNPJ: 57.149.101/0001-46 • RT: Eng. Edenir Souza da Rosa - CREA/RS-252397
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded bg-[#171A1F] text-white font-mono text-[11px] font-bold uppercase tracking-wider">
                  {cleanCode}
                </span>
                <p className="text-[9.5px] text-[#171A1F]/60 mt-0.5 font-mono">
                  Emissão: {new Date().toLocaleDateString('pt-BR')}
                </p>
                <div className="mt-0.5">
                  <span className="inline-block px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#294C87]/15 text-[#294C87]">
                    Proposta Comercial — Valor Global
                  </span>
                </div>
              </div>
            </div>

            {/* Cabeçalho do Objeto e Título da Proposta */}
            <div className="py-2 print:py-1.5 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#294C87]/10 border border-[#294C87]/20 text-[#294C87] text-[10px] font-bold uppercase tracking-wider">
                <Award className="w-3 h-3 text-[#FF6B1F]" />
                <span>Proposta Comercial Direta</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-[#171A1F] tracking-tight leading-snug">
                  {cleanProposalTitle}
                </h1>
                {cleanProposalTitle !== cleanWorkName && (
                  <p className="text-xs font-semibold text-[#294C87] mt-0.5">
                    Obra: {cleanWorkName}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-[#171A1F]/80 leading-relaxed max-w-3xl">
                Apresentamos a presente proposta comercial para execução integral dos serviços de
                engenharia civil no empreendimento indicado abaixo, sob responsabilidade técnica da
                CONCE Engenharia, conforme escopo, especificações e prazos acordados entre as
                partes.
              </p>
            </div>

            {/* Identificação das Partes: Cliente e Obra */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs print:gap-2">
              <div className="space-y-0.5 p-2.5 rounded-xl bg-white border border-[#171A1F]/15 shadow-xs print:p-2">
                <span className="font-extrabold uppercase tracking-wider text-[#294C87] block text-[9.5px] flex items-center gap-1">
                  <span>👤 Cliente / Contratante</span>
                </span>
                <p className="font-bold text-xs text-[#171A1F]">{cleanClientName}</p>
                {budget.client.document && (
                  <p className="text-[#171A1F]/80 text-[10px]">
                    <strong className="text-[#171A1F]">CPF/CNPJ:</strong> {budget.client.document}
                  </p>
                )}
                {budget.client.address && (
                  <p className="text-[#171A1F]/80 text-[10px]">
                    <strong className="text-[#171A1F]">Endereço:</strong> {budget.client.address}
                  </p>
                )}
                <p className="text-[#171A1F]/80 text-[10px]">
                  <strong className="text-[#171A1F]">Localidade:</strong>{' '}
                  {budget.client.city || 'Porto Alegre'}/{budget.client.state || 'RS'}
                  {budget.client.phone ? ` • Tel.: ${budget.client.phone}` : ''}
                </p>
                {budget.client.email && (
                  <p className="text-[#171A1F]/70 text-[10px]">
                    <strong className="text-[#171A1F]">E-mail:</strong> {budget.client.email}
                  </p>
                )}
              </div>

              <div className="space-y-0.5 p-2.5 rounded-xl bg-white border border-[#171A1F]/15 shadow-xs print:p-2">
                <span className="font-extrabold uppercase tracking-wider text-[#294C87] block text-[9.5px] flex items-center gap-1">
                  <span>🏗️ Dados & Local da Obra</span>
                </span>
                <p className="font-bold text-xs text-[#171A1F]">{cleanWorkName}</p>
                <p className="text-[#171A1F]/80 text-[10px]">
                  <strong className="text-[#171A1F]">Endereço da Obra:</strong>{' '}
                  {budget.work.address || 'Rua Tomaz Gonzaga, 610, Ap. 1803'}
                </p>
                <p className="text-[#171A1F]/80 text-[10px]">
                  <strong className="text-[#171A1F]">Cidade/UF:</strong>{' '}
                  {budget.work.city || 'Porto Alegre'} / {budget.work.state || 'RS'}
                  {budget.work.totalAreaM2
                    ? ` • Área: ${budget.work.totalAreaM2.toLocaleString('pt-BR')} m²`
                    : ''}
                </p>
                <p className="font-semibold text-[#171A1F] text-[9.5px] pt-0.5">
                  Responsável Técnico: {cleanAuthor}
                </p>
              </div>
            </div>

            {/* ELEMENTO CENTRAL: O VALOR FINAL DA OBRA */}
            <div className="my-1 p-3 rounded-xl bg-[#F4F6F9] border-2 border-[#294C87]/30 shadow-xs text-center space-y-1 print:p-2.5 print:my-0.5">
              <span className="text-[9.5px] uppercase tracking-widest font-extrabold text-[#294C87] block">
                VALOR FINAL DA OBRA (PREÇO GLOBAL FECHADO)
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] font-mono tracking-tight py-0.5">
                {formatCurrencyBRL(summary.finalSalePrice)}
              </div>
              <p className="text-[10px] text-[#171A1F]/70 max-w-xl mx-auto leading-relaxed">
                Valor total integral com todos os encargos, materiais, serviços técnicos e impostos
                inclusos (CONCE — Serviço de Engenharia e Consultoria LTDA).
              </p>
            </div>

            {/* Condições Comerciais: Forma de Pagamento, Prazo de Execução, Validade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs print:gap-2">
              <div className="p-2.5 rounded-xl bg-white border border-[#171A1F]/15 space-y-1 shadow-xs print:p-2">
                <span className="font-bold uppercase tracking-wider text-[#294C87] text-[9.5px] block">
                  Forma & Condições de Pagamento
                </span>
                <p className="text-[#171A1F]/90 leading-relaxed font-medium text-[10.5px]">
                  • {cleanPaymentTerms}
                </p>
                <p className="text-[#171A1F]/70 text-[9.5px] pt-0.5 border-t border-[#171A1F]/10">
                  • Faturamento direto pela CONCE — Serviço de Engenharia e Consultoria LTDA (CNPJ
                  57.149.101/0001-46).
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-[#171A1F]/15 space-y-1 shadow-xs print:p-2">
                <span className="font-bold uppercase tracking-wider text-[#294C87] text-[9.5px] block">
                  Prazo de Execução & Validade
                </span>
                <p className="text-[#171A1F]/90 leading-relaxed font-medium text-[10.5px]">
                  • <strong className="text-[#171A1F]">Prazo Contratual:</strong>{' '}
                  {formatBudgetDeadline(budget.work)}
                </p>
                <p className="text-[#171A1F]/90 leading-relaxed font-medium text-[10.5px]">
                  • <strong className="text-[#171A1F]">Validade da Proposta:</strong>{' '}
                  {cleanValidityDays}{' '}
                  {cleanValidityDaysType === 'uteis' ? 'dias úteis' : 'dias corridos'} (a contar da
                  emissão).
                </p>
                {cleanExecutionDeadline && (
                  <p className="text-[#171A1F]/90 leading-relaxed text-[9.5px]">
                    • <strong className="text-[#171A1F]">Prazo de Execução:</strong>{' '}
                    {cleanExecutionDeadline}
                  </p>
                )}
                {budget.commercialNotes && (
                  <p className="text-[#171A1F]/75 text-[9.5px] pt-0.5 border-t border-[#171A1F]/10">
                    <strong className="text-[#171A1F]">Observações:</strong>{' '}
                    {budget.commercialNotes}
                  </p>
                )}
              </div>
            </div>

            {/* Termo de Garantia e Responsabilidade Técnica */}
            <div className="p-2 rounded-xl bg-white/80 border border-[#171A1F]/10 text-[9.5px] space-y-0.5 print:p-1.5">
              <span className="font-bold uppercase tracking-wider text-[#294C87] text-[9px] block">
                Garantia e Responsabilidade Técnica
              </span>
              <p className="text-[#171A1F]/80 leading-relaxed text-[9.5px] whitespace-pre-wrap">
                {technicalResponsibilityText}
              </p>
            </div>

            {/* Bloco de Assinaturas Formais */}
            <div className="pt-2.5 print:pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 print:gap-3 text-center text-xs">
              <div className="space-y-0.5">
                <div className="w-44 mx-auto border-t-2 border-[#171A1F]" />
                <p className="font-bold text-xs text-[#171A1F]">{cleanAuthor}</p>
                <p className="text-[9.5px] text-[#171A1F]/70">
                  CONCE — Serviço de Engenharia e Consultoria LTDA
                </p>
                <p className="text-[9.5px] text-[#294C87] font-semibold">
                  Responsável Técnico • CREA/RS-252397
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="w-44 mx-auto border-t-2 border-[#171A1F]" />
                <p className="font-bold text-xs text-[#171A1F]">{cleanClientName}</p>
                <p className="text-[9.5px] text-[#171A1F]/70">
                  CNPJ/CPF: {budget.client.document || '---'}
                </p>
                <p className="text-[9.5px] text-[#294C87] font-semibold">De Acordo / Contratante</p>
              </div>
            </div>

            {/* Rodapé Oficial com Logo, Slogan e CNPJ (sem nenhuma URL ou hostname) */}
            <div className="pt-2 print:pt-1 border-t border-[#171A1F]/15 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-2">
                <ConceLogo height={16} variant="light" />
                <span className="italic font-bold text-[#FF6B1F] text-[10.5px]">
                  "Conce é conceito. Conce é concreto."
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#171A1F]/70 text-[9.5px]">
                <span className="font-semibold">CNPJ: 57.149.101/0001-46</span>
                <span>•</span>
                <span>Proposta Comercial de Valor Global • CONCE Engenharia</span>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* 1. CAPA INSTITUCIONAL CONCE (Presente nos formatos Simplificado, Etapas e Completo) */}
        {/* ============================================================ */}
        {selectedMode !== 'valor_final' && (
          <section className="print-page-section print-cover-page min-h-0 flex flex-col justify-between border-4 border-[#171A1F] p-8 sm:p-12 relative overflow-hidden bg-gradient-to-b from-white via-[#F8F9FA] to-white rounded-xl print:border-2 print:p-3 print:m-0">
            {/* Faixa decorativa superior Cobalt + Pumpkin */}
            <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-[#294C87] via-[#FF6B1F] to-[#294C87]" />

            {/* Topo da Capa: Logo Oficial */}
            <div className="flex items-start justify-between pt-2 print:pt-0">
              <div>
                <ConceLogo height={32} variant="light" />
                <p className="text-[10px] font-bold tracking-widest text-[#294C87] uppercase mt-1 print:mt-0">
                  SERVIÇO DE ENGENHARIA E CONSULTORIA LTDA
                </p>
                <p className="text-[9.5px] text-[#171A1F]/70 font-medium">
                  CNPJ: 57.149.101/0001-46 • RT: Eng. Edenir Souza da Rosa - CREA/RS-252397
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded bg-[#171A1F] text-white font-mono text-[11px] font-bold uppercase tracking-wider">
                  {cleanCode}
                </span>
                <p className="text-[9.5px] text-[#171A1F]/60 mt-0.5 font-mono">
                  Emissão: {new Date().toLocaleDateString('pt-BR')}
                </p>
                <div className="mt-0.5 flex flex-col items-end gap-0.5">
                  <span className="inline-block px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#294C87]/15 text-[#294C87]">
                    {selectedMode === 'simplificado'
                      ? 'Proposta Simplificada'
                      : selectedMode === 'etapas'
                        ? 'Resumo por Etapas'
                        : 'Relatório Técnico Completo'}
                  </span>
                  {budget.publicWork?.enabled && (
                    <span className="inline-block px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F]">
                      Licitação Pública ({budget.publicWork.modality})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Miolo da Capa: Título do Empreendimento e Proposta */}
            <div className="my-auto py-2.5 print:py-1 space-y-2 print:space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#294C87]/10 border border-[#294C87]/20 text-[#294C87] text-[10.5px] font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 text-[#FF6B1F]" />
                <span>{proposalTypeLabel}</span>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#171A1F] tracking-tight leading-snug">
                  {cleanProposalTitle}
                </h1>
                {cleanProposalTitle !== cleanWorkName && (
                  <p className="text-xs font-semibold text-[#294C87] mt-0.5">
                    Obra: {cleanWorkName}
                  </p>
                )}
              </div>

              <p className="text-[11px] text-[#171A1F]/80 max-w-2xl leading-relaxed">
                {cleanWorkDesc ||
                  (selectedMode === 'simplificado'
                    ? 'Proposta comercial para execução de serviços de engenharia civil com relação discriminada de itens e escopo contratual.'
                    : 'Orçamento analítico e discriminado de obras civis com detalhamento de insumos, encargos sociais e cálculo do BDI em conformidade com o Acórdão 2.622/2013 do Plenário do Tribunal de Contas da União.')}
              </p>

              {/* Apresentação de valor e prazo na capa (oculta no modelo Comercial/Simplificado a pedido do usuário: o valor fica somente na última página) */}
              {selectedMode !== 'simplificado' && (
                <div className="p-2.5 rounded-xl bg-white border border-[#171A1F]/15 shadow-sm max-w-lg flex items-center justify-between gap-3 print:p-1.5">
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] uppercase font-bold text-[#171A1F]/60 tracking-wider block">
                      Estimativa Global da Proposta
                    </span>
                    <span className="text-base sm:text-lg font-bold text-[#171A1F] font-mono block">
                      {formatCurrencyBRL(summary.finalSalePrice)}
                    </span>
                    <span className="text-[9.5px] text-[#171A1F]/50 block">
                      Condições comerciais detalhadas ao final deste documento
                    </span>
                  </div>
                  <div className="text-right border-l border-[#171A1F]/10 pl-3 shrink-0">
                    <span className="text-[9.5px] uppercase font-semibold text-[#294C87] block">
                      Prazo Contratual
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#171A1F]">
                      {formatBudgetDeadline(budget.work)}
                    </span>
                    <span className="text-[9.5px] text-[#171A1F]/50 block mt-0.5">
                      Validade: {cleanValidityDays}{' '}
                      {cleanValidityDaysType === 'uteis' ? 'dias úteis' : 'dias'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Dados de Identificação Completos do Cliente e da Obra */}
            <div className="border-t-2 border-[#171A1F]/15 pt-2 print:pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 print:gap-1.5 text-xs">
              <div className="space-y-0.5 p-2.5 rounded-xl bg-white/70 border border-[#171A1F]/10 print:p-1.5">
                <span className="font-extrabold uppercase tracking-wider text-[#294C87] block text-[9.5px] flex items-center gap-1">
                  <span>👤 Dados do Cliente / Contratante</span>
                </span>
                <p className="font-bold text-xs text-[#171A1F]">{cleanClientName}</p>
                <p className="text-[#171A1F]/80 text-[10px]">
                  <strong className="text-[#171A1F]">CPF/CNPJ:</strong>{' '}
                  {budget.client.document || 'Não informado'}
                </p>
                <p className="text-[#171A1F]/80 text-[10px]">
                  <strong className="text-[#171A1F]">Endereço:</strong>{' '}
                  {budget.client.address || 'Não informado'}
                </p>
                <p className="text-[#171A1F]/80 text-[10px]">
                  <strong className="text-[#171A1F]">Cidade/UF:</strong>{' '}
                  {budget.client.city || 'São Paulo'}/{budget.client.state || 'SP'}
                  {budget.client.phone && ` • Tel.: ${budget.client.phone}`}
                </p>
                {budget.client.email && (
                  <p className="text-[#171A1F]/70 text-[10px]">
                    <strong className="text-[#171A1F]">E-mail:</strong> {budget.client.email}
                  </p>
                )}
              </div>

              <div className="space-y-0.5 p-2.5 rounded-xl bg-white/70 border border-[#171A1F]/10 print:p-1.5">
                <span className="font-extrabold uppercase tracking-wider text-[#294C87] block text-[9.5px] flex items-center gap-1">
                  <span>🏗️ Dados & Local da Obra</span>
                </span>
                <p className="font-bold text-xs text-[#171A1F]">{cleanWorkName}</p>
                <p className="text-[#171A1F]/80 text-[10px]">
                  <strong className="text-[#171A1F]">Endereço da Obra:</strong>{' '}
                  {budget.work.address || 'A definir / Conforme memorial'}
                </p>
                <p className="text-[#171A1F]/80 text-[10px]">
                  <strong className="text-[#171A1F]">Localidade:</strong> {budget.work.city} /{' '}
                  {budget.work.state}
                  {budget.work.totalAreaM2
                    ? ` • Área: ${budget.work.totalAreaM2.toLocaleString('pt-BR')} m²`
                    : ''}
                </p>
                <p className="font-semibold text-[#171A1F] text-[9.5px] pt-0.5">
                  Responsável Técnico: {cleanAuthor}
                </p>
              </div>
            </div>

            {/* Rodapé da Capa com Slogan e CNPJ (sem nenhuma URL ou hostname) */}
            <div className="pt-2 print:pt-1 border-t border-[#171A1F]/10 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="italic font-bold text-[#FF6B1F] text-[10.5px]">
                  "Conce é conceito. Conce é concreto."
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#171A1F]/70 text-[9.5px]">
                <span className="font-semibold">CNPJ: 57.149.101/0001-46</span>
                <span>•</span>
                <span>Página 1 • Capa Institucional CONCE</span>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* NÍVEL 1: SIMPLIFICADO / COMERCIAL */}
        {/* Apenas lista de itens (Etapas e Serviços) com nome e Preço Final */}
        {/* Sem coeficientes, sem insumos, sem memória de BDI/encargos */}
        {/* Tabela elegante com zebra sutil, cabeçalho sóbrio e fechamento discreto */}
        {/* ============================================================ */}
        {selectedMode === 'simplificado' && (
          <section className="print-page-section space-y-4 print:space-y-2">
            {/* Cabeçalho da Seção com Identificação do Cliente e Obra */}
            <div className="border-b-2 border-[#294C87] pb-2 flex flex-col sm:flex-row sm:items-end justify-between gap-1.5">
              <div>
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#294C87]">
                  PLANILHA COMERCIAL DE SERVIÇOS
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#171A1F]">
                  Discriminação dos Serviços & Quantitativos
                </h2>
                <p className="text-xs text-[#171A1F]/70 mt-0.5">
                  Proposta comercial para o cliente{' '}
                  <strong className="text-[#171A1F]">{cleanClientName}</strong> • Obra:{' '}
                  <strong className="text-[#171A1F]">{cleanWorkName}</strong>
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-[#171A1F]/60 block">
                  Ref.: {cleanCode}
                </span>
                <span className="text-[9.5px] text-[#294C87] font-semibold">
                  Tributação: Simples Nacional
                </span>
              </div>
            </div>

            {/* Tabela Limpa e Elegante com Zebra Sutil */}
            <div className="overflow-x-auto border border-[#171A1F]/20 rounded-xl shadow-xs bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#171A1F] text-white uppercase text-[9.5px] font-bold tracking-wider">
                  <tr>
                    <th className="py-2 px-2.5 w-16 text-center">Item</th>
                    <th className="py-2 px-2.5">Discriminação dos Serviços Contratados</th>
                    <th className="py-2 px-2.5 w-14 text-center">Unid.</th>
                    <th className="py-2 px-2.5 w-24 text-right">Quantidade</th>
                    <th className="py-2 px-3 w-36 text-right">Valor Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171A1F]/10">
                  {budget.stages.map((stage) => {
                    const stageSummary = summary.stagesSubtotals.find((s) => s.stageId === stage.id)
                    const stageTotalWithBdi = stageSummary ? stageSummary.withBdi : 0

                    return (
                      <React.Fragment key={stage.id}>
                        {/* Linha de Macroetapa */}
                        <tr className="bg-[#294C87]/10 font-bold text-[#171A1F] border-t-2 border-[#294C87]/30">
                          <td className="py-1.5 px-2.5 font-mono text-[#294C87] text-center font-bold">
                            {stage.code}
                          </td>
                          <td className="py-1.5 px-2.5 uppercase text-xs tracking-wide" colSpan={3}>
                            {stage.name}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-[#294C87] text-xs">
                            {formatCurrencyBRL(stageTotalWithBdi)}
                          </td>
                        </tr>

                        {/* Linhas dos Serviços da Etapa com zebra sutil */}
                        {stage.services.map((service, idx) => {
                          const sQty = Number(service.quantity) || 0
                          const laborMult = 1 + (summary.socialChargesRate || 0) / 100
                          const compUnit = getServiceEffectiveUnitCost(service, laborMult)
                          const serviceBdi = service.customBdiPercent ?? summary.bdiRate
                          const unitWithBdi = compUnit * (1 + serviceBdi / 100)
                          const totalWithBdi = unitWithBdi * sQty
                          const isEven = idx % 2 === 0

                          return (
                            <tr
                              key={service.id}
                              className={`transition-colors ${isEven ? 'bg-white' : 'bg-[#F8F9FA]/70'} hover:bg-blue-50/40`}
                            >
                              <td className="py-1.5 px-2.5 font-mono text-[#171A1F]/70 text-center font-semibold text-[11px]">
                                {service.code}
                              </td>
                              <td className="py-1.5 px-2.5 font-medium text-[#171A1F]">
                                {service.description}
                              </td>
                              <td className="py-1.5 px-2.5 text-center font-mono text-[#171A1F]/70 text-[11px]">
                                {service.unit}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono text-[#171A1F]/80 text-[11px]">
                                {sQty.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-bold text-[#171A1F] text-xs">
                                {formatCurrencyBRL(totalWithBdi)}
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Nota de Escopo Comercial */}
            <p className="text-[10px] text-[#171A1F]/60 italic">
              * Os valores unitários dos serviços englobam mão de obra técnica especializada,
              materiais básicos e acabamentos conforme projetos e especificações acordadas,
              tributação sob regime do Simples Nacional e BDI padrão de engenharia.
            </p>
          </section>
        )}

        {/* ============================================================ */}
        {/* NÍVEL 2: RESUMO POR ETAPAS (Sintético / Macrovisão) */}
        {/* Tabela apenas com as macroetapas da obra, valores e percentuais */}
        {/* ============================================================ */}
        {selectedMode === 'etapas' && (
          <section className="print-page-section space-y-4 print:space-y-2">
            <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-2">
              <div>
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                  SÍNTESE FÍSICO-FINANCEIRA
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#171A1F]">
                  Resumo Orçamentário por Macroetapas
                </h2>
                <p className="text-xs text-[#171A1F]/70 mt-0.5">
                  Consolidação dos valores finais por fase da obra e distribuição percentual do
                  investimento.
                </p>
              </div>
              <ConceLogo height={20} variant="light" />
            </div>

            {/* Tabela de Macroetapas */}
            <div className="overflow-x-auto border-2 border-[#171A1F]/20 rounded-xl shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#171A1F] text-white uppercase text-[9.5px] font-bold tracking-wider">
                  <tr>
                    <th className="py-2 px-3 w-16 text-center">Etapa</th>
                    <th className="py-2 px-3">Descrição da Macroetapa da Obra</th>
                    <th className="py-2 px-3 w-28 text-center">Qtd. Serviços</th>
                    <th className="py-2 px-3 w-36 text-right">Valor Final (R$)</th>
                    <th className="py-2 px-3 w-20 text-right">Peso %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171A1F]/10">
                  {budget.stages.map((stage) => {
                    const stageSummary = summary.stagesSubtotals.find((s) => s.stageId === stage.id)
                    const stageValue = stageSummary ? stageSummary.withBdi : 0
                    const stagePercent = stageSummary ? stageSummary.percentageOfTotal : 0

                    return (
                      <tr key={stage.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-[#294C87] text-center text-xs">
                          {stage.code}
                        </td>
                        <td className="py-2 px-3 font-bold text-[#171A1F] text-xs sm:text-sm">
                          {stage.name}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[#171A1F]/70 text-[11px]">
                          {stage.services.length} {stage.services.length === 1 ? 'item' : 'itens'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#171A1F] text-xs sm:text-sm">
                          {formatCurrencyBRL(stageValue)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#FF6B1F] text-xs">
                          {stagePercent}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-[#171A1F] text-white font-extrabold text-xs">
                  <tr>
                    <td className="py-2 px-3 uppercase text-right" colSpan={3}>
                      TOTAL GLOBAL DA OBRA:
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-sm sm:text-base font-bold text-white">
                      {formatCurrencyBRL(summary.finalSalePrice)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-white/80">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Grade de Cards das Etapas com Barras Visuais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {summary.stagesSubtotals.map((st) => (
                <div
                  key={st.stageId}
                  className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#294C87]">{st.code}</span>
                    <span className="font-mono text-xs font-bold text-[#FF6B1F]">
                      {st.percentageOfTotal}%
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-[#171A1F] truncate">{st.name}</h4>
                  <div className="w-full bg-[#171A1F]/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#294C87] h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(2, st.percentageOfTotal))}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-xs text-[#171A1F] block text-right">
                    {formatCurrencyBRL(st.withBdi)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* NÍVEL 3: COMPLETO / TÉCNICO */}
        {/* Resumo Executivo + Planilha Completa + CPU + Curva ABC + BDI TCU */}
        {/* ============================================================ */}
        {selectedMode === 'completo' && (
          <>
            {/* SEÇÃO 1 • RESUMO EXECUTIVO E INDICADORES DA OBRA */}
            <section className="print-page-section space-y-4 print:space-y-2">
              <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-2">
                <div>
                  <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                    SEÇÃO 1 • VISÃO GERAL
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#171A1F]">
                    Resumo Executivo do Orçamento
                  </h2>
                </div>
                <ConceLogo height={20} variant="light" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10">
                  <span className="text-[9.5px] uppercase font-bold text-[#171A1F]/60 block">
                    Custo Direto Base
                  </span>
                  <span className="text-sm sm:text-base font-bold text-[#171A1F] block mt-0.5">
                    {formatCurrencyBRL(summary.directCostInputs)}
                  </span>
                  <span className="text-[9.5px] text-[#171A1F]/50">Materiais, MO e Máquinas</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10">
                  <span className="text-[9.5px] uppercase font-bold text-[#171A1F]/60 block">
                    Encargos Sociais ({budget.chargesConfig?.uf || 'RS'})
                  </span>
                  <span className="text-sm sm:text-base font-bold text-[#294C87] block mt-0.5">
                    {formatCurrencyBRL(summary.socialChargesAmount)}
                  </span>
                  <span className="text-[9.5px] text-[#171A1F]/50">
                    Taxa de {summary.socialChargesRate.toFixed(2)}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10">
                  <span className="text-[9.5px] uppercase font-bold text-[#171A1F]/60 block">
                    BDI TCU Acórdão 2.622
                  </span>
                  <span className="text-sm sm:text-base font-bold text-[#FF6B1F] block mt-0.5">
                    {formatCurrencyBRL(summary.bdiAmount)}
                  </span>
                  <span className="text-[9.5px] text-[#171A1F]/50">
                    Taxa de {summary.bdiRate.toFixed(2)}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#171A1F] text-white border border-[#171A1F]">
                  <span className="text-[9.5px] uppercase font-bold text-[#FF6B1F] block">
                    Preço de Venda Final
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white block mt-0.5">
                    {formatCurrencyBRL(summary.finalSalePrice)}
                  </span>
                  <span className="text-[9.5px] text-white/60">Valor Global Fechado</span>
                </div>
              </div>

              {/* Distribuição por Macrogrupos de Custo */}
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#171A1F]/80">
                  Apropriação dos Custos Diretos por Categoria
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-[#171A1F]/10">
                    <span className="text-[#171A1F]/60 block text-[11px]">Materiais</span>
                    <span className="font-bold text-[#171A1F] text-xs sm:text-sm">
                      {formatCurrencyBRL(summary.materialDirectCost)}
                    </span>
                    <span className="text-[9.5px] text-[#294C87] block font-semibold">
                      {summary.totalDirectCost > 0
                        ? ((summary.materialDirectCost / summary.totalDirectCost) * 100).toFixed(1)
                        : 0}
                      % do direto
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-[#171A1F]/10">
                    <span className="text-[#171A1F]/60 block text-[11px]">Mão de Obra c/ Leis</span>
                    <span className="font-bold text-[#171A1F] text-xs sm:text-sm">
                      {formatCurrencyBRL(summary.laborDirectCost + summary.socialChargesAmount)}
                    </span>
                    <span className="text-[9.5px] text-[#294C87] block font-semibold">
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

                  <div className="p-2.5 bg-white rounded-lg border border-[#171A1F]/10">
                    <span className="text-[#171A1F]/60 block text-[11px]">Equipamentos</span>
                    <span className="font-bold text-[#171A1F] text-xs sm:text-sm">
                      {formatCurrencyBRL(summary.equipmentDirectCost)}
                    </span>
                    <span className="text-[9.5px] text-[#294C87] block font-semibold">
                      {summary.totalDirectCost > 0
                        ? ((summary.equipmentDirectCost / summary.totalDirectCost) * 100).toFixed(1)
                        : 0}
                      % do direto
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-[#171A1F]/10">
                    <span className="text-[#171A1F]/60 block text-[11px]">
                      Serviços de Terceiros
                    </span>
                    <span className="font-bold text-[#171A1F] text-xs sm:text-sm">
                      {formatCurrencyBRL(summary.subcontractDirectCost)}
                    </span>
                    <span className="text-[9.5px] text-[#294C87] block font-semibold">
                      {summary.totalDirectCost > 0
                        ? ((summary.subcontractDirectCost / summary.totalDirectCost) * 100).toFixed(
                            1,
                          )
                        : 0}
                      % do direto
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* SEÇÃO 2 • PLANILHA ORÇAMENTÁRIA DETALHADA COM BDI */}
            <section className="print-page-section space-y-3 print:space-y-2">
              <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-2">
                <div>
                  <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                    SEÇÃO 2 • DISCRIMINAÇÃO TÉCNICA
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#171A1F]">
                    Planilha Orçamentária por Etapa e Serviço
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-[#171A1F]/60">
                  Total de Etapas: {budget.stages.length}
                </span>
              </div>

              <div className="overflow-x-auto border border-[#171A1F]/20 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#171A1F] text-white uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-2 px-2.5 w-14">Item</th>
                      <th className="py-2 px-2.5">Discriminação das Etapas e Serviços</th>
                      <th className="py-2 px-2 text-center w-12">Unid.</th>
                      <th className="py-2 px-2 text-right w-16">Qtd.</th>
                      <th className="py-2 px-2.5 text-right w-24">Unitário Direto</th>
                      <th className="py-2 px-2.5 text-right w-24">Unitário c/ BDI</th>
                      <th className="py-2 px-2.5 text-right w-28">Total c/ BDI</th>
                      <th className="py-2 px-2 text-right w-14">Peso %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171A1F]/10">
                    {budget.stages.map((stage) => {
                      const stageSummary = summary.stagesSubtotals.find(
                        (s) => s.stageId === stage.id,
                      )

                      return (
                        <React.Fragment key={stage.id}>
                          {/* Linha da Etapa */}
                          <tr className="bg-[#294C87]/10 font-extrabold text-[#171A1F] border-t-2 border-[#294C87]/40">
                            <td className="py-1.5 px-2.5 font-mono text-[#294C87]">{stage.code}</td>
                            <td className="py-1.5 px-2.5 uppercase text-xs" colSpan={4}>
                              {stage.name}
                            </td>
                            <td className="py-1.5 px-2.5 text-right text-[10px] text-[#171A1F]/60">
                              Subtotal Etapa:
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-[#294C87] text-xs">
                              {formatCurrencyBRL(stageSummary ? stageSummary.withBdi : 0)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-[#FF6B1F] text-xs">
                              {stageSummary ? `${stageSummary.percentageOfTotal}%` : '0%'}
                            </td>
                          </tr>

                          {/* Linhas dos Serviços da Etapa */}
                          {stage.services.map((service) => {
                            const sQty = Number(service.quantity) || 0
                            const laborMult = 1 + (summary.socialChargesRate || 0) / 100
                            const compUnit = getServiceEffectiveUnitCost(service, laborMult)
                            const serviceBdi = service.customBdiPercent ?? summary.bdiRate
                            const unitWithBdi = compUnit * (1 + serviceBdi / 100)
                            const totalWithBdi = unitWithBdi * sQty
                            const weight =
                              summary.finalSalePrice > 0
                                ? (totalWithBdi / summary.finalSalePrice) * 100
                                : 0

                            return (
                              <tr
                                key={service.id}
                                className="hover:bg-gray-50/80 transition-colors"
                              >
                                <td className="py-1.5 px-2.5 font-mono text-[#171A1F]/60 font-semibold text-[11px]">
                                  {service.code}
                                </td>
                                <td className="py-1.5 px-2.5">
                                  <span className="font-semibold text-[#171A1F]">
                                    {service.description}
                                  </span>
                                  {service.composition && (
                                    <span className="block font-mono text-[9.5px] text-[#171A1F]/50">
                                      Comp: {service.composition.code} (
                                      {sanitizeDocumentSource(service.composition.source)})
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono text-[11px]">
                                  {service.unit}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-[11px]">
                                  {sQty.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-1.5 px-2.5 text-right font-mono text-[#171A1F]/70 text-[11px]">
                                  {formatCurrencyBRL(compUnit)}
                                </td>
                                <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-[#294C87] text-[11px]">
                                  {formatCurrencyBRL(unitWithBdi)}
                                </td>
                                <td className="py-1.5 px-2.5 text-right font-mono font-bold text-[#171A1F] text-xs">
                                  {formatCurrencyBRL(totalWithBdi)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-[10px] text-[#171A1F]/60">
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
                      <td className="py-2 px-2.5 uppercase text-right" colSpan={6}>
                        VALOR TOTAL GERAL DA PROPOSTA (PREÇO DE VENDA COM BDI):
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-xs sm:text-sm font-bold text-white">
                        {formatCurrencyBRL(summary.finalSalePrice)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-white/80 text-[11px]">
                        100%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* SEÇÃO 3 • COMPOSIÇÕES DE CUSTOS UNITÁRIOS (CPU DETALHADA) */}
            <section className="print-page-section space-y-3 print:space-y-2">
              <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-2">
                <div>
                  <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                    SEÇÃO 3 • ENGENHARIA DE DETALHAMENTO
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#171A1F]">
                    Composição de Custos Unitários (CPU Analítica)
                  </h2>
                </div>
                <Calculator className="w-4 h-4 text-[#294C87]" />
              </div>

              <p className="text-[11px] text-[#171A1F]/70 leading-relaxed">
                Detalhamento de coeficientes de consumo, categorias (material, mão de obra,
                equipamentos) e custos base que formam as composições de referência utilizadas neste
                orçamento.
              </p>

              <div className="space-y-3">
                {budget.stages.flatMap((st) =>
                  st.services.map((serv) => {
                    const comp = serv.composition
                    if (!comp || !comp.inputs || comp.inputs.length === 0) return null

                    return (
                      <div
                        key={serv.id}
                        className="border border-[#171A1F]/15 rounded-xl overflow-hidden bg-white shadow-xs"
                      >
                        <div className="bg-[#F4F6F9] px-3.5 py-2 border-b border-[#171A1F]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-[#294C87] text-white text-[9.5px]">
                              {comp.code}
                            </span>
                            <span className="font-bold text-[#171A1F] text-xs">
                              {serv.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 text-[#171A1F]/70 text-[10.5px]">
                            <span>
                              Unidade:{' '}
                              <strong className="text-[#171A1F] font-mono">{comp.unit}</strong>
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
                          <thead className="bg-[#171A1F]/5 text-[#171A1F]/70 text-[9.5px] font-bold uppercase">
                            <tr>
                              <th className="py-1.5 px-2.5 w-24">Código Insumo</th>
                              <th className="py-1.5 px-2.5">Descrição do Insumo / Parcela</th>
                              <th className="py-1.5 px-2.5 w-24">Tipo</th>
                              <th className="py-1.5 px-2 text-center w-14">Unid.</th>
                              <th className="py-1.5 px-2 text-right w-20">Coeficiente</th>
                              <th className="py-1.5 px-2 text-right w-24">Custo Unit. (R$)</th>
                              <th className="py-1.5 px-2.5 text-right w-24">Total Parcela (R$)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#171A1F]/5">
                            {comp.inputs.map((inp, idx) => {
                              const coef = Number(inp.coefficient) || 0
                              const unitCost = Number(inp.unitCost) || 0
                              const parcelCost = coef * unitCost

                              return (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                  <td className="py-1 px-2.5 font-mono text-[10.5px] text-[#294C87]">
                                    {inp.code}
                                  </td>
                                  <td className="py-1 px-2.5 font-medium text-[#171A1F] text-[11px]">
                                    {inp.description}
                                  </td>
                                  <td className="py-1 px-2.5 uppercase text-[9.5px] font-semibold text-[#171A1F]/60">
                                    {inp.category.replace('_', ' ')}
                                  </td>
                                  <td className="py-1 px-2 text-center font-mono text-[10.5px]">
                                    {inp.unit}
                                  </td>
                                  <td className="py-1 px-2 text-right font-mono text-[10.5px]">
                                    {coef.toFixed(4)}
                                  </td>
                                  <td className="py-1 px-2 text-right font-mono text-[10.5px]">
                                    {formatCurrencyBRL(unitCost)}
                                  </td>
                                  <td className="py-1 px-2.5 text-right font-mono font-semibold text-[#171A1F] text-[11px]">
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

            {/* SEÇÃO 4 • CURVA ABC DE INSUMOS (PARETO) */}
            <section className="print-page-section space-y-3 print:space-y-2">
              <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-2">
                <div>
                  <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                    SEÇÃO 4 • ANÁLISE DE PARETO
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#171A1F]">
                    Curva ABC dos Insumos de Maior Impacto
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FF6B1F]/15 text-[#FF6B1F] text-[11px] font-bold">
                  <span>Classe A: Destaque Pumpkin Orange</span>
                </div>
              </div>

              {/* Cards com os blocos A, B e C */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-[#FF6B1F]/10 border-2 border-[#FF6B1F]">
                  <span className="text-[11px] font-bold text-[#FF6B1F] uppercase block">
                    Classe A (Prioridade Máxima)
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-[#171A1F] mt-0.5">
                    {formatCurrencyBRL(abc.classA.totalCost)}
                  </div>
                  <p className="text-[10.5px] text-[#171A1F]/70 mt-0.5">
                    {abc.classA.itemsCount} itens ({abc.classA.percentageOfItems}%) representam{' '}
                    <strong>{abc.classA.percentageOfCost}%</strong> do custo direto
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#294C87]/10 border border-[#294C87]/40">
                  <span className="text-[11px] font-bold text-[#294C87] uppercase block">
                    Classe B (Impacto Médio)
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-[#171A1F] mt-0.5">
                    {formatCurrencyBRL(abc.classB.totalCost)}
                  </div>
                  <p className="text-[10.5px] text-[#171A1F]/70 mt-0.5">
                    {abc.classB.itemsCount} itens ({abc.classB.percentageOfItems}%) representam{' '}
                    <strong>{abc.classB.percentageOfCost}%</strong> do custo
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#171A1F]/5 border border-[#171A1F]/15">
                  <span className="text-[11px] font-bold text-[#171A1F]/70 uppercase block">
                    Classe C (Itens Secundários)
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-[#171A1F] mt-0.5">
                    {formatCurrencyBRL(abc.classC.totalCost)}
                  </div>
                  <p className="text-[10.5px] text-[#171A1F]/70 mt-0.5">
                    {abc.classC.itemsCount} itens ({abc.classC.percentageOfItems}%) somam{' '}
                    <strong>{abc.classC.percentageOfCost}%</strong>
                  </p>
                </div>
              </div>

              {/* Tabela dos Principais Itens da Curva ABC */}
              <div className="overflow-x-auto border border-[#171A1F]/20 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#171A1F] text-white uppercase text-[9.5px] font-bold">
                    <tr>
                      <th className="py-2 px-2.5 w-12 text-center">Rank</th>
                      <th className="py-2 px-2 w-14 text-center">Classe</th>
                      <th className="py-2 px-2.5 w-20">Código</th>
                      <th className="py-2 px-2.5">Descrição do Insumo</th>
                      <th className="py-2 px-2 w-18">Tipo</th>
                      <th className="py-2 px-2 text-right w-18">Qtd. Total</th>
                      <th className="py-2 px-2.5 text-right w-22">Custo Unit.</th>
                      <th className="py-2 px-2.5 text-right w-24">Custo Total</th>
                      <th className="py-2 px-2 text-right w-18">% Acumulada</th>
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
                        <td className="py-1.5 px-2.5 text-center font-bold text-[#171A1F] text-[11px]">
                          #{item.rank}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold ${
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
                        <td className="py-1.5 px-2.5 font-mono text-[10.5px] text-[#294C87] font-bold">
                          {item.code}
                        </td>
                        <td className="py-1.5 px-2.5 font-semibold text-[#171A1F] text-[11px]">
                          {item.description}
                        </td>
                        <td className="py-1.5 px-2 uppercase text-[9.5px] text-[#171A1F]/60">
                          {item.category.replace('_', ' ')}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-[10.5px]">
                          {item.totalQuantity.toLocaleString('pt-BR')} {item.unit}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-[10.5px]">
                          {formatCurrencyBRL(item.unitCost)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-[#171A1F] text-[11px]">
                          {formatCurrencyBRL(item.totalCost)}
                        </td>
                        <td
                          className={`py-1.5 px-2 text-right font-mono font-bold text-[10.5px] ${
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

            {/* SEÇÃO 5 • MEMÓRIA DE BDI (TCU) E ENCARGOS SOCIAIS */}
            <section className="print-page-section space-y-3 print:space-y-2">
              <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-2">
                <div>
                  <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                    SEÇÃO 5 • CONFORMIDADE LEGAL
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#171A1F]">
                    Memória de Cálculo de BDI TCU & Encargos Sociais
                  </h2>
                </div>
                <ShieldCheck className="w-4 h-4 text-[#294C87]" />
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
                        {(budget.bdiConfig?.administrationCentral ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Taxa de Risco (R):</span>
                      <span className="font-mono font-bold">
                        {(budget.bdiConfig?.risk ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Seguro e Garantia (S + G):</span>
                      <span className="font-mono font-bold">
                        {(budget.bdiConfig?.insuranceAndGuarantee ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Despesas Financeiras (DF):</span>
                      <span className="font-mono font-bold">
                        {(budget.bdiConfig?.financialExpenses ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Lucro Operacional (L):</span>
                      <span className="font-mono font-bold">
                        {(budget.bdiConfig?.profit ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>
                        {budget.chargesConfig?.taxRegime === 'simples_nacional'
                          ? 'Tributos Simples Nacional (DAS):'
                          : 'Tributos Totais (ISS+PIS+COFINS+CPRB):'}
                      </span>
                      <span className="font-mono font-bold">
                        {summary.totalTaxesRate.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-[#171A1F]/10 text-[11px] text-[#171A1F]/70">
                    <strong>Fórmula Oficial:</strong> BDI = [((1 + AC + R + S + G) × (1 + DF) × (1 +
                    L)) / (1 - T) - 1] × 100
                  </div>
                </div>

                {/* Tabela de Encargos Sociais */}
                <div className="border border-[#171A1F]/15 rounded-xl p-4 space-y-3 bg-[#F8F9FA]">
                  <div className="flex items-center justify-between border-b border-[#171A1F]/10 pb-2">
                    <span className="font-bold text-[#171A1F]">
                      Encargos Sociais ({budget.chargesConfig?.uf || 'RS'})
                    </span>
                    <span className="font-mono font-bold text-[#294C87] text-sm">
                      {summary.socialChargesRate.toFixed(2)}%
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[#171A1F]/80">
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Regime Tributário / Desoneração:</span>
                      <span className="font-bold text-[#171A1F]">
                        {budget.chargesConfig?.taxRegime === 'simples_nacional'
                          ? 'Simples Nacional — Conta Simples (Sem encargos trabalhistas)'
                          : budget.chargesConfig?.taxRegime === 'com_desoneracao' ||
                              budget.chargesConfig.isRelieved
                            ? 'Desonerado (CPRB Lei 12.546)'
                            : 'Sem Desoneração (Padrão CLT)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Grupo A (Obrigações Previdenciárias):</span>
                      <span className="font-mono font-semibold">
                        {budget.chargesConfig?.taxRegime === 'simples_nacional'
                          ? '0,00% (Não incide no Simples)'
                          : budget.chargesConfig?.customGroupA !== undefined
                            ? `${budget.chargesConfig.customGroupA.toFixed(2)}%`
                            : 'Conforme tabela estadual'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Grupo B (Descanso Remunerado, Férias, Feriados):</span>
                      <span className="font-mono font-semibold">
                        {budget.chargesConfig?.taxRegime === 'simples_nacional'
                          ? '0,00% (Não incide no Simples)'
                          : budget.chargesConfig?.customGroupB !== undefined
                            ? `${budget.chargesConfig.customGroupB.toFixed(2)}%`
                            : 'Conforme tabela estadual'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Grupo C (Aviso Prévio e Rescisões):</span>
                      <span className="font-mono font-semibold">
                        {budget.chargesConfig?.taxRegime === 'simples_nacional'
                          ? '0,00% (Não incide no Simples)'
                          : budget.chargesConfig?.customGroupC !== undefined
                            ? `${budget.chargesConfig.customGroupC.toFixed(2)}%`
                            : 'Conforme tabela estadual'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Grupo D (Reincidências Cumulativas):</span>
                      <span className="font-mono font-semibold">
                        {budget.chargesConfig?.taxRegime === 'simples_nacional'
                          ? '0,00% (Não incide no Simples)'
                          : budget.chargesConfig?.customGroupD !== undefined
                            ? `${budget.chargesConfig.customGroupD.toFixed(2)}%`
                            : 'Conforme tabela estadual'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Montante R$ Aplicado sobre Mão de Obra:</span>
                      <span className="font-mono font-bold text-[#294C87]">
                        {formatCurrencyBRL(summary.socialChargesAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-[#171A1F]/10 text-[11px] text-[#171A1F]/70">
                    {budget.chargesConfig?.taxRegime === 'simples_nacional' ? (
                      <span className="block text-[#294C87] font-semibold">
                        Nota Técnica CONCE: No regime Simples Nacional, os encargos trabalhistas
                        (Grupos A, B, C e D) não incidem (R$ 0,00). O orçamento é tributado
                        exclusivamente pela alíquota efetiva do DAS inserida manualmente.
                      </span>
                    ) : (
                      <span>
                        Tabelas de encargos sociais regionalizadas e atualizadas para a UF:{' '}
                        <strong>{budget.chargesConfig?.uf || 'RS'}</strong>.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/* SEÇÃO FINAL: CONDIÇÕES COMERCIAIS & ASSINATURAS OFICIAIS */}
        {/* Presente nos formatos Simplificado, Etapas e Completo */}
        {/* (No formato 'valor_final', o fechamento já está contido na sua página única) */}
        {/* ============================================================ */}
        {selectedMode !== 'valor_final' && (
          <section className="print-page-section space-y-4 print:space-y-2">
            <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-2">
              <div>
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#294C87]">
                  FECHAMENTO & CONDIÇÕES CONTRATUAIS
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#171A1F]">
                  Condições Comerciais & Valor da Proposta
                </h2>
              </div>
              <Award className="w-4 h-4 text-[#294C87]" />
            </div>

            {/* Bloco de Valor da Proposta: Sóbrio, Discreto e Posicionado no Fechamento */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#171A1F]/20 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[9.5px] uppercase font-bold text-[#294C87] tracking-wider block">
                  Investimento Global Proposto
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#171A1F] font-mono tracking-tight">
                    {formatCurrencyBRL(summary.finalSalePrice)}
                  </span>
                  <span className="text-[11px] text-[#171A1F]/60">
                    ({budget.stages.length} etapas • {summary.servicesCount} itens)
                  </span>
                </div>
                <p className="text-[10.5px] text-[#171A1F]/70">
                  Preço final fechado para execução integral do escopo proposto, impostos inclusos
                  (Simples Nacional).
                </p>
              </div>

              <div className="text-left md:text-right border-t md:border-t-0 md:border-l border-[#171A1F]/10 pt-2 md:pt-0 md:pl-4 space-y-0.5">
                <span className="text-[9.5px] uppercase font-bold text-[#171A1F]/60 block">
                  Validade da Proposta
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#294C87] block">
                  {cleanValidityDays}{' '}
                  {cleanValidityDaysType === 'uteis' ? 'dias úteis' : 'dias corridos'}
                </span>
                <span className="text-[9.5px] text-[#171A1F]/50 block">
                  A contar da data de emissão: {new Date().toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Bloco 1: Forma de Pagamento e Prazo de Execução */}
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2">
                <div>
                  <span className="font-bold uppercase tracking-wider text-[#294C87] text-[9.5px] block mb-0.5">
                    Forma & Condições de Pagamento
                  </span>
                  <p className="text-[#171A1F]/90 leading-relaxed font-medium text-[11px]">
                    • {cleanPaymentTerms}
                  </p>
                  <p className="text-[#171A1F]/70 text-[10px] mt-1">
                    • Faturamento e emissão de Notas Fiscais emitidas pela CONCE — Serviço de
                    Engenharia e Consultoria LTDA sob o CNPJ 57.149.101/0001-46.
                  </p>
                </div>

                <div className="pt-1.5 border-t border-[#171A1F]/10 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[#294C87] text-[9.5px] block mb-0.5">
                    Prazo Contratual
                  </span>
                  <p className="text-[#171A1F]/90 leading-relaxed font-medium text-[11px]">
                    • <strong className="text-[#171A1F]">Prazo Contratual Estimado:</strong>{' '}
                    {formatBudgetDeadline(budget.work)}
                  </p>
                </div>

                {cleanExecutionDeadline && (
                  <div className="pt-1.5 border-t border-[#171A1F]/10">
                    <span className="font-bold uppercase tracking-wider text-[#FF6B1F] text-[9.5px] block mb-0.5">
                      Prazo de Execução & Condições de Gestão
                    </span>
                    <p className="text-[#171A1F]/90 leading-relaxed font-medium text-[11px]">
                      • {cleanExecutionDeadline}
                    </p>
                  </div>
                )}

                {budget.commercialNotes && (
                  <p className="text-[#171A1F]/80 pt-1.5 border-t border-[#171A1F]/10 text-[10.5px]">
                    <strong className="text-[#171A1F]">Notas:</strong> {budget.commercialNotes}
                  </p>
                )}
              </div>

              {/* Bloco 2: Garantia e Obrigações Técnicas */}
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-[#294C87] text-[9.5px] block">
                  Garantia e Obrigações Técnicas
                </span>
                <div className="text-[#171A1F]/80 text-[10.5px] leading-relaxed whitespace-pre-wrap space-y-1">
                  {technicalObligationsText.split('\n').map((line, idx) => (
                    <p key={idx} className="leading-snug">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Identificação das Partes e Endereços para Fechamento */}
            <div className="p-2.5 rounded-xl bg-[#171A1F]/[0.02] border border-[#171A1F]/10 text-[10.5px] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <span className="font-bold text-[#294C87]">Contratante:</span>{' '}
                <span className="font-semibold text-[#171A1F]">{cleanClientName}</span>
                {budget.client.document && ` (${budget.client.document})`}
                <br />
                <span className="text-[#171A1F]/70">
                  Endereço: {budget.client.address || 'Não informado'} • {budget.client.city}/
                  {budget.client.state}
                </span>
              </div>
              <div>
                <span className="font-bold text-[#294C87]">Local de Execução:</span>{' '}
                <span className="font-semibold text-[#171A1F]">{cleanWorkName}</span>
                <br />
                <span className="text-[#171A1F]/70">
                  Endereço da Obra: {budget.work.address || 'Não informado'} • {budget.work.city}/
                  {budget.work.state}
                </span>
              </div>
            </div>

            {/* Campos Oficiais de Assinatura */}
            <div className="pt-5 print:pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 print:gap-4 text-center text-xs">
              <div className="space-y-1">
                <div className="w-52 mx-auto border-t-2 border-[#171A1F]" />
                <p className="font-bold text-xs sm:text-sm text-[#171A1F]">{cleanAuthor}</p>
                <p className="text-[#171A1F]/70 text-[10px]">
                  CONCE — Serviço de Engenharia e Consultoria LTDA
                </p>
                <p className="text-[10px] text-[#294C87] font-semibold">
                  Responsável Técnico • CREA/RS-252397
                </p>
              </div>

              <div className="space-y-1">
                <div className="w-52 mx-auto border-t-2 border-[#171A1F]" />
                <p className="font-bold text-xs sm:text-sm text-[#171A1F]">{cleanClientName}</p>
                <p className="text-[#171A1F]/70 text-[10px]">
                  CNPJ/CPF: {budget.client.document || '---'}
                </p>
                <p className="text-[10px] text-[#294C87] font-semibold">
                  De Acordo / Representante Legal
                </p>
              </div>
            </div>

            {/* Rodapé Final com Logo, Slogan Obrigatório e CNPJ (sem nenhuma URL ou endereço web) */}
            <div className="pt-3 print:pt-2 border-t border-[#171A1F]/10 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-xs">
              <div className="flex items-center gap-2.5">
                <ConceLogo height={18} variant="light" />
                <span className="italic font-bold text-[#FF6B1F] text-[11px]">
                  "Conce é conceito. Conce é concreto."
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#171A1F]/70 text-[9.5px]">
                <span className="font-semibold">CNPJ: 57.149.101/0001-46</span>
                <span>•</span>
                <span>
                  {selectedMode === 'simplificado'
                    ? 'Proposta Comercial Simplificada • CONCE Engenharia'
                    : selectedMode === 'etapas'
                      ? 'Proposta Sintética por Etapas • CONCE Engenharia'
                      : 'Documento Técnico Oficial • CONCE Engenharia'}
                </span>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
