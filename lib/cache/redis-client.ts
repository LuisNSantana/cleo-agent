import { createHash } from 'crypto'

// Lazy singletons to avoid re-creating clients across hot reloads
let upstashClient: any | null = null
let ioRedisClient: any | null = null

export type RedisMode = 'disabled' | 'upstash' | 'redis-url'

export interface RedisL2Cache {
  mode: RedisMode
  enabled: boolean
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * Returns a simple L2 cache backed by Redis (Upstash REST or standard Redis URL).
 * If ENABLE_REDIS_CACHE is not 'true' or no credentials are present, returns a disabled cache.
 */
export function getRedisL2(): RedisL2Cache {
  const enabled = process.env.ENABLE_REDIS_CACHE === 'true'
  if (!enabled) {
    return {
      mode: 'disabled',
      enabled: false,
      async get() { return null },
      async set() { /* noop */ }
    }
  }

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
  const redisUrl = process.env.REDIS_URL

  // Prefer Upstash for serverless
  if (upstashUrl && upstashToken) {
    if (!upstashClient) {
      // Dynamic import to avoid bundling for edge/client
      const { Redis } = require('@upstash/redis') as typeof import('@upstash/redis')
      upstashClient = new Redis({ url: upstashUrl, token: upstashToken })
    }
    return {
      mode: 'upstash',
      enabled: true,
      async get(key: string) {
        try {
          // Namespacing + hashed key to keep keys short and safe
          const k = `cleo:v1:${sha256(key)}`
          const v = await upstashClient.get(k)
          return (typeof v === 'string' ? v : v ?? null)
        } catch {
          return null
        }
      },
      async set(key: string, value: string, ttlSeconds: number) {
        try {
          const k = `cleo:v1:${sha256(key)}`
          await upstashClient.set(k, value, { ex: ttlSeconds })
        } catch {
          // swallow errors: cache must never break request path
        }
      }
    }
  }

  if (redisUrl) {
    if (!ioRedisClient) {
      // Defer require to runtime and avoid type dependency in environments without ioredis
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const IORedis = require('ioredis')
      ioRedisClient = new IORedis(redisUrl, {
        maxRetriesPerRequest: 2,
        enableAutoPipelining: true,
        // If using rediss, accept default TLS
      })
    }
    return {
      mode: 'redis-url',
      enabled: true,
      async get(key: string) {
        try {
          const k = `cleo:v1:${sha256(key)}`
          const v = await ioRedisClient.get(k)
          return v
        } catch {
          return null
        }
      },
      async set(key: string, value: string, ttlSeconds: number) {
        try {
          const k = `cleo:v1:${sha256(key)}`
          await ioRedisClient.set(k, value, 'EX', ttlSeconds)
        } catch {
          // ignore
        }
      }
    }
  }

  // No credentials -> disabled
  return {
    mode: 'disabled',
    enabled: false,
    async get() { return null },
    async set() {}
  }
}

export function hashKeyRaw(s: string) { return sha256(s) }
import crypto from 'crypto'

// Minimal, unified Redis client that supports either:
// - Standard Redis (REDIS_URL)
// - Upstash REST (@upstash/redis) when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are present

type RedisLike = {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, opts?: { ex?: number }) => Promise<'OK' | null>
}

let singleton: { client: RedisLike | null; mode: 'node-redis' | 'upstash' | null } = {
  client: null,
  mode: null,
}

export function redisEnabled(): boolean {
  if (process.env.ENABLE_REDIS_CACHE !== 'true') return false
  const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
  const hasRedisUrl = !!process.env.REDIS_URL
  return hasUpstash || hasRedisUrl
}

export async function getRedis(): Promise<RedisLike | null> {
  if (!redisEnabled()) return null
  if (singleton.client) return singleton.client

  const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
  if (hasUpstash) {
    // Lazy import to avoid bundling when unused
    const { Redis } = await import('@upstash/redis')
    const upstash = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    const client: RedisLike = {
      async get(key: string) {
        const res = await upstash.get(key)
        // SDK returns null when not found. Coerce non-string primitives/objects to string for consistency.
        if (res == null) return null
        if (typeof res === 'string') return res
        if (typeof res === 'number' || typeof res === 'boolean') return String(res)
        try { return JSON.stringify(res) } catch { return null }
      },
      async set(key: string, value: string, opts?: { ex?: number }) {
        if (opts?.ex) {
          await upstash.set(key, value, { ex: opts.ex })
        } else {
          await upstash.set(key, value)
        }
        return 'OK'
      },
    }
    singleton = { client, mode: 'upstash' }
    return client
  }

  const hasRedisUrl = !!process.env.REDIS_URL
  if (hasRedisUrl) {
    const { createClient } = await import('redis')
    const nodeClient = createClient({ url: process.env.REDIS_URL })
    // Avoid unhandled rejections in serverless logs
    nodeClient.on('error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[Redis] client error', msg)
    })
    if (!nodeClient.isOpen) {
      await nodeClient.connect()
    }
    const client: RedisLike = {
      async get(key: string) {
        return (await nodeClient.get(key)) as string | null
      },
      async set(key: string, value: string, opts?: { ex?: number }) {
        if (opts?.ex) {
          await nodeClient.set(key, value, { EX: opts.ex })
        } else {
          await nodeClient.set(key, value)
        }
        return 'OK'
      },
    }
    singleton = { client, mode: 'node-redis' }
    return client
  }

  return null
}

export function hashKey(parts: Array<string | number | boolean | null | undefined>): string {
  const s = parts.map((p) => (p === undefined ? 'u' : p === null ? 'n' : String(p))).join('|')
  return crypto.createHash('sha256').update(s).digest('hex')
}

export async function redisGetJSON<T>(key: string): Promise<T | null> {
  try {
    const r = await getRedis()
    if (!r) return null
    const raw = await r.get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    // Fail silently to not impact request latency
    return null
  }
}

export async function redisSetJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  try {
    const r = await getRedis()
    if (!r) return
    const payload = JSON.stringify(value)
    await r.set(key, payload, ttlSeconds ? { ex: ttlSeconds } : undefined)
  } catch {
    // Ignore errors (best-effort cache)
  }
}
