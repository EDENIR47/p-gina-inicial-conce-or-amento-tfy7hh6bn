import pb from '@/lib/pocketbase/client'
import { ConceAuthSession } from '@/types/conce'
import { normalizeUserName } from '@/lib/mockData'

const LEGACY_AUTH_KEY = 'conce_auth'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
}

/**
 * Retorna o usuário PocketBase autenticado no client se houver token válido
 */
export function getCurrentPbUser(): AuthUser | null {
  const model = pb.authStore.record
  if (!pb.authStore.isValid || !model) return null

  return {
    id: model.id,
    email: model.email,
    name: normalizeUserName((model as any).name || 'Eng. Edenir Souza da Rosa'),
    avatar: (model as any).avatar,
  }
}

/**
 * Converte o authStore atual do PocketBase para a estrutura ConceAuthSession utilizada no app
 */
export function getPbAuthSession(): ConceAuthSession | null {
  const user = getCurrentPbUser()
  if (!user) {
    return null
  }

  return {
    user: user.email,
    name: user.name,
    role: 'Engenheiro Civil & Orçamentista Responsável',
    crea: 'CREA/RS-252397',
    loggedIn: true,
    loginTime: new Date().toISOString(),
  }
}

/**
 * Valida a sessão PocketBase persistida.
 * Se houver token mas for inválido ou expirado (authRefresh falhar),
 * limpa o authStore, limpa a sessão local e retorna false.
 * Se o refresh for bem-sucedido, sincroniza o storage local e retorna true.
 */
export async function validateAndRefreshPbSession(): Promise<boolean> {
  // Se não há token no PocketBase
  if (!pb.authStore.isValid || !pb.authStore.token) {
    // Verifica se há resíduo no localStorage legado sem token PocketBase correspondente
    if (typeof window !== 'undefined') {
      const pbCookie = localStorage.getItem('pocketbase_auth')
      if (!pbCookie) {
        logoutPb()
        return false
      }
    }
    return false
  }

  try {
    const authData = await pb.collection('users').authRefresh()
    if (authData?.record) {
      const normName = normalizeUserName(
        (authData.record as any)?.name || 'Eng. Edenir Souza da Rosa',
      )
      const session: ConceAuthSession = {
        user: authData.record.email,
        name: normName,
        role: 'Engenheiro Civil & Orçamentista Responsável',
        crea: 'CREA/RS-252397',
        loggedIn: true,
        loginTime: new Date().toISOString(),
      }
      try {
        localStorage.setItem(LEGACY_AUTH_KEY, JSON.stringify(session))
      } catch {
        /* ignore */
      }
      return true
    }
    return true
  } catch (err) {
    console.warn('Sessão PocketBase inválida ou expirada. Limpando credenciais:', err)
    logoutPb()
    return false
  }
}

/**
 * Autentica usuário com e-mail e senha no PocketBase
 */
export async function loginWithEmail(email: string, pass: string): Promise<ConceAuthSession> {
  const cleanEmail = email.trim().toLowerCase()
  const cleanPass = pass.trim()

  const authData = await pb.collection('users').authWithPassword(cleanEmail, cleanPass)
  const userRecord = authData.record

  const normalizedName = normalizeUserName((userRecord as any)?.name || 'Eng. Edenir Souza da Rosa')

  const session: ConceAuthSession = {
    user: userRecord.email,
    name: normalizedName,
    role: 'Engenheiro Civil & Orçamentista Responsável',
    crea: 'CREA/RS-252397',
    loggedIn: true,
    loginTime: new Date().toISOString(),
  }

  // Mantém retrocompatibilidade com o storage legado para componentes síncronos
  try {
    localStorage.setItem(LEGACY_AUTH_KEY, JSON.stringify(session))
  } catch {
    /* intentionally ignored */
  }

  return session
}

/**
 * Cria nova conta com e-mail, senha e nome
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  name: string,
): Promise<ConceAuthSession> {
  const cleanEmail = email.trim().toLowerCase()
  const cleanPass = pass.trim()
  const cleanName = normalizeUserName(name.trim() || 'Engenheiro(a) Orçamentista')

  await pb.collection('users').create({
    email: cleanEmail,
    password: cleanPass,
    passwordConfirm: cleanPass,
    name: cleanName,
  })

  // Logo em seguida autentica
  return loginWithEmail(cleanEmail, cleanPass)
}

/**
 * Encerra a sessão atual (limpa authStore e localStorage legado)
 */
export function logoutPb(): void {
  pb.authStore.clear()
  try {
    localStorage.removeItem(LEGACY_AUTH_KEY)
  } catch {
    /* intentionally ignored */
  }
}

/**
 * Retorna se o usuário está atualmente autenticado no PocketBase
 */
export function isPbAuthenticated(): boolean {
  return pb.authStore.isValid && !!pb.authStore.record
}
