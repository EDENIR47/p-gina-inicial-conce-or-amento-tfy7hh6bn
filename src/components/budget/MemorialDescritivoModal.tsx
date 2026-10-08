/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal de Memorial Descritivo Automático de Obras
 *
 * Funcionalidades:
 * - Redige automaticamente memorial técnico para todas as etapas e serviços do orçamento
 * - Suporta pré-visualização e edição em tempo real (edição viva em memória)
 * - Botão opcional "Salvar memorial no orçamento" (gravação explícita/opt-in)
 * - Toggle para incluir fotos das etapas (desligado por padrão)
 * - Toggle para incluir sumário executivo de etapas
 * - Opção de regenerar automaticamente ou restaurar versão salva anteriormente
 * - Exportação para PDF / Impressão A4 (window.print com isolamento de impressão idêntico ao padrão CONCE)
 * - Zero menção a preços/valores/BDI — estritamente técnico e institucional
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Printer,
  FileText,
  Edit3,
  RotateCcw,
  Check,
  Save,
  Image as ImageIcon,
  ListOrdered,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  HelpCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { FullBudget } from '@/types/budgetEngine'
import { CONCE_COMPANY } from '@/lib/conceCompany'
import { ConceLogo, ConceWatermark } from '@/components/ConceLogo'
import {
  MemorialDocumentData,
  MemorialStageItem,
  MemorialServiceItem,
  buildMemorialDocumentData,
  generateServiceTechnicalSpecification,
  generateDefaultGeneralIntroduction,
} from '@/lib/memorialEngine'
import { formatCurrentDatePTBR } from '@/lib/formatters'

export interface MemorialDescritivoModalProps {
  budget: FullBudget
  isOpen: boolean
  onClose: () => void
  onSaveMemorialToBudget?: (updatedBudget: FullBudget) => void
}

export const MemorialDescritivoModal: React.FC<MemorialDescritivoModalProps> = ({
  budget,
  isOpen,
  onClose,
  onSaveMemorialToBudget,
}) => {
  const hasSavedVersion = useMemo(() => {
    return !!(
      budget.savedMemorial &&
      budget.savedMemorial.stages &&
      budget.savedMemorial.stages.length > 0
    )
  }, [budget.savedMemorial])

  // Estados de controle do memorial
  const [includePhotos, setIncludePhotos] = useState<boolean>(
    budget.savedMemorial?.includeStagePhotos ?? false,
  )
  const [includeSummary, setIncludeSummary] = useState<boolean>(
    budget.savedMemorial?.includeSummary ?? true,
  )
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modelo de dados em edição
  const [memorialData, setMemorialData] = useState<MemorialDocumentData>(() =>
    buildMemorialDocumentData(budget, {
      useSavedIfAvailable: hasSavedVersion,
      includeStagePhotos: budget.savedMemorial?.includeStagePhotos ?? false,
      includeSummary: budget.savedMemorial?.includeSummary ?? true,
    }),
  )

  // Atualizar quando o orçamento ativo mudar
  useEffect(() => {
    setMemorialData(
      buildMemorialDocumentData(budget, {
        useSavedIfAvailable: hasSavedVersion,
        includeStagePhotos: includePhotos,
        includeSummary: includeSummary,
      }),
    )
  }, [budget, hasSavedVersion, includePhotos, includeSummary])

  // Toast temporário
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Atualizar texto de especificação de um serviço específico
  const handleUpdateServiceSpec = (stageId: string, serviceId: string, newSpec: string) => {
    setMemorialData((prev) => ({
      ...prev,
      stages: prev.stages.map((st) => {
        if (st.stageId !== stageId) return st
        return {
          ...st,
          services: st.services.map((srv) => {
            if (srv.serviceId !== serviceId) return srv
            return {
              ...srv,
              technicalSpecification: newSpec,
              isCustomized: true,
            }
          }),
        }
      }),
    }))
  }

  // Atualizar introdução geral
  const handleUpdateGeneralIntro = (newIntro: string) => {
    setMemorialData((prev) => ({
      ...prev,
      generalIntroduction: newIntro,
    }))
  }

  // Regenerar tudo automaticamente (descarta edições em memória da sessão)
  const handleRegenerateAll = () => {
    const freshlyGenerated = buildMemorialDocumentData(budget, {
      useSavedIfAvailable: false,
      includeStagePhotos: includePhotos,
      includeSummary: includeSummary,
    })
    setMemorialData(freshlyGenerated)
    showToast('Memorial descritivo regenerado automaticamente com sucesso!')
  }

  // Usar memorial salvo (se existir)
  const handleRestoreSaved = () => {
    if (!hasSavedVersion) return
    const restored = buildMemorialDocumentData(budget, {
      useSavedIfAvailable: true,
      includeStagePhotos: includePhotos,
      includeSummary: includeSummary,
    })
    setMemorialData(restored)
    showToast('Versão salva do memorial restaurada com sucesso!')
  }

  // Salvar explicitamente no objeto do orçamento
  const handleSaveToBudget = () => {
    if (!onSaveMemorialToBudget) {
      showToast('Ação de gravação não disponível neste contexto.')
      return
    }

    const savedPayload = {
      generatedAt: memorialData.generatedAt,
      updatedAt: new Date().toISOString(),
      generalIntroduction: memorialData.generalIntroduction,
      includeStagePhotos: includePhotos,
      includeSummary: includeSummary,
      stages: memorialData.stages.map((st) => ({
        stageId: st.stageId,
        stageCode: st.stageCode,
        stageName: st.stageName,
        notes: st.notes,
        photoUrl: st.photoUrl,
        services: st.services.map((srv) => ({
          serviceId: srv.serviceId,
          serviceCode: srv.serviceCode,
          serviceDescription: srv.serviceDescription,
          unit: srv.unit,
          quantity: srv.quantity,
          technicalSpecification: srv.technicalSpecification,
        })),
      })),
    }

    const updatedBudget: FullBudget = {
      ...budget,
      savedMemorial: savedPayload,
      updatedAt: new Date().toISOString(),
    }

    onSaveMemorialToBudget(updatedBudget)
    showToast('Memorial descritivo gravado no orçamento com sucesso!')
  }

  // Disparar impressão / PDF nativo
  const handlePrint = () => {
    document.body.classList.add('conce-printing')
    window.print()
    setTimeout(() => {
      document.body.classList.remove('conce-printing')
    }, 500)
  }

  // Data formatada para rodapés e cabeçalhos
  const currentDateFormatted = formatCurrentDatePTBR()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="memorial-modal-title"
      className="conce-memorial-modal-overlay fixed inset-0 z-50 bg-[#171A1F]/80 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 print:p-0 print:bg-white"
    >
      {/* Toast flutuante */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[60] bg-[#171A1F] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#FF6B1F] flex items-center gap-2.5 text-xs font-bold animate-fade-in print:hidden">
          <CheckCircle2 className="w-4 h-4 text-[#FF6B1F] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BARRA SUPERIOR DE CONTROLE E AÇÕES (OCULTA NA IMPRESSÃO) */}
      <div className="w-full max-w-5xl bg-[#171A1F] text-white rounded-2xl p-4 mb-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl border border-white/20 print:hidden sticky top-2 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B1F] to-[#FF8945] flex items-center justify-center shadow-md shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FF6B1F]/20 text-[#FF6B1F]">
                Documento Técnico de Engenharia
              </span>
              <span className="text-xs text-white/50">• {budget.code}</span>
            </div>
            <h2 id="memorial-modal-title" className="text-lg font-extrabold text-white">
              Memorial Descritivo Automático
            </h2>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto">
          {/* Alternar Modo de Edição */}
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isEditMode
                ? 'bg-[#FF6B1F] text-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Editar textos das especificações técnicas de cada serviço"
          >
            {isEditMode ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{isEditMode ? 'Concluir Edição' : 'Editar Especificações'}</span>
          </button>

          {/* Regenerar Automático */}
          <button
            type="button"
            onClick={handleRegenerateAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
            title="Regenerar a redação técnica de todos os serviços com base nas composições"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FF6B1F]" />
            <span className="hidden sm:inline">Regenerar</span>
          </button>

          {/* Usar Memorial Salvo (se houver) */}
          {hasSavedVersion && (
            <button
              type="button"
              onClick={handleRestoreSaved}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs font-bold transition-all cursor-pointer"
              title="Restaurar a versão previamente gravada neste orçamento"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Usar Salvo</span>
            </button>
          )}

          {/* Salvar no Orçamento */}
          {onSaveMemorialToBudget && (
            <button
              type="button"
              onClick={handleSaveToBudget}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#294C87] hover:bg-[#1f3b6c] text-white text-xs font-bold transition-all shadow-md cursor-pointer border border-white/20"
              title="Salvar alterações no orçamento para reuso posterior"
            >
              <Save className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span className="hidden sm:inline">Salvar no Orçamento</span>
            </button>
          )}

          {/* Baixar PDF / Imprimir */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B1F] to-[#FF8945] hover:from-[#e55d17] hover:to-[#FF6B1F] text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
            title="Imprimir ou Salvar em PDF (A4 técnico)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Baixar PDF</span>
          </button>

          {/* Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* BARRA DE OPÇÕES / CONFIGURAÇÕES DO MEMORIAL (OCULTA NA IMPRESSÃO) */}
      <div className="w-full max-w-5xl bg-white text-[#171A1F] rounded-xl p-3.5 mb-4 shadow-md border border-[#171A1F]/10 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none font-semibold text-[#171A1F]">
            <input
              type="checkbox"
              checked={includeSummary}
              onChange={(e) => setIncludeSummary(e.target.checked)}
              className="w-4 h-4 rounded text-[#FF6B1F] focus:ring-[#FF6B1F] border-[#171A1F]/30"
            />
            <span className="flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-[#294C87]" />
              Incluir Sumário Executivo de Etapas
            </span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none font-semibold text-[#171A1F]">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
              className="w-4 h-4 rounded text-[#FF6B1F] focus:ring-[#FF6B1F] border-[#171A1F]/30"
            />
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#FF6B1F]" />
              Incluir Fotos das Etapas (quando anexadas)
            </span>
          </label>
        </div>

        <div className="text-[11px] text-[#171A1F]/60 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Documento estritamente técnico (sem preços nem BDI comercial).</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DOCUMENTO IMPRIMÍVEL DO MEMORIAL DESCRITIVO CONCE (A4) */}
      {/* ======================================================== */}
      <div
        id="conce-printable-memorial"
        className="w-full max-w-5xl bg-white text-[#171A1F] rounded-2xl shadow-2xl p-6 sm:p-12 mb-12 space-y-8 print:space-y-4 print:shadow-none print:m-0 print:p-0 print:max-w-none print:w-full print:rounded-none relative overflow-visible"
      >
        <ConceWatermark position="center" variant="light" />

        {/* 1. CABEÇALHO INSTITUCIONAL CONCE */}
        <header className="border-b-2 border-[#171A1F] pb-4 print:pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <ConceLogo height={44} variant="light" />
              <p className="text-[11px] font-bold text-[#294C87] tracking-wider uppercase mt-1">
                {CONCE_COMPANY.nomeFantasia}
              </p>
              <p className="text-[10px] text-[#171A1F]/70">
                CNPJ {CONCE_COMPANY.cnpjFormatado} • RT: {CONCE_COMPANY.responsavelTecnicoCompleto}
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-md bg-[#294C87] text-white text-[11px] font-extrabold uppercase tracking-widest">
                Memorial Descritivo
              </span>
              <p className="font-mono text-xs font-bold text-[#FF6B1F] mt-1.5">
                {memorialData.budgetCode}
              </p>
              <p className="text-[10px] text-[#171A1F]/60">{currentDateFormatted}</p>
            </div>
          </div>
        </header>

        {/* 2. DADOS DE IDENTIFICAÇÃO DA OBRA E DO CLIENTE */}
        <section className="print-page-section print-break-avoid bg-[#F8F9FA] rounded-xl p-4 sm:p-5 border border-[#171A1F]/15 text-xs print:p-3 space-y-3">
          <div className="border-b border-[#171A1F]/10 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#171A1F] flex items-center gap-2 uppercase tracking-wide">
              <Building2 className="w-4 h-4 text-[#FF6B1F]" />
              Identificação do Empreendimento e Partes
            </h3>
            <span className="text-[10px] text-[#171A1F]/60 uppercase font-semibold">
              Especificações Técnicas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Obra */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#294C87]">Obra / Local:</span>
              <p className="font-bold text-sm text-[#171A1F]">
                {memorialData.work.name || 'Reforma e Estrutura Residencial'}
              </p>
              <p className="text-xs text-[#171A1F]/80">
                {memorialData.work.address || 'Rua Tomaz Gonzaga, 610, Apartamento 1803'}
              </p>
              <p className="text-[11px] text-[#171A1F]/70">
                {memorialData.work.city} - {memorialData.work.state}
              </p>
              {memorialData.work.totalAreaM2 && memorialData.work.totalAreaM2 > 0 && (
                <p className="text-[11px] text-[#171A1F]/80">
                  <span className="font-semibold">Área Construída/Intervenção:</span>{' '}
                  {memorialData.work.totalAreaM2.toLocaleString('pt-BR')} m²
                </p>
              )}
            </div>

            {/* Contratante / Responsável */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#294C87]">
                Cliente / Contratante:
              </span>
              <p className="font-bold text-sm text-[#171A1F]">
                {memorialData.client.name || 'Andreia de Oliveira da Costa e Jader da Costa'}
              </p>
              {memorialData.client.document && (
                <p className="text-xs text-[#171A1F]/80">
                  CPF/CNPJ: {memorialData.client.document}
                </p>
              )}
              {memorialData.work.executionDeadline && (
                <div className="pt-1 text-[10.5px] text-[#171A1F]/85 leading-tight">
                  <span className="font-bold text-[#294C87]">Prazo Executivo:</span>{' '}
                  {memorialData.work.executionDeadline}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. INTRODUÇÃO E OBJETIVO DO MEMORIAL */}
        <section className="print-page-section print-break-avoid space-y-2">
          <div className="flex items-center justify-between border-b border-[#171A1F]/15 pb-1.5">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase text-[#294C87] tracking-wider">
              1. Objetivo e Considerações Gerais
            </h3>
            {isEditMode && (
              <span className="text-[10px] text-[#FF6B1F] font-bold">Edição habilitada</span>
            )}
          </div>

          {isEditMode ? (
            <textarea
              value={memorialData.generalIntroduction}
              onChange={(e) => handleUpdateGeneralIntro(e.target.value)}
              rows={4}
              className="w-full text-xs sm:text-sm text-[#171A1F] leading-relaxed p-3 rounded-lg border border-[#294C87]/40 focus:ring-2 focus:ring-[#FF6B1F] focus:border-transparent outline-none bg-orange-50/20"
              placeholder="Digite a introdução do memorial descritivo..."
            />
          ) : (
            <p className="text-xs sm:text-sm text-[#171A1F]/90 leading-relaxed text-justify indent-4">
              {memorialData.generalIntroduction}
            </p>
          )}
        </section>

        {/* 4. SUMÁRIO EXECUTIVO DE ETAPAS (OPCIONAL) */}
        {includeSummary && memorialData.stages.length > 0 && (
          <section className="print-page-section print-break-avoid space-y-2.5">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase text-[#294C87] tracking-wider border-b border-[#171A1F]/15 pb-1.5">
              2. Relação Executiva de Etapas Previstas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {memorialData.stages.map((st, idx) => (
                <div
                  key={st.stageId}
                  className="p-2.5 rounded-lg bg-[#F8F9FA] border border-[#171A1F]/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#294C87] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {st.stageCode || idx + 1}
                    </span>
                    <span className="font-bold text-[#171A1F]">{st.stageName}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#FF6B1F] whitespace-nowrap">
                    {st.services.length} {st.services.length === 1 ? 'serviço' : 'serviços'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. DISCRIMINAÇÃO DETALHADA POR ETAPA E ESPECIFICAÇÃO DE CADA SERVIÇO */}
        <section className="space-y-6 print:space-y-4">
          <div className="border-b-2 border-[#294C87] pb-1">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase text-[#294C87] tracking-wider">
              {includeSummary
                ? '3. Especificações Técnicas Detalhadas dos Serviços'
                : '2. Especificações Técnicas Detalhadas dos Serviços'}
            </h3>
          </div>

          {memorialData.stages.map((stage) => {
            return (
              <article
                key={stage.stageId}
                className="print-page-section print-break-avoid border border-[#171A1F]/20 rounded-xl overflow-hidden shadow-xs print:shadow-none"
                style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
              >
                {/* Cabeçalho da Etapa */}
                <div className="bg-[#294C87] text-white p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-[#FF6B1F] text-white font-mono font-extrabold text-xs">
                      ETAPA {stage.stageCode}
                    </span>
                    <h4 className="font-extrabold text-sm sm:text-base tracking-wide">
                      {stage.stageName}
                    </h4>
                  </div>
                  <span className="text-[11px] text-white/80 font-medium">
                    {stage.services.length}{' '}
                    {stage.services.length === 1
                      ? 'serviço discriminado'
                      : 'serviços discriminados'}
                  </span>
                </div>

                {/* Observações da Etapa e Foto (se houver) */}
                {(stage.notes || (includePhotos && stage.photoUrl)) && (
                  <div className="p-3 bg-[#F8F9FA] border-b border-[#171A1F]/10 space-y-2">
                    {stage.notes && (
                      <div className="text-xs text-[#171A1F]/85 italic">
                        <span className="font-bold text-[#294C87] not-italic">
                          Critérios e Diretrizes da Etapa:
                        </span>{' '}
                        {stage.notes}
                      </div>
                    )}

                    {includePhotos && stage.photoUrl && (
                      <div className="pt-2 flex items-center gap-3">
                        <img
                          src={stage.photoUrl}
                          alt={`Registro fotográfico da etapa ${stage.stageName}`}
                          className="w-32 h-24 object-cover rounded-lg border border-[#171A1F]/20 shadow-xs"
                        />
                        <div className="text-[10px] text-[#171A1F]/60">
                          <span className="font-bold text-[#171A1F] block">
                            Registro de Campo da Etapa
                          </span>
                          Foto técnica anexada para referência executiva dos serviços listados
                          abaixo.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Lista de Serviços da Etapa */}
                <div className="divide-y divide-[#171A1F]/10 p-3 sm:p-4 space-y-4">
                  {stage.services.map((service, sIndex) => {
                    const formattedQty = Number(service.quantity || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 3,
                    })

                    return (
                      <div
                        key={service.serviceId}
                        className={sIndex > 0 ? 'pt-4 space-y-2' : 'space-y-2'}
                      >
                        {/* Identificação do Serviço */}
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-[#171A1F]/5 pb-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#FF6B1F] shrink-0">
                              {service.serviceCode || `${stage.stageCode}.${sIndex + 1}`}
                            </span>
                            <h5 className="font-bold text-xs sm:text-sm text-[#171A1F]">
                              {service.serviceDescription}
                            </h5>
                          </div>

                          <div className="text-right text-[11px] text-[#171A1F]/70 font-mono whitespace-nowrap">
                            <span className="font-bold text-[#294C87]">Qtd Prevista:</span>{' '}
                            {formattedQty} {service.unit}
                          </div>
                        </div>

                        {/* Redação da Especificação Técnica */}
                        {isEditMode ? (
                          <div className="space-y-1">
                            <label className="text-[10.5px] uppercase font-bold text-[#294C87] flex items-center justify-between">
                              <span>Texto da Especificação Técnica (Editável):</span>
                              {service.isCustomized && (
                                <span className="text-[#FF6B1F] lowercase font-semibold">
                                  (personalizado)
                                </span>
                              )}
                            </label>
                            <textarea
                              value={service.technicalSpecification}
                              onChange={(e) =>
                                handleUpdateServiceSpec(
                                  stage.stageId,
                                  service.serviceId,
                                  e.target.value,
                                )
                              }
                              rows={3}
                              className="w-full text-xs text-[#171A1F] leading-relaxed p-2.5 rounded-lg border border-[#294C87]/40 focus:ring-2 focus:ring-[#FF6B1F] focus:border-transparent outline-none bg-orange-50/20"
                              placeholder="Redija a especificação técnica do serviço..."
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-[#171A1F]/90 leading-relaxed text-justify pl-3 border-l-2 border-[#FF6B1F]/60">
                            {service.technicalSpecification}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </section>

        {/* 6. RESPONSABILIDADE TÉCNICA E NORMAS APLICÁVEIS */}
        <section
          className="print-page-section print-signatures-block border-t-2 border-[#171A1F]/20 pt-6 space-y-4"
          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
        >
          <div className="bg-[#F8F9FA] p-3.5 rounded-xl border border-[#171A1F]/15 text-xs text-[#171A1F]/85 space-y-1.5">
            <span className="font-bold text-[#294C87] uppercase tracking-wide block">
              Garantia e Responsabilidade Técnica:
            </span>
            <p className="leading-relaxed">
              Os serviços especificados neste Memorial serão executados sob estrita conformidade com
              as Normas Técnicas da ABNT aplicáveis, NRs vigentes e com acompanhamento técnico pelo
              Responsável Técnico da CONCE. Emissão de ART perante o CREA/RS registrada com garantia
              quinquenal nos termos do Art. 618 do Código Civil Brasileiro.
            </p>
          </div>

          {/* Assinaturas Formais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 text-center text-xs">
            <div className="space-y-1">
              <div className="w-56 h-px bg-[#171A1F] mx-auto" />
              <p className="font-bold text-[#171A1F]">{CONCE_COMPANY.responsavelTecnico}</p>
              <p className="text-[10px] text-[#171A1F]/70">{CONCE_COMPANY.registroCrea}</p>
              <p className="text-[10px] text-[#294C87] font-semibold">
                {CONCE_COMPANY.razaoSocial}
              </p>
            </div>

            <div className="space-y-1">
              <div className="w-56 h-px bg-[#171A1F] mx-auto" />
              <p className="font-bold text-[#171A1F]">
                {memorialData.client.name || 'Contratante / Proprietário'}
              </p>
              <p className="text-[10px] text-[#171A1F]/70">
                Aceite e Ciência do Memorial Descritivo
              </p>
              <p className="text-[10px] text-[#171A1F]/50">Data: ____/____/________</p>
            </div>
          </div>
        </section>

        {/* 7. RODAPÉ INSTITUCIONAL CONCE */}
        <footer className="border-t border-[#171A1F]/15 pt-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-[#171A1F]/60">
          <div>
            <span className="font-bold text-[#171A1F]">{CONCE_COMPANY.nomeFantasia}</span> • CNPJ{' '}
            {CONCE_COMPANY.cnpjFormatado} • {CONCE_COMPANY.slogan}
          </div>
          <div>
            Memorial Descritivo {memorialData.budgetCode} • Emissão em {currentDateFormatted}
          </div>
        </footer>
      </div>
    </div>
  )
}
