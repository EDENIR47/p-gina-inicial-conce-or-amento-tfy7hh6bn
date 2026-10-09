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
 * Normaliza uma string de unidade para uma chave canônica determinística para comparações.
 *
 * Transforma:
 * - trim e colapso de espaços em branco múltiplos
 * - minúsculas
 * - remoção de acentos / diacríticos (ex.: mês -> mes)
 * - conversão de sobrescritos e expoentes (m², m^2, m2 -> m2; m³, m^3, m3 -> m3)
 * - remoção de pontos de abreviação (unid. -> unid, un. -> un)
 * - mapeamento de sinônimos técnicos e variações SINAPI / SICRO / TCPO / CONCE para a forma canônica
 *
 * Retorna string vazia se rawUnit for nulo, indefinido ou vazio após trim.
 */
export function canonicalizeUnit(rawUnit?: string | null): string {
  if (!rawUnit) return ''
  const trimmed = String(rawUnit).trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''

  // Casos especiais sensíveis a maiúsculas/minúsculas antes de lowercase:
  // "ml" (mililitro) vs "ML" / "M.L." (metro linear em tabelas legadas)
  // Se for explicitamente "ML" em caixa alta com significado de metro linear, ou "ml"
  // Na engenharia civil brasileira, "ml" minúsculo no catálogo de unidades do sistema é mililitro (volume).
  // Porém se for "M.L." ou "ML" em tabelas antigas, costumava ser metro linear. No sistema STANDARD_MEASUREMENT_UNITS
  // temos symbol: 'ml' na categoria 'volume' e 'm' na categoria 'comprimento'.
  // Preservamos 'ml' como mililitro de forma segura.

  let str = trimmed.toLowerCase()

  // Remove pontos (ex.: unid., und., kg., un., vb., cx., sc.)
  str = str.replace(/\./g, '')

  // Remove acentuação / diacríticos usando unicode normalization
  // Ex: mês -> mes, diária -> diaria
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Normaliza expoentes e sobrescritos para dígitos planos
  // ² (\u00B2) -> 2, ³ (\u00B3) -> 3, ^2 -> 2, ^3 -> 3
  str = str.replace(/²/g, '2').replace(/³/g, '3')
  str = str.replace(/\^2/g, '2').replace(/\^3/g, '3')

  // Remove espaços remanescentes (ex: "m 2" -> "m2")
  str = str.replace(/\s+/g, '')

  // Mapeamento direto de sinônimos conhecidos da engenharia civil brasileira
  const SYNONYMS_MAP: Record<string, string> = {
    // Unidade / Peça / Item
    un: 'un',
    und: 'un',
    unid: 'un',
    unidade: 'un',
    unidades: 'un',
    pc: 'un',
    pca: 'un',
    peca: 'un',
    pecas: 'un',
    item: 'un',
    itens: 'un',

    // Área
    m2: 'm2',
    m2c: 'm2',
    metroquadrado: 'm2',
    metrosquadrados: 'm2',
    mq: 'm2',
    ha: 'ha',
    hectare: 'ha',
    hectares: 'ha',

    // Volume
    m3: 'm3',
    metrocubico: 'm3',
    metroscubicos: 'm3',
    mc: 'm3',
    l: 'l',
    lt: 'l',
    lts: 'l',
    litro: 'l',
    litros: 'l',
    ml: 'ml',
    mililitro: 'ml',
    mililitros: 'ml',

    // Comprimento
    m: 'm',
    metro: 'm',
    metros: 'm',
    linear: 'm',
    metrolinear: 'm',
    km: 'km',
    quilometro: 'km',
    quilometros: 'km',
    cm: 'cm',
    centimetro: 'cm',
    centimetros: 'cm',
    mm: 'mm',
    milimetro: 'mm',
    milimetros: 'mm',

    // Massa / Peso
    kg: 'kg',
    kilo: 'kg',
    kilos: 'kg',
    quilograma: 'kg',
    quilogramas: 'kg',
    quilo: 'kg',
    quilos: 'kg',
    kgs: 'kg',
    g: 'g',
    grama: 'g',
    gramas: 'g',
    t: 't',
    ton: 't',
    tonelada: 't',
    toneladas: 't',

    // Conjuntos / Embalagens
    cj: 'cj',
    conj: 'cj',
    conjunto: 'cj',
    conjuntos: 'cj',
    jg: 'jg',
    jogo: 'jg',
    jogos: 'jg',
    pt: 'pt',
    pto: 'pt',
    ponto: 'pt',
    pontos: 'pt',
    par: 'par',
    pares: 'par',
    cx: 'cx',
    cxa: 'cx',
    caixa: 'cx',
    caixas: 'cx',
    sc: 'sc',
    saco: 'sc',
    sacos: 'sc',
    gl: 'gl',
    galao: 'gl',
    galoes: 'gl',
    bd: 'bd',
    balde: 'bd',
    baldes: 'bd',

    // Tempo
    h: 'h',
    hr: 'h',
    hrs: 'h',
    hora: 'h',
    horas: 'h',
    ch: 'ch',
    chp: 'ch',
    chi: 'ch',
    dia: 'dia',
    dias: 'dia',
    diaria: 'dia',
    diarias: 'dia',
    mes: 'mes',
    meses: 'mes',
    ano: 'ano',
    anos: 'ano',

    // Adimensional / Verba / Taxa
    vb: 'vb',
    vba: 'vb',
    verba: 'vb',
    verbas: 'vb',
    glob: 'gl_serv', // distingue global de galão se necessário, ou unifica
    global: 'gl_serv',
    '%': '%',
    pct: '%',
    porcento: '%',
    percentual: '%',
  }

  if (SYNONYMS_MAP[str]) {
    return SYNONYMS_MAP[str]
  }

  return str
}

/**
 * Compara duas unidades de medida verificando equivalência semântica.
 * Retorna true se ambas representarem a mesma unidade física após normalização canônica.
 *
 * Exemplos:
 * areUnitsEquivalent('m²', 'm2') -> true
 * areUnitsEquivalent('M2', 'm²') -> true
 * areUnitsEquivalent('m³', 'm3') -> true
 * areUnitsEquivalent('unid.', 'un') -> true
 * areUnitsEquivalent('UND', 'un') -> true
 * areUnitsEquivalent('kg', 'kg') -> true
 * areUnitsEquivalent('m', 'm²') -> false
 * areUnitsEquivalent('kg', 'un') -> false
 * areUnitsEquivalent('', 'un') -> false
 */
export function areUnitsEquivalent(unitA?: string | null, unitB?: string | null): boolean {
  const canonA = canonicalizeUnit(unitA)
  const canonB = canonicalizeUnit(unitB)

  // Se qualquer uma das unidades for vazia/não definida, não há correspondência
  if (!canonA || !canonB) {
    return false
  }

  return canonA === canonB
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
  const lower = trimmed.toLowerCase().replace(/\./g, '')
  if (lower === 'm2' || lower === 'm^2' || lower === 'm²') return 'm²'
  if (lower === 'm3' || lower === 'm^3' || lower === 'm³') return 'm³'
  if (lower === 'und' || lower === 'unid' || lower === 'unidade' || lower === 'un') return 'un'
  if (lower === 'verba' || lower === 'verb' || lower === 'vb') return 'vb'
  if (lower === 'horas' || lower === 'hr' || lower === 'hrs' || lower === 'h') return 'h'
  if (lower === 'mes' || lower === 'meses' || lower === 'mês') return 'mês'
  if (lower === 'kilo' || lower === 'quilo' || lower === 'kgs' || lower === 'kg') return 'kg'
  if (lower === 'ton' || lower === 'tonelada' || lower === 't') return 't'
  if (lower === 'litro' || lower === 'litros' || lower === 'lts' || lower === 'l') return 'L'
  if (lower === 'metro' || lower === 'metros' || lower === 'm') return 'm'
  if (lower === 'ml') return 'ml'

  // Mantém retrocompatibilidade total com a unidade exata que veio do banco
  return trimmed
}
