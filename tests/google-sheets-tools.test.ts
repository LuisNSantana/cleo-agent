import { googleSheetRowSchema, normalizeGoogleSheetValues } from '@/lib/tools/google-sheets'

describe('google-sheets tool helpers', () => {
  it('accepts numeric and string values in sheet rows', () => {
    const row = googleSheetRowSchema.parse([0, 150, '=SUM(A1:A2)', 'texto', true, null])

    expect(row).toEqual([0, 150, '=SUM(A1:A2)', 'texto', true, null])
  })

  it('normalizes null values to blank strings without mutating numbers or formulas', () => {
    const original = [
      [0, null, '=POWER(1+B10,1/12)-1'],
      [100, 200, 'Ingreso']
    ]

    const normalized = normalizeGoogleSheetValues(original)

    expect(normalized).toEqual([
      [0, '', '=POWER(1+B10,1/12)-1'],
      [100, 200, 'Ingreso']
    ])
    // ensure normalization returns new references
    expect(normalized[0]).not.toBe(original[0])
  })
})
