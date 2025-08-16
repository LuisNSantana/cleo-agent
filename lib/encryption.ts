import "server-only"
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
  const [encrypted, authTagHex] = (encryptedData || '').split(":")
  if (!encrypted || !authTagHex || !ivHex) {
    throw new Error('Invalid encrypted payload for decryptKey')
  }
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

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
