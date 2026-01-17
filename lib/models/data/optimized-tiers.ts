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
    id: "openrouter:openai/gpt-oss-120b",
    name: "Fast",
    provider: "OpenRouter",
    providerId: "openrouter",
    modelFamily: "GPT-OSS",
    baseProviderId: "openrouter",
    description: "OpenAI GPT-OSS 120B via OpenRouter (paid). Fast text model with tool-calling.",
    inputCost: 0,
    outputCost: 0,
  priceUnit: "per 1M tokens",
    tags: ["fast", "open-source", "cost-effective", "free"],
    contextWindow: 32768, // per OpenRouter page as of 2025-09-15
  vision: false, // text-only primary fast model
  tools: true,
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
    apiSdk: (apiKey?: string) => openproviders("openrouter:openai/gpt-oss-120b", undefined, apiKey),
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
    id: "gpt-5.1-2025-11-13",
    name: "Smarter",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "GPT-5.1",
    baseProviderId: "openai",
    description: "Latest GPT-5.1 with advanced reasoning and complex problem-solving. Best for sophisticated analysis and creative tasks.",
    inputCost: 2.5,
    outputCost: 10.0,
    priceUnit: "per 1M tokens",
    tags: ["smart", "reasoning", "vision", "tools", "advanced", "gpt5.1"],
    contextWindow: 400000,
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
      maxTokens: 32768,
    },
    apiSdk: (apiKey?: string) => openproviders("gpt-5.1-2025-11-13", undefined, apiKey),
  },
  // Google Gemini 3 Flash Preview - New fast reasoning model
  {
    id: "openrouter:google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    provider: "OpenRouter",
    providerId: "openrouter",
    modelFamily: "Gemini 3",
    baseProviderId: "google",
    category: "standard",
    description: "Google's latest Gemini 3 Flash Preview with ultra-fast inference and excellent reasoning.",
    inputCost: 0.075,
    outputCost: 0.30,
    priceUnit: "per 1M tokens",
    tags: ["fast", "reasoning", "vision", "tools", "google", "gemini"],
    contextWindow: 1000000,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://openrouter.ai/google/gemini-3-flash-preview",
    icon: "gemini",
    defaults: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 8192,
    },
    apiSdk: (apiKey?: string) => openproviders("openrouter:google/gemini-3-flash-preview", undefined, apiKey),
  },
  // Anthropic Claude Haiku 4.5 - Fast affordable Claude
  {
    id: "openrouter:anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "OpenRouter",
    providerId: "openrouter",
    modelFamily: "Claude 4.5",
    baseProviderId: "anthropic",
    category: "standard",
    description: "Anthropic's fastest Claude model with excellent cost-effectiveness and tool use.",
    inputCost: 0.80,
    outputCost: 4.0,
    priceUnit: "per 1M tokens",
    tags: ["fast", "reasoning", "vision", "tools", "claude", "affordable"],
    contextWindow: 200000,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://openrouter.ai/anthropic/claude-haiku-4.5",
    icon: "claude",
    defaults: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 8192,
    },
    apiSdk: (apiKey?: string) => openproviders("openrouter:anthropic/claude-haiku-4.5", undefined, apiKey),
  },
  // Mistral Medium - Strong reasoning
  {
    id: "mistral-medium-2508",
    name: "Mistral Medium",
    provider: "Mistral",
    providerId: "mistral",
    modelFamily: "Mistral",
    baseProviderId: "mistral",
    description: "Agentic medium model with strong reasoning; included in Smarter options.",
    inputCost: 0.4,
    outputCost: 2.0,
    priceUnit: "per 1M tokens",
    tags: ["smart", "reasoning", "tools"],
    contextWindow: 131072,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Medium",
    intelligence: "High",
    website: "https://mistral.ai",
    icon: "smarter",
    defaults: {
      temperature: 0.6,
      topP: 0.9,
      maxTokens: 16384,
    },
    apiSdk: (apiKey?: string) => openproviders("mistral-medium-2508", undefined, apiKey),
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
  // Fast tier vision companion - Sonoma Sky Alpha (OpenRouter, vision-enabled)
  {
    id: "openrouter:openrouter/sonoma-sky-alpha",
    name: "Fast Vision (Sky)",
    provider: "OpenRouter",
    providerId: "openrouter",
    modelFamily: "Sonoma Sky",
    baseProviderId: "openrouter",
    description: "Vision-capable Fast-tier model for analyzing images and documents via OpenRouter.",
    inputCost: 0,
    outputCost: 0,
    priceUnit: "per 1M tokens",
    tags: ["fast", "vision", "multimodal"],
    contextWindow: 32768,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://openrouter.ai/openrouter/sonoma-sky-alpha",
    icon: "faster",
    defaults: {
      temperature: 0.4,
      topP: 0.9,
      maxTokens: 4096,
    },
    apiSdk: (apiKey?: string) => openproviders("openrouter:openrouter/sonoma-sky-alpha", undefined, apiKey),
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
  
  // Balanced tier fallback - GLM 4.5
  {
    id: "openrouter:z-ai/glm-4.5",
    name: "Balanced (Fallback)",
    provider: "OpenRouter",
    providerId: "openrouter",
    modelFamily: "GLM",
    baseProviderId: "z-ai",
    description: "Fallback option for Balanced tier. Z.AI GLM-4.5 with strong reasoning and tool use.",
    inputCost: 0.14,
    outputCost: 0.86,
    priceUnit: "per 1M tokens",
    tags: ["fallback", "reasoning", "reliable"],
    contextWindow: 131072,
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://openrouter.ai/z-ai/glm-4.5",
    icon: "balanced",
    defaults: {
      temperature: 0.5,
      topP: 0.9,
    },
    apiSdk: (apiKey?: string) => openproviders("openrouter:z-ai/glm-4.5", undefined, apiKey),
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
      maxTokens: 16384, // OpenAI official max output (increased from 4096)
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
