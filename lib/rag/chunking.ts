/**
 * Simple markdown-aware chunking.
 * Approx token estimate: chars / 4.
 */
export interface Chunk {
  index: number
  text: string
  tokenEstimate: number
  metadata: Record<string, any>
}

export interface ChunkOptions {
  maxTokens?: number // target tokens per chunk
  overlapTokens?: number
  minChunkChars?: number
}

const DEFAULT_OPTS: Required<ChunkOptions> = {
  maxTokens: 1000, // Tamaño estándar para balance de contexto y relevancia
  overlapTokens: 150, // Overlap balanceado para coherencia
  minChunkChars: 400, // Chunks con contenido sustancial
}

function approximateTokens(str: string): number {
  return Math.ceil(str.length / 4)
}

function splitIntoParagraphs(md: string): string[] {
  return md
    .replace(/```[\s\S]*?```/g, m => '\n' + m + '\n')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
}

export function chunkMarkdown(md: string, opts?: ChunkOptions): Chunk[] {
  const { maxTokens, overlapTokens, minChunkChars } = { ...DEFAULT_OPTS, ...opts }
  const totalTokens = approximateTokens(md)
  
  console.log(`[CHUNK] Starting chunking: ${md.length} chars (~${totalTokens} tokens)`)
  console.log(`[CHUNK] Config: maxTokens=${maxTokens}, overlap=${overlapTokens}, minChars=${minChunkChars}`)
  
  const paras = splitIntoParagraphs(md)
  const chunks: Chunk[] = []
  let buffer: string[] = []
  let currentTokens = 0
  let chunkIndex = 0

  const flush = (force = false) => {
    if (!buffer.length) return
    const text = buffer.join('\n\n').trim()
    if (!text) { buffer = []; return }
    if (!force && text.length < minChunkChars && chunkIndex > 0) return
    const tokenEstimate = approximateTokens(text)
    chunks.push({ index: chunkIndex++, text, tokenEstimate, metadata: { paragraphs: buffer.length } })
    buffer = []
    currentTokens = 0
  }

  for (const p of paras) {
    const t = approximateTokens(p)
    if (currentTokens + t > maxTokens && buffer.length) {
      flush(true)
      // overlap: take tail of previous chunk text
      if (overlapTokens > 0 && chunks.length) {
        const last = chunks[chunks.length - 1].text
        const tailChars = overlapTokens * 4
        const tail = last.slice(-tailChars)
        buffer.push(tail)
        currentTokens = approximateTokens(tail)
      }
    }
    buffer.push(p)
    currentTokens += t
  }
  flush(true)
  
  const totalChunkTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenEstimate, 0)
  console.log(`[CHUNK] ✅ Created ${chunks.length} chunks (~${totalChunkTokens} tokens total)`)
  chunks.forEach((chunk, i) => {
    console.log(`[CHUNK]   ${i + 1}: ${chunk.tokenEstimate} tokens, ${chunk.text.length} chars`)
  })
  
  return chunks
}
