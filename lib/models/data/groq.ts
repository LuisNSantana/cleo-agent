import { openproviders } from "@/lib/openproviders"
import { ModelConfig } from "../types"

/**
 * Groq Models for Cleo Agent
 * 
 * High-performance models running on Groq's LPU (Language Processing Unit)
 * including OpenAI's GPT-OSS models and Llama variants.
 */
const groqModels: ModelConfig[] = [
  {
    id: "gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "Groq",
    providerId: "groq",
    modelFamily: "GPT-OSS",
    baseProviderId: "groq",
    description:
      "OpenAI's flagship open-source model with 120B parameters. Built on Mixture-of-Experts (MoE) architecture for advanced reasoning and tool use. Optimized for speed on Groq's LPU infrastructure.",
    tags: ["open-source", "moe", "reasoning", "tools", "flagship", "120b", "fast"],
    contextWindow: 128000,
    inputCost: 0.2,
    outputCost: 0.4,
    priceUnit: "per 1M tokens",
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "High",
    website: "https://groq.com",
    apiDocs: "https://console.groq.com/docs/model/openai/gpt-oss-120b",
    modelPage: "https://openai.com/index/gpt-oss-model-card/",
    releasedAt: "2025-01-01",
    icon: "groq",
    apiSdk: (apiKey?: string) => openproviders("gpt-oss-120b", undefined, apiKey),
  },
  {
    id: "gpt-oss-20b",
    name: "GPT-OSS 20B",
    provider: "Groq",
    providerId: "groq",
    modelFamily: "GPT-OSS",
    baseProviderId: "groq",
    description:
      "OpenAI's compact open-source model with 20B parameters. Faster and more efficient while maintaining strong performance for most tasks.",
    tags: ["open-source", "compact", "efficient", "fast"],
    contextWindow: 128000,
    inputCost: 0.1,
    outputCost: 0.2,
    priceUnit: "per 1M tokens",
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "High",
    website: "https://groq.com",
    apiDocs: "https://console.groq.com/docs/model/openai/gpt-oss-20b",
    modelPage: "https://openai.com/index/gpt-oss-model-card/",
    releasedAt: "2025-01-01",
    icon: "groq",
    apiSdk: (apiKey?: string) => openproviders("gpt-oss-20b", undefined, apiKey),
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "Groq",
    providerId: "groq",
    modelFamily: "Llama",
    baseProviderId: "groq",
    description:
      "Meta's latest Llama model with 70B parameters, optimized for versatile tasks and running at high speed on Groq's infrastructure.",
    tags: ["meta", "llama", "versatile", "70b", "fast"],
    contextWindow: 131072,
    inputCost: 0.5,
    outputCost: 0.8,
    priceUnit: "per 1M tokens",
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "High",
    website: "https://groq.com",
    apiDocs: "https://console.groq.com/docs/models",
    modelPage: "https://llama.meta.com/",
    releasedAt: "2024-12-01",
    icon: "groq",
    apiSdk: (apiKey?: string) => openproviders("llama-3.3-70b-versatile", undefined, apiKey),
  }
]

export { groqModels }
