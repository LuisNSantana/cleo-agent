/**
 * Intelligent Router for Multi-Model Selection
 * 
 * Routes tasks to the most appropriate model based on configuration:
 * - balanced-local: Local-first with Ollama + cloud fallback
 * - balanced: High-reasoning cloud models (GPT-5-mini + Groq)  
 * - fast: Speed-optimized cloud services (Groq primary)
 */

import { TaskInput, RoutingDecision, TaskType } from './types'

export class ModelRouter {
  private readonly MODEL_PREFERENCES = {
    // Local models
    'ollama:llama3.1:8b': {
      strengths: ['text', 'function_call', 'speed', 'local', 'cost'],
      weaknesses: ['vision', 'complex_reasoning'],
      costScore: 10, // Free local processing
      qualityScore: 8, // Very good quality
    },
    
    // GPT-OSS-120B (Groq) - Fast and cost-effective
    'groq:gpt-oss-120b': {
      strengths: ['text', 'function_call', 'speed', 'cost'],
      weaknesses: ['vision', 'complex_reasoning'],
      costScore: 9, // Excellent cost
      qualityScore: 8, // Very good quality
    },
    
    // GPT-5-mini (OpenAI) - High reasoning
    'openai:gpt-5-mini': {
      strengths: ['reasoning', 'quality', 'complex_tasks'],
      weaknesses: ['cost', 'speed'],
      costScore: 5, // Premium pricing
      qualityScore: 10, // Excellent reasoning
    },
    
    // GPT-4o-mini (OpenAI) - High quality, multimodal
    'openai:gpt-4o-mini': {
      strengths: ['vision', 'reasoning', 'multimodal', 'quality'],
      weaknesses: ['cost'],
      costScore: 7, // Good cost
      qualityScore: 9, // Excellent quality
    }
  }

  /**
   * Route based on LangChain configuration type
   */
  route(input: TaskInput): RoutingDecision {
    console.log('🧭 ModelRouter: Analyzing input for routing:', {
      contentLength: input.content.length,
      explicitType: input.type,
      hasMetadata: !!input.metadata,
      routerType: input.metadata?.routerType
    })
    
    // Check for explicit router type from LangChain model selection
    const routerType = input.metadata?.routerType
    if (routerType) {
      switch (routerType) {
        case 'balanced-local':
          return this.routeBalancedLocal(input)
        case 'balanced':
          return this.routeBalanced(input)
        case 'fast':
          return this.routeFast(input)
      }
    }
    
    const taskType = this.detectTaskType(input)
    console.log('🔍 ModelRouter: Detected task type:', taskType)
    
    // Respect explicit routing override if provided
    const fm = input.metadata?.forceModel
    if (fm) {
      if (fm === 'local' || fm === 'ollama') {
        return {
          selectedModel: 'ollama:llama3.1:8b',
          reasoning: 'Forced local model via metadata.forceModel',
          confidence: 1.0,
          fallbackModel: 'groq:gpt-oss-120b'
        }
      }
      if (fm === 'groq') {
        return {
          selectedModel: 'groq:gpt-oss-120b',
          reasoning: 'Forced Groq via metadata.forceModel',
          confidence: 1.0,
          fallbackModel: 'openai:gpt-4o-mini'
        }
      }
      if (fm === 'openai') {
        return {
          selectedModel: 'openai:gpt-4o-mini',
          reasoning: 'Forced OpenAI via metadata.forceModel',
          confidence: 1.0,
          fallbackModel: 'groq:gpt-oss-120b'
        }
      }
      return {
        selectedModel: fm,
        reasoning: 'Forced exact model id via metadata.forceModel',
        confidence: 1.0,
        fallbackModel: 'groq:gpt-oss-120b'
      }
    }
    
    // Default routing (legacy support)
    return this.routeDefault(input, taskType)
  }

  /**
   * Route for balanced-local configuration
   * Primary: ollama:llama3.1:8b, Fallback: groq:gpt-oss-120b, Vision: openai:gpt-4o-mini
   */
  private routeBalancedLocal(input: TaskInput): RoutingDecision {
    console.log('🔧 Routing with balanced-local configuration')
    
    const taskType = this.detectTaskType(input)
    
    // Vision tasks require cloud models
    if (taskType === 'vision') {
      return {
        selectedModel: 'openai:gpt-4o-mini',
        reasoning: 'Vision task requires multimodal capabilities - routed to OpenAI GPT-4o-mini',
        confidence: 0.95,
        fallbackModel: 'groq:gpt-oss-120b'
      }
    }
    
    // For local availability and suitable tasks, prefer Ollama
    const allowLocal = process.env.OLLAMA_ENABLE_ROUTING === 'true'
    const isReasonableSize = input.content.length < 500 || taskType === 'function_call'
    
    if (allowLocal && isReasonableSize) {
      return {
        selectedModel: 'ollama:llama3.1:8b',
        reasoning: 'Balanced-local: Local Llama 3.1 8B for fast, cost-effective processing',
        confidence: 0.9,
        fallbackModel: 'groq:gpt-oss-120b'
      }
    }
    
    // Fallback to fast cloud model
    return {
      selectedModel: 'groq:gpt-oss-120b',
      reasoning: 'Balanced-local: Groq fallback for larger tasks or when local unavailable',
      confidence: 0.8,
      fallbackModel: 'openai:gpt-4o-mini'
    }
  }

  /**
   * Route for balanced configuration  
   * Primary: openai:gpt-5-mini, Fast tasks: groq:gpt-oss-120b, Vision: openai:gpt-4o-mini
   */
  private routeBalanced(input: TaskInput): RoutingDecision {
    console.log('⚖️ Routing with balanced configuration')
    
    const taskType = this.detectTaskType(input)
    
    // Vision tasks use GPT-4o-mini for cost efficiency
    if (taskType === 'vision') {
      return {
        selectedModel: 'openai:gpt-4o-mini',
        reasoning: 'Balanced: Vision task routed to GPT-4o-mini for multimodal capabilities',
        confidence: 0.95,
        fallbackModel: 'groq:gpt-oss-120b'
      }
    }
    
    // Simple/fast tasks use Groq for speed
    const isSimple = input.content.length < 200 && taskType !== 'reasoning'
    if (isSimple || taskType === 'function_call') {
      return {
        selectedModel: 'groq:gpt-oss-120b',
        reasoning: 'Balanced: Simple task routed to Groq GPT-OSS-120B for speed',
        confidence: 0.85,
        fallbackModel: 'openai:gpt-4o-mini'
      }
    }
    
    // Complex reasoning uses premium model
    return {
      selectedModel: 'openai:gpt-5-mini',
      reasoning: 'Balanced: Complex task routed to GPT-5-mini for high-quality reasoning',
      confidence: 0.9,
      fallbackModel: 'openai:gpt-4o-mini'
    }
  }

  /**
   * Route for fast configuration
   * Primary: groq:gpt-oss-120b, Backup: openai:gpt-4o-mini
   */
  private routeFast(input: TaskInput): RoutingDecision {
    console.log('⚡ Routing with fast configuration')
    
    const taskType = this.detectTaskType(input)
    
    // Even vision tasks prefer speed, but need multimodal
    if (taskType === 'vision') {
      return {
        selectedModel: 'openai:gpt-4o-mini',
        reasoning: 'Fast: Vision task requires multimodal - using fastest multimodal model',
        confidence: 0.85,
        fallbackModel: 'groq:gpt-oss-120b'
      }
    }
    
    // All other tasks prioritize speed with Groq
    return {
      selectedModel: 'groq:gpt-oss-120b',
      reasoning: 'Fast: Task routed to Groq GPT-OSS-120B for ultra-fast inference',
      confidence: 0.95,
      fallbackModel: 'openai:gpt-4o-mini'
    }
  }

  /**
   * Default routing (legacy support)
   */
  private routeDefault(input: TaskInput, taskType: TaskType): RoutingDecision {
    // Optional: prefer local quick model for short text/tool tasks
    const allowLocal = process.env.OLLAMA_ENABLE_ROUTING === 'true' || input.metadata?.preferLocal === true
    const isShort = input.content.length < 240 && !this.isImageContent(input) && !this.isDocumentContent(input)
    if (allowLocal && isShort) {
      return {
        selectedModel: 'ollama:llama3.1:8b',
        reasoning: 'Short prompt routed to local Llama 3.1 8B for fast, capable tool-calls',
        confidence: 0.8,
        fallbackModel: 'groq:gpt-oss-120b'
      }
    }

    // Route based on task type
    let decision: RoutingDecision
    switch (taskType) {
      case 'text':
        decision = this.routeTextTask(input)
        break
      
      case 'vision':
        decision = this.routeVisionTask(input)
        break
      
      case 'function_call':
        decision = this.routeFunctionCallTask(input)
        break
      
      case 'reasoning':
        decision = this.routeReasoningTask(input)
        break
      
      default:
        decision = this.getDefaultRoute()
    }

    console.log('🎯 ModelRouter: Routing decision made:', {
      selectedModel: decision.selectedModel,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      fallbackModel: decision.fallbackModel
    })

    return decision
  }

  private detectTaskType(input: TaskInput): TaskType {
    // If caller explicitly enabled tools, prefer function_call
    if (input.metadata?.enableTools) {
      return 'function_call'
    }
    // Respect explicit type, mapping image/document to 'vision'
    if (input.type) {
      if (input.type === 'image' || input.type === 'document') return 'vision'
      if (input.type === 'function_call') return 'function_call'
      if (input.type === 'text') return 'text'
    }

    // Detect from content and metadata
    if (this.isImageContent(input)) {
      return 'vision'
    }
    
    if (this.isDocumentContent(input)) {
      return 'vision' // Use vision model for document analysis
    }
    
    if (this.requiresFunctionCalling(input)) {
      return 'function_call'
    }
    
    if (this.requiresComplexReasoning(input)) {
      return 'reasoning'
    }

    return 'text'
  }

  private isImageContent(input: TaskInput): boolean {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    return Boolean(input.metadata?.imageUrl) || imageTypes.includes(input.metadata?.mimeType || '')
  }

  private isDocumentContent(input: TaskInput): boolean {
    const docTypes = ['application/pdf', 'application/msword', 'text/plain']
    return docTypes.includes(input.metadata?.mimeType || '') ||
           /\.(pdf|doc|docx|txt)$/i.test(input.metadata?.filename || '')
  }

  private requiresFunctionCalling(input: TaskInput): boolean {
    const text = input.content.toLowerCase()
    const functionKeywords = [
      // English intents
      'search', 'web search', 'google', 'calculate', 'compute', 'weather', 'forecast', 'price', 'prices', 'crypto',
      'calendar', 'schedule', 'event', 'book', 'reserve', 'email', 'gmail', 'drive', 'file', 'document', 'open', 'create',
      // Spanish intents
      'buscar en la web', 'buscar', 'busca', 'búscame', 'buscame', 'búsqueda', 'buscarme', 'googlear', 'calcular', 'cálculo', 'clima', 'tiempo', 'pronóstico', 'precio', 'precios', 'cripto', 'criptomoneda', 'noticias', 'últimas noticias', 'ultimas noticias',
      'calendario', 'evento', 'agenda', 'reservar', 'correo', 'gmail', 'drive', 'archivo', 'documento', 'abrir', 'crear'
    ]

    return functionKeywords.some(keyword => text.includes(keyword))
  }

  private requiresComplexReasoning(input: TaskInput): boolean {
    const reasoningKeywords = [
      'analyze', 'compare', 'explain why', 'reasoning',
      'pros and cons', 'advantages', 'disadvantages'
    ]
    
    return reasoningKeywords.some(keyword => 
      input.content.toLowerCase().includes(keyword)
    ) || input.content.length > 1000 // Long content may need reasoning
  }

  private routeTextTask(input: TaskInput): RoutingDecision {
    // For simple text tasks, prefer cost-effective Groq model
    return {
      selectedModel: 'groq:gpt-oss-120b',
      reasoning: 'Text task routed to Groq GPT-OSS-120B for optimal cost-performance balance',
      confidence: 0.9,
      fallbackModel: 'openai:gpt-4o-mini'
    }
  }

  private routeVisionTask(input: TaskInput): RoutingDecision {
    // For vision/document analysis, prefer OpenAI GPT-5-mini; fallback to GPT-4o-mini
    return {
      selectedModel: 'openai:gpt-5-mini',
      reasoning: 'Vision/document task requires multimodal capabilities - routed to GPT-5-mini',
      confidence: 0.95,
      fallbackModel: 'openai:gpt-4o-mini'
    }
  }

  private routeFunctionCallTask(input: TaskInput): RoutingDecision {
    // For tool calls, prefer local if enabled and content is reasonable, else use Groq
    const allowLocal = process.env.OLLAMA_ENABLE_ROUTING === 'true' || input.metadata?.preferLocal === true
    const isShort = input.content.length < 240
    if (allowLocal && isShort) {
      return {
        selectedModel: 'ollama:llama3.1:8b',
        reasoning: 'Function calling task routed to local Llama 3.1 8B for fast tool execution',
        confidence: 0.8,
        fallbackModel: 'groq:gpt-oss-120b'
      }
    }
    
    // Function calling works well with Groq - cost effective
    return {
      selectedModel: 'groq:gpt-oss-120b',
      reasoning: 'Function calling task routed to Groq GPT-OSS-120B for reliable tool execution',
      confidence: 0.85,
      fallbackModel: 'openai:gpt-4o-mini'
    }
  }

  private routeReasoningTask(input: TaskInput): RoutingDecision {
    // Complex reasoning benefits from higher quality model
    return {
      selectedModel: 'openai:gpt-4o-mini',
      reasoning: 'Complex reasoning task requires high-quality model - routed to GPT-4o-mini',
      confidence: 0.8,
      fallbackModel: 'groq:gpt-oss-120b'
    }
  }

  private getDefaultRoute(): RoutingDecision {
    return {
      selectedModel: 'groq:gpt-oss-120b',
      reasoning: 'Default routing to cost-effective Groq GPT-OSS-120B model',
      confidence: 0.7,
      fallbackModel: 'openai:gpt-4o-mini'
    }
  }
}
