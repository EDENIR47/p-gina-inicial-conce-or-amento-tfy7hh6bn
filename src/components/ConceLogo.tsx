import React from 'react'

/**
 * CONCE — Wordmark oficial da marca:
 * - Wordmark "conce" em minúsculas
 * - Tipografia geométrica extra-bold (Poppins) com espaçamento de letras ajustado
 * - Primeiro "c" em Pumpkin Orange (#FF6B1F)
 * - Letras "once" em branco (#FFFFFF) sobre fundos escuros ou Mirage (#171A1F) sobre fundos claros
 * - Exibe exclusivamente a palavra "conce" (sem subtítulo / frase institucional)
 */
export interface ConceLogoProps {
  /**
   * Altura aproximada do componente em pixels (controla a escala proporcional).
   * Padrão: 40 para header, 72 para login.
   */
  height?: number
  /**
   * Tamanho genérico (retrocompatibilidade com callers antigos que passavam `size`)
   */
  size?: number
  /**
   * Classes CSS adicionais aplicadas ao container externo
   */
  className?: string
  /**
   * Se true, exibe a animação suave de pulso/brilho (usada no login e splash)
   */
  glow?: boolean
  /**
   * Mantido apenas por retrocompatibilidade de tipagem (não exibe subtítulo em nenhum caso).
   */
  showSubtitle?: boolean
  /**
   * Retrocompatibilidade com callers antigos de showWordmark
   */
  showWordmark?: boolean
  /**
   * Variante de cor de fundo:
   * - "dark" (padrão): fundo escuro (Mirage #171A1F) -> letras "once" em branco
   * - "light": fundo claro/branco -> letras "once" em Mirage (#171A1F)
   * O primeiro "c" permanece sempre em Pumpkin Orange (#FF6B1F).
   */
  variant?: 'dark' | 'light'
  /**
   * Mantido por retrocompatibilidade de tipagem
   */
  subtext?: string
}

export const ConceLogo: React.FC<ConceLogoProps> = ({
  height,
  size,
  className = '',
  glow = false,
  variant = 'dark',
}) => {
  // Define a altura base (padrão 48px)
  const baseHeight = height || size || 48

  // As cores das letras complementares ("once") dependem da variante
  const textColor = variant === 'light' ? '#171A1F' : '#FFFFFF'
  const orangeColor = '#FF6B1F'

  // Proporção compacta e precisa para o wordmark "conce" (320x76, com baseline em y=62)
  // Sem espaço morto inferior que era reservado para subtítulo
  const viewBoxWidth = 320
  const viewBoxHeight = 76
  const svgHeight = baseHeight
  const svgWidth = Math.round((baseHeight * viewBoxWidth) / viewBoxHeight)

  return (
    <div
      className={`inline-flex flex-col items-start select-none ${
        glow ? 'animate-pulse-glow' : ''
      } ${className}`}
      style={{ verticalAlign: 'middle' }}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Logo CONCE"
        className="transition-all duration-300 overflow-visible"
      >
        <g style={{ fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>
          {/* Wordmark Principal "conce" */}
          <text
            x="0"
            y="62"
            fontSize="82"
            fontWeight="800"
            letterSpacing="-0.04em"
            className="select-none"
          >
            {/* Primeiro "c" em Pumpkin Orange oficial */}
            <tspan fill={orangeColor}>c</tspan>
            {/* Restante "once" em Branco ou Mirage conforme a variante */}
            <tspan fill={textColor}>once</tspan>
          </text>
        </g>
      </svg>
    </div>
  )
}

/**
 * Marca d'água de fundo estrutural usando exclusivamente o wordmark "conce" a ~4% de opacidade.
 */
export const ConceWatermark: React.FC<{
  className?: string
  position?: 'top-left' | 'bottom-right' | 'center'
  variant?: 'dark' | 'light'
}> = ({ className = '', position = 'top-left', variant = 'dark' }) => {
  const posClasses = {
    'top-left': '-top-12 -left-12 sm:-top-16 sm:-left-16',
    'bottom-right': '-bottom-12 -right-12 sm:-bottom-16 sm:-right-16',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  }[position]

  const orangeColor = '#FF6B1F'
  const textColor = variant === 'light' ? '#171A1F' : '#FFFFFF'

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute select-none opacity-[0.04] ${posClasses} ${className}`}
    >
      <svg
        width="480"
        height="114"
        viewBox="0 0 320 76"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[280px] sm:w-[420px] md:w-[520px] h-auto"
      >
        <g style={{ fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>
          <text x="0" y="62" fontSize="82" fontWeight="800" letterSpacing="-0.04em">
            <tspan fill={orangeColor}>c</tspan>
            <tspan fill={textColor}>once</tspan>
          </text>
        </g>
      </svg>
    </div>
  )
}
