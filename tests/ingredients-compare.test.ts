import { compareIngredientsTool } from '@/lib/tools/ingredients-compare'

describe('ingredients-compare tool', () => {
  test('matches exact and synonym entries', async () => {
    const official = 'Agua, Ácido Cítrico, Azúcar'
    const extracted = 'agua, E330, sacarosa'

  const res = await (compareIngredientsTool as any).execute({ officialList: official, extractedList: extracted }, {})
    expect(res.success).toBe(true)
    expect(res.summary.matched).toBe(3)
    const vias = (res.details.matches as any[]).map(m => m.matched_via)
    expect(vias).toEqual(expect.arrayContaining(['exact', 'synonym']))
  })

  test('fuzzy OCR match and reorder detection', async () => {
    const official = 'Caramelo, Leche, Saborizante'
    // Introduce OCR-like typo: 0 for o in caramelo, and shuffled order
    const extracted = 'caramel0, saborizante, leche'

  const res = await (compareIngredientsTool as any).execute({ officialList: official, extractedList: extracted }, {})
    expect(res.success).toBe(true)
    // All three should match; one fuzzy, with reorders
    expect(res.summary.matched).toBe(3)
    expect(res.summary.reorder).toBeGreaterThan(0)
    const fuzzy = (res.details.matches as any[]).some(m => m.matched_via === 'fuzzy')
    expect(fuzzy).toBe(true)
  })

  test('flags allergens in missing/added as critical', async () => {
    const official = 'Agua, Leche, Azúcar'
    const extracted = 'Agua, Azúcar, Saborizante'

  const res = await (compareIngredientsTool as any).execute({ officialList: official, extractedList: extracted }, {})
    expect(res.success).toBe(true)
    // Leche should be missing and trigger critical flag
    expect(res.summary.missing).toBe(1)
    expect(res.summary.critical).toBeGreaterThanOrEqual(1)
    const critical = (res.details.critical as string[]).join(' ')
    expect(critical.toLowerCase()).toContain('leche')
  })
})
