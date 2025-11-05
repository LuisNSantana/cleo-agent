/**
 * Step Builder
 * 
 * Sistema centralizado para construir pasos de ejecución humanizados.
 * Evita la duplicación inglés/español al emitir directamente mensajes 
 * contextuales en el idioma del usuario.
 */

import type { ExecutionStep } from '@/lib/agents/types'
import { getCurrentUserLocale } from '@/lib/server/request-context'
import { generateSemanticStepId, generateDelegationId } from './id-generator'

export interface StepBuilderConfig {
  locale?: 'en' | 'es' | 'fr' | 'de' // User's preferred language (auto-detected from browser if not provided)
  agentId: string
  agentName?: string
  nodeType: string
  targetAgentId?: string
  targetAgentName?: string
  toolName?: string
  toolCount?: number
  metadata?: Record<string, unknown>
}

/**
 * Mapeo de expertise por agentId para mensajes más descriptivos
 */
const AGENT_EXPERTISE: Record<string, { es: string; en: string; fr: string; de: string }> = {
  'ami-creative': { 
    es: 'asistencia ejecutiva y productividad', 
    en: 'executive assistance and productivity',
    fr: 'assistance exécutive et productivité',
    de: 'Assistenz der Geschäftsführung und Produktivität'
  },
  'astra-email': { 
    es: 'gestión de email y comunicación profesional', 
    en: 'email management and professional communication',
    fr: 'gestion des emails et communication professionnelle',
    de: 'E-Mail-Verwaltung und professionelle Kommunikation'
  },
  'iris-insights': { 
    es: 'análisis de insights y síntesis de información', 
    en: 'insights analysis and information synthesis',
    fr: 'analyse d\'insights et synthèse d\'informations',
    de: 'Insights-Analyse und Informationssynthese'
  },
  'jenn-community': { 
    es: 'gestión de redes sociales y comunidades', 
    en: 'social media and community management',
    fr: 'gestion des réseaux sociaux et des communautés',
    de: 'Social-Media- und Community-Management'
  },
  'peter-financial': { 
    es: 'estrategia financiera y modelado', 
    en: 'financial strategy and modeling',
    fr: 'stratégie financière et modélisation',
    de: 'Finanzstrategie und Modellierung'
  },
  'toby-technical': { 
    es: 'ingeniería de software e IoT', 
    en: 'software engineering and IoT',
    fr: 'ingénierie logicielle et IoT',
    de: 'Software-Engineering und IoT'
  },
  'apu-support': { 
    es: 'soporte técnico y éxito del cliente', 
    en: 'technical support and customer success',
    fr: 'support technique et succès client',
    de: 'technischer Support und Kundenerfolg'
  },
  'nora-medical': { 
    es: 'información médica y triage (no diagnóstico)', 
    en: 'medical information and triage (non-diagnostic)',
    fr: 'informations médicales et triage (non diagnostique)',
    de: 'medizinische Information und Triage (nicht diagnostisch)'
  },
  'wex-intelligence': { 
    es: 'análisis de mercado e inteligencia competitiva', 
    en: 'market analysis and competitive intelligence',
    fr: 'analyse de marché et intelligence concurrentielle',
    de: 'Marktanalyse und Wettbewerbsintelligenz'
  },
  'emma-ecommerce': { 
    es: 'comercio electrónico y optimización Shopify', 
    en: 'e-commerce and Shopify optimization',
    fr: 'commerce électronique et optimisation Shopify',
    de: 'E-Commerce und Shopify-Optimierung'
  },
  'notion-agent': { 
    es: 'gestión de workspace y bases de conocimiento Notion', 
    en: 'Notion workspace and knowledge base management',
    fr: 'gestion de l\'espace de travail et base de connaissances Notion',
    de: 'Notion-Workspace- und Wissensdatenbank-Verwaltung'
  },
  'cleo-supervisor': { 
    es: 'coordinación y orquestación de equipos', 
    en: 'team coordination and orchestration',
    fr: 'coordination et orchestration d\'équipe',
    de: 'Teamkoordination und Orchestrierung'
  },
}

/**
 * Mensajes humanizados por tipo de nodo (español)
 */
const NODE_MESSAGES_ES: Record<string, (config: StepBuilderConfig) => string> = {
  router: () => {
    return '🧭 Analizando tu solicitud para determinar el mejor enfoque…'
  },
  
  agent: (config) => {
    const agentName = config.agentName || config.agentId
    const expertise = AGENT_EXPERTISE[config.agentId]?.es
    if (expertise) {
      return `🤖 ${agentName} procesando (experto en ${expertise})…`
    }
    return `🤖 ${agentName} procesando tu solicitud…`
  },
  
  delegationAgent: (config) => {
    const targetName = config.targetAgentName || config.targetAgentId || 'especialista'
    const expertise = config.targetAgentId ? AGENT_EXPERTISE[config.targetAgentId]?.es : null
    if (expertise) {
      return `🤝 Delegando a ${targetName}, experto en ${expertise}…`
    }
    return `🤝 Delegando a ${targetName}…`
  },
  
  tools: (config) => {
    if (config.toolName) {
      return `🔧 Usando herramienta: ${humanizeToolName(config.toolName, 'es')}…`
    }
    if (config.toolCount && config.toolCount > 1) {
      return `🔧 Ejecutando ${config.toolCount} herramientas en paralelo…`
    }
    return '🔧 Ejecutando herramientas necesarias…'
  },
  
  end: (config) => {
    const agentName = config.agentName || config.agentId
    return `✅ ${agentName} completó su trabajo`
  },
  
  // Fallback for unknown node types
  default: (config) => {
    return `⚙️ Procesando: ${config.nodeType}…`
  }
}

/**
 * Mensajes humanizados por tipo de nodo (inglés)
 */
const NODE_MESSAGES_EN: Record<string, (config: StepBuilderConfig) => string> = {
  router: () => {
    return '🧭 Analyzing your request to determine the best approach…'
  },
  
  agent: (config) => {
    const agentName = config.agentName || config.agentId
    const expertise = AGENT_EXPERTISE[config.agentId]?.en
    if (expertise) {
      return `🤖 ${agentName} processing (expert in ${expertise})…`
    }
    return `🤖 ${agentName} processing your request…`
  },
  
  delegationAgent: (config) => {
    const targetName = config.targetAgentName || config.targetAgentId || 'specialist'
    const expertise = config.targetAgentId ? AGENT_EXPERTISE[config.targetAgentId]?.en : null
    if (expertise) {
      return `🤝 Delegating to ${targetName}, expert in ${expertise}…`
    }
    return `🤝 Delegating to ${targetName}…`
  },
  
  tools: (config) => {
    if (config.toolName) {
      return `🔧 Using tool: ${humanizeToolName(config.toolName, 'en')}…`
    }
    if (config.toolCount && config.toolCount > 1) {
      return `🔧 Executing ${config.toolCount} tools in parallel…`
    }
    return '🔧 Executing necessary tools…'
  },
  
  end: (config) => {
    const agentName = config.agentName || config.agentId
    return `✅ ${agentName} completed its work`
  },
  
  // Fallback for unknown node types
  default: (config) => {
    return `⚙️ Processing: ${config.nodeType}…`
  }
}

/**
 * Mensajes humanizados por tipo de nodo (francés)
 */
const NODE_MESSAGES_FR: Record<string, (config: StepBuilderConfig) => string> = {
  router: () => {
    return '🧭 Analyse de votre demande pour déterminer la meilleure approche…'
  },
  
  agent: (config) => {
    const agentName = config.agentName || config.agentId
    const expertise = AGENT_EXPERTISE[config.agentId]?.fr
    if (expertise) {
      return `🤖 ${agentName} en cours de traitement (expert en ${expertise})…`
    }
    return `🤖 ${agentName} traite votre demande…`
  },
  
  delegationAgent: (config) => {
    const targetName = config.targetAgentName || config.targetAgentId || 'spécialiste'
    const expertise = config.targetAgentId ? AGENT_EXPERTISE[config.targetAgentId]?.fr : null
    if (expertise) {
      return `🤝 Délégation à ${targetName}, expert en ${expertise}…`
    }
    return `🤝 Délégation à ${targetName}…`
  },
  
  tools: (config) => {
    if (config.toolName) {
      return `🔧 Utilisation de l'outil: ${humanizeToolName(config.toolName, 'fr')}…`
    }
    if (config.toolCount && config.toolCount > 1) {
      return `🔧 Exécution de ${config.toolCount} outils en parallèle…`
    }
    return '🔧 Exécution des outils nécessaires…'
  },
  
  end: (config) => {
    const agentName = config.agentName || config.agentId
    return `✅ ${agentName} a terminé son travail`
  },
  
  default: (config) => {
    return `⚙️ Traitement: ${config.nodeType}…`
  }
}

/**
 * Mensajes humanizados por tipo de nodo (alemán)
 */
const NODE_MESSAGES_DE: Record<string, (config: StepBuilderConfig) => string> = {
  router: () => {
    return '🧭 Analyse Ihrer Anfrage zur Bestimmung des besten Ansatzes…'
  },
  
  agent: (config) => {
    const agentName = config.agentName || config.agentId
    const expertise = AGENT_EXPERTISE[config.agentId]?.de
    if (expertise) {
      return `🤖 ${agentName} in Bearbeitung (Experte für ${expertise})…`
    }
    return `🤖 ${agentName} bearbeitet Ihre Anfrage…`
  },
  
  delegationAgent: (config) => {
    const targetName = config.targetAgentName || config.targetAgentId || 'Spezialist'
    const expertise = config.targetAgentId ? AGENT_EXPERTISE[config.targetAgentId]?.de : null
    if (expertise) {
      return `🤝 Delegierung an ${targetName}, Experte für ${expertise}…`
    }
    return `🤝 Delegierung an ${targetName}…`
  },
  
  tools: (config) => {
    if (config.toolName) {
      return `🔧 Verwendung des Tools: ${humanizeToolName(config.toolName, 'de')}…`
    }
    if (config.toolCount && config.toolCount > 1) {
      return `🔧 Ausführung von ${config.toolCount} Tools parallel…`
    }
    return '🔧 Ausführung der erforderlichen Tools…'
  },
  
  end: (config) => {
    const agentName = config.agentName || config.agentId
    return `✅ ${agentName} hat die Arbeit abgeschlossen`
  },
  
  default: (config) => {
    return `⚙️ Verarbeitung: ${config.nodeType}…`
  }
}

/**
 * Mapeo de nombres técnicos de herramientas a nombres legibles
 */
function humanizeToolName(toolName: string, locale: 'es' | 'en' | 'fr' | 'de'): string {
  const toolNameMap: Record<string, { es: string; en: string; fr: string; de: string }> = {
    'webSearch': { 
      es: 'búsqueda web', 
      en: 'web search', 
      fr: 'recherche web', 
      de: 'Websuche' 
    },
    'memoryAddNote': { 
      es: 'memoria a largo plazo', 
      en: 'long-term memory', 
      fr: 'mémoire à long terme', 
      de: 'Langzeitgedächtnis' 
    },
    'memoryRecall': { 
      es: 'consulta de memoria', 
      en: 'memory recall', 
      fr: 'rappel de mémoire', 
      de: 'Gedächtnisabruf' 
    },
    'getWeather': { 
      es: 'servicio de clima', 
      en: 'weather service', 
      fr: 'service météo', 
      de: 'Wetterdienst' 
    },
    'googleSheets': { 
      es: 'Google Sheets', 
      en: 'Google Sheets', 
      fr: 'Google Sheets', 
      de: 'Google Sheets' 
    },
    'notion': { 
      es: 'Notion', 
      en: 'Notion', 
      fr: 'Notion', 
      de: 'Notion' 
    },
    'shopify': { 
      es: 'Shopify', 
      en: 'Shopify', 
      fr: 'Shopify', 
      de: 'Shopify' 
    },
    'twitter': { 
      es: 'Twitter/X', 
      en: 'Twitter/X', 
      fr: 'Twitter/X', 
      de: 'Twitter/X' 
    },
  }
  
  return toolNameMap[toolName]?.[locale] || toolName
}

/**
 * Construye un paso de ejecución humanizado en el idioma del usuario.
 * 
 * Este es el punto central para crear pasos - evita duplicación al emitir
 * directamente mensajes contextuales sin necesidad de re-enriquecimiento.
 * 
 * @param config - Configuración del paso (agentId, nodeType, locale, etc.)
 * @returns ExecutionStep con mensaje humanizado y flag canonical=true
 */
export function buildHumanizedStep(config: StepBuilderConfig): ExecutionStep {
  // Auto-detect locale from request context if not provided
  const locale = config.locale || getCurrentUserLocale() || 'es'
  
  // Select message map based on locale
  let messageMap: Record<string, (config: StepBuilderConfig) => string>
  
  switch (locale) {
    case 'en':
      messageMap = NODE_MESSAGES_EN
      break
    case 'fr':
      messageMap = NODE_MESSAGES_FR
      break
    case 'de':
      messageMap = NODE_MESSAGES_DE
      break
    case 'es':
    default:
      messageMap = NODE_MESSAGES_ES
      break
  }
  
  // Get message generator for this node type (or fallback to default)
  const messageGenerator = messageMap[config.nodeType] || messageMap.default
  
  // Generate humanized message
  const message = messageGenerator(config)
  
  // Determine action type based on node type
  const action = mapNodeTypeToAction(config.nodeType)
  
  // Generate semantic ID (Phase 2)
  const stepId = generateSemanticStepId(config.agentId, config.nodeType)
  
  return {
    id: stepId, // ✅ Phase 2: Semantic IDs (e.g., "cleo-supervisor:router:1762348250879")
    timestamp: new Date(),
    agent: config.agentId,
    agentName: config.agentName,
    action,
    content: message,
    progress: 0,
    metadata: {
      canonical: true, // ✅ Flag to prevent re-enrichment
      nodeType: config.nodeType,
      locale,
      ...config.metadata
    }
  }
}

/**
 * Mapea tipos de nodo a acciones de ExecutionStep
 */
function mapNodeTypeToAction(
  nodeType: string
): 'analyzing' | 'thinking' | 'responding' | 'delegating' | 'completing' | 'routing' | 'interrupt' {
  const actionMap: Record<string, ExecutionStep['action']> = {
    router: 'routing',
    agent: 'analyzing',
    delegationAgent: 'delegating',
    tools: 'analyzing',
    end: 'completing',
  }
  
  return actionMap[nodeType] || 'analyzing'
}

/**
 * Construye un paso de "entrada a nodo"
 */
export function buildNodeEnteredStep(config: Omit<StepBuilderConfig, 'nodeType'>): ExecutionStep {
  return buildHumanizedStep({ ...config, nodeType: config.agentId === 'cleo-supervisor' ? 'router' : 'agent' })
}

/**
 * Construye un paso de "completado de nodo"
 */
export function buildNodeCompletedStep(config: Omit<StepBuilderConfig, 'nodeType'>): ExecutionStep {
  return buildHumanizedStep({ ...config, nodeType: 'end' })
}

/**
 * Construye un paso de delegación con ID semántico
 * 
 * Usa formato especial: `{fromAgent}→{toAgent}:delegate:{timestamp}`
 * 
 * @example
 * buildDelegationStep({
 *   agentId: 'cleo-supervisor',
 *   targetAgentId: 'astra-email',
 *   targetAgentName: 'Astra'
 * })
 * // → ID: "cleo-supervisor→astra-email:delegate:1762348250879"
 */
export function buildDelegationStep(config: StepBuilderConfig): ExecutionStep {
  const step = buildHumanizedStep({ ...config, nodeType: 'delegationAgent' })
  
  // Override ID with delegation-specific format if targetAgentId is present
  if (config.targetAgentId) {
    step.id = generateDelegationId(config.agentId, config.targetAgentId)
  }
  
  return step
}

/**
 * Construye un paso de herramientas
 */
export function buildToolStep(config: StepBuilderConfig): ExecutionStep {
  return buildHumanizedStep({ ...config, nodeType: 'tools' })
}
