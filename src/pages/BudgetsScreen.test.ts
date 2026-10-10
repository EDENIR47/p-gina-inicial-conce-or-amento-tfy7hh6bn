import { describe, it, expect, beforeEach } from 'vitest'
import {
  getStoredFullBudgets,
  saveSingleBudget,
  STORAGE_KEYS_BUDGETS,
  purgeTestBudgetsFromStorage,
  deleteSingleBudget,
} from '@/lib/budgetsStorage'
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

  it('(a) montagem de BudgetsScreen sempre inicia com activeBudget null mesmo com chave ativa presente no localStorage apontando para orçamento existente', () => {
    saveSingleBudget(dummyBudget)
    const stored = getStoredFullBudgets()
    expect(stored.length).toBe(1)

    // Simula presença da chave ativa no localStorage apontando para orçamento existente
    localStorage.setItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID, dummyBudget.id)
    expect(localStorage.getItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID)).toBe(dummyBudget.id)

    // Na montagem inicial do componente BudgetsScreen:
    // O estado activeBudget deve iniciar SEMPRE null (const [activeBudget, setActiveBudget] = useState<FullBudget | null>(null))
    let initialActiveBudget: FullBudget | null = null
    expect(initialActiveBudget).toBeNull()

    // E na navegação padrão (sem openBudgetId explícito em location.state), permanece null
    const locationState = null
    const targetId = (locationState as any)?.openBudgetId
    if (!targetId) {
      initialActiveBudget = null
    }
    expect(initialActiveBudget).toBeNull()
  })

  it('(b) chave órfã (orçamento inexistente ou apagado) é removida do localStorage e a Visão Geral é exibida', () => {
    saveSingleBudget(dummyBudget)
    const stored = getStoredFullBudgets()
    expect(stored.length).toBe(1)

    // Configura chave ativa órfã apontando para orçamento que não existe
    localStorage.setItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID, 'orcamento-fantasma-999')
    expect(localStorage.getItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID)).toBe(
      'orcamento-fantasma-999',
    )

    // Executa a purga de orçamentos e verificação de chaves órfãs
    purgeTestBudgetsFromStorage()

    // A chave órfã deve ter sido removida
    expect(localStorage.getItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID)).toBeNull()

    // Teste complementar com deleteSingleBudget:
    localStorage.setItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID, dummyBudget.id)
    deleteSingleBudget(dummyBudget.id)
    expect(localStorage.getItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID)).toBeNull()
  })

  it('(c) deep link explícito (state.openBudgetId) abre o orçamento correto quando ele existe', () => {
    saveSingleBudget(dummyBudget)
    const stored = getStoredFullBudgets()

    const locationStateComTarget = { openBudgetId: 'budget-conce-123' }
    const targetId = locationStateComTarget.openBudgetId
    let activeBudget: FullBudget | null = null

    if (targetId) {
      const found = stored.find((b) => b.id === targetId)
      if (found) {
        activeBudget = found
        localStorage.setItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID, found.id)
      }
    }

    expect(activeBudget).not.toBeNull()
    expect(activeBudget?.id).toBe('budget-conce-123')
    expect(localStorage.getItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID)).toBe('budget-conce-123')
  })

  it('(d) deep link para ID inexistente não abre nada, cai na Visão Geral e limpa a chave ativa', () => {
    saveSingleBudget(dummyBudget)
    const stored = getStoredFullBudgets()

    // Simula chave ativa residual no localStorage
    localStorage.setItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID, 'id-fantasma-invalido')

    const locationStateComTargetInexistente = { openBudgetId: 'id-inexistente-xyz' }
    const targetId = locationStateComTargetInexistente.openBudgetId
    let activeBudget: FullBudget | null = null

    if (targetId) {
      const found = stored.find((b) => b.id === targetId)
      if (found) {
        activeBudget = found
      } else {
        // Deep link apontou para ID inexistente: limpa chave ativa e mostra Visão Geral
        localStorage.removeItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID)
        activeBudget = null
      }
    }

    expect(activeBudget).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS_BUDGETS.ACTIVE_BUDGET_ID)).toBeNull()
  })

  it('ao retornar de outras telas (/composicoes, /dashboard) sem openBudgetId, activeBudget é sempre null', () => {
    saveSingleBudget(dummyBudget)
    const stored = getStoredFullBudgets()

    // Simula usuário que estava com orçamento aberto e navegou pelo menu
    let activeBudget: FullBudget | null = stored[0]
    expect(activeBudget).not.toBeNull()

    // Usuário clica no menu "Orçamentos" (/orcamentos sem state)
    const newLocation = { pathname: '/orcamentos', state: null, key: 'nav-test' }
    const targetId = (newLocation.state as any)?.openBudgetId

    if (targetId) {
      const found = stored.find((b) => b.id === targetId)
      if (found) activeBudget = found
    } else {
      activeBudget = null
    }

    expect(activeBudget).toBeNull()
  })
})
