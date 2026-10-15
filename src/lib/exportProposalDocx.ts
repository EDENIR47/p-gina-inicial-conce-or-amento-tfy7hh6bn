/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Motor de exportação da Proposta Técnica e Comercial para Microsoft Word (.docx)
 *
 * Gera arquivo binário .docx nativo compatível com Microsoft Word e Google Docs,
 * contendo:
 *  - Página 1: Capa exclusiva com marca CONCE grande (Mirage/Pumpkin) + ENGENHARIA LTDA (Cobalt)
 *  - Quebra de página
 *  - Página 2 em diante:
 *      * Metadados (Proposta Comercial, Nº do orçamento, Porto Alegre/RS e data)
 *      * Título principal: PROPOSTA TÉCNICA E COMERCIAL + subtítulo
 *      * Tabela de identificação (Orçamento, Contratante, Obra, Valor da Proposta, Responsável Técnico)
 *      * Nota de validade e condições
 *      * Sumário das 8 seções numeradas
 *      * As 8 seções numeradas geradas puramente por proposalEngine.ts
 *      * Encerramento formal
 *      * Bloco de assinaturas (RT Eng. Edenir Souza da Rosa, CREA/RS-252397 e Aceite do Contratante com data do aceite)
 *      * Rodapé institucional fixado: CONCE ENGENHARIA E CONSULTORIA / CNPJ 57.149.101/0001-46 / CONCE é Conceito. CONCE é Concreto.
 *
 * Utiliza a biblioteca oficial "docx" para compilar arquivo OpenXML estrito (sem alertas de formato).
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { FullBudget } from '@/types/budgetEngine'
import { calculateFullBudget } from '@/lib/budgetEngine'
import { CONCE_COMPANY } from '@/lib/conceCompany'
import {
  formatCurrencyBRL,
  formatBudgetDeadline,
  formatCurrentDatePTBR,
  sanitizeDocumentText,
} from '@/lib/formatters'
import {
  PROPOSAL_DOCUMENT_TITLE,
  analyzeBudgetForProposal,
  buildProposalSections,
} from '@/lib/proposalEngine'
import { logAuditEvent } from '@/lib/intelligenceStorage'

// Cores corporativas da CONCE
const COLOR_MIRAGE = '171A1F'
const COLOR_COBALT = '294C87'
const COLOR_PUMPKIN = 'FF6B1F'
const COLOR_GRAY_BORDER = 'CCCCCC'
const COLOR_GRAY_BG = 'F4F6F9'
const COLOR_MUTED = '666666'
const COLOR_WHITE = 'FFFFFF'

// Dimensões A4 em DXA (1 pt = 20 dxa; 1 pol = 1440 dxa)
// Largura útil de página A4 (11906 total - 2 * 1134 margem = ~9638 dxa)
const TABLE_TOTAL_WIDTH_DXA = 9638
const IDENT_LABEL_WIDTH_DXA = 2600
const IDENT_VALUE_WIDTH_DXA = TABLE_TOTAL_WIDTH_DXA - IDENT_LABEL_WIDTH_DXA // 7038

/**
 * Cria a estrutura de dados Document do pacote `docx` para a Proposta Técnica e Comercial.
 * Função pura e desacoplada do DOM para testes e reutilização.
 */
export function buildProposalDocxDocument(budget: FullBudget): Document {
  const summary = calculateFullBudget(budget)
  const analysis = analyzeBudgetForProposal(budget)
  const sections = buildProposalSections(budget, summary, analysis)

  // Metadados sanitizados
  const cleanCode = sanitizeDocumentText(budget.code) || 'ORC-CONCE'
  const cleanTitle =
    sanitizeDocumentText(budget.title) ||
    sanitizeDocumentText(budget.work?.name) ||
    'Proposta Técnico-Comercial de Engenharia'
  const cleanWorkName = sanitizeDocumentText(budget.work?.name) || 'Empreendimento de Engenharia'
  const cleanWorkAddress = budget.work?.address
    ? `${sanitizeDocumentText(budget.work.address)}, ${budget.work.city || 'Porto Alegre'}/${budget.work.state || 'RS'}`
    : `${budget.work.city || 'Porto Alegre'}/${budget.work.state || 'RS'}`
  const cleanClientName = sanitizeDocumentText(budget.client?.name) || 'Cliente Contratante'
  const cleanClientDoc = sanitizeDocumentText(budget.client?.document)
  const cleanClientPhone = sanitizeDocumentText(budget.client?.phone)
  const cleanClientEmail = sanitizeDocumentText(budget.client?.email)
  const cleanValidityDays = budget.validityDays ?? 10
  const cleanValidityType = budget.validityDaysType || 'uteis'
  const cleanDeadline = formatBudgetDeadline(budget.work)
  const currentDateStr = formatCurrentDatePTBR()

  // Borda sutil para tabelas
  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: COLOR_GRAY_BORDER,
  }
  const tableBorders = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
    insideHorizontal: thinBorder,
    insideVertical: thinBorder,
  }

  // Elementos do corpo do documento
  const bodyChildren: (Paragraph | Table)[] = []

  // -------------------------------------------------------------
  // PÁGINA 1: CAPA EXCLUSIVA DA PROPOSTA
  // Contém SOMENTE CONCE grande + ENGENHARIA LTDA centralizado
  // -------------------------------------------------------------
  // Espaçamento vertical para centralizar na primeira folha
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 4000, after: 200 },
      alignment: AlignmentType.CENTER,
      children: [],
    }),
  )

  // CONCE (com inicial "C" em Pumpkin e "ONCE" em Mirage)
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      children: [
        new TextRun({
          text: 'C',
          bold: true,
          size: 96, // 48pt
          color: COLOR_PUMPKIN,
          font: 'Poppins',
        }),
        new TextRun({
          text: 'ONCE',
          bold: true,
          size: 96, // 48pt
          color: COLOR_MIRAGE,
          font: 'Poppins',
        }),
      ],
    }),
  )

  // ENGENHARIA LTDA em Cobalt
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 3000 },
      children: [
        new TextRun({
          text: 'ENGENHARIA LTDA',
          bold: true,
          size: 26, // 13pt
          color: COLOR_COBALT,
          font: 'Poppins',
          characterSpacing: 60, // tracking expandido
        }),
      ],
    }),
  )

  // QUEBRA DE PÁGINA OBRIGATÓRIA (inicia a Página 2)
  bodyChildren.push(
    new Paragraph({
      children: [new PageBreak()],
    }),
  )

  // -------------------------------------------------------------
  // PÁGINA 2: CABEÇALHO / METADADOS DO DOCUMENTO
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: 'PROPOSTA COMERCIAL  •  Nº ',
          size: 19, // ~9.5pt
          color: COLOR_MUTED,
          font: 'Arial',
        }),
        new TextRun({
          text: cleanCode,
          bold: true,
          size: 20, // 10pt
          color: COLOR_COBALT,
          font: 'Arial',
        }),
        new TextRun({
          text: `  •  Porto Alegre, ${currentDateStr}`,
          size: 19,
          color: COLOR_MUTED,
          font: 'Arial',
        }),
      ],
    }),
  )

  // Título principal do documento
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 80 },
      children: [
        new TextRun({
          text: PROPOSAL_DOCUMENT_TITLE,
          bold: true,
          size: 32, // 16pt
          color: COLOR_MIRAGE,
          font: 'Poppins',
        }),
      ],
    }),
  )

  // Subtítulo (título do orçamento)
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 300 },
      children: [
        new TextRun({
          text: cleanTitle.toUpperCase(),
          bold: true,
          size: 20, // 10pt
          color: COLOR_COBALT,
          font: 'Arial',
        }),
      ],
    }),
  )

  // -------------------------------------------------------------
  // TABELA DE IDENTIFICAÇÃO DO ORÇAMENTO / CLIENTE / OBRA
  // -------------------------------------------------------------
  const clientContactParts = [cleanClientPhone, cleanClientEmail].filter(Boolean)
  const clientDocAndContact = [
    cleanClientDoc ? `CPF/CNPJ ${cleanClientDoc}` : '',
    clientContactParts.join(' • '),
  ]
    .filter(Boolean)
    .join(' • ')

  const identRows: Array<{ label: string; textRuns: TextRun[] }> = [
    {
      label: 'Orçamento',
      textRuns: [
        new TextRun({ text: cleanCode, bold: true, color: COLOR_MIRAGE, font: 'Arial', size: 20 }),
        new TextRun({ text: ` — ${cleanTitle}`, color: COLOR_MIRAGE, font: 'Arial', size: 20 }),
      ],
    },
    {
      label: 'Contratante',
      textRuns: [
        new TextRun({
          text: cleanClientName,
          bold: true,
          color: COLOR_MIRAGE,
          font: 'Arial',
          size: 20,
        }),
        ...(clientDocAndContact
          ? [
              new TextRun({
                text: ` — ${clientDocAndContact}`,
                color: COLOR_MIRAGE,
                font: 'Arial',
                size: 20,
              }),
            ]
          : []),
      ],
    },
    {
      label: 'Obra',
      textRuns: [
        new TextRun({
          text: `${cleanWorkName} — ${cleanWorkAddress}`,
          color: COLOR_MIRAGE,
          font: 'Arial',
          size: 20,
        }),
      ],
    },
    {
      label: 'Valor da Proposta',
      textRuns: [
        new TextRun({
          text: formatCurrencyBRL(summary.finalSalePrice),
          bold: true,
          color: COLOR_PUMPKIN,
          font: 'Arial',
          size: 21,
        }),
        new TextRun({
          text: ` (${budget.stages.length} etapa(s) e ${summary.servicesCount} item(ns) de serviço)`,
          color: COLOR_MIRAGE,
          font: 'Arial',
          size: 20,
        }),
      ],
    },
    {
      label: 'Responsável Técnico',
      textRuns: [
        new TextRun({
          text: `${CONCE_COMPANY.responsavelTecnico} — ${CONCE_COMPANY.registroCrea}`,
          bold: true,
          color: COLOR_MIRAGE,
          font: 'Arial',
          size: 20,
        }),
        new TextRun({
          text: ` (${CONCE_COMPANY.razaoSocial})`,
          color: COLOR_MUTED,
          font: 'Arial',
          size: 19,
        }),
      ],
    },
  ]

  const identTableRows: TableRow[] = identRows.map(
    (row) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: IDENT_LABEL_WIDTH_DXA, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: COLOR_GRAY_BG },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            borders: tableBorders,
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: row.label.toUpperCase(),
                    bold: true,
                    size: 19,
                    color: COLOR_COBALT,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: IDENT_VALUE_WIDTH_DXA, type: WidthType.DXA },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            borders: tableBorders,
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: row.textRuns,
              }),
            ],
          }),
        ],
      }),
  )

  bodyChildren.push(
    new Table({
      width: { size: TABLE_TOTAL_WIDTH_DXA, type: WidthType.DXA },
      borders: tableBorders,
      rows: identTableRows,
    }),
  )

  // Nota de validade e condições
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 120, after: 260 },
      children: [
        new TextRun({
          text: 'Nota: ',
          bold: true,
          italics: true,
          color: COLOR_COBALT,
          size: 18,
          font: 'Arial',
        }),
        new TextRun({
          text: `Validade desta proposta: ${cleanValidityDays} dias ${cleanValidityType}. Prazo de execução previsto: ${cleanDeadline} (ver Seção 7). Condições de faturamento e garantias: ver Seção 8.`,
          italics: true,
          color: COLOR_MUTED,
          size: 18,
          font: 'Arial',
        }),
      ],
    }),
  )

  // -------------------------------------------------------------
  // SUMÁRIO DA PROPOSTA
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({
          text: 'SUMÁRIO DA PROPOSTA',
          bold: true,
          size: 21,
          color: COLOR_COBALT,
          font: 'Arial',
        }),
      ],
    }),
  )

  sections.forEach((sec) => {
    bodyChildren.push(
      new Paragraph({
        spacing: { before: 20, after: 20 },
        indent: { left: 240 },
        children: [
          new TextRun({
            text: `${sec.number}. `,
            bold: true,
            color: COLOR_PUMPKIN,
            size: 20,
            font: 'Arial',
          }),
          new TextRun({
            text: sec.title,
            bold: true,
            color: COLOR_MIRAGE,
            size: 20,
            font: 'Arial',
          }),
        ],
      }),
    )
  })

  // -------------------------------------------------------------
  // AS 8 SEÇÕES DA PROPOSTA
  // -------------------------------------------------------------
  sections.forEach((sec) => {
    // Título da Seção
    bodyChildren.push(
      new Paragraph({
        spacing: { before: 320, after: 120 },
        keepNext: true,
        children: [
          new TextRun({
            text: `${sec.number}. `,
            bold: true,
            size: 24, // 12pt
            color: COLOR_PUMPKIN,
            font: 'Arial',
          }),
          new TextRun({
            text: sec.title,
            bold: true,
            size: 24,
            color: COLOR_COBALT,
            font: 'Arial',
          }),
        ],
      }),
    )

    // Parágrafos
    sec.paragraphs.forEach((p) => {
      bodyChildren.push(
        new Paragraph({
          spacing: { before: 40, after: 100 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({
              text: p,
              size: 21, // ~10.5pt
              color: COLOR_MIRAGE,
              font: 'Arial',
            }),
          ],
        }),
      )
    })

    // Itens com marcadores
    if (sec.items && sec.items.length > 0) {
      sec.items.forEach((item) => {
        bodyChildren.push(
          new Paragraph({
            spacing: { before: 30, after: 60 },
            indent: { left: 360, hanging: 200 },
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: '–  ',
                bold: true,
                color: COLOR_PUMPKIN,
                size: 21,
                font: 'Arial',
              }),
              new TextRun({
                text: item,
                size: 21,
                color: COLOR_MIRAGE,
                font: 'Arial',
              }),
            ],
          }),
        )
      })
    }

    // Tabela opcional da seção
    if (sec.table) {
      const colCount = sec.table.headers.length || 1
      const colWidthDxa = Math.floor(TABLE_TOTAL_WIDTH_DXA / colCount)

      const headerRow = new TableRow({
        tableHeader: true,
        children: sec.table.headers.map(
          (h, hIdx) =>
            new TableCell({
              width: { size: colWidthDxa, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_COBALT },
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              borders: tableBorders,
              children: [
                new Paragraph({
                  alignment: hIdx === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: h.toUpperCase(),
                      bold: true,
                      size: 19,
                      color: COLOR_WHITE,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
        ),
      })

      const dataRows = sec.table.rows.map(
        (row, rIdx) =>
          new TableRow({
            children: row.map(
              (cell, cIdx) =>
                new TableCell({
                  width: { size: colWidthDxa, type: WidthType.DXA },
                  shading:
                    rIdx % 2 === 1 ? { type: ShadingType.CLEAR, fill: COLOR_GRAY_BG } : undefined,
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  borders: tableBorders,
                  children: [
                    new Paragraph({
                      alignment: cIdx === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: cell,
                          size: 19,
                          color: COLOR_MIRAGE,
                          font: 'Arial',
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
      )

      bodyChildren.push(
        new Table({
          width: { size: TABLE_TOTAL_WIDTH_DXA, type: WidthType.DXA },
          borders: tableBorders,
          rows: [headerRow, ...dataRows],
        }),
      )
    }

    // Notas de rodapé da seção
    if (sec.footnotes && sec.footnotes.length > 0) {
      sec.footnotes.forEach((fn) => {
        bodyChildren.push(
          new Paragraph({
            spacing: { before: 80, after: 60 },
            children: [
              new TextRun({
                text: 'Nota: ',
                bold: true,
                italics: true,
                color: COLOR_COBALT,
                size: 18,
                font: 'Arial',
              }),
              new TextRun({
                text: fn,
                italics: true,
                color: COLOR_MUTED,
                size: 18,
                font: 'Arial',
              }),
            ],
          }),
        )
      })
    }
  })

  // -------------------------------------------------------------
  // ENCERRAMENTO E FORMALIZAÇÃO
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 280, after: 120 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({
          text: 'Permanecemos à inteira disposição para esclarecimentos adicionais sobre este documento. A aceitação da presente proposta implica a concordância integral com as condições técnicas, comerciais e de garantia aqui estabelecidas, ficando a execução condicionada às autorizações prévias relacionadas na Seção 7, às condições comerciais da Seção 8 e à formalização contratual entre as partes.',
          size: 21,
          color: COLOR_MIRAGE,
          font: 'Arial',
        }),
      ],
    }),
  )

  // -------------------------------------------------------------
  // BLOCO DE ASSINATURAS (Engenheiro RT + Aceite do Contratante)
  // Data do aceite, sem campo de local (conforme diretriz do projeto)
  // -------------------------------------------------------------
  const sigColWidthDxa = Math.floor(TABLE_TOTAL_WIDTH_DXA / 2) // 4819 dxa cada

  const noBorder = {
    style: BorderStyle.NONE,
    size: 0,
    color: 'FFFFFF',
  }
  const transparentBorders = {
    top: noBorder,
    bottom: noBorder,
    left: noBorder,
    right: noBorder,
    insideHorizontal: noBorder,
    insideVertical: noBorder,
  }

  const signaturesTable = new Table({
    width: { size: TABLE_TOTAL_WIDTH_DXA, type: WidthType.DXA },
    borders: transparentBorders,
    rows: [
      // Linha vazia para espaço da assinatura manuscrita (~60mm)
      new TableRow({
        children: [
          new TableCell({
            width: { size: sigColWidthDxa, type: WidthType.DXA },
            margins: { top: 1200, bottom: 60, left: 120, right: 120 },
            borders: transparentBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '________________________________________',
                    color: COLOR_MIRAGE,
                    font: 'Arial',
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: sigColWidthDxa, type: WidthType.DXA },
            margins: { top: 1200, bottom: 60, left: 120, right: 120 },
            borders: transparentBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '________________________________________',
                    color: COLOR_MIRAGE,
                    font: 'Arial',
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Textos das assinaturas
      new TableRow({
        children: [
          // RT CONCE
          new TableCell({
            width: { size: sigColWidthDxa, type: WidthType.DXA },
            margins: { top: 40, bottom: 120, left: 120, right: 120 },
            borders: transparentBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: CONCE_COMPANY.responsavelTecnico,
                    bold: true,
                    size: 21,
                    color: COLOR_MIRAGE,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: CONCE_COMPANY.registroCrea,
                    bold: true,
                    size: 20,
                    color: COLOR_COBALT,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: CONCE_COMPANY.razaoSocial,
                    size: 19,
                    color: COLOR_MUTED,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 20, after: 0 },
                children: [
                  new TextRun({
                    text: `Porto Alegre/RS, ${currentDateStr}`,
                    size: 18,
                    color: COLOR_MUTED,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          // ACEITE DO CLIENTE
          new TableCell({
            width: { size: sigColWidthDxa, type: WidthType.DXA },
            margins: { top: 40, bottom: 120, left: 120, right: 120 },
            borders: transparentBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: cleanClientName,
                    bold: true,
                    size: 21,
                    color: COLOR_MIRAGE,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: 'Aceite da Proposta Técnica e Comercial',
                    bold: true,
                    size: 20,
                    color: COLOR_PUMPKIN,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({
                    text: 'Data do aceite: _____ / _____ / _________',
                    size: 19,
                    color: COLOR_MIRAGE,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: 'Assinatura do Contratante ou Representante Legal',
                    italics: true,
                    size: 17,
                    color: COLOR_MUTED,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })

  bodyChildren.push(signaturesTable)

  // -------------------------------------------------------------
  // RODAPÉ INSTITUCIONAL FIXADO NO FINAL DO DOCUMENTO
  // "CONCE ENGENHARIA E CONSULTORIA / CNPJ 57.149.101/0001-46 / CONCE é Conceito. CONCE é Concreto."
  // -------------------------------------------------------------
  const footerElement = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 40 },
        border: {
          top: {
            style: BorderStyle.SINGLE,
            size: 1,
            color: COLOR_GRAY_BORDER,
          },
        },
        children: [
          new TextRun({
            text: 'CONCE ENGENHARIA E CONSULTORIA',
            bold: true,
            size: 17, // 8.5pt
            color: COLOR_MIRAGE,
            font: 'Poppins',
          }),
          new TextRun({
            text: '  •  CNPJ 57.149.101/0001-46  •  ',
            size: 17,
            color: COLOR_MUTED,
            font: 'Poppins',
          }),
          new TextRun({
            text: cleanCode,
            bold: true,
            size: 17,
            color: COLOR_COBALT,
            font: 'Arial',
          }),
          new TextRun({
            text: '  •  ',
            size: 17,
            color: COLOR_MUTED,
            font: 'Poppins',
          }),
          new TextRun({
            text: 'CONCE é Conceito. CONCE é Concreto.',
            bold: true,
            size: 17,
            color: COLOR_PUMPKIN,
            font: 'Poppins',
          }),
        ],
      }),
    ],
  })

  return new Document({
    creator: CONCE_COMPANY.responsavelTecnico,
    title: `${PROPOSAL_DOCUMENT_TITLE} - ${cleanCode}`,
    description: `Proposta Técnica e Comercial da CONCE para a obra ${cleanWorkName} (${cleanCode}).`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2 cm
              bottom: 1134,
              left: 1134,
              right: 1134,
            },
          },
        },
        footers: {
          default: footerElement,
        },
        children: bodyChildren,
      },
    ],
  })
}

/**
 * Gera o nome padrão do arquivo .docx da proposta.
 * Padrão: Proposta-Tecnica-e-Comercial-ORC-XXXX-XXX.docx
 */
export function getProposalDocxFilename(budgetCode: string): string {
  const safeCode = (sanitizeDocumentText(budgetCode) || 'ORC-CONCE').replace(/[^a-zA-Z0-9_-]/g, '_')
  return `Proposta-Tecnica-e-Comercial-${safeCode}.docx`
}

/**
 * Compila o arquivo .docx client-side e dispara o download no navegador.
 */
export async function downloadProposalDocx(budget: FullBudget): Promise<void> {
  const doc = buildProposalDocxDocument(budget)
  const blob = await Packer.toBlob(doc)
  const filename = getProposalDocxFilename(budget.code)

  // Download no navegador
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  // Auditoria
  const summary = calculateFullBudget(budget)
  const cleanCode = sanitizeDocumentText(budget.code) || 'ORC-CONCE'
  const cleanClientName = sanitizeDocumentText(budget.client?.name) || 'Cliente Contratante'

  logAuditEvent({
    budgetId: budget.id,
    action: 'exportacao_docx' as any,
    title: 'Proposta Técnica e Comercial Exportada em Word (.docx)',
    details: `Documento ${PROPOSAL_DOCUMENT_TITLE} (8 seções, capa e assinaturas) exportado em formato Word (.docx). Arquivo: ${filename}. Valor: ${formatCurrencyBRL(
      summary.finalSalePrice,
    )}. Cliente: ${cleanClientName}.`,
    userName: CONCE_COMPANY.responsavelTecnicoCompleto,
  })
}
