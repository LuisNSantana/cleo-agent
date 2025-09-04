# Agent System Modular Architecture

## Overview

The agent system has been refactored into a modular architecture that provides better separation of concerns, improved testability, enhanced error handling, and comprehensive monitoring capabilities.

## Core Modules

### 1. AgentOrchestrator (`/lib/agents/core/orchestrator.ts`)

**Main coordination hub for agent execution**

Key responsibilities:
- Agent execution coordination 
- Module lifecycle management
- Event orchestration
- Error handling coordination
- Metrics collection coordination

Features:
- Singleton pattern with global instance
- Automatic module initialization
- Comprehensive execution context management
- Event-driven architecture
- Graceful shutdown handling

```typescript
import { globalOrchestrator } from '@/lib/agents/core'

// Execute agent with full context
const result = await globalOrchestrator.executeAgent(
  agentConfig,
  { threadId, userId, agentId, messageHistory },
  { timeout: 30000, enableStreaming: true }
)
```

### 2. AgentErrorHandler (`/lib/agents/core/error-handler.ts`)

**Centralized error handling with advanced recovery patterns**

Features:
- Error classification and categorization
- Exponential backoff retry logic
- Circuit breaker pattern for fault tolerance
- Comprehensive error metrics
- Automatic recovery strategies

Error categories:
- `network` - Connection and API failures
- `model` - LLM and model-specific errors
- `validation` - Input validation errors
- `authentication` - Auth and permission errors
- `rate_limit` - Rate limiting and quota errors
- `timeout` - Execution timeout errors
- `graph` - LangGraph execution errors
- `tool` - Tool execution failures

```typescript
import { globalErrorHandler } from '@/lib/agents/core'

// Execute with retry and error handling
const result = await globalErrorHandler.withRetry(
  () => riskyOperation(),
  'operation_context',
  { maxAttempts: 5, baseDelayMs: 2000 }
)
```

### 3. GraphBuilder (`/lib/agents/core/graph-builder.ts`)

**LangGraph construction with MessagesAnnotation compatibility**

Features:
- Compatible with existing LangGraph setup
- Event-driven node execution
- Model integration through ModelFactory
- Comprehensive error handling in nodes
- Clean separation from orchestration logic

### 4. ExecutionManager (`/lib/agents/core/execution-manager.ts`)

**Agent and tool execution coordination**

Features:
- Agent execution with history context
- Tool execution coordination
- Token usage estimation
- Execution metrics tracking
- Event emission for real-time updates

### 5. ModelFactory (`/lib/agents/core/model-factory.ts`)

**Model instantiation and caching**

Supported providers:
- OpenAI (GPT models)
- Anthropic (Claude models)
- Ollama (local models)
- Automatic fallback to OpenAI

Features:
- Model caching for performance
- Automatic provider detection
- Configuration management
- Error handling for model failures

### 6. EventEmitter (`/lib/agents/core/event-emitter.ts`)

**Event system for real-time updates**

Key events:
- `execution.started` - Execution begins
- `execution.completed` - Execution successful
- `execution.failed` - Execution failed
- `node.entered` - Graph node entered
- `node.completed` - Graph node completed
- `tool.executing` - Tool execution started
- `agent.response` - Agent response generated

### 7. MemoryManager (`/lib/agents/core/memory-manager.ts`)

**Message history optimization and context management**

Features:
- Message history compression
- Context token management
- Memory usage optimization
- Thread-based caching
- Automatic cleanup

### 8. MetricsCollector (`/lib/agents/core/metrics-collector.ts`)

**Performance metrics collection and monitoring**

Metrics tracked:
- Execution performance (time, success rate, error rate)
- System metrics (memory usage, active executions)
- Error metrics (by category, frequency, recovery rate)
- Agent-specific performance data

## Architecture Benefits

### 1. Modularity
- Each component has a single responsibility
- Clear interfaces between modules
- Easy to modify individual components
- Independent development and testing

### 2. Scalability
- Modular design supports easy extension
- Event-driven architecture for loose coupling
- Caching and optimization built-in
- Memory management for large-scale usage

### 3. Reliability
- Centralized error handling with recovery
- Circuit breaker pattern prevents cascading failures
- Retry logic with exponential backoff
- Comprehensive monitoring and metrics

### 4. Observability
- Event-driven real-time updates
- Comprehensive metrics collection
- Error tracking and classification
- Performance monitoring

### 5. Maintainability
- Clean separation of concerns
- Well-defined interfaces
- Comprehensive documentation
- Easy debugging and troubleshooting

### 6. Testability
- Each module can be tested independently
- Dependency injection for mocking
- Event system enables integration testing
- Clear boundaries for unit testing

## Usage Patterns

### Basic Agent Execution

```typescript
import { globalOrchestrator } from '@/lib/agents/core'
import { getAgentById } from '@/lib/agents/config'

const agentConfig = getAgentById('emma')
const result = await globalOrchestrator.executeAgent(
  agentConfig,
  {
    threadId: 'thread-123',
    userId: 'user-456',
    agentId: 'emma',
    messageHistory: [/* messages */]
  }
)
```

### Error Handling

```typescript
import { globalErrorHandler } from '@/lib/agents/core'

try {
  const result = await globalErrorHandler.withRetry(
    () => someOperation(),
    'operation_name'
  )
} catch (error) {
  const errorInfo = globalErrorHandler.formatErrorSummary(error, 'context')
  console.error(errorInfo)
}
```

### Event Monitoring

```typescript
import { globalOrchestrator } from '@/lib/agents/core'

globalOrchestrator.on('execution.started', (execution) => {
  console.log(`Execution ${execution.id} started`)
})

globalOrchestrator.on('execution.completed', (execution) => {
  console.log(`Execution ${execution.id} completed in ${execution.metrics.executionTime}ms`)
})
```

### Metrics and Monitoring

```typescript
import { globalOrchestrator } from '@/lib/agents/core'

// Get comprehensive system metrics
const metrics = globalOrchestrator.getMetrics()
console.log({
  activeExecutions: metrics.activeExecutions,
  errorRate: metrics.errorMetrics,
  systemHealth: metrics.systemMetrics
})
```

## Migration Guide

### From Legacy Orchestrator

1. **Import new modules**:
```typescript
// Old
import { AgentOrchestrator } from '@/lib/agents/agent-orchestrator'

// New
import { globalOrchestrator } from '@/lib/agents/core'
```

2. **Update execution calls**:
```typescript
// Old
const orchestrator = new AgentOrchestrator()
const result = await orchestrator.startAgentExecutionWithHistory(/* params */)

// New
const result = await globalOrchestrator.executeAgent(agentConfig, context, options)
```

3. **Add error handling**:
```typescript
// Old
try {
  await operation()
} catch (error) {
  console.error(error)
}

// New
import { globalErrorHandler } from '@/lib/agents/core'
try {
  await globalErrorHandler.withRetry(() => operation())
} catch (error) {
  const summary = globalErrorHandler.formatErrorSummary(error)
  console.error(summary)
}
```

## Performance Considerations

### Memory Usage
- Model caching reduces initialization overhead
- Memory manager optimizes message history
- Automatic cleanup prevents memory leaks
- Metrics tracking for memory monitoring

### Execution Speed
- Graph compilation caching
- Connection pooling for models
- Event system for non-blocking operations
- Circuit breaker prevents unnecessary retries

### Error Recovery
- Classification reduces recovery time
- Circuit breaker prevents cascade failures
- Retry logic with intelligent backoff
- Comprehensive error metrics for optimization

## Monitoring and Debugging

### Real-time Events
All modules emit events for real-time monitoring:
- Execution lifecycle events
- Error events with full context
- Performance metrics updates
- System health indicators

### Error Analysis
Comprehensive error tracking:
- Error classification and trends
- Recovery success rates
- Circuit breaker states
- Performance impact analysis

### System Metrics
Complete system visibility:
- Active execution counts
- Memory and CPU usage
- Success/failure rates
- Average execution times

## Future Enhancements

### Planned Features
1. **Distributed Execution**: Support for multi-instance deployments
2. **Advanced Caching**: Redis-based caching for model states
3. **Health Checks**: Automated system health monitoring
4. **Performance Analytics**: Advanced performance analysis and recommendations
5. **Custom Metrics**: User-defined metrics and alerting

### Extension Points
- Custom error handlers for specific use cases
- Additional model providers
- Custom event handlers
- Enhanced memory management strategies
- Advanced monitoring integrations

This modular architecture provides a solid foundation for scaling the agent system while maintaining reliability, performance, and maintainability.
