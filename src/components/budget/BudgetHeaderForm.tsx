/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Formulário de Cadastro do Orçamento
 * 1. Cliente (nome, CPF/CNPJ, endereço, contato)
 * 2. Obra (nome, endereço, descrição, prazo, data de início)
 * 3. Modo Obras Públicas (licitação/contrato, órgão, modalidade, referência SINAPI/SICRO)
 */

import React from 'react'
import {
  User,
  Building,
  Landmark,
  Calendar,
  Clock,
  MapPin,
  Mail,
  Phone,
  Hash,
  FileText,
  AlertCircle,
  CreditCard,
  Briefcase,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import {
  ClientData,
  DeadlineUnit,
  FullBudget,
  PublicWorkData,
  TaxRegime,
  WorkData,
} from '@/types/budgetEngine'
import { calculateTcuBdi } from '@/lib/budgetEngine'
import { BRAZIL_STATES_LIST } from '@/lib/chargesData'
import {
  getBudgetDeadline,
  formatBudgetDeadline,
  DEFAULT_TECHNICAL_RESPONSIBILITY_TEXT,
  DEFAULT_TECHNICAL_OBLIGATIONS_TEXT,
} from '@/lib/formatters'
import { logAuditEvent } from '@/lib/intelligenceStorage'

interface BudgetHeaderFormProps {
  budget: FullBudget
  onChange: (updated: FullBudget) => void
  onSaveObservations?: (newObservations: string) => void
  disabled?: boolean
  validationErrors?: Record<string, string>
}

export const BudgetHeaderForm: React.FC<BudgetHeaderFormProps> = ({
  budget,
  onChange,
  onSaveObservations,
  disabled = false,
  validationErrors = {},
}) => {
  const [obsInput, setObsInput] = React.useState<string>(budget.observations ?? '')
  const [isSavedBadgeVisible, setIsSavedBadgeVisible] = React.useState<boolean>(false)

  // Sincroniza estado local quando o budget externo mudar (ex.: troca de orçamento selecionado)
  React.useEffect(() => {
    setObsInput(budget.observations ?? '')
    setIsSavedBadgeVisible(false)
  }, [budget.id, budget.observations])

  const savedObs = budget.observations ?? ''
  const isDirty = obsInput !== savedObs

  const handleSaveObservations = () => {
    if (onSaveObservations) {
      onSaveObservations(obsInput)
    } else {
      onChange({
        ...budget,
        observations: obsInput,
      })
    }
    setIsSavedBadgeVisible(true)
  }

  const handleClientChange = (field: keyof ClientData, value: string) => {
    onChange({
      ...budget,
      client: {
        ...budget.client,
        [field]: value,
      },
    })
  }

  const handleWorkChange = (field: keyof WorkData, value: any) => {
    onChange({
      ...budget,
      work: {
        ...budget.work,
        [field]: value,
      },
    })
  }

  const handlePublicWorkChange = (field: keyof PublicWorkData, value: any) => {
    onChange({
      ...budget,
      publicWork: {
        ...budget.publicWork,
        [field]: value,
      },
    })
  }

  const currentRegime: TaxRegime =
    budget.chargesConfig?.taxRegime ||
    (budget.chargesConfig?.isRelieved ? 'com_desoneracao' : 'sem_desoneracao')

  const handleTaxRegimeChange = (regime: TaxRegime) => {
    const isRel = regime === 'com_desoneracao'
    onChange({
      ...budget,
      chargesConfig: {
        ...budget.chargesConfig,
        taxRegime: regime,
        isRelieved: isRel,
        simplesDasRate:
          regime === 'simples_nacional'
            ? (budget.chargesConfig?.simplesDasRate ?? 0)
            : budget.chargesConfig?.simplesDasRate,
      },
      bdiConfig: {
        ...budget.bdiConfig,
        taxes: {
          ...budget.bdiConfig.taxes,
          inssOrCprb: regime === 'com_desoneracao' ? 4.5 : 0.0,
          simplesDas:
            regime === 'simples_nacional'
              ? (budget.chargesConfig?.simplesDasRate ?? budget.bdiConfig.taxes?.simplesDas ?? 0)
              : undefined,
        },
      },
    })
  }

  const handleSimplesDasInputChange = (rate: number) => {
    const val = Math.max(0, rate)
    const tcuRecalc = calculateTcuBdi({
      administrationCentral: budget.bdiConfig.administrationCentral,
      risk: budget.bdiConfig.risk,
      insuranceAndGuarantee: budget.bdiConfig.insuranceAndGuarantee,
      financialExpenses: budget.bdiConfig.financialExpenses,
      profit: budget.bdiConfig.profit,
      taxesTotal: val,
    })

    onChange({
      ...budget,
      chargesConfig: {
        ...budget.chargesConfig,
        simplesDasRate: val,
      },
      bdiConfig: {
        ...budget.bdiConfig,
        calculatedBdi: tcuRecalc.bdiPercent,
        taxes: {
          ...budget.bdiConfig.taxes,
          simplesDas: val,
          totalTaxes: val,
        },
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* 0. TÍTULO E IDENTIFICAÇÃO GERAL DA PROPOSTA */}
      <div className="bg-white rounded-[16px] p-5 sm:p-7 shadow-[0_4px_24px_rgba(23,26,31,0.06)] border-2 border-[#294C87]/20 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#171A1F]/10 pb-3">
          <span className="p-2 rounded-lg bg-[#FF6B1F]/10 text-[#FF6B1F]">
            <FileText className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#171A1F]">
              Título & Identificação da Proposta
            </h3>
            <p className="text-xs text-[#171A1F]/60">
              Personalize o nome da proposta que estampará a capa e o cabeçalho oficial do PDF de
              entrega
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Título Oficial do Orçamento / Proposta Comercial *
            </label>
            <input
              type="text"
              disabled={disabled}
              value={budget.title ?? budget.work.name ?? ''}
              onChange={(e) => {
                const newTitle = e.target.value
                onChange({
                  ...budget,
                  title: newTitle,
                })
              }}
              placeholder="Ex.: Proposta de Reforma Comercial e Instalações Prediais"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-bold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
            />
            <span className="text-[11px] text-[#171A1F]/50 mt-1 block">
              Este título é impresso na capa, cabeçalhos do PDF e na listagem geral.
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Código / Referência CONCE
            </label>
            <input
              type="text"
              disabled={disabled}
              value={budget.code}
              onChange={(e) => onChange({ ...budget, code: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-mono font-bold text-[#294C87] focus:outline-none focus:border-[#294C87]"
            />
            <span className="text-[11px] text-[#171A1F]/50 mt-1 block">
              Identificador único de auditoria interna.
            </span>
          </div>
        </div>
      </div>

      {/* 1. SEÇÃO DE DADOS DO CLIENTE */}
      <div className="bg-white rounded-[16px] p-5 sm:p-7 shadow-[0_4px_24px_rgba(23,26,31,0.06)] border border-[#171A1F]/10 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#171A1F]/10 pb-3">
          <span className="p-2 rounded-lg bg-[#294C87]/10 text-[#294C87]">
            <User className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#171A1F]">
              1. Identificação do Cliente / Contratante
            </h3>
            <p className="text-xs text-[#171A1F]/60">
              Dados cadastrais e fiscais da pessoa física ou jurídica
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Nome do Cliente / Razão Social *
            </label>
            <input
              type="text"
              disabled={disabled}
              value={budget.client.name}
              onChange={(e) => handleClientChange('name', e.target.value)}
              placeholder="Ex: Construtora Exemplo S/A ou Dr. Roberto Silva"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none ${
                validationErrors['client.name']
                  ? 'border-red-500 bg-red-50/50'
                  : 'border-[#171A1F]/20 bg-[#F8F9FA] focus:border-[#294C87]'
              }`}
            />
            {validationErrors['client.name'] && (
              <span className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {validationErrors['client.name']}
              </span>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              CPF ou CNPJ <span className="text-[#171A1F]/50 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              disabled={disabled}
              value={budget.client.document}
              onChange={(e) => handleClientChange('document', e.target.value)}
              placeholder="00.000.000/0001-00 (opcional)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-mono focus:outline-none focus:border-[#294C87]"
            />
            <span className="text-[10px] text-[#171A1F]/50 mt-1 block">
              Não obrigatório para emissão de proposta comercial preliminar.
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Telefone / WhatsApp
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-[#171A1F]/40 absolute left-3 top-3" />
              <input
                type="text"
                disabled={disabled}
                value={budget.client.phone}
                onChange={(e) => handleClientChange('phone', e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Endereço Completo do Cliente
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#171A1F]/40 absolute left-3 top-3" />
              <input
                type="text"
                disabled={disabled}
                value={budget.client.address}
                onChange={(e) => handleClientChange('address', e.target.value)}
                placeholder="Rua, número, complemento, bairro"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">Cidade</label>
            <input
              type="text"
              disabled={disabled}
              value={budget.client.city}
              onChange={(e) => handleClientChange('city', e.target.value)}
              placeholder="São Paulo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">Estado (UF)</label>
            <select
              disabled={disabled}
              value={budget.client.state || 'SP'}
              onChange={(e) => handleClientChange('state', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#294C87]"
            >
              {BRAZIL_STATES_LIST.map((st) => (
                <option key={st.uf} value={st.uf}>
                  {st.uf} — {st.stateName}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-[#171A1F] block mb-1">E-mail de Contato</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#171A1F]/40 absolute left-3 top-3" />
              <input
                type="email"
                disabled={disabled}
                value={budget.client.email}
                onChange={(e) => handleClientChange('email', e.target.value)}
                placeholder="contato@cliente.com.br"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEÇÃO DE DADOS DA OBRA */}
      <div className="bg-white rounded-[16px] p-5 sm:p-7 shadow-[0_4px_24px_rgba(23,26,31,0.06)] border border-[#171A1F]/10 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#171A1F]/10 pb-3">
          <span className="p-2 rounded-lg bg-[#FF6B1F]/10 text-[#FF6B1F]">
            <Building className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#171A1F]">
              2. Especificações da Obra / Empreendimento
            </h3>
            <p className="text-xs text-[#171A1F]/60">
              Local de execução, prazos contratuais e características construtivas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-[#171A1F] block mb-1">Nome da Obra *</label>
            <input
              type="text"
              disabled={disabled}
              value={budget.work.name}
              onChange={(e) => handleWorkChange('name', e.target.value)}
              placeholder="Ex: Reforma Comercial Paulista ou Edifício Residencial Jardins"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold focus:outline-none ${
                validationErrors['work.name']
                  ? 'border-red-500 bg-red-50/50'
                  : 'border-[#171A1F]/20 bg-[#F8F9FA] focus:border-[#294C87]'
              }`}
            />
            {validationErrors['work.name'] && (
              <span className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {validationErrors['work.name']}
              </span>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Local / Endereço Completo da Obra *
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#FF6B1F] absolute left-3 top-3" />
              <input
                type="text"
                disabled={disabled}
                value={budget.work.address}
                onChange={(e) => handleWorkChange('address', e.target.value)}
                placeholder="Ex.: Rua das Flores, 450 - Bairro Centro"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#294C87]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">Cidade da Obra *</label>
            <input
              type="text"
              disabled={disabled}
              value={budget.work.city}
              onChange={(e) => handleWorkChange('city', e.target.value)}
              placeholder="Porto Alegre"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#294C87]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Estado da Obra (UF) *
            </label>
            <select
              disabled={disabled}
              value={budget.work.state || 'RS'}
              onChange={(e) => handleWorkChange('state', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#294C87]"
            >
              {BRAZIL_STATES_LIST.map((st) => (
                <option key={st.uf} value={st.uf}>
                  {st.uf} — {st.stateName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Data de Início Prevista *
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-[#171A1F]/40 absolute left-3 top-3" />
              <input
                type="date"
                disabled={disabled}
                value={budget.work.startDate}
                onChange={(e) => handleWorkChange('startDate', e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Prazo Contratual *
            </label>
            <div className="flex gap-1.5 items-center">
              <div className="relative flex-1 min-w-0">
                <Clock className="w-3.5 h-3.5 text-[#171A1F]/40 absolute left-3 top-3" />
                <input
                  type="number"
                  min="1"
                  disabled={disabled}
                  value={getBudgetDeadline(budget.work).value}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1
                    const currentUnit = budget.work.deadlineUnit || 'meses'
                    const prevEffective = getBudgetDeadline(budget.work)
                    const prevFormatted = formatBudgetDeadline(budget.work)
                    const monthsEquivalent =
                      currentUnit === 'meses'
                        ? val
                        : currentUnit === 'semanas'
                          ? Math.max(1, Math.round(val / 4.33))
                          : Math.max(1, Math.round(val / 30))
                    const newWork = {
                      ...budget.work,
                      deadlineValue: val,
                      deadlineUnit: currentUnit,
                      deadlineMonths: monthsEquivalent,
                    }
                    const newFormatted = formatBudgetDeadline(newWork)

                    if (prevEffective.value !== val) {
                      logAuditEvent({
                        budgetId: budget.id,
                        action: 'edicao_prazo',
                        title: 'Prazo Contratual Alterado',
                        details: `Prazo alterado de "${prevFormatted}" para "${newFormatted}".`,
                        oldValue: prevFormatted,
                        newValue: newFormatted,
                        userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                        metadata: {
                          field: 'deadlineValue',
                          previousValue: prevEffective.value,
                          newValue: val,
                          unit: currentUnit,
                          signedBy: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                        },
                      })
                    }

                    onChange({
                      ...budget,
                      work: newWork,
                    })
                  }}
                  className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-bold focus:outline-none focus:border-[#294C87]"
                  placeholder="Ex: 3"
                />
              </div>
              <select
                disabled={disabled}
                value={budget.work.deadlineUnit || 'meses'}
                onChange={(e) => {
                  const newUnit = e.target.value as DeadlineUnit
                  const currentVal = getBudgetDeadline(budget.work).value
                  const prevUnit = budget.work.deadlineUnit || 'meses'
                  const prevFormatted = formatBudgetDeadline(budget.work)
                  const monthsEquivalent =
                    newUnit === 'meses'
                      ? currentVal
                      : newUnit === 'semanas'
                        ? Math.max(1, Math.round(currentVal / 4.33))
                        : Math.max(1, Math.round(currentVal / 30))
                  const newWork = {
                    ...budget.work,
                    deadlineValue: currentVal,
                    deadlineUnit: newUnit,
                    deadlineMonths: monthsEquivalent,
                  }
                  const newFormatted = formatBudgetDeadline(newWork)

                  if (prevUnit !== newUnit) {
                    logAuditEvent({
                      budgetId: budget.id,
                      action: 'edicao_prazo',
                      title: 'Unidade do Prazo Contratual Alterada',
                      details: `Unidade de prazo alterada de "${prevUnit}" para "${newUnit}" (${prevFormatted} → ${newFormatted}).`,
                      oldValue: prevFormatted,
                      newValue: newFormatted,
                      userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                      metadata: {
                        field: 'deadlineUnit',
                        previousUnit: prevUnit,
                        newUnit,
                        value: currentVal,
                        signedBy: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                      },
                    })
                  }

                  onChange({
                    ...budget,
                    work: newWork,
                  })
                }}
                className="w-28 sm:w-32 px-2.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-semibold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
                title="Unidade de tempo do prazo contratual"
              >
                <option value="dias">dias</option>
                <option value="dias úteis">dias úteis</option>
                <option value="semanas">semanas</option>
                <option value="meses">meses</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Área Total Construída (m²)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={disabled}
              value={budget.work.totalAreaM2 || ''}
              onChange={(e) => handleWorkChange('totalAreaM2', parseFloat(e.target.value) || 0)}
              placeholder="Ex: 1250,50"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Descrição do Objeto & Memorial Resumido
            </label>
            <textarea
              rows={2}
              disabled={disabled}
              value={budget.work.description}
              onChange={(e) => handleWorkChange('description', e.target.value)}
              placeholder="Descreva as características técnicas, sistemas estruturais e escopo principal dos serviços..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
            />
          </div>
        </div>
      </div>

      {/* 3. SEÇÃO DE FORMA DE PAGAMENTO & CONDIÇÕES COMERCIAIS */}
      <div className="bg-white rounded-[16px] p-5 sm:p-7 shadow-[0_4px_24px_rgba(23,26,31,0.06)] border border-[#171A1F]/10 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#171A1F]/10 pb-3">
          <span className="p-2 rounded-lg bg-[#294C87]/10 text-[#294C87]">
            <CreditCard className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#171A1F]">
              3. Forma de Pagamento & Condições Comerciais da Proposta
            </h3>
            <p className="text-xs text-[#171A1F]/60">
              Defina como o cliente efetuará o pagamento (sinal, parcelas, marcos de medição, prazos
              e validade da proposta)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Forma / Condições de Pagamento *
            </label>
            <textarea
              rows={3}
              disabled={disabled}
              value={
                budget.paymentTerms ??
                '30% de entrada; 30% na entrega dos projetos base; 20% após montagem das estruturas metálicas; saldo após vistoria de entrega.'
              }
              onChange={(e) => onChange({ ...budget, paymentTerms: e.target.value })}
              placeholder="Ex.: 30% de entrada; 30% na entrega dos projetos base; 20% após montagem das estruturas metálicas; saldo após vistoria de entrega."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#294C87]"
            />
            {/* Atalhos rápidos para preenchimento ágil */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-[#171A1F]/60">Sugestões rápidas:</span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...budget,
                    paymentTerms:
                      '30% de entrada; 30% na entrega dos projetos base; 20% após montagem das estruturas metálicas; saldo após vistoria de entrega.',
                  })
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-[#FF6B1F]/15 text-[#FF6B1F] hover:bg-[#FF6B1F]/25 font-bold border border-[#FF6B1F]/30"
                title="Padrão do Engenheiro Edenir Souza da Rosa"
              >
                ★ 30% entrada + 30% projetos + 20% estruturas + saldo vistoria
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...budget,
                    paymentTerms:
                      '30% de entrada na contratação + saldo parcelado em 3x conforme medições mensais de obra.',
                  })
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-[#294C87]/10 text-[#294C87] hover:bg-[#294C87]/20 font-semibold"
              >
                30% entrada + 3 medições
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...budget,
                    paymentTerms:
                      'Medições quinzenais com base no avanço físico comprovado; liquidação em até 10 dias.',
                  })
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-[#294C87]/10 text-[#294C87] hover:bg-[#294C87]/20 font-semibold"
              >
                Medições quinzenais
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...budget,
                    paymentTerms:
                      '50% de entrada no início das etapas preliminares + 50% na conclusão e entrega técnica.',
                  })
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-[#294C87]/10 text-[#294C87] hover:bg-[#294C87]/20 font-semibold"
              >
                50% entrada + 50% entrega
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#171A1F] block">
                  Validade da Proposta
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...budget,
                        validityDays: 5,
                        validityDaysType: 'uteis',
                      })
                    }
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${
                      budget.validityDays === 5 && budget.validityDaysType === 'uteis'
                        ? 'bg-[#FF6B1F] text-white'
                        : 'bg-[#171A1F]/5 text-[#171A1F]/70 hover:bg-[#171A1F]/10'
                    }`}
                  >
                    5 dias úteis
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...budget,
                        validityDaysType:
                          budget.validityDaysType === 'uteis' ? 'corridos' : 'uteis',
                      })
                    }
                    className="text-[9px] px-1.5 py-0.5 rounded bg-[#294C87]/10 text-[#294C87] font-semibold"
                  >
                    Alternar ({budget.validityDaysType === 'uteis' ? 'Úteis' : 'Corridos'})
                  </button>
                </div>
              </div>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-[#171A1F]/40 absolute left-3 top-3" />
                <input
                  type="number"
                  min="1"
                  max="180"
                  disabled={disabled}
                  value={budget.validityDays ?? 5}
                  onChange={(e) =>
                    onChange({ ...budget, validityDays: parseInt(e.target.value, 10) || 5 })
                  }
                  className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-bold focus:outline-none focus:border-[#294C87]"
                />
                <span className="absolute right-3 top-2.5 text-xs font-semibold text-[#294C87]">
                  {budget.validityDaysType === 'uteis' ? 'dias úteis' : 'dias corridos'}
                </span>
              </div>
              <span className="text-[10px] text-[#171A1F]/50 mt-1 block">
                Solicitado: 5 dias úteis (ou selecione 15/30 dias).
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Responsável Técnico
              </label>
              <input
                type="text"
                disabled
                value={budget.author || 'Eng. Edenir Souza da Rosa - CREA/RS-252397'}
                className="w-full px-3 py-2 rounded-xl border border-[#171A1F]/10 bg-[#171A1F]/5 text-xs font-bold text-[#171A1F]/80"
              />
            </div>
          </div>

          {/* Campo de Prazo de Execução detalhado com sugestão rápida de 1 clique */}
          <div className="sm:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
              <label className="text-xs font-bold text-[#171A1F] block">
                Prazo de Execução (Condição Técnica / Escopo de Gestão)
              </label>
              <span className="text-[10px] text-[#171A1F]/60">
                Consta na proposta e PDF oficial na seção de condições
              </span>
            </div>
            <textarea
              rows={2}
              disabled={disabled}
              value={
                budget.executionDeadline ??
                budget.work?.executionDeadline ??
                'PRAZO DE EXECUÇÃO: PROJETOS 15 DIAS UTEIS APOS ACEITE DA PROPOSTA E ASSINATURA DO CONTRATO, E DA EXECUÇÃO É UM ITEM DO ESCOPO DE GESTÃO POIS ESSE PRAZO DEPENDE DA CONTRATAÇÃO DA EMPREZA PARA PRODUZIR E MONTAR A ESTRUTURA METÁLICA'
              }
              onChange={(e) => {
                const val = e.target.value
                onChange({
                  ...budget,
                  executionDeadline: val,
                  work: {
                    ...budget.work,
                    executionDeadline: val,
                  },
                })
              }}
              placeholder="Descreva o prazo de projetos, contratação e etapas executivas..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#294C87]"
            />
            {/* Botão de sugestão rápida pronta com 1 clique */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-[#171A1F]/60">
                Sugestão rápida (1 clique):
              </span>
              <button
                type="button"
                onClick={() => {
                  const sugestao =
                    'PRAZO DE EXECUÇÃO: PROJETOS 15 DIAS UTEIS APOS ACEITE DA PROPOSTA E ASSINATURA DO CONTRATO, E DA EXECUÇÃO É UM ITEM DO ESCOPO DE GESTÃO POIS ESSE PRAZO DEPENDE DA CONTRATAÇÃO DA EMPREZA PARA PRODUZIR E MONTAR A ESTRUTURA METÁLICA'
                  onChange({
                    ...budget,
                    executionDeadline: sugestao,
                    work: {
                      ...budget.work,
                      executionDeadline: sugestao,
                    },
                  })
                }}
                className="text-[10px] px-2.5 py-1 rounded-md bg-[#294C87]/10 text-[#294C87] hover:bg-[#294C87]/20 font-bold border border-[#294C87]/30"
              >
                Projetos 15 dias úteis + Gestão de estrutura metálica
              </button>
              <button
                type="button"
                onClick={() => {
                  const sugestao =
                    'Projetos executivos em até 20 dias úteis após assinatura contratual; execução física de acordo com cronograma físico-financeiro aprovado.'
                  onChange({
                    ...budget,
                    executionDeadline: sugestao,
                    work: {
                      ...budget.work,
                      executionDeadline: sugestao,
                    },
                  })
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-[#171A1F]/5 text-[#171A1F]/70 hover:bg-[#171A1F]/10 font-medium"
              >
                Projetos 20 dias úteis + cronograma
              </button>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Observações Comerciais & Notas Complementares (Opcional)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={budget.commercialNotes ?? ''}
              onChange={(e) => onChange({ ...budget, commercialNotes: e.target.value })}
              placeholder="Ex.: Preços com tributação pelo Simples Nacional inclusa; despesas com fornecimento de água/energia da obra por conta do contratante."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
            />
          </div>

          {/* Campo Editável 1: Garantia e Responsabilidade Técnica */}
          <div className="sm:col-span-3 pt-2 border-t border-[#171A1F]/10 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#294C87]" />
                Garantia e Responsabilidade Técnica
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#171A1F]/60">
                  Exibido na Proposta Comercial / Valor Global
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const prevVal =
                      budget.technicalResponsibilityText ??
                      budget.work?.technicalResponsibilityText ??
                      DEFAULT_TECHNICAL_RESPONSIBILITY_TEXT
                    if (prevVal !== DEFAULT_TECHNICAL_RESPONSIBILITY_TEXT) {
                      logAuditEvent({
                        budgetId: budget.id,
                        action: 'edicao_garantia',
                        title: 'Garantia e Responsabilidade Técnica Restaurada',
                        details:
                          'Cláusula restaurada para o texto padrão oficial da CONCE (ART CREA/RS + Art. 618 Código Civil).',
                        oldValue: prevVal,
                        newValue: DEFAULT_TECHNICAL_RESPONSIBILITY_TEXT,
                        userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                        metadata: {
                          field: 'technicalResponsibilityText',
                          restoredDefault: true,
                          signedBy: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                        },
                      })
                    }
                    onChange({
                      ...budget,
                      technicalResponsibilityText: DEFAULT_TECHNICAL_RESPONSIBILITY_TEXT,
                      work: {
                        ...budget.work,
                        technicalResponsibilityText: DEFAULT_TECHNICAL_RESPONSIBILITY_TEXT,
                      },
                    })
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#294C87]/10 text-[#294C87] hover:bg-[#294C87]/20 font-bold transition-colors"
                  title="Restaurar texto padrão da CONCE Engenharia"
                >
                  Restaurar Padrão
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              disabled={disabled}
              value={
                budget.technicalResponsibilityText ??
                budget.work?.technicalResponsibilityText ??
                DEFAULT_TECHNICAL_RESPONSIBILITY_TEXT
              }
              onChange={(e) => {
                const val = e.target.value
                onChange({
                  ...budget,
                  technicalResponsibilityText: val,
                  work: {
                    ...budget.work,
                    technicalResponsibilityText: val,
                  },
                })
              }}
              placeholder={DEFAULT_TECHNICAL_RESPONSIBILITY_TEXT}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-medium leading-relaxed focus:outline-none focus:border-[#294C87]"
            />
            <p className="text-[10.5px] text-[#171A1F]/60">
              Caso vazio, o sistema aplicará automaticamente a garantia legal quinquenal do Art. 618
              do Código Civil e ART junto ao CREA/RS sob responsabilidade do Eng. Edenir Souza da
              Rosa.
            </p>
          </div>

          {/* Campo Editável 2: Garantia e Obrigações Técnicas */}
          <div className="sm:col-span-3 pt-2 border-t border-[#171A1F]/10 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold text-[#171A1F] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF6B1F]" />
                Garantia e Obrigações Técnicas
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#171A1F]/60">
                  Exibido nos formatos Simplificado, Etapas e Completo
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const prevVal =
                      budget.technicalObligationsText ??
                      budget.work?.technicalObligationsText ??
                      DEFAULT_TECHNICAL_OBLIGATIONS_TEXT
                    if (prevVal !== DEFAULT_TECHNICAL_OBLIGATIONS_TEXT) {
                      logAuditEvent({
                        budgetId: budget.id,
                        action: 'edicao_garantia',
                        title: 'Garantia e Obrigações Técnicas Restaurada',
                        details:
                          'Cláusula restaurada para o texto padrão oficial da CONCE (ART CREA/RS + Art. 618 Código Civil + ABNT/NRs).',
                        oldValue: prevVal,
                        newValue: DEFAULT_TECHNICAL_OBLIGATIONS_TEXT,
                        userName: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                        metadata: {
                          field: 'technicalObligationsText',
                          restoredDefault: true,
                          signedBy: 'Eng. Edenir Souza da Rosa - CREA/RS-252397',
                        },
                      })
                    }
                    onChange({
                      ...budget,
                      technicalObligationsText: DEFAULT_TECHNICAL_OBLIGATIONS_TEXT,
                      work: {
                        ...budget.work,
                        technicalObligationsText: DEFAULT_TECHNICAL_OBLIGATIONS_TEXT,
                      },
                    })
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#FF6B1F]/10 text-[#FF6B1F] hover:bg-[#FF6B1F]/20 font-bold transition-colors"
                  title="Restaurar texto padrão da CONCE Engenharia"
                >
                  Restaurar Padrão
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              disabled={disabled}
              value={
                budget.technicalObligationsText ??
                budget.work?.technicalObligationsText ??
                DEFAULT_TECHNICAL_OBLIGATIONS_TEXT
              }
              onChange={(e) => {
                const val = e.target.value
                onChange({
                  ...budget,
                  technicalObligationsText: val,
                  work: {
                    ...budget.work,
                    technicalObligationsText: val,
                  },
                })
              }}
              placeholder={DEFAULT_TECHNICAL_OBLIGATIONS_TEXT}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-medium leading-relaxed focus:outline-none focus:border-[#294C87]"
            />
            <p className="text-[10.5px] text-[#171A1F]/60">
              Itens contratuais de garantia quinquenal (Art. 618 Código Civil), emissão de ART
              CREA/RS e cumprimento irrestrito às normas da ABNT e NRs.
            </p>
          </div>

          {/* 1.6 OBSERVAÇÕES DO ORÇAMENTO (DESTAQUE PUMPKIN ORANGE #FF6B1F) */}
          <div className="border-t border-[#171A1F]/10 pt-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs sm:text-sm font-extrabold text-[#FF6B1F] flex items-center gap-2">
                <span>Observações do Orçamento</span>
              </label>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Badge de estado */}
                {isDirty ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Alterações não salvas</span>
                  </span>
                ) : isSavedBadgeVisible || savedObs ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Salvo no orçamento</span>
                  </span>
                ) : null}

                {/* Botão dedicado Salvar Observações */}
                <button
                  type="button"
                  disabled={disabled || !isDirty}
                  onClick={handleSaveObservations}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isDirty && !disabled
                      ? 'bg-[#FF6B1F] hover:bg-[#e55d17] text-white cursor-pointer active:scale-95 shadow-sm'
                      : 'bg-[#171A1F]/10 text-[#171A1F]/40 cursor-not-allowed'
                  }`}
                  title={isDirty ? 'Gravar observações no orçamento' : 'Nenhuma alteração pendente'}
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span>Salvar Observações</span>
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              disabled={disabled}
              value={obsInput}
              onChange={(e) => {
                setObsInput(e.target.value)
                setIsSavedBadgeVisible(false)
              }}
              placeholder="Ex.: Os itens 4, 5 e 6 serão fornecidos pelo cliente."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-medium leading-relaxed focus:outline-none focus:border-[#FF6B1F] focus:ring-1 focus:ring-[#FF6B1F]/30 transition-all font-sans"
            />
            <p className="text-[10.5px] text-[#171A1F]/60">
              Observações gerais, ressalvas e condições especiais de fornecimento. São gravadas
              exclusivamente via botão &quot;Salvar Observações&quot; e impressas no relatório em
              PDF.
            </p>
          </div>
        </div>
      </div>

      {/* 2.1 REGIME TRIBUTÁRIO DA EMPRESA EXECUTORA */}
      <div className="bg-white rounded-[16px] p-5 sm:p-7 shadow-[0_4px_24px_rgba(23,26,31,0.06)] border border-[#171A1F]/10 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#171A1F]/10 pb-3">
          <span className="p-2 rounded-lg bg-[#294C87]/10 text-[#294C87]">
            <Briefcase className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[#171A1F]">
                Regime Tributário da Empresa Executora
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#FF6B1F] text-white">
                CONCE: Simples Nacional
              </span>
            </div>
            <p className="text-xs text-[#171A1F]/60">
              Define o recolhimento dos tributos do BDI (DAS unificado ou PIS/COFINS/ISS/CPRB) e a
              base dos encargos sociais trabalhistas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Opção Simples Nacional */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleTaxRegimeChange('simples_nacional')}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
              currentRegime === 'simples_nacional'
                ? 'bg-[#294C87] text-white border-[#294C87] shadow-md ring-2 ring-[#FF6B1F]'
                : 'bg-[#F8F9FA] text-[#171A1F] border-[#171A1F]/15 hover:bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-bold text-sm">Simples Nacional</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-[#FF6B1F] text-white">
                  Padrão CONCE
                </span>
              </div>
              <p
                className={`text-xs ${
                  currentRegime === 'simples_nacional' ? 'text-white/80' : 'text-[#171A1F]/60'
                }`}
              >
                Conta Simples: sem encargos trabalhistas (0,00%). Cobrança exclusiva pelo DAS
                manual.
              </p>
            </div>
          </button>

          {/* Opção Sem Desoneração */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleTaxRegimeChange('sem_desoneracao')}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
              currentRegime === 'sem_desoneracao'
                ? 'bg-[#294C87] text-white border-[#294C87] shadow-md'
                : 'bg-[#F8F9FA] text-[#171A1F] border-[#171A1F]/15 hover:bg-white'
            }`}
          >
            <div>
              <div className="font-bold text-sm mb-1">Sem Desoneração</div>
              <p
                className={`text-xs ${
                  currentRegime === 'sem_desoneracao' ? 'text-white/80' : 'text-[#171A1F]/60'
                }`}
              >
                Lucro Presumido/Real com INSS patronal de 20% integral na folha de pagamento (CLT).
              </p>
            </div>
          </button>

          {/* Opção Com Desoneração */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleTaxRegimeChange('com_desoneracao')}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
              currentRegime === 'com_desoneracao'
                ? 'bg-[#FF6B1F] text-white border-[#FF6B1F] shadow-md'
                : 'bg-[#F8F9FA] text-[#171A1F] border-[#171A1F]/15 hover:bg-white'
            }`}
          >
            <div>
              <div className="font-bold text-sm mb-1">Com Desoneração</div>
              <p
                className={`text-xs ${
                  currentRegime === 'com_desoneracao' ? 'text-white/80' : 'text-[#171A1F]/60'
                }`}
              >
                Lei 12.546/2011: substitui INSS patronal pela CPRB de 4,5% sobre o faturamento.
              </p>
            </div>
          </button>
        </div>

        {currentRegime === 'simples_nacional' && (
          <div className="p-3.5 rounded-xl bg-[#294C87]/5 border border-[#294C87]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="text-xs text-[#171A1F]/80">
              <span className="font-bold text-[#294C87] block mb-0.5">
                Alíquota Efetiva do DAS no BDI (Único Tributo Incidente)
              </span>
              <span className="text-[#171A1F]/70">
                No Simples Nacional, os encargos trabalhistas são zerados (R$ 0,00). O único
                percentual incidente é a alíquota efetiva do DAS adicionada manualmente, atuando
                como o tributo (T) da fórmula TCU.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-bold text-[#171A1F]">Alíquota DAS:</label>
              <div className="relative w-32">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="40"
                  disabled={disabled}
                  placeholder="0.00"
                  value={
                    (budget.chargesConfig?.simplesDasRate ?? 0) > 0
                      ? budget.chargesConfig?.simplesDasRate
                      : ''
                  }
                  onChange={(e) => handleSimplesDasInputChange(parseFloat(e.target.value) || 0)}
                  className="w-full pl-3 pr-7 py-1.5 rounded-lg bg-white border border-[#171A1F]/20 text-xs font-bold text-[#171A1F] focus:outline-none focus:border-[#294C87]"
                />
                <span className="absolute right-2.5 top-2 text-[11px] text-[#171A1F]/40 font-bold">
                  %
                </span>
              </div>
              {(budget.chargesConfig?.simplesDasRate ?? 0) === 0 && (
                <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold whitespace-nowrap">
                  Preencher manualmente
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. SEÇÃO MODO OBRAS PÚBLICAS (LICITAÇÕES / CONTRATOS) */}
      <div
        className={`rounded-[16px] p-5 sm:p-7 shadow-[0_4px_24px_rgba(23,26,31,0.06)] border transition-all ${
          budget.publicWork.enabled
            ? 'bg-white border-[#294C87]/40 ring-2 ring-[#294C87]/10'
            : 'bg-white/60 border-[#171A1F]/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#171A1F]/10 pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`p-2 rounded-lg ${
                budget.publicWork.enabled
                  ? 'bg-[#294C87] text-white'
                  : 'bg-[#171A1F]/10 text-[#171A1F]/60'
              }`}
            >
              <Landmark className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#171A1F]">
                  3. Modo Obras Públicas & Licitações
                </h3>
                {budget.publicWork.enabled && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF6B1F] text-white uppercase">
                    Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-[#171A1F]/60">
                Parâmetros para atendimento à Lei 14.133/2021, auditoria do TCU e referências
                SINAPI/SICRO
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs font-bold text-[#171A1F]">Ativar Modo Obras Públicas:</span>
            <input
              type="checkbox"
              disabled={disabled}
              checked={budget.publicWork.enabled}
              onChange={(e) => handlePublicWorkChange('enabled', e.target.checked)}
              className="w-5 h-5 accent-[#FF6B1F] rounded cursor-pointer"
            />
          </label>
        </div>

        {budget.publicWork.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 animate-fade-in">
            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Número do Edital / Licitação *
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-[#171A1F]/40 absolute left-3 top-3" />
                <input
                  type="text"
                  disabled={disabled}
                  value={budget.publicWork.tenderNumber}
                  onChange={(e) => handlePublicWorkChange('tenderNumber', e.target.value)}
                  placeholder="Ex: Concorrência Eletrônica nº 045/2025"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#294C87]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Órgão Licitante / Contratante *
              </label>
              <input
                type="text"
                disabled={disabled}
                value={budget.publicWork.agency}
                onChange={(e) => handlePublicWorkChange('agency', e.target.value)}
                placeholder="Ex: DER-SP, FDE, Prefeitura Municipal"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Modalidade de Licitação
              </label>
              <select
                disabled={disabled}
                value={budget.publicWork.modality}
                onChange={(e) => handlePublicWorkChange('modality', e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#294C87]"
              >
                <option value="Concorrência">Concorrência (Lei 14.133)</option>
                <option value="Pregão Eletrônico">Pregão Eletrônico</option>
                <option value="Tomada de Preços">Tomada de Preços</option>
                <option value="Convite">Convite</option>
                <option value="RDC">RDC</option>
                <option value="Diálogo Competitivo">Diálogo Competitivo</option>
                <option value="Dispensa/Inexigibilidade">Dispensa / Inexigibilidade</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Mês Base SINAPI de Referência *
              </label>
              <input
                type="text"
                disabled={disabled}
                value={budget.publicWork.sinapiReferenceMonth}
                onChange={(e) => handlePublicWorkChange('sinapiReferenceMonth', e.target.value)}
                placeholder="Ex: 04/2025 com desoneração"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-mono focus:outline-none focus:border-[#294C87]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Número do Contrato Administrativo
              </label>
              <input
                type="text"
                disabled={disabled}
                value={budget.publicWork.contractNumber}
                onChange={(e) => handlePublicWorkChange('contractNumber', e.target.value)}
                placeholder="CT nº 098/2025"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-[#171A1F] block mb-1">
                Referência Adicional SICRO / DNIT
              </label>
              <input
                type="text"
                disabled={disabled}
                value={budget.publicWork.sicroReferenceMonth || ''}
                onChange={(e) => handlePublicWorkChange('sicroReferenceMonth', e.target.value)}
                placeholder="Ex: 03/2025 - Infraestrutura Rodoviária"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
