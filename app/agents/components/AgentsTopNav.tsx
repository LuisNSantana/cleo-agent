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
import { NotificationBell } from '@/components/notifications/notification-bell'

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
    <header className="app-fixed-header">
      <div className="w-full flex h-full items-center justify-between px-2 sm:px-4 lg:px-6">
        {/* Left: brand + back to app home */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="group inline-flex items-center gap-2 radius-md px-2 py-1 hover:bg-muted/40">
            <img src="/img/agents/logocleo4.png" alt="Cleo" className="h-8 w-8 rounded-md object-contain" />
            <span className="hidden sm:block text-sm font-semibold text-foreground group-hover:text-foreground">Cleo</span>
          </Link>
          <Separator orientation="vertical" className="mx-1 h-6 divider-subtle" />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-strong leading-tight">Agent Control Center</span>
            <span className="text-subtle">•</span>
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="breadcrumb hidden sm:block">
              {(() => {
                const current = navItems.find(n => n.href === pathname) || navItems.find(n => pathname.startsWith(n.href))
                return (
                  <span className="inline-flex items-center gap-1">
                    <Link href="/agents">Agents</Link>
                    <span aria-hidden>›</span>
                    <span className="text-soft">{current?.label || 'Overview'}</span>
                  </span>
                )
              })()}
            </nav>
          </div>
        </div>

        {/* Center: navigation (horizontal on md+, compact on mobile) */}
  <nav className="hidden md:flex items-center gap-1 radius-lg bg-muted/50 p-1 backdrop-blur-sm">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('radius-md px-3 py-2 text-sm font-medium transition-colors', active ? 'bg-muted/70 text-strong shadow-sm' : 'text-subtle hover:text-strong hover:bg-muted/50')}> 
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Right: notification bell and settings */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Quick Home icon */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-subtle hover:text-strong">
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
  <div className="md:hidden border-t divider-subtle bg-background/80 backdrop-blur-sm">
        <div className="mx-auto grid grid-cols-5 gap-1 px-1 py-2 sm:px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-1 radius-md px-1 py-1 text-[11px] font-medium transition-colors', active ? 'bg-muted/70 text-strong' : 'text-subtle hover:text-strong hover:bg-muted/50')}>
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
