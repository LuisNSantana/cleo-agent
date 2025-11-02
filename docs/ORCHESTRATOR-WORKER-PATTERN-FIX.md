# Fix: Orchestrator-Worker Pattern - Context Scope

## Problema Identificado

Después de que un agente especialista (worker) completaba exitosamente una tarea delegada, Cleo (supervisor/orchestrator) continuaba delegando a otros agentes para procesar mensajes históricos del thread que ya habían sido resueltos en turnos anteriores.

### Ejemplo del Problema

**Usuario en chat nuevo**: "Jenn, publica Saludos desde Cleo app en @cleo_test"

**Flujo esperado:**
1. Cleo delega a Jenn
2. Jenn publica en Telegram (mensaje ID 12) ✅
3. Resolver se activa correctamente ✅
4. Cleo presenta el resultado de Jenn ✅
5. **FIN** ❌ (no sucedía)

**Flujo real (bug):**
1-4. (igual que arriba)
5. Cleo procesa TODO el historial del thread
6. Encuentra mensajes viejos: "añadir evento raid wow guild", "workspace en Notion"
7. Delega a Ami para calendario ❌ (incorrecto)
8. Delega a Notion Agent ❌ (incorrecto)

## Causa Raíz

### Patrón Incorrecto

Estábamos pasando **todo el historial del thread** al supervisor después de cada delegación:

```typescript
// ❌ INCORRECTO: Procesa todo el historial
const processedContext = await this.prepareExecutionContext(context)
// processedContext.messageHistory contiene TODOS los mensajes del thread
```

Esto causaba que Cleo viera:
- Mensaje actual: "publica en Telegram" ✅
- Mensaje viejo 1: "añadir evento raid wow" 
- Mensaje viejo 2: "crear workspace Notion"
- Mensaje viejo 3: etc...

El LLM interpretaba los mensajes viejos como **tareas pendientes** y delegaba incorrectamente.

### Patrón Correcto (LangGraph Orchestrator-Worker)

Según la [documentación oficial de LangGraph](https://langchain-ai.github.io/langgraph/tutorials/multi_agent/agent_supervisor/):

> **In an orchestrator-worker configuration, the orchestrator:**
> - Breaks down tasks into subtasks
> - Delegates subtasks to workers
> - **Synthesizes worker outputs into a final result**

**Clave**: El orchestrator debe **sintetizar las salidas de los workers**, NO procesar todo el historial como nuevas tareas.

## Solución Implementada

### Filtrado de Contexto Enfocado

Ahora filtramos el historial para que Cleo solo vea:

1. **Mensaje del sistema** (instrucciones)
2. **Resultados recientes de delegación** (salidas de workers, últimas 5 tool messages)
3. **Mensaje actual del usuario** (solicitud actual)

```typescript
// ✅ CORRECTO: Solo contexto relevante para síntesis
const currentUserMessage = processedContext.messageHistory[processedContext.messageHistory.length - 1]
const systemMessage = processedContext.messageHistory.find(m => m._getType() === 'system')

// Últimas 5 herramientas (resultados de delegación)
const recentDelegationResults = processedContext.messageHistory
  .filter(m => m._getType() === 'tool')
  .slice(-5)

// Contexto enfocado
const focusedHistory = [
  ...(systemMessage ? [systemMessage] : []),
  ...recentDelegationResults,
  currentUserMessage
].filter(Boolean)

processedContext = {
  ...processedContext,
  messageHistory: focusedHistory
}
```

### Logging para Visibilidad

```typescript
logger.info('🎯 [SUPERVISOR] Focused context for orchestrator', {
  originalHistoryLength: processedContext.messageHistory.length,
  focusedHistoryLength: focusedHistory.length,
  hasDelegationResults: recentDelegationResults.length > 0
})
```

## Beneficios

### 1. Contexto Correcto
- Cleo solo ve el request actual + resultados de workers
- No confunde mensajes históricos con tareas pendientes

### 2. Mejor Rendimiento
- Menos tokens procesados (3-10 mensajes vs 50+ históricos)
- Respuestas más rápidas
- Menor costo de API

### 3. Comportamiento Predecible
- Delegación correcta basada en request actual
- No más delegaciones espurias a agentes irrelevantes
- Síntesis limpia de resultados

## Ejemplo de Ejecución Post-Fix

**Usuario**: "Jenn, publica Saludos desde Cleo app en @cleo_test"

**Context filtrado que ve Cleo:**
```
[SystemMessage: "Eres Cleo, supervisor..."]
[HumanMessage: "Jenn, publica Saludos desde Cleo app en @cleo_test"]
```

**Tras delegación a Jenn:**
```
[SystemMessage: "Eres Cleo, supervisor..."]
[ToolMessage: "¡Hecho! He publicado el mensaje... ID del mensaje es 12"]
[HumanMessage: "Jenn, publica Saludos desde Cleo app en @cleo_test"]
```

**Decisión de Cleo:**
- ✅ Ve que Jenn completó exitosamente
- ✅ Sintetiza el resultado
- ✅ Presenta respuesta al usuario
- ✅ **FIN** (no más delegaciones)

## Referencias

- **LangGraph Orchestrator-Worker Pattern**: https://langchain-ai.github.io/langgraph/tutorials/multi_agent/agent_supervisor/
- **LangGraph Memory Management**: https://langchain-ai.github.io/langgraph/concepts/memory/
- **Código actualizado**: `lib/agents/core/orchestrator.ts` líneas 730-760

## Testing

Para verificar el fix:

1. Iniciar chat completamente nuevo
2. Hacer request simple: "Jenn, publica [mensaje] en @cleo_test"
3. Verificar logs:
   ```
   🎯 [SUPERVISOR] Focused context for orchestrator {
     originalHistoryLength: X,
     focusedHistoryLength: 2-3,
     hasDelegationResults: false
   }
   ```
4. Tras delegación exitosa, verificar que NO delega a otros agentes
5. Confirmar respuesta final limpia sin mencionar tareas irrelevantes

## Notas Técnicas

### Límite de 5 Tool Messages

Mantenemos las últimas 5 tool messages para casos de delegaciones encadenadas (ej: Ami delega a Notion Agent, luego a Khipu). Esto preserva el contexto necesario para síntesis multi-nivel sin incluir TODO el historial.

### Compatibilidad con HITL (Human-in-the-Loop)

El filtrado no afecta:
- Interrupciones para aprobaciones
- Timeout dinámico durante aprobaciones
- Sistema de confirmaciones

### Estado de Thread

El thread completo se mantiene en Supabase. Este filtrado es **solo para el contexto del LLM supervisor**, no afecta:
- Persistencia de mensajes
- Analytics
- Timeline de ejecución
- Logs completos
