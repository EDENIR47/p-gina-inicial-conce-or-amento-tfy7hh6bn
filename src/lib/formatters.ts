/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Utilitários de Formatação e Helpers
 */

/**
 * Formata valores monetários no padrão brasileiro (BRL)
 * Exemplo: R$ 18.234.567,89
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formata percentuais com precisão
 * Exemplo: 28% ou 28,5%
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value) + '%'
  )
}

/**
 * Formata data por extenso no padrão brasileiro
 * Exemplo: "Quarta-feira, 14 de maio de 2025"
 */
export function formatCurrentDatePTBR(date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)

  // Primeira letra maiúscula
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

/**
 * Retorna classe ou código de cor da margem de lucro da CONCE
 * >25% Cobalt (#294C87), 15-25% Pumpkin Orange (#FF6B1F), <15% Muted Red (#C4453C)
 */
export function getMarginColor(marginPercent: number): {
  hex: string
  bgClass: string
  textClass: string
  label: string
} {
  if (marginPercent > 25) {
    return {
      hex: '#294C87',
      bgClass: 'bg-[#294C87]',
      textClass: 'text-[#294C87]',
      label: 'Excelente (>25%)',
    }
  }
  if (marginPercent >= 15) {
    return {
      hex: '#FF6B1F',
      bgClass: 'bg-[#FF6B1F]',
      textClass: 'text-[#FF6B1F]',
      label: 'Adequada (15%–25%)',
    }
  }
  return {
    hex: '#C4453C',
    bgClass: 'bg-[#C4453C]',
    textClass: 'text-[#C4453C]',
    label: 'Atenção (<15%)',
  }
}
