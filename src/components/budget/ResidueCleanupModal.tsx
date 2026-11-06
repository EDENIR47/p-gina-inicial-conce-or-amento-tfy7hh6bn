/**
 * CONCE — Modal de LIMPEZA ASSISTIDA de resquícios na árvore do orçamento
 *
 * Sempre interativo e explícito: lista os serviços suspeitos de resquício (detector
 * puro em src/lib/residueDetector.ts), pré-marcados, com etapa/serviço/quantidade,
 * e SÓ remove o que o usuário confirmar na tela. Mostra o resumo do resultado e
 * permite DESFAZER imediatamente (cópia integral do estado anterior em memória).
 */

import React, { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Eraser, Undo2, X } from 'lucide-react'
import type { FullBudget } from '@/types/budgetEngine'
import {
  scanBudgetForResidues,
  removeResidueSelection,
  type ResidueCleanupSummary,
} from '@/lib/residueDetector'

interface ResidueCleanupModalProps {
  budget: FullBudget
  onClose: () => void
  /** summary = null significa DESFAZER: `cleaned` carrega o snapshot anterior integral. */
  onApply: (cleaned: FullBudget, summary: ResidueCleanupSummary | null) => void
}

export const ResidueCleanupModal: React.FC<ResidueCleanupModalProps> = ({
  budget,
  onClose,
  onApply,
}) => {
  const scan = useMemo(() => scanBudgetForResidues(budget), [budget])

  // Pré-marcados como resquício (o usuário confirma/desmarca na tela)
  const [selectedWholeStages, setSelectedWholeStages] = useState<string[]>(() =>
    scan.groups.filter((g) => g.wholeStage).map((g) => g.stageId),
  )
  const [selectedServices, setSelectedServices] = useState<string[]>(() =>
    scan.groups.flatMap((g) => g.services.map((s) => `${g.stageId}::${s.serviceId}`)),
  )

  const [snapshot, setSnapshot] = useState<FullBudget | null>(null)
  const [result, setResult] = useState<ResidueCleanupSummary | null>(null)

  const wholeSet = new Set(selectedWholeStages)
  const pendingWholeStages = selectedWholeStages.length
  const pendingServices = scan.groups
    .filter((g) => !wholeSet.has(g.stageId))
    .flatMap((g) => g.services.map((s) => `${g.stageId}::${s.serviceId}`))
    .filter((key) => selectedServices.includes(key)).length

  const toggleWholeStage = (stageId: string) => {
    setSelectedWholeStages((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId],
    )
  }

  const toggleService = (key: string) => {
    setSelectedServices((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const nothingSelected = pendingWholeStages === 0 && pendingServices === 0

  const handleApply = () => {
    if (nothingSelected) return
    const snap = JSON.parse(JSON.stringify(budget)) as FullBudget
    const { cleaned, summary } = removeResidueSelection(
      budget,
      selectedWholeStages,
      selectedServices,
    )
    if (summary.removedServices <= 0 && summary.removedStages <= 0) return
    setSnapshot(snap)
    setResult(summary)
    onApply(cleaned, summary)
  }

  const handleUndo = () => {
    if (!snapshot) return
    onApply(snapshot, null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#171A1F]/10 w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#171A1F]/10">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-600/10 shrink-0">
              <Eraser className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#171A1F]">
                Limpeza de Resquícios na Árvore
              </h2>
              <p className="text-[11px] text-[#171A1F]/60 mt-0.5">
                Orçamento <strong>{budget.code}</strong> — serviços suspeitos de terem vindo de
                outra obra (duplicação). Nada é apagado sem a sua confirmação.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#171A1F]/5 text-[#171A1F]/60 hover:text-[#171A1F] transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-900">
                  <p className="font-bold">
                    Limpeza concluída: {result.removedServices} serviço(s) e {result.removedStages}{' '}
                    etapa(s) removidos.
                  </p>
                  <p className="mt-0.5 text-emerald-800/80">
                    Totais recalculados e sincronização com o cloud disparada — o orçamento limpo
                    está sendo enviado à coleção <code>orcamentos</code>.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#171A1F]/10 p-3 space-y-1.5">
                <p className="text-[11px] font-bold text-[#171A1F] uppercase tracking-wide">
                  Removidos por etapa
                </p>
                {result.perStage.map((s, i) => (
                  <p key={`${s.stageCode}-${i}`} className="text-xs text-[#171A1F]/80">
                    <span className="font-mono font-bold text-[#294C87]">{s.stageCode}</span>{' '}
                    {s.stageName} —{' '}
                    {s.wholeStage
                      ? 'etapa inteira removida'
                      : `${s.removedServices} serviço(s) removido(s)`}
                  </p>
                ))}
              </div>

              {snapshot && (
                <button
                  type="button"
                  onClick={handleUndo}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#171A1F]/5 hover:bg-[#171A1F]/10 text-[#171A1F] border border-[#171A1F]/15 text-xs font-bold transition-colors"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>Desfazer limpeza (restaurar árvore anterior)</span>
                </button>
              )}
            </div>
          ) : scan.totalCandidates === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-900">
                Nenhum resquício detectado nesta árvore — o vocabulário dos serviços corresponde ao
                escopo desta obra (demolição/remoção).
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900">
                  Candidatos pré-marcados pelo detector de vocabulário (estrutura metálica,
                  concretagem de laje, impermeabilização, armação, formas, pilares, vigas, FCK,
                  alvenaria de elevação, emboço/pintura de obra nova). Desmarque o que for legítimo
                  desta obra antes de confirmar.
                </p>
              </div>

              {scan.groups.map((g) => (
                <div
                  key={g.stageId}
                  className="rounded-xl border border-[#171A1F]/10 bg-[#171A1F]/[0.03] p-3 space-y-1.5"
                >
                  {g.wholeStage ? (
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-[#294C87]"
                        checked={selectedWholeStages.includes(g.stageId)}
                        onChange={() => toggleWholeStage(g.stageId)}
                      />
                      <span>
                        <span className="text-sm font-bold text-[#171A1F]">
                          Etapa {g.stageCode} — {g.stageName} (etapa inteira)
                        </span>
                        <span className="block text-[11px] text-[#171A1F]/60">
                          Todos os {g.services.length} serviço(s) desta etapa são suspeitos de
                          resquício (com composições e insumos vinculados).
                        </span>
                      </span>
                    </label>
                  ) : (
                    <p className="text-xs font-bold text-[#294C87]">
                      Etapa {g.stageCode} — {g.stageName}
                    </p>
                  )}

                  {(g.services.length === 0 || !selectedWholeStages.includes(g.stageId)) &&
                    g.services.map((s) => {
                      const key = `${g.stageId}::${s.serviceId}`
                      return (
                        <label
                          key={s.serviceId}
                          className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-[#294C87]"
                            checked={selectedServices.includes(key)}
                            onChange={() => toggleService(key)}
                          />
                          <span className="flex-1">
                            <span className="text-xs font-semibold text-[#171A1F]">
                              {s.serviceCode} — {s.description}
                            </span>
                            <span className="block text-[10px] text-[#171A1F]/60">
                              Qtde: {s.quantity.toLocaleString('pt-BR')} {s.unit} · indícios:{' '}
                              {s.reasons.join(', ')}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-[#171A1F]/10">
          <p className="text-[11px] text-[#171A1F]/60">
            {result
              ? 'Você pode desfazer imediatamente, se necessário.'
              : scan.totalCandidates === 0
                ? ''
                : `${pendingWholeStages} etapa(s) inteira(s) e ${pendingServices} serviço(s) marcados`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-[#171A1F]/70 hover:text-[#171A1F] hover:bg-[#171A1F]/5 transition-colors"
            >
              {result ? 'Fechar' : 'Cancelar'}
            </button>
            {!result && scan.totalCandidates > 0 && (
              <button
                type="button"
                onClick={handleApply}
                disabled={nothingSelected}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                <Eraser className="w-4 h-4" />
                <span>Remover selecionados</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
