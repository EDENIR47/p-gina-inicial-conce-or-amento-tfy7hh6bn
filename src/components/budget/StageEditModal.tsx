/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Criar ou Editar Etapa da Obra (Nível 1 da Árvore)
 *
 * Suporta:
 * 1. Identificação da Etapa: Código, Nome e Observações/Critérios de medição
 * 2. Anexo de 1 Foto da Etapa com compressão client-side (upload, preview, trocar e remover)
 * 3. Preservação de volumeM3 e weightKg para retrocompatibilidade
 * 4. Regra anti-sobrescrita: nada grava automaticamente; somente ao clicar em "Salvar Etapa"
 */

import React, { useState, useEffect, useRef } from 'react'
import { X, Check, Layers, AlertCircle, Camera, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { BudgetStage } from '@/types/budgetEngine'
import { compressImageFile } from '@/lib/imageCompression'

// Mantidos para retrocompatibilidade de tipos caso algum módulo externo importe
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
        setPhotoUrl(initialStage.photoUrl || null)
      } else {
        setName('')
        setCode(String(nextOrder).padStart(2, '0'))
        setNotes('')
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('O nome da etapa é obrigatório.')
      return
    }

    // Preserva volumeM3 e weightKg já existentes na etapa para retrocompatibilidade
    onSave({
      id: initialStage?.id || `stage-${Date.now()}`,
      order: initialStage?.order || nextOrder,
      code: code.trim() || '01',
      name: name.trim().toUpperCase(),
      services: initialStage?.services || [],
      notes: notes.trim(),
      volumeM3: initialStage?.volumeM3 ?? null,
      weightKg: initialStage?.weightKg ?? null,
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

          {/* Anexo de 1 Foto da Etapa (Aprovada pelo usuário — mantida íntegra) */}
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
