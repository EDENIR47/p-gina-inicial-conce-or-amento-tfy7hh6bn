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
export function getServiceEffectiveUnitCost(
  service: BudgetService,
  laborMultiplier: number = 1.0,
): number {
  const hasInputs =
    service.composition &&
    Array.isArray(service.composition.inputs) &&
    service.composition.inputs.length > 0

  if (service.unitPrice !== undefined && service.unitPrice !== null) {
    return Number(service.unitPrice) || 0
  }

  if (hasInputs) {
    return calculateCompositionUnitCost(service.composition, laborMultiplier)
  }

  return 0
}

/**
 * Calcula o custo direto do Serviço:
 * Custo do Serviço = Preço Unitário Efetivo × Quantidade
 */
export function calculateServiceDirectCost(
  service: BudgetService,
  laborMultiplier: number = 1.0,
): number {
  const unitCost = getServiceEffectiveUnitCost(service, laborMultiplier)
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
  // Determina o regime tributário efetivo
  const taxRegime =
    budget.chargesConfig?.taxRegime ||
    (budget.chargesConfig?.isRelieved ? 'com_desoneracao' : 'sem_desoneracao')

  // 1. Determina taxa de encargos sociais pela UF e regime:
  // No Simples Nacional, os percentuais de encargos usam o regime SEM desoneração como base
  // (o Simples NÃO zera encargos trabalhistas — usa a base Sem Desoneração da SINAPI/UF).
  const isRelievedForCharges = taxRegime === 'com_desoneracao'

  const stateCharges = getChargesForState(budget.chargesConfig?.uf || 'SP', isRelievedForCharges)

  // Percentual total de encargos sociais (pode ser customizado ou default da UF)
  // REGRA DE SEGURANÇA / GUARD: No Simples Nacional (ou qualquer regime sem desoneração),
  // encargos sociais NUNCA devem ser zerados por omissão ou inferência errônea.
  // Taxa zero só é legítima se explicitamente marcada como isExplicitZero === true.
  // Se a soma dos grupos customizados resultar em 0 (ou estiverem ausentes), usa a tabela oficial da UF.
  let chargesRate: number
  if (budget.chargesConfig?.customGroupA !== undefined) {
    const customSum =
      (budget.chargesConfig.customGroupA || 0) +
      (budget.chargesConfig.customGroupB || 0) +
      (budget.chargesConfig.customGroupC || 0) +
      (budget.chargesConfig.customGroupD || 0)

    if (customSum === 0 && !budget.chargesConfig.isExplicitZero) {
      chargesRate = stateCharges.total
    } else {
      chargesRate = customSum
    }
  } else {
    chargesRate = stateCharges.total
  }

  // Fallback extra: se o regime for Simples Nacional ou Sem Desoneração e chargesRate for 0 sem flag explícita,
  // garante o valor da UF sem desoneração
  if (chargesRate === 0 && !budget.chargesConfig?.isExplicitZero) {
    chargesRate = getChargesForState(budget.chargesConfig?.uf || 'SP', false).total
  }

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
      const hasInputs =
        service.composition &&
        Array.isArray(service.composition.inputs) &&
        service.composition.inputs.length > 0

      if (service.unitPrice !== undefined && service.unitPrice !== null) {
        // Se há unitPrice definido (manual / direto no serviço)
        if (hasInputs) {
          // Se tem insumos na CPU, varre os insumos para catalogar categorias
          let hasMaoDeObraInput = false
          service.composition.inputs.forEach((input: BudgetInput) => {
            inputsCount++
            const itemCost =
              (Number(input.coefficient) || 0) * (Number(input.unitCost) || 0) * serviceQty

            switch (input.category) {
              case 'mao_de_obra':
                laborDirectCost += itemCost
                hasMaoDeObraInput = true
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
          })
          // Se não havia insumo categorizado como mão de obra, mas há unitPrice manual e encargos vigentes,
          // aloca a fração proporcional em mão de obra para que encargos sociais não fiquem zerados
          const serviceTotalCost = Number(service.unitPrice) * serviceQty
          if (!hasMaoDeObraInput && chargesRate > 0) {
            // Em serviços sem insumo específico de MO, aloca 40% como mão de obra estimada (padrão de engenharia)
            // mantendo 60% em terceiros/materiais
            const estimatedLabor = serviceTotalCost * 0.4
            laborDirectCost += estimatedLabor
            subcontractDirectCost += serviceTotalCost * 0.6
          }
          // O custo direto total deste serviço com preço manual é unitPrice * qty
          totalDirectCostNoCharges += serviceTotalCost
        } else {
          // Sem insumos: preço unitário direto do serviço
          const itemCost = Number(service.unitPrice) * serviceQty
          // Quando não há detalhamento de insumos, aplica a taxa de encargos configurada sobre
          // a parcela de mão de obra direta estimada (40% padrão da engenharia de custos para serviços de obra),
          // para que o bloco "Encargos Sociais" não fique R$ 0,00 quando há taxa vigente
          if (chargesRate > 0) {
            const estimatedLabor = itemCost * 0.4
            laborDirectCost += estimatedLabor
            subcontractDirectCost += itemCost * 0.6
          } else {
            subcontractDirectCost += itemCost
          }
          totalDirectCostNoCharges += itemCost
        }
      } else if (hasInputs) {
        // Serviço normal calculado a partir dos insumos da CPU
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
      const laborMult = 1 + chargesRate / 100
      const sUnitCost = getServiceEffectiveUnitCost(service, laborMult)

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
    taxRegime,
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
