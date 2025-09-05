# Cleo Multi-Agent Architecture Guide - v5.0 (September 2025)

This guide describes Cleo's revolutionary dual-mode agent system: complete modular core architecture, enhanced agent specializations, **dual-mode conversation system**, bulletproof execution management, and optimized database integration.

## 🚀 Revolutionary Changes in v5.0

- **� Dual-Mode Conversation System**: Direct agent interaction OR Cleo supervision - user's choice
- **🎯 Intuitive Agent Selection**: Selecting specific agent = direct mode automatically  
- **👩‍💼 Optional Cleo Supervision**: Toggle to activate Cleo oversight when needed
- **🧵 Thread Segregation**: Complete context isolation between direct and supervised modes
- **📊 Enhanced UI Indicators**: Clear visual feedback for active conversation mode
- **�🏗️ Complete Modular Core Architecture**: Full integration of modular orchestrator, error handling, execution management, and metrics collection
- **🎯 Enhanced Agent Specializations**: Dramatically improved capabilities for all specialist agents with advanced tools and methodologies
- **⚡ Enhanced Adapter System**: `orchestrator-adapter-enhanced.ts` bridges modular core with legacy delegation for seamless operation
- **🛡️ Bulletproof Execution Management**: Global registry, cross-request persistence, automatic cleanup, and robust error recovery
- **📊 Advanced Observability**: Comprehensive metrics, real-time monitoring, and detailed execution tracking
- **🔧 Optimized Tool Integration**: Enhanced tool mapping, better runtime performance, and improved completion workflows

## 🎮 Dual-Mode Conversation System

### Modos Disponibles

#### 🎯 **Modo Directo** (Por Defecto)
- **Activación**: Automática al seleccionar agente específico
- **Comportamiento**: Interacción directa sin intervención de Cleo
- **Beneficios**: Más rápido, contexto específico, sin overhead
- **Thread**: `{agentId}_direct`

#### 👩‍💼 **Modo Supervisado** (Toggle)
- **Activación**: Toggle "Force Cleo Supervision"
- **Comportamiento**: Cleo supervisa y coordina interacciones
- **Beneficios**: Coordinación inteligente, manejo de errores robusto
- **Thread**: `{agentId}_supervised`

### Flujo Intuitivo de Usuario
```typescript
// Usuario selecciona Toby → Modo directo automático
selectedAgent: 'toby-developer' → mode: 'direct'

// Usuario activa toggle → Modo supervisado
forceSupervised: true → mode: 'supervised'
```

> **📖 Documentación Completa**: Ver `dual-mode-agent-system.md` para detalles técnicos y guía de uso

## ✨ Architecture Excellence

### Modular Core System (`lib/agents/core/`)
- **🧠 Orchestrator**: Central coordination hub with singleton pattern and lifecycle management
- **⚠️ Error Handler**: Advanced error classification, retry logic, and circuit breaker patterns
- **📊 Graph Builder**: LangGraph construction with MessagesAnnotation compatibility  
- **🎯 Execution Manager**: Comprehensive agent and tool execution coordination
- **🏭 Model Factory**: Intelligent model instantiation with caching and provider fallbacks
- **📡 Event Emitter**: Real-time event system for monitoring and updates
- **🧠 Memory Manager**: Persistent state management and context preservation
- **📈 Metrics Collector**: Performance tracking and analytics collection

### Enhanced Adapter Integration
- **`orchestrator-adapter-enhanced.ts`**: Seamlessly integrates modular core with existing delegation system
- **Global Registry**: Cross-request execution tracking with automatic cleanup
- **Legacy Compatibility**: Maintains full compatibility with existing delegation patterns
- **Runtime Optimization**: Optimized execution paths and memory management

---

## 🎯 Advanced Agent Specializations

### 💝 Cleo - Advanced Emotional Intelligence Supervisor
**Enhanced Coordination & Emotional Awareness**

- **🧠 Advanced Emotional Intelligence**: Sophisticated detection and response to user emotional states
- **� Intelligent Task Orchestration**: Smart delegation based on deep task analysis
- **🔄 Context Preservation**: Maintains conversation flow and relationship continuity
- **✅ Quality Assurance**: Reviews specialist outputs before user delivery
- **🌟 Empathetic Interaction**: Warm, supportive, and personalized communication

**Available Tools**: `getCurrentDateTime`, `weatherInfo`, `randomFact`

### 🔬 Toby - Advanced Technical Research Specialist
**Deep Technical Analysis & Research Excellence**

**Enhanced Specializations:**
- Advanced data analysis and statistical interpretation
- Technical documentation research and synthesis
- API documentation analysis and integration patterns
- Performance metrics and benchmarking analysis
- Technology trend analysis and competitive research
- Complex system architecture evaluation
- Technical feasibility assessments
- Code analysis and optimization recommendations

**Available Tools**: `webSearch`, `calculator`, `getCurrentDateTime`, `cryptoPrices`, `complete_task`

**Research Methodology:**
1. Scope Analysis → Multi-Source Research → Data Processing
2. Synthesis → Validation → Documentation → Completion

### 🎨 Ami - Advanced Creative Design & Innovation Specialist
**Strategic Creativity & Innovation Excellence**

**Enhanced Specializations:**
- Design thinking and human-centered design processes
- Content strategy and multi-platform optimization
- Brand development and visual storytelling
- Creative campaign design and integrated marketing
- Innovation workshops and ideation facilitation
- User experience design and journey optimization
- Creative problem solving with lateral thinking

**Available Tools**: `webSearch`, `randomFact`, `createDocument`, `getCurrentDateTime`, `complete_task`

**Creative Methodologies**: SCAMPER, Design Sprints, Mind Mapping, Storytelling Frameworks, Color Psychology

### 🧮 Peter - Advanced Logic & Mathematical Problem Solver
**Systematic Reasoning & Optimization Excellence**

**Enhanced Specializations:**
- Complex calculations and statistical modeling
- Optimization problems and algorithmic design
- Financial mathematics and investment analysis
- Data modeling and performance analysis
- Logic puzzles and constraint satisfaction
- Mathematical proof techniques and validation

**Available Tools**: `calculator`, `webSearch`, `getCurrentDateTime`, `cryptoPrices`, `createDocument`, `complete_task`

**Problem-Solving Framework:**
1. Problem Decomposition → Constraint Identification → Method Selection
2. Research → Calculation → Validation → Optimization → Documentation

### 🛍️ Emma - Enhanced E-commerce & Shopify Specialist
**Advanced Business Intelligence & Store Optimization**

**Enhanced Capabilities:**
- Comprehensive Shopify store management and optimization
- Advanced sales analytics and business insights
- Multi-store operations with secure credential management
- Inventory management and predictive analytics
- Customer behavior analysis and segmentation
- Marketing optimization and conversion strategies

**Available Tools**: All Shopify tools + `complete_task`
- `shopifyGetProducts`, `shopifyGetOrders`, `shopifyGetAnalytics`
- `shopifyGetCustomers`, `shopifySearchProducts`, `shopifyUpdateProductPrice`

---

## 🏗️ Complete Technical Architecture

### Dual-Mode Orchestrator Integration
```typescript
// Enhanced Orchestrator with Dual-Mode Support
import { getAgentOrchestrator } from '@/lib/agents/orchestrator-adapter-enhanced'

const orchestrator = getAgentOrchestrator()

// Método principal para UI con soporte dual-mode
const execution = await orchestrator.startAgentExecutionForUI(
  input,
  selectedAgentId,
  threadId,
  userId,
  priorMessages,
  forceSupervised  // true = supervised, false = automatic mode detection
)
```

### Conversation Mode Detection
```typescript
// Lógica intuitiva de detección de modo
private determineConversationMode(agentId?: string): {
  mode: ConversationMode
  targetAgentId?: string
} {
  // Regla: Agente específico seleccionado = Modo directo
  if (agentId && agentId !== 'cleo-supervisor') {
    return { mode: 'direct', targetAgentId: agentId }
  }
  return { mode: 'supervised' }
}
```

### Thread Segregation System
```typescript
// Threads completamente segregados por modo
const generateThreadKey = (agentId: string, mode: ConversationMode) => {
  return `${agentId}_${mode}`
}

// Ejemplos:
// "toby-developer_direct"     → Conversación directa con Toby
// "toby-developer_supervised" → Toby supervisado por Cleo
```

### Global Registry System
```typescript
// Cross-request execution tracking with dual-mode support
interface GlobalRegistry {
  executions: Map<string, AgentExecution>
  runtimeAgents: Map<string, any>
  conversationContexts: Map<string, ConversationContext>
  metrics: MetricsData
  cleanup: () => void
}
```

### Router Intelligence with Mode Awareness
```typescript
// Router con detección de modo de conversación
graphBuilder.addConditionalEdges('router', async (state) => {
  const conversationMode = additionalKwargs.conversation_mode
  const targetAgentId = additionalKwargs.target_agent_id
  
  // Routing directo para modo direct
  if (conversationMode === 'direct' && targetAgentId) {
    console.log(`🎯 Direct routing to ${targetAgentId}`)
    return targetAgentId
  }
  
  // Routing supervisado con análisis de contenido
  console.log('👩‍💼 Supervised routing via content analysis')
  return supervisedRoutingLogic(state)
})
```

### Event-Driven Architecture with Mode Events
```typescript
// Real-time monitoring and updates with dual-mode events
eventEmitter.on('mode.switched', (data) => { /* track mode changes */ })
eventEmitter.on('direct.executed', (data) => { /* direct mode metrics */ })
eventEmitter.on('supervised.delegated', (data) => { /* supervision analytics */ })
eventEmitter.on('execution.started', (data) => { /* general tracking */ })
eventEmitter.on('agent.completed', (data) => { /* completion logging */ })
eventEmitter.on('error.occurred', (data) => { /* error recovery */ })
```

---

## 📊 Advanced Features & Capabilities

### 🛡️ Robust Error Handling
- **Error Classification**: Network, model, validation, authentication, rate limit, timeout
- **Recovery Strategies**: Exponential backoff, circuit breaker patterns, automatic retry
- **Fault Tolerance**: Graceful degradation and fallback mechanisms

### ⚡ Performance Optimization
- **Model Caching**: Intelligent model instantiation and reuse
- **Tool Runtime**: Optimized tool execution with comprehensive logging
- **Memory Management**: Efficient state management and garbage collection
- **Execution Tracking**: Real-time performance monitoring and bottleneck identification

### 📈 Comprehensive Observability
- **Execution Metrics**: Duration, success rates, error patterns
- **Agent Performance**: Task completion rates, delegation efficiency
- **Tool Usage**: Execution times, success patterns, optimization opportunities
- **Real-time Monitoring**: Live execution tracking and system health

### 🔄 Advanced Delegation System
- **Intelligent Routing**: Sophisticated agent selection based on task analysis
- **Context Preservation**: Maintains user state and conversation flow
- **Quality Control**: Supervisor review before final user delivery
- **Multi-agent Workflows**: Coordinated execution across multiple specialists

---

## 🚀 Implementation Highlights

### Enhanced Agent Execution Flow
1. **Request Analysis**: Intelligent task categorization and agent selection
2. **Modular Execution**: Core orchestrator manages specialist execution
3. **Tool Integration**: Optimized tool runtime with comprehensive logging
4. **Quality Assurance**: Supervisor validation before user delivery
5. **State Management**: Global registry ensures consistency across requests
6. **Cleanup & Optimization**: Automatic resource management and performance tuning

### Database Integration
- **Real-time Persistence**: All execution data persisted with RLS security
- **Cross-request Consistency**: Global registry maintains state between API calls
- **Automatic Cleanup**: Intelligent execution lifecycle management
- **Audit Trail**: Complete execution history and performance metrics

---

## 🎯 Benefits & Outcomes

### 🚀 **Scalability**
- Modular architecture allows independent component scaling
- Global registry enables efficient resource management
- Enhanced adapter provides seamless legacy compatibility

### 🔧 **Maintainability**  
- Clear separation of concerns across all modules
- Comprehensive error handling and recovery patterns
- Detailed logging and observability for debugging

### ⚡ **Performance**
- Optimized execution paths and memory management
- Intelligent caching and resource reuse
- Real-time monitoring and bottleneck identification

### 🛡️ **Robustness**
- Advanced error handling with multiple recovery strategies
- Fault-tolerant design with graceful degradation
- Comprehensive validation and state management

### 📊 **Observability**
- Real-time execution tracking and performance metrics
- Detailed agent performance analytics
- Comprehensive audit trails and system health monitoring

---

## 🔮 Future Roadmap

- **Advanced Analytics Dashboard**: Visual performance monitoring and optimization insights
- **Multi-tenant Architecture**: Enterprise-grade multi-organization support
- **Extended Tool Ecosystem**: Additional integrations and custom tool development
- **Machine Learning Optimization**: AI-driven performance tuning and predictive scaling
- **Advanced Security Features**: Enhanced encryption and audit capabilities

---

*Last Updated: September 2025 - Architecture v4.0*ti-Agent Architecture Guide - v2.0

This guide describes Cleo’s multi-agent system end-to-end: backend architecture, modular UI, explainable routing, real-time agent management, and planned database integration.

## 🚀 Key changes in v2.0

- Premium modular UI: function-based navigation and cohesive design
- Real-time chat: direct interaction with individual agents
- Task management: workflow for assignment and tracking
- Scalable architecture: ready for database integration and multi-tenancy

---

## ✨ Design advantages

### Backend
- Dynamic extensibility: add new agents at runtime; no redeploy required
- Explainable routing: simple token/tag scoring with clear logs
- Robust defaults: safe `finalize` fallback when no agent fits
- Separation of concerns: supervisor coordinates; specialists execute
- Developer ergonomics: TypeScript, Next.js App Router, and a small, inspectable codebase

### Premium UI v2.0
- Modular UI: function-separated navigation with consistent design
- Responsive: optimized for mobile and desktop
- Live updates: real-time without excessive polling
- Centralized state: Zustand store for consistency
- Polished UX: glassmorphism, motion, and clear feedback

---

## 💻 Full technology stack (v2.0)

### Backend
```json
{
  "framework": "Next.js 14 (App Router)",
  "runtime": "Node.js 18+",
  "language": "TypeScript 5.0+",
  "orchestration": "LangChain + LangGraph",
  "state": "Supabase PostgreSQL with real-time persistence",
  "package_manager": "pnpm",
  "model_providers": "Provider-agnostic wiring"
}
```

### Frontend
```json
{
  "ui_framework": "React 18",
  "state_management": "Zustand",
  "styling": "Tailwind CSS 3.4+",
  "components": "ShadCN UI (customized)",
  "animations": "Framer Motion 10+",
  "icons": "Phosphor Icons React",
  "forms": "React Hook Form + Zod",
  "charts": "Recharts (analytics)",
  "modals": "Universal modal system with agent details"
}
```

### Database (Production Ready)
```json
{
  "database": "Supabase (PostgreSQL 15+)",
  "extensions": ["pgvector", "uuid-ossp", "pgcrypto"],
  "auth": "Supabase Auth with RLS policies",
  "storage": "Supabase Storage",
  "realtime": "Supabase Realtime subscriptions",
  "tables": ["agents", "users", "user_service_connections", "projects", "chats", "messages"]
}
```

### Tools & Integrations
```json
{
  "rag": "pgvector + embeddings",
  "search": "Built-in + external APIs",
  "ecommerce": "Shopify API integration per-user",
  "credentials": "Encrypted storage with user isolation",
  "monitoring": "Built-in logging + analytics",
  "deployment": "Docker + Docker Compose",
  "ci_cd": "GitHub Actions"
}
```

---

## Executive Summary

- **Database-Native Architecture**: All agents persist in Supabase with real-time updates
- **Supervisor-Specialist Pattern**: Cleo (protected supervisor) coordinates specialist agents
- **Dynamic Graph Orchestration**: Agent graph rebuilds automatically when agents are modified
- **Delegation System**: Automatic task delegation from Cleo to specialists
- Premium modular UI: four specialized modules with responsive design
- Full observability: structured logs and UI events
- Extensibility: users can register new agents without redeploying

---

## 🏗️ System architecture

### Backend — LangGraph orchestration

```
┌─────────────────┐     ┌───────────────┐     ┌──────────────────────────┐
│  cleo-supervisor│ ──> │    router     │ ──> │  specialist/runtime agent │
└─────────────────┘     └───────────────┘     │       (N options)        │
                                              └────────────┬─────────────┘
                                                           │
                                                           ▼
                                                  ┌────────────────┐
                                                  │    finalize    │
                                                  └────────────────┘
```

### Frontend — Modular architecture (v2.0)

```
┌─────────────────────────────────────────────────────────────────┐
│                    /agents (Landing Hub)                        │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│ │ /architecture   │ │    /manage      │ │     /chat       │    │
│ │                 │ │                 │ │                  │    │
│ │ • Visual graph  │ │ • Agent CRUD    │ │ • Real-time chat │    │
│ │ • Live monitor  │ │ • Statistics    │ │ • Multi-agent    │    │
│ │ • Quick exec    │ │ • Configuration │ │ • History        │    │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                │
│ ┌─────────────────┐                                            │
│ │     /tasks      │     ┌─────────────────────────────────┐    │
│ │                 │     │       Shared Components         │    │
│ │ • Assignment    │     │ • Zustand Store                 │    │
│ │ • Workflow      │     │ • Agent CRUD Panel              │    │
│ │ • Priorities    │     │ • Real-time Monitor             │    │
│ └─────────────────┘     └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

Node roles:
- cleo-supervisor: emits guidance and coordinates delegations
- router: content-aware routing to the best-fit agent
- specialist/runtime agent: executes the task (technical, creative, logical, or user-defined)
- finalize: synthesizes the final response and completes execution

The graph is automatically rebuilt whenever new runtime agents are registered so they can be routed immediately.

---

## 🎯 Key components

### Backend

Orchestrator (`lib/agents/agent-orchestrator.ts`)
- Builds the LangGraph with nodes and conditional edges
- Stores agent configurations and instances
- Executes requests and tracks execution state, steps, and metrics
- Provides API-safe methods for runtime registration and graph rebuilds

Built-in agents (`lib/agents/config.ts`)
- `cleo-supervisor` (role: supervisor) — emotional intelligence coordinator with task delegation
- `toby-technical` (role: specialist) — technical analysis and data processing specialist  
- `ami-creative` (role: specialist) — creative content and design specialist
- `peter-logical` (role: specialist) — logical and mathematical problem-solving specialist
- `emma-ecommerce` (role: specialist) — e-commerce and Shopify management specialist
- All agents include descriptive prompts and tags used by the router
- Emma includes Shopify tools and per-user credential management

Runtime agents (created from the UI)
- Registered via `POST /api/agents/register`
- Added to `agentConfigs` and `agents`, then the graph is rebuilt
- Considered immediately for routing decisions

### Frontend (v2.0)

Client store (`lib/agents/client-store.ts`)
- Centralized Zustand store
- Tracks executions, metrics, graph view, and live delegation events
- Auto-sync with backend
- Manages agents, conversations, and tasks

Premium UI modules

1) Landing Hub (`/agents`)
   - Navigation cards with live statistics
   - Quick actions (create agent, view architecture, start chat)
   - Glassmorphism with gradients and motion

2) Architecture (`/agents/architecture`)
   - Interactive graph (D3/React Flow style)
   - Real-time execution monitor
   - Built-in quick execute panel
   - Performance metrics and agent states

3) Manage (`/agents/manage`)
   - Full agent CRUD (create, read, update, delete)
   - Detailed agent statistics
   - Advanced configuration (model, temperature, tools, prompts)
   - Empty states and validation

4) Chat (`/agents/chat`)
   - Premium chat with agent selection
   - Real-time conversations
   - Persistent message history
   - Avatars and agent-themed UI

5) Tasks (`/agents/tasks`)
   - Workflow: todo → doing → review → done
   - Assign tasks to specific agents
   - Filters by status, priority, date
   - Progress statistics and metrics

Shared components
- AgentCRUDPanel — reusable CRUD panel
- RealTimeExecutionMonitor — live execution monitor
- AgentGraph — interactive graph visualization
- DelegationTracker — live routing decision log

---
API endpoints
- `POST /api/agents/execute` — start a new execution (supervisor-led by default)
- `GET /api/agents/execution/[id]` — poll for execution state and messages
- `POST /api/agents/register` — register a runtime agent and rebuild the graph
- `GET /api/agents/sync` — sync full server-client agent list
- `POST /api/agents/cleanup` — remove runtime agents (testing only)

---

## 🎨 Premium UI (v2.0)

UI/UX highlights

Design system
- Glassmorphism with blur and translucency
- Dynamic gradients per module/state
- Smooth motion via Framer Motion
- Mobile-first responsive layout
- Dark/Light mode support
- Phosphor Icons for modern, consistent iconography

Modular architecture
- Next.js App Router: dynamic routes under `/agents/*`
- Decoupled components per module
- Centralized state: Zustand as single source of truth
- Strict TypeScript across the app

Implemented modules

1) Landing Hub (`/agents`)
```typescript
// Implemented features
// - 4 navigation cards with hover effects
// - Live stats (agents, executions)
// - Quick actions (create, architecture, chat)
// - Per-module custom gradients
// - Staggered animations with Framer Motion
```

2) Architecture (`/agents/architecture`)
```typescript
// Implemented features
// - Interactive D3-style graph
// - Real-time execution monitor
// - Integrated quick execute panel
// - Visual performance metrics
// - Single monitor instance (fixed duplication)
```

3) Manage (`/agents/manage`)
```typescript
// Implemented features
// - Reusable full CRUD panel
// - Agent stats (total, active, etc.)
// - Empty states with CTAs
// - Zustand store integration
// - Form validation
```

4) Chat (`/agents/chat`)
```typescript
// Implemented features
// - Sidebar with available agents
// - Premium chat UI with avatars
// - Simulated real-time messages
// - Auto-scroll and loading states
// - Dynamic agent selection
```

5) Tasks (`/agents/tasks`)
```typescript
// Implemented features
// - Complete workflow system
// - States: pending → in-progress → completed → paused
// - Filters by state, priority, agent
// - Visual stats (metric cards)
// - Task creation modal
// - Assignment to specific agents
```

UI technologies

```json
{
  "framework": "Next.js 14 (App Router)",
  "ui_library": "React 18 + TypeScript",
  "styling": "Tailwind CSS + Custom Components",
  "animations": "Framer Motion",
  "icons": "Phosphor Icons React",
  "state": "Zustand",
  "components": "ShadCN UI (custom)",
  "forms": "React Hook Form + Zod (future)",
  "routing": "Next.js App Router dynamic routes"
}
```

---

## 🗄️ Database implementation (planned)

### Multi-agent schema

#### Table `agents` (persistent agents)
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Agent configuration
    name VARCHAR(100) NOT NULL,
    description TEXT,
    role VARCHAR(50) NOT NULL, -- supervisor, specialist, custom
    objective TEXT,
    prompt TEXT NOT NULL,
    
  -- Model configuration
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4000,
    
  -- Metadata
  color VARCHAR(7) DEFAULT '#6B7280', -- hex color
    icon VARCHAR(50) DEFAULT 'robot',
    tags JSONB DEFAULT '[]'::jsonb,
    tools JSONB DEFAULT '[]'::jsonb,
    
  -- Status & control
  status VARCHAR(20) DEFAULT 'active', -- active, paused, archived
    is_runtime BOOLEAN DEFAULT false,
    
  -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    
  -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('supervisor', 'specialist', 'custom')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'archived'))
);

-- Indexes for performance
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_role ON agents(role);
CREATE INDEX idx_agents_is_runtime ON agents(is_runtime);

-- GIN index for tag search
CREATE INDEX idx_agents_tags ON agents USING GIN (tags);
```

#### Table `agent_executions` (execution history)
```sql
CREATE TABLE agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
  -- Agent relations
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
  -- Input/Output
    input_message TEXT NOT NULL,
    output_message TEXT,
    
  -- Execution metadata
    status VARCHAR(20) DEFAULT 'pending',
    routing_reason TEXT,
    routing_score INTEGER DEFAULT 0,
    
  -- Metrics
    execution_time_ms INTEGER,
    token_usage JSONB DEFAULT '{}'::jsonb,
    cost_estimate DECIMAL(10,6),
    
  -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
  -- Constraints
    CONSTRAINT valid_execution_status CHECK (
        status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
    )
);

-- Indexes
CREATE INDEX idx_executions_user_id ON agent_executions(user_id);
CREATE INDEX idx_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX idx_executions_status ON agent_executions(status);
CREATE INDEX idx_executions_started_at ON agent_executions(started_at);
```

#### Table `agent_conversations` (persistent chat)
```sql
CREATE TABLE agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
  -- Conversation metadata
    title VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    
  -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    
  -- Message
    type VARCHAR(20) NOT NULL, -- user, agent, system
    content TEXT NOT NULL,
    
  -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
  -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table `agent_tasks` (task management)
```sql
CREATE TABLE agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
  -- Assignment
    assigned_to UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
  -- Task content  
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
  -- Status & priority
    status VARCHAR(20) DEFAULT 'todo',
    priority VARCHAR(10) DEFAULT 'medium',
    
  -- Scheduling
    due_date TIMESTAMPTZ,
    estimated_hours DECIMAL(5,2),
    
  -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    feature VARCHAR(100),
    
  -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
  -- Constraints
    CONSTRAINT valid_task_status CHECK (
        status IN ('todo', 'doing', 'review', 'done', 'paused', 'cancelled')
    ),
    CONSTRAINT valid_task_priority CHECK (
        priority IN ('low', 'medium', 'high', 'urgent')
    )
);
```

### Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- Per-user access policies
CREATE POLICY agents_user_access ON agents
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY executions_user_access ON agent_executions  
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY conversations_user_access ON agent_conversations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY messages_user_access ON conversation_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM agent_conversations 
            WHERE id = conversation_id AND user_id = auth.uid()
        )
    );

CREATE POLICY tasks_user_access ON agent_tasks
    FOR ALL USING (auth.uid() = user_id);
```

### Database functions

#### Agent utilities
```sql
-- List agents with metrics
CREATE OR REPLACE FUNCTION get_agents_with_metrics(p_user_id UUID)
RETURNS TABLE (
    agent_id UUID,
    name VARCHAR,
    description TEXT,
    role VARCHAR,
    status VARCHAR,
    execution_count BIGINT,
    avg_execution_time NUMERIC,
    last_used TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.role,
        a.status,
        COUNT(e.id) as execution_count,
        AVG(e.execution_time_ms) as avg_execution_time,
        MAX(e.started_at) as last_used
    FROM agents a
    LEFT JOIN agent_executions e ON a.id = e.agent_id AND e.user_id = p_user_id
    WHERE a.user_id = p_user_id AND a.status = 'active'
    GROUP BY a.id, a.name, a.description, a.role, a.status
    ORDER BY last_used DESC NULLS LAST;
END;
$$;
```

#### Chat utilities
```sql
-- Get a conversation with messages
CREATE OR REPLACE FUNCTION get_conversation_with_messages(
    p_conversation_id UUID,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    conversation_id UUID,
    conversation_title VARCHAR,
    message_id UUID,
    message_type VARCHAR,
    content TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER  
AS $$
BEGIN
  -- Verify user access
    IF NOT EXISTS (
        SELECT 1 FROM agent_conversations 
        WHERE id = p_conversation_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Access denied or conversation not found';
    END IF;
    
  RETURN QUERY
    SELECT 
        c.id as conversation_id,
        c.title as conversation_title,
        m.id as message_id,
        m.type as message_type,
        m.content,
        m.created_at
    FROM agent_conversations c
    LEFT JOIN conversation_messages m ON c.id = m.conversation_id
    WHERE c.id = p_conversation_id
    ORDER BY m.created_at ASC
    LIMIT p_limit;
END;
$$;
```

### Supabase migrations

#### Base agents migration
```sql
-- File: supabase/migrations/20250903000001_create_agents_system.sql

-- Create agent tables
-- [Use SQL from sections above]

-- Insert default (built-in) agents
-- INSERT INTO agents (id, user_id, name, description, role, objective, model, color, icon, tags, tools, is_runtime) VALUES (...)
-- These can be created per-user automatically or used as global templates
```

### API endpoints for DB (planned)

```typescript
// New endpoints for database-backed integration
POST /api/agents/create     // Create persistent agent
PUT  /api/agents/[id]       // Update agent
GET  /api/agents/metrics    // Aggregated metrics
POST /api/conversations/create  // New conversation
GET  /api/conversations/[id]    // Chat history
POST /api/tasks/create      // Create task
PUT  /api/tasks/[id]        // Update task
GET  /api/tasks/stats       // Task statistics
```

### Migration plan from current state to DB

Migration phases
1. Phase 1: Create DB schema and basic functions
2. Phase 2: Move Zustand store to use DB endpoints
3. Phase 3: Persist conversations
4. Phase 4: Full DB-backed task system
5. Phase 5: Advanced metrics and analytics

Compatibility
- The current Zustand store remains as the abstraction layer
- UI components require minimal changes
- Gradual migration with no downtime

---

## ⚡ Execution lifecycle

### Backend flow (LangGraph)

1. Start: client calls `POST /api/agents/execute` with input message (and optional `agentId`)
2. Create: orchestrator creates an `execution` record and starts the LangGraph
3. Supervise: `cleo-supervisor` emits coordination intent; router receives the last message
4. Route: router scores candidates and chooses the best-fit agent (see algorithm below)
5. Execute: the chosen agent runs (tools, reasoning, generation)
6. Finalize: the `finalize` node synthesizes the result and completes execution
7. Poll: client polls `GET /api/agents/execution/[id]` for updates until completion

Explicit targeting: if a user requests a specific agent (via `agentId` or message metadata), the router honors it when present and valid.

### Frontend flow (UI modules)

#### Architecture module
```
User → Quick Execute → API Call → Real-time Monitor → Results
       ↓
   Graph Visualization ← Live Updates ← Execution Status
```

#### Chat module  
```
User → Select Agent → Send Message → Conversation Store → UI Update
      ↓
  Message History ← Real-time Response ← Agent Execution
```

#### Tasks module
```
User → Create Task → Assign Agent → Status Workflow → Completion
      ↓  
  Progress Tracking ← Status Updates ← Task Execution
```

---

## 🎯 Routing and delegation scoring

Cleo uses a deterministic, explainable scoring process:

### Scoring algorithm

Inputs
- Latest user message content (string)
- Agent configurations: name, description, objective, and especially `tags`

Normalization
- Lowercase and remove diacritics (NFD)
- Tokenize on non-alphanumerics, keep tokens with length ≥ 3

Scoring
- For each candidate (all non-supervisor agents):
  - Base score: +1 per token found in the agent’s combined text: `objective + name + description + tags`
  - Tag boost: +2 for any exact tag present in the token set
- The highest-scoring agent is selected if `score > 0`
- If no agent scores > 0, the router returns `finalize`

Overrides & safeguards
- A specifically requested agent is honored if valid
- The router avoids routing to `cleo-supervisor`

Observability
- Logs show: candidate list, normalized message, per-agent scores, and selection
- UI event `agent-delegation` with `{ from, to, reason, query, timestamp }`

### Routing design advantages

✅ Predictable and tunable (adjust tags/boosts easily)
✅ Transparent (scores visible in logs)
✅ Extensible (runtime agents participate immediately)
✅ Explainable (clear reasons for each decision)

---

## Runtime agent registration

Users can add new agents visually via the Agent Creator form. Behind the scenes:

1. The UI posts the agent config to `POST /api/agents/register`.
2. Orchestrator stores the config and constructs a corresponding agent instance.
3. The LangGraph is rebuilt with fresh conditional edges that include the new agent.
4. Router automatically considers the new agent in its scoring on subsequent requests.

Guidelines for effective runtime agents
- Provide a concise `name` and `description` with likely user tokens.
- Define a strong set of `tags` (3–12) that match real user vocabulary.
- Keep prompts scoped to the agent’s domain with relevant tools.

Agent states (with DB)
- active: available for normal routing
- paused: temporarily disabled, excluded from routing
- archived: kept for history, not used

---

## 📊 UI instrumentation and observability

Delegation events
- Server-side: the router emits `CustomEvent('agent-delegation', { detail: { from, to, reason, query, timestamp } })`
- Client-side: the client store listens to `agent-delegation` and appends to `delegationEvents`
- UI: `DelegationTracker` shows a live log of routing decisions

Execution polling
- Real-time updates: client polls `/api/agents/execution/[id]` every second while running
- Progress visibility: minimal metrics and step data for progress visibility
- Live monitoring: `RealTimeExecutionMonitor` provides visual updates

Logging system
- Routing logs: look for `Scoring X candidate agents`, per-agent `scored N`, and `Selected best match`
- Registration logs: `Graph rebuilt to include runtime agent: <id>`
- Execution logs: start, progress, and completion tracking

UI metrics (v2.0)

Dashboard metrics
- Active agents total
- Completed executions
- Average response time
- Most used agents
- Routing patterns

Per-agent metrics
- Execution count
- Average execution time
- Success rate
- Last used timestamp

---

## How to influence routing

- Tune tags on built-in agents
  - Built-ins ship with sensible tags (e.g., technical, creative, logical). You can add or refine tags in `lib/agents/config.ts`.

- Create a more specific runtime agent
  - If two agents overlap, the one with more precise `tags` and description often wins.
  - Example: for queries like “Second War in Warcraft,” a runtime agent with tags `["warcraft", "wow", "lore", "second war"]` will win against a generic technical agent.

- Use explicit targeting (when needed)
  - Pass `agentId` to `/api/agents/execute` or include metadata `requested_agent_id` in the message to force routing to a specific agent.

---

## Advantages of this design

- Dynamic extensibility: add new agents at runtime; no redeploy required.
- Explainable routing: simple token/tag scoring with clear logs.
- Robust defaults: safe `finalize` fallback when no agent fits.
- Separation of concerns: supervisor coordinates; specialists execute.
- Developer ergonomics: TypeScript, Next.js app router, and a small, inspectable codebase.

---

## Technology stack

- Framework: Next.js (App Router) + React + TypeScript
- State management: Zustand (client store)
- Orchestration: LangChain + LangGraph
- UI: ShadCN UI components, Tailwind CSS (via project setup)
- Package manager: pnpm
- Model providers: provider-agnostic wiring (see `lib/providers` / `lib/openproviders`), configurable models per agent
- Optional integrations: search/RAG tooling in `lib/tools` and `lib/rag` (dependent on project config)

---

## State management in test mode (no database)

In the current test environment, runtime agents are kept without a database. Instead, the system uses in-memory state and a lightweight sync protocol so the UI and server stay consistent.

- Where agents live
  - Server: The orchestrator holds two in-memory maps: `agentConfigs` and `agents`. The orchestrator instance is reused across requests (global process scope), so registered agents persist while the server stays running.
  - Client: The React graph view uses a client-side store that merges built-in agents with runtime agents fetched from the server.

- Runtime agent identity
  - IDs follow the pattern `custom_\d+` (e.g., `custom_1756441115596`).
  - This pattern is used to detect runtime agents for syncing and cleanup.

- Sync protocol (client ↔ server)
  - Endpoint: `GET /api/agents/sync`
    - Returns the full list of agents currently known by the server orchestrator (built-ins + runtime).
  - Client store: `lib/agents/client-store.ts`
    - `initializeAgents()` loads built-ins, then calls `syncAgents()`.
    - `syncAgents()` fetches `/api/agents/sync`, filters runtime agents by `^custom_\d+$`, merges with built-ins, and updates the graph nodes/edges.
  - Agents page: `app/agents/components/AgentsPageContent.tsx`
    - Calls `initializeAgents()` on mount so runtime agents appear in the graph after refresh.
  - Provides a “Refresh” button that calls `syncAgents()` on demand.

- Cleanup (remove runtime agents only)
  - Endpoint: `POST /api/agents/cleanup`
    - Removes only runtime agents (IDs matching `^custom_\d+$`) via `orchestrator.removeRuntimeAgent()` and rebuilds the graph server-side.
  - UI: In the “Multi-Agent Architecture Graph” header, the “Clean Agents” button calls this endpoint and then re-syncs the graph. Built-in agents remain intact.
  - Auto-expiry: The orchestrator includes a safety cleanup that can remove old runtime agents (~30 min) based on the timestamp embedded in the ID.

- What this means for users (test mode)
  - Agents you create at runtime persist across page reloads (no DB), as long as the server process stays alive.
  - After a refresh, the graph shows runtime agents once the client re-syncs with the server (automatically on mount, or via the “Refresh” button).
  - You can remove your created runtime agents using the “Clean Agents” button; the graph updates immediately after sync.
  - Scope is global to the running server process (not per-user) and meant for testing. For multi-tenant persistence, add a database-backed store.

Tip: Logs will show “Reusing orchestrator from globalThis”, “Available agent configs/instances…”, and routing scores. This helps verify that runtime agents are registered, synced to the client, and considered by the router.

---

## Common scenarios and tests

- Route to Technical (Toby)
  - Query: “Explain the Second War in Warcraft history.”
  - Expect: Toby wins due to tags like `history`, `war`, `second` (or a more specific runtime agent if present).

- Route to Creative (Ami)
  - Query: “Help me design a creative layout for my blog.”
  - Expect: Ami wins due to `design`, `creative`, `content`.

- Route to Logical (Peter)
  - Query: “Solve 2x + 5 = 15 and explain the steps.”
  - Expect: Peter wins due to `mathematics`, `problem`, `calculation`.

- Route to a runtime agent
  - Create an agent with tags `["warcraft", "wow", "lore", "second war"]`.
  - Query: “Explain the Second War in Warcraft.”
  - Expect: The runtime agent wins over a generic technical agent.

---

## Troubleshooting

- “Supervisor always delegates to the same agent”
  - Ensure agents (especially built-ins) have strong, relevant `tags` in `lib/agents/config.ts`.
  - Check logs for `Scoring N candidate agents` and per-agent `scored` lines.
  - Verify the new agent is in `Available agent configs/instances` and appears in the candidates list.

- “My runtime agent doesn’t get called”
  - Confirm `/api/agents/register` returned 200 and logs show `Graph rebuilt …`.
  - Ensure its `tags` overlap with the expected user tokens.
  - Try a test query that matches tags exactly.

- “I want to force a specific agent”
  - Pass `agentId` to `/api/agents/execute` or add `requested_agent_id` metadata to the message.

---

## Where to look in the code

- Router and scoring: `lib/agents/agent-orchestrator.ts` (router node + conditional edges)
- Built-in agent configs: `lib/agents/config.ts`
- Client store and events: `lib/agents/client-store.ts`
- Delegation UI: `components/agents/delegation-tracker.tsx`
- API routes: `app/api/agents/execute`, `app/api/agents/execution/[id]`, `app/api/agents/register`

---

## Glossary

- Agent: A configured LLM persona with prompt, tools, and tags.
- Runtime agent: An agent registered while the app is running via the UI/API.
- Routing/Delegation: The process of selecting which agent should handle a given input.
- Finalize: LangGraph node that synthesizes the final response.

---

## Summary

Cleo’s multi-agent system uses a small, dynamic graph where a supervisor delegates tasks to the best-suited agent via an explainable token/tag scoring algorithm. Users can create agents at runtime, participate in routing immediately, and observe decisions live in the UI and logs. The design balances simplicity, transparency, and extensibility.
