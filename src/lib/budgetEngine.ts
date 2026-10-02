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
/**
 * Retorna o preço/custo unitário efetivo do Serviço:
 * - Se service.unitPrice !== undefined (preço manual / digitado pelo usuário), usa service.unitPrice
 * - Caso contrário, calcula pela Composição: Σ(coeficiente × custo_unitario)
 */
/**
 * Retorna os detalhes de custo e encargos de um serviço:
 * - baseDirectCost: custo direto base (sem encargos)
 * - laborDirectCost: base de mão de obra direta (sobre a qual incidem encargos)
 * - otherDirectCost: outros custos (material, equipamento, terceiros)
 * - effectiveLaborSharePercent: percentual de mão de obra aplicado no caso de preço direto (default 40% ou customizado)
 * - isEstimatedLabor: se a mão de obra foi estimada por percentual (preço direto) ou calculada por insumos
 */
export function getServiceCostBreakdown(service: BudgetService): {
  baseUnitCost: number
  baseDirectCost: number
  laborDirectCost: number
  materialDirectCost: number
  equipmentDirectCost: number
  subcontractDirectCost: number
  effectiveLaborSharePercent: number
  isEstimatedLabor: boolean
  hasLaborInputs: boolean
} {
  const sQty = Number(service.quantity) || 0
  const hasInputs =
    service.composition &&
    Array.isArray(service.composition.inputs) &&
    service.composition.inputs.length > 0

  const customLaborShare =
    service.laborSharePercent !== undefined && service.laborSharePercent !== null
      ? Math.max(0, Math.min(100, Number(service.laborSharePercent)))
      : 40

  let laborCost = 0
  let materialCost = 0
  let equipmentCost = 0
  let subcontractCost = 0
  let hasLaborInputs = false

  // Só trata como preço manual travado quando a FONTE do preço for 'Usuário' (ou serviço sem insumos com preço definido).
  // Quando a fonte for 'Composição' ou 'SINAPI', recalcula sempre a partir dos coeficientes × custos dos insumos da CPU.
  const isUserManual =
    service.unitPriceSource === 'Usuário' ||
    (!hasInputs && service.unitPrice !== undefined && service.unitPrice !== null)

  if (isUserManual && service.unitPrice !== undefined && service.unitPrice !== null) {
    const manualUnit = Number(service.unitPrice) || 0
    const serviceTotal = manualUnit * sQty

    if (hasInputs) {
      service.composition.inputs.forEach((input: BudgetInput) => {
        const itemCost = (Number(input.coefficient) || 0) * (Number(input.unitCost) || 0) * sQty
        switch (input.category) {
          case 'mao_de_obra':
            laborCost += itemCost
            hasLaborInputs = true
            break
          case 'material':
            materialCost += itemCost
            break
          case 'equipamento':
            equipmentCost += itemCost
            break
          case 'servico_terceiro':
          case 'outros':
          default:
            subcontractCost += itemCost
            break
        }
      })

      if (hasLaborInputs) {
        // Possui insumos com mão de obra real: a base de mão de obra é a dos insumos
        const otherCost = Math.max(0, serviceTotal - laborCost)
        return {
          baseUnitCost: manualUnit,
          baseDirectCost: serviceTotal,
          laborDirectCost: laborCost,
          materialDirectCost: materialCost,
          equipmentDirectCost: equipmentCost,
          subcontractDirectCost: subcontractCost,
          effectiveLaborSharePercent:
            serviceTotal > 0 ? Number(((laborCost / serviceTotal) * 100).toFixed(2)) : 0,
          isEstimatedLabor: false,
          hasLaborInputs: true,
        }
      } else {
        // Não há insumos de mão de obra: aplica a regra da mão de obra estimada (laborSharePercent, default 40%)
        const estimatedLabor = (serviceTotal * customLaborShare) / 100
        const otherCost = serviceTotal - estimatedLabor
        return {
          baseUnitCost: manualUnit,
          baseDirectCost: serviceTotal,
          laborDirectCost: estimatedLabor,
          materialDirectCost: materialCost,
          equipmentDirectCost: equipmentCost,
          subcontractDirectCost: otherCost,
          effectiveLaborSharePercent: customLaborShare,
          isEstimatedLabor: true,
          hasLaborInputs: false,
        }
      }
    } else {
      // Sem insumos: serviço de preço direto puro
      const estimatedLabor = (serviceTotal * customLaborShare) / 100
      const otherCost = serviceTotal - estimatedLabor
      return {
        baseUnitCost: manualUnit,
        baseDirectCost: serviceTotal,
        laborDirectCost: estimatedLabor,
        materialDirectCost: 0,
        equipmentDirectCost: 0,
        subcontractDirectCost: otherCost,
        effectiveLaborSharePercent: customLaborShare,
        isEstimatedLabor: true,
        hasLaborInputs: false,
      }
    }
  }

  // Preço derivado da composição CPU
  if (hasInputs) {
    let cpuUnit = 0
    service.composition.inputs.forEach((input: BudgetInput) => {
      const coeff = Number(input.coefficient) || 0
      const unitC = Number(input.unitCost) || 0
      const itemCost = coeff * unitC * sQty
      cpuUnit += coeff * unitC

      switch (input.category) {
        case 'mao_de_obra':
          laborCost += itemCost
          hasLaborInputs = true
          break
        case 'material':
          materialCost += itemCost
          break
        case 'equipamento':
          equipmentCost += itemCost
          break
        case 'servico_terceiro':
        case 'outros':
        default:
          subcontractCost += itemCost
          break
      }
    })

    const totalCost = cpuUnit * sQty
    return {
      baseUnitCost: cpuUnit,
      baseDirectCost: totalCost,
      laborDirectCost: laborCost,
      materialDirectCost: materialCost,
      equipmentDirectCost: equipmentCost,
      subcontractDirectCost: subcontractCost,
      effectiveLaborSharePercent:
        totalCost > 0 ? Number(((laborCost / totalCost) * 100).toFixed(2)) : 0,
      isEstimatedLabor: false,
      hasLaborInputs,
    }
  }

  return {
    baseUnitCost: 0,
    baseDirectCost: 0,
    laborDirectCost: 0,
    materialDirectCost: 0,
    equipmentDirectCost: 0,
    subcontractDirectCost: 0,
    effectiveLaborSharePercent: customLaborShare,
    isEstimatedLabor: false,
    hasLaborInputs: false,
  }
}

/**
 * Retorna o preço/custo unitário efetivo do Serviço:
 * - Se laborMultiplier !== 1.0 (ou chargesRate > 0), os encargos sociais incidentes sobre a parcela
 *   de mão de obra do serviço (seja calculada via CPU ou estimada pelo laborSharePercent do preço direto)
 *   são computados de forma consistente, evitando discrepâncias entre totais globais e subtotais por etapa.
 */
export function getServiceEffectiveUnitCost(
  service: BudgetService,
  laborMultiplier: number = 1.0,
): number {
  const breakdown = getServiceCostBreakdown(service)
  const sQty = Number(service.quantity) || 0

  if (sQty <= 0 || breakdown.baseDirectCost <= 0) {
    return Number(breakdown.baseUnitCost.toFixed(4))
  }

  // Encargos incidentes sobre a parcela de mão de obra deste serviço
  const chargesRateDecimal = Math.max(0, laborMultiplier - 1.0)
  const serviceSocialCharges = breakdown.laborDirectCost * chargesRateDecimal
  const totalWithCharges = breakdown.baseDirectCost + serviceSocialCharges

  return Number((totalWithCharges / sQty).toFixed(4))
}

/**
 * Calcula o custo direto do Serviço:
 * Custo do Serviço = Preço Unitário Efetivo × Quantidade (incluindo encargos proporcionais se laborMultiplier > 1)
 */
export function calculateServiceDirectCost(
  service: BudgetService,
  laborMultiplier: number = 1.0,
): number {
  const breakdown = getServiceCostBreakdown(service)
  const chargesRateDecimal = Math.max(0, laborMultiplier - 1.0)
  const serviceSocialCharges = breakdown.laborDirectCost * chargesRateDecimal
  return Number((breakdown.baseDirectCost + serviceSocialCharges).toFixed(2))
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
/**
 * Retorna a taxa percentual de encargos sociais efetiva do orçamento (ex.: 0 para Simples, 68.35 para SP desonerado, etc.)
 */
export function getBudgetSocialChargesRate(budget: FullBudget): number {
  const taxRegime =
    budget.chargesConfig?.taxRegime ||
    (budget.chargesConfig?.isRelieved ? 'com_desoneracao' : 'sem_desoneracao')

  if (taxRegime === 'simples_nacional') {
    return 0
  }

  const isRelievedForCharges = taxRegime === 'com_desoneracao'
  const stateCharges = getChargesForState(budget.chargesConfig?.uf || 'SP', isRelievedForCharges)

  const defaultTotalForConfig = Number(
    (stateCharges.groupA + stateCharges.groupB + stateCharges.groupC + stateCharges.groupD).toFixed(
      2,
    ),
  )

  if (budget.chargesConfig?.customGroupA !== undefined) {
    const customSum =
      (budget.chargesConfig.customGroupA || 0) +
      (budget.chargesConfig.customGroupB || 0) +
      (budget.chargesConfig.customGroupC || 0) +
      (budget.chargesConfig.customGroupD || 0)

    if (customSum === 0 && !budget.chargesConfig.isExplicitZero) {
      return defaultTotalForConfig
    }
    return Number(customSum.toFixed(2))
  }

  if (!budget.chargesConfig?.isExplicitZero) {
    return defaultTotalForConfig
  }

  return 0
}

/**
 * Retorna o multiplicador de encargos sobre a mão de obra (ex.: 1.0 no Simples Nacional, 1 + chargesRate / 100 nos regimes CLT/CPRB)
 */
export function getBudgetLaborMultiplier(budget: FullBudget): number {
  const rate = getBudgetSocialChargesRate(budget)
  return 1 + rate / 100
}

export function calculateFullBudget(budget: FullBudget): CalculationSummary {
  // Determina o regime tributário efetivo
  const taxRegime =
    budget.chargesConfig?.taxRegime ||
    (budget.chargesConfig?.isRelieved ? 'com_desoneracao' : 'sem_desoneracao')

  // 1. Determina taxa de encargos sociais pela UF e regime:
  // REGRA DO USUÁRIO (Eng. Edenir Souza da Rosa - CREA/RS-252397):
  // No Simples Nacional, a conta é SIMPLES: NÃO considera encargos trabalhistas (nem Grupo A, nem B, nem C, nem D).
  // Encargos sociais ficam rigorosamente zerados (0,00% / R$ 0,00).
  // O ÚNICO percentual tributário incidente é o DAS no BDI (inserido manualmente).
  // Nos demais regimes ("sem_desoneracao" e "com_desoneracao"), aplica a tabela de encargos SINAPI da UF.
  const isSimples = taxRegime === 'simples_nacional'
  const chargesRate = getBudgetSocialChargesRate(budget)

  // 2. Determina o BDI pela fórmula TCU
  // No Simples Nacional, os tributos sobre faturamento são unificados no DAS (alíquota efetiva informada pelo usuário).
  // Nos regimes normais (Lucro Presumido / Real), somam-se ISS + PIS + COFINS + CPRB (se desonerado).
  let taxesTotal = 0
  if (taxRegime === 'simples_nacional') {
    const dasRate =
      budget.chargesConfig?.simplesDasRate !== undefined
        ? budget.chargesConfig.simplesDasRate
        : budget.bdiConfig.taxes.simplesDas !== undefined
          ? budget.bdiConfig.taxes.simplesDas
          : 0
    taxesTotal = Number(dasRate) || 0
  } else {
    taxesTotal =
      (budget.bdiConfig.taxes.iss || 0) +
      (budget.bdiConfig.taxes.pis || 0) +
      (budget.bdiConfig.taxes.cofins || 0) +
      (budget.bdiConfig.taxes.inssOrCprb || 0)
  }

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
  // Usa getServiceCostBreakdown para assegurar correspondência estrita e única
  // entre o cálculo global e os subtotais por etapa
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
      const hasInputs =
        service.composition &&
        Array.isArray(service.composition.inputs) &&
        service.composition.inputs.length > 0
      if (hasInputs) {
        inputsCount += service.composition.inputs.length
      }

      const breakdown = getServiceCostBreakdown(service)
      laborDirectCost += breakdown.laborDirectCost
      materialDirectCost += breakdown.materialDirectCost
      equipmentDirectCost += breakdown.equipmentDirectCost
      subcontractDirectCost += breakdown.subcontractDirectCost
      totalDirectCostNoCharges += breakdown.baseDirectCost
    })
  })

  // Encargos Sociais incidem sobre a mão de obra
  const socialChargesAmount = (laborDirectCost * chargesRate) / 100
  const totalDirectCost = totalDirectCostNoCharges + socialChargesAmount

  // Subtotais por etapa (com e sem BDI)
  // Cada serviço pode usar BDI geral ou BDI diferenciado
  // Regra de centavos / integridade da CONCE:
  // Arredonda cada etapa para 2 casas decimais e define o total geral da obra como a soma
  // exata das etapas já arredondadas, garantindo que total - soma(etapas) = 0,00 rigorosamente.
  // Também garante que totalDirectCost = soma dos custos diretos das etapas já arredondados.
  const stagesSubtotals = budget.stages.map((stage) => {
    let stageDirect = 0
    let stageWithBdi = 0

    stage.services.forEach((service) => {
      const sQty = Number(service.quantity) || 0
      const laborMult = 1 + chargesRate / 100
      const sUnitCost = getServiceEffectiveUnitCost(service, laborMult)

      const sDirect = Number((sUnitCost * sQty).toFixed(2))
      const serviceBdi =
        service.customBdiPercent !== undefined && service.customBdiPercent !== null
          ? Number(service.customBdiPercent)
          : generalBdiRate

      const sWithBdi = Number((sDirect * (1 + serviceBdi / 100)).toFixed(2))

      stageDirect += sDirect
      stageWithBdi += sWithBdi
    })

    return {
      stageId: stage.id,
      code: stage.code,
      name: stage.name,
      directCost: Number(stageDirect.toFixed(2)),
      withBdi: Number(stageWithBdi.toFixed(2)),
      percentageOfTotal: 0, // calculado abaixo
    }
  })

  // Total da obra definido exatamente como a soma das etapas já arredondadas
  const totalWithBdi = Number(stagesSubtotals.reduce((acc, st) => acc + st.withBdi, 0).toFixed(2))

  const sumStagesDirect = Number(
    stagesSubtotals.reduce((acc, st) => acc + st.directCost, 0).toFixed(2),
  )

  // Atualiza percentuais das etapas
  stagesSubtotals.forEach((st) => {
    st.percentageOfTotal =
      totalWithBdi > 0 ? Number(((st.withBdi / totalWithBdi) * 100).toFixed(1)) : 0
  })

  // Custo direto total alinhado com a soma das etapas para coerência de centavos
  const finalTotalDirectCost =
    sumStagesDirect > 0 ? sumStagesDirect : Number(totalDirectCost.toFixed(2))
  const bdiAmount = Number(Math.max(0, totalWithBdi - finalTotalDirectCost).toFixed(2))
  const totalTaxesAmount = Number(((totalWithBdi * taxesTotal) / 100).toFixed(2))

  return {
    taxRegime,
    simplesCollectionOption: budget.chargesConfig?.simplesCollectionOption,
    directCostInputs: Number(totalDirectCostNoCharges.toFixed(2)),
    laborDirectCost: Number(laborDirectCost.toFixed(2)),
    materialDirectCost: Number(materialDirectCost.toFixed(2)),
    equipmentDirectCost: Number(equipmentDirectCost.toFixed(2)),
    subcontractDirectCost: Number(subcontractDirectCost.toFixed(2)),
    socialChargesRate: chargesRate,
    socialChargesAmount: Number(socialChargesAmount.toFixed(2)),
    totalDirectCost: finalTotalDirectCost,
    bdiRate: generalBdiRate,
    bdiAmount,
    totalTaxesRate: taxesTotal,
    totalTaxesAmount,
    finalSalePrice: totalWithBdi,
    stagesSubtotals,
    servicesCount,
    inputsCount,
  }
}
