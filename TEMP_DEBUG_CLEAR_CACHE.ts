// TEMP: Script para limpiar cache del graph
// Ejecutar con: npx tsx TEMP_DEBUG_CLEAR_CACHE.ts

import { getGlobalOrchestrator } from './lib/agents/core/orchestrator'

async function clearGraphCache() {
  console.log('🧹 Clearing graph cache...')
  
  const orch = await getGlobalOrchestrator()
  
  // Acceder al graphCache (está en ExecutionManager)
  const graphCache = (orch as any).executionManager?.graphCache
  
  if (graphCache) {
    console.log('📊 Cache stats before clear:', graphCache.getStats())
    graphCache.invalidate() // Clear all
    console.log('✅ Cache cleared!')
    console.log('📊 Cache stats after clear:', graphCache.getStats())
  } else {
    console.log('⚠️  No graph cache found')
  }
  
  process.exit(0)
}

clearGraphCache().catch(console.error)
