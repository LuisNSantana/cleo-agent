"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { House, GearSix, ChartBar, ChatsCircle, TreeStructure, SquaresFour } from '@phosphor-icons/react'
import { SettingsTrigger } from '@/app/components/layout/settings/settings-trigger'

const navItems = [
  { href: '/agents', label: 'Home', icon: House },
  { href: '/agents/architecture', label: 'Architecture', icon: TreeStructure },
  { href: '/agents/manage', label: 'Manage', icon: GearSix },
  { href: '/agents/chat', label: 'Chat', icon: ChatsCircle },
  { href: '/agents/tasks', label: 'Tasks', icon: SquaresFour },
]

export function AgentsTopNav() {
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/60 bg-slate-900/70 backdrop-blur-xl">
  <div className="w-full flex h-16 sm:h-16 items-center justify-between px-2 sm:px-4 lg:px-6">
        {/* Left: brand + back to app home */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="group inline-flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-800/60">
            <img src="/img/agents/logocleo4.png" alt="Cleo" className="h-8 w-8 rounded-md object-contain" />
            <span className="hidden sm:block text-sm font-semibold text-slate-100 group-hover:text-white">Cleo</span>
          </Link>
          <Separator orientation="vertical" className="mx-1 h-6 bg-slate-700/60" />
          <span className="text-sm font-medium text-slate-300">Agent Control Center</span>
        </div>

        {/* Center: navigation (horizontal on md+, compact on mobile) */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-800/60 p-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className={cn('rounded-lg px-3 py-2 text-sm font-medium transition', active ? 'bg-slate-700/60 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700/40')}> 
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Right: settings and metrics link (settings opens drawer/dialog) */}
  <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/dashboard" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                    <ChartBar className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Analytics</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Quick Home icon */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                    <House className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Home</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <SettingsTrigger onOpenChangeAction={setSettingsOpen} />
        </div>
      </div>

      {/* Mobile nav buttons */}
      <div className="md:hidden border-t border-slate-800/60 bg-slate-900/70">
        <div className="mx-auto grid grid-cols-5 gap-1 px-1 py-2 sm:px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-1 rounded-lg px-1 py-1 text-[11px] font-medium transition', active ? 'bg-slate-800/70 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/50')}>
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
