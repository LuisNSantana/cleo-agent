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

interface AgentMessageRecord {
  role: string;
  content: unknown;
  timestamp: string;
}

interface ToolCallRecord {
  tool: string;
  input: unknown;
  output: unknown;
  timestamp: string;
}

function normalizeTaskResultPayload(result: unknown): Record<string, unknown> {
  if (result === null || result === undefined) return {};
  if (typeof result === 'string') {
    return { summary: result };
  }
  if (Array.isArray(result)) {
    return { items: result };
  }
  if (typeof result === 'object') {
    return { ...(result as Record<string, unknown>) };
  }
  return { value: result };
}

function coerceAgentMessages(messages: unknown[]): AgentMessageRecord[] {
  return messages.map((raw) => {
    const entry = (raw ?? {}) as Record<string, unknown>;
    const role = typeof entry.role === 'string'
      ? entry.role
      : typeof (entry as { _getType?: () => string })._getType === 'function'
        ? (entry as { _getType: () => string })._getType()
        : 'assistant';
    return {
      role,
      content: entry.content,
      timestamp: new Date().toISOString()
    };
  });
}

function extractToolCalls(messages: unknown[]): ToolCallRecord[] {
  const calls: ToolCallRecord[] = [];
  for (const raw of messages) {
    const entry = (raw ?? {}) as Record<string, unknown>;
    const toolCalls = (entry as { tool_calls?: unknown[] }).tool_calls;
    if (!Array.isArray(toolCalls)) continue;
    for (const call of toolCalls) {
      const callEntry = (call ?? {}) as Record<string, unknown>;
      calls.push({
        tool: typeof callEntry.tool === 'string' ? callEntry.tool : 'unknown_tool',
        input: callEntry.input,
        output: callEntry.result ?? callEntry.output,
        timestamp: new Date().toISOString()
      });
    }
  }
  return calls;
}

export interface TaskExecutionResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  tool_calls?: ToolCallRecord[];
  agent_messages?: AgentMessageRecord[];
  execution_metadata?: {
    start_time: string;
    end_time: string;
    duration_ms: number;
    memory_usage?: number;
  };
}

/**
 * Execute an agent task
 */
export async function executeAgentTask(task: AgentTask): Promise<TaskExecutionResult> {
  const startTime = Date.now();
  const execution_metadata = {
    start_time: new Date().toISOString(),
    end_time: '',
    duration_ms: 0
  };

  try {
    console.log(`🤖 Executing task for agent: ${task.agent_name} (${task.agent_id})`);
    console.log(`📋 Task: ${task.title}`);
    console.log(`🔧 Config:`, task.task_config);

    // Get agent configuration using unified function (supports both static and DB agents)
    let agent = await getAgentById(task.agent_id, task.user_id);
    if (!agent && task.agent_name) {
      const lower = String(task.agent_name).toLowerCase().trim()
      agent = await getAgentByName(lower, task.user_id);
    }
    if (!agent) {
      throw new Error(`Agent not found: ${task.agent_id}`);
    }

    // Create task-specific prompt based on agent and task type
    const taskPrompt = createTaskPrompt(task);
    
    // Initialize the graph builder with proper configuration
    const modelFactory = new ModelFactory();
    const eventEmitter = new EventEmitter();
    const executionManager = new ExecutionManager({
      eventEmitter,
      errorHandler: globalErrorHandler
    });

    const graphBuilder = new GraphBuilder({
      modelFactory,
      eventEmitter, 
      executionManager
    });
    
    console.log(`🚀 Building graph for agent: ${agent.name}`);
    
    // Build the graph for this agent
    const graph = await graphBuilder.buildGraph(agent);
    
    // Compile and execute the graph
    const compiledGraph = graph.compile();
    
    const initialState = {
      messages: [new HumanMessage(taskPrompt)]
    };

    console.log(`🚀 Starting agent execution...`);
    
    // Execute within user context so tools can access credentials
    const result = await withRequestContext(
      { userId: task.user_id, requestId: `task-${task.task_id}` },
      () => compiledGraph.invoke(initialState)
    );

    execution_metadata.end_time = new Date().toISOString();
    execution_metadata.duration_ms = Date.now() - startTime;

    // Extract result content from the graph response
    const lastMessage = result.messages[result.messages.length - 1];
    const resultContent = lastMessage?.content || 'Task completed';

    // Check for tool failures in the message history
    let hasToolFailures = false;
    let failureReasons: string[] = [];
    
    const agentMessages = Array.isArray(result.messages) ? coerceAgentMessages(result.messages) : [];
    const toolCalls = Array.isArray(result.messages) ? extractToolCalls(result.messages) : [];
    const normalizedResult = normalizeTaskResultPayload(resultContent);
    normalizedResult.execution_metadata = execution_metadata;

    for (const message of result.messages) {
      // Check for tool messages with failures
      const content = (message as Record<string, unknown>).content;
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
      // Check for tool call results
      const maybeToolCalls = (message as { tool_calls?: unknown[] }).tool_calls;
      if (Array.isArray(maybeToolCalls)) {
        for (const toolCall of maybeToolCalls) {
          const resultPayload = (toolCall as Record<string, unknown>).result;
          if (resultPayload && typeof resultPayload === 'object') {
            if ((resultPayload as { success?: boolean }).success === false) {
              hasToolFailures = true;
              const failureMessage = (resultPayload as { message?: string }).message;
              failureReasons.push(failureMessage || 'Tool execution failed');
            }
          }
        }
      }
    }

    if (hasToolFailures) {
      console.log(`❌ Task failed due to tool failures: ${failureReasons.join(', ')}`);
      
      // Create failure notification
      await createTaskNotification({
        user_id: task.user_id,
        task_id: task.task_id,
        agent_id: task.agent_id,
        agent_name: task.agent_name,
        agent_avatar: task.agent_avatar,
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
      agent_avatar: task.agent_avatar,
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
      auto_send_to_chat: task.task_config?.auto_notify_chat || false
    }).catch(err => console.error('Failed to create success notification:', err));

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
    console.error(`❌ Task execution failed: ${errorMessage}`);

    // Create failure notification
    await createTaskNotification({
      user_id: task.user_id,
      task_id: task.task_id,
      agent_id: task.agent_id,
      agent_name: task.agent_name,
      agent_avatar: task.agent_avatar,
      notification_type: 'task_failed',
      title: `❌ Task Failed: ${task.title}`,
      message: `${task.agent_name} encountered an error while executing your task "${task.title}".`,
      error_details: errorMessage,
      priority: 'high',
      auto_send_to_chat: task.task_config?.auto_notify_chat || false
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
function createTaskPrompt(task: AgentTask): string {
  const basePrompt = `You have been assigned a ${task.task_type} task: "${task.title}"

Description: ${task.description}

CRITICAL TASK EXECUTION RULES:
- This is a SCHEDULED TASK, not a conversation
- NEVER ask for clarification or additional information
- Use ALL provided information in task description and task_config
- Execute immediately with available data and reasonable defaults
- Provide comprehensive results
- ALWAYS call complete_task when finished

Task Configuration:
${JSON.stringify(task.task_config, null, 2)}

${task.context_data && Object.keys(task.context_data).length > 0 ? `
Additional Context:
${JSON.stringify(task.context_data, null, 2)}
` : ''}`;

  // Add agent-specific instructions
  switch (task.agent_id) {
    case 'apu-support':
      return `${basePrompt}

As Apu (Customer Success & Technical Support Specialist), provide excellent customer support using your available tools:
- Use serpNewsSearch for recent news and updates
- Use serpScholarSearch for academic research and papers  
- Use serpGeneralSearch for background information
- Use webSearch for additional sources and verification
- Use serpLocationSearch if geographical context is needed
- Use serpAutocomplete to expand search terms

Execute immediately with provided query/topic. Provide a comprehensive research report with:
1. Executive Summary (2-3 sentences)
2. Key Findings (structured bullet points)
3. Sources and Evidence (cite all sources used)
4. Recommendations or Next Steps

When you have completed your research, call complete_task with your final report.`;

  case 'wex-intelligence':
      return `${basePrompt}

As Wex (Web Automation Specialist), execute the automation task using your Skyvern tools:
- Use create_skyvern_task to automate web interactions
- Use get_skyvern_task to monitor task progress
- Use take_skyvern_screenshot for debugging if needed

Execute immediately with provided URL/instructions. Provide detailed results including:
1. Task execution summary
2. Steps completed successfully
3. Any issues encountered and resolutions
4. Screenshots or recordings if available

When automation is complete, call complete_task with your results.`;

    case 'emma-ecommerce':
      return `${basePrompt}

As Emma (E-commerce Specialist), handle the e-commerce related task:
- Use your available tools for product research, price monitoring, or marketplace analysis
- Provide actionable insights for e-commerce optimization

Execute immediately with provided parameters. Deliver results with:
1. Analysis summary
2. Key metrics and data points
3. Recommendations for optimization
4. Market insights if applicable

When analysis is complete, call complete_task with your findings.`;

    case 'peter-financial':
      return `${basePrompt}

As Peter (Financial Advisor), provide comprehensive financial analysis and business strategy:
- Create detailed financial models and analysis using Google Sheets
- Research market data and crypto prices for investment decisions
- Develop business strategies, budgets, and financial projections

Execute immediately with provided information. Deliver:
1. Comprehensive financial analysis with supporting data
2. Actionable recommendations and strategic insights
3. Professional financial models in Google Sheets when applicable
2. Brief explanation of document structure
3. Access instructions

When document is created, call complete_task with document link.`;

    case 'ami-creative':
      return `${basePrompt}

As Ami (Executive Assistant), handle administrative and productivity tasks:
- Use calendar tools for scheduling (create events with smart defaults)
- Delegate specialized work to appropriate sub-agents
- Execute immediately with available information

Execute immediately with provided parameters. Provide:
1. Task completion summary
2. Any calendar events created or actions taken
3. Next steps and follow-up recommendations

When task is complete, call complete_task with results.`;

    default:
      return `${basePrompt}

Execute this task immediately using your available tools and expertise. When finished, call complete_task with your results.`;
  }
}

/**
 * Validate task configuration for specific agent types
 */
export function validateTaskConfig(task: AgentTask): { valid: boolean; error?: string } {
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
