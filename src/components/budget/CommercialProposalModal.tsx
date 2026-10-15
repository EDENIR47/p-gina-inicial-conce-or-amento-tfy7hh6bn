/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal da PROPOSTA TÉCNICA E COMERCIAL (documento comercial de engenharia — NÃO slides)
 *
 * Formato: folha A4 RETRATO, texto corrido em seções numeradas, no padrão de documento
 * comercial de engenharia. Estrutura obrigatória (ordem fixa definida pelo usuário):
 *  1. OBJETIVO DO TRABALHO
 *  2. FORMA DE EXECUÇÃO
 *  3. COMPLEXIDADE DO SERVIÇO
 *  4. DESTINAÇÃO FINAL DOS RESÍDUOS
 *  5. FORMA DE FISCALIZAÇÃO UTILIZADA
 *  6. VOLUME DE MATERIAL REMOVIDO
 *  7. PRAZO E AUTORIZAÇÕES PRÉVIAS PARA EXECUÇÃO
 *  8. CONDIÇÕES COMERCIAIS E GARANTIAS
 *
 * Todo o conteúdo técnico é derivado dos DADOS REAIS do orçamento (etapas, serviços,
 * insumos e quantidades) pelo motor src/lib/proposalEngine.ts — sem texto genérico.
 *
 * Fluxos preservados:
 * - IMPRIMIR: window.print() em A4 retrato paginado (sem folha em branco, seções íntegras
 *   via @page + break-inside: avoid, no mesmo padrão do Memorial Descritivo).
 * - ANEXAR AO ORÇAMENTO: mesmo campo/fluxo presentationDocument do FullBudget, com
 *   versionamento v1/v2..., persistência local (saveSingleBudget) e sincronização cloud
 *   pela fila existente (syncEngine.enqueueBudgetSave).
 *
 * Identidade visual CONCE (Mirage #171A1F, Cobalt #294C87, Pumpkin #FF6B1F).
 */

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Printer,
  FileCheck,
  Paperclip,
  FileText,
  ListOrdered,
  Calendar,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { saveSingleBudget } from '@/lib/budgetsStorage'
import { syncEngine } from '@/services/syncEngine'
import { FullBudget } from '@/types/budgetEngine'
import { calculateFullBudget } from '@/lib/budgetEngine'
import { CONCE_COMPANY } from '@/lib/conceCompany'
import { ConceLogo } from '@/components/ConceLogo'
import {
  formatCurrencyBRL,
  formatBudgetDeadline,
  formatCurrentDatePTBR,
  sanitizeDocumentText,
} from '@/lib/formatters'
import { logAuditEvent } from '@/lib/intelligenceStorage'
import {
  PROPOSAL_DOCUMENT_TITLE,
  analyzeBudgetForProposal,
  buildProposalSections,
} from '@/lib/proposalEngine'

export interface CommercialProposalModalProps {
  budget: FullBudget
  isOpen: boolean
  onClose: () => void
  onAttachPresentationToBudget?: (updatedBudget: FullBudget) => void
}

export const CommercialProposalModal: React.FC<CommercialProposalModalProps> = ({
  budget,
  isOpen,
  onClose,
  onAttachPresentationToBudget,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const summary = useMemo(() => calculateFullBudget(budget), [budget])
  const analysis = useMemo(() => analyzeBudgetForProposal(budget), [budget])
  const sections = useMemo(
    () => buildProposalSections(budget, summary, analysis),
    [budget, summary, analysis],
  )

  const hasAttachedPresentation = useMemo(() => {
    return Boolean(budget.presentationDocument && budget.presentationDocument.version > 0)
  }, [budget.presentationDocument])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // Isolar impressão
  useEffect(() => {
    if (!isOpen) return
    document.body.classList.add('conce-printing')
    return () => {
      document.body.classList.remove('conce-printing')
      document.body.classList.remove('conce-printing-presentation')
    }
  }, [isOpen])

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
  const cleanClientCity = sanitizeDocumentText(budget.client.city)

  const cleanValidityDays = budget.validityDays ?? 10
  const cleanValidityType = budget.validityDaysType || 'uteis'
  const cleanDeadline = formatBudgetDeadline(budget.work)

  const handlePrint = () => {
    const originalTitle = typeof document !== 'undefined' ? document.title : ''
    const safeBudgetCode = cleanCode.replace(/[^a-zA-Z0-9_-]/g, '_')
    if (typeof document !== 'undefined') {
      document.title = `Proposta-Tecnica-e-Comercial-${safeBudgetCode}`
    }

    logAuditEvent({
      budgetId: budget.id,
      action: 'exportacao_pdf',
      title: 'Proposta Técnica e Comercial Impressa / Emitida em PDF',
      details: `Documento PROPOSTA TÉCNICA E COMERCIAL (8 seções, A4 retrato) da proposta ${cleanCode} impresso/gerado em PDF. Valor: ${formatCurrencyBRL(
        summary.finalSalePrice,
      )}. Cliente: ${cleanClientName}.`,
      userName: CONCE_COMPANY.responsavelTecnicoCompleto,
    })
    document.body.classList.add('conce-printing-presentation')
    window.print()

    setTimeout(() => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('conce-printing-presentation')
        document.title = originalTitle
      }
    }, 500)
  }

  const handleAttachPresentation = () => {
    const now = new Date().toISOString()
    const nextVersion = (budget.presentationDocument?.version || 0) + 1

    const presentationData = {
      version: nextVersion,
      attachedAt: budget.presentationDocument?.attachedAt || now,
      updatedAt: now,
      budgetCode: cleanCode,
      budgetTitle: cleanTitle,
      clientName: cleanClientName,
      workName: cleanWorkName,
      finalSalePrice: summary.finalSalePrice,
      bdiRate: summary.bdiRate,
      stagesCount: budget.stages.length,
      servicesCount: summary.servicesCount,
      documentTitle: PROPOSAL_DOCUMENT_TITLE,
      format: 'documento-a4-retrato',
      sections: sections.map((sec) => ({
        sectionNumber: sec.number,
        title: sec.title,
        paragraphsCount: sec.paragraphs.length,
        itemsCount: sec.items?.length || 0,
        hasTable: Boolean(sec.table),
        contentSummary:
          sec.paragraphs[0]?.slice(0, 180) ||
          (sec.items && sec.items.length > 0 ? sec.items[0].slice(0, 180) : ''),
      })),
      volumeEstimateM3: analysis.volume.totalVolumeM3,
      complexityLevel: analysis.complexityLevel,
    }

    const updatedBudget: FullBudget = {
      ...budget,
      presentationDocument: presentationData,
      updatedAt: now,
    }

    // Persistir localmente
    saveSingleBudget(updatedBudget)
    // Sincronizar na nuvem PocketBase via syncEngine (fila existente)
    syncEngine.enqueueBudgetSave(updatedBudget)

    // Registrar no histórico de auditoria
    logAuditEvent({
      budgetId: budget.id,
      action: 'anexo_apresentacao',
      title: 'Proposta Técnica e Comercial Anexada ao Orçamento',
      details: `Documento ${PROPOSAL_DOCUMENT_TITLE} (8 seções, formato A4 retrato) anexado com sucesso como documento (v${nextVersion}). Valor: ${formatCurrencyBRL(
        summary.finalSalePrice,
      )}.`,
      userName: CONCE_COMPANY.responsavelTecnicoCompleto,
    })

    if (onAttachPresentationToBudget) {
      onAttachPresentationToBudget(updatedBudget)
    }

    showToast(`Proposta v${nextVersion} anexada com sucesso ao orçamento!`)
  }

  const modalContent = (
    <div className="conce-presentation-modal-overlay fixed inset-0 z-50 bg-[#171A1F]/90 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible">
      {/* Toast de notificação de anexo */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[9999] bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-emerald-400 print:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <FileCheck className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BARRA SUPERIOR DE COMANDOS (Oculta na Impressão) */}
      <header className="w-full max-w-4xl bg-[#171A1F] text-white rounded-2xl p-3.5 mb-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl border border-white/20 print:hidden sticky top-2 z-50">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <ConceLogo height={24} variant="dark" />
          <div className="h-5 w-px bg-white/20 hidden md:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-gradient-to-r from-[#FF6B1F] to-[#FF8945] text-white text-[10px] font-extrabold uppercase tracking-wider">
                Proposta Comercial
              </span>
              <span className="font-mono text-xs font-bold text-white/90">{cleanCode}</span>
            </div>
            <span className="text-[11px] text-white/60 line-clamp-1">
              {cleanTitle} • {cleanClientName}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#294C87] hover:bg-[#1f3a68] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer active:scale-95 border border-white/20"
            title="Imprimir a Proposta Técnica e Comercial em folha A4 retrato"
          >
            <Printer className="w-4 h-4 text-[#FF8945]" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF6B1F] to-[#FF8945] hover:from-[#e55d17] hover:to-[#FF6B1F] text-white text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/20 transition-all cursor-pointer active:scale-95 border border-white/20"
            title="Exportar ou Imprimir em PDF formato A4 Retrato (documento paginado)"
          >
            <Printer className="w-4 h-4" />
            <span>Baixar PDF (A4 Retrato)</span>
          </button>

          <button
            type="button"
            onClick={handleAttachPresentation}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95 border ${
              hasAttachedPresentation
                ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400/40'
                : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
            }`}
            title="Gravar e anexar esta proposta ao registro do orçamento como documento oficial"
          >
            {hasAttachedPresentation ? (
              <FileCheck className="w-4 h-4 text-emerald-300" />
            ) : (
              <Paperclip className="w-4 h-4 text-[#FF8945]" />
            )}
            <span>
              {hasAttachedPresentation
                ? `Anexada (v${budget.presentationDocument?.version || 1}) • Atualizar`
                : 'Anexar ao Orçamento'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Fechar Proposta (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* DOCUMENTO IMPRIMÍVEL — PROPOSTA TÉCNICA E COMERCIAL           */}
      {/* A4 retrato, texto corrido, seções numeradas (não slides).     */}
      {/* ============================================================ */}
      <main
        className="w-full max-w-4xl space-y-6 print:space-y-0"
        id="conce-printable-presentation"
      >
        {/* ============================================================ */}
        {/* CAPA EXCLUSIVA DA PROPOSTA (PÁGINA 1 COMPLETA)                */}
        {/* Contém SOMENTE a marca institucional CONCE ENGENHARIA LTDA    */}
        {/* centralizada na folha inteira. Sem título, sem tabela,       */}
        {/* sem sumário, sem datas ou dados adicionais.                   */}
        {/* Seguido de quebra de página obrigatória para a impressão.    */}
        {/* ============================================================ */}
        <section
          aria-label="Capa da Proposta Comercial"
          className="conce-proposal-cover bg-white text-[#171A1F] shadow-2xl border border-[#171A1F]/20 flex flex-col items-center justify-center p-8 sm:p-12 relative min-h-[500px] sm:min-h-[720px] md:min-h-[960px] aspect-[1/1.414] print:border-none print:shadow-none print:m-0 print:p-0 print:w-full print:aspect-auto"
        >
          {/* Bloco centralizado de marca CONCE + ENGENHARIA LTDA */}
          <div className="flex flex-col items-center text-center select-none w-full print:w-full">
            <span className="text-6xl sm:text-7xl md:text-8xl font-black font-poppins text-[#171A1F] tracking-tight uppercase leading-none print:text-[46pt] print:leading-none print:font-black">
              <span className="text-[#FF6B1F]">C</span>ONCE
            </span>
            <span className="text-sm sm:text-base md:text-lg font-extrabold font-poppins text-[#294C87] uppercase tracking-[0.34em] mt-3 sm:mt-4 print:text-[12pt] print:tracking-[0.34em] print:mt-3 print:font-extrabold">
              ENGENHARIA LTDA
            </span>
          </div>
        </section>

        {/* Separador visual na tela entre a capa e o corpo da proposta (oculto na impressão) */}
        <div
          aria-hidden="true"
          className="print:hidden w-full flex items-center justify-center gap-3 py-1 text-white/40 text-xs select-none"
        >
          <div className="h-px bg-white/20 flex-1 max-w-[120px]" />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-white/50">
            Página 2 • Conteúdo da Proposta
          </span>
          <div className="h-px bg-white/20 flex-1 max-w-[120px]" />
        </div>

        {/* ============================================================ */}
        {/* CORPO DO DOCUMENTO (INICIA NA PÁGINA 2 APÓS A QUEBRA)         */}
        {/* Abre com o título "PROPOSTA TÉCNICA E COMERCIAL", seguido da */}
        {/* identificação, sumário e seções numeradas de 1 a 8.          */}
        {/* ============================================================ */}
        <article className="conce-proposal-sheet bg-white text-[#171A1F] shadow-2xl border border-[#171A1F]/20 print:border-none print:shadow-none">
          {/* CABEÇALHO DO CORPO DA PROPOSTA (TOPO DA PÁGINA 2) */}
          <header className="conce-proposal-body-header px-6 sm:px-10 pt-6 pb-1 print:px-0 print:pt-0 print:pb-0 print:block">
            {/* Metadados do documento (topo da página 2) — linha superior mais rente ao topo */}
            <div className="conce-proposal-meta-line flex items-center justify-between gap-4 pb-2 border-b border-[#171A1F]/15 print:pb-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FF6B1F]/15 text-[#FF6B1F] text-[10px] font-black uppercase tracking-wider print:bg-[#FF6B1F]/15 print:text-[#FF6B1F]">
                Proposta Comercial
              </span>
              <div className="flex items-center gap-3 text-right">
                <div className="font-mono text-[11px] text-[#171A1F]/70">
                  Nº <strong className="text-[#294C87]">{cleanCode}</strong>
                </div>
                <span className="text-[#171A1F]/30">•</span>
                <div className="text-[10px] text-[#171A1F]/60">
                  Porto Alegre, {formatCurrentDatePTBR()}
                </div>
              </div>
            </div>
          </header>

          {/* TÍTULO DO DOCUMENTO — PROPOSTA TÉCNICA E COMERCIAL (abre a página 2, com mais respiro vertical abaixo da linha) */}
          <div className="conce-proposal-title px-6 sm:px-10 pt-7 pb-4 sm:pt-8 sm:pb-5 text-center border-b border-[#171A1F]/15 print:px-0 print:border-b print:border-[#171A1F]/15 print:block">
            <h1 className="text-xl sm:text-2xl font-black text-[#171A1F] tracking-tight uppercase print:text-[14pt] print:leading-tight">
              {PROPOSAL_DOCUMENT_TITLE}
            </h1>
            <p className="text-[11px] text-[#294C87] font-bold uppercase tracking-wider mt-1 print:text-[9pt]">
              {cleanTitle}
            </p>
          </div>

          {/* IDENTIFICAÇÃO DO ORÇAMENTO / CLIENTE / OBRA */}
          <section className="conce-proposal-identificacao px-6 sm:px-10 py-4 print:px-0">
            <table className="w-full text-[11px] border border-[#171A1F]/20">
              <tbody>
                <tr className="border-b border-[#171A1F]/10">
                  <th className="w-40 bg-[#294C87]/5 text-left px-2.5 py-1.5 font-bold text-[#294C87] uppercase tracking-wide align-top">
                    Orçamento
                  </th>
                  <td className="px-2.5 py-1.5 text-[#171A1F]">
                    <strong>{cleanCode}</strong> — {cleanTitle}
                  </td>
                </tr>
                <tr className="border-b border-[#171A1F]/10">
                  <th className="bg-[#294C87]/5 text-left px-2.5 py-1.5 font-bold text-[#294C87] uppercase tracking-wide align-top">
                    Contratante
                  </th>
                  <td className="px-2.5 py-1.5 text-[#171A1F]">
                    <strong>{cleanClientName}</strong>
                    {cleanClientDoc ? ` — CPF/CNPJ ${cleanClientDoc}` : ''}
                    {cleanClientPhone || cleanClientEmail
                      ? ` • ${[cleanClientPhone, cleanClientEmail].filter(Boolean).join(' • ')}`
                      : ''}
                  </td>
                </tr>
                <tr className="border-b border-[#171A1F]/10">
                  <th className="bg-[#294C87]/5 text-left px-2.5 py-1.5 font-bold text-[#294C87] uppercase tracking-wide align-top">
                    Obra
                  </th>
                  <td className="px-2.5 py-1.5 text-[#171A1F]">
                    {cleanWorkName} — {cleanWorkAddress}
                  </td>
                </tr>
                <tr className="border-b border-[#171A1F]/10">
                  <th className="bg-[#294C87]/5 text-left px-2.5 py-1.5 font-bold text-[#294C87] uppercase tracking-wide align-top">
                    Valor da Proposta
                  </th>
                  <td className="px-2.5 py-1.5 text-[#171A1F]">
                    <strong className="text-[#FF6B1F]">
                      {formatCurrencyBRL(summary.finalSalePrice)}
                    </strong>{' '}
                    ({budget.stages.length} etapa(s) e {summary.servicesCount} item(ns) de serviço)
                  </td>
                </tr>
                <tr>
                  <th className="bg-[#294C87]/5 text-left px-2.5 py-1.5 font-bold text-[#294C87] uppercase tracking-wide align-top">
                    Responsável Técnico
                  </th>
                  <td className="px-2.5 py-1.5 text-[#171A1F]">
                    <strong>{CONCE_COMPANY.responsavelTecnico}</strong> —{' '}
                    {CONCE_COMPANY.registroCrea}
                    <span className="block text-[10px] text-[#171A1F]/60 mt-0.5">
                      {CONCE_COMPANY.razaoSocial}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-[10px] text-[#171A1F]/50 mt-2">
              Validade desta proposta: {cleanValidityDays} dias {cleanValidityType}. Prazo de
              execução previsto: {cleanDeadline} (ver Seção 7). Condições de faturamento e
              garantias: ver Seção 8.
            </p>
          </section>

          {/* SUMÁRIO DAS SEÇÕES */}
          <section className="conce-proposal-sumario px-6 sm:px-10 pb-4 print:px-0">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#294C87] mb-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>Sumário da Proposta</span>
            </div>
            <ol className="text-[11px] text-[#171A1F]/80 space-y-0.5 list-decimal list-inside">
              {sections.map((sec) => (
                <li key={sec.number}>
                  <strong>Seção {sec.number}.</strong> {sec.title}
                </li>
              ))}
            </ol>
          </section>

          {/* AS 7 SEÇÕES DA PROPOSTA (texto corrido, ordem fixa) */}
          {sections.map((sec) => (
            <section
              key={sec.number}
              className="conce-proposal-section px-6 sm:px-10 py-4 border-t border-[#171A1F]/15 print:px-0"
            >
              <h2 className="flex items-baseline gap-2 text-sm font-black text-[#294C87] uppercase tracking-wide mb-2.5">
                <span className="font-mono text-[#FF6B1F]">{sec.number}.</span>
                <span>{sec.title}</span>
              </h2>

              <div className="space-y-2 text-justify">
                {sec.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="text-[12px] leading-relaxed text-[#171A1F]">
                    {p}
                  </p>
                ))}
              </div>

              {sec.items && sec.items.length > 0 && (
                <ul className="mt-2 space-y-1 pl-1">
                  {sec.items.map((item, iIdx) => (
                    <li
                      key={iIdx}
                      className="text-[11.5px] leading-relaxed text-[#171A1F]/90 flex items-start gap-1.5"
                    >
                      <span className="text-[#FF6B1F] font-black mt-0.5 shrink-0">–</span>
                      <span className="text-justify">{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {sec.table && (
                <div className="mt-3 overflow-x-auto print:overflow-visible">
                  <table className="w-full text-[10px] border border-[#171A1F]/25">
                    <thead>
                      <tr className="bg-[#294C87] text-white">
                        {sec.table.headers.map((h, hIdx) => (
                          <th
                            key={hIdx}
                            className={`px-2 py-1.5 font-bold uppercase tracking-wide border-r border-white/20 last:border-r-0 ${
                              hIdx === 0 ? 'text-left' : 'text-center'
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sec.table.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="border-b border-[#171A1F]/10 odd:bg-[#F8F9FA] even:bg-white"
                        >
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={`px-2 py-1.5 border-r border-[#171A1F]/10 last:border-r-0 ${
                                cIdx === 0 ? 'text-left font-medium' : 'text-center'
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sec.footnotes && sec.footnotes.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {sec.footnotes.map((fn, fIdx) => (
                    <p key={fIdx} className="text-[9.5px] italic text-[#171A1F]/55 leading-snug">
                      Nota: {fn}
                    </p>
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* ENCERRAMENTO / ASSINATURAS */}
          <section className="conce-proposal-encerramento px-6 sm:px-10 py-4 border-t border-[#171A1F]/15 print:px-0">
            <p className="text-[12px] leading-relaxed text-[#171A1F] text-justify">
              Permanecemos à inteira disposição para esclarecimentos adicionais sobre este
              documento. A aceitação da presente proposta implica a concordância integral com as
              condições técnicas, comerciais e de garantia aqui estabelecidas, ficando a execução
              condicionada às autorizações prévias relacionadas na Seção 7, às condições comerciais
              da Seção 8 e à formalização contratual entre as partes.
            </p>

            {/* BLOCO DE DESTAQUE EM EVIDÊNCIA — VALIDADE DA PROPOSTA JUNTO AO ACEITE */}
            <div className="mt-4 p-3.5 rounded-xl bg-[#294C87]/5 border-2 border-[#FF6B1F]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm print:border print:border-[#FF6B1F]/60">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-[#FF6B1F]/15 text-[#FF6B1F] shrink-0 mt-0.5 sm:mt-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#294C87]">
                      Validade da Proposta Comercial
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FF6B1F] text-white uppercase tracking-wider">
                      {cleanValidityDays} dias {cleanValidityType}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#171A1F]/80 mt-0.5 leading-snug">
                    As condições técnicas e os valores de venda aqui apresentados são válidos por{' '}
                    <strong>
                      {cleanValidityDays} dias {cleanValidityType}
                    </strong>{' '}
                    a contar da data de emissão ({formatCurrentDatePTBR()}). Decorrido este prazo
                    sem aceite formal, os preços e cronogramas poderão ser reavaliados.
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right sm:text-right w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[#171A1F]/10">
                <span className="text-[10px] text-[#171A1F]/60 block">Valor total de venda</span>
                <span className="text-sm font-black text-[#FF6B1F] whitespace-nowrap">
                  {formatCurrencyBRL(summary.finalSalePrice)}
                </span>
              </div>
            </div>

            {/* BLOCO DE ASSINATURAS COM DATA E LOCAL DO ACEITE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mt-9 print:mt-8 print:grid-cols-2 print:gap-6 print:break-inside-avoid">
              <div className="text-center">
                <div className="border-t border-[#171A1F] pt-2 mx-auto max-w-[280px]">
                  <p className="font-bold text-[11px] text-[#171A1F] print:text-[9.5pt]">
                    {CONCE_COMPANY.responsavelTecnico}
                  </p>
                  <p className="text-[10px] text-[#294C87] font-semibold print:text-[8.5pt]">
                    {CONCE_COMPANY.registroCrea}
                  </p>
                  <p className="text-[9.5px] text-[#171A1F]/60 print:text-[8pt]">
                    {CONCE_COMPANY.razaoSocial}
                  </p>
                  <p className="text-[9.5px] text-[#171A1F]/50 mt-1 print:text-[7.5pt]">
                    Porto Alegre/RS, {formatCurrentDatePTBR()}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-[#171A1F] pt-2 mx-auto max-w-[280px]">
                  <p className="font-bold text-[11px] text-[#171A1F] print:text-[9.5pt]">
                    {cleanClientName}
                  </p>
                  <p className="text-[10px] text-[#FF6B1F] font-bold print:text-[8.5pt]">
                    Aceite da Proposta Técnica e Comercial
                  </p>
                  <div className="mt-1.5 space-y-0.5 text-[9.5px] text-[#171A1F]/70 print:text-[8pt]">
                    <p>Local do aceite: ________________________ / _____</p>
                    <p>Data do aceite: _____ / _____ / _________</p>
                    <p className="text-[8.5px] italic text-[#171A1F]/50 print:text-[7pt]">
                      Assinatura do Contratante ou Representante Legal
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-[#171A1F]/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#171A1F]/60">
              <span>
                <strong className="text-[#171A1F]">{CONCE_COMPANY.nomeFantasia}</strong> • CNPJ{' '}
                {CONCE_COMPANY.cnpjFormatado} • {cleanCode}
              </span>
              <span className="italic text-[#FF6B1F] font-semibold">{CONCE_COMPANY.slogan}</span>
            </div>
          </section>
        </article>
      </main>

      {/* RODAPÉ DO VISUALIZADOR (Oculto na Impressão) */}
      <footer className="w-full max-w-4xl mt-3 flex items-center justify-between text-white/60 text-xs px-2 print:hidden">
        <span className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          <span>Documento de proposta em A4 retrato — role para ler as 8 seções.</span>
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
