import { createClient } from "@/lib/supabase/server"
import { indexDocument } from "@/lib/rag/index-document"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user's preferences
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

  if (error) {
      // If no preferences exist, return defaults
      if (error.code === "PGRST116") {
    console.log('[Prefs][GET] No stored preferences found, returning defaults with personalityType=empathetic')
        return NextResponse.json({
          layout: "fullscreen",
          prompt_suggestions: true,
          show_tool_invocations: true,
          show_conversation_previews: true,
          multi_model_enabled: false,
          hidden_models: [],
          personality_settings: {
            personalityType: "empathetic",
            creativityLevel: 70,
            formalityLevel: 30,
            enthusiasmLevel: 80,
            helpfulnessLevel: 90,
            useEmojis: true,
            proactiveMode: true,
            customStyle: "",
          },
        })
      }

      console.error("Error fetching user preferences:", error)
      return NextResponse.json(
        { error: "Failed to fetch user preferences" },
        { status: 500 }
      )
    }

    const personality_settings = (data as any).personality_settings || {
      personalityType: "empathetic",
      creativityLevel: 70,
      formalityLevel: 30,
      enthusiasmLevel: 80,
      helpfulnessLevel: 90,
      useEmojis: true,
      proactiveMode: true,
      customStyle: "",
    }

    console.log('[Prefs][GET] Returning preferences', {
      userId: user.id,
      personalityType: personality_settings?.personalityType,
    })

    return NextResponse.json({
      layout: data.layout,
      prompt_suggestions: data.prompt_suggestions,
      show_tool_invocations: data.show_tool_invocations,
      show_conversation_previews: data.show_conversation_previews,
      multi_model_enabled: data.multi_model_enabled,
      hidden_models: data.hidden_models || [],
      personality_settings,
    })
  } catch (error) {
    console.error("Error in user-preferences GET API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse the request body
    const body = await request.json()
    const {
      layout,
      prompt_suggestions,
      show_tool_invocations,
      show_conversation_previews,
      multi_model_enabled,
      hidden_models,
      personality_settings,
    } = body

    if (personality_settings?.personalityType) {
      console.log('[Prefs][PUT] Incoming update', {
        userId: user.id,
        personalityType: personality_settings.personalityType,
      })
    }

    // Validate the data types
    if (layout && typeof layout !== "string") {
      return NextResponse.json(
        { error: "layout must be a string" },
        { status: 400 }
      )
    }

    if (hidden_models && !Array.isArray(hidden_models)) {
      return NextResponse.json(
        { error: "hidden_models must be an array" },
        { status: 400 }
      )
    }

    // Prepare update object with only provided fields
    const updateData: any = {}
    if (layout !== undefined) updateData.layout = layout
    if (prompt_suggestions !== undefined)
      updateData.prompt_suggestions = prompt_suggestions
    if (show_tool_invocations !== undefined)
      updateData.show_tool_invocations = show_tool_invocations
    if (show_conversation_previews !== undefined)
      updateData.show_conversation_previews = show_conversation_previews
    if (multi_model_enabled !== undefined)
      updateData.multi_model_enabled = multi_model_enabled
    if (hidden_models !== undefined) updateData.hidden_models = hidden_models
    if (personality_settings !== undefined) updateData.personality_settings = personality_settings

    // Try to update first, then insert if doesn't exist
    const { data, error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          ...updateData,
        },
        {
          onConflict: "user_id",
        }
      )
      .select("*")
      .single()

    if (error) {
      console.error("Error updating user preferences:", error)
      return NextResponse.json(
        { error: "Failed to update user preferences" },
        { status: 500 }
      )
    }

    const savedPersonality = (data as any).personality_settings || {
      personalityType: "empathetic",
      creativityLevel: 70,
      formalityLevel: 30,
      enthusiasmLevel: 80,
      helpfulnessLevel: 90,
      useEmojis: true,
      proactiveMode: true,
      customStyle: "",
    }

    console.log('[Prefs][PUT] Saved preferences', {
      userId: user.id,
      personalityType: savedPersonality?.personalityType,
    })

    // Sync a lightweight user profile document into RAG so retrieval can reflect preferences
    try {
      const filename = 'user_profile_auto.md'
      const title = 'Perfil del usuario (auto)'
      const now = new Date().toISOString()
      const md = `# Perfil del usuario (auto)

Este documento se genera automáticamente a partir de tus preferencias para ayudar a Cleo a personalizar mejor sus respuestas.

## Personalidad
- Tipo: ${savedPersonality.personalityType}

## Ajustes
- Creatividad: ${savedPersonality.creativityLevel}%
- Formalidad: ${savedPersonality.formalityLevel}%
- Entusiasmo: ${savedPersonality.enthusiasmLevel}%
- Orientación a la ayuda: ${savedPersonality.helpfulnessLevel}%
- Usa emojis: ${savedPersonality.useEmojis ? 'sí' : 'no'}
- Modo proactivo: ${savedPersonality.proactiveMode ? 'sí' : 'no'}

## Estilo personalizado
${savedPersonality.customStyle || '(sin instrucciones personalizadas)'}

_Última actualización: ${now}_
`

      // Upsert by filename for this user
      const { data: existing } = await (supabase as any)
        .from('documents')
        .select('id')
        .eq('user_id', user.id)
        .eq('filename', filename)
        .limit(1)
        .maybeSingle?.() ?? await (supabase as any)
        .from('documents')
        .select('id')
        .eq('user_id', user.id)
        .eq('filename', filename)
        .limit(1)
        .single()

      if (existing?.id) {
        const { error: updErr } = await (supabase as any)
          .from('documents')
          .update({ title, content_md: md })
          .eq('id', existing.id)
          .eq('user_id', user.id)
        if (updErr) {
          console.warn('[Prefs][PUT] Failed to update profile doc:', updErr.message)
        } else {
          console.log('[Prefs][PUT] Updated profile doc:', existing.id)
          try { await indexDocument(existing.id, { force: true }) } catch (e:any) { console.warn('[Prefs][PUT] Index profile doc failed:', e.message) }
        }
      } else {
        const { data: ins, error: insErr } = await (supabase as any)
          .from('documents')
          .insert({ filename, title, content_md: md, user_id: user.id })
          .select('id')
          .single()
        if (insErr) {
          console.warn('[Prefs][PUT] Failed to create profile doc:', insErr.message)
        } else if (ins?.id) {
          console.log('[Prefs][PUT] Created profile doc:', ins.id)
          try { await indexDocument(ins.id, { force: true }) } catch (e:any) { console.warn('[Prefs][PUT] Index profile doc failed:', e.message) }
        }
      }
    } catch (e:any) {
      console.warn('[Prefs][PUT] Skipped RAG profile sync:', e.message)
    }

    return NextResponse.json({
      success: true,
      layout: data.layout,
      prompt_suggestions: data.prompt_suggestions,
      show_tool_invocations: data.show_tool_invocations,
      show_conversation_previews: data.show_conversation_previews,
      multi_model_enabled: data.multi_model_enabled,
      hidden_models: data.hidden_models || [],
      personality_settings: savedPersonality,
    })
  } catch (error) {
    console.error("Error in user-preferences PUT API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
