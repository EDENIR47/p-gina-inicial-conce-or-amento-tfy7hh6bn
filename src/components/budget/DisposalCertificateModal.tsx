/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal de Ficha de Descarte de Resíduos & Certificado de Destino Final
 *
 * Em conformidade com a Resolução CONAMA 307 e normas ABNT (NBR 10.004 / NBR 15.112 a 15.116).
 *
 * Funcionalidades:
 * - Agrupa materiais por tipo de resíduo da obra (Classes A, B, C, D);
 * - Para cada tipo, exibe uma FICHA com identificação da obra, insumos geradores e estimativa técnica de massa;
 * - Formulário editável de CERTIFICADO DE DESTINO FINAL para cada ficha (transportadora, CNPJ, destino final, nº MTR/CDF, LO, data, responsável);
 * - Botão "Anexar ao Orçamento" grava o conjunto de fichas como disposalDocument versionado (v1, v2...), persistido localmente e na nuvem;
 * - Impressão técnica em A4 institucional (1 ficha por página/folha com cabeçalho CONCE e rodapé CNPJ);
 * - Zero menção a IA. Identidade visual CONCE (Mirage #171A1F, Cobalt #294C87, Pumpkin #FF6B1F).
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  X,
  Printer,
  FileCheck2,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Truck,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Scale,
  ExternalLink,
  Award,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { FullBudget } from '@/types/budgetEngine'
import { CONCE_COMPANY } from '@/lib/conceCompany'
import { ConceLogo } from '@/components/ConceLogo'
import {
  DisposalSheet,
  generateDisposalSheetsFromBudget,
  buildDisposalDocument,
  ConamaClass,
} from '@/lib/disposalEngine'
import { saveSingleBudget } from '@/lib/budgetsStorage'
import { syncEngine } from '@/services/syncEngine'
import { logAuditEvent } from '@/lib/intelligenceStorage'
import { formatCurrentDatePTBR, sanitizeDocumentText } from '@/lib/formatters'

export interface DisposalCertificateModalProps {
  budget: FullBudget
  isOpen: boolean
  onClose: () => void
  onAttachDisposalToBudget?: (updatedBudget: FullBudget) => void
}

export const DisposalCertificateModal: React.FC<DisposalCertificateModalProps> = ({
  budget,
  isOpen,
  onClose,
  onAttachDisposalToBudget,
}) => {
  // Estado local das fichas em edição
  const [sheets, setSheets] = useState<DisposalSheet[]>(() =>
    generateDisposalSheetsFromBudget(budget),
  )
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [editingCertId, setEditingCertId] = useState<string | null>(null)

  // Recarrega se o orçamento mudar
  useEffect(() => {
    if (isOpen) {
      setSheets(generateDisposalSheetsFromBudget(budget))
      setActiveSheetIndex(0)
    }
  }, [budget.id, isOpen])

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
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setActiveSheetIndex((prev) => Math.min(sheets.length - 1, prev + 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setActiveSheetIndex((prev) => Math.max(0, prev - 1))
      }
    },
    [isOpen, onClose, sheets.length],
  )

  // Contagem de certificados preenchidos vs pendentes
  const certStats = useMemo(() => {
    let filled = 0
    let pending = 0
    for (const sh of sheets) {
      const c = sh.certificate
      const isFilled = Boolean(
        c.transporterName?.trim() ||
        c.destinationCompany?.trim() ||
        c.certificateOrManifestNumber?.trim() ||
        c.status === 'emitido' ||
        c.status === 'conferido',
      )
      if (isFilled) filled++
      else pending++
    }
    return { filled, pending, total: sheets.length }
  }, [sheets])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // Dados sanitizados da obra e proposta
  const cleanCode = sanitizeDocumentText(budget?.code) || 'ORC-CONCE'
  const cleanTitle =
    sanitizeDocumentText(budget?.title) ||
    sanitizeDocumentText(budget?.work?.name) ||
    'Orçamento de Obra e Gestão de Resíduos'
  const cleanWorkName = sanitizeDocumentText(budget?.work?.name) || 'Obra Residencial/Comercial'
  const cleanWorkAddress = budget?.work?.address
    ? `${sanitizeDocumentText(budget.work.address)}, ${budget.work?.city || 'Porto Alegre'}/${budget.work?.state || 'RS'}`
    : `${budget?.work?.city || 'Porto Alegre'}/${budget?.work?.state || 'RS'}`
  const cleanClientName = sanitizeDocumentText(budget?.client?.name) || 'Cliente Contratante'
  const cleanClientDoc = sanitizeDocumentText(budget?.client?.document)

  const hasAttached = Boolean(budget?.disposalDocument && budget.disposalDocument.version > 0)
  const currentVersion = budget?.disposalDocument?.version || 0

  const totalSheetsCount = sheets.length
  const activeSheet = sheets[activeSheetIndex] || sheets[0]

  // Se não estiver aberto, não renderiza nada após os hooks
  if (!isOpen) return null

  // Atualizar campo do certificado de uma ficha específica
  const handleUpdateCertificate = (sheetId: string, field: string, value: string) => {
    setSheets((prev) =>
      prev.map((s) => {
        if (s.id !== sheetId) return s
        const updatedCert = {
          ...s.certificate,
          [field]: value,
        }
        // Se preencheu manifesto ou empresa destinadora, atualiza status
        if (
          (field === 'certificateOrManifestNumber' || field === 'destinationCompany') &&
          value.trim() &&
          updatedCert.status === 'pendente'
        ) {
          updatedCert.status = 'emitido'
        }
        return {
          ...s,
          certificate: updatedCert,
        }
      }),
    )
  }

  // Anexar ao Orçamento com versionamento incremental
  const handleAttachDisposalDocument = () => {
    const docData = buildDisposalDocument(budget, sheets)

    const updatedBudget: FullBudget = {
      ...budget,
      disposalDocument: docData,
      updatedAt: new Date().toISOString(),
    }

    // Persistir localmente
    saveSingleBudget(updatedBudget)
    // Sincronizar na nuvem PocketBase via fila
    syncEngine.enqueueBudgetSave(updatedBudget)

    // Trilha de auditoria técnica
    logAuditEvent({
      budgetId: budget.id,
      action: 'anexo_ficha_descarte',
      title: 'Ficha de Descarte e Certificado Anexados',
      details: `Fichas de descarte de resíduos anexadas como documento oficial (v${docData.version}). ${docData.sheets.length} tipos de resíduos classificados conforme CONAMA 307. Peso estimado total: ${docData.totalEstimatedWeightKg} kg.`,
      userName: CONCE_COMPANY.responsavelTecnicoCompleto,
    })

    if (onAttachDisposalToBudget) {
      onAttachDisposalToBudget(updatedBudget)
    }

    showToast(`Ficha de Descarte v${docData.version} anexada com sucesso ao orçamento!`)
  }

  // Disparar impressão / PDF nativo
  const handlePrint = () => {
    const originalTitle = document.title
    const safeCode = (budget.code || 'ORC-CONCE').replace(/[^a-zA-Z0-9_-]/g, '_')
    document.title = `Ficha-Descarte-Residuos-${safeCode}`

    logAuditEvent({
      budgetId: budget.id,
      action: 'exportacao_pdf',
      title: 'Fichas de Descarte Impressas / Exportadas em PDF',
      details: `Fichas de descarte de materiais (${sheets.length} tipos) da proposta ${cleanCode} impressas em folha A4 com certificado de destino final.`,
      userName: CONCE_COMPANY.responsavelTecnicoCompleto,
    })

    window.print()
    setTimeout(() => {
      document.title = originalTitle
    }, 500)
  }

  // Re-classificar a partir do orçamento atual
  const handleRegenerateFromBudget = () => {
    const regenerated = generateDisposalSheetsFromBudget(budget)
    setSheets(regenerated)
    showToast('Fichas de resíduo reclassificadas com base nos insumos do orçamento!')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disposal-modal-title"
      className="conce-disposal-modal-overlay fixed inset-0 z-50 bg-[#171A1F]/90 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible"
    >
      {/* Toast flutuante */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[9999] bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-emerald-400 print:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <FileCheck2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BARRA SUPERIOR DE COMANDOS (Oculta na Impressão) */}
      <header className="w-full max-w-6xl bg-[#171A1F] text-white rounded-2xl p-3.5 mb-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl border border-white/20 print:hidden sticky top-2 z-50">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <ConceLogo height={24} variant="dark" />
          <div className="h-5 w-px bg-white/20 hidden md:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-gradient-to-r from-[#294C87] to-[#1f3a68] text-white text-[10px] font-extrabold uppercase tracking-wider border border-white/20">
                Ficha de Descarte & CDF
              </span>
              <span className="font-mono text-xs font-bold text-white/90">{cleanCode}</span>
              {hasAttached && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                  Anexada v{currentVersion}
                </span>
              )}
            </div>
            <span className="text-[11px] text-white/60 line-clamp-1">
              {cleanTitle} • {cleanClientName}
            </span>
          </div>
        </div>

        {/* Status de Certificados e Ações */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs text-white/90 font-medium border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF6B1F]" />
            <span>
              Certificados: <strong className="text-emerald-400">{certStats.filled}</strong> ok /{' '}
              <strong className="text-amber-400">{certStats.pending}</strong> pendentes
            </span>
          </div>

          <button
            type="button"
            onClick={handleRegenerateFromBudget}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Recalcular e reclassificar resíduos a partir dos insumos atuais do orçamento"
          >
            <RotateCcw className="w-4 h-4 text-[#FF8945]" />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#294C87] hover:bg-[#1f3a68] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer active:scale-95 border border-white/20"
            title="Imprimir todas as fichas de descarte em folha A4 (1 ficha por página)"
          >
            <Printer className="w-4 h-4 text-[#FF8945]" />
            <span>Imprimir A4 / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleAttachDisposalDocument}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95 border ${
              hasAttached
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400/40'
                : 'bg-gradient-to-r from-[#FF6B1F] to-[#FF8945] hover:from-[#e55d17] hover:to-[#FF6B1F] text-white border-white/20 shadow-orange-500/20'
            }`}
            title="Gravar este conjunto de fichas de descarte como documento oficial anexado ao orçamento"
          >
            {hasAttached ? (
              <FileCheck2 className="w-4 h-4 text-emerald-200" />
            ) : (
              <Paperclip className="w-4 h-4 text-white" />
            )}
            <span>
              {hasAttached ? `Anexada (v${currentVersion}) • Atualizar` : 'Anexar ao Orçamento'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Fechar Ficha de Descarte (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* SELETOR EM ABAS DOS TIPOS DE RESÍDUO (Oculto na Impressão) */}
      <nav
        aria-label="Navegação dos tipos de resíduo gerados"
        className="w-full max-w-6xl mb-3 print:hidden"
      >
        <div className="bg-[#171A1F]/95 backdrop-blur border border-white/15 rounded-xl p-1.5 flex items-center justify-start gap-1 overflow-x-auto">
          {sheets.map((sheet, idx) => {
            const isActive = activeSheetIndex === idx
            const isFilled =
              sheet.certificate.status === 'emitido' ||
              sheet.certificate.status === 'conferido' ||
              Boolean(sheet.certificate.certificateOrManifestNumber?.trim())

            const classColors: Record<ConamaClass, string> = {
              'Classe A': 'bg-amber-500/20 text-amber-300 border-amber-400/30',
              'Classe B': 'bg-blue-500/20 text-blue-300 border-blue-400/30',
              'Classe C': 'bg-gray-500/20 text-gray-300 border-gray-400/30',
              'Classe D': 'bg-red-500/20 text-red-300 border-red-400/30',
            }

            return (
              <button
                key={sheet.id}
                type="button"
                onClick={() => setActiveSheetIndex(idx)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? 'bg-[#294C87] text-white border-white/30 shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10 border-transparent'
                }`}
              >
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${
                    classColors[sheet.conamaClass]
                  }`}
                >
                  {sheet.conamaClass}
                </span>
                <span>{sheet.wasteType.split('—')[1]?.trim() || sheet.wasteType}</span>
                <span className="font-mono text-[10px] text-white/50">
                  ({sheet.items.length} {sheet.items.length === 1 ? 'item' : 'itens'})
                </span>
                {isFilled ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span
                    className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
                    title="Pendente de certificado"
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ============================================================ */}
      {/* CONTEÚDO PRINCIPAL: MODO INTERATIVO (TELA) E DOCUMENTO IMPRESSO (A4) */}
      {/* ============================================================ */}
      <main className="w-full max-w-6xl space-y-6 print:space-y-0" id="conce-printable-disposal">
        {/* Renderiza a lista de fichas: na tela, mostra a ficha ativa ou todas com navegação; na impressão (PDF), renderiza cada ficha em 1 página A4 independente com break-inside: avoid */}
        {sheets.map((sheet, index) => {
          const isCurrentActive = activeSheetIndex === index
          const isFilled =
            sheet.certificate.status === 'emitido' ||
            sheet.certificate.status === 'conferido' ||
            Boolean(sheet.certificate.certificateOrManifestNumber?.trim())

          return (
            <article
              key={sheet.id}
              className={`conce-disposal-sheet ${
                isCurrentActive ? 'block' : 'hidden print:block'
              } bg-white text-[#171A1F] rounded-3xl p-6 sm:p-10 shadow-2xl border-4 border-[#171A1F] relative overflow-hidden flex flex-col justify-between min-h-[620px] print:min-h-[250mm] print:rounded-none print:border-2 print:p-8 print:shadow-none print:break-after-page print:page-break-after-always print:mb-0`}
            >
              {/* Faixa decorativa superior com gradiente CONCE */}
              <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#294C87] via-[#FF6B1F] to-[#294C87]" />

              {/* 1. CABEÇALHO INSTITUCIONAL DA FICHA */}
              <header className="border-b-2 border-[#171A1F]/10 pb-4 pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <ConceLogo height={32} variant="light" />
                    <div className="h-6 w-px bg-[#171A1F]/20" />
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#294C87] block">
                        Sistema de Gestão Ambiental de Obras
                      </span>
                      <h2
                        id="disposal-modal-title"
                        className="text-base sm:text-xl font-extrabold text-[#171A1F] tracking-tight"
                      >
                        Ficha de Descarte de Material & Destino Final
                      </h2>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#171A1F]/60">
                    {CONCE_COMPANY.razaoSocial} • CNPJ {CONCE_COMPANY.cnpjFormatado} • Resolução
                    CONAMA 307
                  </p>
                </div>

                <div className="text-right sm:self-center shrink-0">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#294C87]/10 text-[#294C87] text-xs font-mono font-bold">
                    <span>
                      Ficha {index + 1} de {sheets.length}
                    </span>
                    <span>•</span>
                    <strong className="text-[#FF6B1F]">{cleanCode}</strong>
                  </div>
                  <div className="text-[10px] text-[#171A1F]/50 mt-1">
                    Emissão: {formatCurrentDatePTBR()}
                  </div>
                </div>
              </header>

              {/* 2. DADOS DA OBRA E ENQUADRAMENTO TÉCNICO */}
              <section className="py-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#F8F9FA] rounded-2xl p-4 border border-[#171A1F]/10 my-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#FF6B1F] tracking-wider block">
                    Identificação da Obra:
                  </span>
                  <p className="font-bold text-[#171A1F] text-sm mt-0.5">{cleanWorkName}</p>
                  <p className="text-[11px] text-[#171A1F]/70">{cleanWorkAddress}</p>
                  <p className="text-[10px] text-[#171A1F]/60 mt-1">
                    Cliente: <strong className="text-[#171A1F]">{cleanClientName}</strong>
                    {cleanClientDoc ? ` • Doc: ${cleanClientDoc}` : ''}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[#294C87] tracking-wider block">
                    Responsabilidade Técnica:
                  </span>
                  <p className="font-bold text-[#171A1F] text-sm mt-0.5">
                    {CONCE_COMPANY.responsavelTecnico}
                  </p>
                  <p className="text-[11px] font-semibold text-[#294C87]">
                    {CONCE_COMPANY.registroCrea}
                  </p>
                  <p className="text-[10px] text-[#171A1F]/60 mt-1">
                    Engenharia e consultoria técnica credenciada
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#171A1F]/10 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-[#171A1F] tracking-wider block">
                      Classificação do Resíduo:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-[#FF6B1F] text-white">
                        {sheet.conamaClass}
                      </span>
                      <span className="font-extrabold text-[#171A1F] text-xs">
                        {sheet.wasteType.split('—')[1]?.trim() || sheet.wasteType}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#171A1F]/10 text-[11px] font-mono font-bold text-[#294C87]">
                    <span>Massa Estimada:</span>
                    <span>~{sheet.estimatedWeightKg.toLocaleString('pt-BR')} kg</span>
                  </div>
                </div>
              </section>

              {/* 3. RELAÇÃO DE INSUMOS DO ORÇAMENTO QUE GERAM O RESÍDUO */}
              <section className="space-y-2 my-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#294C87]" />
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#171A1F] uppercase tracking-wide">
                      Itens do Orçamento Geradores deste Tipo de Resíduo:
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#171A1F]/60 font-mono">
                    {sheet.items.length}{' '}
                    {sheet.items.length === 1 ? 'insumo identificado' : 'insumos identificados'}
                  </span>
                </div>

                <div className="overflow-x-auto border border-[#171A1F]/15 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#171A1F]/5 border-b border-[#171A1F]/10 text-[10px] font-extrabold uppercase tracking-wider text-[#171A1F]/70">
                        <th className="py-2 px-3">Etapa / Serviço</th>
                        <th className="py-2 px-3">Insumo Orçado</th>
                        <th className="py-2 px-2 text-center">Unid.</th>
                        <th className="py-2 px-3 text-right">Qtd. Orçada</th>
                        <th className="py-2 px-3 text-right">Massa Est. (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#171A1F]/5 text-[11px]">
                      {sheet.items.map((item, idx) => (
                        <tr key={`${item.inputCode}-${idx}`} className="hover:bg-[#294C87]/[0.02]">
                          <td className="py-2 px-3">
                            <span className="font-mono font-bold text-[#294C87] mr-1">
                              {item.serviceCode}
                            </span>
                            <span className="font-medium text-[#171A1F]">
                              {item.serviceDescription}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-[#171A1F]/50 mr-1">
                              {item.inputCode}
                            </span>
                            <span className="text-[#171A1F] font-semibold">
                              {item.inputDescription}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-[#171A1F]/70">
                            {item.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {item.budgetQuantity.toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#FF6B1F]">
                            {item.estimatedWeightKg.toLocaleString('pt-BR')} kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#171A1F]/[0.03] border-t-2 border-[#171A1F]/10 font-bold text-xs">
                        <td
                          colSpan={4}
                          className="py-2.5 px-3 text-right uppercase text-[10px] text-[#171A1F]/70"
                        >
                          Total Estimado em Massa para esta Ficha:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-sm text-[#FF6B1F]">
                          ~{sheet.estimatedWeightKg.toLocaleString('pt-BR')} kg
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-[10px] text-[#171A1F]/50 italic">
                  * Estimativa técnica referencial baseada em consumo de projeto, densidade
                  volumétrica e índices médios de sobras de obra conforme diretrizes CONAMA 307.
                </p>
              </section>

              {/* 4. BLOCO DO CERTIFICADO DE DESTINO FINAL (CDF / MTR) — EDITÁVEL EM TELA */}
              <section className="mt-4 pt-4 border-t-2 border-[#171A1F]/15 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#171A1F] uppercase tracking-wide">
                      Certificado de Destino Final & Manifesto de Transporte (CDF / MTR)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        isFilled
                          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-400'
                          : 'bg-amber-500/15 text-amber-800 border-amber-400'
                      }`}
                    >
                      {isFilled ? 'Certificado Registrado' : 'Pendente de Certificado'}
                    </span>
                  </div>
                </div>

                {/* Diretriz recomendada */}
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-[#294C87] flex items-start gap-2">
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#294C87]" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Diretriz Técnica Recomendada:</strong> {sheet.recommendedDestination}
                  </p>
                </div>

                {/* Grade de Campos do Certificado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Empresa Transportadora */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-[#171A1F]/70 tracking-wider block">
                      Empresa Transportadora:
                    </label>
                    <input
                      type="text"
                      value={sheet.certificate.transporterName || ''}
                      onChange={(e) =>
                        handleUpdateCertificate(sheet.id, 'transporterName', e.target.value)
                      }
                      placeholder="Ex.: Caçambas Trans-Obra LTDA"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#294C87] bg-white print:border-b print:border-t-0 print:border-x-0 print:rounded-none print:px-0"
                    />
                  </div>

                  {/* CNPJ Transportadora */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-[#171A1F]/70 tracking-wider block">
                      CNPJ da Transportadora:
                    </label>
                    <input
                      type="text"
                      value={sheet.certificate.transporterCnpj || ''}
                      onChange={(e) =>
                        handleUpdateCertificate(sheet.id, 'transporterCnpj', e.target.value)
                      }
                      placeholder="00.000.000/0001-00"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#294C87] bg-white print:border-b print:border-t-0 print:border-x-0 print:rounded-none print:px-0"
                    />
                  </div>

                  {/* Destino Final / Empresa Destinadora */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-[#171A1F]/70 tracking-wider block">
                      Empresa Destinadora Final:
                    </label>
                    <input
                      type="text"
                      value={sheet.certificate.destinationCompany || ''}
                      onChange={(e) =>
                        handleUpdateCertificate(sheet.id, 'destinationCompany', e.target.value)
                      }
                      placeholder="Ex.: EcoBrita Central de Reciclagem"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#294C87] bg-white print:border-b print:border-t-0 print:border-x-0 print:rounded-none print:px-0"
                    />
                  </div>

                  {/* CNPJ Destinadora */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-[#171A1F]/70 tracking-wider block">
                      CNPJ da Destinadora:
                    </label>
                    <input
                      type="text"
                      value={sheet.certificate.destinationCnpj || ''}
                      onChange={(e) =>
                        handleUpdateCertificate(sheet.id, 'destinationCnpj', e.target.value)
                      }
                      placeholder="00.000.000/0001-00"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#294C87] bg-white print:border-b print:border-t-0 print:border-x-0 print:rounded-none print:px-0"
                    />
                  </div>

                  {/* Tipo de Destino */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-[#171A1F]/70 tracking-wider block">
                      Tipo de Destinação:
                    </label>
                    <input
                      type="text"
                      value={sheet.certificate.destinationType || ''}
                      onChange={(e) =>
                        handleUpdateCertificate(sheet.id, 'destinationType', e.target.value)
                      }
                      placeholder="Ex.: Aterro de Inertes / Central de Reciclagem"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#294C87] bg-white print:border-b print:border-t-0 print:border-x-0 print:rounded-none print:px-0"
                    />
                  </div>

                  {/* Nº do Certificado / Manifesto (MTR / CDF) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-[#171A1F]/70 tracking-wider block">
                      Nº do Certificado / Manifesto (MTR):
                    </label>
                    <input
                      type="text"
                      value={sheet.certificate.certificateOrManifestNumber || ''}
                      onChange={(e) =>
                        handleUpdateCertificate(
                          sheet.id,
                          'certificateOrManifestNumber',
                          e.target.value,
                        )
                      }
                      placeholder="Ex.: MTR-2025-001248"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-bold text-[#294C87] focus:outline-none focus:ring-2 focus:ring-[#294C87] bg-white print:border-b print:border-t-0 print:border-x-0 print:rounded-none print:px-0"
                    />
                  </div>

                  {/* Licença Ambiental (LO) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-[#171A1F]/70 tracking-wider block">
                      Licença Ambiental de Operação (LO):
                    </label>
                    <input
                      type="text"
                      value={sheet.certificate.environmentalLicense || ''}
                      onChange={(e) =>
                        handleUpdateCertificate(sheet.id, 'environmentalLicense', e.target.value)
                      }
                      placeholder="Ex.: LO Nº 4521/2023 - SMAM/FEPAM"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#294C87] bg-white print:border-b print:border-t-0 print:border-x-0 print:rounded-none print:px-0"
                    />
                  </div>

                  {/* Data do Descarte */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-[#171A1F]/70 tracking-wider block">
                      Data da Destinação / Saída:
                    </label>
                    <input
                      type="date"
                      value={sheet.certificate.disposalDate || ''}
                      onChange={(e) =>
                        handleUpdateCertificate(sheet.id, 'disposalDate', e.target.value)
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#294C87] bg-white print:border-b print:border-t-0 print:border-x-0 print:rounded-none print:px-0"
                    />
                  </div>

                  {/* Responsável pela Destinação */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-[#171A1F]/70 tracking-wider block">
                      Responsável Técnico / Conferência:
                    </label>
                    <input
                      type="text"
                      value={sheet.certificate.responsibleTechnician || ''}
                      onChange={(e) =>
                        handleUpdateCertificate(sheet.id, 'responsibleTechnician', e.target.value)
                      }
                      placeholder={CONCE_COMPANY.responsavelTecnicoCompleto}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#294C87] bg-white print:border-b print:border-t-0 print:border-x-0 print:rounded-none print:px-0"
                    />
                  </div>
                </div>

                {/* Observações adicionais do descarte */}
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-extrabold uppercase text-[#171A1F]/70 tracking-wider block">
                    Observações de Rastreabilidade e Conformidade:
                  </label>
                  <input
                    type="text"
                    value={sheet.certificate.notes || ''}
                    onChange={(e) => handleUpdateCertificate(sheet.id, 'notes', e.target.value)}
                    placeholder="Ex.: Resíduos triados na fonte em caçambas identificadas; transporte realizado com lona de contenção."
                    className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#294C87] bg-white print:border-b print:border-t-0 print:border-x-0 print:rounded-none print:px-0"
                  />
                </div>
              </section>

              {/* 5. BLOCO DE ASSINATURAS FORMAIS E RODAPÉ INSTITUCIONAL */}
              <footer className="mt-6 pt-5 border-t-2 border-[#171A1F]/15 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-xs">
                  <div className="border-t border-[#171A1F]/30 pt-2 text-center">
                    <p className="font-bold text-[#171A1F]">{CONCE_COMPANY.responsavelTecnico}</p>
                    <p className="text-[11px] text-[#294C87] font-semibold">
                      {CONCE_COMPANY.registroCrea}
                    </p>
                    <p className="text-[10px] text-[#171A1F]/50">
                      Responsável Técnico CONCE Engenharia
                    </p>
                  </div>

                  <div className="border-t border-[#171A1F]/30 pt-2 text-center">
                    <p className="font-bold text-[#171A1F]">
                      {sheet.certificate.destinationCompany?.trim() ||
                        'Empresa Destinadora Final / Aterro'}
                    </p>
                    <p className="text-[11px] text-[#171A1F]/60">
                      {sheet.certificate.destinationCnpj?.trim() ||
                        'Assinatura e Carimbo do Receptor'}
                    </p>
                    <p className="text-[10px] text-[#171A1F]/50">
                      Declaração de Recebimento e Destinação Conforme CONAMA 307
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#171A1F]/50 pt-2 border-t border-[#171A1F]/10">
                  <span>
                    {CONCE_COMPANY.razaoSocial} • CNPJ {CONCE_COMPANY.cnpjFormatado}
                  </span>
                  <span>{CONCE_COMPANY.slogan}</span>
                </div>
              </footer>
            </article>
          )
        })}
      </main>

      {/* CONTROLE DE NAVEGAÇÃO INFERIOR ENTRE AS FICHAS NA TELA (Oculto na Impressão) */}
      <footer className="w-full max-w-6xl mt-4 bg-[#171A1F] text-white rounded-2xl p-3 flex items-center justify-between shadow-xl border border-white/20 print:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSheetIndex((prev) => Math.max(0, prev - 1))}
            disabled={activeSheetIndex === 0}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-white"
            title="Ficha Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs font-bold px-2">
            Ficha <strong className="text-[#FF6B1F]">{activeSheetIndex + 1}</strong> de{' '}
            {sheets.length}
          </span>
          <button
            type="button"
            onClick={() => setActiveSheetIndex((prev) => Math.min(sheets.length - 1, prev + 1))}
            disabled={activeSheetIndex === sheets.length - 1}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-white"
            title="Próxima Ficha"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#FF8945]" />
            <span>Imprimir A4</span>
          </button>

          <button
            type="button"
            onClick={handleAttachDisposalDocument}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer border border-emerald-400/40"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-200" />
            <span>Salvar & Anexar</span>
          </button>
        </div>
      </footer>
    </div>
  )
}
