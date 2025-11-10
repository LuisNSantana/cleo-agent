/**
 * @fileoverview Shared type definitions for the agent execution pipeline.
 */

/**
 * Represents the specific action being performed by an agent in a pipeline step.
 * This is used for UI labeling, coloring, and contextual messaging.
 */
export type Action = 'analyzing' | 'thinking' | 'responding' | 'delegating' | 'completing' | 'routing' | 'reviewing' | 'supervising' | 'executing' | 'delegation';

/**
 * Represents a single step in the agent execution pipeline.
 * This is the core data structure for visualizing the agent's workflow.
 */
export type PipelineStep = {
  id: string;
  uniqueId?: string; // UUID for idempotent deduplication
  timestamp: string | Date;
  agent: string;
  agentName?: string;  // Friendly name for custom agents
  action: Action;
  content: string;
  progress?: number;
  metadata?: any;
};

/**
 * Represents a block of reasoning text from an agent.
 * Used by the ReasoningViewer component.
 */
export interface ReasoningBlock {
  type: 'thought' | 'observation' | 'plan' | 'final_answer';
  title: string;
  content: string;
  isInitiallyCollapsed?: boolean;
}
