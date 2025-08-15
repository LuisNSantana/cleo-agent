// Minimal Node shims to satisfy TS when @types/node is unavailable in certain tools.
// Safe alongside full @types/node due to compatible declarations.

declare module "crypto" {
  export function createCipheriv(algorithm: string, key: any, iv: any): any
  export function createDecipheriv(algorithm: string, key: any, iv: any): any
  export function randomBytes(size: number): any
}

declare module "node:crypto" {
  export function createCipheriv(algorithm: string, key: any, iv: any): any
  export function createDecipheriv(algorithm: string, key: any, iv: any): any
  export function randomBytes(size: number): any
}

declare var Buffer: {
  from(input: any, encoding?: string): any
}

declare var process: {
  env: Record<string, string | undefined>
  uptime: () => number
  [key: string]: any
}
