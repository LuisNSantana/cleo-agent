/**
 * Production-safe logging utility
 * Replaces console.log statements with environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogData {
  message: string
  data?: any
  context?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private enableDebugLogs = process.env.ENABLE_DEBUG_LOGS === 'true'

  private formatMessage(level: LogLevel, context: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`
    }
    return `${prefix} ${message}`
  }

  debug(context: string, message: string, data?: any) {
    if (this.isDevelopment || this.enableDebugLogs) {
      console.log(this.formatMessage('debug', context, message, data))
    }
  }

  info(context: string, message: string, data?: any) {
    console.info(this.formatMessage('info', context, message, data))
  }

  warn(context: string, message: string, data?: any) {
    console.warn(this.formatMessage('warn', context, message, data))
  }

  error(context: string, message: string, data?: any) {
    console.error(this.formatMessage('error', context, message, data))
  }

  // Agent-specific logging helpers
  agentSync(message: string, data?: any) {
    this.debug('AGENT-SYNC', message, data)
  }

  delegation(message: string, data?: any) {
    this.debug('DELEGATION', message, data)
  }

  attachment(message: string, data?: any) {
    this.debug('ATTACHMENT', message, data)
  }

  api(message: string, data?: any) {
    this.debug('API', message, data)
  }
}

// Export singleton instance
export const logger = new Logger()

// Legacy console replacement helpers for gradual migration
export const debugLog = (context: string, message: string, data?: any) => {
  logger.debug(context, message, data)
}

export const infoLog = (context: string, message: string, data?: any) => {
  logger.info(context, message, data)
}

export const warnLog = (context: string, message: string, data?: any) => {
  logger.warn(context, message, data)
}

export const errorLog = (context: string, message: string, data?: any) => {
  logger.error(context, message, data)
}