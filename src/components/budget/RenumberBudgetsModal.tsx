/**
 * CONCE — Modal de Renumeração dos Orçamentos Existentes
 *
 * Funcionalidades:
 * - Ação explícita do usuário (nenhuma escrita automática na carga da página).
 * - Exibe tabela comparativa ANTES → DEPOIS com status de cada orçamento.
 * - Mostra ano de referência dinâmico (new Date().getFullYear()) e sequência a partir de 100.
 * - Barra de progresso durante a execução (localStorage + PocketBase via syncEngine).
 * - Preserva 100% da integridade técnica (etapas, serviços, insumos, fotos, BDI, DAS 11%).
 * - Atualiza identificador no anexo de proposta comercial oficial (presentationDocument)
 *   e ocorrências textuais exatas em memoriais descritivos salvos.
 */

import React, { useMemo, useState } from 'react'
import {
  Hash,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileSpreadsheet,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { FullBudget } from '@/types/budgetEngine'
import {
  buildBudgetRenumberPlan,
  BudgetRenumberPlan,
  applyCodeToBudget,
} from '@/lib/budgetRenumberEngine'
import { saveFullBudgets } from '@/lib/budgetsStorage'
import { syncEngine } from '@/services/syncEngine'
import { logAuditEvent, getStoredRevisions } from '@/lib/intelligenceStorage'
import { isPbAuthenticated } from '@/services/authService'
import pb from '@/lib/pocketbase/client'

export interface RenumberBudgetsModalProps {
  isOpen: boolean
  onClose: () => void
  budgets: FullBudget[]
  onSuccess: (updatedBudgets: FullBudget[]) => void
}

export const RenumberBudgetsModal: React.FC<RenumberBudgetsModalProps> = ({
  isOpen,
  onClose,
  budgets,
  onSuccess,
}) => {
  const [status, setStatus] = useState<'preview' | 'running' | 'success' | 'error'>('preview')
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [currentStepText, setCurrentStepText] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [renumberedCount, setRenumberedCount] = useState<number>(0)

  const currentYear = useMemo(() => new Date().getFullYear(), [])

  // Gera o plano comparativo Antes -> Depois
  const plan: BudgetRenumberPlan = useMemo(() => {
    return buildBudgetRenumberPlan(budgets, currentYear)
  }, [budgets, currentYear])

  if (!isOpen) return null

  const handleExecuteRenumber = async () => {
    setStatus('running')
    setProgressPercent(5)
    setCurrentStepText('Iniciando plano de renumeração canônica CONCE...')
    setErrorMessage('')

    try {
      const planMap = new Map<string, string>()
      const oldCodeMap: Record<string, string> = {}
      for (const it of plan.items) {
        planMap.set(it.id, it.newCode)
        if (it.oldCode && it.oldCode !== '—') {
          oldCodeMap[it.oldCode] = it.newCode
        }
      }

      // 1. Atualiza lista de orçamentos locais em memória
      const totalItems = plan.items.length
      const updatedList: FullBudget[] = []

      for (let i = 0; i < budgets.length; i++) {
        const b = budgets[i]
        const targetCode = planMap.get(b.id)
        if (!targetCode) {
          updatedList.push(b)
          continue
        }

        const oldCode = b.code || ''
        const updated = applyCodeToBudget(b, targetCode, oldCode)
        updatedList.push(updated)

        // Registra evento de auditoria rastreável
        if (oldCode !== targetCode) {
          logAuditEvent({
            budgetId: b.id,
            action: 'renumeracao_orcamento',
            title: `Renumeração Canônica: ${oldCode} → ${targetCode}`,
            details: `Identificação atualizada para o padrão oficial CONCE (${currentYear}, sequência a partir de 100). Obra: ${b.work?.name || b.title}. Cliente: ${b.client?.name || 'Não informado'}.`,
            oldValue: oldCode,
            newValue: targetCode,
            userName: b.author || 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
          })
        }

        const pct = Math.min(60, Math.round(5 + ((i + 1) / (budgets.length || 1)) * 55))
        setProgressPercent(pct)
        setCurrentStepText(`Atualizando ${oldCode} → ${targetCode}...`)
      }

      // 2. Persiste em localStorage
      setProgressPercent(65)
      setCurrentStepText('Gravando orçamentos atualizados no armazenamento local...')
      saveFullBudgets(updatedList)

      // 3. Atualiza revisões salvas em localStorage para refletir os novos códigos em snapshots
      try {
        const rawRevs = localStorage.getItem('conce_budget_revisions')
        if (rawRevs) {
          const parsedRevs = JSON.parse(rawRevs)
          if (Array.isArray(parsedRevs)) {
            let revsChanged = false
            const fixedRevs = parsedRevs.map((rev) => {
              if (rev.budgetId && planMap.has(rev.budgetId)) {
                const newC = planMap.get(rev.budgetId)!
                if (rev.snapshot && rev.snapshot.code !== newC) {
                  revsChanged = true
                  return {
                    ...rev,
                    snapshot: {
                      ...rev.snapshot,
                      code: newC,
                      presentationDocument: rev.snapshot.presentationDocument
                        ? { ...rev.snapshot.presentationDocument, budgetCode: newC }
                        : undefined,
                    },
                  }
                }
              }
              return rev
            })
            if (revsChanged) {
              localStorage.setItem('conce_budget_revisions', JSON.stringify(fixedRevs))
            }
          }
        }
      } catch {
        /* ignora falha em revisões */
      }

      // 4. Sincronização direta com Cloud PocketBase (se autenticado)
      if (isPbAuthenticated()) {
        setProgressPercent(70)
        setCurrentStepText('Sincronizando registros no PocketBase Cloud...')

        const currentUserId = pb.authStore.record?.id
        let syncedCloudCount = 0

        for (let i = 0; i < plan.items.length; i++) {
          const it = plan.items[i]
          const targetBudget = updatedList.find((b) => b.id === it.id)
          if (!targetBudget) continue

          try {
            // Enfileira pelo syncEngine garantindo o fluxo canônico
            syncEngine.enqueueBudgetSave(targetBudget)

            // Também tenta update direto por ID ou local_id se existir
            if (currentUserId) {
              try {
                const existing = await pb
                  .collection('orcamentos')
                  .getFirstListItem(
                    `user = "${currentUserId}" && (local_id = "${targetBudget.id}" || code = "${it.oldCode}" || code = "${it.newCode}")`,
                  )
                if (existing) {
                  await pb.collection('orcamentos').update(existing.id, {
                    code: targetBudget.code,
                    title: targetBudget.title || targetBudget.work?.name,
                    payload: targetBudget,
                  })
                  syncedCloudCount++
                }
              } catch {
                // Registro será sincronizado pela fila do syncEngine
              }
            }
          } catch {
            /* segue com a fila */
          }

          const pct = Math.min(95, 70 + Math.round(((i + 1) / (plan.items.length || 1)) * 25))
          setProgressPercent(pct)
          setCurrentStepText(`Sincronizando ${it.newCode} com o servidor na nuvem...`)
        }
      }

      setProgressPercent(100)
      setCurrentStepText('Renumeração concluída com sucesso em todos os módulos!')
      setRenumberedCount(plan.changedCount)
      setStatus('success')
      onSuccess(updatedList)
    } catch (err: any) {
      console.error('Erro na renumeração de orçamentos:', err)
      setStatus('error')
      setErrorMessage(err?.message || 'Falha inesperada durante o processo de renumeração.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-[#171A1F]/20 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-[#171A1F] text-white flex items-center justify-between border-b border-[#294C87]/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#294C87] to-[#FF6B1F] flex items-center justify-center text-white shadow-md">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>Atualizar Identificação dos Orçamentos</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FF6B1F] text-white text-[10px] font-black uppercase tracking-wider">
                  Ano {currentYear}
                </span>
              </h3>
              <p className="text-[11px] text-white/70">
                Padrão oficial CONCE: <strong>ORC-{currentYear}-100</strong> em ordem cronológica de
                criação
              </p>
            </div>
          </div>
          {status !== 'running' && (
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              type="button"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-[#171A1F] flex-1">
          {status === 'preview' && (
            <>
              {/* Card de Informações da Regra */}
              <div className="bg-[#294C87]/5 border border-[#294C87]/20 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-[#294C87]">
                  <ShieldCheck className="w-4 h-4 text-[#3E8E5A]" />
                  <span>Integridade Total e Segurança dos Dados</span>
                </div>
                <p className="text-[#171A1F]/80 leading-relaxed">
                  Esta operação renomeia <strong>exclusivamente</strong> a numeração dos orçamentos
                  para a regra vigente da CONCE (iniciando em <strong>100</strong> para o ano{' '}
                  <strong>{currentYear}</strong> do mais antigo para o mais novo).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="bg-white/80 p-2 rounded-lg border border-[#294C87]/15">
                    <span className="text-[#171A1F]/60 block font-medium">Total de Propostas:</span>
                    <strong className="text-sm text-[#171A1F]">{plan.totalCount}</strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-[#FF6B1F]/30">
                    <span className="text-[#FF6B1F] block font-medium">A Serem Renumerados:</span>
                    <strong className="text-sm text-[#FF6B1F]">{plan.changedCount}</strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-[#3E8E5A]/30">
                    <span className="text-[#3E8E5A] block font-medium">Já no Padrão Canônico:</span>
                    <strong className="text-sm text-[#3E8E5A]">{plan.alreadyCanonicalCount}</strong>
                  </div>
                </div>
              </div>

              {/* Tabela Comparativa ANTES -> DEPOIS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#171A1F]">
                  <span className="uppercase tracking-wider text-[11px] text-[#171A1F]/70">
                    Plano de Conversão Cronológico:
                  </span>
                  <span className="text-[11px] text-[#294C87]">
                    Sequência inicial: ORC-{currentYear}-100
                  </span>
                </div>

                <div className="border border-[#171A1F]/15 rounded-xl overflow-hidden shadow-sm bg-white">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F4F6F9] text-[11px] uppercase text-[#171A1F]/70 font-bold sticky top-0 border-b border-[#171A1F]/10 z-10">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Código Anterior</th>
                          <th className="py-2.5 px-2 text-center"></th>
                          <th className="py-2.5 px-3">Novo Código</th>
                          <th className="py-2.5 px-3">Obra / Cliente</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#171A1F]/5 font-sans">
                        {plan.items.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-xs text-[#171A1F]/50">
                              Nenhum orçamento cadastrado para renumeração.
                            </td>
                          </tr>
                        ) : (
                          plan.items.map((item, idx) => (
                            <tr
                              key={item.id}
                              className={`hover:bg-[#294C87]/[0.03] transition-colors ${
                                item.alreadyCanonical ? 'bg-[#3E8E5A]/[0.02]' : ''
                              }`}
                            >
                              <td className="py-2 px-3 text-[11px] text-[#171A1F]/50 font-mono">
                                {String(idx + 1).padStart(2, '0')}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-[#171A1F]/70">
                                {item.oldCode}
                              </td>
                              <td className="py-2 px-2 text-center text-[#294C87]">
                                <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                              </td>
                              <td className="py-2 px-3 font-mono font-extrabold text-[#294C87]">
                                <span className="px-2 py-0.5 rounded bg-[#294C87]/10 text-[#294C87]">
                                  {item.newCode}
                                </span>
                              </td>
                              <td className="py-2 px-3 max-w-[220px]">
                                <div className="font-bold text-[#171A1F] truncate text-[11px]">
                                  {item.workName || item.title}
                                </div>
                                <div className="text-[10px] text-[#171A1F]/60 truncate">
                                  {item.clientName}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {item.alreadyCanonical ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3E8E5A]/15 text-[#3E8E5A]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Mantém
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F]">
                                    <RefreshCw className="w-3 h-3" />
                                    Atualizar
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Informações de Documentos Atualizados */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-xs text-amber-950">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Sparkles className="w-4 h-4 text-[#FF6B1F]" />
                  <span>Documentos e relatórios atualizados automaticamente:</span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-amber-900/90 pl-1 list-disc list-inside">
                  <li>Lista de orçamentos (cards e tabela gerenciar)</li>
                  <li>Proposta Técnica e Comercial A4 (7 seções)</li>
                  <li>Memorial Descritivo e especificações técnicas</li>
                  <li>Exportação PDF Comercial (todos os 4 formatos)</li>
                  <li>Planilhas Excel/CSV completas e Curva ABC</li>
                  <li>Cabeçalho, editor e sincronização com a nuvem</li>
                </ul>
              </div>
            </>
          )}

          {status === 'running' && (
            <div className="py-10 text-center space-y-6 animate-fade-in">
              <Loader2 className="w-12 h-12 text-[#FF6B1F] animate-spin mx-auto" />
              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-base font-bold text-[#171A1F]">
                  Atualizando Identificações e Sincronizando...
                </h4>
                <p className="text-xs text-[#294C87] font-medium font-mono bg-[#294C87]/5 p-2 rounded-lg border border-[#294C87]/15">
                  {currentStepText}
                </p>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full max-w-md mx-auto space-y-1.5">
                <div className="w-full bg-[#171A1F]/10 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-[#294C87] via-[#FF6B1F] to-[#3E8E5A] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-[#171A1F]/60">
                  <span>Progresso</span>
                  <span>{progressPercent}%</span>
                </div>
              </div>

              <p className="text-[11px] text-[#171A1F]/50">
                Garantindo integridade dos dados, etapas, serviços, BDI e fotos na nuvem...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-6 text-center space-y-5 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#3E8E5A] flex items-center justify-center mx-auto shadow-sm border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-[#3E8E5A]" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-lg font-extrabold text-[#171A1F]">
                  Orçamentos Atualizados com Sucesso!
                </h4>
                <p className="text-xs text-[#171A1F]/70">
                  Todos os orçamentos agora seguem o padrão oficial{' '}
                  <strong className="text-[#294C87]">ORC-{currentYear}-100</strong> em ordem
                  cronológica.
                </p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 text-left max-w-md mx-auto space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <ShieldCheck className="w-4 h-4 text-[#3E8E5A]" />
                  <span>Resumo da Operação:</span>
                </div>
                <div>• {plan.totalCount} orçamento(s) processado(s)</div>
                <div>• {renumberedCount} orçamento(s) renumerado(s)</div>
                <div>• Próximo orçamento novo seguirá a sequência a partir do maior código</div>
                <div>• Trilha de auditoria registrada com rastreabilidade completa</div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-red-100 text-[#C4453C] flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[#171A1F]">Erro na Atualização</h4>
                <p className="text-xs text-[#C4453C] font-medium">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex items-center justify-between gap-3 shrink-0">
          {status === 'preview' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteRenumber}
                disabled={plan.totalCount === 0 || plan.changedCount === 0}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer ${
                  plan.totalCount === 0 || plan.changedCount === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#294C87] hover:bg-[#1f3b6c] text-white hover:-translate-y-0.5 active:scale-95'
                }`}
              >
                <Hash className="w-4 h-4 text-[#FF6B1F]" />
                <span>Confirmar e Atualizar ({plan.changedCount})</span>
              </button>
            </>
          )}

          {status === 'running' && (
            <div className="text-xs text-[#171A1F]/60 text-center w-full">
              Processando migração de identificação... não feche esta janela.
            </div>
          )}

          {status === 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-[#294C87] hover:bg-[#1f3b6c] text-white text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer"
            >
              Concluir e Voltar
            </button>
          )}

          {status === 'error' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5 cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleExecuteRenumber}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#294C87] hover:bg-[#1f3b6c] text-white text-xs font-bold transition-all cursor-pointer"
              >
                Tentar Novamente
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RenumberBudgetsModal
