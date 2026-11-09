import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getAuthSession } from '@/lib/mockData'

/**
 * Guarda de rota: verifica se há sessão gravada no localStorage.
 * Se não houver sessão ativa, redireciona para a tela de login (/login).
 */
export const ProtectedRoute: React.FC = () => {
  const session = getAuthSession()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
export default ProtectedRoute
