import { tool } from 'ai'
import { z } from 'zod'

export const memoryAddNoteTool = tool({
  description: 'Persist a small, stable memory about the user (preferences, facts, long-term goals). Creates/updates user_memory_auto.md and reindexes it for RAG.',
  inputSchema: z.object({
    topic: z.string().min(2).max(80).describe('Short topic for this memory, e.g., "Idioma preferido" or "Zona horaria"'),
    note: z.string().min(5).max(500).describe('One short sentence with the fact/preference, in the user\'s language.'),
    importance: z.enum(['low','medium','high']).default('medium').describe('How important this memory is for personalization'),
  }),
  execute: async ({ topic, note, importance }) => {
    try {
      // Dynamic imports to avoid build issues with server-only code
      const { getCurrentUserId } = await import('@/lib/server/request-context')
      const { createClient } = await import('@/lib/supabase/server')
      const { indexDocument } = await import('@/lib/rag/index-document')
      
      const userId = getCurrentUserId()
      if (!userId) return { success: false, message: 'No user context available' }

      const supabase = await createClient()
      if (!supabase) return { success: false, message: 'Database not available' }

      const filename = 'user_memory_auto.md'
      const title = 'Memoria del usuario (auto)'
      const now = new Date().toISOString()

      // Get or create document
      const { data: existing, error: selErr } = await (supabase as any)
        .from('documents')
        .select('id, content_md')
        .eq('user_id', userId)
        .eq('filename', filename)
        .maybeSingle?.() ?? await (supabase as any)
          .from('documents')
          .select('id, content_md')
          .eq('user_id', userId)
          .eq('filename', filename)
          .single()

      let content = existing?.content_md as string | undefined
      if (!content) {
        content = `# Memoria del usuario (auto)\n\nEste documento almacena notas estables sobre preferencias y datos útiles para personalización.\n\n`
      }
      content += `\n## ${topic}\n- Nota: ${note}\n- Importancia: ${importance}\n- Actualizado: ${now}\n`

      if (existing?.id) {
        const { error: updErr } = await (supabase as any)
          .from('documents')
          .update({ title, content_md: content })
          .eq('id', existing.id)
          .eq('user_id', userId)
        if (updErr) return { success: false, message: updErr.message }
        try { await indexDocument(existing.id, { force: true }) } catch {}
        return { success: true, message: 'Memory updated', documentId: existing.id }
      }

      const { data: ins, error: insErr } = await (supabase as any)
        .from('documents')
        .insert({ filename, title, content_md: content, user_id: userId })
        .select('id')
        .single()
      if (insErr || !ins?.id) return { success: false, message: insErr?.message || 'Insert failed' }
      try { await indexDocument(ins.id, { force: true }) } catch {}
      return { success: true, message: 'Memory created', documentId: ins.id }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Unknown error' }
    }
  }
})
