type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug'

// Determine default level: very quiet in production
const defaultLevel: LogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug'

const levelFromEnv = (process.env.LOG_LEVEL || process.env.NEXT_PUBLIC_LOG_LEVEL || '').toLowerCase() as LogLevel

const levels: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
}

const currentLevel: LogLevel = (levelFromEnv in levels ? levelFromEnv : defaultLevel)

function shouldLog(level: LogLevel) {
  return levels[level] <= levels[currentLevel]
}

function formatMessage(level: string, args: any[]) {
  try {
    // Avoid heavy formatting; rely on runtime stringification
    return args
  } catch {
    return args
  }
}

export const logger = {
  level: currentLevel,
  debug: (...args: any[]) => {
    if (shouldLog('debug')) console.log(...formatMessage('debug', args))
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) console.log(...formatMessage('info', args))
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) console.warn(...formatMessage('warn', args))
  },
  error: (...args: any[]) => {
    if (shouldLog('error')) console.error(...formatMessage('error', args))
  },
}

export default logger
