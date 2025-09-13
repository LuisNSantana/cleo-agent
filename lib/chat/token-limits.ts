// Centralized per-model output token limits to prevent provider 400 errors
// This clamps the requested max tokens to a safe upper bound by model family/provider.

export function clampMaxOutputTokens(modelId: string, requested?: number): number {
  const id = (modelId || '').toLowerCase()

  // Conservative defaults
  const DEFAULT_SAFE = 4096

  // Family-based caps (output tokens, not context window)
  // Tune upward carefully once verified per provider
  let cap = DEFAULT_SAFE

  if (id.startsWith('claude-3-5-haiku')) cap = 8192
  else if (id.startsWith('claude-3-5') || id.startsWith('anthropic/claude-3-5')) cap = 8192 // 8k supported w/ beta header
  else if (id.startsWith('gpt-5')) cap = 8192
  else if (id.startsWith('gpt-4o') || id.startsWith('gpt-4.1') || id.includes('openai/')) cap = 16384 // API commonly enforces 4k output
  else if (id.startsWith('grok-3')) cap = 16384 // Observed ~16k output capability
  else if (id.includes('gemini')) cap = 16384 // Gemini 2.5 Flash-Lite supports very high output; 16k is safe across providers
  else if (id.includes('mistral')) cap = 4096
  else if (id.includes('qwen')) cap = 4096
  else if (id.includes('deepseek')) cap = 8192 // Official max 32k; many providers allow >=8k safely
  else if (id.includes('llama') || id.includes('meta/')) cap = 8192
  else if (id.includes('groq/') || id.includes('gpt-oss')) cap = 16384

  const req = typeof requested === 'number' && requested > 0 ? requested : cap
  return Math.min(req, cap)
}
