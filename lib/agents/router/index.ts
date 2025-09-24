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

export type RouterRecommendation = {
  name: string
  toolName?: string
  reasons: string[]
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

export function detectEarlyIntent(userText: string): RouterRecommendation | undefined {
  const text = (userText || '').toLowerCase().trim()
  if (!text) return undefined

  // 1) Email triage vs compose (PRIORITY over time/weather to avoid 'today' collisions)
  if (includesAny(text, EMAIL_TRIAGE_KEYWORDS)) {
    // Triage stays local to Ami via Gmail tools
    return {
      name: 'Ami (Email Triage)',
      toolName: 'listGmailMessages',
      reasons: ['email triage intent (read/summary/search)', 'prefer listGmailMessages/getGmailMessage']
    }
  }

  if (includesAny(text, EMAIL_COMPOSE_KEYWORDS)) {
    // Compose/drafting goes to Astra
    return {
      name: 'Astra (Email Compose)',
      toolName: 'delegate_to_astra',
      reasons: ['email compose/draft/reply intent', 'delegate to Astra for drafting/sending']
    }
  }

  // If any general email/gmail mention exists (without explicit triage/compose), prefer Ami triage
  if (includesAny(text, EMAIL_GENERAL_KEYWORDS)) {
    return {
      name: 'Ami (Email Triage)',
      toolName: 'listGmailMessages',
      reasons: ['general email/gmail intent detected', 'route to Ami for safe triage by default']
    }
  }

  // 2) Utility: Time / Date
  if (includesAny(text, TIME_KEYWORDS)) {
    return {
      name: 'Direct Utility Tooling',
      toolName: 'time',
      reasons: ['time/date intent detected (Capa 0)', 'use getCurrentDateTime/time tool directly']
    }
  }

  // 3) Utility: Weather
  if (includesAny(text, WEATHER_KEYWORDS)) {
    return {
      name: 'Direct Utility Tooling',
      toolName: 'weather',
      reasons: ['weather intent detected (Capa 0)', 'use weather/weatherInfo tool directly']
    }
  }

  // 4) Calendar → Ami (manager/secretary)
  if (includesAny(text, CALENDAR_KEYWORDS)) {
    return {
      name: 'Ami (Calendar Management)',
      toolName: 'createCalendarEvent',
      reasons: ['calendar intent detected (Capa 0)', 'Ami handles scheduling and calendar management']
    }
  }

  // 5) Google Workspace (Docs/Sheets/Drive/Slides) → Peter
  if (includesAny(text, GOOGLE_WORKSPACE_KEYWORDS)) {
    return {
      name: 'Peter (Google Workspace)',
      toolName: 'delegate_to_peter',
      reasons: ['google workspace intent detected (Docs/Sheets/Drive/Slides)', 'delegate to Peter for creation/organization']
    }
  }

  // 6) Notion → delegate to Notion Agent
  if (includesAny(text, NOTION_KEYWORDS)) {
    return {
      name: 'Notion Agent (Workspace)',
      toolName: 'delegate_to_notion_agent',
      reasons: ['notion/workspace intent detected', 'delegate to Notion Agent for workspace tasks']
    }
  }

  return undefined
}
