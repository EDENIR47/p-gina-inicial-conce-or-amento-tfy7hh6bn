/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Motor de Cálculo em Tempo Real & Fórmula de BDI do TCU (Acórdão 2.622/2013 - Plenário)
 *
 * Fórmula TCU:
 * BDI = [((1 + AC + R + S + G) * (1 + DF) * (1 + L)) / (1 - T) - 1] * 100
 * Onde:
 * AC = Administração Central (%)
 * R  = Risco (%)
 * S  = Seguro (%)
 * G  = Garantia (%) (normalmente agrupado com seguro S + G)
 * DF = Despesas Financeiras (%)
 * L  = Lucro Bruto / Margem Operacional (%)
 * T  = Tributos (ISS + PIS + COFINS + CPRB se houver) (%)
 */

import {
  BdiConfig,
  BudgetComposition,
  BudgetInput,
  BudgetService,
  BudgetStage,
  CalculationSummary,
  FullBudget,
} from '@/types/budgetEngine'
import { getChargesForState } from './chargesData'

export const DEFAULT_BDI_CONFIG: BdiConfig = {
  administrationCentral: 4.0, // Faixa TCU: 3.00% a 5.50%
  risk: 1.27, // Faixa TCU: 0.97% a 1.27%
  insuranceAndGuarantee: 0.8, // Faixa TCU: 0.80% a 1.00%
  financialExpenses: 1.23, // Faixa TCU: 0.59% a 1.39%
  profit: 7.4, // Faixa TCU: 6.16% a 8.96%
  taxes: {
    iss: 3.0, // ISS municipal (2.0% a 5.0%)
    pis: 0.65, // PIS padrão
    cofins: 3.0, // COFINS padrão
    inssOrCprb: 0.0, // 4.5% se desonerado
    totalTaxes: 6.65,
  },
  calculatedBdi: 22.84,
  differentiatedEquipBdi: 15.0, // TCU recomenda BDI diferenciado para fornecimento de equipamentos
}

/**
 * Calcula o BDI pela fórmula estrita do TCU (Acórdão 2.622/2013)
 * Todos os parâmetros de entrada são percentuais (ex.: 4 para 4%)
 */
export function calculateTcuBdi(config: {
  administrationCentral: number
  risk: number
  insuranceAndGuarantee: number
  financialExpenses: number
  profit: number
  taxesTotal: number
}): { bdiPercent: number; numerator: number; denominator: number; isValid: boolean } {
  const ac = (config.administrationCentral || 0) / 100
  const r = (config.risk || 0) / 100
  const sg = (config.insuranceAndGuarantee || 0) / 100
  const df = (config.financialExpenses || 0) / 100
  const l = (config.profit || 0) / 100
  const t = (config.taxesTotal || 0) / 100

  // Se a soma de impostos for >= 100%, denominador fica <= 0 (impossível matematicamente)
  if (t >= 1) {
    return { bdiPercent: 0, numerator: 0, denominator: 0, isValid: false }
  }

  const part1 = 1 + ac + r + sg
  const part2 = 1 + df
  const part3 = 1 + l
  const numerator = part1 * part2 * part3
  const denominator = 1 - t

  const bdiDecimal = numerator / denominator - 1
  const bdiPercent = Math.max(0, bdiDecimal * 100)

  return {
    bdiPercent: Number(bdiPercent.toFixed(2)),
    numerator,
    denominator,
    isValid: true,
  }
}

/**
 * Calcula o custo unitário direto de uma Composição:
 * Custo da Composição = Σ (coeficiente_insumo × custo_unitario_insumo)
 */
export function calculateCompositionUnitCost(
  composition: BudgetComposition,
  laborMultiplier: number = 1.0, // Multiplicador se aplicar encargos sobre mão de obra
): number {
  if (!composition.inputs || composition.inputs.length === 0) {
    return 0
  }

  const sum = composition.inputs.reduce((acc, input) => {
    const qty = Number(input.coefficient) || 0
    let unitCost = Number(input.unitCost) || 0

    // Aplica multiplicador se for mão de obra e houver encargos parametrizados
    if (input.category === 'mao_de_obra') {
      unitCost = unitCost * laborMultiplier
    }

    return acc + qty * unitCost
  }, 0)

  return Number(sum.toFixed(4))
}

/**
 * Calcula o custo direto do Serviço:
 * Custo do Serviço = Composição × Quantidade
 */
export function calculateServiceDirectCost(
  service: BudgetService,
  laborMultiplier: number = 1.0,
): number {
  const unitCost = calculateCompositionUnitCost(service.composition, laborMultiplier)
  const qty = Number(service.quantity) || 0
  return Number((unitCost * qty).toFixed(2))
}

/**
 * Calcula o subtotal direto de uma Etapa:
 * Subtotal da Etapa = Σ Custo dos Serviços
 */
export function calculateStageDirectCost(
  stage: BudgetStage,
  laborMultiplier: number = 1.0,
): number {
  if (!stage.services || stage.services.length === 0) return 0
  const sum = stage.services.reduce(
    (acc, s) => acc + calculateServiceDirectCost(s, laborMultiplier),
    0,
  )
  return Number(sum.toFixed(2))
}

/**
 * Executa o cálculo integral de um orçamento em tempo real
 */
export function calculateFullBudget(budget: FullBudget): CalculationSummary {
  // 1. Determina taxa de encargos sociais pela UF e regime
  const stateCharges = getChargesForState(
    budget.chargesConfig?.uf || 'SP',
    budget.chargesConfig?.isRelieved || false,
  )

  // Percentual total de encargos sociais (pode ser customizado ou default da UF)
  const chargesRate =
    budget.chargesConfig?.customGroupA !== undefined
      ? (budget.chargesConfig.customGroupA || 0) +
        (budget.chargesConfig.customGroupB || 0) +
        (budget.chargesConfig.customGroupC || 0) +
        (budget.chargesConfig.customGroupD || 0)
      : stateCharges.total

  // 2. Determina o BDI pela fórmula TCU
  const taxesTotal =
    (budget.bdiConfig.taxes.iss || 0) +
    (budget.bdiConfig.taxes.pis || 0) +
    (budget.bdiConfig.taxes.cofins || 0) +
    (budget.bdiConfig.taxes.inssOrCprb || 0)

  const tcuResult = calculateTcuBdi({
    administrationCentral: budget.bdiConfig.administrationCentral,
    risk: budget.bdiConfig.risk,
    insuranceAndGuarantee: budget.bdiConfig.insuranceAndGuarantee,
    financialExpenses: budget.bdiConfig.financialExpenses,
    profit: budget.bdiConfig.profit,
    taxesTotal,
  })

  const generalBdiRate = tcuResult.bdiPercent

  // 3. Varre etapas -> serviços -> composições -> insumos
  let laborDirectCost = 0
  let materialDirectCost = 0
  let equipmentDirectCost = 0
  let subcontractDirectCost = 0
  let totalDirectCostNoCharges = 0
  let servicesCount = 0
  let inputsCount = 0

  budget.stages.forEach((stage) => {
    stage.services.forEach((service) => {
      servicesCount++
      const serviceQty = Number(service.quantity) || 0

      if (service.composition && service.composition.inputs) {
        service.composition.inputs.forEach((input: BudgetInput) => {
          inputsCount++
          const itemCost =
            (Number(input.coefficient) || 0) * (Number(input.unitCost) || 0) * serviceQty

          switch (input.category) {
            case 'mao_de_obra':
              laborDirectCost += itemCost
              break
            case 'material':
              materialDirectCost += itemCost
              break
            case 'equipamento':
              equipmentDirectCost += itemCost
              break
            case 'servico_terceiro':
            case 'outros':
            default:
              subcontractDirectCost += itemCost
              break
          }
          totalDirectCostNoCharges += itemCost
        })
      }
    })
  })

  // Encargos Sociais incidem sobre a mão de obra
  const socialChargesAmount = (laborDirectCost * chargesRate) / 100
  const totalDirectCost = totalDirectCostNoCharges + socialChargesAmount

  // Subtotais por etapa (com e sem BDI)
  // Cada serviço pode usar BDI geral ou BDI diferenciado
  let totalWithBdi = 0

  const stagesSubtotals = budget.stages.map((stage) => {
    let stageDirect = 0
    let stageWithBdi = 0

    stage.services.forEach((service) => {
      const sQty = Number(service.quantity) || 0
      let sUnitCost = 0

      if (service.composition && service.composition.inputs) {
        sUnitCost = service.composition.inputs.reduce((acc, input) => {
          let baseCost = Number(input.unitCost) || 0
          if (input.category === 'mao_de_obra') {
            baseCost = baseCost * (1 + chargesRate / 100)
          }
          return acc + (Number(input.coefficient) || 0) * baseCost
        }, 0)
      }

      const sDirect = sUnitCost * sQty
      const serviceBdi =
        service.customBdiPercent !== undefined && service.customBdiPercent !== null
          ? Number(service.customBdiPercent)
          : generalBdiRate

      const sWithBdi = sDirect * (1 + serviceBdi / 100)

      stageDirect += sDirect
      stageWithBdi += sWithBdi
    })

    totalWithBdi += stageWithBdi

    return {
      stageId: stage.id,
      code: stage.code,
      name: stage.name,
      directCost: Number(stageDirect.toFixed(2)),
      withBdi: Number(stageWithBdi.toFixed(2)),
      percentageOfTotal: 0, // calculado abaixo
    }
  })

  // Atualiza percentuais das etapas
  stagesSubtotals.forEach((st) => {
    st.percentageOfTotal =
      totalWithBdi > 0 ? Number(((st.withBdi / totalWithBdi) * 100).toFixed(1)) : 0
  })

  const bdiAmount = totalWithBdi - totalDirectCost
  const totalTaxesAmount = (totalWithBdi * taxesTotal) / 100

  return {
    directCostInputs: Number(totalDirectCostNoCharges.toFixed(2)),
    laborDirectCost: Number(laborDirectCost.toFixed(2)),
    materialDirectCost: Number(materialDirectCost.toFixed(2)),
    equipmentDirectCost: Number(equipmentDirectCost.toFixed(2)),
    subcontractDirectCost: Number(subcontractDirectCost.toFixed(2)),
    socialChargesRate: chargesRate,
    socialChargesAmount: Number(socialChargesAmount.toFixed(2)),
    totalDirectCost: Number(totalDirectCost.toFixed(2)),
    bdiRate: generalBdiRate,
    bdiAmount: Number(Math.max(0, bdiAmount).toFixed(2)),
    totalTaxesRate: taxesTotal,
    totalTaxesAmount: Number(totalTaxesAmount.toFixed(2)),
    finalSalePrice: Number(totalWithBdi.toFixed(2)),
    stagesSubtotals,
    servicesCount,
    inputsCount,
  }
}
