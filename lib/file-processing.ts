import '@/lib/suppress-warnings'
import pdf from "pdf-parse-debugging-disabled"
import * as mammoth from "mammoth"

/**
 * Extract text content from PDF buffer with size limits and cleanup
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // pdf.js sometimes logs noisy font warnings like "TT: undefined function".
    // Temporarily suppress only those specific warnings during parse.
    const originalWarn = console.warn
    try {
      console.warn = (...args: any[]) => {
        const msg = (args?.[0] || "").toString()
        if (msg.includes("TT: undefined function") || msg.includes("TT: invalid function id")) {
          return
        }
        originalWarn.apply(console, args as any)
      }
    } catch {}
    const data = await pdf(buffer)
    try { console.warn = originalWarn } catch {}

    // Limit PDF text to prevent token overflow (Llama 4 Maverick has 300k TPM limit)
    const maxLength = 30000 // Reduced to ~7,500 tokens to be more conservative
    let text = data.text

    if (text.length > maxLength) {
      // Take first part and last part to preserve context
      const firstPart = text.substring(0, Math.floor(maxLength * 0.7))
      const lastPart = text.substring(text.length - Math.floor(maxLength * 0.3))

      text = `${firstPart}\n\n[... CONTENIDO TRUNCADO PARA EVITAR LÍMITE DE TOKENS - ${text.length} caracteres total ...]\n\n${lastPart}`
    }

    // Clean up problematic characters that might cause display issues
    text = text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "") // Remove control characters
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()

    return text
  } catch (error) {
    console.error("Error extracting PDF text:", error)
    throw new Error("Failed to extract text from PDF")
  }
}

/**
 * Create a sanitized summary for database storage
 */
export function createFileSummary(
  fileName: string,
  mimeType: string,
  processedContent: string
): string {
  const maxSummaryLength = 500

  // Create a clean summary without base64 data
  let summary = `[ARCHIVO: ${fileName}]
Tipo: ${mimeType}
Estado: Procesado exitosamente`

  if (processedContent.length > maxSummaryLength) {
    const preview = processedContent.substring(0, maxSummaryLength).trim()
    summary += `\n\nVista previa:\n${preview}...\n\n[Contenido completo disponible en la conversación]`
  } else {
    summary += `\n\nContenido:\n${processedContent}`
  }

  return summary
}

/**
 * Process file content based on MIME type
 */
export async function processFileContent(
  dataUrl: string,
  fileName: string,
  mimeType: string
): Promise<{ content: string; type: "text" | "image"; summary: string }> {
  try {
    // Extract base64 data from data URL
    const base64Data = dataUrl.split(",")[1]
    if (!base64Data) {
      throw new Error("Invalid data URL format")
    }

    // Handle images - return as-is for vision models but create summary
    if (mimeType.startsWith("image/")) {
      const summary = `[IMAGEN: ${fileName}]\nTipo: ${mimeType}\nEstado: Lista para análisis con modelos de visión`

      return {
        content: dataUrl,
        type: "image",
        summary: summary,
      }
    }

    // Handle text-based files
    if (
      mimeType.startsWith("text/") ||
      mimeType.includes("markdown") ||
      mimeType.includes("json") ||
      mimeType.includes("csv")
    ) {
      const textContent = Buffer.from(base64Data, "base64").toString("utf-8")

      // Limit text file size as well
      const maxLength = 30000
      let content = textContent
      if (content.length > maxLength) {
        content =
          content.substring(0, maxLength) +
          "\n\n[... ARCHIVO TRUNCADO POR TAMAÑO ...]"
      }

      const summary = createFileSummary(fileName, mimeType, content)

      return {
        content: content,
        type: "text",
        summary: summary,
      }
    }

    // Handle PDF files
    if (mimeType === "application/pdf") {
      const pdfBuffer = Buffer.from(base64Data, "base64")
      const extractedText = await extractPdfText(pdfBuffer)
      const summary = createFileSummary(fileName, mimeType, extractedText)

      return {
        content: extractedText,
        type: "text",
        summary: summary,
      }
    }

    // Handle Word documents (.docx/.doc) using mammoth
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      try {
        const buffer = Buffer.from(base64Data, "base64")
        // mammoth works best with .docx; for .doc we still try (may need conversion client-side)
        const result = await mammoth.extractRawText({ buffer })
        let extracted = (result.value || "").trim()
        if (!extracted) {
          extracted = "[El documento Word no contiene texto extraíble o está vacío]"
        }
        // Limit length similar to PDFs/text
        const maxLength = 30000
        if (extracted.length > maxLength) {
          extracted = `${extracted.substring(0, maxLength)}\n\n[... DOCUMENTO TRUNCADO POR TAMAÑO ...]`
        }
        const summary = createFileSummary(fileName, mimeType, extracted)
        return {
          content: extracted,
          type: "text",
          summary,
        }
      } catch (e) {
        // Fall through to generic fallback
        console.error('DOCX extraction failed:', e)
      }
    }

    // Handle other document types with fallback
    const fallbackContent = `[Documento: ${fileName}]\n\nEste tipo de archivo (${mimeType}) requiere conversión manual. Por favor:\n1. Convierte el documento a PDF\n2. O copia y pega el contenido como texto\n3. O proporciona capturas de pantalla del documento`

    return {
      content: fallbackContent,
      type: "text",
      summary: `[DOCUMENTO: ${fileName}]\nTipo: ${mimeType}\nEstado: Requiere conversión manual`,
    }
  } catch (error) {
    console.error(`Error processing file ${fileName}:`, error)
    const errorContent = `[Error procesando archivo: ${fileName}]\n\nHubo un problema al procesar este archivo. Por favor intenta:\n1. Subir el archivo nuevamente\n2. Convertir a un formato compatible (PDF, TXT, o imagen)\n3. Copiar y pegar el contenido como texto`

    return {
      content: errorContent,
      type: "text",
      summary: `[ERROR: ${fileName}]\nTipo: ${mimeType}\nEstado: Error en procesamiento`,
    }
  }
}

/**
 * Normalize MIME type based on file extension
 */
export function normalizeMimeType(
  fileName: string,
  originalMimeType?: string
): string {
  const extension = fileName.toLowerCase().split(".").pop()

  // If we have a specific MIME type and it's not generic, use it
  if (
    originalMimeType &&
    originalMimeType !== "application/octet-stream" &&
    originalMimeType !== "unknown"
  ) {
    return originalMimeType
  }

  // Map common extensions to MIME types
  const extensionToMime: { [key: string]: string } = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    json: "application/json",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  }

  return extension && extensionToMime[extension]
    ? extensionToMime[extension]
    : "application/octet-stream"
}
