import { logSelectionRanking } from '@/lib/diagnostics/tool-selection-logger'
import { resolveNotionKey } from '@/lib/notion/credentials'

type HeuristicInput = {
  agentId: string
  userId?: string
  messages: any[]
  selectedTools: string[]
  executionId?: string
}

const NOTION_KEYWORDS = [
  'notion', 'página', 'page', 'database', 'base de datos', 'bloque', 'block', 'workspace', 'tabla', 'property', 'propiedad'
]

const ALWAYS_ALLOW = new Set<string>([
  'complete_task', 'memoryAddNote'
])

// Candidate Notion credential tool names available in the global registry
const NOTION_CREDENTIAL_TOOL_NAMES = [
  'test-notion-connection',
  'list-notion-credentials',
  'add-notion-credentials'
]

function containsNotionIntent(messages: any[]): boolean {
  const text = messages
    .map(m => (typeof m?.content === 'string' ? m.content : ''))
    .join(' \n ')
    .toLowerCase()
  return NOTION_KEYWORDS.some(k => text.includes(k))
}

function isDelegationTool(name: string): boolean {
  return name.startsWith('delegate_to_')
}

function isNotionTool(name: string): boolean {
  return name.startsWith('notion_') || name.includes('notion')
}

function isDriveFinder(name: string): boolean {
  return name === 'listDriveFiles' || name === 'searchDriveFiles'
}

export async function applyToolHeuristics(input: HeuristicInput): Promise<string[]> {
  const { agentId, userId, messages, selectedTools, executionId } = input

  const candidates = selectedTools.map(name => ({ name, baseScore: 1, boosts: {} as Record<string, number> }))

  const notionIntent = containsNotionIntent(messages)
  let notionKeyPresent = false
  try {
    if (userId) notionKeyPresent = !!(await resolveNotionKey(userId))
  } catch {}

  let final: string[] = selectedTools.slice()

  if (notionIntent) {
    // Boost Notion tools; optionally prune off-topic tools
    const boosted = candidates.map(c => {
      if (isNotionTool(c.name)) {
        c.boosts.notion_keyword = (c.boosts.notion_keyword || 0) + 3
        if (notionKeyPresent) c.boosts.notion_credentials = (c.boosts.notion_credentials || 0) + 2
      }
      if (isDriveFinder(c.name)) {
        c.boosts.drive_penalty = -3
      }
      return c
    })

    // If we have credentials, strongly prefer only Notion + delegation + always allow
  if (notionKeyPresent) {
      final = selectedTools.filter(n => isNotionTool(n) || isDelegationTool(n) || ALWAYS_ALLOW.has(n))
      // Keep Google Drive detail tool in case we need to open a file id explicitly mentioned
      if (!final.includes('getDriveFileDetails') && selectedTools.includes('getDriveFileDetails')) {
        final.push('getDriveFileDetails')
      }
    } else {
      // No credentials: allow Notion credential tools and safe fallbacks, but avoid Drive finders to reduce drift
    // Use the same Notion detection used above to include hyphenated names like 'get-notion-page'
    final = selectedTools.filter(n => isNotionTool(n) || isDelegationTool(n) || ALWAYS_ALLOW.has(n))
      // Explicitly add Notion credential helpers so the agent can validate/setup access
      for (const credTool of NOTION_CREDENTIAL_TOOL_NAMES) {
        final.push(credTool)
      }
      // Let webSearch remain as last resort if it was part of the agent toolset
      if (selectedTools.includes('webSearch')) final.push('webSearch')
    }

    // Ensure uniqueness and preserve original order as much as possible
    const order = new Map(selectedTools.map((n, i) => [n, i]))
    final = Array.from(new Set(final)).sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999))

    // Prepare masked userId to avoid PII leakage
    const maskedUserId = userId && userId.length > 8
      ? `${userId.slice(0, 4)}...${userId.slice(-4)}`
      : userId

    // Figure out any forced credential tools we injected
    const forcedCredentialTools = NOTION_CREDENTIAL_TOOL_NAMES.filter(t => final.includes(t))

    logSelectionRanking({
      event: 'ranking',
      agentId,
      userId: maskedUserId,
      executionId,
      intent: notionIntent ? 'notion_intent' : 'generic',
      hasNotionKey: notionKeyPresent,
      notionIntent,
      selectedTools,
      forcedCredentialTools,
      decision_reason: notionIntent
        ? (notionKeyPresent ? 'prioritize_notion_tools_with_credentials' : 'notion_intent_without_credentials_enabling_credential_helpers')
        : 'no_special_intent',
      candidates: boosted.map(b => ({ name: b.name, baseScore: b.baseScore, boosts: b.boosts })),
      chosen: final.join(', '),
      credentialSummary: { notion: notionKeyPresent }
    })
  }

  return final
}
