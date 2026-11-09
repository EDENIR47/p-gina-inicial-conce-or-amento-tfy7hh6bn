/**
 * Logout silencioso no bootstrap da aplicação.
 *
 * Regra da plataforma CONCE: a sessão NUNCA sobrevive a um recarregamento da
 * página — toda visita começa pedindo e-mail e senha. A sessão vive apenas
 * enquanto a aba estiver aberta: navegação interna (SPA, sem reload) mantém o
 * usuário logado; abrir o endereço ou apertar F5 sempre desloga.
 *
 * É executado UMA VEZ, em main.tsx, antes da renderização do React: limpa o
 * authStore do PocketBase (token persistido em localStorage pelo SDK, chave
 * "pocketbase_auth") e a sessão legada ("conce_auth"). Nenhum dado de
 * orçamento, assinatura ou cadastro é tocado — apenas credenciais.
 *
 * Importa o client PocketBase de forma ESTÁTICA e síncrona: o SDK carrega o
 * token do localStorage na criação do client, e a importação estática garante
 * que a limpeza do authStore em memória aconteça antes de qualquer rota
 * (ex.: ProtectedRoute) seja renderizada.
 */

import pb from '@/lib/pocketbase/client'

const PB_AUTH_STORAGE_KEY = 'pocketbase_auth'
const LEGACY_AUTH_KEY = 'conce_auth'

export function resetPersistedAuthOnBoot(): void {
  if (typeof window === 'undefined') return

  // 1. Limpa o authStore em memória do SDK — pb.authStore.clear() também
  //    remove a chave persistida no localStorage.
  pb.authStore.clear()

  // 2. Remove explicitamente as chaves persistidas (defensivo: cobre o caso
  //    de resíduo em chave com nome divergente e a sessão legada da CONCE).
  try {
    localStorage.removeItem(PB_AUTH_STORAGE_KEY)
  } catch {
    /* storage indisponível — authStore em memória já está limpo */
  }
  try {
    localStorage.removeItem(LEGACY_AUTH_KEY)
  } catch {
    /* ignore */
  }
}
