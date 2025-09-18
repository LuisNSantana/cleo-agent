import { Suspense } from "react"
import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { ProjectView } from "./project-view"

// Force dynamic behavior (avoid static optimization in prod environments)
export const dynamic = "force-dynamic"

// Server component wrapper: Next.js will inject params properly
export default function ProjectPage(props: any) {
  // Derive projectId from props (if Next injects) OR from pathname as fallback
  let projectId: string | undefined = props?.params?.projectId
  if (!projectId && typeof window === 'undefined') {
    // On server: parse from URL (Next build-time safeguard)
    // Note: during build, dynamic paths are not executed with real params; we guard.
    try {
      const stack = (global as any).__NEXT_PRELOAD || ''
    } catch {}
  }
  if (!projectId && typeof window !== 'undefined') {
    const segs = window.location.pathname.split('/').filter(Boolean)
    const idx = segs.findIndex(s => s === 'p')
    if (idx !== -1 && segs[idx + 1]) projectId = segs[idx + 1]
  }
  if (!projectId) {
    return <div className="p-4 text-sm opacity-70">Loading project...</div>
  }
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
