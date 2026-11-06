/**
 * CONCE — Guard de procedência do anexo de Proposta Técnica e Comercial (presentationDocument)
 *
 * Um presentationDocument é considerado VÁLIDO para um orçamento somente quando:
 * - existe, tem version > 0; e
 * - NÃO traz um budgetCode de outro orçamento (resquício de cópia/duplicação/sincronização).
 *
 * Um anexo resquício (ex.: documento do ORC-2026-100 gravado no registro do ORC-2026-106)
 * é tratado como INEXISTENTE em TODA a interface: nenhum botão, badge ou tooltip pode
 * exibi-lo, oferecer visualizar/baixar/reimprimir ou apresentá-lo como "Proposta Anexada (vN)".
 * O conteúdo exibido/gerado vem SEMPRE das etapas do orçamento aberto (proposalEngine).
 *
 * Mesma regra do CommercialProposalModal (isStalePresentation): o fallback 'ORC-CONCE'
 * espelha o cleanCode usado na gravação do documento.
 */
import { FullBudget } from '@/types/budgetEngine'
import { sanitizeDocumentText } from '@/lib/formatters'

export type OwnPresentationDocument = NonNullable<FullBudget['presentationDocument']>

/**
 * Retorna o anexo de proposta somente se ele pertencer a este orçamento.
 * Anexo resquício de outro orçamento (budgetCode divergente) => undefined.
 */
export function getOwnPresentationDocument(
  budget: Pick<FullBudget, 'presentationDocument' | 'code'>,
): OwnPresentationDocument | undefined {
  const doc = budget.presentationDocument
  if (!doc || !(doc.version > 0)) return undefined
  const ownCode = sanitizeDocumentText(budget.code) || 'ORC-CONCE'
  if (doc.budgetCode && doc.budgetCode !== ownCode) return undefined
  return doc
}
