/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Motor de Cálculo da Curva ABC (Princípio de Pareto) — Reconstrução Limpa
 *
 * REGRAS DE CÁLCULO E ENGENHARIA DE CUSTOS RIGOROSAS:
 * 1. Quantidade de cada insumo = Σ (coeficiente da CPU do insumo × quantidade do serviço onde aparece).
 *    Todas as ocorrências do mesmo insumo se somam em UMA ÚNICA linha do ranking.
 * 2. Consolidação de insumos homônimos: descrição normalizada idêntica (trim, maiúsculas, sem acentos,
 *    espaços colapsados) funde linhas somando quantidade, custo direto e valor de venda,
 *    mantendo a lista completa de ocorrências (etapa, serviço, quantidade) para auditoria.
 *    Tratar "S/COD", "SEM CÓDIGO", "N/A", vazio como ausência de código.
 *    Descrições diferentes NUNCA se fundem mesmo que compartilhem código genérico.
 * 3. Insumos de mão de obra entram com o multiplicador real de encargos sociais do orçamento
 *    (getBudgetLaborMultiplier: 1.0 no Simples Nacional, 1 + chargesRate / 100 nos regimes com/sem desoneração).
 * 4. Serviços com preço manual / sem composição aparecem como item direto na curva (não são descartados),
 *    garantindo que o total da curva feche 100% com o total correspondente do orçamento.
 * 5. Base de valor padrão: Valor de Venda com BDI (fórmula TCU Acórdão 2.622/2013 e BDI customizado por serviço
 *    quando existir); com alternância para Custo Direto.
 * 6. Classificação Pareto estrita: Classe A até 80% do acumulado, Classe B até 95%, Classe C o restante.
 *    O item que cruza a fronteira entra na classe em que o corte é atingido (prevAccumulated < limite).
 * 7. Zero dependência ou menção a inteligência artificial.
 */

import { FullBudget, BudgetInput, BudgetService } from '@/types/budgetEngine'
import {
  AbcCalculatedItem,
  AbcCurveAnalysis,
  AbcClass,
  AbcAnalysisMode,
  AbcValueBasis,
} from '@/types/intelligence'
import {
  calculateTcuBdi,
  getBudgetLaborMultiplier,
  getBudgetSocialChargesRate,
  getServiceCostBreakdown,
  getServiceEffectiveUnitCost,
} from './budgetEngine'

export interface ComputeAbcCurveOptions {
  mode?: AbcAnalysisMode // 'insumos' (default) | 'servicos'
  valueBasis?: AbcValueBasis // 'venda_bdi' (default CONCE) | 'custo_direto'
}

/**
 * Normaliza descrição de insumo/serviço para agrupamento de homônimos:
 * - trim
 * - maiúsculas
 * - remoção de acentos/diacríticos (NFD)
 * - colapsar múltiplos espaços
 */
export function normalizeDescription(desc?: string | null): string {
  if (!desc) return ''
  return desc
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Verifica se um código representa a ausência de código ou código genérico
 * (ex: "S/COD", "SEM CÓDIGO", vazio, hífen, "N/A", "SRV", "S/N")
 */
export function isGenericOrEmptyCode(code?: string | null): boolean {
  if (!code) return true
  const c = normalizeDescription(code)
  return (
    c === '' ||
    c === 'S/COD' ||
    c === 'S/ COD' ||
    c === 'S/CODIGO' ||
    c === 'S/ CODIGO' ||
    c === 'SEM CODIGO' ||
    c === 'SEM COD' ||
    c === 'S CODIGO' ||
    c === 'S COD' ||
    c === '-' ||
    c === '--' ||
    c === '---' ||
    c === 'N/A' ||
    c === 'NA' ||
    c === 'SRV' ||
    c === 'SN' ||
    c === 'S.N.' ||
    c === 'S/N' ||
    c === '0' ||
    c === 'INDEFINIDO' ||
    c === 'SEM FONTE'
  )
}

/**
 * Normaliza o código para chave de agrupamento primária
 */
function normalizeCode(code?: string | null): string {
  if (!code) return ''
  return code.trim().toUpperCase().replace(/\s+/g, ' ')
}

/**
 * Determina a taxa geral de BDI oficial do orçamento pela fórmula TCU Acórdão 2.622/2013
 */
export function resolveGeneralBdiRate(budget: FullBudget): number {
  const taxRegime =
    budget.chargesConfig?.taxRegime ||
    (budget.chargesConfig?.isRelieved ? 'com_desoneracao' : 'sem_desoneracao')

  let taxesTotal = 0
  if (taxRegime === 'simples_nacional') {
    const dasRate =
      budget.chargesConfig?.simplesDasRate !== undefined
        ? budget.chargesConfig.simplesDasRate
        : budget.bdiConfig?.taxes?.simplesDas !== undefined
          ? budget.bdiConfig.taxes.simplesDas
          : 11.0
    taxesTotal = Number(dasRate) || 0
  } else {
    taxesTotal =
      (budget.bdiConfig?.taxes?.iss || 0) +
      (budget.bdiConfig?.taxes?.pis || 0) +
      (budget.bdiConfig?.taxes?.cofins || 0) +
      (budget.bdiConfig?.taxes?.inssOrCprb || 0)
  }

  const tcuResult = calculateTcuBdi({
    administrationCentral: budget.bdiConfig?.administrationCentral ?? 4.0,
    risk: budget.bdiConfig?.risk ?? 1.27,
    insuranceAndGuarantee: budget.bdiConfig?.insuranceAndGuarantee ?? 0.8,
    financialExpenses: budget.bdiConfig?.financialExpenses ?? 1.23,
    profit: budget.bdiConfig?.profit ?? 7.4,
    taxesTotal,
  })

  return tcuResult.bdiPercent
}

/**
 * Retorna a taxa de BDI efetiva de um serviço (respeita customBdiPercent do serviço quando houver)
 */
export function resolveServiceBdiRate(service: BudgetService, generalBdiRate: number): number {
  if (
    service.customBdiPercent !== undefined &&
    service.customBdiPercent !== null &&
    !Number.isNaN(Number(service.customBdiPercent))
  ) {
    return Number(service.customBdiPercent)
  }
  return generalBdiRate
}

interface IntermediateOccurrence {
  stageCode: string
  stageName: string
  serviceCode: string
  serviceDescription: string
  quantity: number
}

interface RawCollectedItem {
  code: string
  description: string
  category: BudgetInput['category'] | 'servico'
  unit: string
  totalQuantity: number
  directCost: number
  salePrice: number
  serviceOccurrences: IntermediateOccurrence[]
}

/**
 * Processa a coleta no Modo Serviços:
 * Cada serviço do orçamento é quantificado e acumulado diretamente.
 */
function collectServicesMode(
  budget: FullBudget,
  laborMultiplier: number,
  generalBdiRate: number,
): RawCollectedItem[] {
  const map = new Map<string, RawCollectedItem>()

  budget.stages.forEach((stage) => {
    stage.services.forEach((service) => {
      const sQty = Number(service.quantity) || 0
      const serviceBdi = resolveServiceBdiRate(service, generalBdiRate)
      const bdiMult = 1 + serviceBdi / 100

      const unitEffectiveCost = getServiceEffectiveUnitCost(service, laborMultiplier)
      const directCost = Number((unitEffectiveCost * sQty).toFixed(2))
      const salePrice = Number((directCost * bdiMult).toFixed(2))

      // Chave por código de serviço se existir e não for genérico, senão por descrição normalizada
      const hasCode = !isGenericOrEmptyCode(service.code)
      const normDesc = normalizeDescription(service.description)
      const key = hasCode ? `CODE:::${normalizeCode(service.code)}` : `DESC:::${normDesc}`

      const occ: IntermediateOccurrence = {
        stageCode: stage.code || '',
        stageName: stage.name || '',
        serviceCode: service.code || 'SRV',
        serviceDescription: service.description,
        quantity: sQty,
      }

      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          code: service.code || 'SRV',
          description: service.description,
          category: 'servico',
          unit: service.unit || 'un',
          totalQuantity: sQty,
          directCost,
          salePrice,
          serviceOccurrences: [occ],
        })
      } else {
        existing.totalQuantity += sQty
        existing.directCost += directCost
        existing.salePrice += salePrice
        existing.serviceOccurrences.push(occ)
        if (isGenericOrEmptyCode(existing.code) && hasCode) {
          existing.code = service.code
        }
      }
    })
  })

  return Array.from(map.values())
}

/**
 * Processa a coleta no Modo Insumos:
 * Explode as CPUs dos serviços calculando consumo e custo direto real com encargos,
 * tratando itens diretos sem composição e consolidando homônimos.
 */
function collectInputsMode(
  budget: FullBudget,
  laborMultiplier: number,
  generalBdiRate: number,
): RawCollectedItem[] {
  // 1. Coleta inicial por insumo e serviço sem composição
  const rawList: RawCollectedItem[] = []

  budget.stages.forEach((stage) => {
    stage.services.forEach((service) => {
      const sQty = Number(service.quantity) || 0
      const serviceBdi = resolveServiceBdiRate(service, generalBdiRate)
      const bdiMult = 1 + serviceBdi / 100

      const hasInputs =
        service.composition &&
        Array.isArray(service.composition.inputs) &&
        service.composition.inputs.length > 0

      // CASO A: Serviço sem composição ou com preço manual informado sem insumos na CPU
      // Deve aparecer como item direto na curva para fechar 100% com o orçamento
      if (!hasInputs) {
        const unitEffectiveCost = getServiceEffectiveUnitCost(service, laborMultiplier)
        const directCost = Number((unitEffectiveCost * sQty).toFixed(2))
        const salePrice = Number((directCost * bdiMult).toFixed(2))

        rawList.push({
          code: service.code || 'SRV',
          description: service.description,
          category: 'servico_terceiro',
          unit: service.unit || 'un',
          totalQuantity: sQty,
          directCost,
          salePrice,
          serviceOccurrences: [
            {
              stageCode: stage.code || '',
              stageName: stage.name || '',
              serviceCode: service.code || 'SRV',
              serviceDescription: service.description,
              quantity: sQty,
            },
          ],
        })
        return
      }

      // CASO B: Serviço com composição de insumos
      const breakdown = getServiceCostBreakdown(service)
      const isUserManual = service.unitPriceSource === 'Usuário'

      // Se o usuário digitou preço manual no serviço e há insumos, calcula fator de escala
      let manualScaleFactor = 1.0
      if (isUserManual && breakdown.baseDirectCost > 0) {
        const rawInputsSum = service.composition.inputs.reduce((acc, inp) => {
          const coef = Number(inp.coefficient) || 0
          const uCost = Number(inp.unitCost) || 0
          return acc + coef * uCost * sQty
        }, 0)
        if (rawInputsSum > 0) {
          manualScaleFactor = breakdown.baseDirectCost / rawInputsSum
        }
      }

      service.composition.inputs.forEach((input: BudgetInput) => {
        const coef = Number(input.coefficient) || 0
        const consumedQuantity = coef * sQty
        let baseUnitCost = Number(input.unitCost) || 0

        // Regra 3: Insumos de mão de obra entram com o multiplicador real de encargos sociais
        if (input.category === 'mao_de_obra') {
          baseUnitCost = baseUnitCost * laborMultiplier
        }

        const itemDirectCost = consumedQuantity * baseUnitCost * manualScaleFactor
        const itemSalePrice = itemDirectCost * bdiMult

        rawList.push({
          code: input.code || 'S/COD',
          description: input.description,
          category: input.category,
          unit: input.unit || 'un',
          totalQuantity: consumedQuantity,
          directCost: itemDirectCost,
          salePrice: itemSalePrice,
          serviceOccurrences: [
            {
              stageCode: stage.code || '',
              stageName: stage.name || '',
              serviceCode: service.code || 'SRV',
              serviceDescription: service.description,
              quantity: consumedQuantity,
            },
          ],
        })
      })
    })
  })

  // 2. CONSOLIDAÇÃO E FUSÃO RIGOROSA:
  // - Insumos homônimos: descrição normalizada idêntica funde linhas somando:
  //   totalQuantity, directCost e salePrice, agregando serviceOccurrences.
  // - Tratar "S/COD", "SEM CÓDIGO", "N/A", vazio como ausência de código.
  // - Descrições diferentes NUNCA se fundem mesmo que compartilhem código genérico ou inexistente.
  // - Se um insumo tem código oficial SINAPI e outro tem descrição normalizada idêntica mas sem código,
  //   eles se fundem, e o código oficial e descrição oficial são preservados.
  const consolidated = new Map<string, RawCollectedItem>()

  rawList.forEach((item) => {
    const normDesc = normalizeDescription(item.description)
    const hasValidCode = !isGenericOrEmptyCode(item.code)
    const cleanCode = hasValidCode ? normalizeCode(item.code) : ''

    // Chave de agrupamento:
    // Se a descrição normalizada for idêntica, funde pelo par (normDesc, category)
    // Isso garante que homônimos com ou sem código sejam somados em uma única linha.
    // Descrições diferentes NUNCA compartilham a mesma chave.
    const groupKey = `${item.category}:::${normDesc}`

    const existing = consolidated.get(groupKey)
    if (!existing) {
      consolidated.set(groupKey, {
        code: hasValidCode ? item.code : 'S/COD',
        description: item.description,
        category: item.category,
        unit: item.unit,
        totalQuantity: item.totalQuantity,
        directCost: item.directCost,
        salePrice: item.salePrice,
        serviceOccurrences: [...item.serviceOccurrences],
      })
    } else {
      existing.totalQuantity += item.totalQuantity
      existing.directCost += item.directCost
      existing.salePrice += item.salePrice
      existing.serviceOccurrences.push(...item.serviceOccurrences)

      // Se o existente estava sem código oficial mas o novo tem código oficial, adota o código oficial
      if (isGenericOrEmptyCode(existing.code) && hasValidCode) {
        existing.code = item.code
        existing.description = item.description
      }

      // Se a unidade do existente estava vazia/genérica e o novo tem unidade, adota
      if ((!existing.unit || existing.unit === 'un') && item.unit && item.unit !== 'un') {
        existing.unit = item.unit
      }
    }
  })

  return Array.from(consolidated.values())
}

/**
 * Agrupa ocorrências duplicadas no mesmo serviço (quando houver mais de uma aplicação no mesmo serviço)
 */
function consolidateOccurrences(occurrences: IntermediateOccurrence[]): IntermediateOccurrence[] {
  const map = new Map<string, IntermediateOccurrence>()
  occurrences.forEach((occ) => {
    const key = `${occ.stageCode}:::${occ.serviceCode}:::${occ.serviceDescription}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...occ })
    } else {
      existing.quantity += occ.quantity
    }
  })
  return Array.from(map.values())
}

/**
 * Função pura principal: Computa a Curva ABC do orçamento
 */
export function computeAbcCurve(
  budget: FullBudget,
  options: ComputeAbcCurveOptions = {},
): AbcCurveAnalysis {
  const mode: AbcAnalysisMode = options.mode || 'insumos'
  const valueBasis: AbcValueBasis = options.valueBasis || 'venda_bdi'

  // 1. Multiplicador de encargos e taxa BDI geral do orçamento
  const laborMultiplier = getBudgetLaborMultiplier(budget)
  const generalBdiRate = resolveGeneralBdiRate(budget)

  // 2. Coleta dos itens brutos
  const rawItems =
    mode === 'servicos'
      ? collectServicesMode(budget, laborMultiplier, generalBdiRate)
      : collectInputsMode(budget, laborMultiplier, generalBdiRate)

  // 3. Ordenação decrescente pelo valor avaliado
  const sorted = [...rawItems].sort((a, b) => {
    const valA = valueBasis === 'venda_bdi' ? a.salePrice : a.directCost
    const valB = valueBasis === 'venda_bdi' ? b.salePrice : b.directCost
    return valB - valA
  })

  // 4. Totais globais da análise
  const totalDirectCost = Number(sorted.reduce((acc, it) => acc + it.directCost, 0).toFixed(2))
  const totalSalePrice = Number(sorted.reduce((acc, it) => acc + it.salePrice, 0).toFixed(2))
  const totalAnalyzedValue = valueBasis === 'venda_bdi' ? totalSalePrice : totalDirectCost

  // 5. Cálculo cumulativo e classificação Pareto (80% / 95%)
  let accumulatedValue = 0

  const allItems: AbcCalculatedItem[] = sorted.map((item, index) => {
    const evaluatedValue = valueBasis === 'venda_bdi' ? item.salePrice : item.directCost
    accumulatedValue += evaluatedValue

    const percentageOfTotal =
      totalAnalyzedValue > 0 ? (evaluatedValue / totalAnalyzedValue) * 100 : 0
    const accumulatedPercentage =
      totalAnalyzedValue > 0 ? (accumulatedValue / totalAnalyzedValue) * 100 : 0

    // Regra de transição clássica de Pareto:
    // O item que cruza a fronteira entra na classe em que o corte é atingido (prevAccumulated < limite).
    // prevAccumulated < 80 => Classe A
    // prevAccumulated < 95 => Classe B
    // caso contrário => Classe C
    const prevAccumulated = accumulatedPercentage - percentageOfTotal
    let classification: AbcClass = 'C'
    if (prevAccumulated < 80) {
      classification = 'A'
    } else if (prevAccumulated < 95) {
      classification = 'B'
    } else {
      classification = 'C'
    }

    const unitCost = item.totalQuantity > 0 ? item.directCost / item.totalQuantity : 0
    const unitSalePrice = item.totalQuantity > 0 ? item.salePrice / item.totalQuantity : 0
    const cleanOccurrences = consolidateOccurrences(item.serviceOccurrences)

    const codeSafe = item.code.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'item'
    const id = `abc-${mode}-${index + 1}-${codeSafe}`

    return {
      id,
      code: item.code,
      description: item.description,
      category: item.category,
      unit: item.unit,
      totalQuantity: Number(item.totalQuantity.toFixed(3)),
      unitCost: Number(unitCost.toFixed(2)),
      totalCost: Number(item.directCost.toFixed(2)),
      unitSalePrice: Number(unitSalePrice.toFixed(2)),
      totalSalePrice: Number(item.salePrice.toFixed(2)),
      evaluatedValue: Number(evaluatedValue.toFixed(2)),
      percentageOfTotal: Number(percentageOfTotal.toFixed(2)),
      accumulatedPercentage: Number(accumulatedPercentage.toFixed(2)),
      classification,
      rank: index + 1,
      servicesCount: cleanOccurrences.length,
      serviceOccurrences: cleanOccurrences,
    }
  })

  // 6. Separação por Classes A, B e C
  const classAItems = allItems.filter((i) => i.classification === 'A')
  const classBItems = allItems.filter((i) => i.classification === 'B')
  const classCItems = allItems.filter((i) => i.classification === 'C')
  const totalItemsCount = allItems.length

  const sumDirect = (list: AbcCalculatedItem[]) =>
    Number(list.reduce((acc, it) => acc + it.totalCost, 0).toFixed(2))
  const sumSale = (list: AbcCalculatedItem[]) =>
    Number(list.reduce((acc, it) => acc + it.totalSalePrice, 0).toFixed(2))
  const sumEvaluated = (list: AbcCalculatedItem[]) =>
    Number(list.reduce((acc, it) => acc + it.evaluatedValue, 0).toFixed(2))

  const classACost = sumDirect(classAItems)
  const classBCost = sumDirect(classBItems)
  const classCCost = sumDirect(classCItems)

  const classASale = sumSale(classAItems)
  const classBSale = sumSale(classBItems)
  const classCSale = sumSale(classCItems)

  const classAEval = sumEvaluated(classAItems)
  const classBEval = sumEvaluated(classBItems)
  const classCEval = sumEvaluated(classCItems)

  const calcPercentageOfItems = (count: number) =>
    totalItemsCount > 0 ? Number(((count / totalItemsCount) * 100).toFixed(1)) : 0

  const calcPercentageOfCost = (value: number) =>
    totalAnalyzedValue > 0 ? Number(((value / totalAnalyzedValue) * 100).toFixed(1)) : 0

  return {
    budgetId: budget.id,
    budgetCode: budget.code,
    budgetName: budget.work?.name || budget.title || 'Orçamento de Engenharia',
    mode,
    valueBasis,
    totalAnalyzedValue,
    totalDirectCost,
    totalSalePrice,
    totalItemsCount,
    classA: {
      itemsCount: classAItems.length,
      percentageOfItems: calcPercentageOfItems(classAItems.length),
      totalCost: classACost,
      totalSalePrice: classASale,
      evaluatedValue: classAEval,
      percentageOfCost: calcPercentageOfCost(classAEval),
      items: classAItems,
    },
    classB: {
      itemsCount: classBItems.length,
      percentageOfItems: calcPercentageOfItems(classBItems.length),
      totalCost: classBCost,
      totalSalePrice: classBSale,
      evaluatedValue: classBEval,
      percentageOfCost: calcPercentageOfCost(classBEval),
      items: classBItems,
    },
    classC: {
      itemsCount: classCItems.length,
      percentageOfItems: calcPercentageOfItems(classCItems.length),
      totalCost: classCCost,
      totalSalePrice: classCSale,
      evaluatedValue: classCEval,
      percentageOfCost: calcPercentageOfCost(classCEval),
      items: classCItems,
    },
    allItems,
  }
}
