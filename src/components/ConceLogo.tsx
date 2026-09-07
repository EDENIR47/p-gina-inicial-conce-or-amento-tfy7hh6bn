import React from 'react'

/**
 * CONCE — Wordmark oficial da marca (substitui o antigo símbolo dos dois 'C' entrelaçados):
 * - Wordmark "conce" em minúsculas
 * - Tipografia geométrica extra-bold (Poppins) com espaçamento de letras ajustado
 * - Primeiro "c" em Pumpkin Orange (#FF6B1F)
 * - Letras "once" em branco (#FFFFFF) sobre fundos escuros ou Mirage (#171A1F) sobre fundos claros
 * - Subtítulo alinhado à esquerda: "serviço de engenharia e consultoria LTDA"
 *   com "LTDA" em caixa alta e demais palavras em minúsculas
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
   * Se true, exibe o subtítulo institucional abaixo do wordmark:
   * "serviço de engenharia e consultoria LTDA"
   */
  showSubtitle?: boolean
  /**
   * Retrocompatibilidade com callers antigos de showWordmark
   */
  showWordmark?: boolean
  /**
   * Variante de cor de fundo:
   * - "dark" (padrão): fundo escuro (Mirage #171A1F) -> letras "once" e subtítulo em branco
   * - "light": fundo claro/branco -> letras "once" e subtítulo em Mirage (#171A1F)
   * O primeiro "c" permanece sempre em Pumpkin Orange (#FF6B1F).
   */
  variant?: 'dark' | 'light'
  /**
   * Subtexto personalizado opcional (caso queira sobrescrever o oficial)
   */
  subtext?: string
}

export const ConceLogo: React.FC<ConceLogoProps> = ({
  height,
  size,
  className = '',
  glow = false,
  showSubtitle = true,
  showWordmark, // aceito para manter compatibilidade
  variant = 'dark',
  subtext,
}) => {
  // Define a altura base (padrão 48px)
  const baseHeight = height || size || 48

  // As cores das letras complementares ("once") e do subtítulo dependem da variante
  const textColor = variant === 'light' ? '#171A1F' : '#FFFFFF'
  const orangeColor = '#FF6B1F'
  const subtitleColor = variant === 'light' ? 'rgba(23, 26, 31, 0.82)' : 'rgba(255, 255, 255, 0.92)'

  // Determina se exibe o subtítulo
  const shouldShowSubtitle = showSubtitle && showWordmark !== false

  // Altura do SVG proporcional: se tem subtítulo, usamos proporção 360x120; se não, 360x82
  const viewBox = shouldShowSubtitle ? '0 0 360 120' : '0 0 360 82'
  const svgHeight = baseHeight
  const svgWidth = shouldShowSubtitle
    ? Math.round((baseHeight * 360) / 120)
    : Math.round((baseHeight * 360) / 82)

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
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Logo CONCE — serviço de engenharia e consultoria LTDA"
        className="transition-all duration-300 overflow-visible"
      >
        <g style={{ fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>
          {/* Wordmark Principal "conce" */}
          <text
            x="0"
            y="68"
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

          {/* Subtítulo Institucional oficial alinhado à esquerda */}
          {shouldShowSubtitle && (
            <text
              x="2"
              y="106"
              fontSize="16.5"
              fontWeight="300"
              letterSpacing="0.015em"
              fill={subtitleColor}
              className="select-none"
            >
              {subtext || (
                <>
                  <tspan>serviço de engenharia e consultoria </tspan>
                  <tspan fontWeight="500">LTDA</tspan>
                </>
              )}
            </text>
          )}
        </g>
      </svg>
    </div>
  )
}

/**
 * Marca d'água de fundo estrutural usando o novo wordmark "conce" a ~4% de opacidade.
 * Substitui a marca d'água antiga dos dois "C".
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
        width="560"
        height="190"
        viewBox="0 0 360 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[320px] sm:w-[480px] md:w-[580px] h-auto"
      >
        <g style={{ fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>
          <text x="0" y="70" fontSize="84" fontWeight="800" letterSpacing="-0.04em">
            <tspan fill={orangeColor}>c</tspan>
            <tspan fill={textColor}>once</tspan>
          </text>
          <text
            x="2"
            y="108"
            fontSize="16.5"
            fontWeight="400"
            letterSpacing="0.015em"
            fill={textColor}
          >
            serviço de engenharia e consultoria LTDA
          </text>
        </g>
      </svg>
    </div>
  )
}
