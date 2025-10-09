import { tool } from 'ai'
import { z } from 'zod'

// Simple Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const al = a.length; const bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al
  const dp = Array.from({ length: al + 1 }, () => new Array<number>(bl + 1))
  for (let i = 0; i <= al; i++) dp[i][0] = i
  for (let j = 0; j <= bl; j++) dp[0][j] = j
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }
  return dp[al][bl]
}

// Lightweight synonyms and allergen dictionaries
const SYNONYMS: Record<string, string[]> = {
  'acido citrico': ['e330'],
  'azucar': ['sacarosa'],
  'saborizante': ['aroma', 'aromatizante'],
  'color caramelo': ['caramelo'],
}

const ALLERGENS = new Set([
  'gluten','trigo','cebada','centeno','avena','espelta','kamut',
  'huevos','leche','lactosa','soja','soya','cacahuete','mani',
  'frutos secos','almendra','nuez','avellana','pistacho','anacardo',
  'apio','mostaza','sesamo','sésamo','sulfitos','altramuces','moluscos','crustaceos'
])

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

  const matches: Array<{ a: string; b: string; indexA: number; indexB: number, via: 'exact'|'synonym'|'fuzzy' }> = []
    const missingOrNew: { missing: string[]; added: string[] } = { missing: [], added: [] }
    const reorder: Array<{ ingredient: string; from: number; to: number }> = []
  const typos: Array<{ from: string; to: string; note?: string }> = []

  const bUsed = new Set<number>()

    // Match exact by normalized form
    for (const a of A) {
      if (bIndex.hasOwnProperty(a.norm)) {
        const iB = bIndex[a.norm]
        matches.push({ a: a.original, b: B[iB].original, indexA: aIndex[a.norm], indexB: iB, via: 'exact' })
        bUsed.add(iB)
        continue
      }

      // Synonym matching
      const syns = SYNONYMS[a.norm] || []
      let matched = false
      for (const s of syns) {
        if (bIndex.hasOwnProperty(s)) {
          const iB = bIndex[s]
          matches.push({ a: a.original, b: B[iB].original, indexA: aIndex[a.norm], indexB: iB, via: 'synonym' })
          bUsed.add(iB)
          matched = true
          break
        }
      }
      if (matched) continue

      // Fuzzy matching with OCR heuristics
      let best: { idx: number; dist: number } | null = null
      for (let i = 0; i < B.length; i++) {
        if (bUsed.has(i)) continue
        const candidate = B[i]
        // Basic OCR normalizations for comparison
        const normA = a.norm.replace(/0/g,'o').replace(/1/g,'l').replace(/rn/g,'m')
        const normB = candidate.norm.replace(/0/g,'o').replace(/1/g,'l').replace(/rn/g,'m')
        const dist = levenshtein(normA, normB)
        const threshold = Math.max(1, Math.floor(Math.min(normA.length, normB.length) * 0.2))
        if (dist <= threshold) {
          if (!best || dist < best.dist) best = { idx: i, dist }
        }
      }
      if (best) {
        const iB = best.idx
        matches.push({ a: a.original, b: B[iB].original, indexA: aIndex[a.norm], indexB: iB, via: 'fuzzy' })
        bUsed.add(iB)
      } else {
        missingOrNew.missing.push(a.original)
      }
    }

    for (let i = 0; i < B.length; i++) {
      const b = B[i]
      const mapped = matches.find(m => m.indexB === i)
      if (!mapped) missingOrNew.added.push(b.original)
    }

    // Reorder detection among matches
    const inBoth = matches.sort((x,y) => x.indexA - y.indexA)
    for (const m of inBoth) {
      if (m.indexA !== m.indexB) reorder.push({ ingredient: m.a, from: m.indexA, to: m.indexB })
    }

    // Allergen critical flags
    const critical: string[] = []
    const checkAllergen = (s: string) => {
      const n = normalizeIngredient(s)
      return Array.from(ALLERGENS).some(a => n.includes(a))
    }
    missingOrNew.missing.forEach(m => { if (checkAllergen(m)) critical.push(`Faltante alérgeno: ${m}`) })
    missingOrNew.added.forEach(a => { if (checkAllergen(a)) critical.push(`Ingrediente nuevo con alérgeno: ${a}`) })

    const report = {
      success: true,
      summary: {
        totalOfficial: A.length,
        totalExtracted: B.length,
        matched: matches.length,
        missing: missingOrNew.missing.length,
        added: missingOrNew.added.length,
        reorder: reorder.length,
        typos: typos.length,
        critical: critical.length
      },
      details: {
        matches: matches.map(m => ({ official: m.a, extracted: m.b, positionOfficial: m.indexA, positionExtracted: m.indexB, matched_via: m.via })),
        missing_or_new: { missing: missingOrNew.missing, added: missingOrNew.added },
        order_differences: reorder,
        possible_typos: typos,
        critical
      },
      note: 'Normalización aplicada: minúsculas, sin acentos, separadores unificados. Revise diferencias críticas marcadas.'
    }

    return report
  }
})

export const ingredientsTools = {
  compare_ingredients: compareIngredientsTool
}
