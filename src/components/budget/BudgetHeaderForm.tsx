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
  FileCheck2,
  Calendar,
  Clock,
  MapPin,
  Mail,
  Phone,
  Hash,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { ClientData, FullBudget, PublicWorkData, TaxRegime, WorkData } from '@/types/budgetEngine'
import { BRAZIL_STATES_LIST } from '@/lib/chargesData'
import { Briefcase } from 'lucide-react'

interface BudgetHeaderFormProps {
  budget: FullBudget
  onChange: (updated: FullBudget) => void
  disabled?: boolean
  validationErrors?: Record<string, string>
}

export const BudgetHeaderForm: React.FC<BudgetHeaderFormProps> = ({
  budget,
  onChange,
  disabled = false,
  validationErrors = {},
}) => {
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
    onChange({
      ...budget,
      chargesConfig: {
        ...budget.chargesConfig,
        simplesDasRate: val,
      },
      bdiConfig: {
        ...budget.bdiConfig,
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
            <label className="text-xs font-bold text-[#171A1F] block mb-1">CPF ou CNPJ *</label>
            <input
              type="text"
              disabled={disabled}
              value={budget.client.document}
              onChange={(e) => handleClientChange('document', e.target.value)}
              placeholder="00.000.000/0001-00"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-mono focus:outline-none ${
                validationErrors['client.document']
                  ? 'border-red-500 bg-red-50/50'
                  : 'border-[#171A1F]/20 bg-[#F8F9FA] focus:border-[#294C87]'
              }`}
            />
            {validationErrors['client.document'] && (
              <span className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {validationErrors['client.document']}
              </span>
            )}
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
              Local / Endereço da Obra *
            </label>
            <input
              type="text"
              disabled={disabled}
              value={budget.work.address}
              onChange={(e) => handleWorkChange('address', e.target.value)}
              placeholder="Avenida Paulista, 1000 - Bela Vista"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm focus:outline-none focus:border-[#294C87]"
            />
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
              Prazo Contratual (Meses) *
            </label>
            <div className="relative">
              <Clock className="w-3.5 h-3.5 text-[#171A1F]/40 absolute left-3 top-3" />
              <input
                type="number"
                min="1"
                disabled={disabled}
                value={budget.work.deadlineMonths}
                onChange={(e) => handleWorkChange('deadlineMonths', parseInt(e.target.value) || 1)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-bold focus:outline-none focus:border-[#294C87]"
              />
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

          <div>
            <label className="text-xs font-bold text-[#171A1F] block mb-1">
              Código / Referência CONCE
            </label>
            <input
              type="text"
              disabled={disabled}
              value={budget.code}
              onChange={(e) => onChange({ ...budget, code: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171A1F]/20 bg-[#F8F9FA] text-xs sm:text-sm font-mono font-bold text-[#294C87] focus:outline-none"
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
