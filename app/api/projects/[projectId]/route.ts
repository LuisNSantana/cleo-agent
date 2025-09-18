import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Structured logging helper (kept minimal to avoid dependency)
function logProjectAPI(message: string, meta: Record<string, any> = {}) {
  try {
    const line = `[ProjectAPI] ${message} :: ${JSON.stringify(meta)}`
    console.log(line)
  } catch {
    console.log(`[ProjectAPI] ${message}`)
  }
}

function extractProjectId(request: Request): string | null {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const idx = segments.findIndex(s => s === 'projects')
    if (idx !== -1 && segments[idx + 1]) return segments[idx + 1]
    return null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const projectId = extractProjectId(request)
    if (!projectId) {
      logProjectAPI('Missing projectId in path (GET)')
      return NextResponse.json({ error: 'Invalid project path' }, { status: 400 })
    }
    const started = Date.now()
    const debug = request.headers.get('x-debug-project') === '1' || process.env.PROJECT_DEBUG === '1'
  if (debug) logProjectAPI('GET start', { projectId })
    const supabase = await createClient()

    if (!supabase) {
      logProjectAPI('Supabase client unavailable', { projectId })
      return new Response(
        JSON.stringify({ error: "Supabase not available in this deployment." }),
        { status: 200 }
      )
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()

    // If auth fails, return a placeholder project to allow client-side auth
    if (authError || !authData?.user?.id) {
      if (debug) logProjectAPI('Auth failed – returning placeholder', { projectId, authError: authError?.message })
      return NextResponse.json({
        id: projectId,
        name: "Loading...",
        description: "",
        user_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _auth_failed: true // Flag to indicate auth failed
      }, { status: 200 })
    }

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", authData.user.id)
      .single()

    if (error) {
      logProjectAPI('Query error', { projectId, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      logProjectAPI('Not found', { projectId })
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    if (debug) logProjectAPI('GET success', { projectId, durationMs: Date.now() - started })
    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error("Error in project endpoint:", err)
    // Return placeholder on error to prevent UI breaking
    const projectId = extractProjectId(request)
    return NextResponse.json({
      id: projectId,
      name: "Error loading project",
      description: "",
      user_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _error: true
    }, { status: 200 })
  }
}

export async function PUT(request: Request) {
  try {
    const projectId = extractProjectId(request)
    if (!projectId) {
      logProjectAPI('Missing projectId in path (PUT)')
      return NextResponse.json({ error: 'Invalid project path' }, { status: 400 })
    }
    const started = Date.now()
    const debug = request.headers.get('x-debug-project') === '1' || process.env.PROJECT_DEBUG === '1'
    if (debug) logProjectAPI('PUT start', { projectId })
    const { name, description, notes } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    if (!supabase) {
      logProjectAPI('Supabase client unavailable (PUT)', { projectId })
      return new Response(
        JSON.stringify({ error: "Supabase not available in this deployment." }),
        { status: 200 }
      )
    }

    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user?.id) {
      logProjectAPI('Unauthorized PUT', { projectId })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("projects")
      .update({ 
        name: name.trim(),
        description: typeof description === 'string' ? description : null,
        notes: typeof notes === 'string' ? notes : null,
      })
      .eq("id", projectId)
      .eq("user_id", authData.user.id)
      .select()
      .single()

    if (error) {
      logProjectAPI('Update error', { projectId, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      logProjectAPI('Update not found', { projectId })
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    if (debug) logProjectAPI('PUT success', { projectId, durationMs: Date.now() - started })
    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error("Error updating project:", err)
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const projectId = extractProjectId(request)
    if (!projectId) {
      logProjectAPI('Missing projectId in path (DELETE)')
      return NextResponse.json({ error: 'Invalid project path' }, { status: 400 })
    }
    const started = Date.now()
    const debug = request.headers.get('x-debug-project') === '1' || process.env.PROJECT_DEBUG === '1'
    if (debug) logProjectAPI('DELETE start', { projectId })
    const supabase = await createClient()

    if (!supabase) {
      logProjectAPI('Supabase client unavailable (DELETE)', { projectId })
      return new Response(
        JSON.stringify({ error: "Supabase not available in this deployment." }),
        { status: 200 }
      )
    }

    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user?.id) {
      logProjectAPI('Unauthorized DELETE', { projectId })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // First verify the project exists and belongs to the user
    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", authData.user.id)
      .single()

    if (fetchError || !project) {
      logProjectAPI('Delete not found', { projectId })
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Delete the project (this will cascade delete related chats due to FK constraint)
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("user_id", authData.user.id)

    if (error) {
      logProjectAPI('Delete error', { projectId, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (debug) logProjectAPI('DELETE success', { projectId, durationMs: Date.now() - started })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error("Error deleting project:", err)
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500 }
    )
  }
}
