import { createChatInDb } from "./api"
import { NON_AUTH_ALLOWED_MODELS, MODEL_DEFAULT_GUEST } from "@/lib/config"
import { normalizeModelId } from "@/lib/openproviders/provider-map"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userId = body.userId as string
    const title = body.title as string | undefined
    let model = body.model as string | undefined
    const isAuthenticated = Boolean(body.isAuthenticated)
    const projectId = body.projectId as string | undefined

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
      })
    }

    // Guest model guardrail: if not authenticated and requested model is not allowed,
    // force the default guest model so creation never fails here.
    if (!isAuthenticated) {
      const requested = model || MODEL_DEFAULT_GUEST
      const normalized = normalizeModelId(requested)
      const allowedSet = new Set(
        NON_AUTH_ALLOWED_MODELS.map((m) => normalizeModelId(m))
      )
      if (!allowedSet.has(normalized)) {
        model = MODEL_DEFAULT_GUEST
      } else {
        model = requested
      }
    }

    const chat = await createChatInDb({
      userId,
      title,
      model: model!,
      isAuthenticated,
      projectId,
    })

    if (!chat) {
      return new Response(
        JSON.stringify({ error: "Supabase not available in this deployment." }),
        { status: 200 }
      )
    }

    return new Response(JSON.stringify({ chat }), { status: 200 })
  } catch (err: unknown) {
    console.error("Error in create-chat endpoint:", err)

    if (err instanceof Error && err.message === "DAILY_LIMIT_REACHED") {
      return new Response(
        JSON.stringify({ error: err.message, code: "DAILY_LIMIT_REACHED" }),
        { status: 403 }
      )
    }

    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500 }
    )
  }
}
