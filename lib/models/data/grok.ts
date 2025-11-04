import { ModelConfig } from "../types"
import { getXAIModel } from "../../xai"
import { openproviders } from "@/lib/openproviders"

/**
 * Cleo Agent - Powered by Grok 4 Fast with Reasoning
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
  // Faster: Grok 4 Fast con reasoning activado por defecto (xAI directo por defecto)
  {
    id: "grok-4-fast",
    name: "Faster",
    provider: "xAI",
    providerId: "xai",
    modelFamily: "Grok",
    baseProviderId: "xai",
    description: "Grok 4 Fast con reasoning activado. Modelo rápido y económico optimizado para tareas de texto, análisis y razonamiento.",
    webSearch: true,
    // Pricing pagado: ajusta si cambian tarifas oficiales
    inputCost: 0.5,
    outputCost: 0.5,
    priceUnit: "per 1M tokens",
    tags: ["fast","tools","text","reasoning"],
    contextWindow: 2000000, // Official xAI spec: 2M tokens (updated from 262144)
    vision: true,
    tools: true,
    audio: false,
    reasoning: true, // Activado por defecto
    openSource: false,
    speed: "Fast",
    intelligence: "Medium",
  website: "https://x.ai",
  apiDocs: "https://docs.x.ai",
  modelPage: "https://x.ai/grok",
    releasedAt: "2025-09-27",
    icon: "faster",
    defaults: { temperature: 0.3, topP: 0.9, maxTokens: 32768 }, // Increased from 4096 to 32k for deep analysis
    // Usar xAI directo; el provider-map permite fallback a OpenRouter si el toggle no está activo
    apiSdk: (apiKey?: string) => getXAIModel("grok-4-fast-reasoning", apiKey) as any,
  },
  // Smarter: GPT-5 (modelo premium con límite diario)
  {
    id: "gpt-5",
    name: "Smarter",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "GPT",
    baseProviderId: "openai",
    description: "GPT-5: modelo más inteligente y potente para tareas complejas. Límite: 30 mensajes por día.",
    webSearch: false,
    inputCost: 2.5,
    outputCost: 10.0,
    priceUnit: "per 1M tokens",
    tags: ["premium","tools","vision","reasoning","smart"],
    contextWindow: 128000,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Medium",
    intelligence: "High",
    website: "https://openai.com",
    apiDocs: "https://platform.openai.com/docs",
    modelPage: "https://openai.com/gpt-5",
    releasedAt: "2025-01-01",
    icon: "smarter",
    defaults: { temperature: 0.7, topP: 0.95 },
    dailyLimit: 30, // Límite diario de mensajes
    accessible: true, // Disponible para usuarios autenticados
    apiSdk: (apiKey?: string) => openproviders("openai:gpt-4o", undefined, apiKey), // Usar gpt-4o como backend real
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
