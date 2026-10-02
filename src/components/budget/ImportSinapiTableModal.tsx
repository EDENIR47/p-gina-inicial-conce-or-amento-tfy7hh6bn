/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Importação Oficial de Tabela SINAPI (CSV ou JSON)
 * Permite que a CONCE carregue a planilha oficial do seu estado/mês
 * Formato documentado, validação rigorosa, merge por código sem apagar composições.
 */

import React, { useState } from 'react'
import {
  X,
  Upload,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Info,
  Download,
  Calendar,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { SinapiCatalogItem } from '@/types/sinapi'
import { mergeImportedSinapiItems, getSinapiImportMetadata } from '@/lib/sinapiStorage'
import { BRAZIL_STATES_LIST } from '@/lib/chargesData'

interface ImportSinapiTableModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: (result: {
    updatedCount: number
    createdCount: number
    totalCount: number
  }) => void
}

export const ImportSinapiTableModal: React.FC<ImportSinapiTableModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'json'>('csv')
  const [fileContent, setFileContent] = useState('')
  const [referenceMonth, setReferenceMonth] = useState('04/2025')
  const [referenceState, setReferenceState] = useState('RS')
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [previewItems, setPreviewItems] = useState<SinapiCatalogItem[]>([])
  const [showFormatGuide, setShowFormatGuide] = useState(false)

  if (!isOpen) return null

  // Exemplo CSV oficial documentado
  const sampleCsv = `codigo;descricao;unidade;categoria;preco_referencia;tipo;especialidade
SINAPI-88309;Pedreiro com encargos complementares;h;mao_de_obra;27.40;insumo;Alvenaria & Vedações
SINAPI-88316;Servente com encargos complementares;h;mao_de_obra;20.50;insumo;Serviços Preliminares
SINAPI-1379;Cimento Portland composto CP II-E-32;kg;material;0.72;insumo;Estruturas & Fundações
SINAPI-87255;Piso em porcelanato retificado 60x60cm;m²;material;92.40;composicao;Revestimentos
SINAPI-88489;Pintura látex acrílica duas demãos;m²;material;25.80;composicao;Pintura`

  const sampleJson = `[
  {
    "code": "SINAPI-88309",
    "description": "Pedreiro com encargos complementares",
    "unit": "h",
    "category": "mao_de_obra",
    "referencePrice": 27.40,
    "type": "insumo",
    "specialty": "Alvenaria & Vedações"
  },
  {
    "code": "SINAPI-87255",
    "description": "Piso em porcelanato retificado 60x60cm",
    "unit": "m²",
    "category": "material",
    "referencePrice": 92.40,
    "type": "composicao",
    "specialty": "Revestimentos"
  }
]`

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const isJson = file.name.toLowerCase().endsWith('.json')
    const mode = isJson ? 'json' : 'csv'
    setActiveTab(mode)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = (event.target?.result as string) || ''
      setFileContent(content)
      parseInput(content, mode)
    }
    reader.readAsText(file)
  }

  const parseInput = (raw: string, mode: 'csv' | 'json') => {
    setParseError(null)
    setPreviewItems([])

    if (!raw.trim()) {
      setParseError('O arquivo ou texto fornecido está vazio.')
      return
    }

    try {
      if (mode === 'json') {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) {
          throw new Error('O JSON deve ser um array de itens SINAPI.')
        }

        const validItems: SinapiCatalogItem[] = parsed.map((item, idx) => {
          const rawCode = String(item.code || `SINAPI-${idx + 1}`).trim()
          const code = rawCode.toUpperCase().startsWith('SINAPI-')
            ? rawCode.toUpperCase()
            : `SINAPI-${rawCode}`
          const numericCode = code.replace(/\D/g, '') || String(idx + 1)
          const rawCat = (item.category || 'material').toLowerCase()

          let category: any = 'material'
          if (rawCat.includes('mao') || rawCat.includes('mão')) category = 'mao_de_obra'
          else if (rawCat.includes('equip')) category = 'equipamento'
          else if (rawCat.includes('terceir')) category = 'servico_terceiro'

          return {
            id: `imported-sinapi-${Date.now()}-${idx}`,
            code,
            numericCode,
            type: item.type === 'composicao' ? 'composicao' : 'insumo',
            description: String(item.description || 'Item SINAPI Importado').trim(),
            unit: String(item.unit || 'un').trim(),
            category,
            specialty: String(item.specialty || 'Geral').trim(),
            referencePrice: Math.abs(parseFloat(item.referencePrice ?? item.preco) || 0),
            priceOrigin: 'importada_usuario',
            referenceMonth,
            referenceState,
            notes: item.notes || `Tabela importada ${referenceState} - ${referenceMonth}`,
          }
        })

        if (validItems.length === 0) {
          throw new Error('Nenhum item válido foi encontrado no JSON.')
        }

        setPreviewItems(validItems)
      } else {
        // Parse CSV — suporte a delimitadores ; ou , ou tabulação
        const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
        if (lines.length < 2) {
          throw new Error('O CSV deve conter cabeçalho e pelo menos 1 linha de dados.')
        }

        const delimiter = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ','
        const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase())

        // Identifica posições de colunas ou usa posicionamento default
        const colCodeIdx = headers.findIndex((h) => h.includes('cod') || h.includes('código'))
        const colDescIdx = headers.findIndex((h) => h.includes('desc'))
        const colUnitIdx = headers.findIndex((h) => h.includes('unid'))
        const colCatIdx = headers.findIndex((h) => h.includes('cat'))
        const colPriceIdx = headers.findIndex(
          (h) =>
            h.includes('preco') ||
            h.includes('preço') ||
            h.includes('custo') ||
            h.includes('valor'),
        )
        const colTypeIdx = headers.findIndex((h) => h.includes('tipo'))
        const colSpecIdx = headers.findIndex((h) => h.includes('espec'))

        const parsedList: SinapiCatalogItem[] = []

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''))
          if (cols.length < 2) continue

          const rawCode =
            colCodeIdx >= 0 && cols[colCodeIdx] ? cols[colCodeIdx] : cols[0] || `ITEM-${i}`
          const code = rawCode.toUpperCase().startsWith('SINAPI-')
            ? rawCode.toUpperCase()
            : `SINAPI-${rawCode}`
          const numericCode = code.replace(/\D/g, '') || String(i)

          const description =
            colDescIdx >= 0 && cols[colDescIdx] ? cols[colDescIdx] : cols[1] || 'Item SINAPI'
          const unit = colUnitIdx >= 0 && cols[colUnitIdx] ? cols[colUnitIdx] : cols[2] || 'un'

          const rawPrice =
            colPriceIdx >= 0 && cols[colPriceIdx] ? cols[colPriceIdx] : cols[4] || cols[3] || '0'
          const cleanPrice = parseFloat(rawPrice.replace(/\./g, '').replace(',', '.')) || 0

          const rawCat = (colCatIdx >= 0 ? cols[colCatIdx] : cols[3] || 'material').toLowerCase()
          let category: any = 'material'
          if (rawCat.includes('mao') || rawCat.includes('mão') || rawCat === 'mo') {
            category = 'mao_de_obra'
          } else if (rawCat.includes('equip')) {
            category = 'equipamento'
          } else if (rawCat.includes('terceir')) {
            category = 'servico_terceiro'
          }

          const rawType = (colTypeIdx >= 0 ? cols[colTypeIdx] : cols[5] || '').toLowerCase()
          const type = rawType.includes('comp') ? 'composicao' : 'insumo'

          const specialty = colSpecIdx >= 0 && cols[colSpecIdx] ? cols[colSpecIdx] : 'Geral'

          parsedList.push({
            id: `sinapi-csv-${Date.now()}-${i}`,
            code,
            numericCode,
            type,
            description,
            unit,
            category,
            specialty,
            referencePrice: Math.abs(cleanPrice),
            priceOrigin: 'importada_usuario',
            referenceMonth,
            referenceState,
            notes: `Importado ${referenceState} - ${referenceMonth}`,
          })
        }

        if (parsedList.length === 0) {
          throw new Error('Nenhum registro válido pôde ser extraído do CSV.')
        }

        setPreviewItems(parsedList)
      }
    } catch (err: any) {
      setParseError(err.message || 'Erro ao processar arquivo SINAPI.')
    }
  }

  const handleConfirmImport = () => {
    if (previewItems.length === 0) return

    const result = mergeImportedSinapiItems(previewItems, {
      referenceMonth,
      referenceState,
      fileName: fileName || `Tabela_${referenceState}_${referenceMonth}`,
    })

    onImportSuccess(result)
    onClose()
  }

  const handleLoadSample = () => {
    const content = activeTab === 'csv' ? sampleCsv : sampleJson
    setFileContent(content)
    parseInput(content, activeTab)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-[#171A1F]/20 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-[#FF6B1F] text-white">
              <Upload className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold">
                  Importar Tabela SINAPI Oficial (Caixa / IBGE)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#294C87] text-[10px] font-bold uppercase">
                  Atualização de Preços
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/70">
                Carregue a tabela do seu Estado e Mês de referência para atualizar os custos
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Parâmetros do Lote (UF e Mês) */}
        <div className="p-3 sm:p-4 bg-[#294C87]/5 border-b border-[#294C87]/15 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-[#294C87]" />
              Estado da Tabela (UF) *
            </label>
            <select
              value={referenceState}
              onChange={(e) => setReferenceState(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-semibold bg-white focus:outline-none focus:border-[#294C87]"
            >
              {BRAZIL_STATES_LIST.map((st) => (
                <option key={st.uf} value={st.uf}>
                  {st.uf} — {st.stateName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-[#FF6B1F]" />
              Mês de Referência SINAPI *
            </label>
            <input
              type="text"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
              placeholder="ex: 04/2025"
              className="w-full px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-semibold bg-white focus:outline-none focus:border-[#294C87]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setShowFormatGuide(!showFormatGuide)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#294C87]/30 bg-white hover:bg-[#294C87]/5 text-xs font-bold text-[#294C87]"
            >
              <Info className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>{showFormatGuide ? 'Ocultar Guia de Formato' : 'Ver Guia de Formato'}</span>
            </button>
          </div>
        </div>

        {/* Guia explicativo expansível */}
        {showFormatGuide && (
          <div className="p-3 bg-amber-50/70 border-b border-amber-200 text-xs text-[#171A1F]/80 space-y-1.5">
            <p className="font-bold text-[#171A1F]">Guia de Importação de Tabela SINAPI:</p>
            <ul className="list-disc pl-5 space-y-1 text-[11px]">
              <li>
                <strong>CSV com delimitador ponto-e-vírgula (;):</strong> Cabeçalhos aceitos:{' '}
                <code>codigo;descricao;unidade;categoria;preco_referencia;tipo;especialidade</code>.
              </li>
              <li>
                <strong>Atualização inteligente por Código:</strong> Itens com o mesmo código SINAPI
                são atualizados com o novo preço da tabela. Itens novos são adicionados ao acervo.
              </li>
              <li>
                <strong>Proteção de dados:</strong> Suas composições e orçamentos existentes NÃO são
                apagados. Os novos preços passam a constar no catálogo com a origem "Importada pelo
                usuário".
              </li>
            </ul>
          </div>
        )}

        {/* Abas CSV / JSON e Ações Rápidas */}
        <div className="p-3 border-b border-[#171A1F]/10 bg-[#F8F9FA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('csv')
                setPreviewItems([])
                setParseError(null)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'csv'
                  ? 'bg-[#294C87] text-white shadow-sm'
                  : 'bg-white text-[#171A1F]/70 border border-[#171A1F]/15'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>CSV (Tabela SINAPI Caixa)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('json')
                setPreviewItems([])
                setParseError(null)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'json'
                  ? 'bg-[#294C87] text-white shadow-sm'
                  : 'bg-white text-[#171A1F]/70 border border-[#171A1F]/15'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>JSON Estruturado</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-[#171A1F]/5"
            >
              <Download className="w-3.5 h-3.5 text-[#294C87]" />
              <span>Carregar Exemplo</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#294C87] text-white text-xs font-semibold cursor-pointer hover:bg-[#171A1F] transition-colors">
              <Upload className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>Selecionar Arquivo</span>
              <input
                type="file"
                accept={activeTab === 'csv' ? '.csv,.txt' : '.json'}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Textarea e Preview */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {parseError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Cole ou confira o conteúdo bruto ({activeTab.toUpperCase()}):
            </label>
            <textarea
              rows={5}
              value={fileContent}
              onChange={(e) => {
                setFileContent(e.target.value)
                parseInput(e.target.value, activeTab)
              }}
              placeholder={
                activeTab === 'csv'
                  ? 'codigo;descricao;unidade;categoria;preco_referencia;tipo;especialidade'
                  : '[{ "code": "SINAPI-88309", "referencePrice": 27.40, ... }]'
              }
              className="w-full p-2.5 rounded-xl border border-[#171A1F]/20 font-mono text-xs focus:outline-none focus:border-[#294C87]"
            />
          </div>

          {/* Pré-visualização de Itens */}
          {previewItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#294C87]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#3E8E5A]" />
                  Itens Validados Prontos para Inclusão / Atualização ({previewItems.length})
                </span>
                <span className="text-[#171A1F]/60 font-normal">
                  UF: {referenceState} | Ref: {referenceMonth}
                </span>
              </div>

              <div className="border border-[#171A1F]/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#171A1F]/5 text-[#171A1F] font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3">Descrição</th>
                      <th className="py-2 px-3">Unid.</th>
                      <th className="py-2 px-3 text-right">Preço Ref. (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171A1F]/5">
                    {previewItems.slice(0, 100).map((it, idx) => (
                      <tr key={idx} className="hover:bg-[#171A1F]/[0.02]">
                        <td className="py-1.5 px-3 font-mono font-bold text-[#294C87]">
                          {it.code}
                        </td>
                        <td className="py-1.5 px-3 uppercase text-[10px] text-[#171A1F]/60">
                          {it.type}
                        </td>
                        <td className="py-1.5 px-3 max-w-xs truncate">{it.description}</td>
                        <td className="py-1.5 px-3 font-semibold">{it.unit}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-[#FF6B1F]">
                          R$ {it.referencePrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewItems.length > 100 && (
                <p className="text-[11px] text-[#171A1F]/50 italic">
                  Mostrando os primeiros 100 itens da lista ({previewItems.length} total).
                </p>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com botão de aplicar */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex items-center justify-between">
          <span className="text-xs text-[#171A1F]/60">
            {previewItems.length > 0
              ? `${previewItems.length} itens prontos para atualizar o banco local.`
              : 'Nenhum dado validado ainda.'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] hover:bg-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={previewItems.length === 0}
              onClick={handleConfirmImport}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                previewItems.length > 0
                  ? 'bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white shadow-sm cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar Catálogo SINAPI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
