/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Motor de Cálculo da Curva ABC (Princípio de Pareto)
 *
 * Suporta dois modos de análise técnica rigorosa:
 * 1. Análise por Insumos (Materiais, Mão de Obra, Equipamentos e Terceiros consolidados da obra)
 * 2. Análise por Serviços da Obra (Macrovisão do orçamento)
 *
 * Base de Valor (Regra CONCE):
 * - Padrão CONCE: Valor de Venda com BDI (reflete fielmente o orçamento comercial do cliente)
 * - Alternativo: Custo Direto (com encargos sociais de acordo com o regime tributário)
 *
 * Critérios Rigorosos de Classificação Pareto (Engenharia de Custos):
 * - Classe A: Itens que compõem o acumulado de até ~80% do valor total
 * - Classe B: Itens que compõem a faixa de 80% até ~95%
 * - Classe C: Os 5% restantes
 *
 * Tratamento de Fronteira:
 * O item que transpõe o limite (ex.: de 75% para 83%) é mantido na classe A porque encerra a transição
 * dos 80% de impacto (conforme prevAccumulated < 80).
 */

import { FullBudget, BudgetInput } from '@/types/budgetEngine'
import {
  AbcCalculatedItem,
  AbcCurveAnalysis,
  AbcClass,
  AbcAnalysisMode,
  AbcValueBasis,
} from '@/types/intelligence'
import {
  calculateTcuBdi,
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
export function normalizeDescription(desc?: string): string {
  if (!desc) return ''
  return desc
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Verifica se um código representa a ausência de código (ex: "S/COD", "SEM CÓDIGO", vazio, hífen)
 */
export function isGenericOrEmptyCode(code?: string): boolean {
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
    c === 'S/N'
  )
}

export function computeAbcCurve(
  budget: FullBudget,
  options: ComputeAbcCurveOptions = {},
): AbcCurveAnalysis {
  const mode: AbcAnalysisMode = options.mode || 'insumos'
  const valueBasis: AbcValueBasis = options.valueBasis || 'venda_bdi'

  // 1. Regime tributário e encargos sociais do orçamento
  const chargesRate = getBudgetSocialChargesRate(budget)
  const laborMultiplier = 1 + chargesRate / 100

  // 2. Determinação da taxa geral de BDI oficial (TCU Acórdão 2.622/2013)
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
    administrationCentral: budget.bdiConfig?.administrationCentral ?? 4.5,
    risk: budget.bdiConfig?.risk ?? 1.25,
    insuranceAndGuarantee: budget.bdiConfig?.insuranceAndGuarantee ?? 0.85,
    financialExpenses: budget.bdiConfig?.financialExpenses ?? 1.15,
    profit: budget.bdiConfig?.profit ?? 7.8,
    taxesTotal,
  })

  const generalBdiRate = tcuResult.bdiPercent

  interface IntermediateItem {
    key: string
    code: string
    description: string
    category: BudgetInput['category'] | 'servico'
    unit: string
    totalQuantity: number
    directCost: number
    salePrice: number
    serviceOccurrences: Array<{
      stageCode: string
      stageName: string
      serviceCode: string
      serviceDescription: string
      quantity: number
    }>
  }

  const map = new Map<string, IntermediateItem>()

  // 3. Coleta de dados (por Insumos ou por Serviços)
  budget.stages.forEach((stage) => {
    stage.services.forEach((service) => {
      const sQty = Number(service.quantity) || 0
      const serviceBdi =
        service.customBdiPercent !== undefined && service.customBdiPercent !== null
          ? Number(service.customBdiPercent)
          : generalBdiRate
      const bdiMultiplier = 1 + serviceBdi / 100

      if (mode === 'servicos') {
        // MODO SERVIÇOS: agrupa pelo serviço
        const sUnitCost = getServiceEffectiveUnitCost(service, laborMultiplier)
        const sDirectCost = Number((sUnitCost * sQty).toFixed(2))
        const sSalePrice = Number((sDirectCost * bdiMultiplier).toFixed(2))
        const sKey = (service.code || service.id || service.description).trim().toUpperCase()

        if (!map.has(sKey)) {
          map.set(sKey, {
            key: sKey,
            code: service.code || 'SRV',
            description: service.description,
            category: 'servico',
            unit: service.unit || 'un',
            totalQuantity: sQty,
            directCost: sDirectCost,
            salePrice: sSalePrice,
            serviceOccurrences: [
              {
                stageCode: stage.code,
                stageName: stage.name,
                serviceCode: service.code,
                serviceDescription: service.description,
                quantity: sQty,
              },
            ],
          })
        } else {
          const existing = map.get(sKey)!
          existing.totalQuantity += sQty
          existing.directCost += sDirectCost
          existing.salePrice += sSalePrice
          existing.serviceOccurrences.push({
            stageCode: stage.code,
            stageName: stage.name,
            serviceCode: service.code,
            serviceDescription: service.description,
            quantity: sQty,
          })
        }
        return
      }

      // MODO INSUMOS:
      const hasInputs =
        service.composition &&
        Array.isArray(service.composition.inputs) &&
        service.composition.inputs.length > 0

      // Se o serviço não tiver insumos na CPU (ou tiver preço manual sem insumos),
      // entra na Curva ABC como serviço de terceiro/item direto proporcional
      if (!hasInputs && (Number(service.unitPrice) || 0) > 0) {
        const sUnitCost = getServiceEffectiveUnitCost(service, laborMultiplier)
        const sDirectCost = Number((sUnitCost * sQty).toFixed(2))
        const sSalePrice = Number((sDirectCost * bdiMultiplier).toFixed(2))
        const key = `SERV-${service.code || service.id}`.toUpperCase()

        if (!map.has(key)) {
          map.set(key, {
            key,
            code: service.code || 'SRV',
            description: service.description,
            category: 'servico_terceiro',
            unit: service.unit || 'un',
            totalQuantity: sQty,
            directCost: sDirectCost,
            salePrice: sSalePrice,
            serviceOccurrences: [
              {
                stageCode: stage.code,
                stageName: stage.name,
                serviceCode: service.code,
                serviceDescription: service.description,
                quantity: sQty,
              },
            ],
          })
        } else {
          const existing = map.get(key)!
          existing.totalQuantity += sQty
          existing.directCost += sDirectCost
          existing.salePrice += sSalePrice
          existing.serviceOccurrences.push({
            stageCode: stage.code,
            stageName: stage.name,
            serviceCode: service.code,
            serviceDescription: service.description,
            quantity: sQty,
          })
        }
        return
      }

      if (!service.composition?.inputs) return

      // Trata serviço que possui insumos
      // Se a fonte for 'Usuário' e o preço manual diferir da soma dos insumos,
      // calculamos o custo real de cada insumo preservando a proporção
      const breakdown = getServiceCostBreakdown(service)
      const isUserManual = service.unitPriceSource === 'Usuário'

      // Se o usuário fixou o preço manualmente no serviço e há insumos,
      // calcula o fator de escala do preço manual sobre o custo base dos insumos
      let manualScaleFactor = 1.0
      if (isUserManual && breakdown.baseDirectCost > 0) {
        const rawInputsSum = service.composition.inputs.reduce((acc, inp) => {
          const coeff = Number(inp.coefficient) || 0
          const uCost = Number(inp.unitCost) || 0
          return acc + coeff * uCost * sQty
        }, 0)
        if (rawInputsSum > 0) {
          manualScaleFactor = breakdown.baseDirectCost / rawInputsSum
        }
      }

      service.composition.inputs.forEach((input) => {
        const rawCode = input.code ? input.code.trim().toUpperCase() : ''
        const rawDesc = input.description.trim().toUpperCase()
        const key = rawCode || rawDesc
        const coef = Number(input.coefficient) || 0
        let baseUnitCost = Number(input.unitCost) || 0

        // Se mão de obra, aplica os encargos sociais reais vigentes do orçamento
        if (input.category === 'mao_de_obra') {
          baseUnitCost = baseUnitCost * laborMultiplier
        }

        const consumedQuantity = coef * sQty
        const itemDirectCost = consumedQuantity * baseUnitCost * manualScaleFactor
        const itemSalePrice = itemDirectCost * bdiMultiplier

        if (!map.has(key)) {
          map.set(key, {
            key,
            code: input.code || 'S/COD',
            description: input.description,
            category: input.category,
            unit: input.unit || 'un',
            totalQuantity: consumedQuantity,
            directCost: itemDirectCost,
            salePrice: itemSalePrice,
            serviceOccurrences: [
              {
                stageCode: stage.code,
                stageName: stage.name,
                serviceCode: service.code,
                serviceDescription: service.description,
                quantity: consumedQuantity,
              },
            ],
          })
        } else {
          const existing = map.get(key)!
          existing.totalQuantity += consumedQuantity
          existing.directCost += itemDirectCost
          existing.salePrice += itemSalePrice
          existing.serviceOccurrences.push({
            stageCode: stage.code,
            stageName: stage.name,
            serviceCode: service.code,
            serviceDescription: service.description,
            quantity: consumedQuantity,
          })
        }
      })
    })
  })

  // 3.5. CONSOLIDAÇÃO DE INSUMOS HOMÔNIMOS (Modo Insumos)
  // Quando a descrição normalizada for idêntica (ex: "Saco de ráfia" cadastrado com código SINAPI
  // em uma CPU e sem código ou com código genérico em outra), funde em UMA única linha:
  // - Soma totalQuantity (coeficiente CPU x quantidade de serviço já calculada)
  // - Soma directCost e salePrice
  // - Agrega todas as ocorrências de serviços/etapas para auditoria completa
  // - Prioriza o código real (SINAPI/oficial) se disponível, senão "S/COD"
  // - Nunca funde insumos de descrições normalizadas diferentes
  let intermediateList = Array.from(map.values())
  if (mode === 'insumos') {
    const consolidatedByDesc = new Map<string, IntermediateItem>()

    intermediateList.forEach((item) => {
      const normDesc = normalizeDescription(item.description)
      // Chave composta com a categoria para não misturar insumos de tipos diferentes com mesmo nome
      const groupKey = `${item.category}:::${normDesc}`

      const existing = consolidatedByDesc.get(groupKey)
      if (!existing) {
        consolidatedByDesc.set(groupKey, {
          ...item,
          serviceOccurrences: [...item.serviceOccurrences],
        })
      } else {
        // Funde no item já existente
        existing.totalQuantity += item.totalQuantity
        existing.directCost += item.directCost
        existing.salePrice += item.salePrice
        existing.serviceOccurrences.push(...item.serviceOccurrences)

        // Se o item consolidado ainda não tem código real mas o novo tem, adota o código real
        if (isGenericOrEmptyCode(existing.code) && !isGenericOrEmptyCode(item.code)) {
          existing.code = item.code
          existing.description = item.description
        }
      }
    })

    intermediateList = Array.from(consolidatedByDesc.values())
  }

  // 4. Ordenação decrescente pelo valor avaliado
  const rawItems = intermediateList
  const sorted = rawItems.sort((a, b) => {
    const valA = valueBasis === 'venda_bdi' ? a.salePrice : a.directCost
    const valB = valueBasis === 'venda_bdi' ? b.salePrice : b.directCost
    return valB - valA
  })

  const totalDirectCost = Number(rawItems.reduce((acc, it) => acc + it.directCost, 0).toFixed(2))
  const totalSalePrice = Number(rawItems.reduce((acc, it) => acc + it.salePrice, 0).toFixed(2))

  const totalAnalyzedValue = valueBasis === 'venda_bdi' ? totalSalePrice : totalDirectCost

  // 5. Cálculo acumulado e classificação rigorosa de Pareto (80% / 95%)
  let accumulatedValue = 0

  const allItems: AbcCalculatedItem[] = sorted.map((item, index) => {
    const evaluatedValue = valueBasis === 'venda_bdi' ? item.salePrice : item.directCost
    accumulatedValue += evaluatedValue

    const percentageOfTotal =
      totalAnalyzedValue > 0 ? (evaluatedValue / totalAnalyzedValue) * 100 : 0
    const accumulatedPercentage =
      totalAnalyzedValue > 0 ? (accumulatedValue / totalAnalyzedValue) * 100 : 0

    // Limites clássicos da Engenharia de Custos:
    // - Classe A: até 80% do valor total acumulado
    // - Classe B: de 80% até 95%
    // - Classe C: os 5% restantes
    // O item que cruza a fronteira faz parte da classe anterior para fechar o corte (prevAccumulated < limite)
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

    return {
      id: `abc-${index + 1}-${item.code.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'item'}`,
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
      servicesCount: item.serviceOccurrences.length,
      serviceOccurrences: item.serviceOccurrences,
    }
  })

  // 6. Separação por Classes A, B e C
  const classAItems = allItems.filter((i) => i.classification === 'A')
  const classBItems = allItems.filter((i) => i.classification === 'B')
  const classCItems = allItems.filter((i) => i.classification === 'C')

  const totalItemsCount = allItems.length

  const sumDirect = (list: AbcCalculatedItem[]) => list.reduce((acc, it) => acc + it.totalCost, 0)
  const sumSale = (list: AbcCalculatedItem[]) =>
    list.reduce((acc, it) => acc + it.totalSalePrice, 0)
  const sumEvaluated = (list: AbcCalculatedItem[]) =>
    list.reduce((acc, it) => acc + it.evaluatedValue, 0)

  const classACost = sumDirect(classAItems)
  const classBCost = sumDirect(classBItems)
  const classCCost = sumDirect(classCItems)

  const classASale = sumSale(classAItems)
  const classBSale = sumSale(classBItems)
  const classCSale = sumSale(classCItems)

  const classAEval = sumEvaluated(classAItems)
  const classBEval = sumEvaluated(classBItems)
  const classCEval = sumEvaluated(classCItems)

  return {
    budgetId: budget.id,
    budgetCode: budget.code,
    budgetName: budget.work?.name || budget.title || 'Orçamento de Engenharia',
    mode,
    valueBasis,
    totalAnalyzedValue: Number(totalAnalyzedValue.toFixed(2)),
    totalDirectCost,
    totalSalePrice,
    totalItemsCount,
    classA: {
      itemsCount: classAItems.length,
      percentageOfItems:
        totalItemsCount > 0 ? Number(((classAItems.length / totalItemsCount) * 100).toFixed(1)) : 0,
      totalCost: Number(classACost.toFixed(2)),
      totalSalePrice: Number(classASale.toFixed(2)),
      evaluatedValue: Number(classAEval.toFixed(2)),
      percentageOfCost:
        totalAnalyzedValue > 0 ? Number(((classAEval / totalAnalyzedValue) * 100).toFixed(1)) : 0,
      items: classAItems,
    },
    classB: {
      itemsCount: classBItems.length,
      percentageOfItems:
        totalItemsCount > 0 ? Number(((classBItems.length / totalItemsCount) * 100).toFixed(1)) : 0,
      totalCost: Number(classBCost.toFixed(2)),
      totalSalePrice: Number(classBSale.toFixed(2)),
      evaluatedValue: Number(classBEval.toFixed(2)),
      percentageOfCost:
        totalAnalyzedValue > 0 ? Number(((classBEval / totalAnalyzedValue) * 100).toFixed(1)) : 0,
      items: classBItems,
    },
    classC: {
      itemsCount: classCItems.length,
      percentageOfItems:
        totalItemsCount > 0 ? Number(((classCItems.length / totalItemsCount) * 100).toFixed(1)) : 0,
      totalCost: Number(classCCost.toFixed(2)),
      totalSalePrice: Number(classCSale.toFixed(2)),
      evaluatedValue: Number(classCEval.toFixed(2)),
      percentageOfCost:
        totalAnalyzedValue > 0 ? Number(((classCEval / totalAnalyzedValue) * 100).toFixed(1)) : 0,
      items: classCItems,
    },
    allItems,
  }
}
