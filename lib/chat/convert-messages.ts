// Message type for AI SDK compatibility - using any for maximum flexibility
type CoreMessage = any

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

                // Process PDFs (both HTTP URLs and data URLs)
                let documentContent = ""
                let pdfBuffer: Buffer | null = null
                
                try {
                  // Download PDF if it's an HTTP URL (Supabase Storage)
                  if ((typedPart.url.startsWith("http://") || typedPart.url.startsWith("https://")) && fileType === "application/pdf") {
                    console.log(`📋 [PDF] Downloading from HTTP URL: ${typedPart.url.substring(0, 80)}...`)
                    try {
                      const response = await fetch(typedPart.url)
                      if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`)
                      }
                      const arrayBuffer = await response.arrayBuffer()
                      const downloadedBuffer = Buffer.from(arrayBuffer)
                      pdfBuffer = downloadedBuffer
                      console.log(`📋 [PDF] Downloaded successfully: ${(downloadedBuffer.length / 1024).toFixed(0)} KB`)
                    } catch (downloadError) {
                      console.error(`❌ [PDF] Download failed:`, downloadError)
                      // Fallback: preserve as file part for tool processing
                      return {
                        type: "file" as const,
                        url: typedPart.url,
                        name: fileName,
                        mediaType: fileType
                      }
                    }
                  }
                  
                  // For non-PDF HTTP URLs, preserve as file parts for tool processing
                  if ((typedPart.url.startsWith("http://") || typedPart.url.startsWith("https://")) && fileType !== "application/pdf") {
                    console.log(`📋 [FILE] Preserving HTTP URL as file part: ${typedPart.url.substring(0, 80)}...`)
                    return {
                      type: "file" as const,
                      url: typedPart.url,
                      name: fileName,
                      mediaType: fileType
                    }
                  }

                  // Process data URLs (base64)
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
                        pdfBuffer = Buffer.from(base64Data, "base64")
                      } else {
                        documentContent = `[Archivo binario: ${fileName}. Tipo: ${fileType}]\n\nEste archivo requiere procesamiento especializado. Di qué análisis necesitas.`
                      }
                    }
                  }
                  
                  // Process PDF buffer (from HTTP download or data URL)
                  if (pdfBuffer && fileType === "application/pdf") {
                    try {
                      const { extractPdfText } = await import("@/lib/file-processing")
                      const { isPdfLikelyScanned, convertPdfPagesToImages } = await import("@/lib/pdf-to-image")
                      
                      const extractedText = await extractPdfText(pdfBuffer)
                      console.log(`📋 [PDF] Extracted text length: ${extractedText.length} chars`)
                      
                      // Check if PDF is scanned (no/minimal text)
                      const isScanned = isPdfLikelyScanned(extractedText)
                      console.log(`📋 [PDF] Is scanned? ${isScanned} (modelVision: ${modelVision})`)
                      
                      if (isScanned && modelVision) {
                        console.log('[PDF-SCAN] Detected scanned PDF in convert-messages, converting to images for vision OCR...')
                        
                        const imageResult = await convertPdfPagesToImages(pdfBuffer, {
                          maxPages: 3,
                          scale: 2.0,
                          format: 'png'
                        })
                        
                        if (imageResult.success && imageResult.images && imageResult.images.length > 0) {
                          console.log(`[PDF-SCAN] Converted ${imageResult.images.length} pages for vision analysis`)
                          
                          // Create special marker that will be expanded below
                          documentContent = `__PDF_VISION_OCR__${JSON.stringify({
                            images: imageResult.images,
                            fileName,
                            totalPages: imageResult.totalPages
                          })}`
                        } else {
                          documentContent = extractedText
                        }
                      } else {
                        documentContent = extractedText
                      }
                    } catch (error) {
                      console.error(`❌ [PDF] Processing error:`, error)
                      if (model === "grok-3-mini" || model === "gpt-5-mini-2025-08-07") {
                        documentContent = `[ARCHIVO PDF - ${fileName}]\n\n⚠️ El PDF es demasiado grande para procesar automáticamente.\n\nOpciones: pregunta específica, capturas de páginas, archivo <20 págs, o pega texto.`
                      } else {
                        documentContent = `[PDF Document: ${fileName}] - Documento grande. Usa Faster/Smarter o convierte a texto/imágenes.`
                      }
                    }
                  }
                } catch (error) {
                  console.error(`❌ [FILE] Processing error:`, error)
                  documentContent = `[Error leyendo el contenido del documento ${fileName}. Intenta subir de nuevo o pega el texto.]`
                }

                const finalText = `📄 [${fileName}]\n\n${documentContent}`
                
                // Check if this is a PDF vision OCR marker
                if (documentContent.startsWith('__PDF_VISION_OCR__')) {
                  const markerData = JSON.parse(documentContent.replace('__PDF_VISION_OCR__', ''))
                  
                  // Return intro text + all images as separate parts
                  const parts: any[] = [{
                    type: "text" as const,
                    text: `📄 [${markerData.fileName}] - PDF escaneado (${markerData.totalPages} páginas)\n\nAnalizando imágenes de las primeras ${markerData.images.length} páginas con visión OCR...`
                  }]
                  
                  // Add each page as an image
                  for (const img of markerData.images) {
                    parts.push({
                      type: "image" as const,
                      image: img.base64
                    })
                  }
                  
                  return parts
                }
                
                return { type: "text" as const, text: finalText }
              }

              if (typedPart.type === "text" && (typedPart.text || typedPart.content)) {
                return { type: "text" as const, text: typedPart.text || typedPart.content || "" }
              }

              return { type: "text" as const, text: "" }
            })
        )

        // Flatten any arrays (from PDF vision OCR expansion)
        const flattenedContent = convertedContent.flat()

        const filteredContent = flattenedContent.filter(
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
