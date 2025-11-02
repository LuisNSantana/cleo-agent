/**
 * Task Complexity Scorer for Smart Delegation
 * Analyzes user queries to determine if delegation is necessary
 */

export interface ComplexityScore {
  score: number; // 0-100
  factors: string[];
  recommendation: 'direct' | 'delegate' | 'clarify';
  reasoning: string;
}

export interface ComplexityFactors {
  // Simple indicators (lower score)
  isGreeting: boolean;
  isSimpleQuestion: boolean;
  isDefinitionRequest: boolean;
  isSingleConcept: boolean;
  
  // Complex indicators (higher score)
  hasMultipleSteps: boolean;
  requiresSpecializedKnowledge: boolean;
  needsExternalData: boolean;
  involvesMultipleDomains: boolean;
  requiresCreativeWork: boolean;
  needsFileManipulation: boolean;
  hasUnclearScope: boolean;
}

/**
 * Analyze task complexity and determine delegation strategy
 */
export function analyzeTaskComplexity(userMessage: string): ComplexityScore {
  const message = userMessage.toLowerCase().trim();
  const factors: ComplexityFactors = analyzeFactors(message);
  
  let score = 0;
  const scoreFactors: string[] = [];
  
  // Simple task indicators (reduce score)
  if (factors.isGreeting) {
    score -= 20;
    scoreFactors.push('greeting');
  }
  
  if (factors.isSimpleQuestion) {
    score -= 15;
    scoreFactors.push('simple question');
  }
  
  if (factors.isDefinitionRequest) {
    score -= 10;
    scoreFactors.push('definition request');
  }
  
  if (factors.isSingleConcept) {
    score -= 10;
    scoreFactors.push('single concept');
  }
  
  // Complex task indicators (increase score)
  if (factors.hasMultipleSteps) {
    score += 25;
    scoreFactors.push('multiple steps');
  }
  
  if (factors.requiresSpecializedKnowledge) {
    score += 30;
    scoreFactors.push('specialized knowledge');
  }
  
  if (factors.needsExternalData) {
    score += 35;
    scoreFactors.push('external data required');
  }
  
  if (factors.involvesMultipleDomains) {
    score += 20;
    scoreFactors.push('multiple domains');
  }
  
  if (factors.requiresCreativeWork) {
    score += 25;
    scoreFactors.push('creative work');
  }
  
  if (factors.needsFileManipulation) {
    score += 30;
    scoreFactors.push('file manipulation');
  }
  
  if (factors.hasUnclearScope) {
    score += 15;
    scoreFactors.push('unclear scope');
  }

  // Special high-value combinations
  const calendarPattern = /(reunión|meeting|calendar|evento|appointment|schedule|cita)/;
  const emailPattern = /(email|correo|enviar|send|confirmation|confirmación)/;
  
  if (calendarPattern.test(message) && emailPattern.test(message)) {
    score += 25; // Extra bonus for calendar + email combo
    scoreFactors.push('calendar + email coordination');
  }
  
  // Normalize score to 0-100 range
  score = Math.max(0, Math.min(100, score + 40)); // Base score of 40
  
  // Determine recommendation
  let recommendation: ComplexityScore['recommendation'];
  let reasoning: string;
  
  if (score < 30) {
    recommendation = 'direct';
    reasoning = 'Simple query that can be answered directly without delegation';
  } else if (score > 70) {
    recommendation = 'delegate';
    reasoning = 'Complex task requiring specialized expertise or tools';
  } else {
    recommendation = 'clarify';
    reasoning = 'Moderate complexity - may need clarification before deciding';
  }
  
  return {
    score,
    factors: scoreFactors,
    recommendation,
    reasoning
  };
}

/**
 * Analyze individual factors from user message
 */
function analyzeFactors(message: string): ComplexityFactors {
  // Simple patterns
  const greetingPattern = /^(hi|hello|hey|good\s+(morning|afternoon|evening)|how are you)/;
  const simpleQuestionPattern = /^(what is|what are|who is|when is|where is|how do i|can you).{1,50}\?$/;
  const definitionPattern = /(what\s+(is|are|means?)|define|explain\s+(what|how)\s+)/;
  
  // Complex patterns
  const multiStepPattern = /(first.*then|step\s+\d|and then|after that|next.*do|also.*need)/;
  const toolPattern = /(create|build|make|generate|design|analyze|calculate|optimize|implement)/;
  const dataPattern = /(fetch|search|find|get.*data|analyze.*from|look up|research)/;
  const filePattern = /(upload|download|file|document|save|export|import|pdf|csv|excel)/;
  const unclearPattern = /(maybe|perhaps|might|could|not sure|help me with|figure out|anything)/;
  
  // Domain-specific patterns
  const technicalPattern = /(code|programming|programación|desarrollo|developer|dev|api|rest|fastapi|django|flask|express|node|typescript|javascript|database|db|sql|postgres|server|backend|debug|git|deploy|deployment|ci|cd)/;
  const notionPattern = /(notion|workspace|page|database|organize|notes)/;
  const googlePattern = /(google\s+(docs|sheets|drive|calendar)|document|spreadsheet)/;
  const calendarPattern = /(reunión|meeting|calendar|evento|appointment|schedule|cita)/;
  const emailPattern = /(email|correo|enviar|send|confirmation|confirmación)/;
  const ecommercePattern = /(shopify|store|product|price|inventory|sales|ecommerce)/;
  const financialPattern = /(stock|market|finance|investment|price|analysis|financial)/;
  const creativePattern = /(design|creative|brand|logo|color|visual|ui|ux|layout)/;
  
  // Calendar + Email combination pattern (should score high)
  const calendarEmailPattern = calendarPattern.test(message) && emailPattern.test(message);
  
  return {
    // Simple indicators
    isGreeting: greetingPattern.test(message),
    isSimpleQuestion: simpleQuestionPattern.test(message),
    isDefinitionRequest: definitionPattern.test(message),
    isSingleConcept: message.split(' ').length <= 8 && !multiStepPattern.test(message),
    
    // Complex indicators
    hasMultipleSteps: multiStepPattern.test(message),
    requiresSpecializedKnowledge: technicalPattern.test(message) || 
                                 notionPattern.test(message) || 
                                 googlePattern.test(message) || 
                                 ecommercePattern.test(message) ||
                                 financialPattern.test(message),
    needsExternalData: dataPattern.test(message),
    involvesMultipleDomains: (
      [technicalPattern, notionPattern, googlePattern, ecommercePattern, financialPattern, creativePattern]
        .filter(pattern => pattern.test(message)).length > 1
    ) || calendarEmailPattern, // Calendar + email is always multiple domains
    requiresCreativeWork: creativePattern.test(message) || toolPattern.test(message),
    needsFileManipulation: filePattern.test(message),
    hasUnclearScope: unclearPattern.test(message) || message.length > 200
  };
}

/**
 * Get domain-specific agent suggestion based on message content
 * Now includes dynamic agent lookup
 */
export async function suggestAgent(message: string): Promise<string | null> {
  const lowMessage = message.toLowerCase();
  
  // First try static patterns for performance (most common cases)
  const staticSuggestion = suggestAgentStatic(lowMessage)
  if (staticSuggestion) {
    return staticSuggestion
  }

  // If no static match, try dynamic lookup for custom agents
  try {
    const { getAllAgents } = await import('./unified-config')
    const allAgents = await getAllAgents()
    
    // Build name→id mapping
    const nameToIdMap = new Map<string, string>()
    for (const agent of allAgents) {
      if (agent.name) {
        nameToIdMap.set(agent.name.toLowerCase(), agent.id)
      }
    }
    
    // Look for agent names mentioned in the message
    // IMPORTANT: Exclude @mentions (e.g., @cleo_test) which are social media handles, not agent names
    const agentNamePattern = (agentName: string) => {
      // Match agent name but NOT when preceded by @ (social media handle)
      return new RegExp(`(?<!@)\\b${agentName.toLowerCase()}\\b`, 'i')
    }
    
    for (const [agentName, agentId] of nameToIdMap.entries()) {
      if (agentNamePattern(agentName).test(lowMessage)) {
        console.log(`🎯 [DYNAMIC DELEGATION] Found agent mention: ${agentName} → ${agentId}`)
        return agentId // ✅ Return ID, not name
      }
    }
  } catch (error) {
    console.error('Error in dynamic agent suggestion:', error)
  }
  
  return null;
}

/**
 * Static agent suggestions for performance (synchronous)
 * Returns AGENT ID, not display name
 */
function suggestAgentStatic(lowMessage: string): string | null {
  // Telegram publishing patterns -> Jenn (PRIORITY: Check before other social media)
  // Matches: "publica en @channel", "telegram", "canal de telegram"
  if (/(telegram|publica.*@[\w_]+|broadcast.*@[\w_]+|canal.*telegram|telegram.*channel)/.test(lowMessage)) {
    return 'jenn-community'; // ✅ Return ID, not 'jenn'
  }
  
  // Social media / Community patterns -> Jenn
  // Twitter/X, Instagram, Facebook, general social media
  if (/(twitter|tweet|instagram|facebook|social\s+media|community|engagement|post\s+on|publica|publish)/.test(lowMessage)) {
    return 'jenn-community'; // ✅ Return ID
  }
  
  // Technical/engineering patterns -> Toby (fast path)
  if (/(fastapi|endpoint|api|programa|programación|programming|typescript|javascript|node|python|backend|database|sql|deploy|docker|git|bug|error|stacktrace|exception)/.test(lowMessage)) {
    return 'toby-technical'; // ✅ Return ID
  }
  
  // Research and intelligence patterns (consolidated)
  if (/(research|analyze|investigate|news|market|stock|search|academic|scholar|serpapi)/.test(lowMessage)) {
    return 'apu-support'; // ✅ Return ID
  }
  
  // Notion patterns: default to Ami who orchestrates Notion tools
  if (/(notion|workspace|page|database|organize|notes|knowledge\s+base)/.test(lowMessage)) {
    return 'ami-creative'; // ✅ Return ID
  }
  
  // Google Workspace patterns
  if (/(google\s+(docs|sheets|drive|calendar)|document|spreadsheet|productivity)/.test(lowMessage)) {
    return 'peter-financial'; // ✅ Return ID
  }
  
  // E-commerce patterns
  if (/(shopify|store|product|price|inventory|sales|ecommerce|online\s+store)/.test(lowMessage)) {
    return 'emma-ecommerce'; // ✅ Return ID
  }
  
  // Financial/Research patterns - consolidated in APU
  if (/(stock|market|finance|investment|analysis|financial|competitor|news|search)/.test(lowMessage)) {
    return 'apu-support'; // ✅ Return ID
  }
  
  // Email patterns (via astra sub-agent)
  if (/(email|gmail|send\s+message|draft|reply|communication|correspondence)/.test(lowMessage)) {
    return 'astra-email'; // ✅ Return ID
  }
  
  // Administrative patterns
  if (/(calendar|schedule|meeting|appointment|admin|coordinate|organize)/.test(lowMessage)) {
    return 'ami-creative'; // ✅ Return ID
  }
  
  // Web automation patterns
  if (/(browser|automation|scrape|form|screenshot|web\s+interaction)/.test(lowMessage)) {
    return 'wex-intelligence'; // ✅ Return ID
  }
  
  return null;
}

/**
 * Enhanced delegation decision with complexity analysis
 * ✅ EARLY EXIT ROUTER PATTERN (LangGraph Best Practice)
 * Skip modelo AI analysis if there's an explicit agent mention
 * Reduces latency by ~70% and avoids unnecessary API calls
 */
export async function makeDelegationDecision(userMessage: string): Promise<{
  shouldDelegate: boolean;
  targetAgent?: string;
  reasoning: string;
  complexity: ComplexityScore;
  earlyExit?: boolean;  // ✅ Flag to track fast-path routing
}> {
  const lowMessage = userMessage.toLowerCase();
  
  // ✅ PHASE 1: EARLY EXIT FOR EXPLICIT MENTIONS
  // Check for direct agent mentions with high confidence patterns
  // Pattern: "@agent" or "agent," at start or "pregúntale a agent"
  const explicitMentions: Record<string, string[]> = {
    'jenn-community': ['@jenn', 'jenn,', 'pregúntale a jenn', 'consulta con jenn'],
    'ami-creative': ['@ami', 'ami,', 'pregúntale a ami', 'consulta con ami'],
    'toby-technical': ['@toby', 'toby,', 'pregúntale a toby', 'consulta con toby'],
    'peter-financial': ['@peter', 'peter,', 'pregúntale a peter', 'consulta con peter'],
    'apu-support': ['@apu', 'apu,', 'pregúntale a apu', 'consulta con apu'],
    'wex-intelligence': ['@wex', 'wex,', 'pregúntale a wex', 'consulta con wex'],
    'astra-email': ['@astra', 'astra,', 'pregúntale a astra', 'consulta con astra'],
    'nora-medical': ['@nora', 'nora,', 'pregúntale a nora', 'consulta con nora'],
    'iris-insights': ['@iris', 'iris,', 'pregúntale a iris', 'consulta con iris'],
  };
  
  for (const [agentId, patterns] of Object.entries(explicitMentions)) {
    for (const pattern of patterns) {
      if (lowMessage.includes(pattern)) {
        console.log('⚡ [EARLY_EXIT] Explicit mention detected:', { agentId, pattern, score: 0.99 });
        return {
          shouldDelegate: true,
          targetAgent: agentId,
          reasoning: `Early exit: Explicit mention detected ("${pattern}"). Score: 0.99 (skip AI analysis)`,
          complexity: {
            score: 99,  // High score to indicate strong confidence
            reasoning: 'Direct agent mention',
            recommendation: 'delegate',
            factors: ['explicit_mention']
          },
          earlyExit: true  // ✅ Flag for metrics/debugging
        };
      }
    }
  }
  
  // ✅ PHASE 2: STANDARD COMPLEXITY ANALYSIS (if no early exit)
  const complexity = analyzeTaskComplexity(userMessage);
  const suggestedAgent = await suggestAgent(userMessage);
  
  if (complexity.recommendation === 'direct') {
    return {
      shouldDelegate: false,
      reasoning: `Simple query (score: ${complexity.score}): ${complexity.reasoning}`,
      complexity,
      earlyExit: false
    };
  }
  
  if (complexity.recommendation === 'delegate' && suggestedAgent) {
    return {
      shouldDelegate: true,
      targetAgent: suggestedAgent,
      reasoning: `Complex query (score: ${complexity.score}) requiring ${suggestedAgent} expertise: ${complexity.reasoning}`,
      complexity,
      earlyExit: false
    };
  }
  
  // If analysis suggests clarification but we have a clear specialist suggestion, prefer delegation
  if (complexity.recommendation === 'clarify' && suggestedAgent) {
    return {
      shouldDelegate: true,
      targetAgent: suggestedAgent,
      reasoning: `Moderate complexity (score: ${complexity.score}). Clear specialist detected: ${suggestedAgent}. Delegating for better accuracy.`,
      complexity,
      earlyExit: false
    };
  }

  // For remaining 'clarify' or no clear agent match
  return {
    shouldDelegate: false,
    reasoning: `Moderate complexity (score: ${complexity.score}): ${complexity.reasoning}. Will handle directly with potential follow-up.`,
    complexity,
    earlyExit: false
  };
}

/**
 * Refresh agent patterns based on current available agents
 * Call this after adding/removing agents to update delegation suggestions
 */
export async function refreshComplexityScorerPatterns(): Promise<void> {
  try {
    // Import registry dynamically to avoid circular dependencies
    const { agentRegistry } = await import('./registry')
    
    // Get current user ID (you might need to adjust this based on your auth system)
    const userId = 'current-user' // TODO: Get from auth context
    
    // Sync agents from database
    await agentRegistry.syncDatabaseAgents(userId)
    
    console.log('✅ Complexity scorer patterns refreshed')
  } catch (error) {
    console.error('❌ Failed to refresh complexity scorer patterns:', error)
  }
}
