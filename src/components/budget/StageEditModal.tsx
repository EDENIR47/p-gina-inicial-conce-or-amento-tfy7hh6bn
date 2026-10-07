/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Criar ou Editar Etapa da Obra (Nível 1 da Árvore)
 * Suporta Volume (m³), Peso (kg) e 1 Foto anexada com compressão client-side.
 */

import React, { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import { BudgetStage } from '@/types/budgetEngine'
import {
  compressImageFile,
  parseOptionalNumberPtBr,
  formatOptionalNumberPtBr,
} from '@/lib/imageCompression'

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
  const [volumeStr, setVolumeStr] = useState('')
  const [weightStr, setWeightStr] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sincroniza e popula os dados da etapa ao abrir a modal ou alterar initialStage
  useEffect(() => {
    if (isOpen) {
      if (initialStage) {
        setName(initialStage.name || '')
        setCode(initialStage.code || String(initialStage.order || nextOrder).padStart(2, '0'))
        setNotes(initialStage.notes || '')
        setVolumeStr(
          initialStage.volumeM3 !== undefined && initialStage.volumeM3 !== null
            ? formatOptionalNumberPtBr(initialStage.volumeM3)
            : '',
        )
        setWeightStr(
          initialStage.weightKg !== undefined && initialStage.weightKg !== null
            ? formatOptionalNumberPtBr(initialStage.weightKg)
            : '',
        )
        setPhotoUrl(initialStage.photoUrl || null)
      } else {
        setName('')
        setCode(String(nextOrder).padStart(2, '0'))
        setNotes('')
        setVolumeStr('')
        setWeightStr('')
        setPhotoUrl(null)
      }
      setIsCompressingPhoto(false)
      setError('')
    }
  }, [isOpen, initialStage, nextOrder])

  if (!isOpen) return null

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limpa o valor do input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem (JPEG, PNG, WEBP).')
      return
    }

    try {
      setIsCompressingPhoto(true)
      setError('')
      // Comprime no cliente para máx 1200px e JPEG 70%
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('O nome da etapa é obrigatório.')
      return
    }

    // Trata volume e peso: se o usuário deixou em branco, permanece null/indefinido (nunca zero forçado)
    const parsedVolume = parseOptionalNumberPtBr(volumeStr)
    const parsedWeight = parseOptionalNumberPtBr(weightStr)

    onSave({
      id: initialStage?.id || `stage-${Date.now()}`,
      order: initialStage?.order || nextOrder,
      code: code.trim() || '01',
      name: name.trim().toUpperCase(),
      services: initialStage?.services || [],
      notes: notes.trim(),
      volumeM3: parsedVolume,
      weightKg: parsedWeight,
      photoUrl: photoUrl || null,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#171A1F]/20 overflow-hidden my-6">
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

          {/* Volume (m³) e Peso (kg) por Etapa Retirada — Opcionais */}
          <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-[#294C87]" />
                Volume e Peso da Etapa Retirada
              </span>
              <span className="text-[10px] text-[#171A1F]/50 font-medium">
                Opcional (em branco se não houver)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#171A1F]/80 flex items-center gap-1 mb-1">
                  <Box className="w-3 h-3 text-[#294C87]" />
                  Volume Retirado (m³)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={volumeStr}
                    onChange={(e) => setVolumeStr(e.target.value)}
                    placeholder="Ex: 14,50"
                    className="w-full pl-3 pr-10 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-semibold bg-white focus:outline-none focus:border-[#294C87]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#171A1F]/40 pointer-events-none">
                    m³
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#171A1F]/80 flex items-center gap-1 mb-1">
                  <Scale className="w-3 h-3 text-[#FF6B1F]" />
                  Peso Retirado (kg)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={weightStr}
                    onChange={(e) => setWeightStr(e.target.value)}
                    placeholder="Ex: 850,00"
                    className="w-full pl-3 pr-10 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-mono font-semibold bg-white focus:outline-none focus:border-[#294C87]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#171A1F]/40 pointer-events-none">
                    kg
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-[#171A1F]/60 flex items-center gap-1 leading-relaxed">
              <Info className="w-3 h-3 text-[#294C87] shrink-0" />
              Deixe em branco em itens que não possuem volume ou peso para retirada.
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
              placeholder="Ex: Medições quinzenais conforme diário de obra"
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
