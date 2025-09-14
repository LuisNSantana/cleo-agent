import React from 'react'
import './styles.css'
import { AgentsTopNav } from '@/app/agents/components/AgentsTopNav'

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 w-full min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Sticky premium header */}
      <AgentsTopNav />

      {/* Page content wrapper with safe padding to avoid header overlap */}
  <main className="relative w-full max-w-none px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 md:pt-10">
        {children}
      </main>
    </div>
  )
}
