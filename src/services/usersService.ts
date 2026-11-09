import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import type { FieldErrors } from '@/lib/pocketbase/errors'

export interface ManagedUser {
  id: string
  name: string
  email: string
  created: string
}

/** Erro amigável de SESSÃO — a UI usa isso para pedir novo login. */
export const SESSION_EXPIRED_MESSAGE = 'Sessão expirada, faça login novamente.'

/**
 * Lista todas as contas de usuário cadastradas no sistema CONCE, via API
 * padrão do PocketBase (a rota customizada /backend/v1/users não é mais
 * usada). Requer sessão autenticada — a regra "list" da coleção users é
 * "@request.auth.id != ''".
 */
export async function fetchConceUsers(): Promise<ManagedUser[]> {
  const records: { id: string; name: string; email: string; created: string }[] = []
  let page = 1
  // Percorre as páginas até cobrir todas as contas (200 por página é o limite
  // do PocketBase; a equipe da CONCE é pequena, mas o loop é seguro).
  for (;;) {
    const result = await pb.collection('users').getList<{
      id: string
      name: string
      email: string
      created: string
    }>(page, 200, { sort: '-created' })
    records.push(...result.items)
    if (page >= result.totalPages) break
    page += 1
  }
  return records.map((r) => ({
    id: r.id,
    name: r.name || '',
    email: r.email,
    created: r.created,
  }))
}

/**
 * Garante que o cliente PocketBase tem uma sessão VÁLIDA antes de operações
 * que a regra da coleção exige (ex.: create em users). Faz authRefresh com o
 * token atual; se falhar, limpa o authStore para não insistir com token morto.
 */
export async function ensureFreshSession(): Promise<void> {
  if (!pb.authStore.isValid || !pb.authStore.token) {
    throw new Error(SESSION_EXPIRED_MESSAGE)
  }
  try {
    await pb.collection('users').authRefresh()
  } catch {
    // Token inválido/expirado no servidor — limpa para evitar novas falhas.
    pb.authStore.clear()
    throw new Error(SESSION_EXPIRED_MESSAGE)
  }
}

/**
 * Cria uma nova conta (nome, e-mail e senha com mínimo de 8 caracteres), via
 * API padrão do PocketBase. Somente usuários já autenticados podem criar
 * novas contas — o cadastro público pela tela de login está desativado.
 */
export async function createConceUser(payload: {
  name: string
  email: string
  password: string
}): Promise<ManagedUser> {
  // Valida a sessão ANTES de tentar criar: com token expirado, o PocketBase
  // responde 400 genérico "Failed to create record." (regra create falsa)
  // sem nenhum field error — não é erro de validação de campo.
  await ensureFreshSession()
  try {
    const created = await pb.collection('users').create<{
      id: string
      name: string
      email: string
      created: string
    }>({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      passwordConfirm: payload.password,
    })
    return {
      id: created.id,
      name: created.name || '',
      email: created.email,
      created: created.created,
    }
  } catch (err) {
    // Diagnóstico campo a campo do erro de validação do PocketBase
    // (err.response.data = { campo: { message } }), traduzido para pt-BR.
    throw new Error(buildFriendlyCreationError(err))
  }
}

/**
 * Atualiza o cadastro de uma conta existente (nome, e-mail e/ou troca de
 * senha), via rota de backend PATCH /backend/v1/users/{id}. A coleção users
 * permite update apenas no próprio registro, então a edição de terceiros
 * precisa passar por essa rota — ela valida a sessão do chamador (token do
 * authStore no header Authorization) e grava com poderes de superuser.
 */
export async function updateConceUser(
  userId: string,
  payload: {
    name?: string
    email?: string
    password?: string
  },
): Promise<ManagedUser> {
  // Sessão precisa estar fresca: a rota valida o token do header.
  await ensureFreshSession()

  const body: Record<string, string> = {}
  if (payload.name !== undefined) body.name = payload.name
  if (payload.email !== undefined) body.email = payload.email
  if (payload.password !== undefined && payload.password !== '') body.password = payload.password
  if (Object.keys(body).length === 0) {
    throw new Error('Nada a atualizar: informe nome, e-mail e/ou nova senha.')
  }

  let response: Response
  try {
    response = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    )
  }

  let data: any = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SESSION_EXPIRED_MESSAGE)
    }
    throw new Error(friendlyUpdateError(data, response.status))
  }

  const user = data?.user
  if (!user || !user.id) {
    throw new Error('Resposta inesperada do servidor ao salvar as alterações da conta.')
  }
  return {
    id: user.id,
    name: user.name || '',
    email: user.email,
    created: user.created || '',
  }
}

/**
 * Traduz a falha da rota de edição para uma mensagem amigável em pt-BR
 * (o próprio backend já devolve erros em português; aqui garantimos texto
 * padrão caso venha algo vazio ou inesperado).
 */
function friendlyUpdateError(data: any, status: number): string {
  const raw = String(data?.error || '').trim()
  if (raw) {
    const lower = raw.toLowerCase()
    if (lower.includes('já está cadastrado')) {
      return 'Este e-mail já está cadastrado no sistema CONCE.'
    }
    if (lower.includes('mínimo 8')) {
      return 'A senha deve ter no mínimo 8 caracteres.'
    }
    if (lower.includes('e-mail válido') || lower.includes('email válido')) {
      return 'Informe um e-mail válido.'
    }
    if (lower.includes('usuário não encontrado')) {
      return 'Usuário não encontrado no sistema CONCE. Atualize a lista e tente novamente.'
    }
    return raw
  }
  if (status === 404) return 'Usuário não encontrado no sistema CONCE.'
  if (status === 400) return 'Não foi possível salvar as alterações. Verifique os dados informados.'
  if (status >= 500) return 'Erro interno do servidor ao salvar as alterações. Tente novamente.'
  return `Não foi possível salvar as alterações da conta (status HTTP ${status}).`
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  email: 'E-mail',
  password: 'Senha',
  passwordConfirm: 'Confirmação de senha',
  verified: 'Verificação de e-mail',
}

/** Traduz uma mensagem de validação padrão do PocketBase para pt-BR. */
function translateValidationMessage(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('must be a valid email')) return 'informe um e-mail válido.'
  if (lower.includes('value must be a valid email')) return 'informe um e-mail válido.'
  if (lower.includes('unique')) return 'este e-mail já está cadastrado no sistema CONCE.'
  if (lower.includes('cannot be blank')) return 'campo obrigatório.'
  if (lower.includes('requires 8 or more characters')) return 'deve ter no mínimo 8 caracteres.'
  if (lower.includes('password') && lower.includes('too short'))
    return 'deve ter no mínimo 8 caracteres.'
  if (lower.includes('min') && lower.includes('character'))
    return 'deve ter no mínimo 8 caracteres.'
  return raw
}

/**
 * Monta a mensagem de erro amigável em pt-BR para falha de criação de conta,
 * priorizando os erros de validação campo a campo (err.response.data).
 */
function buildFriendlyCreationError(err: unknown): string {
  const fieldErrors: FieldErrors = extractFieldErrors(err)
  const entries: [string, string][] = Object.entries(fieldErrors)
  if (entries.length > 0) {
    const parts = entries.map(([field, message]) => {
      const label = FIELD_LABELS[field] || field
      const translated = translateValidationMessage(message)
      if (field === 'email' && translated.includes('já está cadastrado')) {
        return 'Este e-mail já está cadastrado no sistema CONCE.'
      }
      return `${label}: ${translated}`
    })
    // Se o único problema for o e-mail duplicado, mostra a frase completa
    if (parts.length === 1 && parts[0].includes('já está cadastrado')) return parts[0]
    return `Não foi possível criar a conta. ${parts.join(' ')}`
  }
  // Sem erros de campo: mostra a mensagem crua COMPLETA do servidor, com o
  // corpo da resposta serializado quando existir — nunca ficar às cegas.
  const message = getErrorMessage(err)
  const response = (err as { response?: { message?: string; data?: unknown; status?: number } })
    ?.response
  const raw = String(response?.message || message || '')
  const lower = raw.toLowerCase()
  if (lower.includes('email') && lower.includes('unique')) {
    return 'Este e-mail já está cadastrado no sistema CONCE.'
  }
  if (lower.includes('password') && (lower.includes('short') || lower.includes('8'))) {
    return 'A senha deve ter no mínimo 8 caracteres.'
  }
  // 400 genérico sem field data = regra create falhou => sessão não aceita.
  const status = response?.status
  if (
    status === 400 &&
    raw.includes('Failed to create record') &&
    !(response?.data && Object.keys(response.data as object).length > 0)
  ) {
    return (
      SESSION_EXPIRED_MESSAGE + ' (o servidor não reconheceu sua sessão no momento da criação).'
    )
  }
  const detailBits: string[] = []
  if (response?.data && Object.keys(response.data as object).length > 0) {
    try {
      detailBits.push('detalhes: ' + JSON.stringify(response.data))
    } catch {
      // ignora — corpo não serializável
    }
  }
  if (status) {
    detailBits.push(`status HTTP ${status}`)
  }
  const detail = detailBits.length > 0 ? ` (${detailBits.join('; ')})` : ''
  return (raw || 'Falha ao criar a conta. Verifique os dados e tente novamente.') + detail
}

/** Formata a data de criação da conta em pt-BR. */
export function formatUserDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}
