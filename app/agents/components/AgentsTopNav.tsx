"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { House, GearSix, ChatsCircle, TreeStructure, SquaresFour } from '@phosphor-icons/react'
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
  const current = navItems.find((item) => pathname.startsWith(item.href))?.label ?? 'Home'

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-3 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Agents
            </span>
            <span className="text-sm font-medium text-foreground">
              {current}
            </span>
          </div>
          <div className="hidden sm:inline-flex h-10 w-px bg-border/60" aria-hidden />
        </div>
        <nav className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-foreground/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="font-medium text-muted-foreground hover:text-foreground">
            <Link href="/">
              <House className="mr-2 h-4 w-4" />
              Inicio
            </Link>
          </Button>
          <SettingsTrigger onOpenChangeAction={() => {}} />
        </div>
      </div>
    </section>
  )
}
