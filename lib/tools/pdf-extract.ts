import '@/lib/suppress-warnings'
import { tool } from 'ai'
import { z } from 'zod'
// Use the debugging-disabled fork installed in dependencies
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfParse from 'pdf-parse-debugging-disabled'

function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/)
  if (!match) throw new Error('Invalid data URL')
  let base64 = match[2]
  // Detect obvious truncation placeholders sometimes shown in logs/UI
  if (base64.includes('[') || base64.includes(']')) {
  throw new Error('Base64 content appears truncated; please send a URL instead of inline base64')
  }
  // Fix missing base64 padding if needed
  const padLen = base64.length % 4
  if (padLen !== 0) base64 = base64 + '='.repeat(4 - padLen)
  return Buffer.from(base64, 'base64')
}

async function urlToBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      const msg = await res.text().catch(() => '')
      throw new Error(`Failed to fetch PDF: ${res.status} ${res.statusText}${msg ? ` - ${msg.slice(0,200)}` : ''}`)
    }
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('pdf') && !ct.includes('application/octet-stream')) {
      // Allow octet-stream but warn for html/txt
      if (ct.includes('text/html')) {
        throw new Error('Fetched URL returned HTML, not a PDF. Provide a direct PDF URL.')
      }
    }
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  } finally {
    clearTimeout(timeout)
  }
}

export const extractTextFromPdfTool = tool({
  description: 'Extrae texto de un archivo PDF desde URL http(s) o Data URL base64. Devuelve texto plano y metadatos básicos. Preferir URL para PDFs grandes.',
  inputSchema: z.object({
    pdfDataUrl: z.string().optional().describe('Data URL base64 del PDF (por ejemplo, experimental_attachments.url)'),
    url: z.string().url().optional().describe('URL directa al PDF (recomendado, más robusto)'),
    maxPages: z.number().int().positive().optional().describe('Límite opcional de páginas a procesar')
  }).refine((v) => Boolean(v.pdfDataUrl || v.url), { message: 'Provide pdfDataUrl or url' }),
  execute: async ({ pdfDataUrl, url, maxPages }) => {
    try {
      let buffer: Buffer
      if (url && url.startsWith('http')) {
        buffer = await urlToBuffer(url)
      } else if (pdfDataUrl) {
        buffer = dataUrlToBuffer(pdfDataUrl)
      } else if (url && url.startsWith('data:')) {
        buffer = dataUrlToBuffer(url)
      } else {
        throw new Error('Missing PDF input: provide a direct URL or a base64 Data URL')
      }
      const options: any = {}
      if (maxPages) options.max = maxPages

      // Silence noisy pdf.js font warnings while parsing
      const originalWarn = console.warn
      const originalInfo = console.info
      try {
        console.warn = (...args: any[]) => {
          const msg = (args?.[0] || "").toString()
          if (msg.includes("TT: undefined function") || msg.includes("TT: invalid function id")) return
          originalWarn.apply(console, args as any)
        }
        console.info = (...args: any[]) => {
          const msg = (args?.[0] || "").toString()
          if (msg.includes("TT: undefined function") || msg.includes("TT: invalid function id")) return
          originalInfo.apply(console, args as any)
        }
      } catch {}

      const result = await pdfParse(buffer, options)
      try { console.warn = originalWarn; console.info = originalInfo } catch {}
      return {
        success: true,
        text: (result?.text as string) || '',
        info: {
          nPages: result?.numpages ?? undefined,
          meta: result?.info ?? undefined
        }
      }
    } catch (error: any) {
      const message = error?.message || 'Failed to extract text from PDF'
      let hint: string | undefined
      if (/Invalid PDF structure/i.test(message)) {
        hint = 'El contenido base64 parece inválido o truncado. Sube el archivo y usa la URL directa del PDF en lugar de inline base64.'
      } else if (/Fetched URL returned HTML/i.test(message)) {
        hint = 'La URL no apunta directamente a un PDF. Abre el enlace del PDF y copia su URL directa.'
      } else if (/network|fetch|timeout|aborted/i.test(message)) {
        hint = 'Tiempo de espera al descargar el PDF. Intenta de nuevo o proporciona una URL más estable.'
      } else if (/truncated|base64/i.test(message)) {
        hint = 'Base64 truncado o inválido. Envía el PDF como URL directa (recomendado) o vuelve a subir el archivo.'
      }
      return { success: false, error: message, hint }
    }
  }
})

export const pdfTools = {
  extract_text_from_pdf: extractTextFromPdfTool
}
