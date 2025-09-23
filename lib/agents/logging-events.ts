import logger from '@/lib/utils/logger'

export interface ExecutionLogEventBase {
  trace_id: string
  execution_id: string
  agent_id: string
  user_id?: string
  thread_id?: string
  state?: string
  ts: string
  event: string
  level?: 'debug'|'info'|'warn'|'error'
  data?: Record<string, any>
}

export function emitExecutionEvent(evt: Omit<ExecutionLogEventBase, 'ts'>) {
  const payload: ExecutionLogEventBase = { ...evt, ts: new Date().toISOString() }
  try {
    const line = JSON.stringify(payload)
    // Choose logger level
    switch (evt.level) {
      case 'error': logger.error(line); break
      case 'warn': logger.warn(line); break
      case 'info': logger.info(line); break
      default: logger.debug(line); break
    }
  } catch (e) {
    logger.warn('[emitExecutionEvent] serialization failed', { event: evt.event, err: e instanceof Error ? e.message : e })
  }
  return payload
}
