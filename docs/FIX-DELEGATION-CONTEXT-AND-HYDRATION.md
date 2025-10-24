# Fix: Delegation Context Loss & Hydration Errors

**Fecha**: 24 de octubre de 2025  
**Autor**: GitHub Copilot  
**Tickets**: Network errors en agent-discovery, pérdida de contexto en delegaciones, errores de hidratación con botones anidados

## 🎯 Resumen de problemas corregidos

### 1. Error de red "fetch failed" en Agent Discovery
**Problema**: Cuando `discoverDatabaseAgents` intentaba conectarse a Supabase sin credenciales válidas o con problemas de red, generaba errores no manejados que rompían el flujo del chat.

**Solución implementada** (`lib/agents/dynamic/agent-discovery.ts`):
- ✅ Validación previa de variables de entorno antes de intentar conexión
- ✅ Manejo específico de errores de red (`fetch failed`, `ECONNREFUSED`)
- ✅ Invalidación automática de caché cuando hay errores de red
- ✅ Logs diferenciados para errores fatales vs warnings no fatales
- ✅ Fallback graceful a agentes predefinidos cuando la DB no está disponible

```typescript
// Validar env vars antes de conectar
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  logger.warn('[AgentDiscovery] Supabase credentials not configured, skipping database agent discovery')
  return []
}

// Detectar y manejar errores de red específicamente
const isNetworkError = errorMessage.includes('fetch failed') || 
                       errorMessage.includes('network') ||
                       errorMessage.includes('ECONNREFUSED')

if (isNetworkError) {
  logger.warn('[AgentDiscovery] Network error (non-fatal):', { ... })
  this.lastRefresh = 0 // Invalidar caché para reintentar
}
```

---

### 2. Pérdida de contexto en delegaciones entre agentes
**Problema**: Cuando Cleo delegaba a agentes especializados (Ami, Toby, Astra, etc.), el agente delegado **no recibía el historial completo de la conversación**. Esto causaba que:
- El agente delegado no supiera qué se había discutido anteriormente
- Perdiera contexto de archivos adjuntos o información compartida
- Tuviera que preguntar de nuevo cosas ya mencionadas

**Causa raíz**: En `orchestrator.ts`, el `delegationContext` solo incluía:
1. Un mensaje del sistema con la tarea delegada
2. El mensaje de usuario actual

❌ **NO incluía** el historial completo de la conversación (`context.messageHistory`)

**Solución implementada**:

#### Paso 1: Modificar emisión del evento en `graph-builder.ts`
Se agregó `conversationHistory` al evento `delegation.requested`:

```typescript
// lib/agents/core/graph-builder.ts (líneas 613 y 1242)
this.eventEmitter.emit('delegation.requested', {
  sourceAgent: agentConfig.id,
  targetAgent: targetAgentName,
  task: delegationData.delegatedTask || delegationData.task,
  context: delegationData.context,
  handoffMessage: delegationData.handoffMessage,
  priority: delegationData.priority || 'normal',
  sourceExecutionId: currentExecutionId,
  userId: state.userId,
  conversationHistory: state.messages || [] // ✅ NUEVO: Pasar historial completo
})
```

#### Paso 2: Usar el historial en `orchestrator.ts`
Se modificó `handleDelegation` para construir el contexto completo:

```typescript
// lib/agents/core/orchestrator.ts (línea ~1212)
const conversationHistory = delegationData.conversationHistory || []

const delegationMessageHistory = [
  ...conversationHistory, // ✅ Incluir TODO el historial previo
  new SystemMessage({
    content: `You have been delegated a task by ${delegationData.sourceAgent}. ${delegationData.context ? `Context: ${delegationData.context}` : ''}`
  }),
  new HumanMessage({
    content: delegationData.task
  })
]

const delegationContext: ExecutionContext = {
  threadId: `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  userId: preferredUserId || sourceUserId || contextUserId || NIL_UUID,
  agentId: delegationData.targetAgent,
  messageHistory: delegationMessageHistory, // ✅ Contexto completo
  metadata: {
    isDelegation: true,
    sourceAgent: delegationData.sourceAgent,
    delegationPriority: normalizedPriority,
    isSubAgentDelegation: isSubAgent,
    parentExecutionId: delegationData.sourceExecutionId,
    originalHistoryLength: conversationHistory.length // Para debugging
  }
}
```

**Impacto**:
- ✅ Los agentes delegados ahora **mantienen todo el contexto** de la conversación
- ✅ Pueden ver archivos adjuntos mencionados previamente
- ✅ Recuerdan decisiones y datos compartidos en mensajes anteriores
- ✅ No necesitan volver a preguntar información ya proporcionada

---

### 3. Error de hidratación: botones anidados en ModelSelector
**Problema**: Errores de consola en Next.js indicando:
```
<button> cannot be a descendant of <button>
```

**Causa**: En `ModelSelector`, el componente `TooltipTrigger` renderiza un `<button>` por defecto, y dentro de él se colocaba otro `Button` component (también `<button>`), violando la especificación HTML.

**Solución implementada** (`components/common/model-selector/base.tsx`):
Agregar la prop `asChild` a `TooltipTrigger` para que **no renderice su propio button**, sino que use el hijo como trigger:

```tsx
// ANTES ❌
<TooltipTrigger>
  <PopoverTrigger asChild>
    <Button ... />
  </PopoverTrigger>
</TooltipTrigger>

// DESPUÉS ✅
<TooltipTrigger asChild>
  <PopoverTrigger asChild>
    <Button ... />
  </PopoverTrigger>
</TooltipTrigger>
```

**Aplicado en**:
- Línea ~195: Usuario no autenticado (Popover + Tooltip + Button)
- Línea ~301: Usuario autenticado desktop (DropdownMenu + Tooltip + Button)

---

## 📊 Archivos modificados

| Archivo | Cambios | Líneas |
|---------|---------|--------|
| `lib/agents/dynamic/agent-discovery.ts` | Validación env vars + manejo errores de red | 159-210 |
| `lib/agents/core/graph-builder.ts` | Agregar `conversationHistory` al evento | 613, 1242 |
| `lib/agents/core/orchestrator.ts` | Usar historial en delegación | 1207-1240 |
| `components/common/model-selector/base.tsx` | Fix botones anidados con `asChild` | 195, 301 |

---

## 🧪 Testing recomendado

### Caso 1: Delegación con contexto
1. Iniciar chat con Cleo
2. Adjuntar un archivo PDF o imagen
3. Hacer varias preguntas sobre el archivo
4. Pedir a Cleo que delegue a Ami o Astra
5. **Verificar**: El agente delegado debe recordar el archivo y el contexto previo

### Caso 2: Network resilience
1. Desconectar temporalmente la conexión a Supabase
2. Iniciar un chat
3. **Verificar**: El chat funciona con agentes predefinidos, sin errores fatales
4. Reconectar Supabase
5. **Verificar**: Los agentes de base de datos vuelven a estar disponibles

### Caso 3: UI hidratación
1. Abrir la aplicación en modo desarrollo
2. Interactuar con el ModelSelector (tanto en versión autenticado como guest)
3. **Verificar**: No hay errores de hidratación en consola sobre botones anidados

---

## 🎯 Próximos pasos sugeridos

1. **Monitoreo de métricas**: Agregar telemetría para medir:
   - % de delegaciones con historial > 0 mensajes
   - Tiempo de respuesta de agentes delegados con/sin contexto
   - Tasa de errores de red en agent-discovery

2. **Optimización de contexto**: Si el historial es muy largo (>20 mensajes):
   - Implementar resumen automático del historial previo
   - Mantener solo los últimos N mensajes + resumen

3. **Tests automatizados**: Agregar tests E2E para:
   - Delegación multi-nivel (Cleo → Ami → Sub-agente)
   - Delegación con attachments en el historial
   - Recovery de errores de red en agent-discovery

---

## 📝 Notas adicionales

- **Backward compatibility**: Los cambios son retrocompatibles. Si `conversationHistory` no está presente en el evento, el sistema funciona con el comportamiento anterior (solo mensaje actual)
- **Performance**: Pasar el historial completo no impacta significativamente el rendimiento, ya que los mensajes ya están en memoria en el estado del grafo
- **Security**: El userId se valida en múltiples niveles para evitar delegaciones con UUIDs inválidos que rompan RLS de Supabase

---

**Status**: ✅ Completado y listo para deployment
