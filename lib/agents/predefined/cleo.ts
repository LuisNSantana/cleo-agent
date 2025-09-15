/**
 * Cleo - Advanced Emotional Intelligence Supervisor & Coordinator
 * Primary agent with sophisticated emotional awareness and multi-agent orchestration.
 * Optimized for clarity, anti-hallucination, and TypeScript compatibility.
 */

import { AgentConfig } from '../types'; // Asegúrate de que AgentConfig.tools sea string[] o importa funciones específicas
import { getCleoPrompt, sanitizeModelName } from '@/lib/prompts'

export const CLEO_AGENT: AgentConfig = {
  id: 'cleo-supervisor',
  name: 'Cleo',
  description: 'Advanced emotional intelligence supervisor with multi-agent coordination and empathetic user interaction capabilities.',
  role: 'supervisor',
  model: 'openrouter:openai/gpt-4.1-mini',
  temperature: 0.7,
  maxTokens: 16384,
  tools: [
    'delegate_to_toby', // Technical tasks
    'delegate_to_ami', // Executive assistant/Notion/email triage
    'delegate_to_astra', // Email writing/sending
    'delegate_to_peter', // Google Workspace (no email)
    'delegate_to_emma', // E-commerce/Shopify
    'delegate_to_apu', // Financial/market research
    'delegate_to_wex', // Web automation
    'delegate_to_nora', // Social media/Twitter
    'webSearch', // General web search
    'getCurrentDateTime', // Time/timezone
    'weatherInfo', // Weather data
    'randomFact', // Fun facts
  ],
  tags: ['supervisor', 'empathy', 'coordination', 'emotional-intelligence', 'delegation'],
  // Single source of truth: prompt built from lib/prompts
  prompt: getCleoPrompt(sanitizeModelName('openrouter:openai/gpt-4.1-mini'), 'default'),
  color: '#FF6B6B',
  icon: '❤️',
  immutable: true,
  predefined: true,
};