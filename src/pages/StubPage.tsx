import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Hammer,
  ArrowLeft,
  FileSpreadsheet,
  Calculator,
  ShoppingBag,
  Clock,
  Sparkles,
} from 'lucide-react'
import { ConceLogo } from '@/components/ConceLogo'

interface StubModuleProps {
  moduleName?: string
  moduleDescription?: string
}

const moduleConfigs: Record<
  string,
  { title: string; desc: string; icon: any; plannedFeatures: string[] }
> = {
  orcamentos: {
    title: 'Módulo de Orçamentos',
    desc: 'Criação e edição paramétrica de propostas, quantitativos e cronogramas físico-financeiros.',
    icon: FileSpreadsheet,
    plannedFeatures: [
      'Importação de planilhas Excel / SINAPI / SICRO',
      'Cálculo automatizado de BDI e encargos sociais',
      'Versionamento de propostas com memorial descritivo',
      'Exportação em PDF personalizada com a marca CONCE',
    ],
  },
  composicoes: {
    title: 'Banco de Composições Unitárias (CPU)',
    desc: 'Catálogo de insumos, serviços, coeficientes de produtividade e bases de custos de referência.',
    icon: Calculator,
    plannedFeatures: [
      'Integração oficial com tabelas SINAPI e TCPO atualizadas',
      'Composições próprias personalizadas da CONCE',
      'Desoneração da folha e leis sociais parametrizáveis',
      'Apropriação de rendimento de equipes e maquinário',
    ],
  },
  cotacoes: {
    title: 'Módulo de Cotações de Insumos',
    desc: 'Mapa de cotações com fornecedores, equalização técnica de propostas e curvas de negociação.',
    icon: ShoppingBag,
    plannedFeatures: [
      'Disparo de cotações por e-mail e portal de fornecedores',
      'Equalização automática de fretes, prazos e condições de pagamento',
      'Histórico de preços praticados por região',
      'Alimentação direta dos itens de Classe A da Curva ABC',
    ],
  },
}

export const StubPage: React.FC<StubModuleProps> = () => {
  const location = useLocation()
  const path = location.pathname.replace('/', '').toLowerCase()

  const config = moduleConfigs[path] || {
    title: 'Módulo em Desenvolvimento',
    desc: 'Esta funcionalidade faz parte do roadmap do Sistema de Orçamento de Obra da CONCE.',
    icon: Hammer,
    plannedFeatures: [
      'Integração nativa com o Dashboard Gerencial',
      'Relatórios analíticos por centro de custo',
      'Fluxo de aprovação em múltiplos níveis',
      'Auditoria completa de alterações e cálculos',
    ],
  }

  const Icon = config.icon

  return (
    <div className="py-8 sm:py-12 animate-fade-in flex flex-col items-center">
      <div className="w-full max-w-3xl bg-white rounded-[16px] p-6 sm:p-10 shadow-[0_8px_30px_rgba(23,26,31,0.08)] border-t-4 border-[#294C87] text-center">
        {/* Ícone em destaque */}
        <div className="w-16 h-16 rounded-2xl bg-[#FF6B1F]/10 text-[#FF6B1F] flex items-center justify-center mx-auto mb-5 shadow-inner">
          <Icon className="w-8 h-8" />
        </div>

        {/* Tag de Status */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#294C87]/10 text-[#294C87] text-xs font-bold uppercase tracking-wider mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>Fase 2 de Desenvolvimento • Em Breve</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171A1F] tracking-tight">
          {config.title}
        </h1>

        <p className="text-sm sm:text-base text-[#171A1F]/70 max-w-xl mx-auto mt-2 leading-relaxed">
          {config.desc}
        </p>

        {/* Grade de Recursos Planejados */}
        <div className="mt-8 pt-6 border-t border-[#171A1F]/10 text-left">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#171A1F]/60 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B1F]" />
            Funcionalidades em Engenharia:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.plannedFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[#171A1F]/[0.03] border border-[#171A1F]/5 text-xs text-[#171A1F]/80 flex items-start gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B1F] mt-1.5 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ação de retorno */}
        <div className="mt-8 pt-6 border-t border-[#171A1F]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-[#171A1F]/50">
            Identidade Visual Oficial CONCE — Engenharia & Consultoria
          </span>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#171A1F] hover:bg-[#294C87] text-white text-xs sm:text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-4 h-4 text-[#FF6B1F]" />
            <span>Voltar ao Dashboard Gerencial</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
export default StubPage
