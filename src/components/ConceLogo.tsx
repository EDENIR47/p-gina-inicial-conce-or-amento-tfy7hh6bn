import React from 'react'

/**
 * CONCE — Símbolo oficial da marca:
 * Dois "C" entrelaçados como pilares (visão e execução).
 * - "C" esquerdo em Cobalt (#294C87)
 * - "C" direito em Pumpkin Orange (#FF6B1F)
 * - Traço grosso, stroke-linecap round, entrelaçamento central
 */
interface ConceLogoProps {
  size?: number
  height?: number
  className?: string
  glow?: boolean
  showWordmark?: boolean
  wordmarkDark?: boolean
  subtext?: string
}

export const ConceLogo: React.FC<ConceLogoProps> = ({
  size = 48,
  height,
  className = '',
  glow = false,
  showWordmark = false,
  wordmarkDark = false,
  subtext,
}) => {
  const actualHeight = height || size
  // Proporção do viewBox do símbolo é 120x100
  const actualWidth = Math.round((actualHeight * 120) / 100)

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={actualWidth}
        height={actualHeight}
        viewBox="0 0 120 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-all duration-300 ${glow ? 'animate-pulse-glow' : ''}`}
        aria-label="Logo CONCE — Dois 'C' entrelaçados"
      >
        <defs>
          {/* Brilho linear para dar profundidade e aspecto construtivo */}
          <linearGradient
            id="cobaltGradient"
            x1="20"
            y1="20"
            x2="68"
            y2="80"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3B67AF" />
            <stop offset="1" stopColor="#294C87" />
          </linearGradient>

          <linearGradient
            id="pumpkinGradient"
            x1="100"
            y1="80"
            x2="52"
            y2="20"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FF853E" />
            <stop offset="1" stopColor="#FF6B1F" />
          </linearGradient>

          {/* Sombra sutil sob os arcos estruturais */}
          <filter id="cShadow" x="0" y="0" width="120" height="100" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Pilares entrelaçados - "C" esquerdo (Cobalt: Visão Técnica) */}
        {/* Arco aberto para a direita com centro em ~48, raio 30 */}
        <path
          d="M 68 22 A 32 32 0 1 0 68 78"
          stroke="url(#cobaltGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#cShadow)"
        />

        {/* "C" direito (Pumpkin Orange: Execução Concreta) */}
        {/* Arco aberto para a esquerda com centro em ~72, raio 32 */}
        {/* Passa entrelaçado, desenhado com intersecção harmônica */}
        <path
          d="M 52 78 A 32 32 0 1 0 52 22"
          stroke="url(#pumpkinGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#cShadow)"
        />

        {/* Detalhe de entrelaçamento central — reforço de nó estrutural */}
        <circle cx="60" cy="50" r="4.5" fill="#FFFFFF" opacity="0.9" />
      </svg>

      {showWordmark && (
        <div className="flex flex-col select-none">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-extrabold tracking-wider leading-none text-xl sm:text-2xl ${
                wordmarkDark ? 'text-[#171A1F]' : 'text-white'
              }`}
            >
              CONCE
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B1F]" />
          </div>
          <span
            className={`text-[10px] tracking-widest font-medium uppercase mt-0.5 ${
              wordmarkDark ? 'text-[#294C87]' : 'text-[#FF6B1F]'
            }`}
          >
            {subtext || 'Engenharia & Consultoria'}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Marca d'água de fundo (dois "C" gigantes em outline 4% opacidade)
 */
export const ConceWatermark: React.FC<{
  className?: string
  position?: 'top-left' | 'bottom-right' | 'center'
}> = ({ className = '', position = 'top-left' }) => {
  const posClasses = {
    'top-left': '-top-20 -left-20',
    'bottom-right': '-bottom-24 -right-24',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  }[position]

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute select-none opacity-[0.04] text-white ${posClasses} ${className}`}
    >
      <svg
        width="460"
        height="380"
        viewBox="0 0 120 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 68 22 A 32 32 0 1 0 68 78"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 52 78 A 32 32 0 1 0 52 22"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
