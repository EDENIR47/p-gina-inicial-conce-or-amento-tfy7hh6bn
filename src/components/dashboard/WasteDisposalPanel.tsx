/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Painel de Controle de Descarte de Resíduos da Construção Civil (RCD)
 *
 * Visão consolidada para o Dashboard Gerencial:
 * - Apenas orçamentos reais do banco / localStorage;
 * - Total de orçamentos com Fichas de Descarte anexadas;
 * - Contagem de certificados emitidos/conferidos vs. pendentes (destaque em Pumpkin Orange);
 * - Tipos de resíduo classificados (Classes A, B, C, D);
 * - Rastreabilidade com nº de MTR/CDF, empresa destinadora e data do último descarte;
 * - Ações diretas: abrir modal de ficha para preenchimento de certificados ou ver orçamento.
 */

import React, { useState } from 'react'
import {
  Truck,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Scale,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
} from 'lucide-react'
import { FullBudget } from '@/types/budgetEngine'
import { DisposalCertificateModal } from '@/components/budget/DisposalCertificateModal'

interface WasteDisposalPanelProps {
  budgets: FullBudget[]
  onOpenBudget?: (budget: FullBudget) => void
  onBudgetUpdated?: (updated: FullBudget) => void
}

export const WasteDisposalPanel: React.FC<WasteDisposalPanelProps> = ({
  budgets,
  onOpenBudget,
  onBudgetUpdated,
}) => {
  const [selectedBudgetForModal, setSelectedBudgetForModal] = useState<FullBudget | null>(null)

  // Filtra orçamentos reais que possuem fichas de descarte anexadas
  const budgetsWithDisposal = budgets.filter(
    (b) => b.disposalDocument && (b.disposalDocument.sheets?.length || 0) > 0,
  )

  // Orçamentos sem fichas de descarte anexadas
  const budgetsWithoutDisposal = budgets.filter(
    (b) => !b.disposalDocument || (b.disposalDocument.sheets?.length || 0) === 0,
  )

  // Métricas agregadas de controle
  let totalSheetsAll = 0
  let totalCertificatesFilled = 0
  let totalCertificatesPending = 0
  let totalWeightKgAll = 0

  for (const b of budgetsWithDisposal) {
    const doc = b.disposalDocument!
    totalWeightKgAll += doc.totalEstimatedWeightKg || 0
    for (const sh of doc.sheets || []) {
      totalSheetsAll++
      const isFilled =
        sh.certificate?.status === 'emitido' ||
        sh.certificate?.status === 'conferido' ||
        Boolean(sh.certificate?.certificateOrManifestNumber?.trim()) ||
        Boolean(sh.certificate?.destinationCompany?.trim())

      if (isFilled) {
        totalCertificatesFilled++
      } else {
        totalCertificatesPending++
      }
    }
  }

  return (
    <article
      aria-label="Controle de Descarte de Resíduos de Obra"
      className="bg-white rounded-[20px] p-6 sm:p-7 shadow-[0_4px_24px_rgba(23,26,31,0.08)] border border-[#171A1F]/10 space-y-6"
    >
      {/* Cabeçalho do Bloco */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#171A1F]/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#294C87]/10 text-[#294C87] text-[10px] font-extrabold uppercase tracking-wider">
              Gestão Ambiental CONAMA 307
            </span>
            <span className="text-xs text-[#171A1F]/50 hidden sm:inline">
              • Rastreabilidade & Certificados de Destino Final
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-[#171A1F] tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#FF6B1F]" />
            <span>Controle de Descarte de Resíduos</span>
          </h2>
        </div>

        {/* Resumo Rápido dos Certificados */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#294C87]/5 border border-[#294C87]/15 text-xs font-semibold">
            <span className="text-[#171A1F]/70">Fichas Anexadas:</span>
            <span className="font-extrabold font-mono text-[#294C87]">
              {budgetsWithDisposal.length} propostas
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              totalCertificatesPending > 0
                ? 'bg-[#FF6B1F]/10 text-[#FF6B1F] border-[#FF6B1F]/30'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
            }`}
          >
            {totalCertificatesPending > 0 ? (
              <AlertTriangle className="w-4 h-4 text-[#FF6B1F]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>
              {totalCertificatesPending > 0
                ? `${totalCertificatesPending} ${totalCertificatesPending === 1 ? 'certificado pendente' : 'certificados pendentes'}`
                : 'Todos os certificados conferidos'}
            </span>
          </div>
        </div>
      </div>

      {/* Mini-Cards de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10">
          <span className="text-[10px] uppercase font-bold text-[#171A1F]/60 block">
            Fichas Geradas
          </span>
          <span className="text-xl font-extrabold text-[#171A1F] font-mono mt-0.5 block">
            {totalSheetsAll}
          </span>
          <span className="text-[10px] text-[#171A1F]/50">tipos de material</span>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">
            Certificados Emitidos
          </span>
          <span className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5 block">
            {totalCertificatesFilled}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium">MTR / CDF registrados</span>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
          <span className="text-[10px] uppercase font-bold text-amber-800 block">
            Certificados Pendentes
          </span>
          <span className="text-xl font-extrabold text-[#FF6B1F] font-mono mt-0.5 block">
            {totalCertificatesPending}
          </span>
          <span className="text-[10px] text-amber-700 font-medium">aguardando transporte</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#294C87]/10 border border-[#294C87]/20">
          <span className="text-[10px] uppercase font-bold text-[#294C87] block">
            Massa Total Estimada
          </span>
          <span className="text-xl font-extrabold text-[#294C87] font-mono mt-0.5 block">
            ~{totalWeightKgAll.toLocaleString('pt-BR')} kg
          </span>
          <span className="text-[10px] text-[#294C87]/70 font-medium">
            ~{(totalWeightKgAll / 1000).toFixed(1)} toneladas
          </span>
        </div>
      </div>

      {/* Relação dos Orçamentos e Fichas */}
      {budgetsWithDisposal.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-[#F8F9FA] border border-dashed border-[#171A1F]/20 space-y-2">
          <Truck className="w-8 h-8 text-[#171A1F]/30 mx-auto" />
          <h4 className="text-sm font-bold text-[#171A1F]">
            Nenhuma proposta com Ficha de Descarte anexada ainda
          </h4>
          <p className="text-xs text-[#171A1F]/60 max-w-md mx-auto">
            Abra qualquer orçamento ativo em <strong>/orcamentos</strong> e clique em{' '}
            <strong className="text-[#294C87]">"Ficha de Descarte"</strong> para gerar as fichas
            técnicas de cada tipo de resíduo e anexar o Certificado de Destino Final.
          </p>
          {budgetsWithoutDisposal.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-[#171A1F]/60">Propostas prontas para anexar:</span>
              {budgetsWithoutDisposal.slice(0, 3).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBudgetForModal(b)}
                  className="px-2.5 py-1 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {b.code} ({b.work?.name || 'Obra'}) → Gerar Fichas
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-extrabold text-[#171A1F]/70 tracking-wider">
            Orçamentos com Fichas Anexadas:
          </h3>

          <div className="space-y-3">
            {budgetsWithDisposal.map((b) => {
              const doc = b.disposalDocument!
              const sheets = doc.sheets || []

              let filledCount = 0
              let pendingCount = 0
              let lastDisposalDate: string | null = null

              for (const s of sheets) {
                const c = s.certificate
                const isFilled =
                  c?.status === 'emitido' ||
                  c?.status === 'conferido' ||
                  Boolean(c?.certificateOrManifestNumber?.trim()) ||
                  Boolean(c?.destinationCompany?.trim())

                if (isFilled) filledCount++
                else pendingCount++

                if (c?.disposalDate && (!lastDisposalDate || c.disposalDate > lastDisposalDate)) {
                  lastDisposalDate = c.disposalDate
                }
              }

              return (
                <div
                  key={b.id}
                  className="p-4 sm:p-5 rounded-2xl border border-[#171A1F]/15 hover:border-[#294C87]/40 transition-all bg-white hover:shadow-md space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#294C87] text-white">
                        {b.code}
                      </span>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#171A1F]">
                          {b.title || b.work?.name}
                        </h4>
                        <span className="text-[11px] text-[#171A1F]/60">
                          Cliente: <strong>{b.client?.name || 'Não informado'}</strong> •{' '}
                          {b.work?.address || `${b.work?.city}/${b.work?.state}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 text-[10px] font-extrabold border border-emerald-400">
                        Anexada (v{doc.version})
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedBudgetForModal(b)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#294C87] to-[#1f3a68] hover:from-[#1f3a68] hover:to-[#171A1F] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        title="Abrir fichas de descarte para visualizar ou editar certificados"
                      >
                        <FileCheck2 className="w-3.5 h-3.5 text-[#FF8945]" />
                        <span>Gerenciar Fichas</span>
                      </button>
                    </div>
                  </div>

                  {/* Badges de Grupos de Resíduo & Indicador de Certificados */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#171A1F]/10 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-[#171A1F]/50 mr-1">
                        Resíduos:
                      </span>
                      {sheets.map((sh) => (
                        <span
                          key={sh.id}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#171A1F]/5 text-[#171A1F]/80 border border-[#171A1F]/10 flex items-center gap-1"
                        >
                          <span className="font-extrabold text-[#FF6B1F]">{sh.conamaClass}</span>
                          <span>{sh.wasteType.split('—')[1]?.trim() || sh.wasteType}</span>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#171A1F]/70">
                      <div>
                        Certificados:{' '}
                        <strong className="text-emerald-700 font-bold">
                          {filledCount} emitidos
                        </strong>{' '}
                        /{' '}
                        {pendingCount > 0 ? (
                          <strong className="text-[#FF6B1F] font-bold">
                            {pendingCount} pendentes
                          </strong>
                        ) : (
                          <strong className="text-emerald-700 font-bold">0 pendentes</strong>
                        )}
                      </div>

                      {lastDisposalDate ? (
                        <div className="flex items-center gap-1 font-mono text-[#171A1F]/60">
                          <Calendar className="w-3 h-3 text-[#294C87]" />
                          <span>
                            Último descarte: {lastDisposalDate.split('-').reverse().join('/')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-700 italic">Descarte ainda não registrado</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal Interativo para ver ou editar fichas ao clicar */}
      {selectedBudgetForModal && (
        <DisposalCertificateModal
          budget={selectedBudgetForModal}
          isOpen={!!selectedBudgetForModal}
          onClose={() => setSelectedBudgetForModal(null)}
          onAttachDisposalToBudget={(updatedBudget) => {
            setSelectedBudgetForModal(null)
            if (onBudgetUpdated) {
              onBudgetUpdated(updatedBudget)
            }
          }}
        />
      )}
    </article>
  )
}
