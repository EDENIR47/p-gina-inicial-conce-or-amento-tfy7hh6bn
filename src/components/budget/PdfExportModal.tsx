/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal e Documento de Exportação Profissional em PDF com Níveis de Detalhamento:
 * 1. Simplificado / Comercial: apenas Itens (etapas e serviços) com nome e Preço Final (sem coeficientes, composições, insumos ou memória de cálculo)
 * 2. Resumo por Etapas: síntese físico-financeira das macroetapas com valores finais e percentuais (sem detalhe técnico)
 * 3. Completo / Técnico: capa, resumo executivo, planilha completa com BDI, CPU detalhado com coeficientes, Curva ABC (Pareto) e memória BDI TCU (Acórdão 2.622/2013)
 * Todos os formatos mantêm Capa Institucional CONCE oficial, dados do cliente/obra, slogan no rodapé e assinaturas formais.
 */

import React, { useRef, useState, useMemo } from 'react'
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
import { formatCurrencyBRL } from '@/lib/formatters'
import { logAuditEvent } from '@/lib/intelligenceStorage'

export type PdfExportMode = 'simplificado' | 'etapas' | 'completo'

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
    id: 'simplificado',
    title: 'Comercial / Simplificado',
    subtitle: 'Apenas Itens e Valor Final',
    badge: 'Recomendado p/ Clientes',
    icon: Briefcase,
    description:
      'Proposta comercial direta e limpa para negociação e aprovação de clientes. Tabela com itens discriminados e valor final de venda em destaque — sem coeficientes, sem composições, sem insumos e sem memória de cálculo.',
    features: [
      'Capa institucional oficial com identificação e valor total',
      'Tabela simplificada: Item | Discriminação | Qtd/Unid | Valor Final (R$)',
      'Total final em destaque Pumpkin Orange oficial CONCE',
      'Sem coeficientes, sem composições abertas e sem insumos',
      'Sem memória interna de cálculo de BDI e encargos',
      'Condições comerciais e campo oficial para assinaturas',
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

  if (!isOpen) return null

  const currentOption =
    EXPORT_MODE_OPTIONS.find((opt) => opt.id === selectedMode) || EXPORT_MODE_OPTIONS[0]

  const handlePrint = () => {
    const modeLabels: Record<PdfExportMode, string> = {
      simplificado: 'Simplificado / Comercial (apenas itens e valores finais)',
      etapas: 'Resumo por Etapas (macrovisão físico-financeira)',
      completo: 'Técnico / Completo (CPU detalhado, ABC Pareto e BDI TCU)',
    }

    logAuditEvent({
      budgetId: budget.id,
      action: 'exportacao_pdf',
      title: `Exportação PDF — Formato ${currentOption.title.split('/')[0].trim()}`,
      details: `Proposta gerada em formato ${modeLabels[selectedMode]}. Valor total: ${formatCurrencyBRL(
        summary.finalSalePrice,
      )}. Cliente: ${budget.client.name || 'Não informado'}.`,
      userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
    })
    window.print()
  }

  // Subtítulo descritivo da proposta conforme o formato
  const proposalTypeLabel =
    selectedMode === 'simplificado'
      ? 'Proposta Comercial Simplificada'
      : selectedMode === 'etapas'
        ? 'Proposta Executiva Sintética por Etapas'
        : 'Proposta Técnica & Orçamento Executivo de Obras'

  return (
    <div className="fixed inset-0 z-50 bg-[#171A1F]/80 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 print:p-0 print:bg-white print:fixed-none">
      {/* ============================================================ */}
      {/* BARRA SUPERIOR FIXA (Oculta na Impressão) */}
      {/* ============================================================ */}
      <div className="w-full max-w-5xl bg-[#171A1F] text-white rounded-2xl p-4 mb-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl border border-white/20 print:hidden sticky top-2 z-50">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <ConceLogo height={26} variant="dark" />
          <div className="h-5 w-px bg-white/20 hidden md:block" />
          <div className="text-left">
            <span className="text-xs sm:text-sm font-semibold text-white/90 block">
              Emissão de PDF • {budget.code}
            </span>
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
              {selectedMode === 'simplificado'
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

          {/* 3 Cartões com os Formatos Pedidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
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
              {selectedMode === 'simplificado' && '✓ Sem insumos nem memória técnica'}
              {selectedMode === 'etapas' && '✓ Síntese executiva das etapas'}
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
        className="w-full max-w-5xl bg-white text-[#171A1F] rounded-2xl shadow-2xl p-6 sm:p-12 mb-12 space-y-10 print:shadow-none print:m-0 print:p-8 print:max-w-none print:w-full print:rounded-none"
        id="conce-printable-proposal"
      >
        {/* ============================================================ */}
        {/* 1. CAPA INSTITUCIONAL CONCE (Presente em todos os formatos) */}
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
                CNPJ: 42.109.876/0001-33 • CREA/RS: 252397
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded bg-[#171A1F] text-white font-mono text-xs font-bold uppercase tracking-wider">
                {budget.code}
              </span>
              <p className="text-[11px] text-[#171A1F]/60 mt-1 font-mono">
                Emissão: {new Date().toLocaleDateString('pt-BR')}
              </p>
              <div className="mt-1 flex flex-col items-end gap-1">
                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#294C87]/15 text-[#294C87]">
                  {selectedMode === 'simplificado'
                    ? 'Proposta Simplificada'
                    : selectedMode === 'etapas'
                      ? 'Resumo por Etapas'
                      : 'Relatório Técnico Completo'}
                </span>
                {budget.publicWork.enabled && (
                  <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F]">
                    Licitação Pública ({budget.publicWork.modality})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Miolo da Capa: Título do Empreendimento e Proposta */}
          <div className="my-auto py-12 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FF6B1F]/10 border border-[#FF6B1F]/30 text-[#FF6B1F] text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>{proposalTypeLabel}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#171A1F] tracking-tight leading-tight">
              {budget.work.name}
            </h1>

            <p className="text-sm sm:text-base text-[#171A1F]/80 max-w-2xl leading-relaxed">
              {budget.work.description ||
                (selectedMode === 'simplificado'
                  ? 'Proposta comercial para execução de serviços de engenharia civil com relação discriminada de itens e preço global de fechamento.'
                  : 'Orçamento analítico e discriminado de obras civis com detalhamento de insumos, encargos sociais e cálculo do BDI em conformidade com o Acórdão 2.622/2013 do Plenário do Tribunal de Contas da União.')}
            </p>

            {/* Caixa Destacada com Valor da Obra em Pumpkin Orange */}
            <div className="p-6 rounded-2xl bg-[#171A1F] text-white border-l-8 border-[#FF6B1F] shadow-xl max-w-xl space-y-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#FF6B1F]">
                VALOR TOTAL GLOBAL DA PROPOSTA
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {formatCurrencyBRL(summary.finalSalePrice)}
              </div>
              <p className="text-xs text-white/70">
                {selectedMode === 'simplificado'
                  ? 'Preço final fechado para execução integral do escopo orçado.'
                  : `Preço de venda com BDI de ${summary.bdiRate.toFixed(
                      2,
                    )}% e Leis Sociais de ${summary.socialChargesRate.toFixed(2)}% (${
                      budget.chargesConfig.uf
                    })`}
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
              <p className="text-xs font-semibold text-[#294C87] pt-0.5">
                Regime Tributário:{' '}
                {budget.chargesConfig?.taxRegime === 'simples_nacional'
                  ? budget.chargesConfig.simplesCollectionOption === 'cpp_guia_separada'
                    ? 'Simples Nacional — Anexo IV (Grupos A+B+C+D)'
                    : 'Simples Nacional — CPP inclusa no DAS (Grupos B+C+D)'
                  : budget.chargesConfig?.taxRegime === 'com_desoneracao' ||
                      budget.chargesConfig?.isRelieved
                    ? 'Com Desoneração (Lei 12.546)'
                    : 'Sem Desoneração (CLT)'}
                {budget.chargesConfig?.taxRegime === 'simples_nacional' &&
                  (budget.chargesConfig?.simplesDasRate ?? 0) > 0 &&
                  ` • DAS: ${budget.chargesConfig.simplesDasRate.toFixed(2)}%`}
              </p>
              <p className="font-semibold text-[#171A1F] pt-0.5">
                Responsável Técnico: {budget.author || 'Eng. Edenir Souza da Rosa - CREA/RS-252397'}
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
        {/* NÍVEL 1: SIMPLIFICADO / COMERCIAL */}
        {/* Apenas lista de itens (Etapas e Serviços) com nome e Preço Final */}
        {/* Sem coeficientes, sem insumos, sem memória de BDI/encargos */}
        {/* ============================================================ */}
        {selectedMode === 'simplificado' && (
          <section className="space-y-6 print:page-break-after-always">
            <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                  DISCRIMINAÇÃO COMERCIAL
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#171A1F]">
                  Relação de Itens e Valores
                </h2>
                <p className="text-xs text-[#171A1F]/70 mt-0.5">
                  Preços finais por item contratual, com tributos, encargos e margem comercial
                  inclusos.
                </p>
              </div>
              <ConceLogo height={22} variant="light" />
            </div>

            {/* Tabela Limpa "Item | Discriminação | Qtd | Unid | Valor Final" */}
            <div className="overflow-x-auto border-2 border-[#171A1F]/20 rounded-xl shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#171A1F] text-white uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-16 text-center">Item</th>
                    <th className="py-3 px-3">Discriminação dos Serviços Contratados</th>
                    <th className="py-3 px-3 w-16 text-center">Unid.</th>
                    <th className="py-3 px-3 w-24 text-right">Quantidade</th>
                    <th className="py-3 px-4 w-40 text-right">Valor Final (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171A1F]/10">
                  {budget.stages.map((stage) => {
                    const stageSummary = summary.stagesSubtotals.find((s) => s.stageId === stage.id)
                    const stageTotalWithBdi = stageSummary ? stageSummary.withBdi : 0

                    return (
                      <React.Fragment key={stage.id}>
                        {/* Linha de Macroetapa */}
                        <tr className="bg-[#294C87]/10 font-extrabold text-[#171A1F] border-t-2 border-[#294C87]/40">
                          <td className="py-3 px-3 font-mono text-[#294C87] text-center font-bold">
                            {stage.code}
                          </td>
                          <td className="py-3 px-3 uppercase text-xs" colSpan={3}>
                            {stage.name}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#294C87] text-sm">
                            {formatCurrencyBRL(stageTotalWithBdi)}
                          </td>
                        </tr>

                        {/* Linhas dos Serviços da Etapa: apenas item, nome, unid, qtd e valor final */}
                        {stage.services.map((service) => {
                          const sQty = Number(service.quantity) || 0
                          const laborMult = 1 + (summary.socialChargesRate || 0) / 100
                          const compUnit = getServiceEffectiveUnitCost(service, laborMult)
                          const serviceBdi = service.customBdiPercent ?? summary.bdiRate
                          const unitWithBdi = compUnit * (1 + serviceBdi / 100)
                          const totalWithBdi = unitWithBdi * sQty

                          return (
                            <tr key={service.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-[#171A1F]/70 text-center font-semibold">
                                {service.code}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-[#171A1F]">
                                {service.description}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-[#171A1F]/70">
                                {service.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-[#171A1F]/80">
                                {sQty.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-[#171A1F]">
                                {formatCurrencyBRL(totalWithBdi)}
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
                    <td className="py-3.5 px-3 uppercase text-right" colSpan={4}>
                      VALOR TOTAL FINAL DA PROPOSTA:
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-base font-extrabold text-[#FF6B1F]">
                      {formatCurrencyBRL(summary.finalSalePrice)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Caixa Resumo Comercial Simplificada com Destaque Pumpkin Orange */}
            <div className="p-5 rounded-2xl bg-[#F8F9FA] border-2 border-[#171A1F]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold text-[#294C87] tracking-wider block">
                  RESUMO DA PROPOSTA COMERCIAL
                </span>
                <p className="text-xs text-[#171A1F]/70">
                  Total de {budget.stages.length} etapas e {summary.servicesCount} itens orçados.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#171A1F] text-white border-l-4 border-[#FF6B1F] text-center sm:text-right min-w-[240px]">
                <span className="text-[10px] uppercase font-bold text-[#FF6B1F] block">
                  PREÇO TOTAL FECHADO
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-[#FF6B1F] font-mono block">
                  {formatCurrencyBRL(summary.finalSalePrice)}
                </span>
                <span className="text-[10px] text-white/60">Valores em Reais (BRL)</span>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* NÍVEL 2: RESUMO POR ETAPAS (Sintético / Macrovisão) */}
        {/* Tabela apenas com as macroetapas da obra, valores e percentuais */}
        {/* ============================================================ */}
        {selectedMode === 'etapas' && (
          <section className="space-y-6 print:page-break-after-always">
            <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                  SÍNTESE FÍSICO-FINANCEIRA
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#171A1F]">
                  Resumo Orçamentário por Macroetapas
                </h2>
                <p className="text-xs text-[#171A1F]/70 mt-0.5">
                  Consolidação dos valores finais por fase da obra e distribuição percentual do
                  investimento.
                </p>
              </div>
              <ConceLogo height={22} variant="light" />
            </div>

            {/* Tabela de Macroetapas */}
            <div className="overflow-x-auto border-2 border-[#171A1F]/20 rounded-xl shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#171A1F] text-white uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-20 text-center">Etapa</th>
                    <th className="py-3 px-4">Descrição da Macroetapa da Obra</th>
                    <th className="py-3 px-4 w-32 text-center">Qtd. Serviços</th>
                    <th className="py-3 px-4 w-44 text-right">Valor Final (R$)</th>
                    <th className="py-3 px-4 w-24 text-right">Peso %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171A1F]/10">
                  {budget.stages.map((stage) => {
                    const stageSummary = summary.stagesSubtotals.find((s) => s.stageId === stage.id)
                    const stageValue = stageSummary ? stageSummary.withBdi : 0
                    const stagePercent = stageSummary ? stageSummary.percentageOfTotal : 0

                    return (
                      <tr key={stage.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#294C87] text-center">
                          {stage.code}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#171A1F] text-sm">{stage.name}</td>
                        <td className="py-3 px-4 text-center font-mono text-[#171A1F]/70">
                          {stage.services.length} {stage.services.length === 1 ? 'item' : 'itens'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#171A1F] text-sm">
                          {formatCurrencyBRL(stageValue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#FF6B1F]">
                          {stagePercent}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-[#171A1F] text-white font-extrabold text-xs">
                  <tr>
                    <td className="py-3.5 px-4 uppercase text-right" colSpan={3}>
                      TOTAL GLOBAL DA OBRA:
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-base text-[#FF6B1F]">
                      {formatCurrencyBRL(summary.finalSalePrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#FF6B1F]">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Grade de Cards das Etapas com Barras Visuais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {summary.stagesSubtotals.map((st) => (
                <div
                  key={st.stageId}
                  className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2"
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
                      const stageSummary = summary.stagesSubtotals.find(
                        (s) => s.stageId === stage.id,
                      )

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
                                <td className="py-2 px-3 font-mono text-[#171A1F]/60 font-semibold">
                                  {service.code}
                                </td>
                                <td className="py-2 px-3">
                                  <span className="font-semibold text-[#171A1F]">
                                    {service.description}
                                  </span>
                                  {service.composition && (
                                    <span className="block font-mono text-[10px] text-[#171A1F]/50">
                                      Comp: {service.composition.code} ({service.composition.source}
                                      )
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

            {/* SEÇÃO 3 • COMPOSIÇÕES DE CUSTOS UNITÁRIOS (CPU DETALHADA) */}
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

            {/* SEÇÃO 4 • CURVA ABC DE INSUMOS (PARETO) */}
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
                        <td className="py-2 px-3 text-center font-bold text-[#171A1F]">
                          #{item.rank}
                        </td>
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
                        <td className="py-2 px-3 font-semibold text-[#171A1F]">
                          {item.description}
                        </td>
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

            {/* SEÇÃO 5 • MEMÓRIA DE BDI (TCU) E ENCARGOS SOCIAIS */}
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
                      <span className="font-mono font-bold">
                        {budget.bdiConfig.risk.toFixed(2)}%
                      </span>
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
                      <span className="font-mono font-bold">
                        {budget.bdiConfig.profit.toFixed(2)}%
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
                      Encargos Sociais ({budget.chargesConfig.uf})
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
                          ? budget.chargesConfig.simplesCollectionOption === 'cpp_guia_separada'
                            ? 'Simples Nacional — Anexo IV (Grupos A+B+C+D)'
                            : 'Simples Nacional — CPP inclusa no DAS (Grupos B+C+D)'
                          : budget.chargesConfig?.taxRegime === 'com_desoneracao' ||
                              budget.chargesConfig.isRelieved
                            ? 'Desonerado (CPRB Lei 12.546)'
                            : 'Sem Desoneração (Padrão CLT)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Grupo A (Obrigações Básicas Previdenciárias):</span>
                      <span className="font-mono font-semibold">
                        {budget.chargesConfig?.taxRegime === 'simples_nacional' &&
                        (budget.chargesConfig?.simplesCollectionOption ?? 'cpp_inclusa_das') ===
                          'cpp_inclusa_das' &&
                        (budget.chargesConfig?.customGroupA ?? 0) === 0
                          ? '0,00% (coberto no DAS — sem dupla cobrança)'
                          : budget.chargesConfig?.customGroupA !== undefined
                            ? `${budget.chargesConfig.customGroupA.toFixed(2)}%`
                            : 'Conforme tabela estadual'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Grupo B (Descanso Remunerado, Férias, Feriados):</span>
                      <span className="font-mono font-semibold">
                        {budget.chargesConfig?.customGroupB !== undefined
                          ? `${budget.chargesConfig.customGroupB.toFixed(2)}%`
                          : 'Conforme tabela estadual'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Grupo C (Aviso Prévio e Rescisões):</span>
                      <span className="font-mono font-semibold">
                        {budget.chargesConfig?.customGroupC !== undefined
                          ? `${budget.chargesConfig.customGroupC.toFixed(2)}%`
                          : 'Conforme tabela estadual'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#171A1F]/5">
                      <span>Grupo D (Reincidências Cumulativas):</span>
                      <span className="font-mono font-semibold">
                        {budget.chargesConfig?.customGroupD !== undefined
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
                    Tabelas de encargos sociais regionalizadas e atualizadas para a UF:{' '}
                    <strong>{budget.chargesConfig.uf}</strong>.
                    {budget.chargesConfig?.taxRegime === 'simples_nacional' &&
                      (budget.chargesConfig?.simplesCollectionOption ?? 'cpp_inclusa_das') ===
                        'cpp_inclusa_das' && (
                        <span className="block mt-1 text-[#294C87] font-semibold">
                          Nota fiscal CONCE: A parcela patronal previdenciária (CPP) está integrada
                          à alíquota única do DAS, evitando duplicidade de tributos patronais sobre
                          a mão de obra.
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
        {/* Presente em todos os formatos (Simplificado, Etapas, Completo) */}
        {/* ============================================================ */}
        <section className="space-y-6 print:page-break-inside-avoid">
          <div className="flex items-center justify-between border-b-2 border-[#294C87] pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B1F]">
                FECHAMENTO CONTRATUAL
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
                CREA/RS.
              </p>
              <p className="text-[#171A1F]/80">
                • Garantia quinquenal conforme previsto no Artigo 618 do Código Civil Brasileiro.
              </p>
              <p className="text-[#171A1F]/80">
                • Atendimento irrestrito às normas técnicas da ABNT e NRs de Segurança do Trabalho.
              </p>
            </div>
          </div>

          {/* Campos Oficiais de Assinatura */}
          <div className="pt-12 grid grid-cols-1 sm:grid-cols-2 gap-12 text-center text-xs">
            <div className="space-y-2">
              <div className="w-64 mx-auto border-t-2 border-[#171A1F]" />
              <p className="font-bold text-sm text-[#171A1F]">
                {budget.author || 'Eng. Edenir Souza da Rosa'}
              </p>
              <p className="text-[#171A1F]/70">CONCE — Serviço de Engenharia e Consultoria LTDA</p>
              <p className="text-[11px] text-[#294C87] font-semibold">
                Responsável Técnico • CREA/RS-252397
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

          {/* Rodapé Final com Logo e Slogan Obrigatório */}
          <div className="pt-8 border-t border-[#171A1F]/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <ConceLogo height={20} variant="light" />
              <span className="italic font-bold text-[#FF6B1F]">
                "Conce é conceito. Conce é concreto."
              </span>
            </div>
            <span className="text-[#171A1F]/50 text-[11px]">
              {selectedMode === 'simplificado'
                ? 'Proposta Comercial Simplificada emitido por CONCE Engenharia'
                : selectedMode === 'etapas'
                  ? 'Proposta Sintética por Etapas emitido por CONCE Engenharia'
                  : 'Documento Técnico Oficial emitido por CONCE Engenharia'}
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
