import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'
import type { BaseMessage } from '@langchain/core/messages'
import { tools as appTools } from '@/lib/tools'

type AppTool = {
  description?: string
  inputSchema?: z.ZodTypeAny
  execute: (args: any) => Promise<any>
}

export type ToolRuntime = {
  lcTools: DynamicStructuredTool[]
  run: (name: string, args: any) => Promise<string>
  names: string[]
}

/**
 * Build LangChain-compatible tools from the app's tool registry.
 */
export function buildToolRuntime(selected?: string[]): ToolRuntime {
  console.log(`🔧 buildToolRuntime called with selected:`, selected)
  
  const entries = Object.entries(appTools) as Array<[string, AppTool]>
  console.log(`📦 Available app tools:`, entries.map(([name]) => name))
  
  const filtered = selected ? entries.filter(([name]) => selected.includes(name)) : entries
  console.log(`🔍 Filtered tools:`, filtered.map(([name]) => name))

  const toolMap = new Map<string, AppTool>()
  const lcTools: DynamicStructuredTool[] = filtered.map(([name, t]) => {
    console.log(`🔧 Creating LangChain tool for ${name}`)
    toolMap.set(name, t)
    const schema = (t as any).inputSchema as z.ZodTypeAny | undefined
    return new DynamicStructuredTool({
      name,
      description: t.description || `Tool: ${name}`,
      schema: schema || z.object({}).strict(),
      func: async (input: any) => {
        console.log(`🚀 Executing tool ${name} with input:`, input)
        const startTime = Date.now()
        try {
          const out = await t.execute(input ?? {})
          const executionTime = Date.now() - startTime
          console.log(`✅ Tool ${name} completed in ${executionTime}ms`)
          // Return compact JSON for the tool result
          try { return JSON.stringify(out).slice(0, 8000) } catch { return String(out) }
        } catch (error) {
          const executionTime = Date.now() - startTime
          console.error(`❌ Tool ${name} failed after ${executionTime}ms:`, error)
          throw error
        }
      }
    })
  })

  console.log(`✅ Built ${lcTools.length} LangChain tools:`, lcTools.map(t => t.name))

  return {
    lcTools,
    names: lcTools.map(t => t.name),
    run: async (name: string, args: any) => {
      const impl = toolMap.get(name)
      if (!impl) throw new Error(`Unknown tool: ${name}`)
      const out = await impl.execute(args ?? {})
      try { return JSON.stringify(out).slice(0, 8000) } catch { return String(out) }
    }
  }
}
