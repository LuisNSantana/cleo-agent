"use client"

import { Suspense } from "react"
import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { ProjectView } from "./project-view"
import { useParams } from "next/navigation"

export default function ProjectPage() {
  const params = useParams()
  const projectId = typeof params?.projectId === "string" ? params.projectId : Array.isArray(params?.projectId) ? params.projectId[0] : undefined

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
