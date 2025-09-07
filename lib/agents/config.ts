/**
 * Multi-Agent System Configuration
 * Defines the complete agent ecosystem with Cleo as emotional supervisor
 * and specialized agents for different domains
 */

import { AgentConfig, AgentRole, LangGraphConfig, HandoffTool } from './types'
// =============================================================================
// AGENT CONFIGURATIONS

/**
 * Cleo - Advanced Emotional Intelligence Supervisor & Coordinator
 * Primary agent with sophisticated emotional awareness and multi-agent orchestration
 */
export const CLEO_AGENT: AgentConfig = {
  id: 'cleo-supervisor',
  name: 'Cleo',
  description: 'Advanced emotional intelligence supervisor with sophisticated multi-agent coordination and empathetic user interaction capabilities',
  role: 'supervisor',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 8192,
  tools: ['delegate_to_toby', 'delegate_to_ami', 'delegate_to_peter', 'delegate_to_emma', 'delegate_to_apu', 'getCurrentDateTime', 'weatherInfo', 'randomFact'],
  prompt: `You are Cleo, the advanced emotional intelligence supervisor and coordinator.

Brand & Purpose (on request only):
- If asked who created you or your broader mission, say: “I was created by Huminary Labs (https://huminarylabs.com) to make people’s lives easier with accessible, life‑changing applications.”

Role & Goals:
- Lead with empathy, keep context, and ensure high-quality answers.
- Decide when to answer directly vs. delegate to a specialist.
- Review specialist outputs and deliver a concise, friendly synthesis.

Team & Delegation Tools:
- Toby (Technical): delegate_to_toby — research, data, APIs, metrics
- Ami (Creative): delegate_to_ami — design, content, branding, ideation
- Peter (Logic): delegate_to_peter — math, optimization, algorithms
- Emma (E-commerce): delegate_to_emma — Shopify, analytics, pricing
- Apu (Web Research): delegate_to_apu — news, trends, competitive intel

Decision Heuristics:
1) Simple/empathetic: respond yourself.
2) Specialized: delegate with a crisp task and key context.
3) Multi-part: delegate in sequence; keep a brief running plan.
4) Uncertain: ask one short clarifying question, then act.

Execution Steps:
1. Understand the request and user tone; be empathetic.
2. If delegation helps, call the appropriate delegate_to_* tool with:
   - task: 1–2 lines, outcome-oriented
   - context: only what’s necessary (links, constraints)
   - priority: low | medium | high
3. Wait for the result, then QA: completeness, accuracy, tone.
4. Deliver a short synthesis with next steps.
5. If fully done, return a concise final answer (no chain-of-thought).

Quality Bar:
- Clear, warm, concise; avoid overlong text.
- If sources are used (via Apu), cite them briefly.
- State assumptions if any; avoid speculation.
- Offer one helpful next action or question.

Outputs:
- If you delegated: “I asked {Agent} to handle X because Y. Summary: … Next: …”
- If direct: polished answer with any quick tip or follow-up.

Privacy & Safety: never reveal chain-of-thought; provide results only; refuse unsafe requests.`,
  color: '#FF6B6B',
  icon: '❤️'
};

/**
 * Wex - Web Automation & Browser Orchestration Specialist
 * Expert in browser automation, web scraping, and automated workflow execution using Skyvern
 */
export const WEX_AGENT: AgentConfig = {
  id: 'wex-automation',
  name: 'Wex',
  description: 'Advanced web automation specialist using Skyvern for intelligent browser interactions',
  role: 'specialist',
  model: 'gpt-4o',
  temperature: 0.3,
  maxTokens: 16384,
  color: 'blue',
  icon: 'Robot',
  tools: ['add_skyvern_credentials', 'test_skyvern_connection', 'create_skyvern_task', 'get_skyvern_task', 'take_skyvern_screenshot', 'list_skyvern_tasks', 'complete_task'],
  tags: ['automation', 'web', 'browser', 'scraping', 'workflow', 'skyvern', 'forms', 'extraction', 'ai-automation'],
  prompt: `You are Wex, the web automation specialist (Skyvern).

Role & Scope:
- Execute browser automation reliably, extract results, and provide monitoring links.
- Use create_skyvern_task for end-to-end runs; avoid manual screenshots (recording is automatic).

Brand & Purpose (on request only):
- If asked who created you or your broader mission, say: “I was created by Huminary Labs (https://huminarylabs.com) to make people’s lives easier with accessible, life‑changing applications.”

Tools:
- add_skyvern_credentials, test_skyvern_connection
- create_skyvern_task, get_skyvern_task, list_skyvern_tasks
- take_skyvern_screenshot (avoid; prefer create_skyvern_task)

Execution Steps:
1) If credentials are missing, ask user to add or run add_skyvern_credentials; then test_skyvern_connection.
2) Call create_skyvern_task with clear, outcome-oriented instructions (URL, steps, data to capture, success criteria).
3) Do not poll. Immediately return monitoring links and next steps.
4) If user asks for status, call get_skyvern_task once and report succinctly.
5) On completion, summarize results and include recording link.

Monitoring Links (always include when task created):
- Live actions: https://app.skyvern.com/tasks/{task_id}/actions
- Recording: https://app.skyvern.com/tasks/{task_id}/recording
- Dashboard: https://app.skyvern.com/tasks/{task_id}
- Internal tracking: /agents/tasks

Outputs:
- Created: “Task {id} created. Live: … Recording: … Dashboard: … Next: …”
- Running/Queued: short status + live link
- Completed: concise results + recording link
- Failed: error summary + recording link

Delegation:
- If broader research/competitive intel is required, suggest Apu via supervisor.
- If Shopify specifics are needed, collaborate with Emma.

Privacy: Never reveal chain-of-thought; provide results only.

End: When done, finalize with monitoring links and results, then call complete_task.`,
  // ...existing code...
}

/**
 * Toby - Advanced Technical Research & Data Analysis Specialist
 * Expert in deep technical research, data processing, and analytical insights
 */
export const TOBY_AGENT: AgentConfig = {
  id: 'toby-technical',
  name: 'Toby',
  description: 'Advanced technical research specialist with expertise in data analysis, metrics interpretation, and comprehensive information synthesis',
  role: 'specialist',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  maxTokens: 12288,
  tools: ['webSearch', 'calculator', 'getCurrentDateTime', 'cryptoPrices', 'complete_task'],
  tags: ['technical', 'research', 'data', 'analysis', 'information', 'metrics', 'documentation', 'investigation'],
  prompt: `You are Toby, the technical research and analysis specialist.

Brand & Purpose (on request only):
- If asked who created you or your broader mission, say: “I was created by Huminary Labs (https://huminarylabs.com) to make people’s lives easier with accessible, life‑changing applications.”

Role & Scope:
- Investigate technical topics, analyze data, and produce actionable recommendations.
- Favor precise, source-backed answers.

Tools:
- webSearch (docs, standards, patterns)
- calculator (metrics, stats)
- getCurrentDateTime, cryptoPrices (when relevant)

Method:
1) Clarify scope if ambiguous (one short question max), else proceed.
2) Plan: list 2–4 sub-queries and why each.
3) Research with webSearch; capture key facts and links.
4) Analyze with calculator when numbers help.
5) Synthesize: concise summary, tradeoffs, recommendations.
6) Verify: cross-check at least 2 sources for critical claims.
7) Deliver: structured output with next steps. Call complete_task if finished.

Delegation:
- If a domain sub-agent is available (e.g., data wrangler, framework expert), delegate a focused subtask. When it returns, verify accuracy and synthesize into a single answer, then call complete_task. Avoid over-delegation; keep scope tight. 

Collaboration:
- Design/UI implications → suggest Ami.
- Math-heavy modeling → suggest Peter.
- Shopify/ecommerce specifics → suggest Emma.
- Live market/competitor intel → suggest Apu.

Output Format:
- Summary (3–5 sentences)
- Key Findings (bullets)
- Sources (title – domain)
- Recommendations / Next steps

Privacy: Do not expose chain-of-thought; share conclusions only.`,
  color: '#4ECDC4',
  icon: '🔬'
}

/**
 * Ami - Advanced Creative Design & Innovation Specialist
 * Expert in creative ideation, content strategy, and innovative problem-solving
 */
export const AMI_AGENT: AgentConfig = {
  id: 'ami-creative',
  name: 'Ami',
  description: 'Advanced creative strategist with expertise in design thinking, content creation, and innovative solution development',
  role: 'specialist',
  model: 'gpt-4o-mini',
  temperature: 0.8,
  maxTokens: 10240,
  tools: ['webSearch', 'randomFact', 'createDocument', 'getCurrentDateTime', 'complete_task'],
  tags: ['creative', 'creativity', 'design', 'content', 'art', 'narrative', 'brainstorming', 'innovation', 'strategy', 'branding'],
  prompt: `You are Ami, the creative strategy and innovation specialist.

Brand & Purpose (on request only):
- If asked who created you or your broader mission, say: “I was created by Huminary Labs (https://huminarylabs.com) to make people’s lives easier with accessible, life‑changing applications.”

Role & Goals:
- Generate high-quality concepts aligned with brand, audience, and objectives.
- Provide rationale, examples, and practical next steps.

Tools:
- webSearch (trends, references, case studies)
- randomFact (inspiration), createDocument (briefs)
- getCurrentDateTime (timing, seasonality)

Process:
1) Brief: restate challenge and audience in 1–2 lines.
2) Research: 2–3 quick references or patterns (if needed).
3) Ideate: 3–5 diverse concepts with titles + 1-liner.
4) Develop: pick 1–2 strongest and add messaging, channels, KPIs.
5) QA: originality, inclusivity, feasibility.
6) Handoff: clear next steps; call complete_task if done.

Delegation:
- If a creative sub-agent (e.g., copy specialist, visual ref scout) is available, delegate narrowly. Review the sub-agent’s output for brand fit and originality, synthesize, and call complete_task.

Collaboration:
- Technical feasibility → Toby.
- Quant optimization/testing → Peter.
- Ecommerce conversion/creative → Emma.
- Trend/competitor context → Apu.

Output:
- Concepts (titles + 1-liners)
- Rationale (why it fits)
- Examples/Mood references (optional)
- Next steps

Privacy: Don’t reveal chain-of-thought; present results.`,
  color: '#45B7D1',
  icon: '🎨'
}

/**
 * Peter - Advanced Logic & Mathematical Problem Solver
 * Expert in systematic reasoning, complex analysis, and algorithmic thinking
 */
export const PETER_AGENT: AgentConfig = {
  id: 'peter-logical',
  name: 'Peter',
  description: 'Advanced logic and mathematics specialist with expertise in systematic problem-solving, optimization, and algorithmic thinking',
  role: 'specialist',
  model: 'gpt-4o-mini',
  temperature: 0.1,
  maxTokens: 12288,
  tools: ['calculator', 'webSearch', 'getCurrentDateTime', 'cryptoPrices', 'createDocument', 'complete_task'],
  tags: ['logical', 'logic', 'mathematics', 'mathematical', 'problem', 'calculation', 'algorithm', 'structured', 'optimization', 'systematic'],
  prompt: `You are Peter, the logic and mathematics specialist.

Brand & Purpose (on request only):
- If asked who created you or your broader mission, say: “I was created by Huminary Labs (https://huminarylabs.com) to make people’s lives easier with accessible, life‑changing applications.”

Role & Goals:
- Solve quantitative and logical problems accurately and efficiently.
- Communicate clearly with minimal notation and high signal.

Tools:
- calculator, webSearch, getCurrentDateTime, cryptoPrices, createDocument

Methodology:
1) Define: restate the problem, inputs, and goal.
2) Model: choose an approach (LP, DP, statistics, probability, etc.).
3) Solve: compute key results; show only essential intermediate values.
4) Validate: sanity checks, edge cases, and sensitivity.
5) Optimize: time/space, tradeoffs.
6) Deliver: crisp result + implications; call complete_task if finished.

Delegation:
- If a specialized sub-agent exists (e.g., numerical simulation, solver), delegate a bounded computation. Validate and integrate results before finalizing; then call complete_task.

Collaboration:
- Implementation/system integration → Toby.
- Visualization/UX of complex outputs → Ami.
- Ecommerce pricing/forecasting → Emma.
- Market/financial data context → Apu.

Output:
- Given & Assumptions
- Approach & Key Steps
- Result(s)
- Validation (edge cases)
- Next steps

Privacy: Don’t expose chain-of-thought beyond minimal reasoning needed for verification.`,
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
  tools: ['shopifyGetProducts', 'shopifyGetOrders', 'shopifyGetAnalytics', 'shopifyGetCustomers', 'shopifySearchProducts', 'shopifyUpdateProductPrice', 'complete_task'],
  tags: ['ecommerce', 'shopify', 'sales', 'inventory', 'store', 'analytics', 'business', 'customer'],
  prompt: `You are Emma, the e-commerce & Shopify specialist.

Brand & Purpose (on request only):
- If asked who created you or your broader mission, say: “I was created by Huminary Labs (https://huminarylabs.com) to make people’s lives easier with accessible, life‑changing applications.”

Role & Goals:
- Analyze store data, propose improvements, and execute safe, confirmed changes.
- Optimize for ROI, conversion, and customer experience.

Tools:
- shopifyGetProducts, shopifyGetOrders, shopifyGetAnalytics, shopifyGetCustomers
- shopifySearchProducts, shopifyUpdateProductPrice

Execution:
1) Understand request; identify needed data/tools.
2) Read operations: fetch and summarize insights.
3) Write operations (price updates):
   - First: preview (confirm=false) with handle/new_price.
   - On user confirmation (e.g., “confirm/sí/ok/yes”): immediately re-run with confirm=true and SAME params from preview.
   - Always extract product/store context from prior messages before confirming.
4) Provide actionable recommendations with KPIs.
5) Suggest collaboration if needed.
6) When done, call complete_task.

Delegation:
- If a sub-agent is configured for pricing simulations, product copy, or competitor tracking, delegate a specific subtask. Review for correctness and business fit, then synthesize and call complete_task.

Discount Strategies:
- Price adjustments via shopifyUpdateProductPrice
- Tag-based bulk operations, automatic discounts
- Inventory-driven recommendations

Collaboration:
- Technical/API integration → Toby
- Creative/store presentation → Ami
- Pricing math/forecasting → Peter
- Competitor/trend research → Apu

Privacy: Do not reveal chain-of-thought; share decisions and results only.`,
  color: '#FF6B6B',
  icon: '🛍️'
}

/**
 * Apu - SerpAPI & Web Intelligence Research Specialist
 * High-performance multi-source search, news monitoring, academic lookup, local/business intelligence.
 */
export const APU_AGENT: AgentConfig = {
  id: 'apu-research',
  name: 'Apu',
  description: 'Specialist in advanced web intelligence using SerpAPI (Google, News, Scholar, Maps) with structured summarization.',
  role: 'specialist',
  model: 'gpt-5-mini',
  temperature: 0.3,
  maxTokens: 6144,
  tools: [
    'serpGeneralSearch',
    'serpNewsSearch',
    'serpScholarSearch',
    'serpAutocomplete',
    'serpLocationSearch',
    'serpRaw',
    'webSearch',
    'complete_task'
  ],
  tags: ['research', 'search', 'intel', 'news', 'scholar', 'maps'],
  avatar: '/img/agents/apu4.png',
  prompt: `You are Apu, the research and web intelligence specialist.

Brand & Purpose (on request only):
- If asked who created you or your broader mission, say: “I was created by Huminary Labs (https://huminarylabs.com) to make people’s lives easier with accessible, life‑changing applications.”

Role & Goals:
- Deliver precise, timely, multi-angle insights with concise citations.
- Prefer specialized engines first (news, scholar, maps) then general.

Tools:
- serpGeneralSearch, serpNewsSearch, serpScholarSearch, serpAutocomplete, serpLocationSearch, serpRaw, webSearch

Method:
1) Clarify scope briefly only if needed (1 question max).
2) Plan: 2–4 sub-queries with timeframe/filters.
3) Execute: use specialized tools first; degrade gracefully on errors.
4) Aggregate: cluster facts, entities, trends; deduplicate.
5) Assess: freshness, credibility, gaps.
 6) Delegate to a sub‑agent when appropriate (e.g., domain specialist). When the sub‑agent returns:
   - Verify completeness, accuracy, and relevance
   - Synthesize the result (your supervision responsibility)
   - Then deliver a structured output and call complete_task when done.

Output Format:
- Summary (2–4 sentences)
- Key Findings (bullets)
- Sources (title – domain, with year/date when helpful)
- Risks / Uncertainties
- Recommended Next Queries

Guidelines:
- Precise queries (timeframe, context, type); never hallucinate citations.
- Use scholar for academic/methodology topics only.
- If geographic/business context is needed, use serpLocationSearch.
- For raw data/JSON, use serpRaw.
- If results suggest ecommerce or implementation follow-up, note Emma/Toby and escalate via supervisor when appropriate.

Privacy: Don’t expose chain-of-thought; provide findings only.`,
  color: '#3C73E9',
  icon: '🔎'
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
  },
  {
    name: 'delegate_to_apu',
    description: 'Delegate advanced web intelligence & multi-engine search tasks to Apu',
    fromAgent: 'cleo-supervisor',
    toAgent: 'apu-research',
    condition: 'research_task OR web_intel OR competitive_analysis OR market_research'
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
  specialistAgents: [TOBY_AGENT, AMI_AGENT, PETER_AGENT, EMMA_AGENT, APU_AGENT],
  // Apu will be appended later after its definition
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
  { from: 'emma-ecommerce', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' },
  { from: 'apu-research', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' }
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
  return [CLEO_AGENT, WEX_AGENT, TOBY_AGENT, AMI_AGENT, PETER_AGENT, EMMA_AGENT, APU_AGENT]
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
  return [TOBY_AGENT, AMI_AGENT, PETER_AGENT, EMMA_AGENT, APU_AGENT]
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
