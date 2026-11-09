/**
 * CONCE — Assinatura do Responsável Técnico nos documentos.
 *
 * A assinatura é desenhada na tela Usuários (/usuarios) e fica salva na conta
 * do usuário logado (campo "signatureData" da coleção users — data-URL PNG).
 * Este hook carrega a assinatura do usuário logado (com cache de módulo) e o
 * <RtSignatureImage /> renderiza a imagem com tamanho discreto de assinatura
 * real no A4 (~14mm de altura). Sem assinatura salva, os documentos seguem
 * exatamente como hoje: apenas nome + CREA, sem espaço vazio nem erro.
 */
import { useEffect, useState } from 'react'
import { fetchMySignature } from '@/services/signatureService'

let cachedSignature: string | null = null
let cacheLoaded = false

export function useRtSignature(): string | null {
  const [signature, setSignature] = useState<string | null>(cachedSignature)

  useEffect(() => {
    if (cacheLoaded) return
    let active = true
    fetchMySignature().then((sig) => {
      cachedSignature = sig
      cacheLoaded = true
      if (active) setSignature(sig)
    })
    return () => {
      active = false
    }
  }, [])

  return signature
}

interface RtSignatureImageProps {
  signature: string | null
  /** Alinhamento do bloco da assinatura dentro do documento. */
  align?: 'center' | 'left'
}

export function RtSignatureImage({ signature, align = 'center' }: RtSignatureImageProps) {
  if (!signature) return null
  return (
    <img
      src={signature}
      alt="Assinatura do Responsável Técnico"
      className={`h-12 sm:h-14 print:h-[14mm] w-auto object-contain mb-1 ${
        align === 'center' ? 'mx-auto' : ''
      }`}
    />
  )
}
