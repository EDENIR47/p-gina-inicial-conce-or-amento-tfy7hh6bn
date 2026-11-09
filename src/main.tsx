/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { runAbcTests } from './lib/abcAnalysis.test'
import { purgeTestBudgetsFromStorage } from './lib/budgetsStorage'
import { purgeTestIntelligenceData } from './lib/intelligenceStorage'
import { clearDemoData } from './lib/mockData'
import { resetPersistedAuthOnBoot } from './lib/bootstrapAuthReset'

// Logout silencioso: toda visita começa SEM sessão (pede e-mail e senha).
// Executa ANTES do expurgo e da renderização do React — a sessão vive apenas
// enquanto a aba está aberta; recarregar a página sempre desloga.
try {
  resetPersistedAuthOnBoot()
} catch (err) {
  console.error('Erro no logout silencioso de bootstrap:', err)
}

// Expurgo de dados demo síncrono no bootstrap real ANTES da inicialização do React
try {
  clearDemoData()
  purgeTestBudgetsFromStorage()
  purgeTestIntelligenceData()
} catch (err) {
  console.error('Erro no expurgo de bootstrap:', err)
}

// Verificação do motor da Curva ABC no ambiente de desenvolvimento/runtime
if (import.meta.env.DEV) {
  const result = runAbcTests()
  if (!result.passed) {
    console.error('Falha nos testes da Curva ABC:', result.details)
  }
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
