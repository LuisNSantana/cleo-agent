import type { CoreMessage } from "ai"

export async function convertUserMultimodalMessages(messages: CoreMessage[], model: string, modelVision: boolean): Promise<any[]> {
  // Count input images for diagnostics
  let inputImageCount = 0
  messages.forEach((msg) => {
    if (Array.isArray(msg.content)) {
      inputImageCount += msg.content.filter((p: any) => 
        p.type === 'image' || 
        (p.type === 'file' && p.mediaType?.startsWith('image/'))
      ).length
    }
  })

  const converted = await Promise.all(
    messages.map(async (msg) => {
      if (msg.role === "user" && Array.isArray(msg.content)) {
        const convertedContent = await Promise.all(
          msg.content
            .filter(
              (part: unknown) =>
                part &&
                typeof part === "object" &&
                "type" in part &&
                ((part as { type: string }).type === "text" ||
                  (part as { type: string }).type === "file" ||
                  (part as { type: string }).type === "image")
            )
            .map(async (part: unknown) => {
              const typedPart = part as {
                type: string
                mediaType?: string
                url?: string
                name?: string
                text?: string
                content?: string
                image?: string | URL
              }

              // Handle parts that are already in image format (e.g., from previous conversions)
              if (typedPart.type === "image" && typedPart.image) {
                if (!modelVision) {
                  return {
                    type: "text" as const,
                    text: `[IMAGEN] - El modelo ${model} no soporta análisis de imágenes. Para analizar imágenes, selecciona Faster o Smarter con visión.`,
                  }
                }
                return { type: "image" as const, image: typedPart.image }
              }

              if (
                typedPart.type === "file" &&
                typedPart.mediaType?.startsWith("image/") &&
                typedPart.url
              ) {
                if (!modelVision) {
                  return {
                    type: "text" as const,
                    text: `[IMAGEN: ${typedPart.name || "imagen.jpg"}] - El modelo ${model} no soporta análisis de imágenes. Para analizar imágenes, selecciona Faster o Smarter con visión.`,
                  }
                }
                return { type: "image" as const, image: typedPart.url }
              }

              if (
                typedPart.type === "file" &&
                !typedPart.mediaType?.startsWith("image/") &&
                typedPart.url
              ) {
                const fileName = typedPart.name || "document"
                let fileType = typedPart.mediaType || "unknown"

                if (
                  fileType === "application/octet-stream" ||
                  fileType === "unknown"
                ) {
                  const extension = fileName.toLowerCase().split(".").pop()
                  const extensionToMime: { [key: string]: string } = {
                    md: "text/markdown",
                    txt: "text/plain",
                    csv: "text/csv",
                    json: "application/json",
                    pdf: "application/pdf",
                    doc: "application/msword",
                    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  }
                  if (extension && extensionToMime[extension]) {
                    fileType = extensionToMime[extension]
                  }
                }

                // ✅ FIX: HTTP URLs (Supabase Storage) should be preserved as file parts
                // so tools like extract_text_from_pdf can download and process them
                if (typedPart.url.startsWith("http://") || typedPart.url.startsWith("https://")) {
                  console.log(`📋 ✅ [PDF] Preserving HTTP URL as file part: ${typedPart.url.substring(0, 80)}...`)
                  return {
                    type: "file" as const,
                    url: typedPart.url,
                    name: fileName,
                    mediaType: fileType
                  }
                }

                // Only process data URLs (base64) - extract text for immediate use
                let documentContent = ""
                try {
                  if (typedPart.url.startsWith("data:")) {
                    const base64Data = typedPart.url.split(",")[1]
                    if (base64Data) {
                      if (
                        fileType.startsWith("text/") ||
                        fileType.includes("markdown") ||
                        fileType.includes("json") ||
                        fileType.includes("csv")
                      ) {
                        documentContent = Buffer.from(base64Data, "base64").toString("utf8")
                      } else if (fileType === "application/pdf") {
                        try {
                          const pdfBuffer = Buffer.from(base64Data, "base64")
                          const { extractPdfText } = await import("@/lib/file-processing")
                          const extractedText = await extractPdfText(pdfBuffer)
                          documentContent = extractedText
                        } catch (error) {
                          if (model === "grok-3-mini" || model === "gpt-5-mini-2025-08-07") {
                            documentContent = `[ARCHIVO PDF - ${fileName}]\n\n⚠️ El PDF es demasiado grande para procesar automáticamente.\n\nOpciones: pregunta específica, capturas de páginas, archivo <20 págs, o pega texto.`
                          } else {
                            documentContent = `[PDF Document: ${fileName}] - Documento grande. Usa Faster/Smarter o convierte a texto/imágenes.`
                          }
                        }
                      } else {
                        documentContent = `[Archivo binario: ${fileName}. Tipo: ${fileType}]\n\nEste archivo requiere procesamiento especializado. Di qué análisis necesitas.`
                      }
                    }
                  }
                } catch (error) {
                  documentContent = `[Error leyendo el contenido del documento ${fileName}. Intenta subir de nuevo o pega el texto.]`
                }

                const finalText = `📄 [${fileName}]\n\n${documentContent}`
                return { type: "text" as const, text: finalText }
              }

              if (typedPart.type === "text" && (typedPart.text || typedPart.content)) {
                return { type: "text" as const, text: typedPart.text || typedPart.content || "" }
              }

              return { type: "text" as const, text: "" }
            })
        )

        const filteredContent = convertedContent.filter(
          (part) => 
            (part.type === "text" && part.text !== "") || 
            part.type === "image" ||
            part.type === "file" // ✅ FIX: Preserve file parts (PDFs, docs with HTTP URLs)
        )

        if (filteredContent.length === 0) {
          return { ...msg, content: typeof msg.content === "string" ? msg.content : "" }
        }

        return { ...msg, content: filteredContent }
      }

      return msg
    })
  )

  // Count output images for diagnostics
  let outputImageCount = 0
  converted.forEach((msg: any) => {
    if (Array.isArray(msg.content)) {
      outputImageCount += msg.content.filter((p: any) => p.type === 'image').length
    }
  })

  console.log(`[IMAGE CONVERSION] Model ${model}, Vision: ${modelVision}, Input: ${inputImageCount} images → Output: ${outputImageCount} images`)

  return converted
}
