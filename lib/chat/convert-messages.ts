import type { CoreMessage } from "ai"

export async function convertUserMultimodalMessages(messages: CoreMessage[], model: string, modelVision: boolean) {
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
                  (part as { type: string }).type === "file")
            )
            .map(async (part: unknown) => {
              const typedPart = part as {
                type: string
                mediaType?: string
                url?: string
                name?: string
                text?: string
                content?: string
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
          (part) => (part.type === "text" && part.text !== "") || part.type === "image"
        )

        if (filteredContent.length === 0) {
          return { ...msg, content: typeof msg.content === "string" ? msg.content : "" }
        }

        return { ...msg, content: filteredContent }
      }

      return msg
    })
  )

  return converted
}
