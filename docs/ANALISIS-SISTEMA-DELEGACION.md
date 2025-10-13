# Análisis del Sistema de Delegación de Agentes - Cleo Platform

**Fecha:** 13 de Octubre de 2025  
**Autor:** Análisis del Sistema  
**Estado:** Identificación de Problemas Críticos

---

## 🎯 Resumen Ejecutivo

El sistema de delegación de Cleo **NO está reconociendo correctamente los agentes y sub-agentes creados recientemente**. Existen múltiples problemas estructurales que impiden que Cleo pueda delegar tareas efectivamente a los nuevos agentes.

### Problemas Principales Identificados:

1. ❌ **Agentes predefinidos desconectados del sistema de delegación**
2. ❌ **Sub-agentes de Nora (Luna, Zara, Viktor) NO EXISTEN en el código**
3. ❌ **Desconexión entre heurísticas de intent y agentes disponibles**
4. ❌ **Sistema de discovery dinámico no está siendo utilizado**
5. ❌ **Tools de delegación no se generan automáticamente para nuevos agentes**

---

## 📊 Arquitectura Actual del Sistema

### 1. Flujo de Delegación (Como Debería Funcionar)

```
Usuario → Cleo → [Intent Heuristics] → [Agent Discovery] → [Tool Selection] → [Orchestrator] → Agente Especialista
```

### 2. Componentes Clave

#### A. **Intent Heuristics** (`lib/delegation/intent-heuristics.ts`)
- ✅ **Funciona:** Detecta intención mediante keywords
- ❌ **Problema:** Lista hardcodeada de agentes en `AGENT_KEYWORDS`
- ❌ **Problema:** NO incluye agentes nuevos automáticamente
- ❌ **Problema:** Sub-agentes de Nora (Luna, Zara, Viktor) referenciados pero NO EXISTEN

**Keywords actuales registrados:**
```typescript
const AGENT_KEYWORDS = {
  'ami-creative': [...],
  'notion-agent': [...],
  'peter-google': [...],
  'apu-support': [...],
  'emma-ecommerce': [...],
  'toby-technical': [...],
  'astra-email': [...],
  'nora-community': [...],
  'luna-content-creator': [...],      // ❌ NO EXISTE
  'zara-analytics-specialist': [...], // ❌ NO EXISTE
  'viktor-publishing-specialist': [...] // ❌ NO EXISTE
}
```

#### B. **Unified Agent Config** (`lib/agents/unified-config.ts` + `unified-config-server.ts`)
- ✅ **Funciona:** Routing client/server correcto
- ⚠️ **Limitación:** Retorna solo agentes predefinidos en cliente
- ✅ **Funciona:** En servidor combina predefinidos + DB

**Flujo actual:**
```typescript
// Server-side
getAllAgents(userId) 
  → Predefined Agents (ALL_PREDEFINED_AGENTS)
  → + Database Agents (via getAllAgentsForUser)
  → Returns combined list

// Client-side  
getAllAgents()
  → Solo retorna ALL_PREDEFINED_AGENTS
  → NO incluye agentes custom del usuario
```

#### C. **Agent Discovery Service** (`lib/agents/dynamic/agent-discovery.ts`)
- ✅ **Implementado:** Sistema completo de discovery
- ❌ **NO UTILIZADO:** No se integra en el flujo principal de chat
- ✅ **Funcionalidad:** Puede descubrir agentes de múltiples fuentes:
  - Predefined agents
  - Database agents
  - Runtime agents
  - Sub-agents

**Métodos disponibles pero NO usados:**
```typescript
- discoverAllAgents(userId)
- getDelegationTools(agentIds?)
- generateDelegationPrompt()
- refresh(userId)
```

#### D. **Tool Generation** (`lib/tools/index.ts` + `lib/tools/delegation.ts`)
- ✅ **Funciona:** `ensureDelegationToolForAgent()` crea tools dinámicamente
- ⚠️ **Parcial:** Solo se llama en `/api/chat/route.ts` al inicio
- ❌ **Problema:** No se actualiza dinámicamente durante la sesión

**Flujo en `/api/chat/route.ts` líneas 768-776:**
```typescript
try {
  const agents = await getAllAgentsUnified()
  for (const a of agents) {
    if (a.role !== 'supervisor') {
      ensureDelegationToolForAgent(a.id, a.name)
    }
  }
  toolsForRun = tools as typeof tools
} catch (e) {
  console.warn('[ChatAPI] Failed to ensure delegation tools', e)
}
```

**✅ ESTO FUNCIONA BIEN** - crea tools para todos los agentes disponibles.

#### E. **Sub-Agent Manager** (`lib/agents/core/sub-agent-manager.ts`)
- ✅ **Implementado:** Sistema completo de gestión de sub-agentes
- ✅ **Funcionalidad:** CRUD de sub-agentes en DB
- ✅ **Tool Creation:** Crea delegation tools automáticamente
- ❌ **PROBLEMA:** No se usa en el orquestador principal
- ❌ **PROBLEMA:** Sub-agentes en DB no tienen agentes predefinidos asociados

**Métodos disponibles:**
```typescript
- createSubAgent(config)
- getSubAgents(parentAgentId)
- getDelegationTools(parentAgentId)
- updateSubAgent(agentId, updates)
- deleteSubAgent(agentId)
```

---

## 🔍 Análisis Detallado de Problemas

### Problema #1: Sub-Agentes de Nora NO EXISTEN

**Documentación vs Realidad:**

📄 **`docs/nora-agent.md`** menciona:
- Luna — Content Creator
- Zara — Analytics & Trends  
- Viktor — Publishing & Scheduler

🔍 **Búsqueda en código:**
```bash
grep -r "luna\|zara\|viktor" lib/agents/predefined/
# Result: 0 matches
```

❌ **NO existen archivos:**
- `lib/agents/predefined/luna.ts`
- `lib/agents/predefined/zara.ts`
- `lib/agents/predefined/viktor.ts`

❌ **NO están en `ALL_PREDEFINED_AGENTS`:**
```typescript
// lib/agents/predefined/index.ts
export const ALL_PREDEFINED_AGENTS = [
  CLEO_AGENT,
  WEX_AGENT,
  TOBY_AGENT,
  AMI_AGENT,
  PETER_AGENT,
  EMMA_AGENT,
  APU_AGENT,
  ASTRA_AGENT,
  JUNGI_AGENT,
  INSIGHTS_AGENT,
  NOTION_AGENT,
  NORA_AGENT,
  // ❌ No Luna, Zara, Viktor
]
```

**Intent Heuristics los menciona pero no existen:**
```typescript
// lib/delegation/intent-heuristics.ts
const AGENT_KEYWORDS = {
  'luna-content-creator': [...],      // ❌ Agent inexistente
  'zara-analytics-specialist': [...], // ❌ Agent inexistente
  'viktor-publishing-specialist': [...] // ❌ Agent inexistente
}
```

### Problema #2: Sistema de Discovery NO está Integrado

**Agent Discovery Service existe pero NO se usa:**

```typescript
// ✅ EXISTE en lib/agents/dynamic/agent-discovery.ts
class AgentDiscoveryService {
  async discoverAllAgents(userId)
  getDelegationTools(agentIds?)
  generateDelegationPrompt()
}

// ❌ NO SE USA en app/api/chat/route.ts
// No hay imports ni llamadas a AgentDiscoveryService
```

**Consecuencia:**
- Nuevos agentes creados en DB no se detectan automáticamente
- No hay refresh automático de agentes disponibles
- Cache de agentes no se actualiza durante conversación

### Problema #3: Intent Heuristics Desactualizado

**Lista estática no refleja agentes reales:**

```typescript
// lib/delegation/intent-heuristics.ts
const AGENT_KEYWORDS: Record<string, Array<string | { k: string; w: number }>> = {
  'ami-creative': [...],        // ✅ Existe
  'notion-agent': [...],        // ✅ Existe
  'peter-google': [...],        // ✅ Existe
  'apu-support': [...],         // ✅ Existe
  'emma-ecommerce': [...],      // ✅ Existe
  'toby-technical': [...],      // ✅ Existe
  'astra-email': [...],         // ✅ Existe (sub-agent de Ami)
  'nora-community': [...],      // ✅ Existe
  'luna-content-creator': [...],      // ❌ NO EXISTE
  'zara-analytics-specialist': [...], // ❌ NO EXISTE
  'viktor-publishing-specialist': [...] // ❌ NO EXISTE
}
```

**Problemas:**
1. Incluye 3 agentes que no existen
2. No se actualiza automáticamente con nuevos agentes
3. No consulta la lista real de agentes disponibles
4. Si se crea un agente custom, nunca será sugerido por heuristics

### Problema #4: Sub-Agentes Reales NO están Vinculados

**Sub-agentes que SÍ existen:**

```typescript
// lib/agents/predefined/astra.ts
export const ASTRA_AGENT: AgentConfig = {
  id: 'astra-email',
  isSubAgent: true,
  parentAgentId: 'ami-creative',
  // ...
}

// lib/agents/predefined/notion-agent.ts
export const NOTION_AGENT: AgentConfig = {
  id: 'notion-agent',
  isSubAgent: true,
  parentAgentId: 'ami-creative',
  // ...
}
```

**Problema:**
- ✅ Están definidos como sub-agentes
- ❌ SubAgentManager NO los reconoce automáticamente
- ❌ `getSubAgents('ami-creative')` NO los retorna porque no están en DB

**Código actual en `SubAgentService.getSubAgents()`:**
```typescript
// Busca en DB pero predefined sub-agents NO están en DB
const { data, error } = await supabase.rpc('get_sub_agents', {
  parent_id: parentAgentId
})

// ⚠️ Astra y Notion-Agent no aparecerán aquí
```

### Problema #5: Orquestador No Consulta Sub-Agentes Dinámicamente

**En `lib/agents/core/orchestrator.ts` línea 329:**
```typescript
let subAgentToolsMap = this.subAgentManager.getDelegationTools(agentConfig.id) || {}
```

**Problema:**
- ✅ Llama a SubAgentManager
- ❌ SubAgentManager solo busca en DB
- ❌ Agentes predefined marcados como `isSubAgent=true` no están en DB
- ❌ No hay sincronización entre predefined y DB

---

## 🔧 Estado de la Base de Datos

### Tabla `agents`

**Schema actual:**
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(100),
    description TEXT,
    role VARCHAR(50),
    system_prompt TEXT,
    model VARCHAR(100),
    tools JSONB,
    
    -- Sub-agent support
    is_sub_agent BOOLEAN DEFAULT false,
    parent_agent_id UUID REFERENCES agents(id),
    
    -- ...
)
```

**✅ Schema correcto para sub-agentes**

**❌ Problema: Agentes predefinidos NO están en DB**

Los agentes predefinidos (Cleo, Toby, Ami, etc.) viven solo en código:
- `lib/agents/predefined/*.ts`
- `ALL_PREDEFINED_AGENTS` array

Esto significa:
- ❌ No se pueden consultar vía SQL
- ❌ SubAgentManager no los encuentra
- ❌ No se pueden crear sub-agentes asociados en DB

---

## 📈 Flujo Real vs Flujo Esperado

### Flujo Actual (Con Problemas)

```
1. Usuario envía mensaje
2. /api/chat/route.ts procesa
3. ✅ Llama getAllAgentsUnified(userId)
4. ✅ Crea delegation tools con ensureDelegationToolForAgent()
5. ❌ Intent heuristics sugiere agentes inexistentes (Luna, Zara, Viktor)
6. ✅ Cleo recibe tools de delegación
7. ⚠️ Si Cleo intenta delegar a Luna → FALLO (agent no existe)
8. ❌ AgentDiscoveryService nunca se consulta
9. ❌ Sub-agentes predefined (Astra, Notion) no están vinculados a Ami
```

### Flujo Esperado (Correcto)

```
1. Usuario envía mensaje
2. /api/chat/route.ts procesa
3. ✅ AgentDiscoveryService.discoverAllAgents(userId)
   → Encuentra predefined + DB + sub-agents
4. ✅ Genera delegation tools para TODOS
5. ✅ Intent heuristics usa lista real de agentes
6. ✅ Cleo recibe tools actualizados
7. ✅ Si delega a sub-agente → Éxito
8. ✅ Sub-agentes están correctamente vinculados
9. ✅ Cache se actualiza periódicamente
```

---

## 🎯 Causas Raíz

### 1. **Diseño Fragmentado**
- Múltiples sistemas de gestión de agentes (predefined, DB, discovery)
- No hay una "fuente única de verdad"
- Cada sistema funciona aislado

### 2. **Documentación vs Implementación**
- Docs mencionan Luna, Zara, Viktor pero no existen
- Promesas no cumplidas en el código

### 3. **Discovery Service No Utilizado**
- Sistema robusto implementado pero ignorado
- No se integró en el flujo principal

### 4. **Heuristics Estáticos**
- Lista hardcodeada que requiere mantenimiento manual
- No refleja estado real del sistema

### 5. **Sub-Agentes Híbridos**
- Algunos en código (Astra, Notion)
- Otros esperados en DB (Luna, Zara, Viktor)
- Sin estrategia de unificación

---

## 💡 Impacto en Funcionalidad

### Casos que FALLAN Actualmente:

1. ❌ "Cleo, pídele a Luna que cree tweets sobre X"
   → Fallo: Luna no existe

2. ❌ "Delega a Zara el análisis de métricas"
   → Fallo: Zara no existe

3. ❌ "Viktor, programa estos posts"
   → Fallo: Viktor no existe

4. ❌ Usuario crea nuevo agente custom en UI
   → No aparece en heuristics
   → Cleo no lo sugiere proactivamente
   → Tool se crea pero heuristic no lo detecta

5. ⚠️ "Ami, usa Notion para crear un documento"
   → Parcialmente funciona
   → Notion-Agent existe pero no está vinculado formalmente

### Casos que FUNCIONAN:

1. ✅ "Delega a Toby esta tarea de código"
   → Funciona: Toby existe y tool se genera

2. ✅ "Peter, crea un Google Doc"
   → Funciona: Peter existe

3. ✅ "Emma, actualiza el inventario"
   → Funciona: Emma existe

---

## 📊 Métricas de Cobertura

**Agentes Predefinidos:** 12
- Cleo (supervisor)
- Toby, Ami, Peter, Emma, Apu, Wex, Jungi, Insights (specialists)
- Nora (specialist)
- Astra (sub-agent de Ami)
- Notion-Agent (sub-agent de Ami)

**Agentes en Intent Heuristics:** 11
- 8 válidos
- 3 inexistentes (Luna, Zara, Viktor)

**Coverage:** 73% (8/11 válidos)

**Sub-Agentes Esperados según Docs:** 3 (Nora → Luna, Zara, Viktor)  
**Sub-Agentes Implementados:** 0

**Sub-Agentes Reales:** 2 (Ami → Astra, Notion)  
**Sub-Agentes Reconocidos por SubAgentManager:** 0 (porque no están en DB)

---

## 🔄 Sistemas que Requieren Actualización

### 1. Intent Heuristics (`lib/delegation/intent-heuristics.ts`)
**Estado:** ❌ Desactualizado  
**Necesita:** 
- Eliminar Luna, Zara, Viktor
- Consultar agentes dinámicamente
- Auto-actualización

### 2. Agent Discovery Service (`lib/agents/dynamic/agent-discovery.ts`)
**Estado:** ✅ Implementado, ❌ No Utilizado  
**Necesita:**
- Integración en `/api/chat/route.ts`
- Cache con auto-refresh
- Event listeners para cambios

### 3. Sub-Agent Manager (`lib/agents/core/sub-agent-manager.ts`)
**Estado:** ⚠️ Parcialmente Funcional  
**Necesita:**
- Reconocer predefined sub-agents
- Sync entre código y DB
- Hydration de Astra y Notion

### 4. Unified Config (`lib/agents/unified-config-server.ts`)
**Estado:** ✅ Funciona  
**Necesita:**
- Incluir sub-agents en resultado
- Filtrado por parentAgentId

### 5. Chat API (`app/api/chat/route.ts`)
**Estado:** ⚠️ Parcial  
**Necesita:**
- Usar AgentDiscoveryService
- Refresh periódico de tools
- Inject discovery prompt en Cleo

---

## 🚀 Próximos Pasos Recomendados

Ver documento separado: `PLAN-REPARACION-DELEGACION.md` (próximo a crear)

---

## 📝 Notas Técnicas

### Componentes que SÍ funcionan bien:
1. ✅ Tool generation (`ensureDelegationToolForAgent`)
2. ✅ Orchestrator execution flow
3. ✅ Database schema para sub-agentes
4. ✅ Unified config routing client/server
5. ✅ Delegation tool execution (`lib/tools/delegation.ts`)

### Componentes que necesitan trabajo:
1. ❌ Intent heuristics (hardcoded)
2. ❌ Agent discovery integration (no usado)
3. ❌ Sub-agent manager recognition (no encuentra predefined)
4. ❌ Documentación vs código (discrepancia)
5. ❌ Auto-refresh de agentes durante sesión

---

## 🔗 Referencias

**Archivos Clave:**
- `/lib/agents/unified-config.ts` - Entry point para obtener agentes
- `/lib/agents/unified-config-server.ts` - Lógica server-side
- `/lib/agents/predefined/index.ts` - Lista de agentes predefinidos
- `/lib/delegation/intent-heuristics.ts` - Detección de intención
- `/lib/agents/dynamic/agent-discovery.ts` - Discovery system (NO usado)
- `/lib/agents/core/sub-agent-manager.ts` - Gestión de sub-agentes
- `/lib/tools/index.ts` - Tool registry y generación
- `/app/api/chat/route.ts` - Endpoint principal de chat

**Documentación:**
- `/docs/nora-agent.md` - Especificación de Nora y sub-agentes
- `/docs/multi-agent-architecture.md` - Arquitectura general
- `/.github/copilot-instructions.md` - Guía del sistema

---

**Conclusión:**  
El sistema tiene una base sólida pero está **fragmentado e incompleto**. Los componentes existen pero no están conectados correctamente. La prioridad es crear una integración coherente que unifique todas las partes.
