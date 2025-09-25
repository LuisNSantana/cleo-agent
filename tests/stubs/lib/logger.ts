const noop = (..._args: any[]) => {}

export const logger = {
  agentSync: noop,
  delegation: noop,
  attachment: noop,
  api: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop
}
