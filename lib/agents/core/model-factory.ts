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
// import { createMistral } from '@ai-sdk/mistral'
import { ChatMistralAI } from '@langchain/mistralai'
import { createXai } from '@ai-sdk/xai'
import { clampMaxOutputTokens } from '@/lib/chat/token-limits'

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
    // Convert LangChain messages to AI SDK format and ensure system-first ordering
      const convertedMessagesRaw = messages.map((msg: any) => {
        const t = typeof msg._getType === 'function' ? msg._getType() : undefined
        if (t === 'human') {
          return { role: 'user', content: msg.content }
        }
        if (t === 'ai') {
          // Preserve tool_calls if present on assistant messages
          const tool_calls = (msg as any)?.additional_kwargs?.tool_calls
          return tool_calls
            ? { role: 'assistant', content: msg.content ?? '', tool_calls }
            : { role: 'assistant', content: msg.content ?? '' }
        }
        if (t === 'tool') {
          // Map ToolMessage correctly to 'tool' role with tool_call_id
          return {
            role: 'tool',
            content: String(msg.content ?? ''),
            tool_call_id: (msg as any)?.tool_call_id || (msg as any)?.additional_kwargs?.tool_call_id || undefined,
          }
        }
        // Default to system for explicit system messages only
        return { role: 'system', content: msg.content ?? '' }
      })

    // Remove duplicate or mid-stream system messages; keep only the first system at the beginning if present
    const systemMsgs = convertedMessagesRaw.filter(m => m.role === 'system')
    let convertedMessages = convertedMessagesRaw.filter(m => m.role !== 'system')
    if (systemMsgs.length > 0) {
      // Keep only the first system message
      convertedMessages = [systemMsgs[0], ...convertedMessages]
    }

    try {
      const safeMax = clampMaxOutputTokens(this.modelName, options?.maxTokens ?? this.maxTokens)
      const result = await this.model.generateText({
        messages: convertedMessages,
        temperature: this.temperature,
        maxTokens: safeMax,
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
  // Note: downstream processing uses result.text; responseMessages handled by AI SDK
}

export class ModelFactory {
  private modelCache = new Map<string, BaseChatModel>()

  async getModel(modelName: string, config: ModelConfig = {}): Promise<BaseChatModel> {
    const cacheKey = `${modelName}_${JSON.stringify(config)}`
    logger.debug(`[ModelFactory] getModel called`, { modelName, config, cacheKey })

    if (this.modelCache.has(cacheKey)) {
      logger.info(`[ModelFactory] Cache hit`, { modelName, cacheKey })
      return this.modelCache.get(cacheKey)!
    }

    try {
      const model = await this.createModelWithFallback(modelName, config)
      logger.info(`[ModelFactory] Model created`, { modelName, cacheKey, modelClass: (model as any)?.constructor?.name })
      this.modelCache.set(cacheKey, model)
      return model
    } catch (error) {
      logger.error(`[ModelFactory] Failed to create model ${modelName}:`, error)
      
      // Try fallback model if available
      const fallbackModelName = getFallbackModel(modelName)
      if (fallbackModelName) {
        logger.info(`[ModelFactory] Attempting fallback model`, { requested: modelName, fallback: fallbackModelName })
        try {
          const fallbackModel = this.createModel(fallbackModelName, config)
          logger.info(`[ModelFactory] Fallback model instantiated`, { fallbackModelName, modelClass: (fallbackModel as any)?.constructor?.name })
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
      logger.warn(`[ModelFactory] Model ${modelName} not in optimized tiers registry; creating directly without tier metadata`)
      return this.createModel(modelName, config)
    }
    
    logger.info(`[ModelFactory] Creating model: ${modelName}${fallback ? ` (fallback: ${fallback.id})` : ''}`)
    return this.createModel(modelName, config)
  }

  private createModel(modelName: string, config: ModelConfig): BaseChatModel {
    const { temperature = 0.7, maxTokens = 4000, streaming = false } = config

    // Handle fallback model IDs (remove -fallback suffix for API calls)
    const cleanModelName = modelName.replace('-fallback', '')

    // Apply provider-safe clamp for output tokens
    const safeMax = clampMaxOutputTokens(cleanModelName, maxTokens)

    logger.debug(`[ModelFactory] createModel dispatch`, { modelName, temperature, maxTokens, streaming })

    // OpenRouter models via OpenAI-compatible API (function/tool calling supported)
    if (cleanModelName.startsWith('openrouter:')) {
      const resolved = cleanModelName.replace('openrouter:', '')
      const safeMax = clampMaxOutputTokens(resolved, maxTokens)
      logger.info(`[ModelFactory] Instantiating OpenRouter/OpenAI-compatible model`, { resolved, safeMax })
      return new ChatOpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        modelName: resolved,
        temperature,
        maxTokens: safeMax,
        streaming,
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
        } as any,
      })
    }

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
      
      logger.info(`[ModelFactory] Instantiating Groq model`, { resolvedModelName, safeMax })
      return new ChatGroq({
        model: resolvedModelName,
        temperature,
        maxTokens: safeMax,
        streaming,
        apiKey: process.env.GROQ_API_KEY
      })
    }

    // Mistral models
    if (cleanModelName.startsWith('mistral-') || cleanModelName.includes('mistral')) {
      // Use LangChain's official ChatMistralAI wrapper (2025 best practice)
      logger.info(`[ModelFactory] Instantiating Mistral model`, { cleanModelName, safeMax })
      return new ChatMistralAI({
        model: cleanModelName,
        temperature,
        maxTokens: safeMax,
        streaming,
        apiKey: process.env.MISTRAL_API_KEY
      })
    }

    // xAI models (Grok) - including grok-3-mini-fallback -> grok-3-mini
    if (cleanModelName.startsWith('grok-') || cleanModelName.includes('xai/')) {
      const xai = createXai({
        apiKey: process.env.XAI_API_KEY
      })
      
      const model = xai(cleanModelName.replace('xai/', ''))
  logger.info(`[ModelFactory] Instantiating xAI/AISDK model`, { cleanModelName })
  return new AISdkChatModel(model, cleanModelName, temperature, safeMax)
    }

    // OpenAI models (including GPT-5)
    if (cleanModelName.startsWith('gpt-') || cleanModelName.includes('openai')) {
      const resolved = cleanModelName.replace('openai/', '')
      const isGpt5 = resolved.startsWith('gpt-5')
      const opts: any = {
        modelName: resolved,
        maxTokens: safeMax,
        streaming
      }
      // GPT-5 models support temperature - include it for all models
      if (typeof temperature === 'number') {
        opts.temperature = temperature
      }
      logger.info(`[ModelFactory] Instantiating OpenAI model`, { resolved, opts })
      return new ChatOpenAI(opts)
    }

    // Anthropic models (Claude) - including claude-3-5-haiku-latest and claude-3-5-sonnet-latest
    if (cleanModelName.startsWith('claude-') || cleanModelName.includes('anthropic')) {
      // Clamp to recommended Anthropic limits when known
      logger.info(`[ModelFactory] Instantiating Anthropic model`, { cleanModelName, safeMax })
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
      logger.info(`[ModelFactory] Instantiating Ollama/local model`, { cleanModelName })
      return new ChatOllama({
        model: cleanModelName.replace('ollama/', '').replace('local/', ''),
        temperature,
        numPredict: safeMax
      })
    }

    // Default to OpenAI GPT-4o-mini (cost-effective fallback)
  logger.warn(`[ModelFactory] Unknown model ${cleanModelName}, defaulting to GPT-4o-mini`)
    logger.info(`[ModelFactory] Instantiating final fallback GPT-4o-mini`, { cleanModelName, safeMax })
    return new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature,
      maxTokens: safeMax,
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
