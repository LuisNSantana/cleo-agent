"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { extractSenderInfo, getAvatarUrlForEmail, getDomainFavicon, getInitials } from "@/lib/email-avatar"
import { cn } from "@/lib/utils"

export type GmailListItem = {
  id: string
  threadId: string
  from: string
  to?: string
  subject: string
  date?: string
  snippet?: string
  labelIds?: string[]
}

export function GmailMessages({ items, className }: { items: GmailListItem[]; className?: string }) {
  if (!items?.length) return null

  return (
    <div className={cn("flex flex-col divide-y rounded-md border border-border", className)}>
      {items.map((m) => {
        const sender = extractSenderInfo(m.from)
        const avatarUrl = getAvatarUrlForEmail(sender.email, { size: 64, nameHint: sender.name })
        const domainIcon = getDomainFavicon(sender.domain, 32)
        const fallbackText = getInitials(sender.name || sender.email)
        const senderDisplay = sender.name || sender.email || m.from

        return (
          <div key={m.id} className="flex items-start gap-3 p-3">
            <Avatar className="h-9 w-9">
              {/* Try robust email avatar first; next/image not required here */}
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={senderDisplay || "sender"} />
              ) : domainIcon ? (
                <AvatarImage src={domainIcon} alt={sender.domain || "domain"} />
              ) : null}
              <AvatarFallback>{fallbackText}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate font-medium">{senderDisplay}</div>
                {m.date && (
                  <div className="text-muted-foreground ml-auto whitespace-nowrap text-xs">{new Date(m.date).toLocaleString()}</div>
                )}
              </div>
              <div className="truncate text-sm">{m.subject}</div>
              {m.snippet && (
                <div className="text-muted-foreground line-clamp-2 text-xs">{m.snippet}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
