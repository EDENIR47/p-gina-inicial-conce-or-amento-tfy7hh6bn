/* Main App Component - Handles routing (using react-router-dom) */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import OnboardingScreen from './pages/OnboardingScreen'
import DashboardScreen from './pages/DashboardScreen'
import StubPage from './pages/StubPage'
import ProtectedRoute from './components/ProtectedRoute'
import BudgetsScreen from './pages/BudgetsScreen'
import CompositionsLibraryPage from './pages/CompositionsLibraryPage'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <Routes>
        {/* Rota Raiz: Tela de Login */}
        <Route path="/" element={<Index />} />

        {/* Rota de Onboarding (protegida pela sessão) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingScreen />} />
        </Route>

        {/* Rotas Protegidas sob o Layout Global (Header Fixo + Footer) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardScreen />} />
            {/* Núcleo Funcional Real CONCE: Orçamentos com hierarquia de 4 níveis */}
            <Route path="/orcamentos" element={<BudgetsScreen />} />
            {/* Biblioteca Técnica de Composições CONCE com versionamento e importação */}
            <Route path="/composicoes" element={<CompositionsLibraryPage />} />
            {/* Cotações permanece como módulo planejado */}
            <Route path="/cotacoes" element={<StubPage />} />
          </Route>
        </Route>

        {/* 404 para rotas desconhecidas */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
