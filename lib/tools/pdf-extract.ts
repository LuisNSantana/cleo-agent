import { tool } from 'ai'
import { z } from 'zod'
// Use the debugging-disabled fork installed in dependencies
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfParse from 'pdf-parse-debugging-disabled'

function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/)
  if (!match) throw new Error('Invalid data URL')
  const base64 = match[2]
  return Buffer.from(base64, 'base64')
}

export const extractTextFromPdfTool = tool({
  description: 'Extrae texto de un archivo PDF proporcionado como data URL (base64). Devuelve texto plano y metadatos básicos.',
  inputSchema: z.object({
    pdfDataUrl: z.string().describe('Data URL base64 del PDF (por ejemplo, experimental_attachments.url)'),
    maxPages: z.number().int().positive().optional().describe('Límite opcional de páginas a procesar')
  }),
  execute: async ({ pdfDataUrl, maxPages }) => {
    try {
      const buffer = dataUrlToBuffer(pdfDataUrl)
      const options: any = {}
      if (maxPages) options.max = maxPages
      const result = await pdfParse(buffer, options)
      return {
        success: true,
        text: (result?.text as string) || '',
        info: {
          nPages: result?.numpages ?? undefined,
          meta: result?.info ?? undefined
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to extract text from PDF'
      }
    }
  }
})

export const pdfTools = {
  extract_text_from_pdf: extractTextFromPdfTool
}
