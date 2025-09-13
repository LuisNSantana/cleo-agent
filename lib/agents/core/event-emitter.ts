import logger from '@/lib/utils/logger'
/**
 * Simple Event Emitter for Agent System
 */

export type EventHandler = (...args: any[]) => void

export class EventEmitter {
  private events = new Map<string, EventHandler[]>()

  on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(handler)
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args)
        } catch (error) {
          logger.error(`[EventEmitter] Error in handler for event "${event}":`, error)
        }
      })
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0
  }

  eventNames(): string[] {
    return Array.from(this.events.keys())
  }
}
