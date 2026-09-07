/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modelos de dados do Núcleo Funcional de Orçamento de Obra
 * Hierarquia de 4 níveis: Etapa -> Serviço -> Composição -> Insumo
 */

export type InputCategory =
  | 'material'
  | 'mao_de_obra'
  | 'equipamento'
  | 'servico_terceiro'
  | 'outros'

export type BudgetInputSource =
  | 'SINAPI'
  | 'SICRO'
  | 'Biblioteca CONCE'
  | 'Usuário'
  | 'sem fonte — preencher manualmente'
  | string

export interface BudgetInput {
  id: string
  code: string // ex.: "SINAPI-88316", "MAT-001"
  description: string
  unit: string // "m²", "m³", "h", "kg", "un", "m", "ch"
  category: InputCategory
  coefficient: number // Coeficiente de consumo por unidade da composição
  unitCost: number // Custo unitário base em R$
  source?: BudgetInputSource // Fonte de custo comprovada
  sourceStatus?: 'valido' | 'sem_fonte' | 'pendente'
  notes?: string
}

export interface CompositionVersion {
  version: string // "v1.0", "v1.1", "v2.0"
  date: string // ISO date
  author: string // ex.: "Eng. Edenir Souza da Rosa - CREA/RS-252397"
  changelog: string
}

export interface BudgetComposition {
  id: string
  code: string // ex.: "CONCE-ALV-001", "SINAPI-87529"
  description: string
  specialty: string // "Estruturas & Fundações", "Alvenaria & Vedações", "Revestimentos", "Instalações Elétricas", "Instalações Hidrossanitárias", "Pintura", "Serviços Preliminares"
  unit: string // "m²", "m³", "m", "un", "kg", "cj"
  inputs: BudgetInput[]
  version: string // ex.: "v1.2"
  versionsHistory?: CompositionVersion[]
  source: 'CONCE' | 'SINAPI' | 'SICRO' | 'PROPRIO'
  unitCost?: number // Calculado: Σ(coeficiente × unitCost)
  notes?: string
}

export interface BudgetService {
  id: string
  order: number
  code: string // ex.: "01.01", "02.01"
  description: string
  unit: string
  quantity: number
  composition: BudgetComposition
  customBdiPercent?: number // Opcional: BDI diferenciado para este serviço (ex.: fornecimento de equipamentos)
  notes?: string
}

export interface BudgetStage {
  id: string
  order: number
  code: string // ex.: "01", "02"
  name: string // ex.: "01. SERVIÇOS PRELIMINARES", "02. FUNDAÇÕES E ESTRUTURA"
  services: BudgetService[]
  notes?: string
}

export interface ClientData {
  name: string
  document: string // CPF ou CNPJ
  email: string
  phone: string
  address: string
  city: string
  state: string
}

export interface WorkData {
  name: string
  address: string
  city: string
  state: string
  description: string
  deadlineMonths: number
  startDate: string
  expectedEndDate?: string
  totalAreaM2?: number
}

export interface PublicWorkData {
  enabled: boolean
  tenderNumber: string // Número da licitação / Edital
  contractNumber: string // Número do contrato
  agency: string // Órgão contratante (ex.: "DER-SP", "FDE", "Sec. Mun. de Infraestrutura")
  modality:
    | 'Concorrência'
    | 'Tomada de Preços'
    | 'Convite'
    | 'Pregão Eletrônico'
    | 'RDC'
    | 'Diálogo Competitivo'
    | 'Dispensa/Inexigibilidade'
  sinapiReferenceMonth: string // ex.: "04/2025"
  sicroReferenceMonth?: string
  hasDisallowanceClause: boolean
}

export interface SocialChargesGroup {
  name: string
  percentage: number
  description: string
}

export interface SocialChargesStateConfig {
  uf: string
  stateName: string
  region: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul'
  // Regime sem desoneração (padrão CLT)
  nonRelieved: {
    groupA: number // Previdência, FGTS, Salário Educação, SESI, SENAI, INCRA, SEBRAE
    groupB: number // Descanso semanal, Férias, Feriados, Auxílio Enfermidade, Licença
    groupC: number // Aviso prévio indenizado, Multa rescisória
    groupD: number // Reincidências (A sobre B)
    total: number
  }
  // Regime com desoneração (Lei 12.546/2011 - CPRB)
  relieved: {
    groupA: number
    groupB: number
    groupC: number
    groupD: number
    total: number
  }
}

export interface BdiConfig {
  administrationCentral: number // AC (%)
  risk: number // R (%)
  insuranceAndGuarantee: number // S + G (%)
  financialExpenses: number // DF (%)
  profit: number // L (%)
  taxes: {
    iss: number // ISS (%)
    pis: number // PIS (%)
    cofins: number // COFINS (%)
    inssOrCprb: number // CPRB se desonerado (%)
    totalTaxes: number // T (%) = ISS + PIS + COFINS + CPRB
  }
  calculatedBdi: number // Resultado da fórmula do TCU (%)
  differentiatedEquipBdi?: number // BDI para fornecimento de materiais/equipamentos (TCU recomenda menor)
}

export interface FullBudget {
  id: string
  code: string // ex.: "ORC-2025-001"
  status: 'em_andamento' | 'aprovado' | 'vencido' | 'em_analise'
  client: ClientData
  work: WorkData
  publicWork: PublicWorkData
  stages: BudgetStage[]
  chargesConfig: {
    uf: string
    isRelieved: boolean // com ou sem desoneração
    customGroupA?: number
    customGroupB?: number
    customGroupC?: number
    customGroupD?: number
  }
  bdiConfig: BdiConfig
  createdAt: string
  updatedAt: string
  author: string
}

export interface CalculationSummary {
  directCostInputs: number // Custo Direto de Insumos
  laborDirectCost: number // Parcela de Mão de Obra
  materialDirectCost: number // Parcela de Materiais
  equipmentDirectCost: number // Parcela de Equipamentos
  subcontractDirectCost: number // Parcela de Terceiros
  socialChargesRate: number // % encargos aplicado
  socialChargesAmount: number // R$ total de encargos sociais sobre mão de obra
  totalDirectCost: number // Custo Direto Total
  bdiRate: number // % BDI geral
  bdiAmount: number // R$ BDI aplicado
  totalTaxesRate: number // % impostos
  totalTaxesAmount: number // R$ impostos
  finalSalePrice: number // Preço de Venda Final da Obra
  stagesSubtotals: Array<{
    stageId: string
    code: string
    name: string
    directCost: number
    withBdi: number
    percentageOfTotal: number
  }>
  servicesCount: number
  inputsCount: number
}
