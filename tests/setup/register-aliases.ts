import Module from 'node:module'
import path from 'node:path'

type ResolveHook = (request: string, parent: NodeModule | null, isMain: boolean, options?: any) => string

const moduleExports = Module as typeof Module & { _resolveFilename: ResolveHook }
const originalResolve = moduleExports._resolveFilename.bind(Module) as ResolveHook

const aliasMap: Record<string, string> = {
  '@/lib/prompts': path.resolve(__dirname, '../stubs/lib/prompts'),
  '@/lib/logger': path.resolve(__dirname, '../stubs/lib/logger'),
  '@/lib/tools/delegation': path.resolve(__dirname, '../stubs/lib/tools/delegation'),
  '@supabase/supabase-js': path.resolve(__dirname, '../stubs/supabase-js'),
  '@langchain/core/messages': path.resolve(__dirname, '../stubs/langchain/messages')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test'
}

moduleExports._resolveFilename = function (request: string, parent: NodeModule | null, isMain: boolean, options?: any) {
  const mapped = aliasMap[request]
  if (mapped) {
    request = mapped
  }
  return originalResolve(request, parent, isMain, options)
}
