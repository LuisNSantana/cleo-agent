import { tool } from 'ai'
import { z } from 'zod'

/**
 * Tool para crear documentos largos de manera controlada
 */
export const createDocumentTool = tool({
  description: 'Crea un documento de texto largo (ensayo, artículo, historia, etc.) y lo guarda automáticamente para que el usuario pueda editarlo en el Canvas Editor.',
  inputSchema: z.object({
    title: z.string().describe('Título del documento'),
    content: z.string().describe('Contenido completo del documento en formato Markdown'),
    description: z.string().describe('Breve descripción de lo que contiene el documento'),
    type: z.enum(['ensayo', 'articulo', 'historia', 'cuento', 'reporte', 'carta', 'guia', 'documento']).describe('Tipo de documento que se está creando'),
    filename: z.string().optional().describe('Nombre sugerido para el archivo (sin extensión)')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    document: z.object({
      title: z.string(),
      content: z.string(),
      description: z.string(),
      type: z.string(),
      filename: z.string(),
      wordCount: z.number(),
      timestamp: z.string(),
      id: z.string()
    }),
    message: z.string()
  }),
  execute: async ({ title, content, description, type, filename }) => {
    // Generar timestamp
    const timestamp = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-')

    // Generar nombre de archivo si no se proporciona
    const finalFilename = filename 
      ? `${filename}-${timestamp}.md`
      : `${type}-${title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 30)}-${timestamp}.md`

    // Contar palabras
    const wordCount = content.trim().split(/\s+/).filter((word: string) => word.length > 0).length

    // Retornar información estructurada que será procesada por el frontend
    return {
      success: true,
      document: {
        title,
        content,
        description,
        type,
        filename: finalFilename,
        wordCount,
        timestamp: new Date().toISOString(),
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      message: `✅ Documento "${title}" creado exitosamente con ${wordCount} palabras. El archivo está disponible para editar en el Canvas Editor.`
    }
  }
})

export const DocumentToolResultSchema = z.object({
  success: z.boolean(),
  document: z.object({
    title: z.string(),
    content: z.string(),
    description: z.string(),
    type: z.string(),
    filename: z.string(),
    wordCount: z.number(),
    timestamp: z.string(),
    id: z.string()
  }),
  message: z.string()
})

export type DocumentToolResult = z.infer<typeof DocumentToolResultSchema>
