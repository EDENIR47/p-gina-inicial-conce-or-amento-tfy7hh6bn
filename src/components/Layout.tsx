import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSpreadsheet,
  Calculator,
  ShoppingBag,
  LogOut,
  Menu,
  X,
  User,
  Shield,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { ConceLogo } from '@/components/ConceLogo'
import { getAuthSession, clearAuthSession } from '@/lib/mockData'
import { AiBudgetModal } from '@/components/budget/AiBudgetModal'
import { StorageCleanModal } from '@/components/budget/StorageCleanModal'
import { InitialMigrationModal } from '@/components/budget/InitialMigrationModal'
import { SyncStatusIndicator } from '@/components/budget/SyncStatusIndicator'
import { FullBudget } from '@/types/budgetEngine'
import { syncEngine } from '@/services/syncEngine'
import { isPbAuthenticated } from '@/services/authService'
import { getStoredFullBudgets, isDemoOrTestBudget } from '@/lib/budgetsStorage'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoutToast, setLogoutToast] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false)
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false)
  const [session, setSession] = useState(() => getAuthSession())

  // Mantém a sessão atualizada se mudar e valida se expirou
  useEffect(() => {
    setSession(getAuthSession())
  }, [location.pathname])

  // Ao abrir o app: se autenticado no PocketBase, tenta puxar do cloud e sugerir migração se cloud vazio e houver locais
  useEffect(() => {
    if (isPbAuthenticated()) {
      // Atualiza os dados de sessão do PocketBase
      setSession(getAuthSession())
      syncEngine
        .pullFromCloud()
        .then((budgets) => {
          // Se após o pull o cloud tiver dados ou o cache foi atualizado, notifica as telas
          window.dispatchEvent(new CustomEvent('conce_budget_updated'))

          // Se o usuário tiver orçamentos locais reais e ainda não migrou para o cloud
          const localReal = getStoredFullBudgets().filter((b) => !isDemoOrTestBudget(b))
          const hasPrompted = sessionStorage.getItem('conce_cloud_migration_prompted')
          if (localReal.length > 0 && !hasPrompted) {
            sessionStorage.setItem('conce_cloud_migration_prompted', 'true')
            // Abre o modal de migração convidando o usuário
            setIsMigrationModalOpen(true)
          }
        })
        .catch(() => {})
    }
  }, [])

  // Efeito frosted-glass / backdrop-blur ao rolar > 20px
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fecha o menu mobile ao navegar
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    // Exibe toast "Sessão encerrada. Até logo!"
    setLogoutToast(true)
    try {
      import('@/services/authService')
        .then(({ logoutPb }) => {
          logoutPb()
        })
        .catch(() => {
          clearAuthSession()
        })
    } catch {
      clearAuthSession()
    }
    setTimeout(() => {
      clearAuthSession()
      setLogoutToast(false)
      navigate('/', { replace: true })
    }, 700)
  }

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/orcamentos', label: 'Orçamentos', icon: FileSpreadsheet },
    { to: '/composicoes', label: 'Composições', icon: Calculator },
    { to: '/cotacoes', label: 'Cotações', icon: ShoppingBag },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-[#171A1F] antialiased">
      {/* Toast de Encerramento de Sessão */}
      {logoutToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-fade-in-down flex items-center gap-3 px-6 py-3 rounded-full bg-[#171A1F] text-white shadow-2xl border border-white/20">
          <CheckCircle2 className="w-5 h-5 text-[#FF6B1F]" />
          <span className="text-sm font-semibold tracking-wide">Sessão encerrada. Até logo!</span>
        </div>
      )}

      {/* HEADER FIXO COM EFEITO FROSTED-GLASS AO ROLAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#171A1F]/90 backdrop-blur-md shadow-md border-b border-white/10 py-2.5'
            : 'bg-[#171A1F] py-3.5 border-b border-[#294C87]/40'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Wordmark CONCE oficial (clicável -> Dashboard) */}
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 group cursor-pointer focus:outline-none transition-transform hover:opacity-95"
            aria-label="Ir para o Dashboard CONCE"
          >
            <ConceLogo height={32} variant="dark" />
          </NavLink>

          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = location.pathname === link.to
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`relative px-3.5 py-2 rounded-md text-xs lg:text-sm font-medium tracking-wide transition-all duration-200 flex items-center gap-2 group ${
                    isActive
                      ? 'text-[#FF6B1F] font-semibold'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#FF6B1F]' : 'text-white/60 group-hover:text-white'
                    }`}
                  />
                  <span>{link.label}</span>
                  {/* Linha indicadora inferior em Pumpkin Orange */}
                  <span
                    className={`absolute bottom-0 left-3 right-3 h-[2px] bg-[#FF6B1F] rounded-full transition-transform duration-200 ${
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-75'
                    }`}
                  />
                </NavLink>
              )
            })}
          </nav>

          {/* Lado Direito: Indicador Cloud, Perfil e Botão Sair */}
          <div className="hidden md:flex items-center gap-3">
            {/* Indicador de Status da Nuvem Skip Cloud */}
            <SyncStatusIndicator onOpenMigration={() => setIsMigrationModalOpen(true)} />

            {/* Botão de Destaque ✨ Gerar com IA no Header Desktop */}
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF6B1F] to-[#FF8945] hover:from-[#e55d17] hover:to-[#FF6B1F] text-white text-xs font-bold tracking-wide shadow-md shadow-[#FF6B1F]/20 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer border border-white/20"
              title="Gerar orçamento técnico por prompt com inteligência artificial"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-white" />
              <span>✨ Gerar com IA</span>
            </button>

            {/* Ação Limpar Dados de Demonstração / Obras Fictícias */}
            <button
              type="button"
              onClick={() => setIsCleanModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs font-semibold cursor-pointer border border-white/10"
              title="Limpeza de dados de demonstração e manutenção do armazenamento local"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span className="hidden xl:inline">Limpar Demo</span>
            </button>

            {/* Identificação do Usuário */}
            {session && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white">
                <div className="w-5 h-5 rounded-full bg-[#294C87] text-white flex items-center justify-center font-bold text-[10px]">
                  {(session.name?.trim()?.[0] || 'E').toUpperCase()}
                </div>
                <span className="font-semibold">{session.name}</span>
                <span className="text-[10px] text-[#FF6B1F] font-mono hidden lg:inline">
                  (CREA Ativo)
                </span>
              </div>
            )}

            {/* Botão Sair estilizado como outlined pill em Pumpkin Orange */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-[#FF6B1F] text-[#FF6B1F] hover:bg-[#FF6B1F] hover:text-white transition-all duration-200 text-xs font-semibold tracking-wide cursor-pointer group active:scale-95"
              title="Encerrar sessão no sistema"
            >
              <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Sair</span>
            </button>
          </div>

          {/* Botão Hambúrguer Mobile */}
          <div className="flex items-center md:hidden gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors focus:outline-none"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* DRAWER / MENU MOBILE SLIDE-DOWN */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#171A1F] border-t border-white/10 px-4 pt-3 pb-5 shadow-2xl animate-fade-in-down">
            {/* Botão de Destaque Mobile ✨ Gerar com IA */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setIsAiModalOpen(true)
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B1F] to-[#FF8945] text-white text-xs font-bold shadow-md active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>✨ Gerar Orçamento com IA</span>
              </button>
            </div>

            <div className="space-y-1 mb-4">
              {navLinks.map((link, idx) => {
                const Icon = link.icon
                const isActive = location.pathname === link.to
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#FF6B1F]/15 text-[#FF6B1F] font-bold border-l-4 border-[#FF6B1F]'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </NavLink>
                )
              })}
            </div>

            {/* Indicador e Ação Migrar no Mobile */}
            <div className="mb-3 flex items-center justify-between px-2">
              <SyncStatusIndicator
                onOpenMigration={() => {
                  setMobileMenuOpen(false)
                  setIsMigrationModalOpen(true)
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setIsMigrationModalOpen(true)
                }}
                className="text-xs text-[#FF6B1F] font-bold underline"
              >
                Migrar Nuvem
              </button>
            </div>

            {/* Ação Limpar Dados no Mobile */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setIsCleanModalOpen(true)
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold"
              >
                <Sparkles className="w-4 h-4 text-[#FF6B1F]" />
                <span>Limpar Dados de Demonstração</span>
              </button>
            </div>

            {/* Usuário e Logout no Mobile */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div className="text-xs text-white/80">
                <div className="font-semibold text-white">
                  {session?.name || 'Eng. Edenir Souza da Rosa'}
                </div>
                <div className="text-[10px] text-[#FF6B1F]">
                  {session?.user || 'engedenirsouza@gmail.com'}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#FF6B1F] text-[#FF6B1F] text-xs font-semibold cursor-pointer active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL (COM PADDING TOP COMPENSANDO HEADER FIXO) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12">
        <Outlet />
      </main>

      {/* MODAL GLOBAL DE MIGRAÇÃO PARA O SKIP CLOUD */}
      <InitialMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent('conce_budget_updated'))
        }}
      />

      {/* MODAL GLOBAL DE GERAÇÃO POR PROMPT COM IA */}
      <AiBudgetModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onBudgetCreated={(createdBudget: FullBudget) => {
          navigate('/orcamentos', { state: { openBudgetId: createdBudget.id } })
        }}
      />

      {/* MODAL GLOBAL DE LIMPEZA DE DADOS DE DEMONSTRAÇÃO */}
      <StorageCleanModal
        isOpen={isCleanModalOpen}
        onClose={() => setIsCleanModalOpen(false)}
        onCleanSuccess={() => {
          // Dispara evento customizado para recarregar orçamentos onde quer que estejam montados
          window.dispatchEvent(new CustomEvent('conce_budget_updated'))
        }}
      />

      {/* RODAPÉ GLOBAL DO DASHBOARD */}
      <footer className="w-full bg-[#171A1F] text-white border-t border-[#294C87]/40 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <ConceLogo height={22} variant="dark" />
            <span className="text-white/40 hidden sm:inline">•</span>
            <span className="italic text-[#FF6B1F] font-medium">
              "Conce é conceito. Conce é concreto."
            </span>
          </div>

          <div className="text-center sm:text-right text-white/50 space-y-0.5">
            <p>© {new Date().getFullYear()} CONCE — Serviço de Engenharia e Consultoria LTDA.</p>
            <p className="text-[11px] text-white/45">
              CNPJ: 57.149.101/0001-46 • RT: Eng. Edenir Souza da Rosa - CREA/RS-252397
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
