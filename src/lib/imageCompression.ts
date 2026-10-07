/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Utilitário para compressão e processamento de imagem no cliente via HTML Canvas.
 * Garante que imagens de etapas caibam com segurança na cota de localStorage (máx ~1200px, JPEG ~70%).
 */

export interface CompressImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0 a 1 (default 0.70)
  mimeType?: string // 'image/jpeg' ou 'image/webp'
}

/**
 * Redimensiona e comprime um arquivo de imagem (File/Blob) retornando uma string Base64 Data URL.
 */
export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {},
): Promise<string> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.7, mimeType = 'image/jpeg' } = options

  return new Promise((resolve, reject) => {
    // Validação básica do tipo
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Erro ao carregar imagem para compressão.'))
      img.onload = () => {
        try {
          let { width, height } = img

          // Redimensionamento proporcional se exceder maxWidth / maxHeight
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            // Se não conseguiu contexto 2D, faz fallback para o dataUrl original se pequeno
            resolve(reader.result as string)
            return
          }

          // Fundo branco para preservar transparência de PNGs ao converter em JPEG
          if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, width, height)
          }

          ctx.drawImage(img, 0, 0, width, height)

          const dataUrl = canvas.toDataURL(mimeType, quality)
          resolve(dataUrl)
        } catch (err) {
          reject(err)
        }
      }

      img.src = reader.result as string
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Converte string pt-BR ou número para number | null.
 * Retorna null se em branco, nulo ou inválido (nunca zero forçado).
 */
export function parseOptionalNumberPtBr(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return isNaN(value) ? null : value
  }
  const trimmed = value.trim()
  if (!trimmed) return null

  // Substitui vírgula por ponto para parsing padrão
  const normalized = trimmed.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

/**
 * Formata um número opcional para exibição amigável em pt-BR (ou vazio se null/undefined).
 */
export function formatOptionalNumberPtBr(
  value: number | null | undefined,
  maxFractionDigits = 2,
): string {
  if (value === null || value === undefined || isNaN(value)) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value)
}
