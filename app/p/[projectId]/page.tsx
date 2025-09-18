import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import NextDynamic from "next/dynamic"

// Force client-side rendering to prevent SSR hydration mismatches in production
const ProjectView = NextDynamic(() => import("./project-view").then(mod => ({ default: mod.ProjectView })), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-muted-foreground animate-pulse">Loading project...</div>
    </div>
  )
})

// Ensure this page is always rendered dynamically (no static caching in prod)
export const dynamic = "force-dynamic"

type Props = {
  params: { projectId: string }
}

export default function Page({ params }: Props) {
  const { projectId } = params

  console.log(`[Page] Rendering project page for ID: ${projectId}`)

  return (
    <MessagesProvider>
      <LayoutApp>
        <div data-project-page={projectId} data-testid="project-page">
          <ProjectView projectId={projectId} key={projectId} />
        </div>
      </LayoutApp>
    </MessagesProvider>
  )
}
