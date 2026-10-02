/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Tipagem do Catálogo SINAPI (Insumos e Composições Oficiais / Referência)
 */

import { InputCategory } from './budgetEngine'

export type SinapiItemType = 'insumo' | 'composicao'

export type SinapiPriceOrigin = 'referencia_embutida' | 'importada_usuario'

export interface SinapiCatalogItem {
  id: string
  code: string // Ex: "SINAPI-88309", "SINAPI-1379", "SINAPI-87529"
  numericCode: string // Ex: "88309", "1379" (para busca numérica direta)
  type: SinapiItemType // 'insumo' | 'composicao'
  description: string
  unit: string // Ex: "m²", "m³", "h", "kg", "un", "m", "ch", "cj"
  category: InputCategory // 'material' | 'mao_de_obra' | 'equipamento' | 'servico_terceiro' | 'outros'
  specialty: string // Ex: "Revestimentos", "Alvenaria & Vedações", "Pintura", etc.
  referencePrice: number // R$ Preço de referência editável
  priceOrigin: SinapiPriceOrigin
  referenceMonth?: string // Ex: "04/2025"
  referenceState?: string // Ex: "RS", "SP", "Nacional"
  notes?: string
  // Se for composição SINAPI sintética, lista de insumos resumidos
  compositionInputs?: Array<{
    code: string
    description: string
    unit: string
    category: InputCategory
    coefficient: number
    unitCost: number
  }>
}

export interface SinapiImportMetadata {
  importedAt: string
  referenceMonth: string
  referenceState: string
  itemsCount: number
  updatedCount: number
  createdCount: number
  fileName?: string
}

export interface SinapiFilterState {
  search: string
  type: 'todos' | 'insumo' | 'composicao'
  category: 'todas' | InputCategory
  specialty: string
  origin: 'todos' | SinapiPriceOrigin
}
