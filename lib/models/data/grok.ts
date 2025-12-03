import { ModelConfig } from "../types"
import { getXAIModel } from "../../xai"
import { openproviders } from "@/lib/openproviders"

/**
 * Cleo Agent - Powered by Grok 4.1 Fast with Reasoning
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
  // NEW: Grok 4.1 Fast Reasoning - Latest xAI model with 2M context
  {
    id: "grok-4-1-fast-reasoning",
    name: "Grok 4.1 Fast",
    provider: "xAI",
    providerId: "xai",
    modelFamily: "Grok",
    baseProviderId: "xai",
    description: "Grok 4.1 Fast Reasoning: xAI's latest high-speed model with 2M token context. Optimized for fast inference while maintaining strong reasoning through thinking tokens. Supports vision, tool use, and JSON output.",
    webSearch: true,
    inputCost: 3.00, // $3.00 per 1M input tokens
    outputCost: 15.00, // $15.00 per 1M output tokens
    priceUnit: "per 1M tokens",
    tags: ["xai", "grok", "reasoning", "fast", "vision", "tool-calling", "2m-context"],
    contextWindow: 2000000, // 2M tokens - official xAI spec
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://x.ai",
    apiDocs: "https://docs.x.ai/docs/models",
    modelPage: "https://x.ai/news/grok-4-1",
    releasedAt: "2025-11-17",
    icon: "xai",
    defaults: { temperature: 0.3, topP: 0.9, maxTokens: 32768 },
    apiSdk: (apiKey?: string) => getXAIModel("grok-4-1-fast-reasoning", apiKey) as any,
  },
  // Faster: Grok 4.1 Fast Reasoning - Latest xAI model (renamed from grok-4-fast)
  {
    id: "grok-4-fast",
    name: "Faster",
    provider: "xAI",
    providerId: "xai",
    modelFamily: "Grok",
    baseProviderId: "xai",
    description: "Grok 4.1 Fast Reasoning: xAI's latest high-speed model with 2M token context. Optimized for fast inference with strong reasoning.",
    webSearch: true,
    inputCost: 3.00, // Updated pricing for 4.1
    outputCost: 15.00,
    priceUnit: "per 1M tokens",
    tags: ["fast","tools","text","reasoning","vision","2m-context"],
    contextWindow: 2000000, // Official xAI spec: 2M tokens
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://x.ai",
    apiDocs: "https://docs.x.ai",
    modelPage: "https://x.ai/grok",
    releasedAt: "2025-11-17",
    icon: "faster",
    defaults: { temperature: 0.3, topP: 0.9, maxTokens: 32768 },
    // Now uses grok-4-1-fast-reasoning (latest)
    apiSdk: (apiKey?: string) => getXAIModel("grok-4-1-fast-reasoning", apiKey) as any,
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
