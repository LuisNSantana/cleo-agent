/**
 * Ensures an image-analysis hint is present when the parts array contains images
 * but no non-empty text. Returns a new array when injection occurs.
 */
export function ensureImageAnalysisHint(parts: any[] | undefined | null) {
  if (!Array.isArray(parts) || parts.length === 0) return parts || []

  const hasImage = parts.some((p: any) => p && p.type === 'image')
  const hasNonEmptyText = parts.some((p: any) => p && p.type === 'text' && typeof p.text === 'string' && p.text.trim().length > 0)

  if (hasImage && !hasNonEmptyText) {
    const analysisHint = {
      type: 'text',
      text: 'Analiza las imágenes adjuntas y describe con detalle lo que contienen. Extrae texto visible y observa elementos relevantes.'
    }
    return [analysisHint, ...parts]
  }

  return parts
}

export default ensureImageAnalysisHint
