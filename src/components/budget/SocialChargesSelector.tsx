/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Seletor e Configurador de Encargos Sociais por UF (27 Estados)
 * Regimes: Sem Desoneração (CLT integral) ou Com Desoneração (Lei 12.546/2011)
 * Detalhamento dos Grupos A, B, C e D editáveis com defaults oficiais
 */

import React from 'react'
import { MapPin, Building, CheckCircle2, Sliders, RotateCcw, Layers, FileCheck } from 'lucide-react'
import { BRAZIL_STATES_CHARGES, BRAZIL_STATES_LIST, getChargesForState } from '@/lib/chargesData'

interface SocialChargesSelectorProps {
  uf: string
  isRelieved: boolean
  customGroupA?: number
  customGroupB?: number
  customGroupC?: number
  customGroupD?: number
  onUfChange: (uf: string) => void
  onRelievedChange: (isRelieved: boolean) => void
  onCustomGroupsChange: (groups: {
    customGroupA?: number
    customGroupB?: number
    customGroupC?: number
    customGroupD?: number
  }) => void
  disabled?: boolean
}

export const SocialChargesSelector: React.FC<SocialChargesSelectorProps> = ({
  uf,
  isRelieved,
  customGroupA,
  customGroupB,
  customGroupC,
  customGroupD,
  onUfChange,
  onRelievedChange,
  onCustomGroupsChange,
  disabled = false,
}) => {
  const currentUf = (uf || 'SP').toUpperCase()
  const stateData = BRAZIL_STATES_CHARGES[currentUf] || BRAZIL_STATES_CHARGES['SP']
  const defaultCharges = isRelieved ? stateData.relieved : stateData.nonRelieved

  const activeA = customGroupA !== undefined ? customGroupA : defaultCharges.groupA
  const activeB = customGroupB !== undefined ? customGroupB : defaultCharges.groupB
  const activeC = customGroupC !== undefined ? customGroupC : defaultCharges.groupC
  const activeD = customGroupD !== undefined ? customGroupD : defaultCharges.groupD

  const currentTotal = Number((activeA + activeB + activeC + activeD).toFixed(2))
  const isCustomized =
    customGroupA !== undefined ||
    customGroupB !== undefined ||
    customGroupC !== undefined ||
    customGroupD !== undefined

  const handleResetToUfDefault = () => {
    onCustomGroupsChange({
      customGroupA: undefined,
      customGroupB: undefined,
      customGroupC: undefined,
      customGroupD: undefined,
    })
  }

  return (
    <div className="bg-white rounded-[16px] p-5 sm:p-7 shadow-[0_4px_24px_rgba(23,26,31,0.06)] border border-[#171A1F]/10 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#171A1F]/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-[#294C87]/10 text-[#294C87]">
            <MapPin className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-[#171A1F]">
              Encargos Sociais por UF (27 Estados) & Regime Trabalhista
            </h3>
            <p className="text-xs text-[#171A1F]/60">
              Taxas oficiais SINAPI / Caixa Econômica Federal e Lei 12.546/2011 (CPRB)
            </p>
          </div>
        </div>

        {isCustomized && (
          <button
            type="button"
            onClick={handleResetToUfDefault}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FF6B1F]/30 bg-[#FF6B1F]/10 text-xs font-semibold text-[#FF6B1F] hover:bg-[#FF6B1F]/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão {currentUf}</span>
          </button>
        )}
      </div>

      {/* Seletor de UF + Regime Trabalhista */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Dropdown de UF */}
        <div className="md:col-span-5 space-y-1.5">
          <label className="text-xs font-bold text-[#171A1F] uppercase tracking-wider flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-[#294C87]" />
            Estado da Obra (UF)
          </label>
          <select
            value={currentUf}
            disabled={disabled}
            onChange={(e) => {
              onUfChange(e.target.value)
              // Limpa customização ao mudar de UF para pegar defaults limpos
              onCustomGroupsChange({
                customGroupA: undefined,
                customGroupB: undefined,
                customGroupC: undefined,
                customGroupD: undefined,
              })
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/20 text-sm font-semibold text-[#171A1F] focus:outline-none focus:border-[#294C87] cursor-pointer"
          >
            {BRAZIL_STATES_LIST.map((st) => (
              <option key={st.uf} value={st.uf}>
                {st.uf} — {st.stateName} ({st.region})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[#171A1F]/60">
            Região: {stateData.region} • Tabela oficial SINAPI base {stateData.stateName}
          </p>
        </div>

        {/* Chave de Regime: Sem Desoneração vs Com Desoneração */}
        <div className="md:col-span-7 space-y-1.5">
          <label className="text-xs font-bold text-[#171A1F] uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-[#294C87]" />
            Regime de Desoneração da Folha (Lei 12.546/2011)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRelievedChange(false)}
              className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all text-left flex flex-col ${
                !isRelieved
                  ? 'bg-[#294C87] text-white border-[#294C87] shadow-sm'
                  : 'bg-[#F8F9FA] text-[#171A1F]/70 border-[#171A1F]/15 hover:bg-white'
              }`}
            >
              <span className="font-bold">Sem Desoneração</span>
              <span
                className={`text-[10px] ${!isRelieved ? 'text-white/80' : 'text-[#171A1F]/50'}`}
              >
                INSS integral 20% (Padrão)
              </span>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onRelievedChange(true)}
              className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all text-left flex flex-col ${
                isRelieved
                  ? 'bg-[#FF6B1F] text-white border-[#FF6B1F] shadow-sm'
                  : 'bg-[#F8F9FA] text-[#171A1F]/70 border-[#171A1F]/15 hover:bg-white'
              }`}
            >
              <span className="font-bold">Com Desoneração</span>
              <span className={`text-[10px] ${isRelieved ? 'text-white/80' : 'text-[#171A1F]/50'}`}>
                CPRB 4,5% sobre faturamento
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Detalhamento dos Grupos A, B, C e D */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#294C87] flex items-center gap-1.5">
            <Sliders className="w-4 h-4" />
            Composição Paramétrica dos Encargos (%)
          </h4>
          <span className="text-xs text-[#171A1F]/60">
            Valores editáveis por grupo • Total incide sobre Mão de Obra
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Grupo A */}
          <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#171A1F]">Grupo A</span>
              <span className="text-[10px] text-[#171A1F]/50">Padrão {defaultCharges.groupA}%</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="50"
                disabled={disabled}
                value={activeA}
                onChange={(e) =>
                  onCustomGroupsChange({
                    customGroupA: parseFloat(e.target.value) || 0,
                    customGroupB: activeB,
                    customGroupC: activeC,
                    customGroupD: activeD,
                  })
                }
                className="w-full pl-3 pr-7 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-bold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-2.5 top-2 text-[11px] text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
            <p className="text-[10px] text-[#171A1F]/60">
              INSS, FGTS, Salário Educação, SESI, SENAI, INCRA, SEBRAE
            </p>
          </div>

          {/* Grupo B */}
          <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#171A1F]">Grupo B</span>
              <span className="text-[10px] text-[#171A1F]/50">Padrão {defaultCharges.groupB}%</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="60"
                disabled={disabled}
                value={activeB}
                onChange={(e) =>
                  onCustomGroupsChange({
                    customGroupA: activeA,
                    customGroupB: parseFloat(e.target.value) || 0,
                    customGroupC: activeC,
                    customGroupD: activeD,
                  })
                }
                className="w-full pl-3 pr-7 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-bold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-2.5 top-2 text-[11px] text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
            <p className="text-[10px] text-[#171A1F]/60">
              Repouso Semanal, Férias, Feriados, Auxílio Enfermidade, Licenças
            </p>
          </div>

          {/* Grupo C */}
          <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#171A1F]">Grupo C</span>
              <span className="text-[10px] text-[#171A1F]/50">Padrão {defaultCharges.groupC}%</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="30"
                disabled={disabled}
                value={activeC}
                onChange={(e) =>
                  onCustomGroupsChange({
                    customGroupA: activeA,
                    customGroupB: activeB,
                    customGroupC: parseFloat(e.target.value) || 0,
                    customGroupD: activeD,
                  })
                }
                className="w-full pl-3 pr-7 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-bold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-2.5 top-2 text-[11px] text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
            <p className="text-[10px] text-[#171A1F]/60">
              Aviso prévio indenizado/trabalhado e indenização rescisória
            </p>
          </div>

          {/* Grupo D */}
          <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#171A1F]/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#171A1F]">Grupo D</span>
              <span className="text-[10px] text-[#171A1F]/50">Padrão {defaultCharges.groupD}%</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="20"
                disabled={disabled}
                value={activeD}
                onChange={(e) =>
                  onCustomGroupsChange({
                    customGroupA: activeA,
                    customGroupB: activeB,
                    customGroupC: activeC,
                    customGroupD: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full pl-3 pr-7 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-bold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
              />
              <span className="absolute right-2.5 top-2 text-[11px] text-[#171A1F]/40 font-bold">
                %
              </span>
            </div>
            <p className="text-[10px] text-[#171A1F]/60">
              Reincidências cumulativas (Grupo A sobre Grupo B)
            </p>
          </div>
        </div>
      </div>

      {/* Resumo Consolidado de Encargos */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#171A1F] to-[#294C87] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
              Taxa Total de Encargos Sociais Aplicada ({currentUf})
            </span>
            {isCustomized && (
              <span className="px-2 py-0.5 rounded-full bg-[#FF6B1F] text-white text-[10px] font-bold">
                Customizado
              </span>
            )}
          </div>
          <p className="text-xs text-white/70">
            Regime: {isRelieved ? 'Com Desoneração (CPRB)' : 'Sem Desoneração (CLT integral)'} • Mão
            de Obra
          </p>
        </div>

        <div className="text-center sm:text-right">
          <span className="text-3xl font-extrabold text-[#FF6B1F] tracking-tight">
            {currentTotal.toFixed(2)}%
          </span>
          <div className="text-[11px] text-white/60">
            Multiplicador direto: {(1 + currentTotal / 100).toFixed(4)}x
          </div>
        </div>
      </div>
    </div>
  )
}
