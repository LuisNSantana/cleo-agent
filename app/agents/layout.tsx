import React from 'react'
import './styles.css'
import { ContextualHeader } from '@/components/ui/contextual-header'

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 w-full min-h-screen bg-background pt-header">
      <ContextualHeader />
      <main
        className="relative w-full max-w-none px-4 sm:px-6 lg:px-8 pb-8"
        style={{ paddingTop: 'calc(var(--agents-subnav-height,56px) + 1rem)' }}
      >
        {children}
      </main>
    </div>
  )
}