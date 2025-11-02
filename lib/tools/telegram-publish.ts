/**
 * Telegram Publishing Tool
 * Allows agents (primarily Jenn) to publish messages to user's Telegram channels
 */

import { z } from 'zod'
import { tool } from 'ai'

console.log('🏗️ [MODULE LOAD] telegram-publish.ts loaded')

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// Import helpers at module level (not inside execute)
let createClient: any
let getCurrentUserId: any

// Lazy-load imports to avoid circular dependencies
const loadHelpers = async () => {
  if (!createClient) {
    const supabaseModule = await import('../supabase/server')
    createClient = supabaseModule.createClient
  }
  if (!getCurrentUserId) {
    const contextModule = await import('../server/request-context')
    getCurrentUserId = contextModule.getCurrentUserId
  }
}

// Telegram API helper
async function sendTelegramMessage(chatId: string, text: string, parseMode: string = 'Markdown') {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode === 'none' ? undefined : parseMode,
    }),
  })
  return response.json()
}

export const telegramPublishTool = tool({
  description: `Publish a text message to a user's Telegram channel. 
  
IMPORTANT: The user must have already connected their channel via the Integrations page.

Supports Markdown formatting:
- Bold: **text** or __text__
- Italic: *text* or _text_  
- Code: \`text\`
- Links: [text](url)

Use this tool when the user asks to:
- Publish/post/send content to Telegram
- Announce something on their Telegram channel
- Share updates with their Telegram audience
- Broadcast messages to their channel`,
  
  inputSchema: z.object({
    channelUsername: z.string().optional().describe('Channel username (must start with @, e.g., @my_channel). Use this OR chat_id.'),
    chat_id: z.string().optional().describe('Alternative to channelUsername. Numeric chat ID or @username.'),
    message: z.string().optional().describe('The message content to publish. Supports Markdown formatting. Use this OR text.'),
    text: z.string().optional().describe('Alternative to message. The text content to publish.'),
    parseMode: z.enum(['Markdown', 'HTML', 'none']).optional().describe('Formatting mode. Default: Markdown'),
  }),
  
  execute: async ({ channelUsername, chat_id, message, text, parseMode = 'Markdown' }) => {
    console.log('🔵 [TELEGRAM] publish_to_telegram called:', { 
      channelUsername, 
      chat_id,
      messageLength: (message || text)?.length,
      parseMode 
    })
    
    try {
      // Normalize params
      const channel = channelUsername || chat_id
      const messageText = message || text
      
      if (!channel) {
        console.error('❌ [TELEGRAM] Missing channel parameter')
        return {
          success: false,
          error: 'Missing required parameter: channelUsername or chat_id'
        }
      }
      
      if (!messageText) {
        console.error('❌ [TELEGRAM] Missing message parameter')
        return {
          success: false,
          error: 'Missing required parameter: message or text'
        }
      }
      
      if (!TELEGRAM_BOT_TOKEN) {
        console.error('❌ [TELEGRAM] Bot token not configured')
        return {
          success: false,
          error: 'Telegram bot token not configured'
        }
      }

      // Get user's channel info from database
      await loadHelpers()
      
      const userId = getCurrentUserId()
      if (!userId) {
        console.error('❌ [TELEGRAM] User not authenticated')
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const supabase = await createClient()
      if (!supabase) {
        console.error('❌ [TELEGRAM] Database client creation failed')
        return {
          success: false,
          error: 'Database connection failed'
        }
      }

      const { data: channelData, error: dbError } = await supabase
        .from('telegram_channels')
        .select('*')
        .eq('user_id', userId)
        .eq('channel_username', channel)
        .eq('is_active', true)
        .single()

      if (dbError || !channelData) {
        console.error('❌ [TELEGRAM] Channel not found:', dbError?.message)
        return {
          success: false,
          error: `Channel ${channel} not found or not connected. Please add it in the Integrations page.`
        }
      }

      if (!channelData.chat_id) {
        console.error('❌ [TELEGRAM] Channel missing chat_id')
        return {
          success: false,
          error: `Channel ${channel} is not properly configured. Please re-validate it.`
        }
      }

      // Send message
      const result = await sendTelegramMessage(channelData.chat_id, messageText, parseMode)

      if (!result.ok) {
        console.error('❌ [TELEGRAM] API error:', result.description)
        return {
          success: false,
          error: result.description || 'Failed to publish message'
        }
      }

      console.log('✅ [TELEGRAM] Message published:', { 
        channel, 
        messageId: result.result?.message_id 
      })

      return {
        success: true,
        message: 'Message published successfully to Telegram channel',
        channelUsername: channel,
        messageId: result.result?.message_id,
      }
    } catch (error) {
      console.error('❌ [TELEGRAM] Unexpected error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  },
})
