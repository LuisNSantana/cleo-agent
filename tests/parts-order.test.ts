import { orderTextBeforeImages } from '@/lib/chat/parts-order'

describe('orderTextBeforeImages', () => {
  test('moves non-empty text before images, preserves relative order', () => {
    const parts = [
      { type: 'image', image: 'a.jpg' },
      { type: 'text', text: 'primero' },
      { type: 'image', image: 'b.jpg' },
      { type: 'text', text: 'segundo' },
    ]
    const result = orderTextBeforeImages(parts)
    expect(result.map(p => p.type)).toEqual(['text', 'text', 'image', 'image'])
    expect(result[0].text).toBe('primero')
    expect(result[1].text).toBe('segundo')
    expect(result[2].image).toBe('a.jpg')
    expect(result[3].image).toBe('b.jpg')
  })

  test('keeps whitespace-only text out of the text-first group', () => {
    const parts = [
      { type: 'image', image: 'a.jpg' },
      { type: 'text', text: '   ' },
      { type: 'image', image: 'b.jpg' },
    ]
    const result = orderTextBeforeImages(parts)
    // whitespace-only text should be in the "others" bucket, so order becomes others (whitespace text) then images
    expect(result.map(p => p.type)).toEqual(['text', 'image', 'image'])
    expect(result[0].text).toBe('   ')
  })

  test('no-op for empty or non-array input', () => {
    expect(orderTextBeforeImages(undefined)).toEqual([])
    expect(orderTextBeforeImages(null as any)).toEqual([])
    expect(orderTextBeforeImages([])).toEqual([])
  })
})
