/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Motor de Geração Técnica do Memorial Descritivo de Obra
 *
 * Gera a especificação técnica detalhada de cada serviço a partir de:
 * 1. Descrição do serviço
 * 2. Composição de custos unitários (insumos: materiais, mão de obra, equipamentos, serviços de terceiros)
 * 3. Observações e critérios de medição da etapa e gerais do orçamento
 *
 * Redação estritamente em prosa técnica de engenharia civil brasileira (sem preços, sem BDI, sem menções a IA).
 */

import { FullBudget, BudgetStage, BudgetService, BudgetInput } from '@/types/budgetEngine'
import { normalizeInputDescription } from '@/lib/budgetsStorage'

export interface MemorialServiceItem {
  serviceId: string
  serviceCode: string
  serviceDescription: string
  unit: string
  quantity: number
  compositionCode?: string
  compositionDescription?: string
  technicalSpecification: string
  isCustomized?: boolean
}

export interface MemorialStageItem {
  stageId: string
  stageCode: string
  stageName: string
  notes?: string
  volumeM3?: number | null
  weightKg?: number | null
  photoUrl?: string | null
  services: MemorialServiceItem[]
}

export interface MemorialDocumentData {
  budgetId: string
  budgetCode: string
  budgetTitle: string
  generatedAt: string
  updatedAt?: string
  client: {
    name: string
    document?: string
    address?: string
    city?: string
    state?: string
    phone?: string
    email?: string
  }
  work: {
    name: string
    address: string
    city: string
    state: string
    description?: string
    totalAreaM2?: number
    executionDeadline?: string
    deadlineMonths?: number
  }
  generalIntroduction: string
  stages: MemorialStageItem[]
  includeStagePhotos: boolean
  includeSummary: boolean
  responsavelTecnico: string
  registroCrea: string
  cnpj: string
}

/**
 * Junta lista de termos em português de forma natural: "A, B e C".
 */
function joinWordsPtBr(words: string[]): string {
  if (words.length === 0) return ''
  if (words.length === 1) return words[0]
  if (words.length === 2) return `${words[0]} e ${words[1]}`
  return `${words.slice(0, -1).join(', ')} e ${words[words.length - 1]}`
}

/**
 * Sanitiza o nome de um insumo para redação fluida:
 * - Remove códigos iniciais ("SINAPI-XXXXX - ", "MAT-01 - ")
 * - Aplica normalização institucional CONCE ("encarregado da obra", "caçamba de entulhos", "saco de ráfia")
 * - Remove pontuação desnecessária no final
 */
function cleanInputName(desc: string): string {
  if (!desc) return ''
  let cleaned = desc.trim()
  // Remove prefixos de código como "SINAPI-12345 - " ou "CONCE-001 - "
  cleaned = cleaned.replace(
    /^(?:SINAPI|SICRO|CONCE|MAT|MO|EQP|TER)-[A-Z0-9.\-_/]+\s*[-–—:]\s*/i,
    '',
  )
  // Aplica normalização institucional da CONCE
  cleaned = normalizeInputDescription(cleaned)
  // Remove ponto final residual
  cleaned = cleaned.replace(/[.;]+$/, '').trim()
  return cleaned
}

/**
 * Gera a especificação técnica em prosa fluida de obra para um serviço.
 */
export function generateServiceTechnicalSpecification(
  service: BudgetService,
  stage?: BudgetStage,
): string {
  const normServiceDesc = normalizeInputDescription(
    service.description?.trim() || 'Serviço de engenharia',
  )
  const inputs: BudgetInput[] = service.composition?.inputs || []

  // Agrupar insumos por categoria
  const materiais: string[] = []
  const maoDeObra: string[] = []
  const equipamentos: string[] = []
  const terceiros: string[] = []

  inputs.forEach((inp) => {
    const name = cleanInputName(inp.description)
    if (!name) return

    const cat = inp.category
    if (cat === 'material') {
      materiais.push(name)
    } else if (cat === 'mao_de_obra') {
      maoDeObra.push(name)
    } else if (cat === 'equipamento') {
      equipamentos.push(name)
    } else if (cat === 'servico_terceiro') {
      terceiros.push(name)
    } else {
      materiais.push(name)
    }
  })

  // Deduplicar listas preservando a ordem
  const uniqMateriais = Array.from(new Set(materiais))
  const uniqMaoDeObra = Array.from(new Set(maoDeObra))
  const uniqEquipamentos = Array.from(new Set(equipamentos))
  const uniqTerceiros = Array.from(new Set(terceiros))

  const parts: string[] = []

  // 1. Abertura do serviço com descrição técnica e escopo
  let opening = normServiceDesc
  // Se a descrição começar com verbo no particípio ou substantivo de ação, enriquecer suavemente
  if (
    !/^(execu[cç][aã]o|fornecimento|assentamento|aplica[cç][aã]o|instala[cç][aã]o|demoli[cç][aã]o|retirada|preparo|montagem|limpeza|revis[aã]o|pintura|impermeabiliza[cç][aã]o|confei[cç][aã]o|arma[cç][aã]o|concretagem|escava[cç][aã]o|regulariza[cç][aã]o|raspagem|lixamento|transporte|gest[aã]o|vistoria)/i.test(
      opening,
    )
  ) {
    opening = `Execução de ${opening.charAt(0).toLowerCase() + opening.slice(1)}`
  }
  parts.push(`${opening}.`)

  // 2. Especificação dos materiais aplicados
  if (uniqMateriais.length > 0) {
    const joinedMat = joinWordsPtBr(uniqMateriais)
    parts.push(
      `Compreende o emprego e aplicação de ${joinedMat}, em estrita conformidade com as normas técnicas da ABNT e recomendações do fabricante.`,
    )
  }

  // 3. Mão de obra especializada empregada
  if (uniqMaoDeObra.length > 0) {
    const joinedMo = joinWordsPtBr(uniqMaoDeObra)
    parts.push(
      `Executado por equipe técnica especializada (${joinedMo}), atendendo integralmente às Normas Regulamentadoras (NR-18 e NR-06) de segurança e medicina do trabalho.`,
    )
  }

  // 4. Equipamentos, maquinários e ferramentas de apoio
  if (uniqEquipamentos.length > 0) {
    const joinedEq = joinWordsPtBr(uniqEquipamentos)
    parts.push(
      `Inclui a utilização de ferramental e equipamentos adequados (${joinedEq}), bem como suas instalações acessórias e dispositivos de operação segura.`,
    )
  }

  // 5. Serviços especializados terceirizados
  if (uniqTerceiros.length > 0) {
    const joinedTerc = joinWordsPtBr(uniqTerceiros)
    parts.push(`Engloba a realização de etapas especializadas: ${joinedTerc}.`)
  }

  // 6. Critérios de execução / medição / notas adicionais do serviço
  if (service.notes && service.notes.trim().length > 0) {
    const cleanNotes = service.notes.trim().replace(/[.;]+$/, '')
    parts.push(`Observação técnica específica: ${cleanNotes}.`)
  }

  // 7. Critérios de medição e tolerâncias técnicas da etapa (se houverem)
  if (stage?.notes && stage.notes.trim().length > 0) {
    const stageNotes = stage.notes.trim().replace(/[.;]+$/, '')
    // Se a nota da etapa contiver diretrizes pertinentes
    if (stageNotes.length > 10) {
      parts.push(`Critério da etapa: ${stageNotes}.`)
    }
  }

  // 8. Fechamento padrão de qualidade técnica
  const formattedQty = Number(service.quantity || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })
  parts.push(
    `A medição será efetuada por ${service.unit || 'un'} de serviço efetivamente concluído, conferido e aprovado pela fiscalização técnica (volume previsto: ${formattedQty} ${service.unit || 'un'}), contemplando arremates, cortes necessários, nivelamento e limpeza final da área trabalhada.`,
  )

  return parts.join(' ')
}

/**
 * Redige a introdução institucional padrão do Memorial Descritivo.
 */
export function generateDefaultGeneralIntroduction(budget: FullBudget): string {
  const clientName = budget.client?.name?.trim() || 'Contratante'
  const workName = budget.work?.name?.trim() || 'Obra'
  const workAddress = budget.work?.address?.trim()
    ? `${budget.work.address}, ${budget.work.city || 'Porto Alegre'}/${budget.work.state || 'RS'}`
    : `${budget.work?.city || 'Porto Alegre'}/${budget.work?.state || 'RS'}`

  return `O presente Memorial Descritivo tem por objetivo estabelecer as diretrizes executivas, especificações técnicas de materiais e procedimentos construtivos a serem rigorosamente observados na execução dos serviços da obra "${workName}", localizada em ${workAddress}, de propriedade de ${clientName}. Todas as etapas serão executadas em estreita conformidade com as Normas Brasileiras (NBR) da Associação Brasileira de Normas Técnicas (ABNT), regulamentos dos órgãos fiscalizadores, legislações municipais pertinentes e boas práticas consagradas da engenharia civil, sob a responsabilidade técnica da CONCE — Serviço de Engenharia e Consultoria LTDA.`
}

/**
 * Constrói o modelo de dados completo do Memorial Descritivo a partir do orçamento aberto.
 * Se houver um memorial previamente salvo no orçamento, permite optar por restaurá-lo
 * ou gerar tudo do zero de forma automática.
 */
export function buildMemorialDocumentData(
  budget: FullBudget,
  options?: {
    useSavedIfAvailable?: boolean
    includeStagePhotos?: boolean
    includeSummary?: boolean
  },
): MemorialDocumentData {
  const useSaved = options?.useSavedIfAvailable ?? false
  const saved = budget.savedMemorial

  // Se o usuário solicitou usar o salvo e ele existe
  if (useSaved && saved && saved.stages && saved.stages.length > 0) {
    const savedStagesList = saved.stages

    const stages: MemorialStageItem[] = (budget.stages || [])
      .filter((st) => (st.services || []).length > 0)
      .map((st, stageIndex) => {
        // Pareamento resiliente da etapa:
        // 1. Por stageId (se st.id e stageId baterem e não forem vazios)
        // 2. Por código (stage.code === savedStage.stageCode)
        // 3. Por índice de ordem na lista de etapas
        const savedSt =
          (st.id && savedStagesList.find((s) => s.stageId === st.id)) ||
          (st.code &&
            savedStagesList.find((s) => s.stageCode && s.stageCode.trim() === st.code.trim())) ||
          (stageIndex < savedStagesList.length ? savedStagesList[stageIndex] : undefined)

        const savedServicesList = savedSt?.services || []

        const services: MemorialServiceItem[] = (st.services || []).map((srv, srvIndex) => {
          // Pareamento resiliente do serviço:
          // 1. Por serviceId (se srv.id e serviceId baterem e não forem vazios)
          // 2. Por código (service.code === savedService.serviceCode)
          // 3. Por índice posicional dentro da etapa
          const savedSrv =
            (srv.id && savedServicesList.find((s) => s.serviceId === srv.id)) ||
            (srv.code &&
              savedServicesList.find(
                (s) => s.serviceCode && s.serviceCode.trim() === srv.code.trim(),
              )) ||
            (srvIndex < savedServicesList.length ? savedServicesList[srvIndex] : undefined)

          const techSpec =
            savedSrv?.technicalSpecification?.trim() ||
            generateServiceTechnicalSpecification(srv, st)

          return {
            serviceId: srv.id,
            serviceCode: srv.code || '',
            serviceDescription: normalizeInputDescription(srv.description),
            unit: srv.unit || 'un',
            quantity: srv.quantity || 0,
            compositionCode: srv.composition?.code,
            compositionDescription: srv.composition?.description,
            technicalSpecification: techSpec,
            isCustomized: !!savedSrv?.technicalSpecification,
          }
        })

        return {
          stageId: st.id,
          stageCode: st.code || '',
          stageName: st.name || '',
          notes: st.notes,
          volumeM3: st.volumeM3,
          weightKg: st.weightKg,
          photoUrl: st.photoUrl,
          services,
        }
      })

    return {
      budgetId: budget.id,
      budgetCode: budget.code || 'ORC-2025-001',
      budgetTitle: budget.title || budget.work?.name || 'Memorial Descritivo de Obra',
      generatedAt: saved.generatedAt || new Date().toISOString(),
      updatedAt: saved.updatedAt || new Date().toISOString(),
      client: {
        name: budget.client?.name || '',
        document: budget.client?.document || '',
        address: budget.client?.address || '',
        city: budget.client?.city || '',
        state: budget.client?.state || '',
        phone: budget.client?.phone || '',
        email: budget.client?.email || '',
      },
      work: {
        name: budget.work?.name || '',
        address: budget.work?.address || '',
        city: budget.work?.city || '',
        state: budget.work?.state || '',
        description: budget.work?.description || '',
        totalAreaM2: budget.work?.totalAreaM2,
        executionDeadline: budget.executionDeadline || budget.work?.executionDeadline,
        deadlineMonths: budget.work?.deadlineMonths,
      },
      generalIntroduction: saved.generalIntroduction || generateDefaultGeneralIntroduction(budget),
      stages,
      includeStagePhotos: options?.includeStagePhotos ?? saved.includeStagePhotos ?? false,
      includeSummary: options?.includeSummary ?? saved.includeSummary ?? true,
      responsavelTecnico: 'Eng. Edenir Souza da Rosa',
      registroCrea: 'CREA/RS-252397',
      cnpj: '57.149.101/0001-46',
    }
  }

  // GERAÇÃO AUTOMÁTICA COMPLETA DE TODAS AS ETAPAS E SERVIÇOS
  const stages: MemorialStageItem[] = (budget.stages || [])
    .filter((st) => (st.services || []).length > 0)
    .map((st) => {
      const services: MemorialServiceItem[] = (st.services || []).map((srv) => ({
        serviceId: srv.id,
        serviceCode: srv.code || '',
        serviceDescription: normalizeInputDescription(srv.description),
        unit: srv.unit || 'un',
        quantity: srv.quantity || 0,
        compositionCode: srv.composition?.code,
        compositionDescription: srv.composition?.description,
        technicalSpecification: generateServiceTechnicalSpecification(srv, st),
        isCustomized: false,
      }))

      return {
        stageId: st.id,
        stageCode: st.code || '',
        stageName: st.name || '',
        notes: st.notes,
        volumeM3: st.volumeM3,
        weightKg: st.weightKg,
        photoUrl: st.photoUrl,
        services,
      }
    })

  return {
    budgetId: budget.id,
    budgetCode: budget.code || 'ORC-2025-001',
    budgetTitle: budget.title || budget.work?.name || 'Memorial Descritivo de Obra',
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    client: {
      name: budget.client?.name || '',
      document: budget.client?.document || '',
      address: budget.client?.address || '',
      city: budget.client?.city || '',
      state: budget.client?.state || '',
      phone: budget.client?.phone || '',
      email: budget.client?.email || '',
    },
    work: {
      name: budget.work?.name || '',
      address: budget.work?.address || '',
      city: budget.work?.city || '',
      state: budget.work?.state || '',
      description: budget.work?.description || '',
      totalAreaM2: budget.work?.totalAreaM2,
      executionDeadline: budget.executionDeadline || budget.work?.executionDeadline,
      deadlineMonths: budget.work?.deadlineMonths,
    },
    generalIntroduction: generateDefaultGeneralIntroduction(budget),
    stages,
    includeStagePhotos: options?.includeStagePhotos ?? false,
    includeSummary: options?.includeSummary ?? true,
    responsavelTecnico: 'Eng. Edenir Souza da Rosa',
    registroCrea: 'CREA/RS-252397',
    cnpj: '57.149.101/0001-46',
  }
}
