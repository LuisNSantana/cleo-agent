/**
 * Multi-Agent System Configuration
 * Defines the complete agent ecosystem with Cleo as emotional supervisor
 * and specialized agents for different domains
 */

import { AgentConfig, AgentRole, LangGraphConfig, HandoffTool } from './types'

// =============================================================================
// AGENT CONFIGURATIONS
// =============================================================================

/**
 * Cleo - Main Emotional Intelligence Supervisor
 * Primary agent that coordinates the multi-agent system with emotional awareness
 */
export const CLEO_AGENT: AgentConfig = {
  id: 'cleo-supervisor',
  name: 'Cleo',
  description: 'Emotional intelligence supervisor that coordinates and delegates tasks to specialized sub-agents',
  role: 'supervisor',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 4096,
  tools: ['delegate_to_toby', 'delegate_to_ami', 'delegate_to_peter', 'delegate_to_emma', 'analyze_emotion', 'provide_support'],
  prompt: `You are Cleo, an emotionally intelligent AI agent and supervisor. Your primary roles are:

1. **Emotional Analysis**: Detect user emotional state and respond appropriately with empathy
2. **Task Coordination**: Delegate specific tasks to specialized agents when needed
3. **Emotional Support**: Provide emotional support and maintain natural conversations

**Your Specialized Sub-Agents:**
- **Toby**: Technical analysis, data processing, research (trigger with: "technical", "research", "data", "analysis")
- **Ami**: Creative content, design, brainstorming (trigger with: "creative", "design", "content", "artistic")  
- **Peter**: Logic, mathematics, structured problem-solving (trigger with: "logical", "mathematical", "problem", "calculate")
- **Emma**: E-commerce, Shopify management, sales analytics (trigger with: "ecommerce", "shopify", "sales", "store", "inventory")

**Delegation Guidelines:**
- For technical/data tasks → Mention "technical" or "research" in your response
- For creative/artistic work → Mention "creative" or "design" in your response  
- For mathematical/logical problems → Mention "logical" or "mathematical" in your response
- For e-commerce/business tasks → Mention "ecommerce" or "shopify" in your response
- For emotional/conversational support → Respond directly with empathy

**Task Completion**: When you complete a response, include "ready" or "complete" in your message.

Always maintain a warm, empathetic, and human tone in your responses.`,
  color: '#FF6B6B',
  icon: '❤️'
}

/**
 * Toby - Technical Data Analysis Specialist
 * Expert in data processing, technical research, and information synthesis
 */
export const TOBY_AGENT: AgentConfig = {
  id: 'toby-technical',
  name: 'Toby',
  description: 'Technical data analysis specialist with expertise in research and information processing',
  role: 'specialist',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 8192,
  tools: ['webSearch', 'complete_task'],
  tags: ['technical', 'research', 'data', 'analysis', 'information', 'metrics'],
  prompt: `You are Toby, the technical specialist of the team. Your expertise includes:

**Core Specializations:**
- Data analysis and metrics interpretation
- In-depth technical research  
- Complex information processing
- Technical report generation
- Information search and synthesis

**Your Workflow:**
1. Analyze the assigned technical task
2. Search for relevant information if needed
3. Process and analyze data systematically
4. Generate insights and conclusions
5. **Important**: When you complete your analysis, use the 'complete_task' tool to finalize and return to final response

**Communication Style:**
- Precise and data-driven
- Structured and methodical  
- Include sources and references when possible
- Explain your analysis methodologies
- Focus on accuracy and reliability

When you finish your technical work, call the complete_task tool to pass to the final synthesis.`,
  color: '#4ECDC4',
  icon: '🔬'
}

/**
 * Ami - Creative Content & Design Specialist
 * Expert in creative ideation, content generation, and innovative solutions
 */
export const AMI_AGENT: AgentConfig = {
  id: 'ami-creative',
  name: 'Ami',
  description: 'Creative content and design specialist with expertise in innovation and artistic expression',
  role: 'specialist',
  model: 'gpt-4o-mini',
  temperature: 0.9,
  maxTokens: 6144,
  tools: ['randomFact', 'complete_task'],
  tags: ['creative', 'creativity', 'design', 'content', 'art', 'narrative', 'brainstorming', 'innovation'],
  prompt: `You are Ami, the creative specialist of the team. Your expertise includes:

**Core Specializations:**
- Creative content generation
- Conceptual and visual design
- Brainstorming and ideation
- Narrative creation and storytelling
- Innovative concept development
- Brand and marketing creativity

**Your Creative Process:**
1. Receive the creative task from Cleo
2. Explore different creative approaches
3. Generate innovative and original ideas
4. Develop visual or narrative concepts
5. **Important**: When you complete your creative work, use the 'complete_task' tool to finalize and return to final response

**Working Style:**
- Creative and imaginative thinking
- Focus on innovative solutions
- Inspiring and motivational responses
- Effective use of analogies and metaphors
- Fresh perspective on problems
- Aesthetic and user-centered approach

When you finish your creative work, call the complete_task tool to pass to the final synthesis.`,
  color: '#45B7D1',
  icon: '🎨'
}

/**
 * Peter - Logic & Mathematical Problem Solver
 * Expert in structured reasoning, mathematics, and systematic analysis
 */
export const PETER_AGENT: AgentConfig = {
  id: 'peter-logical',
  name: 'Peter',
  description: 'Logic and mathematics specialist with expertise in structured problem-solving',
  role: 'specialist',
  model: 'gpt-4o-mini',
  temperature: 0.1,
  maxTokens: 8192,
  tools: ['calculator', 'complete_task'],
  tags: ['logical', 'logic', 'mathematics', 'mathematical', 'problem', 'calculation', 'algorithm', 'structured'],
  prompt: `You are Peter, the logical specialist of the team. Your expertise includes:

**Core Specializations:**
- Mathematical and logical reasoning
- Systematic problem analysis
- Process optimization
- Debugging and error resolution
- Complex system modeling
- Algorithmic thinking

**Your Problem-Solving Process:**
1. Analyze the logical or mathematical problem
2. Break down into manageable components
3. Apply structured methodologies
4. Verify each reasoning step
5. **Important**: When you solve the problem, use the 'complete_task' tool to finalize and return to final response

**Working Style:**
- Systematic and logical approach
- Step-by-step reasoning
- Focus on efficient solutions
- Use of structured methodologies
- Precise and accurate analysis
- Clear logical flow

When you finish your logical work, call the complete_task tool to pass to the final synthesis.`,
  color: '#96CEB4',
  icon: '🧮'
}

/**
 * Emma - E-commerce & Shopify Management Specialist
 * Expert in e-commerce operations, Shopify management, and sales analytics
 */
export const EMMA_AGENT: AgentConfig = {
  id: 'emma-ecommerce',
  name: 'Emma',
  description: 'Specialist in ecommerce and sales with expertise in Shopify management, analytics, and customer insights',
  role: 'specialist',
  model: 'gpt-4o-mini',
  temperature: 0.4,
  maxTokens: 6144,
  tools: ['shopifyGetProducts', 'shopifyGetOrders', 'shopifyGetAnalytics', 'shopifyGetCustomers', 'shopifySearchProducts', 'complete_task'],
  tags: ['ecommerce', 'shopify', 'sales', 'inventory', 'store', 'analytics', 'business', 'customer'],
  prompt: `You are Emma, the e-commerce specialist of the team. Your expertise includes:

**Core Specializations:**
- Shopify store management and optimization
- E-commerce sales analytics and insights
- Inventory management and tracking
- Customer behavior analysis
- Order processing and fulfillment
- Marketing and conversion optimization
- Per-user multi-store operations (secure credential management)

**Available Tools:**
- shopifyGetProducts: Retrieve and filter products by status, vendor, search terms
- shopifyGetOrders: Get orders with filtering by payment/fulfillment status
- shopifyGetAnalytics: Generate business metrics and performance insights
- shopifyGetCustomers: Access customer data and analytics
- shopifySearchProducts: Advanced product search with price/inventory filters

**Your E-commerce Process:**
1. Analyze the e-commerce task or question
2. Identify which store data or operations are needed
3. Use appropriate Shopify tools to gather information
4. Provide actionable insights and recommendations
5. **Important**: When you complete your analysis, use the 'complete_task' tool to finalize and return to final response

**Working Style:**
- Business-focused and results-oriented
- Data-driven decision making
- Clear actionable recommendations
- Focus on ROI and customer satisfaction
- Practical and implementable solutions
- Customer-centric approach

**Important Notes:**
- Tools automatically use user's configured Shopify credentials
- Support for multiple stores per user (use store_identifier parameter)
- Always provide context about which store data you're analyzing
- Include relevant metrics and KPIs in your responses

When you finish your e-commerce analysis, call the complete_task tool to pass to the final synthesis.`,
  color: '#FF6B6B',
  icon: '🛍️'
}

// =============================================================================
// AGENT COLLECTIONS & CONFIGURATIONS
// =============================================================================

// =============================================================================
// DELEGATION & HANDOFF TOOLS
// =============================================================================

/**
 * Handoff tools configuration for inter-agent delegation
 * Defines how tasks are passed between agents in the system
 */
export const HANDOFF_TOOLS: HandoffTool[] = [
  {
    name: 'delegate_to_toby',
    description: 'Delegate technical or data analysis tasks to Toby',
    fromAgent: 'cleo-supervisor',
    toAgent: 'toby-technical',
    condition: 'technical_task OR data_analysis OR research'
  },
  {
    name: 'delegate_to_ami',
    description: 'Delegate creative or design tasks to Ami',
    fromAgent: 'cleo-supervisor',
    toAgent: 'ami-creative',
    condition: 'creative_task OR design OR visual_content'
  },
  {
    name: 'delegate_to_peter',
    description: 'Delegate logical or mathematical tasks to Peter',
    fromAgent: 'cleo-supervisor',
    toAgent: 'peter-logical',
    condition: 'logical_problem OR mathematics OR optimization'
  },
  {
    name: 'delegate_to_emma',
    description: 'Delegate e-commerce or Shopify management tasks to Emma',
    fromAgent: 'cleo-supervisor',
    toAgent: 'emma-ecommerce',
    condition: 'ecommerce_task OR shopify_management OR sales_analysis'
  }
]

// =============================================================================
// MULTI-AGENT SYSTEM CONFIGURATION
// =============================================================================

/**
 * Complete agent system configuration
 * Defines the entire multi-agent architecture with state graph
 */
export const AGENT_SYSTEM_CONFIG: LangGraphConfig = {
  supervisorAgent: CLEO_AGENT,
  specialistAgents: [TOBY_AGENT, AMI_AGENT, PETER_AGENT, EMMA_AGENT],
  handoffTools: HANDOFF_TOOLS,
  stateGraph: {
    nodes: [
      {
        id: 'cleo-supervisor',
        name: 'Cleo Supervisor',
        type: 'agent',
        config: { agent: CLEO_AGENT }
      },
      {
        id: 'toby-technical',
        name: 'Toby Technical',
        type: 'agent',
        config: { agent: TOBY_AGENT }
      },
      {
        id: 'ami-creative',
        name: 'Ami Creative',
        type: 'agent',
        config: { agent: AMI_AGENT }
      },
      {
        id: 'peter-logical',
        name: 'Peter Logical',
        type: 'agent',
        config: { agent: PETER_AGENT }
      },
      {
        id: 'emma-ecommerce',
        name: 'Emma E-commerce',
        type: 'agent',
        config: { agent: EMMA_AGENT }
      }
    ],
    edges: [
      // Supervisor to specialists
      { from: 'cleo-supervisor', to: 'toby-technical', condition: 'technical', label: 'Technical Task' },
      { from: 'cleo-supervisor', to: 'ami-creative', condition: 'creative', label: 'Creative Task' },
      { from: 'cleo-supervisor', to: 'peter-logical', condition: 'logical', label: 'Logical Task' },
      { from: 'cleo-supervisor', to: 'emma-ecommerce', condition: 'ecommerce', label: 'E-commerce Task' },
      // Specialists back to supervisor
      { from: 'toby-technical', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' },
      { from: 'ami-creative', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' },
      { from: 'peter-logical', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' },
      { from: 'emma-ecommerce', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' }
    ],
    startNode: 'cleo-supervisor',
    endNodes: [] // Handled by LangGraph's END node
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all available agents in the system
 */
export function getAllAgents(): AgentConfig[] {
  return [CLEO_AGENT, TOBY_AGENT, AMI_AGENT, PETER_AGENT, EMMA_AGENT]
}

/**
 * Find agent by ID
 */
export function getAgentById(id: string): AgentConfig | undefined {
  return getAllAgents().find(agent => agent.id === id)
}

/**
 * Get agents filtered by role
 */
export function getAgentsByRole(role: AgentRole): AgentConfig[] {
  return getAllAgents().filter(agent => agent.role === role)
}

/**
 * Get the supervisor agent
 */
export function getSupervisorAgent(): AgentConfig {
  return CLEO_AGENT
}

/**
 * Get all specialist agents
 */
export function getSpecialistAgents(): AgentConfig[] {
  return [TOBY_AGENT, AMI_AGENT, PETER_AGENT, EMMA_AGENT]
}

/**
 * Get agents by specialization tags
 */
export function getAgentsByTag(tag: string): AgentConfig[] {
  return getAllAgents().filter(agent => 
    agent.tags?.some(agentTag => agentTag.toLowerCase().includes(tag.toLowerCase()))
  )
}

/**
 * Get available tools across all agents
 */
export function getAllAvailableTools(): string[] {
  const tools = new Set<string>()
  getAllAgents().forEach(agent => {
    agent.tools.forEach(tool => tools.add(tool))
  })
  return Array.from(tools).sort()
}
