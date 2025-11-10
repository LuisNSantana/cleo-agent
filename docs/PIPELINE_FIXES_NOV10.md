# 🔧 Pipeline & Credits - Fixes Noviembre 10, 2025

## 🔴 PROBLEMAS IDENTIFICADOS

### 1. ❌ Error Backend - Tabla Incorrecta
**Síntoma:** `[CREDITS] Failed to get user profile: relation "public.profiles" does not exist"`
**Causa:** El código buscaba `subscription_tier` en tabla `profiles` pero se agregó a `users`
**Fix:** ✅ Corregido en `/lib/credits/credit-tracker.ts` línea 114-118

### 2. ❌ Pipeline Colapsado Salta Pasos
**Síntoma:** Solo muestra Routing → Completing, saltando Delegating y Executing
**Causa:** Los pasos de delegación se filtran prematuramente
**Fix:** 🟡 **PENDIENTE** - Necesita revisión de lógica de deduplicación

### 3. ❌ Nombres de Agentes Muestran UUID
**Síntoma:** Muestra "5b51e9da_201f_41a3_acea_61488b1fd3bc" en lugar de "Apu"
**Causa:** 
- Agente custom no encontrado: `❌ [DELEGATION] Target agent not found: 5b51e9da_201f_41a3_acea_61488b1fd3bc`
- Dynamic agent discovery no resuelve nombres correctamente
**Fix:** 🟡 **PENDIENTE** - Requiere:
  1. Verificar tabla `agents` tiene este UUID con nombre correcto
  2. Mejorar fallback de resolución de nombres

### 4. ❌ Tokens No Visibles en UI
**Síntoma:** Logs muestran `💰 [TOKENS] Captured: 14571 tokens` pero UI no los muestra
**Causa:** 
- Steps emitidos (`tokens: undefined`) no incluyen metadata de tokens
- `snapshot.metadata.lastUsage` solo tiene tokens del ÚLTIMO ciclo
- Steps de UI (routing, completing) se generan ANTES de capturar tokens
**Fix:** 🟡 **PARCIAL** - Agregado fallback para mostrar créditos cuando completa

---

## ✅ FIXES IMPLEMENTADOS

### Fix 1: Corregir Tabla en credit-tracker.ts ✅

```typescript
// ANTES (❌):
const { data: profile } = await supabase
  .from('profiles')  // ← Tabla incorrecta
  .select('subscription_tier')

// DESPUÉS (✅):
const { data: user } = await supabase
  .from('users')  // ← Tabla correcta
  .select('subscription_tier')
```

**Archivo:** `/lib/credits/credit-tracker.ts`
**Líneas:** 114-118
**Resultado:** ✅ API `/api/credits/balance` ahora funciona sin errores

---

### Fix 2: Badge Híbrido de Tokens/Créditos ✅

**Cambio en `/app/components/chat/pipeline-timeline.tsx` (líneas 548-576):**

- **Si hay tokens en metadata:** Muestra badge morado con icono 🔢
- **Si NO hay tokens pero pipeline completó:** Muestra badge verde con checkmark y créditos estimados
- **Tooltip:** `~X créditos usados`

**Resultado:** ✅ Usuario ve indicador visual aunque tokens no estén en metadata

---

## 🟡 FIXES PENDIENTES (Críticos)

### Pending Fix 1: Resolver Nombres de Agentes Custom

**Problema:**
```
❌ [DELEGATION] Target agent not found: 5b51e9da_201f_41a3_acea_61488b1fd3bc
Delegating: 5b51e9da_201f_41a3_acea_61488b1fd3bc  ← UUID en lugar de "Apu"
```

**Solución Propuesta:**
1. Verificar query a tabla `agents`:
```sql
SELECT id, name, agent_name FROM agents 
WHERE id = '5b51e9da-201f-41a3-acea-61488b1fd3bc';
```

2. Si existe, problema es en `resolveAgentCanonicalKey`:
   - Agregar fallback a query directo de DB
   - No depender solo de cache

3. Mejorar `getAgentMetadata` para:
```typescript
// Si no encuentra en predefined, query a agents table
if (!metadata && agentId.match(/^[a-f0-9-]{36}$/)) {
  const agent = await fetchAgentFromDB(agentId)
  return { name: agent.name, ... }
}
```

**Archivos a Modificar:**
- `/lib/agents/alias-resolver.ts` - Mejorar fallback
- `/lib/agents/agent-metadata.ts` - Agregar query DB
- `/lib/agents/dynamic/agent-discovery.ts` - Cache names

---

### Pending Fix 2: Mostrar Pasos Intermedios en Vista Colapsada

**Problema:** Usuario no ve delegaciones en progreso ni tools ejecutándose

**Solución:**
Modificar `summaryStep` logic en `pipeline-timeline.tsx`:

```typescript
const summaryStep = useMemo(() => {
  if (!uniqueSteps.length) return null
  
  // 1. Si hay delegación activa, mostrarla
  const activeDelegation = uniqueSteps.find(s => 
    s.action === 'delegating' && 
    (s.metadata?.status === 'in_progress' || s.metadata?.stage === 'researching')
  )
  if (activeDelegation) return activeDelegation
  
  // 2. Si hay tool ejecutándose, mostrarlo
  const activeTool = uniqueSteps.find(s => 
    s.action === 'executing' && 
    s.metadata?.stage === 'started'
  )
  if (activeTool) return activeTool
  
  // 3. Sino, paso más reciente
  return uniqueSteps[uniqueSteps.length - 1]
}, [uniqueSteps])
```

**Resultado Esperado:**
```
Vista Colapsada Muestra:
🧠 Routing (si comenzando)
     ↓
🤝 Delegating to Apu (si delegando)  ← VISIBLE
     ↓
🔧 Executing webSearch (si tool activo)  ← VISIBLE  
     ↓
✅ Completing (si terminó)
```

---

### Pending Fix 3: Enriquecer Steps con Tokens en Origen

**Problema Root Cause:**
Steps de UI (routing, completing, delegating) se crean en `ui-messaging.ts` ANTES de que el modelo se invoque, entonces no tienen tokens.

**Solución Arquitectural:**
1. Cuando `graph-builder.ts` captura `usage_metadata`, guardarlo en state:
```typescript
return {
  ...state,
  metadata: {
    ...state.metadata,
    lastUsage: usageMetadata,
    accumulatedTokens: (state.metadata?.accumulatedTokens || 0) + usageMetadata.total_tokens
  }
}
```

2. En `ui-messaging.ts`, al generar step, incluir tokens del state:
```typescript
export function enrichStepWithContextualMessage(step, context) {
  return {
    ...step,
    metadata: {
      ...step.metadata,
      tokens: context.lastUsage?.total_tokens,
      usage: context.lastUsage
    }
  }
}
```

3. En `route.ts`, pasar context correctamente:
```typescript
const enrichedStep = enrichStepWithContextualMessage(step, {
  lastUsage: snapshot.metadata?.lastUsage
})
```

**Archivos a Modificar:**
- `/lib/agents/core/graph-builder.ts` - Acumular tokens en state
- `/lib/agents/ui-messaging.ts` - Incluir tokens al generar steps
- `/app/api/chat/route.ts` - Pasar context al enrichment

---

## 📊 TESTING

### Test 1: Verificar API Credits ✅
```bash
curl http://localhost:3000/api/credits/balance
# ✅ Debería retornar balance sin error "profiles does not exist"
```

### Test 2: Verificar Agente Custom
```sql
-- En Supabase SQL Editor
SELECT id, name, agent_name, description 
FROM agents 
WHERE id = '5b51e9da-201f-41a3-acea-61488b1fd3bc';
```
**Esperado:** Debería retornar "Apu" como nombre

### Test 3: Verificar Tokens en Credit_Usage
```sql
-- Verificar que se están registrando tokens
SELECT 
  agent_id,
  model_name,
  total_tokens,
  credits_used,
  created_at
FROM credit_usage
ORDER BY created_at DESC
LIMIT 10;
```
**Esperado:** Debería ver registros con ~14000-20000 tokens de la ejecución

---

## 🎯 PRIORIDAD DE FIXES

| # | Fix | Prioridad | Impacto | Esfuerzo |
|---|-----|-----------|---------|----------|
| 1 | Resolver nombres de agentes custom | 🔴 ALTA | Usuario confundido por UUIDs | 2h |
| 2 | Mostrar pasos intermedios en colapsado | 🔴 ALTA | Usuario no ve progreso | 1h |
| 3 | Enriquecer steps con tokens en origen | 🟡 MEDIA | Tokens visibles en tiempo real | 3h |
| 4 | Agregar créditos en vista expandida | 🟢 BAJA | Nice to have | 1h |

---

## 📁 ARCHIVOS MODIFICADOS

### Session Actual (Nov 10, 2025):
1. ✅ `/lib/credits/credit-tracker.ts` - Fix tabla users
2. ✅ `/app/components/chat/pipeline-timeline.tsx` - Badge híbrido

### Pendientes:
3. 🟡 `/lib/agents/alias-resolver.ts` - Mejorar resolución nombres
4. 🟡 `/lib/agents/agent-metadata.ts` - Agregar fallback DB
5. 🟡 `/app/components/chat/pipeline-timeline.tsx` - Fix summaryStep logic
6. 🟡 `/lib/agents/ui-messaging.ts` - Incluir tokens al generar steps
7. 🟡 `/lib/agents/core/graph-builder.ts` - Acumular tokens en state

---

## 🔍 LOGS DE REFERENCIA

**Tokens Capturados (Backend):**
```
💰 [TOKENS] Captured usage metadata {
  agent: 'cleo-supervisor',
  input_tokens: 13917,
  output_tokens: 169,
  total_tokens: 14571  ← AQUÍ ESTÁN
}
💰 [CREDITS] Recorded: 1 crédito
```

**Steps Emitidos (Frontend):**
```
🔍 [PIPELINE DEBUG] Step received: {
  id: 'cleo-supervisor:router:...',
  action: 'routing',
  agent: 'cleo-supervisor',
  agentName: 'Kylio',
  tokens: undefined  ← PROBLEMA
}
```

**Delegación Fallida:**
```
❌ [DELEGATION] Target agent not found: 5b51e9da_201f_41a3_acea_61488b1fd3bc
[DELEGATION-COORD] 📊 Progress: starting - Delegating to 5b51e9da_201f_41a3_acea_61488b1fd3bc...
```

---

**Estado:** 2/4 fixes implementados, 2 pendientes críticos
**Próximo Paso:** Fix de resolución de nombres de agentes custom
