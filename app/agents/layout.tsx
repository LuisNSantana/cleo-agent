import React from 'react'
import './styles.css'
import { AgentsTopNav } from '@/app/agents/components/AgentsTopNav'

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  // Importante: El padding-top para el header global ya lo aplica LayoutApp (pt-header en <main>). 
  // Aquí NO añadimos pt-header para evitar un doble offset vertical.
  return (
    <div className="flex-1 w-full min-h-screen bg-background">
      <AgentsTopNav />
      <main
        className="relative w-full max-w-none px-4 sm:px-6 lg:px-8 pb-8"
        style={{ paddingTop: 'calc(var(--agents-subnav-height,44px) + 0.35rem)' }}
      >
        {children}
      </main>
    </div>
  )
}
