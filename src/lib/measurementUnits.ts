/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Catálogo Padronizado de Unidades de Medida da Engenharia de Custos Civil (SINAPI / SICRO / TCPO / CONCE)
 *
 * Suporta retrocompatibilidade integral com unidades personalizadas ou legadas já persistidas.
 */

export interface MeasurementUnitOption {
  symbol: string
  label: string
  category:
    | 'area'
    | 'volume'
    | 'massa'
    | 'comprimento'
    | 'tempo'
    | 'quantidade'
    | 'adimensional'
    | 'outros'
  description?: string
}

export interface UnitCategoryGroup {
  category: MeasurementUnitOption['category']
  label: string
  units: MeasurementUnitOption[]
}

export const STANDARD_MEASUREMENT_UNITS: MeasurementUnitOption[] = [
  // Área
  {
    symbol: 'm²',
    label: 'm² — Metro quadrado',
    category: 'area',
    description: 'Área de pisos, paredes, pinturas, formas',
  },
  {
    symbol: 'ha',
    label: 'ha — Hectare',
    category: 'area',
    description: 'Grandes áreas de terraplenagem e desmatamento',
  },

  // Volume
  {
    symbol: 'm³',
    label: 'm³ — Metro cúbico',
    category: 'volume',
    description: 'Concreto, escavação, aterro, argamassa',
  },
  {
    symbol: 'L',
    label: 'L — Litro',
    category: 'volume',
    description: 'Tintas, solventes, aditivos, impermeabilizantes',
  },
  {
    symbol: 'ml',
    label: 'ml — Mililitro',
    category: 'volume',
    description: 'Selantes e químicos especiais',
  },

  // Comprimento
  {
    symbol: 'm',
    label: 'm — Metro linear',
    category: 'comprimento',
    description: 'Tubos, cabos condutores, rodapés, guias',
  },
  {
    symbol: 'km',
    label: 'km — Quilômetro',
    category: 'comprimento',
    description: 'Pavimentação rodoviária, drenagens extensas',
  },

  // Massa / Peso
  {
    symbol: 'kg',
    label: 'kg — Quilograma',
    category: 'massa',
    description: 'Aço CA-50/60, cimento, pregos, argamassa ensacada',
  },
  {
    symbol: 't',
    label: 't — Tonelada',
    category: 'massa',
    description: 'CBUQ asfalto, estrutura metálica pesada, brita a granel',
  },
  {
    symbol: 'g',
    label: 'g — Grama',
    category: 'massa',
    description: 'Pigmentos e aditivos de precisão',
  },

  // Quantidade / Itens / Conjuntos
  {
    symbol: 'un',
    label: 'un — Unidade',
    category: 'quantidade',
    description: 'Peças sanitárias, portas, luminárias, caixas',
  },
  {
    symbol: 'cj',
    label: 'cj — Conjunto',
    category: 'quantidade',
    description: 'Kits montados, grupos geradores, bombas',
  },
  {
    symbol: 'jg',
    label: 'jg — Jogo',
    category: 'quantidade',
    description: 'Jogos de acessórios, kit ferragens',
  },
  {
    symbol: 'pt',
    label: 'pt — Ponto',
    category: 'quantidade',
    description: 'Pontos de tomada, iluminação, pontos hidráulicos',
  },
  {
    symbol: 'par',
    label: 'par — Par',
    category: 'quantidade',
    description: 'EPIs, luvas, botas, dobradiças',
  },
  {
    symbol: 'cx',
    label: 'cx — Caixa',
    category: 'quantidade',
    description: 'Embalagens fechadas de parafusos, pastilhas',
  },
  {
    symbol: 'sc',
    label: 'sc — Saco',
    category: 'quantidade',
    description: 'Sacos de cimento 50kg, cal, argamassa',
  },
  {
    symbol: 'gl',
    label: 'gl — Galão',
    category: 'quantidade',
    description: 'Galões de 3,6L de tinta e solvente',
  },
  {
    symbol: 'bd',
    label: 'bd — Balde',
    category: 'quantidade',
    description: 'Baldes de 18L de tinta e impermeabilizante',
  },

  // Tempo / Mão de Obra e Equipamentos
  {
    symbol: 'h',
    label: 'h — Hora',
    category: 'tempo',
    description: 'Homem-hora (pedreiro, servente, pintor, carpinteiro)',
  },
  {
    symbol: 'ch',
    label: 'ch — Hora produtiva/improdutiva',
    category: 'tempo',
    description: 'Hora de retroescavadeira, caminhão, betoneira',
  },
  {
    symbol: 'mês',
    label: 'mês — Mês',
    category: 'tempo',
    description: 'Locação de andaimes, equipe administrativa, caçambas',
  },
  {
    symbol: 'dia',
    label: 'dia — Dia / Diária',
    category: 'tempo',
    description: 'Diárias de equipamentos leves, caminhão pipa',
  },

  // Serviços Globais / Adimensionais / Percentuais
  {
    symbol: 'vb',
    label: 'vb — Verba',
    category: 'adimensional',
    description: 'Serviço global por verba (limpeza, canteiro, projetos)',
  },
  {
    symbol: 'gl',
    label: 'gl — Global',
    category: 'adimensional',
    description: 'Valor global fixado',
  },
  {
    symbol: '%',
    label: '% — Percentual',
    category: 'adimensional',
    description: 'Taxas, BDI, comissões percentuais',
  },
]

export const UNIT_CATEGORY_LABELS: Record<MeasurementUnitOption['category'], string> = {
  area: 'Área',
  volume: 'Volume / Líquidos',
  massa: 'Massa / Peso',
  comprimento: 'Comprimento Linear',
  quantidade: 'Unidades & Embalagens',
  tempo: 'Tempo / Mão de Obra / Horas',
  adimensional: 'Verba / Global / Taxas',
  outros: 'Outras Unidades',
}

/**
 * Retorna as opções agrupadas por categoria para fácil renderização em grupos.
 */
export function getGroupedMeasurementUnits(): UnitCategoryGroup[] {
  const groupsOrder: MeasurementUnitOption['category'][] = [
    'area',
    'volume',
    'comprimento',
    'massa',
    'quantidade',
    'tempo',
    'adimensional',
  ]

  return groupsOrder.map((cat) => ({
    category: cat,
    label: UNIT_CATEGORY_LABELS[cat],
    units: STANDARD_MEASUREMENT_UNITS.filter((u) => u.category === cat),
  }))
}

/**
 * Normaliza uma string de unidade para exibição amigável,
 * mantendo compatibilidade com unidades já persistidas.
 */
export function normalizeUnit(rawUnit?: string): string {
  if (!rawUnit) return 'un'
  const trimmed = rawUnit.trim()
  if (!trimmed) return 'un'

  // Procura correspondência case-insensitive exata nas unidades padrão
  const matched = STANDARD_MEASUREMENT_UNITS.find(
    (u) => u.symbol.toLowerCase() === trimmed.toLowerCase(),
  )
  if (matched) return matched.symbol

  // Casos especiais comuns digitados pelo usuário
  const lower = trimmed.toLowerCase()
  if (lower === 'm2' || lower === 'm^2') return 'm²'
  if (lower === 'm3' || lower === 'm^3') return 'm³'
  if (lower === 'und' || lower === 'unid' || lower === 'unidade') return 'un'
  if (lower === 'verba' || lower === 'verb') return 'vb'
  if (lower === 'horas' || lower === 'hr' || lower === 'hrs') return 'h'
  if (lower === 'mes' || lower === 'meses') return 'mês'
  if (lower === 'kilo' || lower === 'quilo' || lower === 'kgs') return 'kg'
  if (lower === 'ton' || lower === 'tonelada') return 't'
  if (lower === 'litro' || lower === 'litros' || lower === 'lts') return 'L'
  if (lower === 'metro' || lower === 'metros' || lower === 'ml')
    return trimmed === 'ml' ? 'ml' : 'm'

  // Mantém retrocompatibilidade total com a unidade exata que veio do banco
  return trimmed
}
