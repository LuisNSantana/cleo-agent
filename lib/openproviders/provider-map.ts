import type { Provider, SupportedModel } from "./types"

// map each model ID to its provider
const MODEL_PROVIDER_MAP: Record<string, Provider> = {
  // OpenRouter models
  "openrouter:z-ai/glm-4.5": "openrouter",
  "z-ai/glm-4.5": "openrouter",
  "openrouter:openai/gpt-oss-120b": "openrouter",
  "openrouter:openai/gpt-4.1-mini": "openrouter",
  "openrouter:deepseek/deepseek-chat-v3.1:free": "openrouter",
  "deepseek/deepseek-chat-v3.1:free": "openrouter",
  "openrouter:openrouter/sonoma-dusk-alpha": "openrouter",
  "openrouter/sonoma-dusk-alpha": "openrouter",
  "openrouter:openrouter/sonoma-sky-alpha": "openrouter",
  "openrouter/sonoma-sky-alpha": "openrouter",
  // Curated OpenRouter additions (tool-capable)
  "openrouter:qwen/qwen3-next-80b-a3b-thinking": "openrouter",
  "qwen/qwen3-next-80b-a3b-thinking": "openrouter",
  "openrouter:nvidia/nemotron-nano-9b-v2:free": "openrouter",
  "nvidia/nemotron-nano-9b-v2:free": "openrouter",
  "openrouter:meta-llama/llama-3.1-405b-instruct": "openrouter",
  "meta-llama/llama-3.1-405b-instruct": "openrouter",
  // New OpenRouter free additions
  "openrouter:mistralai/mistral-small-3.2-24b-instruct:free": "openrouter",
  "mistralai/mistral-small-3.2-24b-instruct:free": "openrouter",
  "openrouter:google/gemma-3-27b-it:free": "openrouter",
  "google/gemma-3-27b-it:free": "openrouter",
  "openrouter:meta-llama/llama-4-maverick:free": "openrouter",
  "meta-llama/llama-4-maverick:free": "openrouter",
  "openrouter:meta-llama/llama-4-scout:free": "openrouter",
  "meta-llama/llama-4-scout:free": "openrouter",
  // Additional OpenRouter free models
  "openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free": "openrouter",
  // Removed deprecated Nemotron Ultra 253B mapping
  "openrouter:tngtech/deepseek-r1t-chimera:free": "openrouter",

  o1: "openai",
  "o1-2024-12-17": "openai",
  "o1-mini": "openai",
  "o1-mini-2024-09-12": "openai",
  "o1-preview": "openai",
  "o1-preview-2024-09-12": "openai",
  "o3-mini": "openai",
  "o3-mini-2025-01-31": "openai",
  "gpt-4.1": "openai",
  "gpt-4.1-2025-04-14": "openai",
  "gpt-4.1-mini": "openai",
  "gpt-4.1-mini-2025-04-14": "openai",
  "gpt-4.1-nano": "openai",
  "gpt-4.1-nano-2025-04-14": "openai",
  "gpt-4o": "openai",
  "gpt-4o-2024-05-13": "openai",
  "gpt-4o-2024-08-06": "openai",
  "gpt-4o-2024-11-20": "openai",
  "gpt-4o-audio-preview": "openai",
  "gpt-4o-audio-preview-2024-10-01": "openai",
  "gpt-4o-audio-preview-2024-12-17": "openai",
  "gpt-4o-search-preview": "openai",
  "gpt-4o-search-preview-2025-03-11": "openai",
  "gpt-4o-mini": "openai",
  "gpt-4o-mini-2024-07-18": "openai",
  "gpt-4-turbo": "openai",
  "gpt-4-turbo-2024-04-09": "openai",
  "gpt-4-turbo-preview": "openai",
  "gpt-4-0125-preview": "openai",
  "gpt-4-1106-preview": "openai",
  "gpt-4": "openai",
  "gpt-4-0613": "openai",
  "gpt-4.5-preview": "openai",
  "gpt-4.5-preview-2025-02-27": "openai",
  "gpt-3.5-turbo-0125": "openai",
  "gpt-3.5-turbo": "openai",
  "gpt-3.5-turbo-1106": "openai",
  "chatgpt-4o-latest": "openai",
  "gpt-3.5-turbo-instruct": "openai",
  o3: "openai",
  "o3-2025-04-16": "openai",
  "o4-mini": "openai",
  "o4-mini-2025-04-16": "openai",
  "gpt-5-nano": "openai",
  "gpt-5-mini-2025-08-07": "openai",

  // Groq models (including OpenAI models hosted on Groq)
  "gpt-oss-120b": "groq",
  "gpt-oss-20b": "groq",
  "openai/gpt-oss-120b": "groq",
  "openai/gpt-oss-20b": "groq",
  "llama-3.3-70b-versatile": "groq",
  "llama-3.1-8b-instant": "groq",
  "meta-llama/llama-4-maverick-17b-128e-instruct": "groq",

  // Mistral
  "ministral-3b-latest": "mistral",
  "ministral-8b-latest": "mistral",
  "mistral-medium-2508": "mistral",
  "mistral-large-latest": "mistral",
  "mistral-small-latest": "mistral",
  "pixtral-large-latest": "mistral",
  "pixtral-12b-2409": "mistral",
  "open-mistral-7b": "mistral",
  "open-mixtral-8x7b": "mistral",
  "open-mixtral-8x22b": "mistral",

  //Perplexity
  "sonar":"perplexity",
  "sonar-pro": "perplexity",
  "sonar-deep-research": "perplexity",
  "sonar-reasoning-pro": "perplexity",
  "sonar-reasoning": "perplexity",

  // Google
  "gemini-2.5-flash-lite": "google",
  "gemini-2.0-flash-001": "google",
  "gemini-1.5-flash": "google",
  "gemini-1.5-flash-latest": "google",
  "gemini-1.5-flash-001": "google",
  "gemini-1.5-flash-002": "google",
  "gemini-1.5-flash-8b": "google",
  "gemini-1.5-flash-8b-latest": "google",
  "gemini-1.5-flash-8b-001": "google",
  "gemini-1.5-pro": "google",
  "gemini-1.5-pro-latest": "google",
  "gemini-1.5-pro-001": "google",
  "gemini-1.5-pro-002": "google",
  "gemini-2.5-pro-exp-03-25": "google",
  "gemini-2.0-flash-lite-preview-02-05": "google",
  "gemini-2.0-pro-exp-02-05": "google",
  "gemini-2.0-flash-thinking-exp-01-21": "google",
  "gemini-2.0-flash-exp": "google",
  "gemini-exp-1206": "google",
  "gemma-3-27b-it": "google",
  "learnlm-1.5-pro-experimental": "google",

  // Anthropic
  "claude-3-7-sonnet-20250219": "anthropic",
  "claude-3-5-sonnet-latest": "anthropic",
  "claude-3-5-sonnet-20241022": "anthropic",
  "claude-3-5-sonnet-20240620": "anthropic",
  "claude-3-5-haiku-latest": "anthropic",
  "claude-3-5-haiku-20241022": "anthropic",
  "claude-3-opus-latest": "anthropic",
  "claude-3-opus-20240229": "anthropic",
  "claude-3-sonnet-20240229": "anthropic",
  "claude-3-haiku-20240307": "anthropic",

  // XAI
  "grok-4": "xai",
  "grok-3": "xai",
  "grok-3-latest": "xai",
  "grok-3-fast": "xai",
  "grok-3-fast-latest": "xai",
  "grok-3-mini": "xai",
  "grok-3-mini-latest": "xai",
  "grok-3-mini-fast": "xai",
  "grok-3-mini-fast-latest": "xai",
  "grok-code-fast-1": "xai",
  "grok-2-vision-1212": "xai",
  "grok-2-vision": "xai",
  "grok-2-vision-latest": "xai",
  "grok-2-image-1212": "xai",
  "grok-2-image": "xai",
  "grok-2-image-latest": "xai",
  "grok-2-1212": "xai",
  "grok-2": "xai",
  "grok-2-latest": "xai",
  "grok-vision-beta": "xai",
  "grok-beta": "xai",

  // LangChain Multi-Model Orchestration
  "langchain:multi-model-smart": "langchain" as Provider,
  "langchain:multi-model-balanced": "langchain" as Provider,
  "langchain:multi-model-performance": "langchain" as Provider,
  // New optimized LangChain configurations
  "langchain:balanced-local": "langchain" as Provider,
  "langchain:balanced": "langchain" as Provider,
  "langchain:fast": "langchain" as Provider,

  // Static Ollama models
  "llama3.2:latest": "ollama",
  "qwen2.5-coder:latest": "ollama",
}

// Known provider prefixes we may receive in model IDs coming from routers or UI
const KNOWN_PREFIX_PROVIDERS: Provider[] = [
  "openai",
  "mistral",
  "perplexity",
  "google",
  "anthropic",
  "xai",
  "groq",
  "ollama",
  "openrouter",
  "langchain",
]

// Function to check if a model is likely an Ollama model based on naming patterns
function isOllamaModel(modelId: string): boolean {
  // Common Ollama model patterns
  const ollamaPatterns = [
    /^llama/i,
    /^qwen/i,
    /^deepseek/i,
    /^mistral:/i,
    /^codellama/i,
    /^phi/i,
    /^gemma/i,
    /^codegemma/i,
    /^starcoder/i,
    /^wizardcoder/i,
    /^solar/i,
    /^yi/i,
    /^openchat/i,
    /^vicuna/i,
    /^orca/i,
    /:latest$/i,
    /:[\d.]+[bB]?$/i, // version tags like :7b, :13b, :1.5
  ]

  return ollamaPatterns.some((pattern) => pattern.test(modelId))
}

/**
 * Remove provider prefix like "groq:" or "openai:" from a model id.
 * If no known prefix exists, returns the input unchanged.
 */
export function normalizeModelId(model: string): string {
  const idx = model.indexOf(":")
  let core = model
  if (idx > 0) {
    const maybePrefix = model.slice(0, idx) as Provider
    if (KNOWN_PREFIX_PROVIDERS.includes(maybePrefix)) {
      core = model.slice(idx + 1)
    }
  }

  // Aliases for legacy or incorrect IDs to prevent 400 errors
  switch (core) {
    case "meta-llama/meta-llama-3.1-405b-instruct":
      // Corrected canonical OpenRouter path uses llama-3.1-405b-instruct
      return "meta-llama/llama-3.1-405b-instruct"
    case "nvidia/llama-3.1-nemotron-ultra-253b-v1":
      // Route deprecated Nemotron Ultra to preferred default
      return "openrouter/sonoma-sky-alpha"
    default:
      return core
  }
}

export function getProviderForModel(model: SupportedModel): Provider {
  // Prefer explicit prefix if present
  const idx = (model as string).indexOf(":")
  if (idx > 0) {
    const maybePrefix = (model as string).slice(0, idx) as Provider
    if (KNOWN_PREFIX_PROVIDERS.includes(maybePrefix)) {
      return maybePrefix
    }
  }

  // Then check the static mapping
  const provider = MODEL_PROVIDER_MAP[model]
  if (provider) return provider

  // Finally, infer Ollama by pattern
  if (isOllamaModel(model as string)) {
    return "ollama"
  }

  throw new Error(`Unknown provider for model: ${model}`)
}
