/**
 * CONCE — Assinatura manuscrita do Responsável Técnico.
 *
 * A assinatura é desenhada na tela Usuários (/usuarios) e fica salva na CONTA
 * do usuário logado no PocketBase (campo "signatureData" da coleção users —
 * data-URL PNG em base64). Os documentos onde o nome do usuário aparece como
 * Responsável Técnico (Proposta Técnica e Comercial, PDFs de exportação e
 * Memorial Descritivo) exibem a imagem automaticamente.
 *
 * Regra de acesso no backend (migração 0025): cada usuário lê/grava apenas a
 * PRÓPRIA assinatura (update "id = @request.auth.id" da coleção users).
 */
import pb from '@/lib/pocketbase/client'
import { ensureFreshSession, SESSION_EXPIRED_MESSAGE } from '@/services/usersService'

const MAX_SIGNATURE_LENGTH = 200_000 // ~200 kB de data-URL é folga para um traço de caneta

export interface SignatureOwner {
  id: string
  signatureData: string
}

function isDataUrlPng(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/png;base64,')
}

function normalizeSignatureData(value: unknown): string | null {
  if (!isDataUrlPng(value)) return null
  if (value.length > MAX_SIGNATURE_LENGTH) return null
  return value
}

/**
 * Lê a assinatura salva na conta do USUÁRIO LOGADO.
 * Retorna null quando não há sessão válida, quando a conta ainda não tem
 * assinatura ou quando o valor gravado não é um data-URL PNG válido.
 */
export async function fetchMySignature(): Promise<string | null> {
  try {
    if (!pb.authStore.isValid || !pb.authStore.record?.id) return null
    const record = await pb
      .collection('users')
      .getOne<{ signatureData?: string }>(pb.authStore.record.id, { fields: 'id,signatureData' })
    return normalizeSignatureData(record?.signatureData)
  } catch {
    // Sem assinatura (ou sem acesso neste momento) os documentos seguem como
    // hoje: apenas nome + CREA — nunca um erro visível para o usuário.
    return null
  }
}

/**
 * Lê a assinatura de um usuário ESPECÍFICO (ex.: o responsável técnico
 * referenciado no documento). Sem sessão válida, ou quando a conta não tem
 * assinatura, retorna null — fallback é a assinatura do usuário logado.
 */
export async function fetchUserSignature(userId: string): Promise<string | null> {
  if (!userId) return null
  try {
    if (!pb.authStore.isValid) return null
    const record = await pb.collection('users').getOne<{ signatureData?: string }>(userId, {
      fields: 'id,signatureData',
    })
    return normalizeSignatureData(record?.signatureData)
  } catch {
    return null
  }
}

/**
 * Salva (ou substitui) a assinatura do usuário logado. A coleção users só
 * permite update no próprio registro, então a gravação é sempre na conta
 * autenticada — o id vem do authStore, nunca do chamador.
 */
export async function saveMySignature(signatureData: string): Promise<void> {
  const clean = normalizeSignatureData(signatureData)
  if (!clean) {
    throw new Error('Assinatura inválida. Desenhe novamente e tente salvar (formato PNG esperado).')
  }
  try {
    await ensureFreshSession()
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : SESSION_EXPIRED_MESSAGE)
  }

  const userId = pb.authStore.record?.id
  if (!userId) throw new Error(SESSION_EXPIRED_MESSAGE)

  try {
    await pb.collection('users').update(userId, { signatureData: clean })
  } catch (err: any) {
    const status = err?.status || err?.response?.status
    if (status === 401 || status === 403 || status === 400) {
      throw new Error(
        'Não foi possível salvar a assinatura. Sua sessão pode ter expirado — faça login novamente.',
      )
    }
    throw new Error(
      'Falha ao salvar a assinatura na nuvem. Verifique sua conexão e tente novamente.',
    )
  }
}

/** Remove a assinatura salva da conta do usuário logado. */
export async function clearMySignature(): Promise<void> {
  try {
    await ensureFreshSession()
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : SESSION_EXPIRED_MESSAGE)
  }
  const userId = pb.authStore.record?.id
  if (!userId) throw new Error(SESSION_EXPIRED_MESSAGE)
  try {
    await pb.collection('users').update(userId, { signatureData: '' })
  } catch (err: any) {
    const status = err?.status || err?.response?.status
    if (status === 401 || status === 403 || status === 400) {
      throw new Error(
        'Não foi possível remover a assinatura. Sua sessão pode ter expirado — faça login novamente.',
      )
    }
    throw new Error(
      'Falha ao remover a assinatura da nuvem. Verifique sua conexão e tente novamente.',
    )
  }
}
