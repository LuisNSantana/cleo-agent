import { createOpenAI, openai } from "@ai-sdk/openai"
import { anthropic, createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI, google } from "@ai-sdk/google"
import { createMistral, mistral } from "@ai-sdk/mistral"
import { createPerplexity, perplexity } from "@ai-sdk/perplexity"
import { createGroq, groq } from "@ai-sdk/groq"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import type { LanguageModel } from "ai"
import { createXai, xai } from "@ai-sdk/xai"
import { getProviderForModel, normalizeModelId } from "./provider-map"
import type {
  AnthropicModel,
  GeminiModel,
  GroqModel,
  MistralModel,
  OllamaModel,
  OpenAIModel,
  PerplexityModel,
  SupportedModel,
  XaiModel,
  OpenRouterModel,
} from "./types"

// Simplify: current AI SDK factory helpers generally accept only modelId.
// We keep an options generic for future but unused now.
export type OpenProvidersOptions<T extends SupportedModel> = Record<string, any> | undefined

// Get Ollama base URL from environment or use default
const getOllamaBaseURL = () => {
  if (typeof window !== "undefined") {
    // Client-side: use localhost
    return "http://localhost:11434/v1"
  }

  // Server-side: check environment variables
  return (
    process.env.OLLAMA_BASE_URL?.replace(/\/+$/, "") + "/v1" ||
    "http://localhost:11434/v1"
  )
}

// Create Ollama provider instance with configurable baseURL
const createOllamaProvider = () => {
  return createOpenAI({
    baseURL: getOllamaBaseURL(),
    apiKey: "ollama", // Ollama doesn't require a real API key
    name: "ollama",
  })
}

export function openproviders<T extends SupportedModel>(modelId: T, _settings?: OpenProvidersOptions<T>, apiKey?: string): LanguageModel {
  const provider = getProviderForModel(modelId)
  const normalized = normalizeModelId(modelId as string)

  if (provider === "openai") {
    if (apiKey) {
      const openaiProvider = createOpenAI({ apiKey })
      return openaiProvider(normalized as OpenAIModel)
    }
    return openai(normalized as OpenAIModel)
  }

  if (provider === "mistral") {
    if (apiKey) {
      const mistralProvider = createMistral({ apiKey })
      return mistralProvider(normalized as MistralModel)
    }
    return mistral(normalized as MistralModel)
  }

  if (provider === "google") {
    if (apiKey) {
      const googleProvider = createGoogleGenerativeAI({ apiKey })
      return googleProvider(normalized as GeminiModel)
    }
    return google(normalized as GeminiModel)
  }

  if (provider === "perplexity") {
    if (apiKey) {
      const perplexityProvider = createPerplexity({ apiKey })
      return perplexityProvider(normalized as PerplexityModel)
    }
    return perplexity(normalized as PerplexityModel)
  }

  if (provider === "anthropic") {
    if (apiKey) {
      const anthropicProvider = createAnthropic({ apiKey })
      return anthropicProvider(normalized as AnthropicModel)
    }
    return anthropic(normalized as AnthropicModel)
  }

  if (provider === "xai") {
    if (apiKey) {
      const xaiProvider = createXai({ apiKey })
      return xaiProvider(normalized as XaiModel)
    }
    return xai(normalized as XaiModel)
  }

  if (provider === "groq") {
    if (apiKey) {
      const groqProvider = createGroq({ apiKey })
      return groqProvider(normalized as GroqModel)
    }
    return groq(normalized as GroqModel)
  }

  if (provider === "ollama") {
    const ollamaProvider = createOllamaProvider()
    return ollamaProvider(normalized as OllamaModel)
  }

  if (provider === "openrouter") {
    // Ensure OpenRouter receives required headers for attribution/routing
    // and use explicit baseURL to avoid env/proxy interference.
    const referer =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const title = process.env.OPENROUTER_APP_TITLE || 'Cleo Agent'
    const openrouterProvider = createOpenRouter({
      apiKey: apiKey || process.env.OPENROUTER_API_KEY,
      headers: {
        'HTTP-Referer': referer,
        'X-Title': title,
      },
      baseURL: 'https://openrouter.ai/api/v1',
    })
    return openrouterProvider.chat(normalized.replace('openrouter:', ''))
  }

  throw new Error(`Unsupported model: ${modelId}`)
}
