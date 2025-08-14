import { NextRequest, NextResponse } from "next/server"
import { analyzeDrawing } from "@/lib/vision/analyze-drawing"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const kind: string | undefined = body?.kind
    const payload: string | undefined = body?.payload
    const modelId: string | undefined = body?.modelId

    if (!kind || (kind !== "png" && kind !== "document")) {
      return NextResponse.json({ error: "Missing or invalid kind (png|document)" }, { status: 400 })
    }

    if (!payload || typeof payload !== "string") {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 })
    }

    const result = await analyzeDrawing({ kind: kind as any, payload, modelId })
    return NextResponse.json(result)
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 })
  }
}
