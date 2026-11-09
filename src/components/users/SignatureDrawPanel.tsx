/**
 * CONCE — Painel "Minha assinatura" da tela Usuários.
 *
 * Canvas de desenho com mouse E toque, traço fino estilo caneta, fundo branco.
 * A assinatura desenhada é convertida em data-URL PNG (fundo transparente na
 * exportação, para assentar bem sobre o papel dos documentos) e salva na conta
 * do usuário logado via signatureService. Também exibe a assinatura já salva
 * (preview) e permite substituí-la ou removê-la.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Eraser, PenLine, Save, Trash2 } from 'lucide-react'
import { clearMySignature, fetchMySignature, saveMySignature } from '@/services/signatureService'

interface SignatureDrawPanelProps {
  /** Usuário cuja conta receberá a assinatura (o logado). */
  userId: string
  /** Nome exibido no cabeçalho do painel. */
  userName?: string
}

const CANVAS_WIDTH = 560
const CANVAS_HEIGHT = 180
const STROKE_WIDTH = 2.2

export function SignatureDrawPanel({ userId, userName }: SignatureDrawPanelProps) {
  const { toast } = useToast()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const dirtyRef = useRef(false)
  const [savedSignature, setSavedSignature] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    let active = true
    setSavedSignature(null)
    dirtyRef.current = false
    fetchMySignature().then((sig) => {
      if (active) setSavedSignature(sig)
    })
    return () => {
      active = false
    }
  }, [userId])

  /** Reescala o canvas para a densidade de pixels real sem apagar o desenho. */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0) return
    const dpr = window.devicePixelRatio || 1
    const targetW = Math.round(rect.width * dpr)
    const targetH = Math.round(rect.height * dpr)
    if (canvas.width === targetW && canvas.height === targetH) return

    const snapshot = canvas.width ? canvas.toDataURL() : null
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#171A1F'
    if (snapshot && snapshot.startsWith('data:image/png;base64,')) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, targetW, targetH)
      }
      img.src = snapshot
    }
  }, [])

  useEffect(() => {
    resizeCanvas()
    const handler = () => resizeCanvas()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [resizeCanvas])

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const drawStroke = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) => {
    ctx.lineWidth = STROKE_WIDTH * (window.devicePixelRatio || 1)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)
    const ctx = canvas.getContext('2d')
    const point = getPoint(e)
    if (!ctx || !point) return
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#171A1F'
    drawingRef.current = true
    dirtyRef.current = true
    // Um simples toque/tap desenha um pontinho (assinaturas têm início curto)
    ctx.beginPath()
    ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fillStyle = ctx.strokeStyle
    ctx.fill()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    e.preventDefault()
    const point = getPoint(e)
    const last = lastPointRef.current
    if (point && last) drawStroke(ctx, last, point)
    if (point) lastPointRef.current = point
  }

  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false
    lastPointRef.current = null
    try {
      const canvas = canvasRef.current
      canvas?.releasePointerCapture?.(e.pointerId)
    } catch {
      /* pointer capture já liberado */
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    dirtyRef.current = false
    lastPointRef.current = null
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!dirtyRef.current) {
      toast({
        title: 'Nada para salvar',
        description: 'Desenhe sua assinatura com o mouse antes de salvar.',
        variant: 'destructive',
      })
      return
    }
    setIsSaving(true)
    try {
      const dataUrl = canvas.toDataURL('image/png')
      await saveMySignature(dataUrl)
      setSavedSignature(dataUrl)
      toast({
        title: 'Assinatura salva!',
        description:
          'Ela será exibida automaticamente nos documentos onde você constar como Responsável Técnico.',
      })
    } catch (err) {
      toast({
        title: 'Não foi possível salvar',
        description: err instanceof Error ? err.message : 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await clearMySignature()
      setSavedSignature(null)
      handleClear()
      toast({
        title: 'Assinatura removida',
        description: 'Os documentos voltarão a exibir apenas o nome e o CREA.',
      })
    } catch (err) {
      toast({
        title: 'Não foi possível remover',
        description: err instanceof Error ? err.message : 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Card className="border-[#FF6B1F]/25 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-[#171A1F]">
          <PenLine className="w-4 h-4 text-[#FF6B1F]" />
          Minha assinatura
        </CardTitle>
        <CardDescription className="text-xs text-[#171A1F]/60">
          Desenhe sua assinatura com o mouse ou com o dedo. Ela fica salva na sua conta e aparece
          automaticamente nos documentos onde você é o Responsável Técnico
          {userName ? ` (${userName})` : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {savedSignature && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl border border-[#294C87]/20 bg-[#F8F9FA]">
            <div className="shrink-0 rounded-lg border border-[#171A1F]/10 bg-white p-1.5">
              <img
                src={savedSignature}
                alt="Assinatura salva"
                className="h-12 w-auto max-w-[180px] object-contain"
              />
            </div>
            <div className="text-xs text-[#171A1F]/70">
              <p className="font-semibold text-[#294C87]">Assinatura salva na sua conta</p>
              <p className="text-[11px] text-[#171A1F]/55">
                Desenhe novamente para substituir, ou remova para voltar ao nome + CREA.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border-2 border-dashed border-[#294C87]/30 bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            className="block w-full touch-none cursor-crosshair"
            style={{ height: CANVAS_HEIGHT }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white font-semibold"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? 'Salvando…' : 'Salvar assinatura'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isSaving}
            className="border-[#294C87]/40 text-[#294C87] hover:bg-[#294C87]/5"
          >
            <Eraser className="w-4 h-4 mr-1.5" />
            Limpar
          </Button>
          {savedSignature && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              disabled={isRemoving}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {isRemoving ? 'Removendo…' : 'Remover assinatura'}
            </Button>
          )}
          <span className="text-[11px] text-[#171A1F]/45 ml-auto">
            Traço de caneta • fundo branco
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
