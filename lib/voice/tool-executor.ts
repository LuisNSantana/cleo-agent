/**
 * Voice Tool Executor
 * Executes tools called from OpenAI Realtime API during voice conversations
 */

import { webSearchTool } from '@/lib/tools/web-search'
import { listGmailMessagesTool, sendGmailMessageTool } from '@/lib/tools/google-gmail'
import { createCalendarEventTool } from '@/lib/tools/google-calendar'
import logger from '@/lib/utils/logger'

export interface ToolCall {
  call_id: string
  name: string
  arguments: Record<string, any>
}

export interface ToolResult {
  call_id: string
  output: string
}

/**
 * Execute a tool called from voice mode
 */
export async function executeVoiceTool(
  toolCall: ToolCall,
  userId: string
): Promise<ToolResult> {
  const { call_id, name, arguments: args } = toolCall
  
  logger.info(`🎙️ [VOICE TOOL] Executing: ${name}`, { 
    args, 
    userId,
    call_id 
  })
  
  try {
    let result: any
    
    switch (name) {
      case 'search_web':
        result = await (webSearchTool as any).execute({
          query: args.query
        })
        
        // Format results for voice consumption
        const topResults = result.results?.slice(0, 5).map((r: any) => ({
          title: r.title,
          url: r.url,
          snippet: r.content?.substring(0, 200)
        })) || []
        
        return {
          call_id,
          output: JSON.stringify({
            success: true,
            query: args.query,
            summary: result.summary || 'Search completed',
            results: topResults,
            totalResults: result.results?.length || 0
          })
        }
      
      case 'check_email':
        // Build a Gmail query for today's messages in INBOX
        try {
          const now = new Date()
          const yyyy = now.getFullYear()
          const mm = String(now.getMonth() + 1).padStart(2, '0')
          const dd = String(now.getDate()).padStart(2, '0')
          const after = `${yyyy}/${mm}/${dd}` // Gmail expects YYYY/MM/DD
          const qParts: string[] = [
            `after:${after}`,
            'in:inbox'
          ]
          if (args.unreadOnly) qParts.push('is:unread')
          const q = qParts.join(' ')

          result = await (listGmailMessagesTool as any).execute({
            q,
            maxResults: Math.min(Math.max(Number(args.limit) || 10, 1), 20)
          })

          if (!result?.success) {
            return {
              call_id,
              output: JSON.stringify({
                success: false,
                error: result?.message || 'Unable to access Gmail. Please connect your Google account in Settings.',
                spoken_summary: 'I could not access your Gmail right now. Please ensure your Google account is connected.'
              })
            }
          }

          const emails = (result.messages || []).map((e: any) => ({
            from: e.from,
            subject: e.subject,
            snippet: e.snippet?.substring(0, 150) || '',
            date: e.date,
            isUnread: Array.isArray(e.labelIds) && e.labelIds.includes('UNREAD')
          }))

          const unreadCount = emails.filter((e: any) => e.isUnread).length
          const spoken_summary = emails.length === 0
            ? 'You have no emails from today in your inbox.'
            : `You have ${emails.length} email${emails.length === 1 ? '' : 's'} from today${args.unreadOnly ? ' (unread only)' : ''}. The top one is: ${emails[0].subject || 'no subject'}.`

          return {
            call_id,
            output: JSON.stringify({
              success: true,
              emailCount: emails.length,
              emails,
              unreadCount,
              spoken_summary
            })
          }
        } catch (err) {
          return {
            call_id,
            output: JSON.stringify({
              success: false,
              error: (err as Error).message,
              spoken_summary: 'I ran into an error while checking your inbox.'
            })
          }
        }
      
      case 'create_calendar_event':
        // Parse date if it's in natural language
        let startDateTime = args.date
        
        // If date is not in ISO format, try to parse it
        if (!startDateTime.includes('T')) {
          // For now, assume it's a date string and add time
          // In production, you'd want to use a date parsing library
          startDateTime = new Date(startDateTime).toISOString()
        }
        // Confirmation flow: require explicit confirmation before creating
        if (args.confirm !== true) {
          const spoken = `I'll create the event "${args.title}" for ${new Date(startDateTime).toLocaleString()}. Should I confirm and add it to your calendar now?`
          return {
            call_id,
            output: JSON.stringify({
              success: false,
              needs_confirmation: true,
              action: 'create_calendar_event',
              proposal: {
                title: args.title,
                start: startDateTime,
                duration: args.duration || 60,
                description: args.description
              },
              spoken_summary: spoken,
              suggestion: 'Please confirm, or adjust the title/date/duration.'
            })
          }
        }

        result = await (createCalendarEventTool as any).execute({
          summary: args.title,
          start: startDateTime,
          duration: args.duration || 60,
          description: args.description
        })
        
        return {
          call_id,
          output: JSON.stringify({
            success: true,
            event: {
              title: result.summary,
              start: result.start,
              end: result.end,
              link: result.htmlLink,
              id: result.id
            },
            spoken_summary: `Done. I scheduled "${result.summary}" for ${new Date(result.start).toLocaleString()}. Would you like me to send you the link?`
          })
        }
      
      case 'send_email':
        // Confirmation flow: require explicit confirmation before sending
        if (args.confirm !== true) {
          const spoken = `I'll send an email to ${args.to} with subject "${args.subject}" saying: ${String(args.body).slice(0, 120)}... Is it okay to send it now?`
          return {
            call_id,
            output: JSON.stringify({
              success: false,
              needs_confirmation: true,
              action: 'send_email',
              proposal: {
                to: args.to,
                subject: args.subject,
                body: args.body
              },
              spoken_summary: spoken,
              suggestion: 'Please confirm, or edit the recipient/subject/body.'
            })
          }
        }

        // Adapt to gmail tool schema: to is string[], body as text
        result = await (sendGmailMessageTool as any).execute({
          to: Array.isArray(args.to) ? args.to : [args.to],
          subject: args.subject,
          text: args.body
        })
        
        return {
          call_id,
          output: JSON.stringify({
            success: true,
            messageId: result.id,
            to: args.to,
            subject: args.subject,
            spoken_summary: `Done. I sent the email to ${args.to} with subject "${args.subject}".`
          })
        }
      
      case 'create_task':
        // Create task in Supabase tasks table
        try {
          const { createClient } = await import('@/lib/supabase/server')
          const supabase = await createClient()
          
          if (!supabase) {
            throw new Error('Database connection failed')
          }
          
          const taskData = {
            user_id: userId,
            title: args.title,
            priority: args.priority || 'medium',
            status: 'pending',
            due_date: args.dueDate ? new Date(args.dueDate).toISOString() : null,
            created_at: new Date().toISOString()
          }
          
          const { data: task, error } = await (supabase as any)
            .from('tasks')
            .insert(taskData)
            .select()
            .single()
          
          if (error) {
            throw new Error(`Failed to create task: ${error.message}`)
          }
          
          return {
            call_id,
            output: JSON.stringify({
              success: true,
              task: {
                id: (task as any).task_id || (task as any).id,
                title: (task as any).title,
                priority: (task as any).priority,
                dueDate: (task as any).due_date,
                status: (task as any).status
              }
            })
          }
        } catch (error) {
          logger.error('Failed to create task:', error)
          throw error
        }
      
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    logger.error(`❌ [VOICE TOOL] Error executing ${name}:`, error)
    
    return {
      call_id,
      output: JSON.stringify({
        success: false,
        error: (error as Error).message,
        toolName: name
      })
    }
  }
}

/**
 * Validate tool call arguments
 */
export function validateToolCall(toolCall: ToolCall): { valid: boolean; error?: string } {
  if (!toolCall.name) {
    return { valid: false, error: 'Tool name is required' }
  }
  
  if (!toolCall.call_id) {
    return { valid: false, error: 'Call ID is required' }
  }
  
  // Validate required arguments per tool
  switch (toolCall.name) {
    case 'search_web':
      if (!toolCall.arguments.query) {
        return { valid: false, error: 'search_web requires query argument' }
      }
      break
    
    case 'create_calendar_event':
      if (!toolCall.arguments.title || !toolCall.arguments.date) {
        return { valid: false, error: 'create_calendar_event requires title and date' }
      }
      break
    
    case 'send_email':
      if (!toolCall.arguments.to || !toolCall.arguments.subject || !toolCall.arguments.body) {
        return { valid: false, error: 'send_email requires to, subject, and body' }
      }
      break
    
    case 'create_task':
      if (!toolCall.arguments.title) {
        return { valid: false, error: 'create_task requires title' }
      }
      break
  }
  
  return { valid: true }
}
