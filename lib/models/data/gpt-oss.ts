import { getGroqModel } from "@/lib/groq"
import { ModelConfig } from "../types"

/**
 * GPT-OSS Models for Cleo Agent
 * 
 * OpenAI's flagship open source model GPT-OSS 120B,
 * built on Mixture-of-Experts (MoE) architecture.
 */
const gptOssModels: ModelConfig[] = [
  {
    id: "gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "OpenAI",
    providerId: "openai",
    modelFamily: "GPT-OSS",
    baseProviderId: "groq",
    description:
      "OpenAI's flagship open source model with 20B parameters and 128 experts. Built on Mixture-of-Experts (MoE) architecture for advanced reasoning and tool use.",
    tags: ["open-source", "moe", "reasoning", "tools", "flagship", "120b"],
    contextWindow: 128000,
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "High",
    website: "https://openai.com",
    apiDocs: "https://console.groq.com/docs/model/openai/gpt-oss-120b",
    modelPage: "https://openai.com/index/gpt-oss-model-card/",
    releasedAt: "2025-01-01",
    icon: "openai",
    apiSdk: ( _apiKey?: string, _opts?: { enableSearch?: boolean } ) => {
      // GPT-OSS 120B uses Groq API with GROQ_API_KEY
      return getGroqModel("gpt-oss-120b")
    },
  }
]

export { gptOssModels }
