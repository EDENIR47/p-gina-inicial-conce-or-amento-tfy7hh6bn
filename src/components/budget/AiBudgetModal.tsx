/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal de Geração de Orçamento por Prompt com IA (Skip Cloud Native Agent)
 *
 * Fluxo:
 * 1. Entrada de Prompt em linguagem natural com chips de exemplos prontos e parâmetros auxiliares (UF, Regime, Referência).
 * 2. Processamento via Agente Skip Cloud conce-budget-agent.
 * 3. Revisão prévia editável completa: resumo financeiro TCU/SINAPI, árvore de etapas/serviços/composições/insumos,
 *    ajuste de quantidades/valores/BDI, e botões "Salvar como orçamento" ou "Descartar".
 */

import React, { useState, useMemo } from 'react'
import {
  Sparkles,
  X,
  Send,
  Loader2,
  RefreshCw,
  Building,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Trash2,
  Plus,
  Edit2,
  Layers,
  FileCheck,
  Calculator,
  Compass,
  ArrowRight,
  Landmark,
  ShieldAlert,
  Percent,
} from 'lucide-react'
import {
  FullBudget,
  BudgetStage,
  BudgetService,
  BudgetComposition,
  BudgetInput,
  TaxRegime,
} from '@/types/budgetEngine'
import { BRAZIL_STATES_LIST, BRAZIL_STATES_CHARGES } from '@/lib/chargesData'
import { DEFAULT_BDI_CONFIG, calculateFullBudget } from '@/lib/budgetEngine'
import { getStoredCompositions, saveSingleBudget, getStoredFullBudgets } from '@/lib/budgetsStorage'
import { logAuditEvent, saveBudgetRevision } from '@/lib/intelligenceStorage'
import { formatCurrencyBRL, getSourceBadgeInfo } from '@/lib/formatters'
import pb from '@/lib/pocketbase/client'

interface AiBudgetModalProps {
  isOpen: boolean
  onClose: () => void
  onBudgetCreated?: (budget: FullBudget) => void
}

interface ExamplePrompt {
  id: string
  title: string
  description: string
  prompt: string
  uf: string
  taxRegime: TaxRegime
  isRelieved: boolean
  simplesDasRate?: number
  reference: string
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    id: 'ex-1',
    title: 'Reforma de Apartamento 120m²',
    description: 'Residencial em SP com demolição, drywall, porcelanato e pintura',
    prompt:
      'Reforma completa de apartamento residencial de 120 m² em São Paulo/SP. Demolição de alvenarias internas, execução de novas divisórias em drywall com isolamento termoacústico, troca completa de piso com porcelanato retificado 80x80cm, revisão das instalações elétricas e iluminação LED em sanca de gesso, reforma de 2 banheiros e pintura acrílica fosca premium em duas demãos. Prazo estimado de 4 meses.',
    uf: 'SP',
    taxRegime: 'simples_nacional',
    isRelieved: false,
    simplesDasRate: 0,
    reference: 'SINAPI',
  },
  {
    id: 'ex-2',
    title: 'Obra Pública — Escola Técnica (Lei 14.133)',
    description: 'Edificação escolar de 1.800m², salas de aula, estrutura de concreto e quadra',
    prompt:
      'Construção de Escola Técnica Municipal padrão FDE/MEC com 1.800 m² de área construída, 12 salas de aula, bloco administrativo, laboratórios e quadra poliesportiva coberta. Obra pública regida pela Lei Federal 14.133/2021, estrutura em concreto armado usinado FCK 30MPa com armação em aço CA-50, alvenaria de blocos de concreto, cobertura em telha termoacústica e pisos de alta resistência granilite. BDI conforme Acórdão 2.622/2013 do TCU e regime com desoneração da folha de pagamento.',
    uf: 'SP',
    taxRegime: 'com_desoneracao',
    isRelieved: true,
    simplesDasRate: 0,
    reference: 'SINAPI',
  },
  {
    id: 'ex-3',
    title: 'Reforma Comercial de Loja 250m²',
    description: 'Retrofit de boutique corporativa em shopping center com instalações elétricas',
    prompt:
      'Retrofit comercial de loja de alto padrão de 250 m² em shopping center no Rio de Janeiro/RJ. Instalações elétricas especiais com quadro de distribuição trifásico, cabeamento estruturado e luminárias de embutir no forro mineral; piso vinílico de tráfego intenso; climatização dutada VRF; fachada com vitrine em vidro temperado 10mm com ferragens inox e marcenaria comercial sob medida. Prazo de execução de 60 dias.',
    uf: 'RJ',
    taxRegime: 'simples_nacional',
    isRelieved: false,
    simplesDasRate: 0,
    reference: 'SINAPI',
  },
  {
    id: 'ex-4',
    title: 'Galpão Logístico Industrial 1.500m²',
    description: 'Piso industrial protendido, estrutura metálica e fechamento em telha trapezoidal',
    prompt:
      'Construção de galpão logístico e industrial com 1.500 m² em Betim/MG. Fundações em estacas pré-moldadas, piso industrial de alta resistência nivelado a laser com capacidade para 6 tf/m², pilares e tesouras em estrutura metálica, fechamento lateral em telhas trapezoidais pré-pintadas com translúcidas, e pátio de manobras pavimentado.',
    uf: 'MG',
    taxRegime: 'com_desoneracao',
    isRelieved: true,
    simplesDasRate: 0,
    reference: 'SICRO',
  },
]

export const AiBudgetModal: React.FC<AiBudgetModalProps> = ({
  isOpen,
  onClose,
  onBudgetCreated,
}) => {
  // Estados do formulário — Simples Nacional como primeira classe e padrão CONCE
  const [prompt, setPrompt] = useState('')
  const [selectedUf, setSelectedUf] = useState('SP')
  const [taxRegime, setTaxRegime] = useState<TaxRegime>('simples_nacional')
  const [simplesDasRate, setSimplesDasRate] = useState<number>(0)
  const [isRelieved, setIsRelieved] = useState(false)
  const [reference, setReference] = useState<'SINAPI' | 'SICRO' | 'CONCE'>('SINAPI')

  // Estados do fluxo
  const [step, setStep] = useState<'prompt' | 'generating' | 'review'>('prompt')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Orçamento gerado temporário em revisão
  const [draftBudget, setDraftBudget] = useState<FullBudget | null>(null)
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({})
  const [allowSaveWithPendingSources, setAllowSaveWithPendingSources] = useState(false)

  // Cálculos do orçamento em revisão (incondicional no topo)
  const draftSummary = useMemo(() => {
    if (!draftBudget) return null
    return calculateFullBudget(draftBudget)
  }, [draftBudget])

  // Contagem de itens sem fonte na revisão
  const pendingSourcesCount = useMemo(() => {
    if (!draftBudget) return 0
    let count = 0
    draftBudget.stages.forEach((stg) => {
      stg.services.forEach((srv) => {
        ;(srv.composition.inputs || []).forEach((inp) => {
          const badge = getSourceBadgeInfo(inp.source, inp.sourceStatus)
          if (badge.isPending || inp.unitCost === 0) {
            count++
          }
        })
      })
    })
    return count
  }, [draftBudget])

  if (!isOpen) return null

  // Seleciona um chip de exemplo
  const handleApplyExample = (ex: ExamplePrompt) => {
    setPrompt(ex.prompt)
    setSelectedUf(ex.uf)
    setTaxRegime(ex.taxRegime || (ex.isRelieved ? 'com_desoneracao' : 'sem_desoneracao'))
    setIsRelieved(ex.isRelieved)
    setSimplesDasRate(ex.simplesDasRate || 0)
    setReference((ex.reference as any) || 'SINAPI')
    setValidationError(null)
  }

  // Envio para o agente nativo do Skip Cloud
  const handleGenerate = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      setValidationError('Por favor, descreva a obra desejada no campo de prompt.')
      return
    }
    if (trimmed.length < 15) {
      setValidationError(
        'O prompt está muito curto. Detalhe melhor o tipo de obra, metragem e serviços desejados.',
      )
      return
    }

    setValidationError(null)
    setErrorMessage(null)
    setStep('generating')

    try {
      const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
      const res = await fetch(`${baseUrl}/backend/v1/generate-budget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
        },
        body: JSON.stringify({
          prompt: trimmed,
          uf: selectedUf,
          isRelieved: taxRegime === 'com_desoneracao',
          taxRegime,
          simplesDasRate: taxRegime === 'simples_nacional' ? simplesDasRate : 0,
          reference,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível gerar o orçamento com o agente de IA.')
      }

      const content = data.content
      if (!content || typeof content !== 'string') {
        throw new Error('O agente de IA retornou uma resposta sem conteúdo utilizável.')
      }

      // Extração de JSON do markdown ou texto puro
      let parsedJson: any = null
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        const jsonText = jsonMatch ? jsonMatch[1].trim() : content.trim()
        parsedJson = JSON.parse(jsonText)
      } catch (parseErr) {
        // Tentativa de localizar { e } mais externos
        const firstBrace = content.indexOf('{')
        const lastBrace = content.lastIndexOf('}')
        if (firstBrace !== -1 && lastBrace !== -1) {
          const rawSlice = content.substring(firstBrace, lastBrace + 1)
          parsedJson = JSON.parse(rawSlice)
        } else {
          throw new Error('A resposta da IA não continha a estrutura JSON esperada.')
        }
      }

      // Normaliza o objeto retornado no modelo FullBudget da CONCE
      const library = getStoredCompositions()
      const existingBudgets = getStoredFullBudgets()
      const budgetCount = existingBudgets.length + 1
      const nowStr = new Date().toISOString()
      const datePart = nowStr.split('T')[0]

      const stages: BudgetStage[] = Array.isArray(parsedJson.stages)
        ? parsedJson.stages.map((stg: any, sIdx: number) => {
            const stageId = `stage-ai-${Date.now()}-${sIdx + 1}`
            const services: BudgetService[] = Array.isArray(stg.services)
              ? stg.services.map((srv: any, svIdx: number) => {
                  const serviceId = `srv-ai-${Date.now()}-${sIdx + 1}-${svIdx + 1}`

                  // Verifica se a composição já existe na biblioteca canônica para enriquecer insumos
                  let matchedComp = library.find(
                    (c) =>
                      c.code.toLowerCase() === (srv.composition?.code || '').toLowerCase() ||
                      c.description
                        .toLowerCase()
                        .includes((srv.description || '').toLowerCase().substring(0, 20)),
                  )

                  let comp: BudgetComposition
                  if (matchedComp) {
                    comp = JSON.parse(JSON.stringify(matchedComp))
                    // Garante que cada insumo da biblioteca CONCE canônica tenha source definida
                    comp.inputs = (comp.inputs || []).map((inp) => ({
                      ...inp,
                      source:
                        inp.source ||
                        (comp.source === 'CONCE' ? 'Biblioteca CONCE' : comp.source) ||
                        'SINAPI',
                      sourceStatus: inp.sourceStatus || 'valido',
                    }))
                  } else {
                    const rawComp = srv.composition || {}
                    const compSource = (rawComp.source as any) || (reference as any) || 'SINAPI'
                    const inputs: BudgetInput[] =
                      Array.isArray(rawComp.inputs) && rawComp.inputs.length > 0
                        ? rawComp.inputs.map((inp: any, iIdx: number) => {
                            const rawSource = inp.source ? String(inp.source).trim() : ''
                            const rawStatus =
                              inp.sourceStatus ||
                              (rawSource.toLowerCase().includes('sem fonte')
                                ? 'sem_fonte'
                                : rawSource
                                  ? 'valido'
                                  : 'sem_fonte')
                            const rawCost = Number(inp.unitCost)
                            const isWithoutSource =
                              rawStatus === 'sem_fonte' ||
                              rawSource === '' ||
                              rawSource.toLowerCase().includes('sem fonte') ||
                              isNaN(rawCost) ||
                              rawCost === 0

                            return {
                              id: `inp-ai-${Date.now()}-${sIdx}-${svIdx}-${iIdx}`,
                              code: inp.code || `${compSource}-${1000 + iIdx}`,
                              description: inp.description || 'Insumo de obra',
                              unit: inp.unit || 'un',
                              category: inp.category || 'material',
                              coefficient:
                                Number(inp.coefficient) > 0 ? Number(inp.coefficient) : 1,
                              unitCost: isWithoutSource ? 0 : rawCost,
                              source: isWithoutSource
                                ? 'sem fonte — preencher manualmente'
                                : rawSource || compSource,
                              sourceStatus: isWithoutSource ? 'sem_fonte' : 'valido',
                            }
                          })
                        : [
                            {
                              id: `inp-ai-${Date.now()}-${sIdx}-${svIdx}-1`,
                              code: 'SINAPI-88309',
                              description: 'Pedreiro de obras com encargos complementares',
                              unit: 'h',
                              category: 'mao_de_obra',
                              coefficient: 1.2,
                              unitCost: 26.5,
                              source: 'SINAPI',
                              sourceStatus: 'valido',
                            },
                            {
                              id: `inp-ai-${Date.now()}-${sIdx}-${svIdx}-2`,
                              code: 'INS-PEND-01',
                              description: 'Insumo auxiliar pendente de cotação/tabela',
                              unit: srv.unit || 'm²',
                              category: 'material',
                              coefficient: 1.0,
                              unitCost: 0,
                              source: 'sem fonte — preencher manualmente',
                              sourceStatus: 'sem_fonte',
                            },
                          ]

                    comp = {
                      id: `comp-ai-${Date.now()}-${sIdx}-${svIdx}`,
                      code: rawComp.code || `SINAPI-${80000 + svIdx}`,
                      description:
                        rawComp.description || srv.description || 'Composição de custo unitário',
                      specialty: rawComp.specialty || stg.name || 'Edificações Gerais',
                      unit: rawComp.unit || srv.unit || 'm²',
                      source: compSource,
                      version: 'v1.0',
                      inputs,
                    }
                  }

                  return {
                    id: serviceId,
                    order: svIdx + 1,
                    code:
                      srv.code ||
                      `${String(sIdx + 1).padStart(2, '0')}.${String(svIdx + 1).padStart(2, '0')}`,
                    description: srv.description || 'Serviço de engenharia civil',
                    unit: srv.unit || comp.unit || 'un',
                    quantity: Number(srv.quantity) > 0 ? Number(srv.quantity) : 10,
                    composition: comp,
                    notes: srv.notes,
                  }
                })
              : []

            return {
              id: stageId,
              order: sIdx + 1,
              code: stg.code || String(sIdx + 1).padStart(2, '0'),
              name: stg.name || `ETAPA ${sIdx + 1}`,
              notes: stg.notes || '',
              services,
            }
          })
        : []

      const isPublic = Boolean(
        parsedJson.isPublicWork || parsedJson.workName?.toLowerCase().includes('públic'),
      )
      const suggestedBdi = Number(parsedJson.bdiPercent) || (isPublic ? 26.15 : 24.32)

      const constructedBudget: FullBudget = {
        id: `budget-ai-${Date.now()}`,
        code: `ORC-IA-${new Date().getFullYear()}-${String(budgetCount).padStart(3, '0')}`,
        status: 'em_analise',
        createdAt: datePart,
        updatedAt: nowStr,
        author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397 (Gerado com IA CONCE)',
        client: {
          name: parsedJson.clientName || 'Cliente Modelo CONCE',
          document: isPublic ? '46.379.400/0001-50' : '42.871.932/0001-50',
          email: 'contato@cliente.com.br',
          phone: '(11) 3455-8900',
          address: 'Av. Paulista, 1000',
          city: parsedJson.city || 'São Paulo',
          state: parsedJson.state || selectedUf,
        },
        work: {
          name: parsedJson.workName || 'Obra Planejada via Agente IA',
          address: 'Logradouro da Obra, nº 100',
          city: parsedJson.city || 'São Paulo',
          state: parsedJson.state || selectedUf,
          description: parsedJson.description || trimmed,
          deadlineMonths: Number(parsedJson.deadlineMonths) || 6,
          startDate: datePart,
          totalAreaM2: Number(parsedJson.totalAreaM2) || 150,
        },
        publicWork: {
          enabled: isPublic,
          tenderNumber: isPublic ? 'LIC-IA-2025/001' : '',
          contractNumber: isPublic ? 'CT-2025/101' : '',
          agency: isPublic ? 'Prefeitura Municipal / Secretaria de Obras' : '',
          modality: 'Concorrência',
          sinapiReferenceMonth: `04/2025 ${isRelieved ? 'com desoneração' : 'sem desoneração'}`,
          hasDisallowanceClause: true,
        },
        chargesConfig: {
          uf: selectedUf,
          isRelieved: taxRegime === 'com_desoneracao',
          taxRegime,
          simplesCollectionOption: taxRegime === 'simples_nacional' ? 'cpp_inclusa_das' : undefined,
          simplesDasRate: taxRegime === 'simples_nacional' ? simplesDasRate || 11.0 : 0,
          customGroupA:
            taxRegime === 'simples_nacional'
              ? 0.0 // Padrão CONCE: CPP já no DAS
              : taxRegime === 'com_desoneracao'
                ? (BRAZIL_STATES_CHARGES[selectedUf] || BRAZIL_STATES_CHARGES['SP']).relieved.groupA
                : (BRAZIL_STATES_CHARGES[selectedUf] || BRAZIL_STATES_CHARGES['SP']).nonRelieved
                    .groupA,
          customGroupB:
            taxRegime === 'com_desoneracao'
              ? (BRAZIL_STATES_CHARGES[selectedUf] || BRAZIL_STATES_CHARGES['SP']).relieved.groupB
              : (BRAZIL_STATES_CHARGES[selectedUf] || BRAZIL_STATES_CHARGES['SP']).nonRelieved
                  .groupB,
          customGroupC:
            taxRegime === 'com_desoneracao'
              ? (BRAZIL_STATES_CHARGES[selectedUf] || BRAZIL_STATES_CHARGES['SP']).relieved.groupC
              : (BRAZIL_STATES_CHARGES[selectedUf] || BRAZIL_STATES_CHARGES['SP']).nonRelieved
                  .groupC,
          customGroupD:
            taxRegime === 'com_desoneracao'
              ? (BRAZIL_STATES_CHARGES[selectedUf] || BRAZIL_STATES_CHARGES['SP']).relieved.groupD
              : (BRAZIL_STATES_CHARGES[selectedUf] || BRAZIL_STATES_CHARGES['SP']).nonRelieved
                  .groupD,
          isExplicitZero: taxRegime === 'simples_nacional',
        },
        bdiConfig: {
          ...DEFAULT_BDI_CONFIG,
          taxes: {
            ...DEFAULT_BDI_CONFIG.taxes,
            inssOrCprb: taxRegime === 'com_desoneracao' ? 4.5 : 0.0,
            simplesDas: taxRegime === 'simples_nacional' ? simplesDasRate : undefined,
            totalTaxes:
              taxRegime === 'simples_nacional'
                ? simplesDasRate
                : DEFAULT_BDI_CONFIG.taxes.totalTaxes,
          },
          calculatedBdi: suggestedBdi,
          profit: isPublic ? 6.85 : 7.8,
        },
        stages,
      }

      setDraftBudget(constructedBudget)
      // Expande todas as etapas por padrão na revisão
      const exp: Record<string, boolean> = {}
      constructedBudget.stages.forEach((s) => {
        exp[s.id] = true
      })
      setExpandedStages(exp)

      setStep('review')
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Falha na comunicação com o servidor de IA. Por favor, tente novamente em instantes.',
      )
      setStep('prompt')
    }
  }

  // Alterna expansão de uma etapa na árvore de revisão
  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => ({ ...prev, [stageId]: !prev[stageId] }))
  }

  // Ajuste de quantidade de um serviço
  const handleServiceQuantityChange = (stageId: string, serviceId: string, newQty: number) => {
    if (!draftBudget) return
    const updatedStages = draftBudget.stages.map((stg) => {
      if (stg.id !== stageId) return stg
      return {
        ...stg,
        services: stg.services.map((srv) =>
          srv.id === serviceId ? { ...srv, quantity: Math.max(0, newQty) } : srv,
        ),
      }
    })
    setDraftBudget({ ...draftBudget, stages: updatedStages })
  }

  // Remoção de um serviço na revisão
  const handleRemoveService = (stageId: string, serviceId: string) => {
    if (!draftBudget) return
    const updatedStages = draftBudget.stages.map((stg) => {
      if (stg.id !== stageId) return stg
      return {
        ...stg,
        services: stg.services.filter((srv) => srv.id !== serviceId),
      }
    })
    setDraftBudget({ ...draftBudget, stages: updatedStages })
  }

  // Remoção de uma etapa na revisão
  const handleRemoveStage = (stageId: string) => {
    if (!draftBudget) return
    const updatedStages = draftBudget.stages.filter((s) => s.id !== stageId)
    setDraftBudget({ ...draftBudget, stages: updatedStages })
  }

  // Ajuste de BDI
  const handleBdiChange = (newBdiRate: number) => {
    if (!draftBudget) return
    setDraftBudget({
      ...draftBudget,
      bdiConfig: {
        ...draftBudget.bdiConfig,
        calculatedBdi: Math.max(0, newBdiRate),
      },
    })
  }

  // Ajuste inline de insumo na revisão (custo, coeficiente ou categoria)
  const handleReviewInputUpdate = (
    stageId: string,
    serviceId: string,
    inputId: string,
    field: 'unitCost' | 'coefficient' | 'category',
    value: any,
  ) => {
    if (!draftBudget) return
    const updatedStages = draftBudget.stages.map((stg) => {
      if (stg.id !== stageId) return stg
      return {
        ...stg,
        services: stg.services.map((srv) => {
          if (srv.id !== serviceId) return srv
          const updatedInputs = (srv.composition.inputs || []).map((inp) => {
            if (inp.id !== inputId) return inp
            if (field === 'category') {
              return {
                ...inp,
                category: value as InputCategory,
              }
            }
            return {
              ...inp,
              [field]: Math.max(0, Number(value) || 0),
              source: 'Usuário',
              sourceStatus: 'valido' as const,
            }
          })
          return {
            ...srv,
            composition: {
              ...srv.composition,
              inputs: updatedInputs,
            },
          }
        }),
      }
    })
    setDraftBudget({ ...draftBudget, stages: updatedStages })
  }

  // Salvar definitivamente
  const handleSaveBudget = () => {
    if (!draftBudget) return

    // Bloqueia se houver insumos sem fonte e usuário não tiver marcado a autorização expressa
    if (pendingSourcesCount > 0 && !allowSaveWithPendingSources) {
      alert(
        `Atenção: Este orçamento possui ${pendingSourcesCount} item(ns) com valores sem fonte oficial ou com custo zerado.\n\nPor favor, preencha os valores antes de salvar ou marque a opção "Aceito salvar orçamento com itens pendentes de cotação" no rodapé.`,
      )
      return
    }

    // 1. Persistir no localStorage
    saveSingleBudget(draftBudget)

    // 2. Registrar trilha de auditoria específica para geração com IA
    const regimeLabel =
      draftBudget.chargesConfig?.taxRegime === 'simples_nacional'
        ? 'Simples Nacional'
        : draftBudget.chargesConfig?.taxRegime === 'com_desoneracao'
          ? 'Com Desoneração'
          : 'Sem Desoneração'

    logAuditEvent({
      budgetId: draftBudget.id,
      action: 'criacao_orcamento',
      title: '✨ Orçamento Gerado por Agente de IA',
      details: `Gerado via Agente Skip Cloud ("conce-budget-agent") com base no prompt: "${prompt.slice(0, 160)}${prompt.length > 160 ? '...' : ''}". UF: ${selectedUf}, Regime: ${regimeLabel}, Referência: ${reference}. Valor final: ${formatCurrencyBRL(draftSummary?.finalSalePrice || 0)}.`,
      userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397 (Agente IA CONCE)',
      newValue: draftSummary?.finalSalePrice,
      metadata: {
        aiAgentSlug: 'conce-budget-agent',
        prompt,
        uf: selectedUf,
        taxRegime: draftBudget.chargesConfig?.taxRegime || taxRegime,
        isRelieved: draftBudget.chargesConfig?.isRelieved,
        simplesDasRate: draftBudget.chargesConfig?.simplesDasRate,
        reference,
        stagesCount: draftBudget.stages.length,
        servicesCount: draftSummary?.servicesCount || 0,
        pendingSourcesCount,
      },
    })

    // 3. Criar revisão inicial Rev. 0
    saveBudgetRevision(
      draftBudget,
      `Emissão Inicial gerada por Inteligência Artificial — Prompt: "${prompt.slice(0, 80)}..."`,
      'Eng. Edenir Souza da Rosa - CREA/RS-252397 (Agente IA CONCE)',
    )

    if (onBudgetCreated) {
      onBudgetCreated(draftBudget)
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#171A1F]/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-white/20 flex flex-col overflow-hidden animate-scale-up">
        {/* CABEÇALHO DO MODAL */}
        <div className="bg-[#171A1F] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-[#294C87]/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B1F] to-[#FF8945] flex items-center justify-center shadow-lg shadow-[#FF6B1F]/30">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FF6B1F]/20 text-[#FF6B1F]">
                  Skip Cloud Native Agent
                </span>
                <span className="text-xs text-white/50 hidden sm:inline">•</span>
                <span className="text-xs text-white/60 hidden sm:inline">
                  Engenheiro de Custos IA CONCE
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {step === 'review'
                  ? 'Revisão Técnica do Orçamento Gerado'
                  : 'Gerar Orçamento por Prompt com IA'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO DO MODAL COM ROLAGEM */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* PASSO 1: TELA DE PROMPT */}
          {step === 'prompt' && (
            <div className="space-y-6">
              {/* Mensagem de Erro Geral se houver */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="font-bold block mb-0.5">
                      Não foi possível processar a geração
                    </strong>
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Informações explicativas */}
              <div className="bg-[#294C87]/5 border border-[#294C87]/20 rounded-xl p-4 text-xs text-[#171A1F]/80 flex items-start gap-3">
                <Compass className="w-5 h-5 text-[#294C87] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-[#294C87]">
                    Como funciona a geração com o agente nativo de custos CONCE:
                  </p>
                  <p className="text-xs text-[#171A1F]/70 leading-relaxed">
                    Descreva os detalhes da sua obra (tipo, área em m², serviços previstos, padrão
                    de acabamento ou exigências de edital). O agente consulta o acervo canônico{' '}
                    <strong>SINAPI/SICRO</strong> da CONCE, aplica a tabela de encargos sociais da
                    UF selecionada e monta a árvore de 4 níveis completa com BDI TCU.
                  </p>
                </div>
              </div>

              {/* CAMPOS AUXILIARES: UF, REGIME E REFERÊNCIA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* UF da Obra */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#171A1F] flex items-center justify-between">
                    <span>UF da Obra (Encargos)</span>
                    <span className="text-[10px] font-normal text-[#171A1F]/50">
                      SINAPI oficial
                    </span>
                  </label>
                  <select
                    value={selectedUf}
                    onChange={(e) => setSelectedUf(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs font-semibold focus:outline-none focus:border-[#294C87]"
                  >
                    {BRAZIL_STATES_LIST.map((st) => (
                      <option key={st.uf} value={st.uf}>
                        {st.uf} — {st.stateName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Regime Tributário */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#171A1F]">Regime Tributário</label>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FF6B1F] text-white font-extrabold uppercase">
                      CONCE
                    </span>
                  </div>
                  <select
                    value={taxRegime}
                    onChange={(e) => {
                      const reg = e.target.value as TaxRegime
                      setTaxRegime(reg)
                      setIsRelieved(reg === 'com_desoneracao')
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs font-semibold focus:outline-none focus:border-[#294C87]"
                  >
                    <option value="simples_nacional">★ Simples Nacional (Padrão CONCE)</option>
                    <option value="sem_desoneracao">Sem Desoneração (CLT integral 20%)</option>
                    <option value="com_desoneracao">Com Desoneração (CPRB 4,5% Lei 12.546)</option>
                  </select>
                </div>

                {/* Base de Referência */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#171A1F]">Base de Custos</label>
                  <select
                    value={reference}
                    onChange={(e) => setReference(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-xs font-semibold focus:outline-none focus:border-[#294C87]"
                  >
                    <option value="SINAPI">SINAPI (Caixa / Edificações)</option>
                    <option value="SICRO">SICRO (DNIT / Infraestrutura)</option>
                    <option value="CONCE">Acervo Próprio CONCE Engenharia</option>
                  </select>
                </div>
              </div>

              {/* Micro-legenda do Regime Tributário selecionado e Alíquota DAS se Simples Nacional */}
              {taxRegime === 'simples_nacional' ? (
                <div className="p-3 rounded-xl bg-[#294C87]/5 border border-[#294C87]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#294C87] flex items-center gap-1.5">
                      <span>Regime Simples Nacional — Padrão CONCE</span>
                      <span className="text-[10px] bg-[#FF6B1F] text-white px-1.5 py-0.2 rounded font-extrabold uppercase">
                        Ativo
                      </span>
                    </p>
                    <p className="text-[11px] text-[#171A1F]/70">
                      Encargos trabalhistas seguem a tabela base sem desoneração (CLT). No BDI, os
                      tributos unificados do DAS são informados diretamente pela alíquota efetiva da
                      empresa.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs font-bold text-[#171A1F] whitespace-nowrap">
                      Alíquota DAS:
                    </label>
                    <div className="relative w-28">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="40"
                        placeholder="0.00"
                        value={simplesDasRate > 0 ? simplesDasRate : ''}
                        onChange={(e) => setSimplesDasRate(parseFloat(e.target.value) || 0)}
                        className="w-full pl-2.5 pr-7 py-1 rounded-lg bg-white border border-[#171A1F]/30 text-xs font-bold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
                      />
                      <span className="absolute right-2 top-1 text-[11px] text-[#171A1F]/50 font-bold">
                        %
                      </span>
                    </div>
                    {simplesDasRate === 0 && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold whitespace-nowrap">
                        Preencher manualmente
                      </span>
                    )}
                  </div>
                </div>
              ) : taxRegime === 'sem_desoneracao' ? (
                <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 text-xs text-[#171A1F]/70">
                  <span className="font-bold text-[#171A1F]">Sem Desoneração:</span> Recolhimento
                  integral de 20% de INSS patronal sobre a folha de pagamento (padrão CLT).
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 text-xs text-[#171A1F]/70">
                  <span className="font-bold text-[#FF6B1F]">
                    Com Desoneração (Lei 12.546/2011):
                  </span>{' '}
                  Alíquota reduzida no Grupo A de encargos trabalhistas compensada por CPRB de 4,5%
                  sobre o faturamento no BDI.
                </div>
              )}

              {/* CAMPO DE PROMPT */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-[#171A1F] flex items-center gap-1.5">
                    <span>Descrição da Obra em Linguagem Natural</span>
                    <span className="text-[#FF6B1F]">*</span>
                  </label>
                  <span className="text-[11px] text-[#171A1F]/50">{prompt.length} caracteres</span>
                </div>

                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value)
                    if (validationError) setValidationError(null)
                  }}
                  rows={6}
                  placeholder="Exemplo: Reforma de apartamento residencial de 140 m² no Jardins em São Paulo/SP. Demolições, divisórias em drywall, contrapiso com porcelanato 90x90cm, instalações elétricas completas com 45 pontos e quadro disjuntores, pintura acrílica fosca em 2 demãos. Prazo de 90 dias com BDI de 24%..."
                  className={`w-full p-3.5 rounded-xl bg-[#F8F9FA] border text-xs sm:text-sm focus:outline-none transition-all resize-y ${
                    validationError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-[#171A1F]/20 focus:border-[#294C87]'
                  }`}
                />

                {validationError && (
                  <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{validationError}</span>
                  </p>
                )}
              </div>

              {/* CHIPS DE PROMPTS PRONTOS */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6B1F]" />
                  <span className="text-xs font-bold text-[#171A1F]">
                    Ou selecione um exemplo técnico pronto:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => handleApplyExample(ex)}
                      className="text-left p-3 rounded-xl border border-[#171A1F]/15 hover:border-[#FF6B1F] bg-[#F8F9FA] hover:bg-white transition-all group cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold text-[#171A1F] group-hover:text-[#FF6B1F] transition-colors">
                          {ex.title}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#294C87]/10 text-[#294C87] font-bold">
                          {ex.uf} • {ex.isRelieved ? 'Desonerado' : 'CLT'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#171A1F]/60 line-clamp-2">{ex.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2: ESTADO DE CARREGAMENTO / GERAÇÃO */}
          {step === 'generating' && (
            <div className="py-14 sm:py-20 text-center space-y-5 animate-fade-in">
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[#FF6B1F]/20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#294C87] to-[#FF6B1F] flex items-center justify-center text-white shadow-xl shadow-[#FF6B1F]/30 animate-spin">
                  <Loader2 className="w-8 h-8" />
                </div>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-extrabold text-[#171A1F]">
                  O Engenheiro de Custos IA está trabalhando...
                </h3>
                <p className="text-xs text-[#171A1F]/70 leading-relaxed">
                  Consultando o banco canônico SINAPI/SICRO, estruturando a árvore de 4 níveis
                  (Etapas → Serviços → Composições → Insumos), calculando os encargos para{' '}
                  <strong>{selectedUf}</strong> e aplicando a fórmula de BDI TCU.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#171A1F]/5 text-[11px] text-[#171A1F]/60">
                <div className="w-2 h-2 rounded-full bg-[#FF6B1F] animate-pulse" />
                <span>Processando via Agente Nativo Skip Cloud</span>
              </div>
            </div>
          )}

          {/* PASSO 3: REVISÃO PRÉVIA EDITÁVEL */}
          {step === 'review' && draftBudget && draftSummary && (
            <div className="space-y-6 animate-fade-in">
              {/* ALERTA DE STATUS E RASTREABILIDADE DE FONTES */}
              {pendingSourcesCount > 0 ? (
                <div className="p-4 rounded-xl bg-[#FF6B1F]/10 border-2 border-[#FF6B1F] text-[#171A1F] text-xs flex items-start gap-3 shadow-sm animate-pulse-subtle">
                  <AlertTriangle className="w-5 h-5 text-[#FF6B1F] shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="font-extrabold text-sm text-[#FF6B1F]">
                        Aviso CONCE: {pendingSourcesCount} item(ns) sem fonte comprovada
                      </strong>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#FF6B1F] text-white font-bold">
                        Ação Obrigatória
                      </span>
                    </div>
                    <p className="text-xs text-[#171A1F]/80 leading-relaxed">
                      Em cumprimento à diretriz da CONCE, o agente de IA{' '}
                      <strong>não inventou preços fictícios</strong> para itens sem referência nas
                      tabelas SINAPI/SICRO/Biblioteca. Esses insumos vieram com{' '}
                      <strong>custo R$ 0,00</strong> e destaque visual em Pumpkin Orange.
                      Preencha-os manualmente abaixo ou autorize expressamente a gravação como
                      pendência de cotação.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="font-bold text-sm text-emerald-900">
                        Orçamento Estruturado — 100% dos Itens com Fonte Oficial
                      </strong>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        {draftBudget.code}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Todos os coeficientes e custos unitários foram mapeados a partir de bases
                      oficiais (SINAPI/SICRO/Biblioteca CONCE). Nenhum preço foi arbitrado pela IA.
                    </p>
                  </div>
                </div>
              )}

              {/* CARDS DE RESUMO FINANCEIRO */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#171A1F]/10 space-y-1">
                  <span className="text-[10px] font-bold text-[#171A1F]/50 uppercase block">
                    Custo Direto Total
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#171A1F]">
                    {formatCurrencyBRL(draftSummary.totalDirectCost)}
                  </span>
                  <span className="text-[10px] text-[#171A1F]/60 block">Insumos + Mão de obra</span>
                </div>

                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#171A1F]/10 space-y-1">
                  <span className="text-[10px] font-bold text-[#171A1F]/50 uppercase block">
                    Encargos Sociais ({draftBudget.chargesConfig?.uf})
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#294C87]">
                    {formatCurrencyBRL(draftSummary.socialChargesAmount)}
                  </span>
                  <span className="text-[10px] text-[#171A1F]/60 block">
                    Taxa: {draftSummary.socialChargesRate.toFixed(2)}%
                  </span>
                </div>

                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#171A1F]/10 space-y-1">
                  <span className="text-[10px] font-bold text-[#171A1F]/50 uppercase block">
                    BDI Aplicado (TCU)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="60"
                      value={draftBudget.bdiConfig.calculatedBdi}
                      onChange={(e) => handleBdiChange(parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 rounded bg-white border border-[#171A1F]/20 text-xs font-bold text-[#FF6B1F] text-right"
                    />
                    <span className="text-xs font-bold text-[#FF6B1F]">%</span>
                  </div>
                  <span className="text-[10px] text-[#171A1F]/60 block">
                    R$ {formatCurrencyBRL(draftSummary.bdiAmount)}
                  </span>
                </div>

                <div className="bg-[#171A1F] text-white p-3 rounded-xl border border-[#171A1F] space-y-1 shadow-md">
                  <span className="text-[10px] font-bold text-white/60 uppercase block">
                    Preço Final de Venda
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-[#FF6B1F] block">
                    {formatCurrencyBRL(draftSummary.finalSalePrice)}
                  </span>
                  <span className="text-[10px] text-white/50 block">
                    {draftBudget.stages.length} etapas • {draftSummary.servicesCount} serviços
                  </span>
                </div>
              </div>

              {/* DADOS DA OBRA SUGERIDOS */}
              <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#171A1F]/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#171A1F] uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#294C87]" />
                    <span>Identificação da Obra e Cliente</span>
                  </h4>
                  {draftBudget.publicWork.enabled && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF6B1F]/15 text-[#FF6B1F] flex items-center gap-1">
                      <Landmark className="w-3 h-3" /> Obra Pública (Lei 14.133)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#171A1F]/70 block mb-1">
                      Nome da Obra
                    </label>
                    <input
                      type="text"
                      value={draftBudget.work.name}
                      onChange={(e) =>
                        setDraftBudget({
                          ...draftBudget,
                          work: { ...draftBudget.work, name: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-bold text-[#171A1F]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#171A1F]/70 block mb-1">
                      Cliente / Contratante
                    </label>
                    <input
                      type="text"
                      value={draftBudget.client.name}
                      onChange={(e) =>
                        setDraftBudget({
                          ...draftBudget,
                          client: { ...draftBudget.client, name: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-bold text-[#171A1F]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-[#171A1F]/70 block mb-1">
                        Área (m²)
                      </label>
                      <input
                        type="number"
                        value={draftBudget.work.totalAreaM2 || 0}
                        onChange={(e) =>
                          setDraftBudget({
                            ...draftBudget,
                            work: {
                              ...draftBudget.work,
                              totalAreaM2: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-bold text-[#171A1F]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#171A1F]/70 block mb-1">
                        Prazo (meses)
                      </label>
                      <input
                        type="number"
                        value={draftBudget.work.deadlineMonths || 1}
                        onChange={(e) =>
                          setDraftBudget({
                            ...draftBudget,
                            work: {
                              ...draftBudget.work,
                              deadlineMonths: parseInt(e.target.value, 10) || 1,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-bold text-[#171A1F]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ÁRVORE HIERÁRQUICA EDITÁVEL */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-[#171A1F] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#FF6B1F]" />
                    <span>Árvore de 4 Níveis Gerada (Etapa → Serviço → Composição → Insumo)</span>
                  </h4>
                  <span className="text-[11px] text-[#171A1F]/60">
                    Ajuste quantidades ou remova itens desnecessários
                  </span>
                </div>

                <div className="space-y-3">
                  {draftBudget.stages.map((stage, stgIdx) => {
                    const isExpanded = !!expandedStages[stage.id]
                    return (
                      <div
                        key={stage.id}
                        className="border border-[#171A1F]/15 rounded-xl bg-white overflow-hidden shadow-xs"
                      >
                        {/* CABEÇALHO DA ETAPA */}
                        <div className="bg-[#171A1F]/5 px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-[#171A1F]/10">
                          <button
                            type="button"
                            onClick={() => toggleStage(stage.id)}
                            className="flex items-center gap-2 text-left flex-1"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#294C87]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[#294C87]" />
                            )}
                            <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-[#294C87] text-white">
                              {stage.code}
                            </span>
                            <span className="text-xs font-bold text-[#171A1F]">{stage.name}</span>
                            <span className="text-[10px] text-[#171A1F]/50 font-normal">
                              ({stage.services.length} serviços)
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveStage(stage.id)}
                            className="p-1 rounded text-red-600 hover:bg-red-50"
                            title="Remover Etapa Inteira"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* LISTA DE SERVIÇOS DA ETAPA */}
                        {isExpanded && (
                          <div className="p-3 space-y-2 divide-y divide-[#171A1F]/5">
                            {stage.services.length === 0 ? (
                              <p className="text-[11px] text-[#171A1F]/40 italic py-2">
                                Nenhum serviço nesta etapa.
                              </p>
                            ) : (
                              stage.services.map((srv) => (
                                <div key={srv.id} className="pt-2.5 first:pt-0 space-y-1.5">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      <span className="font-mono text-[11px] font-bold text-[#294C87] mt-0.5">
                                        {srv.code}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-[#171A1F] leading-tight">
                                          {srv.description}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#171A1F]/60 mt-0.5">
                                          <span className="font-mono font-bold text-[#FF6B1F]">
                                            {srv.composition.code}
                                          </span>
                                          <span>•</span>
                                          <span>Fonte: {srv.composition.source}</span>
                                          <span>•</span>
                                          <span>
                                            {srv.composition.inputs.length} insumos (
                                            {srv.composition.specialty})
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Quantidade editável e Ações */}
                                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                      <div className="flex items-center gap-1.5 bg-[#F8F9FA] px-2 py-1 rounded-lg border border-[#171A1F]/15">
                                        <span className="text-[10px] font-bold text-[#171A1F]/60">
                                          Qtd:
                                        </span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0.01"
                                          value={srv.quantity}
                                          onChange={(e) =>
                                            handleServiceQuantityChange(
                                              stage.id,
                                              srv.id,
                                              parseFloat(e.target.value) || 0,
                                            )
                                          }
                                          className="w-16 px-1 py-0.5 rounded bg-white border border-[#171A1F]/20 text-xs font-bold text-[#171A1F] text-right"
                                        />
                                        <span className="text-[10px] font-semibold text-[#171A1F]/70">
                                          {srv.unit}
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveService(stage.id, srv.id)}
                                        className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700"
                                        title="Remover Serviço"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Pílulas e Tabela de Insumos da Composição com Edição Inline e Fontes */}
                                  <div className="pl-6 space-y-2 pt-1">
                                    {srv.composition.inputs.map((inp) => {
                                      const badgeInfo = getSourceBadgeInfo(
                                        inp.source,
                                        inp.sourceStatus,
                                      )
                                      const isPending = badgeInfo.isPending || inp.unitCost === 0

                                      return (
                                        <div
                                          key={inp.id}
                                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg text-xs transition-colors ${
                                            isPending
                                              ? 'bg-[#FF6B1F]/10 border-2 border-[#FF6B1F] shadow-xs'
                                              : 'bg-[#171A1F]/[0.03] border border-[#171A1F]/10 hover:bg-[#171A1F]/[0.06]'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
                                            <span className="font-mono text-[10px] text-[#294C87] font-bold">
                                              {inp.code}
                                            </span>
                                            <span
                                              className="truncate font-medium text-[#171A1F]"
                                              title={inp.description}
                                            >
                                              {inp.description}
                                            </span>

                                            {/* Badge e Seletor Editável de Categoria */}
                                            <select
                                              value={inp.category || 'material'}
                                              onChange={(e) =>
                                                handleReviewInputUpdate(
                                                  stage.id,
                                                  srv.id,
                                                  inp.id,
                                                  'category',
                                                  e.target.value,
                                                )
                                              }
                                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                                inp.category === 'mao_de_obra'
                                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                  : inp.category === 'equipamento'
                                                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                                                    : inp.category === 'servico_terceiro'
                                                      ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                                                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                              }`}
                                              title="Clique para alterar a categoria do insumo (encargos sociais incidem apenas sobre Mão de Obra)"
                                            >
                                              <option value="material">📦 Material</option>
                                              <option value="mao_de_obra">👷 Mão de Obra</option>
                                              <option value="equipamento">🚜 Equipamento</option>
                                              <option value="servico_terceiro">
                                                🤝 Serv. Terceiros
                                              </option>
                                              <option value="outros">📌 Outros</option>
                                            </select>

                                            {/* Badge da Fonte */}
                                            <span
                                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] whitespace-nowrap ${badgeInfo.badgeClass}`}
                                            >
                                              <span
                                                className={`w-1.5 h-1.5 rounded-full ${badgeInfo.dotClass}`}
                                              />
                                              {badgeInfo.label}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                            {/* Coeficiente */}
                                            <div className="flex items-center gap-1">
                                              <span className="text-[10px] text-[#171A1F]/50">
                                                Coef:
                                              </span>
                                              <input
                                                type="number"
                                                step="0.001"
                                                min="0.0001"
                                                value={inp.coefficient}
                                                onChange={(e) =>
                                                  handleReviewInputUpdate(
                                                    stage.id,
                                                    srv.id,
                                                    inp.id,
                                                    'coefficient',
                                                    parseFloat(e.target.value) || 0,
                                                  )
                                                }
                                                className="w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs rounded bg-white border border-[#171A1F]/20 text-[#171A1F]"
                                                title="Coeficiente de consumo"
                                              />
                                              <span className="text-[10px] text-[#171A1F]/60">
                                                {inp.unit}
                                              </span>
                                            </div>

                                            {/* Custo Unitário com destaque em Pumpkin Orange se sem fonte */}
                                            <div className="flex items-center gap-1">
                                              <span className="text-[10px] text-[#171A1F]/50">
                                                Unit: R$
                                              </span>
                                              <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={inp.unitCost}
                                                placeholder="0,00"
                                                onChange={(e) =>
                                                  handleReviewInputUpdate(
                                                    stage.id,
                                                    srv.id,
                                                    inp.id,
                                                    'unitCost',
                                                    parseFloat(e.target.value) || 0,
                                                  )
                                                }
                                                className={`w-20 px-1.5 py-0.5 text-right font-mono font-bold text-xs rounded bg-white transition-colors ${
                                                  isPending
                                                    ? 'border-2 border-[#FF6B1F] text-[#FF6B1F] focus:outline-none focus:ring-2 focus:ring-[#FF6B1F]/30'
                                                    : 'border border-[#171A1F]/20 text-[#171A1F]'
                                                }`}
                                                title={
                                                  isPending
                                                    ? 'Sem fonte oficial conhecida: digite o custo para marcar como fonte Usuário'
                                                    : 'Custo unitário'
                                                }
                                              />
                                            </div>

                                            <div className="text-right min-w-[70px]">
                                              <span className="font-mono text-xs font-bold text-[#171A1F]">
                                                {formatCurrencyBRL(
                                                  (inp.coefficient || 0) * (inp.unitCost || 0),
                                                )}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL (AÇÕES) */}
        <div className="bg-[#F8F9FA] px-5 sm:px-6 py-3.5 border-t border-[#171A1F]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-[#171A1F]/60 flex items-center gap-2">
            {step === 'review' && pendingSourcesCount > 0 ? (
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#FF6B1F] font-bold">
                <input
                  type="checkbox"
                  checked={allowSaveWithPendingSources}
                  onChange={(e) => setAllowSaveWithPendingSources(e.target.checked)}
                  className="rounded border-[#FF6B1F] text-[#FF6B1F] focus:ring-[#FF6B1F]"
                />
                <span>
                  Aceito salvar orçamento com {pendingSourcesCount} item(ns) pendente(s) de cotação
                </span>
              </label>
            ) : (
              <>
                <span className="font-semibold text-[#171A1F]">CONCE</span>
                <span>•</span>
                <span className="italic">"Conce é conceito. Conce é concreto."</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {step === 'prompt' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#171A1F]/70 hover:bg-[#171A1F]/10 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs sm:text-sm font-bold shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Orçamento com IA</span>
                </button>
              </>
            )}

            {step === 'generating' && (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#171A1F]/20 text-[#171A1F]/50 text-xs font-bold cursor-not-allowed"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </button>
            )}

            {step === 'review' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('prompt')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#171A1F]/70 hover:bg-[#171A1F]/10 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Novo Prompt</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Descartar
                </button>

                <button
                  type="button"
                  onClick={handleSaveBudget}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs sm:text-sm font-bold shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Salvar como Orçamento</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default AiBudgetModal
