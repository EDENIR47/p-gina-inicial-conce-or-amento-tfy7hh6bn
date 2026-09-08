/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Exibição da Trilha Completa de Auditoria do Orçamento
 * com data/hora, autor, tipo de evento, valores anteriores/novos e detalhes
 */

import React, { useState } from 'react'
import {
  ShieldAlert,
  Search,
  Filter,
  X,
  Clock,
  User,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Percent,
  Download,
  Trash2,
} from 'lucide-react'
import { FullBudget } from '@/types/budgetEngine'
import { AuditLogEntry } from '@/types/intelligence'
import { getStoredAuditLogs } from '@/lib/intelligenceStorage'

interface AuditTrailModalProps {
  budget: FullBudget
  isOpen: boolean
  onClose: () => void
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ budget, isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => getStoredAuditLogs(budget.id))
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('todos')

  if (!isOpen) return null

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = filterAction === 'todos' || log.action === filterAction

    return matchesSearch && matchesAction
  })

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'revisao_gerada':
      case 'revisao_restaurada':
        return { label: 'Revisão', bg: 'bg-[#FF6B1F] text-white' }
      case 'edicao_prazo':
        return { label: 'Prazo', bg: 'bg-[#FF6B1F] text-white' }
      case 'edicao_preco_servico':
        return { label: 'Preço Serviço', bg: 'bg-[#294C87] text-white' }
      case 'edicao_servico':
        return { label: 'Serviço', bg: 'bg-blue-600 text-white' }
      case 'edicao_custo':
      case 'edicao_insumo':
        return { label: 'Insumo/Custo', bg: 'bg-[#294C87] text-white' }
      case 'edicao_bdi':
      case 'edicao_encargos':
        return { label: 'BDI & Leis', bg: 'bg-purple-600 text-white' }
      case 'exportacao_pdf':
      case 'exportacao_excel':
        return { label: 'Exportação', bg: 'bg-[#3E8E5A] text-white' }
      case 'cotacao_homologada':
        return { label: 'Cotação', bg: 'bg-amber-600 text-white' }
      case 'exclusao_item':
        return { label: 'Exclusão', bg: 'bg-red-600 text-white' }
      default:
        return { label: 'Sistema', bg: 'bg-gray-700 text-white' }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#171A1F]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#171A1F]/15 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#294C87] text-white flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-[#FF6B1F]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Trilha de Auditoria & Rastreabilidade • {budget.code}
              </h3>
              <p className="text-xs text-white/70">
                Registro cronológico imutável de todas as ações executadas no orçamento
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="p-4 bg-[#F8F9FA] border-b border-[#171A1F]/10 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#171A1F]/40 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por evento, autor ou detalhe técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-semibold focus:outline-none focus:border-[#294C87]"
            >
              <option value="todos">Todos os Eventos</option>
              <option value="edicao_prazo">Alterações de Prazo</option>
              <option value="revisao_gerada">Revisões Geradas</option>
              <option value="revisao_restaurada">Revisões Restauradas</option>
              <option value="edicao_preco_servico">Preço de Serviços</option>
              <option value="edicao_servico">Ajustes de Serviços</option>
              <option value="edicao_custo">Alterações de Custo</option>
              <option value="edicao_bdi">Alterações de BDI</option>
              <option value="edicao_encargos">Alterações de Encargos</option>
              <option value="exportacao_pdf">Exportações em PDF</option>
              <option value="exportacao_excel">Exportações em Planilha</option>
            </select>
          </div>
        </div>

        {/* Lista de Registros */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-[#171A1F]/20 rounded-xl space-y-2">
              <Clock className="w-8 h-8 text-[#171A1F]/30 mx-auto" />
              <p className="text-xs text-[#171A1F]/70">
                Nenhum registro de auditoria correspondente aos filtros.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#171A1F]/15">
              {filteredLogs.map((log) => {
                const badge = getActionBadge(log.action)
                const date = new Date(log.timestamp)

                return (
                  <div key={log.id} className="relative group">
                    {/* Marcador na linha do tempo */}
                    <div className="absolute -left-6 sm:-left-8 top-1.5 w-3 h-3 rounded-full bg-[#FF6B1F] border-2 border-white shadow-xs" />

                    <div className="p-3.5 rounded-xl border border-[#171A1F]/10 bg-white hover:border-[#294C87]/40 transition-all space-y-1.5 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-[#171A1F]">
                            {log.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#171A1F]/60">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#171A1F]/80 leading-relaxed">{log.details}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-[#171A1F]/5 text-[11px] text-[#171A1F]/60">
                        <span className="flex items-center gap-1 font-semibold text-[#171A1F]/70">
                          <User className="w-3.5 h-3.5 text-[#294C87]" />
                          {log.userName} {log.userRole ? `(${log.userRole})` : ''}
                        </span>

                        {(log.oldValue !== undefined || log.newValue !== undefined) && (
                          <div className="flex items-center gap-2 font-mono text-[10px]">
                            {log.oldValue !== undefined && (
                              <span className="text-red-600 line-through">
                                Antigo: {String(log.oldValue)}
                              </span>
                            )}
                            {log.newValue !== undefined && (
                              <span className="text-green-600 font-bold">
                                Novo: {String(log.newValue)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex items-center justify-between text-xs text-[#171A1F]/60">
          <span>Total de {filteredLogs.length} eventos registrados</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#171A1F] text-white font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
