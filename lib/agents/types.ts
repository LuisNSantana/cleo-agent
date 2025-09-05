/**
 * Multi-Agent System Types and Interfaces
 * Defines the structure for LangGraph-based agent orchestration
 */

import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'

// Base agent types
export interface AgentConfig {
  id: string
  name: string
  description: string
  role: AgentRole
  model: string
  temperature: number
  maxTokens: number
  tools: string[]
  prompt: string
  color: string
  icon: string
  avatar?: string // Path to agent avatar image
  // Optional LangChain / LangGraph specific fields
  objective?: string // High-level objective for the agent (what it should achieve)
  customInstructions?: string // Extra system/user instructions or constraints
  memoryEnabled?: boolean
  memoryType?: 'short_term' | 'long_term' | 'none'
  stopConditions?: string[] // e.g. stop tokens or patterns
  toolSchemas?: Record<string, any> // Optional JSON schemas for tool inputs
  tags?: string[] // capabilities or categories
}

export type AgentRole =
  | 'supervisor'    // Main coordinator (Cleo)
  | 'specialist'    // Specialized agents (Toby, Ami, Peter)
  | 'worker'        // Task-specific workers
  | 'evaluator'     // Quality assurance

// Agent execution types
export interface ExecutionStep {
  id: string
  timestamp: Date
  agent: string
  action: 'analyzing' | 'thinking' | 'responding' | 'delegating' | 'completing' | 'routing'
  content: string
  progress: number
  metadata?: any
}

export type ConversationMode = 'direct' | 'supervised'

export interface ConversationContext {
  mode: ConversationMode
  targetAgentId?: string // For direct mode
  supervisorAgentId?: string // For supervised mode (default: 'cleo-supervisor')
  userPreferences: {
    allowDelegation: boolean
    requireExplicitApproval: boolean
    defaultMode: ConversationMode
  }
  metadata: {
    threadId: string
    sessionId: string
    userId: string
    createdAt: Date
    lastUpdated: Date
  }
}

export interface AgentExecution {
  id: string
  agentId: string
  threadId: string
  userId: string
  status: 'running' | 'completed' | 'failed'
  startTime: Date
  endTime?: Date
  messages: AgentMessage[]
  metrics: ExecutionMetrics
  error?: string
  // Optional fields used by orchestrators/adapters
  input?: string
  result?: any
  options?: ExecutionOptions
  steps?: ExecutionStep[]
  currentStep?: string
  conversationContext?: ConversationContext
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled'

export interface AgentMessage {
  id: string
  type: 'human' | 'ai' | 'system' | 'tool'
  content: string
  timestamp: Date
  metadata?: Record<string, any>
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, any>
  result?: any
  error?: string
}

// Graph visualization types
export interface AgentNode {
  id: string
  type: 'agent' | 'decision' | 'tool' | 'memory'
  position: { x: number; y: number }
  data: AgentNodeData
  style?: React.CSSProperties
}

export interface AgentNodeData {
  label: string
  agent?: AgentConfig
  status?: ExecutionStatus
  executionCount?: number
  lastExecution?: Date
  connections: string[] // IDs of connected nodes
}

export interface AgentEdge {
  id: string
  source: string
  target: string
  type: 'handoff' | 'delegation' | 'response' | 'tool_call'
  animated?: boolean
  label?: string
  data?: {
    messageCount?: number
    lastMessage?: Date
    errorCount?: number
  }
}

// LangGraph integration types
export interface LangGraphConfig {
  supervisorAgent: AgentConfig
  specialistAgents: AgentConfig[]
  handoffTools: HandoffTool[]
  stateGraph: StateGraphDefinition
}

export interface HandoffTool {
  name: string
  description: string
  fromAgent: string
  toAgent: string
  condition?: string
}

export interface StateGraphDefinition {
  nodes: GraphNode[]
  edges: GraphEdge[]
  startNode: string
  endNodes: string[]
}

export interface GraphNode {
  id: string
  name: string
  type: 'agent' | 'conditional' | 'action'
  config?: Record<string, any>
}

export interface GraphEdge {
  from: string
  to: string
  condition?: string
  label?: string
}

// Execution metrics
export interface ExecutionMetrics {
  totalTokens: number
  inputTokens: number
  outputTokens: number
  executionTime: number
  executionTimeMs: number
  tokensUsed: number
  toolCallsCount: number
  handoffsCount: number
  errorCount: number
  retryCount: number
  cost: number
}

// Execution options
export interface ExecutionOptions {
  timeout?: number
  priority?: 'low' | 'normal' | 'high'
  enableStreaming?: boolean
  maxTokens?: number
  temperature?: number
}

// Execution result
export interface ExecutionResult {
  content: string
  metadata?: Record<string, any>
  toolCalls?: ToolCall[]
  executionTime?: number
  tokensUsed?: number
}

// Agent state for LangGraph
export interface AgentState {
  messages: any[]
  sender?: string
  next?: string
  current_agent?: string
  metadata?: Record<string, any>
}

// Real-time monitoring types
export interface AgentActivity {
  agentId: string
  type: 'execution_start' | 'execution_end' | 'message_sent' | 'tool_called' | 'handoff' | 'error' | 'execution_completed' | 'message_received' | 'execution_step'
  timestamp: Date
  data: Record<string, any>
}

export interface SystemMetrics {
  activeAgents: number
  totalExecutions: number
  averageResponseTime: number
  errorRate: number
  memoryUsage: number
  activeConnections: number
}

// API types
export interface CreateAgentRequest {
  name: string
  description: string
  role: AgentRole
  model: string
  tools: string[]
  prompt: string
  // additional fields to support richer agent creation
  objective?: string
  customInstructions?: string
  memoryEnabled?: boolean
  memoryType?: 'short_term' | 'long_term' | 'none'
  stopConditions?: string[]
  toolSchemas?: Record<string, any>
}

export interface ExecuteAgentRequest {
  agentId: string
  input: string
  context?: Record<string, any>
  stream?: boolean
  threadId?: string // Added threadId for type usage
}

export interface AgentExecutionResponse {
  executionId: string
  status: ExecutionStatus
  result?: any
  error?: string
}

export interface ExecuteAgentResponse {
  success: boolean
  execution: AgentExecution
  thread?: { id: string } | null
}

// Store types for React state management
export interface AgentStore {
  agents: AgentConfig[]
  executions: AgentExecution[]
  currentExecution: AgentExecution | null
  graphData: {
    nodes: AgentNode[]
    edges: AgentEdge[]
  }
  metrics: SystemMetrics
  isLoading: boolean
  error: string | null
}

// Event types for real-time updates
export type AgentEvent =
  | { type: 'AGENT_CREATED'; payload: AgentConfig }
  | { type: 'AGENT_UPDATED'; payload: AgentConfig }
  | { type: 'EXECUTION_STARTED'; payload: AgentExecution }
  | { type: 'EXECUTION_UPDATED'; payload: AgentExecution }
  | { type: 'EXECUTION_COMPLETED'; payload: AgentExecution }
  | { type: 'MESSAGE_RECEIVED'; payload: AgentMessage }
  | { type: 'METRICS_UPDATED'; payload: SystemMetrics }
  | { type: 'ERROR_OCCURRED'; payload: { agentId: string; error: string } }
