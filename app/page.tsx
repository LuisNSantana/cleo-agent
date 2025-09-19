import { ChatContainer } from "@/app/components/chat/chat-container"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"

export const dynamic = "force-dynamic"

export default function Home() {
  return (
    <MessagesProvider>
      <ChatContainer />
    </MessagesProvider>
  )
}
