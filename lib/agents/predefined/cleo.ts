/**
 * Ankie - Advanced Emotional Intelligence Supervisor & Coordinator
 * Primary agent with sophisticated emotional awareness and multi-agent orchestration.
 * Now with dynamic agent discovery and delegation capabilities.
 * 
 * NOTE: For dynamic configuration with agent discovery, use getCleoDynamicConfig()
 * from './cleo-dynamic' (server-side only)
 */

import { AgentConfig } from '../types'
import { getCleoPrompt, sanitizeModelName } from '@/lib/prompts'

// Base tools that Cleo always has access to
const BASE_TOOLS = [
  'webSearch', // General web search
  'getCurrentDateTime', // Time/timezone
  'weatherInfo', // Weather data
  'randomFact', // Fun facts
  'extract_text_from_pdf', // ✅ PDF extraction for direct document analysis
]

// Legacy delegation tools for backward compatibility
// These will be supplemented by dynamically discovered agents
const LEGACY_DELEGATION_TOOLS = [
  'delegate_to_toby', // Technical tasks
  'delegate_to_ami', // Executive assistant/Notion/email triage
  'delegate_to_astra', // Email writing/sending
  'delegate_to_peter', // Google Workspace (no email)
  'delegate_to_emma', // E-commerce/Shopify
  'delegate_to_apu', // Financial/market research
  'delegate_to_iris', // CRITICAL: Document/PDF analysis specialist (multimodal)
  'delegate_to_wex', // Market intelligence & competitive analysis
  'delegate_to_nora', // Medical information & triage (non-diagnostic)
  'delegate_to_jenn', // Social media/Twitter
]

export const CLEO_AGENT: AgentConfig = {
  id: 'cleo-supervisor', // Keep canonical ID for compatibility across orchestrator & persistence layers (legacy ID)
  name: 'Ankie',
  description: 'Plataforma supervisora de inteligencia emocional y coordinación multi‑agente. Ankie orquesta agentes especializados con empatía profunda, precisión y foco en el impacto real en la vida del usuario.',
  role: 'supervisor',
  model: 'grok-4-fast-reasoning',
  temperature: 0.5,
  maxTokens: 131072, // Grok-4 supports 131k output tokens
  // Tools will be dynamically updated at runtime
  tools: [...BASE_TOOLS, ...LEGACY_DELEGATION_TOOLS],
  tags: ['supervisor', 'empathy', 'coordination', 'emotional-intelligence', 'delegation', 'dynamic'],
  // Prompt will be dynamically enhanced with discovered agents
  prompt: getCleoPrompt(sanitizeModelName('grok-4-fast-reasoning'), 'default'),
  color: '#FF6B6B',
  icon: '❤️',
  immutable: true,
  predefined: true,
  // Flag to indicate this agent should use dynamic discovery
  useDynamicDiscovery: true,
}