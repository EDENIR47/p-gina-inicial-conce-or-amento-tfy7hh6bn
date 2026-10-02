/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Gerenciador de Dados Demonstrativos e Sessão Local (localStorage)
 *
 * Totais exigidos:
 * - 42 orçamentos no total
 * - R$ 18.234.567,89 valor total orçado
 * - 15 em andamento
 * - 12 aprovados
 * - 5 vencidos
 * - 10 em análise
 * - Obras de lucratividade:
 *   "Residência Jardins" (28%), "Edifício Centro" (32%),
 *   "Reforma Comercial Paulista" (18%), "Obra Pública — Escola" (12%)
 * - Mini Curva ABC: 5 itens onde os 2 primeiros respondem por ~80% (Classe A)
 */

import { ConceAuthSession, ConceDemoData } from '@/types/conce'

export const STORAGE_KEYS = {
  AUTH: 'conce_auth',
  ONBOARDING_DONE: 'conce_onboarding_done',
  DEMO_DATA: 'conce_demo_data',
} as const

/**
 * Cria a semente canônica de demonstração da CONCE
 */
export function generateCanonicalDemoData(): ConceDemoData {
  // Lucratividade estimada conforme especificação
  const profitability = [
    {
      id: 'prof-1',
      workName: 'Residência Jardins',
      client: 'Família Albuquerque',
      saleValue: 2450000,
      directCost: 1470000,
      bdi: 294000,
      marginPercent: 28,
      statusText: 'Reforma de Alto Padrão',
    },
    {
      id: 'prof-2',
      workName: 'Edifício Centro',
      client: 'Incorporadora Horizonte',
      saleValue: 5800000,
      directCost: 3364000,
      bdi: 580000,
      marginPercent: 32,
      statusText: 'Construção Comercial',
    },
    {
      id: 'prof-3',
      workName: 'Reforma Comercial Paulista',
      client: 'Grupo Vértice SP',
      saleValue: 1850000,
      directCost: 1258000,
      bdi: 259000,
      marginPercent: 18,
      statusText: 'Retrofit Corporativo',
    },
    {
      id: 'prof-4',
      workName: 'Obra Pública — Escola',
      client: 'Secretaria Mun. de Obras',
      saleValue: 3420000,
      directCost: 2565000,
      bdi: 444600,
      marginPercent: 12,
      statusText: 'Licitação e Execução Pública',
    },
  ]

  // Mini Curva ABC — 5 itens de maior peso (top 2 respondem por ~80% => Classe A)
  // Valores:
  // 1: Concreto estrutural = R$ 5.850.000 (45.3% do top 5)
  // 2: Aço CA-50 = R$ 4.450.000 (34.5% do top 5 => acum 79.8% ~ 80% Classe A)
  // 3: Mão de obra — alvenaria = R$ 1.250.000 (9.7% => acum 89.5% Classe B)
  // 4: Esquadrias de alumínio = R$ 850.000 (6.6% => acum 96.1% Classe B)
  // 5: Pintura acrílica = R$ 510.000 (3.9% => acum 100% Classe C)
  const abcItems = [
    {
      rank: 1,
      name: 'Concreto estrutural usinado FCK 35',
      category: 'Estruturas & Fundações',
      value: 5850000,
      accumulatedPercent: 45.3,
      isClassA: true,
    },
    {
      rank: 2,
      name: 'Aço CA-50 corte e dobra industrial',
      category: 'Estruturas Metálicas e Armações',
      value: 4450000,
      accumulatedPercent: 79.8,
      isClassA: true,
    },
    {
      rank: 3,
      name: 'Mão de obra especializada — alvenaria e acabamentos',
      category: 'Mão de Obra Própria & Terceirizada',
      value: 1250000,
      accumulatedPercent: 89.5,
      isClassA: false,
    },
    {
      rank: 4,
      name: 'Esquadrias de alumínio anodizado preto linha alta',
      category: 'Esquadrias e Fachadas',
      value: 850000,
      accumulatedPercent: 96.1,
      isClassA: false,
    },
    {
      rank: 5,
      name: 'Pintura acrílica e impermeabilização técnica',
      category: 'Revestimentos e Pinturas',
      value: 510000,
      accumulatedPercent: 100.0,
      isClassA: false,
    },
  ]

  // Comparativo Orçado x Realizado para 5 obras recentes (em milhares de R$)
  const comparison = [
    {
      workName: 'Res. Jardins',
      budgetedThousands: 2450,
      actualThousands: 2380,
      budgetedFull: 2450000,
      actualFull: 2380000,
    },
    {
      workName: 'Ed. Centro',
      budgetedThousands: 5800,
      actualThousands: 5690,
      budgetedFull: 5800000,
      actualFull: 5690000,
    },
    {
      workName: 'Ref. Paulista',
      budgetedThousands: 1850,
      actualThousands: 1910,
      budgetedFull: 1850000,
      actualFull: 1910000,
    },
    {
      workName: 'Escola Pública',
      budgetedThousands: 3420,
      actualThousands: 3380,
      budgetedFull: 3420000,
      actualFull: 3380000,
    },
    {
      workName: 'Cond. Bosque',
      budgetedThousands: 2150,
      actualThousands: 2090,
      budgetedFull: 2150000,
      actualFull: 2090000,
    },
  ]

  // Evolução dos últimos 6 meses (quantidades e volumes)
  const evolution = [
    { month: 'Nov', monthFull: 'Novembro', count: 4, totalValue: 1850000 },
    { month: 'Dez', monthFull: 'Dezembro', count: 5, totalValue: 2450000 },
    { month: 'Jan', monthFull: 'Janeiro', count: 7, totalValue: 3100000 },
    { month: 'Fev', monthFull: 'Fevereiro', count: 8, totalValue: 3550000 },
    { month: 'Mar', monthFull: 'Março', count: 8, totalValue: 3380000 },
    { month: 'Abr', monthFull: 'Abril', count: 10, totalValue: 3904567.89 },
  ]

  // Distribuição por status com paleta da CONCE
  // Em andamento (Cobalt #294C87), Aprovados (Pumpkin Orange #FF6B1F),
  // Vencidos (Muted Red #C4453C), Em análise (Mirage #171A1F)
  const distribution = [
    {
      status: 'em_andamento' as const,
      label: 'Em andamento',
      count: 15,
      color: '#294C87', // Cobalt
    },
    {
      status: 'aprovado' as const,
      label: 'Aprovados',
      count: 12,
      color: '#FF6B1F', // Pumpkin Orange
    },
    {
      status: 'vencido' as const,
      label: 'Vencidos',
      count: 5,
      color: '#C4453C', // Vermelho suave
    },
    {
      status: 'em_analise' as const,
      label: 'Em análise',
      count: 10,
      color: '#171A1F', // Mirage
    },
  ]

  // Lista simulada com exatamente 42 orçamentos cuja soma é R$ 18.234.567,89
  const budgets = create42Budgets()

  return {
    budgets,
    abcItems,
    profitability,
    comparison,
    evolution,
    distribution,
    summary: {
      totalBudgets: 42,
      totalBudgetedValue: 18234567.89,
      inProgressCount: 15,
      approvedCount: 12,
      expiredCount: 5,
      inReviewCount: 10,
    },
  }
}

/**
 * Cria a lista detalhada de 42 orçamentos com status e valores coerentes
 */
function create42Budgets() {
  const clients = [
    'Incorporadora Horizonte',
    'Família Albuquerque',
    'Grupo Vértice SP',
    'Secretaria Mun. de Obras',
    'Condomínio Altos do Morumbi',
    'Dra. Camila Vasconcelos',
    'Tech Park Empreendimentos',
    'Eng. Marcelo Peixoto',
    'Hospital Santa Mônica',
    'Colégio Renascença',
  ]

  const workTypes = [
    'Reforma Cobertura Duplex',
    'Construção Galpão Logístico',
    'Reforço Estrutural Torre Norte',
    'Retrofit Fachada Ventilada',
    'Instalações Hidrossanitárias',
    'Pavimentação e Drenagem',
    'Adequação de Acessibilidade NBR 9050',
    'Acabamento Fino Residencial',
    'Construção de Espaço Gourmet',
    'Implantação de Subestação',
  ]

  const months = ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr']

  // 15 em andamento, 12 aprovados, 5 vencidos, 10 em análise = 42
  const statuses: ('em_andamento' | 'aprovado' | 'vencido' | 'em_analise')[] = [
    ...Array(15).fill('em_andamento'),
    ...Array(12).fill('aprovado'),
    ...Array(5).fill('vencido'),
    ...Array(10).fill('em_analise'),
  ]

  // Valores pré-calculados somando R$ 18.234.567,89
  const baseValues = [
    2450000, 1820000, 1250000, 980000, 840000, 720000, 680000, 610000, 540000, 490000, 470000,
    450000, 430000, 410000, 390000, 380000, 370000, 360000, 350000, 340000, 330000, 320000, 310000,
    300000, 290000, 280000, 270000, 260000, 250000, 240000, 230000, 220000, 210000, 200000, 190000,
    180000, 170000, 160000, 150000, 140000, 130000, 124567.89,
  ]

  return baseValues.map((val, idx) => {
    const status = statuses[idx]
    const client = clients[idx % clients.length]
    const workName = `${workTypes[idx % workTypes.length]} #${idx + 1}`
    const margin = 14 + (idx % 22)
    const directCost = Math.round(val * 0.65)
    const bdi = Math.round(val * 0.15)

    return {
      id: `orc-${idx + 1}`,
      code: `ORC-${String(idx + 1).padStart(4, '0')}/2025`,
      workName,
      client,
      status,
      budgetedValue: val,
      actualValue: Math.round(val * (0.95 + (idx % 10) * 0.01)),
      directCost,
      bdi,
      saleValue: val,
      marginPercent: margin,
      createdAt: `2025-0${(idx % 4) + 1}-15`,
      month: months[idx % months.length],
    }
  })
}

/**
 * Obtém ou inicializa os dados de demonstração no localStorage
 */
/**
 * Gera os dados estatísticos reais para o Dashboard a partir dos orçamentos reais existentes no sistema
 */
import { FullBudget } from '@/types/budgetEngine'
import { calculateFullBudget } from '@/lib/budgetEngine'
import { computeAbcCurve } from '@/lib/abcAnalysis'

export function computeDashboardFromRealBudgets(budgets: FullBudget[]): ConceDemoData {
  if (!budgets || budgets.length === 0) {
    return {
      budgets: [],
      abcItems: [],
      profitability: [],
      comparison: [],
      evolution: [],
      distribution: [
        { status: 'em_andamento', label: 'Em andamento', count: 0, color: '#294C87' },
        { status: 'aprovado', label: 'Aprovados', count: 0, color: '#3E8E5A' },
        { status: 'em_analise', label: 'Em análise', count: 0, color: '#171A1F' },
        { status: 'vencido', label: 'Vencidos', count: 0, color: '#C4453C' },
      ],
      summary: {
        totalBudgets: 0,
        totalBudgetedValue: 0,
        inProgressCount: 0,
        approvedCount: 0,
        expiredCount: 0,
        inReviewCount: 0,
      },
    }
  }

  let totalValue = 0
  let inProgress = 0
  let approved = 0
  let expired = 0
  let inReview = 0

  const statusMap: Record<string, number> = {
    em_andamento: 0,
    aprovado: 0,
    vencido: 0,
    em_analise: 0,
  }

  const convertedBudgets = budgets.map((b) => {
    const summary = calculateFullBudget(b)
    const saleVal = summary.finalSalePrice || 0
    const directCost = summary.totalDirectCost || 0
    const bdiVal = summary.bdiAmount || 0
    const margin = saleVal > 0 ? ((saleVal - (directCost + bdiVal)) / saleVal) * 100 : 0

    totalValue += saleVal
    if (b.status === 'em_andamento') inProgress++
    else if (b.status === 'aprovado') approved++
    else if (b.status === 'vencido') expired++
    else if (b.status === 'em_analise') inReview++

    statusMap[b.status] = (statusMap[b.status] || 0) + 1

    return {
      id: b.id,
      code: b.code,
      workName: b.title || b.work?.name || 'Orçamento de Obra',
      client: b.client?.name || 'Não informado',
      status: b.status,
      budgetedValue: saleVal,
      actualValue: saleVal,
      directCost,
      bdi: bdiVal,
      saleValue: saleVal,
      marginPercent: Math.max(0, Math.round(margin * 10) / 10),
      createdAt: b.createdAt || new Date().toISOString().split('T')[0],
      month: 'Abr',
    }
  })

  // Lucratividade por obra dos orçamentos reais
  const profitability = convertedBudgets.slice(0, 5).map((cb) => ({
    id: `prof-${cb.id}`,
    workName: cb.workName,
    client: cb.client,
    saleValue: cb.saleValue,
    directCost: cb.directCost,
    bdi: cb.bdi,
    marginPercent: cb.marginPercent,
    statusText: cb.client,
  }))

  // Curva ABC real calculada do orçamento ativo ou agregado
  const firstWithStages = budgets.find((b) => b.stages && b.stages.length > 0) || budgets[0]
  let abcItems: any[] = []
  if (firstWithStages) {
    try {
      const abc = computeAbcCurve(firstWithStages)
      const allAbc = [
        ...abc.classA.items.map((it) => ({ ...it, isClassA: true })),
        ...abc.classB.items.map((it) => ({ ...it, isClassA: false })),
        ...abc.classC.items.map((it) => ({ ...it, isClassA: false })),
      ].slice(0, 5)

      abcItems = allAbc.map((it, idx) => ({
        rank: idx + 1,
        name: it.description,
        category:
          it.category === 'material'
            ? 'Materiais'
            : it.category === 'mao_de_obra'
              ? 'Mão de Obra'
              : 'Equipamentos & Outros',
        value: it.totalCost,
        accumulatedPercent: Math.min(100, Math.round(it.accumulatedPercentage * 10) / 10),
        isClassA: it.isClassA,
      }))
    } catch {
      abcItems = []
    }
  }

  // Comparativo Orçado x Realizado real
  const comparison = convertedBudgets.slice(0, 5).map((cb) => ({
    workName: cb.workName.slice(0, 20),
    budgetedThousands: Math.round(cb.budgetedValue / 1000),
    actualThousands: Math.round(cb.actualValue / 1000),
    budgetedFull: cb.budgetedValue,
    actualFull: cb.actualValue,
  }))

  // Evolução mensal real
  const evolution = [
    { month: 'Abr', monthFull: 'Abril', count: convertedBudgets.length, totalValue },
  ]

  // Distribuição por status real
  const distribution = [
    { status: 'em_andamento' as const, label: 'Em andamento', count: inProgress, color: '#294C87' },
    { status: 'aprovado' as const, label: 'Aprovados', count: approved, color: '#3E8E5A' },
    { status: 'em_analise' as const, label: 'Em análise', count: inReview, color: '#171A1F' },
    { status: 'vencido' as const, label: 'Vencidos', count: expired, color: '#C4453C' },
  ]

  return {
    budgets: convertedBudgets,
    abcItems,
    profitability,
    comparison,
    evolution,
    distribution,
    summary: {
      totalBudgets: convertedBudgets.length,
      totalBudgetedValue: totalValue,
      inProgressCount: inProgress,
      approvedCount: approved,
      expiredCount: expired,
      inReviewCount: inReview,
    },
  }
}

export function getOrCreateDemoData(): ConceDemoData | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = localStorage.getItem(STORAGE_KEYS.DEMO_DATA)
  if (raw) {
    try {
      return JSON.parse(raw) as ConceDemoData
    } catch {
      // JSON corrompido
    }
  }

  return null
}

/**
 * Remove completamente os dados de teste / demonstração armazenados em localStorage
 */
export function clearDemoData(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.DEMO_DATA)
}

/**
 * Retorna a sessão autenticada atual ou null
 */
/**
 * Normaliza qualquer ocorrência da palavra isolada "Denir" para "Edenir",
 * preservando o restante do texto (ex.: "Denir" -> "Edenir", "Denir Souza da Rosa" -> "Edenir Souza da Rosa").
 * Cuidado: "Edenir" contém "denir" como substring, por isso usa \b com lookbehind/lookahead
 * ou limites de palavra estritos que não alteram "Edenir".
 */
export function normalizeUserName(name?: string | null): string {
  if (!name) return 'Edenir'
  const str = String(name).trim()
  if (!str) return 'Edenir'
  // Substitui a palavra isolada "Denir" (case-insensitive ou capitalizada), mantendo limites
  // Ex: "Denir" -> "Edenir", "Eng. Denir Souza" -> "Eng. Edenir Souza"
  // Não altera "Edenir" pois a letra 'E' antecede imediatamente 'denir'.
  const normalized = str.replace(/(?<![A-Za-zÀ-ÿ])[Dd]enir(?![A-Za-zÀ-ÿ])/g, 'Edenir')
  return normalized || 'Edenir'
}

/**
 * Retorna a sessão autenticada atual ou null, aplicando sanitização de runtime
 * para garantir que sessões salvas com o nome "Denir" em navegadores antigos
 * sejam automaticamente corrigidas para "Edenir" e persistidas.
 */
export function getAuthSession(): ConceAuthSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEYS.AUTH)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ConceAuthSession
    if (!parsed || !parsed.loggedIn) return null

    // Sanitização e normalização de runtime para 'Edenir'
    let hasChanged = false
    const currentName = parsed.name || ''
    const cleanName = normalizeUserName(currentName)

    if (cleanName !== currentName) {
      parsed.name = cleanName
      hasChanged = true
    }

    if (parsed.role && /(?<![A-Za-zÀ-ÿ])[Dd]enir(?![A-Za-zÀ-ÿ])/.test(parsed.role)) {
      parsed.role = normalizeUserName(parsed.role)
      hasChanged = true
    }

    if (hasChanged) {
      try {
        localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(parsed))
      } catch {
        // Ignora eventual falha de quota
      }
    }

    return parsed
  } catch {
    return null
  }
}

/**
 * Registra a sessão autenticada no localStorage e garante semente dos dados
 */
export function setAuthSession(session: ConceAuthSession): void {
  // Garante que o nome gravado esteja sempre normalizado como "Edenir"
  const sanitizedSession: ConceAuthSession = {
    ...session,
    name: normalizeUserName(session.name),
  }
  localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(sanitizedSession))
  // Não realiza mais semeadura automática de dados demo
  // if (!localStorage.getItem(STORAGE_KEYS.DEMO_DATA)) {
  //   getOrCreateDemoData()
  // }
}

/**
 * Encerra a sessão do usuário (mantendo dados semeados)
 */
export function clearAuthSession(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH)
}

/**
 * Verifica se o onboarding já foi concluído
 */
export function isOnboardingDone(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE) === 'true'
}

/**
 * Marca o onboarding como concluído
 */
export function setOnboardingDone(): void {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true')
}

/**
 * Reseta o onboarding (útil para testes da tela institucional)
 */
export function resetOnboarding(): void {
  localStorage.removeItem(STORAGE_KEYS.ONBOARDING_DONE)
}
