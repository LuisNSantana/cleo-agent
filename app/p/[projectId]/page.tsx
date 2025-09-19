// TEMPORARY - TESTING ROUTING
export default async function ProjectPage(props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params
  const { projectId } = params

  return (
    <div style={{ padding: '2rem', background: 'green', color: 'white', textAlign: 'center' }}>
      <h1>✅ PROJECT PAGE WORKING!</h1>
      <h2>Project ID: {projectId}</h2>
      <p>If you see this, the routing is working correctly.</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  )
}

// ORIGINAL CODE COMMENTED OUT FOR TESTING
/*
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
*/
