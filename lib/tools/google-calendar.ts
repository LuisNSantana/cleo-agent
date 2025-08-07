import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

async function getGoogleCalendarAccessToken(userId: string): Promise<string | null> {
  console.log('🔍 Getting Google Calendar access token for user:', userId)
  
  try {
    const supabase = await createClient()
    if (!supabase) {
      console.error('❌ Failed to create Supabase client')
      return null
    }

    const { data, error } = await (supabase as any)
      .from('user_service_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .eq('service_id', 'google-calendar')
      .eq('connected', true)
      .single()

    console.log('🔍 Database query result:', {
      hasData: !!data,
      error: error,
      hasAccessToken: data?.access_token ? 'yes' : 'no',
      hasRefreshToken: data?.refresh_token ? 'yes' : 'no',
      tokenExpiresAt: data?.token_expires_at
    })

    if (error || !data) {
      console.error('No Google Calendar connection found:', error)
      return null
    }

    // Check if token is expired or missing expiry, and refresh if necessary
    const now = new Date()
    const expiresAt = data.token_expires_at ? new Date(data.token_expires_at) : null
    const shouldRefresh = (!expiresAt || now >= expiresAt) && data.refresh_token

    if (shouldRefresh) {
      console.log('Token expired or missing expiry, attempting refresh...')
      try {
        // Refresh the token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: data.refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text()
          console.error('Failed to refresh Google token:', errorText)
          // Marcar como desconectado si el refresh falla
          await (supabase as any)
            .from('user_service_connections')
            .update({ connected: false })
            .eq('user_id', userId)
            .eq('service_id', 'google-calendar')
          return null
        }

        const tokenData = await refreshResponse.json()
        const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

        // Update the token in the database
        const { error: updateError } = await (supabase as any)
          .from('user_service_connections')
          .update({
            access_token: tokenData.access_token,
            token_expires_at: newExpiresAt.toISOString(),
            connected: true
          })
          .eq('user_id', userId)
          .eq('service_id', 'google-calendar')

        if (updateError) {
          console.error('Failed to update refreshed token:', updateError)
          return null
        }

        console.log('Token refreshed successfully')
        return tokenData.access_token
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError)
        // Marcar como desconectado si el refresh falla
        await (supabase as any)
          .from('user_service_connections')
          .update({ connected: false })
          .eq('user_id', userId)
          .eq('service_id', 'google-calendar')
        return null
      }
    }

    return data.access_token
  } catch (error) {
    console.error('Error getting Google Calendar access token:', error)
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
    throw new Error(`Google Calendar API error: ${response.status} ${errorText}`)
  }

  return response.json()
}

// 📅 List upcoming calendar events
export const listCalendarEventsTool = tool({
  description: '📅 List upcoming events from Google Calendar. Shows events for the next 7 days by default. Use this when user asks about their schedule, upcoming meetings, or calendar events.',
  inputSchema: z.object({
    maxResults: z.number().min(1).max(50).optional().default(10).describe('Maximum number of events to return (1-50)'),
    timeMin: z.string().optional().describe('Lower bound for events to return (ISO 8601 format, e.g. "2024-08-07T00:00:00Z"). Defaults to now.'),
    timeMax: z.string().optional().describe('Upper bound for events to return (ISO 8601 format, e.g. "2024-08-14T23:59:59Z"). Defaults to 7 days from now.'),
    calendarId: z.string().optional().default('primary').describe('Calendar ID to fetch events from. Use "primary" for the main calendar.'),
  }),
  execute: async ({ maxResults = 10, timeMin, timeMax, calendarId = 'primary' }) => {
    // Get userId from global context (injected by chat handler)
    const userId = (globalThis as any).__currentUserId
    
    try {
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required to access Google Calendar',
          events: [],
          total_count: 0
        }
      }

      const accessToken = await getGoogleCalendarAccessToken(userId)
      if (!accessToken) {
        return {
          success: false,
          message: 'Google Calendar not connected. Please connect your Google Calendar in Settings > Connections.',
          events: [],
          total_count: 0
        }
      }

      // Set default time range if not provided
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const params = new URLSearchParams({
        maxResults: maxResults.toString(),
        orderBy: 'startTime',
        singleEvents: 'true',
        timeMin: timeMin || now.toISOString(),
        timeMax: timeMax || weekFromNow.toISOString(),
      })

      const data = await makeGoogleCalendarRequest(accessToken, `calendars/${calendarId}/events?${params}`)

      const events = data.items?.map((event: any) => ({
        id: event.id,
        summary: event.summary || 'No title',
        description: event.description || '',
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        location: event.location || '',
        attendees: event.attendees?.map((attendee: any) => attendee.email).join(', ') || '',
        status: event.status,
        htmlLink: event.htmlLink,
      })) || []

      return {
        success: true,
        message: `Found ${events.length} upcoming events`,
        events,
        total_count: events.length
      }
    } catch (error) {
      console.error('Error listing calendar events:', error)
      return {
        success: false,
        message: `Failed to fetch calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`,
        events: [],
        total_count: 0
      }
    }
  },
})

// 📅 Create a new calendar event
export const createCalendarEventTool = tool({
  description: '📅 Create a new event in Google Calendar. Use this when user wants to schedule meetings, appointments, or reminders. Supports time zones, attendees, and locations.',
  inputSchema: z.object({
    summary: z.string().min(1).describe('Event title/summary (required) - be descriptive'),
    description: z.string().optional().describe('Event description or additional details'),
    startDateTime: z.string().describe('Event start time in ISO 8601 format (e.g., "2024-08-07T14:00:00" for 2:00 PM)'),
    endDateTime: z.string().describe('Event end time in ISO 8601 format (e.g., "2024-08-07T15:00:00" for 3:00 PM)'),
    timeZone: z.string().optional().default('UTC').describe('Time zone for the event (e.g., "America/New_York", "Europe/Madrid") - use user\'s timezone if known'),
    location: z.string().optional().describe('Event location, meeting room, or virtual meeting link'),
    attendees: z.array(z.string().email()).optional().describe('List of attendee email addresses to invite'),
    calendarId: z.string().optional().default('primary').describe('Calendar ID to create event in. Use "primary" for the main calendar.'),
  }),
  execute: async ({ summary, description, startDateTime, endDateTime, timeZone = 'UTC', location, attendees, calendarId = 'primary' }) => {
    // Get userId from global context (injected by chat handler)
    const userId = (globalThis as any).__currentUserId
    
    try {
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required to create calendar events',
          error: 'User not authenticated'
        }
      }

      const accessToken = await getGoogleCalendarAccessToken(userId)
      if (!accessToken) {
        return {
          success: false,
          message: 'Google Calendar not connected. Please connect your Google Calendar in Settings > Connections.',
          error: 'No Google Calendar connection'
        }
      }

      // Validate date formats
      const startDate = new Date(startDateTime)
      const endDate = new Date(endDateTime)
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          success: false,
          message: 'Invalid date format. Please use ISO 8601 format (e.g., "2024-01-15T10:00:00")',
          error: 'Invalid date format'
        }
      }

      if (startDate >= endDate) {
        return {
          success: false,
          message: 'Start time must be before end time',
          error: 'Invalid time range'
        }
      }

      const eventData = {
        summary,
        description,
        start: {
          dateTime: startDateTime,
          timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone,
        },
        location,
        attendees: attendees?.map(email => ({ email })),
      }

      const data = await makeGoogleCalendarRequest(
        accessToken,
        `calendars/${calendarId}/events`,
        {
          method: 'POST',
          body: JSON.stringify(eventData),
        }
      )

      return {
        success: true,
        message: `Successfully created event "${summary}"`,
        event: {
          id: data.id,
          summary: data.summary || 'No title',
          description: data.description || '',
          start: data.start.dateTime || data.start.date,
          end: data.end.dateTime || data.end.date,
          location: data.location || '',
          attendees: data.attendees?.map((attendee: any) => attendee.email).join(', ') || '',
          status: data.status,
          htmlLink: data.htmlLink,
        }
      }
    } catch (error) {
      console.error('Error creating calendar event:', error)
      return {
        success: false,
        message: `Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },
})

// Export all Google Calendar tools
export const googleCalendarTools = {
  listEvents: listCalendarEventsTool,
  createEvent: createCalendarEventTool
}
