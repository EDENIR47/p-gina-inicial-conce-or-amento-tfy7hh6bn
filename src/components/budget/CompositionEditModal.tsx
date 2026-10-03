/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Criar ou Editar Composição com Versionamento (v1.0, v1.1, v2.0 com Data e Autor)
 */

import React, { useState, useEffect } from 'react'
import {
  X,
  Check,
  BookOpen,
  Plus,
  Trash2,
  History,
  AlertCircle,
  GitCommit,
  Database,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import { BudgetComposition, BudgetInput } from '@/types/budgetEngine'
import { SinapiCatalogItem } from '@/types/sinapi'
import { SPECIALTIES_LIST } from '@/lib/compositionsData'
import { formatCurrencyBRL } from '@/lib/formatters'
import { calculateCompositionUnitCost } from '@/lib/budgetEngine'
import {
  getRemovedCompositionInputs,
  recordRemovedCompositionInput,
  purgeRemovedCompositionInputRecord,
  clearRemovedCompositionInputs,
  RemovedCompositionInputItem,
} from '@/lib/budgetsStorage'
import { UnitSelect } from './UnitSelect'
import { SinapiInputPickerModal } from './SinapiInputPickerModal'

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
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [isSinapiPickerOpen, setIsSinapiPickerOpen] = useState(false)

  // Histórico de insumos removidos persistido em localStorage
  const [removedHistory, setRemovedHistory] = useState<RemovedCompositionInputItem[]>([])
  const [isTrashOpen, setIsTrashOpen] = useState(false)
  const [lastRemovedItem, setLastRemovedItem] = useState<{
    recordId: string
    input: BudgetInput
    originalIndex?: number
  } | null>(null)

  // Sincroniza e popula os dados da composição ao abrir a modal ou alterar initialComposition
  useEffect(() => {
    if (isOpen) {
      if (initialComposition) {
        setCode(initialComposition.code || 'CONCE-CPU-')
        setDescription(initialComposition.description || '')
        setSpecialty(initialComposition.specialty || 'Estruturas & Fundações')
        setUnit(initialComposition.unit || 'm²')
        setSource(initialComposition.source || 'CONCE')
        setVersion(initialComposition.version || 'v1.0')
        setAuthor(
          initialComposition.versionsHistory?.[0]?.author ||
            'Eng. Edenir Souza da Rosa - CREA/RS-252397',
        )
        setInputs(initialComposition.inputs ? [...initialComposition.inputs] : [])
      } else {
        setCode('CONCE-CPU-')
        setDescription('')
        setSpecialty('Estruturas & Fundações')
        setUnit('m²')
        setSource('CONCE')
        setVersion('v1.0')
        setAuthor('Eng. Edenir Souza da Rosa - CREA/RS-252397')
        setInputs([])
      }
      setChangeNote('')
      setError('')
      setSuccessToast(null)
    }
  }, [isOpen, initialComposition])

  // Carrega histórico de itens removidos ao abrir a modal ou trocar a composição
  useEffect(() => {
    if (isOpen) {
      const compKey = initialComposition?.code || initialComposition?.id || code
      const loaded = getRemovedCompositionInputs(compKey)
      setRemovedHistory(loaded)
      setLastRemovedItem(null)
      setError('')
      setSuccessToast(null)
    }
  }, [isOpen, initialComposition?.code, initialComposition?.id])

  const showNotification = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

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
      source: 'Usuário',
      sourceStatus: 'valido',
    }
    setInputs([...inputs, newInput])
  }

  // Adiciona insumo diretamente do Catálogo SINAPI
  const handleAddSinapiInput = (sinapiItem: SinapiCatalogItem, coefficient: number) => {
    const newInput: BudgetInput = {
      id: `inp-sinapi-${Date.now()}`,
      code: sinapiItem.code,
      description: sinapiItem.description,
      unit: sinapiItem.unit,
      category: sinapiItem.category,
      coefficient: coefficient > 0 ? coefficient : 1.0,
      unitCost: sinapiItem.referencePrice,
      source: 'SINAPI',
      sourceStatus: 'valido',
      notes: `Referência SINAPI ${sinapiItem.referenceMonth || '04/2025'} (${sinapiItem.priceOrigin === 'importada_usuario' ? 'Importada' : 'Embutida'})`,
    }
    setInputs([...inputs, newInput])
  }

  const handleUpdateInput = (id: string, field: keyof BudgetInput, value: any) => {
    setInputs(inputs.map((inp) => (inp.id === id ? { ...inp, [field]: value } : inp)))
  }

  const handleDeleteInput = (id: string) => {
    const index = inputs.findIndex((inp) => inp.id === id)
    if (index === -1) return
    const target = inputs[index]
    const name = target?.description || target?.code || 'este insumo'

    if (
      window.confirm(
        `Excluir insumo "${name}"? Você poderá restaurá-lo a qualquer momento no histórico de itens removidos.`,
      )
    ) {
      const compKey = initialComposition?.code || initialComposition?.id || code || 'CONCE-CPU'
      // Grava no histórico persistente de localStorage
      const record = recordRemovedCompositionInput(
        compKey,
        target,
        index,
        author || 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
      )

      // Atualiza estado local
      setInputs(inputs.filter((inp) => inp.id !== id))
      setRemovedHistory((prev) => [record, ...prev])
      setLastRemovedItem({
        recordId: record.id,
        input: { ...target },
        originalIndex: index,
      })

      showNotification(`Insumo "${target.code}" removido. Clique em "Desfazer" para restaurar.`)
    }
  }

  // Restaura um insumo (seja via botão desfazer rápido ou via lista de itens removidos)
  const handleRestoreInput = (
    inputToRestore: BudgetInput,
    recordId?: string,
    targetIndex?: number,
  ) => {
    // 1. Verifica se já existe insumo com o mesmo código SINAPI ou descrição idêntica na composição
    const alreadyExists = inputs.some(
      (existing) =>
        (existing.code &&
          inputToRestore.code &&
          existing.code.trim().toUpperCase() === inputToRestore.code.trim().toUpperCase()) ||
        existing.id === inputToRestore.id,
    )

    if (alreadyExists) {
      setError(
        `O insumo "${inputToRestore.code || inputToRestore.description}" já está presente na composição. Não foi duplicado.`,
      )
      setTimeout(() => setError(''), 5000)
      return
    }

    // 2. Garante ID único caso seja necessário e integridade total dos campos originais
    const restored: BudgetInput = {
      ...inputToRestore,
      id: inputToRestore.id || `inp-restored-${Date.now()}`,
    }

    // 3. Insere na posição original ou ao final
    let newInputs: BudgetInput[]
    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= inputs.length) {
      newInputs = [...inputs.slice(0, targetIndex), restored, ...inputs.slice(targetIndex)]
    } else {
      newInputs = [...inputs, restored]
    }

    setInputs(newInputs)

    // 4. Remove do histórico em localStorage se houver recordId
    if (recordId) {
      purgeRemovedCompositionInputRecord(recordId)
      setRemovedHistory((prev) => prev.filter((r) => r.id !== recordId))
    }

    // Se o último excluído for o restaurado, reseta
    if (lastRemovedItem && lastRemovedItem.input.code === inputToRestore.code) {
      setLastRemovedItem(null)
    }

    showNotification(
      `Insumo "${restored.code || restored.description}" restaurado com sucesso! Custo unitário recalculado.`,
    )
  }

  // Limpa o histórico de itens removidos desta composição
  const handleClearHistory = () => {
    if (
      window.confirm(
        'Deseja limpar definitivamente o histórico de itens removidos desta composição?',
      )
    ) {
      const compKey = initialComposition?.code || initialComposition?.id || code
      clearRemovedCompositionInputs(compKey)
      setRemovedHistory([])
      setLastRemovedItem(null)
      showNotification('Histórico de itens removidos limpo com sucesso.')
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
          {/* Alertas e Notificações Rápidas */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-800 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {successToast && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 flex items-center justify-between gap-2 animate-fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">{successToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessToast(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Banner de Desfazer Exclusão Rápida (quando acabou de excluir) */}
          {lastRemovedItem && (
            <div className="p-3 rounded-xl bg-[#294C87]/10 border border-[#294C87]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-fade-in">
              <div className="flex items-center gap-2 text-xs text-[#171A1F]">
                <RotateCcw className="w-4 h-4 text-[#FF6B1F] flex-shrink-0" />
                <span>
                  Insumo <strong>{lastRemovedItem.input.code}</strong> (
                  {lastRemovedItem.input.description}) foi excluído da composição.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleRestoreInput(
                      lastRemovedItem.input,
                      lastRemovedItem.recordId,
                      lastRemovedItem.originalIndex,
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#FF6B1F]" />
                  <span>Restaurar Insumo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLastRemovedItem(null)}
                  className="px-2 py-1 text-xs text-[#171A1F]/50 hover:text-[#171A1F]"
                  title="Fechar aviso"
                >
                  ✕
                </button>
              </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#171A1F] flex items-center gap-1.5">
                  Insumos da Composição ({inputs.length})
                </span>
                {removedHistory.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    {removedHistory.length} removido(s)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {removedHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsTrashOpen(!isTrashOpen)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#294C87]/30 bg-amber-50 hover:bg-amber-100 text-[#294C87] text-xs font-bold transition-all shadow-sm cursor-pointer"
                    title="Exibir ou ocultar insumos excluídos da composição para restaurar"
                  >
                    <History className="w-3.5 h-3.5 text-[#FF6B1F]" />
                    <span>Itens Removidos ({removedHistory.length})</span>
                    {isTrashOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsSinapiPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B1F] text-white text-xs font-bold hover:bg-[#FF6B1F]/90 transition-all shadow-sm cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Selecionar do Catálogo SINAPI</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddInput}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#294C87] text-white text-xs font-semibold hover:bg-[#171A1F] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#FF6B1F]" />
                  <span>Novo Manual</span>
                </button>
              </div>
            </div>

            {/* Seção Expansível: Histórico de Itens Removidos / Lixeira da Composição */}
            {isTrashOpen && removedHistory.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#FF6B1F]" />
                    <span className="text-xs font-bold text-[#171A1F] uppercase tracking-wider">
                      Itens Removidos desta Composição (Lixeira Persistente)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-800 underline cursor-pointer"
                  >
                    Limpar histórico
                  </button>
                </div>

                <p className="text-[11px] text-[#171A1F]/70">
                  Os itens abaixo foram removidos da CPU. Clique em <strong>"Restaurar"</strong>{' '}
                  para reinserir o insumo com os mesmos coeficientes e preços.
                </p>

                <div className="divide-y divide-amber-200/60 border border-amber-200/80 rounded-lg bg-white overflow-hidden text-xs">
                  {removedHistory.map((rec) => {
                    const inp = rec.input
                    const sub = (inp.coefficient || 0) * (inp.unitCost || 0)
                    const formattedDate = new Date(rec.removedAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <div
                        key={rec.id}
                        className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-amber-50/40 transition-colors"
                      >
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-[#294C87] text-xs">
                              {inp.code}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-[#171A1F]/5 text-[10px] font-semibold uppercase text-[#171A1F]/70">
                              {inp.category}
                            </span>
                            <span className="text-[11px] text-[#171A1F]/50">
                              Excluído em {formattedDate}
                            </span>
                          </div>
                          <p className="text-xs text-[#171A1F] font-medium truncate">
                            {inp.description}
                          </p>
                          <div className="text-[11px] text-[#171A1F]/70">
                            Coef:{' '}
                            <strong>
                              {inp.coefficient} {inp.unit}
                            </strong>{' '}
                            × {formatCurrencyBRL(inp.unitCost)} ={' '}
                            <strong className="text-[#FF6B1F]">{formatCurrencyBRL(sub)}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleRestoreInput(inp, rec.id, rec.originalIndex)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Restaurar este insumo na composição"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#FF6B1F]" />
                            <span>Restaurar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              purgeRemovedCompositionInputRecord(rec.id)
                              setRemovedHistory((prev) => prev.filter((r) => r.id !== rec.id))
                              showNotification(`Item ${inp.code} descartado permanentemente.`)
                            }}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                            title="Descartar permanentemente este item do histórico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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

      {/* Modal seletor de insumos do Catálogo SINAPI */}
      <SinapiInputPickerModal
        isOpen={isSinapiPickerOpen}
        onClose={() => setIsSinapiPickerOpen(false)}
        onSelect={handleAddSinapiInput}
      />
    </div>
  )
}
