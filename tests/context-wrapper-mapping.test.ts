import { ensureToolsHaveRequestContext } from '@/lib/tools/context-wrapper'
import { tool } from 'ai'
import { z } from 'zod'

describe('context-wrapper URL mapping for extract_text_from_pdf', () => {
  it('replaces truncated pdfDataUrl with global __lastAttachmentUrl', async () => {
    const calls: any[] = []
    const fakeTool = tool({
      description: 'fake pdf extractor',
      inputSchema: z.object({ pdfDataUrl: z.string().optional(), url: z.string().optional() }),
      execute: async (params: any) => { calls.push(params); return { ok: true } }
    })

    const registry = { extract_text_from_pdf: fakeTool }
    ;(global as any).__lastAttachmentUrl = 'https://cdn.example.com/doc.pdf'
    ensureToolsHaveRequestContext(registry as any)

    const params = { pdfDataUrl: 'data:application/pdf;base64,[base64_encoded_pdf_content_from_attachment]' }
    await (registry.extract_text_from_pdf as any).execute(params)

    expect(calls[0].url).toBe('https://cdn.example.com/doc.pdf')
    expect(calls[0].pdfDataUrl).toBeUndefined()
  })
})
