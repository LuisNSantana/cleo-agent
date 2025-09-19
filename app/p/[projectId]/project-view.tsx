"use client"

// Componente mínimo para aislar problemas de importación/renderizado
export function ProjectView({ projectId }: { projectId: string }) {
	console.log(`[ProjectView-MINIMAL] Rendered! projectId:`, projectId);
	if (typeof window !== 'undefined') {
		console.log(`[ProjectView-MINIMAL] window.location.pathname:`, window.location.pathname);
	}
	return (
		<div style={{ padding: 32, fontSize: 18, color: '#0a0' }}>
			<strong>[ProjectView-MINIMAL] Rendered!</strong>
			<div>projectId: {projectId}</div>
			<div>window.location.pathname: {typeof window !== 'undefined' ? window.location.pathname : 'SSR'}</div>
			<div>Hora: {new Date().toLocaleString()}</div>
		</div>
	);
}
