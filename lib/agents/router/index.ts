/**
 * Layered Router (Capa 0 rules)
 *
 * Purpose: Provide extremely fast, deterministic routing hints for
 * - Utility intents: time/date and weather (ES/EN)
 * - Email intents: triage vs compose (Ami local vs Astra delegation)
 *
 * These hints are used by the prompt builder to steer the LLM toward
 * direct tool calls or targeted delegation before invoking heavier scorers.
 */

export type RoutingAction = 'delegate' | 'tool'

export interface RouterDirective {
  source: 'early'
  action: RoutingAction
  toolName: string
  reasons: string[]
  confidence: number
  agentId?: string
  agentName?: string
  leafTool?: string
}

// Keyword sets (EN/ES) for early detection
const TIME_KEYWORDS = [
  // English
  'time', 'what time is it', 'current time', 'now', 'today', 'date', 'today\'s date',
  // Spanish
  'hora', 'qué hora es', 'que hora es', 'fecha', 'fecha de hoy', 'ahora'
]

const WEATHER_KEYWORDS = [
  // English
  'weather', 'forecast', 'temperature', 'rain', 'sunny', 'cloudy', 'wind', 'humidity',
  // Spanish
  'clima', 'tiempo', 'pronóstico', 'pronostico', 'temperatura', 'lluvia', 'soleado', 'nublado', 'viento', 'humedad'
]

const EMAIL_TRIAGE_KEYWORDS = [
  // English triage/read/summarize
  'read my email', 'check inbox', 'check my inbox', 'summarize emails', 'email summary', 'unread emails', 'search emails', 'find emails',
  // Spanish triage
  'lee mi correo', 'revisa bandeja', 'revisa mi bandeja', 'resumen de correos', 'correos no leídos', 'correos no leidos', 'buscar correos',
  'correos de hoy', 'mis correos de hoy', 'revisa correos de hoy', 'dime mis correos de hoy'
]

const EMAIL_COMPOSE_KEYWORDS = [
  // English compose/draft/reply/send
  'compose email', 'draft email', 'write an email', 'write email', 'reply to email', 'respond to email', 'send email', 'email reply',
  // Spanish compose
  'redacta un correo', 'redactar correo', 'escribe un correo', 'responder correo', 'responde correo', 'enviar correo', 'borrador de respuesta'
]

// General email mention keywords (route to Ami/Astra by default)
const EMAIL_GENERAL_KEYWORDS = [
  'email', 'gmail', 'correo', 'inbox', 'bandeja', 'mail'
]

// If any of these appear alongside a general email mention, keep Cleo in charge
// so multi-step requests (research + follow-up email) aren't hijacked by Ami.
const EMAIL_GENERAL_BLOCKERS = [
  // Research & investigation
  'research', 'investigate', 'investigation', 'investigación', 'investigar',
  'analysis', 'análisis', 'analisis', 'look into', 'buscar', 'busca',
  // Task / project planning
  'task', 'tarea', 'project', 'proyecto', 'schedule', 'programa', 'programar',
  'plan', 'planning', 'planificar', 'agenda',
  // Information gathering wording
  'info', 'información', 'informacion', 'details', 'detalles', 'datos',
  'opportunity', 'oportunidad'
]

// Research & Intelligence keywords (Apu)
const RESEARCH_KEYWORDS = [
  // English - Research
  'research', 'investigate', 'analysis', 'analyze', 'study', 'examine', 'explore',
  'find out', 'discover', 'learn about', 'understand', 'compare', 'comparison',
  'what is', 'how does', 'why does', 'tell me about', 'explain', 'difference between',
  // English - Data & Sources
  'data', 'statistics', 'stats', 'report', 'findings', 'insights', 'trends',
  'market', 'competitor', 'competitive', 'industry', 'sector', 'news about',
  // Spanish - Research
  'investigar', 'investigación', 'analizar', 'análisis', 'estudiar', 'examinar',
  'explorar', 'averiguar', 'descubrir', 'aprender sobre', 'entender', 'comparar',
  'qué es', 'cómo funciona', 'por qué', 'cuéntame sobre', 'explica', 'diferencia entre',
  // Spanish - Data & Sources
  'datos', 'estadísticas', 'reporte', 'hallazgos', 'insights', 'tendencias',
  'mercado', 'competidor', 'competencia', 'industria', 'sector', 'noticias sobre'
]

// Social Media & Community Management keywords (Jenn)
const SOCIAL_MEDIA_KEYWORDS = [
  // Telegram - MÁXIMA PRIORIDAD
  'telegram', 'canal telegram', 'channel telegram', 'publicar telegram', 'enviar telegram',
  'broadcast telegram', 'mensaje telegram', 'anuncio telegram', 'telegram channel',
  'telegram broadcast', 'telegram message', 'post telegram', '@cleo', 'chat_id',
  // Twitter/X
  'tweet', 'twitter', 'x.com', 'publicar tweet', 'post tweet', 'hilo twitter', 'thread',
  // Instagram
  'instagram', 'ig', 'insta', 'post instagram', 'publicar instagram', 'reel', 'stories',
  // Facebook
  'facebook', 'fb', 'página facebook', 'facebook page', 'post facebook', 'publicar facebook',
  // General social media
  'redes sociales', 'social media', 'comunidad', 'community', 'engagement', 'publicar',
  'post', 'share', 'compartir', 'audiencia', 'followers', 'seguidores'
]

// Automation keywords (Wex)
const AUTOMATION_KEYWORDS = [
  // English
  'automate', 'automation', 'scrape', 'scraping', 'extract data', 'web scraping',
  'fill form', 'fill out', 'submit form', 'navigate to', 'browse to', 'visit website',
  'click on', 'interact with', 'automated task', 'bot', 'web automation',
  // Spanish
  'automatizar', 'automatización', 'scrape', 'scraping', 'extraer datos', 'raspado web',
  'rellenar formulario', 'completar formulario', 'enviar formulario', 'navegar a',
  'visitar sitio', 'hacer clic', 'interactuar con', 'tarea automatizada', 'bot'
]

// E-commerce keywords (Emma)  
const ECOMMERCE_KEYWORDS = [
  // English
  'shopify', 'store', 'shop', 'ecommerce', 'e-commerce', 'product', 'products',
  'order', 'orders', 'sales', 'revenue', 'aov', 'ltv', 'conversion', 'analytics',
  'inventory', 'stock', 'collection', 'collections', 'customer', 'customers',
  // Spanish
  'tienda', 'comercio', 'producto', 'productos', 'orden', 'ordenes', 'ventas',
  'ingresos', 'conversión', 'analíticas', 'inventario', 'stock', 'colección',
  'colecciones', 'cliente', 'clientes'
]

// Google Workspace Creation keywords (Peter)
const WORKSPACE_CREATION_KEYWORDS = [
  // English - Creation focus
  'create document', 'create doc', 'create sheet', 'create spreadsheet', 'create slides',
  'create presentation', 'new document', 'new spreadsheet', 'new sheet', 'make a doc',
  'make a sheet', 'write a document', 'build a spreadsheet', 'generate sheet',
  // Spanish - Creation focus  
  'crear documento', 'crear doc', 'crear hoja', 'crear spreadsheet', 'crear presentación',
  'nuevo documento', 'nueva hoja', 'hacer un doc', 'hacer una hoja', 'generar hoja'
]

// Financial & Business Strategy intents
const FINANCIAL_KEYWORDS = [
  // English - Finance
  'budget', 'finance', 'financial', 'accounting', 'money', 'investment', 'profit', 'revenue', 'expense', 'cost', 'roi', 'cash flow', 'business model', 'financial model', 'spreadsheet analysis', 'financial analysis',
  // English - Business
  'business plan', 'strategy', 'pricing', 'valuation', 'taxes', 'tax planning', 'bookkeeping', 'p&l', 'balance sheet', 'financial statement', 'crypto', 'cryptocurrency', 'bitcoin', 'portfolio',
  // Spanish - Finance  
  'presupuesto', 'finanzas', 'financiero', 'contabilidad', 'dinero', 'inversión', 'inversion', 'ganancia', 'ingreso', 'gasto', 'costo', 'flujo de caja', 'modelo de negocio', 'análisis financiero', 'analisis financiero',
  // Spanish - Business
  'plan de negocios', 'estrategia', 'precios', 'valuación', 'valuacion', 'impuestos', 'planeación fiscal', 'contabilidad', 'estado financiero', 'criptomoneda', 'bitcoin', 'portafolio'
]

// Calendar intents (always route to Ami)
const CALENDAR_KEYWORDS = [
  // English
  'calendar', 'schedule', 'meeting', 'appointment', 'invite', 'event', 'book a meeting', 'calendar invite', 'set up a meeting',
  // Spanish
  'calendario', 'agenda', 'agendar', 'reunión', 'reunion', 'cita', 'invitar', 'evento', 'agendar reunión', 'agendar reunion', 'programar reunión'
]

// Notion intents
const NOTION_KEYWORDS = [
  // English
  'notion', 'workspace', 'database', 'page', 'pages', 'note', 'notes', 'wiki',
  // Spanish
  'notion', 'espacio de trabajo', 'base de datos', 'página', 'paginas', 'nota', 'notas', 'documentación', 'documentacion'
]

function includesAny(text: string, list: string[]): boolean {
  const t = text.toLowerCase()
  return list.some(k => t.includes(k))
}

export function detectEarlyIntent(userText: string): RouterDirective | undefined {
  const text = (userText || '').toLowerCase().trim()
  if (!text) return undefined

  // 0) Research & Intelligence (Apu) - Alta prioridad para queries informativas
  if (includesAny(text, RESEARCH_KEYWORDS) && !includesAny(text, EMAIL_GENERAL_KEYWORDS)) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_apu',
      agentId: 'apu-support',
      agentName: 'Apu (Research)',
      leafTool: 'serpGeneralSearch',
      reasons: ['research/analysis intent detected', 'delegate to Apu for information gathering'],
      confidence: 0.88,
    }
  }

  // 1) Email triage vs compose (PRIORITY over time/weather to avoid 'today' collisions)
  if (includesAny(text, EMAIL_TRIAGE_KEYWORDS)) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_ami',
      agentId: 'ami-creative',
      agentName: 'Ami (Email Triage)',
      leafTool: 'listGmailMessages',
      reasons: ['email triage intent (read/summary/search)', 'route to Ami to manage inbox safely'],
      confidence: 0.95,
    }
  }

  if (includesAny(text, EMAIL_COMPOSE_KEYWORDS)) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_astra',
      agentId: 'astra-email',
      agentName: 'Astra (Email Compose)',
      leafTool: 'sendGmailMessage',
      reasons: ['email compose/draft/reply intent', 'Astra handles drafting and sending'],
      confidence: 0.95,
    }
  }

  // If any general email/gmail mention exists (without explicit triage/compose), prefer Ami triage
  if (includesAny(text, EMAIL_GENERAL_KEYWORDS) && !includesAny(text, EMAIL_GENERAL_BLOCKERS)) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_ami',
      agentId: 'ami-creative',
      agentName: 'Ami (Email Triage)',
      leafTool: 'listGmailMessages',
      reasons: ['general email intent detected', 'default to Ami for safe inbox access'],
      confidence: 0.9,
    }
  }

  // 2) Utility: Time / Date
  if (includesAny(text, TIME_KEYWORDS)) {
    return {
      source: 'early',
      action: 'tool',
      toolName: 'getCurrentDateTime',
      agentName: 'Utility: Time',
      reasons: ['time/date intent detected (Capa 0)', 'call getCurrentDateTime tool directly'],
      confidence: 0.9,
    }
  }

  // 3) Utility: Weather
  if (includesAny(text, WEATHER_KEYWORDS)) {
    return {
      source: 'early',
      action: 'tool',
      toolName: 'weatherInfo',
      agentName: 'Utility: Weather',
      reasons: ['weather intent detected (Capa 0)', 'call weatherInfo tool directly'],
      confidence: 0.9,
    }
  }

  // 4) Calendar → Ami (manager/secretary)
  if (includesAny(text, CALENDAR_KEYWORDS)) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_ami',
      agentId: 'ami-creative',
      agentName: 'Ami (Calendar Management)',
      leafTool: 'createCalendarEvent',
      reasons: ['calendar intent detected (Capa 0)', 'Ami manages scheduling and invitations'],
      confidence: 0.92,
    }
  }

  // 5) Financial & Business Strategy → Peter
  if (includesAny(text, FINANCIAL_KEYWORDS)) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_peter',
      agentId: 'peter-financial',
      agentName: 'Peter (Financial Advisor)',
      leafTool: 'delegate_to_peter',
      reasons: ['financial or business strategy intent detected', 'delegate to Peter for financial analysis/business planning'],
      confidence: 0.9,
    }
  }

  // 6) Notion → delegate to Notion Agent
  if (includesAny(text, NOTION_KEYWORDS)) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_notion_agent',
      agentId: 'notion-agent',
      agentName: 'Notion Agent (Workspace)',
      leafTool: 'delegate_to_notion_agent',
      reasons: ['notion/workspace intent detected', 'delegate to Notion Agent for workspace tasks'],
      confidence: 0.88,
    }
  }

  // 7) Social Media & Community Management → Jenn (ANTES de Wex para evitar confusión con automation)
  if (includesAny(text, SOCIAL_MEDIA_KEYWORDS)) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_jenn',
      agentId: 'jenn-community',
      agentName: 'Jenn (Community Manager)',
      leafTool: 'publish_to_telegram',
      reasons: ['social media/telegram intent detected', 'delegate to Jenn for community management'],
      confidence: 0.93,
    }
  }

  // 8) Web Automation → Wex
  if (includesAny(text, AUTOMATION_KEYWORDS)) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_wex',
      agentId: 'wex-intelligence',
      agentName: 'Wex (Web Automation)',
      leafTool: 'create_skyvern_task',
      reasons: ['automation/scraping intent detected', 'delegate to Wex for web automation'],
      confidence: 0.90,
    }
  }

  // 9) E-commerce → Emma (only if Shopify mentioned or clear store context)
  if (includesAny(text, ECOMMERCE_KEYWORDS) && (text.includes('shopify') || text.includes('store') || text.includes('tienda'))) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_emma',
      agentId: 'emma-ecommerce',
      agentName: 'Emma (E-commerce)',
      leafTool: 'delegate_to_emma',
      reasons: ['e-commerce/shopify intent detected', 'delegate to Emma for store management'],
      confidence: 0.87,
    }
  }

  // 10) Google Workspace Creation → Peter (only for creation intents)
  if (includesAny(text, WORKSPACE_CREATION_KEYWORDS)) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_peter',
      agentId: 'peter-financial',
      agentName: 'Peter (Google Workspace Creator)',
      leafTool: 'createGoogleDoc',
      reasons: ['google workspace creation intent detected', 'delegate to Peter for document creation'],
      confidence: 0.89,
    }
  }

  return undefined
}
