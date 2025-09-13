// Gemini function_declarations require function names:
// - start with a letter or underscore
// - contain only [A-Za-z0-9_.:-]
// - max length 64

const GFN_REGEX = /^[A-Za-z_][A-Za-z0-9_.:-]{0,63}$/

export function sanitizeGeminiFunctionName(name: string): string {
  if (!name) return 'fn'
  // Replace invalid chars with underscore; allow dot, colon, dash
  let cleaned = name.replace(/[^A-Za-z0-9_.:-]/g, '_')
  // Ensure first char is a letter or underscore
  if (!/^[A-Za-z_]/.test(cleaned)) cleaned = `f_${cleaned}`
  // Trim to 64 chars
  if (cleaned.length > 64) cleaned = cleaned.slice(0, 64)
  // Final safety fallback
  if (!GFN_REGEX.test(cleaned)) cleaned = 'fn'
  return cleaned
}

export function sanitizeGeminiTools(tools: Record<string, any>): Record<string, any> {
  if (!tools || typeof tools !== 'object') return tools
  const out: Record<string, any> = {}
  for (const [name, t] of Object.entries(tools)) {
    const safeName = sanitizeGeminiFunctionName(name)
    out[safeName] = t
  }
  return out
}
