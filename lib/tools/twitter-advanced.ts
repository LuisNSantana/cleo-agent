/**
 * Advanced Twitter/X Tools
 * 
 * Enhanced social media capabilities:
 * - Tweet with media (images, videos, GIFs)
 * - Create threads (multi-tweet storytelling)
 * - Media upload management
 * - Thread composition
 */

import { tool } from 'ai'
import { z } from 'zod'
import { getActiveTwitterCredentials, getSystemTwitterCredentials } from '@/lib/twitter/credentials'
import { requestConfirmation } from '@/lib/confirmation/unified'
import { getCurrentUserId } from '@/lib/server/request-context'
import { trackToolUsage } from '@/lib/analytics'

async function getTwitterCredentials() {
  try {
    const userId = getCurrentUserId?.()
    
    if (userId) {
      const result = await getActiveTwitterCredentials(userId)
      if (result.success && result.data) {
        return result.data
      }
    }
    
    return getSystemTwitterCredentials()
  } catch (error) {
    console.warn('Failed to get user Twitter credentials, using system fallback:', error)
    return getSystemTwitterCredentials()
  }
}

async function makeTwitterRequest(endpoint: string, options: RequestInit = {}) {
  const credentials = await getTwitterCredentials()
  
  if (!credentials.bearer_token && !credentials.access_token) {
    throw new Error('No Twitter API credentials available')
  }
  
  const token = credentials.bearer_token || credentials.access_token
  
  const response = await fetch(`https://api.twitter.com/2${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Twitter API error: ${errorData.detail || response.statusText}`)
  }
  
  return response.json()
}

async function uploadMedia(mediaUrl: string, altText?: string): Promise<string> {
  const credentials = await getTwitterCredentials()
  const token = credentials.bearer_token || credentials.access_token

  // Download media
  const mediaResponse = await fetch(mediaUrl)
  if (!mediaResponse.ok) {
    throw new Error('Failed to download media from URL')
  }

  const mediaBuffer = await mediaResponse.arrayBuffer()
  const mediaBase64 = Buffer.from(mediaBuffer).toString('base64')

  // Upload to Twitter (v1.1 endpoint for media upload)
  const uploadResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      media_data: mediaBase64
    })
  })

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload media to Twitter')
  }

  const uploadResult = await uploadResponse.json()
  const mediaId = uploadResult.media_id_string

  // Add alt text if provided
  if (altText) {
    await fetch('https://upload.twitter.com/1.1/media/metadata/create.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        media_id: mediaId,
        alt_text: { text: altText }
      })
    })
  }

  return mediaId
}

// Post tweet with media
export const postTweetWithMediaTool = tool({
  description: 'Post a tweet with images, videos, or GIFs. Tweets with media get 150% more engagement. Supports up to 4 images or 1 video. Perfect for visual content, product launches, event photos.',
  inputSchema: z.object({
    text: z.string().min(1).max(280).describe('Tweet text (max 280 characters)'),
    media: z.array(z.object({
      url: z.string().url().describe('URL of the image/video to upload'),
      altText: z.string().optional().describe('Alt text for accessibility (recommended)')
    })).min(1).max(4).describe('Media items to attach (1-4 images or 1 video)'),
    replyToId: z.string().optional().describe('ID of tweet to reply to')
  }),
  execute: async (params) => {
    const started = Date.now()
    const userId = getCurrentUserId()

    return requestConfirmation(
      'postTweetWithMedia',
      params,
      async () => {
        console.log('🐦 [Twitter Advanced] Posting tweet with media:', {
          mediaCount: params.media.length,
          textLength: params.text.length
        })

        try {
          // Upload all media first
          const mediaIds: string[] = []
          
          for (const mediaItem of params.media) {
            try {
              const mediaId = await uploadMedia(mediaItem.url, mediaItem.altText)
              mediaIds.push(mediaId)
            } catch (error) {
              console.error('Failed to upload media:', error)
              return {
                success: false,
                message: `Failed to upload media from ${mediaItem.url}: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            }
          }

          // Create tweet with media
          const tweetData: any = {
            text: params.text,
            media: {
              media_ids: mediaIds
            }
          }

          if (params.replyToId) {
            tweetData.reply = {
              in_reply_to_tweet_id: params.replyToId
            }
          }

          const result = await makeTwitterRequest('/tweets', {
            method: 'POST',
            body: JSON.stringify(tweetData)
          })

          if (userId) {
            await trackToolUsage(userId, 'postTweetWithMedia', { ok: true, execMs: Date.now() - started })
          }

          return {
            success: true,
            message: `Tweet posted with ${mediaIds.length} media item(s)`,
            tweet: {
              id: result.data.id,
              text: result.data.text,
              url: `https://twitter.com/i/web/status/${result.data.id}`,
              mediaCount: mediaIds.length
            }
          }
        } catch (error) {
          console.error('Error posting tweet with media:', error)
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to post tweet'
          }
        }
      }
    )
  }
})

// Create Twitter thread
export const createTwitterThreadTool = tool({
  description: 'Create a Twitter thread (series of connected tweets). Perfect for storytelling, tutorials, announcements, thought leadership. Automatically threads tweets in sequence.',
  inputSchema: z.object({
    tweets: z.array(z.object({
      text: z.string().min(1).max(280).describe('Tweet text (max 280 characters)'),
      mediaUrls: z.array(z.string().url()).optional().describe('Optional media URLs for this tweet')
    })).min(2).max(25).describe('Array of tweets to post in sequence (2-25 tweets)'),
    delayBetweenTweets: z.number().min(0).max(10000).optional().default(2000).describe('Milliseconds to wait between tweets (default: 2000ms)')
  }),
  execute: async (params) => {
    const started = Date.now()
    const userId = getCurrentUserId()

    return requestConfirmation(
      'createTwitterThread',
      { tweetCount: params.tweets.length, preview: params.tweets[0].text },
      async () => {
        console.log('🐦 [Twitter Advanced] Creating thread:', { tweetCount: params.tweets.length })

        try {
          const postedTweets: any[] = []
          let previousTweetId: string | undefined

          for (let i = 0; i < params.tweets.length; i++) {
            const tweet = params.tweets[i]

            // Upload media if provided
            let mediaIds: string[] | undefined
            if (tweet.mediaUrls && tweet.mediaUrls.length > 0) {
              mediaIds = []
              for (const mediaUrl of tweet.mediaUrls) {
                try {
                  const mediaId = await uploadMedia(mediaUrl)
                  mediaIds.push(mediaId)
                } catch (error) {
                  console.error(`Failed to upload media for tweet ${i + 1}:`, error)
                }
              }
            }

            // Create tweet
            const tweetData: any = {
              text: tweet.text
            }

            if (mediaIds && mediaIds.length > 0) {
              tweetData.media = { media_ids: mediaIds }
            }

            if (previousTweetId) {
              tweetData.reply = {
                in_reply_to_tweet_id: previousTweetId
              }
            }

            const result = await makeTwitterRequest('/tweets', {
              method: 'POST',
              body: JSON.stringify(tweetData)
            })

            postedTweets.push({
              id: result.data.id,
              text: result.data.text,
              position: i + 1
            })

            previousTweetId = result.data.id

            // Wait before posting next tweet (except for last one)
            if (i < params.tweets.length - 1) {
              await new Promise(resolve => setTimeout(resolve, params.delayBetweenTweets))
            }
          }

          if (userId) {
            await trackToolUsage(userId, 'createTwitterThread', { ok: true, execMs: Date.now() - started })
          }

          return {
            success: true,
            message: `Thread created with ${postedTweets.length} tweets`,
            thread: {
              firstTweetId: postedTweets[0].id,
              firstTweetUrl: `https://twitter.com/i/web/status/${postedTweets[0].id}`,
              tweetCount: postedTweets.length,
              tweets: postedTweets
            }
          }
        } catch (error) {
          console.error('Error creating thread:', error)
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to create thread'
          }
        }
      }
    )
  }
})
