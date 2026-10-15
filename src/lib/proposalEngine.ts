/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Motor de geração da PROPOSTA TÉCNICA E COMERCIAL (documento comercial de engenharia)
 *
 * A partir dos dados REAIS do orçamento (etapas, serviços, insumos, quantidades, composições),
 * deriva as 7 seções obrigatórias, nesta ordem:
 *  1. OBJETIVO DO TRABALHO
 *  2. FORMA DE EXECUÇÃO
 *  3. COMPLEXIDADE DO SERVIÇO
 *  4. DESTINAÇÃO FINAL DOS RESÍDUOS
 *  5. FORMA DE FISCALIZAÇÃO UTILIZADA
 *  6. VOLUME ESTIMADO DE MATERIAL REMOVIDO
 *  7. PRAZO E AUTORIZAÇÕES PRÉVIAS PARA EXECUÇÃO
 *
 * Regras:
 * - Nada de texto genérico de enchimento: cada frase cita dados do orçamento (etapas, serviços,
 *   quantidades, unidades, áreas, interferências detectadas).
 * - A seção de resíduos é APENAS texto técnico-padrão (CONAMA 307 / NBRs) — NÃO reintroduz a
 *   antiga feature "Ficha de Descarte" (removida a pedido do usuário).
 * - Prazo é sempre ESTIMATIVA proporcional ao escopo, nunca prazo contratual inventado.
 * - Função PURA: nenhuma dependência de localStorage, DOM ou rede (testável em Vitest).
 */

import { BudgetStage, CalculationSummary, FullBudget } from '@/types/budgetEngine'

export const PROPOSAL_DOCUMENT_TITLE = 'PROPOSTA TÉCNICA E COMERCIAL'

export type ResidueClass = 'A' | 'B' | 'C' | 'D'
export type AuthorizationResponsibility = 'Contratante' | 'CONCE' | 'Conjunta'

export interface ProposalVolumeRow {
  stageCode: string
  stageName: string
  serviceCode: string
  description: string
  unit: string
  quantity: number
  estimatedVolumeM3: number
  estimatedWeightKg: number
  residueClass: ResidueClass
  isDeclaredByUser: boolean
}

export interface ProposalVolumeAnalysis {
  hasRemovalServices: boolean
  removalServiceCount: number
  rows: ProposalVolumeRow[]
  totalVolumeM3: number
  totalWeightKg: number
  volumeByClass: Record<ResidueClass, number>
  cacambaCount5m3: number
}

export interface ProposalAuthorization {
  title: string
  description: string
  responsibility: AuthorizationResponsibility
}

export interface ProposalAnalysis {
  volume: ProposalVolumeAnalysis
  methodTags: string[]
  hasInstallations: boolean
  hasStructuralDemolition: boolean
  hasHeightWork: boolean
  complexityLevel: 'reduzida' | 'moderada' | 'elevada'
  complexityScore: number
  complexityFactors: string[]
  specialtiesPresent: string[]
  estimatedWeeksMin: number
  estimatedWeeksMax: number
}

export interface ProposalSectionData {
  number: number
  title: string
  paragraphs: string[]
  items?: string[]
  table?: {
    headers: string[]
    rows: string[][]
    totalsRow?: string[]
  }
  footnotes?: string[]
}

/* ------------------------------------------------------------------ */
/* Utilitários                                                          */
/* ------------------------------------------------------------------ */

/** Normaliza texto para casamento de palavras-chave (minúsculo, sem acentos). */
export function normalizeKeyword(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Sanitiza texto para uso seguro em documento impresso (sem tags/quebras). */
export function sanitizeProposalText(text: string): string {
  return (text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const nf1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

function fmt(n: number): string {
  return nf1.format(n)
}

/* ------------------------------------------------------------------ */
/* Detecção de natureza dos serviços                                    */
/* ------------------------------------------------------------------ */

const REMOVAL_KEYWORDS = [
  'demoli',
  'remocao',
  'remover',
  'retirada',
  'retirar',
  'quebra',
  'escava',
  'desmontagem',
  'raspagem',
  'corpus',
  'limpeza de terreno',
  'desmate',
  'piso existente',
  'revestimento existente',
  'reboco existente',
  'laje existente',
  'argamassa existente',
  'ceramica existente',
  'azulejo existente',
  'entulho',
  'forro existente',
  'esquadria existente',
]

const STRUCTURAL_KEYWORDS = [
  'estrutural',
  'estrutura de concreto',
  'viga',
  'pilar',
  'pilastra',
  'laje',
  'fundacao',
  'sapata',
  'estaca',
  'arrimo',
  'contencao',
]

const HEIGHT_KEYWORDS = [
  'fachada',
  'cobertura',
  'telhado',
  'platibanda',
  'altura',
  'andar',
  'pavimento',
  'calha',
  'rufo',
  'vertical',
]

const INSTALLATION_KEYWORDS = [
  'eletric',
  'hidraul',
  'hidrossanit',
  'esgoto',
  'agua fria',
  'agua quente',
  'gas',
  'incendio',
  'spda',
  'telecom',
  'fibra',
  'cftv',
  'rede de',
  'tubula',
  'ventilacao',
  'exaustao',
  'ar condicionado',
  'ar-condicionado',
  'climatizacao',
]

const METHOD_TAG_KEYWORDS: Record<string, string[]> = {
  'Serviços preliminares e canteiro': [
    'canteiro',
    'mobilizacao',
    'provisorio',
    'tapume',
    'locação',
    'locacao',
    'limpeza de obra',
    'projeto',
    'regulariz',
    'topografia',
  ],
  'Demolições, remoções e escavações': REMOVAL_KEYWORDS,
  'Estrutura e fundações': [
    'estrutura',
    'viga',
    'pilar',
    'laje',
    'fundacao',
    'sapata',
    'estaca',
    'concreto armado',
    'forma',
    'armadura',
  ],
  'Alvenaria e vedações': [
    'alvenaria',
    'tijolo',
    'bloco',
    'assentamento',
    'vedacao',
    'divisoria',
    'parede',
  ],
  'Revestimentos, pisos e acabamentos': [
    'revestimento',
    'reboco',
    'emboco',
    'contrapiso',
    'piso',
    'porcelanato',
    'ceramica',
    'azulejo',
    'pintura',
    'textura',
    'gesso',
    'forro',
    'impermeabilizacao',
    'rodape',
    'esquadria',
    'porta',
    'janela',
  ],
  'Instalações prediais (elétricas, hidrossanitárias e complementares)': INSTALLATION_KEYWORDS,
}

const METHOD_TEXTS: Record<string, string> = {
  'Serviços preliminares e canteiro':
    'SERVIÇOS PRELIMINARES E CANTEIRO — mobilização, instalações provisórias, proteções de áreas comuns, acessos e serviços de engenharia preliminar (projetos, regularizações e locação) anteriormente ao início dos serviços produtivos.',
  'Demolições, remoções e escavações':
    'DEMOLIÇÕES, REMOÇÕES E ESCAVAÇÕES — remoção controlada por etapas, com corte setorial, proteção dos elementos que permanecem, umedecimento para controle de poeira, escoramento quando necessário e retirada contínua dos resíduos em caçambas estanques.',
  'Estrutura e fundações':
    'ESTRUTURA E FUNDAÇÕES — conferência dos projetos, locação, armação, fôrmas e concretagem conforme as composições unitárias de referência adotadas no orçamento, com curetagem/prazos mínimos de resistência antes do carregamento das peças.',
  'Alvenaria e vedações':
    'ALVENARIA E VEDAÇÕES — assentamento com esquadro, prumo e nível, amarração de fiadas, cutelos de amarração e conferência de vãos antes do inicio dos revestimentos.',
  'Revestimentos, pisos e acabamentos':
    'REVESTIMENTOS, PISOS E ACABAMENTOS — execução de chapisco, emboço/reboco, contrapiso, revestimentos e pintura em camadas, respeitando os tempos de cura e secagem entre camadas e o alinhamento com as esquadrias.',
  'Instalações prediais (elétricas, hidrossanitárias e complementares)':
    'INSTALAÇÕES PREDIAIS — execução das redes e pontos previstos no orçamento com testes de estanqueidade e energização ANTES do fechamento de paredes e forros, evitando retrabalho estrutural.',
}

const DENSITIES_KG_M3: Array<{ keywords: string[]; density: number }> = [
  { keywords: ['concreto', 'estrutura', 'viga', 'pilar', 'laje'], density: 2500 },
  { keywords: ['bloco', 'alvenaria de'], density: 1800 },
  { keywords: ['alvenaria', 'tijolo', 'parede'], density: 1500 },
  {
    keywords: ['argamassa', 'reboco', 'emboco', 'contrapiso', 'revestimento', 'piso'],
    density: 2000,
  },
  { keywords: ['madeira', 'forma', 'escora'], density: 600 },
  { keywords: ['solo', 'terra', 'escava'], density: 1600 },
  { keywords: ['metal', 'aço', 'aco', 'vergalhao', 'ferro'], density: 7850 },
  { keywords: ['gesso', 'drywall'], density: 1000 },
]

const CLASS_B_KEYWORDS = [
  'madeira',
  'metal',
  'aço',
  'aco',
  'vergalhao',
  'ferro',
  'plastico',
  'pvc',
  'vidro',
  'papel',
  'embalagem',
]
const CLASS_C_KEYWORDS = ['gesso', 'drywall']
const CLASS_D_KEYWORDS = [
  'tinta',
  'verniz',
  'solvente',
  'oleo',
  'amianto',
  'lampada',
  'bateria',
  'quimico',
  'perigoso',
  'asfalto',
]

function matchesAny(normText: string, keywords: string[]): boolean {
  return keywords.some((k) => normText.includes(k))
}

function densityFor(normText: string): number {
  for (const entry of DENSITIES_KG_M3) {
    if (matchesAny(normText, entry.keywords)) return entry.density
  }
  return 1300 // entulho misto solto / demolição geral
}

function residueClassFor(normText: string): ResidueClass {
  if (matchesAny(normText, CLASS_D_KEYWORDS)) return 'D'
  if (matchesAny(normText, CLASS_C_KEYWORDS)) return 'C'
  if (matchesAny(normText, CLASS_B_KEYWORDS)) return 'B'
  return 'A'
}

/** Fator de espessura/vazado médio (m) por m² demolido, conforme a natureza do serviço. */
function thicknessFactorFor(normText: string): number {
  if (matchesAny(normText, ['laje', 'estrutura', 'concreto', 'contrapiso'])) return 0.2
  if (matchesAny(normText, ['parede', 'alvenaria', 'divisoria', 'reboco duplo'])) return 0.15
  if (
    matchesAny(normText, [
      'piso',
      'revestimento',
      'azulejo',
      'ceramica',
      'forro',
      'gesso',
      'pintura',
      'regularizacao',
    ])
  )
    return 0.05
  return 0.1
}

function isRemovalService(normDescription: string, normStageName: string): boolean {
  return (
    matchesAny(normDescription, REMOVAL_KEYWORDS) || matchesAny(normStageName, REMOVAL_KEYWORDS)
  )
}

/* ------------------------------------------------------------------ */
/* Análise do volume estimado de material removido (Seção 6)            */
/* ------------------------------------------------------------------ */

function estimateServiceVolume(
  description: string,
  unit: string,
  quantity: number,
): { volumeM3: number; weightKg: number } {
  const norm = normalizeKeyword(description)
  const density = densityFor(norm)
  const u = normalizeKeyword(unit)
  const qty = Number(quantity) || 0

  let volume = 0
  if (qty > 0) {
    if (u === 'm³' || u === 'm3' || u === 'mc') {
      volume = qty
    } else if (u === 'm²' || u === 'm2' || u === 'mq') {
      volume = qty * thicknessFactorFor(norm)
    } else if (u === 'm' || u === 'ml') {
      volume = qty * 0.1 // seção transversal média presumida de 0,10 m²
    } else if (u === 'kg') {
      volume = qty / density
    } else if (u === 'ton' || u === 't') {
      volume = (qty * 1000) / density
    }
    // unidades não volumétricas (un, vb, cj, gl, ch, dia...) não geram estimativa de volume
  }

  return { volumeM3: Number(volume.toFixed(3)), weightKg: Number((volume * density).toFixed(0)) }
}

/**
 * Estima o volume de material removido a partir dos serviços de demolição/remoção do orçamento.
 * Regra de precedência: quando a ETAPA tem volumeM3/weightKg declarados pelo usuário (campos
 * próprios da árvore de orçamento), estes prevalecem sobre a estimativa por serviço daquela etapa.
 */
export function analyzeRemovedVolume(budget: FullBudget): ProposalVolumeAnalysis {
  const rows: ProposalVolumeRow[] = []

  const stages: BudgetStage[] = Array.isArray(budget.stages) ? budget.stages : []

  stages.forEach((stage) => {
    const normStage = normalizeKeyword(stage.name || '')
    const declaredVolume = Number(stage.volumeM3) || 0
    const declaredWeight = Number(stage.weightKg) || 0

    if (declaredVolume > 0 || declaredWeight > 0) {
      // Dado declarado pelo usuário na etapa — autoridade máxima
      const volume = declaredVolume > 0 ? declaredVolume : declaredWeight / 1300
      rows.push({
        stageCode: stage.code || String(stage.order || ''),
        stageName: stage.name || '',
        serviceCode: '—',
        description: `Volume declarado da etapa ${stage.code || ''} — ${stage.name || ''}`.trim(),
        unit: 'm³',
        quantity: Number(volume.toFixed(3)),
        estimatedVolumeM3: Number(volume.toFixed(3)),
        estimatedWeightKg: declaredWeight > 0 ? declaredWeight : Number((volume * 1300).toFixed(0)),
        residueClass: residueClassFor(normStage),
        isDeclaredByUser: true,
      })
      return
    }

    const services = Array.isArray(stage.services) ? stage.services : []
    services.forEach((service) => {
      const normDesc = normalizeKeyword(service.description || '')
      if (!isRemovalService(normDesc, normStage)) return
      const qty = Number(service.quantity) || 0
      if (qty <= 0) return
      const { volumeM3, weightKg } = estimateServiceVolume(
        service.description || '',
        service.unit || '',
        qty,
      )
      if (volumeM3 <= 0) return
      rows.push({
        stageCode: stage.code || String(stage.order || ''),
        stageName: stage.name || '',
        serviceCode: service.code || '',
        description: service.description || '',
        unit: service.unit || '',
        quantity: qty,
        estimatedVolumeM3: volumeM3,
        estimatedWeightKg: weightKg,
        residueClass: residueClassFor(normDesc),
        isDeclaredByUser: false,
      })
    })
  })

  const totalVolumeM3 = Number(rows.reduce((acc, r) => acc + r.estimatedVolumeM3, 0).toFixed(2))
  const totalWeightKg = rows.reduce((acc, r) => acc + r.estimatedWeightKg, 0)

  const volumeByClass: Record<ResidueClass, number> = { A: 0, B: 0, C: 0, D: 0 }
  rows.forEach((r) => {
    volumeByClass[r.residueClass] = Number(
      (volumeByClass[r.residueClass] + r.estimatedVolumeM3).toFixed(2),
    )
  })

  return {
    hasRemovalServices: rows.length > 0,
    removalServiceCount: rows.length,
    rows,
    totalVolumeM3,
    totalWeightKg,
    volumeByClass,
    cacambaCount5m3: Math.max(1, Math.ceil(totalVolumeM3 / 5)),
  }
}

/* ------------------------------------------------------------------ */
/* Análise de execução e complexidade (Seções 2, 3 e 7)                 */
/* ------------------------------------------------------------------ */

export function analyzeBudgetForProposal(budget: FullBudget): ProposalAnalysis {
  const volume = analyzeRemovedVolume(budget)

  const allServiceTexts: string[] = []
  const stages: BudgetStage[] = Array.isArray(budget.stages) ? budget.stages : []
  stages.forEach((stage) => {
    const normStage = normalizeKeyword(stage.name || '')
    allServiceTexts.push(normStage)
    const services = Array.isArray(stage.services) ? stage.services : []
    services.forEach((service) => allServiceTexts.push(normalizeKeyword(service.description || '')))
  })
  const combined = allServiceTexts.join(' | ')

  const methodTags = Object.keys(METHOD_TAG_KEYWORDS).filter((tag) =>
    matchesAny(combined, METHOD_TAG_KEYWORDS[tag]),
  )

  const hasInstallations = matchesAny(combined, INSTALLATION_KEYWORDS)
  const hasStructuralDemolition = matchesAny(combined, STRUCTURAL_KEYWORDS)
  const hasHeightWork = matchesAny(combined, HEIGHT_KEYWORDS)

  const servicesCount = summaryServicesCount(budget)
  const stagesCount = stages.length
  const areaM2 = Number(budget.work?.totalAreaM2) || 0

  const factors: string[] = []
  if (hasStructuralDemolition)
    factors.push('presença de demolição/intervenção em elementos estruturais')
  if (hasHeightWork) factors.push('trabalhos em altura, fachada ou cobertura')
  if (hasInstallations) factors.push('interferência com instalações prediais existentes')
  if (servicesCount > 15)
    factors.push(`quantitativo elevado de serviços (${servicesCount} itens orçados)`)
  if (stagesCount > 5) factors.push(`grande número de etapas de gestão (${stagesCount} etapas)`)
  if (areaM2 > 200) factors.push(`área de intervenção expressiva (${nf0.format(areaM2)} m²)`)
  if (volume.totalVolumeM3 > 30)
    factors.push(`volume relevante de material removido (${fmt(volume.totalVolumeM3)} m³)`)

  const score =
    (hasStructuralDemolition ? 2 : 0) +
    (hasHeightWork ? 1 : 0) +
    (hasInstallations ? 1 : 0) +
    (servicesCount > 15 ? 1 : 0) +
    (stagesCount > 5 ? 1 : 0) +
    (areaM2 > 200 ? 1 : 0)

  const complexityLevel: ProposalAnalysis['complexityLevel'] =
    score >= 4 ? 'elevada' : score >= 2 ? 'moderada' : 'reduzida'

  const specialties = Array.from(
    new Set(
      stages.flatMap((stage) =>
        (Array.isArray(stage.services) ? stage.services : [])
          .map((s) => s.composition?.specialty)
          .filter((sp): sp is string => Boolean(sp)),
      ),
    ),
  )

  // Prazo: estimativa proporcional ao escopo — NUNCA prazo contratual
  let weeks = Math.max(2, Math.ceil(servicesCount / 6))
  if (hasStructuralDemolition) weeks += 1
  if (volume.totalVolumeM3 > 30) weeks += 1
  weeks = Math.min(weeks, 24)
  const estimatedWeeksMax = weeks + Math.max(1, Math.ceil(weeks / 2))

  return {
    volume,
    methodTags,
    hasInstallations,
    hasStructuralDemolition,
    hasHeightWork,
    complexityLevel,
    complexityScore: score,
    complexityFactors: factors,
    specialtiesPresent: specialties,
    estimatedWeeksMin: weeks,
    estimatedWeeksMax,
  }
}

function summaryServicesCount(budget: FullBudget): number {
  const stages: BudgetStage[] = Array.isArray(budget.stages) ? budget.stages : []
  return stages.reduce((acc, st) => acc + (Array.isArray(st.services) ? st.services.length : 0), 0)
}

/* ------------------------------------------------------------------ */
/* Autorizações prévias (Seção 7)                                       */
/* ------------------------------------------------------------------ */

export function buildProposalAuthorizations(
  analysis: ProposalAnalysis,
  budget: FullBudget,
): ProposalAuthorization[] {
  const auths: ProposalAuthorization[] = [
    {
      title: 'Autorização do contratante e do condomínio',
      description:
        'Comunicação formal ao síndico/administração do condomínio e/ou ao proprietário do imóvel sobre datas, horários, uso de áreas comuns, elevador de serviço e ponto de carga/depositário, quando a obra estiver situada em condomínio.',
      responsibility: 'Contratante',
    },
  ]

  if (analysis.volume.hasRemovalServices || analysis.hasStructuralDemolition) {
    auths.push({
      title: 'Alvará / autorização municipal de execução de obra',
      description:
        'Verificação junto à Prefeitura do município da obra sobre a exigência de alvará de execução, taxa de licenciamento ou declaração de dispensa, conforme a legislação municipal e o porte da intervenção. A CONCE apoia a elaboração da documentação técnica necessária.',
      responsibility: 'Conjunta',
    })
  }

  if (analysis.volume.totalVolumeM3 > 0) {
    auths.push({
      title: 'Ocupação de via pública para posicionamento de caçambas',
      description:
        'Quando o posicionamento de caçambas estanques exigir ocupação de logradouro público, obtenção da autorização de ocupação de via junto à Prefeitura e, quando exigido, do plano de gerenciamento de resíduos da construção civil (PGRCC) municipal.',
      responsibility: 'Contratante',
    })
  }

  if (analysis.hasInstallations) {
    auths.push({
      title: 'Autorizações junto às concessionárias',
      description:
        'Solicitação às concessionárias de energia elétrica, água e esgoto (e gás canalizado, quando houver) de cortes, religamentos, alteração de ramais ou aprovação de projetos de rede afetados pela execução.',
      responsibility: 'Contratante',
    })
  }

  if (analysis.hasStructuralDemolition) {
    auths.push({
      title: 'Projeto estrutural complementar / laudo técnico',
      description:
        'Quando a execução envolver remoção ou intervenção em elementos estruturais, apresentação prévia de projeto estrutural complementar ou laudo técnico assinado por engenheiro habilitado, com ART específica, antes do início dos trabalhos correspondentes.',
      responsibility: 'Conjunta',
    })
  }

  auths.push({
    title: 'ART — Anotação de Responsabilidade Técnica',
    description:
      'Registro da ART do responsável técnico (Eng. Edenir Souza da Rosa, CREA/RS-252397) no CREA/RS para os serviços objeto desta proposta, sob responsabilidade da CONCE.',
    responsibility: 'CONCE',
  })

  if (budget.publicWork?.enabled) {
    auths.push({
      title: 'Ordem de serviço do órgão contratante',
      description: `Emissão da ordem de início e das autorizações administrativas pelo órgão contratante (${
        budget.publicWork.agency || 'órgão público'
      }), conforme o contrato ${budget.publicWork.contractNumber || '—'} e o processo licitatório ${
        budget.publicWork.tenderNumber || '—'
      }.`,
      responsibility: 'Contratante',
    })
  }

  return auths
}

/* ------------------------------------------------------------------ */
/* Geração das 7 seções do documento                                    */
/* ------------------------------------------------------------------ */

export function buildProposalSections(
  budget: FullBudget,
  summary: CalculationSummary,
  analysis: ProposalAnalysis,
): ProposalSectionData[] {
  const stages: BudgetStage[] = Array.isArray(budget.stages) ? budget.stages : []
  const workName = sanitizeProposalText(budget.work?.name) || 'Empreendimento de Engenharia'
  const workAddress = budget.work?.address
    ? `${sanitizeProposalText(budget.work.address)}, ${budget.work.city || 'Porto Alegre'}/${budget.work.state || 'RS'}`
    : `${budget.work.city || 'Porto Alegre'}/${budget.work.state || 'RS'}`
  const clientName = sanitizeProposalText(budget.client?.name) || 'Cliente Contratante'
  const budgetCode = sanitizeProposalText(budget.code) || 'ORC-CONCE'
  const servicesCount = summary.servicesCount || summaryServicesCount(budget)
  const areaM2 = Number(budget.work?.totalAreaM2) || 0

  /* ---------------- 1. OBJETIVO DO TRABALHO ---------------- */
  const objectiveParagraphs: string[] = [
    `A CONCE — Serviço de Engenharia e Consultoria LTDA apresenta a presente ${PROPOSAL_DOCUMENT_TITLE.toLowerCase()} para a execução dos serviços de engenharia relativos à obra "${workName}", situada em ${workAddress}, tendo como contratante ${clientName}.`,
  ]

  const workDescription = sanitizeProposalText(budget.work?.description)
  if (workDescription) {
    objectiveParagraphs.push(workDescription)
  }

  objectiveParagraphs.push(
    `O escopo objeto desta proposta está detalhado no orçamento ${budgetCode} e compreende ${stages.length} etapa(s) e ${servicesCount} serviço(s) quantificados, conforme discriminação a seguir:`,
  )

  const scopeItems: string[] = stages.map((stage, idx) => {
    const services = Array.isArray(stage.services) ? stage.services : []
    const serviceList =
      services.length > 0
        ? services
            .map(
              (s) =>
                `${sanitizeProposalText(s.description)} (${nf1.format(Number(s.quantity) || 0)} ${s.unit})`,
            )
            .join('; ')
        : 'sem serviços quantificados no momento'
    return `Etapa ${stage.code || String(idx + 1).padStart(2, '0')} — ${sanitizeProposalText(stage.name)}: ${serviceList}.`
  })

  objectiveParagraphs.push(
    `Os quantitativos, composições unitárias e preços correspondentes constam do orçamento ${budgetCode}, que integra esta proposta como documento complementar e prevalece como referência de medição.`,
  )

  /* ---------------- 2. FORMA DE EXECUÇÃO ---------------- */
  const executionParagraphs: string[] = [
    `A execução será conduzida sob a responsabilidade técnica do Eng. Edenir Souza da Rosa (CREA/RS-252397), com planejamento sequenciado conforme a ordem das ${stages.length} etapa(s) do orçamento ${budgetCode}, liberando-se cada frente de serviço somente após a conclusão satisfatória da anterior, de modo a minimizar retrabalho e interferências entre disciplinas.`,
  ]

  if (analysis.methodTags.length > 0) {
    executionParagraphs.push(
      'Considerando os serviços efetivamente presentes no orçamento, a metodologia de execução compreende os seguintes processos construtivos:',
    )
  }

  const executionItems = analysis.methodTags.map((tag) => METHOD_TEXTS[tag] || tag)

  executionParagraphs.push(
    'Os insumos e produtividades foram parametrizados por composições unitárias de referência (SINAPI/CAIXA e/ou CPUs próprias da CONCE), e a alocação de equipes seguirá a sequência das etapas descritas no item 1, com controle diário de produção pelo responsável técnico.',
  )

  /* ---------------- 3. COMPLEXIDADE DO SERVIÇO ---------------- */
  const complexityParagraphs: string[] = [
    `Com base no orçamento ${budgetCode} (${stages.length} etapa(s), ${servicesCount} serviço(s) e ${
      summary.inputsCount
    } insumo(s) especificados${areaM2 > 0 ? `, área de intervenção de ${nf0.format(areaM2)} m²` : ''}), a CONCE avalia tecnicamente a complexidade do serviço como ${analysis.complexityLevel.toUpperCase()} para fins de planejamento, dimensionamento de equipes e supervisão técnica.`,
  ]

  if (analysis.complexityFactors.length > 0) {
    complexityParagraphs.push('Os fatores que fundamentam essa avaliação são:')
  }

  const complexityItems = analysis.complexityFactors
  if (analysis.specialtiesPresent.length > 0) {
    complexityItems.push(
      `diversidade de especialidades envolvidas: ${analysis.specialtiesPresent.join(', ')}.`,
    )
  }

  complexityParagraphs.push(
    `Essa classificação orienta a proporção entre equipes de produção e supervisão técnica: quanto ${analysis.complexityLevel === 'elevada' ? 'maior a complexidade, maior a densidade de supervisão, maior o número de vistorias intermediárias e mais rigorosos os controles de qualidade e segurança' : 'menor a complexidade, mais enxuta a equipe de supervisão, mantidos os controles mínimos de qualidade, segurança e conformidade normativa exigidos pelo responsável técnico'}.`,
  )

  /* ---------------- 4. DESTINAÇÃO FINAL DOS RESÍDUOS ---------------- */
  const residueParagraphs: string[] = [
    'Os resíduos de construção civil (RCC) gerados durante a execução serão geridos em conformidade com a Resolução CONAMA nº 307/2002 do CONAMA e com as normas ABNT aplicáveis (NBR 15.112 — áreas de transbordo e triagem; NBR 15.113 — aterro de resíduos da construção civil; NBR 15.114 — agregados reciclados), com segregação na fonte, acondicionamento e transporte por empresa de locação de caçambas estanques.',
    'Os resíduos da classe A (concreto, argamassa, alvenaria, revestimentos e material de demolição reciclável) serão encaminhados a aterro de resíduos da construção civil classe A ou a áreas de triagem/transbordo licenciadas, admitida sua reciclagem como agregado. Os resíduos da classe B (madeira, metais, plásticos, embalagens) serão destinados a recicladores ou cooperativas de materiais recicláveis, quando disponíveis no município. Resíduos da classe C (gesso/drywall) terão destinação conforme a logística existente na região, em consonância com o poder público municipal.',
    'Os resíduos da classe D (perigosos — tintas, solventes, óleos, amianto, lâmpadas e similares) serão segregados, acondicionados identificados e destinados EXCLUSIVAMENTE a empresa licenciada para tratamento/disposição final, com comprovação documental de destino final, nunca depositados em caçambas de entulho comum, vias públicas, terrenos baldios ou corpos d\u2019água. Ficam vedadas quaisquer formas de descarte irregular.',
  ]

  if (analysis.volume.hasRemovalServices) {
    const classDItems = analysis.volume.rows
      .filter((r) => r.residueClass === 'D')
      .map((r) => sanitizeProposalText(r.description))
    if (classDItems.length > 0) {
      residueParagraphs.push(
        `O orçamento contempla serviços com potencial de geração de resíduos classe D (${classDItems.join(
          '; ',
        )}), que receberão o tratamento específico descrito neste item.`,
      )
    } else {
      residueParagraphs.push(
        'Pela natureza dos serviços orçados, a geração esperada concentra-se em resíduos classes A e B (demolições, alvenaria, argamassas e embalagens). Caso venham a ser identificados resíduos classe D durante a execução, será aplicado o procedimento de destinação licenciada descrito neste item, com comunicação prévia ao contratante.',
      )
    }
    residueParagraphs.push(
      `A estimativa quantitativa dos resíduos a remover consta do item 6 desta proposta, e sua classificação preliminar por classe é a seguinte: classe A — ${fmt(
        analysis.volume.volumeByClass.A,
      )} m³; classe B — ${fmt(analysis.volume.volumeByClass.B)} m³; classe D — ${fmt(
        analysis.volume.volumeByClass.D,
      )} m³ (estimativa prévia, a confirmar nas medições de execução).`,
    )
  } else {
    residueParagraphs.push(
      'Pelo escopo orçado, não há previsão de geração significativa de resíduos de construção civil. Os resíduos eventuais (embalagens de insumos, sobras de materiais) serão segregados e destinados conforme descrito neste item, em caçambas ou contêineres disponibilizados pela empresa de locação contratada.',
    )
  }

  residueParagraphs.push(
    'Quando exigido pela legislação municipal, o plano de gerenciamento de resíduos (PGRCC) do município será observado, cabendo ao contratante as autorizações administrativas previstas no item 7 desta proposta.',
  )

  /* ---------------- 5. FORMA DE FISCALIZAÇÃO UTILIZADA ---------------- */
  const inspectionItems = [
    `Vistorias técnicas periódicas ao canteiro pelo Eng. Edenir Souza da Rosa (CREA/RS-252397), com registro fotográfico e relatório de evolução ao contratante;`,
    `Conferência de conformidade de cada etapa antes de liberar a etapa seguinte — etapas controladas nesta obra: ${
      stages.map((st) => sanitizeProposalText(st.name)).join('; ') ||
      'conforme planejamento a detalhar'
    };`,
    `Medições físicas periódicas confrontadas com os quantitativos do orçamento ${budgetCode}, com apontamento de eventuais diferenças entre o executado e o orçado;`,
    'Controle de recebimento e conferência dos insumos aplicados em relação às especificações das composições unitárias do orçamento;',
    'Verificação de conformidade com as normas técnicas ABNT aplicáveis e com as condições de segurança e saúde no trabalho (NRs aplicáveis à obra);',
    'Registro formal da ART no CREA/RS e disponibilização do número da anotação ao contratante;',
  ]
  if (analysis.volume.hasRemovalServices) {
    inspectionItems.push(
      'Conferência dos comprovantes de destinação dos resíduos (caçambas e destinos finais licenciados) antes da liberação da medição correspondente;',
    )
  }
  inspectionItems.push(
    'Registros de execução, ocorrências e aprovações mantidos no sistema de orçamentos da CONCE, com histórico auditável de alterações do orçamento e das medições.',
  )

  const inspectionParagraphs = [
    `A fiscalização e o acompanhamento técnico da execução serão exercidos pelo responsável técnico da CONCE, ${'Eng. Edenir Souza da Rosa'} (CREA/RS-252397), mediante os mecanismos a seguir, aplicáveis na proporção do escopo contratado:`,
    'O contratante poderá designar representante para fiscalização complementar junto à CONCE. Eventuais acréscimos, exclusões ou alterações de escopo identificados durante a fiscalização serão formalizados por termo aditivo, com reavaliação de quantitativos e prazos antes da execução do item alterado.',
  ]

  /* ---------------- 6. VOLUME ESTIMADO DE MATERIAL REMOVIDO ---------------- */
  const volumeParagraphs: string[] = []
  let volumeSection: ProposalSectionData

  if (analysis.volume.hasRemovalServices) {
    volumeParagraphs.push(
      `A partir dos serviços de demolição, remoção e escavação presentes no orçamento ${budgetCode} (${
        analysis.volume.removalServiceCount
      } item(ns) identificado(s)), a CONCE elaborou a estimativa prévia de volume de material a remover indicada a seguir. Os volumes são ESTIMATIVAS DE PLANEJAMENTO calculadas por quantidades e fatores técnicos médios de espessura/vazado, a serem confirmados nas medições de execução.`,
    )

    const tableRows = analysis.volume.rows.map((r) => [
      `${r.stageCode}${r.serviceCode && r.serviceCode !== '—' ? `.${r.serviceCode}` : ''} — ${sanitizeProposalText(r.description)}`,
      r.unit,
      nf1.format(r.quantity),
      fmt(r.estimatedVolumeM3),
      nf0.format(r.estimatedWeightKg),
      r.residueClass,
    ])

    const volumeItems = [
      `Volume total estimado de material removido: ${fmt(analysis.volume.totalVolumeM3)} m³ (massa estimada de ${nf0.format(analysis.volume.totalWeightKg)} kg);`,
      `Equivalente logístico aproximado: ${nf0.format(analysis.volume.cacambaCount5m3)} caçamba(s) basculante(s) estanque(s) de 5 m³;`,
      'Os resíduos serão retirados de forma contínua ao longo da execução, sem acúmulo em áreas comuns, conforme o item 4 desta proposta.',
    ]

    volumeSection = {
      number: 6,
      title: 'VOLUME ESTIMADO DE MATERIAL REMOVIDO',
      paragraphs: volumeParagraphs,
      items: volumeItems,
      table: {
        headers: [
          'Serviço de remoção / demolição',
          'Unid.',
          'Quantidade',
          'Vol. estimado (m³)',
          'Massa estimada (kg)',
          'Classe',
        ],
        rows: tableRows,
      },
      footnotes: [
        'Estimativa elaborada com fatores técnicos médios (espessura de 0,05 m para revestimentos/pisos, 0,15 m para alvenarias, 0,20 m para estruturas/contrapisos e massa específica conforme a natureza do material). Volumes declarados por etapa no orçamento prevalecem sobre estas estimativas.',
      ],
    }
  } else {
    volumeParagraphs.push(
      `Não há, no escopo orçado do orçamento ${budgetCode}, previsão significativa de remoção de material — não foram identificados serviços de demolição, escavação, remoção de revestimentos ou retirada de entulho em escala relevante. Eventuais pequenos volumes decorrentes de ajustes de execução serão removidos nas caçambas previstas para os resíduos eventuais, sem impacto no quantitativo contratado.`,
      'Caso, durante a execução, venha a se constatar a necessidade de remoção de material em escala superior à prevista, o quantitativo será objeto de medição específica e, se aplicável, de termo aditivo, antes da contratação do serviço adicional.',
    )
    volumeSection = {
      number: 6,
      title: 'VOLUME ESTIMADO DE MATERIAL REMOVIDO',
      paragraphs: volumeParagraphs,
      footnotes: [
        'Estimativa derivada exclusivamente dos serviços de demolição/remoção presentes no orçamento; inexistindo tais serviços, declara-se formalmente a ausência de previsão significativa.',
      ],
    }
  }

  /* ---------------- 7. PRAZO E AUTORIZAÇÕES PRÉVIAS ---------------- */
  const deadlineText =
    (budget.work?.executionDeadline && sanitizeProposalText(budget.work.executionDeadline)) ||
    (budget.work?.deadlineValue
      ? `${budget.work.deadlineValue} ${budget.work.deadlineUnit || 'meses'}`
      : '')

  const prazoParagraphs: string[] = []
  if (deadlineText) {
    prazoParagraphs.push(
      `O prazo de execução constante do orçamento ${budgetCode} é de ${deadlineText}. Adicionalmente, a previsão inicial de planejamento da CONCE, proporcional ao escopo orçado (${servicesCount} serviço(s) em ${stages.length} etapa(s)), é de aproximadamente ${analysis.estimatedWeeksMin} a ${analysis.estimatedWeeksMax} semanas de efetiva produção.`,
    )
  } else {
    prazoParagraphs.push(
      `Com base no escopo orçado (${servicesCount} serviço(s) em ${stages.length} etapa(s)), a previsão inicial de planejamento da CONCE para a execução é de aproximadamente ${analysis.estimatedWeeksMin} a ${analysis.estimatedWeeksMax} semanas de efetiva produção, contadas da liberação do canteiro e das autorizações prévias listadas neste item.`,
    )
  }
  prazoParagraphs.push(
    'IMPORTANTE: trata-se de ESTIMATIVA DE PLANEJAMENTO, e não de prazo contratual garantido. O prazo definitivo será fixado na formalização do contrato, considerando a disponibilidade do canteiro, a liberação das autorizações prévias e as condições climáticas e logísticas da época da execução.',
  )

  const authorizations = buildProposalAuthorizations(analysis, budget)
  const authItems = authorizations.map(
    (a) => `${a.title} — ${a.description} (responsabilidade: ${a.responsibility}).`,
  )

  prazoParagraphs.push(
    'As autorizações prévias previstas em lei e/ou em norma condominial para este tipo de intervenção são as relacionadas a seguir. A deflagração dos serviços pressupõe a entrega das autorizações de responsabilidade do contratante; atrasos nessas liberações repercutem proporcionalmente no prazo total de execução.',
  )

  prazoParagraphs.push(
    'A presente enumeração é uma previsão técnica das autorizações usualmente exigidas para obras da natureza orçada, sem substituir a verificação específica junto ao condomínio, à Prefeitura e às concessionárias, que poderá apontar exigências adicionais.',
  )

  const sections: ProposalSectionData[] = [
    {
      number: 1,
      title: 'OBJETIVO DO TRABALHO',
      paragraphs: objectiveParagraphs,
      items: scopeItems,
    },
    {
      number: 2,
      title: 'FORMA DE EXECUÇÃO',
      paragraphs: executionParagraphs,
      items: executionItems.length > 0 ? executionItems : undefined,
    },
    {
      number: 3,
      title: 'COMPLEXIDADE DO SERVIÇO',
      paragraphs: complexityParagraphs,
      items: complexityItems.length > 0 ? complexityItems : undefined,
    },
    {
      number: 4,
      title: 'DESTINAÇÃO FINAL DOS RESÍDUOS',
      paragraphs: residueParagraphs,
    },
    {
      number: 5,
      title: 'FORMA DE FISCALIZAÇÃO UTILIZADA',
      paragraphs: inspectionParagraphs,
      items: inspectionItems,
    },
    volumeSection,
    {
      number: 7,
      title: 'PRAZO E AUTORIZAÇÕES PRÉVIAS PARA EXECUÇÃO',
      paragraphs: prazoParagraphs,
      items: authItems,
    },
  ]

  return sections
}
