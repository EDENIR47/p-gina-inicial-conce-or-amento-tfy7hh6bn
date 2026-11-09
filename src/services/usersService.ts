import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface ManagedUser {
  id: string
  name: string
  email: string
  created: string
}

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
 * Cria uma nova conta (nome, e-mail e senha com mínimo de 8 caracteres), via
 * API padrão do PocketBase. Somente usuários já autenticados podem criar
 * novas contas — o cadastro público pela tela de login está desativado.
 */
export async function createConceUser(payload: {
  name: string
  email: string
  password: string
}): Promise<ManagedUser> {
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
      verified: true,
    })
    return {
      id: created.id,
      name: created.name || '',
      email: created.email,
      created: created.created,
    }
  } catch (err) {
    // Mensagem amigável em português para os casos conhecidos
    const message = getErrorMessage(err)
    const raw = String((err as any)?.response?.message || message)
    if (raw.toLowerCase().includes('email') && raw.toLowerCase().includes('unique')) {
      throw new Error('Este e-mail já está cadastrado no sistema CONCE.')
    }
    if (raw.toLowerCase().includes('password')) {
      throw new Error('A senha deve ter no mínimo 8 caracteres.')
    }
    throw new Error(message || 'Falha ao criar a conta. Verifique os dados e tente novamente.')
  }
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
