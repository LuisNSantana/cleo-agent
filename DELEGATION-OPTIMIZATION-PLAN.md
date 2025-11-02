# 🎯 Plan de Optimización del Sistema de Delegación
**Basado en análisis de LangGraph, LangChain y AgentStack**

---

## 🔍 Hallazgos Críticos

### 1️⃣ **Task Description Pattern (LangGraph)**
**Problema actual**: Cleo recibe hint pero agente delegado recibe historial completo sin contexto específico de tarea.

**LangGraph solution** (Multi-agent supervisor tutorial):
```python
def create_task_description_handoff_tool(agent_name: str):
    @tool
    def handoff_tool(
        task_description: Annotated[str, "Description of what the next agent should do"],
        state: Annotated[MessagesState, InjectedState],
    ) -> Command:
        task_description_message = {"role": "user", "content": task_description}
        agent_input = {**state, "messages": [task_description_message]}
        return Command(goto=agent_name, update=agent_input)
```

**Beneficios**:
- ✅ Agente delegado recibe instrucción clara y específica
- ✅ Reduce contaminación de contexto histórico
- ✅ Supervisor formula tarea explícitamente

---

### 2️⃣ **Middleware Pattern (LangChain v1)**
**Problema actual**: Lógica de delegación mezclada en route.ts y prompt.ts.

**LangChain middleware pattern**:
```python
class DelegationMiddleware(AgentMiddleware):
    def before_model(self, state: AgentState, runtime: Runtime):
        # Análisis de delegación ANTES de llamada al modelo
        decision = analyze_delegation(state['messages'])
        if decision.should_delegate:
            return {
                'delegation_hint': decision.hint,
                'suggested_agent': decision.target_agent
            }
        return None
```

**Beneficios**:
- ✅ Separación de concerns (análisis vs ejecución)
- ✅ Testeable independientemente
- ✅ Reutilizable entre modelos

---

### 3️⃣ **Router Pattern con Early Exit (LangGraph)**
**Problema actual**: Siempre ejecutas 3 capas incluso si hay match obvio.

**LangGraph router pattern**:
```typescript
function makeRouter(members: string[]) {
  return (state: MessagesState) => {
    // Early exit si hay mención explícita
    if (state.messages.last.includes('@jenn')) {
      return new Command({ goto: 'jenn-community' })
    }
    
    // LLM decision solo si no hay early exit
    const response = model.invoke(state)
    return new Command({ goto: response.nextAgent })
  }
}
```

**Beneficios**:
- ✅ Reduce latencia (skip modelo si match obvio)
- ✅ Reduce costos API
- ✅ Más determinista

---

### 4️⃣ **Agent Specialization (AgentStack)**
**Problema actual**: Agentes con múltiples responsabilidades.

**AgentStack pattern**:
```python
@agent
def researcher(self) -> Agent:
    return Agent(
        config={
            'role': 'Research Specialist',
            'goal': 'ONLY research tasks',  # ✅ Especialización clara
            'backstory': 'You DO NOT do math or code',
        },
        tools=[web_search],  # ✅ Tools específicos
        verbose=True
    )
```

**Beneficios**:
- ✅ Menos confusión de roles
- ✅ Mejor performance por especialización
- ✅ Más fácil debugging

---

### 5️⃣ **Hierarchical Supervisors (LangGraph)**
**Problema actual**: Cleo maneja todos los agentes (8+) directamente.

**LangGraph hierarchical pattern**:
```typescript
// Top-level supervisor
const topSupervisor = (state) => {
  if (isContentCreation(state)) return 'content-team'
  if (isDataAnalysis(state)) return 'analytics-team'
  return '__end__'
}

// Team supervisors
const contentTeamSupervisor = (state) => {
  if (needsTwitter(state)) return 'jenn-community'
  if (needsCalendar(state)) return 'ami-creative'
  return 'team-supervisor'
}
```

**Beneficios**:
- ✅ Escalabilidad (add teams, not agents to Cleo)
- ✅ Reduce decisiones complejas
- ✅ Mejor organización

---

### 6️⃣ **Supervisor Prompt Engineering (LangGraph Tutorial)**
**Problema actual**: Cleo's system prompt genérico.

**LangGraph best practice**:
```python
supervisor_prompt = """
You are a supervisor managing agents:
- Research agent: ONLY assign research tasks
- Math agent: ONLY assign math tasks

RULES:
1. Assign work to ONE agent at a time
2. DO NOT call agents in parallel
3. DO NOT do work yourself
4. After agent responds, decide: continue or finish
"""
```

**Beneficios**:
- ✅ Instrucciones claras y restrictivas
- ✅ Evita alucinaciones de herramientas
- ✅ Mejores decisiones de delegación

---

### 7️⃣ **Observability with Checkpoints (LangGraph)**
**Problema actual**: Tienes OpenTelemetry pero no aprovechas checkpointing.

**LangGraph checkpoint pattern**:
```typescript
const supervisor = graph.compile({
  checkpointer: new PostgresSaver(pool),  // ✅ Estado persistente
})

// Debugging
const state = await supervisor.getState(config)
console.log('Current agent:', state.values.next)
console.log('Message history:', state.values.messages)
```

**Beneficios**:
- ✅ Estado sobrevive crashes
- ✅ Debugging granular
- ✅ Replay de delegaciones fallidas

---

### 8️⃣ **Context Window Management (LangChain Middleware)**
**Problema actual**: Reduces a 10 mensajes, pero no smart partitioning.

**LangChain summarization middleware**:
```python
class SummarizationMiddleware:
    def before_model(self, state):
        if token_count(state['messages']) > max_tokens:
            old_messages, recent_messages = partition_messages(state['messages'])
            summary = model.summarize(old_messages)
            return {'messages': [summary] + recent_messages}
```

**Beneficios**:
- ✅ Mantiene contexto relevante
- ✅ Reduce tokens sin perder información
- ✅ Preserva pares AI/Tool

---

## 🛠️ Plan de Implementación

### **Fase 1: Quick Wins (Hoy)** ⚡
1. ✅ **Task Description Pattern**
   - Modificar `delegate_to_*` tools para aceptar `taskDescription`
   - Pasar task description explícita en lugar de historial completo
   
2. ✅ **Early Exit Router**
   - Agregar fast-path en `makeDelegationDecision` para menciones explícitas
   - Skip modelo si score > 0.95
   
3. ✅ **Supervisor Prompt Refinement**
   - Actualizar Cleo's system prompt con reglas restrictivas
   - Enfatizar "ONE agent at a time, DO NOT work yourself"

### **Fase 2: Architecture Refactor (Esta semana)** 🏗️
4. ✅ **Delegation Middleware**
   - Crear `lib/agents/middleware/delegation-middleware.ts`
   - Extraer lógica de route.ts a middleware reutilizable
   
5. ✅ **Hierarchical Supervisors**
   - Crear teams: `content-team` (Jenn, Toby), `productivity-team` (Ami, Nora)
   - Top supervisor delega a team supervisors
   
6. ✅ **Context Summarization**
   - Implementar LangChain-style partition + summarization
   - Preservar pares AI/Tool completos

### **Fase 3: Advanced Optimization (Próxima semana)** 🚀
7. ✅ **Checkpoint Integration**
   - Usar existing checkpointing para replay de delegaciones
   - Dashboard con delegation decision history
   
8. ✅ **Agent Specialization Review**
   - Refinar roles/goals de cada agente
   - Reducir overlap de responsabilidades
   
9. ✅ **Parallel Delegation (opcional)**
   - LangGraph's `Send` API para tasks independientes
   - Example: Jenn publica + Ami crea evento simultáneamente

---

## 📊 Métricas de Éxito

### **Before Optimization**:
- ❌ Delegation accuracy: ~60% (confunde Telegram/Email)
- ❌ Context contamination: 53 mensajes históricos
- ❌ Latencia: 3+ segundos (3 capas siempre)
- ❌ Hallucinations: Tools inexistentes ejecutados

### **After Optimization Target**:
- ✅ Delegation accuracy: >95%
- ✅ Context: 10 mensajes + summary
- ✅ Latencia: <1 segundo (early exit)
- ✅ Hallucinations: 0 (supervisor no ejecuta tools)

---

## 🔗 Referencias

- **LangGraph Multi-Agent Tutorial**: `docs/tutorials/multi_agent/agent_supervisor.md`
- **LangChain Middleware**: `libs/langchain_v1/langchain/agents/middleware/`
- **AgentStack Patterns**: `agentstack/frameworks/`

---

## 🎯 Prioridad Inmediata

**Empezar con Fase 1 Task Description Pattern** porque:
1. ✅ Soluciona el 80% del problema actual
2. ✅ Bajo riesgo (no cambia arquitectura)
3. ✅ Testeable en <1 hora
4. ✅ Compatible con observability existente

**Next steps**:
1. Modificar `lib/tools/delegation/` para aceptar `taskDescription` parameter
2. Actualizar `makeDelegationDecision` para generar task description
3. Pasar task description en tool call: `delegate_to_jenn_community({ taskDescription: "Publica 'test' en @cleo_test" })`
4. Test con prompt limpio y verificar logs

---

**¿Empezamos con Task Description Pattern?**
