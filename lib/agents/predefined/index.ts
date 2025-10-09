/**
 * Predefined Agents
 * 
 * Immutable agents that ship with the system.
 * These agents cannot be modified by users and are always available.
 */

export { CLEO_AGENT } from './cleo'
export { WEX_AGENT } from './wex'
export { TOBY_AGENT } from './toby'
export { AMI_AGENT } from './ami'
export { PETER_AGENT } from './peter'
export { EMMA_AGENT } from './emma'
export { APU_AGENT } from './apu'
export { ASTRA_AGENT } from './astra'
export { JUNGI_AGENT } from './jungi'


export { NOTION_AGENT } from './notion-agent'
export { NORA_AGENT } from './nora'

// AMI_CALENDAR_AGENT removed - consolidated into AMI_AGENT

import { CLEO_AGENT } from './cleo'
import { WEX_AGENT } from './wex'
import { TOBY_AGENT } from './toby'
import { AMI_AGENT } from './ami'
import { PETER_AGENT } from './peter'
import { EMMA_AGENT } from './emma'
import { APU_AGENT } from './apu'
import { ASTRA_AGENT } from './astra'
import { JUNGI_AGENT } from './jungi'


import { NOTION_AGENT } from './notion-agent'
import { NORA_AGENT } from './nora'

// import { AMI_CALENDAR_AGENT } from './ami-calendar'  // REMOVED - consolidated

/**
 * All predefined agents in the system
 */
export const ALL_PREDEFINED_AGENTS = [
  CLEO_AGENT,
  WEX_AGENT,
  TOBY_AGENT,
  AMI_AGENT,
  PETER_AGENT,
  EMMA_AGENT,
  APU_AGENT,
  ASTRA_AGENT,
  JUNGI_AGENT,
  NOTION_AGENT,
  NORA_AGENT,
  // AMI_CALENDAR_AGENT  // REMOVED - consolidated into AMI_AGENT
] as const

/**
 * Get predefined agent by ID
 */
export function getPredefinedAgentById(id: string) {
  return ALL_PREDEFINED_AGENTS.find(agent => agent.id === id)
}

/**
 * Get all specialist agents (excluding supervisor)
 */
export function getPredefinedSpecialists() {
  return ALL_PREDEFINED_AGENTS.filter(agent => agent.role === 'specialist')
}

/**
 * Get the supervisor agent
 */
export function getPredefinedSupervisor() {
  return CLEO_AGENT
}
