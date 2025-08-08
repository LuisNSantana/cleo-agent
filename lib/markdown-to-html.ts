// Minimal markdown to HTML converter for printing/export (no external deps)
// Supports: headings, bold/italic, code blocks, inline code, lists, blockquotes, links, hr

export function markdownToHtml(md: string): string {
  let html = md

  // Escape HTML first to avoid injection, then unescape inside code blocks later
  html = escapeHtml(html)

  // Code blocks ```
  html = html.replace(/```([\s\S]*?)```/g, (m, code) => {
    return `<pre class="code-block"><code>${code}</code></pre>`
  })

  // Inline code `code`
  html = html.replace(/`([^`]+?)`/g, '<code class="inline-code">$1</code>')

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // HR
  html = html.replace(/^---$/gm, '<hr/>')

  // Blockquotes
  html = html.replace(/^>\s?(.+)$/gm, '<blockquote>$1</blockquote>')

  // Ordered lists
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
  html = html.replace(/(<li>[\s\S]*?<\/li>)(?:\n<li>[\s\S]*?<\/li>)+/g, match => `<ol>${match}</ol>`) // group li blocks

  // Unordered lists
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[\s\S]*?<\/li>)(?:\n<li>[\s\S]*?<\/li>)+/g, match => `<ul>${match}</ul>`) // group li blocks

  // Paragraphs: wrap remaining lines that are not block-level elements
  html = html
    .split(/\n\n+/)
    .map(block => {
      if (/^\s*<(h\d|pre|ul|ol|li|blockquote|hr)/i.test(block)) return block
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`
    })
    .join('\n')

  return html
}

export function wrapPrintHtml(title: string, bodyHtml: string): string {
  const safeTitle = escapeHtml(title || 'Documento')
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif; line-height: 1.6; margin: 32px; }
  h1,h2,h3,h4,h5,h6 { margin: 1.2em 0 0.5em; }
  p { margin: 0.6em 0; }
  blockquote { margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid #999; background: rgba(0,0,0,0.03); }
  .code-block { background: #0b1020; color: #e6edf3; padding: 12px; border-radius: 8px; overflow: auto; }
  code.inline-code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; }
  ul, ol { margin: 0.4em 0 0.4em 1.2em; }
  hr { border: none; border-top: 1px solid #ccc; margin: 1.2em 0; }
  @media print {
    body { margin: 12mm; }
    a[href]:after { content: " (" attr(href) ")"; font-size: 90%; }
  }
</style>
</head>
<body>
${bodyHtml}
<script>
  window.addEventListener('load', () => { setTimeout(() => { window.print(); }, 100); });
</script>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
