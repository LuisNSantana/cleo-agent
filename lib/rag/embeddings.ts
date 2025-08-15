import OpenAI from 'openai'

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
  const client = this.getClient()
  const res = await client.embeddings.create({ model: this.modelId, input: texts }) as any
  return (res.data as any[]).map((d: any) => d.embedding as number[])
  }
}

export const defaultEmbeddingProvider = new OpenAIEmbeddingProvider()
