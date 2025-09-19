// TEMPORARY TEST PAGE - DELETE AFTER FIXING
export default async function TestProjectPage(props: { params: Promise<{ projectId: string }> }) {
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