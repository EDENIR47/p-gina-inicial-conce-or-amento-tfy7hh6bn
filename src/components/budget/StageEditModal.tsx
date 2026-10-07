/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Criar ou Editar Etapa da Obra (Nível 1 da Árvore)
 * Suporta:
 * 1. Volume via Medidas: comprimento (m) × largura (m) × altura/espessura (m) calculando volumeM3 em tempo real
 *    com suporte a retrocompatibilidade (ajuste manual direto também mantido se desejado)
 * 2. Peso via Peso Específico (kg/m³) do material com lista de referência ou digitação livre,
 *    calculando weightKg = peso específico × volume m³ em tempo real (ou modo peso manual direto)
 * 3. 1 Foto anexada com compressão client-side.
 * 4. Regra inegociável: em itens sem volume ou peso fica em branco (nunca zero automático).
 */

import React, { useState, useEffect, useRef, useId } from 'react'
import {
  X,
  Check,
  Layers,
  AlertCircle,
  Camera,
  Trash2,
  RefreshCw,
  Box,
  Scale,
  Loader2,
  Info,
  Calculator,
  SlidersHorizontal,
} from 'lucide-react'
import { BudgetStage } from '@/types/budgetEngine'
import {
  compressImageFile,
  parseOptionalNumberPtBr,
  formatOptionalNumberPtBr,
} from '@/lib/imageCompression'

// Materiais típicos de referência com pesos específicos médios de projeto / demolição
export interface SpecificWeightPreset {
  label: string
  densityKgM3: number
  description?: string
}

export const TYPICAL_SPECIFIC_WEIGHTS: SpecificWeightPreset[] = [
  {
    label: 'Alvenaria de tijolo cerâmico',
    densityKgM3: 1400,
    description: '~1.400 kg/m³ (alvenaria furada com argamassa)',
  },
  {
    label: 'Alvenaria de bloco de concreto',
    densityKgM3: 1800,
    description: '~1.800 kg/m³',
  },
  {
    label: 'Concreto armado',
    densityKgM3: 2500,
    description: '~2.500 kg/m³ (estruturas, vigas, lajes)',
  },
  {
    label: 'Concreto simples (sem armadura)',
    densityKgM3: 2300,
    description: '~2.300 kg/m³',
  },
  {
    label: 'Argamassa / mistura cimentícia',
    densityKgM3: 2100,
    description: '~2.100 kg/m³ (reboco, contrapiso, emboço)',
  },
  {
    label: 'Gesso / Drywall',
    densityKgM3: 1000,
    description: '~1.000 kg/m³ (placas de gesso / forro)',
  },
  {
    label: 'Madeira / formas / escoras',
    densityKgM3: 600,
    description: '~600 kg/m³ (pinus, eucalipto, compensado)',
  },
  {
    label: 'Metal / aço estrutural / vergalhões',
    densityKgM3: 7850,
    description: '~7.850 kg/m³',
  },
  {
    label: 'Entulho misto solto / demolição geral',
    densityKgM3: 1300,
    description: '~1.300 kg/m³ (entulho misturado solto)',
  },
  {
    label: 'Solo / terra escavada',
    densityKgM3: 1600,
    description: '~1.600 kg/m³',
  },
]

interface StageEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (stage: BudgetStage) => void
  initialStage?: BudgetStage | null
  nextOrder: number
}

export const StageEditModal: React.FC<StageEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialStage,
  nextOrder,
}) => {
  const [name, setName] = useState(initialStage?.name || '')
  const [code, setCode] = useState(initialStage?.code || String(nextOrder).padStart(2, '0'))
  const [notes, setNotes] = useState(initialStage?.notes || '')

  // Medidas de cálculo de volume (comprimento × largura × altura)
  const [lengthStr, setLengthStr] = useState('')
  const [widthStr, setWidthStr] = useState('')
  const [heightStr, setHeightStr] = useState('')

  // Modo de volume: 'measures' (padrão) ou 'manual'
  const [volumeMode, setVolumeMode] = useState<'measures' | 'manual'>('measures')
  const [manualVolumeStr, setManualVolumeStr] = useState('')

  // Peso: 'density' (peso específico × volume) ou 'manual'
  const [weightMode, setWeightMode] = useState<'density' | 'manual'>('density')
  const [densityStr, setDensityStr] = useState('')
  const [manualWeightStr, setManualWeightStr] = useState('')

  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const presetSelectId = useId()

  // Sincroniza e popula os dados da etapa ao abrir a modal ou alterar initialStage
  useEffect(() => {
    if (isOpen) {
      if (initialStage) {
        setName(initialStage.name || '')
        setCode(initialStage.code || String(initialStage.order || nextOrder).padStart(2, '0'))
        setNotes(initialStage.notes || '')

        const hasExistingVolume =
          initialStage.volumeM3 !== undefined && initialStage.volumeM3 !== null
        const hasExistingWeight =
          initialStage.weightKg !== undefined && initialStage.weightKg !== null

        if (hasExistingVolume) {
          // Mantém o volume existente no campo manual para retrocompatibilidade sem perdas
          setManualVolumeStr(formatOptionalNumberPtBr(initialStage.volumeM3, 3))
          // Por padrão se tem volume já pré-existente sem medidas gravadas, pode abrir em manual
          // mas o usuário pode facilmente alternar para medidas
          setVolumeMode('manual')
        } else {
          setManualVolumeStr('')
          setVolumeMode('measures')
        }

        if (hasExistingWeight) {
          setManualWeightStr(formatOptionalNumberPtBr(initialStage.weightKg, 2))
          setWeightMode('manual')
        } else {
          setManualWeightStr('')
          setWeightMode('density')
        }

        // Limpa medidas e peso específico
        setLengthStr('')
        setWidthStr('')
        setHeightStr('')
        setDensityStr('')

        setPhotoUrl(initialStage.photoUrl || null)
      } else {
        setName('')
        setCode(String(nextOrder).padStart(2, '0'))
        setNotes('')
        setLengthStr('')
        setWidthStr('')
        setHeightStr('')
        setManualVolumeStr('')
        setVolumeMode('measures')
        setDensityStr('')
        setManualWeightStr('')
        setWeightMode('density')
        setPhotoUrl(null)
      }
      setIsCompressingPhoto(false)
      setError('')
    }
  }, [isOpen, initialStage, nextOrder])

  if (!isOpen) return null

  // Cálculo do volume em tempo real
  const parsedLength = parseOptionalNumberPtBr(lengthStr)
  const parsedWidth = parseOptionalNumberPtBr(widthStr)
  const parsedHeight = parseOptionalNumberPtBr(heightStr)

  // Volume calculado a partir das 3 medidas (somente se todas foram preenchidas e > 0)
  const hasAllMeasures =
    parsedLength !== null &&
    parsedLength > 0 &&
    parsedWidth !== null &&
    parsedWidth > 0 &&
    parsedHeight !== null &&
    parsedHeight > 0

  const calculatedVolumeFromMeasures: number | null = hasAllMeasures
    ? parsedLength * parsedWidth * parsedHeight
    : null

  const parsedManualVolume = parseOptionalNumberPtBr(manualVolumeStr)

  // Volume efetivo atual dependendo do modo
  const effectiveVolumeM3: number | null =
    volumeMode === 'measures' ? calculatedVolumeFromMeasures : parsedManualVolume

  // Cálculo do peso em tempo real
  const parsedDensity = parseOptionalNumberPtBr(densityStr)
  const calculatedWeightFromDensity: number | null =
    effectiveVolumeM3 !== null &&
    effectiveVolumeM3 > 0 &&
    parsedDensity !== null &&
    parsedDensity > 0
      ? effectiveVolumeM3 * parsedDensity
      : null

  const parsedManualWeight = parseOptionalNumberPtBr(manualWeightStr)

  // Peso efetivo atual dependendo do modo
  const effectiveWeightKg: number | null =
    weightMode === 'density' ? calculatedWeightFromDensity : parsedManualWeight

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ''

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem (JPEG, PNG, WEBP).')
      return
    }

    try {
      setIsCompressingPhoto(true)
      setError('')
      const compressed = await compressImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.7,
        mimeType: 'image/jpeg',
      })
      setPhotoUrl(compressed)
    } catch (err: any) {
      setError(err?.message || 'Falha ao processar e comprimir a imagem.')
    } finally {
      setIsCompressingPhoto(false)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoUrl(null)
  }

  const handleSelectDensityPreset = (densityValue: number) => {
    setDensityStr(formatOptionalNumberPtBr(densityValue, 0))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('O nome da etapa é obrigatório.')
      return
    }

    // Regra inegociável: em itens que não têm volume ou peso fica em branco (null, nunca zero forçado)
    const finalVolume =
      effectiveVolumeM3 !== null && !isNaN(effectiveVolumeM3) && effectiveVolumeM3 > 0
        ? Number(effectiveVolumeM3.toFixed(3))
        : null

    const finalWeight =
      effectiveWeightKg !== null && !isNaN(effectiveWeightKg) && effectiveWeightKg > 0
        ? Number(effectiveWeightKg.toFixed(2))
        : null

    onSave({
      id: initialStage?.id || `stage-${Date.now()}`,
      order: initialStage?.order || nextOrder,
      code: code.trim() || '01',
      name: name.trim().toUpperCase(),
      services: initialStage?.services || [],
      notes: notes.trim(),
      volumeM3: finalVolume,
      weightKg: finalWeight,
      photoUrl: photoUrl || null,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-[#171A1F]/20 overflow-hidden my-6">
        <div className="p-4 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FF6B1F]" />
            <h3 className="text-sm sm:text-base font-bold">
              {initialStage ? 'Editar Etapa da Obra' : 'Nova Etapa da Obra'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 max-h-[calc(90vh-100px)] overflow-y-auto"
        >
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Código e Nome da Etapa */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-bold text-[#171A1F] block mb-1">Código</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="01"
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-bold focus:outline-none focus:border-[#294C87]"
              />
            </div>

            <div className="col-span-3">
              <label className="text-xs font-bold text-[#171A1F] block mb-1">Nome da Etapa *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                placeholder="Ex: DEMOLIÇÃO E RETIRADA DE ENTULHO"
                className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-semibold focus:outline-none focus:border-[#294C87]"
              />
            </div>
          </div>

          {/* BLOCO 1: Volume Retirado (m³) — via Medidas (CxLxA) ou Manual */}
          <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5">
                <Box className="w-4 h-4 text-[#294C87]" />
                Volume Retirado (m³)
              </span>

              {/* Alternador de Modo */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#171A1F]/15 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setVolumeMode('measures')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    volumeMode === 'measures'
                      ? 'bg-[#294C87] text-white font-bold'
                      : 'text-[#171A1F]/70 hover:text-[#171A1F]'
                  }`}
                  title="Calcular volume a partir das medidas (Comprimento × Largura × Altura)"
                >
                  <Calculator className="w-3 h-3" />
                  <span>Por Medidas (C×L×A)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVolumeMode('manual')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    volumeMode === 'manual'
                      ? 'bg-[#294C87] text-white font-bold'
                      : 'text-[#171A1F]/70 hover:text-[#171A1F]'
                  }`}
                  title="Digitar volume pronto diretamente"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Volume Manual</span>
                </button>
              </div>
            </div>

            {volumeMode === 'measures' ? (
              <div className="space-y-2.5">
                <p className="text-[11px] text-[#171A1F]/60">
                  Informe as dimensões em metros (padrão brasileiro com vírgula ou ponto):
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[#171A1F]/80 block mb-0.5">
                      Comprimento (m)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={lengthStr}
                        onChange={(e) => setLengthStr(e.target.value)}
                        placeholder="Ex: 5,20"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-semibold bg-white focus:outline-none focus:border-[#294C87]"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#171A1F]/40 font-bold pointer-events-none">
                        m
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#171A1F]/80 block mb-0.5">
                      Largura (m)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={widthStr}
                        onChange={(e) => setWidthStr(e.target.value)}
                        placeholder="Ex: 3,00"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-semibold bg-white focus:outline-none focus:border-[#294C87]"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#171A1F]/40 font-bold pointer-events-none">
                        m
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#171A1F]/80 block mb-0.5">
                      Altura / Esp. (m)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={heightStr}
                        onChange={(e) => setHeightStr(e.target.value)}
                        placeholder="Ex: 0,15"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-semibold bg-white focus:outline-none focus:border-[#294C87]"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#171A1F]/40 font-bold pointer-events-none">
                        m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Exibição em tempo real do volume calculado */}
                <div className="p-2.5 rounded-lg bg-white border border-[#294C87]/20 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#171A1F]/80 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-[#294C87]" />
                    Volume calculado (C × L × A):
                  </span>
                  {calculatedVolumeFromMeasures !== null ? (
                    <span className="text-xs sm:text-sm font-extrabold font-mono text-[#294C87]">
                      {formatOptionalNumberPtBr(calculatedVolumeFromMeasures, 3)} m³
                    </span>
                  ) : (
                    <span className="text-[11px] italic text-[#171A1F]/40 font-mono">
                      (em branco — preencha as 3 medidas)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#171A1F]/80 block">
                  Volume Direto (m³)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualVolumeStr}
                    onChange={(e) => setManualVolumeStr(e.target.value)}
                    placeholder="Ex: 14,50"
                    className="w-full pl-3 pr-10 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-semibold bg-white focus:outline-none focus:border-[#294C87]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#171A1F]/40 pointer-events-none">
                    m³
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* BLOCO 2: Peso Retirado (kg) — via Peso Específico (kg/m³) × Volume ou Manual */}
          <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-[#FF6B1F]" />
                Peso Retirado (kg)
              </span>

              {/* Alternador de Modo de Peso */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#171A1F]/15 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setWeightMode('density')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    weightMode === 'density'
                      ? 'bg-[#FF6B1F] text-white font-bold'
                      : 'text-[#171A1F]/70 hover:text-[#171A1F]'
                  }`}
                  title="Calcular peso multiplicando o peso específico (kg/m³) pelo volume (m³)"
                >
                  <Calculator className="w-3 h-3" />
                  <span>Por Peso Específico</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWeightMode('manual')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    weightMode === 'manual'
                      ? 'bg-[#FF6B1F] text-white font-bold'
                      : 'text-[#171A1F]/70 hover:text-[#171A1F]'
                  }`}
                  title="Digitar peso total em kg diretamente"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Peso Manual</span>
                </button>
              </div>
            </div>

            {weightMode === 'density' ? (
              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <label
                    htmlFor={presetSelectId}
                    className="text-[11px] font-semibold text-[#171A1F]/80 flex items-center justify-between"
                  >
                    <span>Material de Referência (Sugestões de Peso Específico):</span>
                    <span className="text-[10px] text-[#171A1F]/50">Opcional</span>
                  </label>
                  <select
                    id={presetSelectId}
                    value=""
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) {
                        handleSelectDensityPreset(val)
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs bg-white text-[#171A1F] font-medium focus:outline-none focus:border-[#294C87] cursor-pointer"
                  >
                    <option value="">Selecione um material típico para preencher...</option>
                    {TYPICAL_SPECIFIC_WEIGHTS.map((mat) => (
                      <option key={mat.label} value={mat.densityKgM3}>
                        {mat.label} — {mat.densityKgM3.toLocaleString('pt-BR')} kg/m³
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#171A1F]/80 block">
                    Peso Específico do Material (kg/m³)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={densityStr}
                      onChange={(e) => setDensityStr(e.target.value)}
                      placeholder="Ex: 1400 ou 2500"
                      className="w-full pl-3 pr-14 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-semibold bg-white focus:outline-none focus:border-[#294C87]"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#171A1F]/40 pointer-events-none">
                      kg/m³
                    </span>
                  </div>
                </div>

                {/* Exibição em tempo real do peso calculado */}
                <div className="p-2.5 rounded-lg bg-white border border-[#FF6B1F]/30 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-[#171A1F]/80 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-[#FF6B1F]" />
                      Peso calculado (Vol × Peso Específico):
                    </span>
                    {effectiveVolumeM3 !== null &&
                    effectiveVolumeM3 > 0 &&
                    parsedDensity !== null ? (
                      <span className="text-[10px] text-[#171A1F]/50 block font-mono">
                        {formatOptionalNumberPtBr(effectiveVolumeM3, 3)} m³ ×{' '}
                        {formatOptionalNumberPtBr(parsedDensity, 0)} kg/m³
                      </span>
                    ) : null}
                  </div>

                  {calculatedWeightFromDensity !== null ? (
                    <span className="text-xs sm:text-sm font-extrabold font-mono text-[#FF6B1F]">
                      {formatOptionalNumberPtBr(calculatedWeightFromDensity, 2)} kg
                    </span>
                  ) : (
                    <span className="text-[11px] italic text-[#171A1F]/40 font-mono">
                      (em branco — requer volume e peso específico)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#171A1F]/80 block">
                  Peso Retirado Direto (kg)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualWeightStr}
                    onChange={(e) => setManualWeightStr(e.target.value)}
                    placeholder="Ex: 850,00"
                    className="w-full pl-3 pr-10 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-semibold bg-white focus:outline-none focus:border-[#294C87]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#171A1F]/40 pointer-events-none">
                    kg
                  </span>
                </div>
              </div>
            )}

            <p className="text-[10px] text-[#171A1F]/60 flex items-center gap-1 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-[#294C87] shrink-0" />
              Em itens sem volume ou peso a retirar, deixe em branco (nunca zero automático).
            </p>
          </div>

          {/* Anexo de 1 Foto da Etapa */}
          <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#FF6B1F]" />
                Foto da Etapa (1 foto)
              </span>
              <span className="text-[10px] text-[#171A1F]/50 font-medium">
                Comprimida e salva no orçamento
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {photoUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-[#171A1F]/15 bg-black/5 aspect-video max-h-48 flex items-center justify-center">
                  <img src={photoUrl} alt="Foto da etapa" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-between p-2.5 text-white">
                    <span className="text-[11px] font-semibold truncate">Foto anexada à etapa</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressingPhoto}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#294C87]" />
                    <span>Trocar Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isCompressingPhoto}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Remover</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressingPhoto}
                  className="w-full border-2 border-dashed border-[#171A1F]/20 hover:border-[#294C87] rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-center transition-colors bg-white hover:bg-blue-50/20 cursor-pointer"
                >
                  {isCompressingPhoto ? (
                    <>
                      <Loader2 className="w-6 h-6 text-[#294C87] animate-spin" />
                      <span className="text-xs font-bold text-[#171A1F]">
                        Comprimindo e ajustando imagem...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-[#FF6B1F]/10 flex items-center justify-center text-[#FF6B1F]">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-[#171A1F]">
                        Clique para anexar foto desta etapa
                      </span>
                      <span className="text-[10px] text-[#171A1F]/50">
                        PNG, JPG ou WEBP (otimização automática no navegador)
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Observações da Etapa */}
          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Observações / Critérios de Medição
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Medições quinzenais conforme avanço real e destinação de entulho"
              className="w-full px-3 py-2 rounded-lg border border-[#171A1F]/20 text-xs focus:outline-none focus:border-[#294C87]"
            />
          </div>

          {/* Rodapé com Botões de Ação */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#171A1F]/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCompressingPhoto}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#294C87] hover:bg-[#171A1F] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>Salvar Etapa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
