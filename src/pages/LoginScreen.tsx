import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { ConceLogo, ConceWatermark } from '@/components/ConceLogo'
import { setAuthSession, getAuthSession, isOnboardingDone, clearDemoData } from '@/lib/mockData'
import { purgeTestBudgetsFromStorage } from '@/lib/budgetsStorage'
import { purgeTestIntelligenceData } from '@/lib/intelligenceStorage'
import { loginWithEmail, registerWithEmail } from '@/services/authService'
import { UserPlus, LogIn } from 'lucide-react'

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate()

  // Modo: login ou cadastro
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [name, setName] = useState('Eng. Edenir Souza da Rosa')
  const [email, setEmail] = useState('engedenirsouza@gmail.com')
  const [password, setPassword] = useState('conce123')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<'name' | 'email' | 'password' | 'all' | null>(null)
  const [isShaking, setIsShaking] = useState(false)
  const [welcomeToast, setWelcomeToast] = useState(false)
  const [loggedUserName, setLoggedUserName] = useState('Edenir')

  // Se já estiver logado, redireciona adequadamente
  useEffect(() => {
    // Garante limpeza de resíduos legados de demonstração na tela de login
    clearDemoData()
    purgeTestBudgetsFromStorage()
    purgeTestIntelligenceData()

    const existingSession = getAuthSession()
    if (existingSession) {
      if (isOnboardingDone()) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [navigate])

  const triggerShake = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 400)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setErrorField(null)

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPass = password.trim()
    const trimmedName = name.trim()

    if (isRegisterMode && !trimmedName) {
      setErrorMessage('Por favor, informe seu nome completo.')
      setErrorField('name')
      triggerShake()
      return
    }

    // Validações inline em português
    if (!trimmedEmail) {
      setErrorMessage('Por favor, informe seu e-mail.')
      setErrorField('email')
      triggerShake()
      return
    }

    if (!trimmedPass) {
      setErrorMessage('Por favor, informe sua senha.')
      setErrorField('password')
      triggerShake()
      return
    }

    if (trimmedPass.length < 8 && isRegisterMode) {
      setErrorMessage('A senha deve ter no mínimo 8 caracteres.')
      setErrorField('password')
      triggerShake()
      return
    }

    setIsLoading(true)

    try {
      let session: any
      if (isRegisterMode) {
        session = await registerWithEmail(trimmedEmail, trimmedPass, trimmedName)
      } else {
        session = await loginWithEmail(trimmedEmail, trimmedPass)
      }

      // Garante limpeza antes de autenticar
      clearDemoData()
      purgeTestBudgetsFromStorage()
      purgeTestIntelligenceData()

      setAuthSession(session)
      setLoggedUserName(session.name || 'Edenir')
      setWelcomeToast(true)

      setTimeout(() => {
        setIsLoading(false)
        if (isOnboardingDone()) {
          navigate('/dashboard')
        } else {
          navigate('/onboarding')
        }
      }, 900)
    } catch (err: any) {
      setIsLoading(false)
      const msg = err?.message || ''
      if (isRegisterMode) {
        if (msg.includes('email') || msg.includes('unique') || msg.includes('existing')) {
          setErrorMessage('Este e-mail já está cadastrado. Alterne para o modo de login.')
          setErrorField('email')
        } else {
          setErrorMessage('Falha ao criar conta. Verifique os dados e tente novamente.')
        }
      } else {
        if (
          msg.includes('400') ||
          msg.includes('Failed to authenticate') ||
          msg.includes('invalid')
        ) {
          setErrorMessage('E-mail ou senha incorretos na nuvem CONCE.')
        } else {
          setErrorMessage('Falha de conexão com a nuvem CONCE. Verifique sua rede.')
        }
      }
      triggerShake()
    }
  }

  const fillDemoCredentials = () => {
    setEmail('engedenirsouza@gmail.com')
    setPassword('conce123')
    setErrorMessage(null)
    setErrorField(null)
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#171A1F] text-[#171A1F] selection:bg-[#FF6B1F] selection:text-white">
      {/* Brilhos radiais sutis da paleta CONCE */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[140px] opacity-40 bg-[#294C87]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[160px] opacity-25 bg-[#FF6B1F]"
        aria-hidden="true"
      />

      {/* Marcas d'água gigantes dos dois "C" em outline branco a 4% no fundo */}
      <ConceWatermark position="top-left" />
      <ConceWatermark position="bottom-right" />

      {/* Toast de boas-vindas Cobalt no topo */}
      {welcomeToast && (
        <div className="fixed top-6 z-50 animate-fade-in-down flex items-center gap-3 px-6 py-3 rounded-full bg-[#294C87] text-white shadow-2xl border border-white/20">
          <CheckCircle2 className="w-5 h-5 text-[#FF6B1F] animate-pulse" />
          <span className="text-sm sm:text-base font-semibold tracking-wide">
            Bem-vindo(a), {loggedUserName}! Acessando sistema CONCE...
          </span>
        </div>
      )}
      {/* Container Centralizado */}
      <div className="relative z-10 w-full max-w-[460px] flex flex-col items-center">
        {/* Bloco de marca acima do card com o wordmark oficial e animação suave */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-2">
            <ConceLogo height={64} glow variant="dark" />
          </div>

          <p className="text-sm sm:text-base italic font-medium text-[#FF6B1F] mt-3 tracking-wide">
            "Conce é conceito. Conce é concreto."
          </p>
        </div>

        {/* Card branco com borda superior Cobalt de 4px */}
        <div
          className={`w-full bg-white rounded-[16px] p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.35)] border-t-4 border-[#294C87] transition-all duration-200 ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          <div className="mb-6 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-[#171A1F] tracking-tight">
              {isRegisterMode ? 'Criar Conta CONCE' : 'Acesso ao Sistema'}
            </h2>
            <p className="text-xs sm:text-sm text-[#171A1F]/70 mt-1">
              {isRegisterMode
                ? 'Cadastre sua conta para salvar orçamentos na nuvem'
                : 'Portal Gerencial de Orçamentos de Obra (Skip Cloud)'}
            </p>
          </div>
          {/* Mensagem de Erro Inline Amigável */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-[#C4453C]/10 border border-[#C4453C]/30 text-[#C4453C] text-xs sm:text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Nome (Apenas modo cadastro) */}
            {isRegisterMode && (
              <div className="space-y-1.5 text-left animate-fade-in">
                <label
                  htmlFor="conce-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#171A1F]"
                >
                  Nome Completo / Engenheiro(a)
                </label>
                <div className="relative">
                  <input
                    id="conce-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (errorField === 'name' || errorField === 'all') {
                        setErrorMessage(null)
                        setErrorField(null)
                      }
                    }}
                    placeholder="Eng. Edenir Souza da Rosa"
                    className={`w-full px-4 py-2.5 bg-white text-sm text-[#171A1F] placeholder:text-[#171A1F]/35 rounded-[8px] border transition-all duration-150 outline-none ${
                      errorField === 'name' || errorField === 'all'
                        ? 'border-[#C4453C] ring-2 ring-[#C4453C]/20'
                        : 'border-[#171A1F]/20 focus:border-[#294C87] focus:ring-2 focus:ring-[#294C87]/25'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Campo E-mail */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="conce-email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#171A1F]"
              >
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171A1F]/40">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="conce-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errorField === 'email' || errorField === 'all') {
                      setErrorMessage(null)
                      setErrorField(null)
                    }
                  }}
                  placeholder="seuemail@conce.com.br"
                  className={`w-full pl-10 pr-4 py-2.5 bg-white text-sm text-[#171A1F] placeholder:text-[#171A1F]/35 rounded-[8px] border transition-all duration-150 outline-none ${
                    errorField === 'email' || errorField === 'all'
                      ? 'border-[#C4453C] ring-2 ring-[#C4453C]/20'
                      : 'border-[#171A1F]/20 focus:border-[#294C87] focus:ring-2 focus:ring-[#294C87]/25'
                  }`}
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="conce-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#171A1F]"
                >
                  Senha
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171A1F]/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="conce-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errorField === 'password' || errorField === 'all') {
                      setErrorMessage(null)
                      setErrorField(null)
                    }
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-11 py-2.5 bg-white text-sm text-[#171A1F] placeholder:text-[#171A1F]/35 rounded-[8px] border transition-all duration-150 outline-none ${
                    errorField === 'password' || errorField === 'all'
                      ? 'border-[#C4453C] ring-2 ring-[#C4453C]/20'
                      : 'border-[#171A1F]/20 focus:border-[#294C87] focus:ring-2 focus:ring-[#294C87]/25'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#171A1F]/45 hover:text-[#294C87] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão Entrar ou Cadastrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-[8px] bg-[#171A1F] hover:bg-[#294C87] text-white font-semibold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {isRegisterMode ? 'Criando conta na nuvem...' : 'Autenticando na nuvem...'}
                  </span>
                </>
              ) : (
                <>
                  <span>{isRegisterMode ? 'Cadastrar e Acessar' : 'Entrar no Sistema'}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-[#FF6B1F]" />
                </>
              )}
            </button>
          </form>

          {/* Alternar entre login e cadastro */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode)
                setErrorMessage(null)
                setErrorField(null)
              }}
              className="text-xs text-[#294C87] hover:text-[#FF6B1F] font-semibold underline underline-offset-2 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              {isRegisterMode ? (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Já tem uma conta? Fazer login</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Novo usuário? Cadastre sua conta</span>
                </>
              )}
            </button>
          </div>

          {/* Dica visível de credenciais autorizadas */}
          <div className="mt-6 pt-4 border-t border-[#171A1F]/10 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#294C87]/10 text-[#294C87] text-xs font-medium mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Nuvem Skip Cloud Conectada</span>
            </div>
            <p className="text-xs text-[#171A1F]/70">Conta de engenheiro provisionada:</p>
            <div
              onClick={fillDemoCredentials}
              className="mt-1.5 p-2 rounded-md bg-[#171A1F]/5 hover:bg-[#171A1F]/10 border border-[#171A1F]/10 cursor-pointer transition-colors text-xs text-left font-mono flex flex-col gap-0.5"
              title="Clique para preencher automaticamente"
            >
              <div className="flex items-center justify-between">
                <span className="text-[#171A1F]/60">E-mail:</span>
                <span className="font-semibold text-[#171A1F]">engedenirsouza@gmail.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#171A1F]/60">Senha:</span>
                <span className="font-semibold text-[#294C87]">conce123</span>
              </div>
            </div>
            <p className="text-[11px] text-[#171A1F]/50 mt-1 italic">
              Clique no quadro para autopreencher as credenciais de acesso.
            </p>
          </div>
        </div>

        {/* Rodapé sutil de segurança */}
        <div className="mt-6 text-center text-xs text-white/50 space-y-1">
          <p>© {new Date().getFullYear()} CONCE — Todos os direitos reservados.</p>
          <p className="text-[11px] text-white/35">
            Plataforma Segura de Orçamentação e Engenharia de Custos
          </p>
        </div>
      </div>
    </div>
  )
}
export default LoginScreen
