import { tool } from 'ai';
import { z } from 'zod';

// Delegation tool schema
const delegationSchema = z.object({
  task: z.string().describe('The specific task to delegate to the specialist agent'),
  context: z.string().optional().describe('Additional context for the delegated task'),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal').describe('Task priority level'),
  requirements: z.string().optional().describe('Specific requirements or constraints for the task')
});

// Individual delegation tools for each specialist agent

export const delegateToTobyTool = tool({
  description: 'Delegate technical, data analysis, or research tasks to Toby specialist. Use for programming, debugging, system architecture, data processing, or technical problem-solving.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return {
      status: 'delegated',
      targetAgent: 'toby-technical',
      delegatedTask: task,
      context: context || '',
      priority: priority || 'normal',
      requirements: requirements || '',
      handoffMessage: `Task delegated to Toby (Technical Specialist): ${task}${context ? ` - Context: ${context}` : ''}`,
      nextAction: 'handoff_to_agent',
      agentId: 'toby-technical'
    };
  }
});

export const delegateToAmiTool = tool({
  description: 'Delegate creative, design, or visual content tasks to Ami specialist. Use for graphic design, creative writing, UI/UX design, branding, or artistic projects.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return {
      status: 'delegated',
      targetAgent: 'ami-creative',
      delegatedTask: task,
      context: context || '',
      priority: priority || 'normal',
      requirements: requirements || '',
      handoffMessage: `Task delegated to Ami (Creative Specialist): ${task}${context ? ` - Context: ${context}` : ''}`,
      nextAction: 'handoff_to_agent',
      agentId: 'ami-creative'
    };
  }
});

export const delegateToPeterTool = tool({
  description: 'Delegate logical, mathematical, or optimization tasks to Peter specialist. Use for complex calculations, logic puzzles, algorithm optimization, or analytical problem-solving.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return {
      status: 'delegated',
      targetAgent: 'peter-logical',
      delegatedTask: task,
      context: context || '',
      priority: priority || 'normal',
      requirements: requirements || '',
      handoffMessage: `Task delegated to Peter (Logical Specialist): ${task}${context ? ` - Context: ${context}` : ''}`,
      nextAction: 'handoff_to_agent',
      agentId: 'peter-logical'
    };
  }
});

export const delegateToEmmaTool = tool({
  description: 'Delegate e-commerce, Shopify management, or business tasks to Emma specialist. Use for store management, sales analysis, product optimization, or business operations.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return {
      status: 'delegated',
      targetAgent: 'emma-ecommerce',
      delegatedTask: task,
      context: context || '',
      priority: priority || 'normal',
      requirements: requirements || '',
      handoffMessage: `Task delegated to Emma (E-commerce Specialist): ${task}${context ? ` - Context: ${context}` : ''}`,
      nextAction: 'handoff_to_agent',
      agentId: 'emma-ecommerce'
    };
  }
});

export const delegateToApuTool = tool({
  description: 'Delegate advanced web intelligence, multi-engine search, or comprehensive research tasks to Apu specialist. Use for market research, competitive analysis, web scraping, news analysis, academic research, or real-time information gathering.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return {
      status: 'delegated',
      targetAgent: 'apu-research',
      delegatedTask: task,
      context: context || '',
      priority: priority || 'normal',
      requirements: requirements || '',
      handoffMessage: `Task delegated to Apu (Research & Web Intelligence Specialist): ${task}${context ? ` - Context: ${context}` : ''}`,
      nextAction: 'handoff_to_agent',
      agentId: 'apu-research'
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
