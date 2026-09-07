/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Modal para Importação de Composições via CSV ou JSON (Estruturas SINAPI / SICRO)
 */

import React, { useState } from 'react'
import {
  X,
  Upload,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react'
import { BudgetComposition, BudgetInput, InputCategory } from '@/types/budgetEngine'

interface ImportCompositionsModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: (imported: BudgetComposition[]) => void
}

export const ImportCompositionsModal: React.FC<ImportCompositionsModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'json'>('csv')
  const [fileContent, setFileContent] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [previewItems, setPreviewItems] = useState<BudgetComposition[]>([])

  if (!isOpen) return null

  const sampleCsv = `codigo;descricao;especialidade;unidade;custo_unitario;fonte;insumo_codigo;insumo_desc;insumo_unidade;insumo_coef;insumo_custo;insumo_categoria
SINAPI-74209;Alvenaria bloco concreto 14x19x39;Alvenaria & Vedações;m²;72.50;SINAPI;SINAPI-645;Bloco de concreto 14x19x39cm;un;13.2;4.10;material
SINAPI-74209;Alvenaria bloco concreto 14x19x39;Alvenaria & Vedações;m²;72.50;SINAPI;SINAPI-88309;Pedreiro com encargos;h;0.70;26.50;mao_de_obra
SINAPI-74209;Alvenaria bloco concreto 14x19x39;Alvenaria & Vedações;m²;72.50;SINAPI;SINAPI-88316;Servente com encargos;h;0.35;19.80;mao_de_obra`

  const sampleJson = `[
  {
    "code": "SINAPI-92775",
    "description": "Armação de pilar ou viga de estrutura convencional de concreto armado utilizando aço CA-50 de 6,3mm",
    "specialty": "Estruturas & Fundações",
    "unit": "kg",
    "source": "SINAPI",
    "version": "v1.0",
    "inputs": [
      {
        "code": "SINAPI-336",
        "description": "Aço CA-50, 6,3 mm, vergalhão",
        "unit": "kg",
        "category": "material",
        "coefficient": 1.10,
        "unitCost": 8.40
      },
      {
        "code": "SINAPI-88245",
        "description": "Armador com encargos complementares",
        "unit": "h",
        "category": "mao_de_obra",
        "coefficient": 0.08,
        "unitCost": 26.80
      }
    ]
  }
]`

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setFileContent(content)
      parseInput(content, file.name.endsWith('.json') ? 'json' : 'csv')
    }
    reader.readAsText(file)
  }

  const parseInput = (raw: string, mode: 'csv' | 'json') => {
    setParseError(null)
    setPreviewItems([])

    if (!raw.trim()) {
      setParseError('O conteúdo para importação está vazio.')
      return
    }

    try {
      if (mode === 'json') {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) {
          throw new Error('O JSON deve ser um array de composições.')
        }

        const validComps: BudgetComposition[] = parsed.map((item, idx) => ({
          id: `imported-${Date.now()}-${idx}`,
          code: item.code || `IMP-${idx + 1}`,
          description: item.description || 'Composição Importada',
          specialty: item.specialty || 'Geral',
          unit: item.unit || 'un',
          source: (item.source as any) || 'SINAPI',
          version: item.version || 'v1.0',
          versionsHistory: [
            {
              version: item.version || 'v1.0',
              date: new Date().toISOString().split('T')[0],
              author: 'Importador SINAPI/JSON CONCE',
              changelog: 'Importação via arquivo JSON',
            },
          ],
          inputs: Array.isArray(item.inputs)
            ? item.inputs.map((inp: any, inpIdx: number) => ({
                id: `inp-imp-${idx}-${inpIdx}`,
                code: inp.code || `INP-${inpIdx + 1}`,
                description: inp.description || 'Insumo importado',
                unit: inp.unit || 'un',
                category: inp.category || 'material',
                coefficient: Number(inp.coefficient) || 1,
                unitCost: Number(inp.unitCost) || 0,
              }))
            : [],
        }))

        setPreviewItems(validComps)
      } else {
        // Parse CSV delimitado por ponto-e-vírgula ou vírgula
        const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
        if (lines.length < 2) {
          throw new Error('O arquivo CSV deve conter cabeçalho e pelo menos 1 linha de dados.')
        }

        const delimiter = lines[0].includes(';') ? ';' : ','
        const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase())

        const compsMap: Record<string, BudgetComposition> = {}

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''))
          if (cols.length < 4) continue

          const code = cols[0] || `IMP-${i}`
          const description = cols[1] || 'Composição Importada'
          const specialty = cols[2] || 'Estruturas & Fundações'
          const unit = cols[3] || 'un'
          const source = (cols[5] as any) || 'SINAPI'

          if (!compsMap[code]) {
            compsMap[code] = {
              id: `comp-csv-${Date.now()}-${i}`,
              code,
              description,
              specialty,
              unit,
              source: source === 'SICRO' ? 'SICRO' : 'SINAPI',
              version: 'v1.0',
              versionsHistory: [
                {
                  version: 'v1.0',
                  date: new Date().toISOString().split('T')[0],
                  author: 'Importador SINAPI/CSV CONCE',
                  changelog: 'Carga inicial via tabela CSV',
                },
              ],
              inputs: [],
            }
          }

          // Se tiver colunas de insumos vinculadas
          if (cols.length >= 10 && cols[6]) {
            const rawCat = cols[11]?.toLowerCase()?.trim()
            let validCat: InputCategory = 'material'
            if (rawCat === 'mao_de_obra' || rawCat === 'mão de obra' || rawCat === 'mo') {
              validCat = 'mao_de_obra'
            } else if (rawCat === 'equipamento' || rawCat === 'equip') {
              validCat = 'equipamento'
            } else if (rawCat === 'servico_terceiro' || rawCat === 'terceiros') {
              validCat = 'servico_terceiro'
            } else if (rawCat === 'outros') {
              validCat = 'outros'
            } else {
              validCat = 'material'
            }

            compsMap[code].inputs.push({
              id: `inp-csv-${Date.now()}-${i}`,
              code: cols[6],
              description: cols[7] || 'Insumo auxiliar',
              unit: cols[8] || 'un',
              coefficient: parseFloat(cols[9]?.replace(',', '.')) || 1,
              unitCost: parseFloat(cols[10]?.replace(',', '.')) || 0,
              category: validCat,
            })
          }
        }

        const resultList = Object.values(compsMap)
        if (resultList.length === 0) {
          throw new Error('Nenhuma composição válida pôde ser extraída do CSV.')
        }

        setPreviewItems(resultList)
      }
    } catch (err: any) {
      setParseError(err.message || 'Erro ao processar arquivo.')
    }
  }

  const handleConfirmImport = () => {
    if (previewItems.length === 0) return
    onImportSuccess(previewItems)
    onClose()
  }

  const handleLoadSample = () => {
    const content = activeTab === 'csv' ? sampleCsv : sampleJson
    setFileContent(content)
    parseInput(content, activeTab)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-[#171A1F]/20 overflow-hidden max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-[#171A1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#FF6B1F]" />
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                Importar Composições de Custos (SINAPI / SICRO)
              </h3>
              <p className="text-xs text-white/70">
                Formatos suportados: CSV padrão Caixa/SINAPI ou JSON estruturado
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas e Ações Rápidas */}
        <div className="p-4 border-b border-[#171A1F]/10 bg-[#F8F9FA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              <span>CSV (Tabela SINAPI)</span>
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
              <span>Carregar Exemplo {activeTab.toUpperCase()}</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#294C87] text-white text-xs font-semibold cursor-pointer hover:bg-[#171A1F] transition-colors">
              <Upload className="w-3.5 h-3.5 text-[#FF6B1F]" />
              <span>Escolher Arquivo</span>
              <input
                type="file"
                accept={activeTab === 'csv' ? '.csv,.txt' : '.json'}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Área de Texto / Prévia */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {parseError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Cole ou edite o conteúdo {activeTab.toUpperCase()} diretamente:
            </label>
            <textarea
              rows={6}
              value={fileContent}
              onChange={(e) => {
                setFileContent(e.target.value)
                parseInput(e.target.value, activeTab)
              }}
              placeholder={
                activeTab === 'csv'
                  ? 'codigo;descricao;especialidade;unidade;custo;fonte;...'
                  : '[{ "code": "SINAPI-...", "description": "...", "inputs": [] }]'
              }
              className="w-full p-3 rounded-xl border border-[#171A1F]/20 font-mono text-xs focus:outline-none focus:border-[#294C87]"
            />
          </div>

          {/* Pré-visualização das composições reconhecidas */}
          {previewItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#294C87] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#3E8E5A]" />
                  Composições Prontas para Inclusão ({previewItems.length})
                </span>
              </div>

              <div className="border border-[#171A1F]/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#171A1F]/5 text-[#171A1F] font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Descrição</th>
                      <th className="py-2 px-3">Especialidade</th>
                      <th className="py-2 px-3">Unid.</th>
                      <th className="py-2 px-3 text-center">Insumos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171A1F]/5">
                    {previewItems.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-[#171A1F]/[0.02]">
                        <td className="py-2 px-3 font-mono font-bold text-[#294C87]">
                          {comp.code}
                        </td>
                        <td className="py-2 px-3 max-w-xs truncate">{comp.description}</td>
                        <td className="py-2 px-3 text-[#171A1F]/70">{comp.specialty}</td>
                        <td className="py-2 px-3 font-bold">{comp.unit}</td>
                        <td className="py-2 px-3 text-center">{comp.inputs?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com botão de importar */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#171A1F]/10 flex items-center justify-between">
          <span className="text-xs text-[#171A1F]/60">
            {previewItems.length > 0
              ? `${previewItems.length} composições validadas com sucesso.`
              : 'Nenhum dado válido para importar ainda.'}
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
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                previewItems.length > 0
                  ? 'bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white shadow-sm'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Importar para Biblioteca</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
