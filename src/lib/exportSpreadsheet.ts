/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Motor de Exportação em Planilhas Excel (.xlsx) e CSV estruturado
 * Abas:
 * 1. Resumo Executivo e BDI
 * 2. Planilha Orçamentária (Etapas e Serviços com BDI)
 * 3. Banco de Insumos e Curva ABC (Classificação Pareto A/B/C)
 * 4. Banco de Composições Unitárias
 */

import { FullBudget } from '@/types/budgetEngine'
import { calculateFullBudget, getServiceEffectiveUnitCost } from './budgetEngine'
import { computeAbcCurve } from './abcAnalysis'
import {
  formatCurrencyBRL,
  formatBudgetDeadline,
  sanitizeDocumentText,
  getTechnicalResponsibilityText,
  getTechnicalObligationsText,
} from './formatters'
import { logAuditEvent } from './intelligenceStorage'
import { CONCE_COMPANY } from './conceCompany'

/**
 * Escapa valores para CSV conforme padrão RFC 4180 (com ponto e vírgula para Excel em pt-BR)
 */
function escapeCsvValue(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

/**
 * Converte matriz de strings em string CSV com BOM UTF-8 (compatível com Excel Windows/Mac)
 */
function matrixToCsv(rows: (string | number)[][]): string {
  const content = rows.map((row) => row.map(escapeCsvValue).join(';')).join('\r\n')
  return '\uFEFF' + content // UTF-8 BOM
}

/**
 * Dispara download no navegador
 */
function downloadBlob(content: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Exporta pacote CSV completo ou individual
 */
export function exportBudgetSpreadsheet(
  budget: FullBudget,
  type: 'resumo' | 'completo' | 'abc' | 'composicoes' = 'completo',
): void {
  const summary = calculateFullBudget(budget)
  const abc = computeAbcCurve(budget)
  const laborMultiplier = 1 + (summary.socialChargesRate || 0) / 100

  const dateStr = new Date().toISOString().split('T')[0]
  const cleanCode = sanitizeDocumentText(budget.code)
  const cleanWorkName =
    sanitizeDocumentText(budget.work.name) || 'Empreendimento de Engenharia Civil'
  const cleanAuthor =
    sanitizeDocumentText(budget.author) || 'Eng. Edenir Souza da Rosa - CREA/RS-252397'
  const cleanClient = sanitizeDocumentText(budget.client.name) || 'Cliente Contratante'
  const baseFilename = `CONCE_${cleanCode}_${cleanWorkName.replace(/[^a-zA-Z0-9]/g, '_')}`

  // 1. Planilha Orçamentária e Resumo
  const budgetRows: (string | number)[][] = [
    ['CONCE — SERVIÇO DE ENGENHARIA E CONSULTORIA LTDA'],
    [
      'CNPJ:',
      CONCE_COMPANY.cnpjFormatado,
      'Responsável Técnico:',
      CONCE_COMPANY.responsavelTecnicoCompleto,
    ],
    ['Slogan:', CONCE_COMPANY.slogan],
    ['Código do Orçamento:', cleanCode, 'Status:', budget.status.toUpperCase()],
    ['Obra:', cleanWorkName, 'Local:', `${budget.work.city}/${budget.work.state}`],
    ['Cliente:', cleanClient, 'CNPJ/CPF:', budget.client.document || 'Não informado'],
    ['Responsável Técnico:', cleanAuthor, 'Data:', dateStr],
    [
      'Prazo Contratual:',
      formatBudgetDeadline(budget.work),
      'Data de Início:',
      budget.work.startDate || 'A definir',
    ],
    ...(budget.executionDeadline || budget.work?.executionDeadline
      ? [
          [
            'Prazo de Execução (Descritivo):',
            budget.executionDeadline || budget.work?.executionDeadline || '',
          ],
        ]
      : []),
    [
      'Validade da Proposta:',
      `${budget.validityDays || 30} ${budget.validityDaysType === 'uteis' ? 'dias úteis' : 'dias corridos'}`,
      'Condições de Pagamento:',
      budget.paymentTerms || 'Conforme proposta comercial',
    ],
    ['Garantia e Responsabilidade:', getTechnicalResponsibilityText(budget)],
    [
      'Garantia e Obrigações Técnicas:',
      getTechnicalObligationsText(budget, cleanAuthor).replace(/\n/g, ' | '),
    ],
    [
      'Regime Tributário:',
      budget.chargesConfig?.taxRegime === 'simples_nacional'
        ? `Simples Nacional (DAS Manual: ${(budget.chargesConfig?.simplesDasRate ?? 0).toFixed(2)}%)`
        : budget.chargesConfig?.taxRegime === 'com_desoneracao' || budget.chargesConfig.isRelieved
          ? 'Com Desoneração (CPRB Lei 12.546)'
          : 'Sem Desoneração (CLT)',
      'UF de Encargos:',
      budget.chargesConfig.uf,
    ],
    [
      'Encargos Sociais:',
      `${summary.socialChargesRate.toFixed(2)}% (${
        budget.chargesConfig?.taxRegime === 'simples_nacional'
          ? 'Simples Nacional — Sem encargos trabalhistas'
          : budget.chargesConfig.isRelieved
            ? 'Desonerado'
            : 'Sem Desoneração'
      })`,
      'BDI TCU (Acórdão 2.622/2013):',
      `${summary.bdiRate.toFixed(2)}%`,
    ],
    ['Preço Total Fechado:', summary.finalSalePrice, 'Data de Emissão:', dateStr],
    [],
    ['PLANILHA ORÇAMENTÁRIA DETALHADA (4 NÍVEIS)'],
    [
      'Item',
      'Código Composição',
      'Descrição dos Serviços e Etapas',
      'Unidade',
      'Quantidade',
      'Custo Unitário Direto (R$)',
      'Total Direto (R$)',
      'BDI (%)',
      'Preço Unitário c/ BDI (R$)',
      'Preço Total c/ BDI (R$)',
      'Peso (%)',
    ],
  ]

  budget.stages.forEach((stage) => {
    const stageSummary = summary.stagesSubtotals.find((s) => s.stageId === stage.id)
    const stageInfoDetails = [
      stage.volumeM3 !== undefined && stage.volumeM3 !== null ? `Vol: ${stage.volumeM3} m³` : null,
      stage.weightKg !== undefined && stage.weightKg !== null ? `Peso: ${stage.weightKg} kg` : null,
    ]
      .filter(Boolean)
      .join(' | ')

    const stageDisplayName = stageInfoDetails
      ? `${stage.name.toUpperCase()} [${stageInfoDetails}]`
      : stage.name.toUpperCase()

    budgetRows.push([
      stage.code,
      '---',
      stageDisplayName,
      '---',
      '---',
      '---',
      stageSummary ? stageSummary.directCost : 0,
      `${summary.bdiRate.toFixed(2)}%`,
      '---',
      stageSummary ? stageSummary.withBdi : 0,
      stageSummary ? `${stageSummary.percentageOfTotal}%` : '0%',
    ])

    stage.services.forEach((service) => {
      const sQty = Number(service.quantity) || 0
      const compUnit = getServiceEffectiveUnitCost(service, laborMultiplier)
      const sDirect = compUnit * sQty
      const serviceBdi = service.customBdiPercent ?? summary.bdiRate
      const sUnitWithBdi = compUnit * (1 + serviceBdi / 100)
      const sTotalWithBdi = sDirect * (1 + serviceBdi / 100)
      const serviceWeight =
        summary.finalSalePrice > 0 ? (sTotalWithBdi / summary.finalSalePrice) * 100 : 0

      budgetRows.push([
        service.code,
        service.composition?.code || '---',
        service.description,
        service.unit,
        sQty,
        Number(compUnit.toFixed(2)),
        Number(sDirect.toFixed(2)),
        `${serviceBdi.toFixed(2)}%`,
        Number(sUnitWithBdi.toFixed(2)),
        Number(sTotalWithBdi.toFixed(2)),
        `${serviceWeight.toFixed(2)}%`,
      ])
    })
  })

  budgetRows.push([])
  budgetRows.push(['TOTAIS GERAIS DO ORÇAMENTO'])
  budgetRows.push(['Custo Direto de Insumos (sem encargos):', summary.directCostInputs])
  budgetRows.push(['Mão de Obra Direta:', summary.laborDirectCost])
  budgetRows.push(['Encargos Sociais Aplicados:', summary.socialChargesAmount])
  budgetRows.push(['Custo Direto Total da Obra:', summary.totalDirectCost])
  budgetRows.push(['Margem de BDI Total:', summary.bdiAmount])
  budgetRows.push(['Tributos e Impostos Calculados:', summary.totalTaxesAmount])
  budgetRows.push(['PREÇO FINAL DE VENDA DA OBRA:', summary.finalSalePrice])

  // 2. Curva ABC (Pareto)
  const abcRows: (string | number)[][] = [
    ['CONCE — CURVA ABC DE INSUMOS (ANÁLISE DE PARETO)'],
    ['Obra:', cleanWorkName, 'Orçamento:', cleanCode],
    ['Total de Itens Analisados:', abc.totalItemsCount],
    ['Base de Valor Padrão CONCE:', 'Valor de Venda com BDI'],
    ['Custo Direto Total:', abc.totalDirectCost],
    ['Valor de Venda Total com BDI:', abc.totalSalePrice],
    [
      'Classe A (~80% do Valor):',
      `${abc.classA.itemsCount} itens (${abc.classA.percentageOfItems}%) somam ${abc.classA.percentageOfCost}% do valor total analisado`,
    ],
    [
      'Classe B (~15% do Valor):',
      `${abc.classB.itemsCount} itens (${abc.classB.percentageOfItems}%) somam ${abc.classB.percentageOfCost}% do valor total analisado`,
    ],
    [
      'Classe C (~5% do Valor):',
      `${abc.classC.itemsCount} itens (${abc.classC.percentageOfItems}%) somam ${abc.classC.percentageOfCost}% do valor total analisado`,
    ],
    [],
    [
      'Ranking',
      'Classe ABC',
      'Código',
      'Descrição',
      'Categoria',
      'Unidade',
      'Quantidade Total',
      'Custo Direto Unitário (R$)',
      'Custo Direto Total (R$)',
      'Preço Venda Unitário com BDI (R$)',
      'Preço Venda Total com BDI (R$)',
      'Participação no Total (%)',
      'Percentual Acumulado (%)',
      'Nº de Aplicações',
    ],
  ]

  abc.allItems.forEach((it) => {
    abcRows.push([
      it.rank,
      it.classification,
      it.code,
      it.description,
      it.category.toUpperCase(),
      it.unit,
      it.totalQuantity,
      it.unitCost,
      it.totalCost,
      it.unitSalePrice,
      it.totalSalePrice,
      `${it.percentageOfTotal.toFixed(2)}%`,
      `${it.accumulatedPercentage.toFixed(2)}%`,
      it.servicesCount,
    ])
  })

  // 3. Memória de BDI TCU Acórdão 2.622/2013
  const bdiRows: (string | number)[][] = [
    ['CONCE — MEMÓRIA DE CÁLCULO DE BDI (TCU ACÓRDÃO 2.622/2013)'],
    ['Obra:', cleanWorkName, 'Orçamento:', cleanCode],
    ['Fórmula:', 'BDI = [((1 + AC + R + S + G) * (1 + DF) * (1 + L)) / (1 - T) - 1] * 100'],
    [],
    [
      'Item / Parâmetro',
      'Sigla',
      'Taxa Aplicada (%)',
      'Faixa Recomendada TCU (Acórdão 2.622/2013)',
    ],
    [
      'Administração Central',
      'AC',
      `${budget.bdiConfig.administrationCentral.toFixed(2)}%`,
      '3,00% a 5,50%',
    ],
    ['Taxa de Risco', 'R', `${budget.bdiConfig.risk.toFixed(2)}%`, '0,97% a 1,27%'],
    [
      'Seguro e Garantia',
      'S + G',
      `${budget.bdiConfig.insuranceAndGuarantee.toFixed(2)}%`,
      '0,80% a 1,00%',
    ],
    [
      'Despesas Financeiras',
      'DF',
      `${budget.bdiConfig.financialExpenses.toFixed(2)}%`,
      '0,59% a 1,39%',
    ],
    ['Lucro Bruto Operacional', 'L', `${budget.bdiConfig.profit.toFixed(2)}%`, '6,16% a 8,96%'],
    ...(budget.chargesConfig?.taxRegime === 'simples_nacional'
      ? [
          [
            'Tributos: Simples Nacional (DAS)',
            'DAS',
            `${(budget.chargesConfig?.simplesDasRate ?? budget.bdiConfig.taxes?.simplesDas ?? 0).toFixed(2)}%`,
            'Alíquota efetiva informada pela empresa CONCE',
          ],
        ]
      : [
          ['Tributos: ISS', 'ISS', `${budget.bdiConfig.taxes.iss.toFixed(2)}%`, '2,00% a 5,00%'],
          ['Tributos: PIS', 'PIS', `${budget.bdiConfig.taxes.pis.toFixed(2)}%`, '0,65%'],
          ['Tributos: COFINS', 'COFINS', `${budget.bdiConfig.taxes.cofins.toFixed(2)}%`, '3,00%'],
          [
            'Tributos: CPRB (se desonerado)',
            'CPRB',
            `${budget.bdiConfig.taxes.inssOrCprb.toFixed(2)}%`,
            '0,00% a 4,50%',
          ],
        ]),
    ['Total de Tributos', 'T', `${summary.totalTaxesRate.toFixed(2)}%`, '---'],
    [
      'RESULTADO FINAL DO BDI CALCULADO:',
      'BDI',
      `${summary.bdiRate.toFixed(2)}%`,
      'Faixa típica 20,34% a 25,00%',
    ],
  ]

  let selectedRows = budgetRows
  let fileSuffix = 'Planilha_Orcamentaria'

  if (type === 'abc') {
    selectedRows = abcRows
    fileSuffix = 'Curva_ABC_Pareto'
  } else if (type === 'resumo') {
    selectedRows = [...budgetRows.slice(0, 8), [], ...bdiRows]
    fileSuffix = 'Resumo_Executivo_BDI'
  } else {
    // Pacote Completo Integrado
    selectedRows = [
      ...budgetRows,
      [],
      ['========================================================================'],
      [],
      ...abcRows,
      [],
      ['========================================================================'],
      [],
      ...bdiRows,
    ]
    fileSuffix = 'Planilha_Completa_CONCE'
  }

  const csvContent = matrixToCsv(selectedRows)
  downloadBlob(csvContent, `${baseFilename}_${fileSuffix}.csv`, 'text/csv;charset=utf-8;')

  // Registra trilha de auditoria
  logAuditEvent({
    budgetId: budget.id,
    action: 'exportacao_excel',
    title: 'Exportação de Planilha Excel/CSV',
    details: `Arquivo gerado: ${baseFilename}_${fileSuffix}.csv com abas de orçamento, curva ABC e memória de BDI.`,
    userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
  })
}
