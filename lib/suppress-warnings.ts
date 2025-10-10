// Global warning suppression for noisy third‑party logs
// Filters:
//  - pdf.js TT font warnings: "TT: undefined function" / "TT: invalid function id"
//  - Node DEP0005 Buffer() deprecation warnings

declare global {
   
  var __WARNINGS_PATCHED__: boolean | undefined
}

if (!globalThis.__WARNINGS_PATCHED__) {
  try {
  const originalEmitWarning = process.emitWarning.bind(process)
  // Override while preserving signature compatibility
  process.emitWarning = (warning: any, ...args: any[]) => {
      try {
        const msg = typeof warning === 'string' ? warning : (warning?.message || '')
        const code = (warning && typeof warning === 'object' && 'code' in warning) ? (warning as any).code : undefined
        if ((code === 'DEP0005') || (typeof msg === 'string' && msg.includes('Buffer() is deprecated'))) {
          return // drop only the specific deprecated Buffer() warning
        }
      } catch {}
      return originalEmitWarning(warning as any, ...args as any)
    }
  } catch {}

  try {
    const shouldDrop = (first: any) => {
      const s = (first || '').toString()
      return s.includes('TT: undefined function') || s.includes('TT: invalid function id')
    }
    const ow = console.warn.bind(console)
    const oi = console.info.bind(console)
    console.warn = (...args: any[]) => {
      if (args && args.length > 0 && shouldDrop(args[0])) return
      return ow(...args)
    }
    console.info = (...args: any[]) => {
      if (args && args.length > 0 && shouldDrop(args[0])) return
      return oi(...args)
    }
  } catch {}

  globalThis.__WARNINGS_PATCHED__ = true
}

export {}
