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

/**
 * Retorna as propriedades visuais de badge para a fonte de um insumo
 * "SINAPI", "SICRO", "Biblioteca CONCE", "Usuário", ou sem fonte
 */
export function getSourceBadgeInfo(
  source?: string,
  sourceStatus?: string,
): {
  label: string
  isPending: boolean
  badgeClass: string
  dotClass: string
} {
  const normalized = (source || '').trim().toLowerCase()
  const isSemFonte =
    sourceStatus === 'sem_fonte' ||
    sourceStatus === 'pendente' ||
    normalized.includes('sem fonte') ||
    normalized === '' ||
    normalized === 'pendente'

  if (isSemFonte) {
    return {
      label: source?.trim() || 'sem fonte — preencher manualmente',
      isPending: true,
      badgeClass: 'bg-[#FF6B1F]/15 text-[#FF6B1F] border border-[#FF6B1F]/40 font-bold',
      dotClass: 'bg-[#FF6B1F] animate-pulse',
    }
  }

  if (normalized.includes('sinapi')) {
    return {
      label: 'SINAPI',
      isPending: false,
      badgeClass: 'bg-[#294C87]/15 text-[#294C87] border border-[#294C87]/30 font-semibold',
      dotClass: 'bg-[#294C87]',
    }
  }

  if (normalized.includes('sicro')) {
    return {
      label: 'SICRO',
      isPending: false,
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold',
      dotClass: 'bg-emerald-600',
    }
  }

  if (normalized.includes('conce') || normalized.includes('biblioteca')) {
    return {
      label: 'Biblioteca CONCE',
      isPending: false,
      badgeClass: 'bg-indigo-100 text-indigo-800 border border-indigo-300 font-semibold',
      dotClass: 'bg-indigo-600',
    }
  }

  if (normalized.includes('usuário') || normalized.includes('usuario')) {
    return {
      label: 'Usuário',
      isPending: false,
      badgeClass: 'bg-[#171A1F]/10 text-[#171A1F] border border-[#171A1F]/20 font-semibold',
      dotClass: 'bg-[#171A1F]',
    }
  }

  return {
    label: source || 'Informado',
    isPending: false,
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300 font-semibold',
    dotClass: 'bg-slate-500',
  }
}

/**
 * Higieniza o nome da fonte de composições e insumos para apresentação em documentos exportados
 * (PDF e planilhas). Garante estritamente que termos como "IA", "Agente", "Gerado por IA" etc.
 * nunca apareçam em documentos externos, convertendo-os para fontes neutras técnicas oficiais
 * ("SINAPI", "SICRO", "CONCE" ou "Informado").
 */
export function sanitizeDocumentSource(source?: string): string {
  if (!source) return 'Informado'
  const raw = String(source).trim()
  if (!raw) return 'Informado'

  const normalized = raw.toLowerCase()
  if (normalized.includes('sinapi')) return 'SINAPI'
  if (normalized.includes('sicro')) return 'SICRO'
  if (normalized.includes('conce') || normalized.includes('biblioteca')) return 'CONCE'
  if (normalized.includes('usuário') || normalized.includes('usuario')) return 'Informado'

  // Se contiver qualquer menção a IA, inteligência artificial, agente, robô ou gerado
  if (
    normalized.includes('ia') ||
    normalized.includes('agente') ||
    normalized.includes('agent') ||
    normalized.includes('gerado') ||
    normalized.includes('inteligên') ||
    normalized.includes('inteligenc') ||
    normalized.includes('ai')
  ) {
    return 'SINAPI'
  }

  return raw
}

/**
 * Remove qualquer sufixo ou menção a geração por IA de nomes de autores,
 * títulos de obras e códigos para apresentação em documentos exportados.
 */
export function sanitizeDocumentText(text?: string): string {
  if (!text) return ''
  let sanitized = String(text)
  // Remove menções entre parênteses como "(Gerado com IA CONCE)", "(Agente IA CONCE)", "(Gerado por IA)", etc.
  sanitized = sanitized.replace(/\s*\([^)]*(?:ia|agente|gerad|inteligên)[^)]*\)/gi, '')
  // Remove "via Agente IA", "via Agente", etc.
  sanitized = sanitized.replace(
    /\s*(?:via\s+agente\s+ia|via\s+agente|gerado\s+com\s+ia|gerado\s+por\s+ia)/gi,
    '',
  )
  // Remove códigos como ORC-IA- ou LIC-IA-
  sanitized = sanitized.replace(/\bORC-IA-/gi, 'ORC-')
  sanitized = sanitized.replace(/\bLIC-IA-/gi, 'LIC-')
  // Substitui obra genérica que possa ter ficado
  if (sanitized.toLowerCase().includes('obra planejada via agente')) {
    sanitized = 'Empreendimento de Engenharia Civil'
  }
  // Normaliza ocorrências antigas de 'Denir' como palavra isolada para 'Edenir'
  sanitized = sanitized.replace(/(?<![A-Za-zÀ-ÿ])[Dd]enir(?![A-Za-zÀ-ÿ])/g, 'Edenir')
  return sanitized.trim()
}
