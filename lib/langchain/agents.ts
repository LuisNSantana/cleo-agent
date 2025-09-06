/**
 * Specialized Agents for Multi-Model Orchestration
 * 
 * Each agent is optimized for specific model capabilities:
 * - GroqAgent: Fast text processing and function calling
 * - OpenAIAgent: High-quality multimodal analysis
 */

import { ChatGroq } from '@langchain/groq'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, ToolMessage, AIMessage } from '@langchain/core/messages'
import { TaskInput, TaskOutput, ModelConfig } from './types'
import { getCleoPrompt, sanitizeModelName } from '@/lib/prompts'
import { retrieveRelevant, buildContextBlock } from '@/lib/rag/retrieve'
import { buildToolRuntime } from './tooling'

export abstract class BaseAgent {
  protected model: any
  protected config: ModelConfig

  constructor(config: ModelConfig) {
    this.config = config
    this.initializeModel()
  }

  abstract initializeModel(): void
  abstract process(input: TaskInput): Promise<TaskOutput>

  protected calculateCost(inputTokens: number, outputTokens: number): number {
    // Simplified cost calculation - can be enhanced later
    const inputCost = inputTokens * 0.0000001  // $0.0001 per 1K tokens
    const outputCost = outputTokens * 0.0000003 // $0.0003 per 1K tokens
    return inputCost + outputCost
  }
}

// --- Helper utilities for robust tool-call handling ---
function decodeHtmlEntities(str: string): string {
  if (!str) return str
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

function safeJsonParse<T = any>(raw: string): T | null {
  try {
    return JSON.parse(raw)
  } catch (_) {
    try {
      return JSON.parse(decodeHtmlEntities(raw))
    } catch (_) {
      return null
    }
  }
}

function parseToolCallFromText(rawInput: string): { name: string; args: any } | null {
  if (!rawInput) return null
  const raw = rawInput.trim()
  // Pattern 1: <function name> {json} </function>
  const tag = raw.match(/<function\s*=?\s*([\w\-:.]+)?[^>]*>([\s\S]*?)<\/function>/i)
  if (tag) {
    const [, maybeName, inner] = tag
    const parsed = safeJsonParse((inner || '').trim())
    if (parsed && maybeName) return { name: maybeName, args: parsed }
  }
  // Pattern 2a: <function=weather>{...}</function>
  const eqOpen = raw.match(/<function\s*=\s*([\w\-:.]+)\s*>([\s\S]*?)<\/function>/i)
  if (eqOpen) {
    const [, name, json] = eqOpen
    const parsed = safeJsonParse(json)
    return { name, args: parsed ?? { raw: json } }
  }
  // Pattern 2a-alt: <function=weather{...}></function> (no '>' after name)
  const eqOpenNoGt = raw.match(/<function\s*=\s*([\w\-:.]+)\s*(\{[\s\S]*?\})\s*<\/function>/i)
  if (eqOpenNoGt) {
    const [, name, json] = eqOpenNoGt
    const parsed = safeJsonParse(json)
    return { name, args: parsed ?? { raw: json } }
  }
  // Pattern 2b: <function=weather {...}>
  const eqOpenArgs = raw.match(/<function\s*=\s*([\w\-:.]+)\s*(\{[\s\S]*?\})\s*>/i)
  if (eqOpenArgs) {
    const [, name, json] = eqOpenArgs
    const parsed = safeJsonParse(json)
    return { name, args: parsed ?? { raw: json } }
  }
  // Pattern 2b-alt2: <function=weather{...}> (no space before json)
  const eqOpenArgsNoSpace = raw.match(/<function\s*=\s*([\w\-:.]+)(\{[\s\S]*?\})\s*>/i)
  if (eqOpenArgsNoSpace) {
    const [, name, json] = eqOpenArgsNoSpace
    const parsed = safeJsonParse(json)
    return { name, args: parsed ?? { raw: json } }
  }
  // Pattern 2c-alt: <function=weather{...}> with no closing tag at end of string
  const eqNoClose = raw.match(/<function\s*=\s*([\w\-:.]+)\s*(\{[\s\S]*\})\s*$/i)
  if (eqNoClose) {
    const [, name, json] = eqNoClose
    const parsed = safeJsonParse(json)
    return { name, args: parsed ?? { raw: json } }
  }
  // Pattern 2c: <function name=weather>{...}</function>
  const nameBody = raw.match(/<function[^>]*name\s*=\s*\"?([\w\-:.]+)\"?[^>]*>([\s\S]*?)<\/function>/i)
  if (nameBody) {
    const [, name, json] = nameBody
    const parsed = safeJsonParse((json || '').trim())
    if (parsed) return { name, args: parsed }
  }
  // Pattern 3: CALL_TOOL(weather, {...})
  const callFunc = raw.match(/CALL_TOOL\(([^,\s)]+)\s*,\s*(\{[\s\S]*\})\s*\)/i)
  if (callFunc) {
    const [, name, json] = callFunc
    const parsed = safeJsonParse(json)
    return { name: name.replace(/['"]/g, ''), args: parsed ?? { raw: json } }
  }
  // Pattern 4: {"tool_name":"weather","arguments":{...}}
  const jsonMatch = safeJsonParse<{ tool_name?: string; arguments?: any; name?: string; args?: any }>(raw)
  if (jsonMatch && (jsonMatch.tool_name || jsonMatch.name)) {
    return { name: (jsonMatch.tool_name || jsonMatch.name)!, args: jsonMatch.arguments ?? jsonMatch.args ?? {} }
  }
  return null
}

function renderToolResultReadable(toolName: string | null, resultStr: string): string {
  const name = (toolName || 'tool').toString()
  const parsed = safeJsonParse<any>(resultStr)
  if (parsed && typeof parsed === 'object') {
  // Pretty print Shopify products
    if (name === 'shopifyGetProducts' && parsed.success && Array.isArray(parsed.products)) {
      const page = parsed.page || 1
      const pageSize = parsed.pageSize || parsed.products.length
      const total = parsed.count || parsed.products.length
      const pageCount = parsed.pageCount || 1
      const active = parsed.products.filter((p: any) => p.status === 'active')
      const draft = parsed.products.filter((p: any) => p.status === 'draft')
      const archived = parsed.products.filter((p: any) => p.status === 'archived')

      const fmt = (arr: any[]) => arr.map((p: any, i: number) => `
${i + 1}. ${p.title}
   • Price: ${p.price}
   • Inventory: ${p.inventory_quantity ?? 0}
   • Status: ${p.status.charAt(0).toUpperCase() + p.status.slice(1)}
`).join('')

      const storeLine = parsed.store_url ? `Store: ${parsed.store_url}\n\n` : ''
      let out = `${storeLine}Here are the products (page ${page}/${pageCount}):\n\n`
      if (active.length) out += `## Active Products\n${fmt(active)}\n`
      if (draft.length) out += `## Draft Products\n${fmt(draft)}\n`
      if (archived.length) out += `## Archived Products\n${fmt(archived)}\n`

      // Quick insights
      const lowStock = parsed.products.filter((p: any) => (p.inventory_quantity ?? 0) <= 1)
      if (lowStock.length) {
        out += `\n### Insights\n- Some products have low inventory (≤ 1). Consider restocking.\n`
      }

      if (parsed.ui_hint?.suggestFollowUp) {
        out += `\nWould you like me to list more products? I can show page ${page + 1} (another ${pageSize}).`
      }
      return out.trim()
    }
    // Confirmation flow for Shopify write ops
    if (name === 'shopifyUpdateProductPrice' && parsed.success) {
      if (parsed.require_confirmation) {
        const title = parsed.preview?.title || parsed.product?.title || 'product'
        const variantTitle = parsed.variant?.title ? ` (variant: ${parsed.variant.title})` : ''
        const current = parsed.variant?.current_price
        const next = parsed.new_price
        const img = parsed.preview?.image?.src
        let out = `Store: ${parsed.store_url || parsed.store_domain}

You are about to change the price of "${title}"${variantTitle} from ${current} to ${next}.
Type "confirm" to proceed or "cancel" to abort.`
        if (img) out += `

Image: ${img}`
        return out
      }
      if (parsed.updated) {
        const title = parsed.product?.title || 'product'
        const price = parsed.variant?.new_price
        return `Store: ${parsed.store_url || parsed.store_domain}

Price for "${title}" was updated successfully to ${price}.`
      }
      // Fallback stringify
      try { return JSON.stringify(parsed) } catch { /* ignore */ }
    }
    // Weather pretty print
    if (name === 'weather') {
      const loc = parsed.location || parsed.city || parsed.place || 'ubicación'
      const temp = parsed.temperature
      const unit = parsed.unit === 'fahrenheit' ? '°F' : '°C'
      const cond = parsed.condition ? `, ${parsed.condition}` : ''
      if (typeof temp === 'number') {
        return `Clima en ${loc}: ${temp}${unit}${cond}.`;
      }
    }
    // Calculator
    if (name === 'calculator' && parsed.result !== undefined) {
      return `Resultado: ${parsed.result}`
    }
    // Time
    if (name === 'time' && parsed.currentTime) {
      return `Hora actual (${parsed.timezone}): ${parsed.currentTime}`
    }
    // Fallback generic stringify
    try { return JSON.stringify(parsed) } catch { /* ignore */ }
  }
  return typeof resultStr === 'string' ? resultStr : String(resultStr)
}

export class GroqAgent extends BaseAgent {
  initializeModel(): void {
    console.log('🤖 Initializing GroqAgent with model:', this.config.name)
    
    this.model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile', // Use a valid Groq model
      temperature: 0.7,
      maxTokens: 4096,
    })
    
    console.log('✅ GroqAgent initialized successfully')
  }

  async process(input: TaskInput): Promise<TaskOutput> {
    const startTime = Date.now()
    console.log('🚀 GroqAgent processing task:', {
      type: input.type,
      contentLength: input.content.length,
      hasMetadata: !!input.metadata,
      useRAG: Boolean(input.metadata?.useRAG),
    })

    try {
      // Build Cleo system prompt with existing helper
      const sysPromptBase = input.metadata?.systemPromptOverride ||
        getCleoPrompt(sanitizeModelName(this.config.name), input.metadata?.systemPromptVariant || 'default')
      // Keep response language aligned with user input
      const langHint = /[ñáéíóúü]|\b(gracias|hola|por favor|necesito|quiero)\b/i.test(input.content)
        ? 'Responde en el mismo idioma del usuario (español) salvo que se solicite explícitamente otro.'
        : 'Respond in the same language as the user (English) unless another is explicitly requested.'
      const toolHint = (input as any).metadata?.enableTools
        ? '\nTOOL USE: If the user asks for real-time info (weather, prices) or actions (search, calendar, docs, email), prefer calling available tools instead of guessing.'
        : ''
      const sysPrompt = `${sysPromptBase}\n\n${langHint}${toolHint}`

      // Optionally fetch RAG context
      let finalUserContent = input.content
      if (input.metadata?.useRAG && input.metadata?.userId) {
        try {
          const chunks = await retrieveRelevant({
            userId: input.metadata.userId,
            query: input.content,
            documentId: input.metadata.documentId,
            projectId: input.metadata.projectId,
            maxContextChars: input.metadata.maxContextChars ?? 6000,
            useHybrid: true,
            useReranking: true,
          })
          const ctx = buildContextBlock(chunks, input.metadata.maxContextChars ?? 6000)
          if (ctx && ctx.trim().length > 0) {
            finalUserContent = `${ctx}\n\nUSER QUESTION:\n${input.content}`
          }
        } catch (e) {
          console.warn('[GroqAgent] RAG retrieval failed, proceeding without context:', (e as any)?.message || e)
        }
      }

  console.log('[GroqAgent] systemPrompt length:', sysPrompt.length, 'override:', Boolean(input.metadata?.systemPromptOverride))
      // Build base messages
      const messages = [
        new SystemMessage({ content: sysPrompt }),
        new HumanMessage({ content: finalUserContent })
      ]
      let response: AIMessage
      let lastToolResult: string | null = null
      let lastToolName: string | null = null
      const toolInvocations: Array<{ toolCallId: string; toolName: string; args?: any; result?: any }> = []
      const toolsEnabled = Boolean((input.metadata as any)?.enableTools)
      if (toolsEnabled) {
        const runtime = buildToolRuntime((input.metadata as any)?.allowedTools)
        const modelWithTools = (this.model as any).bindTools
          ? (this.model as any).bindTools(runtime.lcTools)
          : (this.model as any).bind({ tools: runtime.lcTools })
        console.log('🛠️ GroqAgent tools bound:', runtime.names)
        let ai = await modelWithTools.invoke(messages)
        let steps = 0
        while ((ai as any).tool_calls && (ai as any).tool_calls.length && steps < 2) {
          // Push assistant with tool_calls first to satisfy provider validation
          messages.push(ai)
          for (const call of (ai as any).tool_calls) {
            try {
              const toolResult = await runtime.run(call.name, call.args)
              lastToolResult = toolResult
              lastToolName = call.name
              messages.push(new ToolMessage({ content: toolResult, tool_call_id: call.id }))
              toolInvocations.push({ toolCallId: call.id, toolName: call.name, args: call.args, result: safeJsonParse(toolResult) ?? toolResult })
            } catch (err: any) {
              messages.push(new ToolMessage({ content: `Tool ${call.name} failed: ${err?.message || String(err)}`, tool_call_id: call.id }))
            }
          }
          ai = await modelWithTools.invoke(messages)
          steps++
        }
        if ((!(ai as any).tool_calls || !(ai as any).tool_calls.length) && steps < 2) {
          const text = Array.isArray(ai.content)
            ? ai.content.map((p: any) => (typeof p === 'string' ? p : (p?.text ?? ''))).join('')
            : String(ai.content ?? '')
          const parsed = parseToolCallFromText(text)
          if (parsed && runtime.names.includes(parsed.name)) {
            console.log(`[GroqAgent] Parsed textual tool call -> ${parsed.name} with`, parsed.args)
            try {
              const toolResult = await runtime.run(parsed.name, parsed.args)
              lastToolResult = toolResult
              lastToolName = parsed.name
              const callId = `parsed-${Date.now()}`
              toolInvocations.push({ toolCallId: callId, toolName: parsed.name, args: parsed.args, result: safeJsonParse(toolResult) ?? toolResult })
              // Surface result directly without sending ToolMessage (no preceding tool_calls)
              ai = new AIMessage({ content: renderToolResultReadable(lastToolName, toolResult) })
            } catch (err: any) {
              ai = new AIMessage({ content: `Tool ${parsed.name} failed: ${err?.message || String(err)}` })
            }
          }
        }
        response = ai
      } else {
        console.log('� Sending request to Groq model...')
        response = await this.model.invoke(messages)
      }
      const processingTime = Date.now() - startTime

  let textOut = Array.isArray(response.content) ? response.content.map((p: any) => (typeof p === 'string' ? p : (p?.text ?? ''))).join('') : String(response.content ?? '')
  // Last-resort A: if model still prints a tool-call blob, show the tool result directly
  if ((/<\/?function|CALL_TOOL\(|tool[_-]?call/i.test(textOut)) && lastToolResult) {
    textOut = renderToolResultReadable(lastToolName, lastToolResult)
  }
  // Last-resort B: if empty output but we have a tool result, present it
  if ((!textOut || !textOut.trim()) && lastToolResult) {
    textOut = renderToolResultReadable(lastToolName, lastToolResult)
  }
  // Estimate token usage (rough approximation)
  const inputTokens = Math.ceil(input.content.length / 4)
  const outputTokens = Math.ceil(textOut.length / 4)
      const cost = this.calculateCost(inputTokens, outputTokens)

      console.log('✅ GroqAgent processing completed:', {
        modelUsed: this.config.id,
        processingTime: `${processingTime}ms`,
        inputTokens,
        outputTokens,
        estimatedCost: `$${cost.toFixed(6)}`,
  responseLength: textOut.length
      })

      return {
  result: textOut,
        modelUsed: this.config.id,
        cost,
        tokens: {
          input: inputTokens,
          output: outputTokens
        },
        processingTime,
        confidence: 0.85,
        toolInvocations
      }
    } catch (error) {
      console.error('❌ GroqAgent processing failed:', {
        error: error instanceof Error ? error.message : error,
        processingTime: `${Date.now() - startTime}ms`,
        inputType: input.type
      })
      throw new Error(`GroqAgent processing failed: ${error}`)
    }
  }

  // System prompt now driven by Cleo prompts; keep method for backward compat (unused)
  private getSystemPrompt(_taskType: string): string {
    return getCleoPrompt(sanitizeModelName(this.config.name), 'default')
  }
}

export class OpenAIAgent extends BaseAgent {
  initializeModel(): void {
    const openaiModel = this.config.id.startsWith('openai:')
      ? this.config.id.split(':')[1]
      : 'gpt-4o-mini'
    console.log('🤖 Initializing OpenAIAgent with model:', openaiModel)
    const isGpt5 = openaiModel.startsWith('gpt-5')
    const opts: any = {
      model: openaiModel,
      maxTokens: 4096,
      openAIApiKey: process.env.OPENAI_API_KEY,
    }
    // GPT-5 models don't accept custom temperature; omit to use provider default
    if (!isGpt5) {
      opts.temperature = 0.1
    }
    this.model = new ChatOpenAI(opts)
    console.log('✅ OpenAIAgent initialized successfully')
  }

  async process(input: TaskInput): Promise<TaskOutput> {
    const startTime = Date.now()
    console.log('🚀 OpenAIAgent processing task:', {
      type: input.type,
      contentLength: input.content.length,
      hasMetadata: !!input.metadata,
      isMultimodal: input.type === 'image' || input.type === 'document',
      useRAG: Boolean(input.metadata?.useRAG),
    })

    try {
      const sysPromptBase = input.metadata?.systemPromptOverride ||
        getCleoPrompt(sanitizeModelName(this.config.name), input.metadata?.systemPromptVariant || 'default')
      // Keep response language aligned with user input
      const langHint = /[ñáéíóúü]|\b(gracias|hola|por favor|necesito|quiero)\b/i.test(input.content)
        ? 'Responde en el mismo idioma del usuario (español) salvo que se solicite explícitamente otro.'
        : 'Respond in the same language as the user (English) unless another is explicitly requested.'
      const toolHint = (input as any).metadata?.enableTools
        ? '\nTOOL USE: If the user asks for real-time info (weather, prices) or actions (search, calendar, docs, email), prefer calling available tools instead of guessing.'
        : ''
      const sysPrompt = `${sysPromptBase}\n\n${langHint}${toolHint}`

      // Optionally retrieve context via RAG
  let userContent = this.formatMultimodalContent(input)
      if (input.metadata?.useRAG && input.metadata?.userId && typeof userContent === 'string') {
        try {
          const chunks = await retrieveRelevant({
            userId: input.metadata.userId,
            query: userContent,
            documentId: input.metadata.documentId,
            projectId: input.metadata.projectId,
            maxContextChars: input.metadata.maxContextChars ?? 6000,
            useHybrid: true,
            useReranking: true,
          })
          const ctx = buildContextBlock(chunks, input.metadata.maxContextChars ?? 6000)
          if (ctx && ctx.trim().length > 0) {
            userContent = `${ctx}\n\nUSER QUESTION:\n${userContent}`
          }
        } catch (e) {
          console.warn('[OpenAIAgent] RAG retrieval failed, proceeding without context:', (e as any)?.message || e)
        }
      }

      // Build multimodal human message if imageUrl present
  console.log('[OpenAIAgent] systemPrompt length:', sysPrompt.length, 'override:', Boolean(input.metadata?.systemPromptOverride))
      const messages = [
        new SystemMessage({ content: sysPrompt }),
        new HumanMessage({
          content: (input.metadata?.imageUrl && (input.type === 'image' || input.type === 'document'))
            ? [
                { type: 'text', text: typeof userContent === 'string' ? userContent : String(userContent) },
                { type: 'image_url', image_url: { url: input.metadata.imageUrl, detail: 'auto' } }
              ]
            : userContent
        })
      ]
  let response: AIMessage
  let lastToolResult: string | null = null
  let lastToolName: string | null = null
  const toolInvocations: Array<{ toolCallId: string; toolName: string; args?: any; result?: any }> = []
      const toolsEnabled = Boolean((input.metadata as any)?.enableTools)
      if (toolsEnabled) {
        const runtime = buildToolRuntime((input.metadata as any)?.allowedTools)
        const modelWithTools = this.model.bindTools(runtime.lcTools)
        console.log('🛠️ OpenAIAgent tools bound:', runtime.names)
        let ai = await modelWithTools.invoke(messages)
        let steps = 0
        while ((ai as any).tool_calls && (ai as any).tool_calls.length && steps < 2) {
          // Push assistant with tool_calls before sending tool results
          messages.push(ai)
          for (const call of (ai as any).tool_calls) {
            try {
      const toolResult = await runtime.run(call.name, call.args)
      lastToolResult = toolResult
      lastToolName = call.name
              messages.push(new ToolMessage({ content: toolResult, tool_call_id: call.id }))
        toolInvocations.push({ toolCallId: call.id, toolName: call.name, args: call.args, result: safeJsonParse(toolResult) ?? toolResult })
            } catch (err: any) {
              messages.push(new ToolMessage({ content: `Tool ${call.name} failed: ${err?.message || String(err)}`, tool_call_id: call.id }))
            }
          }
          ai = await modelWithTools.invoke(messages)
          steps++
        }
        if ((!(ai as any).tool_calls || !(ai as any).tool_calls.length) && steps < 2) {
          const text = Array.isArray(ai.content)
            ? ai.content.map((p: any) => (typeof p === 'string' ? p : (p?.text ?? ''))).join('')
            : String(ai.content ?? '')
          const parsed = parseToolCallFromText(text)
      if (parsed && runtime.names.includes(parsed.name)) {
            console.log(`[OpenAIAgent] Parsed textual tool call -> ${parsed.name} with`, parsed.args)
            try {
        const toolResult = await runtime.run(parsed.name, parsed.args)
              lastToolResult = toolResult
              lastToolName = parsed.name
              const callId = `parsed-${Date.now()}`
              toolInvocations.push({ toolCallId: callId, toolName: parsed.name, args: parsed.args, result: safeJsonParse(toolResult) ?? toolResult })
              // Do NOT send ToolMessage without a preceding assistant tool_calls; surface result directly
              ai = new AIMessage({ content: renderToolResultReadable(lastToolName, toolResult) })
            } catch (err: any) {
              ai = new AIMessage({ content: `Tool ${parsed.name} failed: ${err?.message || String(err)}` })
            }
          }
        }
        response = ai
      } else {
        console.log('�📤 Sending request to OpenAI model:', this.config.id)
        response = await this.model.invoke(messages)
      }
      const processingTime = Date.now() - startTime

  let textOut = Array.isArray(response.content) ? response.content.map((p: any) => (typeof p === 'string' ? p : (p?.text ?? ''))).join('') : String(response.content ?? '')
  if ((/<\/?function|CALL_TOOL\(|tool[_-]?call/i.test(textOut)) && lastToolResult) {
    textOut = renderToolResultReadable(lastToolName, lastToolResult)
  }
  if ((!textOut || !textOut.trim()) && lastToolResult) {
    textOut = renderToolResultReadable(lastToolName, lastToolResult)
  }
  // Estimate token usage
  const inputTokens = Math.ceil(input.content.length / 4)
  const outputTokens = Math.ceil(textOut.length / 4)
      const cost = this.calculateCost(inputTokens, outputTokens)

      console.log('✅ OpenAIAgent processing completed:', {
        modelUsed: this.config.id,
        processingTime: `${processingTime}ms`,
        inputTokens,
        outputTokens,
        estimatedCost: `$${cost.toFixed(6)}`,
  responseLength: textOut.length,
        wasMultimodal: input.type === 'image' || input.type === 'document'
      })

      return {
  result: textOut,
        modelUsed: this.config.id,
        cost,
        tokens: {
          input: inputTokens,
          output: outputTokens
        },
        processingTime,
        confidence: 0.95,
        toolInvocations
      }
    } catch (error) {
      console.error('❌ OpenAIAgent processing failed:', {
        error: error instanceof Error ? error.message : error,
        processingTime: `${Date.now() - startTime}ms`,
        inputType: input.type,
        wasMultimodal: input.type === 'image' || input.type === 'document'
      })
      throw new Error(`OpenAIAgent processing failed: ${error}`)
    }
  }

  private getSystemPrompt(_taskType: string): string {
    return getCleoPrompt(sanitizeModelName(this.config.name), 'default')
  }

  private formatMultimodalContent(input: TaskInput): any {
    // If it's an image or document, format for multimodal input
    if (input.type === 'image' || input.type === 'document') {
      // In a real implementation, you would handle base64 image data here
      return input.content
    }
    
    return input.content
  }
}

// Local Ollama-backed agent using OpenAI-compatible endpoint
export class OllamaAgent extends BaseAgent {
  initializeModel(): void {
    const modelName = this.config.id.startsWith('ollama:')
      ? this.config.id.slice('ollama:'.length) // keep full model name including tag
      : this.config.id
    const baseURL = (process.env.OLLAMA_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:11434') + '/v1'
    console.log('🤖 Initializing OllamaAgent:', { modelName, baseURL, env: process.env.OLLAMA_BASE_URL })
    this.model = new ChatOpenAI({
      configuration: { baseURL },
      apiKey: 'ollama',
      model: modelName,
      temperature: 0.3,
      maxTokens: 2048,
      timeout: 30000, // 30 second timeout
    })
    console.log('✅ OllamaAgent model configured successfully')
  }

  async process(input: TaskInput): Promise<TaskOutput> {
    const startTime = Date.now()
    console.log('🚀 OllamaAgent processing task:', {
      type: input.type,
      contentLength: input.content.length,
      baseURL: (process.env.OLLAMA_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:11434') + '/v1'
    })
    try {
      // Keep system prompt concise for local models to improve latency
      // Use 'local' variant by default for Ollama agents to get the more flexible, cybersecurity-aware prompt
      const defaultVariant = 'local'
      const base = input.metadata?.systemPromptOverride ||
        getCleoPrompt(sanitizeModelName(this.config.name), input.metadata?.systemPromptVariant || defaultVariant)
      // Keep identity header intact by trimming from the end if too long
      const MAX_PROMPT = 1800
      const sysPromptBase = base.length > MAX_PROMPT ? base.slice(0, MAX_PROMPT) + '\n\n[Context trimmed for local model]' : base
      const langHint = /[ñáéíóúü]|\b(gracias|hola|por favor|necesito|quiero)\b/i.test(input.content)
        ? 'Responde en el mismo idioma del usuario (español) salvo que se solicite explícitamente otro.'
        : 'Respond in the same language as the user (English) unless another is explicitly requested.'
      const toolHint = (input as any).metadata?.enableTools
        ? '\nTOOL USE: Prefer calling available tools (calendar, drive, gmail, web) instead of guessing.'
        : ''
      const sysPrompt = `${sysPromptBase}\n\n${langHint}${toolHint}`

  const messages = [
        new SystemMessage({ content: sysPrompt }),
        new HumanMessage({ content: input.content })
      ]

      // Bind app tools if enabled; Ollama via OpenAI-compatible tools requires recent Ollama versions
      let response: AIMessage
      const toolInvocations: Array<{ toolCallId: string; toolName: string; args?: any; result?: any }> = []
      const toolsEnabled = Boolean((input.metadata as any)?.enableTools)
  if (toolsEnabled) {
        const runtime = buildToolRuntime((input.metadata as any)?.allowedTools)
        const modelWithTools = (this.model as any).bindTools
          ? (this.model as any).bindTools(runtime.lcTools)
          : (this.model as any).bind({ tools: runtime.lcTools })
        let ai = await modelWithTools.invoke(messages)
        let steps = 0
        while ((ai as any).tool_calls && (ai as any).tool_calls.length && steps < 2) {
          messages.push(ai)
          for (const call of (ai as any).tool_calls) {
            try {
              const toolResult = await runtime.run(call.name, call.args)
              messages.push(new ToolMessage({ content: toolResult, tool_call_id: call.id }))
              toolInvocations.push({ toolCallId: call.id, toolName: call.name, args: call.args, result: safeJsonParse(toolResult) ?? toolResult })
            } catch (err: any) {
              messages.push(new ToolMessage({ content: `Tool ${call.name} failed: ${err?.message || String(err)}`, tool_call_id: call.id }))
            }
          }
          ai = await modelWithTools.invoke(messages)
          steps++
        }
        response = ai
      } else {
        console.log('📤 Sending request to Ollama model:', this.config.id)
        response = await this.model.invoke(messages)
      }

      const processingTime = Date.now() - startTime
      const textOut = Array.isArray(response.content)
        ? response.content.map((p: any) => (typeof p === 'string' ? p : (p?.text ?? ''))).join('')
        : String(response.content ?? '')
      const inputTokens = Math.ceil(input.content.length / 4)
      const outputTokens = Math.ceil(textOut.length / 4)
      const cost = 0 // local

      console.log('✅ OllamaAgent processing completed:', {
        modelUsed: this.config.id,
        processingTime: `${processingTime}ms`,
        inputTokens,
        outputTokens,
        responseLength: textOut.length
      })

      return {
        result: textOut,
        modelUsed: this.config.id,
        cost,
        tokens: { input: inputTokens, output: outputTokens },
        processingTime,
        confidence: 0.7,
        toolInvocations,
      }
    } catch (error) {
      console.error('❌ OllamaAgent processing failed:', {
        error: error instanceof Error ? error.message : error,
        baseURL: (process.env.OLLAMA_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:11434') + '/v1',
        modelId: this.config.id
      })
      throw new Error(`OllamaAgent processing failed: ${error}`)
    }
  }
}

// Agent Factory
export class AgentFactory {
  private static agents: Map<string, BaseAgent> = new Map()

  static getAgent(modelId: string): BaseAgent {
    console.log('🏭 AgentFactory: Getting agent for model:', modelId)
    
    if (!this.agents.has(modelId)) {
      console.log('🔨 AgentFactory: Creating new agent for model:', modelId)
      this.agents.set(modelId, this.createAgent(modelId))
    } else {
      console.log('♻️ AgentFactory: Reusing existing agent for model:', modelId)
    }
    
    return this.agents.get(modelId)!
  }

  private static createAgent(modelId: string): BaseAgent {
    console.log('🛠️ AgentFactory: Creating agent for model:', modelId)
    const config = this.getModelConfig(modelId)
    console.log('📋 AgentFactory: Model config:', {
      id: config.id,
      provider: config.provider,
      capabilities: config.capabilities
    })

    switch (config.provider) {
      case 'groq':
        console.log('🚀 AgentFactory: Creating GroqAgent')
        return new GroqAgent(config)
      
      case 'openai':
        console.log('🤖 AgentFactory: Creating OpenAIAgent')
        return new OpenAIAgent(config)
      
      case 'ollama':
        console.log('🧱 AgentFactory: Creating OllamaAgent')
        return new OllamaAgent(config)

      default:
        console.error('❌ AgentFactory: Unsupported model provider:', config.provider)
        throw new Error(`Unsupported model provider: ${config.provider}`)
    }
  }

  private static getModelConfig(modelId: string): ModelConfig {
    // This would normally come from your model configuration
    const configs: Record<string, ModelConfig> = {
      'groq:gpt-oss-120b': {
        id: 'groq:gpt-oss-120b',
        name: 'GPT-OSS-120B',
        provider: 'groq',
        costPerToken: {
          input: 0.0000001, // $0.1 per 1M tokens (estimate)
          output: 0.0000001
        },
        capabilities: {
          text: true,
          vision: false,
          functionCalling: true,
          reasoning: true
        },
        maxTokens: 4096,
        contextWindow: 32768
      },
      'openai:gpt-4o-mini': {
        id: 'openai:gpt-4o-mini',
        name: 'GPT-4o-mini',
        provider: 'openai',
        costPerToken: {
          input: 0.000000150, // $0.15 per 1M tokens
          output: 0.000000600  // $0.60 per 1M tokens
        },
        capabilities: {
          text: true,
          vision: true,
          functionCalling: true,
          reasoning: true
        },
        maxTokens: 4096,
        contextWindow: 128000
      },
      'openai:gpt-5-mini': {
        id: 'openai:gpt-5-mini',
        name: 'GPT-5-mini',
        provider: 'openai',
        costPerToken: {
          input: 0.000000200,
          output: 0.000000800
        },
        capabilities: {
          text: true,
          vision: true,
          functionCalling: true,
          reasoning: true
        },
        maxTokens: 8192,
        contextWindow: 128000
      },
      'openai:gpt-5-nano': {
        id: 'openai:gpt-5-nano',
        name: 'GPT-5-nano',
        provider: 'openai',
        costPerToken: {
          input: 0.000000050,
          output: 0.000000200
        },
        capabilities: {
          text: true,
          vision: true,
          functionCalling: true,
          reasoning: false
        },
        maxTokens: 4096,
        contextWindow: 65536
      }
      ,
      // Local quick models (Ollama)
      'ollama:gemma3:270m': {
        id: 'ollama:gemma3:270m',
        name: 'Gemma 3 270M (Local)',
        provider: 'ollama',
        costPerToken: { input: 0, output: 0 },
        capabilities: { text: true, vision: false, functionCalling: true, reasoning: false },
        maxTokens: 2048,
        contextWindow: 8192,
      },
      'ollama:llama3.1:8b': {
        id: 'ollama:llama3.1:8b',
        name: 'Llama 3.1 8B (Local)',
        provider: 'ollama',
        costPerToken: { input: 0, output: 0 },
        capabilities: { text: true, vision: false, functionCalling: true, reasoning: true },
        maxTokens: 4096,
        contextWindow: 128000,
      },
      'ollama:qwen2.5-coder:latest': {
        id: 'ollama:qwen2.5-coder:latest',
        name: 'Qwen 2.5 Coder (Local)',
        provider: 'ollama',
        costPerToken: { input: 0, output: 0 },
        capabilities: { text: true, vision: false, functionCalling: true, reasoning: true },
        maxTokens: 4096,
        contextWindow: 32768,
      },
    }

    const config = configs[modelId]
    if (!config) {
      console.error('❌ AgentFactory: Unknown model:', modelId)
      console.log('🔍 AgentFactory: Available models:', Object.keys(configs))
      throw new Error(`Unknown model: ${modelId}`)
    }

    console.log('✅ AgentFactory: Model config found:', {
      id: config.id,
      name: config.name,
      provider: config.provider,
      inputCost: `$${config.costPerToken.input * 1000000}/1M tokens`,
      outputCost: `$${config.costPerToken.output * 1000000}/1M tokens`
    })

    return config
  }
}
