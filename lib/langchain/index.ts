/**
 * Multi-Model Orchestration for Cleo Agent
 * 
 * This module provides a centralized orchestration system for multiple AI models,
 * optimizing both quality and cost by routing tasks to the most appropriate model:
 * 
 * - GPT-OSS-120B (Groq): Fast, cost-effective for general text tasks and function calling
 * - GPT-4o-mini (OpenAI): High-quality multimodal analysis for documents and images
 * 
 * Architecture:
 * - Router: Analyzes input and determines the best model
 * - Agents: Specialized agents for each model/task type
 * - Pipeline: Orchestrates the flow between models
 */

// Export main components
export { ModelRouter } from './router'
export { GroqAgent, OpenAIAgent, AgentFactory, BaseAgent } from './agents'
export { MultiModelPipeline, processWithMultiModel, processBatchWithMultiModel } from './pipeline'
export type { TaskInput, TaskOutput, ModelConfig, RoutingDecision, TaskType } from './types'
