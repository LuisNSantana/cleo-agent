/**
 * Reorders parts so that all non-empty text parts come first and image parts come last,
 * preserving relative order within each group. Other parts are appended after text and before images.
 */
export function orderTextBeforeImages(parts: any[] | undefined | null) {
  if (!Array.isArray(parts) || parts.length === 0) return parts || []
  const isNonEmptyText = (p: any) => p && p.type === 'text' && typeof p.text === 'string' && p.text.trim().length > 0
  const isImage = (p: any) => p && p.type === 'image'
  const texts = parts.filter(isNonEmptyText)
  const others = parts.filter((p) => !isNonEmptyText(p) && !isImage(p))
  const images = parts.filter(isImage)
  return [...texts, ...others, ...images]
}

export default orderTextBeforeImages
