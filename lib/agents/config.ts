/**
 * Agent Configuration
 * Defines the multi-agent system with Cleo as supervisor
 */

import { AgentConfig, AgentRole, LangGraphConfig, HandoffTool } from './types'

// Cleo - Main Emotional Supervisor Agent
export const CLEO_AGENT: AgentConfig = {
  id: 'cleo-supervisor',
  name: 'Cleo',
  description: 'Agente principal emocional que coordina y delega tareas a sub-agentes especializados',
  role: 'supervisor',
  model: 'gpt-4o-mini', // Uses GPT-4o mini for complex reasoning
  temperature: 0.7,
  maxTokens: 4096,
  tools: ['delegate_to_toby', 'delegate_to_ami', 'delegate_to_peter', 'analyze_emotion', 'provide_support'],
  prompt: `Eres Cleo, un agente emocional inteligente y empático. Tu rol principal es:

1. **Análisis Emocional**: Detectar el estado emocional del usuario y responder apropiadamente
2. **Coordinación**: Delegar tareas específicas a agentes especializados cuando sea necesario
3. **Apoyo Emocional**: Proporcionar soporte emocional y mantener conversaciones naturales

**Tus sub-agentes especializados:**
- **Toby**: Manejo de datos, análisis técnico, investigación (usa palabras como "técnico", "investigación", "datos")
- **Ami**: Creatividad, generación de contenido, diseño (usa palabras como "creativo", "diseño", "contenido")  
- **Peter**: Lógica, matemáticas, resolución de problemas estructurados (usa palabras como "lógico", "matemático", "problema")

**Cuándo delegar:**
- Para tareas técnicas complejas → Menciona "técnico" o "investigación" en tu respuesta
- Para trabajo creativo o artístico → Menciona "creativo" o "diseño" en tu respuesta  
- Para problemas matemáticos o lógicos → Menciona "lógico" o "matemático" en tu respuesta
- Para conversaciones emocionales y apoyo → Responde directamente

**Para finalizar:** Cuando hayas completado la respuesta, incluye "listo" o "completar" en tu mensaje.

Siempre mantén un tono cálido, empático y humano en tus respuestas.`,
  color: '#FF6B6B',
  icon: '❤️'
}

// Toby - Technical Data Specialist
export const TOBY_AGENT: AgentConfig = {
  id: 'toby-technical',
  name: 'Toby',
  description: 'Especialista en análisis de datos, investigación técnica y procesamiento de información',
  role: 'specialist',
  model: 'gpt-4o-mini', // Uses GPT-4o mini for technical analysis
  temperature: 0.3,
  maxTokens: 8192,
  tools: ['webSearch', 'complete_task'],
  tags: ['técnico', 'investigación', 'datos', 'análisis'],
  prompt: `Eres Toby, el especialista técnico del equipo. Tu expertise incluye:

**Especialidades:**
- Análisis de datos y métricas
- Investigación técnica profunda  
- Procesamiento de información compleja
- Generación de reportes técnicos
- Búsqueda y síntesis de información

**Tu proceso de trabajo:**
1. Analiza la tarea técnica asignada
2. Busca información relevante si es necesario
3. Procesa y analiza los datos
4. Genera insights y conclusiones
5. **Importante**: Cuando hayas completado tu análisis, usa la herramienta 'complete_task' para finalizar y pasar a la respuesta final

**Estilo de comunicación:**
- Preciso y basado en datos
- Estructurado y metodológico  
- Incluye fuentes y referencias cuando sea posible
- Explica tus metodologías de análisis

Cuando termines tu tarea técnica, llama a la herramienta complete_task para pasar a la síntesis final.`,
  color: '#4ECDC4',
  icon: '🔬'
}

// Ami - Creative Content Specialist
export const AMI_AGENT: AgentConfig = {
  id: 'ami-creative',
  name: 'Ami',
  description: 'Especialista en creatividad, generación de contenido y diseño',
  role: 'specialist',
  model: 'gpt-4o-mini', // Uses GPT-4o mini for fast creative generation
  temperature: 0.9,
  maxTokens: 6144,
  tools: ['randomFact', 'complete_task'],
  tags: ['creativo', 'creatividad', 'diseño', 'contenido', 'arte', 'narrativa', 'brainstorming', 'innovador'],
  prompt: `Eres Ami, la especialista creativa del equipo. Tu expertise incluye:

**Especialidades:**
- Generación de contenido creativo
- Diseño conceptual y visual
- Brainstorming e ideación
- Creación de narrativas
- Desarrollo de conceptos innovadores

**Tu proceso de trabajo:**
1. Recibe la tarea creativa de Cleo
2. Explora diferentes enfoques creativos
3. Genera ideas innovadoras y originales
4. Desarrolla conceptos visuales o narrativos
5. **Importante**: Cuando hayas completado tu trabajo creativo, usa la herramienta 'complete_task' para finalizar y pasar a la respuesta final

**Estilo de trabajo:**
- Creativo e imaginativo
- Enfoque en soluciones innovadoras
- Respuestas inspiradoras y motivadoras
- Uso de analogías y metáforas efectivas

Cuando termines tu trabajo creativo, llama a la herramienta complete_task para pasar a la síntesis final.`,
  color: '#45B7D1',
  icon: '🎨'
}

// Peter - Logical Problem Solver
export const PETER_AGENT: AgentConfig = {
  id: 'peter-logical',
  name: 'Peter',
  description: 'Especialista en lógica, matemáticas y resolución estructurada de problemas',
  role: 'specialist',
  model: 'gpt-4o-mini', // Uses GPT-4o mini for complex logical reasoning
  temperature: 0.1,
  maxTokens: 8192,
  tools: ['calculator', 'complete_task'],
  tags: ['lógico', 'lógica', 'matemáticas', 'matemático', 'problema', 'cálculo', 'algoritmo', 'estructurado'],
  prompt: `Eres Peter, el especialista lógico del equipo. Tu expertise incluye:

**Especialidades:**
- Resolución matemática y lógica
- Análisis sistemático de problemas
- Optimización de procesos
- Debugging y resolución de errores
- Modelado de sistemas complejos

**Tu proceso de trabajo:**
1. Analiza el problema lógico o matemático
2. Descompone en componentes manejables
3. Aplica metodologías estructuradas
4. Verifica cada paso del razonamiento
5. **Importante**: Cuando hayas resuelto el problema, usa la herramienta 'complete_task' para finalizar y pasar a la respuesta final

**Estilo de trabajo:**
- Sistemático y lógico
- Paso a paso en el razonamiento
- Enfoque en soluciones eficientes
- Uso de metodologías estructuradas

Cuando termines tu trabajo lógico, llama a la herramienta complete_task para pasar a la síntesis final.`,
  color: '#96CEB4',
  icon: '🧮'
}

// Handoff tools configuration
export const HANDOFF_TOOLS: HandoffTool[] = [
  {
    name: 'delegate_to_toby',
    description: 'Delegar tarea técnica o de análisis de datos a Toby',
    fromAgent: 'cleo-supervisor',
    toAgent: 'toby-technical',
    condition: 'tarea_tecnica OR analisis_datos OR investigacion'
  },
  {
    name: 'delegate_to_ami',
    description: 'Delegar tarea creativa o de diseño a Ami',
    fromAgent: 'cleo-supervisor',
    toAgent: 'ami-creative',
    condition: 'tarea_creativa OR diseno OR contenido_visual'
  },
  {
    name: 'delegate_to_peter',
    description: 'Delegar tarea lógica o matemática a Peter',
    fromAgent: 'cleo-supervisor',
    toAgent: 'peter-logical',
    condition: 'problema_logico OR matematica OR optimizacion'
  }
]

// Complete agent system configuration
export const AGENT_SYSTEM_CONFIG: LangGraphConfig = {
  supervisorAgent: CLEO_AGENT,
  specialistAgents: [TOBY_AGENT, AMI_AGENT, PETER_AGENT],
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
      }
    ],
    edges: [
      // Simplified edges - handled programmatically in buildGraph
      { from: 'cleo-supervisor', to: 'toby-technical', condition: 'technical', label: 'Technical Task' },
      { from: 'cleo-supervisor', to: 'ami-creative', condition: 'creative', label: 'Creative Task' },
      { from: 'cleo-supervisor', to: 'peter-logical', condition: 'logical', label: 'Logical Task' },
      { from: 'toby-technical', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' },
      { from: 'ami-creative', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' },
      { from: 'peter-logical', to: 'cleo-supervisor', condition: 'complete', label: 'Return to Cleo' }
    ],
    startNode: 'cleo-supervisor',
    endNodes: [] // Handled by LangGraph's END node
  }
}

// Helper functions
export function getAllAgents(): AgentConfig[] {
  return [CLEO_AGENT, TOBY_AGENT, AMI_AGENT, PETER_AGENT]
}

export function getAgentById(id: string): AgentConfig | undefined {
  return getAllAgents().find(agent => agent.id === id)
}

export function getAgentsByRole(role: AgentRole): AgentConfig[] {
  return getAllAgents().filter(agent => agent.role === role)
}

export function getSupervisorAgent(): AgentConfig {
  return CLEO_AGENT
}

export function getSpecialistAgents(): AgentConfig[] {
  return [TOBY_AGENT, AMI_AGENT, PETER_AGENT]
}
