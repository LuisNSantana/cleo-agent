import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/documents  { filename, title?, content_md, content_html?, chat_id?, project_id? }
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase disabled' }, { status: 200 })
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { filename, title, content_md = '', content_html, chat_id, project_id } = body
    if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 })

    // Limpiar FILE markers y su contenido antes de guardar
    function stripFileMarkers(text: string): string {
      if (!text) return '';
      // Elimina bloques <!--FILE:...-->...<!--/FILE-->
      let cleaned = text.replace(/<!--\s*FILE:[^\n|]+?(?:\|[^\n|]*?)?\|?\s*-->[\s\S]*?<!--\s*\/FILE\s*-->/g, '');
      // Elimina bloques malformados <!--FILE:...|...|...<!--/FILE-->
      cleaned = cleaned.replace(/<!--FILE:[^|]+\|[^|]*\|[\s\S]*?<!--\/FILE-->/g, '');
      // Elimina otros posibles marcadores ocultos
      cleaned = cleaned.replace(/<!--\s*GENERATED_DOCUMENT:[^\n]+?\s*[\s\S]*?END_GENERATED_DOCUMENT\s*-->/g, '');
      cleaned = cleaned.replace(/<<<FILE:[^\n]+?[\s\S]*?>>>END_FILE/g, '');
      return cleaned.trim();
    }

    const cleanContentMd = stripFileMarkers(content_md);
    const cleanContentHtml = content_html ? stripFileMarkers(content_html) : null;

    const { data, error } = await (supabase as any).from('documents').insert({
      filename,
      title: title ?? null,
      content_md: cleanContentMd,
      content_html: cleanContentHtml,
      chat_id: chat_id ?? null,
      project_id: project_id ?? null,
      user_id: auth.user.id,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET /api/documents  -> list current user's documents (lightweight)
export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase disabled' }, { status: 200 })
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await (supabase as any).from('documents')
    .select('id, filename, title, updated_at, created_at, chat_id, project_id')
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
