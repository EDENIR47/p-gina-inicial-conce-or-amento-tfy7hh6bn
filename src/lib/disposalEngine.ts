/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Motor de Classificação e Gerenciamento de Resíduos da Construção Civil (RCD)
 * Conforme Resolução CONAMA nº 307/2002 e alterações posteriores (CONAMA 348, 431, 448 e 469).
 *
 * Classificação CONAMA 307:
 * - Classe A: Alvenaria, concreto, argamassas, cerâmicos (tijolos, blocos, telhas, pisos), rochas, solos de terraplenagem. Reutilizáveis ou recicláveis como agregados reciclados ou aterros de RCD licenciados.
 * - Classe B: Plásticos, papel, papelão, metais (aço, ferro, alumínio, cobre), madeiras, vidros. Recicláveis ou encaminháveis a cooperativas/sucateiras industriais.
 * - Classe C: Resíduos sem tecnologias economicamente viáveis para reciclagem (antigamente gesso; o gesso foi reclassificado pela CONAMA 431 para Classe B, mas mantemos grupo dedicado com recomendação de reciclagem de sulfato de cálcio).
 * - Classe D: Resíduos perigosos oriundos do processo construtivo: tintas, solventes, óleos, vernizes, impermeabilizantes químicos, lâmpadas fluorescentes, amianto, contaminados. Devem ser descartados com transportador e destinador homologados (co-processamento / incineração / aterro industrial Classe I).
 */

import { BudgetInput, BudgetService, BudgetStage, FullBudget } from '@/types/budgetEngine'
import { CONCE_COMPANY } from '@/lib/conceCompany'

export type ConamaClass = 'Classe A' | 'Classe B' | 'Classe C' | 'Classe D'

export type WasteGroupId =
  | 'entulho_alvenaria' // Classe A
  | 'madeira' // Classe B
  | 'metal_aco' // Classe B
  | 'plastico_pvc' // Classe B
  | 'papel_papelao' // Classe B
  | 'vidro' // Classe B
  | 'gesso' // Classe B (CONAMA 431)
  | 'tintas_solventes' // Classe D
  | 'outros_residuos' // Classe C / Diversos

export interface WasteGroupDefinition {
  id: WasteGroupId
  title: string
  conamaClass: ConamaClass
  description: string
  recommendedDestination: string
  destinationTypeDefault: string
  densityKgPerM3: number // Para estimativas de volume cúbico
}

export const WASTE_GROUPS: Record<WasteGroupId, WasteGroupDefinition> = {
  entulho_alvenaria: {
    id: 'entulho_alvenaria',
    title: 'Resíduos Minerais / Alvenaria / Concreto / Cerâmica',
    conamaClass: 'Classe A',
    description:
      'Sobras de tijolos, blocos cerâmicos, blocos de concreto, argamassas, contrapiso, reboco, sobras de demolição, pisos e revestimentos cerâmicos.',
    recommendedDestination:
      'Central de Triagem e Reciclagem de RCD (usina de britagem móvel/fixa) ou Aterro de Inertes devidamente licenciado pelo órgão ambiental municipal/estadual.',
    destinationTypeDefault: 'Central de Britagem e Reciclagem de RCD / Aterro de Inertes',
    densityKgPerM3: 1300,
  },
  madeira: {
    id: 'madeira',
    title: 'Madeiras e Compensados de Formas e Escoramentos',
    conamaClass: 'Classe B',
    description:
      'Pontaletes, tábuas de pinus/cedrinho, chapas de compensado resinado/plastificado, sobras de caixilharia e forros.',
    recommendedDestination:
      'Reaproveitamento energético licenciado (caldeiras industriais homologadas, cavacos para biomassa) ou usinas de reciclagem de madeira e painéis aglomerados.',
    destinationTypeDefault: 'Biomassa / Usina de Reciclagem de Madeira',
    densityKgPerM3: 600,
  },
  metal_aco: {
    id: 'metal_aco',
    title: 'Metais, Aço Armado e Perfis Metálicos',
    conamaClass: 'Classe B',
    description:
      'Pontas de vergalhão CA-50/CA-60, arames recozidos, perfis de drywall/aço galvanizado, tubulações de cobre/ferro, sobras de esquadrias de alumínio.',
    recommendedDestination:
      'Comércio atacadista de sucatas ferrosas/não-ferrosas homologado e siderurgias licenciadas para fundição e reciclagem metalúrgica integral.',
    destinationTypeDefault: 'Sucateira Industrial Homologada / Indústria Siderúrgica',
    densityKgPerM3: 7850,
  },
  plastico_pvc: {
    id: 'plastico_pvc',
    title: 'Plásticos, PVC e Polímeros Sintéticos',
    conamaClass: 'Classe B',
    description:
      'Sobras e cortes de tubulações e conexões de PVC, conduítes corrugados de polietileno, lonas plásticas, eletrodutos e fitas de vedação.',
    recommendedDestination:
      'Indústria recicladora de polímeros ou cooperativas de triagem de materiais plásticos cadastradas e licenciadas.',
    destinationTypeDefault: 'Cooperativa / Indústria de Reciclagem de Plásticos',
    densityKgPerM3: 250,
  },
  papel_papelao: {
    id: 'papel_papelao',
    title: 'Papel, Papelão e Embalagens de Sacaria Vazia',
    conamaClass: 'Classe B',
    description:
      'Sacos de cimento vazios e despressurizados, sacaria de cal e argamassa, caixas de papelão corrugado de proteção e embalagens de louças/metais.',
    recommendedDestination:
      'Cooperativas de catadores locais habilitadas ou indústrias de celulose e reciclagem papeleira licenciadas.',
    destinationTypeDefault: 'Cooperativa de Reciclagem de Papel / Indústria Papeleira',
    densityKgPerM3: 150,
  },
  vidro: {
    id: 'vidro',
    title: 'Vidros e Envidraçamentos',
    conamaClass: 'Classe B',
    description:
      'Cacos e sobras de vidros planos laminados, temperados ou comuns, espelhos e sobras de envidraçamento de vãos.',
    recommendedDestination:
      'Usinas de moagem e beneficiamento de vidro plano ou vidrarias com fornos de fusão de cacos para reaproveitamento circular.',
    destinationTypeDefault: 'Beneficiadora de Vidro Plano / Indústria Vidreira',
    densityKgPerM3: 2500,
  },
  gesso: {
    id: 'gesso',
    title: 'Gesso, Placas de Drywall e Revestimentos Cartonados',
    conamaClass: 'Classe B',
    description:
      'Sobras de placas de gesso acartonado (drywall), pó de gesso de revestimento, sancas e forros modulares (Resolução CONAMA nº 431/2011).',
    recommendedDestination:
      'Usinas especializadas de reciclagem de sulfato de cálcio para reutilização na fabricação de cimento, blocos de gesso ou correção agrícola.',
    destinationTypeDefault: 'Central Especializada de Reciclagem de Gesso / Britagem Agrícola',
    densityKgPerM3: 850,
  },
  tintas_solventes: {
    id: 'tintas_solventes',
    title: 'Resíduos Perigosos / Tintas, Solventes e Químicos',
    conamaClass: 'Classe D',
    description:
      'Latas com resíduos de tintas acrílicas, esmaltes sintéticos, vernizes, solventes, tiner, seladores, impermeabilizantes betuminosos e trinchas/rolos contaminados.',
    recommendedDestination:
      'Co-processamento em fornos de cimenteiras homologadas, incineração térmica controlada ou Aterro Industrial Classe I (NBR 10.004) com MTR emitido.',
    destinationTypeDefault: 'Unidade de Co-processamento Licenciada / Aterro Industrial Classe I',
    densityKgPerM3: 1100,
  },
  outros_residuos: {
    id: 'outros_residuos',
    title: 'Outros Resíduos e Embalagens Diversas',
    conamaClass: 'Classe C',
    description:
      'Materiais compósitos, fitas adesivas, lixas gastas e resíduos de limpeza fina pós-obra sem possibilidade de reciclagem convencional.',
    recommendedDestination:
      'Aterro sanitário municipal homologado ou unidade de tratamento de resíduos sólidos urbanos licenciada.',
    destinationTypeDefault: 'Aterro Sanitário Licenciado / Unidade de Transbordo',
    densityKgPerM3: 500,
  },
}

export interface ClassifiedDisposalItem {
  stageCode: string
  stageName: string
  serviceCode: string
  serviceDescription: string
  inputCode: string
  inputDescription: string
  unit: string
  budgetQuantity: number // Quantidade total aplicada no serviço (servico.quantity * insumo.coefficient)
  estimatedWeightKg: number // Estimativa técnica em massa
}

export interface DisposalSheet {
  id: string
  wasteGroup: WasteGroupId
  wasteType: string
  conamaClass: ConamaClass
  description: string
  estimatedWeightKg: number
  estimatedVolumeM3: number
  recommendedDestination: string
  items: ClassifiedDisposalItem[]
  certificate: {
    status: 'pendente' | 'emitido' | 'conferido'
    transporterName?: string
    transporterCnpj?: string
    destinationCompany?: string
    destinationCnpj?: string
    destinationType?: string
    certificateOrManifestNumber?: string
    environmentalLicense?: string
    disposalDate?: string
    responsibleTechnician?: string
    notes?: string
  }
}

export interface DisposalDocumentData {
  version: number
  attachedAt: string
  updatedAt: string
  budgetCode: string
  budgetTitle?: string
  clientName?: string
  workName?: string
  workAddress?: string
  technicalResponsible: string
  technicalCrea: string
  totalMaterialInputsCount: number
  totalEstimatedWeightKg: number
  sheets: DisposalSheet[]
}

/**
 * Normaliza o texto para busca insensível a acentos e maiúsculas
 */
function cleanText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Classifica um insumo em um grupo de resíduo CONAMA 307 com base no texto descritivo e na unidade
 */
export function classifyWasteInput(
  input: BudgetInput,
  serviceDescription?: string,
): { groupId: WasteGroupId; lossFactor: number; massPerUnitKg: number } {
  const desc = cleanText(`${input.description} ${serviceDescription || ''} ${input.code}`)
  const unit = cleanText(input.unit)

  // 1. TINTAS, SOLVENTES, PRODUTOS QUÍMICOS E IMPERMEABILIZANTES (Classe D)
  if (
    desc.includes('tinta') ||
    desc.includes('solvente') ||
    desc.includes('thinner') ||
    desc.includes('tiner') ||
    desc.includes('verniz') ||
    desc.includes('selador') ||
    desc.includes('primer') ||
    desc.includes('impermeabilizante') ||
    desc.includes('asfalto') ||
    desc.includes('betum') ||
    desc.includes('manta asfalt') ||
    desc.includes('resina') ||
    desc.includes('silicone') ||
    desc.includes('adesivo estrutural') ||
    desc.includes('epoxi')
  ) {
    let mass = 1.2
    if (unit === 'l' || unit === 'litro' || unit === 'lt') mass = 1.15
    if (unit === 'kg') mass = 1.0
    if (unit === 'galao' || unit === 'gl') mass = 4.2
    if (unit === 'lata' || unit === 'balde') mass = 18.0
    return { groupId: 'tintas_solventes', lossFactor: 0.1, massPerUnitKg: mass }
  }

  // 2. GESSO E DRYWALL (Classe B / Antiga C)
  if (
    desc.includes('gesso') ||
    desc.includes('drywall') ||
    desc.includes('placa de gesso') ||
    desc.includes('forro de gesso') ||
    desc.includes('cartonado')
  ) {
    let mass = 10.0 // peso aproximado m² drywall padrão 12.5mm ~ 8 a 10 kg
    if (unit === 'kg') mass = 1.0
    if (unit === 'saco') mass = 40.0
    if (unit === 'm2' || unit === 'm²') mass = 9.5
    return { groupId: 'gesso', lossFactor: 0.08, massPerUnitKg: mass }
  }

  // 3. METAIS E AÇO (Classe B)
  if (
    desc.includes('aco') ||
    desc.includes('ferro') ||
    desc.includes('vergalhao') ||
    desc.includes('arame') ||
    desc.includes('perfil metalico') ||
    desc.includes('perfil de aco') ||
    desc.includes('aluminio') ||
    desc.includes('cobre') ||
    desc.includes('tela soldada') ||
    desc.includes('chapa galvaniz') ||
    desc.includes('parafuso') ||
    desc.includes('prego') ||
    desc.includes('barra de aco') ||
    desc.includes('canaleta metal') ||
    desc.includes('montante') ||
    desc.includes('guia metal')
  ) {
    let mass = 1.0
    if (unit === 'kg') mass = 1.0
    if (unit === 'barra' || unit === 'br') mass = 8.5
    if (unit === 'm' || unit === 'metro') mass = 1.5
    if (unit === 'm2' || unit === 'm²') mass = 3.0
    return { groupId: 'metal_aco', lossFactor: 0.05, massPerUnitKg: mass }
  }

  // 4. MADEIRA E COMPENSADOS (Classe B)
  if (
    desc.includes('madeira') ||
    desc.includes('tabua') ||
    desc.includes('pontalete') ||
    desc.includes('sarrafo') ||
    desc.includes('viga de madeira') ||
    desc.includes('caibro') ||
    desc.includes('compensado') ||
    desc.includes('mdf') ||
    desc.includes('porta de madeira') ||
    desc.includes('batente de madeira') ||
    desc.includes('eucalipto') ||
    desc.includes('pinus')
  ) {
    let mass = 5.0
    if (unit === 'm' || unit === 'metro') mass = 2.5
    if (unit === 'm2' || unit === 'm²') mass = 10.0
    if (unit === 'm3' || unit === 'm³') mass = 600.0
    if (unit === 'un' || unit === 'cj') mass = 15.0
    return { groupId: 'madeira', lossFactor: 0.1, massPerUnitKg: mass }
  }

  // 5. PLÁSTICO E PVC (Classe B)
  if (
    desc.includes('pvc') ||
    desc.includes('tubo') ||
    desc.includes('conexao') ||
    desc.includes('conduite') ||
    desc.includes('eletroduto') ||
    desc.includes('polietileno') ||
    desc.includes('polipropileno') ||
    desc.includes('plastico') ||
    desc.includes('lona plastica') ||
    desc.includes('caixa d agua') ||
    desc.includes('caixa de luz') ||
    desc.includes('ralo') ||
    desc.includes('sifao')
  ) {
    let mass = 0.8
    if (unit === 'm' || unit === 'metro') mass = 0.6
    if (unit === 'm2' || unit === 'm²') mass = 0.2
    if (unit === 'un') mass = 0.3
    return { groupId: 'plastico_pvc', lossFactor: 0.06, massPerUnitKg: mass }
  }

  // 6. VIDRO (Classe B)
  if (desc.includes('vidro') || desc.includes('espelho') || desc.includes('blindex')) {
    let mass = 15.0
    if (unit === 'm2' || unit === 'm²') mass = 15.0 // Vidro 6mm ~ 15 kg/m²
    if (unit === 'un') mass = 8.0
    return { groupId: 'vidro', lossFactor: 0.05, massPerUnitKg: mass }
  }

  // 7. PAPEL / PAPELÃO / SACOS VAZIOS (Classe B)
  if (
    desc.includes('papel') ||
    desc.includes('papelao') ||
    desc.includes('caixa de papelao') ||
    desc.includes('embalagem')
  ) {
    return { groupId: 'papel_papelao', lossFactor: 0.95, massPerUnitKg: 0.25 }
  }

  // 8. ALVENARIA, CONCRETO, ARGAMASSA, CERÂMICA, AREIA, BRITA, TIJOLO, BLOCO (Classe A)
  if (
    desc.includes('cimento') ||
    desc.includes('argamassa') ||
    desc.includes('areia') ||
    desc.includes('brita') ||
    desc.includes('pedra') ||
    desc.includes('concreto') ||
    desc.includes('tijolo') ||
    desc.includes('bloco') ||
    desc.includes('ceramica') ||
    desc.includes('porcelanato') ||
    desc.includes('azulejo') ||
    desc.includes('piso') ||
    desc.includes('revestimento') ||
    desc.includes('telha') ||
    desc.includes('rejunte') ||
    desc.includes('cal') ||
    desc.includes('graute') ||
    desc.includes('demolicao') ||
    desc.includes('entulho') ||
    desc.includes('bancada de granito') ||
    desc.includes('marmore') ||
    desc.includes('pedra britada')
  ) {
    let mass = 20.0
    if (unit === 'm3' || unit === 'm³') mass = 1400.0
    if (unit === 'm2' || unit === 'm²') mass = 22.0
    if (unit === 'kg') mass = 1.0
    if (unit === 'saco') mass = 50.0
    if (unit === 'milheiro' || unit === 'mil') mass = 2200.0
    if (unit === 'un') mass = 2.5
    return { groupId: 'entulho_alvenaria', lossFactor: 0.08, massPerUnitKg: mass }
  }

  // Default se for material: embalagens gerais / outros
  return { groupId: 'outros_residuos', lossFactor: 0.05, massPerUnitKg: 1.0 }
}

/**
 * Gera automaticamente as Fichas de Descarte agrupadas por tipo de material a partir dos insumos do orçamento
 */
export function generateDisposalSheetsFromBudget(budget: FullBudget): DisposalSheet[] {
  // Mapa de itens agrupados por grupo de resíduo
  const groupsMap = new Map<WasteGroupId, ClassifiedDisposalItem[]>()

  // Se já houver um disposalDocument salvo, preserva os certificados já preenchidos
  const existingSheetsMap = new Map<
    string,
    {
      status: 'pendente' | 'emitido' | 'conferido'
      transporterName?: string
      transporterCnpj?: string
      destinationCompany?: string
      destinationCnpj?: string
      destinationType?: string
      certificateOrManifestNumber?: string
      environmentalLicense?: string
      disposalDate?: string
      responsibleTechnician?: string
      notes?: string
    }
  >()

  if (budget.disposalDocument?.sheets) {
    for (const sh of budget.disposalDocument.sheets) {
      if (sh.certificate) {
        existingSheetsMap.set(sh.wasteGroup, sh.certificate)
      }
    }
  }

  // Percorre etapas -> serviços -> composição -> insumos
  for (const stage of budget.stages || []) {
    for (const service of stage.services || []) {
      const comp = service.composition
      if (!comp || !comp.inputs || comp.inputs.length === 0) continue

      for (const input of comp.inputs) {
        // Considera insumos de materiais ou equipamentos que geram sucata/resíduo
        if (input.category === 'material' || input.category === 'outros') {
          const classification = classifyWasteInput(input, service.description)
          const budgetQuantity = Number((service.quantity * input.coefficient).toFixed(3))
          // Estimativa técnica em massa: quantidade aplicada * massa unitária estimada * fator de perda/descarte
          const estimatedWeightKg = Number(
            (budgetQuantity * classification.massPerUnitKg * classification.lossFactor).toFixed(1),
          )

          const classifiedItem: ClassifiedDisposalItem = {
            stageCode: stage.code || '01',
            stageName: stage.name || 'Etapa',
            serviceCode: service.code || '01.01',
            serviceDescription: service.description || 'Serviço',
            inputCode: input.code || 'INS-001',
            inputDescription: input.description || 'Material',
            unit: input.unit || 'un',
            budgetQuantity,
            estimatedWeightKg,
          }

          if (!groupsMap.has(classification.groupId)) {
            groupsMap.set(classification.groupId, [])
          }
          groupsMap.get(classification.groupId)!.push(classifiedItem)
        }
      }
    }
  }

  // Se nenhum insumo de material for encontrado, gera ao menos o grupo de alvenaria/entulho se houver serviços
  if (groupsMap.size === 0 && (budget.stages?.length || 0) > 0) {
    groupsMap.set('entulho_alvenaria', [
      {
        stageCode: '01',
        stageName: budget.stages[0]?.name || 'Serviços Preliminares',
        serviceCode: '01.01',
        serviceDescription: 'Execução de serviços com descarte de entulho e sobras',
        inputCode: 'MAT-EST-01',
        inputDescription: 'Sobras de materiais de obra e reformas',
        unit: 'm³',
        budgetQuantity: 1,
        estimatedWeightKg: 1300,
      },
    ])
  }

  const sheets: DisposalSheet[] = []

  // Constrói uma ficha para cada grupo de resíduo presente
  groupsMap.forEach((items, groupId) => {
    const groupDef = WASTE_GROUPS[groupId] || WASTE_GROUPS.outros_residuos
    const totalWeight = Number(
      items.reduce((acc, item) => acc + item.estimatedWeightKg, 0).toFixed(1),
    )
    const totalVolume = Number((totalWeight / (groupDef.densityKgPerM3 || 1000)).toFixed(2))

    const existingCert = existingSheetsMap.get(groupId)

    sheets.push({
      id: `ficha-${groupId}-${budget.id || 'orc'}`,
      wasteGroup: groupId,
      wasteType: `${groupDef.conamaClass} — ${groupDef.title}`,
      conamaClass: groupDef.conamaClass,
      description: groupDef.description,
      estimatedWeightKg: totalWeight,
      estimatedVolumeM3: totalVolume,
      recommendedDestination: groupDef.recommendedDestination,
      items,
      certificate: existingCert || {
        status: 'pendente',
        destinationType: groupDef.destinationTypeDefault,
        destinationCompany: '',
        destinationCnpj: '',
        transporterName: '',
        transporterCnpj: '',
        certificateOrManifestNumber: '',
        environmentalLicense: '',
        disposalDate: '',
        responsibleTechnician: CONCE_COMPANY.responsavelTecnicoCompleto,
        notes: '',
      },
    })
  })

  // Ordenação prioritária: Classe A primeiro, depois Classe B, depois Classe C, depois Classe D
  const classOrder: Record<ConamaClass, number> = {
    'Classe A': 1,
    'Classe B': 2,
    'Classe C': 3,
    'Classe D': 4,
  }

  sheets.sort((a, b) => (classOrder[a.conamaClass] || 5) - (classOrder[b.conamaClass] || 5))

  return sheets
}

/**
 * Constrói o objeto consolidado DisposalDocumentData para versionamento e sincronização
 */
export function buildDisposalDocument(
  budget: FullBudget,
  customSheets?: DisposalSheet[],
): DisposalDocumentData {
  const sheets = customSheets || generateDisposalSheetsFromBudget(budget)
  const nextVersion = (budget.disposalDocument?.version || 0) + 1
  const now = new Date().toISOString()

  let totalItems = 0
  let totalWeight = 0

  for (const sheet of sheets) {
    totalItems += sheet.items.length
    totalWeight += sheet.estimatedWeightKg
  }

  return {
    version: nextVersion,
    attachedAt: budget.disposalDocument?.attachedAt || now,
    updatedAt: now,
    budgetCode: budget.code || 'ORC-2025-001',
    budgetTitle: budget.title || budget.work?.name || 'Orçamento de Obra',
    clientName: budget.client?.name || 'Cliente',
    workName: budget.work?.name || 'Obra',
    workAddress: budget.work?.address || '',
    technicalResponsible: CONCE_COMPANY.responsavelTecnico,
    technicalCrea: CONCE_COMPANY.registroCrea,
    totalMaterialInputsCount: totalItems,
    totalEstimatedWeightKg: Number(totalWeight.toFixed(1)),
    sheets,
  }
}
