import OpenAI from 'openai'

export interface EmbeddingProvider {
  modelId: string
  dimension: number
  embed(texts: string[]): Promise<number[][]>
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  client: OpenAI
  modelId: string
  dimension: number
  constructor(modelId = 'text-embedding-3-small', dimension = 1536) {
    this.modelId = modelId
    this.dimension = dimension
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return []
    const res = await this.client.embeddings.create({ model: this.modelId, input: texts })
    return res.data.map(d => d.embedding as number[])
  }
}

export const defaultEmbeddingProvider = new OpenAIEmbeddingProvider()
