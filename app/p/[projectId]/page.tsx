// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Suspense } from "react"
import { ProjectView } from "./project-view"

type ProjectPageProps = {
  params: Promise<{ projectId: string }>
}

export default async function ProjectPage(props: ProjectPageProps) {
  const params = await props.params
  const { projectId } = params

  return (
    <Suspense fallback={<div className="p-4 text-sm opacity-70">Loading project view...</div>}>
      <ProjectView projectId={projectId} />
    </Suspense>
  )
}
