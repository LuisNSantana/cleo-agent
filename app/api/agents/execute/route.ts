/**
 * Agents API Route
 * Handles agent execution and management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAgentOrchestrator } from '@/lib/agents/agent-orchestrator'
import { ExecuteAgentRequest } from '@/lib/agents/types'
import { createClient } from '@/lib/supabase/server'
import { withRequestContext } from '@/lib/server/request-context'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
  const body: any = await request.json()
  const { agentId, input, context, threadId, forceSupervised } = body as ExecuteAgentRequest & { 
    threadId?: string, 
    forceSupervised?: boolean 
  }

    if (!input || !input.trim()) {
      return NextResponse.json(
        { error: 'Input is required' },
        { status: 400 }
      )
    }

  const orchestrator = await getAgentOrchestrator()
  // Debug instance identity
  console.log('[API/execute] Orchestrator instance id:', (orchestrator as any)["__id"] || (globalThis as any).__cleoOrchestrator ? 'global' : 'local')
  // Log configured/effective model for requested agent and for supervisor finalize
  try {
    const targetInfo = (orchestrator as any).getModelInfo?.(agentId)
    console.log('[API/execute] Target agent model:', targetInfo)
    const supInfo = (orchestrator as any).getModelInfo?.('cleo-supervisor')
    console.log('[API/execute] Finalize (supervisor) model:', supInfo)
  } catch {}

    try {
      // Resolve authenticated user for persistence
  const supabase = await createClient()
  const { data: authData } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
      const authedUserId = authData?.user?.id

      // Optionally create or reuse an agent thread so we keep context across confirms
      let effectiveThreadId: string | null = null
      // Compose composite agent key by mode to segregate histories
      const compositeAgentKey = `${agentId || 'cleo-supervisor'}_${forceSupervised ? 'supervised' : 'direct'}`
      if (authedUserId && supabase) {
        try {
          // Use explicit threadId if provided and valid
          if (threadId) {
            const { data } = await (supabase as any)
              .from('agent_threads')
              .select('id, agent_key')
              .eq('id', threadId)
              .eq('user_id', authedUserId)
              .single()
            // Accept any owned thread id; UI ensures mode segregation
            if (data) {
              effectiveThreadId = data.id
            }
          }
          
          // If no valid thread found, try to find existing thread for this agent
          if (!effectiveThreadId) {
            const { data } = await (supabase as any)
              .from('agent_threads')
              .select('id')
              .eq('user_id', authedUserId)
              .eq('agent_key', compositeAgentKey)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            effectiveThreadId = data?.id || null
          }
          
          // If still no thread, create one for this agent
          if (!effectiveThreadId) {
            const { data } = await (supabase as any)
              .from('agent_threads')
              .insert({ 
                user_id: authedUserId, 
                agent_key: compositeAgentKey, 
                agent_name: agentId || 'Cleo', 
                title: `${agentId || 'Cleo'} (${forceSupervised ? 'Supervised by Cleo' : 'Direct Chat'})`
              })
              .select('id')
              .single()
            effectiveThreadId = (data as any)?.id || null
          }
          
          // Save the user message to thread (with deduplication check)
          if (effectiveThreadId) {
            // Check if this exact message already exists to prevent double submission
            const { data: existingUserMsg } = await (supabase as any)
              .from('agent_messages')
              .select('id, created_at')
              .eq('thread_id', effectiveThreadId)
              .eq('user_id', authedUserId)
              .eq('role', 'user')
              .eq('content', input)
              .gte('created_at', new Date(Date.now() - 10000).toISOString()) // Last 10 seconds
              .order('created_at', { ascending: false })
              .limit(1)
            
            if (!existingUserMsg || existingUserMsg.length === 0) {
              console.log(`[API/execute] Inserting user message: "${input.substring(0, 50)}..."`)
              await (supabase as any).from('agent_messages').insert({
                thread_id: effectiveThreadId,
                user_id: authedUserId,
                role: 'user',
                content: input,
                metadata: { 
                  agentId: agentId || 'cleo-supervisor', 
                  context: context || null,
                  isDelegated: agentId && agentId !== 'cleo-supervisor',
                  delegatedFrom: agentId && agentId !== 'cleo-supervisor' ? 'cleo-supervisor' : null,
                  conversation_mode: forceSupervised ? 'supervised' : 'direct',
                  composite_agent_key: compositeAgentKey
                }
              })
            } else {
              console.log(`[API/execute] SKIP: User message already exists (created ${existingUserMsg[0].created_at})`)
            }
          }
        } catch (e) {
          console.warn('[API/execute] Could not persist agent thread/message:', e)
        }
      }

      // Build prior messages context from thread (with robust deduplication)
      let priorMessages: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }> = []
      if (effectiveThreadId && authedUserId && supabase) {
        try {
          const { data: msgs } = await (supabase as any)
            .from('agent_messages')
            .select('role, content, metadata, tool_calls, tool_results, created_at')
            .eq('thread_id', effectiveThreadId)
            .eq('user_id', authedUserId)
            .order('created_at', { ascending: true })
            .limit(50) // Get more to deduplicate properly
          if (Array.isArray(msgs)) {
            // Deduplicate by content + role (keep the first occurrence)
            const seen = new Set<string>()
            const deduped = msgs.filter((m: any) => {
              const key = `${m.role}:${(m.content || '').trim()}`
              if (seen.has(key)) {
                console.log(`[API/execute] DEDUP: Skipping duplicate message ${m.role}: "${(m.content || '').substring(0, 30)}..."`)
                return false
              }
              seen.add(key)
              return true
            })
            
            priorMessages = deduped.map((m: any) => ({
              role: m.role,
              content: m.content || '',
              metadata: {
                ...m.metadata,
                tool_calls: m.tool_calls || undefined,
                tool_results: m.tool_results || undefined
              }
            }))
          }
          console.log(`[API/execute] Loaded ${priorMessages.length} prior messages from thread ${effectiveThreadId}`)
          console.log(`[API/execute] Prior messages preview:`, priorMessages.slice(-3).map(m => ({ role: m.role, content: m.content.substring(0, 80) })))
        } catch (e) {
          console.warn('[API/execute] Failed to load prior thread messages:', e)
        }
      }

      // Execute within request context to ensure proper context propagation during delegation
      const result = await withRequestContext({ 
        userId: authedUserId || '00000000-0000-0000-0000-000000000000',
        model: agentId || 'agent:cleo-supervisor',
        requestId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }, async () => {
        // Start execution with enhanced dual-mode support
        const execution = (orchestrator as any).startAgentExecutionForUI?.(
          input, 
          agentId, 
          effectiveThreadId || undefined, 
          authedUserId || undefined, 
          priorMessages,
          forceSupervised || false
        ) || (orchestrator as any).startAgentExecutionWithHistory?.(input, agentId, priorMessages) || orchestrator.startAgentExecution(input, agentId)
        
        console.log('[API/execute] Started dual-mode execution:', {
          id: execution.id,
          mode: forceSupervised ? 'supervised' : (agentId && agentId !== 'cleo-supervisor' ? 'direct' : 'supervised'),
          agentId: execution.agentId,
          threadId: effectiveThreadId
        })

        return execution
      })

      // BEST-EFFORT: Wait briefly (<= ~22s) for the execution to complete in-process.
      // This mitigates serverless cross-request global state loss so the UI receives a final message on first response.
      let finalExecution: any = result
      try {
        if (finalExecution && finalExecution.status === 'running') {
          const waitMs = Math.min(
            Number.parseInt(process.env.AGENT_EXECUTE_WAIT_MS || '22000', 10) || 22000,
            60000
          )
          const start = Date.now()
          while (Date.now() - start < waitMs) {
            await new Promise(r => setTimeout(r, 700))
            const current = (orchestrator as any).getExecution?.(finalExecution.id)
            if (current) {
              finalExecution = current
              if (current.status && current.status !== 'running') break
            }
          }
        }
      } catch (e) {
        console.warn('[API/execute] Wait-for-completion failed (continuing):', e)
      }

      // Server-side persistence of assistant final message (best-effort, de-duped)
      try {
        if (
          finalExecution &&
          finalExecution.status === 'completed' &&
          effectiveThreadId &&
          authedUserId &&
          Array.isArray(finalExecution.messages)
        ) {
          const aiMessages = (finalExecution.messages || []).filter((m: any) => m.type === 'ai' && (m.content || '').trim().length > 0)
          const last = aiMessages[aiMessages.length - 1]
          if (last) {
            // Check if this execution's final message already exists (by content + timeframe)
            let exists = false
            try {
              const { data: existing, error: existErr } = await (supabase as any)
                .from('agent_messages')
                .select('id, content, created_at')
                .eq('thread_id', effectiveThreadId)
                .eq('user_id', authedUserId)
                .eq('role', 'assistant')
                .eq('content', (last.content || '').trim())
                .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last 60 seconds
                .limit(1)
              if (!existErr && Array.isArray(existing) && existing.length > 0) {
                exists = true
                console.log(`[API/execute] SKIP: Assistant message already persisted (${existing[0].id})`)
              }
            } catch (e) {
              // Non-fatal: proceed to try insert
            }

            if (!exists) {
              const payload = {
                thread_id: effectiveThreadId,
                user_id: authedUserId,
                role: 'assistant',
                content: last.content || '',
                tool_calls: last.toolCalls || null,
                tool_results: null,
                metadata: {
                  ...(last.metadata || {}),
                  sender: (last.metadata && (last.metadata as any).sender) || finalExecution.agentId || 'cleo-supervisor',
                  executionId: finalExecution.id,
                  source: 'server_execute_persist'
                }
              }
              const { error: insertErr } = await (supabase as any)
                .from('agent_messages')
                .insert(payload)
              if (insertErr) {
                console.warn('[API/execute] Failed to persist assistant final message:', insertErr)
              } else {
                console.log('[API/execute] Persisted assistant final message for execution:', finalExecution.id)
              }
            }
          }
        }
      } catch (e) {
        console.warn('[API/execute] Error during server-side final message persistence:', e)
      }

      return NextResponse.json({
        success: true,
        execution: {
          id: finalExecution.id,
          agentId: finalExecution.agentId,
          status: finalExecution.status,
          startTime: finalExecution.startTime,
          endTime: finalExecution.endTime,
          messages: finalExecution.messages,
          metrics: finalExecution.metrics,
          error: finalExecution.error,
          steps: finalExecution.steps || []
        },
        thread: effectiveThreadId ? { id: effectiveThreadId } : null
      })
    } catch (error) {
      console.error('Agent execution error:', error)

      // Only recreate orchestrator for very specific graph errors, not general errors
      if (error instanceof Error && (
        error.message.includes('already present') ||
        error.message.includes('Graph not initialized') ||
        error.message.includes('UNREACHABLE_NODE')
      )) {
        console.log('Detected critical graph error, attempting orchestrator recreation...', {
          errorMessage: error.message,
          errorType: error.constructor.name
        })
        
  const { recreateAgentOrchestrator } = await import('@/lib/agents/orchestrator-adapter')
  const newOrchestrator = await recreateAgentOrchestrator()

        try {
          const execution = newOrchestrator.startAgentExecution(input, agentId)
          return NextResponse.json({
            success: true,
            execution: {
              id: execution.id,
              agentId: execution.agentId,
              status: execution.status,
              startTime: execution.startTime,
              messages: execution.messages,
              metrics: execution.metrics,
              error: execution.error,
              steps: execution.steps || []
            }
          })
        } catch (retryError) {
          console.error('Retry execution failed:', retryError)
          
          return NextResponse.json(
            { error: 'Failed to execute agent after retry', details: retryError instanceof Error ? retryError.message : String(retryError) },
            { status: 500 }
          )
        }
      }

      // For other errors, just return the error without recreating
      return NextResponse.json(
        { 
          error: 'Failed to execute agent',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error executing agent:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to execute agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const orchestrator = await getAgentOrchestrator()
    const executions = orchestrator.getAllExecutions()

    return NextResponse.json({
      success: true,
      executions: executions.map(execution => ({
        id: execution.id,
        agentId: execution.agentId,
        status: execution.status,
        startTime: execution.startTime,
        endTime: execution.endTime,
        metrics: execution.metrics,
        error: execution.error
      }))
    })

  } catch (error) {
    console.error('Error fetching executions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    )
  }
}
