/**
 * Model Factory for Agent System
 */

import { ChatOpenAI } from '@langchain/openai'
import { ChatOllama } from '@langchain/community/chat_models/ollama'
import { ChatAnthropic } from '@langchain/anthropic'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

export interface ModelConfig {
  temperature?: number
  maxTokens?: number
  streaming?: boolean
}

export class ModelFactory {
  private modelCache = new Map<string, BaseChatModel>()

  async getModel(modelName: string, config: ModelConfig = {}): Promise<BaseChatModel> {
    const cacheKey = `${modelName}_${JSON.stringify(config)}`
    
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!
    }

    const model = this.createModel(modelName, config)
    this.modelCache.set(cacheKey, model)
    return model
  }

  private createModel(modelName: string, config: ModelConfig): BaseChatModel {
    const { temperature = 0.7, maxTokens = 4000, streaming = false } = config

    // OpenAI models
    if (modelName.startsWith('gpt-') || modelName.includes('openai')) {
      return new ChatOpenAI({
        modelName: modelName.replace('openai/', ''),
        temperature,
        maxTokens,
        streaming
      })
    }

    // Anthropic models
    if (modelName.startsWith('claude-') || modelName.includes('anthropic')) {
      return new ChatAnthropic({
        modelName: modelName.replace('anthropic/', ''),
        temperature,
        maxTokens,
        streaming
      })
    }

    // Ollama models (local)
    if (modelName.includes('ollama/') || modelName.includes('local/')) {
      return new ChatOllama({
        model: modelName.replace('ollama/', '').replace('local/', ''),
        temperature,
        numPredict: maxTokens
      })
    }

    // Default to OpenAI
    console.warn(`[ModelFactory] Unknown model ${modelName}, defaulting to GPT-4`)
    return new ChatOpenAI({
      modelName: 'gpt-4',
      temperature,
      maxTokens,
      streaming
    })
  }

  clearCache(): void {
    this.modelCache.clear()
  }

  getCacheSize(): number {
    return this.modelCache.size
  }
}
