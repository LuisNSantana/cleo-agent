/**
 * Telegram OAuth Helpers
 * 
 * Implements Telegram Login Widget authentication flow:
 * 1. User clicks Telegram Login button (widget)
 * 2. Telegram redirects to callback with user data
 * 3. Verify auth data using bot token
 * 4. Store user connection in database
 * 
 * Based on Telegram Login Widget documentation:
 * https://core.telegram.org/widgets/login
 */

import crypto from 'crypto'

export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

/**
 * Verify Telegram auth data
 * 
 * Algorithm from Telegram docs:
 * 1. Create data-check-string by concatenating all fields except hash
 * 2. Create secret_key = SHA256(bot_token)
 * 3. Create hash = HMAC-SHA256(data-check-string, secret_key)
 * 4. Compare computed hash with received hash
 */
export function verifyTelegramAuth(authData: TelegramAuthData, botToken: string): boolean {
  const { hash, ...data } = authData

  // Create data-check-string
  const dataCheckString = Object.keys(data)
    .sort()
    .map(k => `${k}=${(data as any)[k]}`)
    .join('\n')

  // Create secret key
  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  // Create hash
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  // Compare hashes
  return computedHash === hash
}

/**
 * Check if auth data is still valid (not older than 24 hours)
 */
export function isTelegramAuthValid(authData: TelegramAuthData): boolean {
  const authAge = Date.now() / 1000 - authData.auth_date
  const maxAge = 86400 // 24 hours in seconds
  
  return authAge < maxAge
}

/**
 * Format user info for storage
 */
export function formatTelegramUserInfo(authData: TelegramAuthData) {
  return {
    telegramId: authData.id.toString(),
    firstName: authData.first_name,
    lastName: authData.last_name,
    username: authData.username,
    photoUrl: authData.photo_url,
    authDate: authData.auth_date
  }
}
