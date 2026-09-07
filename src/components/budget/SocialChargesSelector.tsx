/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Seletor e Configurador de Encargos Sociais por UF (27 Estados)
 * Regimes: Sem Desoneração (CLT integral) ou Com Desoneração (Lei 12.546/2011)
 * Detalhamento dos Grupos A, B, C e D editáveis com defaults oficiais
 */

import React from 'react'
import { MapPin, Building, CheckCircle2, Sliders, RotateCcw, Layers, FileCheck } from 'lucide-react'
import { BRAZIL_STATES_CHARGES, BRAZIL_STATES_LIST, getChargesForState } from '@/lib/chargesData'

import { TaxRegime } from '@/types/budgetEngine'

interface SocialChargesSelectorProps {
  uf: string
  isRelieved: boolean
  taxRegime?: TaxRegime
  simplesDasRate?: number
  customGroupA?: number
  customGroupB?: number
  customGroupC?: number
  customGroupD?: number
  onUfChange: (uf: string) => void
  onRelievedChange: (isRelieved: boolean) => void
  onTaxRegimeChange?: (regime: TaxRegime, dasRate?: number) => void
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
  taxRegime,
  simplesDasRate = 0,
  customGroupA,
  customGroupB,
  customGroupC,
  customGroupD,
  onUfChange,
  onRelievedChange,
  onTaxRegimeChange,
  onCustomGroupsChange,
  disabled = false,
}) => {
  // Regime ativo com fallback retrocompatível
  const effectiveRegime: TaxRegime =
    taxRegime || (isRelieved ? 'com_desoneracao' : 'sem_desoneracao')

  // No Simples Nacional, os encargos usam como base o regime sem desoneração
  const usesRelievedCharges = effectiveRegime === 'com_desoneracao'

  const currentUf = (uf || 'SP').toUpperCase()
  const stateData = BRAZIL_STATES_CHARGES[currentUf] || BRAZIL_STATES_CHARGES['SP']
  const defaultCharges = usesRelievedCharges ? stateData.relieved : stateData.nonRelieved

  // Se os grupos customizados somam zero mas não foram marcados intencionalmente,
  // ou se foram salvos como 0 por erro anterior, usa os defaults oficiais da UF (base sem desoneração)
  const isCustomized =
    customGroupA !== undefined ||
    customGroupB !== undefined ||
    customGroupC !== undefined ||
    customGroupD !== undefined

  const rawSum =
    (customGroupA ?? defaultCharges.groupA) +
    (customGroupB ?? defaultCharges.groupB) +
    (customGroupC ?? defaultCharges.groupC) +
    (customGroupD ?? defaultCharges.groupD)

  // Se a soma for 0 e os grupos estiverem zerados por omissão ou inferência errônea, restaura os defaults da UF
  const shouldUseDefaults = isCustomized && rawSum === 0

  const activeA = shouldUseDefaults
    ? defaultCharges.groupA
    : customGroupA !== undefined
      ? customGroupA
      : defaultCharges.groupA
  const activeB = shouldUseDefaults
    ? defaultCharges.groupB
    : customGroupB !== undefined
      ? customGroupB
      : defaultCharges.groupB
  const activeC = shouldUseDefaults
    ? defaultCharges.groupC
    : customGroupC !== undefined
      ? customGroupC
      : defaultCharges.groupC
  const activeD = shouldUseDefaults
    ? defaultCharges.groupD
    : customGroupD !== undefined
      ? customGroupD
      : defaultCharges.groupD

  const currentTotal = Number((activeA + activeB + activeC + activeD).toFixed(2))

  const handleResetToUfDefault = () => {
    // Restaura explicitamente os valores padrão da UF para o regime selecionado
    // (no Simples Nacional, são os mesmos percentuais de Sem Desoneração)
    const targetDefaults = defaultCharges
    onCustomGroupsChange({
      customGroupA: targetDefaults.groupA,
      customGroupB: targetDefaults.groupB,
      customGroupC: targetDefaults.groupC,
      customGroupD: targetDefaults.groupD,
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

        {/* Seletor de Regime Tributário / Trabalhista */}
        <div className="md:col-span-7 space-y-1.5">
          <label className="text-xs font-bold text-[#171A1F] uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-[#294C87]" />
            Regime Tributário & Desoneração da Folha
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Opção Simples Nacional — CONCE */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                // Ao selecionar simples_nacional, os grupos DEVEM carregar os defaults de stateData.nonRelieved
                // (o Simples NÃO zera encargos trabalhistas — usa a base Sem Desoneração da SINAPI/UF).
                // Preservar edições reais do usuário se já existirem valores positivos (> 0).
                const hasExistingPositiveValues =
                  customGroupA !== undefined &&
                  (customGroupA || 0) +
                    (customGroupB || 0) +
                    (customGroupC || 0) +
                    (customGroupD || 0) >
                    0

                if (!hasExistingPositiveValues) {
                  onCustomGroupsChange({
                    customGroupA: stateData.nonRelieved.groupA,
                    customGroupB: stateData.nonRelieved.groupB,
                    customGroupC: stateData.nonRelieved.groupC,
                    customGroupD: stateData.nonRelieved.groupD,
                  })
                }

                if (onTaxRegimeChange) {
                  onTaxRegimeChange('simples_nacional', simplesDasRate)
                } else {
                  onRelievedChange(false)
                }
              }}
              className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left flex flex-col relative ${
                effectiveRegime === 'simples_nacional'
                  ? 'bg-[#294C87] text-white border-[#294C87] shadow-sm ring-2 ring-[#FF6B1F]/50'
                  : 'bg-[#F8F9FA] text-[#171A1F]/80 border-[#171A1F]/15 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="font-bold">Simples Nacional</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-[#FF6B1F] text-white">
                  CONCE
                </span>
              </div>
              <span
                className={`text-[10px] mt-0.5 line-clamp-2 ${
                  effectiveRegime === 'simples_nacional' ? 'text-white/85' : 'text-[#171A1F]/60'
                }`}
              >
                Tributos unificados no DAS • Encargos sem desoneração
              </span>
            </button>

            {/* Opção Sem Desoneração */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const hasExistingPositiveValues =
                  customGroupA !== undefined &&
                  (customGroupA || 0) +
                    (customGroupB || 0) +
                    (customGroupC || 0) +
                    (customGroupD || 0) >
                    0

                if (!hasExistingPositiveValues) {
                  onCustomGroupsChange({
                    customGroupA: stateData.nonRelieved.groupA,
                    customGroupB: stateData.nonRelieved.groupB,
                    customGroupC: stateData.nonRelieved.groupC,
                    customGroupD: stateData.nonRelieved.groupD,
                  })
                }

                if (onTaxRegimeChange) {
                  onTaxRegimeChange('sem_desoneracao', simplesDasRate)
                } else {
                  onRelievedChange(false)
                }
              }}
              className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left flex flex-col ${
                effectiveRegime === 'sem_desoneracao'
                  ? 'bg-[#294C87] text-white border-[#294C87] shadow-sm'
                  : 'bg-[#F8F9FA] text-[#171A1F]/80 border-[#171A1F]/15 hover:bg-white'
              }`}
            >
              <span className="font-bold">Sem Desoneração</span>
              <span
                className={`text-[10px] mt-0.5 line-clamp-2 ${
                  effectiveRegime === 'sem_desoneracao' ? 'text-white/85' : 'text-[#171A1F]/60'
                }`}
              >
                INSS patronal 20% sobre folha de pagamento (CLT)
              </span>
            </button>

            {/* Opção Com Desoneração */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const hasExistingPositiveValues =
                  customGroupA !== undefined &&
                  (customGroupA || 0) +
                    (customGroupB || 0) +
                    (customGroupC || 0) +
                    (customGroupD || 0) >
                    0

                if (!hasExistingPositiveValues) {
                  onCustomGroupsChange({
                    customGroupA: stateData.relieved.groupA,
                    customGroupB: stateData.relieved.groupB,
                    customGroupC: stateData.relieved.groupC,
                    customGroupD: stateData.relieved.groupD,
                  })
                }

                if (onTaxRegimeChange) {
                  onTaxRegimeChange('com_desoneracao', simplesDasRate)
                } else {
                  onRelievedChange(true)
                }
              }}
              className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left flex flex-col ${
                effectiveRegime === 'com_desoneracao'
                  ? 'bg-[#FF6B1F] text-white border-[#FF6B1F] shadow-sm'
                  : 'bg-[#F8F9FA] text-[#171A1F]/80 border-[#171A1F]/15 hover:bg-white'
              }`}
            >
              <span className="font-bold">Com Desoneração</span>
              <span
                className={`text-[10px] mt-0.5 line-clamp-2 ${
                  effectiveRegime === 'com_desoneracao' ? 'text-white/85' : 'text-[#171A1F]/60'
                }`}
              >
                CPRB 4,5% sobre receita bruta (Lei 12.546/2011)
              </span>
            </button>
          </div>

          {/* Micro-legenda e campo do DAS se Simples Nacional */}
          {effectiveRegime === 'simples_nacional' && (
            <div className="mt-2.5 p-3 rounded-xl bg-[#294C87]/5 border border-[#294C87]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#171A1F]/80 space-y-0.5">
                <p className="font-bold text-[#294C87]">
                  Regime Simples Nacional — Padrão Operacional CONCE
                </p>
                <p className="text-[11px] text-[#171A1F]/70">
                  Os encargos sociais trabalhistas seguem a tabela base sem desoneração (não se
                  aplica CPRB). Os tributos do BDI passam a incidir pela alíquota efetiva do DAS da
                  empresa.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-bold text-[#171A1F] whitespace-nowrap">
                  Alíquota DAS:
                </label>
                <div className="relative w-28">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="40"
                    disabled={disabled}
                    placeholder="0.00"
                    value={simplesDasRate > 0 ? simplesDasRate : ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      if (onTaxRegimeChange) {
                        onTaxRegimeChange('simples_nacional', val)
                      }
                    }}
                    className="w-full pl-2.5 pr-7 py-1 rounded-lg bg-white border border-[#171A1F]/30 text-xs font-bold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
                  />
                  <span className="absolute right-2 top-1.5 text-[11px] text-[#171A1F]/50 font-bold">
                    %
                  </span>
                </div>
                {simplesDasRate === 0 && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold whitespace-nowrap">
                    Preencher manualmente
                  </span>
                )}
              </div>
            </div>
          )}
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
            Regime:{' '}
            {effectiveRegime === 'simples_nacional'
              ? 'Simples Nacional (DAS • base sem desoneração)'
              : effectiveRegime === 'com_desoneracao'
                ? 'Com Desoneração (CPRB Lei 12.546)'
                : 'Sem Desoneração (CLT integral)'}{' '}
            • Mão de Obra
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
