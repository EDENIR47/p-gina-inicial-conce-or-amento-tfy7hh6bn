/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Editor de BDI Avançado conforme TCU (Acórdão 2.622/2013 - Plenário)
 *
 * Fórmula: BDI = [((1 + AC + R + S + G) * (1 + DF) * (1 + L)) / (1 - T) - 1] * 100
 */

import React, { useState } from 'react'
import {
  Calculator,
  HelpCircle,
  RotateCcw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ShieldCheck,
  TrendingUp,
  Percent,
} from 'lucide-react'
import { BdiConfig } from '@/types/budgetEngine'
import { calculateTcuBdi, DEFAULT_BDI_CONFIG } from '@/lib/budgetEngine'
import { formatPercent } from '@/lib/formatters'

interface BdiEditorProps {
  bdiConfig: BdiConfig
  onChange: (newConfig: BdiConfig) => void
  disabled?: boolean
}

export const BdiEditor: React.FC<BdiEditorProps> = ({ bdiConfig, onChange, disabled = false }) => {
  const [showFormulaDetails, setShowFormulaDetails] = useState(false)

  // Faixas de referência TCU para obras de edificação (Acórdão 2.622/2013)
  const tcuBenchmarks = {
    ac: { min: 3.0, medium: 4.0, max: 5.5, label: '3,00% - 5,50%' },
    r: { min: 0.97, medium: 1.27, max: 1.27, label: '0,97% - 1,27%' },
    sg: { min: 0.8, medium: 0.8, max: 1.0, label: '0,80% - 1,00%' },
    df: { min: 0.59, medium: 1.23, max: 1.39, label: '0,59% - 1,39%' },
    l: { min: 6.16, medium: 7.4, max: 8.96, label: '6,16% - 8,96%' },
    bdi: { min: 20.34, medium: 22.84, max: 25.0, label: '20,34% - 25,00%' },
  }

  const taxesTotal =
    (Number(bdiConfig.taxes?.iss) || 0) +
    (Number(bdiConfig.taxes?.pis) || 0) +
    (Number(bdiConfig.taxes?.cofins) || 0) +
    (Number(bdiConfig.taxes?.inssOrCprb) || 0)

  const calcResult = calculateTcuBdi({
    administrationCentral: bdiConfig.administrationCentral,
    risk: bdiConfig.risk,
    insuranceAndGuarantee: bdiConfig.insuranceAndGuarantee,
    financialExpenses: bdiConfig.financialExpenses,
    profit: bdiConfig.profit,
    taxesTotal,
  })

  const handleFieldChange = (field: keyof BdiConfig, value: number) => {
    const updated = {
      ...bdiConfig,
      [field]: Math.max(0, value),
    }

    const newTaxesTotal =
      (Number(updated.taxes?.iss) || 0) +
      (Number(updated.taxes?.pis) || 0) +
      (Number(updated.taxes?.cofins) || 0) +
      (Number(updated.taxes?.inssOrCprb) || 0)

    const res = calculateTcuBdi({
      administrationCentral: updated.administrationCentral,
      risk: updated.risk,
      insuranceAndGuarantee: updated.insuranceAndGuarantee,
      financialExpenses: updated.financialExpenses,
      profit: updated.profit,
      taxesTotal: newTaxesTotal,
    })

    updated.calculatedBdi = res.bdiPercent
    onChange(updated)
  }

  const handleTaxChange = (taxField: 'iss' | 'pis' | 'cofins' | 'inssOrCprb', value: number) => {
    const updatedTaxes = {
      ...bdiConfig.taxes,
      [taxField]: Math.max(0, value),
    }
    const newTaxesTotal =
      (Number(updatedTaxes.iss) || 0) +
      (Number(updatedTaxes.pis) || 0) +
      (Number(updatedTaxes.cofins) || 0) +
      (Number(updatedTaxes.inssOrCprb) || 0)

    updatedTaxes.totalTaxes = Number(newTaxesTotal.toFixed(2))

    const updated = {
      ...bdiConfig,
      taxes: updatedTaxes,
    }

    const res = calculateTcuBdi({
      administrationCentral: updated.administrationCentral,
      risk: updated.risk,
      insuranceAndGuarantee: updated.insuranceAndGuarantee,
      financialExpenses: updated.financialExpenses,
      profit: updated.profit,
      taxesTotal: newTaxesTotal,
    })

    updated.calculatedBdi = res.bdiPercent
    onChange(updated)
  }

  const handleRestoreDefaults = () => {
    onChange({ ...DEFAULT_BDI_CONFIG })
  }

  // Avalia se o BDI geral está dentro da faixa padrão do TCU
  const isBdiInTcuRange =
    calcResult.bdiPercent >= tcuBenchmarks.bdi.min && calcResult.bdiPercent <= tcuBenchmarks.bdi.max

  return (
    <div className="bg-white rounded-[16px] p-5 sm:p-7 shadow-[0_4px_24px_rgba(23,26,31,0.06)] border border-[#171A1F]/10 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#171A1F]/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#294C87]/10 text-[#294C87]">
              <Calculator className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#171A1F]">
                Editor de BDI Avançado (Acórdão TCU 2.622/2013)
              </h3>
              <p className="text-xs text-[#171A1F]/60">
                Benefícios e Despesas Indiretas calculados pela fórmula paramétrica oficial
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F]/70 hover:bg-[#171A1F]/5 transition-colors"
            title="Restaurar valores médios de referência do TCU"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Padrão TCU</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFormulaDetails(!showFormulaDetails)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#294C87]/10 text-[#294C87] text-xs font-semibold hover:bg-[#294C87]/20 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showFormulaDetails ? 'Ocultar Fórmula' : 'Ver Fórmula'}</span>
          </button>
        </div>
      </div>

      {/* Caixa de Demonstração da Fórmula TCU (Colapsável) */}
      {showFormulaDetails && (
        <div className="p-4 rounded-xl bg-[#171A1F]/[0.03] border border-[#294C87]/20 text-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#294C87] flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-[#FF6B1F]" />
              Fórmula Oficial TCU (Acórdão 2.622/2013 - Plenário)
            </span>
            <span className="font-mono text-[11px] text-[#171A1F]/50">Obras de Edificação</span>
          </div>

          <div className="p-3 rounded-lg bg-white border border-[#171A1F]/10 font-mono text-center text-xs sm:text-sm text-[#171A1F] overflow-x-auto">
            BDI = [ ((1 + AC + R + S + G) × (1 + DF) × (1 + L)) / (1 - T) - 1 ] × 100
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-[#171A1F]/70">
            <div>
              <strong className="text-[#171A1F]">AC:</strong> Adm. Central
            </div>
            <div>
              <strong className="text-[#171A1F]">R:</strong> Risco / Incertezas
            </div>
            <div>
              <strong className="text-[#171A1F]">S + G:</strong> Seguro e Garantia
            </div>
            <div>
              <strong className="text-[#171A1F]">DF:</strong> Desp. Financeiras
            </div>
            <div>
              <strong className="text-[#171A1F]">L:</strong> Lucro Bruto
            </div>
            <div>
              <strong className="text-[#171A1F]">T:</strong> Tributos (ISS+PIS+COFINS)
            </div>
            <div className="col-span-2 text-[#294C87] font-semibold">
              Numerador: {calcResult.numerator.toFixed(4)} | Denominador (1-T):{' '}
              {calcResult.denominator.toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {/* Grade de Parâmetros Operacionais */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#294C87] flex items-center gap-1.5">
          <Building2 className="w-4 h-4" />
          Componentes Indiretos & Margem (%)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* AC */}
          <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#171A1F]">Adm. Central (AC)</label>
              <span className="text-[10px] text-[#171A1F]/50">{tcuBenchmarks.ac.label}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="30"
                disabled={disabled}
                value={bdiConfig.administrationCentral}
                onChange={(e) =>
                  handleFieldChange('administrationCentral', parseFloat(e.target.value) || 0)
                }
                className="w-full pl-3 pr-8 py-2 rounded-lg bg-white border border-[#171A1F]/20 text-sm font-semibold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-3 top-2.5 text-xs text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
            <p className="text-[10px] text-[#171A1F]/60">Sede, diretoria e rateio</p>
          </div>

          {/* Risco R */}
          <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#171A1F]">Risco (R)</label>
              <span className="text-[10px] text-[#171A1F]/50">{tcuBenchmarks.r.label}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="20"
                disabled={disabled}
                value={bdiConfig.risk}
                onChange={(e) => handleFieldChange('risk', parseFloat(e.target.value) || 0)}
                className="w-full pl-3 pr-8 py-2 rounded-lg bg-white border border-[#171A1F]/20 text-sm font-semibold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-3 top-2.5 text-xs text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
            <p className="text-[10px] text-[#171A1F]/60">Imprevistos de projeto</p>
          </div>

          {/* Seguro + Garantia S+G */}
          <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#171A1F]">Seguro/Garantia (S+G)</label>
              <span className="text-[10px] text-[#171A1F]/50">{tcuBenchmarks.sg.label}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                disabled={disabled}
                value={bdiConfig.insuranceAndGuarantee}
                onChange={(e) =>
                  handleFieldChange('insuranceAndGuarantee', parseFloat(e.target.value) || 0)
                }
                className="w-full pl-3 pr-8 py-2 rounded-lg bg-white border border-[#171A1F]/20 text-sm font-semibold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-3 top-2.5 text-xs text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
            <p className="text-[10px] text-[#171A1F]/60">Apólice de risco engenharia</p>
          </div>

          {/* Despesas Financeiras DF */}
          <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#171A1F]">Desp. Financeiras (DF)</label>
              <span className="text-[10px] text-[#171A1F]/50">{tcuBenchmarks.df.label}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="15"
                disabled={disabled}
                value={bdiConfig.financialExpenses}
                onChange={(e) =>
                  handleFieldChange('financialExpenses', parseFloat(e.target.value) || 0)
                }
                className="w-full pl-3 pr-8 py-2 rounded-lg bg-white border border-[#171A1F]/20 text-sm font-semibold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-3 top-2.5 text-xs text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
            <p className="text-[10px] text-[#171A1F]/60">Custo de capital de giro</p>
          </div>

          {/* Lucro Operacional L */}
          <div className="p-3.5 rounded-xl bg-[#FFF7F0] border border-[#FF6B1F]/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#171A1F]">Lucro Bruto (L)</label>
              <span className="text-[10px] text-[#FF6B1F] font-semibold">
                {tcuBenchmarks.l.label}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="30"
                disabled={disabled}
                value={bdiConfig.profit}
                onChange={(e) => handleFieldChange('profit', parseFloat(e.target.value) || 0)}
                className="w-full pl-3 pr-8 py-2 rounded-lg bg-white border border-[#FF6B1F]/40 text-sm font-bold text-[#FF6B1F] focus:outline-none focus:border-[#FF6B1F]"
              />
              <span className="absolute right-3 top-2.5 text-xs text-[#FF6B1F] font-bold">%</span>
            </div>
            <p className="text-[10px] text-[#171A1F]/60">Margem CONCE</p>
          </div>
        </div>
      </div>

      {/* Grade de Tributos (T) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#294C87] flex items-center gap-1.5">
            <Percent className="w-4 h-4" />
            Tributos Incidentes (T = Σ Tributos = {taxesTotal.toFixed(2)}%)
          </h4>
          <span className="text-xs text-[#171A1F]/60">
            Nota: IRPJ e CSLL não compõem BDI (Súmula TCU 254)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* ISS */}
          <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#171A1F]">ISS Municipal</label>
              <span className="text-[10px] text-[#171A1F]/50">2% a 5%</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                disabled={disabled}
                value={bdiConfig.taxes?.iss || 0}
                onChange={(e) => handleTaxChange('iss', parseFloat(e.target.value) || 0)}
                className="w-full pl-3 pr-7 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-2.5 top-2 text-[11px] text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
          </div>

          {/* PIS */}
          <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#171A1F]">PIS</label>
              <span className="text-[10px] text-[#171A1F]/50">0,65%</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                disabled={disabled}
                value={bdiConfig.taxes?.pis || 0}
                onChange={(e) => handleTaxChange('pis', parseFloat(e.target.value) || 0)}
                className="w-full pl-3 pr-7 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-2.5 top-2 text-[11px] text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
          </div>

          {/* COFINS */}
          <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#171A1F]">COFINS</label>
              <span className="text-[10px] text-[#171A1F]/50">3,00%</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                disabled={disabled}
                value={bdiConfig.taxes?.cofins || 0}
                onChange={(e) => handleTaxChange('cofins', parseFloat(e.target.value) || 0)}
                className="w-full pl-3 pr-7 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-2.5 top-2 text-[11px] text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
          </div>

          {/* CPRB / INSS */}
          <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#171A1F]">CPRB (Deson.)</label>
              <span className="text-[10px] text-[#171A1F]/50">4,50% se aplicável</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                disabled={disabled}
                value={bdiConfig.taxes?.inssOrCprb || 0}
                onChange={(e) => handleTaxChange('inssOrCprb', parseFloat(e.target.value) || 0)}
                className="w-full pl-3 pr-7 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-semibold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-2.5 top-2 text-[11px] text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BDI Diferenciado e Resultado Final */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* BDI Diferenciado para Fornecimento de Equipamentos */}
        <div className="p-4 rounded-xl bg-[#294C87]/5 border border-[#294C87]/15 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#294C87] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#FF6B1F]" />
              BDI Diferenciado (Equipamentos / Materiais Relevantes)
            </span>
            <span className="text-[10px] text-[#171A1F]/60">Súmula TCU 253</span>
          </div>
          <p className="text-[11px] text-[#171A1F]/70">
            O TCU recomenda aplicar BDI reduzido para aquisição e fornecimento de grandes
            equipamentos.
          </p>
          <div className="flex items-center gap-2">
            <div className="relative w-36">
              <input
                type="number"
                step="0.1"
                min="0"
                max="25"
                disabled={disabled}
                value={bdiConfig.differentiatedEquipBdi || 15.0}
                onChange={(e) =>
                  handleFieldChange('differentiatedEquipBdi', parseFloat(e.target.value) || 0)
                }
                className="w-full pl-3 pr-7 py-1.5 rounded-lg bg-white border border-[#294C87]/30 text-xs font-bold text-[#294C87] focus:outline-none"
              />
              <span className="absolute right-2.5 top-2 text-xs text-[#294C87] font-bold">%</span>
            </div>
            <span className="text-xs text-[#171A1F]/60">
              Pode ser associado por serviço na árvore
            </span>
          </div>
        </div>

        {/* Card Destaque: BDI Geral Calculado */}
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-[#171A1F] to-[#294C87] text-white flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              BDI Geral Calculado em Tempo Real
            </span>
            {isBdiInTcuRange ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#3E8E5A]/30 text-[#3E8E5A] border border-[#3E8E5A]/40 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Faixa TCU Adequada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FF6B1F]/30 text-[#FF6B1F] border border-[#FF6B1F]/40 text-[11px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5" /> Fora do Padrão TCU
              </span>
            )}
          </div>

          <div className="my-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#FF6B1F] tracking-tight">
              {calcResult.bdiPercent.toFixed(2)}%
            </span>
            <span className="text-xs text-white/60 ml-2">
              multiplicador 1,{calcResult.bdiPercent.toFixed(0)}
            </span>
          </div>

          <div className="text-[11px] text-white/70 flex items-center justify-between border-t border-white/10 pt-2">
            <span>TCU Edificação: 20,34% a 25,00%</span>
            <span>Tributos Totais: {taxesTotal.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
