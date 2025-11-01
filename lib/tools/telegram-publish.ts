/**
 * Telegram Publishing Tool
 * Allows agents (primarily Jenn) to publish messages to user's Telegram channels
 */

import { z } from 'zod'
import { tool } from '@langchain/core/tools'
import { withRequestContext, getCurrentUserId } from '@/lib/server/request-context'
import { createClient } from '@/lib/supabase/server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export const telegramPublishTool = tool(
  async ({ channelUsername, message, parseMode = 'Markdown' }) => {
    return withRequestContext(async () => {
      try {
        if (!TELEGRAM_BOT_TOKEN) {
          return JSON.stringify({
            success: false,
            error: 'Telegram bot token not configured'
          })
        }

        // Get current user
        const userId = getCurrentUserId()
        if (!userId) {
          return JSON.stringify({
            success: false,
            error: 'User not authenticated'
          })
        }

        // Verify user owns this channel
        const supabase = await createClient()
        const { data: channel, error: dbError } = await supabase
          .from('telegram_channels')
          .select('*')
          .eq('user_id', userId)
          .eq('channel_username', channelUsername)
          .eq('is_active', true)
          .single()

        if (dbError || !channel) {
          return JSON.stringify({
            success: false,
            error: `Channel ${channelUsername} not found or not connected to your account. Please add it first in the Integrations page.`
          })
        }

        if (!channel.chat_id) {
          return JSON.stringify({
            success: false,
            error: `Channel ${channelUsername} is not properly configured. Please re-validate it.`
          })
        }

        // Send message via Telegram API
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: channel.chat_id,
              text: message,
              parse_mode: parseMode,
              disable_web_page_preview: false
            })
          }
        )

        const result = await telegramResponse.json()

        if (!result.ok) {
          return JSON.stringify({
            success: false,
            error: `Failed to publish: ${result.description || 'Unknown error'}`,
            telegramError: result.description
          })
        }

        return JSON.stringify({
          success: true,
          message: `✅ Message published successfully to ${channelUsername}!`,
          messageId: result.result.message_id,
          channelName: channel.channel_name,
          timestamp: new Date().toISOString()
        })

      } catch (error: any) {
        console.error('❌ Telegram publish error:', error)
        return JSON.stringify({
          success: false,
          error: error.message || 'Failed to publish message to Telegram'
        })
      }
    })
  },
  {
    name: 'publish_to_telegram',
    description: `Publish a message to a user's Telegram channel. 
    
IMPORTANT: The user must have already connected their channel via the Integrations page.
Use this tool when the user asks to:
- Publish/post/send content to Telegram
- Announce something on their Telegram channel
- Share updates with their Telegram audience
- Broadcast messages to their channel

The message will be published immediately to the specified channel.`,
    schema: z.object({
      channelUsername: z.string().describe('The Telegram channel username (must start with @, e.g., @my_channel)'),
      message: z.string().describe('The message content to publish. Supports Markdown formatting (bold: **text**, italic: *text*, code: \`text\`, links: [text](url))'),
      parseMode: z.enum(['Markdown', 'HTML', 'MarkdownV2']).optional().default('Markdown').describe('Message formatting mode. Default is Markdown.')
    })
  }
)
