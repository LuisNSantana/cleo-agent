/**
 * Advanced Instagram Tools
 * 
 * Complete Instagram API integration for community managers:
 * - Publish posts (images, videos, carousels, reels, stories)
 * - Get insights and analytics
 * - Manage comments and replies
 * - Get account information
 * 
 * Based on Instagram Graph API documentation
 */

import { tool } from 'ai'
import { z } from 'zod'
import { getInstagramCredentials } from '@/lib/instagram/credentials'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId } from '@/lib/server/request-context'

const INSTAGRAM_API_HOST = 'https://graph.instagram.com'
const INSTAGRAM_API_VERSION = 'v21.0'

// Helper: Make authenticated API request
async function instagramAPIRequest(
  endpoint: string,
  options: RequestInit = {},
  credentials?: { accessToken: string }
): Promise<any> {
  const creds = credentials || await getInstagramCredentials()
  const url = new URL(`${INSTAGRAM_API_HOST}/${INSTAGRAM_API_VERSION}${endpoint}`)
  
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
    throw new Error(`Instagram API error: ${error}`)
  }

  return response.json()
}

/**
 * Publish a post to Instagram
 * Supports images, videos, and reels
 */
export const instagramPublishPostTool = tool({
  description: `Publish a post to Instagram (image, video, or reel).
  
  IMPORTANT: This is a 2-step process:
  1. Create a container with the media URL
  2. Publish the container
  
  The media must be hosted on a publicly accessible URL.
  Rate limit: 100 posts per 24 hours.`,
  
  inputSchema: z.object({
    imageUrl: z.string().url().optional().describe('URL of image to post (JPEG only)'),
    videoUrl: z.string().url().optional().describe('URL of video to post (MP4, MOV)'),
    caption: z.string().max(2200).optional().describe('Caption for the post'),
    mediaType: z.enum(['IMAGE', 'VIDEO', 'REELS']).default('IMAGE').describe('Type of media'),
    isReel: z.boolean().default(false).describe('Publish as a reel (appears in Reels tab)'),
    locationId: z.string().optional().describe('Instagram location ID'),
    userTags: z.array(z.object({
      username: z.string(),
      x: z.number().min(0).max(1).optional(),
      y: z.number().min(0).max(1).optional()
    })).optional().describe('Tag users in the post'),
  }),
  
  execute: async ({ imageUrl, videoUrl, caption, mediaType, isReel, locationId, userTags }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getInstagramCredentials()
      
      if (!creds.instagramUserId) {
        throw new Error('Instagram User ID not found in credentials')
      }

      // Step 1: Create media container
      const containerPayload: any = {
        caption: caption || '',
      }

      // Determine media type
      if (isReel || mediaType === 'REELS') {
        if (!videoUrl) throw new Error('Video URL required for reels')
        containerPayload.media_type = 'REELS'
        containerPayload.video_url = videoUrl
      } else if (videoUrl) {
        containerPayload.media_type = 'VIDEO'
        containerPayload.video_url = videoUrl
      } else if (imageUrl) {
        containerPayload.image_url = imageUrl
      } else {
        throw new Error('Either imageUrl or videoUrl must be provided')
      }

      // Add optional parameters
      if (locationId) containerPayload.location_id = locationId
      if (userTags) containerPayload.user_tags = userTags

      console.log('📸 [Instagram] Creating media container...', containerPayload)

      const containerResponse = await instagramAPIRequest(
        `/${creds.instagramUserId}/media`,
        {
          method: 'POST',
          body: JSON.stringify(containerPayload),
        },
        creds
      )

      const containerId = containerResponse.id
      console.log(`📸 [Instagram] Container created: ${containerId}`)

      // Wait a moment for media processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 2: Publish the container
      console.log('📸 [Instagram] Publishing container...')
      
      const publishResponse = await instagramAPIRequest(
        `/${creds.instagramUserId}/media_publish`,
        {
          method: 'POST',
          body: JSON.stringify({ creation_id: containerId }),
        },
        creds
      )

      const mediaId = publishResponse.id
      console.log(`📸 [Instagram] Post published successfully: ${mediaId}`)

      // Track usage
      if (userId) {
        await trackToolUsage('instagramPublishPost', userId)
      }

      return {
        success: true,
        mediaId,
        containerId,
        message: `Post published successfully to Instagram ${isReel ? '(Reel)' : ''}`,
        permalink: `https://www.instagram.com/p/${mediaId}/`
      }
    } catch (error) {
      console.error('📸 [Instagram] Error publishing post:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish Instagram post'
      }
    }
  }
})

/**
 * Publish a carousel post (multiple images/videos)
 */
export const instagramPublishCarouselTool = tool({
  description: `Publish a carousel post to Instagram (2-10 images and/or videos).
  
  Creates individual containers for each item, then publishes them as a carousel.
  Each media item must be hosted on a publicly accessible URL.`,
  
  inputSchema: z.object({
    items: z.array(z.object({
      imageUrl: z.string().url().optional(),
      videoUrl: z.string().url().optional(),
    })).min(2).max(10).describe('Array of media items (2-10 items)'),
    caption: z.string().max(2200).optional().describe('Caption for the carousel'),
    locationId: z.string().optional().describe('Instagram location ID'),
  }),
  
  execute: async ({ items, caption, locationId }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getInstagramCredentials()
      
      if (!creds.instagramUserId) {
        throw new Error('Instagram User ID not found in credentials')
      }

      console.log(`📸 [Instagram] Creating carousel with ${items.length} items...`)

      // Step 1: Create containers for each item
      const containerIds: string[] = []
      
      for (const item of items) {
        const itemPayload: any = {
          is_carousel_item: true
        }

        if (item.videoUrl) {
          itemPayload.media_type = 'VIDEO'
          itemPayload.video_url = item.videoUrl
        } else if (item.imageUrl) {
          itemPayload.image_url = item.imageUrl
        } else {
          throw new Error('Each item must have either imageUrl or videoUrl')
        }

        const containerResponse = await instagramAPIRequest(
          `/${creds.instagramUserId}/media`,
          {
            method: 'POST',
            body: JSON.stringify(itemPayload),
          },
          creds
        )

        containerIds.push(containerResponse.id)
        console.log(`📸 [Instagram] Item container created: ${containerResponse.id}`)
      }

      // Step 2: Create carousel container
      const carouselPayload: any = {
        media_type: 'CAROUSEL',
        children: containerIds.join(','),
        caption: caption || '',
      }

      if (locationId) carouselPayload.location_id = locationId

      const carouselContainer = await instagramAPIRequest(
        `/${creds.instagramUserId}/media`,
        {
          method: 'POST',
          body: JSON.stringify(carouselPayload),
        },
        creds
      )

      console.log(`📸 [Instagram] Carousel container created: ${carouselContainer.id}`)

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Step 3: Publish carousel
      const publishResponse = await instagramAPIRequest(
        `/${creds.instagramUserId}/media_publish`,
        {
          method: 'POST',
          body: JSON.stringify({ creation_id: carouselContainer.id }),
        },
        creds
      )

      const mediaId = publishResponse.id
      console.log(`📸 [Instagram] Carousel published successfully: ${mediaId}`)

      // Track usage
      if (userId) {
        await trackToolUsage('instagramPublishCarousel', userId)
      }

      return {
        success: true,
        mediaId,
        carouselContainerId: carouselContainer.id,
        itemContainerIds: containerIds,
        message: `Carousel with ${items.length} items published successfully`,
        permalink: `https://www.instagram.com/p/${mediaId}/`
      }
    } catch (error) {
      console.error('📸 [Instagram] Error publishing carousel:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish Instagram carousel'
      }
    }
  }
})

/**
 * Get insights for an Instagram account
 */
export const instagramGetAccountInsightsTool = tool({
  description: `Get analytics and insights for an Instagram business/creator account.
  
  Returns metrics like impressions, reach, profile views, follower count, etc.
  Metrics are available for the last 90 days.`,
  
  inputSchema: z.object({
    metrics: z.array(z.enum([
      'impressions',
      'reach',
      'profile_views',
      'follower_count',
      'email_contacts',
      'phone_call_clicks',
      'text_message_clicks',
      'get_directions_clicks',
      'website_clicks'
    ])).nonempty().describe('Metrics to retrieve (defaults: impressions, reach, profile_views)'),
    period: z.enum(['day', 'week', 'days_28']).describe('Time period (defaults: day)'),
    since: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    until: z.string().optional().describe('End date (YYYY-MM-DD)'),
  }),
  
  execute: async ({ metrics, period, since, until }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getInstagramCredentials()
      
      if (!creds.instagramUserId) {
        throw new Error('Instagram User ID not found in credentials')
      }

      console.log(`📊 [Instagram] Getting insights for metrics: ${metrics.join(', ')}`)

      const params = new URLSearchParams()
      params.set('metric', metrics.join(','))
      params.set('period', period)

      if (since) params.set('since', since)
      if (until) params.set('until', until)

      const response = await instagramAPIRequest(
        `/${creds.instagramUserId}/insights?${params.toString()}`,
        { method: 'GET' },
        creds
      )

      console.log('📊 [Instagram] Insights retrieved successfully')

      // Track usage
      if (userId) {
        await trackToolUsage('instagramGetAccountInsights', userId)
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
      console.error('📊 [Instagram] Error getting insights:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get Instagram insights'
      }
    }
  }
})

/**
 * Get insights for a specific Instagram media post
 */
export const instagramGetMediaInsightsTool = tool({
  description: `Get analytics for a specific Instagram post.
  
  Returns metrics like engagement, impressions, reach, saves, comments, likes, etc.`,
  
  inputSchema: z.object({
    mediaId: z.string().describe('Instagram media ID'),
    metrics: z.array(z.enum([
      'engagement',
      'impressions',
      'reach',
      'saved',
      'video_views',
      'likes',
      'comments',
      'shares',
      'total_interactions'
    ])).nonempty().describe('Metrics to retrieve (defaults: engagement, impressions, reach)'),
  }),
  
  execute: async ({ mediaId, metrics }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getInstagramCredentials()

      console.log(`📊 [Instagram] Getting media insights for ${mediaId}`)

      const params = new URLSearchParams()
      params.set('metric', metrics.join(','))

      const response = await instagramAPIRequest(
        `/${mediaId}/insights?${params.toString()}`,
        { method: 'GET' },
        creds
      )

      console.log('📊 [Instagram] Media insights retrieved successfully')

      // Track usage
      if (userId) {
        await trackToolUsage('instagramGetMediaInsights', userId)
      }

      const formattedData = response.data.map((metric: any) => ({
        name: metric.name,
        title: metric.title,
        value: metric.values[0]?.value || 0
      }))

      return {
        success: true,
        mediaId,
        data: formattedData,
        summary: formattedData.map((m: any) => `${m.title}: ${m.value}`).join(', ')
      }
    } catch (error) {
      console.error('📊 [Instagram] Error getting media insights:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get media insights'
      }
    }
  }
})

/**
 * Get recent media from Instagram account
 */
export const instagramGetRecentMediaTool = tool({
  description: `Get recent media posts from Instagram account.
  
  Returns list of recent posts with their IDs, captions, media types, and timestamps.`,
  
  inputSchema: z.object({
    limit: z.number().min(1).max(100).describe('Number of posts to retrieve (default: 25)'),
    fields: z.array(z.string()).nonempty().describe('Fields to retrieve for each post (defaults: id, caption, media_type, media_url, permalink, timestamp, like_count, comments_count)'),
  }),
  
  execute: async ({ limit, fields }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getInstagramCredentials()
      
      if (!creds.instagramUserId) {
        throw new Error('Instagram User ID not found in credentials')
      }

      console.log(`📸 [Instagram] Getting ${limit} recent media posts`)

      const params = new URLSearchParams()
      params.set('fields', fields.join(','))
      params.set('limit', limit.toString())

      const response = await instagramAPIRequest(
        `/${creds.instagramUserId}/media?${params.toString()}`,
        { method: 'GET' },
        creds
      )

      console.log(`📸 [Instagram] Retrieved ${response.data?.length || 0} posts`)

      // Track usage
      if (userId) {
        await trackToolUsage('instagramGetRecentMedia', userId)
      }

      return {
        success: true,
        data: response.data || [],
        count: response.data?.length || 0,
        paging: response.paging
      }
    } catch (error) {
      console.error('📸 [Instagram] Error getting recent media:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recent media'
      }
    }
  }
})

/**
 * Get account information
 */
export const instagramGetAccountInfoTool = tool({
  description: `Get information about the Instagram business/creator account.
  
  Returns username, name, biography, profile picture, followers count, follows count, media count.`,
  
  inputSchema: z.object({
    fields: z.array(z.string()).nonempty().describe('Fields to retrieve (defaults: id, username, name, biography, profile_picture_url, followers_count, follows_count, media_count, website)'),
  }),
  
  execute: async ({ fields }) => {
    const userId = getCurrentUserId()
    
    try {
      const creds = await getInstagramCredentials()
      
      if (!creds.instagramUserId) {
        throw new Error('Instagram User ID not found in credentials')
      }

      console.log('📸 [Instagram] Getting account information')

      const params = new URLSearchParams()
      params.set('fields', fields.join(','))

      const response = await instagramAPIRequest(
        `/${creds.instagramUserId}?${params.toString()}`,
        { method: 'GET' },
        creds
      )

      console.log(`📸 [Instagram] Account info retrieved for @${response.username}`)

      // Track usage
      if (userId) {
        await trackToolUsage('instagramGetAccountInfo', userId)
      }

      return {
        success: true,
        data: response
      }
    } catch (error) {
      console.error('📸 [Instagram] Error getting account info:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get account information'
      }
    }
  }
})

// Export all Instagram tools
export const instagramTools = [
  instagramPublishPostTool,
  instagramPublishCarouselTool,
  instagramGetAccountInsightsTool,
  instagramGetMediaInsightsTool,
  instagramGetRecentMediaTool,
  instagramGetAccountInfoTool,
]
