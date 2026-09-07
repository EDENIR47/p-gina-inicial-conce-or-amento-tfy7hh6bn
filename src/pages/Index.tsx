import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthSession, isOnboardingDone } from '@/lib/mockData'
import LoginScreen from './LoginScreen'

/**
 * Página Raiz (Index) — Porta de Entrada do Sistema CONCE
 * Se não houver sessão ativa, renderiza a Tela de Login estilizada.
 * Se houver sessão ativa, redireciona para Onboarding (se pendente) ou Dashboard.
 */
export const Index: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const session = getAuthSession()
    if (session) {
      if (isOnboardingDone()) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [navigate])

  return <LoginScreen />
}

export default Index
