import { generateText, type ImagePart, type CoreMessage } from "ai"
import { openproviders } from "@/lib/openproviders"
import { MODEL_DEFAULT } from "@/lib/config"

export type AnalyzeDrawingInput = {
  kind: "png" | "document"
  payload: string
  modelId?: string
}

export async function analyzeDrawing(input: AnalyzeDrawingInput) {
  const { kind, payload, modelId } = input
  const model = modelId || process.env.PREFERRED_MODEL || MODEL_DEFAULT

  // Choose provider/model implementation
  const providerModel = openproviders(model as any)

  const systemPrompt = `Eres un asistente creativo y conciso. Analiza el boceto proporcionado y responde únicamente con un objeto JSON con las siguientes propiedades:
- summary: una descripción en español, concisa (máx. 120 palabras), de lo que muestra el boceto y la intención probable.
- details: un objeto opcional con campos relevantes (entities, layout, suggestions, steps) si aplica.
Asegúrate de devolver SOLO JSON válido.`

  const userMessages: CoreMessage[] = []

  if (kind === "png") {
    // Image payload (data URL)
    userMessages.push({
      role: "user",
      content: [
        { type: "text", text: "Adjunto una imagen con un boceto para analizar." },
        { type: "image", image: payload } as ImagePart,
      ],
    })
  } else {
    // Document payload (tldraw JSON) — include as text block
    const truncated = typeof payload === "string" && payload.length > 10000 ? payload.slice(0, 10000) + "..." : payload
    userMessages.push({
      role: "user",
      content: [
        { type: "text", text: `Adjunto el documento de la pizarra en formato JSON. Analízalo y responde en JSON:
\n
tldraw JSON:
${truncated}` },
      ],
    })
  }

  // Compose messages with the system prompt + user
  const messages: CoreMessage[] = [
    { role: "system", content: systemPrompt },
    ...userMessages,
  ]

  const res = await generateText({
    model: providerModel,
    messages,
    // be conservative
  temperature: 0.2,
  maxOutputTokens: 800,
  })

  const raw = res.text?.trim() ?? ""

  // Try to parse JSON from the model output. If it fails, fallback to a plain summary field.
  try {
    // Some models include backticks or markdown — try to extract JSON substring
    const first = raw.indexOf("{")
    const last = raw.lastIndexOf("}")
    const jsonText = first !== -1 && last !== -1 ? raw.slice(first, last + 1) : raw
    const parsed = JSON.parse(jsonText)
    // Normalize
    const result = {
      summary: typeof parsed.summary === "string" ? parsed.summary : String(parsed.summary || ""),
      details: parsed.details ?? null,
      raw: raw,
    }
    return result
  } catch (e) {
    return { summary: raw, details: null, raw }
  }
}
