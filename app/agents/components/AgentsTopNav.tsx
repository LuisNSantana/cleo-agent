"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { House, GearSix, ChatsCircle, TreeStructure, SquaresFour } from '@phosphor-icons/react'
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
    // Secondary navigation bar: sits below global header. We intentionally
    // avoid using app-fixed-header (reserved for the global header) to prevent
    // double stacked fixed layers. Instead we make this bar sticky with a top
    // offset equal to the global header height variable.
    <header
      className={cn(
        "sticky top-[var(--app-header-height,56px)] z-40 w-full border-b divider-subtle",
        "bg-background/72 backdrop-blur-md supports-[backdrop-filter]:bg-background/55",
        "agents-subnav"
      )}
      style={{ ['--agents-subnav-height' as any]: '44px' }}
    >
      <div className="mx-auto flex h-[var(--agents-subnav-height)] max-w-screen-2xl items-center gap-3 px-3 sm:px-5">
        <div className="flex items-center gap-2 min-w-[12rem]">
          <span className="text-[13px] font-semibold tracking-wide text-foreground/90">Agent Control Center</span>
          <span className="hidden sm:inline text-subtle text-xs">/</span>
          <span className="hidden sm:inline text-xs text-soft capitalize">
            {(() => { const current = navItems.find(n => pathname.startsWith(n.href)); return current?.label || 'Home' })()}
          </span>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none px-1">
          {navItems.map(item => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-muted/70 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <House className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Home</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <SettingsTrigger onOpenChangeAction={setSettingsOpen} />
        </div>
      </div>
    </header>
  )
}
