/**
 * Integrations Index
 * 
 * Exports all integration prompt sections for modular composition
 */

import { getNotionPromptSection } from './notion'
import { getTwitterPromptSection } from './twitter'
import { getGmailPromptSection } from './gmail'
import { getCalendarPromptSection } from './calendar'

// Individual exports
export { getNotionPromptSection } from './notion'
export { getTwitterPromptSection } from './twitter'
export { getGmailPromptSection } from './gmail'
export { getCalendarPromptSection } from './calendar'

/**
 * Get all integration prompts combined
 */
export function getAllIntegrationPrompts(): string {
  return [
    getNotionPromptSection(),
    getTwitterPromptSection(),
    getGmailPromptSection(),
    getCalendarPromptSection(),
  ].join('\n')
}

/**
 * Get specific integration prompts by name
 */
export function getIntegrationPrompts(integrations: ('notion' | 'twitter' | 'gmail' | 'calendar')[]): string {
  const prompts: string[] = []
  
  for (const integration of integrations) {
    switch (integration) {
      case 'notion':
        prompts.push(getNotionPromptSection())
        break
      case 'twitter':
        prompts.push(getTwitterPromptSection())
        break
      case 'gmail':
        prompts.push(getGmailPromptSection())
        break
      case 'calendar':
        prompts.push(getCalendarPromptSection())
        break
    }
  }
  
  return prompts.join('\n')
}
