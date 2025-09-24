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

// Google Workspace intents (Docs/Sheets/Drive/Meet/Slides)
const GOOGLE_WORKSPACE_KEYWORDS = [
  // English
  'google', 'docs', 'sheets', 'slides', 'drive', 'meet', 'workspace', 'spreadsheet', 'document', 'presentation', 'form', 'apps script', 'appsscript',
  // Spanish
  'documento', 'hoja de cálculo', 'hoja de calculo', 'presentación', 'presentacion', 'formulario', 'compartir', 'invitar'
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
  if (includesAny(text, EMAIL_GENERAL_KEYWORDS)) {
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

  // 5) Google Workspace (Docs/Sheets/Drive/Slides) → Peter
  if (includesAny(text, GOOGLE_WORKSPACE_KEYWORDS)) {
    return {
      source: 'early',
      action: 'delegate',
      toolName: 'delegate_to_peter',
      agentId: 'peter-google',
      agentName: 'Peter (Google Workspace)',
      leafTool: 'delegate_to_peter',
      reasons: ['google workspace intent detected (Docs/Sheets/Drive/Slides)', 'delegate to Peter for document creation/organization'],
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

  return undefined
}
