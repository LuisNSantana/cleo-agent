# Fix: Delegación Duplicada a Agentes

**Fecha:** 27 de octubre de 2025  
**Estado:** ✅ IMPLEMENTADO

---

## 🔍 Problema Identificado

El sistema estaba ejecutando **delegaciones duplicadas** al mismo agente cuando se llamaba a la herramienta de delegación. Esto causaba:

1. **Ejecuciones duplicadas** del mismo agente con la misma tarea
2. **Overhead de recursos** (llamadas API innecesarias, timeouts duplicados)
3. **Confusión en logs** con múltiples execution IDs para la misma delegación
4. **Resultados inconsistentes** en la UI

### Evidencia del Bug

Logs mostraban dos ejecuciones para la misma delegación:

```
00:46:10 → Ami delega a Apu (exec_...igghbxj) ✅
00:46:26 → Apu completa exitosamente
00:46:26 → 🔴 BUG: Se emite OTRO evento "delegation.requested"
00:46:26 → 🔴 Se crea SEGUNDA ejecución a Apu (exec_...08y7h32cm)
00:46:26 → Polling infinito esperando completar la segunda ejecución
```

### Causa Raíz

En `lib/agents/core/graph-builder.ts` existían **DOS puntos de emisión** del evento `delegation.requested`:

1. **Línea ~615** - En el nodo de agente cuando se detecta delegación en la respuesta de la herramienta
2. **Línea ~1248** - En `buildGraph` cuando se detecta handoff en el output

**El problema:** Ambos puntos se ejecutaban para la misma delegación:
- El primero se dispara cuando el agente llama a `delegate_to_*` tool
- El segundo se dispara después, cuando `buildGraph` procesa el resultado y ve que fue una delegación

Esto causaba que se emitiera `delegation.requested` **DOS VECES** para la misma tarea, creando dos ejecuciones diferentes.

---

## ✅ Solución Implementada

### **Mecanismo de Deduplicación con Set**

Se agregó un `Set` privado en `GraphBuilder` para rastrear delegaciones ya emitidas:

```typescript
export class GraphBuilder {
  private modelFactory: ModelFactory
  private eventEmitter: EventEmitter
  private executionManager: ExecutionManager
  private runtime: RuntimeConfig
  private emittedDelegations: Set<string> = new Set() // ← NUEVO
  
  // ...
}
```

### **Clave de Deduplicación Única**

Se crea una clave compuesta que identifica de forma única cada delegación:

```typescript
const delegationKey = `${currentExecutionId}:${agentConfig.id}:${targetAgentName}`
// Ejemplo: "exec_123:ami-creative:apu-support"
```

### **Verificación Antes de Emitir**

Antes de emitir `delegation.requested`, se verifica si ya se emitió:

```typescript
if (this.emittedDelegations.has(delegationKey)) {
  logger.warn('🚫 [DELEGATION] Skipping duplicate emission:', delegationKey)
} else {
  this.emittedDelegations.add(delegationKey)
  
  // Emitir evento solo si no se ha emitido antes
  this.eventEmitter.emit('delegation.requested', {
    sourceAgent: agentConfig.id,
    targetAgent: targetAgentName,
    // ... resto de propiedades
  })
}
```

### **Limpieza de Memoria**

Para evitar memory leaks, se elimina la clave del Set después de que la delegación complete:

```typescript
// Caso exitoso
const delegationResult = await delegationPromise
this.emittedDelegations.delete(delegationKey) // ← Cleanup

// Caso de error
catch (delegationError) {
  this.emittedDelegations.delete(delegationKey) // ← Cleanup
}
```

---

## 📊 Impacto del Fix

### **Antes (Sistema Roto):**

```
User: "Investiga sobre Warcraft 3"
Ami: [delega a Apu]

🔴 Delegación 1: exec_...igghbxj → Apu ejecuta → Completa ✅
🔴 Delegación 2: exec_...08y7h32cm → Apu ejecuta OTRA VEZ → Timeout/confusión ❌

Resultado: 
- 2 ejecuciones del mismo agente
- Overhead de API calls (webSearch x2)
- Logs confusos con IDs duplicados
- Posible timeout en la segunda ejecución
```

### **Después (Sistema Arreglado):**

```
User: "Investiga sobre Warcraft 3"
Ami: [delega a Apu]

✅ Delegación 1: exec_...igghbxj → Apu ejecuta → Completa ✅
🚫 Delegación 2: [BLOQUEADA] "Skipping duplicate emission"

Resultado:
- 1 sola ejecución (eficiente)
- Recursos optimizados
- Logs limpios con 1 ID
- Respuesta rápida y consistente
```

---

## 🎯 Archivos Modificados

### `lib/agents/core/graph-builder.ts`

**Cambios realizados:**

1. ✅ Agregado `private emittedDelegations: Set<string>` (línea ~60)
2. ✅ Verificación antes de emitir en nodo de agente (línea ~605)
3. ✅ Verificación antes de emitir en buildGraph (línea ~1255)
4. ✅ Cleanup en caso exitoso - nodo de agente (línea ~660)
5. ✅ Cleanup en caso exitoso - buildGraph (línea ~1285)
6. ✅ Cleanup en caso de error - nodo de agente (línea ~705)
7. ✅ Cleanup en caso de error - buildGraph (línea ~1340)

---

## 🧪 Testing Recomendado

### **Escenario de Prueba:**

1. Usuario autenticado crea un chat
2. Escribe: `"Investiga sobre [tema]"` (debe delegar a Apu)
3. Verificar logs:
   - ✅ Solo 1 mensaje `Emitting delegation.requested`
   - ✅ Solo 1 execution ID para Apu
   - ✅ No aparece `Skipping duplicate emission` (indica que la primera emisión fue única)
   - ✅ Delegación completa sin errores

### **Verificación en Logs:**

```bash
# Buscar delegaciones duplicadas (no debería haber)
grep "delegation.requested" logs.txt | wc -l
# Esperado: 1 línea por delegación

# Buscar bloq ueos de duplicados (indicador de que el fix está funcionando)
grep "Skipping duplicate emission" logs.txt
# Si aparece: significa que el sistema detectó y bloqueó un duplicado (correcto)
# Si NO aparece: significa que no hubo intento de duplicación (también correcto)
```

---

## 🔧 Consideraciones Técnicas

### **¿Por qué un Set y no un Map?**

- **Set** es más ligero cuando solo necesitamos rastrear presencia
- No necesitamos almacenar valores adicionales, solo la clave
- Operaciones `has()`, `add()`, `delete()` son O(1)

### **¿Por qué limpiar el Set?**

- Evitar memory leaks en servidores de larga ejecución
- Una delegación completada ya no necesita estar en el Set
- El Set solo debe contener delegaciones "en vuelo"

### **¿Qué pasa si hay un crash antes del cleanup?**

- El Set es local a la instancia de `GraphBuilder`
- Si el proceso reinicia, se crea un nuevo Set vacío
- No hay persistencia entre reinicios (esto es intencional)

---

## 📝 Logs de Debug

### **Logs Esperados (Sin Duplicación):**

```
🔍 [DEBUG] Emitting delegation.requested with executionId: exec_123
🔄 [DELEGATION] ami-creative → apu-support
⏳ [DELEGATION] Waiting for delegation to complete...
✅ [DELEGATION] Completed, injecting result
```

### **Logs con Duplicación Bloqueada:**

```
🔍 [DEBUG] Emitting delegation.requested with executionId: exec_123
🔄 [DELEGATION] ami-creative → apu-support
⏳ [DELEGATION] Waiting for delegation to complete...
🚫 [DELEGATION] Skipping duplicate emission: exec_123:ami-creative:apu-support
✅ [DELEGATION] Completed, injecting result
```

El log `🚫 Skipping duplicate emission` indica que el sistema **detectó y bloqueó** una emisión duplicada.

---

## ✅ Checklist de Verificación

- [x] Set de deduplicación agregado
- [x] Verificación implementada en ambos puntos de emisión
- [x] Cleanup implementado en caso exitoso
- [x] Cleanup implementado en caso de error
- [x] Logs de debug agregados
- [x] Documentación completa

---

**Implementado por:** GitHub Copilot  
**Aprobado por:** Luis Nayib Santana  
**Fecha de Implementación:** 27 de octubre de 2025  
**Prioridad:** 🔴 CRÍTICA (Fix de bug en producción)
