/**
 * Intelligent Delegation Analyzer v2
 *
 * Improvements:
 * - Fuzzy matching (Levenshtein) for typos and variants
 * - Calibrated scoring weights and confidence thresholds
 * - Expanded bilingual keywords and contextual phrases
 * - Clearer clarification logic when intent is ambiguous
 */

interface DelegationSuggestion {
  agentId: string
  agentName: string
  confidence: number
  reasoning: string[]
  toolName: string
  suggestedTask?: string
  needsClarification?: boolean
  clarificationQuestion?: string
}

interface KeywordPatterns {
  [agentId: string]: {
    primary: string[]
    secondary: string[]
    contextual: string[]
    exclusions?: string[]
  }
}

// Enhanced keyword patterns for each specialist
const AGENT_PATTERNS: KeywordPatterns = {
  'apu-research': {
    primary: [
      // Technical and development (consolidated from toby-technical)
      'code', 'debug', 'api', 'database', 'sql', 'script', 'programming', 'development', 'technical', 'bug', 'fix', 'backend', 'frontend',
      // Stack-specific
      'typescript', 'react', 'next.js', 'nextjs', 'tailwind', 'node', 'npm', 'pnpm', 'docker', 'kubernetes', 'k8s', 'redis', 'websocket', 'sse',
      'supabase', 'postgres', 'rls', 'trigger', 'migration', 'endpoint', 'api route',
      // Research and intelligence (original apu)
      'research', 'investigación', 'investigar', 'analyze', 'analizar', 'investigate', 'trends', 'tendencias', 'data', 'datos', 'market', 'mercado', 
      'news', 'intelligence', 'study', 'estudio', 'benchmark', 'competitor', 'competidores', 'stock', 'stocks'
    ],
    secondary: [
      // Technical
      'performance', 'optimization', 'security', 'deployment', 'server', 'framework', 'library', 'algorithm', 'cache', 'latency', 'timeout',
      // Research
      'competitive', 'competencia', 'industry', 'industria', 'insights', 'report', 'reporte', 'statistics', 'estadísticas', 'forecast', 
      'pronóstico', 'comparison', 'comparación', 'whitepaper', 'paper', 'journal', 'citation', 'source', 'dataset', 'press release', 
      'market size', 'tam', 'sam', 'som'
    ],
    contextual: [
      // Technical
      'how to build', 'how to implement', 'error', 'not working', 'crash', 'slow', 'integrate', 'setup', 'type error', 'compile error', 'failed build',
      // Research
      'what are the trends', 'analyze the market', 'analizar el mercado', 'research shows', 'latest data', 'industry analysis', 
      'análisis de la industria', 'compare competitors', 'analizar competidores', 'find sources', 'encontrar fuentes'
    ],
    exclusions: ['design', 'creative', 'marketing', 'shopify', 'ecommerce', 'tienda', 'ventas', 'calendar', 'meeting', 'google docs', 'google sheets', 'tweet', 'twitter', 'social media', 'post', 'publish']
  },
  'ami-creative': {
    primary: [
      // Gestión administrativa y organización
      'task', 'tarea', 'project', 'proyecto', 'manage', 'gestión', 'gestionar', 'organize', 'organizar', 'schedule', 'scheduling', 'plan', 'planning','calendar', 'calendario', 'meeting', 'reunión', 'appointment', 'cita', 'agenda', 'schedule',
      'notion', 'organize', 'organizar', 'manage', 'gestión', 'gestion', 'coordinate', 'coordinar', 'plan', 'planificar',
      // Investigación práctica y búsquedas del día a día (incluye vuelos y restaurantes)
      'restaurant', 'restaurante', 'cocina', 'cuisine', 'menu', 'menú', 'hours', 'horarios', 'near me', 'cerca', 
      'hotel', 'booking', 'reserva', 'reservación', 'reservacion', 'flight', 'flights', 'vuelo', 'vuelos', 'travel', 'viaje','find', 'encontrar', 'search', 'buscar', 'recommend', 'recomendar', 'where', 'dónde', 'donde',
      // Servicios y lifestyle 
      'movie', 'cine', 'event', 'evento', 'activity', 'actividad', 'place', 'lugar', 'comida',
      // Investigación de contactos y empresas / LinkedIn / Email
      'contact', 'contacto', 'client', 'cliente', 'lead', 'prospect', 'prospecto', 'person', 'persona', 'company', 'empresa',
      'linkedin', 'perfil', 'profile', 'research', 'investigar', 'information', 'información', 'informacion', 
      'email', 'correo', 'inbox', 'bandeja', 'responder', 'reply', 'titulo', 'title', 'position'
  ],
    secondary: [
      'productivity', 'productividad', 'workflow', 'template', 'plantilla', 'deadline', 'agenda',
      'tripadvisor', 'yelp', 'opentable', 'booking.com', 'kayak', 'skyscanner', 'google flights', 'google.com/travel/flights', 
      'google maps', 'maps', 'directions', 'direcciones', 'address','price', 'precio', 'review', 'opinión', 'opinion', 'rating', 'calificación', 'calificacion', 'compare', 'comparar',
      'business', 'negocio', 'insight', 'networking', 'recommendations', 'recomendaciones', 'mejores', 'top rated', 'cheap', 'barato',
      'latest news', 'breaking', 'tendencias', 'noticias', 'news', 'hoy'
    ],
    contextual: [
      'help me organize', 'ayúdame a organizar', 'ayudame a organizar', 'find a restaurant', 'buscar un restaurante', 'buscar restaurantes', 
      'recommend restaurants', 'recomienda restaurantes', 'book a hotel', 'reservar hotel', 'book a table', 'reservar mesa', 
      'make a reservation', 'hacer una reserva', 'plan a trip', 'planificar viaje', 'find flights', 'buscar vuelos', 
      'cheap flights', 'vuelos baratos', 'google flights', 'skyscanner', 'where can i', 'dónde puedo', 'donde puedo', 
      'recommend me', 'recomiéndame', 'recomendame', 'best places', 'mejores lugares', 'nearby', 'cerca de mí', 'cerca de mi',
      'research company', 'investigar empresa', 'find contact', 'encontrar contacto', 'find linkedin', 'buscar linkedin', 
      'lookup linkedin', 'perfil linkedin', 'read my email', 'lee mi correo', 'check inbox', 'revisa bandeja', 
      'draft reply', 'borrador de respuesta', 'reply email', 'responde correo', 'manage my calendar', 'gestionar mi calendario', 
      'organize my notion', 'search online', 'news today', 'noticias de hoy', 'what happened', 'qué pasó'
    ],
    exclusions: ['technical', 'code', 'database', 'programming', 'api', 'sql', 'shopify', 'ecommerce', 'tienda', 'tweet', 'twitter', 'social media', 'post', 'hashtag', 'social']
  },
  'peter-google': {
    primary: ['google', 'docs', 'sheets', 'drive', 'workspace', 'document', 'spreadsheet', 'meet', 'slides', 'forms', 'apps script', 'appsscript'],
    secondary: ['template', 'productivity', 'automation', 'workflow', 'organize', 'collaborate', 'permissions', 'share', 'invite', 'compartir', 'permisos'],
    contextual: ['create a doc', 'share file', 'track progress', 'organize data', 'create a sheet', 'build a form'],
    exclusions: ['shopify', 'ecommerce', 'email', 'gmail', 'correo', 'inbox', 'bandeja', 'calendar', 'calendario', 'meeting', 'reunión', 'reunion', 'appointment', 'cita', 'invite']
  },
  'emma-ecommerce': {
    primary: [
      'shopify', 'store', 'tienda', 'products', 'productos', 'sales', 'ventas', 'inventory', 'inventario',
      'ecommerce', 'e-commerce', 'catalog', 'catálogo', 'catalogo', 'orders', 'pedidos', 'bestselling', 'más vendidos', 'mas vendidos',
      'performance', 'rendimiento', 'profit', 'ganancia', 'revenue', 'ingresos', 'bestsellers', 'collections', 'discounts', 'abandoned checkout',
      'utm', 'traffic', 'metafields', 'admin',
      // frequent Spanish variants without accents
      'analiticas', 'metrica', 'metricas'
    ],
    secondary: [
      'analytics', 'analíticas', 'analiticas', 'conversion', 'conversión', 'conversion rate', 'tasa de conversión', 'cr',
      'customers', 'clientes', 'payment', 'pago', 'shipping', 'envío', 'envio', 'dashboard', 'reports', 'reportes', 'metrics', 'métricas', 'metricas', 'trends', 'tendencias',
      // ecom KPIs acronyms
      'aov', 'ltv', 'roas', 'cac', 'cpa', 'rpm', 'rpv', 'cohort', 'churn', 'rfm', 'repeat purchase', 'customer segmentation',
      'average order value', 'lifetime value', 'return on ad spend'
    ],
    contextual: [
      'my store', 'mi tienda', 'bestselling products', 'productos más vendidos', 'productos mas vendidos', 'sales data', 'datos de ventas',
      'product performance', 'rendimiento de productos', 'customer behavior', 'comportamiento del cliente',
      'store analytics', 'analíticas de tienda', 'analiticas de tienda', 'flor amazona', 'top selling', 'best products', 'mejores productos',
      'increase conversion', 'mejorar conversión', 'mejorar conversion', 'analyze collection performance', 'review abandoned checkouts'
    ],
    exclusions: []
  },
  // Sub-agents
  'astra-email': {
    primary: ['email', 'gmail', 'correo', 'send', 'enviar', 'draft', 'borrador', 'reply', 'responder', 'compose', 'message', 'mensaje'],
    secondary: ['inbox', 'bandeja', 'communication', 'comunicación', 'correspondence', 'correspondencia', 'mail', 'letter', 'carta'],
    contextual: ['send email', 'enviar correo', 'check inbox', 'revisar bandeja', 'draft reply', 'write message', 'compose email'],
    exclusions: ['calendar', 'meeting', 'schedule']
  },
  'notion-agent': {
    primary: ['notion', 'workspace', 'page', 'database', 'notes', 'notas', 'organize', 'organizar', 'knowledge', 'conocimiento'],
    secondary: ['template', 'plantilla', 'wiki', 'documentation', 'documentación', 'structure', 'estructura'],
    contextual: ['create notion page', 'organize workspace', 'notion database', 'knowledge base', 'take notes'],
    exclusions: ['email', 'calendar', 'google']
  },
  'apu-markets': {
    primary: ['stock', 'stocks', 'market', 'markets', 'finance', 'financial', 'investment', 'trading', 'precio', 'price'],
    secondary: ['portfolio', 'ticker', 'analysis', 'forecast', 'bull', 'bear', 'dividend', 'earnings', 'quarterly'],
    contextual: ['stock price', 'market analysis', 'financial data', 'investment research', 'market trends'],
    exclusions: ['shopify', 'ecommerce', 'calendar']
  },
  // Social Media & Twitter Specialists
  'nora-community': {
    primary: ['twitter', 'tweet', 'tweets', 'x', 'social media', 'community', 'post', 'publish', 'publicar', 'redes sociales', 'hashtag', 'hashtags'],
    secondary: ['engagement', 'community', 'brand', 'audience', 'followers', 'seguidores', 'viral', 'trending', 'tendencias', 'social', 'content'],
    contextual: ['create tweet', 'post to twitter', 'tweet about', 'social media strategy', 'community management', 'twitter campaign', 'social content', 'make it engaging', 'include hashtags'],
    exclusions: ['email', 'calendar', 'shopify', 'google docs', 'research only', 'technical analysis']
  },
  'luna-content-creator': {
    primary: ['content', 'copy', 'copywriting', 'writing', 'creative', 'creativo', 'campaign', 'campaña', 'brand', 'marca'],
    secondary: ['messaging', 'tone', 'voice', 'style', 'estilo', 'narrative', 'storytelling', 'engagement', 'caption'],
    contextual: ['write content', 'create copy', 'social media copy', 'campaign content', 'brand messaging', 'creative writing'],
    exclusions: ['technical', 'code', 'database', 'shopify']
  },
  'zara-analytics-specialist': {
    primary: ['analytics', 'analíticas', 'analiticas', 'metrics', 'métricas', 'metricas', 'performance', 'rendimiento', 'data', 'datos'],
    secondary: ['insights', 'trends', 'engagement', 'reach', 'impressions', 'clicks', 'conversion', 'roi', 'kpi'],
    contextual: ['analyze performance', 'social media analytics', 'engagement metrics', 'performance report', 'twitter analytics'],
    exclusions: ['creation', 'writing', 'posting']
  },
  'viktor-publishing-specialist': {
    primary: ['schedule', 'scheduling', 'publish', 'publishing', 'timing', 'automation', 'workflow', 'calendar'],
    secondary: ['optimal', 'timing', 'frequency', 'queue', 'batch', 'strategy', 'planning', 'coordination'],
    contextual: ['schedule posts', 'publishing strategy', 'optimal timing', 'social media scheduling', 'content calendar'],
    exclusions: ['creation', 'writing', 'analytics']
  }
}

// Agent display names and tool mappings
const AGENT_METADATA = {
  'apu-research': { name: 'Apu', toolName: 'delegate_to_apu' },
  'ami-creative': { name: 'Ami', toolName: 'delegate_to_ami' },
  'peter-google': { name: 'Peter', toolName: 'delegate_to_peter' },
  'emma-ecommerce': { name: 'Emma', toolName: 'delegate_to_emma' },
  // Sub-agents
  'astra-email': { name: 'Astra', toolName: 'delegate_to_astra' },
  'notion-agent': { name: 'Notion Agent', toolName: 'delegate_to_notion_agent' },
  'apu-markets': { name: 'Apu Markets', toolName: 'delegate_to_apu_markets' },
  // Social Media & Twitter Specialists
  'nora-community': { name: 'Nora', toolName: 'delegate_to_nora' },
  'luna-content-creator': { name: 'Luna', toolName: 'delegate_to_luna' },
  'zara-analytics-specialist': { name: 'Zara', toolName: 'delegate_to_zara' },
  'viktor-publishing-specialist': { name: 'Viktor', toolName: 'delegate_to_viktor' }
}

// Scoring configuration
const WEIGHTS = {
  primary: 3,
  secondary: 2,
  contextual: 4,
  exclusion: -3,
}

const CONFIDENCE = {
  high: 0.8, // above this: auto-delegate
  medium: 0.6, // between medium & high: delegate but consider clarifying
}

// Basic Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const an = a.length
  const bn = b.length
  if (an === 0) return bn
  if (bn === 0) return an
  const matrix: number[][] = Array.from({ length: bn + 1 }, () => Array(an + 1).fill(0))
  for (let i = 0; i <= an; i++) matrix[0][i] = i
  for (let j = 0; j <= bn; j++) matrix[j][0] = j
  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1, // deletion
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i - 1] + cost // substitution
      )
    }
  }
  return matrix[bn][an]
}

function fuzzyIncludes(haystack: string, needle: string, tolerance = 0.85): boolean {
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  if (h.includes(n)) return true
  // allow small typos proportionally to length
  const maxLen = Math.max(n.length, 3)
  const dist = levenshtein(h.slice(0, Math.min(h.length, n.length + 4)), n)
  const similarity = 1 - dist / maxLen
  return similarity >= tolerance
}

/**
 * Analyze user text and suggest the best specialist agent
 */
export function analyzeDelegationIntent(userText: string, context?: string): DelegationSuggestion | null {
  const fullText = `${userText} ${context || ''}`.toLowerCase()
  const words = fullText.split(/\s+/).filter(w => w.length > 2)
  
  const scores: { [agentId: string]: { score: number, reasons: string[] } } = {}
  
  // Initialize scores
  Object.keys(AGENT_PATTERNS).forEach(agentId => {
    scores[agentId] = { score: 0, reasons: [] }
  })
  
  // Score each agent based on keyword matches
  Object.entries(AGENT_PATTERNS).forEach(([agentId, patterns]) => {
    let agentScore = 0
    const reasons: string[] = []
    
    // Primary keywords (high weight)
    patterns.primary.forEach(keyword => {
      if (fuzzyIncludes(fullText, keyword, 0.88)) {
        agentScore += WEIGHTS.primary
        reasons.push(`primary: ${keyword}`)
      }
    })
    
    // Secondary keywords (medium weight)
    patterns.secondary.forEach(keyword => {
      if (fuzzyIncludes(fullText, keyword, 0.9)) {
        agentScore += WEIGHTS.secondary
        reasons.push(`secondary: ${keyword}`)
      }
    })
    
    // Contextual phrases (high weight for specific phrases)
    patterns.contextual.forEach(phrase => {
      if (fuzzyIncludes(fullText, phrase, 0.85)) {
        agentScore += WEIGHTS.contextual
        reasons.push(`contextual: "${phrase}"`)
      }
    })
    
    // Apply exclusions (negative weight)
    if (patterns.exclusions) {
      patterns.exclusions.forEach(exclusion => {
        if (fuzzyIncludes(fullText, exclusion, 0.9)) {
          agentScore += WEIGHTS.exclusion
          reasons.push(`excluded: ${exclusion}`)
        }
      })
    }
    
    scores[agentId] = { score: Math.max(0, agentScore), reasons }
  })
  
  // Find the best scoring agent
  const sortedAgents = Object.entries(scores)
    .filter(([_, { score }]) => score > 0)
    .sort(([_, a], [__, b]) => b.score - a.score)
  
  if (sortedAgents.length === 0) {
    return null // No clear match
  }
  
  const [bestAgentId, { score, reasons }] = sortedAgents[0]
  const secondBest = sortedAgents[1]
  
  // Calculate confidence based on score difference (normalized)
  const confidence = secondBest
    ? Math.min(0.95, score / Math.max(1, score + secondBest[1].score))
    : Math.min(0.95, Math.max(0.5, score / 8))
  
  const metadata = AGENT_METADATA[bestAgentId as keyof typeof AGENT_METADATA]
  
  // Determine if clarification is needed
  const needsClarification = confidence < CONFIDENCE.medium || (secondBest && (score - secondBest[1].score) < 2)
  
  return {
    agentId: bestAgentId,
    agentName: metadata.name,
    confidence,
    reasoning: reasons,
    toolName: metadata.toolName,
    suggestedTask: extractTaskFromText(userText),
    needsClarification,
    clarificationQuestion: needsClarification ? generateClarificationQuestion(bestAgentId, secondBest?.[0]) : undefined
  }
}

/**
 * Extract a concise task description from user text
 */
function extractTaskFromText(userText: string): string {
  // Remove common prefixes and make it more action-oriented
  let task = userText.trim()
  
  // Remove question words and make it declarative
  task = task.replace(/^(can you|could you|please|help me|i need|i want to)\s*/i, '')
  task = task.replace(/\?+$/, '')
  
  // Capitalize first letter
  task = task.charAt(0).toUpperCase() + task.slice(1)
  
  // Ensure it doesn't end with punctuation
  task = task.replace(/[.!?]+$/, '')
  
  return task
}

/**
 * Generate a clarification question when intent is ambiguous
 */
function generateClarificationQuestion(primaryAgent: string, secondaryAgent?: string): string {
  const primary = AGENT_METADATA[primaryAgent as keyof typeof AGENT_METADATA]
  
  if (!secondaryAgent) {
    return `I think ${primary.name} might be able to help with this. Should I delegate this task to them?`
  }
  
  const secondary = AGENT_METADATA[secondaryAgent as keyof typeof AGENT_METADATA]
  
  const clarifications = {
    'apu-research_ami-creative': "Are you looking for technical/research implementation or practical assistance like scheduling and coordination?",
    'peter-google_emma-ecommerce': "Is this for general productivity (Docs/Sheets/Drive) or specifically for your store management and analytics?",
    'ami-creative_apu-research': "Do you need practical help (finding places, contacts, scheduling) or deeper research and analysis?",
    'apu-research_emma-ecommerce': "Are you looking for technical/research analysis or store-specific analytics and business questions?",
    'ami-creative_emma-ecommerce': "Is this about general lifestyle/organization or about your Shopify store?",
    'peter-google_ami-creative': "Do you want Workspace help (Docs/Sheets/Calendar) or broader assistance like reservations and local recommendations?",
    'astra-email_ami-creative': "Is this specifically about email management or broader administrative tasks?",
    'notion-agent_ami-creative': "Is this about Notion workspace organization or general administrative coordination?",
    'apu-markets_apu-research': "Are you looking for financial market analysis or broader research and intelligence?",
  }
  
  const key = `${primaryAgent}_${secondaryAgent}` as keyof typeof clarifications
  const reverseKey = `${secondaryAgent}_${primaryAgent}` as keyof typeof clarifications
  
  return clarifications[key] || clarifications[reverseKey] || 
    `I'm not sure if this is better suited for ${primary.name} or ${secondary.name}. Could you clarify what type of help you're looking for?`
}

/**
 * Get suggestions for improving unclear requests
 */
export function getDelegationSuggestions(userText: string): string[] {
  const suggestions: string[] = []
  
  if (userText.length < 10) {
    suggestions.push("Try being more specific about what you want to accomplish")
  }
  
  if (!userText.includes('my') && !userText.includes('i ')) {
    suggestions.push("Include context about your specific situation or project")
  }
  
  const hasActionWords = /\b(create|build|analyze|design|fix|optimize|help|write|generate|research)\b/i.test(userText)
  if (!hasActionWords) {
    suggestions.push("Start with an action word like 'create', 'analyze', or 'fix'")
  }
  
  return suggestions
}
