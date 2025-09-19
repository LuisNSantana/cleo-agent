import { ChatContainer } from "@/app/components/chat/chat-container"
import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { usePathname } from "next/navigation"

export const dynamic = "force-dynamic"

export default function Home() {
  const pathname = usePathname()
  return (
    <MessagesProvider>
      <LayoutApp>
        <div key={pathname}>
          <ChatContainer />
        </div>
      </LayoutApp>
    </MessagesProvider>
  )
}
