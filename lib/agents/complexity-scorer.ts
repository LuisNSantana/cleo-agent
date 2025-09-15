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
  const technicalPattern = /(code|programming|api|database|server|debug|git|deploy|sql)/;
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
 */
export function suggestAgent(message: string): string | null {
  const lowMessage = message.toLowerCase();
  
  // Research and intelligence patterns (consolidated)
  if (/(research|analyze|investigate|news|market|stock|search|academic|scholar|serpapi)/.test(lowMessage)) {
    return 'apu';
  }
  
  // Notion patterns: default to Ami who orchestrates Notion tools
  if (/(notion|workspace|page|database|organize|notes|knowledge\s+base)/.test(lowMessage)) {
    return 'ami';
  }
  
  // Google Workspace patterns
  if (/(google\s+(docs|sheets|drive|calendar)|document|spreadsheet|productivity)/.test(lowMessage)) {
    return 'peter';
  }
  
  // E-commerce patterns
  if (/(shopify|store|product|price|inventory|sales|ecommerce|online\s+store)/.test(lowMessage)) {
    return 'emma';
  }
  
  // Financial/Research patterns - consolidated in APU
  if (/(stock|market|finance|investment|analysis|financial|competitor|news|search)/.test(lowMessage)) {
    return 'apu';
  }
  
  // Email patterns (via astra sub-agent)
  if (/(email|gmail|send\s+message|draft|reply|communication|correspondence)/.test(lowMessage)) {
    return 'astra';
  }
  
  // Administrative patterns
  if (/(calendar|schedule|meeting|appointment|admin|coordinate|organize)/.test(lowMessage)) {
    return 'ami';
  }
  
  // Web automation patterns
  if (/(browser|automation|scrape|form|screenshot|web\s+interaction)/.test(lowMessage)) {
    return 'wex';
  }
  
  return null;
}

/**
 * Enhanced delegation decision with complexity analysis
 */
export function makeDelegationDecision(userMessage: string): {
  shouldDelegate: boolean;
  targetAgent?: string;
  reasoning: string;
  complexity: ComplexityScore;
} {
  const complexity = analyzeTaskComplexity(userMessage);
  const suggestedAgent = suggestAgent(userMessage);
  
  if (complexity.recommendation === 'direct') {
    return {
      shouldDelegate: false,
      reasoning: `Simple query (score: ${complexity.score}): ${complexity.reasoning}`,
      complexity
    };
  }
  
  if (complexity.recommendation === 'delegate' && suggestedAgent) {
    return {
      shouldDelegate: true,
      targetAgent: suggestedAgent,
      reasoning: `Complex query (score: ${complexity.score}) requiring ${suggestedAgent} expertise: ${complexity.reasoning}`,
      complexity
    };
  }
  
  // For 'clarify' or no clear agent match
  return {
    shouldDelegate: false,
    reasoning: `Moderate complexity (score: ${complexity.score}): ${complexity.reasoning}. Will handle directly with potential follow-up.`,
    complexity
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
