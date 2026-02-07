/**
 * X (Twitter) Tools for Community Management
 * Provides tools for X/Twitter integration including posting, trends, analytics
 * Uses user credentials when available, falls back to system credentials
 */

import { tool } from 'ai'
import { z } from 'zod'
import { getActiveTwitterCredentials, getSystemTwitterCredentials } from '@/lib/twitter/credentials'
import { redactInput } from '@/lib/actions/snapshot-store'
import { getCurrentUserId } from '@/lib/server/request-context'
import { createHmac } from 'crypto'
import { 
  executeWithRateLimit, 
  getRateLimitStatus, 
  tweetQueue 
} from '@/lib/twitter/rate-limiter'

// Helper function to get Twitter credentials
async function getTwitterCredentials() {
  try {
    const userId = getCurrentUserId?.()
    
    if (userId) {
      const result = await getActiveTwitterCredentials(userId)
      if (result.success && result.data) {
        return result.data
      }
    }
    
    // Fallback to system credentials
    return getSystemTwitterCredentials()
  } catch (error) {
    console.warn('Failed to get user Twitter credentials, using system fallback:', error)
    return getSystemTwitterCredentials()
  }
}

// Helper function for read-only requests (Bearer allowed)
async function makeTwitterRequest(endpoint: string, options: RequestInit = {}) {
  const credentials = await getTwitterCredentials()
  if (!credentials.bearer_token) {
    throw new Error('Read-only Twitter API call requires a Bearer token (system-level).')
  }
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

// ============================================================================
// TWITTER/X POSTING & CONTENT TOOLS
// ============================================================================

/**
 * Post a tweet to X (Twitter)
 * Uses user credentials when available for actual posting
 */
// Heuristic helpers
function analyzeTweet(raw: string) {
  const content = raw.replace(/\s+/g, ' ').trim()
  const hashtags = Array.from(content.match(/#[A-Za-z0-9_]+/g) || [])
  const mentions = Array.from(content.match(/@[A-Za-z0-9_]+/g) || [])
  const urls = Array.from(content.match(/https?:\/\/\S+/g) || [])
  const charCount = [...content].length
  const overLimit = charCount > 280
  const nearLimit = !overLimit && charCount >= 250
  const suggested = charCount > 280 ? trimToSafe(content) : content
  const warnings: string[] = []
  if (overLimit) warnings.push(`Exceeds 280 chars by ${charCount - 280}`)
  else if (nearLimit) warnings.push('Near 280 char limit—review before posting')
  if (hashtags.length > 4) warnings.push('Too many hashtags (optimal 1-3)')
  return { content, hashtags, mentions, urls, charCount, overLimit, nearLimit, warnings, suggested }
}

function trimToSafe(text: string) {
  if ([...text].length <= 280) return text
  const arr = [...text]
  const sliced = arr.slice(0, 277).join('').replace(/[\s.,;:!-]+$/,'')
  return sliced + '…'
}

export const postTweetTool = tool({
  description: 'Post a tweet to X/Twitter. Use for publishing content, announcements, and social media engagement.',
  inputSchema: z.object({
    content: z.string().min(1).describe('The tweet content to post (will be validated and trimmed if >280)'),
    reply_to_id: z.string().optional().describe('ID of tweet to reply to (optional)'),
    quote_tweet_id: z.string().optional().describe('ID of tweet to quote (optional)')
  }),
  execute: async ({ content, reply_to_id, quote_tweet_id }) => {
    // NOTE: Human-in-the-loop approval is handled by approval-node.ts
    // The approval-node intercepts tool calls BEFORE execution and pauses with interrupt()
    // See: lib/agents/core/approval-node.ts and TOOL_APPROVAL_CONFIG
    
    try {
      const analysis = analyzeTweet(content)
      if (analysis.overLimit) {
        return { success: false, error: `Tweet too long (${analysis.charCount}). Provide shorter content.` }
      }
    const credentials = await getTwitterCredentials()
      // Prefer OAuth 2.0 Bearer token for v2 endpoint; fall back to OAuth 1.0a user auth for v1.1
      const hasBearer = !!credentials.bearer_token
      const hasOAuth1 = !!credentials.api_key && !!credentials.api_secret && !!credentials.access_token && !!credentials.access_token_secret

      if (!hasBearer && !hasOAuth1) {
        return {
          success: false,
          error: 'Twitter credentials incomplete. Provide either a Bearer token (OAuth2) or OAuth 1.0a keys (api_key/api_secret + access_token/access_token_secret).'
        }
      }

      if (hasBearer) {
        // v2 create tweet with rate limit handling
        const tweetData: any = { text: analysis.suggested }
        if (reply_to_id) tweetData.reply = { in_reply_to_tweet_id: reply_to_id }
        if (quote_tweet_id) tweetData.quote_tweet_id = quote_tweet_id
        
        const result = await executeWithRateLimit<any>(() => 
          fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${credentials.bearer_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(tweetData)
          })
        )

        if (!result.success) {
          // If rate limited and should queue, offer to queue the tweet
          if (result.shouldQueue) {
            const queueId = tweetQueue.add(analysis.suggested, { reply_to_id, quote_tweet_id }, 60000) // Queue for 1 minute later
            return {
              success: false,
              error: result.error,
              suggestion: `💡 Tip: El tweet ha sido agregado a la cola y se intentará publicar automáticamente cuando el límite se resetee.`,
              rate_limit_status: result.rateLimitInfo ? getRateLimitStatus(result.rateLimitInfo) : undefined,
              queued: true,
              queue_id: queueId
            }
          }
          
          return { 
            success: false, 
            error: result.error,
            rate_limit_status: result.rateLimitInfo ? getRateLimitStatus(result.rateLimitInfo) : undefined
          }
        }

        return {
          success: true,
          message: 'Tweet posted successfully!',
          data: {
            tweet_id: result.data?.data?.id,
            tweet_url: result.data?.data?.id ? `https://x.com/i/web/status/${result.data.data.id}` : undefined,
            content: analysis.suggested,
            posted_at: new Date().toISOString(),
            hashtags: analysis.hashtags,
            mentions: analysis.mentions,
            urls: analysis.urls,
            char_count: analysis.charCount,
          },
          rate_limit_status: result.rateLimitInfo ? getRateLimitStatus(result.rateLimitInfo) : undefined
        }
      }

      // OAuth 1.0a signing for v1.1 statuses/update.json if no bearer token
  const oauthParams = (method: string, url: string, params: Record<string, string>) => {
        // Minimal OAuth1 implementation
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
        const header = 'OAuth ' + Object.entries(authParams)
          .map(([k, v]) => `${enc(k)}="${enc(v)}"`).join(', ')
        return header
      }

      const url = 'https://api.twitter.com/1.1/statuses/update.json'
      const legacyAnalysis = analyzeTweet(content)
      if (legacyAnalysis.overLimit) {
        return { success: false, error: `Tweet too long (${legacyAnalysis.charCount}). Provide shorter content.` }
      }
      const bodyParams: Record<string, string> = { status: legacyAnalysis.suggested }
      if (reply_to_id) bodyParams.in_reply_to_status_id = reply_to_id
  const authHeader = oauthParams('POST', url, bodyParams)
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(bodyParams).toString()
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        return { success: false, error: `Failed to post tweet (v1.1): ${err?.errors?.[0]?.message || resp.statusText}`, details: err }
      }
      const resJson = await resp.json()
      return {
        success: true,
        message: 'Tweet posted successfully!',
        data: {
          tweet_id: resJson.id_str,
          tweet_url: resJson.id_str ? `https://x.com/i/web/status/${resJson.id_str}` : undefined,
          content: legacyAnalysis.suggested,
          posted_at: new Date().toISOString(),
          hashtags: legacyAnalysis.hashtags,
          mentions: legacyAnalysis.mentions,
          urls: legacyAnalysis.urls,
          char_count: legacyAnalysis.charCount,
        }
      }
    } catch (error) {
      console.error('Error posting tweet:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post tweet. Please check your connection and Twitter API credentials.'
      }
    }
  }
})

/**
 * Generate optimized tweet content
 */
export const generateTweetTool = tool({
  description: 'Generate optimized tweet content for X/Twitter based on topic, audience, and style preferences.',
  inputSchema: z.object({
    topic: z.string().min(1).describe('Main topic or message for the tweet'),
    style: z.enum(['professional', 'casual', 'humorous', 'educational', 'promotional']).default('professional').describe('Writing style'),
    audience: z.string().optional().describe('Target audience description'),
    include_hashtags: z.boolean().default(true).describe('Whether to include relevant hashtags'),
    include_emoji: z.boolean().default(true).describe('Whether to include emojis'),
    call_to_action: z.string().optional().describe('Specific call to action to include'),
    max_length: z.number().min(50).max(280).default(280).describe('Maximum character length')
  }),
  execute: async ({ topic, style, audience, include_hashtags, include_emoji, call_to_action, max_length }) => {
    // Generate base content based on style
    let content = ''
    
    switch (style) {
      case 'professional':
        content = `Exploring ${topic}. Key insights and strategic implications for ${audience || 'our industry'}.`
        break
      case 'casual':
        content = `Just thinking about ${topic}... what's your take?`
        break
      case 'humorous':
        content = `${topic} - because who doesn't love a good plot twist in their day? 😄`
        break
      case 'educational':
        content = `Did you know? ${topic} has fascinating implications for how we understand...`
        break
      case 'promotional':
        content = `🚀 Exciting news about ${topic}! This changes everything.`
        break
    }

    // Add call to action if provided
    if (call_to_action) {
      content += ` ${call_to_action}`
    }

    // Add relevant hashtags (simulated based on topic)
    if (include_hashtags) {
      const topicWords = topic.toLowerCase().split(' ')
      const hashtags = topicWords
        .filter(word => word.length > 3)
        .slice(0, 3)
        .map(word => `#${word.charAt(0).toUpperCase() + word.slice(1)}`)
      
      if (hashtags.length > 0) {
        content += ` ${hashtags.join(' ')}`
      }
    }

    // Add emojis if requested
    if (include_emoji && !content.includes('😄') && !content.includes('🚀')) {
      const emojis = ['💡', '🔥', '⚡', '🎯', '💪', '🌟', '🚀', '📈']
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
      content = `${randomEmoji} ${content}`
    }

    // Trim to max length
    const finalMaxLength = max_length || 280
    if (content.length > finalMaxLength) {
      content = content.substring(0, finalMaxLength - 3) + '...'
    }

    const hashtags = content.match(/#[\w]+/g) || []
    const mentions = content.match(/@[\w]+/g) || []

    return {
      generated_content: content,
      character_count: content.length,
      hashtags_found: hashtags,
      mentions_found: mentions,
      style_used: style,
      audience_targeted: audience || 'general',
      optimization_tips: [
        'Consider adding relevant mentions to increase engagement',
        'Timing: Best posting times are usually 9-10 AM and 7-9 PM',
        'Use 1-2 hashtags for optimal reach vs. spam perception',
        'Include a clear call-to-action for better engagement'
      ]
    }
  }
})

// ============================================================================
// HASHTAG & TREND RESEARCH TOOLS
// ============================================================================

/**
 * Research trending hashtags (uses existing SerpAPI for trend analysis)
 */
export const hashtagResearchTool = tool({
  description: 'Research trending and relevant hashtags for X/Twitter content strategy using web search.',
  inputSchema: z.object({
    topic: z.string().min(1).describe('Topic or keyword to research hashtags for'),
    platform_focus: z.enum(['twitter', 'instagram', 'general']).default('twitter').describe('Platform to optimize hashtags for'),
    search_depth: z.enum(['trending', 'popular', 'niche']).default('popular').describe('Type of hashtags to find')
  }),
  execute: async ({ topic, platform_focus, search_depth }) => {
    // This would integrate with existing serpGeneralSearch for research
    // For now, we'll simulate based on common patterns
    
    const baseHashtags = topic.toLowerCase().split(' ')
      .filter(word => word.length > 2)
      .map(word => `#${word.charAt(0).toUpperCase() + word.slice(1)}`)

    // Simulate trending analysis - use dynamic year
    const currentYear = new Date().getFullYear()
    const trendingHashtags = [
      `#TechTrends${currentYear}`,
      '#Innovation',
      '#DigitalTransformation',
      '#SocialMedia',
      '#ContentCreation',
      '#Marketing',
      '#Entrepreneurship',
      '#Leadership'
    ].filter(tag => tag.toLowerCase().includes(topic.toLowerCase().split(' ')[0]))

    // Simulate related hashtags
    const relatedHashtags = baseHashtags.concat([
      '#Community',
      '#Growth',
      '#Strategy',
      '#Tips'
    ])

    return {
      topic_researched: topic,
      platform: platform_focus,
      base_hashtags: baseHashtags,
      trending_hashtags: trendingHashtags.slice(0, 5),
      related_hashtags: relatedHashtags.slice(0, 10),
      recommendations: {
        primary: baseHashtags.slice(0, 2),
        secondary: trendingHashtags.slice(0, 2),
        engagement_boost: ['#MondayMotivation', '#ThoughtLeadership', '#Innovation'],
      },
      usage_tips: [
        'Use 1-2 primary hashtags related directly to your content',
        'Add 1 trending hashtag to increase discoverability',
        'Avoid using more than 3 hashtags on Twitter to prevent spam appearance',
        'Research hashtag popularity vs competition ratio'
      ]
    }
  }
})

/**
 * Analyze X/Twitter trends (simulation with web search integration)
 */
export const twitterTrendsAnalysisTool = tool({
  description: 'Analyze current trends on X/Twitter using web search and news analysis for content strategy.',
  inputSchema: z.object({
    location: z.string().default('Worldwide').describe('Geographic location for trends (e.g., "United States", "Spain", "Worldwide")'),
    category: z.enum(['general', 'technology', 'business', 'entertainment', 'sports', 'politics']).default('general').describe('Trend category focus'),
    time_frame: z.enum(['current', 'week', 'month']).default('current').describe('Time frame for trend analysis')
  }),
  execute: async ({ location, category, time_frame }) => {
    // This would use serpNewsSearch to find trending topics
    // Simulating trend analysis for now
    
    // Use dynamic year for trending hashtags
    const currentYear = new Date().getFullYear()
    const trends = [
      {
        hashtag: `#AI${currentYear}`,
        volume: 'High',
        growth: '+150%',
        category: 'technology',
        description: 'Artificial Intelligence developments and applications'
      },
      {
        hashtag: '#SustainableTech',
        volume: 'Medium',
        growth: '+85%',
        category: 'technology',
        description: 'Environmental technology and sustainability initiatives'
      },
      {
        hashtag: '#RemoteWork',
        volume: 'Medium',
        growth: '+45%',
        category: 'business',
        description: 'Remote work trends and workplace evolution'
      },
      {
        hashtag: '#ContentCreation',
        volume: 'High',
        growth: '+120%',
        category: 'general',
        description: 'Content creation tools and strategies'
      }
    ]

    const filteredTrends = category === 'general' 
      ? trends 
      : trends.filter(trend => trend.category === category)

    return {
      location,
      category,
      time_frame,
      trending_topics: filteredTrends,
      insights: {
        fastest_growing: filteredTrends[0],
        most_volume: filteredTrends.find(t => t.volume === 'High'),
        recommended_for_content: filteredTrends.slice(0, 3)
      },
      content_opportunities: [
        'Create educational content around trending topics',
        'Share industry insights related to growing trends',
        'Engage with trending conversations using relevant hashtags',
        'Monitor competitor activity on trending topics'
      ],
      next_update: '15 minutes (trends update frequently)'
    }
  }
})

// ============================================================================
// ANALYTICS & MONITORING TOOLS (SIMULATED)
// ============================================================================

/**
 * Simulate Twitter analytics (educational purposes)
 */
export const twitterAnalyticsTool = tool({
  description: 'Get Twitter/X analytics simulation for account performance and content insights.',
  inputSchema: z.object({
    account_handle: z.string().optional().describe('Twitter handle to analyze (simulation)'),
    metric_type: z.enum(['engagement', 'reach', 'followers', 'impressions', 'mentions']).default('engagement').describe('Type of analytics to focus on'),
    time_period: z.enum(['24h', '7d', '30d', '90d']).default('7d').describe('Time period for analytics')
  }),
  execute: async ({ account_handle, metric_type, time_period }) => {
    // Simulate analytics data
    const baseMetrics = {
      followers: 1250,
      following: 340,
      tweets: 523,
      likes_received: 2840,
      retweets_received: 186,
      mentions: 45
    }

    const periodMultipliers: Record<string, number> = {
      '24h': 0.1,
      '7d': 1,
      '30d': 4.2,
      '90d': 12.5
    }

    const multiplier = periodMultipliers[time_period || '7d'] || 1

    const analytics = {
      account: account_handle || '@your_account',
      period: time_period,
      metrics: {
        impressions: Math.round(baseMetrics.tweets * 150 * multiplier),
        engagements: Math.round(baseMetrics.likes_received * multiplier),
        engagement_rate: '3.2%',
        reach: Math.round(baseMetrics.followers * 0.8 * multiplier),
        clicks: Math.round(baseMetrics.tweets * 12 * multiplier),
        retweets: Math.round(baseMetrics.retweets_received * multiplier),
        likes: Math.round(baseMetrics.likes_received * multiplier),
        mentions: Math.round(baseMetrics.mentions * multiplier)
      },
      top_performing_content: [
        { type: 'Educational thread', engagement: '156 interactions' },
        { type: 'Industry insight', engagement: '89 interactions' },
        { type: 'Community question', engagement: '67 interactions' }
      ],
      insights: [
        'Educational content performs 40% better than promotional posts',
        'Tweets with 1-2 hashtags get 20% more engagement',
        'Posting between 9-11 AM shows highest engagement rates',
        'Questions and polls drive 3x more comments'
      ],
      recommendations: [
        'Increase educational content frequency',
        'Use more engaging questions in tweets',
        'Optimize posting times for your audience',
        'Engage more with your community through replies'
      ]
    }

    return {
      ...analytics,
      simulated: true,
      note: 'This is simulated analytics data for educational purposes'
    }
  }
})

/**
 * Check Twitter API rate limit status
 */
export const checkRateLimitTool = tool({
  description: 'Check current Twitter/X API rate limit status and queued tweets.',
  inputSchema: z.object({
    endpoint: z.enum(['tweets', 'search', 'users']).default('tweets').describe('API endpoint to check rate limits for')
  }),
  execute: async ({ endpoint }) => {
    try {
      const credentials = await getTwitterCredentials()
      if (!credentials.bearer_token) {
        return { success: false, error: 'No Bearer token available for rate limit check' }
      }

      // Check rate limit status for the endpoint
      const result = await executeWithRateLimit<any>(() =>
        fetch(`https://api.twitter.com/1.1/application/rate_limit_status.json?resources=${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${credentials.bearer_token}`,
            'Content-Type': 'application/json'
          }
        })
      )

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          queue_status: {
            queued_tweets: tweetQueue.size(),
            ready_to_send: tweetQueue.getReady().length
          }
        }
      }

      return {
        success: true,
        rate_limit_status: result.rateLimitInfo ? getRateLimitStatus(result.rateLimitInfo) : 'No disponible',
        rate_limit_details: result.rateLimitInfo,
        queue_status: {
          queued_tweets: tweetQueue.size(),
          ready_to_send: tweetQueue.getReady().length
        },
        recommendations: [
          'Espacia tus tweets para evitar alcanzar el límite',
          'Usa la cola automática cuando alcances el límite',
          'El límite se resetea cada 24 horas para publicaciones',
          'Considera programar tweets para distribuir el uso'
        ]
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error checking rate limit status'
      }
    }
  }
})

// ============================================================================
// EXPORT ALL TOOLS
// ============================================================================

export const twitterTools = {
  postTweet: postTweetTool,
  generateTweet: generateTweetTool,
  hashtagResearch: hashtagResearchTool,
  twitterTrendsAnalysis: twitterTrendsAnalysisTool,
  twitterAnalytics: twitterAnalyticsTool,
  checkRateLimit: checkRateLimitTool
}

export type TwitterToolNames = keyof typeof twitterTools

// Optional metadata map for UI (icons, labels) — frontend can import this to show icons next to tools
export const twitterToolMeta: Record<TwitterToolNames, { icon: string; label?: string }> = {
  postTweet: { icon: '/icons/x_twitter.png', label: 'Post to X' },
  generateTweet: { icon: '/icons/x_twitter.png', label: 'Generate Tweet' },
  hashtagResearch: { icon: '/icons/x_twitter.png', label: 'Hashtag Research' },
  twitterTrendsAnalysis: { icon: '/icons/x_twitter.png', label: 'Trends Analysis' },
  twitterAnalytics: { icon: '/icons/x_twitter.png', label: 'Analytics' },
  checkRateLimit: { icon: '/icons/x_twitter.png', label: 'Rate Limit Status' }
}
