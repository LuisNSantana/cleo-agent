import { getGroqModel } from "@/lib/groq"
import { ModelConfig } from "../types"

/**
 * Llama Models for Cleo Agent
 * 
 * Optimized selection of Llama models for the Cleo agent,
 * focusing on performance and capabilities rather than pricing.
 */
const llamaModels: ModelConfig[] = [
  {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "Meta",
    providerId: "meta",
    modelFamily: "Llama 4",
    baseProviderId: "meta",
    description:
      "Latest Llama 4 Maverick model with enhanced reasoning, performance, and vision capabilities for multimodal agent tasks.",
    tags: ["maverick", "latest", "reasoning", "agent", "performance", "vision", "multimodal"],
    contextWindow: 200000,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "High",
    website: "https://llama.meta.com",
    apiDocs: "https://docs.groq.com",
    modelPage: "https://ai.meta.com/llama/",
    releasedAt: "2024-12-01",
    icon: "meta",
    apiSdk: (_apiKey?: string, _opts?: { enableSearch?: boolean }) => getGroqModel("llama-4-maverick"),
  },
  {
    id: "llama-3-3-70b-groq",
    name: "Llama 3.3 70B (Groq)",
    provider: "Meta",
    providerId: "meta",
    modelFamily: "Llama 3",
    baseProviderId: "meta",
    description:
      "Groq-hosted Llama 3.3 with enhanced 70B weights and large context for complex agent tasks.",
    tags: ["groq-hosted", "large", "70b", "enhanced", "agent"],
    contextWindow: 128000,
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "High",
    website: "https://llama.meta.com",
    apiDocs: "https://docs.groq.com",
    modelPage: "https://ai.meta.com/llama/",
    releasedAt: "2024-12-06",
    icon: "meta",
    apiSdk: (_apiKey?: string, _opts?: { enableSearch?: boolean }) => getGroqModel("llama-3-3-70b-groq"),
  },
  {
    id: "llama-3-1-8b-groq",
    name: "Llama 3.1 8B (Groq)",
    provider: "Meta",
    providerId: "meta",
    modelFamily: "Llama 3",
    baseProviderId: "meta",
    description:
      "Lightweight 8B version of Llama 3.1, optimized for fast responses in agent workflows.",
    tags: ["groq-hosted", "8b", "lightweight", "fast", "agent"],
    contextWindow: 128000,
    vision: false,
    tools: true,
    audio: false,
    reasoning: false,
    openSource: true,
    speed: "Fast",
    intelligence: "Medium",
    website: "https://llama.meta.com",
    apiDocs: "https://docs.groq.com",
    modelPage: "https://ai.meta.com/llama/",
    releasedAt: "2024-07-23",
    icon: "meta",
    apiSdk: (_apiKey?: string, _opts?: { enableSearch?: boolean }) => getGroqModel("llama-3-1-8b-groq"),
  }
]

export { llamaModels }
