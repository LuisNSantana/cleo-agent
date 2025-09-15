import { openproviders } from "@/lib/openproviders"
import { getXAIModel } from "../../xai"
import { ModelConfig } from "../types"

/**
 * Optimized 3-Tier Model Selection for Cleo Agent
 * Based on 2025 cost-effectiveness analysis and performance benchmarks
 * 
 * FAST: Ultra-low latency, cost-effective for simple tasks
 * BALANCED: Best price/performance ratio for general use
 * SMARTER: Premium models for complex reasoning and advanced tasks
 */

/**
 * Optimized 3-Tier Model Selection for Cleo Agent
 * Based on 2025 cost-effectiveness analysis and performance benchmarks
 * 
 * Each tier includes PRIMARY models + FALLBACK models for reliability
 * All models support vision/multimodal capabilities for document analysis
 * 
 * FAST: Ultra-low latency, cost-effective for simple tasks
 * BALANCED: Best price/performance ratio for general use  
 * SMARTER: Premium models for complex reasoning and advanced tasks
 */

// FAST TIER - Optimized for speed and cost
const fastModels: ModelConfig[] = [
  {
    id: "openrouter:openai/gpt-oss-120b:free",
    name: "Fast",
    provider: "OpenRouter",
    providerId: "openrouter",
    modelFamily: "GPT-OSS",
    baseProviderId: "openrouter",
    description: "OpenAI GPT-OSS 120B via OpenRouter (free). Great balance of speed and quality for text tasks.",
    inputCost: 0,
    outputCost: 0,
    priceUnit: "free tier",
    tags: ["fast", "open-source", "cost-effective", "free"],
    contextWindow: 32768, // per OpenRouter page as of 2025-09-15
    vision: false, // text-only primary fast model
    // Important: OpenRouter free route for GPT-OSS-120B does NOT support tool/function calling
    // We mark tools=false to avoid runtime tool invocation attempts
    tools: false,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "High",
    website: "https://openrouter.ai",
    icon: "faster",
    defaults: {
      temperature: 0.4,
      topP: 0.9,
      maxTokens: 8192, // optimize for larger generations while staying safe
    },
    apiSdk: (apiKey?: string) => openproviders("openrouter:openai/gpt-oss-120b:free", undefined, apiKey),
  }
]

// BALANCED TIER - Best price/performance ratio with robust fallbacks
const balancedModels: ModelConfig[] = [
  {
    id: "gpt-oss-120b",
    name: "Balanced",
    provider: "Groq",
    providerId: "groq",
    modelFamily: "GPT-OSS",
    baseProviderId: "groq",
    description: "OpenAI's 120B parameter open-source model on Groq's ultra-fast infrastructure. Excellent balance of intelligence, speed, and cost.",
    inputCost: 0.2,
    outputCost: 0.4,
    priceUnit: "per 1M tokens",
    tags: ["balanced", "open-source", "tools", "reasoning", "fast-inference"],
    contextWindow: 128000,
    vision: false, // Note: No vision, but excellent for text tasks
    tools: true,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "High",
    website: "https://groq.com",
    icon: "balanced",
    defaults: {
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 4096,
    },
    apiSdk: (apiKey?: string) => openproviders("gpt-oss-120b", undefined, apiKey),
  }
]

// SMARTER TIER - Premium models for complex tasks
const smarterModels: ModelConfig[] = [
  {
    id: "gpt-5-mini-2025-08-07",
    name: "Smarter",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "GPT-5",
    baseProviderId: "openai",
    description: "Advanced reasoning and complex problem-solving with GPT-5 architecture. Best for sophisticated analysis and creative tasks.",
    inputCost: 2.0,
    outputCost: 2.0,
    priceUnit: "per 1M tokens",
    tags: ["smart", "reasoning", "vision", "tools", "advanced", "gpt5"],
    contextWindow: 400000, // 400k context window
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
      topP: 0.9,
      maxTokens: 32768, // Optimized: increased from 4096 to 32k (well within 128k max output)
    },
    apiSdk: (apiKey?: string) => openproviders("gpt-5-mini-2025-08-07", undefined, apiKey),
  }
]

// Combined optimized models for the 3-tier system
const optimizedModels: ModelConfig[] = [
  ...fastModels,
  ...balancedModels, 
  ...smarterModels
]

// FALLBACK MODELS - Secondary options when primary models fail
const fallbackModels: ModelConfig[] = [
  // Fast tier vision companion - Sonoma Dusk Alpha (OpenRouter, free, vision-enabled)
  {
    id: "openrouter:openrouter/sonoma-dusk-alpha",
    name: "Fast Vision",
    provider: "OpenRouter",
    providerId: "openrouter",
    modelFamily: "Sonoma Dusk",
    baseProviderId: "openrouter",
    description: "Vision-capable Fast-tier model for analyzing images and documents (free via OpenRouter).",
    inputCost: 0,
    outputCost: 0,
    priceUnit: "free tier",
    tags: ["fast", "vision", "multimodal", "free"],
    contextWindow: 32768,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://openrouter.ai/openrouter/sonoma-dusk-alpha",
    icon: "faster",
    defaults: {
      temperature: 0.4,
      topP: 0.9,
      maxTokens: 4096,
    },
    apiSdk: (apiKey?: string) => openproviders("openrouter:openrouter/sonoma-dusk-alpha", undefined, apiKey),
  },

  // Fast tier fallback - DeepSeek Chat (free)
  {
    id: "openrouter:deepseek/deepseek-chat-v3.1:free",
    name: "Fast (Fallback)",
    provider: "OpenRouter",
    providerId: "openrouter",
    modelFamily: "DeepSeek",
    baseProviderId: "openrouter",
    description: "Fallback option for Fast tier. DeepSeek Chat free via OpenRouter.",
    inputCost: 0,
    outputCost: 0,
    priceUnit: "free tier",
    tags: ["fallback", "free", "text-only"],
    contextWindow: 131072,
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "Medium",
    website: "https://openrouter.ai",
    icon: "faster",
    defaults: {
      temperature: 0.4,
      topP: 0.9,
    },
    apiSdk: (apiKey?: string) => openproviders("openrouter:deepseek/deepseek-chat-v3.1:free", undefined, apiKey),
  },
  
  // Balanced tier fallback - Mistral Large
  {
    id: "mistral-large-latest-fallback",
    name: "Balanced (Fallback)",
    provider: "Mistral",
    providerId: "mistral",
    modelFamily: "Mistral",
    baseProviderId: "mistral",
    description: "Fallback option for Balanced tier. Mistral's flagship model with strong reasoning capabilities.",
    inputCost: 2.0,
    outputCost: 6.0,
    priceUnit: "per 1M tokens",
    tags: ["fallback", "reasoning", "flagship", "reliable"],
    contextWindow: 128000,
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Medium",
    intelligence: "High",
    website: "https://mistral.ai",
    icon: "balanced",
    defaults: {
      temperature: 0.5,
      topP: 0.9,
    },
    apiSdk: (apiKey?: string) => openproviders("mistral-large-latest", undefined, apiKey),
  },
  
  // Smarter tier fallback - Claude 3.5 Sonnet
  {
    id: "claude-3-5-sonnet-latest-fallback", 
    name: "Smarter (Fallback)",
    provider: "Anthropic",
    providerId: "anthropic",
    modelFamily: "Claude 3.5",
    baseProviderId: "claude",
    description: "Fallback option for Smarter tier. Claude's premium model with excellent reasoning and vision capabilities.",
    inputCost: 3.0,
    outputCost: 15.0,
    priceUnit: "per 1M tokens",
    tags: ["fallback", "premium", "vision", "reasoning", "claude"],
    contextWindow: 200000,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Medium",
    intelligence: "High",
    website: "https://www.anthropic.com",
    icon: "smarter",
    defaults: {
      temperature: 0.7,
      topP: 0.9,
    },
    apiSdk: (apiKey?: string) => openproviders("claude-3-5-sonnet-latest", undefined, apiKey),
  },
  
  // Final emergency fallback - GPT-4o-mini (reliable and always available)
  {
    id: "gpt-4o-mini",
    name: "Emergency Fallback",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "GPT-4o",
    baseProviderId: "openai",
    description: "Emergency fallback model. Reliable and always available when other models fail.",
    inputCost: 0.15,
    outputCost: 0.6,
    priceUnit: "per 1M tokens",
    tags: ["fallback", "emergency", "reliable", "vision", "tools"],
    contextWindow: 128000,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://platform.openai.com",
    icon: "emergency",
    defaults: {
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 4096,
    },
    apiSdk: (apiKey?: string) => openproviders("gpt-4o-mini", undefined, apiKey),
  }
]

// All models including fallbacks for robust operation
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
