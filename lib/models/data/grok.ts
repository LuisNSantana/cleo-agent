import { ModelConfig } from "../types"
import { getXAIModel } from "../../xai"
import { openproviders } from "@/lib/openproviders"

/**
 * Cleo Agent - Powered by Grok-3 Mini (Faster)
 * 
 * Cleo is an intelligent AI agent designed to:
 * - Analyze and create documents with deep understanding
 * - Manage Google Calendar events intelligently 
 * - Perform live search with real-time information
 * - Process and understand visual content
 * - Execute complex reasoning tasks
 * - Handle function calls for external integrations
 */
const grokModels: ModelConfig[] = [
  // New simplified public models
  {
    id: "grok-4-fast",
    name: "Faster",
    provider: "OpenRouter", // Se sirve vía OpenRouter
    providerId: "openrouter",
    modelFamily: "Grok",
    baseProviderId: "xai",
    description: "Grok 4 Fast (free via OpenRouter) optimizado para tareas de texto rápidas y económicas.",
    webSearch: true,
    inputCost: 0.0,
    outputCost: 0.0,
    priceUnit: "per 1M tokens",
    tags: ["fast","free","tools","text"],
    contextWindow: 262144,
  // Marcado como vision true (híbrido) para permitir adjuntar archivos y análisis básico de imágenes
  vision: true,
    tools: true,
    audio: false,
    reasoning: false,
    openSource: false,
    speed: "Fast",
    intelligence: "Medium",
    website: "https://openrouter.ai",
    apiDocs: "https://openrouter.ai/docs",
    modelPage: "https://openrouter.ai/x-ai/grok-4-fast",
    releasedAt: "2025-09-27",
    icon: "faster",
    defaults: { temperature: 0.3, topP: 0.9 },
    // Usamos el endpoint real de OpenRouter; la fábrica hará mapping interno también
    apiSdk: (apiKey?: string) => openproviders("openrouter:x-ai/grok-4-fast", undefined, apiKey),
  },
  {
    id: "grok-4-fast-reasoning",
    name: "Smarter",
    provider: "xAI",
    providerId: "xai",
    modelFamily: "Grok",
    baseProviderId: "xai",
    description:
      "Latest Grok 4 Fast with advanced reasoning capabilities. 2M context window, multimodal support, perfect for complex analysis and document processing.",
    webSearch: true,
    // Pricing from attachment: $0.20/$0.40 input, $0.50 output
    inputCost: 0.20, // $0.20 per 1M tokens (<128k), $0.40 (>128k)
    outputCost: 0.50, // $0.50 per 1M tokens
    priceUnit: "per 1M tokens",
    tags: [
      "reasoning",
      "multimodal",
      "2m-context",
      "latest",
      "premium",
      "document-analysis"
    ],
    contextWindow: 2000000, // 2M tokens!
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://x.ai/news/grok-4-fast",
    apiDocs: "https://docs.x.ai/",
    modelPage: "https://x.ai/news/grok-4-fast",
    releasedAt: "2025-09-19",
    dailyLimit: 50, // reasonable limit for premium reasoning
    icon: "xai",
    defaults: {
      temperature: 0.3,
      topP: 0.9,
    },
    apiSdk: (apiKey?: string) => getXAIModel("grok-4-fast-reasoning", apiKey) as any,
  },
  {
    id: "grok-4-fast-non-reasoning",
    name: "Grok 4 Fast (Multimodal)",
    provider: "xAI",
    providerId: "xai",
    modelFamily: "Grok",
    baseProviderId: "xai",
    description:
      "Grok 4 Fast optimized for multimodal tasks. Excellent for image analysis, document processing, and general tasks with 2M context window.",
    webSearch: true,
    // Same competitive pricing
    inputCost: 0.20,
    outputCost: 0.50,
    priceUnit: "per 1M tokens",
    tags: [
      "multimodal",
      "fast",
      "2m-context",
      "image-analysis",
      "documents",
      "cost-effective"
    ],
    contextWindow: 2000000, // 2M tokens
    vision: true,
    tools: true,
    audio: false,
    reasoning: false, // non-reasoning variant
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://x.ai/news/grok-4-fast",
    apiDocs: "https://docs.x.ai/",
    modelPage: "https://x.ai/news/grok-4-fast",
    releasedAt: "2025-09-19",
    dailyLimit: 100, // higher limit for non-reasoning
    icon: "xai",
    defaults: {
      temperature: 0.3,
      topP: 0.9,
    },
    apiSdk: (apiKey?: string) => getXAIModel("grok-4-fast-non-reasoning", apiKey) as any,
  },
  {
    id: "grok-3-mini",
    name: "Faster",
    provider: "xAI",
    providerId: "xai",
    modelFamily: "Grok",
    baseProviderId: "xai",
  description:
      "Lightning-fast Grok-3 Mini for low-latency tasks with tool calling and basic vision support.",
  // Grok has native Live Search. Mark as webSearch-capable so the UI toggle appears,
  // but the backend will route to xAI native search instead of the generic webSearch tool.
  webSearch: true,
  // Pricing: $0.4 per 1M tokens (both input and output)
  inputCost: 0.4,
  outputCost: 0.4,
  priceUnit: "per 1M tokens",
    tags: [
      "fast",
      "tools",
      "vision",
      "low-latency",
    ],
    contextWindow: 131072,
    vision: true,
    tools: true,
    audio: false,
    reasoning: false,
    openSource: false,
    speed: "Fast",
    intelligence: "Medium",
    website: "https://x.ai",
    apiDocs: "https://docs.x.ai/",
    modelPage: "https://x.ai/grok",
    releasedAt: "2025-01-01",
    icon: "faster",
    defaults: {
      temperature: 0.3,
      topP: 0.9,
      // leave maxTokens undefined to let the SDK stream freely; set if you want stricter caps
    },
    apiSdk: (apiKey?: string) => getXAIModel("grok-3-mini", apiKey) as any, // allow override key from route
  },
]

export { grokModels }
