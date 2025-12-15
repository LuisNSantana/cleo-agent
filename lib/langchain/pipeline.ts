/**
 * Multi-Model Pipeline Orchestrator
 * 
 * Coordinates the flow between router and agents to process tasks
 * with optimal cost-quality balance.
 */

import { ModelRouter } from './router'
import { AgentFactory } from './agents'
import { TaskInput, TaskOutput, RoutingDecision } from './types'

export class MultiModelPipeline {
  private router: ModelRouter
  private metrics: {
    totalRequests: number
    totalCost: number
    averageResponseTime: number
    modelUsage: Record<string, number>
  }

  constructor() {
    this.router = new ModelRouter()
    this.metrics = {
      totalRequests: 0,
      totalCost: 0,
      averageResponseTime: 0,
      modelUsage: {}
    }
  }

  /**
   * Process a task using the optimal model
   */
  async process(input: TaskInput): Promise<TaskOutput> {
    const startTime = Date.now()

    try {
      // Step 1: Route to the best model first (before context optimization)
      const routingDecision = this.router.route(input)
      
      console.log(`🤖 Routing decision:`, {
        model: routingDecision.selectedModel,
        reasoning: routingDecision.reasoning,
        confidence: routingDecision.confidence
      })

      // Step 2: Optimize context and configuration based on selected model
      input.metadata = this.optimizeContextForModel(input.metadata || {}, routingDecision.selectedModel)

      // Step 3: Get the appropriate agent
      const agent = AgentFactory.getAgent(routingDecision.selectedModel)

      // Step 4: Process with fallback support
      let result: TaskOutput
      try {
        result = await agent.process(input)
        // attach routing details for observability
        result.routing = routingDecision
      } catch (error) {
        console.warn(`Primary model failed, trying fallback:`, error)
        
        if (routingDecision.fallbackModel) {
          // Re-optimize context for fallback model
          input.metadata = this.optimizeContextForModel(input.metadata || {}, routingDecision.fallbackModel)
          
          const fallbackAgent = AgentFactory.getAgent(routingDecision.fallbackModel)
          result = await fallbackAgent.process(input)
          result.routing = routingDecision
          result.modelUsed = `${result.modelUsed} (fallback)`
        } else {
          throw error
        }
      }

      // Step 5: Update metrics
      this.updateMetrics(result, Date.now() - startTime)

      return result

    } catch (error) {
      console.error('Pipeline processing failed:', error)
      throw new Error(`Multi-model pipeline failed: ${error}`)
    }
  }

  /**
   * Optimize context and configuration based on the selected model's capabilities
   */
  optimizeContextForModel(metadata: any, modelId: string): any {
    const isCloudModel = !modelId.startsWith('ollama:')
    const isBalancedOrFast = modelId.includes('balanced') || modelId.includes('fast')
    const isLlama31 = modelId.includes('llama3.1') || modelId.includes('llama-3.1')
    
    console.log(`🔧 Optimizing context for model: ${modelId}`, {
      isCloudModel,
      isBalancedOrFast,
      isLlama31,
      originalMaxContext: metadata.maxContextChars
    })

  // Start from existing metadata to preserve fields like allowedTools, imageUrl, documentId, etc.
  const optimized: any = { ...metadata }
  // Initialize keys we may override below
  optimized.maxContextChars = metadata.maxContextChars
  optimized.systemPromptVariant = metadata.systemPromptVariant
  optimized.enableTools = metadata.enableTools
  optimized.useRAG = metadata.useRAG

    // Llama 3.1 specific optimization
    if (isLlama31) {
      optimized.maxContextChars = metadata.maxContextChars ?? 8000
      optimized.systemPromptVariant = metadata.systemPromptVariant || 'llama31' // Use optimized Llama 3.1 prompt
      optimized.enableTools = metadata.enableTools ?? true // Enable tools for delegation
      
      console.log(`🦙 Llama 3.1 optimization applied:`, {
        maxContextChars: optimized.maxContextChars,
        systemPromptVariant: optimized.systemPromptVariant,
        enableTools: optimized.enableTools
      })
  } else if (isCloudModel) {
      // Cloud models (balanced/fast) get full context and enhanced capabilities
  optimized.maxContextChars = metadata.maxContextChars ?? 32000 // Much higher context
  optimized.systemPromptVariant = metadata.systemPromptVariant || 'developer' // More capable prompt
  optimized.enableTools = metadata.enableTools ?? true // Enable tools for cloud models to support delegation
  optimized.useRAG = metadata.useRAG ?? true // Enable RAG for better context
      
      console.log(`☁️ Cloud model optimization applied:`, {
        maxContextChars: optimized.maxContextChars,
        systemPromptVariant: optimized.systemPromptVariant,
        enableTools: optimized.enableTools,
        useRAG: optimized.useRAG
      })
  } else if (modelId.includes('balanced-local')) {
      // Local models get moderate context to balance performance
  optimized.maxContextChars = metadata.maxContextChars ?? 8000 // Moderate context
  optimized.systemPromptVariant = metadata.systemPromptVariant || 'local' // Use the new local variant for flexibility
  optimized.enableTools = metadata.enableTools ?? true // Enable tools for delegation
      
      console.log(`🏠 Local model optimization applied:`, {
        maxContextChars: optimized.maxContextChars,
        systemPromptVariant: optimized.systemPromptVariant,
        enableTools: optimized.enableTools
      })
    } else {
      // Default/legacy models get standard configuration
      optimized.maxContextChars = metadata.maxContextChars ?? 6000
      optimized.systemPromptVariant = metadata.systemPromptVariant || 'default'
      
      console.log(`📝 Standard model configuration applied:`, {
        maxContextChars: optimized.maxContextChars,
        systemPromptVariant: optimized.systemPromptVariant
      })
    }

    return optimized
  }

  /**
   * Process multiple tasks in parallel with cost optimization
   */
  async processBatch(inputs: TaskInput[]): Promise<TaskOutput[]> {
    console.log(`📦 Processing batch of ${inputs.length} tasks`)

    // Group by expected model for efficiency
    const groupedInputs = this.groupInputsByModel(inputs)
    
    // Process each group
    const results: TaskOutput[] = []
    
    for (const [modelId, taskInputs] of groupedInputs) {
      console.log(`Processing ${taskInputs.length} tasks with ${modelId}`)
      
      const batchResults = await Promise.all(
        taskInputs.map(input => this.process(input))
      )
      
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Get pipeline performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      costPerRequest: this.metrics.totalRequests > 0 
        ? this.metrics.totalCost / this.metrics.totalRequests 
        : 0,
      mostUsedModel: this.getMostUsedModel()
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      totalCost: 0,
      averageResponseTime: 0,
      modelUsage: {}
    }
  }

  private groupInputsByModel(inputs: TaskInput[]): Map<string, TaskInput[]> {
    const groups = new Map<string, TaskInput[]>()

    for (const input of inputs) {
      const routingDecision = this.router.route(input)
      const modelId = routingDecision.selectedModel

      if (!groups.has(modelId)) {
        groups.set(modelId, [])
      }
      groups.get(modelId)!.push(input)
    }

    return groups
  }

  private updateMetrics(result: TaskOutput, processingTime: number) {
    this.metrics.totalRequests++
    this.metrics.totalCost += result.cost
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + processingTime) / 
      this.metrics.totalRequests

    // Update model usage
    if (!this.metrics.modelUsage[result.modelUsed]) {
      this.metrics.modelUsage[result.modelUsed] = 0
    }
    this.metrics.modelUsage[result.modelUsed]++
  }

  private getMostUsedModel(): string | null {
    let mostUsed: string | null = null
    let maxUsage = 0

    for (const [modelId, usage] of Object.entries(this.metrics.modelUsage)) {
      if (usage > maxUsage) {
        maxUsage = usage
        mostUsed = modelId
      }
    }

    return mostUsed
  }
}

// Convenience function for single-use pipeline
export async function processWithMultiModel(input: TaskInput): Promise<TaskOutput> {
  const pipeline = new MultiModelPipeline()
  return await pipeline.process(input)
}

// Convenience function for batch processing
export async function processBatchWithMultiModel(inputs: TaskInput[]): Promise<TaskOutput[]> {
  const pipeline = new MultiModelPipeline()
  return await pipeline.processBatch(inputs)
}
