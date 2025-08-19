import OpenAI from 'openai'

// Simple LRU cache for embeddings (per-process). Keyed by `${modelId}:${hash(text)}`.
class EmbeddingLRU {
  private max: number
  private map: Map<string, { v: number[]; t: number }>
  constructor(max = 5000) { // generous; tune for memory
    this.max = max
    this.map = new Map()
  }
  get(k: string): number[] | undefined {
    const it = this.map.get(k)
    if (!it) return undefined
    this.map.delete(k)
    this.map.set(k, it)
    return it.v
  }
  set(k: string, v: number[]) {
    if (this.map.has(k)) this.map.delete(k)
    else if (this.map.size >= this.max) {
      const fk = this.map.keys().next().value
      if (fk) this.map.delete(fk)
    }
    this.map.set(k, { v, t: Date.now() })
  }
}

const globalCache: EmbeddingLRU = (globalThis as any).__embeddingLRU || ((globalThis as any).__embeddingLRU = new EmbeddingLRU(5000))

function hashText(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return h.toString(36)
}

export interface EmbeddingProvider {
  modelId: string
  dimension: number
  embed(texts: string[]): Promise<number[][]>
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client?: OpenAI
  modelId: string
  dimension: number
  constructor(modelId = 'text-embedding-3-small', dimension = 1536) {
    this.modelId = modelId
    this.dimension = dimension
  }
  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required for embeddings')
      }
      this.client = new OpenAI({ apiKey, baseURL: 'https://api.openai.com/v1' })
    }
    return this.client
  }
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return []
    // Check cache
    const keys = texts.map(t => `${this.modelId}:${hashText(t)}`)
    const out: Array<number[] | null> = keys.map(k => globalCache.get(k) || null)
    const needIdx: number[] = []
    const needTexts: string[] = []
    out.forEach((v, i) => { if (!v) { needIdx.push(i); needTexts.push(texts[i]) } })

    if (needTexts.length) {
      const client = this.getClient()
      const res = await client.embeddings.create({ model: this.modelId, input: needTexts }) as any
      const embs: number[][] = (res.data as any[]).map((d: any) => d.embedding as number[])
      // Fill outputs and cache
      needIdx.forEach((idx, j) => {
        const emb = embs[j]
        out[idx] = emb
        globalCache.set(keys[idx], emb)
      })
    }

    return out as number[][]
  }
}

export const defaultEmbeddingProvider = new OpenAIEmbeddingProvider()
