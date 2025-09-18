import { Suspense } from "react"
import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { ProjectView } from "./project-view"

// Force dynamic behavior (avoid static optimization in prod environments)
export const dynamic = "force-dynamic"

// Server component wrapper: Next.js will inject params properly
export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params
  return (
    <MessagesProvider>
      <LayoutApp>
        <Suspense fallback={<div className="p-4 text-sm opacity-70">Loading project…</div>}>
          <div data-project-page={projectId} data-testid="project-page">
            <ProjectView projectId={projectId} key={projectId} />
          </div>
        </Suspense>
      </LayoutApp>
    </MessagesProvider>
  )
}
