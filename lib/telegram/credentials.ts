/**
 * Telegram Bot API Credentials Management
 * 
 * Manages Telegram bot authentication and channel access.
 * Simple architecture with ONE global bot:
 * - Admin creates ONE bot via @BotFather
 * - Bot token stored in .env (TELEGRAM_BOT_TOKEN)
 * - Users create their channels
 * - Users add the bot as admin to their channels
 * - Jenn publishes to any channel where bot is admin
 * - Each user's channels stored in telegram_channels table
 */

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserId } from '@/lib/server/request-context';

/**
 * Telegram channel configuration stored in database
 */
export interface TelegramChannel {
  id: string;
  user_id: string;
  channel_username: string; // @mychannel or chat_id
  channel_name: string;
  chat_id: string | null; // Numeric chat ID (obtained after first publish)
  member_count: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get the global Telegram bot token from environment
 * One bot serves all users - simple and effective for broadcasting
 */
export function getTelegramBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN is not configured. Please set it in your environment variables. ' +
      'Get your token from @BotFather in Telegram.'
    );
  }
  
  return token;
}

/**
 * Get all Telegram channels configured by the current user
 */
export async function getUserTelegramChannels(): Promise<TelegramChannel[]> {
  const userId = getCurrentUserId();
  
  if (!userId) {
    throw new Error('User authentication required to access Telegram channels');
  }
  
  const supabase = await createClient();
  
  if (!supabase) {
    throw new Error('Database connection not available');
  }
  
  const { data, error } = await supabase
    .from('telegram_channels')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ [Telegram] Error fetching channels:', error);
    throw new Error(`Failed to fetch Telegram channels: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get a specific Telegram channel by username
 */
export async function getTelegramChannelByUsername(
  channelUsername: string
): Promise<TelegramChannel | null> {
  const userId = getCurrentUserId();
  
  if (!userId) {
    throw new Error('User authentication required');
  }
  
  // Normalize channel username (ensure it starts with @)
  const normalizedUsername = channelUsername.startsWith('@') 
    ? channelUsername 
    : `@${channelUsername}`;
  
  const supabase = await createClient();
  
  if (!supabase) {
    throw new Error('Database connection not available');
  }
  
  const { data, error } = await supabase
    .from('telegram_channels')
    .select('*')
    .eq('user_id', userId)
    .eq('channel_username', normalizedUsername)
    .eq('is_active', true)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('❌ [Telegram] Error fetching channel:', error);
    throw new Error(`Failed to fetch Telegram channel: ${error.message}`);
  }
  
  return data;
}

/**
 * Add a new Telegram channel for the current user
 */
export async function addTelegramChannel(
  channelUsername: string,
  channelName: string
): Promise<TelegramChannel> {
  const userId = getCurrentUserId();
  
  if (!userId) {
    throw new Error('User authentication required');
  }
  
  // Normalize channel username
  const normalizedUsername = channelUsername.startsWith('@') 
    ? channelUsername 
    : `@${channelUsername}`;
  
  const supabase = await createClient();
  
  if (!supabase) {
    throw new Error('Database connection not available');
  }
  
  // Check if channel already exists
  const existing = await getTelegramChannelByUsername(normalizedUsername);
  if (existing) {
    console.log('📱 [Telegram] Channel already exists, returning existing');
    return existing;
  }
  
  const { data, error } = await supabase
    .from('telegram_channels')
    .insert({
      user_id: userId,
      channel_username: normalizedUsername,
      channel_name: channelName,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ [Telegram] Error adding channel:', error);
    throw new Error(`Failed to add Telegram channel: ${error.message}`);
  }
  
  console.log('✅ [Telegram] Channel added successfully:', normalizedUsername);
  return data;
}

/**
 * Update channel's chat_id after first successful publish
 * This numeric ID is more reliable than username for future publishes
 */
export async function updateChannelChatId(
  channelUsername: string,
  chatId: string
): Promise<void> {
  const userId = getCurrentUserId();
  
  if (!userId) {
    throw new Error('User authentication required');
  }
  
  const supabase = await createClient();
  
  if (!supabase) {
    console.error('❌ [Telegram] Database connection not available for chat_id update');
    return; // Don't throw - this is not critical
  }
  
  const { error } = await supabase
    .from('telegram_channels')
    .update({ chat_id: chatId })
    .eq('user_id', userId)
    .eq('channel_username', channelUsername);
  
  if (error) {
    console.error('❌ [Telegram] Error updating chat_id:', error);
    // Don't throw - this is not critical
  } else {
    console.log('✅ [Telegram] Updated chat_id for channel:', channelUsername);
  }
}

/**
 * Remove a Telegram channel (soft delete)
 */
export async function removeTelegramChannel(
  channelUsername: string
): Promise<void> {
  const userId = getCurrentUserId();
  
  if (!userId) {
    throw new Error('User authentication required');
  }
  
  const supabase = await createClient();
  
  if (!supabase) {
    throw new Error('Database connection not available');
  }
  
  const { error } = await supabase
    .from('telegram_channels')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('channel_username', channelUsername);
  
  if (error) {
    console.error('❌ [Telegram] Error removing channel:', error);
    throw new Error(`Failed to remove Telegram channel: ${error.message}`);
  }
  
  console.log('✅ [Telegram] Channel removed:', channelUsername);
}

/**
 * Validate that the bot has admin access to a channel
 * This is done by attempting to get channel info
 */
export async function validateBotAccess(
  channelUsername: string
): Promise<{ valid: boolean; chatId?: string; memberCount?: number; error?: string }> {
  try {
    const botToken = await getTelegramBotToken();
    
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=${channelUsername}`,
      { method: 'GET' }
    );
    
    const result = await response.json();
    
    if (!result.ok) {
      return {
        valid: false,
        error: result.description || 'Unknown error'
      };
    }
    
    // Check if bot is admin
    const botUserId = getBotUserIdFromToken(botToken);
    const adminResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelUsername}&user_id=${botUserId}`,
      { method: 'GET' }
    );
    
    const adminResult = await adminResponse.json();
    
    if (!adminResult.ok || !['creator', 'administrator'].includes(adminResult.result?.status)) {
      return {
        valid: false,
        error: 'Bot is not an administrator of this channel. Please add the bot as admin with "Post Messages" permission.'
      };
    }
    
    return {
      valid: true,
      chatId: result.result.id?.toString(),
      memberCount: result.result.member_count
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate bot access'
    };
  }
}

/**
 * Get the bot's user ID from token (needed for admin checks)
 * Bot ID is the first part before the colon in the token
 */
function getBotUserIdFromToken(token: string): number {
  const botId = parseInt(token.split(':')[0]);
  
  if (isNaN(botId)) {
    throw new Error('Invalid bot token format');
  }
  
  return botId;
}
