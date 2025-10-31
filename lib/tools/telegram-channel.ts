/**
 * Telegram Channel Publishing Tools
 * 
 * These tools allow Jenn to publish content to Telegram channels.
 * Unlike other social platforms:
 * - Single bot token manages all channels
 * - Bot must be admin of the channel with "Post Messages" permission
 * - Supports text, photos, and videos with Markdown/HTML formatting
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getTelegramBotToken, getTelegramChannelByUsername, updateChannelChatId } from '@/lib/telegram/credentials';
import { ensureToolsHaveRequestContext } from '@/lib/tools/context-wrapper';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

/**
 * Send a Telegram API request
 */
async function sendTelegramRequest(
  endpoint: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; result?: unknown; description?: string }> {
  try {
    const botToken = getTelegramBotToken();
    const url = `${TELEGRAM_API_BASE}/bot${botToken}/${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      console.error('❌ [Telegram] API Error:', data);
      return {
        ok: false,
        description: data.description || 'Unknown error',
      };
    }
    
    return data;
  } catch (error) {
    console.error('❌ [Telegram] Request failed:', error);
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get channel identifier (prefer chat_id if available, otherwise username)
 */
async function getChannelIdentifier(channelUsername: string): Promise<string> {
  const channel = await getTelegramChannelByUsername(channelUsername);
  
  // Prefer numeric chat_id if available
  if (channel?.chat_id) {
    return channel.chat_id;
  }
  
  // Otherwise use username (must start with @)
  const normalized = channelUsername.startsWith('@') 
    ? channelUsername 
    : `@${channelUsername}`;
  
  return normalized;
}

/**
 * Tool 1: Publish text message to Telegram channel
 */
const telegramPublishMessage = tool({
  description: `Publish a text message to a Telegram channel. 
  
  Supports Markdown or HTML formatting for rich text:
  - Markdown: *bold*, _italic_, \`code\`, [link](url)
  - HTML: <b>bold</b>, <i>italic</i>, <code>code</code>, <a href="url">link</a>
  
  The bot must be an administrator of the channel with "Post Messages" permission.
  
  Use this for:
  - Announcements
  - Daily updates
  - News alerts
  - Community messages`,
  inputSchema: z.object({
    channelUsername: z.string().describe('Channel username (e.g., @mychannel) or numeric chat_id'),
    message: z.string().describe('Text message to publish. Can use Markdown or HTML formatting.'),
    parseMode: z.enum(['Markdown', 'HTML', 'none']).optional().describe('Formatting mode. Default: Markdown'),
    disableWebPreview: z.boolean().optional().describe('Disable link previews. Default: false'),
  }),
  execute: async ({ channelUsername, message, parseMode = 'Markdown', disableWebPreview = false }) => {
    try {
      const chatId = await getChannelIdentifier(channelUsername);
      
      const body: Record<string, unknown> = {
        chat_id: chatId,
        text: message,
        disable_web_page_preview: disableWebPreview,
      };
      
      if (parseMode !== 'none') {
        body.parse_mode = parseMode;
      }
      
      const result = await sendTelegramRequest('sendMessage', body);
      
      if (!result.ok) {
        return {
          success: false,
          error: result.description || 'Failed to publish message',
        };
      }
      
      // Update chat_id if we got it from the response
      const messageData = result.result as { chat?: { id?: number } } | undefined;
      if (messageData?.chat?.id && channelUsername.startsWith('@')) {
        await updateChannelChatId(channelUsername, messageData.chat.id.toString());
      }
      
      console.log('✅ [Telegram] Message published to:', channelUsername);
      
      return {
        success: true,
        message: 'Message published successfully to Telegram channel',
        channelUsername,
      };
    } catch (error) {
      console.error('❌ [Telegram] Error publishing message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool 2: Publish photo to Telegram channel
 */
const telegramPublishPhoto = tool({
  description: `Publish a photo to a Telegram channel with optional caption.
  
  The photo can be:
  - A URL to an image file (jpg, png, gif)
  - Must be publicly accessible
  
  Caption supports Markdown or HTML formatting.
  Maximum file size: 10 MB
  
  Use this for:
  - Product announcements
  - Event photos
  - Visual content
  - Promotional images`,
  inputSchema: z.object({
    channelUsername: z.string().describe('Channel username (e.g., @mychannel) or numeric chat_id'),
    photoUrl: z.string().url().describe('URL of the photo to publish'),
    caption: z.string().optional().describe('Photo caption (max 1024 characters)'),
    parseMode: z.enum(['Markdown', 'HTML', 'none']).optional().describe('Caption formatting mode. Default: Markdown'),
  }),
  execute: async ({ channelUsername, photoUrl, caption, parseMode = 'Markdown' }) => {
    try {
      const chatId = await getChannelIdentifier(channelUsername);
      
      const body: Record<string, unknown> = {
        chat_id: chatId,
        photo: photoUrl,
      };
      
      if (caption) {
        body.caption = caption;
        if (parseMode !== 'none') {
          body.parse_mode = parseMode;
        }
      }
      
      const result = await sendTelegramRequest('sendPhoto', body);
      
      if (!result.ok) {
        return {
          success: false,
          error: result.description || 'Failed to publish photo',
        };
      }
      
      // Update chat_id if we got it
      const messageData = result.result as { chat?: { id?: number } } | undefined;
      if (messageData?.chat?.id && channelUsername.startsWith('@')) {
        await updateChannelChatId(channelUsername, messageData.chat.id.toString());
      }
      
      console.log('✅ [Telegram] Photo published to:', channelUsername);
      
      return {
        success: true,
        message: 'Photo published successfully to Telegram channel',
        channelUsername,
      };
    } catch (error) {
      console.error('❌ [Telegram] Error publishing photo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool 3: Publish video to Telegram channel
 */
const telegramPublishVideo = tool({
  description: `Publish a video to a Telegram channel with optional caption.
  
  The video can be:
  - A URL to a video file (mp4, mov, avi)
  - Must be publicly accessible
  
  Caption supports Markdown or HTML formatting.
  Maximum file size: 50 MB
  
  Use this for:
  - Video announcements
  - Tutorials
  - Event highlights
  - Product demos`,
  inputSchema: z.object({
    channelUsername: z.string().describe('Channel username (e.g., @mychannel) or numeric chat_id'),
    videoUrl: z.string().url().describe('URL of the video to publish'),
    caption: z.string().optional().describe('Video caption (max 1024 characters)'),
    parseMode: z.enum(['Markdown', 'HTML', 'none']).optional().describe('Caption formatting mode. Default: Markdown'),
    duration: z.number().optional().describe('Video duration in seconds'),
    width: z.number().optional().describe('Video width'),
    height: z.number().optional().describe('Video height'),
  }),
  execute: async ({ channelUsername, videoUrl, caption, parseMode = 'Markdown', duration, width, height }) => {
    try {
      const chatId = await getChannelIdentifier(channelUsername);
      
      const body: Record<string, unknown> = {
        chat_id: chatId,
        video: videoUrl,
      };
      
      if (caption) {
        body.caption = caption;
        if (parseMode !== 'none') {
          body.parse_mode = parseMode;
        }
      }
      
      if (duration) body.duration = duration;
      if (width) body.width = width;
      if (height) body.height = height;
      
      const result = await sendTelegramRequest('sendVideo', body);
      
      if (!result.ok) {
        return {
          success: false,
          error: result.description || 'Failed to publish video',
        };
      }
      
      // Update chat_id if we got it
      const messageData = result.result as { chat?: { id?: number } } | undefined;
      if (messageData?.chat?.id && channelUsername.startsWith('@')) {
        await updateChannelChatId(channelUsername, messageData.chat.id.toString());
      }
      
      console.log('✅ [Telegram] Video published to:', channelUsername);
      
      return {
        success: true,
        message: 'Video published successfully to Telegram channel',
        channelUsername,
      };
    } catch (error) {
      console.error('❌ [Telegram] Error publishing video:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool 4: Get Telegram channel information
 */
const telegramGetChannelInfo = tool({
  description: `Get information about a Telegram channel, including:
  - Channel title
  - Number of subscribers
  - Channel description
  - Channel type
  
  The bot must be an administrator of the channel to retrieve this information.
  
  Use this to:
  - Verify channel access
  - Check subscriber count
  - Confirm channel details before publishing`,
  inputSchema: z.object({
    channelUsername: z.string().describe('Channel username (e.g., @mychannel) or numeric chat_id'),
  }),
  execute: async ({ channelUsername }) => {
    try {
      const chatId = await getChannelIdentifier(channelUsername);
      
      const result = await sendTelegramRequest('getChat', {
        chat_id: chatId,
      });
      
      if (!result.ok) {
        return {
          success: false,
          error: result.description || 'Failed to get channel info',
        };
      }
      
      const chatData = result.result as {
        id?: number;
        title?: string;
        username?: string;
        type?: string;
        description?: string;
        member_count?: number;
      };
      
      // Update chat_id if we got it
      if (chatData.id && channelUsername.startsWith('@')) {
        await updateChannelChatId(channelUsername, chatData.id.toString());
      }
      
      console.log('✅ [Telegram] Channel info retrieved:', channelUsername);
      
      return {
        success: true,
        channelInfo: {
          id: chatData.id,
          title: chatData.title,
          username: chatData.username,
          type: chatData.type,
          description: chatData.description,
          memberCount: chatData.member_count,
        },
      };
    } catch (error) {
      console.error('❌ [Telegram] Error getting channel info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Export all Telegram channel tools with request context
 */
export const telegramChannelTools = ensureToolsHaveRequestContext([
  telegramPublishMessage,
  telegramPublishPhoto,
  telegramPublishVideo,
  telegramGetChannelInfo,
]);
