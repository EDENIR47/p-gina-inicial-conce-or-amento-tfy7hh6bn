import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getAuthSession } from '@/lib/mockData'

/**
 * Guarda de rota simulada: verifica se há sessão gravada no localStorage
 * Se não houver sessão ativa, redireciona para a raiz de login (/)
 */
export const ProtectedRoute: React.FC = () => {
  const session = getAuthSession()

  if (!session) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
export default ProtectedRoute
