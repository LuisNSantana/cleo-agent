import React from 'react'
import './styles.css'
import { AgentsTopNav } from '@/app/agents/components/AgentsTopNav'

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 w-full bg-background">
      <main className="relative w-full pt-header pb-12">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
          <AgentsTopNav />
          {children}
        </div>
      </main>
    </div>
  )
}