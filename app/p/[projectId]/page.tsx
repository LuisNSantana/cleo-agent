"use client"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { ProjectView } from "./project-view"

// Force dynamic behavior (avoid static optimization in prod environments)
export const dynamic = "force-dynamic"

type Props = {
  params: { projectId: string }
}

export default function ProjectPage({ params }: Props) {
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
