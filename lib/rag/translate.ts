import OpenAI from 'openai'

// Lightweight LRU cache for translations to avoid repeated API calls
class TranslateLRU {
  private max: number
  private map: Map<string, string>
  constructor(max = 1000) {
    this.max = max
    this.map = new Map()
  }
  get(k: string): string | undefined {
    const v = this.map.get(k)
    if (!v) return undefined
    this.map.delete(k)
    this.map.set(k, v)
    return v
  }
  set(k: string, v: string) {
    if (this.map.has(k)) this.map.delete(k)
    else if (this.map.size >= this.max) {
      const fk = this.map.keys().next().value
      if (fk) this.map.delete(fk)
    }
    this.map.set(k, v)
  }
}

const cache: TranslateLRU = (globalThis as any).__translateLRU || ((globalThis as any).__translateLRU = new TranslateLRU(1000))

export type TargetLang = 'es' | 'en'

function cacheKey(text: string, target: TargetLang) {
  return `${target}:${text.trim()}`
}

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

/**
 * Translate short search queries between English/Spanish using OpenAI.
 * Falls back to the original text if API key is missing or errors occur.
 */
export async function translateQuery(text: string, target: TargetLang): Promise<string> {
  const key = cacheKey(text, target)
  const cached = cache.get(key)
  if (cached) return cached

  const client = getClient()
  if (!client) return text

  try {
    const prompt = `Translate the following search query to ${target === 'es' ? 'Spanish' : 'English'}. Return only the translation without quotes.`
    const res = await client.chat.completions.create({
  model: 'openrouter:openai/gpt-4.1-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: text }
      ]
    })
    const translated = res.choices?.[0]?.message?.content?.trim()
    if (translated) {
      cache.set(key, translated)
      return translated
    }
    return text
  } catch (e) {
    console.warn('[RAG:translate] Translation failed, using original text:', (e as any)?.message || e)
    return text
  }
}
