import { openproviders } from "@/lib/openproviders"
import { ModelConfig } from "../types"

// Minimal OpenAI models file: only GPT-5 Nano
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
    reasoning: false,
    openSource: false,
    speed: "Fast",
    intelligence: "Medium",
    website: "https://platform.openai.com",
    apiDocs: "https://platform.openai.com/docs/models",
    modelPage: "https://platform.openai.com/docs/models",
    releasedAt: "2025-05-01",
    icon: "gpt-4",
    apiSdk: (apiKey?: string) => openproviders("gpt-5-nano", undefined, apiKey),
  },
]

export { openaiModels }
