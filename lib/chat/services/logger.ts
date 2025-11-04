/**
 * Structured logging service for chat API
 * Provides consistent logging with metadata and log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  chatId?: string
  model?: string
  executionId?: string
  [key: string]: any
}

class ChatLogger {
  private context: LogContext = {}
  private isDevelopment = process.env.NODE_ENV === 'development'

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context }
  }

  clearContext() {
    this.context = {}
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level,
      message,
      ...this.context,
      ...meta,
    }

    // Only output errors and warnings in production
    if (!this.isDevelopment && (level === 'debug' || level === 'info')) {
      return
    }

    const prefix = this.getPrefix(level)
    console[level === 'debug' || level === 'info' ? 'log' : level](
      `${prefix} ${message}`,
      meta ? JSON.stringify(meta) : ''
    )
  }

  private getPrefix(level: LogLevel): string {
    const prefixes = {
      debug: '🔍',
      info: '📋',
      warn: '⚠️',
      error: '❌',
    }
    return prefixes[level]
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta)
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta)
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta)
  }

  error(message: string, meta?: Record<string, any>) {
    this.log('error', message, meta)
  }
}

export const chatLogger = new ChatLogger()
