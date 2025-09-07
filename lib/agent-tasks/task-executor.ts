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
import { getAgentById, getAllAgents } from '@/lib/agents/config';
import { HumanMessage } from '@langchain/core/messages';
import { createTaskNotification } from './notifications';

export interface TaskExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  tool_calls?: Array<{
    tool: string;
    input: any;
    output: any;
    timestamp: string;
  }>;
  agent_messages?: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
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

    // Get agent configuration with fallback by name (handles legacy UUIDs stored in DB)
    let agent = getAgentById(task.agent_id);
    if (!agent && task.agent_name) {
      const lower = String(task.agent_name).toLowerCase().trim()
      agent = getAllAgents().find(a => a.name.toLowerCase() === lower)
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
    
    const result = await compiledGraph.invoke(initialState);

    execution_metadata.end_time = new Date().toISOString();
    execution_metadata.duration_ms = Date.now() - startTime;

    // Extract result content from the graph response
    const lastMessage = result.messages[result.messages.length - 1];
    const resultContent = lastMessage?.content || 'Task completed';

    console.log(`✅ Task completed successfully in ${execution_metadata.duration_ms}ms`);

    // Create success notification
    await createTaskNotification({
      task_id: task.task_id,
      agent_id: task.agent_id,
      agent_name: task.agent_name,
      agent_avatar: task.agent_avatar,
      notification_type: 'task_completed',
      title: `✅ Task Completed: ${task.title}`,
      message: `${task.agent_name} has successfully completed your task "${task.title}" in ${execution_metadata.duration_ms}ms.`,
      task_result: {
        summary: typeof resultContent === 'string' ? resultContent : 'Task completed successfully',
        execution_time: execution_metadata.duration_ms,
        agent_messages_count: result.messages.length,
        completed_at: execution_metadata.end_time
      },
      priority: 'medium',
      auto_send_to_chat: task.task_config?.auto_notify_chat || false
    }).catch(err => console.error('Failed to create success notification:', err));

    return {
      success: true,
      result: resultContent,
      tool_calls: [], // TODO: Extract tool calls from execution
      agent_messages: result.messages.map((msg: any) => ({
        role: msg.role || msg._getType(),
        content: msg.content,
        timestamp: new Date().toISOString()
      })),
      execution_metadata
    };

  } catch (error) {
    execution_metadata.end_time = new Date().toISOString();
    execution_metadata.duration_ms = Date.now() - startTime;

    const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
    console.error(`❌ Task execution failed: ${errorMessage}`);

    // Create failure notification
    await createTaskNotification({
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

Task Configuration:
${JSON.stringify(task.task_config, null, 2)}

${task.context_data && Object.keys(task.context_data).length > 0 ? `
Additional Context:
${JSON.stringify(task.context_data, null, 2)}
` : ''}`;

  // Add agent-specific instructions
  switch (task.agent_id) {
    case 'apu-research':
      return `${basePrompt}

As Apu (Research & Intelligence Specialist), conduct thorough research using your available tools:
- Use serpNewsSearch for recent news and updates
- Use serpScholarSearch for academic research and papers  
- Use serpGeneralSearch for background information
- Use webSearch for additional sources and verification
- Use serpLocationSearch if geographical context is needed
- Use serpAutocomplete to expand search terms

Provide a comprehensive research report with:
1. Executive Summary (2-3 sentences)
2. Key Findings (structured bullet points)
3. Sources and Evidence (cite all sources used)
4. Recommendations or Next Steps

When you have completed your research, call complete_task with your final report.`;

    case 'wex-automation':
      return `${basePrompt}

As Wex (Web Automation Specialist), execute the automation task using your Skyvern tools:
- Use create_skyvern_task to automate web interactions
- Use get_skyvern_task to monitor task progress
- Use take_skyvern_screenshot for debugging if needed

Provide detailed results including:
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

Deliver results with:
1. Analysis summary
2. Key metrics and data points
3. Recommendations for optimization
4. Market insights if applicable

When analysis is complete, call complete_task with your findings.`;

    default:
      return `${basePrompt}

Complete this task using your available tools and expertise. When finished, call complete_task with your results.`;
  }
}

/**
 * Validate task configuration for specific agent types
 */
export function validateTaskConfig(task: AgentTask): { valid: boolean; error?: string } {
  switch (task.agent_id) {
    case 'apu-research':
      if (!task.task_config.query && !task.task_config.research_topic) {
        return { 
          valid: false, 
          error: 'Apu research tasks require either "query" or "research_topic" in task_config' 
        };
      }
      break;
    
    case 'wex-automation':
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
    'apu-research': {
      basic_research: {
        query: "latest AI agent developments 2025",
        sources: ["news", "scholar", "web"],
        time_range: "1 week",
        max_results: 10
      },
      market_analysis: {
        research_topic: "electric vehicle market trends",
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
    'wex-automation': {
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
