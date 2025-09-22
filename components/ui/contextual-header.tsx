"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import { BreadcrumbNavigation, useBreadcrumbs } from '@/components/ui/breadcrumb-navigation'
import { Button } from '@/components/ui/button'
import { House, GearSix, ChatsCircle, TreeStructure, SquaresFour, List } from '@phosphor-icons/react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { SettingsTrigger } from '@/app/components/layout/settings/settings-trigger'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ContextualHeaderProps {
  className?: string
}

const agentNavItems = [
  { href: '/agents', label: 'Home', icon: House },
  { href: '/agents/architecture', label: 'Architecture', icon: TreeStructure },
  { href: '/agents/manage', label: 'Manage', icon: GearSix },
  { href: '/agents/chat', label: 'Chat', icon: ChatsCircle },
  { href: '/agents/tasks', label: 'Tasks', icon: SquaresFour },
]

export function ContextualHeader({ className }: ContextualHeaderProps) {
  const pathname = usePathname()
  const breadcrumbs = useBreadcrumbs(pathname)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isInAgentsSection = pathname.startsWith('/agents')

  if (isInAgentsSection) {
    return (
      <header
        className={cn(
          "sticky top-[var(--app-header-height,56px)] z-40 w-full border-b border-border/40",
          "bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
          "transition-all duration-200",
          className
        )}
        style={{ ['--agents-subnav-height' as any]: '56px' }}
      >
        <div className="mx-auto flex h-[var(--agents-subnav-height)] max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left side: Breadcrumbs + Section title */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <BreadcrumbNavigation
              items={breadcrumbs}
              className="hidden sm:flex"
            />

            {/* Mobile: Just section title */}
            <div className="flex items-center gap-2 sm:hidden">
              <span className="text-sm font-medium text-foreground/90 truncate">
                Agent Control Center
              </span>
            </div>

            {/* Current section indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
              <span className="text-xs font-medium text-muted-foreground">Current:</span>
              <span className="text-xs font-semibold text-foreground">
                {(() => {
                  const current = agentNavItems.find(n => pathname.startsWith(n.href))
                  return current?.label || 'Home'
                })()}
              </span>
            </div>
          </div>

          {/* Right side: Navigation + Actions */}
          <div className="flex items-center gap-2">
            {/* Agent section navigation - compact */}
            <nav className="hidden md:flex items-center gap-1">
              {agentNavItems.map(item => {
                const Icon = item.icon
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                      active
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Mobile navigation menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <List className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {agentNavItems.map(item => {
                    const Icon = item.icon
                    const active = pathname === item.href
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2 w-full',
                            active && 'bg-primary/10 text-primary'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 border-l border-border/40 pl-2 ml-2">
              <NotificationBell />
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <House className="h-4 w-4" />
                </Button>
              </Link>
              <SettingsTrigger onOpenChangeAction={setSettingsOpen} />
            </div>
          </div>
        </div>
      </header>
    )
  }

  // Default header for other sections - could be extended for other contexts
  return (
    <header
      className={cn(
        "sticky top-[var(--app-header-height,56px)] z-40 w-full border-b border-border/40",
        "bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BreadcrumbNavigation items={breadcrumbs} />

        <div className="flex items-center gap-2">
          <NotificationBell />
          <SettingsTrigger onOpenChangeAction={setSettingsOpen} />
        </div>
      </div>
    </header>
  )
}