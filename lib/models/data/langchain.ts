import { createOpenAI } from "@ai-sdk/openai"
import { ModelConfig } from "../types"

// Mock SDK for LangChain models - actual routing happens in our API
const createLangChainSdk = () => createOpenAI({
  apiKey: "langchain-orchestrator",
  baseURL: "/api/multi-model-chat"
})

/**
 * LangChain Multi-Model Orchestration configurations
 * These are production-optimized routing models with different performance profiles
 */
export const langchainModels: ModelConfig[] = [
  {
    id: "langchain:balanced-local",
    name: "Balanced (llama3 8B)",
    provider: "LangChain",
    providerId: "langchain",
    baseProviderId: "langchain",
    description: "Balanced local model (Llama 3.1 8B) used as primary on-prem inference for fast, empathetic responses; cloud fallback available for larger tasks.",
    tags: ["balanced", "local-first", "ollama", "llama3", "cost-effective"],
    contextWindow: 32000, // Enhanced context for better tool support
    inputCost: 0.01, // Very low cost due to local processing
    outputCost: 0.05,
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    webSearch: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://langchain.com",
    apiDocs: "https://docs.langchain.com/docs/category/langgraph",
    modelPage: "https://docs.langchain.com/docs/category/langgraph",
    releasedAt: "2024-12-01",
    icon: "langchain",
  accessible: true,
    apiSdk: () => createLangChainSdk().chat("langchain-balanced-local"),
    defaults: {
      temperature: 0.7,
      maxTokens: 8192, // Increased from 4096 for better local responses
    },
  },
  {
    id: "langchain:balanced",
    name: "Balanced",
    provider: "LangChain",
    providerId: "langchain", 
    baseProviderId: "langchain",
    description: "High-reasoning cloud models with full 32k context - GPT-5-mini for complex tasks, Groq for speed, enhanced tool support",
    tags: ["reasoning", "quality", "gpt5-mini", "premium", "balanced", "full-context"],
    contextWindow: 131000, // Full cloud context window
    inputCost: 1.5,
    outputCost: 4.0,
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    webSearch: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://langchain.com",
    apiDocs: "https://docs.langchain.com/docs/category/langgraph", 
    modelPage: "https://docs.langchain.com/docs/category/langgraph",
    releasedAt: "2024-12-01",
    icon: "langchain",
    accessible: true,
    apiSdk: () => createLangChainSdk().chat("langchain-balanced"),
    defaults: {
      temperature: 0.7,
      maxTokens: 12288, // Increased from 6144 for complex reasoning tasks
    },
  },
  {
    id: "langchain:fast",
    name: "Fast",
    provider: "LangChain",
    providerId: "langchain",
    baseProviderId: "langchain",
    description: "Speed-optimized cloud services with full context support - Groq GPT-OSS-120B for ultra-fast inference with enhanced tool capabilities",
    tags: ["speed-optimized", "groq", "gpt-oss-120b", "ultra-fast", "performance", "full-context", "enhanced-tools"],
    contextWindow: 131000, // Full cloud context window
    inputCost: 0.1,
    outputCost: 0.3,
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    webSearch: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://langchain.com",
    apiDocs: "https://docs.langchain.com/docs/category/langgraph",
    modelPage: "https://docs.langchain.com/docs/category/langgraph", 
    releasedAt: "2024-12-01",
    icon: "langchain",
    accessible: true,
    apiSdk: () => createLangChainSdk().chat("langchain-fast"),
    defaults: {
      temperature: 0.7,
      maxTokens: 8192, // Increased from 4096 for better fast responses
    },
  }
]
