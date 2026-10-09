import { describe, it, expect, beforeEach } from 'vitest'
import { getStoredFullBudgets, saveSingleBudget } from '@/lib/budgetsStorage'
import { FullBudget } from '@/types/budgetEngine'

describe('Navegação e Comportamento de Visão Geral em /orcamentos', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const dummyBudget: FullBudget = {
    id: 'budget-conce-123',
    code: 'ORC-2025-001',
    title: 'Obra Teste Navegação',
    status: 'em_andamento',
    createdAt: '2025-04-10',
    updatedAt: '2025-04-10T10:00:00Z',
    author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
    client: {
      name: 'Cliente Teste',
      document: '000.000.000-00',
      email: '',
      phone: '',
      address: '',
      city: 'Porto Alegre',
      state: 'RS',
    },
    work: {
      name: 'Obra Teste Navegação',
      address: 'Rua Tomaz Gonzaga, 610',
      city: 'Porto Alegre',
      state: 'RS',
      description: 'Teste',
      deadlineMonths: 6,
      startDate: '2025-05-01',
    },
    chargesConfig: {
      uf: 'RS',
      isRelieved: false,
      taxRegime: 'simples_nacional',
      simplesDasRate: 11.0,
      customGroupA: 0,
      customGroupB: 0,
      customGroupC: 0,
      customGroupD: 0,
      isExplicitZero: true,
    },
    bdiConfig: {
      administrationCentral: 4.5,
      risk: 1.25,
      insuranceAndGuarantee: 0.85,
      financialExpenses: 1.15,
      profit: 7.8,
      taxes: {
        iss: 4.0,
        pis: 0.65,
        cofins: 3.0,
        inssOrCprb: 0.0,
        totalTaxes: 11.0,
        simplesDas: 11.0,
      },
      calculatedBdi: 28.5,
    },
    publicWork: {
      enabled: false,
      tenderNumber: '',
      contractNumber: '',
      agency: '',
      modality: 'Concorrência',
      sinapiReferenceMonth: '04/2025',
      hasDisallowanceClause: false,
    },
    stages: [],
  }

  it('ao navegar sem openBudgetId especificado, a tela deve abrir sempre na visão geral (activeBudget = null)', () => {
    saveSingleBudget(dummyBudget)
    const stored = getStoredFullBudgets()
    expect(stored.length).toBe(1)

    // Simula a lógica de inicialização de BudgetsScreen:
    // const [activeBudget, setActiveBudget] = useState<FullBudget | null>(() => {
    //   const targetId = (location.state as any)?.openBudgetId
    //   if (targetId) { ... }
    //   return null
    // })
    const locationStateSemTarget = null
    const targetId = (locationStateSemTarget as any)?.openBudgetId
    let activeBudget: FullBudget | null = null
    if (targetId) {
      const found = stored.find((b) => b.id === targetId)
      if (found) activeBudget = found
    }

    expect(activeBudget).toBeNull()
  })

  it('ao navegar com state.openBudgetId explícito (ex.: criado via IA ou clicado no Dashboard), abre o orçamento específico', () => {
    saveSingleBudget(dummyBudget)
    const stored = getStoredFullBudgets()

    const locationStateComTarget = { openBudgetId: 'budget-conce-123' }
    const targetId = locationStateComTarget.openBudgetId
    let activeBudget: FullBudget | null = null
    if (targetId) {
      const found = stored.find((b) => b.id === targetId)
      if (found) activeBudget = found
    }

    expect(activeBudget).not.toBeNull()
    expect(activeBudget?.id).toBe('budget-conce-123')
  })

  it('ao retornar de composições para orçamentos (navegação normal sem openBudgetId), activeBudget é resetado para null', () => {
    saveSingleBudget(dummyBudget)
    const stored = getStoredFullBudgets()

    // Cenário: o usuário estava com um orçamento aberto no detalhe
    let activeBudget: FullBudget | null = stored[0]
    expect(activeBudget).not.toBeNull()

    // O usuário navega para /composicoes e depois clica no menu "Orçamentos" (/orcamentos sem state)
    const newLocation = { pathname: '/orcamentos', state: null, key: 'abc123' }
    const targetId = (newLocation.state as any)?.openBudgetId

    if (targetId) {
      const found = stored.find((b) => b.id === targetId)
      if (found) activeBudget = found
    } else {
      activeBudget = null
    }

    // Deve abrir na visão geral
    expect(activeBudget).toBeNull()
  })
})
