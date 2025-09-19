import { openproviders } from "@/lib/openproviders"
import { ModelConfig } from "../types"

// OpenAI: GPT-5 models (mini and nano)
const openaiModels: ModelConfig[] = [
  {
    id: "gpt-5-mini-2025-08-07",
    name: "Smarter",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "GPT-5",
    baseProviderId: "openai",
    description:
      "Smart, capable GPT-5 mini with strong reasoning, vision, and tool use.",
    tags: ["smart", "reasoning", "vision", "tools"],
    contextWindow: 400000,
  // Pricing: $2 per 1M tokens for both input and output (requested)
  inputCost: 2.0,
  outputCost: 2.0,
  priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://platform.openai.com",
    apiDocs: "https://platform.openai.com/docs/models",
    modelPage: "https://platform.openai.com/docs/models/gpt-5-mini",
    releasedAt: "2025-08-07",
  icon: "smarter",
    apiSdk: (apiKey?: string) => openproviders("gpt-5-mini-2025-08-07", undefined, apiKey),
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "GPT-5",
    baseProviderId: "openai",
    description: "Economical GPT-5 nano with reasoning capabilities, optimized for cost-effectiveness.",
    tags: ["fast", "reasoning", "economical", "nano"],
    contextWindow: 128000,
    inputCost: 2.0,
    outputCost: 2.0,
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "Medium",
    website: "https://platform.openai.com",
    apiDocs: "https://platform.openai.com/docs/models",
    modelPage: "https://platform.openai.com/docs/models/gpt-5-nano",
    icon: "openai",
    apiSdk: (apiKey?: string) => openproviders("gpt-5-nano", undefined, apiKey),
  },
]

export { openaiModels }
