/**
 * Advanced Facebook Tools
 * 
 * Complete Facebook Pages API integration for community managers:
 * - Publish posts (text, links, photos)
 * - Schedule posts
 * - Get page insights and analytics
 * - Manage page information
 * 
 * Based on Facebook Graph API documentation
 */

import { tool } from 'ai'
import { z } from 'zod'
import { getFacebookCredentials } from '@/lib/facebook/credentials'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId } from '@/lib/server/request-context'

const FACEBOOK_API_HOST = 'https://graph.facebook.com'
const FACEBOOK_API_VERSION = 'v21.0'

// Helper: Make authenticated API request
async function facebookAPIRequest(
  endpoint: string,
  options: RequestInit = {},
  credentials?: { accessToken: string }
): Promise<any> {
  const creds = credentials || await getFacebookCredentials()
  const url = new URL(`${FACEBOOK_API_HOST}/${FACEBOOK_API_VERSION}${endpoint}`)
  
  // Add access token as query parameter
  url.searchParams.set('access_token', creds.accessToken)
  
  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Facebook API error: ${error}`)
  }

  return response.json()
}

/**
 * Publish a text post or link to a Facebook Page
 */
export const facebookPublishPostTool = tool({
  description: `Publish a post to a Facebook Page.
  
  Can publish text-only posts or posts with links.
  For photos, use the facebookPublishPhoto tool instead.`,
  
  inputSchema: z.object({
    message: z.string().describe('The message/caption for the post'),
    link: z.string().url().optional().describe('Optional URL to share'),
    pageId: z.string().optional().describe('Facebook Page ID (uses connected page if not provided)'),
  }),
  
  execute: async ({ message, link, pageId }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getFacebookCredentials()
      const targetPageId = pageId || creds.pageId

      if (!targetPageId) {
        throw new Error('No Facebook Page ID available. Please provide a pageId or connect a page.')
      }

      console.log(`📘 [Facebook] Publishing post to page ${targetPageId}`)

      const postData: any = {
        message,
      }

      if (link) {
        postData.link = link
      }

      const response = await facebookAPIRequest(
        `/${targetPageId}/feed`,
        {
          method: 'POST',
          body: JSON.stringify(postData),
        },
        creds
      )

      const postId = response.id
      console.log(`📘 [Facebook] Post published successfully: ${postId}`)

      // Track usage
      if (userId) {
        await trackToolUsage('facebookPublishPost', userId)
      }

      return {
        success: true,
        postId,
        message: 'Post published successfully to Facebook Page',
        permalink: `https://www.facebook.com/${postId}`
      }
    } catch (error) {
      console.error('📘 [Facebook] Error publishing post:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish Facebook post'
      }
    }
  }
})

/**
 * Publish a photo to a Facebook Page
 */
export const facebookPublishPhotoTool = tool({
  description: `Publish a photo to a Facebook Page.
  
  The photo must be hosted on a publicly accessible URL.
  You can include a caption/message with the photo.`,
  
  inputSchema: z.object({
    photoUrl: z.string().url().describe('URL of the photo to publish'),
    message: z.string().optional().describe('Caption/message for the photo'),
    pageId: z.string().optional().describe('Facebook Page ID (uses connected page if not provided)'),
  }),
  
  execute: async ({ photoUrl, message, pageId }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getFacebookCredentials()
      const targetPageId = pageId || creds.pageId

      if (!targetPageId) {
        throw new Error('No Facebook Page ID available. Please provide a pageId or connect a page.')
      }

      console.log(`📘 [Facebook] Publishing photo to page ${targetPageId}`)

      const photoData: any = {
        url: photoUrl,
      }

      if (message) {
        photoData.message = message
      }

      const response = await facebookAPIRequest(
        `/${targetPageId}/photos`,
        {
          method: 'POST',
          body: JSON.stringify(photoData),
        },
        creds
      )

      const photoId = response.id
      const postId = response.post_id
      console.log(`📘 [Facebook] Photo published successfully: ${photoId}`)

      // Track usage
      if (userId) {
        await trackToolUsage('facebookPublishPhoto', userId)
      }

      return {
        success: true,
        photoId,
        postId,
        message: 'Photo published successfully to Facebook Page',
        permalink: postId ? `https://www.facebook.com/${postId}` : undefined
      }
    } catch (error) {
      console.error('📘 [Facebook] Error publishing photo:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish Facebook photo'
      }
    }
  }
})

/**
 * Schedule a post for later publishing
 */
export const facebookSchedulePostTool = tool({
  description: `Schedule a post to be published later on a Facebook Page.
  
  The post will be created as unpublished and scheduled for the specified time.
  Scheduled time must be between 10 minutes and 75 days in the future.`,
  
  inputSchema: z.object({
    message: z.string().describe('The message/caption for the scheduled post'),
    scheduledTime: z.string().describe('ISO 8601 datetime string (e.g., 2024-12-25T10:00:00Z) or UNIX timestamp'),
    link: z.string().url().optional().describe('Optional URL to share'),
    pageId: z.string().optional().describe('Facebook Page ID (uses connected page if not provided)'),
  }),
  
  execute: async ({ message, scheduledTime, link, pageId }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getFacebookCredentials()
      const targetPageId = pageId || creds.pageId

      if (!targetPageId) {
        throw new Error('No Facebook Page ID available. Please provide a pageId or connect a page.')
      }

      // Convert ISO string to UNIX timestamp if needed
      let unixTimestamp: number
      if (scheduledTime.includes('T') || scheduledTime.includes('-')) {
        unixTimestamp = Math.floor(new Date(scheduledTime).getTime() / 1000)
      } else {
        unixTimestamp = parseInt(scheduledTime, 10)
      }

      // Validate timestamp is in the future
      const now = Math.floor(Date.now() / 1000)
      const minTime = now + 600 // 10 minutes from now
      const maxTime = now + (75 * 24 * 60 * 60) // 75 days from now

      if (unixTimestamp < minTime) {
        throw new Error('Scheduled time must be at least 10 minutes in the future')
      }

      if (unixTimestamp > maxTime) {
        throw new Error('Scheduled time cannot be more than 75 days in the future')
      }

      console.log(`📘 [Facebook] Scheduling post for ${new Date(unixTimestamp * 1000).toISOString()}`)

      const postData: any = {
        message,
        published: false,
        scheduled_publish_time: unixTimestamp,
      }

      if (link) {
        postData.link = link
      }

      const response = await facebookAPIRequest(
        `/${targetPageId}/feed`,
        {
          method: 'POST',
          body: JSON.stringify(postData),
        },
        creds
      )

      const postId = response.id
      console.log(`📘 [Facebook] Post scheduled successfully: ${postId}`)

      // Track usage
      if (userId) {
        await trackToolUsage('facebookSchedulePost', userId)
      }

      return {
        success: true,
        postId,
        scheduledTime: new Date(unixTimestamp * 1000).toISOString(),
        message: `Post scheduled successfully for ${new Date(unixTimestamp * 1000).toLocaleString()}`
      }
    } catch (error) {
      console.error('📘 [Facebook] Error scheduling post:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule Facebook post'
      }
    }
  }
})

/**
 * Get insights for a Facebook Page
 */
export const facebookGetPageInsightsTool = tool({
  description: `Get analytics and insights for a Facebook Page.
  
  Returns metrics like impressions, reach, engagement, follower count, etc.
  Data is available for the last 93 days.`,
  
  inputSchema: z.object({
    metrics: z.array(z.enum([
      'page_impressions',
      'page_impressions_unique',
      'page_engaged_users',
      'page_post_engagements',
      'page_fans',
      'page_fan_adds',
      'page_fan_removes',
      'page_views_total',
      'page_views_unique',
      'page_posts_impressions',
      'page_posts_impressions_unique',
      'page_video_views'
    ])).nonempty().describe('Metrics to retrieve (defaults: page_impressions, page_engaged_users, page_fans)'),
    period: z.enum(['day', 'week', 'days_28']).describe('Time period (defaults: day)'),
    since: z.string().optional().describe('Start date (YYYY-MM-DD or UNIX timestamp)'),
    until: z.string().optional().describe('End date (YYYY-MM-DD or UNIX timestamp)'),
    pageId: z.string().optional().describe('Facebook Page ID (uses connected page if not provided)'),
  }),
  
  execute: async ({ metrics, period, since, until, pageId }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getFacebookCredentials()
      const targetPageId = pageId || creds.pageId

      if (!targetPageId) {
        throw new Error('No Facebook Page ID available. Please provide a pageId or connect a page.')
      }

      console.log(`📊 [Facebook] Getting insights for page ${targetPageId}`)

      const params = new URLSearchParams()
      params.set('metric', metrics.join(','))
      params.set('period', period)

      if (since) params.set('since', since)
      if (until) params.set('until', until)

      const response = await facebookAPIRequest(
        `/${targetPageId}/insights?${params.toString()}`,
        { method: 'GET' },
        creds
      )

      console.log('📊 [Facebook] Insights retrieved successfully')

      // Track usage
      if (userId) {
        await trackToolUsage('facebookGetPageInsights', userId)
      }

      // Format response for better readability
      const formattedData = response.data.map((metric: any) => ({
        name: metric.name,
        title: metric.title,
        description: metric.description,
        period: metric.period,
        values: metric.values
      }))

      return {
        success: true,
        data: formattedData,
        summary: formattedData.map((m: any) => {
          const latestValue = m.values[m.values.length - 1]
          return `${m.title}: ${latestValue?.value || 0}`
        }).join(', ')
      }
    } catch (error) {
      console.error('📊 [Facebook] Error getting insights:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get Facebook Page insights'
      }
    }
  }
})

/**
 * Get recent posts from a Facebook Page
 */
export const facebookGetRecentPostsTool = tool({
  description: `Get recent posts from a Facebook Page.
  
  Returns list of recent posts with their IDs, messages, timestamps, and engagement metrics.`,
  
  inputSchema: z.object({
    limit: z.number().min(1).max(100).describe('Number of posts to retrieve (default: 25)'),
    fields: z.array(z.string()).nonempty().describe('Fields to retrieve for each post (defaults: id, message, created_time, permalink_url, shares, likes.summary(true), comments.summary(true))'),
    pageId: z.string().optional().describe('Facebook Page ID (uses connected page if not provided)'),
  }),
  
  execute: async ({ limit, fields, pageId }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getFacebookCredentials()
      const targetPageId = pageId || creds.pageId

      if (!targetPageId) {
        throw new Error('No Facebook Page ID available. Please provide a pageId or connect a page.')
      }

      console.log(`📘 [Facebook] Getting ${limit} recent posts from page ${targetPageId}`)

      const params = new URLSearchParams()
      params.set('fields', fields.join(','))
      params.set('limit', limit.toString())

      const response = await facebookAPIRequest(
        `/${targetPageId}/posts?${params.toString()}`,
        { method: 'GET' },
        creds
      )

      console.log(`📘 [Facebook] Retrieved ${response.data?.length || 0} posts`)

      // Track usage
      if (userId) {
        await trackToolUsage('facebookGetRecentPosts', userId)
      }

      return {
        success: true,
        data: response.data || [],
        count: response.data?.length || 0,
        paging: response.paging
      }
    } catch (error) {
      console.error('📘 [Facebook] Error getting recent posts:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recent posts'
      }
    }
  }
})

/**
 * Get Facebook Page information
 */
export const facebookGetPageInfoTool = tool({
  description: `Get information about a Facebook Page.
  
  Returns page name, category, followers count, website, description, and other details.`,
  
  inputSchema: z.object({
    fields: z.array(z.string()).nonempty().describe('Fields to retrieve (defaults: id, name, category, fan_count, followers_count, about, website, picture)'),
    pageId: z.string().optional().describe('Facebook Page ID (uses connected page if not provided)'),
  }),
  
  execute: async ({ fields, pageId }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getFacebookCredentials()
      const targetPageId = pageId || creds.pageId

      if (!targetPageId) {
        throw new Error('No Facebook Page ID available. Please provide a pageId or connect a page.')
      }

      console.log(`📘 [Facebook] Getting page information for ${targetPageId}`)

      const params = new URLSearchParams()
      params.set('fields', fields.join(','))

      const response = await facebookAPIRequest(
        `/${targetPageId}?${params.toString()}`,
        { method: 'GET' },
        creds
      )

      console.log(`📘 [Facebook] Page info retrieved for ${response.name}`)

      // Track usage
      if (userId) {
        await trackToolUsage('facebookGetPageInfo', userId)
      }

      return {
        success: true,
        data: response
      }
    } catch (error) {
      console.error('📘 [Facebook] Error getting page info:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get page information'
      }
    }
  }
})

// Export all Facebook tools
export const facebookTools = {
  facebookPublishPost: facebookPublishPostTool,
  facebookPublishPhoto: facebookPublishPhotoTool,
  facebookSchedulePost: facebookSchedulePostTool,
  facebookGetPageInsights: facebookGetPageInsightsTool,
  facebookGetRecentPosts: facebookGetRecentPostsTool,
  facebookGetPageInfo: facebookGetPageInfoTool,
}
