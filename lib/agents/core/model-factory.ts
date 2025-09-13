/**
 * Model Factory for Agent System with Fallback Support
 */

import { ChatOpenAI } from '@langchain/openai'
import { ChatGroq } from '@langchain/groq'
import { ChatOllama } from '@langchain/community/chat_models/ollama'
import { ChatAnthropic } from '@langchain/anthropic'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { getFallbackModel, getModelWithFallback } from '@/lib/models/fallback-system'
import { allModelsWithFallbacks } from '@/lib/models/data/optimized-tiers'
import logger from '@/lib/utils/logger'

// AI SDK imports for additional providers
import { createMistral } from '@ai-sdk/mistral'
import { createXai } from '@ai-sdk/xai'

export interface ModelConfig {
  temperature?: number
  maxTokens?: number
  streaming?: boolean
}

// Custom wrapper for AI SDK models to work with LangChain
class AISdkChatModel extends BaseChatModel {
  model: any
  modelName: string
  temperature: number
  maxTokens: number

  constructor(model: any, modelName: string, temperature: number, maxTokens: number) {
    super({})
    this.model = model
    this.modelName = modelName
    this.temperature = temperature
    this.maxTokens = maxTokens
  }

  _llmType(): string {
    return 'ai-sdk'
  }

  async _generate(messages: any[], options?: any): Promise<any> {
    // Convert LangChain messages to AI SDK format
    const convertedMessages = messages.map((msg) => ({
      role: msg._getType() === 'human' ? 'user' : msg._getType() === 'ai' ? 'assistant' : 'system',
      content: msg.content
    }))

    try {
      const result = await this.model.generateText({
        messages: convertedMessages,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        ...options
      })

      return {
        generations: [{
          text: result.text,
          message: {
            content: result.text,
            _getType: () => 'ai'
          }
        }]
      }
    } catch (error) {
  logger.error(`Error with AI SDK model ${this.modelName}:`, error)
      throw error
    }
  }
}

export class ModelFactory {
  private modelCache = new Map<string, BaseChatModel>()

  async getModel(modelName: string, config: ModelConfig = {}): Promise<BaseChatModel> {
    const cacheKey = `${modelName}_${JSON.stringify(config)}`
    
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!
    }

    try {
      const model = await this.createModelWithFallback(modelName, config)
      this.modelCache.set(cacheKey, model)
      return model
    } catch (error) {
      logger.error(`[ModelFactory] Failed to create model ${modelName}:`, error)
      
      // Try fallback model if available
      const fallbackModelName = getFallbackModel(modelName)
      if (fallbackModelName) {
        logger.info(`[ModelFactory] Attempting fallback model: ${fallbackModelName}`)
        try {
          const fallbackModel = this.createModel(fallbackModelName, config)
          this.modelCache.set(cacheKey, fallbackModel)
          return fallbackModel
        } catch (fallbackError) {
          logger.error(`[ModelFactory] Fallback model ${fallbackModelName} also failed:`, fallbackError)
        }
      }
      
      // Final fallback to GPT-4o-mini
      logger.warn(`[ModelFactory] Using final fallback: GPT-4o-mini`)
      const finalFallback = this.createModel('gpt-4o-mini', config)
      this.modelCache.set(cacheKey, finalFallback)
      return finalFallback
    }
  }

  private async createModelWithFallback(modelName: string, config: ModelConfig): Promise<BaseChatModel> {
    const { primary, fallback } = getModelWithFallback(modelName)
    
    if (!primary) {
      throw new Error(`Model ${modelName} not found in configuration`)
    }
    
  logger.info(`[ModelFactory] Creating model: ${modelName}${fallback ? ` (fallback: ${fallback.id})` : ''}`)
    return this.createModel(modelName, config)
  }

  private createModel(modelName: string, config: ModelConfig): BaseChatModel {
    const { temperature = 0.7, maxTokens = 4000, streaming = false } = config

    // Handle fallback model IDs (remove -fallback suffix for API calls)
    const cleanModelName = modelName.replace('-fallback', '')

    // Groq models (including GPT-OSS and Llama)
    if (cleanModelName.includes('gpt-oss') || 
        cleanModelName.includes('groq/') || 
        cleanModelName.startsWith('llama-3') ||
        cleanModelName === 'llama-3.3-70b-versatile') {
      
      const resolvedModelName = cleanModelName.includes('groq/') 
        ? cleanModelName.replace('groq/', '') 
        : cleanModelName === 'gpt-oss-120b' 
          ? 'openai/gpt-oss-120b'
          : cleanModelName
      
      return new ChatGroq({
        model: resolvedModelName,
        temperature,
        maxTokens,
        streaming,
        apiKey: process.env.GROQ_API_KEY
      })
    }

    // Mistral models
    if (cleanModelName.startsWith('mistral-') || cleanModelName.includes('mistral')) {
      const mistral = createMistral({
        apiKey: process.env.MISTRAL_API_KEY
      })
      
      const model = mistral(cleanModelName.replace('mistral/', ''))
      return new AISdkChatModel(model, cleanModelName, temperature, maxTokens)
    }

    // xAI models (Grok) - including grok-3-mini-fallback -> grok-3-mini
    if (cleanModelName.startsWith('grok-') || cleanModelName.includes('xai/')) {
      const xai = createXai({
        apiKey: process.env.XAI_API_KEY
      })
      
      const model = xai(cleanModelName.replace('xai/', ''))
      return new AISdkChatModel(model, cleanModelName, temperature, maxTokens)
    }

    // OpenAI models (including GPT-5)
    if (cleanModelName.startsWith('gpt-') || cleanModelName.includes('openai')) {
      const resolved = cleanModelName.replace('openai/', '')
      const isGpt5 = resolved.startsWith('gpt-5')
      const opts: any = {
        modelName: resolved,
        maxTokens,
        streaming
      }
      // GPT-5 models support temperature - include it for all models
      if (typeof temperature === 'number') {
        opts.temperature = temperature
      }
      return new ChatOpenAI(opts)
    }

    // Anthropic models (Claude) - including claude-3-5-haiku-latest and claude-3-5-sonnet-latest
    if (cleanModelName.startsWith('claude-') || cleanModelName.includes('anthropic')) {
      // Clamp to recommended Anthropic limits when known
      let safeMax = maxTokens
      if (cleanModelName.includes('claude-3-5-haiku')) {
        safeMax = Math.min(maxTokens, 8192)
      }
      return new ChatAnthropic({
        modelName: cleanModelName.replace('anthropic/', ''),
        temperature,
        maxTokens: safeMax,
        streaming,
        apiKey: process.env.ANTHROPIC_API_KEY
      })
    }

    // Ollama models (local)
    if (cleanModelName.includes('ollama/') || cleanModelName.includes('local/')) {
      return new ChatOllama({
        model: cleanModelName.replace('ollama/', '').replace('local/', ''),
        temperature,
        numPredict: maxTokens
      })
    }

    // Default to OpenAI GPT-4o-mini (cost-effective fallback)
  logger.warn(`[ModelFactory] Unknown model ${cleanModelName}, defaulting to GPT-4o-mini`)
    return new ChatOpenAI({
      modelName: 'gpt-4o-mini',
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
