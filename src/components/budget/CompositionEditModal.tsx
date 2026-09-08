/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Criar ou Editar Composição com Versionamento (v1.0, v1.1, v2.0 com Data e Autor)
 */

import React, { useState } from 'react'
import { X, Check, BookOpen, Plus, Trash2, History, AlertCircle, GitCommit } from 'lucide-react'
import { BudgetComposition, BudgetInput } from '@/types/budgetEngine'
import { SPECIALTIES_LIST } from '@/lib/compositionsData'
import { formatCurrencyBRL } from '@/lib/formatters'
import { calculateCompositionUnitCost } from '@/lib/budgetEngine'
import { UnitSelect } from './UnitSelect'

interface CompositionEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (composition: BudgetComposition) => void
  initialComposition?: BudgetComposition | null
}

export const CompositionEditModal: React.FC<CompositionEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialComposition,
}) => {
  const isEditing = !!initialComposition

  const [code, setCode] = useState(initialComposition?.code || 'CONCE-CPU-')
  const [description, setDescription] = useState(initialComposition?.description || '')
  const [specialty, setSpecialty] = useState(
    initialComposition?.specialty || 'Estruturas & Fundações',
  )
  const [unit, setUnit] = useState(initialComposition?.unit || 'm²')
  const [source, setSource] = useState<'CONCE' | 'SINAPI' | 'SICRO' | 'PROPRIO'>(
    initialComposition?.source || 'CONCE',
  )
  const [version, setVersion] = useState(initialComposition?.version || 'v1.0')
  const [author, setAuthor] = useState(
    initialComposition?.versionsHistory?.[0]?.author ||
      'Eng. Edenir Souza da Rosa - CREA/RS-252397',
  )
  const [changeNote, setChangeNote] = useState('')
  const [inputs, setInputs] = useState<BudgetInput[]>(initialComposition?.inputs || [])
  const [error, setError] = useState('')

  if (!isOpen) return null

  // Adiciona insumo em branco na composição
  const handleAddInput = () => {
    const newInput: BudgetInput = {
      id: `inp-${Date.now()}`,
      code: `INP-${inputs.length + 1}`,
      description: 'Novo insumo da composição',
      unit: 'un',
      category: 'material',
      coefficient: 1,
      unitCost: 10,
    }
    setInputs([...inputs, newInput])
  }

  const handleUpdateInput = (id: string, field: keyof BudgetInput, value: any) => {
    setInputs(inputs.map((inp) => (inp.id === id ? { ...inp, [field]: value } : inp)))
  }

  const handleDeleteInput = (id: string) => {
    const target = inputs.find((inp) => inp.id === id)
    const name = target?.description || 'este insumo'
    if (window.confirm(`Excluir insumo "${name}"? Esta ação removerá o item da CPU.`)) {
      setInputs(inputs.filter((inp) => inp.id !== id))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      setError('A descrição da composição é obrigatória.')
      return
    }

    const currentHistory = initialComposition?.versionsHistory || []
    const newVersionEntry = {
      version: version.trim() || 'v1.0',
      date: new Date().toISOString().split('T')[0],
      author: author.trim() || 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      changelog:
        changeNote.trim() ||
        (isEditing ? 'Atualização de insumos e coeficientes' : 'Criação inicial'),
    }

    const updatedComposition: BudgetComposition = {
      id: initialComposition?.id || `comp-${Date.now()}`,
      code: code.trim() || 'CONCE-001',
      description: description.trim(),
      specialty,
      unit: unit.trim() || 'un',
      source,
      version: version.trim() || 'v1.0',
      versionsHistory: [newVersionEntry, ...currentHistory],
      inputs,
    }

    onSave(updatedComposition)
    onClose()
  }

  const currentUnitCost = calculateCompositionUnitCost({
    id: 'temp',
    code,
    description,
    specialty,
    unit,
    source,
    version,
    inputs,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-[#171A1F]/20 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#FF6B1F]" />
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                {isEditing ? 'Editar Composição Unitária' : 'Nova Composição de Custos'}
              </h3>
              <p className="text-xs text-white/70">Catálogo técnico com versionamento auditável</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dados Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Código da Composição *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CONCE-ALV-001"
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-bold focus:outline-none focus:border-[#294C87]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">Especialidade</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
              >
                {SPECIALTIES_LIST.filter((s) => s !== 'Todas').map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Unidade da CPU *
              </label>
              <UnitSelect
                value={unit}
                onChange={(val) => {
                  setUnit(val)
                  if (error) setError('')
                }}
                showQuickPills
                placeholder="m², m³, un, kg"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">Base / Fonte</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
              >
                <option value="CONCE">CONCE (Própria)</option>
                <option value="SINAPI">SINAPI</option>
                <option value="SICRO">SICRO</option>
                <option value="PROPRIO">Fornecedor / Próprio</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Descrição Completa da Composição *
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setError('')
              }}
              placeholder="Ex: Alvenaria de vedação de blocos cerâmicos furados 9x19x19cm com argamassa traço 1:2:8..."
              className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
            />
          </div>

          {/* Bloco de Versionamento */}
          <div className="p-3.5 rounded-xl bg-[#294C87]/5 border border-[#294C87]/15 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#294C87] flex items-center gap-1.5">
                <GitCommit className="w-4 h-4 text-[#FF6B1F]" />
                Versionamento & Autoria Técnica
              </span>
              <span className="text-[10px] text-[#171A1F]/60">Padrão CONCE: v1.0, v1.1, v2.0</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  Número da Versão
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v1.0"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-bold text-[#FF6B1F] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  Engenheiro Responsável / Autor
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Eng. Edenir Souza da Rosa - CREA/RS-252397"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171A1F] block mb-1">
                  Motivo da Alteração / Nota
                </label>
                <input
                  type="text"
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="Ex: Atualização dos insumos de argamassa"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Histórico Anterior */}
            {initialComposition?.versionsHistory &&
              initialComposition.versionsHistory.length > 0 && (
                <div className="pt-2 border-t border-[#294C87]/15 text-[11px] text-[#171A1F]/70">
                  <span className="font-bold text-[#294C87] block mb-1">
                    Histórico de Versões Anteriores:
                  </span>
                  <div className="space-y-1">
                    {initialComposition.versionsHistory.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#FF6B1F]">{h.version}</span>
                        <span>•</span>
                        <span>{h.date}</span>
                        <span>•</span>
                        <span className="text-[#171A1F]">{h.author}</span>
                        <span>—</span>
                        <span className="italic text-[#171A1F]/60">{h.changelog}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Insumos da Composição */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#171A1F] flex items-center gap-1.5">
                Insumos da Composição ({inputs.length})
              </span>
              <button
                type="button"
                onClick={handleAddInput}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#294C87] text-white text-xs font-semibold hover:bg-[#171A1F] transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF6B1F]" />
                <span>Adicionar Insumo</span>
              </button>
            </div>

            <div className="border border-[#171A1F]/15 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#171A1F]/5 text-[#171A1F] font-bold text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-2.5">Código</th>
                    <th className="py-2 px-2.5">Descrição</th>
                    <th className="py-2 px-2.5">Categoria</th>
                    <th className="py-2 px-2.5">Unid.</th>
                    <th className="py-2 px-2.5 text-right">Coeficiente</th>
                    <th className="py-2 px-2.5 text-right">Custo Unit. (R$)</th>
                    <th className="py-2 px-2.5 text-right">Subtotal</th>
                    <th className="py-2 px-2 text-center w-12">Excluir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171A1F]/5">
                  {inputs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-[#171A1F]/50">
                        Nenhum insumo incluído. Clique em "Adicionar Insumo".
                      </td>
                    </tr>
                  ) : (
                    inputs.map((inp) => {
                      const sub = (inp.coefficient || 0) * (inp.unitCost || 0)
                      return (
                        <tr key={inp.id} className="hover:bg-[#171A1F]/[0.02]">
                          <td className="py-1.5 px-2.5">
                            <input
                              type="text"
                              value={inp.code}
                              onChange={(e) => handleUpdateInput(inp.id, 'code', e.target.value)}
                              className="w-24 px-1.5 py-0.5 rounded border border-[#171A1F]/15 font-mono text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2.5">
                            <input
                              type="text"
                              value={inp.description}
                              onChange={(e) =>
                                handleUpdateInput(inp.id, 'description', e.target.value)
                              }
                              className="w-full px-1.5 py-0.5 rounded border border-[#171A1F]/15 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2.5">
                            <select
                              value={inp.category}
                              onChange={(e) =>
                                handleUpdateInput(inp.id, 'category', e.target.value)
                              }
                              className="px-1.5 py-0.5 rounded border border-[#171A1F]/15 text-xs"
                            >
                              <option value="material">Material</option>
                              <option value="mao_de_obra">Mão de Obra</option>
                              <option value="equipamento">Equipamento</option>
                              <option value="servico_terceiro">Terceiros</option>
                              <option value="outros">Outros</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-2.5 w-24">
                            <UnitSelect
                              value={inp.unit}
                              onChange={(val) => handleUpdateInput(inp.id, 'unit', val)}
                              size="sm"
                              ariaLabel={`Unidade do insumo ${inp.code}`}
                            />
                          </td>
                          <td className="py-1.5 px-2.5 text-right">
                            <input
                              type="number"
                              step="0.0001"
                              value={inp.coefficient}
                              onChange={(e) =>
                                handleUpdateInput(
                                  inp.id,
                                  'coefficient',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-20 px-1 py-0.5 rounded border border-[#171A1F]/15 text-xs text-right font-bold"
                            />
                          </td>
                          <td className="py-1.5 px-2.5 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={inp.unitCost}
                              onChange={(e) =>
                                handleUpdateInput(
                                  inp.id,
                                  'unitCost',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-20 px-1 py-0.5 rounded border border-[#171A1F]/15 text-xs text-right font-bold text-[#FF6B1F]"
                            />
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-bold text-[#171A1F]">
                            {formatCurrencyBRL(sub)}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteInput(inp.id)}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                <tfoot className="bg-[#F8F9FA] font-bold text-xs border-t border-[#171A1F]/10">
                  <tr>
                    <td colSpan={6} className="py-2.5 px-3 text-right text-[#171A1F]">
                      Custo Unitário Total Calculado ({unit}):
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#FF6B1F] text-sm font-extrabold">
                      {formatCurrencyBRL(currentUnitCost)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#171A1F]/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>Salvar Composição</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
