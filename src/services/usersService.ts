import pb from '@/lib/pocketbase/client'

/**
 * Monta o header Authorization com o token do authStore do PocketBase.
 * O pb.send do SDK não injeta o header automaticamente em rotas customizadas
 * (/backend/v1/*): sem ele o hook rejeita a chamada como anônima (401).
 */
function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = pb.authStore.token
  if (token) {
    headers.Authorization = token
  }
  return headers
}

export interface ManagedUser {
  id: string
  name: string
  email: string
  created: string
}

export interface UsersResponse {
  users: ManagedUser[]
}

/**
 * Lista todas as contas de usuário cadastradas no sistema CONCE.
 * Requer sessão autenticada (o backend rejeita chamadas anônimas).
 */
export async function fetchConceUsers(): Promise<ManagedUser[]> {
  const result: UsersResponse = await pb.send('/backend/v1/users', {
    method: 'GET',
    headers: buildAuthHeaders(),
  })
  return Array.isArray(result?.users) ? result.users : []
}

/**
 * Cria uma nova conta (nome, e-mail e senha com mínimo de 8 caracteres).
 * Somente usuários já autenticados podem criar novas contas — o cadastro
 * público pela tela de login está desativado.
 */
export async function createConceUser(payload: {
  name: string
  email: string
  password: string
}): Promise<ManagedUser> {
  const result = await pb.send<{ user: ManagedUser }>('/backend/v1/users', {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: payload,
  })
  if (!result?.user) {
    throw new Error('Resposta inesperada do servidor ao criar a conta.')
  }
  return result.user
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
