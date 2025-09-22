"use client"

import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[]
  className?: string
  separator?: React.ComponentType<{ className?: string }>
}

export function BreadcrumbNavigation({
  items,
  className,
  separator: Separator = ChevronRight
}: BreadcrumbNavigationProps) {
  if (!items.length) return null

  return (
    <nav
      className={cn(
        "flex items-center space-x-1 text-sm text-muted-foreground",
        className
      )}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const Icon = item.icon

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <Separator className="h-3 w-3 mx-1 text-muted-foreground/50" />
              )}

              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                    "hover:bg-muted hover:text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {item.label}
                  </span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1",
                    isLast
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {item.label}
                  </span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Hook para generar breadcrumbs automáticamente basado en la ruta
export function useBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(Boolean)

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Cleo', href: '/', icon: Home }
  ]

  let currentPath = ''

  for (const segment of pathSegments) {
    currentPath += `/${segment}`

    // Traducir segmentos a labels amigables
    let label = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())

    // Labels específicas para rutas conocidas
    switch (segment) {
      case 'agents':
        label = 'Agent Control Center'
        break
      case 'manage':
        label = 'Manage Agents'
        break
      case 'architecture':
        label = 'Architecture'
        break
      case 'chat':
        label = 'Chat'
        break
      case 'tasks':
        label = 'Tasks'
        break
      case 'dashboard':
        label = 'Dashboard'
        break
      case 'settings':
        label = 'Settings'
        break
    }

    breadcrumbs.push({
      label,
      href: currentPath
    })
  }

  return breadcrumbs
}