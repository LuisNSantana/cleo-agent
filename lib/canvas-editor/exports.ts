// Phase 1: simple export utilities (txt, markdown, html)
// Rich -> Markdown conversion deferred (will add Turndown in phase 2)

export type ExportFormat = 'txt' | 'md' | 'html'

export interface ExportOptions {
  format: ExportFormat
  content: string // plain or markdown depending on mode
  filenameBase?: string
}

export function exportContent({ format, content, filenameBase = 'document' }: ExportOptions) {
  let data: Blob
  let extension = format

  switch (format) {
    case 'txt':
      data = new Blob([content], { type: 'text/plain;charset=utf-8' })
      break
    case 'md':
      data = new Blob([content], { type: 'text/markdown;charset=utf-8' })
      break
    case 'html':
      data = new Blob([
        '<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><pre>' +
          escapeHtml(content) +
          '</pre></body></html>'
      ], { type: 'text/html;charset=utf-8' })
      break
    default:
      throw new Error('Unsupported format')
  }

  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenameBase}.${extension}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
