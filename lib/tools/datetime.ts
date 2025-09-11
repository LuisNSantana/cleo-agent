/**
 * Date and Time Utilities
 * Simple tools for getting current date/time information
 */

import { tool } from 'ai'
import { z } from 'zod'

export const getCurrentDateTimeTool = tool({
  description: 'Get current date and time information in various formats',
  inputSchema: z.object({
    timezone: z.string().optional().describe('Timezone (e.g., "America/New_York", "UTC"). Defaults to UTC'),
    format: z.enum(['iso', 'readable', 'date-only', 'time-only']).optional().default('iso').describe('Format of the returned date/time')
  }),
  execute: async ({ timezone = 'UTC', format = 'iso' }) => {
    const now = new Date()
    
    // Convert to specified timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
    
    try {
      const formatter = new Intl.DateTimeFormat('en-US', options)
      const parts = formatter.formatToParts(now)
      
      const year = parts.find(p => p.type === 'year')?.value
      const month = parts.find(p => p.type === 'month')?.value
      const day = parts.find(p => p.type === 'day')?.value
      const hour = parts.find(p => p.type === 'hour')?.value
      const minute = parts.find(p => p.type === 'minute')?.value
      const second = parts.find(p => p.type === 'second')?.value
      
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`
      
      switch (format) {
        case 'iso':
          return {
            datetime: now.toISOString(),
            timezone,
            timestamp: now.getTime(),
            readable: now.toLocaleString('en-US', { timeZone: timezone })
          }
        case 'readable':
          return {
            datetime: now.toLocaleString('en-US', { 
              timeZone: timezone,
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short'
            }),
            timezone,
            timestamp: now.getTime()
          }
        case 'date-only':
          return {
            date: now.toLocaleDateString('en-US', { timeZone: timezone }),
            timezone,
            timestamp: now.getTime()
          }
        case 'time-only':
          return {
            time: now.toLocaleTimeString('en-US', { timeZone: timezone }),
            timezone,
            timestamp: now.getTime()
          }
        default:
          return {
            datetime: now.toISOString(),
            timezone,
            timestamp: now.getTime()
          }
      }
    } catch (error) {
      // Fallback to UTC if timezone is invalid
      return {
        datetime: now.toISOString(),
        timezone: 'UTC',
        timestamp: now.getTime(),
        readable: now.toLocaleString('en-US'),
        error: `Invalid timezone: ${timezone}, fallback to UTC`
      }
    }
  }
})

export const getTimezoneInfoTool = tool({
  description: 'Get timezone information and current time for different locations',
  inputSchema: z.object({
    location: z.string().describe('Location or timezone (e.g., "New York", "America/New_York", "London")')
  }),
  execute: async ({ location }) => {
    const now = new Date()
    
    // Common timezone mappings
    const timezoneMap: Record<string, string> = {
      'new york': 'America/New_York',
      'los angeles': 'America/Los_Angeles', 
      'chicago': 'America/Chicago',
      'london': 'Europe/London',
      'paris': 'Europe/Paris',
      'tokyo': 'Asia/Tokyo',
      'sydney': 'Australia/Sydney',
      'mumbai': 'Asia/Kolkata',
      'dubai': 'Asia/Dubai'
    }
    
    const timezone = timezoneMap[location.toLowerCase()] || location
    
    try {
      const localTime = now.toLocaleString('en-US', { 
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'long'
      })
      
      return {
        location,
        timezone,
        currentTime: localTime,
        timestamp: now.getTime(),
        utcOffset: now.toLocaleString('en-US', { 
          timeZone: timezone, 
          timeZoneName: 'short' 
        }).split(' ').pop()
      }
    } catch (error) {
      return {
        location,
        timezone,
        error: `Could not get time for location: ${location}`,
        currentTimeUTC: now.toISOString()
      }
    }
  }
})
