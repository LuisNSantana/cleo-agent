/**
 * Test específico para validar las optimizaciones de Llama4 Scout
 */

import { chunkMarkdown } from './lib/rag/chunking'
import { retrieveRelevant } from './lib/rag/retrieve'
import { LLAMA4_SCOUT_CONFIG, getRetrievalStrategy } from './lib/rag/llama-scout-config'

async function testLlamaScoutOptimizations() {
  console.log('🚀 Testing Llama4 Scout Phase 1 Optimizations\n')
  
  // 1. Test chunking optimizado
  console.log('📝 Testing optimized chunking...')
  const testText = `# Documento de Prueba\n\nEste es un documento de prueba largo para verificar el chunking optimizado.\n\n## Sección 1\n\nContenido extenso de la primera sección con múltiples párrafos y información técnica detallada que debe ser procesada correctamente por el nuevo sistema de chunking.\n\n## Sección 2\n\nMás contenido con información relevante que debe ser dividida eficientemente en chunks de aproximadamente 2000 tokens para aprovechar mejor el context window de Llama4 Scout.\n\n### Subsección 2.1\n\nDetalles técnicos específicos que requieren análisis profundo y comprensión contextual para generar respuestas de alta calidad.\n\n### Subsección 2.2\n\nInformación adicional que complementa el contexto y permite al modelo generar respuestas más completas y precisas.`
  
  const chunks = chunkMarkdown(testText)
  console.log(`✅ Generated ${chunks.length} chunks`)
  chunks.forEach((chunk, i) => {
    console.log(`   Chunk ${i}: ${chunk.tokenEstimate} tokens, ${chunk.text.length} chars`)
  })
  
  // 2. Test strategy selector
  console.log('\n🎯 Testing retrieval strategy...')
  const simpleQuery = "¿Qué es esto?"
  const complexQuery = "Analizar en detalle las diferencias técnicas entre las secciones y explicar su implementación"
  
  const simpleStrategy = getRetrievalStrategy(simpleQuery)
  const complexStrategy = getRetrievalStrategy(complexQuery)
  
  console.log(`Simple query strategy: topK=${simpleStrategy.topK}, limit=${simpleStrategy.chunkLimit}`)
  console.log(`Complex query strategy: topK=${complexStrategy.topK}, limit=${complexStrategy.chunkLimit}`)
  
  // 3. Test configuration
  console.log('\n⚙️ Llama4 Scout Configuration:')
  console.log(`- Max context tokens: ${LLAMA4_SCOUT_CONFIG.maxContextTokens.toLocaleString()}`)
  console.log(`- Max output tokens: ${LLAMA4_SCOUT_CONFIG.maxOutputTokens}`)
  console.log(`- Chunk size: ${LLAMA4_SCOUT_CONFIG.chunkSizeTokens} tokens`)
  console.log(`- Max chunks per request: ${LLAMA4_SCOUT_CONFIG.maxChunksPerRequest}`)
  
  // 4. Test token calculation
  console.log('\n🔢 Token calculations:')
  const longQuery = "Explica en detalle todos los aspectos técnicos del sistema, incluyendo arquitectura, implementación, ventajas, desventajas y casos de uso específicos"
  const queryTokens = Math.ceil(longQuery.length / 4)
  console.log(`Query tokens: ${queryTokens}`)
  console.log(`Available for chunks: ${(LLAMA4_SCOUT_CONFIG.maxContextTokens - LLAMA4_SCOUT_CONFIG.reserveForOutput - queryTokens).toLocaleString()}`)
  
  console.log('\n✅ Phase 1 optimization tests completed!')
}

if (require.main === module) {
  testLlamaScoutOptimizations().catch(console.error)
}
