import { tool } from 'ai';
import { z } from 'zod';

/**
 * LangGraph-style delegation tools for intelligent agent handoffs
 * Based on LangGraph Supervisor pattern with Command routing
 * 
 * Each tool returns a Command object that tells the graph builder
 * to transfer control to the specified agent with the task context.
 */

// Task delegation schema for intelligent handoffs
const delegationSchema = z.object({
  task_description: z.string().describe('Clear, detailed description of what the specialist agent should accomplish, including all relevant context and requirements'),
});

// Individual delegation tools implementing LangGraph Command pattern

export const delegateToTobyTool = tool({
  description: 'Transfer to Toby for technical analysis, programming, system architecture, data processing, debugging, or any technical problem-solving tasks. Toby excels at code analysis, technical research, and system optimization.',
  inputSchema: delegationSchema,
  execute: async ({ task_description }) => {
    return {
      command: 'HANDOFF_TO_AGENT',
      target_agent: 'toby-technical',
      task_description,
      handoff_message: `Transferring to Toby (Technical Specialist) for: ${task_description}`,
      delegation_complete: true
    };
  }
});

export const delegateToAmiTool = tool({
  description: 'Transfer to Ami for creative projects, design work, visual content creation, UI/UX design, branding, artistic projects, or creative writing tasks. Ami specializes in creative and design solutions.',
  inputSchema: delegationSchema,
  execute: async ({ task_description }) => {
    return {
      command: 'HANDOFF_TO_AGENT',
      target_agent: 'ami-creative', 
      task_description,
      handoff_message: `Transferring to Ami (Creative Specialist) for: ${task_description}`,
      delegation_complete: true
    };
  }
});

export const delegateToPeterTool = tool({
  description: 'Transfer to Peter for logical reasoning, mathematical calculations, complex problem-solving, algorithm optimization, statistical analysis, or analytical tasks requiring systematic thinking.',
  inputSchema: delegationSchema,
  execute: async ({ task_description }) => {
    return {
      command: 'HANDOFF_TO_AGENT',
      target_agent: 'peter-logical',
      task_description,
      handoff_message: `Transferring to Peter (Logical Specialist) for: ${task_description}`,
      delegation_complete: true
    };
  }
});

export const delegateToEmmaTool = tool({
  description: 'Transfer to Emma for e-commerce operations, Shopify store management, sales analysis, business operations, product optimization, customer management, or retail/business strategy tasks.',
  inputSchema: delegationSchema,
  execute: async ({ task_description }) => {
    return {
      command: 'HANDOFF_TO_AGENT',
      target_agent: 'emma-ecommerce',
      task_description,
      handoff_message: `Transferring to Emma (E-commerce Specialist) for: ${task_description}`,
      delegation_complete: true
    };
  }
});

export const delegateToApuTool = tool({
  description: 'Transfer to Apu for advanced web intelligence, comprehensive research, market analysis, competitive intelligence, real-time information gathering, news analysis, or multi-source data synthesis tasks.',
  inputSchema: delegationSchema,
  execute: async ({ task_description }) => {
    return {
      command: 'HANDOFF_TO_AGENT',
      target_agent: 'apu-research',
      task_description,
      handoff_message: `Transferring to Apu (Research & Intelligence Specialist) for: ${task_description}`,
      delegation_complete: true
    };
  }
});

// Export all delegation tools
export const delegationTools = {
  delegate_to_toby: delegateToTobyTool,
  delegate_to_ami: delegateToAmiTool,
  delegate_to_peter: delegateToPeterTool,
  delegate_to_emma: delegateToEmmaTool,
  delegate_to_apu: delegateToApuTool
};

/**
 * Factory to create a dynamic delegation tool for any target agent.
 * The tool name should be registered in the global tools registry separately.
 */
export function createDelegateToTool(targetAgentId: string, targetAgentName: string) {
  return tool({
    description: `Delegate task to ${targetAgentName} (dynamic). Use when ${targetAgentName} is the right specialist for the task.`,
    inputSchema: delegationSchema,
    execute: async ({ task_description }) => {
      return {
        command: 'HANDOFF_TO_AGENT',
        target_agent: targetAgentId,
        task_description,
        handoff_message: `Transferring to ${targetAgentName} for: ${task_description}`,
        delegation_complete: true
      };
    }
  })
}
