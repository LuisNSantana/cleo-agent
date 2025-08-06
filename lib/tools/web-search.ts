import { tool } from 'ai'
import { z } from 'zod'

interface BraveSearchResult {
  title: string
  url: string
  description: string
  page_age?: string
  meta_url?: {
    hostname: string
  }
}

interface BraveSearchResponse {
  type: string
  web?: {
    type: string
    results: BraveSearchResult[]
  }
  query: {
    original: string
  }
}

// Define output schema for type safety (AI SDK 5 best practice)
const webSearchOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  query: z.string(),
  results: z.array(z.object({
    title: z.string(),
    url: z.string(),
    description: z.string(),
    hostname: z.string(),
    age: z.string()
  })),
  total_results: z.number().optional()
})

export const webSearchTool = tool({
  description: 'Search the web for current information using Brave Search API. Use this when users ask for recent news, current events, latest information, or any topic requiring up-to-date web data.',
  inputSchema: z.object({
    query: z.string().min(1).max(200).describe('The search query to find relevant web information'),
    count: z.number().min(1).max(20).optional().default(10).describe('Number of search results to return (default: 10)'),
  }),
  outputSchema: webSearchOutputSchema,
  onInputStart: ({ toolCallId }) => {
    console.log('🔍 Starting web search:', toolCallId);
  },
  onInputAvailable: ({ input, toolCallId }) => {
    console.log('🔍 Search query ready:', input.query, toolCallId);
  },
  execute: async ({ query, count = 10 }) => {
    try {
      const apiKey = process.env.BRAVE_SEARCH_API_KEY
      
      if (!apiKey) {
        throw new Error('BRAVE_SEARCH_API_KEY no está configurada en las variables de entorno')
      }

      const searchParams = new URLSearchParams({
        q: query,
        count: count.toString(),
        country: 'us',
        search_lang: 'es',
        safesearch: 'moderate',
      })

      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      })

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`)
      }

      const data: BraveSearchResponse = await response.json()

      if (!data.web?.results || data.web.results.length === 0) {
        return {
          success: false,
          message: `No se encontraron resultados para la consulta: "${query}"`,
          query: data.query.original,
          results: []
        }
      }

      const results = data.web.results.map(result => ({
        title: result.title,
        url: result.url,
        description: result.description,
        hostname: result.meta_url?.hostname || new URL(result.url).hostname,
        age: result.page_age || 'Fecha desconocida'
      }))

      return {
        success: true,
        message: `Se encontraron ${results.length} resultados para la consulta: "${data.query.original}"`,
        query: data.query.original,
        results,
        total_results: results.length
      }

    } catch (error) {
      console.error('Error en web search:', error)
      return {
        success: false,
        message: `Error al realizar la búsqueda: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        query,
        results: []
      }
    }
  },
})
