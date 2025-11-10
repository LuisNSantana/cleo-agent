/**
 * UI Messaging
 * 
 * Mapeo de estados técnicos a mensajes amigables para la UI.
 * Provee mensajes contextuales que ayudan al usuario a entender
 * qué está haciendo el sistema en cada momento.
 */

import type { PipelineStep, Action } from '@/lib/types/definitions';


interface MessageContext {
  // Contexto de la conversación
  hasImages?: boolean
  hasFiles?: boolean
  searchEnabled?: boolean
  documentId?: string
  
  // Contexto del agente
  agentId?: string
  agentName?: string
  targetAgent?: string
  targetAgentName?: string
  expertise?: string
  
  // Contexto de la acción
  complexity?: 'low' | 'medium' | 'high'
  toolName?: string
  toolCount?: number
  delegationCompleted?: boolean
  isRetrying?: boolean
  
  // Metadatos adicionales
  metadata?: Record<string, any>
}

interface MessageTemplate {
  default: string
  withContext?: (ctx: MessageContext) => string
}

/**
 * Mapeo de expertise por agentId para mensajes más descriptivos
 */
const AGENT_EXPERTISE: Record<string, string> = {
  'ami-creative': 'asistencia ejecutiva y productividad',
  'astra-email': 'gestión de email y comunicación profesional',
  'iris-insights': 'análisis de insights y síntesis de información',
  'jenn-community': 'gestión de redes sociales y comunidades',
  'peter-financial': 'estrategia financiera y modelado',
  'toby-technical': 'ingeniería de software e IoT',
  'apu-support': 'soporte técnico y éxito del cliente',
  'nora-medical': 'información médica y triage (no diagnóstico)',
  'wex-intelligence': 'análisis de mercado e inteligencia competitiva',
  'emma-ecommerce': 'comercio electrónico y optimización Shopify',
  'notion-agent': 'gestión de workspace y bases de conocimiento Notion',
  'cleo-supervisor': 'coordinación y orquestación de equipos',
}

/**
 * Mensajes contextuales por tipo de acción
 */
const ACTION_MESSAGES: Record<Action, MessageTemplate> = {
  routing: {
    default: 'Analizando tu solicitud para determinar el mejor enfoque…',
    withContext: (ctx) => {
      if (ctx.hasImages && ctx.hasFiles) {
        return 'Procesando imágenes y documentos adjuntos para entender tu solicitud…'
      }
      if (ctx.hasImages) {
        return 'Analizando las imágenes que compartiste y decidiendo cómo ayudarte…'
      }
      if (ctx.hasFiles) {
        return 'Revisando los documentos adjuntos para comprender el contexto…'
      }
      if (ctx.documentId) {
        return 'Abriendo el documento solicitado y preparando el análisis…'
      }
      return 'Entendiendo tu mensaje y planificando la mejor forma de ayudarte…'
    }
  },
  
  analyzing: {
    default: 'Analizando la información disponible…',
    withContext: (ctx) => {
      if (ctx.searchEnabled) {
        return 'Buscando información relevante en la web para darte la respuesta más actualizada…'
      }
      if (ctx.hasFiles) {
        return 'Procesando el contenido de los archivos adjuntos…'
      }
      if (ctx.complexity === 'high') {
        return 'Analizando múltiples factores para darte una respuesta completa…'
      }
      if (ctx.documentId) {
        return 'Extrayendo información clave del documento…'
      }
      return 'Revisando el contexto de la conversación para entender mejor tu necesidad…'
    }
  },
  
  thinking: {
    default: 'Pensando en la mejor solución…',
    withContext: (ctx) => {
      if (ctx.complexity === 'high') {
        return 'Evaluando diferentes opciones para darte la mejor respuesta posible…'
      }
      if (ctx.isRetrying) {
        return 'Replanteando el enfoque para obtener un mejor resultado…'
      }
      if (ctx.toolCount && ctx.toolCount > 3) {
        return 'Coordinando múltiples herramientas para completar tu solicitud…'
      }
      return 'Formulando la respuesta más útil para ti…'
    }
  },
  
  delegating: {
    default: 'Conectando con un especialista del equipo…',
    withContext: (ctx) => {
      if (ctx.targetAgent && ctx.targetAgentName) {
        const expertise = ctx.expertise || AGENT_EXPERTISE[ctx.targetAgent] || 'esta área especializada'
        return `Delegando a ${ctx.targetAgentName}, quien es experto en ${expertise}…`
      }
      if (ctx.complexity === 'high') {
        return 'Esta solicitud requiere conocimiento especializado, buscando al experto apropiado…'
      }
      return 'Identificando al miembro del equipo más apropiado para esta tarea…'
    }
  },
  
  delegation: {
    default: 'Trabajando con el equipo especializado…',
    withContext: (ctx) => {
      if (ctx.agentName) {
        return `${ctx.agentName} está trabajando en tu solicitud…`
      }
      return 'El especialista está procesando tu solicitud…'
    }
  },
  
  executing: {
    default: 'Ejecutando las acciones necesarias…',
    withContext: (ctx) => {
      if (ctx.toolName) {
        const humanTool = humanizeToolName(ctx.toolName)
        return `Usando ${humanTool} para procesar tu solicitud…`
      }
      if (ctx.toolCount && ctx.toolCount > 1) {
        return `Ejecutando ${ctx.toolCount} herramientas en paralelo para acelerar el proceso…`
      }
      return 'Procesando tu solicitud con las herramientas apropiadas…'
    }
  },
  
  responding: {
    default: 'Preparando la respuesta…',
    withContext: (ctx) => {
      if (ctx.delegationCompleted && ctx.agentName) {
        return `${ctx.agentName} completó su análisis, organizando la información para ti…`
      }
      return 'Organizando la información para darte una respuesta clara…'
    }
  },
  
  reviewing: {
    default: 'Revisando el resultado…',
    withContext: (ctx) => {
      if (ctx.delegationCompleted) {
        return 'Validando la respuesta del especialista antes de compartirla contigo…'
      }
      if (ctx.complexity === 'high') {
        return 'Verificando que la respuesta sea completa y precisa…'
      }
      return 'Haciendo una última verificación antes de responder…'
    }
  },
  
  supervising: {
    default: 'Supervisando calidad…',
    withContext: (ctx) => {
      if (ctx.delegationCompleted) {
        return 'Cleo supervisando la calidad de la respuesta final…'
      }
      return 'Verificando precisión y completitud de la respuesta…'
    }
  },
  
  completing: {
    default: 'Finalizando…',
    withContext: (ctx) => {
      if (ctx.delegationCompleted && ctx.agentName) {
        return `${ctx.agentName} terminó su trabajo, preparando el resumen final…`
      }
      if (ctx.toolCount && ctx.toolCount > 1) {
        return 'Consolidando resultados de múltiples herramientas…'
      }
      return 'Últimos ajustes antes de compartir la respuesta…'
    }
  }
}

/**
 * Mapeo de nombres técnicos de herramientas a nombres legibles
 */
const TOOL_NAME_MAP: Record<string, string> = {
  // Herramientas generales
  'webSearch': 'búsqueda web',
  'memoryAddNote': 'memoria a largo plazo',
  'memoryRecall': 'consulta de memoria',
  'getWeather': 'servicio de clima',
  'complete_task': 'marcador de tareas completadas',
  
  // Documentos y archivos
  'openDocument': 'visor de documentos',
  'summarizeDocument': 'resumidor de documentos',
  'analyzeImage': 'análisis de imágenes',
  'generateImage': 'generador de imágenes',
  
  // Notion
  'createNotionPage': 'creador de páginas Notion',
  'searchNotionPages': 'búsqueda en Notion',
  'updateNotionPage': 'editor de Notion',
  'getNotionPage': 'lector de Notion',
  'listNotionDatabases': 'explorador de bases Notion',
  
  // Twitter/Social
  'readTwitterTimeline': 'lector de Twitter',
  'postTweet': 'publicador de tweets',
  'searchTweets': 'buscador de tweets',
  'analyzeTweetEngagement': 'análisis de engagement',
  
  // Shopify
  'getShopifyProducts': 'consulta de productos Shopify',
  'createShopifyProduct': 'creador de productos',
  'updateInventory': 'gestor de inventario',
  
  // Google Workspace
  'readGoogleSheet': 'lector de Google Sheets',
  'updateGoogleSheet': 'editor de Google Sheets',
  'getCalendarEvents': 'consulta de calendario',
  'createCalendarEvent': 'creador de eventos',
  
  // Análisis y datos
  'analyzeMarketData': 'análisis de mercado',
  'getStockPrice': 'consulta de precios',
  'runPythonCode': 'ejecutor de Python',
  'analyzeSentiment': 'análisis de sentimiento',
  
  // Utilidades
  'translateText': 'traductor',
  'extractText': 'extractor de texto',
  'convertFormat': 'conversor de formato',
  
  // Delegaciones (con nombres completos)
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

/**
 * Humaniza el nombre de una herramienta
 */
export function humanizeToolName(toolName: string): string {
  return TOOL_NAME_MAP[toolName] || toolName.replace(/_/g, ' ').toLowerCase()
}

/**
 * Obtiene un mensaje contextual para una acción
 */
export function getContextualMessage(
  action: Action,
  context?: MessageContext
): string {
  const template = ACTION_MESSAGES[action]
  
  if (!template) {
    console.warn(`[UI-Messaging] No template found for action: ${action}`)
    return 'Procesando…'
  }
  
  // Usar mensaje contextual si hay contexto y función disponible
  if (context && template.withContext) {
    try {
      return template.withContext(context)
    } catch (error) {
      console.error(`[UI-Messaging] Error in contextual message for ${action}:`, error)
      return template.default
    }
  }
  
  return template.default
}

/**
 * Enriquece un PipelineStep con mensaje contextual mejorado
 */
export function enrichStepWithContextualMessage(
  step: PipelineStep,
  additionalContext?: Partial<MessageContext>
): PipelineStep {
  // Si el step ya tiene contenido de reasoning, no sobrescribir
  if (step.metadata?.reasoning && step.content) {
    return step
  }
  
  // Construir contexto completo del step
  const context: MessageContext = {
    agentId: step.agent,
    agentName: step.agentName,
    targetAgent: step.metadata?.targetAgent,
    targetAgentName: step.metadata?.targetAgentName,
    expertise: step.metadata?.expertise,
    toolName: step.metadata?.toolName,
    toolCount: step.metadata?.toolCount,
    delegationCompleted: step.metadata?.delegationCompleted,
    hasImages: step.metadata?.hasImages,
    hasFiles: step.metadata?.hasFiles,
    searchEnabled: step.metadata?.searchEnabled,
    documentId: step.metadata?.documentId,
    complexity: step.metadata?.complexity,
    isRetrying: step.metadata?.isRetrying,
    metadata: step.metadata,
    ...additionalContext
  }
  
  // Obtener mensaje contextual
  const contextualContent = getContextualMessage(step.action, context)
  
  return {
    ...step,
    content: contextualContent,
    metadata: {
      ...step.metadata,
      originalContent: step.content,
      enriched: true
    }
  }
}

/**
 * Detecta el nivel de complejidad de un mensaje de usuario
 */
export function detectComplexity(userMessage: string): 'low' | 'medium' | 'high' {
  // Heurísticas simples para complejidad
  const wordCount = userMessage.split(/\s+/).length
  const hasMultipleQuestions = (userMessage.match(/\?/g) || []).length > 1
  const hasMultipleRequests = /\by\b|\btambién\b|\bademas\b/i.test(userMessage)
  const hasConditionals = /\bsi\b|\bcuando\b|\ben caso\b/i.test(userMessage)
  
  if (wordCount > 100 || (hasMultipleQuestions && hasMultipleRequests) || hasConditionals) {
    return 'high'
  }
  
  if (wordCount > 30 || hasMultipleQuestions || hasMultipleRequests) {
    return 'medium'
  }
  
  return 'low'
}

/**
 * Genera un mensaje de progreso basado en elapsed time
 */
export function getProgressMessage(
  action: Action,
  elapsedMs: number,
  agentName?: string
): string {
  const seconds = Math.floor(elapsedMs / 1000)
  
  if (seconds < 5) {
    return getContextualMessage(action)
  }
  
  if (seconds < 15) {
    const messages: Record<Action, string> = {
      routing: 'Casi listo, analizando las mejores opciones…',
      analyzing: 'Procesando información, esto puede tomar unos segundos…',
      thinking: 'Pensando cuidadosamente para darte la mejor respuesta…',
      delegating: agentName ? `Esperando a ${agentName}…` : 'Esperando al especialista…',
      delegation: agentName ? `${agentName} está trabajando en ello…` : 'El especialista está trabajando…',
      executing: 'Ejecutando, casi terminamos…',
      responding: 'Organizando la respuesta…',
      reviewing: 'Revisando los detalles finales…',
      supervising: 'Supervisando calidad de la respuesta…',
      completing: 'Finalizando el proceso…'
    }
    return messages[action] || getContextualMessage(action)
  }
  
  if (seconds < 30) {
    return agentName 
      ? `${agentName} está trabajando en una tarea compleja, esto puede tomar un momento…`
      : 'Esta solicitud está tomando más tiempo de lo usual, pero estamos en ello…'
  }
  
  // > 30 segundos
  return 'Esta es una tarea compleja. Gracias por tu paciencia mientras trabajamos en ello…'
}
