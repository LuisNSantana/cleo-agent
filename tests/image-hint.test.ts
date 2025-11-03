import { ensureImageAnalysisHint } from '@/lib/chat/image-hint'

describe('ensureImageAnalysisHint', () => {
  test('injects hint when only images present', () => {
    const parts = [
      { type: 'image', image: 'https://example.com/cat.jpg' },
      { type: 'image', image: 'https://example.com/dog.jpg' },
    ]
    const result = ensureImageAnalysisHint(parts)
    expect(result.length).toBe(3)
    expect(result[0]).toEqual({
      type: 'text',
      text: expect.stringContaining('Analiza las imágenes adjuntas'),
    })
    expect(result.slice(1)).toEqual(parts)
  })

  test('does not inject when non-empty text is present', () => {
    const parts = [
      { type: 'text', text: 'Por favor analiza' },
      { type: 'image', image: 'https://example.com/cat.jpg' },
    ]
    const result = ensureImageAnalysisHint(parts)
    expect(result).toBe(parts)
  })

  test('injects when text is whitespace only', () => {
    const parts = [
      { type: 'text', text: '   ' },
      { type: 'image', image: 'https://example.com/cat.jpg' },
    ]
    const result = ensureImageAnalysisHint(parts)
    expect(result.length).toBe(3)
    expect(result[0]).toEqual({
      type: 'text',
      text: expect.stringContaining('Analiza las imágenes adjuntas'),
    })
  })

  test('no-op when no images in parts', () => {
    const parts = [
      { type: 'text', text: 'Hola' },
    ]
    const result = ensureImageAnalysisHint(parts)
    expect(result).toBe(parts)
  })
})
