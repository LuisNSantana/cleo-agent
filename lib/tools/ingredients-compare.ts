import { tool } from 'ai'
import { z } from 'zod'

function normalizeIngredient(s: string) {
  const from = 'ÁÀÄÂáàäâÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔóòöôÚÙÜÛúùüûÑñ'
  const to   = 'AAAAaaaaEEEEeeeeIIIIiiiiOOOOooooUUUUuuuuNn'
  const map: Record<string, string> = {}
  for (let i = 0; i < from.length; i++) map[from[i]] = to[i]
  const noAccents = s.split('').map(ch => map[ch] || ch).join('')
  return noAccents
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, ' ')
    .replace(/[;,|]/g, ',')
    .replace(/\s*,\s*/g, ',')
    .trim()
}

function tokenizeList(raw: string): { original: string, norm: string }[] {
  const parts = raw
    .split(/\n|,|;|\|/)
    .map(s => s.trim())
    .filter(Boolean)
  return parts.map(p => ({ original: p, norm: normalizeIngredient(p) }))
}

export const compareIngredientsTool = tool({
  description: 'Compara dos listas de ingredientes (oficial vs extraída) y devuelve coincidencias, faltantes/nuevos, cambios de orden y posibles errores tipográficos.',
  inputSchema: z.object({
    officialList: z.string().describe('Lista oficial/autorizada de ingredientes (texto libre, separado por comas o líneas).'),
    extractedList: z.string().describe('Lista extraída (desde PDF/imagen), puede contener errores de OCR.'),
  }),
  execute: async ({ officialList, extractedList }) => {
    const A = tokenizeList(officialList)
    const B = tokenizeList(extractedList)

    const aIndex: Record<string, number> = {}
    A.forEach((item, idx) => { aIndex[item.norm] = idx })

    const bIndex: Record<string, number> = {}
    B.forEach((item, idx) => { bIndex[item.norm] = idx })

    const matches: Array<{ a: string; b: string; indexA: number; indexB: number } > = []
    const missingOrNew: { missing: string[]; added: string[] } = { missing: [], added: [] }
    const reorder: Array<{ ingredient: string; from: number; to: number }> = []
    const typos: Array<{ from: string; to: string; note?: string }> = []

    // Match exact by normalized form
    for (const a of A) {
      if (bIndex.hasOwnProperty(a.norm)) {
        const iB = bIndex[a.norm]
        matches.push({ a: a.original, b: B[iB].original, indexA: aIndex[a.norm], indexB: iB })
      } else {
        // Try fuzzy heuristics for common OCR mistakes
        const candidate = B.find(b => b.norm.length >= a.norm.length - 1 && b.norm.length <= a.norm.length + 1 && (
          b.norm.replace(/0/g,'o').replace(/1/g,'l') === a.norm.replace(/0/g,'o').replace(/1/g,'l') ||
          b.norm.replace(/rn/g,'m') === a.norm ||
          a.norm.replace(/rn/g,'m') === b.norm
        ))
        if (candidate) {
          typos.push({ from: candidate.original, to: a.original, note: 'Posible error OCR/typo' })
        } else {
          missingOrNew.missing.push(a.original)
        }
      }
    }

    for (const b of B) {
      if (!aIndex.hasOwnProperty(b.norm)) {
        // If not already flagged as typo mapping
        const mapped = typos.find(t => t.from === b.original)
        if (!mapped) missingOrNew.added.push(b.original)
      }
    }

    // Reorder detection among matches
    const inBoth = matches.sort((x,y) => x.indexA - y.indexA)
    for (const m of inBoth) {
      if (m.indexA !== m.indexB) reorder.push({ ingredient: m.a, from: m.indexA, to: m.indexB })
    }

    const report = {
      success: true,
      summary: {
        totalOfficial: A.length,
        totalExtracted: B.length,
        matched: matches.length,
        missing: missingOrNew.missing.length,
        added: missingOrNew.added.length,
        reorder: reorder.length,
        typos: typos.length
      },
      details: {
        matches: matches.map(m => ({ official: m.a, extracted: m.b, positionOfficial: m.indexA, positionExtracted: m.indexB })),
        missing_or_new: { missing: missingOrNew.missing, added: missingOrNew.added },
        order_differences: reorder,
        possible_typos: typos
      },
      note: 'Normalización aplicada: minúsculas, sin acentos, separadores unificados. Revise diferencias críticas marcadas.'
    }

    return report
  }
})

export const ingredientsTools = {
  compare_ingredients: compareIngredientsTool
}
