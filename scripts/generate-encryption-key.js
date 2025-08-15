#!/usr/bin/env node
// Generates a 32-byte base64 encryption key suitable for AES-256-GCM.
// Usage:
//   pnpm gen:key              -> prints base64 key
//   pnpm gen:key --env        -> prints 'ENCRYPTION_KEY=...'

const crypto = require('crypto')

function generate() {
  return crypto.randomBytes(32).toString('base64')
}

const key = generate()
if (process.argv.includes('--env')) {
  process.stdout.write(`ENCRYPTION_KEY=${key}`)
} else {
  process.stdout.write(key)
}
process.stdout.write('\n')
