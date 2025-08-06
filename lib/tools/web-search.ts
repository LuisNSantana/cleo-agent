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

export const webSearchTool = tool({
  description: `Busca información actualizada en internet usando Brave Search API. 
  Útil para obtener información reciente, noticias, datos específicos o cualquier consulta que requiera información actualizada de la web.`,
  inputSchema: z.object({
    query: z.string().describe('La consulta de búsqueda web'),
    count: z.number().min(1).max(20).optional().default(10).describe('Número de resultados a devolver'),
    country: z.string().optional().default('us').describe('Código de país para la búsqueda'),
    search_lang: z.string().optional().default('es').describe('Idioma de búsqueda'),
    freshness: z.enum(['pd', 'pw', 'pm', 'py']).optional().describe('Filtro de tiempo: pd=día, pw=semana, pm=mes, py=año'),
    safesearch: z.enum(['strict', 'moderate', 'off']).optional().default('moderate').describe('Nivel de búsqueda segura'),
  }),
  execute: async ({ query, count = 10, country = 'us', search_lang = 'es', freshness, safesearch = 'moderate' }) => {
    try {
      const apiKey = process.env.BRAVE_SEARCH_API_KEY
      
      if (!apiKey) {
        throw new Error('BRAVE_SEARCH_API_KEY no está configurada en las variables de entorno')
      }

      const searchParams = new URLSearchParams({
        q: query,
        count: count.toString(),
        country,
        search_lang,
        safesearch,
      })

      if (freshness) {
        searchParams.append('freshness', freshness)
      }

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
