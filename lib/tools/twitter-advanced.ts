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
import { getCurrentUserId } from '@/lib/server/request-context'
import { trackToolUsage } from '@/lib/analytics'
import { createHmac } from 'crypto'

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

// Ensure text is within 280 characters; keeps composed Unicode code points intact
function trimTo280(input: string): string {
  const arr = Array.from(input || '')
  if (arr.length <= 280) return input
  const sliced = arr.slice(0, 280)
  // avoid ending with half punctuation spacing, optional cleanup
  return sliced.join('').replace(/[\s.,;:!\-]+$/u, '')
}

// Helper: generate OAuth1 header for arbitrary URL + params (used for v1.1 fallback)
function buildOAuth1Header(method: string, url: string, credentials: any, params: Record<string, string>) {
  const nonce = Math.random().toString(36).substring(2)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const baseParams: Record<string, string> = {
    oauth_consumer_key: credentials.api_key,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.access_token,
    oauth_version: '1.0',
    ...params
  }
  const enc = (v: string) => encodeURIComponent(v).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16))
  const paramString = Object.keys(baseParams).sort().map(k => `${enc(k)}=${enc(baseParams[k])}`).join('&')
  const baseString = [method.toUpperCase(), enc(url), enc(paramString)].join('&')
  const signingKey = `${enc(credentials.api_secret)}&${enc(credentials.access_token_secret)}`
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64')
  const authParams: Record<string, string> = {
    oauth_consumer_key: credentials.api_key,
    oauth_nonce: nonce,
    oauth_signature: signature,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.access_token,
    oauth_version: '1.0'
  }
  return 'OAuth ' + Object.entries(authParams).map(([k, v]) => `${enc(k)}="${enc(v)}"`).join(', ')
}

/**
 * Generate OAuth 1.0a signature for Twitter API v2 requests
 * Required for write endpoints (POST /tweets)
 */
function generateOAuth1Signature(
  method: string,
  url: string,
  credentials: any,
  bodyParams: Record<string, any> = {}
) {
  const nonce = Math.random().toString(36).substring(2)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  
  const baseParams: Record<string, string> = {
    oauth_consumer_key: credentials.api_key,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.access_token,
    oauth_version: '1.0',
    ...bodyParams
  }
  
  const enc = (v: string) => encodeURIComponent(v).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16))
  const paramString = Object.keys(baseParams).sort().map(k => `${enc(k)}=${enc(baseParams[k])}`).join('&')
  const baseString = [method.toUpperCase(), enc(url), enc(paramString)].join('&')
  const signingKey = `${enc(credentials.api_secret)}&${enc(credentials.access_token_secret)}`
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64')
  
  const authParams: Record<string, string> = {
    oauth_consumer_key: credentials.api_key,
    oauth_nonce: nonce,
    oauth_signature: signature,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.access_token,
    oauth_version: '1.0'
  }
  
  return 'OAuth ' + Object.entries(authParams)
    .map(([k, v]) => `${enc(k)}="${enc(v)}"`).join(', ')
}

async function makeTwitterRequest(endpoint: string, options: RequestInit = {}) {
  // Best practice: only allow WRITE operations with user-linked OAuth 1.0a credentials
  const userId = getCurrentUserId?.()
  const credentials = await getTwitterCredentials()
  
  // Check if we have OAuth 1.0a credentials
  const hasOAuth1 = !!credentials.api_key && !!credentials.api_secret && 
                    !!credentials.access_token && !!credentials.access_token_secret
  
  if (!hasOAuth1 && !credentials.bearer_token) {
    throw new Error('No Twitter API credentials available. Please configure OAuth 1.0a credentials (api_key, api_secret, access_token, access_token_secret) for posting tweets.')
  }
  
  const method = options.method || 'GET'
  const isWriteRequest = method !== 'GET'
  
  // Write requests (POST, PUT, DELETE) REQUIRE OAuth 1.0a User Context
  // For write operations, require a logged-in user context and OAuth1 credentials
  if (isWriteRequest) {
    if (!userId) {
      throw new Error('Twitter posting requires a logged-in user with connected Twitter credentials. Please connect your Twitter account in Integrations.')
    }
    if (!hasOAuth1) {
      throw new Error('Missing user OAuth 1.0a credentials for Twitter posting. Connect your Twitter account in Integrations (api_key, api_secret, access_token, access_token_secret).')
    }

    const url = `https://api.twitter.com/2${endpoint}`
    const authHeader = generateOAuth1Signature(method, url, credentials)
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Twitter API error: ${errorData.detail || errorData.title || response.statusText}`)
    }
    
    return response.json()
  }
  
  // Fallback to Bearer token for read-only requests (system-level allowed)
  if (credentials.bearer_token) {
    const response = await fetch(`https://api.twitter.com/2${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${credentials.bearer_token}`,
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
  
  throw new Error('Cannot perform write operation: OAuth 1.0a credentials required for posting tweets')
}

/**
 * Upload media to Twitter using v2 API with chunked upload
 * Process: INIT → APPEND (chunks) → FINALIZE
 * Falls back to v1.1 if v2 fails (for older accounts)
 */
async function uploadMedia(mediaUrl: string, altText?: string): Promise<string> {
  // Enforce user-linked credentials for write (media upload)
  const userId = getCurrentUserId?.()
  if (!userId) {
    throw new Error('Twitter media upload requires a logged-in user with connected Twitter credentials. Connect your Twitter account in Integrations.')
  }
  const credentials = await getTwitterCredentials()
  
  // Check if we have OAuth 1.0a credentials (required for media upload)
  const hasOAuth1 = !!credentials.api_key && !!credentials.api_secret && 
                    !!credentials.access_token && !!credentials.access_token_secret
  
  if (!hasOAuth1) {
    throw new Error('Missing user OAuth 1.0a credentials for Twitter media upload. Connect your Twitter account in Integrations.')
  }

  // Download media
  const mediaResponse = await fetch(mediaUrl)
  if (!mediaResponse.ok) {
    throw new Error('Failed to download media from URL')
  }

  const mediaBuffer = await mediaResponse.arrayBuffer()
  const mediaBytes = new Uint8Array(mediaBuffer)
  const totalBytes = mediaBytes.length
  
  // Determine media type from content-type header or URL
  const contentType = mediaResponse.headers.get('content-type') || 'image/jpeg'
  const isVideo = contentType.startsWith('video/')
  const mediaCategory = isVideo ? 'tweet_video' : 'tweet_image'
  
  // Try v2 chunked upload first, fallback to v1.1 if needed
  try {
    return await uploadMediaV2Chunked(credentials, mediaBytes, totalBytes, contentType, mediaCategory, altText)
  } catch (v2Error) {
    console.warn('Twitter v2 media upload failed, attempting v1.1 fallback:', v2Error)
    
    // Fallback to v1.1 for older accounts or if v2 is unavailable
    return await uploadMediaV1Fallback(credentials, mediaBuffer, altText)
  }
}

/**
 * Twitter API v2 chunked media upload
 * Three-step process: INIT → APPEND → FINALIZE
 */
async function uploadMediaV2Chunked(
  credentials: any,
  mediaBytes: Uint8Array,
  totalBytes: number,
  contentType: string,
  mediaCategory: string,
  altText?: string
): Promise<string> {
  const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks (Twitter max)
  
  // Step 1: INIT - Initialize the upload
  const initUrl = 'https://upload.twitter.com/1.1/media/upload.json'
  const initParams: Record<string, string> = {
    command: 'INIT',
    total_bytes: totalBytes.toString(),
    media_type: contentType,
    media_category: mediaCategory
  }
  
  const initAuthHeader = buildOAuth1Header('POST', initUrl, credentials, initParams)
  const initResponse = await fetch(initUrl, {
    method: 'POST',
    headers: {
      'Authorization': initAuthHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(initParams)
  })
  
  if (!initResponse.ok) {
    const errorData = await initResponse.json().catch(() => ({}))
    throw new Error(`Media upload INIT failed: ${errorData.errors?.[0]?.message || initResponse.statusText}`)
  }
  
  const initResult = await initResponse.json()
  const mediaId = initResult.media_id_string
  
  if (!mediaId) {
    throw new Error('No media_id returned from INIT')
  }
  
  // Step 2: APPEND - Upload chunks
  let segmentIndex = 0
  for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
    const chunk = mediaBytes.slice(offset, Math.min(offset + CHUNK_SIZE, totalBytes))
    const chunkBase64 = Buffer.from(chunk).toString('base64')
    
    const appendParams: Record<string, string> = {
      command: 'APPEND',
      media_id: mediaId,
      segment_index: segmentIndex.toString(),
      media_data: chunkBase64
    }
    
    const appendAuthHeader = buildOAuth1Header('POST', initUrl, credentials, appendParams)
    const appendResponse = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Authorization': appendAuthHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(appendParams)
    })
    
    if (!appendResponse.ok) {
      const errorData = await appendResponse.json().catch(() => ({}))
      throw new Error(`Media upload APPEND failed at segment ${segmentIndex}: ${errorData.errors?.[0]?.message || appendResponse.statusText}`)
    }
    
    segmentIndex++
  }
  
  // Step 3: FINALIZE - Complete the upload
  const finalizeParams: Record<string, string> = {
    command: 'FINALIZE',
    media_id: mediaId
  }
  
  const finalizeAuthHeader = buildOAuth1Header('POST', initUrl, credentials, finalizeParams)
  const finalizeResponse = await fetch(initUrl, {
    method: 'POST',
    headers: {
      'Authorization': finalizeAuthHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(finalizeParams)
  })
  
  if (!finalizeResponse.ok) {
    const errorData = await finalizeResponse.json().catch(() => ({}))
    throw new Error(`Media upload FINALIZE failed: ${errorData.errors?.[0]?.message || finalizeResponse.statusText}`)
  }
  
  const finalizeResult = await finalizeResponse.json()
  
  // For videos, wait for processing to complete
  if (finalizeResult.processing_info) {
    await waitForMediaProcessing(credentials, mediaId, initUrl)
  }
  
  // Add alt text if provided
  if (altText) {
    const metadataUrl = 'https://upload.twitter.com/1.1/media/metadata/create.json'
    const metadataAuthHeader = buildOAuth1Header('POST', metadataUrl, credentials, {})
    
    await fetch(metadataUrl, {
      method: 'POST',
      headers: {
        'Authorization': metadataAuthHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        media_id: mediaId,
        alt_text: { text: altText.substring(0, 1000) } // Twitter alt text limit
      })
    })
  }
  
  return mediaId
}

/**
 * Wait for Twitter to process video/GIF media
 */
async function waitForMediaProcessing(credentials: any, mediaId: string, baseUrl: string): Promise<void> {
  const maxWaitMs = 120000 // 2 minutes max
  const pollIntervalMs = 5000 // Poll every 5 seconds
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitMs) {
    const statusParams: Record<string, string> = {
      command: 'STATUS',
      media_id: mediaId
    }
    
    const statusAuthHeader = buildOAuth1Header('GET', baseUrl, credentials, statusParams)
    const statusResponse = await fetch(`${baseUrl}?${new URLSearchParams(statusParams)}`, {
      method: 'GET',
      headers: {
        'Authorization': statusAuthHeader
      }
    })
    
    if (statusResponse.ok) {
      const statusResult = await statusResponse.json()
      const processingInfo = statusResult.processing_info
      
      if (!processingInfo) {
        return // Processing complete
      }
      
      if (processingInfo.state === 'succeeded') {
        return
      }
      
      if (processingInfo.state === 'failed') {
        throw new Error(`Media processing failed: ${processingInfo.error?.message || 'Unknown error'}`)
      }
      
      // Wait before next poll
      const waitTime = processingInfo.check_after_secs 
        ? processingInfo.check_after_secs * 1000 
        : pollIntervalMs
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, pollIntervalMs)))
    } else {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }
  }
  
  throw new Error('Media processing timed out after 2 minutes')
}

/**
 * Fallback to v1.1 simple upload for smaller images (< 5MB)
 * This may stop working as Twitter phases out v1.1
 */
async function uploadMediaV1Fallback(credentials: any, mediaBuffer: ArrayBuffer, altText?: string): Promise<string> {
  const mediaBase64 = Buffer.from(mediaBuffer).toString('base64')
  
  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json'
  const bodyParams: Record<string, string> = { media_data: mediaBase64 }
  const authHeader = buildOAuth1Header('POST', uploadUrl, credentials, bodyParams)

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(bodyParams)
  })

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({}))
    throw new Error(`Failed to upload media to Twitter (v1.1 fallback): ${errorData.errors?.[0]?.message || uploadResponse.statusText}`)
  }

  const uploadResult = await uploadResponse.json()
  const mediaId = uploadResult.media_id_string

  // Add alt text if provided
  if (altText && mediaId) {
    const metadataUrl = 'https://upload.twitter.com/1.1/media/metadata/create.json'
    const metadataAuthHeader = buildOAuth1Header('POST', metadataUrl, credentials, {})
    
    await fetch(metadataUrl, {
      method: 'POST',
      headers: {
        'Authorization': metadataAuthHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        media_id: mediaId,
        alt_text: { text: altText.substring(0, 1000) }
      })
    })
  }

  return mediaId
}

// Post tweet with media
export const postTweetWithMediaTool = tool({
  description: 'Post a tweet with images, videos, or GIFs. Tweets with media get 150% more engagement. Supports up to 4 images or 1 video. Perfect for visual content, product launches, event photos.',
  inputSchema: z.object({
    text: z.string().min(1).describe('Tweet text (will be trimmed to 280 characters if longer)'),
    media: z.array(z.object({
      url: z.string().url().describe('URL of the image/video to upload'),
      altText: z.string().optional().describe('Alt text for accessibility (recommended)')
    })).min(1).max(4).describe('Media items to attach (1-4 images or 1 video)'),
    replyToId: z.string().optional().describe('ID of tweet to reply to')
  }),
  execute: async (params) => {
    // NOTE: Human-in-the-loop approval is handled by approval-node.ts
    // The approval-node intercepts tool calls BEFORE execution and pauses with interrupt()
    // See: lib/agents/core/approval-node.ts and TOOL_APPROVAL_CONFIG
    
    const started = Date.now()
    const userId = getCurrentUserId()

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
            text: trimTo280(params.text),
            media: {
              media_ids: mediaIds
            }
          }

          if (params.replyToId) {
            tweetData.reply = {
              in_reply_to_tweet_id: params.replyToId
            }
          }

          let result: any
          try {
            result = await makeTwitterRequest('/tweets', {
              method: 'POST',
              body: JSON.stringify(tweetData)
            })
          } catch (err) {
            const msg = err instanceof Error ? err.message.toLowerCase() : ''
            const permsError = msg.includes('oauth1 app permissions') || msg.includes('not configured with the appropriate oauth1')
            if (!permsError) throw err
            // Fallback to v1.1 statuses/update.json with OAuth1
            const credentials = await getTwitterCredentials()
            const hasOAuth1 = !!credentials.api_key && !!credentials.api_secret && !!credentials.access_token && !!credentials.access_token_secret
            if (!hasOAuth1) throw err
            const url = 'https://api.twitter.com/1.1/statuses/update.json'
            const bodyParams: Record<string, string> = { status: params.text }
            if (mediaIds.length > 0) bodyParams.media_ids = mediaIds.join(',')
            if (params.replyToId) bodyParams.in_reply_to_status_id = params.replyToId
            const authHeader = buildOAuth1Header('POST', url, credentials, bodyParams)
            const resp = await fetch(url, {
              method: 'POST',
              headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams(bodyParams).toString()
            })
            if (!resp.ok) {
              const e = await resp.json().catch(() => ({}))
              throw new Error(`Twitter v1.1 post failed: ${e?.errors?.[0]?.message || resp.statusText}`)
            }
            const v11 = await resp.json()
            result = { data: { id: v11.id_str, text: v11.text } }
          }

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
})

// Create Twitter thread
export const createTwitterThreadTool = tool({
  description: 'Create a Twitter thread (series of connected tweets). Perfect for storytelling, tutorials, announcements, thought leadership. Automatically threads tweets in sequence.',
  inputSchema: z.object({
    tweets: z.array(z.object({
      text: z.string().min(1).describe('Tweet text (will be trimmed to 280 characters if longer)'),
      mediaUrls: z.array(z.string().url()).optional().describe('Optional media URLs for this tweet')
    })).min(2).max(25).describe('Array of tweets to post in sequence (2-25 tweets)'),
    delayBetweenTweets: z.number().min(0).max(10000).optional().default(2000).describe('Milliseconds to wait between tweets (default: 2000ms)')
  }),
  execute: async (params) => {
    // NOTE: Human-in-the-loop approval is handled by approval-node.ts
    // The approval-node intercepts tool calls BEFORE execution and pauses with interrupt()
    // See: lib/agents/core/approval-node.ts and TOOL_APPROVAL_CONFIG
    
    const started = Date.now()
    const userId = getCurrentUserId()

    console.log('🐦 [Twitter Advanced] Creating thread:', { tweetCount: params.tweets.length })

    try {
      const postedTweets: any[] = []
      let previousTweetId: string | undefined

      for (let i = 0; i < params.tweets.length; i++) {
        const tweet = params.tweets[i]
        tweet.text = trimTo280(tweet.text)

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
              text: trimTo280(tweet.text)
            }

            if (mediaIds && mediaIds.length > 0) {
              tweetData.media = { media_ids: mediaIds }
            }

            if (previousTweetId) {
              tweetData.reply = {
                in_reply_to_tweet_id: previousTweetId
              }
            }

            let result: any
            try {
              result = await makeTwitterRequest('/tweets', {
                method: 'POST',
                body: JSON.stringify(tweetData)
              })
            } catch (err) {
              const msg = err instanceof Error ? err.message.toLowerCase() : ''
              const permsError = msg.includes('oauth1 app permissions') || msg.includes('not configured with the appropriate oauth1')
              if (!permsError) throw err
              // Fallback to v1.1 statuses/update.json with OAuth1 per tweet
              const credentials = await getTwitterCredentials()
              const hasOAuth1 = !!credentials.api_key && !!credentials.api_secret && !!credentials.access_token && !!credentials.access_token_secret
              if (!hasOAuth1) throw err
              const url = 'https://api.twitter.com/1.1/statuses/update.json'
              const bodyParams: Record<string, string> = { status: tweet.text }
              if (mediaIds && mediaIds.length > 0) bodyParams.media_ids = mediaIds.join(',')
              if (previousTweetId) bodyParams.in_reply_to_status_id = previousTweetId
              const authHeader = buildOAuth1Header('POST', url, credentials, bodyParams)
              const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(bodyParams).toString()
              })
              if (!resp.ok) {
                const e = await resp.json().catch(() => ({}))
                throw new Error(`Twitter v1.1 post failed: ${e?.errors?.[0]?.message || resp.statusText}`)
              }
              const v11 = await resp.json()
              result = { data: { id: v11.id_str, text: v11.text } }
            }

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
})
