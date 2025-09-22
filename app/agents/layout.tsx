import React from 'react'
import './styles.css'
import { ContextualHeader } from '@/components/ui/contextual-header'

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  // Calculate total header height: app header + agents subnav
  // --app-header-height is 56px (mobile) or 60px (desktop)
  // --agents-subnav-height is 56px
  // Add a small gap (1rem) if desired for visual separation
  return (
    <div className="flex-1 w-full min-h-screen bg-background">
      <ContextualHeader />
      <main
        className="relative w-full max-w-none px-4 sm:px-6 lg:px-8 pb-8"
        style={{ paddingTop: 'calc(var(--app-header-height,56px) + var(--agents-subnav-height,56px) + 1rem)' }}
      >
        {children}
      </main>
    </div>
  )
}