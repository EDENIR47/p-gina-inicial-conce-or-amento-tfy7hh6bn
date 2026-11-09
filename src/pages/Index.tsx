import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, HardHat, Loader2, Ruler, ShieldCheck } from 'lucide-react'
import { ConceLogo, ConceWatermark } from '@/components/ConceLogo'
import { getAuthSession } from '@/lib/mockData'
import { validateAndRefreshPbSession } from '@/services/authService'

/**
 * Página de Entrada Institucional CONCE — rota "/" (pública)
 *
 * SEMPRE renderiza a entrada institucional ao abrir a plataforma, inclusive
 * para usuários com sessão ativa (nenhum redirecionamento automático para
 * /dashboard ou /onboarding).
 *
 * O botão "Acessar o Sistema" decide o destino no clique:
 * - Sessão aparente: valida com validateAndRefreshPbSession (padrão já usado
 *   no app) — válida → /dashboard; vencida/inválida → tela de login.
 * - Sem sessão: tela de login.
 */

type EntryState = 'idle' | 'checking' | 'active' | 'guest'

const COMPANY_NAME = 'CONCE — Serviço de Engenharia e Consultoria LTDA'

export const Index: React.FC = () => {
  const navigate = useNavigate()
  const [state, setState] = useState<EntryState>('idle')
  const [userName, setUserName] = useState<string | null>(null)

  // Detecta (uma vez, na montagem) se há sessão aparente, sem redirecionar.
  // A validade real do token só é checada no clique (authRefresh), para não
  // transformar a entrada em redirecionamento automático.
  useEffect(() => {
    const session = getAuthSession()
    if (session) {
      setUserName(session.name || session.user || null)
      setState('active')
    } else {
      setState('guest')
    }
  }, [])

  const handleAccess = async () => {
    // Sem sessão aparente → login
    if (state !== 'active') {
      navigate('/login')
      return
    }

    // Sessão aparente: valida o token com o mecanismo padrão do app
    // (validateAndRefreshPbSession → authRefresh; vencida = logout + false)
    setState('checking')
    try {
      const isValid = await validateAndRefreshPbSession()
      if (isValid) {
        navigate('/dashboard')
      } else {
        // Token vencido: validateAndRefreshPbSession já limpou o authStore
        // e a sessão legada — trata como sem sessão.
        setUserName(null)
        setState('guest')
        navigate('/login')
      }
    } catch {
      setUserName(null)
      setState('guest')
      navigate('/login')
    }
  }

  const sessionLooksActive = state === 'active' || state === 'checking'

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#171A1F] text-white selection:bg-[#FF6B1F] selection:text-white">
      {/* Brilhos radiais sutis da paleta CONCE */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full blur-[150px] opacity-35 bg-[#294C87]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-[640px] h-[640px] rounded-full blur-[160px] opacity-25 bg-[#FF6B1F]"
        aria-hidden="true"
      />

      {/* Marcas d'água estruturais dos dois "C" no fundo */}
      <ConceWatermark position="top-left" />
      <ConceWatermark position="bottom-right" />

      {/* Conteúdo principal */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        {/* Bloco de marca */}
        <div className="flex flex-col items-center text-center">
          <ConceLogo height={72} glow variant="dark" />
          <h1 className="mt-4 px-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
            Serviço de Engenharia e Consultoria LTDA
          </h1>
        </div>

        {/* Cartão de apresentação institucional */}
        <div className="mt-8 w-full max-w-[560px] rounded-[16px] border border-white/10 bg-white/[0.045] p-6 text-center shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:mt-10 sm:p-8">
          <p className="text-sm sm:text-base leading-relaxed text-white/85">
            A CONCE é uma empresa de{' '}
            <strong className="text-white">engenharia e consultoria</strong> especializada em
            orçamentação de obras. Atuamos em{' '}
            <strong className="text-white">reformas de padrão médio e alto padrão</strong> e em{' '}
            <strong className="text-white">obras públicas</strong>, com planejamento técnico,
            controle de custos e execução acompanhada do início ao fim.
          </p>

          {/* Selos institucionais discretos */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#294C87]/50 bg-[#294C87]/25 px-3 py-1 text-[11px] font-medium text-white/80">
              <Building2 className="h-3.5 w-3.5 text-[#FF6B1F]" />
              Engenharia e Consultoria
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#294C87]/50 bg-[#294C87]/25 px-3 py-1 text-[11px] font-medium text-white/80">
              <Ruler className="h-3.5 w-3.5 text-[#FF6B1F]" />
              Reformas Médio/Alto Padrão
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#294C87]/50 bg-[#294C87]/25 px-3 py-1 text-[11px] font-medium text-white/80">
              <HardHat className="h-3.5 w-3.5 text-[#FF6B1F]" />
              Obras Públicas
            </span>
          </div>

          {/* Cartão de sessão ativa (quando houver sessão aparente) */}
          {sessionLooksActive && (
            <div className="mx-auto mt-6 flex max-w-[420px] items-center justify-center gap-2 rounded-lg border border-[#FF6B1F]/30 bg-[#FF6B1F]/10 px-4 py-2.5 text-sm text-white/90">
              {state === 'checking' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#FF6B1F]" />
                  <span>Validando sua sessão na nuvem CONCE...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-[#FF6B1F]" />
                  <span>
                    Sessão ativa: <strong className="font-semibold">{userName || 'usuário'}</strong>
                  </span>
                </>
              )}
            </div>
          )}

          {/* Botão principal */}
          <button
            type="button"
            onClick={handleAccess}
            disabled={state === 'idle' || state === 'checking'}
            className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#FF6B1F] px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_8px_24px_rgba(255,107,31,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#FF6B1F]/90 hover:shadow-[0_12px_32px_rgba(255,107,31,0.45)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-[280px]"
          >
            {state === 'checking' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verificando sessão...</span>
              </>
            ) : (
              <>
                <span>Acessar o Sistema</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          <p className="mt-4 text-[11px] leading-relaxed text-white/45">
            {sessionLooksActive
              ? 'Você entrará diretamente no painel com sua sessão atual.'
              : 'Você será direcionado à tela de acesso seguro da plataforma.'}
          </p>
        </div>
      </main>

      {/* Rodapé institucional discreto */}
      <footer className="relative z-10 pb-6 text-center">
        <p className="px-4 text-[11px] text-white/40">
          © {new Date().getFullYear()} {COMPANY_NAME}. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  )
}

export default Index
