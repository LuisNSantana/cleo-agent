/**
 * Message Processor Module
 * 
 * Centralizes message filtering, normalization, and transformation logic.
 * Extracted from GraphBuilder to improve modularity.
 */

import { BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'

/**
 * Filter out stale ToolMessages that would cause LangChain errors.
 * ToolMessages must immediately follow AIMessages with tool_calls.
 */
export function filterStaleToolMessages(messages: BaseMessage[]): BaseMessage[] {
  const result: BaseMessage[] = []
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    
    if (msg.constructor.name === 'ToolMessage') {
      // Check if previous message is AIMessage with tool_calls
      const prevMsg = result[result.length - 1]
      if (prevMsg && prevMsg.constructor.name === 'AIMessage' && (prevMsg as any).tool_calls?.length > 0) {
        // Valid ToolMessage - keep it
        result.push(msg)
      } else {
        // Invalid/stale ToolMessage - convert to AIMessage text to preserve order
        // Avoid inserting SystemMessage mid-conversation (Anthropic constraint)
        const text = `[tool:${(msg as any).tool_call_id || 'unknown'}] ${msg.content?.toString?.().slice(0, 400) || ''}`
        result.push(new AIMessage({ content: text }))
      }
    } else {
      result.push(msg)
    }
  }
  
  return result
}

/**
 * Ensure only the first SystemMessage remains and is placed at the beginning.
 * Prevents provider errors like "System messages are only permitted as the first passed message."
 */
export function normalizeSystemFirst(messages: BaseMessage[]): BaseMessage[] {
  const system: BaseMessage[] = []
  const rest: BaseMessage[] = []
  
  for (const m of messages) {
    const t = (m as any)?._getType ? (m as any)._getType() : undefined
    if (t === 'system') {
      if (system.length === 0) system.push(m)
      // skip duplicates
    } else {
      rest.push(m)
    }
  }
  
  return system.length > 0 ? [system[0], ...rest] : rest
}

/**
 * Extract text content from message content (string or complex object)
 */
export function toText(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (typeof content === 'object') {
    if (content.text) return String(content.text)
    if (Array.isArray(content)) {
      return content.map((c: any) => {
        if (typeof c === 'string') return c
        if (c?.text) return c.text
        if (c?.type === 'text' && c.text) return c.text
        return ''
      }).join(' ')
    }
  }
  return String(content)
}

/**
 * Synthesize user-friendly summary from tool messages
 */
export function synthesizeFinalContent(messages: BaseMessage[]): string {
  // Helper: summarize common tool payload patterns
  function summarizePayload(payload: any): { summary?: string; link?: string } {
    const lines: string[] = []
    let link: string | undefined

    if (Array.isArray(payload.files) && payload.files.length) {
      const count = payload.files.length
      lines.push(`${count} archivo${count > 1 ? 's' : ''} encontrado${count > 1 ? 's' : ''}.`)
      
      const firstWithLink = payload.files.find((f: any) => f?.webViewLink || f?.webContentLink)
      if (firstWithLink?.webViewLink) link = firstWithLink.webViewLink
      else if (firstWithLink?.webContentLink) link = firstWithLink.webContentLink
    }

    if (payload.query && typeof payload.query === 'string' && payload.query.trim()) {
      lines.push(`Consulta utilizada: "${payload.query.trim()}".`)
    }

    const candidateFile = payload.file && typeof payload.file === 'object' ? payload.file : undefined
    if (candidateFile) {
      const details: string[] = []
      if (candidateFile.name || candidateFile.title) {
        details.push(`Archivo: ${candidateFile.name || candidateFile.title}`)
      }
      if (candidateFile.mimeType) {
        details.push(`Tipo: ${candidateFile.mimeType}`)
      }
      if (candidateFile.modifiedTime) {
        details.push(`Última edición: ${candidateFile.modifiedTime}`)
      }
      if (details.length) {
        lines.push(details.join(' · '))
      }
      if (candidateFile.webViewLink) link = candidateFile.webViewLink
      else if (candidateFile.webContentLink) link = candidateFile.webContentLink
    }

    if (typeof payload.summary === 'string' && payload.summary.trim()) {
      lines.push(payload.summary.trim())
    }

    const summary = lines.length ? lines.join(' ') : undefined
    return { summary, link }
  }

  let synthesizedSummary: string | undefined
  let extractedLink: string | undefined

  // Walk backwards through messages to find ToolMessages
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m instanceof ToolMessage) {
      const c = toText((m as any).content)
      try {
        const parsed = JSON.parse(c)
        const { summary, link } = summarizePayload(parsed)
        if (!synthesizedSummary && summary) synthesizedSummary = summary
        if (!extractedLink && link) extractedLink = link
        if (parsed?.url && typeof parsed.url === 'string') extractedLink = parsed.url
        if (parsed?.page?.url) extractedLink = String(parsed.page.url)
        if (parsed?.database?.url) extractedLink = String(parsed.database.url)
      } catch {
        // Try to extract URL from plain text
        const match = c.match(/https?:\/\/[\w.-]+\.[\w.-]+[^\s)\]}]*/)
        if (match && !extractedLink) extractedLink = match[0]
        if (!synthesizedSummary && c && c.trim()) {
          synthesizedSummary = c.trim()
        }
      }
    }
  }

  if (synthesizedSummary) {
    let textContent = synthesizedSummary
    if (extractedLink && !synthesizedSummary.includes(extractedLink)) {
      textContent = `${textContent} ${extractedLink}`.trim()
    }
    return textContent
  } else if (extractedLink) {
    return `Listo. He completado la acción solicitada y aquí tienes el enlace: ${extractedLink}`
  } else {
    return 'Listo. He completado la acción solicitada.'
  }
}

/**
 * Convert messages to prompt-compatible format
 */
export function convertMessagesToPromptFormat(messages: BaseMessage[]): Array<{ role: string; content: any }> {
  return messages.map(msg => ({
    role: msg.constructor.name === 'HumanMessage' ? 'user' : 
          msg.constructor.name === 'AIMessage' ? 'assistant' : 
          msg.constructor.name === 'SystemMessage' ? 'system' : 'assistant',
    content: msg.content
  }))
}
