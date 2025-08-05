import { ModelConfig } from "../types"
import { getXAIModel } from "../../xai"

/**
 * Cleo Agent - Powered by Grok-4
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
  {
    id: "grok-4",
    name: "Cleo Agent (Grok-4)",
    provider: "xAI",
    providerId: "xai",
    modelFamily: "Grok",
    baseProviderId: "xai",
    description: "Cleo is your intelligent AI agent powered by Grok-4. Specialized in document analysis, calendar management, live search, and complex reasoning tasks with vision capabilities.",
    tags: [
      "agent", 
      "document-analysis", 
      "calendar-management", 
      "live-search", 
      "reasoning", 
      "vision", 
      "function-calling",
      "real-time-info"
    ],
    contextWindow: 256000,
    vision: true,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://x.ai",
    apiDocs: "https://docs.x.ai/docs/models/grok-4-0709",
    modelPage: "https://x.ai/grok",
    releasedAt: "2024-12-01",
    icon: "xai",
    apiSdk: () => getXAIModel("grok-4") as any, // Cast temporal para compatibilidad v1/v2
  }
]

export { grokModels }
