import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { retrieveRelevant, buildContextBlock } from '@/lib/rag/retrieve'
import { indexDocument } from '@/lib/rag/index-document'
import { generatePersonalizedPrompt } from '@/lib/prompts/personality'
import { defaultPreferences, type PersonalitySettings } from '@/lib/user-preference-store/utils'

export type BuildPromptParams = {
  baseSystemPrompt?: string
  model: string
  messages: Array<{ role: string; content: any }>
  supabase: any | null
  realUserId: string | null
  enableSearch: boolean
  documentId?: string
  debugRag?: boolean
}

export async function buildFinalSystemPrompt(params: BuildPromptParams) {
  const {
    baseSystemPrompt = SYSTEM_PROMPT_DEFAULT,
    model,
    messages,
    supabase,
    realUserId,
    enableSearch,
    documentId,
    debugRag,
  } = params

  const autoRagEnabled = true
  const retrievalRequested = enableSearch || !!documentId || autoRagEnabled
  let ragSystemAddon = ''

  if (retrievalRequested) {
    try {
      const lastUser = messages.slice().reverse().find((m) => m.role === 'user')
      let userPlain = ''
      if (lastUser) {
        if (typeof lastUser.content === 'string') userPlain = lastUser.content
        else if (Array.isArray(lastUser.content)) {
          userPlain = lastUser.content
            .filter((p: any) => p?.type === 'text')
            .map((p: any) => p.text || p.content || '')
            .join('\n')
        }
      }

      if (userPlain.trim()) {
        try {
          const { data: userDocs } = await (supabase as any)
            .from('documents')
            .select('id')
            .eq('user_id', realUserId)
            .limit(1)
          if (process.env.NODE_ENV !== 'production') {
            console.log('[RAG] DEBUG - Has docs?', Boolean(userDocs?.length))
          }
        } catch {}

        let retrieved = await retrieveRelevant({
          userId: realUserId!,
          query: userPlain,
          topK: 6,
          documentId,
          useHybrid: true,
          useReranking: true,
        })

        if (retrieved.length) {
          ragSystemAddon = buildContextBlock(retrieved)
          if (debugRag) console.log('[RAG] Context preview:\n' + ragSystemAddon.slice(0, 400))
        } else {
          if (!documentId && supabase) {
            try {
              const { data: docs } = await (supabase as any)
                .from('documents')
                .select('id, updated_at')
                .eq('user_id', realUserId)
                .order('updated_at', { ascending: false })
                .limit(3)
              if (docs?.length) {
                for (const d of docs) {
                  const { count } = await (supabase as any)
                    .from('document_chunks')
                    .select('id', { count: 'exact', head: true })
                    .eq('document_id', d.id)
                  if (!count || count === 0) {
                    try { await indexDocument(d.id, { force: true }) } catch {}
                  }
                }
                // retry
                retrieved = await retrieveRelevant({
                  userId: realUserId!,
                  query: userPlain,
                  topK: 6,
                  useHybrid: true,
                  useReranking: true,
                })
                if (retrieved.length) ragSystemAddon = buildContextBlock(retrieved)
              }
            } catch {}
          }
        }

        if (ragSystemAddon && ragSystemAddon.trim().length > 0) {
          const currentChunkCount = (ragSystemAddon.match(/\n---\n/g) || []).length
          if (currentChunkCount < 3) {
            try {
              const profileQuery = 'perfil del usuario nombre intereses gustos comida favorita hobbies preferencias biografia datos personales'
              const extra = await retrieveRelevant({
                userId: realUserId!,
                query: profileQuery,
                topK: 6,
                documentId,
                useHybrid: true,
                useReranking: true,
              })
              if (extra.length) {
                const extraBlock = buildContextBlock(extra)
                if (extraBlock && extraBlock.length > 0) ragSystemAddon += '\n' + extraBlock
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      console.error('[RAG] retrieval failed', e)
    }
  }

  // Fetch user personality settings (if available) and build a compact personalized header
  let personalitySettings: PersonalitySettings | undefined
  if (supabase && realUserId) {
    try {
      const { data, error } = await (supabase as any)
        .from('user_preferences')
        .select('personality_settings')
        .eq('user_id', realUserId)
        .single()

      if (!error && data?.personality_settings) {
        personalitySettings = data.personality_settings as PersonalitySettings
      } else {
        personalitySettings = defaultPreferences.personalitySettings
      }
    } catch {
      personalitySettings = defaultPreferences.personalitySettings
    }
  } else {
    personalitySettings = defaultPreferences.personalitySettings
  }

  const personaPrompt = generatePersonalizedPrompt(model, personalitySettings, { compact: true })

  const CONTEXT_AND_DOC_RULES = `CONTEXT USAGE\n- If CONTEXT is provided, use it directly; don't claim missing info.\n\nDOCUMENTS\n- If the user wants to work on / edit / collaborate on a document found in the CONTEXT, offer opening it in the Canvas Editor (e.g., "¿Quieres que abra [nombre del documento] en el editor colaborativo?")`

  const personalizationInstruction = `IMPORTANT: ALWAYS use information from the CONTEXT to respond. This includes:
- Personal information (name, interests, favorite food, hobbies, communication style)  
- Work documents, stories, projects, notes that the user has uploaded
- Any content the user has shared previously

If the user asks about something that is in the CONTEXT, use it directly to respond. DO NOT say you don't have information if it's available in the context.

SPECIAL RULE FOR DOCUMENTS: If the user wants to "work on", "edit", "collaborate", "expand", "continue", "review" a document found in the context, ALWAYS suggest opening the document in the Canvas Editor. Use phrases like: "Would you like me to open [document name] in the collaborative editor so we can work on it together?"`

  const searchGuidance = (model === 'grok-3-mini' && enableSearch)
    ? `\n\nSEARCH MODE: For Faster (grok-3-mini), use native Live Search (built into the model). Do NOT call the webSearch tool. Include citations when available.`
    : ''

  // Compose final prompt: [RAG block?] + [persona header] + [context/doc rules] + [guidance] + [base system]
  const finalSystemPrompt = ragSystemAddon
    ? `${ragSystemPromptIntro(ragSystemAddon)}\n\n${personaPrompt}\n\n${CONTEXT_AND_DOC_RULES}${searchGuidance}\n\n${baseSystemPrompt}`
    : `${personaPrompt}\n\n${CONTEXT_AND_DOC_RULES}${searchGuidance}\n\n${baseSystemPrompt}`

  return { finalSystemPrompt, usedContext: !!ragSystemAddon }
}

function ragSystemPromptIntro(ragBlock: string) {
  return ragBlock
}
