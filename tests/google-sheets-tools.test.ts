import { googleSheetRowSchema, normalizeGoogleSheetValues, escapeSheetName } from '@/lib/tools/google-sheets'

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

  describe('escapeSheetName', () => {
    it('does not quote simple sheet names', () => {
      expect(escapeSheetName('Sheet1')).toBe('Sheet1')
      expect(escapeSheetName('Data')).toBe('Data')
      expect(escapeSheetName('MySheet')).toBe('MySheet')
    })

    it('quotes sheet names with spaces', () => {
      expect(escapeSheetName('ARR Projections')).toBe("'ARR Projections'")
      expect(escapeSheetName('Q1 2024')).toBe("'Q1 2024'")
      expect(escapeSheetName('My Sheet Name')).toBe("'My Sheet Name'")
    })

    it('quotes sheet names with special characters', () => {
      expect(escapeSheetName('Data!Important')).toBe("'Data!Important'")
      expect(escapeSheetName('Sales@2024')).toBe("'Sales@2024'")
      expect(escapeSheetName('Sheet#1')).toBe("'Sheet#1'")
      expect(escapeSheetName('Budget (2024)')).toBe("'Budget (2024)'")
    })

    it('escapes existing single quotes by doubling them', () => {
      expect(escapeSheetName("Q1'23 Data")).toBe("'Q1''23 Data'")
      expect(escapeSheetName("John's Sheet")).toBe("'John''s Sheet'")
    })

    it('quotes sheet names starting with numbers', () => {
      expect(escapeSheetName('2024Budget')).toBe("'2024Budget'")
      expect(escapeSheetName('1stQuarter')).toBe("'1stQuarter'")
    })

    it('handles complex cases', () => {
      expect(escapeSheetName("Year's End - Q4 (2023)")).toBe("'Year''s End - Q4 (2023)'")
      expect(escapeSheetName('Data/Analysis')).toBe("'Data/Analysis'")
    })
  })
})
