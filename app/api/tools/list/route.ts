import { NextRequest, NextResponse } from 'next/server'
import tools from '@/lib/tools'

// Lightweight metadata builder for UI agent creation wizard.
// Returns ALL tool registry entries with inferred category and connection requirements.
// Avoid heavy reflection; only expose name, description, category, requiresConnection.

function inferCategory(name: string, description?: string): string {
  // Order matters: first match wins
  if (/^(listCalendarEvents|createCalendarEvent|createRecurringCalendarEvent|inviteAttendeesToEvent|addConferenceDetails|updateCalendarEvent|checkAvailability|setEventReminders|searchCalendarEvents)$/.test(name)) return 'google_calendar'
  if (/^(listDriveFiles|searchDriveFiles|getDriveFileDetails|createDriveFolder|uploadFileToDrive|shareDriveFile|copyMoveDriveFile)$/.test(name)) return 'google_drive'
  if (/^(createGoogleDoc|readGoogleDoc|updateGoogleDoc|formatGoogleDocsText|applyGoogleDocsParagraphStyle|insertGoogleDocsTable|insertGoogleDocsImage|createGoogleDocsList)$/.test(name)) return 'google_docs'
  if (/^(createGoogleSlidesPresentation|addGoogleSlide|insertGoogleSlideTextBox|appendBulletedSlide|readGoogleSlidesPresentation|replaceGoogleSlidesText|insertSlideImage|createSlideShape|createSlideTable|formatSlideText|addSlideSpeakerNotes)$/.test(name)) return 'google_slides'
  if (/^(createGoogleSheet|readGoogleSheet|updateGoogleSheet|appendGoogleSheet|addGoogleSheetTab|createGoogleSheetChart|formatGoogleSheetCells|applyConditionalFormatting|insertGoogleSheetFormulas|addDataValidation|createNamedRange|protectSheetRange|addAutoFilter|createProfessionalTemplate)$/.test(name)) return 'google_sheets'
  if (/^(listGmailMessages|getGmailMessage|sendGmailMessage|trashGmailMessage|modifyGmailLabels|sendHtmlGmail|sendGmailWithAttachments|createGmailDraft)$/.test(name)) return 'gmail'
  if (/notion/i.test(name)) return 'notion'
  if (/twitter|tweet/i.test(name)) return 'twitter'
  if (/instagram/i.test(name)) return 'instagram'
  if (/facebook/i.test(name)) return 'facebook'
  if (/telegram/i.test(name)) return 'telegram'
  if (/shopify/i.test(name)) return 'shopify'
  if (/skyvern/i.test(name)) return 'skyvern'
  if (/serp|perplexity|webSearch|leadResearch|firecrawl/i.test(name)) return 'research'
  if (/financial|alphaVantage|stock|crypto/i.test(name)) return 'finance'
  if (/pdf|extract/i.test(name)) return 'documents'
  if (/memory/i.test(name)) return 'memory'
  if (/delegate_to_/i.test(name)) return 'delegation'
  // Utilities fall through
  if (/weather|time|calculator|randomFact/i.test(name)) return 'utilities'
  return description?.toLowerCase().includes('search') ? 'research' : 'general'
}

function inferConnectionRequirement(name: string, category: string): string | undefined {
  if (category.startsWith('google_') || category === 'gmail') return 'google-workspace'
  if (category === 'notion') return 'notion'
  if (category === 'twitter') return 'twitter'
  // Future: instagram, facebook, telegram separate service IDs when connection model expands
  return undefined
}

export async function GET(_req: NextRequest) {
  try {
    // Known/predefined delegation tool targets (exclude dynamic UUID-based ones)
    const KNOWN_DELEGATION_TARGETS = new Set([
      'toby', 'ami', 'peter', 'emma', 'apu', 'wex', 'astra', 'iris', 'nora',
      'cleo', 'notion_agent', 'jenn', 'khipu'
    ])
    
    // Dynamic snapshot (tools can be extended at runtime via delegation). Enumerate entries.
    const entries: Array<{ name: string; description: string; category: string; requiresConnection?: string }> = []
    for (const [name, def] of Object.entries(tools as Record<string, any>)) {
      // Skip internal credential helpers from listing (add-notion-credentials etc.)
      if (/credentials|test-connection|list-notion-credentials/.test(name)) continue
      
      // Filter delegation tools: only include known/predefined agents, not dynamic UUIDs
      if (name.startsWith('delegate_to_')) {
        const targetName = name.replace('delegate_to_', '').toLowerCase()
        // Skip if it looks like a UUID (contains many numbers/dashes) or not in known list
        if (/[0-9a-f]{8,}|_[0-9a-f]{4,}/i.test(targetName)) continue
        if (!KNOWN_DELEGATION_TARGETS.has(targetName.replace(/_/g, ''))) continue
      }
      
      const description: string = (def && typeof def.description === 'string') ? def.description : 'Tool sin descripción.'
      const category = inferCategory(name, description)
      const requiresConnection = inferConnectionRequirement(name, category)
      entries.push({ name, description, category, requiresConnection })
    }

    // Sort for stable UI (by category then name)
    entries.sort((a, b) => a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category))

    return NextResponse.json({ tools: entries, count: entries.length })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to build tool metadata' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const maxDuration = 10
