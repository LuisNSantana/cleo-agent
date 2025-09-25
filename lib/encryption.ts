
import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"

function getKey(): Uint8Array {
  const env = process.env.ENCRYPTION_KEY
  if (!env) {
    throw new Error("ENCRYPTION_KEY is required")
  }
  const k = Buffer.from(env, "base64")
  if (k.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes long")
  }
  return k
}

export function encryptKey(plaintext: string): {
  encrypted: string
  iv: string
} {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()
  const encryptedWithTag = encrypted + ":" + authTag.toString("hex")

  return {
    encrypted: encryptedWithTag,
    iv: iv.toString("hex"),
  }
}

export function decryptKey(encryptedData: string, ivHex: string): string {
  // Removed verbose debug logging to avoid leaking sensitive details

  const rawParts = (encryptedData || '').split(":")
  const parts = rawParts.filter(p => p !== undefined && p !== null && p !== '')
  // Intentionally silent
  let encrypted = ''
  let authTagHex = ''
  let actualIvHex = ''

  if (parts.length === 3) {
    // Format: encrypted:authTag:iv
    ;[encrypted, authTagHex, actualIvHex] = parts
  } else if (parts.length === 2) {
    // Format: encrypted:authTag with IV provided separately
    ;[encrypted, authTagHex] = parts
    actualIvHex = ivHex || ''
  } else if (parts.length > 3) {
    // Defensive: if somehow there are extra colons, assume last is iv, previous is tag, rest is encrypted
    actualIvHex = parts.pop() || ''
    authTagHex = parts.pop() || ''
    encrypted = parts.join(':')
  } else {
    // Not enough parts to proceed
    console.error('🚨 Decryption failed - unexpected payload structure:', {
      parts_count: parts.length,
      full_payload: encryptedData
    })
    throw new Error('Invalid encrypted payload for decryptKey')
  }

  if (!encrypted || !authTagHex || !actualIvHex) {
    console.error('🚨 Decryption failed - missing parts:', {
      has_encrypted: !!encrypted,
      has_authTag: !!authTagHex,
      has_iv: !!actualIvHex,
      iv_from_param: !!ivHex,
      iv_from_payload: parts.length >= 3,
      full_payload: encryptedData
    })
    throw new Error('Invalid encrypted payload for decryptKey')
  }

  const trimmedIvHex = (actualIvHex || '').trim()
  const trimmedTagHex = (authTagHex || '').trim()
  if (!/^[0-9a-fA-F]+$/.test(trimmedIvHex) || trimmedIvHex.length % 2 !== 0) {
    console.error('🚨 Decryption failed - IV not valid hex:', {
      iv_length: trimmedIvHex.length,
      iv_preview: trimmedIvHex.substring(0, 8) + '...'
    })
    throw new Error('Invalid IV format')
  }
  if (!/^[0-9a-fA-F]+$/.test(trimmedTagHex) || trimmedTagHex.length % 2 !== 0) {
    console.error('🚨 Decryption failed - AuthTag not valid hex:', {
      tag_length: trimmedTagHex.length,
      tag_preview: trimmedTagHex.substring(0, 8) + '...'
    })
    throw new Error('Invalid auth tag format')
  }

  const iv = Buffer.from(trimmedIvHex, "hex")
  const authTag = Buffer.from(trimmedTagHex, "hex")

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)

  try {
    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  } catch {
    // Common with AES-GCM when key/iv/tag don't match (rotated key or corrupted data)
    throw new Error(
      "Unsupported state or unable to authenticate data: likely ENCRYPTION_KEY changed/rotated, IV mismatch, or corrupted ciphertext. Re-save the provider API key in Settings to re-encrypt with the current ENCRYPTION_KEY."
    )
  }
}

export function maskKey(key: string): string {
  if (key.length <= 8) {
    return "*".repeat(key.length)
  }
  return key.slice(0, 4) + "*".repeat(key.length - 8) + key.slice(-4)
}
