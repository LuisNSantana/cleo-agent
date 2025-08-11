/**
 * Configuración optimizada para Llama4 Scout con context window de 10M tokens
 */

export interface LlamaScoutConfig {
  // Context Management
  maxContextTokens: number  // 10M total
  reserveForOutput: number  // 4096 para respuesta
  maxChunksPerRequest: number
  chunkSizeTokens: number
  
  // Retrieval Strategy
  defaultTopK: number
  aggressiveTopK: number  // Para consultas complejas
  hybridWeights: {
    vector: number
    text: number
  }
  
  // Generation Parameters
  maxOutputTokens: number
  temperature: number
  topP: number
}

export const LLAMA4_SCOUT_CONFIG: LlamaScoutConfig = {
  // Context: 1M input - 4K output = 996K disponible para contexto
  maxContextTokens: 996000,  
  reserveForOutput: 4096,
  maxChunksPerRequest: 30,   // ~2000 tokens cada uno = 60K tokens max
  chunkSizeTokens: 2000,
  
  // Retrieval optimizado para 1M context window
  defaultTopK: 15,
  aggressiveTopK: 30,  // Para análisis profundo
  hybridWeights: {
    vector: 0.7,
    text: 0.3
  },
  
  // Generation
  maxOutputTokens: 4096,
  temperature: 0.7,
  topP: 0.9
}

/**
 * Calcula cuántos chunks podemos incluir sin exceder el context window
 */
export function calculateOptimalChunkCount(
  queryTokens: number, 
  systemPromptTokens: number = 500
): number {
  const availableTokens = LLAMA4_SCOUT_CONFIG.maxContextTokens - 
                         LLAMA4_SCOUT_CONFIG.reserveForOutput - 
                         queryTokens - 
                         systemPromptTokens
  
  const maxChunks = Math.floor(availableTokens / LLAMA4_SCOUT_CONFIG.chunkSizeTokens)
  return Math.min(maxChunks, LLAMA4_SCOUT_CONFIG.maxChunksPerRequest)
}

/**
 * Estrategia de retrieval adaptativa según complejidad de la query
 */
export function getRetrievalStrategy(query: string): {
  topK: number
  useAggressive: boolean
  chunkLimit: number
} {
  const queryTokens = Math.ceil(query.length / 4)
  const isComplexQuery = query.length > 200 || 
                        query.includes('analizar') || 
                        query.includes('comparar') ||
                        query.includes('explicar en detalle')
  
  if (isComplexQuery) {
    return {
      topK: LLAMA4_SCOUT_CONFIG.aggressiveTopK,
      useAggressive: true,
      chunkLimit: calculateOptimalChunkCount(queryTokens)
    }
  }
  
  return {
    topK: LLAMA4_SCOUT_CONFIG.defaultTopK,
    useAggressive: false,
    chunkLimit: calculateOptimalChunkCount(queryTokens)
  }
}
