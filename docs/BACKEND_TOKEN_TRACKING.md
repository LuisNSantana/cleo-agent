# 🔧 Token Tracking - IMPLEMENTADO ✅

## ✅ ESTADO: COMPLETADO (Nov 10, 2025)

El tracking de tokens está **completamente implementado** en el backend. Los tokens ahora se capturan del modelo LLM y se envían al frontend automáticamente.

### 🎯 IMPLEMENTACIÓN REALIZADA

**Archivos Modificados:**
1. **`/lib/agents/core/graph-builder.ts`** (líneas 497-506, 582-586, 542-564)
   - Captura `usage_metadata` del modelo LLM después de cada invocación
   - Agrega `lastUsage` al state metadata para disponibilidad en snapshots
   - Pasa tokens a reasoning steps para transparency completa

2. **`/app/api/chat/route.ts`** (líneas 1421-1434)
   - Enriquece cada step con tokens desde snapshot metadata
   - Formato OpenAI estándar: `tokens` y `usage` con breakdown completo

3. **`/lib/agents/reasoning-extractor.ts`** (líneas 196, 219-226)
   - Acepta parámetro opcional de `usage` en `createReasoningStep()`
   - Agrega tokens a reasoning blocks para UI transparency

**Formato de Datos:**
```typescript
step.metadata = {
  tokens: 450,  // Total tokens
  usage: {      // Breakdown detallado
    prompt_tokens: 150,
    completion_tokens: 300,
    total_tokens: 450
  }
}
```

**Flujo Completo:**
1. Model invocation → captura `usage_metadata` (graph-builder.ts:498)
2. Add to state → `lastUsage` en metadata (graph-builder.ts:582)
3. Snapshot polling → enriquece steps (route.ts:1422)
4. Frontend display → badges con iconos (pipeline-timeline.tsx:519)

### Estado Actual del Frontend
```typescript
// ✅ YA IMPLEMENTADO - Frontend busca tokens en:
const totalTokens = steps.reduce((sum, step) => {
  const tokens = step.metadata?.tokens ||           // Opción 1
               step.metadata?.usage?.total_tokens || // Opción 2 (formato OpenAI)
               step.metadata?.tokenCount || 0        // Opción 3
  return sum + tokens
}, 0)
```

### Estado Actual del Backend
```typescript
// ❌ NO IMPLEMENTADO - Backend NO envía tokens
send({ 
  type: 'execution-step', 
  step: {
    id: "...",
    action: "executing",
    metadata: {
      // tokens: MISSING ❌
      // usage: MISSING ❌
    }
  }
})
```

---

## ✅ SOLUCIÓN: Agregar Token Tracking

### Paso 1: Capturar Tokens de LangChain

LangChain/LangGraph **ya rastrean tokens automáticamente**. Solo necesitas extraerlos:

```typescript
// En: app/api/chat/route.ts
// Después de invocar un modelo LLM

import { AIMessage } from "@langchain/core/messages"

// Ejemplo: Después de una llamada a LLM
const response = await model.invoke(messages)

// ✅ Extraer usage info (si está disponible)
let tokenUsage = null
if (response instanceof AIMessage && response.usage_metadata) {
  tokenUsage = {
    prompt_tokens: response.usage_metadata.input_tokens || 0,
    completion_tokens: response.usage_metadata.output_tokens || 0,
    total_tokens: response.usage_metadata.total_tokens || 0
  }
}
```

### Paso 2: Agregar a Metadata de Pasos

**Opción A: En pasos LLM (Thinking, Analyzing, etc.)**

```typescript
// En: lib/agents/core/orchestrator.ts o similar
// Cuando se crea un paso después de una llamada LLM

const thinkingStep = {
  id: `thinking_${Date.now()}`,
  timestamp: new Date(),
  agent: agentId,
  agentName: agentName,
  action: 'thinking',
  content: 'Procesando tu solicitud...',
  metadata: {
    reasoning: true,
    // ✅ AGREGAR TOKENS AQUÍ
    tokens: tokenUsage?.total_tokens || 0,
    usage: tokenUsage // Formato completo OpenAI
  }
}

send({ type: 'execution-step', step: thinkingStep })
```

**Opción B: En pasos de Tool Execution**

```typescript
// En: lib/agents/core/orchestrator.ts
// Cuando se ejecuta una herramienta que usa LLM

const toolStep = {
  id: `tool_${Date.now()}`,
  timestamp: new Date(),
  agent: agentId,
  action: 'executing',
  content: `Usando herramienta: ${toolName}`,
  metadata: {
    toolName: toolName,
    toolStatus: 'success',
    // ✅ AGREGAR TOKENS AQUÍ
    tokens: toolResult.usage?.total_tokens || 0,
    usage: toolResult.usage
  }
}

send({ type: 'execution-step', step: toolStep })
```

### Paso 3: Agregar al Snapshot del Grafo

```typescript
// En: app/api/chat/route.ts
// En el loop de polling que lee snapshots

const steps = Array.isArray(snapshot.steps) ? snapshot.steps : []
if (steps.length > lastStepCount) {
  for (let i = lastStepCount; i < steps.length; i++) {
    const step = steps[i]
    
    // ✅ AGREGAR: Enriquecer con tokens si el snapshot los tiene
    if (snapshot.usage) {
      step.metadata = {
        ...step.metadata,
        tokens: snapshot.usage.total_tokens,
        usage: snapshot.usage
      }
    }
    
    send({ type: 'execution-step', step })
  }
}
```

---

## 🎯 Ubicaciones Específicas para Modificar

### Archivo: `app/api/chat/route.ts`

**Línea ~1415-1485:** Loop de polling de snapshots
```typescript
// ANTES
const steps = Array.isArray(snapshot.steps) ? snapshot.steps : []
if (steps.length > lastStepCount) {
  for (let i = lastStepCount; i < steps.length; i++) {
    const step = steps[i]
    send({ type: 'execution-step', step })
  }
}

// DESPUÉS
const steps = Array.isArray(snapshot.steps) ? snapshot.steps : []
if (steps.length > lastStepCount) {
  for (let i = lastStepCount; i < steps.length; i++) {
    const step = steps[i]
    
    // ✅ Enriquecer con usage metadata del snapshot
    if (snapshot.usage_metadata) {
      step.metadata = {
        ...step.metadata,
        tokens: snapshot.usage_metadata.total_tokens || 0,
        usage: {
          prompt_tokens: snapshot.usage_metadata.input_tokens || 0,
          completion_tokens: snapshot.usage_metadata.output_tokens || 0,
          total_tokens: snapshot.usage_metadata.total_tokens || 0
        }
      }
    }
    
    send({ type: 'execution-step', step })
  }
}
```

### Archivo: `lib/agents/core/orchestrator.ts`

**Función: `executeAgent` o similar**
```typescript
// Después de invocar el modelo
const response = await agent.invoke(input)

// ✅ Capturar usage
const usage = response.usage_metadata || null

// Crear step con tokens
const step = {
  id: generateId(),
  timestamp: new Date(),
  agent: agentId,
  action: 'thinking',
  content: response.content,
  metadata: {
    // ✅ AGREGAR
    tokens: usage?.total_tokens || 0,
    usage: usage ? {
      prompt_tokens: usage.input_tokens || 0,
      completion_tokens: usage.output_tokens || 0,
      total_tokens: usage.total_tokens || 0
    } : undefined
  }
}
```

---

## 📊 Formato Esperado

### Formato OpenAI (Recomendado)
```typescript
{
  id: "step_123",
  action: "thinking",
  metadata: {
    tokens: 450,  // Solo total (mínimo)
    usage: {      // Detallado (opcional pero recomendado)
      prompt_tokens: 150,
      completion_tokens: 300,
      total_tokens: 450
    }
  }
}
```

### Formato Simplificado (Alternativa)
```typescript
{
  id: "step_123",
  action: "thinking",
  metadata: {
    tokenCount: 450  // Nombre alternativo
  }
}
```

---

## 🧪 Testing

### 1. Verificar en Logs
Después de implementar, verifica que los pasos incluyan tokens:

```typescript
console.log('🔍 [PIPELINE DEBUG] Step with tokens:', {
  id: step.id,
  action: step.action,
  tokens: step.metadata?.tokens,
  usage: step.metadata?.usage
})
```

### 2. Verificar en Frontend DevTools
Abre DevTools → Network → WS (WebSocket) → Busca eventos `execution-step`:

```json
{
  "type": "execution-step",
  "step": {
    "id": "thinking_1234",
    "action": "thinking",
    "metadata": {
      "tokens": 450,  // ✅ Debe aparecer
      "usage": {
        "total_tokens": 450
      }
    }
  }
}
```

### 3. Verificar en UI
El frontend debe mostrar:
```
⛓️ PIPELINE    3/5 pasos • 23s • 450 tokens
```

Y en vista colapsada:
```
✅ Completing  🧠 LLM  ⏱ 23s  🔢 450
```

---

## 🎯 Prioridad de Implementación

| Ubicación | Impacto | Dificultad | Prioridad |
|-----------|---------|------------|-----------|
| **Snapshot loop** | 🟢 Alto | 🟢 Fácil | 🔥 Crítico |
| **LLM steps** | 🟢 Alto | 🟡 Medio | 🟢 Alto |
| **Tool steps** | 🟡 Medio | 🟡 Medio | 🟡 Medio |
| **Delegation steps** | 🟡 Medio | 🟡 Medio | 🟡 Medio |

**Recomendación:** Empezar por el snapshot loop (más fácil y mayor impacto).

---

## 🔍 Debugging

Si los tokens NO aparecen en el frontend:

### Checklist
- [ ] Backend emite `metadata.tokens` en eventos `execution-step`
- [ ] Los pasos llegan al frontend via WebSocket
- [ ] `calculateMetrics()` encuentra los tokens
- [ ] La vista colapsada renderiza el badge de tokens

### Verificar Backend
```bash
# Grep para verificar si se están enviando tokens
grep -r "metadata.*tokens" app/api/chat/route.ts
grep -r "usage.*total_tokens" app/api/chat/route.ts
```

### Verificar Frontend
```typescript
// En pipeline-timeline.tsx, agregar log temporal
const metrics = useMemo(() => {
  const m = calculateMetrics(uniqueSteps)
  console.log('📊 Metrics calculated:', m)
  return m
}, [uniqueSteps])
```

---

## 💰 Cálculo de Costos (Bonus)

Si también quieres mostrar costos estimados:

```typescript
// Precios aproximados (actualizar según modelo)
const PRICING = {
  'gpt-4': { input: 0.03, output: 0.06 },      // por 1K tokens
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'claude-3-opus': { input: 0.015, output: 0.075 }
}

function calculateCost(usage: any, model: string): number {
  const pricing = PRICING[model] || PRICING['gpt-4o-mini']
  const inputCost = (usage.prompt_tokens / 1000) * pricing.input
  const outputCost = (usage.completion_tokens / 1000) * pricing.output
  return inputCost + outputCost
}

// Agregar a metadata
metadata: {
  tokens: usage.total_tokens,
  usage: usage,
  cost: calculateCost(usage, modelName),
  model: modelName
}
```

Luego en frontend:
```typescript
{metrics.totalCost > 0 && (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-green-600/70 bg-green-500/10">
    💵 ${metrics.totalCost.toFixed(4)}
  </span>
)}
```

---

## 📚 Referencias

- [LangChain Usage Metadata](https://js.langchain.com/docs/how_to/chat_models_universal_init#usage-metadata)
- [OpenAI Token Counting](https://platform.openai.com/docs/guides/rate-limits/usage-tiers)
- [LangGraph Checkpointing](https://python.langchain.com/docs/langgraph/how-tos/persistence)

---

## ✅ Checklist de Implementación

- [ ] Capturar `usage_metadata` de respuestas LLM
- [ ] Agregar `metadata.tokens` a pasos en snapshot loop
- [ ] Agregar `metadata.tokens` a pasos LLM (thinking, analyzing)
- [ ] Agregar `metadata.tokens` a pasos de tools
- [ ] Probar en DevTools (WebSocket events)
- [ ] Verificar que aparezca en UI (header y vista colapsada)
- [ ] (Opcional) Implementar cálculo de costos
- [ ] (Opcional) Agregar logs para debugging

---

**Resultado esperado:** El pipeline mostrará tokens en tiempo real, permitiendo transparencia de costos y uso para el usuario. 🚀
