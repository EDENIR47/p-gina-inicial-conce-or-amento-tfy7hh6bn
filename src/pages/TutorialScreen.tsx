import React from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  PenLine,
  DoorOpen,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react'
import {
  FIRST_STEPS_BULLETS,
  TUTORIAL_STEPS,
  SIGNATURE_BULLETS,
  type TutorialStepContent,
} from '@/data/tutorialContent'

/**
 * Tela Tutorial (/tutorial) — guia passo a passo, em pt-BR, para que os
 * colaboradores aprendam a usar a plataforma, em especial a criação de
 * orçamentos. Conteúdo estático em src/data/tutorialContent.ts, escrito sobre
 * o fluxo real do app (mesmos nomes de telas, botões e campos).
 */

const TIP_STYLE = 'bg-[#294C87]/5 border-l-4 border-[#294C87]'
const WARN_STYLE = 'bg-[#FF6B1F]/5 border-l-4 border-[#FF6B1F]'

const TipBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={`${TIP_STYLE} rounded-r-xl p-4 flex items-start gap-3`}>
    <Lightbulb className="w-4 h-4 text-[#294C87] shrink-0 mt-0.5" />
    <div className="text-xs leading-relaxed text-[#171A1F]/80">
      <span className="font-bold text-[#294C87] block mb-0.5">Dica</span>
      {children}
    </div>
  </div>
)

const WarnBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={`${WARN_STYLE} rounded-r-xl p-4 flex items-start gap-3`}>
    <AlertTriangle className="w-4 h-4 text-[#FF6B1F] shrink-0 mt-0.5" />
    <div className="text-xs leading-relaxed text-[#171A1F]/80">
      <span className="font-bold text-[#FF6B1F] block mb-0.5">Atenção</span>
      {children}
    </div>
  </div>
)

const StepCard: React.FC<{ step: TutorialStepContent }> = ({ step }) => (
  <article className="bg-white rounded-[16px] border border-[#171A1F]/10 shadow-[0_4px_20px_rgba(23,26,31,0.05)] overflow-hidden">
    {/* Cabeçalho do passo (Mirage + Cobalt) */}
    <div className="p-4 sm:p-5 bg-[#171A1F] border-l-8 border-[#294C87] flex items-center gap-3">
      <span className="w-10 h-10 shrink-0 rounded-xl bg-[#294C87] text-white flex items-center justify-center font-extrabold text-base border-2 border-[#FF6B1F]/60">
        {step.number}
      </span>
      <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
        Passo {step.number} — {step.title}
      </h3>
    </div>

    <div className="p-4 sm:p-5 space-y-3.5">
      <p className="text-xs sm:text-sm text-[#171A1F] leading-relaxed">{step.intro}</p>

      <ul className="space-y-2">
        {step.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-[#171A1F]/75">
            <CheckCircle2 className="w-4 h-4 text-[#294C87] shrink-0 mt-0.5" />
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>

      {step.tip && <TipBlock>{step.tip}</TipBlock>}
      {step.warn && <WarnBlock>{step.warn}</WarnBlock>}
    </div>
  </article>
)

const SectionCard: React.FC<{
  icon: React.ReactNode
  title: string
  bullets: string[]
  footer?: React.ReactNode
}> = ({ icon, title, bullets, footer }) => (
  <section className="bg-white rounded-[16px] border border-[#171A1F]/10 shadow-[0_4px_20px_rgba(23,26,31,0.05)] p-4 sm:p-5 space-y-3">
    <div className="flex items-center gap-2.5">
      <span className="p-2 rounded-lg bg-[#294C87] text-white">{icon}</span>
      <h2 className="text-sm sm:text-base font-extrabold text-[#171A1F] tracking-wide">{title}</h2>
    </div>
    <ul className="space-y-2">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-[#171A1F]/75">
          <CheckCircle2 className="w-4 h-4 text-[#294C87] shrink-0 mt-0.5" />
          <span className="leading-relaxed">{b}</span>
        </li>
      ))}
    </ul>
    {footer}
  </section>
)

/**
 * Tela Tutorial (/tutorial) — guia para colaboradores. A proteção de sessão e o
 * Layout (header/footer) vêm da rota pai em App.tsx; aqui fica só o conteúdo.
 */
const TutorialScreen: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho da página */}
      <div className="rounded-[20px] bg-[#171A1F] border-2 border-[#294C87]/40 p-6 sm:p-8 text-white space-y-3">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-[#294C87] text-white border border-white/10">
            <GraduationCap className="w-5 h-5 text-[#FF6B1F]" />
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Tutorial — Como criar orçamentos
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-white/70 leading-relaxed max-w-2xl">
          Guia passo a passo para você aprender a usar a plataforma CONCE e criar um orçamento
          completo: das etapas da obra à Proposta Técnica e Comercial, com exportação de PDF e
          sincronização com a nuvem.
        </p>
      </div>

      {/* Seção: Primeiros passos */}
      <SectionCard
        icon={<DoorOpen className="w-4 h-4 text-[#FF6B1F]" />}
        title="Primeiros passos — entrar na plataforma"
        bullets={FIRST_STEPS_BULLETS}
        footer={
          <div className="space-y-3">
            <WarnBlock>
              A sessão encerra quando a página é fechada ou recarregada: ao abrir a plataforma de
              novo (ou apertar F5), será preciso fazer login novamente. A navegação dentro do
              sistema não desloga.
            </WarnBlock>
            <TipBlock>
              Se você não tem conta, peça ao administrador para criá-la na tela "Usuários" — não
              existe cadastro público.
            </TipBlock>
          </div>
        }
      />

      {/* Passo a passo principal */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-extrabold text-[#171A1F] flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#FF6B1F]" />
          Criando um orçamento, do início ao fim
        </h2>
        {TUTORIAL_STEPS.map((step) => (
          <StepCard key={step.number} step={step} />
        ))}
      </div>

      {/* Seção: Assinatura do responsável técnico */}
      <SectionCard
        icon={<PenLine className="w-4 h-4 text-[#FF6B1F]" />}
        title="Assinatura do responsável técnico"
        bullets={SIGNATURE_BULLETS}
        footer={
          <TipBlock>
            Sem assinatura desenhada, os documentos exibem apenas o nome e o CREA do responsável
            técnico.
          </TipBlock>
        }
      />

      {/* Fechamento */}
      <div className="rounded-[16px] bg-white border border-[#171A1F]/10 shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs sm:text-sm text-[#171A1F]/70 text-center sm:text-left leading-relaxed">
          Pronto para praticar? Abra a área de orçamentos e crie o primeiro orçamento de teste.
        </p>
        <Link
          to="/orcamentos"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B1F] hover:bg-[#FF6B1F]/90 text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 shrink-0"
        >
          <span>Ir para Orçamentos</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

export default TutorialScreen
