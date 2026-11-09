import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  UserPlus,
  Users as UsersIcon,
} from 'lucide-react'
import { fetchConceUsers, createConceUser, formatUserDate } from '@/services/usersService'
import type { ManagedUser } from '@/services/usersService'

export const UsersScreen: React.FC = () => {
  const navigate = useNavigate()

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // Formulário de criação de conta
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<'name' | 'email' | 'password' | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setIsLoadingList(true)
    setListError(null)
    try {
      const result = await fetchConceUsers()
      setUsers(result)
    } catch (err: any) {
      setListError(err?.message || 'Falha ao carregar a lista de usuários.')
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const clearFieldError = (field: 'name' | 'email' | 'password') => {
    if (errorField === field) {
      setErrorField(null)
      setFormError(null)
    }
    if (successMessage) setSuccessMessage(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setErrorField(null)
    setSuccessMessage(null)

    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    const cleanPass = password.trim()

    if (!cleanName || cleanName.length < 3) {
      setFormError('Informe o nome completo do usuário (mínimo 3 caracteres).')
      setErrorField('name')
      return
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Informe um e-mail válido.')
      setErrorField('email')
      return
    }
    if (cleanPass.length < 8) {
      setFormError('A senha deve ter no mínimo 8 caracteres.')
      setErrorField('password')
      return
    }

    setIsCreating(true)
    try {
      const created = await createConceUser({
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
      })
      setSuccessMessage(`Conta criada com sucesso: ${created.name} (${created.email}).`)
      setName('')
      setEmail('')
      setPassword('')
      await loadUsers()
    } catch (err: any) {
      const detail = err?.message || 'Falha ao criar a conta. Verifique os dados e tente novamente.'
      setFormError(
        detail.includes('Não foi possível criar a conta')
          ? detail
          : `Não foi possível criar a conta. ${detail}`,
      )
    } finally {
      setIsCreating(false)
    }
  }

  const fieldClass = (field: 'name' | 'email' | 'password') =>
    `w-full pl-10 pr-4 py-2.5 bg-white text-sm text-[#171A1F] placeholder:text-[#171A1F]/35 rounded-[8px] border transition-all duration-150 outline-none ${
      errorField === field
        ? 'border-[#C4453C] ring-2 ring-[#C4453C]/20'
        : 'border-[#171A1F]/20 focus:border-[#294C87] focus:ring-2 focus:ring-[#294C87]/25'
    }`

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Cabeçalho da página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#294C87] flex items-center justify-center shadow-md">
            <UsersIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#171A1F] tracking-tight">
              Usuários
            </h1>
            <p className="text-xs sm:text-sm text-[#171A1F]/60">
              Gerenciamento de contas com acesso à plataforma CONCE
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-[#294C87] text-[#294C87] hover:bg-[#294C87] hover:text-white text-xs font-semibold transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Dashboard</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulário de criação de conta */}
        <div className="lg:col-span-2 bg-white rounded-[16px] border-t-4 border-[#294C87] shadow-[0_8px_28px_rgba(23,26,31,0.10)] p-6">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-4 h-4 text-[#FF6B1F]" />
            <h2 className="text-base font-bold text-[#171A1F]">Criar nova conta</h2>
          </div>
          <p className="text-xs text-[#171A1F]/60 mb-5 leading-relaxed">
            Novas contas só podem ser criadas aqui, por um usuário já autenticado. O cadastro
            público pela tela de login está desativado.
          </p>

          {formError && (
            <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-[#C4453C]/10 border border-[#C4453C]/30 text-[#C4453C] text-xs animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{formError}</div>
            </div>
          )}
          {successMessage && (
            <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-[#294C87]/10 border border-[#294C87]/30 text-[#294C87] text-xs animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="user-name"
                className="block text-xs font-semibold uppercase tracking-wider text-[#171A1F]"
              >
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171A1F]/40">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="user-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    clearFieldError('name')
                  }}
                  placeholder="Nome do(a) engenheiro(a)"
                  className={fieldClass('name')}
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label
                htmlFor="user-email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#171A1F]"
              >
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171A1F]/40">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="user-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearFieldError('email')
                  }}
                  placeholder="seuemail@conce.com.br"
                  className={fieldClass('email')}
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label
                htmlFor="user-password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#171A1F]"
              >
                Senha <span className="normal-case text-[#171A1F]/50">(mínimo 8 caracteres)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171A1F]/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    clearFieldError('password')
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-11 py-2.5 bg-white text-sm text-[#171A1F] placeholder:text-[#171A1F]/35 rounded-[8px] border transition-all duration-150 outline-none ${
                    errorField === 'password'
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

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-3 px-4 rounded-[8px] bg-[#171A1F] hover:bg-[#294C87] text-white font-semibold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Criando conta na nuvem...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-[#FF6B1F]" />
                  <span>Criar Conta</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Lista de usuários existentes */}
        <div className="lg:col-span-3 bg-white rounded-[16px] shadow-[0_8px_28px_rgba(23,26,31,0.10)] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#171A1F]">Contas cadastradas</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#294C87]/10 text-[#294C87] text-xs font-bold">
                {users.length}
              </span>
            </div>
            <button
              type="button"
              onClick={loadUsers}
              disabled={isLoadingList}
              className="text-xs text-[#294C87] hover:text-[#FF6B1F] font-semibold underline underline-offset-2 disabled:opacity-50 cursor-pointer"
            >
              Atualizar
            </button>
          </div>

          {isLoadingList ? (
            <div className="py-10 flex items-center justify-center gap-3 text-sm text-[#171A1F]/60">
              <div className="w-4 h-4 border-2 border-[#294C87]/30 border-t-[#294C87] rounded-full animate-spin" />
              <span>Carregando contas...</span>
            </div>
          ) : listError ? (
            <div className="py-8 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-6 h-6 text-[#C4453C]" />
              <p className="text-sm text-[#171A1F]/70">{listError}</p>
              <button
                type="button"
                onClick={loadUsers}
                className="text-xs text-[#294C87] hover:text-[#FF6B1F] font-semibold underline underline-offset-2 cursor-pointer"
              >
                Tentar novamente
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#171A1F]/60">
              Nenhuma conta encontrada. Crie a primeira ao lado.
            </div>
          ) : (
            <ul className="divide-y divide-[#171A1F]/10">
              {users.map((u, idx) => (
                <li key={u.id} className="py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#294C87] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {(u.name?.trim()?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#171A1F] truncate">
                        {u.name || '(sem nome)'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#171A1F]/5 text-[#171A1F]/60 font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="text-xs text-[#171A1F]/60 truncate">{u.email}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] uppercase tracking-wider text-[#171A1F]/40 font-semibold">
                      Criada em
                    </div>
                    <div className="text-xs text-[#171A1F]/70 font-medium">
                      {formatUserDate(u.created)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default UsersScreen
