/**
 * Core Modules Index
 * Export all modular components for the Agent System
 */

export { AgentOrchestrator, getGlobalOrchestrator } from './orchestrator'
export { GraphBuilder } from './graph-builder'
export { ExecutionManager } from './execution-manager'
export { ModelFactory } from './model-factory'
export { EventEmitter } from './event-emitter'
export { AgentErrorHandler, globalErrorHandler } from './error-handler'
export { MemoryManager } from './memory-manager'
export { MetricsCollector } from './metrics-collector'

export type {
  OrchestratorConfig,
  ExecutionContext,
  ExecutionOptions
} from './orchestrator'

export type {
  GraphBuilderConfig
} from './graph-builder'

export type {
  ExecutionManagerConfig,
  ToolResult
} from './execution-manager'

export type {
  ModelConfig
} from './model-factory'

export type {
  EventHandler
} from './event-emitter'

export type {
  ErrorCategory,
  ErrorMetrics,
  RetryConfig,
  CircuitBreakerState
} from './error-handler'

export type {
  MemoryConfig,
  MemoryMetrics
} from './memory-manager'

export type {
  SystemMetrics,
  PerformanceMetrics
} from './metrics-collector'
