/**
 * Reasoning Extractor
 * 
 * Extrae razonamiento de respuestas del modelo para transparencia en UI.
 * Soporta:
 * - Bloques <thinking> explícitos
 * - Decisiones de delegación (tool_calls a delegate_to_*)
 * - Selección de herramientas
 * - Análisis implícito en contenido
 */

import { AIMessage } from '@langchain/core/messages'
import { getAgentDisplayName } from './id-canonicalization'
import type { PipelineStep } from '@/app/components/chat/agent-execution-flow'

export interface ReasoningBlock {
  type: 'thinking' | 'delegation_decision' | 'tool_selection' | 'analysis'
  content: string
  confidence?: number // Del anti-hallucination scoring (si está en metadata)
  timestamp: string
  metadata?: Record<string, any>
}

/**
 * Extrae bloques de razonamiento de un mensaje de AI
 */
export function extractReasoning(
  aiMessage: AIMessage,
  agentId: string
): ReasoningBlock[] {
  const blocks: ReasoningBlock[] = []
  const content = typeof aiMessage.content === 'string' ? aiMessage.content : ''
  
  // 1. Extraer bloques <thinking> explícitos
  const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/gi
  let match
  while ((match = thinkingRegex.exec(content)) !== null) {
    const thinkingContent = match[1].trim()
    if (thinkingContent.length > 10) { // Evitar bloques vacíos
      blocks.push({
        type: 'thinking',
        content: thinkingContent,
        timestamp: new Date().toISOString(),
        metadata: { extracted: 'xml_tag' }
      })
    }
  }
  
  // 2. Detectar decisiones de delegación y uso de herramientas
  const toolCalls = (aiMessage as any).tool_calls || []
  toolCalls.forEach((tc: any) => {
    if (tc.name?.startsWith('delegate_to_')) {
      // Delegación a otro agente
      const targetAgentId = tc.name.replace('delegate_to_', '')
      const targetAgentName = getAgentDisplayName(targetAgentId)
      
      // Construir mensaje intuitivo basado en la tarea
      let delegationMessage = ''
      const task = tc.args?.task || ''
      const context = tc.args?.context || ''
      
      // Detectar el tipo de tarea para mensaje personalizado
      if (task.toLowerCase().includes('correo') || task.toLowerCase().includes('email') || task.toLowerCase().includes('gmail')) {
        delegationMessage = `📧 Delegando a ${targetAgentName} para revisar y organizar correos electrónicos`
      } else if (task.toLowerCase().includes('notion') || task.toLowerCase().includes('página') || task.toLowerCase().includes('documento')) {
        delegationMessage = `📝 Delegando a ${targetAgentName} para gestionar documentación en Notion`
      } else if (task.toLowerCase().includes('buscar') || task.toLowerCase().includes('search')) {
        delegationMessage = `🔍 Delegando a ${targetAgentName} para realizar búsqueda especializada`
      } else if (task.toLowerCase().includes('analizar') || task.toLowerCase().includes('análisis')) {
        delegationMessage = `📊 Delegando a ${targetAgentName} para realizar análisis detallado`
      } else {
        // Mensaje genérico con extracto de la tarea
        const taskPreview = task.slice(0, 80) + (task.length > 80 ? '...' : '')
        delegationMessage = `🤝 Delegando a ${targetAgentName}: ${taskPreview}`
      }
      
      blocks.push({
        type: 'delegation_decision',
        content: delegationMessage,
        timestamp: new Date().toISOString(),
        metadata: {
          targetAgent: targetAgentId,
          targetAgentName,
          toolName: tc.name,
          task,
          context,
          args: tc.args
        }
      })
    } else if (tc.name) {
      // Uso de herramienta regular
      const toolPurpose = inferToolPurpose(tc.name, tc.args)
      
      blocks.push({
        type: 'tool_selection',
        content: toolPurpose,
        timestamp: new Date().toISOString(),
        metadata: {
          toolName: tc.name,
          args: tc.args
        }
      })
    }
  })
  
  // 3. Extraer análisis implícito del contenido (si no hay thinking explícito)
  if (blocks.length === 0 && content.length > 50) {
    const analysisBlock = extractImplicitAnalysis(content)
    if (analysisBlock) {
      blocks.push({
        type: 'analysis',
        content: analysisBlock,
        timestamp: new Date().toISOString(),
        metadata: { extracted: 'implicit_pattern' }
      })
    }
  }
  
  // 4. Extraer confidence score si existe en metadata
  const confidence = (aiMessage as any).additional_kwargs?.confidence
  if (confidence !== undefined && blocks.length > 0) {
    blocks[0].confidence = parseFloat(confidence)
  }
  
  return blocks
}

/**
 * Infiere el propósito de uso de una herramienta basado en nombre y argumentos
 */
function inferToolPurpose(toolName: string, args: any): string {
  const purposeMap: Record<string, (args: any) => string> = {
    webSearch: (a) => `Buscando en la web: "${a?.query || 'información relevante'}"`,
    memoryAddNote: (a) => `Guardando en memoria a largo plazo: "${a?.content?.slice(0, 60) || 'información importante'}..."`,
    getWeather: (a) => `Consultando clima para ${a?.location || 'tu ubicación'}`,
    openDocument: (a) => `Abriendo documento: ${a?.title || 'archivo solicitado'}`,
    createNotionPage: (a) => `Creando página en Notion: "${a?.title || 'nueva página'}"`,
    searchNotionPages: (a) => `Buscando en Notion: "${a?.query || 'páginas relevantes'}"`,
    readTwitterTimeline: () => `Leyendo timeline de Twitter para obtener últimas publicaciones`,
    postTweet: (a) => `Preparando tweet: "${a?.text?.slice(0, 60) || 'contenido'}..."`,
    analyzeMarketData: (a) => `Analizando datos de mercado para ${a?.symbol || 'activo solicitado'}`,
    runPythonCode: () => `Ejecutando código Python para procesar datos`,
    generateImage: (a) => `Generando imagen: "${a?.prompt?.slice(0, 60) || 'imagen solicitada'}..."`,
  }
  
  const inferFn = purposeMap[toolName]
  if (inferFn) {
    return inferFn(args)
  }
  
  // Fallback genérico
  const humanToolName = humanizeToolName(toolName)
  return `Usando ${humanToolName} para procesar tu solicitud`
}

/**
 * Extrae análisis implícito de contenido sin <thinking> tags
 */
function extractImplicitAnalysis(content: string): string | null {
  const analysisPatterns = [
    // Patrón de resolución
    /Para (resolver|solucionar|responder|ayudarte con) (?:esto|tu (?:solicitud|pregunta|petición))[,:]?\s*(.{30,200})/i,
    
    // Patrón de secuencia
    /Primero[,]?\s*(.{30,200})/i,
    
    // Patrón de acción
    /Voy a (analizar|revisar|investigar|buscar|crear|generar|preparar)\s*(.{30,200})/i,
    
    // Patrón de observación
    /(?:Veo|Noto|Observo) que\s*(.{30,200})/i,
    
    // Patrón de necesidad
    /(?:Necesito|Requiero|Debo)\s*(.{30,200})/i,
  ]
  
  for (const pattern of analysisPatterns) {
    const match = content.match(pattern)
    if (match) {
      // Retornar el match completo, limpiado
      return match[0].replace(/\s+/g, ' ').trim()
    }
  }
  
  return null
}

/**
 * Convierte un bloque de razonamiento en un PipelineStep para UI
 * @param usage - Optional token usage metadata to include in step
 */
export function createReasoningStep(
  block: ReasoningBlock,
  agentId: string,
  executionId: string,
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number }
): PipelineStep {
  const actionMap: Record<ReasoningBlock['type'], PipelineStep['action']> = {
    'thinking': 'thinking',
    'delegation_decision': 'delegating',
    'tool_selection': 'executing',
    'analysis': 'analyzing'
  }
  
  return {
    id: `${executionId}-reasoning-${block.type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: block.timestamp,
    agent: agentId,
    agentName: getAgentDisplayName(agentId),
    action: actionMap[block.type],
    content: humanizeReasoningContent(block.content, block.type),
    metadata: {
      reasoning: true,
      reasoningType: block.type,
      rawContent: block.content,
      confidence: block.confidence,
      ...block.metadata,
      // ✅ Add token usage if provided
      ...(usage ? {
        tokens: usage.total_tokens,
        usage: {
          prompt_tokens: usage.input_tokens,
          completion_tokens: usage.output_tokens,
          total_tokens: usage.total_tokens
        }
      } : {})
    }
  }
}

/**
 * Humaniza el contenido de razonamiento para mostrar en UI
 */
function humanizeReasoningContent(content: string, type: ReasoningBlock['type']): string {
  const prefixes: Record<ReasoningBlock['type'], string> = {
    'thinking': '💭 ',
    'delegation_decision': '📋 ',
    'tool_selection': '🔧 ',
    'analysis': '🔍 '
  }
  
  const prefix = prefixes[type] || ''
  
  // Limpiar y truncar si es muy largo
  let cleaned = content.replace(/\s+/g, ' ').trim()
  
  // Truncar contenido muy largo (mantener ~200 chars)
  if (cleaned.length > 200) {
    cleaned = cleaned.slice(0, 197) + '...'
  }
  
  return prefix + cleaned
}

/**
 * Mapeo de nombres técnicos de herramientas a nombres legibles
 */
function humanizeToolName(toolName: string): string {
  const toolNameMap: Record<string, string> = {
    'webSearch': 'búsqueda web',
    'memoryAddNote': 'memoria a largo plazo',
    'memoryRecall': 'consulta de memoria',
    'getWeather': 'servicio de clima',
    'openDocument': 'visor de documentos',
    'createNotionPage': 'creador de páginas Notion',
    'searchNotionPages': 'búsqueda en Notion',
    'updateNotionPage': 'editor de Notion',
    'readTwitterTimeline': 'lector de Twitter',
    'postTweet': 'publicador de tweets',
    'searchTweets': 'buscador de tweets',
    'analyzeMarketData': 'análisis de mercado',
    'getStockPrice': 'consulta de precios',
    'runPythonCode': 'ejecutor de Python',
    'generateImage': 'generador de imágenes',
    'analyzeImage': 'análisis de imágenes',
    'translateText': 'traductor',
    'summarizeDocument': 'resumidor de documentos',
    // Delegaciones
    'delegate_to_ami': 'Ami (Especialista en Notion)',
    'delegate_to_astra': 'Astra (Agente de Investigación)',
    'delegate_to_iris': 'Iris (Analista de Insights)',
    'delegate_to_jenn': 'Jenn (Gestora de Redes Sociales)',
    'delegate_to_peter': 'Peter (Experto en Shopify)',
    'delegate_to_toby': 'Toby (Asistente de Tareas)',
    'delegate_to_apu': 'Apu (Especialista en Google Workspace)',
    'delegate_to_nora': 'Nora (Experta en Calendarios)',
    'delegate_to_wex': 'Wex (Experto en Análisis Web)',
  }
  
  return toolNameMap[toolName] || toolName.replace(/_/g, ' ')
}

/**
 * Detecta si un mensaje tiene razonamiento extractible
 */
export function hasExtractableReasoning(aiMessage: AIMessage): boolean {
  const content = typeof aiMessage.content === 'string' ? aiMessage.content : ''
  const hasThinking = /<thinking>/i.test(content)
  const hasToolCalls = ((aiMessage as any).tool_calls || []).length > 0
  const hasImplicitAnalysis = extractImplicitAnalysis(content) !== null
  
  return hasThinking || hasToolCalls || hasImplicitAnalysis
}
