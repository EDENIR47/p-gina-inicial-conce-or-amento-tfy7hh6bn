/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Motor de Cálculo da Curva ABC (Princípio de Pareto)
 *
 * Agrupa insumos de todas as etapas e serviços do orçamento,
 * calcula o custo total acumulado de cada insumo, ordena de forma decrescente
 * e classifica com base nos limites clássicos de engenharia:
 * - Classe A: até ~80% do custo direto total (máxima prioridade)
 * - Classe B: de ~80% a ~95% do custo direto total (atenção média)
 * - Classe C: os 5% restantes (itens com baixo impacto financeiro individual)
 */

import { FullBudget, BudgetInput } from '@/types/budgetEngine'
import { AbcCalculatedItem, AbcCurveAnalysis, AbcClass } from '@/types/intelligence'
import { getChargesForState } from './chargesData'

export function computeAbcCurve(budget: FullBudget): AbcCurveAnalysis {
  const taxRegime =
    budget.chargesConfig?.taxRegime ||
    (budget.chargesConfig?.isRelieved ? 'com_desoneracao' : 'sem_desoneracao')

  // No Simples Nacional, os encargos seguem sem desoneração
  const isRelievedForCharges = taxRegime === 'com_desoneracao'

  const stateCharges = getChargesForState(budget.chargesConfig?.uf || 'SP', isRelievedForCharges)

  const chargesRate =
    budget.chargesConfig?.customGroupA !== undefined
      ? (budget.chargesConfig.customGroupA || 0) +
        (budget.chargesConfig.customGroupB || 0) +
        (budget.chargesConfig.customGroupC || 0) +
        (budget.chargesConfig.customGroupD || 0)
      : stateCharges.total

  const laborMultiplier = 1 + chargesRate / 100

  // 1. Dicionário de agregação de insumos por código (ou ID caso não tenha código)
  interface AggregatedInput {
    code: string
    description: string
    category: BudgetInput['category']
    unit: string
    unitCost: number
    totalQuantity: number
    totalCost: number
    serviceOccurrences: Array<{
      stageCode: string
      stageName: string
      serviceCode: string
      serviceDescription: string
      quantity: number
    }>
  }

  const map = new Map<string, AggregatedInput>()

  budget.stages.forEach((stage) => {
    stage.services.forEach((service) => {
      const sQty = Number(service.quantity) || 0
      const hasInputs =
        service.composition &&
        Array.isArray(service.composition.inputs) &&
        service.composition.inputs.length > 0

      // Se o serviço tiver preço manual e NÃO tiver insumos, entra na Curva ABC como serviço de terceiro/item direto
      if (!hasInputs && (Number(service.unitPrice) || 0) > 0) {
        const key = `SERV-${service.code}`.toUpperCase()
        const unitCost = Number(service.unitPrice) || 0
        const itemTotalCost = unitCost * sQty

        if (!map.has(key)) {
          map.set(key, {
            code: service.code || 'SRV',
            description: service.description,
            category: 'servico_terceiro',
            unit: service.unit || 'un',
            unitCost,
            totalQuantity: sQty,
            totalCost: itemTotalCost,
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
          existing.totalCost += itemTotalCost
          if (existing.totalQuantity > 0) {
            existing.unitCost = existing.totalCost / existing.totalQuantity
          }
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

      service.composition.inputs.forEach((input) => {
        const key = input.code
          ? input.code.trim().toUpperCase()
          : input.description.trim().toUpperCase()
        const coef = Number(input.coefficient) || 0
        let baseUnitCost = Number(input.unitCost) || 0

        // Se mão de obra, reflete os encargos sociais reais vigentes
        if (input.category === 'mao_de_obra') {
          baseUnitCost = baseUnitCost * laborMultiplier
        }

        const consumedQuantity = coef * sQty
        const itemTotalCost = consumedQuantity * baseUnitCost

        if (!map.has(key)) {
          map.set(key, {
            code: input.code || 'S/COD',
            description: input.description,
            category: input.category,
            unit: input.unit || 'un',
            unitCost: baseUnitCost,
            totalQuantity: consumedQuantity,
            totalCost: itemTotalCost,
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
          existing.totalCost += itemTotalCost
          // Média ponderada do custo unitário se houver variações
          if (existing.totalQuantity > 0) {
            existing.unitCost = existing.totalCost / existing.totalQuantity
          }
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

  // 2. Ordena decrescente pelo custo total
  const sorted = Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)

  const totalDirectCost = sorted.reduce((acc, it) => acc + it.totalCost, 0)

  // 3. Calcula percentuais acumulados e classificação A, B, C
  let accumulatedCost = 0

  const allItems: AbcCalculatedItem[] = sorted.map((item, index) => {
    accumulatedCost += item.totalCost
    const percentageOfTotal = totalDirectCost > 0 ? (item.totalCost / totalDirectCost) * 100 : 0
    const accumulatedPercentage =
      totalDirectCost > 0 ? (accumulatedCost / totalDirectCost) * 100 : 0

    let classification: AbcClass = 'C'
    // Limites de Pareto: Classe A até 80%, B até 95%, C restante
    // Se o item anterior era < 80%, este item ainda faz parte ou encerra a transição para A
    const prevAccumulated = accumulatedPercentage - percentageOfTotal
    if (prevAccumulated < 80) {
      classification = 'A'
    } else if (prevAccumulated < 95) {
      classification = 'B'
    } else {
      classification = 'C'
    }

    return {
      id: `abc-${index + 1}-${item.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      code: item.code,
      description: item.description,
      category: item.category,
      unit: item.unit,
      totalQuantity: Number(item.totalQuantity.toFixed(3)),
      unitCost: Number(item.unitCost.toFixed(2)),
      totalCost: Number(item.totalCost.toFixed(2)),
      percentageOfTotal: Number(percentageOfTotal.toFixed(2)),
      accumulatedPercentage: Number(accumulatedPercentage.toFixed(2)),
      classification,
      rank: index + 1,
      servicesCount: item.serviceOccurrences.length,
      serviceOccurrences: item.serviceOccurrences,
    }
  })

  // 4. Separação em blocos A, B e C
  const classAItems = allItems.filter((i) => i.classification === 'A')
  const classBItems = allItems.filter((i) => i.classification === 'B')
  const classCItems = allItems.filter((i) => i.classification === 'C')

  const totalItemsCount = allItems.length

  const sumCost = (list: AbcCalculatedItem[]) => list.reduce((acc, it) => acc + it.totalCost, 0)

  const classACost = sumCost(classAItems)
  const classBCost = sumCost(classBItems)
  const classCCost = sumCost(classCItems)

  return {
    budgetId: budget.id,
    budgetCode: budget.code,
    budgetName: budget.work.name,
    totalDirectCost: Number(totalDirectCost.toFixed(2)),
    totalItemsCount,
    classA: {
      itemsCount: classAItems.length,
      percentageOfItems:
        totalItemsCount > 0 ? Number(((classAItems.length / totalItemsCount) * 100).toFixed(1)) : 0,
      totalCost: Number(classACost.toFixed(2)),
      percentageOfCost:
        totalDirectCost > 0 ? Number(((classACost / totalDirectCost) * 100).toFixed(1)) : 0,
      items: classAItems,
    },
    classB: {
      itemsCount: classBItems.length,
      percentageOfItems:
        totalItemsCount > 0 ? Number(((classBItems.length / totalItemsCount) * 100).toFixed(1)) : 0,
      totalCost: Number(classBCost.toFixed(2)),
      percentageOfCost:
        totalDirectCost > 0 ? Number(((classBCost / totalDirectCost) * 100).toFixed(1)) : 0,
      items: classBItems,
    },
    classC: {
      itemsCount: classCItems.length,
      percentageOfItems:
        totalItemsCount > 0 ? Number(((classCItems.length / totalItemsCount) * 100).toFixed(1)) : 0,
      totalCost: Number(classCCost.toFixed(2)),
      percentageOfCost:
        totalDirectCost > 0 ? Number(((classCCost / totalDirectCost) * 100).toFixed(1)) : 0,
      items: classCItems,
    },
    allItems,
  }
}
