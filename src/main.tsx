/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { runAbcTests } from './lib/abcAnalysis.test'

// Verificação do motor da Curva ABC no ambiente de desenvolvimento/runtime
if (import.meta.env.DEV) {
  const result = runAbcTests()
  if (!result.passed) {
    console.error('Falha nos testes da Curva ABC:', result.details)
  }
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
