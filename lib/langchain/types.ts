/**
 * Types for Multi-Model Orchestration
 */

export interface TaskInput {
  content: string
  type: 'text' | 'image' | 'document' | 'function_call'
  metadata?: {
  // File information (when applicable)
    filename?: string
    mimeType?: string
    fileSize?: number
  // RAG / retrieval options
  userId?: string
  chatId?: string | null
  documentId?: string
  projectId?: string
  useRAG?: boolean
  maxContextChars?: number
  // Vision input (first image URL)
  imageUrl?: string
  // Prompt customization
  systemPromptVariant?: 'default' | 'journalism' | 'developer' | 'reasoning' | 'minimal' | 'debug' | 'local' | 'llama31' | 'cybersecurity'
  systemPromptOverride?: string
  // Resolved RAG context (set by pipeline)
  ragContext?: string
  // Tooling
  enableTools?: boolean
  allowedTools?: string[]
  // Routing controls
  forceModel?: string | 'local' | 'ollama' | 'groq' | 'openai'
  preferLocal?: boolean
  maxLocalContext?: number
  // LangChain router type for optimized configurations
  routerType?: 'balanced-local' | 'balanced' | 'fast'
  mcp?: {
    servers: Array<
      | { name: string; transport: 'stdio'; command: string; args?: string[]; env?: Record<string, string> }
      | { name: string; transport: 'sse' | 'streamable-http'; url: string; headers?: Record<string, string> }
    >
    allowedTools?: string[]
  }
    [key: string]: any
  }
}

export interface TaskOutput {
  result: string
  modelUsed: string
  cost: number
  tokens: {
    input: number
    output: number
  }
  processingTime: number
  confidence?: number
  // Optional: tool invocation details for UI/analytics
  toolInvocations?: Array<{
    toolCallId: string
    toolName: string
    args?: any
    result?: any
  }>
  // Optional: routing details for debugging/telemetry
  routing?: RoutingDecision
}

export interface ModelConfig {
  id: string
  name: string
  provider: 'groq' | 'openai' | 'xai' | 'ollama'
  costPerToken: {
    input: number
    output: number
  }
  capabilities: {
    text: boolean
    vision: boolean
    functionCalling: boolean
    reasoning: boolean
  }
  maxTokens: number
  contextWindow: number
}

export interface RoutingDecision {
  selectedModel: string
  reasoning: string
  confidence: number
  fallbackModel?: string
}

export type TaskType = 'text' | 'vision' | 'function_call' | 'reasoning'
