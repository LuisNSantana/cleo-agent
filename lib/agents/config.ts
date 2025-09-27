/**
 * LEGACY Static Agent Configuration
 *
 * ⚠️ Migration note: These exports are kept for backward compatibility while
 * the system migrates to database-driven agents. Prefer predefined agents.
 */

import { AgentConfig, AgentRole, LangGraphConfig, HandoffTool } from './types'

// Re-export predefined agents as the single source of truth
export { CLEO_AGENT } from './predefined/cleo'
export { WEX_AGENT } from './predefined/wex'
export { TOBY_AGENT } from './predefined/toby'
export { AMI_AGENT } from './predefined/ami'
export { PETER_AGENT } from './predefined/peter'
export { EMMA_AGENT } from './predefined/emma'
export { APU_AGENT } from './predefined/apu'
export { NORA_AGENT } from './predefined/nora'
export { LUNA_AGENT } from './predefined/luna'
export { ZARA_AGENT } from './predefined/zara'
export { VIKTOR_AGENT } from './predefined/viktor'

// Local imports for constructing collections/graphs
import { CLEO_AGENT } from './predefined/cleo'
import { WEX_AGENT } from './predefined/wex'
import { TOBY_AGENT } from './predefined/toby'
import { AMI_AGENT } from './predefined/ami'
import { PETER_AGENT } from './predefined/peter'
import { EMMA_AGENT } from './predefined/emma'
import { APU_AGENT } from './predefined/apu'
import { NORA_AGENT } from './predefined/nora'
import { LUNA_AGENT } from './predefined/luna'
import { ZARA_AGENT } from './predefined/zara'
import { VIKTOR_AGENT } from './predefined/viktor'

// =============================================================================
// DELEGATION & HANDOFF TOOLS
// =============================================================================

export const HANDOFF_TOOLS: HandoffTool[] = [
  {
    name: 'delegate_to_toby',
    description: 'Delegate software, programming, API, debugging, architecture, or IoT tasks to Toby',
    fromAgent: 'cleo-supervisor',
    toAgent: 'toby-technical',
    condition: 'software OR programming OR technical OR api OR debugging OR iot'
  },
  {
    name: 'delegate_to_ami',
    description: 'Delegate executive, organization, or creative tasks to Ami',
    fromAgent: 'cleo-supervisor',
    toAgent: 'ami-creative',
    condition: 'assistant OR organization OR creative OR design OR workspace'
  },
  {
    name: 'delegate_to_peter',
    description: 'Delegate Google Workspace document creation to Peter',
    fromAgent: 'cleo-supervisor',
    toAgent: 'peter-google',
    condition: 'google_workspace OR documents OR spreadsheets OR drive OR calendar'
  },
  {
    name: 'delegate_to_emma',
    description: 'Delegate e-commerce or Shopify management tasks to Emma',
    fromAgent: 'cleo-supervisor',
    toAgent: 'emma-ecommerce',
    condition: 'ecommerce OR shopify OR store'
  },
  {
    name: 'delegate_to_apu',
    description: 'Delegate customer support, technical troubleshooting, documentation and service workflow tasks to Apu',
    fromAgent: 'cleo-supervisor',
    toAgent: 'apu-support',
    condition: 'support OR customer OR troubleshoot OR documentation OR service OR help OR issue OR problem OR ticket'
  }
]

// =============================================================================
// MULTI-AGENT SYSTEM CONFIGURATION
// =============================================================================

export const AGENT_SYSTEM_CONFIG: LangGraphConfig = {
  supervisorAgent: CLEO_AGENT,
  specialistAgents: [TOBY_AGENT, AMI_AGENT, PETER_AGENT, EMMA_AGENT, APU_AGENT],
  handoffTools: HANDOFF_TOOLS,
  stateGraph: {
    nodes: [
      { id: 'cleo-supervisor', name: 'Cleo Supervisor', type: 'agent', config: { agent: CLEO_AGENT } },
      { id: 'toby-technical', name: 'Toby Technical', type: 'agent', config: { agent: TOBY_AGENT } },
      { id: 'ami-creative', name: 'Ami Creative', type: 'agent', config: { agent: AMI_AGENT } },
      { id: 'peter-google', name: 'Peter Google', type: 'agent', config: { agent: PETER_AGENT } },
      { id: 'emma-ecommerce', name: 'Emma E-commerce', type: 'agent', config: { agent: EMMA_AGENT } },
      { id: 'apu-support', name: 'Apu Support', type: 'agent', config: { agent: APU_AGENT } },
    ],
    edges: [
      { from: 'cleo-supervisor', to: 'toby-technical', condition: 'technical', label: 'Technical Task' },
      { from: 'cleo-supervisor', to: 'ami-creative', condition: 'creative', label: 'Creative Task' },
      { from: 'cleo-supervisor', to: 'peter-google', condition: 'google_workspace', label: 'Google Workspace Task' },
      { from: 'cleo-supervisor', to: 'emma-ecommerce', condition: 'ecommerce', label: 'E-commerce Task' },
      { from: 'cleo-supervisor', to: 'apu-support', condition: 'support', label: 'Support Task' },
      { from: 'toby-technical', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' },
      { from: 'ami-creative', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' },
      { from: 'peter-google', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' },
      { from: 'emma-ecommerce', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' },
      { from: 'apu-support', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' },
    ],
    startNode: 'cleo-supervisor',
    endNodes: []
  }
}

// =============================================================================
// HELPER FUNCTIONS (legacy compatibility)
// =============================================================================

export function getAllAgents(): AgentConfig[] {
  return [
    CLEO_AGENT,
    WEX_AGENT,
    TOBY_AGENT,
    AMI_AGENT,
    PETER_AGENT,
    EMMA_AGENT,
    APU_AGENT,
    NORA_AGENT,
    LUNA_AGENT,
    ZARA_AGENT,
    VIKTOR_AGENT,
  ]
}

export const ALL_AGENTS = getAllAgents()

export function getAgentById(id: string): AgentConfig | undefined {
  return getAllAgents().find(agent => agent.id === id)
}

export function getAgentsByRole(role: AgentRole): AgentConfig[] {
  return getAllAgents().filter(agent => agent.role === role)
}

export function getSupervisorAgent(): AgentConfig {
  return CLEO_AGENT
}

export function getSpecialistAgents(): AgentConfig[] {
  return [TOBY_AGENT, AMI_AGENT, PETER_AGENT, EMMA_AGENT, APU_AGENT]
}

export function getAgentsByTag(tag: string): AgentConfig[] {
  return getAllAgents().filter(agent =>
    agent.tags?.some(agentTag => agentTag.toLowerCase().includes(tag.toLowerCase()))
  )
}

export function getAllAvailableTools(): string[] {
  const tools = new Set<string>()
  getAllAgents().forEach(agent => {
    agent.tools.forEach(tool => tools.add(tool))
  })
  return Array.from(tools).sort()
}
