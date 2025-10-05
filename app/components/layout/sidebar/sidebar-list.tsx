import { Chat } from "@/lib/chat-store/types"
import { SidebarItem } from "./sidebar-item"

type SidebarListProps = {
  title: string
  items: Chat[]
  currentChatId: string
}

export function SidebarList({ title, items, currentChatId }: SidebarListProps) {
  return (
    <div className="space-y-1">
      <h3 className="overflow-hidden px-3 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground break-all text-ellipsis">
        {title}
      </h3>
      <div className="space-y-1 px-2">
        {items.map((chat) => (
          <SidebarItem
            key={chat.id}
            chat={chat}
            currentChatId={currentChatId}
          />
        ))}
      </div>
    </div>
  )
}
