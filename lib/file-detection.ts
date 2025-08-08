// Utilidades para detectar y procesar contenido que debería convertirse en archivos

export interface FileCandidate {
  content: string
  filename: string
  description: string
  fileType: 'md' | 'txt' | 'doc'
  wordCount: number
  shouldCreateFile: boolean
  origin?: 'auto-detect' | 'hidden-marker'
}

/**
 * Detecta si un texto debería convertirse en archivo basado en:
 * - Longitud del texto
 * - Palabras clave que indican contenido de archivo
 * - Estructura del contenido
 */
export function detectFileContent(text: string, userMessage?: string): FileCandidate | null {
  const wordCount = countWords(text)
  const lines = text.split('\n').length
  
  // CRITERIOS ULTRA ESTRICTOS - Solo crear archivo con solicitud EXPLÍCITA
  const veryLongTextThreshold = 1000 // palabras (muy largo)
  
  // Palabras clave que indican solicitud EXPLÍCITA y DIRECTA de documento
  const explicitFileRequests = [
    // Spanish requests
  'escribe un ensayo', 'crea un ensayo', 'redacta un ensayo', 'hazme un ensayo', 'haz un ensayo',
  'escribe un artículo', 'crea un artículo', 'redacta un artículo', 'hazme un artículo', 'haz un artículo',
  'escribe una historia', 'crea una historia', 'redacta una historia', 'hazme una historia', 'haz una historia',
    'escribe un cuento', 'crea un cuento', 'redacta un cuento',
  'escribe un reporte', 'crea un reporte', 'redacta un reporte', 'hazme un reporte', 'haz un reporte',
  'escribe un informe', 'crea un informe', 'redacta un informe', 'hazme un informe', 'haz un informe',
  'escribe un documento', 'crea un documento', 'redacta un documento', 'hazme un documento', 'haz un documento',
    'escribe una guía', 'crea una guía', 'redacta una guía',
    'escribe un manual', 'crea un manual', 'redacta un manual',
    'escribe un tutorial', 'crea un tutorial', 'redacta un tutorial',
    'genera un archivo', 'crea un archivo', 'guarda en archivo',
    'exporta a archivo', 'descarga como archivo',
    'archivo .md', 'archivo .txt', 'archivo markdown',
    'documento editable', 'texto editable',
    // English requests
  'write an essay', 'create an essay', 'draft an essay', 'make me an essay', 'make an essay',
  'write an article', 'create an article', 'draft an article', 'make me an article', 'make an article',
  'write a story', 'create a story', 'draft a story', 'make me a story', 'make a story',
  'write a report', 'create a report', 'draft a report', 'make me a report', 'make a report',
  'write a document', 'create a document', 'draft a document', 'make me a document', 'make a document',
  'write a guide', 'create a guide', 'draft a guide', 'make me a guide', 'make a guide',
  'write a manual', 'create a manual', 'draft a manual', 'make me a manual', 'make a manual',
  'write a tutorial', 'create a tutorial', 'draft a tutorial', 'make me a tutorial', 'make a tutorial',
    'generate a file', 'create a file', 'save as file',
    'export to file', 'download as file',
    'file .md', 'file .txt', 'markdown file',
    'editable document', 'editable text'
  ]

  const userMessageLower = userMessage?.toLowerCase() || ''

  // Verificar si el usuario pidió EXPLÍCITA y DIRECTAMENTE un archivo
  const userExplicitlyRequestedFile = explicitFileRequests.some(phrase => 
    userMessageLower.includes(phrase)
  )

  // Verificar si hay marcadores ocultos del agente (para casos donde el agente decide crear archivo)
  const hasHiddenMarker = text.includes('<!--FILE:') || text.includes('[CREAR_ARCHIVO]')

  // SOLO crear archivo en estos casos MUY específicos:
  const shouldCreateFile = (
    userExplicitlyRequestedFile || // Usuario pidió explícitamente
    hasHiddenMarker || // Agente decidió crear archivo con marcador oculto
    (wordCount >= veryLongTextThreshold && userMessageLower.includes('largo')) // Texto MUY largo Y usuario mencionó "largo"
  )


  // FILTROS ADICIONALES: NO crear archivo si es una respuesta de herramienta o conversacional
  // Refuerzo: detectar patrones de listados Drive, Calendar, tablas, listas estructuradas, etc.
  const isToolResponse = (
    // Spanish patterns
    text.includes('Encontré') ||
    text.includes('archivos:') ||
    text.includes('carpetas:') ||
    text.includes('eventos:') ||
    text.includes('resultados:') ||
    text.includes('He revisado') ||
    text.includes('Tienes **') ||
    text.includes('¿Qué te gustaría hacer?') ||
    text.includes('Haz clic en cualquier') ||
    text.includes('¿Te ayudo con') ||
    text.includes('¿Necesitas que') ||
    text.includes('Puedo ayudarte') ||
    text.includes('modificado ayer') ||
    text.includes('total') && text.includes('MB') ||
    text.includes('Sugerencias: Organiza') ||
  // text.includes('Vista previa de') || // Removed to avoid blocking canvas when showing preview wording
    // English patterns
    text.includes('I found') ||
    text.includes('files:') ||
    text.includes('folders:') ||
    text.includes('events:') ||
    text.includes('results:') ||
    text.includes('I reviewed') ||
    text.includes('You have **') ||
    text.includes('What would you like to do?') ||
    text.includes('Click on any') ||
    text.includes('Can I help you with') ||
    text.includes('Do you need me to') ||
    text.includes('I can help you') ||
    text.includes('modified yesterday') ||
    text.includes('total') && text.includes('MB') ||
    text.includes('Suggestions: Organize') ||
  // text.includes('Preview of') || // Removed to avoid blocking canvas when showing preview wording
    // Emoji patterns (language independent)
    text.includes('📄 **') ||
    text.includes('📊 **') ||
    text.includes('📅 **') ||
    text.includes('🌟 **Hoy**') || text.includes('🌟 **Today**') ||
    text.includes('⭐ **Mañana**') || text.includes('⭐ **Tomorrow**') ||
    text.includes('📁') ||
    text.includes('🖼️') ||
    text.includes('📍') ||
    text.includes('👥') ||
    // Markdown table pattern
    /\|\s*Hora\s*\|/.test(text) || /\|\s*Evento\s*\|/.test(text) || /\|\s*Duración\s*\|/.test(text) || /\|\s*Ubicación\s*\|/.test(text) || /\|\s*Asistentes\s*\|/.test(text) || /\|\s*Recordatorios\s*\|/.test(text) || /\|\s*Estado\s*\|/.test(text) ||
    // Number patterns (bilingual)
    /\*\*\d+\*\*\s+(archivo|evento|documento|file|event|document|folder|carpeta)/i.test(text)
  )

  // Si es respuesta de herramienta o conversacional, NO crear archivo
  if (isToolResponse) {
    return null
  }

  if (!shouldCreateFile) {
    return null
  }

  // Generar nombre de archivo basado en el contenido o solicitud del usuario
  const filename = generateFilename(text, userMessage)
  
  // Generar descripción
  const description = generateDescription(text, userMessage)

  // Determinar tipo de archivo
  const fileType = detectFileType(text, userMessage)

  return {
    content: text,
    filename,
    description,
    fileType,
    wordCount,
    shouldCreateFile,
    origin: 'auto-detect'
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

function generateFilename(text: string, userMessage?: string): string {
  const timestamp = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-')

  // Intentar extraer título del contenido
  const lines = text.split('\n').filter(line => line.trim())
  let title = ''

  // Buscar títulos markdown
  const markdownTitle = lines.find(line => line.match(/^#+ /))
  if (markdownTitle) {
    title = markdownTitle.replace(/^#+\s+/, '').trim()
  }

  // Si no hay título markdown, usar las primeras palabras
  if (!title && lines.length > 0) {
    title = lines[0].substring(0, 50).trim()
  }

  // Limpiar título para nombre de archivo
  if (title) {
    title = title
      .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '-') // Espacios a guiones
      .toLowerCase()
      .substring(0, 30) // Máximo 30 caracteres
  }

  // Determinar tipo de documento basado en el mensaje del usuario
  let docType = 'documento'
  const userMessageLower = userMessage?.toLowerCase() || ''
  
  if (userMessageLower.includes('ensayo')) docType = 'ensayo'
  else if (userMessageLower.includes('historia') || userMessageLower.includes('cuento')) docType = 'historia'
  else if (userMessageLower.includes('artículo')) docType = 'articulo'
  else if (userMessageLower.includes('reporte') || userMessageLower.includes('informe')) docType = 'reporte'
  else if (userMessageLower.includes('guía') || userMessageLower.includes('tutorial')) docType = 'guia'
  else if (userMessageLower.includes('carta') || userMessageLower.includes('email')) docType = 'carta'

  return title 
    ? `${docType}-${title}-${timestamp}.md`
    : `${docType}-${timestamp}.md`
}

function generateDescription(text: string, userMessage?: string): string {
  const wordCount = countWords(text)
  const firstLine = text.split('\n')[0]?.substring(0, 100) || ''

  if (userMessage) {
    return `Documento generado basado en: "${userMessage.substring(0, 80)}..." (${wordCount} palabras)`
  }

  return `Documento con ${wordCount} palabras. Inicia con: "${firstLine}..."`
}

function detectFileType(text: string, userMessage?: string): 'md' | 'txt' | 'doc' {
  // Si tiene estructura markdown, usar md
  if (text.includes('# ') || text.includes('## ') || text.includes('**') || text.includes('*')) {
    return 'md'
  }

  // Si el usuario pidió específicamente un tipo
  const userMessageLower = userMessage?.toLowerCase() || ''
  if (userMessageLower.includes('.md') || userMessageLower.includes('markdown')) {
    return 'md'
  }
  if (userMessageLower.includes('.txt')) {
    return 'txt'
  }
  if (userMessageLower.includes('.doc')) {
    return 'doc'
  }

  // Por defecto, markdown para mejor formateo
  return 'md'
}

/**
 * Procesa un mensaje de respuesta y extrae archivos potenciales
 */
export function processResponseForFiles(
  response: string,
  userMessage?: string,
  options?: { skipHeuristics?: boolean }
): {
  cleanResponse: string
  files: FileCandidate[]
} {
  // 1. Detectar documentos ocultos incrustados mediante marcadores
  const hiddenFiles = extractHiddenGeneratedDocuments(response, userMessage)

  let workingResponse = response
  let collected: FileCandidate[] = []

  if (hiddenFiles.length > 0) {
    // Eliminar bloques ocultos del mensaje visible
    hiddenFiles.forEach(hf => {
      if (hf.removeContent) {
        // Remove full block (content stays out of chat)
        workingResponse = workingResponse.replace(hf.rawBlock, '')
      } else {
        // Only strip the marker lines, keep inner content visible
        // Replace the marker block with just the inner content captured in candidate
        workingResponse = workingResponse.replace(hf.rawBlock, `\n${hf.candidate.content}\n`)
      }
    })
    collected = hiddenFiles.map(hf => hf.candidate)
  }

  // 2. Detección heurística normal SOLO si NO hubo marcadores ocultos y NO se solicitó omitir heurísticas
  if (hiddenFiles.length === 0 && !options?.skipHeuristics) {
    const heuristicCandidate = detectFileContent(workingResponse, userMessage)
    if (heuristicCandidate) {
      // Evitar duplicar si coincide nombre y origen
      const already = collected.find(f => f.filename === heuristicCandidate.filename)
      if (!already) collected.push(heuristicCandidate)
    }
  }

  if (collected.length === 0) {
    return { cleanResponse: workingResponse, files: [] }
  }

  // Devolver la respuesta procesada (sin marcadores o solo con el contenido),
  // y los archivos detectados para mostrar la tarjeta de archivo.
  return { cleanResponse: workingResponse, files: collected }
}

// ---------------------------------------------------------------------------
// Detección de marcadores ocultos
// ---------------------------------------------------------------------------

interface HiddenDocExtraction {
  rawBlock: string
  candidate: FileCandidate
  /** If true, remove the entire rawBlock (content is inside the marker). If false, we'll only strip marker lines elsewhere */
  removeContent: boolean
}

/**
 * Soporta dos formatos de marcador oculto:
 * 1. <!-- GENERATED_DOCUMENT: filename.md\n...contenido...\nEND_GENERATED_DOCUMENT -->
 * 2. <<<FILE:filename.md\n...contenido...\n>>>END_FILE
 */
function extractHiddenGeneratedDocuments(text: string, userMessage?: string): HiddenDocExtraction[] {
  const results: HiddenDocExtraction[] = []

  const commentRegex = /<!--\s*GENERATED_DOCUMENT:\s*([^\n]+?)\s*\n([\s\S]*?)\nEND_GENERATED_DOCUMENT\s*-->/g
  const angleRegex = /<<<FILE:([^\n]+?)\n([\s\S]*?)\n>>>END_FILE/g
  // New lightweight marker that wraps content between two HTML comments
  // Supports both formats:
  // <!--FILE:filename.md|Optional description-->  (standard)
  // <!--FILE:filename.md|Optional description|    (malformed but generated by AI)
  // ...markdown content...
  // <!--/FILE-->
  const fileMarkerRegex = /<!--\s*FILE:([^\n|]+?)(?:\|([^\n|]*?))?\|?\s*-->\s*\n?([\s\S]*?)\s*\n?<!--\s*\/FILE\s*-->/g
  // Handles cases where the opening marker is malformed (missing -->) and the closing marker may or may not be present.
  // It captures everything until an explicit closing <!--/FILE--> or the end of the text.
  const malformedFileMarkerRegex = /<!--\s*FILE:([^|]+)\|([^|]*)\|([\s\S]*?)(?:<!--\s*\/FILE\s*-->|$)/g

  let match: RegExpExecArray | null

  while ((match = commentRegex.exec(text)) !== null) {
    const [, filenameRaw, contentRaw] = match
    const content = contentRaw.trim()
    const filename = sanitizeFilename(filenameRaw.trim(), userMessage) || generateFilename(content, userMessage)
    const wordCount = countWords(content)
    const description = generateDescription(content, userMessage)
    results.push({
      rawBlock: match[0],
      candidate: {
        content,
        filename,
        description,
        fileType: detectFileType(content, userMessage),
        wordCount,
        shouldCreateFile: true,
        origin: 'hidden-marker'
      },
      removeContent: true
    })
  }

  while ((match = angleRegex.exec(text)) !== null) {
    const [, filenameRaw, contentRaw] = match
    const content = contentRaw.trim()
    const filename = sanitizeFilename(filenameRaw.trim(), userMessage) || generateFilename(content, userMessage)
    const wordCount = countWords(content)
    const description = generateDescription(content, userMessage)
    results.push({
      rawBlock: match[0],
      candidate: {
        content,
        filename,
        description,
        fileType: detectFileType(content, userMessage),
        wordCount,
        shouldCreateFile: true,
        origin: 'hidden-marker'
      },
      removeContent: true
    })
  }

  while ((match = fileMarkerRegex.exec(text)) !== null) {
    const [, filenameRaw, descriptionRaw, contentRaw] = match
    const content = (contentRaw || '').trim()
    const filename = sanitizeFilename((filenameRaw || '').trim(), userMessage) || generateFilename(content, userMessage)
    const wordCount = countWords(content)
    const description = (descriptionRaw && descriptionRaw.trim()) || generateDescription(content, userMessage)
    results.push({
      rawBlock: match[0],
      candidate: {
        content,
        filename,
        description,
        fileType: detectFileType(content, userMessage),
        wordCount,
        shouldCreateFile: true,
        origin: 'hidden-marker'
      },
      // For FILE markers, we remove the content from chat so it only appears in the canvas editor
      removeContent: true
    })
  }

  // Handle malformed markers (without proper --> closing)
  while ((match = malformedFileMarkerRegex.exec(text)) !== null) {
    const [, filenameRaw, descriptionRaw, contentRaw] = match
    const content = (contentRaw || '').trim()
    const filename = sanitizeFilename((filenameRaw || '').trim(), userMessage) || generateFilename(content, userMessage)
    const wordCount = countWords(content)
    const description = (descriptionRaw && descriptionRaw.trim()) || generateDescription(content, userMessage)
    results.push({
      rawBlock: match[0],
      candidate: {
        content,
        filename,
        description,
        fileType: detectFileType(content, userMessage),
        wordCount,
        shouldCreateFile: true,
        origin: 'hidden-marker'
      },
      removeContent: true
    })
  }

  return results
}

function sanitizeFilename(name: string, userMessage?: string): string {
  if (!name) return ''
  // Asegurar extensión
  if (!/\.(md|txt|doc)$/i.test(name)) {
    name = name.replace(/[^\w\s.-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.md'
  }
  return name
}

function generateFileExplanation(file: FileCandidate, userMessage?: string): string {
  const explanations = [
    `✅ **Documento creado**: He generado un ${file.fileType.toUpperCase()} con ${file.wordCount} palabras basado en tu solicitud.`,
    `📄 **Archivo**: \`${file.filename}\``,
    `📊 **Contenido**: ${file.description}`,
    '',
    'Puedes **abrir el documento en el Canvas Editor** para editarlo, o **descargarlo** directamente. El editor te permitirá:',
    '',
    '- ✏️ Editar el contenido con formato rico',
    '- 📝 Añadir más secciones o modificar el texto',
    '- 💾 Guardar cambios automáticamente',
    '- 📤 Exportar en diferentes formatos (MD, TXT, PDF)',
    '',
    '¿Te gustaría que haga algún ajuste al contenido o necesitas ayuda con algo más?'
  ]

  return explanations.join('\n')
}

/**
 * Helper function for the AI agent to mark content that should be saved as a file
 * Use this when the AI determines that content should be editable/downloadable
 * 
 * Usage in AI response:
 * ```
 * Aquí tienes el contenido que solicitaste:
 * 
 * <!--FILE:ensayo-sobre-ia.md|Ensayo sobre Inteligencia Artificial-->
 * # Ensayo sobre Inteligencia Artificial
 * 
 * ## Introducción
 * La inteligencia artificial...
 * 
 * ## Desarrollo
 * ...
 * <!--/FILE-->
 * 
 * ¿Te gustaría que ajuste alguna sección del ensayo?
 * ```
 */
export function createFileMarker(content: string, filename?: string, description?: string): string {
  const generatedFilename = filename || generateFilename(content, '')
  const generatedDescription = description || generateDescription(content, '')
  
  return `<!--FILE:${generatedFilename}|${generatedDescription}-->
${content}
<!--/FILE-->`
}
