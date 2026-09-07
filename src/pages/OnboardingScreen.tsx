import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, Eye, ShieldCheck, ArrowRight, Building2, CheckCircle2 } from 'lucide-react'
import { ConceLogo, ConceWatermark } from '@/components/ConceLogo'
import { setOnboardingDone } from '@/lib/mockData'

export const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate()

  const handleStart = () => {
    // Grava flag de conclusão no localStorage
    setOnboardingDone()
    navigate('/dashboard')
  }

  // Definição dos três pilares institucionais com a paleta CONCE
  const institutionalCards = [
    {
      id: 'missao',
      title: 'Missão',
      accentColor: '#294C87', // Cobalt
      accentBg: 'bg-[#294C87]',
      accentBorder: 'border-t-4 border-[#294C87]',
      icon: Compass,
      tag: 'Propósito & Excelência',
      text: 'Entregar soluções de engenharia com excelência, transparência e compromisso, elevando o padrão das reformas de médio e alto padrão e das obras públicas que construímos.',
      highlight: 'Excelência, transparência e compromisso',
    },
    {
      id: 'visao',
      title: 'Visão',
      accentColor: '#FF6B1F', // Pumpkin Orange
      accentBg: 'bg-[#FF6B1F]',
      accentBorder: 'border-t-4 border-[#FF6B1F]',
      icon: Eye,
      tag: 'Futuro & Referência',
      text: 'Ser referência nacional em orçamento e execução de obras, unindo visão técnica e concreto em cada projeto.',
      highlight: 'Unindo visão técnica e concreto',
    },
    {
      id: 'valores',
      title: 'Valores',
      accentColor: '#171A1F', // Mirage
      accentBg: 'bg-[#171A1F]',
      accentBorder: 'border-t-4 border-[#171A1F]',
      icon: ShieldCheck,
      tag: 'Ética & Precisão',
      text: 'Ética, precisão, inovação e parceria. Cada cifra reflete o nosso compromisso com a qualidade e a confiança do cliente.',
      highlight: 'Cada cifra reflete a confiança',
    },
  ]

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 lg:p-12 overflow-x-hidden bg-[#171A1F] text-white selection:bg-[#FF6B1F] selection:text-white">
      {/* Brilhos radiais nos cantos da tela */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full blur-[150px] opacity-35 bg-[#294C87]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-[650px] h-[650px] rounded-full blur-[160px] opacity-25 bg-[#FF6B1F]"
        aria-hidden="true"
      />

      {/* Marcas d'água estruturais gigantes */}
      <ConceWatermark position="top-left" />
      <ConceWatermark position="bottom-right" />

      {/* Topo / Header minimalista */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between py-2 mb-6">
        <ConceLogo height={42} showSubtitle={true} variant="dark" />
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
          <Building2 className="w-3.5 h-3.5 text-[#FF6B1F]" />
          <span>Portal de Demonstração Institucional</span>
        </div>
      </header>

      {/* Miolo principal com stagger fade-in */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto py-6 flex flex-col items-center">
        {/* Bloco de boas-vindas */}
        <div className="text-center max-w-3xl mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#294C87]/30 border border-[#294C87]/50 text-[#FF6B1F] text-xs sm:text-sm font-semibold tracking-wider uppercase mb-4 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#FF6B1F] animate-ping" />
            Primeiro Acesso — Apresentação Institucional
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Bem-vindo à <span className="text-[#FF6B1F]">CONCE</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-white/80 font-normal mt-3 leading-relaxed">
            Um sistema de orçamento que transforma{' '}
            <span className="text-white font-semibold underline decoration-[#294C87] underline-offset-4">
              visão
            </span>{' '}
            em{' '}
            <span className="text-white font-semibold underline decoration-[#FF6B1F] underline-offset-4">
              execução
            </span>
            .
          </p>

          <p className="text-sm sm:text-base italic font-medium text-[#FF6B1F] mt-2 tracking-wide">
            "Conce é conceito. Conce é concreto."
          </p>
        </div>

        {/* Grade Responsiva com os 3 Cards Institucionais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 w-full mb-12">
          {institutionalCards.map((card, index) => {
            const Icon = card.icon
            return (
              <div
                key={card.id}
                style={{
                  animationDelay: `${index * 150}ms`,
                  animationFillMode: 'both',
                }}
                className={`animate-fade-in-up bg-white text-[#171A1F] rounded-[16px] p-6 sm:p-7 shadow-[0_12px_30px_rgba(0,0,0,0.25)] flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.35)] ${card.accentBorder} group`}
              >
                <div>
                  {/* Topo do card com tag e ícone */}
                  <div className="flex items-center justify-between mb-5">
                    <span
                      className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
                      style={{
                        backgroundColor: `${card.accentColor}15`,
                        color: card.accentColor,
                      }}
                    >
                      {card.tag}
                    </span>

                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300"
                      style={{
                        backgroundColor: `${card.accentColor}12`,
                        color: card.accentColor,
                      }}
                    >
                      <Icon className="w-6 h-6" strokeWidth={2.2} />
                    </div>
                  </div>

                  {/* Título */}
                  <h2 className="text-xl sm:text-2xl font-bold text-[#171A1F] mb-3 tracking-tight">
                    {card.title}
                  </h2>

                  {/* Descrição textual oficial */}
                  <p className="text-sm sm:text-base text-[#171A1F]/80 leading-relaxed font-normal">
                    {card.text}
                  </p>
                </div>

                {/* Linha de compromisso */}
                <div className="mt-6 pt-4 border-t border-[#171A1F]/10 flex items-center gap-2 text-xs font-semibold text-[#171A1F]/70">
                  <CheckCircle2
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: card.accentColor }}
                  />
                  <span>{card.highlight}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Botão de Ação "Começar" */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleStart}
            className="group relative px-8 sm:px-12 py-3.5 sm:py-4 rounded-[10px] bg-[#FF6B1F] hover:bg-[#E85D12] text-white font-bold text-base sm:text-lg tracking-wide shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3 cursor-pointer"
          >
            <span>Começar no Dashboard</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
          <span className="text-xs text-white/50">
            Acesso liberado para a visão gerencial de orçamentos e obras
          </span>
        </div>
      </main>

      {/* Rodapé institucional */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto pt-6 text-center text-xs text-white/40">
        <p>
          © {new Date().getFullYear()} CONCE — Serviço de Engenharia e Consultoria LTDA. Todos os
          direitos reservados.
        </p>
      </footer>
    </div>
  )
}

export default OnboardingScreen
