"use client"


import { Suspense } from "react"
import { ProjectView } from "./project-view"
import { useParams } from "next/navigation"
import React from "react"

// Simple error boundary for runtime errors
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    // Log error to console or external service
    if (typeof window !== "undefined") {
      console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    }
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', padding: 16 }}>Error rendering project view: {String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}

import { usePathname } from "next/navigation"

export default function ProjectPage() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = typeof params?.projectId === "string" ? params.projectId : Array.isArray(params?.projectId) ? params.projectId[0] : undefined;

  // Enhanced debugging logs
  console.log("[ProjectPage] ==> RENDER START <==");
  console.log("[ProjectPage] useParams:", params);
  console.log("[ProjectPage] projectId extracted:", projectId);
  console.log("[ProjectPage] pathname from usePathname:", pathname);
  
  if (typeof window !== "undefined") {
    console.log("[ProjectPage] window.location.pathname:", window.location.pathname);
    console.log("[ProjectPage] window.location.href:", window.location.href);
  }

  // Runtime check for ProjectView import
  if (!ProjectView) {
    console.error("[ProjectPage] ProjectView component is undefined!");
    return <div style={{ color: 'red', padding: 16 }}>ProjectView component failed to import or is undefined/null.</div>;
  }

  if (!projectId) {
    console.warn("[ProjectPage] No projectId found in params!");
    return <div className="p-4 text-sm opacity-70">Loading project... (projectId missing)</div>;
  }

  console.log("[ProjectPage] ==> RENDERING ProjectView with projectId:", projectId);
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="p-4 text-sm opacity-70">Loading project view… (Suspense fallback)</div>}>
        <div data-project-page={projectId} data-testid="project-page">
          <ProjectView projectId={projectId} key={`project-${projectId}-${pathname}`} />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
