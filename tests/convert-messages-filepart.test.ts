import { convertUserMultimodalMessages } from '@/lib/chat/convert-messages'
import type { CoreMessage } from 'ai'

describe('convertUserMultimodalMessages - file parts', () => {
  test('converts image file to image part when modelVision=true', async () => {
    const messages: CoreMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'file',
            mediaType: 'image/png',
            url: 'https://example.com/pic.png',
            name: 'pic.png',
          },
        ] as any,
      },
    ]

    const converted = await convertUserMultimodalMessages(messages, 'gpt-4o-mini', true)
    expect(Array.isArray(converted)).toBe(true)
    const user = converted[0] as any
    expect(Array.isArray(user.content)).toBe(true)
    expect(user.content[0]).toEqual({ type: 'image', image: 'https://example.com/pic.png' })
  })

  test('converts text file data URI to text part', async () => {
    const text = 'hola mundo'
    const base64 = Buffer.from(text, 'utf8').toString('base64')
    const dataUri = `data:text/plain;base64,${base64}`

    const messages: CoreMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'file',
            mediaType: 'text/plain',
            url: dataUri,
            name: 'note.txt',
          },
        ] as any,
      },
    ]

    const converted = await convertUserMultimodalMessages(messages, 'gpt-4o-mini', true)
    const user = converted[0] as any
    expect(user.content[0].type).toBe('text')
    expect(user.content[0].text).toContain('note.txt')
    expect(user.content[0].text).toContain(text)
  })
})
