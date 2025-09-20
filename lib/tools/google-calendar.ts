import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { DateTime } from 'luxon'  // Nueva dep: yarn add luxon (para mejor handling de dates/timezones)
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentModel, getCurrentUserId } from '@/lib/server/request-context'

// Cache simple para tokens (in-memory, exp 5min)
const tokenCache: Record<string, { token: string; expiry: number }> = {}

// Mejora: Función refresh token optimizada con cache y retry
async function getGoogleCalendarAccessToken(userId: string): Promise<string | null> {
  console.log('🔍 Fetching Google Calendar token for user:', userId)
  
  const cacheKey = `gcal:${userId}`
  const cached = tokenCache[cacheKey]
  if (cached && cached.expiry > Date.now()) {
    console.log('🔍 Token cache hit')
    return cached.token
  }

  try {
    const supabase = await createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('user_service_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')
      .eq('connected', true)
      .single()

    if (error || !data) {
      console.error('No connection:', error)
      return null
    }

    const now = Date.now()
    const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0
    if (expiresAt > now + 300000 && data.access_token) {  // 5min buffer
      tokenCache[cacheKey] = { token: data.access_token, expiry: expiresAt }
      return data.access_token
    }

    if (!data.refresh_token) return null

    // Refresh con retry (max 2)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: data.refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        if (!refreshResponse.ok) {
          const errText = await refreshResponse.text()
          console.error(`Refresh failed (attempt ${attempt}):`, errText)
          if (attempt === 2) {
            await supabase.from('user_service_connections').update({ connected: false }).eq('user_id', userId).eq('service_id', 'google-workspace')
            return null
          }
          await new Promise(r => setTimeout(r, 1000))  // 1s backoff
          continue
        }

        const tokenData = await refreshResponse.json()
        const newExpiresAt = new Date(now + tokenData.expires_in * 1000).toISOString()

        await supabase.from('user_service_connections').update({
          access_token: tokenData.access_token,
          token_expires_at: newExpiresAt,
          connected: true
        }).eq('user_id', userId).eq('service_id', 'google-workspace')

        tokenCache[cacheKey] = { token: tokenData.access_token, expiry: now + tokenData.expires_in * 1000 }
        console.log('Token refreshed')
        return tokenData.access_token
      } catch (e) {
        console.error('Refresh error:', e)
        if (attempt === 2) return null
      }
    }
    return null
  } catch (e) {
    console.error('Token fetch error:', e)
    return null
  }
}

async function makeGoogleCalendarRequest(accessToken: string, endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

// 📅 List upcoming calendar events - Mejorado: Soporte timezones, recurring expand, human-readable dates, filter by keyword
export const listCalendarEventsTool = tool({
  description: '📅 List upcoming events from Google Calendar. Use when user asks about schedule, events, meetings. Defaults to next 7 days from August 17, 2025. Supports timezone (default Europe/Madrid for Huminary Labs). Returns human-readable dates and filters.',
  inputSchema: z.object({
    maxResults: z.number().min(1).max(100).optional().default(50).describe('Max events (1-100).'),
    timeMin: z.string().optional().describe('Start ISO 8601 (e.g., "2025-08-17T00:00:00Z"). Defaults current.'),
    timeMax: z.string().optional().describe('End ISO 8601. Defaults 7 days ahead.'),
    timeZone: z.string().optional().default('Europe/Madrid').describe('Timezone for formatting (e.g., "America/New_York").'),
    calendarId: z.string().optional().default('primary').describe('Calendar ID.'),
    filterKeyword: z.string().optional().describe('Filter events containing keyword in summary/description.'),
    singleEvents: z.boolean().optional().default(true).describe('Expand recurring events.')
  }),
  execute: async ({ maxResults = 50, timeMin, timeMax, timeZone = 'Europe/Madrid', calendarId = 'primary', filterKeyword, singleEvents = true }) => {
    const userId = getCurrentUserId()
    const model = getCurrentModel() || ''
    
    // Force 'primary' calendar to avoid permission issues
    const safeCalendarId = 'primary'
    
    console.log('[GCal List] Execution:', { 
      userId, 
      model, 
      params: { maxResults, timeMin, timeMax, timeZone, calendarId: safeCalendarId } 
    })
    
    try {
      const started = Date.now()
      if (!userId) return { success: false, message: 'Auth required', events: [], total: 0 }

      const accessToken = await getGoogleCalendarAccessToken(userId)
      if (!accessToken) return { success: false, message: 'Connect Google Calendar in Settings', events: [], total: 0 }

      const now = DateTime.now().setZone(timeZone)
      const defaultMin = timeMin || now.toISO()
      const defaultMax = timeMax || now.plus({ days: 7 }).toISO()

      // Auto-correct past years (for model issues)
      let finalMin: string | null = defaultMin
      let finalMax: string | null = defaultMax
      if (model.includes('llama') || model.includes('gpt-5')) {  // Expand to GPT-5 if needed
        finalMin = correctYear(defaultMin, now.year)
        finalMax = correctYear(defaultMax, now.year)
      }

      const params = new URLSearchParams({
        maxResults: maxResults.toString(),
        orderBy: 'startTime',
        singleEvents: singleEvents.toString(),
        timeZone
      })

      // Only add timeMin/timeMax when present to avoid passing null to URLSearchParams
      if (finalMin) params.append('timeMin', finalMin)
      if (finalMax) params.append('timeMax', finalMax)

      console.log(`[GCal] Using calendar: ${safeCalendarId}, params:`, Object.fromEntries(params))

      const data = await makeGoogleCalendarRequest(accessToken, `calendars/${safeCalendarId}/events?${params}`)

      type CalendarEvent = {
        id: string
        summary: string
        description: string
        start: string
        end: string
        location: string
        attendees: string
        status: string
        htmlLink?: string
      }

      let events: CalendarEvent[] = data.items?.map((event: any): CalendarEvent => ({
        id: event.id,
        summary: event.summary || 'No title',
        description: event.description || '',
        start: formatDate(event.start.dateTime || event.start.date, timeZone),
        end: formatDate(event.end.dateTime || event.end.date, timeZone),
        location: event.location || '',
        attendees: event.attendees?.map((a: any) => a.email).join(', ') || '',
        status: event.status,
        htmlLink: event.htmlLink,
      })) || []

      // Filter by keyword if provided
      if (filterKeyword) {
        const lowerKeyword = filterKeyword.toLowerCase()
        events = events.filter((e: CalendarEvent) => 
          e.summary.toLowerCase().includes(lowerKeyword) || 
          e.description.toLowerCase().includes(lowerKeyword)
        )
      }

      const result = {
        success: true,
        message: `Found ${events.length} events in ${timeZone}`,
        events,
        total_count: events.length,
        timeRange: `${formatDate(finalMin, timeZone)} to ${formatDate(finalMax, timeZone)}`
      }
      if (userId) {
        await trackToolUsage(userId, 'googleCalendar.listEvents', { ok: true, execMs: Date.now() - started, params: { maxResults, timeZone, singleEvents } })
      }
      return result
    } catch (error) {
      console.error('[GCal List Error]:', error)
      const msg = error instanceof Error ? error.message : String(error)
  const userId = getCurrentUserId()
      if (userId) await trackToolUsage(userId, 'googleCalendar.listEvents', { ok: false, execMs: 0, errorType: 'list_error' })
      return { success: false, message: `Failed: ${msg}`, events: [], total_count: 0 }
    }
  },
})

// Helper: Format ISO to human-readable
function formatDate(iso: string | null | undefined, tz: string) {
  if (!iso) return ''
  const dt = DateTime.fromISO(iso, { zone: tz })
  return dt.isValid ? dt.toFormat('yyyy-MM-dd HH:mm') : ''
}

// Helper: Correct year if past
function correctYear(iso: string | null | undefined, currentYear: number): string | null {
  if (!iso) return null
  const dt = DateTime.fromISO(iso)
  if (!dt.isValid) return null
  return dt.year < currentYear ? dt.set({ year: currentYear }).toISO() : dt.toISO()
}

// 📅 Create a new calendar event - Mejorado: Reminders, auto-Meet, validation, timezone handling
export const createCalendarEventTool = tool({
  description: '📅 Create event in Google Calendar. Use for scheduling. Supports timezones (default Europe/Madrid), reminders, auto Google Meet if "meeting". Validates dates/emails.',
  inputSchema: z.object({
    summary: z.string().min(1).describe('Title (required).'),
    description: z.string().optional().describe('Details.'),
    startDateTime: z.string().describe('Start ISO 8601 (e.g., "2025-08-17T14:00:00").'),
    endDateTime: z.string().describe('End ISO 8601.'),
    timeZone: z.string().optional().default('Europe/Madrid').describe('Timezone (Huminary default).'),
    location: z.string().optional().describe('Location or link.'),
    attendees: z.array(z.string().email()).optional().describe('Emails to invite.'),
    calendarId: z.string().optional().default('primary').describe('Calendar ID.'),
    reminders: z.array(z.object({ method: z.enum(['email', 'popup']), minutes: z.number().min(0) })).optional().describe('Reminders (e.g., [{method: "email", minutes: 30}]).'),
    addConference: z.boolean().optional().default(false).describe('Auto-add Google Meet if true or if "meeting" in summary.')
  }),
  execute: async ({ summary, description, startDateTime, endDateTime, timeZone = 'Europe/Madrid', location, attendees, calendarId = 'primary', reminders, addConference = false }) => {
    const { blockForConfirmation } = await import('../confirmation/simple-blocking')
    
    return blockForConfirmation(
      'createCalendarEvent',
      { summary, description, startDateTime, endDateTime, timeZone, location, attendees, calendarId, reminders, addConference },
      async () => {
        const userId = getCurrentUserId()
        
        try {
          const started = Date.now()
          if (!userId) return { success: false, message: 'Auth required' }

          const accessToken = await getGoogleCalendarAccessToken(userId)
          if (!accessToken) return { success: false, message: 'Connect Google Calendar' }

      // Validate dates with Luxon
      const start = DateTime.fromISO(startDateTime, { zone: timeZone })
      const end = DateTime.fromISO(endDateTime, { zone: timeZone })
      if (!start.isValid || !end.isValid || start >= end) {
        return { success: false, message: 'Invalid dates/timezone. Start must be before end.' }
      }

      // Auto-conference if keyword or flag
      const needsConference = addConference || /meeting|reunión|call|conference/i.test(summary)

      const eventData: any = {
        summary,
        description,
        start: { dateTime: start.toISO(), timeZone },
        end: { dateTime: end.toISO(), timeZone },
        location,
        attendees: attendees?.map(email => ({ email })),
        reminders: reminders ? { useDefault: false, overrides: reminders } : { useDefault: true }
      }

      if (needsConference) {
        eventData.conferenceData = { createRequest: { conferenceSolutionKey: { type: 'hangoutsMeet' }, requestId: `random-${Date.now()}` } }
      }

      const data = await makeGoogleCalendarRequest(
        accessToken,
        `calendars/${calendarId}/events${needsConference ? '?conferenceDataVersion=1' : ''}`,
        {
          method: 'POST',
          body: JSON.stringify(eventData),
        }
      )

      const result = {
        success: true,
        message: `Created "${summary}"`,
        event: {
          id: data.id,
          summary: data.summary,
          description: data.description || '',
          start: formatDate(data.start.dateTime || data.start.date, timeZone),
          end: formatDate(data.end.dateTime || data.end.date, timeZone),
          location: data.location || '',
          attendees: data.attendees?.map((a: any) => a.email).join(', ') || '',
          status: data.status,
          htmlLink: data.htmlLink,
          hangoutLink: data.hangoutsLink || data.conferenceData?.entryPoints?.[0]?.uri
        }
      }
        if (userId) {
          await trackToolUsage(userId, 'googleCalendar.createEvent', { ok: true, execMs: Date.now() - started, params: { timeZone, attendees: attendees?.length ?? 0 } })
        }
        return result
      } catch (error) {
        console.error('[GCal Create Error]:', error)
        const message = error instanceof Error ? error.message : String(error)
        const userId = getCurrentUserId()
        if (userId) await trackToolUsage(userId, 'googleCalendar.createEvent', { ok: false, execMs: 0, errorType: 'create_error' })
        return { success: false, message: `Failed: ${message}` }
      }
    }
  )
},
})

// Export
export const googleCalendarTools = {
  listEvents: listCalendarEventsTool,
  createEvent: createCalendarEventTool
}