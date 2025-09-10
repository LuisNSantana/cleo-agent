/**
 * Predefined Agent Configurations
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

import { CLEO_AGENT } from './cleo'
import { WEX_AGENT } from './wex'
import { TOBY_AGENT } from './toby'
import { AMI_AGENT } from './ami'
import { PETER_AGENT } from './peter'
import { EMMA_AGENT } from './emma'
import { APU_AGENT } from './apu'

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
  APU_AGENT
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
