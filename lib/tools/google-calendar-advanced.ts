/**
 * Advanced Google Calendar Tools
 * 
 * Professional calendar management:
 * - Recurring events (daily, weekly, monthly, yearly)
 * - Attendee management and invitations
 * - RSVP tracking
 * - Email reminders and notifications
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId } from '@/lib/server/request-context'

// Token cache
const tokenCache: Record<string, { token: string; expiry: number }> = {}

async function getGoogleCalendarAccessToken(userId: string): Promise<string | null> {
  const cacheKey = `gcal:${userId}`
  const cached = tokenCache[cacheKey]
  if (cached && cached.expiry > Date.now()) return cached.token

  try {
    const supabase = await createClient()
    if (!supabase) return null

    const { data, error } = await (supabase as any)
      .from('user_service_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')
      .eq('connected', true)
      .single()

    if (error || !data) return null

    const now = Date.now()
    const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0
    if (expiresAt > now + 300000 && data.access_token) {
      tokenCache[cacheKey] = { token: data.access_token, expiry: expiresAt }
      return data.access_token
    }

    if (!data.refresh_token) return null

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
      await (supabase as any)
        .from('user_service_connections')
        .update({ connected: false })
        .eq('user_id', userId)
        .eq('service_id', 'google-workspace')
      return null
    }

    const tokenData = await refreshResponse.json()
    const newExpiresAt = new Date(now + tokenData.expires_in * 1000).toISOString()

    await (supabase as any)
      .from('user_service_connections')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: newExpiresAt,
        connected: true
      })
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')

    tokenCache[cacheKey] = { token: tokenData.access_token, expiry: now + tokenData.expires_in * 1000 }
    return tokenData.access_token
  } catch (error) {
    console.error('Error getting Calendar token:', error)
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
    throw new Error(`Calendar API error: ${response.status} ${errorText}`)
  }

  return response.json()
}

// Create recurring event
export const createRecurringCalendarEventTool = tool({
  description: 'Create a recurring calendar event (daily, weekly, monthly, yearly). Essential for regular meetings, standups, reviews. Supports complex recurrence patterns with RRULE format.',
  inputSchema: z.object({
    summary: z.string().describe('Event title/summary'),
    description: z.string().optional().describe('Event description'),
    location: z.string().optional().describe('Event location or video conference link'),
    startDateTime: z.string().describe('Start date-time in ISO format (e.g., "2024-01-15T09:00:00")'),
    endDateTime: z.string().describe('End date-time in ISO format'),
    timeZone: z.string().optional().default('UTC').describe('Timezone (e.g., "America/New_York", "Europe/Madrid")'),
    recurrence: z.object({
      frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).describe('How often the event repeats'),
      interval: z.number().min(1).optional().default(1).describe('Every X days/weeks/months (default: 1)'),
      daysOfWeek: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).optional().describe('Days of week (only for WEEKLY)'),
      until: z.string().optional().describe('End date in format "20241231" or leave empty for no end'),
      count: z.number().optional().describe('Number of occurrences (alternative to until)')
    }).describe('Recurrence configuration'),
    attendees: z.array(z.string().email()).optional().describe('Email addresses of attendees to invite'),
    sendNotifications: z.boolean().optional().default(true).describe('Send email invitations to attendees')
  }),
  execute: async (params) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const token = await getGoogleCalendarAccessToken(userId)
    if (!token) {
      return { success: false, message: 'Calendar not connected' }
    }

    console.log('📅 [Calendar Advanced] Creating recurring event:', { summary: params.summary, frequency: params.recurrence.frequency })

    try {
      // Build RRULE string
      let rrule = `RRULE:FREQ=${params.recurrence.frequency}`
      
      if (params.recurrence.interval && params.recurrence.interval > 1) {
        rrule += `;INTERVAL=${params.recurrence.interval}`
      }
      
      if (params.recurrence.frequency === 'WEEKLY' && params.recurrence.daysOfWeek && params.recurrence.daysOfWeek.length > 0) {
        rrule += `;BYDAY=${params.recurrence.daysOfWeek.join(',')}`
      }
      
      if (params.recurrence.until) {
        rrule += `;UNTIL=${params.recurrence.until}T000000Z`
      } else if (params.recurrence.count) {
        rrule += `;COUNT=${params.recurrence.count}`
      }

      const eventData: any = {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: {
          dateTime: params.startDateTime,
          timeZone: params.timeZone
        },
        end: {
          dateTime: params.endDateTime,
          timeZone: params.timeZone
        },
        recurrence: [rrule]
      }

      // Add attendees if provided
      if (params.attendees && params.attendees.length > 0) {
        eventData.attendees = params.attendees.map(email => ({ email }))
      }

      const result = await makeGoogleCalendarRequest(
        token,
        `calendars/primary/events?sendUpdates=${params.sendNotifications ? 'all' : 'none'}`,
        {
          method: 'POST',
          body: JSON.stringify(eventData)
        }
      )

      await trackToolUsage(userId, 'createRecurringCalendarEvent', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: `Recurring event created: ${params.recurrence.frequency}`,
        event: {
          id: result.id,
          summary: result.summary,
          htmlLink: result.htmlLink,
          recurrence: result.recurrence,
          attendees: result.attendees?.length || 0
        }
      }
    } catch (error) {
      console.error('Error creating recurring event:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create recurring event'
      }
    }
  }
})

// Invite attendees to event
export const inviteAttendeesToEventTool = tool({
  description: 'Add attendees to a calendar event and send invitations. Track RSVPs and manage meeting participants. Essential for team coordination.',
  inputSchema: z.object({
    eventId: z.string().describe('Calendar event ID'),
    attendees: z.array(z.object({
      email: z.string().email().describe('Attendee email address'),
      optional: z.boolean().optional().default(false).describe('Whether attendance is optional'),
      displayName: z.string().optional().describe('Display name (optional)')
    })).describe('List of attendees to invite'),
    sendNotifications: z.boolean().optional().default(true).describe('Send email invitations'),
    message: z.string().optional().describe('Custom message to include in invitation')
  }),
  execute: async ({ eventId, attendees, sendNotifications, message }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const token = await getGoogleCalendarAccessToken(userId)
    if (!token) {
      return { success: false, message: 'Calendar not connected' }
    }

    console.log('📅 [Calendar Advanced] Inviting attendees:', { eventId, count: attendees.length })

    try {
      // Get current event
      const event = await makeGoogleCalendarRequest(token, `calendars/primary/events/${eventId}`)

      // Merge new attendees with existing ones
      const existingAttendees = event.attendees || []
      const newAttendees = attendees.map(att => ({
        email: att.email,
        optional: att.optional,
        ...(att.displayName && { displayName: att.displayName })
      }))

      const allAttendees = [...existingAttendees, ...newAttendees]

      // Update event
      const updateData: any = {
        ...event,
        attendees: allAttendees
      }

      if (message) {
        updateData.description = (event.description || '') + `\n\n${message}`
      }

      const result = await makeGoogleCalendarRequest(
        token,
        `calendars/primary/events/${eventId}?sendUpdates=${sendNotifications ? 'all' : 'none'}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData)
        }
      )

      await trackToolUsage(userId, 'inviteAttendeesToEvent', { ok: true, execMs: Date.now() - started })

      // Count responses
      const responses = {
        accepted: result.attendees?.filter((a: any) => a.responseStatus === 'accepted').length || 0,
        declined: result.attendees?.filter((a: any) => a.responseStatus === 'declined').length || 0,
        tentative: result.attendees?.filter((a: any) => a.responseStatus === 'tentative').length || 0,
        needsAction: result.attendees?.filter((a: any) => a.responseStatus === 'needsAction').length || 0
      }

      return {
        success: true,
        message: `Invited ${attendees.length} attendee(s)`,
        event: {
          id: result.id,
          summary: result.summary,
          htmlLink: result.htmlLink,
          totalAttendees: result.attendees?.length || 0,
          responses
        }
      }
    } catch (error) {
      console.error('Error inviting attendees:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to invite attendees'
      }
    }
  }
})
