/**
 * CONCE — Testes Unitários de Verificação do Motor da Curva ABC
 *
 * Cobertura obrigatória das regras do usuário:
 * 1. Soma coef × qtde por ocorrência somando em linha única do ranking
 * 2. Consolidação de insumos homônimos (com e sem código)
 * 3. Item direto sem composição não é descartado
 * 4. Encargos de mão de obra aplicados corretamente
 * 5. Fechamento 100% do total da curva com o orçamento
 * 6. Fronteiras de corte Pareto 80% / 95%
 */

import { FullBudget } from '@/types/budgetEngine'
import { computeAbcCurve, normalizeDescription, isGenericOrEmptyCode } from './abcAnalysis'
import { calculateFullBudget } from './budgetEngine'
import { normalizeInputDescription } from './budgetsStorage'

export function runAbcTests(): { passed: boolean; details: string[] } {
  const details: string[] = []
  let allOk = true

  function assert(cond: boolean, desc: string) {
    if (cond) {
      details.push(`PASS: ${desc}`)
    } else {
      details.push(`FAIL: ${desc}`)
      allOk = false
    }
  }

  // TESTE 1: Normalização de descrição e detecção de código genérico
  assert(
    normalizeDescription(' Cimento  CP-II  32   ') === 'CIMENTO CP-II 32',
    'Normalização faz trim, uppercase e colapsa espaços',
  )
  assert(
    normalizeDescription('Aço CA-50 em barras de 12mm - armação') ===
      'ACO CA-50 EM BARRAS DE 12MM - ARMACAO',
    'Normalização remove acentos e diacríticos',
  )
  assert(isGenericOrEmptyCode('S/COD') === true, 'S/COD é genérico')
  assert(isGenericOrEmptyCode('SEM CÓDIGO') === true, 'SEM CÓDIGO é genérico')
  assert(isGenericOrEmptyCode('N/A') === true, 'N/A é genérico')
  assert(isGenericOrEmptyCode('') === true, 'Vazio é genérico')
  assert(isGenericOrEmptyCode('SINAPI-88316') === false, 'SINAPI-88316 é código oficial válido')

  // TESTE 1.1: Testes de normalização de nomenclatura solicitada pelo usuário (normalizeInputDescription)
  assert(
    normalizeInputDescription('Encarregado de obra') === 'Encarregado da obra',
    'normalizeInputDescription: "Encarregado de obra" -> "Encarregado da obra"',
  )
  assert(
    normalizeInputDescription('encarregado obra') === 'encarregado da obra',
    'normalizeInputDescription: "encarregado obra" -> "encarregado da obra"',
  )
  assert(
    normalizeInputDescription('ENCARREGADO DE OBRA') === 'ENCARREGADO DA OBRA',
    'normalizeInputDescription: "ENCARREGADO DE OBRA" -> "ENCARREGADO DA OBRA"',
  )
  assert(
    normalizeInputDescription('Caçamba de entulho') === 'Caçamba de entulhos',
    'normalizeInputDescription: "Caçamba de entulho" -> "Caçamba de entulhos"',
  )
  assert(
    normalizeInputDescription('caçamba de entulho') === 'caçamba de entulhos',
    'normalizeInputDescription: "caçamba de entulho" -> "caçamba de entulhos"',
  )
  assert(
    normalizeInputDescription('cacamba de entulho') === 'caçamba de entulhos',
    'normalizeInputDescription: "cacamba de entulho" (sem acento) -> "caçamba de entulhos"',
  )
  assert(
    normalizeInputDescription('sacos de ráfia') === 'saco de ráfia',
    'normalizeInputDescription: "sacos de ráfia" -> "saco de ráfia"',
  )
  assert(
    normalizeInputDescription('SACOS DE RAFIA') === 'SACO DE RÁFIA',
    'normalizeInputDescription: "SACOS DE RAFIA" -> "SACO DE RÁFIA"',
  )
  assert(
    normalizeInputDescription('Sacos de rafia') === 'Saco de ráfia',
    'normalizeInputDescription: "Sacos de rafia" -> "Saco de ráfia"',
  )

  // TESTE 1.2: Testes de chave normalizada unificada da Curva ABC (normalizeDescription)
  assert(
    normalizeDescription('sacos de ráfia') === normalizeDescription('saco de ráfia'),
    'normalizeDescription: "sacos de ráfia" e "saco de ráfia" geram a mesma chave normalizada ("SACO DE RAFIA")',
  )
  assert(
    normalizeDescription('Encarregado de obra') === normalizeDescription('encarregado da obra'),
    'normalizeDescription: "Encarregado de obra" e "encarregado da obra" geram a mesma chave normalizada ("ENCARREGADO DA OBRA")',
  )
  assert(
    normalizeDescription('Caçamba de entulho') === normalizeDescription('caçamba de entulhos'),
    'normalizeDescription: "Caçamba de entulho" e "caçamba de entulhos" geram a mesma chave normalizada ("CACAMBA DE ENTULHOS")',
  )

  // MOCK DE ORÇAMENTO PARA TESTES 2, 3, 4, 5, 6
  const mockBudget: FullBudget = {
    id: 'orc-test-abc',
    code: 'ORC-TEST-001',
    title: 'Obra de Teste ABC',
    status: 'em_andamento',
    client: {
      name: 'Cliente Teste',
      document: '00.000.000/0001-00',
      email: 'teste@exemplo.com',
      phone: '(11) 99999-9999',
      address: 'Rua das Obras, 100',
      city: 'São Paulo',
      state: 'SP',
    },
    work: {
      name: 'Edifício Residencial Teste',
      address: 'Av Central, 500',
      city: 'São Paulo',
      state: 'SP',
      description: 'Construção residencial',
      deadlineMonths: 6,
      startDate: '2025-05-01',
    },
    publicWork: {
      enabled: false,
      tenderNumber: '',
      contractNumber: '',
      agency: '',
      modality: 'Dispensa/Inexigibilidade',
      sinapiReferenceMonth: '04/2025',
      hasDisallowanceClause: false,
    },
    chargesConfig: {
      uf: 'SP',
      isRelieved: true,
      taxRegime: 'com_desoneracao',
      simplesDasRate: 0,
      customGroupA: 40,
      customGroupB: 20,
      customGroupC: 5,
      customGroupD: 5, // total 70%
    },
    bdiConfig: {
      administrationCentral: 4.0,
      risk: 1.27,
      insuranceAndGuarantee: 0.8,
      financialExpenses: 1.23,
      profit: 7.4,
      taxes: {
        iss: 3.0,
        pis: 0.65,
        cofins: 3.0,
        inssOrCprb: 4.5,
        totalTaxes: 11.15,
      },
      calculatedBdi: 29.8,
    },
    createdAt: '2025-04-01T10:00:00.000Z',
    updatedAt: '2025-04-01T10:00:00.000Z',
    author: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
    stages: [
      {
        id: 'stg-1',
        order: 1,
        code: '01',
        name: '01. INFRAESTRUTURA',
        services: [
          {
            id: 'srv-1',
            order: 1,
            code: '01.01',
            description: 'Concretagem de blocos e sapatas',
            unit: 'm³',
            quantity: 50, // 50 m³
            composition: {
              id: 'comp-1',
              code: 'COMP-01',
              description: 'Concreto fck 30 MPa usinado',
              specialty: 'Estruturas',
              unit: 'm³',
              source: 'CONCE',
              version: 'v1.0',
              inputs: [
                {
                  id: 'inp-1',
                  code: 'SINAPI-94964',
                  description: 'Concreto usinado bombeável fck 30 MPa',
                  unit: 'm³',
                  category: 'material',
                  coefficient: 1.05, // 1.05 * 50 = 52.5 m³
                  unitCost: 400.0,
                },
                {
                  id: 'inp-2',
                  code: 'SINAPI-88316',
                  description: 'Pedreiro de obras',
                  unit: 'h',
                  category: 'mao_de_obra',
                  coefficient: 2.0, // 2.0 * 50 = 100 h
                  unitCost: 25.0,
                },
              ],
            },
          },
          {
            id: 'srv-2',
            order: 2,
            code: '01.02',
            description: 'Armação de pilares e vigas com aço CA-50',
            unit: 'kg',
            quantity: 2000, // 2000 kg
            composition: {
              id: 'comp-2',
              code: 'COMP-02',
              description: 'Armação estrutural',
              specialty: 'Estruturas',
              unit: 'kg',
              source: 'CONCE',
              version: 'v1.0',
              inputs: [
                {
                  id: 'inp-3',
                  code: 'SINAPI-92778',
                  description: 'Aço CA-50 em barras de 10mm',
                  unit: 'kg',
                  category: 'material',
                  coefficient: 1.1, // 1.1 * 2000 = 2200 kg
                  unitCost: 9.5,
                },
                {
                  id: 'inp-4',
                  code: 'S/COD',
                  description: 'Pedreiro de obras', // Homônimo de inp-2!
                  unit: 'h',
                  category: 'mao_de_obra',
                  coefficient: 0.05, // 0.05 * 2000 = 100 h
                  unitCost: 25.0,
                },
              ],
            },
          },
        ],
      },
      {
        id: 'stg-2',
        order: 2,
        code: '02',
        name: '02. SERVIÇOS DIRETOS E LOCAÇÃO',
        services: [
          {
            id: 'srv-3',
            order: 1,
            code: '02.01',
            description: 'Locação de andaimes fachadeiros metálicos',
            unit: 'mês',
            quantity: 4,
            unitPrice: 1500.0, // R$ 1.500,00 * 4 = R$ 6.000,00 direto
            unitPriceSource: 'Usuário',
            composition: {
              id: 'comp-dir-1',
              code: 'DIRETO-01',
              description: 'Locação de andaimes',
              specialty: 'Serviços Preliminares',
              unit: 'mês',
              source: 'PROPRIO',
              version: 'v1.0',
              inputs: [], // SEM INSUMOS NA CPU
            },
          },
        ],
      },
    ],
  }

  // EXECUTA CÁLCULOS
  const summary = calculateFullBudget(mockBudget)
  const abcInputsBdi = computeAbcCurve(mockBudget, { mode: 'insumos', valueBasis: 'venda_bdi' })
  const abcInputsDirect = computeAbcCurve(mockBudget, {
    mode: 'insumos',
    valueBasis: 'custo_direto',
  })
  const abcServicesBdi = computeAbcCurve(mockBudget, { mode: 'servicos', valueBasis: 'venda_bdi' })

  // TESTE 2: Quantidade = Σ (coef × qtde) e Consolidação de Homônimos
  // "Pedreiro de obras" aparece no srv-1 (2.0 * 50 = 100h) e no srv-2 (0.05 * 2000 = 100h)
  // Deve somar exatamente 200 h em UMA ÚNICA linha
  const pedreiroLines = abcInputsBdi.allItems.filter((it) =>
    normalizeDescription(it.description).includes('PEDREIRO DE OBRAS'),
  )
  assert(
    pedreiroLines.length === 1,
    'Insumo homônimo "Pedreiro de obras" fundido em exatamente 1 linha',
  )
  if (pedreiroLines.length === 1) {
    const p = pedreiroLines[0]
    assert(
      Math.abs(p.totalQuantity - 200) < 0.001,
      `Quantidade de pedreiro somou 200h (obtido: ${p.totalQuantity})`,
    )
    assert(p.code === 'SINAPI-88316', 'Código oficial SINAPI-88316 foi preservado sobre S/COD')
    assert(p.servicesCount === 2, 'Registra 2 ocorrências em serviços para auditoria')
  }

  // TESTE 3: Encargos sobre mão de obra
  // mockBudget tem chargesRate = 70%, laborMultiplier = 1.70
  // Custo nominal de pedreiro = 25.0 -> Custo real com encargos = 25.0 * 1.70 = 42.50
  // Total direto pedreiro (200h) = 200 * 42.50 = 8500.00
  if (pedreiroLines.length === 1) {
    const p = pedreiroLines[0]
    assert(
      Math.abs(p.unitCost - 42.5) < 0.01,
      `Custo unitário de mão de obra inclui encargos 70% (esperado: 42.50, obtido: ${p.unitCost})`,
    )
    assert(
      Math.abs(p.totalCost - 8500.0) < 0.1,
      `Custo total de mão de obra correto (esperado: 8500.00, obtido: ${p.totalCost})`,
    )
  }

  // TESTE 4: Item direto sem composição não é descartado
  const diretoLines = abcInputsBdi.allItems.filter((it) =>
    normalizeDescription(it.description).includes('LOCACAO DE ANDAIMES'),
  )
  assert(
    diretoLines.length === 1,
    'Serviço direto sem composição está presente na curva ABC de insumos',
  )
  if (diretoLines.length === 1) {
    assert(
      Math.abs(diretoLines[0].totalCost - 6000.0) < 0.1,
      `Valor direto do serviço sem composição correto (6000.00, obtido: ${diretoLines[0].totalCost})`,
    )
  }

  // TESTE 5: Fechamento 100% da Curva ABC com o Orçamento
  // Total Venda da Curva = FinalSalePrice do orçamento (diferença <= 0.05 devido a centavos)
  const diffSale = Math.abs(abcInputsBdi.totalSalePrice - summary.finalSalePrice)
  assert(
    diffSale <= 0.05,
    `Fechamento 100% Venda com BDI: Curva ${abcInputsBdi.totalSalePrice} vs Orçamento ${summary.finalSalePrice} (diff: ${diffSale.toFixed(2)})`,
  )

  const diffDirect = Math.abs(abcInputsDirect.totalDirectCost - summary.totalDirectCost)
  assert(
    diffDirect <= 0.05,
    `Fechamento 100% Custo Direto: Curva ${abcInputsDirect.totalDirectCost} vs Orçamento ${summary.totalDirectCost} (diff: ${diffDirect.toFixed(2)})`,
  )

  const diffServices = Math.abs(abcServicesBdi.totalSalePrice - summary.finalSalePrice)
  assert(
    diffServices <= 0.05,
    `Fechamento 100% Curva ABC de Serviços Venda c/ BDI (diff: ${diffServices.toFixed(2)})`,
  )

  // TESTE 6: Classes Pareto A, B, C e fronteiras
  const sumEvaluated =
    abcInputsBdi.classA.evaluatedValue +
    abcInputsBdi.classB.evaluatedValue +
    abcInputsBdi.classC.evaluatedValue
  assert(
    Math.abs(sumEvaluated - abcInputsBdi.totalAnalyzedValue) < 0.05,
    'Soma dos valores avaliados das classes A, B e C fecha 100% com o total analisado',
  )

  // O item de maior valor do mock é o Aço CA-50 ou Concreto usinado
  assert(abcInputsBdi.classA.itemsCount >= 1, 'Classe A contém ao menos 1 item prioritário')

  // TESTE 7: Fusão na Curva ABC com "sacos de ráfia" vs "saco de ráfia" e "encarregado de obra" vs "encarregado da obra"
  const mockBudgetFusion: FullBudget = {
    ...mockBudget,
    id: 'orc-test-fusion',
    stages: [
      {
        id: 'stg-fusion',
        order: 1,
        code: '01',
        name: 'Limpeza e Gestão',
        services: [
          {
            id: 'srv-f1',
            order: 1,
            code: '01.01',
            description: 'Serviço de Limpeza A',
            unit: 'un',
            quantity: 10,
            composition: {
              id: 'comp-f1',
              code: 'COMP-F1',
              description: 'Composição Limpeza 1',
              specialty: 'Serviços Preliminares',
              unit: 'un',
              version: 'v1.0',
              source: 'CONCE',
              inputs: [
                {
                  id: 'inp-f1',
                  code: 'S/COD',
                  description: 'Sacos de ráfia para entulho',
                  unit: 'un',
                  category: 'material',
                  coefficient: 5, // 5 * 10 = 50 un
                  unitCost: 3.5,
                },
                {
                  id: 'inp-f2',
                  code: 'S/COD',
                  description: 'Encarregado de obra',
                  unit: 'h',
                  category: 'mao_de_obra',
                  coefficient: 1, // 1 * 10 = 10 h
                  unitCost: 35.0,
                },
              ],
            },
          },
          {
            id: 'srv-f2',
            order: 2,
            code: '01.02',
            description: 'Serviço de Limpeza B',
            unit: 'un',
            quantity: 20,
            composition: {
              id: 'comp-f2',
              code: 'COMP-F2',
              description: 'Composição Limpeza 2',
              specialty: 'Serviços Preliminares',
              unit: 'un',
              version: 'v1.0',
              source: 'CONCE',
              inputs: [
                {
                  id: 'inp-f3',
                  code: 'S/COD',
                  description: 'Saco de ráfia para entulho', // Expressão singular!
                  unit: 'un',
                  category: 'material',
                  coefficient: 2, // 2 * 20 = 40 un
                  unitCost: 3.5,
                },
                {
                  id: 'inp-f4',
                  code: 'S/COD',
                  description: 'Encarregado da obra', // Expressão "da obra"!
                  unit: 'h',
                  category: 'mao_de_obra',
                  coefficient: 0.5, // 0.5 * 20 = 10 h
                  unitCost: 35.0,
                },
              ],
            },
          },
        ],
      },
    ],
  }

  const abcFusion = computeAbcCurve(mockBudgetFusion, { mode: 'insumos', valueBasis: 'venda_bdi' })
  const rafiaItems = abcFusion.allItems.filter((it) =>
    normalizeDescription(it.description).includes('SACO DE RAFIA'),
  )
  assert(
    rafiaItems.length === 1,
    'Curva ABC: "Sacos de ráfia" e "Saco de ráfia" fundidos em linha única',
  )
  if (rafiaItems.length === 1) {
    assert(
      Math.abs(rafiaItems[0].totalQuantity - 90) < 0.001,
      `Curva ABC: soma total da quantidade de saco de ráfia = 90 (obtido: ${rafiaItems[0].totalQuantity})`,
    )
  }

  const encarregadoItems = abcFusion.allItems.filter((it) =>
    normalizeDescription(it.description).includes('ENCARREGADO DA OBRA'),
  )
  assert(
    encarregadoItems.length === 1,
    'Curva ABC: "Encarregado de obra" e "Encarregado da obra" fundidos em linha única',
  )
  if (encarregadoItems.length === 1) {
    assert(
      Math.abs(encarregadoItems[0].totalQuantity - 20) < 0.001,
      `Curva ABC: soma total da quantidade de encarregado da obra = 20h (obtido: ${encarregadoItems[0].totalQuantity})`,
    )
  }

  return { passed: allOk, details }
}
