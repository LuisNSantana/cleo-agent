import { openproviders } from "@/lib/openproviders"
import { ModelConfig } from "../types"

// OpenAI models file: GPT-5 family with reasoning support
const openaiModels: ModelConfig[] = [
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "GPT-5",
    baseProviderId: "openai",
    description:
      "Ultra-fast lightweight GPT-5 Nano model for low-latency tasks and tools.",
    tags: ["openai", "nano", "fast", "tools"],
    contextWindow: 1048576,
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "Medium",
    website: "https://platform.openai.com",
    apiDocs: "https://platform.openai.com/docs/models",
    modelPage: "https://platform.openai.com/docs/models/gpt-5-nano",
    releasedAt: "2025-05-01",
    icon: "gpt-4",
    apiSdk: (apiKey?: string) => openproviders("gpt-5-nano", undefined, apiKey),
  },
  {
    id: "gpt-5-mini-2025-08-07",
    name: "GPT-5 mini",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "GPT-5",
    baseProviderId: "openai",
    description:
      "A faster, cost-efficient version of GPT-5. Great for well-defined tasks and precise prompts with enhanced reasoning capabilities.",
    tags: ["openai", "mini", "fast", "tools", "reasoning"],
    contextWindow: 400000,
    inputCost: 0.25,
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
    icon: "gpt-4",
    apiSdk: (apiKey?: string) => openproviders("gpt-5-mini-2025-08-07", undefined, apiKey),
  },
]

export { openaiModels }
