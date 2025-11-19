/**
 * Agent Task Executor
 * Executes tasks for different agents (Apu research, Wex automation, etc.)
 */

import type { AgentTask } from './tasks-db';
import { GraphBuilder } from '@/lib/agents/core/graph-builder';
import { ModelFactory } from '@/lib/agents/core/model-factory';
import { EventEmitter } from '@/lib/agents/core/event-emitter';
import { ExecutionManager } from '@/lib/agents/core/execution-manager';
import { globalErrorHandler } from '@/lib/agents/core/error-handler';
import { getAgentById, getAgentByName } from '@/lib/agents/unified-config';
import { HumanMessage } from '@langchain/core/messages';
import { createTaskNotification } from './notifications';
import { withRequestContext } from '@/lib/server/request-context';
import type { JsonObject, JsonValue } from '@/types/json';
import type { AgentExecution, AgentConfig } from '@/lib/agents/types';

function toJsonValue(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }
  if (typeof value === 'object') {
    const result: JsonObject = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toJsonValue(val);
    }
    return result;
  }
  return String(value);
}

export function normalizeTaskResultPayload(result: unknown): JsonObject {
  if (result === null || result === undefined) return {};
  if (typeof result === 'string') {
    return { summary: result };
  }
  if (Array.isArray(result)) {
    return { items: toJsonValue(result) };
  }
  if (typeof result === 'object') {
    const jsonObject = toJsonValue(result);
    if (jsonObject && typeof jsonObject === 'object' && !Array.isArray(jsonObject)) {
      return jsonObject;
    }
  }
  return { value: toJsonValue(result) };
}

function coerceAgentMessages(messages: unknown[]): JsonObject[] {
  return messages.map((raw) => {
    const entry = (raw ?? {}) as Record<string, unknown>;
    const role = typeof entry.role === 'string'
      ? entry.role
      : typeof (entry as { _getType?: () => string })._getType === 'function'
        ? (entry as { _getType: () => string })._getType()
        : 'assistant';

    const message: JsonObject = {
      role,
      timestamp: new Date().toISOString()
    };

    if ('content' in entry) {
      message.content = toJsonValue(entry.content);
    }

    if ('metadata' in entry) {
      message.metadata = toJsonValue((entry as { metadata?: unknown }).metadata);
    }

    if (typeof entry.id === 'string') {
      message.id = entry.id;
    }

    return message;
  });
}

function extractToolCalls(messages: unknown[]): JsonObject[] {
  const calls: JsonObject[] = [];
  for (const raw of messages) {
    const entry = (raw ?? {}) as Record<string, unknown>;
    const toolCalls = (entry as { tool_calls?: unknown[] }).tool_calls;
    if (!Array.isArray(toolCalls)) continue;
    for (const call of toolCalls) {
      const callEntry = (call ?? {}) as Record<string, unknown>;
      const record: JsonObject = {
        tool: typeof callEntry.tool === 'string' ? callEntry.tool : 'unknown_tool',
        input: toJsonValue(callEntry.input ?? null),
        output: toJsonValue((callEntry.result ?? callEntry.output) ?? null),
        timestamp: new Date().toISOString()
      };

      if (typeof callEntry.id === 'string') {
        record.id = callEntry.id;
      }

      calls.push(record);
    }
  }
  return calls;
}

export interface TaskExecutionResult {
  success: boolean;
  result?: JsonObject;
  error?: string;
  tool_calls?: JsonObject[];
  agent_messages?: JsonObject[];
  execution_metadata?: {
    start_time: string;
    end_time: string;
    duration_ms: number;
    memory_usage?: number;
    // ✅ 2025 OPTIMIZATION: Delegation visibility for control center
    delegations?: Array<{
      to_agent: string;
      task_description: string;
      timestamp: string;
      result?: string;
    }>;
    tool_calls?: number;
    forward_message_used?: boolean;
  };
}

/**
 * Execute an agent task
 */
/**
 * Get timeout based on agent type (delegations need more time)
 * CRITICAL: Timeouts must account for potential delegations and Google Workspace operations
 * 
 * UPDATED: Increased timeouts for complex workflows with Google Workspace:
 * - Research + Document creation + Email + Calendar
 * - Multiple delegations in sequence
 * - File uploads/downloads
 */
function getAgentTimeout(agentId: string): number {
  // OPTIMIZATION: Reduced from 20min to 10min based on LangGraph best practices
  // Supervisor agents that delegate (Cleo) - hierarchical orchestration support
  // 10 minutes allows for 3-4 delegations with proper streaming feedback
  // For longer workflows, break into separate scheduled tasks
  if (agentId.includes('cleo')) {
    return 600_000 // 10 minutes (optimized for better UX, was 20min)
  }
  
  // Research agents (Apu) - may do extensive searches across multiple sources
  // Increased for deep research with multiple queries
  if (agentId.includes('apu')) {
    return 480_000 // 8 minutes (multiple search queries + analysis)
  }
  
  // Email agents (Astra) - need time for email composition and sending
  // Increased for complex emails with attachments, Google Workspace integration
  if (agentId.includes('astra')) {
    return 600_000 // 10 minutes (Gmail API + attachments + multiple recipients)
  }
  
  // Workflow and calendar agents (Ami)
  // Increased for complex calendar operations, Google Workspace integration
  if (agentId.includes('ami')) {
    return 600_000 // 10 minutes (Calendar API + multiple events + Drive operations)
  }
  
  // Financial/Document agents (Peter) - Google Sheets/Docs creation
  // Need time for spreadsheet creation, data analysis, Drive uploads
  if (agentId.includes('peter')) {
    return 600_000 // 10 minutes (Google Sheets API + complex calculations)
  }
  
  // Automation (Wex with Skyvern)
  if (agentId.includes('wex')) {
    return 480_000 // 8 minutes (web automation can be slow)
  }
  
  // Standard agents
  return 300_000 // 5 minutes (increased from 3 to allow more operations)
}

export async function executeAgentTask(task: AgentTask): Promise<TaskExecutionResult> {
  const startTime = Date.now();
  const TIMEOUT_MS = getAgentTimeout(task.agent_id);
  
  const execution_metadata: {
    start_time: string
    end_time: string
    duration_ms: number
    delegations?: Array<{
      to_agent: string
      task_description: string
      timestamp: string
      result?: string
    }>
    tool_calls?: number
    forward_message_used?: boolean
  } = {
    start_time: new Date().toISOString(),
    end_time: '',
    duration_ms: 0
  };

  try {
    console.log(`🤖 Executing task for agent: ${task.agent_name} (${task.agent_id})`);
    console.log(`📋 Task: ${task.title}`);
    console.log(`🔧 Config:`, task.task_config);
    console.log(`⏱️ Timeout: ${TIMEOUT_MS/1000}s`);

    // Get agent configuration using unified function (supports both static and DB agents)
    let agentOrNull = await getAgentById(task.agent_id, task.user_id);
    if (!agentOrNull && task.agent_name) {
      const lower = String(task.agent_name).toLowerCase().trim()
      agentOrNull = await getAgentByName(lower, task.user_id);
    }
    if (!agentOrNull) {
      throw new Error(`Agent not found: ${task.agent_id}`);
    }
    
    // Type assertion: agent is guaranteed to exist after the check above
    const agent: AgentConfig = agentOrNull;

    // Create task-specific prompt based on agent and task type
    const taskPrompt = createTaskPrompt(task, TIMEOUT_MS);
    
    // CRITICAL FIX: Use agent orchestrator instead of direct GraphBuilder
    // This ensures delegation events are properly connected to CoreOrchestrator
    console.log(`⏱️ Task executing with ${TIMEOUT_MS/1000}s absolute timeout...`);
    console.log(`🚀 Using agent orchestrator for ${agent.name} to support delegations...`);
    
    // Use the legacy orchestrator which has CoreOrchestrator with delegation support
    const { getAgentOrchestrator } = await import('@/lib/agents/agent-orchestrator');
    const orchestrator = await getAgentOrchestrator();
    
    console.log(`🚀 Starting agent execution...`);
    console.log(`📋 Initial state:`, {
      userId: task.user_id,
      agentId: agent.id,
      isScheduledTask: true,
      taskId: task.task_id
    });
    
    // ✅ CRITICAL: Update task status to 'running' before execution
    // This ensures UI shows correct status during execution
    const { updateAgentTaskAdmin } = await import('./tasks-db');
    await updateAgentTaskAdmin(task.task_id, {
      status: 'running',
      started_at: new Date().toISOString(),
      last_run_at: new Date().toISOString(),
      error_message: null
    });
    console.log(`✅ Task status updated to 'running'`);
    
    // Execute within user context with timeout protection
    const resultPromise = withRequestContext(
      { userId: task.user_id, requestId: `task-${task.task_id}` },
      async () => {
        // ✅ CRITICAL: Start execution with metadata to bypass approval
        // The metadata.isScheduledTask flag tells approval-node.ts to auto-approve high-risk tools
        const execution = await orchestrator.startAgentExecutionWithHistory(
          taskPrompt,
          agent.id,
          [{
            role: 'user' as const,
            content: taskPrompt,
            metadata: {
              isScheduledTask: true,  // Auto-approve tools (scheduled tasks are pre-authorized)
              taskId: task.task_id,
              taskTitle: task.title
            }
          }]
        );
        
        // Poll for completion
        const pollInterval = 500; // Poll every 500ms
        const maxPolls = Math.floor(TIMEOUT_MS / pollInterval);
        
        for (let i = 0; i < maxPolls; i++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
          const currentExecution = orchestrator.getExecution(execution.id);
          if (!currentExecution) {
            throw new Error('Execution disappeared from registry');
          }
          
          if (currentExecution.status === 'completed' || currentExecution.status === 'failed') {
            return currentExecution;
          }
        }
        
        throw new Error('Task execution timeout - polling expired');
      }
    );
    
    // Race between execution and timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Task execution timeout')), TIMEOUT_MS)
    );
    
    const result = await Promise.race([resultPromise, timeoutPromise]) as any;

    execution_metadata.end_time = new Date().toISOString();
    execution_metadata.duration_ms = Date.now() - startTime;

    // CRITICAL FIX: Extract result from orchestrator execution object
    const execution = result as AgentExecution;
    
    // ✅ 2025 OPTIMIZATION: Extract delegation metadata for visibility in control center
    // This allows UI to display which agents were involved and if forward_message was used
    const delegations: typeof execution_metadata.delegations = [];
    let forwardMessageUsed = false;
    let toolCallCount = 0;

    if (execution.messages) {
      execution.messages.forEach(msg => {
        if (msg.type === 'ai' && msg.toolCalls) {
          toolCallCount += msg.toolCalls.length;
          
          msg.toolCalls.forEach(tc => {
            // Detect delegation tools
            if (tc.name?.startsWith('delegate_to_')) {
              const toAgent = tc.name.replace('delegate_to_', '');
              delegations.push({
                to_agent: toAgent,
                task_description: (tc.args as any)?.taskDescription || (tc.args as any)?.task || 'Unknown task',
                timestamp: new Date().toISOString(),
                result: tc.result ? String(tc.result).substring(0, 200) : undefined // Truncate for metadata
              });
            }
            
            // Detect forward_message usage (LangGraph 2025 best practice)
            if (tc.name === 'forward_message') {
              forwardMessageUsed = true;
            }
          });
        }
      });
    }

    execution_metadata.delegations = delegations.length > 0 ? delegations : undefined;
    execution_metadata.tool_calls = toolCallCount;
    execution_metadata.forward_message_used = forwardMessageUsed;

    console.log(`📊 Execution metadata:`, {
      delegations: delegations.length,
      tool_calls: toolCallCount,
      forward_message_used: forwardMessageUsed
    });
    
    // Check execution status
    if (execution.status === 'failed') {
      const errorMsg = typeof execution.error === 'string' 
        ? execution.error 
        : (execution.error as any)?.message || 'Execution failed';
      console.log(`❌ Task failed: ${errorMsg}`);
      
      // ✅ Update task status to 'failed' in database
      await updateAgentTaskAdmin(task.task_id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMsg
      });
      
      // Create failure notification
      await createTaskNotification({
        user_id: task.user_id,
        task_id: task.task_id,
        agent_id: task.agent_id,
        agent_name: task.agent_name,
        agent_avatar: task.agent_avatar || undefined,
        notification_type: 'task_failed',
        title: `❌ Task Failed: ${task.title}`,
        message: `${task.agent_name} could not complete task "${task.title}". Reason: ${errorMsg}`,
        task_result: {
          error: errorMsg,
          execution_time: execution_metadata.duration_ms,
          failed_at: execution_metadata.end_time
        },
        priority: 'high'
      }).catch(err => console.error('Failed to create failure notification:', err));

      return {
        success: false,
        error: errorMsg,
        execution_metadata
      };
    }

    // Extract result content from the orchestrator execution
    const lastMessage = execution.messages && execution.messages.length > 0
      ? execution.messages[execution.messages.length - 1]
      : null;
    const resultContent = execution.result || lastMessage?.content || 'Task completed';

    // Check for tool failures in the message history
    let hasToolFailures = false;
    const failureReasons: string[] = [];
    
    const agentMessages = Array.isArray(execution.messages) ? coerceAgentMessages(execution.messages) : [];
    const toolCalls: JsonObject[] = [];
    
    // Extract tool calls from execution steps
    if (execution.steps && Array.isArray(execution.steps)) {
      for (const step of execution.steps) {
        if (step.metadata && typeof step.metadata === 'object') {
          const metadata = step.metadata as Record<string, unknown>;
          if (metadata.toolName || metadata.tool) {
            toolCalls.push({
              tool: String(metadata.toolName || metadata.tool || 'unknown'),
              input: toJsonValue(metadata.input || metadata.args || null),
              output: toJsonValue(metadata.result || metadata.output || null),
              timestamp: step.timestamp ? new Date(step.timestamp).toISOString() : new Date().toISOString()
            });
          }
        }
      }
    }
    
    const normalizedResult = normalizeTaskResultPayload(resultContent);
    normalizedResult.execution_metadata = execution_metadata;

    // Check messages for failures
    if (execution.messages && Array.isArray(execution.messages)) {
      for (const message of execution.messages) {
        const content = (message as any)?.content;
        if (typeof content === 'string') {
          if (content.includes('"success":false') || 
              content.includes('Auth required') ||
              content.includes('error') ||
              content.includes('failed')) {
            hasToolFailures = true;
            if (content.includes('Auth required')) {
              failureReasons.push('Authentication required');
            }
          }
        }
      }
    }

    if (hasToolFailures) {
      console.log(`❌ Task failed due to tool failures: ${failureReasons.join(', ')}`);
      
      // ✅ Update task status to 'failed' in database
      await updateAgentTaskAdmin(task.task_id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: failureReasons.join(', ')
      });
      
      // Create failure notification
      await createTaskNotification({
        user_id: task.user_id,
        task_id: task.task_id,
        agent_id: task.agent_id,
        agent_name: task.agent_name,
        agent_avatar: task.agent_avatar || undefined,
        notification_type: 'task_failed',
        title: `❌ Task Failed: ${task.title}`,
        message: `${task.agent_name} could not complete task "${task.title}". Reason: ${failureReasons.join(', ')}`,
        task_result: {
          error: failureReasons.join(', '),
          execution_time: execution_metadata.duration_ms,
          failed_at: execution_metadata.end_time
        },
        priority: 'high'
      }).catch(err => console.error('Failed to create failure notification:', err));

      return {
        success: false,
        error: failureReasons.join(', '),
        result: normalizedResult,
        tool_calls: toolCalls,
        agent_messages: agentMessages,
        execution_metadata
      };
    }

    console.log(`✅ Task completed successfully in ${execution_metadata.duration_ms}ms`);

    // Create success notification
    await createTaskNotification({
      user_id: task.user_id,
      task_id: task.task_id,
      agent_id: task.agent_id,
      agent_name: task.agent_name,
      agent_avatar: task.agent_avatar || undefined,
      notification_type: 'task_completed',
      title: `✅ Task Completed: ${task.title}`,
      message: `${task.agent_name} has successfully completed your task "${task.title}" in ${execution_metadata.duration_ms}ms.`,
      task_result: {
        ...normalizedResult,
        execution_time: execution_metadata.duration_ms,
        agent_messages_count: agentMessages.length,
        completed_at: execution_metadata.end_time
      },
      priority: 'medium',
      auto_send_to_chat: (task.task_config && typeof task.task_config.auto_notify_chat === 'boolean') 
        ? task.task_config.auto_notify_chat 
        : false
    }).catch(err => console.error('Failed to create success notification:', err));

    // ✅ CRITICAL: Update task status to 'completed' after successful execution
    // This ensures UI shows the task as finished
    await updateAgentTaskAdmin(task.task_id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      result_data: normalizedResult as any,
      error_message: null
    });
    console.log(`✅ Task status updated to 'completed'`);

    return {
      success: true,
      result: normalizedResult,
      tool_calls: toolCalls,
      agent_messages: agentMessages,
      execution_metadata
    };

  } catch (error) {
    execution_metadata.end_time = new Date().toISOString();
    execution_metadata.duration_ms = Date.now() - startTime;

    const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
    
    // Handle timeout specifically
    if (errorMessage === 'Task execution timeout') {
      console.error(`⏱️ Task timed out after ${TIMEOUT_MS/1000}s (agent: ${task.agent_id})`);
      
      // ✅ Update task status to 'failed' in database
      const { updateAgentTaskAdmin } = await import('./tasks-db');
      await updateAgentTaskAdmin(task.task_id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: `Timeout after ${TIMEOUT_MS/1000}s`
      });
      
      await createTaskNotification({
        user_id: task.user_id,
        task_id: task.task_id,
        agent_id: task.agent_id,
        agent_name: task.agent_name,
        agent_avatar: task.agent_avatar || undefined,
        notification_type: 'task_failed',
        title: `⏱️ Task Timeout: ${task.title}`,
        message: `${task.agent_name} task timed out after ${TIMEOUT_MS/1000}s. The task may have been too complex or requires longer processing time.`,
        error_details: `Timeout after ${TIMEOUT_MS/1000}s - Consider breaking into smaller tasks`,
        priority: 'high'
      }).catch(err => console.error('Failed to create timeout notification:', err));
      
      return {
        success: false,
        error: `Task timed out after ${TIMEOUT_MS/1000}s`,
        execution_metadata: {
          ...execution_metadata,
          timeout: true
        } as any
      };
    }
    
    console.error(`❌ Task execution failed: ${errorMessage}`);

    // ✅ Update task status to 'failed' in database
    const { updateAgentTaskAdmin } = await import('./tasks-db');
    await updateAgentTaskAdmin(task.task_id, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage
    });

    // Create failure notification
    await createTaskNotification({
      user_id: task.user_id,
      task_id: task.task_id,
      agent_id: task.agent_id,
      agent_name: task.agent_name,
      agent_avatar: task.agent_avatar || undefined,
      notification_type: 'task_failed',
      title: `❌ Task Failed: ${task.title}`,
      message: `${task.agent_name} encountered an error while executing your task "${task.title}".`,
      error_details: errorMessage,
      priority: 'high',
      auto_send_to_chat: (task.task_config && typeof task.task_config.auto_notify_chat === 'boolean')
        ? task.task_config.auto_notify_chat
        : false
    }).catch(err => console.error('Failed to create failure notification:', err));

    return {
      success: false,
      error: errorMessage,
      execution_metadata
    };
  }
}

/**
 * Create task-specific prompt based on agent and task configuration
 */
function createTaskPrompt(task: AgentTask, timeoutMs: number): string {
  const basePrompt = `You have been assigned a ${task.task_type} task: "${task.title}"

Description: ${task.description}

CRITICAL TASK EXECUTION RULES:
- This is a SCHEDULED TASK, not a conversation
- NEVER ask for clarification or additional information
- Use ALL provided information in task description and task_config
- Execute immediately with available data and reasonable defaults

MULTI-STEP TASK EXECUTION:
- CAREFULLY ANALYZE the task description for multiple steps or actions
- Identify ALL steps that need to be completed (e.g., "research AND send email", "analyze AND create report")
- Execute EVERY step in sequence - do NOT skip any steps
- Wait for each step to complete before moving to the next
- ONLY call complete_task after ALL steps are finished

Examples of multi-step tasks:
- "Research X and send summary via email" = 2 steps: research + send email
- "Analyze data and create calendar event" = 2 steps: analyze + calendar
- "Find information and draft report" = 2 steps: find + draft

Task Configuration:
${JSON.stringify(task.task_config, null, 2)}

${task.context_data && Object.keys(task.context_data).length > 0 ? `
Additional Context:
${JSON.stringify(task.context_data, null, 2)}
` : ''}`;

  // Add agent-specific instructions
  switch (task.agent_id) {
    case 'apu-support':
      // OPTIMIZATION: Compressed from 17 lines to 9 lines (~47% reduction)
      return `${basePrompt}

As Apu (Research Specialist), use available search tools (webSearch, serpNewsSearch, serpScholarSearch, etc.) to research the topic.

Deliver:
1. Executive Summary (2-3 sentences)
2. Key Findings (bullet points with sources)
3. Recommendations

Call complete_task with your final report.`;

  case 'wex-intelligence':
      // OPTIMIZATION: Compressed from 14 lines to 7 lines (~50% reduction)
      return `${basePrompt}

As Wex (Web Automation), use Skyvern tools (create_skyvern_task, get_skyvern_task, take_skyvern_screenshot).

Deliver: execution summary, steps completed, issues/resolutions, screenshots.

Call complete_task when automation is complete.`;

    case 'emma-ecommerce':
      // OPTIMIZATION: Compressed from 13 lines to 6 lines (~54% reduction)
      return `${basePrompt}

As Emma (E-commerce), provide analysis with: summary, key metrics, optimization recommendations, market insights.

Call complete_task with findings.`;

    case 'peter-financial':
      // OPTIMIZATION: Compressed from 15 lines to 7 lines (~53% reduction)
      return `${basePrompt}

As Peter (Financial Advisor), provide analysis using Google Sheets when needed. Research market/crypto data as required.

Deliver: financial analysis, recommendations, strategic insights, document links.

Call complete_task with results.`;

    case 'ami-creative':
      // OPTIMIZATION: Compressed from 13 lines to 6 lines (~54% reduction)
      return `${basePrompt}

As Ami (Executive Assistant), use calendar tools or delegate to sub-agents. Execute with available info.

Deliver: summary, actions taken, calendar events, next steps.

Call complete_task with results.`;

    case 'cleo-supervisor':
      // OPTIMIZATION (2025 LangGraph Best Practices):
      // - Removed hardcoded delegation rules (Email→Astra, Calendar→Ami) to avoid conflicting with Cleo's native delegation system
      // - Cleo already has DELEGATION_AND_SPEED rules in lib/prompts/index.ts with forward_message tool (95% cases)
      // - Let Cleo's heuristics decide delegation naturally, preserving specialist responses via forward_message
      // - Reduced from 35 lines to 18 lines (~49% reduction) by removing redundant instructions
      return `${basePrompt}

As Ankie (Supervisor), this is a SCHEDULED TASK - execute immediately with available data.

EXECUTION PROTOCOL:
1. ANALYZE: Identify required actions from task description and task_config
2. EXECUTE: Use your available tools or delegate to appropriate specialists
3. PRESERVE: When specialists respond, use forward_message to preserve their exact response (95% of cases)
4. COMPLETE: Call complete_task with execution summary

CRITICAL RULES:
- Never ask for clarification (automated task with all required context provided)
- Use your native delegation heuristics - choose the best specialist for each action
- Wait for delegation responses before proceeding to next step
- Must call complete_task when all actions are finished

⏰ Timeout: ${timeoutMs/1000}s. Execute efficiently without delays.

START NOW.`;

    default:
      return `${basePrompt}

Execute this task immediately using your available tools and expertise. When finished, call complete_task with your results.`;
  }
}

/**
 * Validate task configuration for specific agent types
 */
export function validateTaskConfig(task: AgentTask): { valid: boolean; error?: string } {
  if (!task.task_config) {
    return { valid: true }; // Si no hay config, es válido por defecto
  }

  switch (task.agent_id) {
    case 'apu-support':
      if (!task.task_config.issue && !task.task_config.support_request) {
        return { 
          valid: false, 
          error: 'Apu support tasks require either "issue" or "support_request" in task_config' 
        };
      }
      break;
    
    case 'wex-intelligence':
      if (!task.task_config.url && !task.task_config.instructions) {
        return { 
          valid: false, 
          error: 'Wex automation tasks require "url" and "instructions" in task_config' 
        };
      }
      break;
    
    case 'emma-ecommerce':
      if (!task.task_config.product_name && !task.task_config.analysis_type) {
        return { 
          valid: false, 
          error: 'Emma e-commerce tasks require "product_name" or "analysis_type" in task_config' 
        };
      }
      break;
  }

  return { valid: true };
}

/**
 * Get example task configurations for different agents
 */
export function getExampleTaskConfigs() {
  return {
    'apu-support': {
      customer_support: {
        issue: "user login problems",
        priority: "high",
        customer_info: "Premium customer",
        affected_features: ["authentication", "dashboard"]
      },
      technical_troubleshooting: {
        support_request: "API integration failing",
        geographical_focus: "North America",
        include_competitor_analysis: true,
        sources: ["news", "web", "scholar"]
      },
      scheduled_monitoring: {
        query: "Tesla stock news",
        sources: ["news"],
        alert_keywords: ["earnings", "recall", "announcement"],
        time_range: "24 hours"
      }
    },
  'wex-intelligence': {
      form_filling: {
        url: "https://example.com/contact",
        instructions: "Fill out the contact form with provided information",
        form_data: {
          name: "John Doe",
          email: "john@example.com",
          message: "Interested in your services"
        },
        max_steps: 25
      },
      data_extraction: {
        url: "https://example.com/products",
        instructions: "Extract all product names, prices, and availability",
        extraction_format: "json",
        max_steps: 50
      }
    },
    'emma-ecommerce': {
      price_monitoring: {
        product_name: "iPhone 15 Pro",
        platforms: ["amazon", "bestbuy", "apple"],
        price_threshold: 999,
        stock_alerts: true
      },
      competitor_analysis: {
        product_category: "wireless headphones",
        competitor_brands: ["Sony", "Bose", "Apple"],
        analysis_metrics: ["price", "reviews", "features"]
      }
    }
  };
}
