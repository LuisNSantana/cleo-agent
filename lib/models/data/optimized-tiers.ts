import { openproviders } from "@/lib/openproviders"
import { getXAIModel } from "../../xai"
import { ModelConfig } from "../types"

/**
 * Optimized Model Selection for Cleo Agent
 * - Grok 4.1 Fast Reasoning (Default/Fast)
 * - GPT-4o Mini (Reliable Fallback)
 * - GPT-5.2 Premier (Balanced/Smart)
 * - OpenAI o3 (Reasoning Specialist)
 */

// FAST TIER - Grok 4.1 Fast Reasoning (Default)
const fastModels: ModelConfig[] = [
  {
    id: "grok-4-1-fast-reasoning",
    name: "Grok 4.1 Fast",
    provider: "xAI",
    providerId: "xai",
    modelFamily: "Grok",
    baseProviderId: "xai",
    description: "xAI's latest high-speed model with 2M token context. Optimized for fast inference.",
    inputCost: 3.0,
    outputCost: 15.0,
    priceUnit: "per 1M tokens",
    tags: ["fast", "reasoning", "vision", "grok", "xai", "default"],
    contextWindow: 2000000, 
    vision: true, 
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://x.ai",
    icon: "faster",
    defaults: {
      temperature: 0.6,
      topP: 0.9,
      maxTokens: 8192,
    },
    apiSdk: (apiKey?: string) => getXAIModel("grok-4-1-fast-reasoning", apiKey) as any,
  },
  {
    id: "gpt-4o-mini-2024-07-18",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "GPT-4o",
    baseProviderId: "openai",
    description: "Fast and affordable GPT-4o mini. Excellent reliable fallback.",
    inputCost: 0.15,
    outputCost: 0.6,
    priceUnit: "per 1M tokens",
    tags: ["fast", "affordable", "vision", "tools", "reliable"],
    contextWindow: 128000,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High", 
    website: "https://platform.openai.com",
    icon: "openai",
    defaults: {
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 16384,
    },
    apiSdk: (apiKey?: string) => openproviders("gpt-4o-mini-2024-07-18", undefined, apiKey),
  }
]

// BALANCED TIER - GPT-5.2 Premier (Using as the 'Standard High Quality' option)
const balancedModels: ModelConfig[] = [
  {
    id: "gpt-5.2-2025-12-11",
    name: "GPT-5.2 Premier",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "GPT-5.2",
    baseProviderId: "openai",
    description: "OpenAI's advanced frontier model. Exceptional general capability.",
    inputCost: 1.75,
    outputCost: 14.0,
    priceUnit: "per 1M tokens",
    tags: ["smart", "balanced", "generalist", "vision", "tools", "gpt5.2"],
    contextWindow: 256000,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High", 
    website: "https://platform.openai.com",
    icon: "smarter",
    defaults: {
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 32768,
    },
    apiSdk: (apiKey?: string) => openproviders("gpt-5.2-2025-12-11", undefined, apiKey),
  }
]

// SMARTER TIER - OpenAI o3 (Reasoning Specialist)
const smarterModels: ModelConfig[] = [
  {
    id: "o3-2025-04-16",
    name: "OpenAI o3",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "o3",
    baseProviderId: "openai",
    description: "Reasoning-specialized model. Best for complex STEM, coding, and analysis.",
    inputCost: 2.00,
    outputCost: 8.00,
    priceUnit: "per 1M tokens",
    tags: ["reasoning", "o3", "tools", "advanced", "specialist"],
    contextWindow: 200000,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Medium",
    intelligence: "High",
    website: "https://platform.openai.com",
    icon: "openai",
    defaults: {
      temperature: 1,
      maxTokens: 100000,
    },
    apiSdk: (apiKey?: string) => openproviders("o3-2025-04-16", undefined, apiKey),
  }
]

// FALLBACK MODELS - Emergency
const fallbackModels: ModelConfig[] = [
  ...fastModels // Using GPT-4o Mini as the fallback
]

// Combined optimized models
const optimizedModels: ModelConfig[] = [
  ...fastModels,
  ...balancedModels, 
  ...smarterModels
]

// All models including fallbacks
const allModelsWithFallbacks: ModelConfig[] = [
  ...optimizedModels,
  ...fallbackModels
]

export { 
  optimizedModels, 
  fallbackModels,
  allModelsWithFallbacks,
  fastModels, 
  balancedModels, 
  smarterModels 
}
