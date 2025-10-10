import React from "react"

/**
 * Ensures only a single valid ReactElement child is rendered.
 * In dev, logs a warning (and can optionally throw) if multiple children are passed.
 * Useful when wrapping Radix `asChild` triggers which require exactly one element.
 */
export function SingleChild({ children, label }: { children: React.ReactNode, label?: string }) {
  const count = React.Children.count(children)
  if (process.env.NODE_ENV !== 'production') {
    if (count !== 1) {
       
      console.warn(`[SingleChild] ${label || ''} expected exactly 1 child, received ${count}.`, children)
    }
  }
  // If multiple, wrap in a span to avoid runtime crash, but still log.
  if (count !== 1) {
    return <span data-single-child-wrapper>{children}</span>
  }
  return <>{children}</>
}
