import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  User,
  X,
} from 'lucide-react'
import { updateConceUser } from '@/services/usersService'
import type { ManagedUser } from '@/services/usersService'

export interface EditUserModalProps {
  user: ManagedUser
  isSelf: boolean
  onClose: () => void
  onSaved: (updated: ManagedUser, changedPassword: boolean) => void
}

/**
 * Modal de edição de conta de colaborador — CONCE (nome, e-mail e troca de
 * senha). A gravação vai pela rota de backend PATCH /backend/v1/users/{id}
 * (updateConceUser), que exige sessão válida do usuário logado.
 */
export const EditUserModal: React.FC<EditUserModalProps> = ({ user, isSelf, onClose, onSaved }) => {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<'name' | 'email' | 'password' | 'confirm' | null>(
    null,
  )
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setName(user.name)
    setEmail(user.email)
  }, [user.id])

  const clearFieldError = (field: 'name' | 'email' | 'password' | 'confirm') => {
    if (errorField === field) {
      setErrorField(null)
      setError(null)
    }
    if (successMessage) setSuccessMessage(null)
  }

  const fieldClass = (field: 'name' | 'email' | 'password' | 'confirm') =>
    `w-full pl-10 pr-11 py-2.5 bg-white text-sm text-[#171A1F] placeholder:text-[#171A1F]/35 rounded-[8px] border transition-all duration-150 outline-none ${
      errorField === field
        ? 'border-[#C4453C] ring-2 ring-[#C4453C]/20'
        : 'border-[#171A1F]/20 focus:border-[#294C87] focus:ring-2 focus:ring-[#294C87]/25'
    }`

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setErrorField(null)
    setSuccessMessage(null)

    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    const cleanPass = password.trim()
    const cleanConfirm = confirmPassword.trim()

    if (!cleanName || cleanName.length < 3) {
      setError('Informe o nome completo do usuário (mínimo 3 caracteres).')
      setErrorField('name')
      return
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Informe um e-mail válido.')
      setErrorField('email')
      return
    }
    if (cleanPass !== '' && cleanPass.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      setErrorField('password')
      return
    }
    if (cleanPass !== '' && cleanConfirm !== '' && cleanPass !== cleanConfirm) {
      setError('A confirmação de senha não corresponde à nova senha.')
      setErrorField('confirm')
      return
    }
    if (cleanPass === '' && cleanConfirm !== '') {
      setError('Preencha também a nova senha — o campo de confirmação está preenchido sozinho.')
      setErrorField('password')
      return
    }

    const changedName = cleanName !== user.name
    const changedEmail = cleanEmail !== user.email.toLowerCase()
    const changedPassword = cleanPass !== ''
    if (!changedName && !changedEmail && !changedPassword) {
      setSuccessMessage('Nenhuma alteração para salvar — os dados estão iguais aos atuais.')
      return
    }

    setIsSaving(true)
    try {
      const updated = await updateConceUser(user.id, {
        ...(changedName ? { name: cleanName } : {}),
        ...(changedEmail ? { email: cleanEmail } : {}),
        ...(changedPassword ? { password: cleanPass } : {}),
      })
      setSuccessMessage('Conta atualizada com sucesso!')
      setPassword('')
      setConfirmPassword('')
      onSaved(
        {
          ...updated,
          created: updated.created || user.created,
        },
        changedPassword,
      )
      window.setTimeout(() => onClose(), 1200)
      // Fecha sozinho após a confirmação — a lista já foi atualizada via onSaved.
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (msg.includes('Sessão expirada')) {
        setError('Sessão expirada, faça login novamente para editar contas do sistema CONCE.')
      } else {
        setError(msg || 'Não foi possível salvar as alterações. Tente novamente.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar edição"
        onClick={onClose}
        disabled={isSaving}
        className="absolute inset-0 bg-[#171A1F]/60 backdrop-blur-[2px] cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="relative w-full max-w-md bg-white rounded-[16px] border-t-4 border-[#FF6B1F] shadow-[0_20px_60px_rgba(23,26,31,0.35)] p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#FF6B1F]" />
            <h2 className="text-base font-bold text-[#171A1F]">Editar conta</h2>
            {isSelf && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#294C87]/10 text-[#294C87] font-semibold uppercase tracking-wide">
                Sua conta
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Fechar"
            className="text-[#171A1F]/40 hover:text-[#171A1F] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[#171A1F]/60 mb-5 leading-relaxed">
          Altere os dados do cadastro e, se necessário, defina uma nova senha (mínimo 8 caracteres).
          Deixe a senha em branco para mantê-la como está.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-[#C4453C]/10 border border-[#C4453C]/30 text-[#C4453C] text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{error}</div>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-[#294C87]/10 border border-[#294C87]/30 text-[#294C87] text-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="edit-user-name"
              className="block text-xs font-semibold uppercase tracking-wider text-[#171A1F]"
            >
              Nome Completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171A1F]/40">
                <User className="w-4 h-4" />
              </div>
              <input
                id="edit-user-name"
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
              htmlFor="edit-user-email"
              className="block text-xs font-semibold uppercase tracking-wider text-[#171A1F]"
            >
              E-mail
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171A1F]/40">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="edit-user-email"
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

          <div className="pt-2 border-t border-[#171A1F]/10">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4 text-[#FF6B1F]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#171A1F]">
                Nova senha <span className="normal-case text-[#171A1F]/50">(opcional)</span>
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-user-password"
                  className="block text-xs font-semibold text-[#171A1F]"
                >
                  Nova senha{' '}
                  <span className="font-normal text-[#171A1F]/50">(mínimo 8 caracteres)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171A1F]/40">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="edit-user-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      clearFieldError('password')
                    }}
                    placeholder="Deixe em branco para manter a senha atual"
                    className={fieldClass('password')}
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

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-user-confirm"
                  className="block text-xs font-semibold text-[#171A1F]"
                >
                  Confirmar nova senha{' '}
                  <span className="font-normal text-[#171A1F]/50">(opcional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171A1F]/40">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="edit-user-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      clearFieldError('confirm')
                    }}
                    placeholder="Repita a nova senha (opcional)"
                    className={fieldClass('confirm')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Ocultar confirmação' : 'Exibir confirmação'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#171A1F]/45 hover:text-[#294C87] transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-[8px] border border-[#171A1F]/20 text-[#171A1F]/70 text-sm font-semibold hover:bg-[#171A1F]/5 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-[8px] bg-[#294C87] hover:bg-[#171A1F] text-white text-sm font-semibold tracking-wide shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Alterações</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditUserModal
