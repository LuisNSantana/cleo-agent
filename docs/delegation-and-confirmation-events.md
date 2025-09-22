# Delegación Inteligente y Flujo de Confirmaciones (Septiembre 2025)

Este documento describe la arquitectura unificada de:

- Confirmaciones de herramientas (blocking / sensitive actions)
- Eventos SSE del pipeline
- Heurística de intención de delegación multi‑agente
- Métricas de delegación y tracking de “missed opportunities”

## 1. Objetivos

1. Centralizar confirmaciones en un endpoint y un único stream SSE.
2. Exponer señales de intención de delegación (delegation-intent) sin forzar al modelo.
3. Aumentar transparencia: el cliente puede visualizar pipeline, confirmaciones y delegaciones potenciales.
4. Reducir deuda: eliminar polling legacy y endpoints duplicados.

## 2. Componentes Clave

| Componente | Archivo | Rol |
|------------|---------|-----|
| Generador de System Prompt | `lib/chat/prompt.ts` | Inserta hints internos (delegación) + contexto RAG + personalidad |
| Heurística de delegación | `lib/delegation/intent-heuristics.ts` | `scoreDelegationIntent(text)` → `{ target, score, scores, reasons }` |
| Chat API principal | `app/api/chat/route.ts` | Calcula intención, inyecta hint, asegura tools de delegación |
| Stream handlers | `lib/chat/stream-handlers.ts` | Persistencia, tokens, tracking de missed delegation |
| Confirmación blocking | wrapper de confirmación | Genera y emite eventos `pending-confirmation` / `confirmation-resolved` |
| Emisor SSE pipeline | `lib/tools/delegation.ts` | `emitPipelineEventExternal()` usado por múltiples etapas |

## 3. Flujo de Confirmaciones

1. Tool sensible produce `confirmationId` + `preview`.
2. Se emite `pending-confirmation` vía SSE.
3. UI muestra metadata:
   - `id`, `toolName`
   - `category` (ej: `data_write`, `external_api`, `email_send`)
   - `sensitivity` (low/medium/high)
   - `undoable`
   - `preview`
4. Usuario responde vía `POST /api/confirmations { id, approved }`.
5. Evento `confirmation-resolved`.
6. Si aprobado → se ejecuta la acción; si no → se aborta con fallback.

### 3.1 Endpoint Unificado

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/confirmations` | Listar confirmaciones pendientes (debug / SSR) |
| POST | `/api/confirmations` | Resolver una confirmación `{ id, approved }` |

## 4. Eventos SSE Disponibles

Todos por el mismo stream de la conversación.

| Event `type` | Descripción | Payload principal |
|--------------|-------------|------------------|
| `execution-step` | Paso de pipeline/orquestación | `step: { id, agent, action, content, metadata }` |
| `pending-confirmation` | Acción sensible pendiente | `id, toolName, category, sensitivity, undoable, preview` |
| `confirmation-resolved` | Confirmación resuelta | `id, approved` |
| `delegation-intent` | Señal heurística (debug) | `target, score, scores, reasons` |
| `delegation-missed` | No se delegó pese a alta intención | `target, score, scores, reason` |
| `tool-invocation` | Estado/result tool | `toolInvocation` |
| `text-delta` / `finish` | Streaming de texto | Fragmento / cierre |

## 5. Heurística de Delegación

Archivo: `lib/delegation/intent-heuristics.ts`.

### 5.1 Agentes Cubiertos

`ami-creative`, `notion-agent`, `peter-google`, `apu-research`, `apu-markets`, `emma-ecommerce`, `toby-technical`, `astra-email`, `nora-community`, `luna-content-creator`, `zara-analytics-specialist`, `viktor-publishing-specialist`.

### 5.2 Lógica

- Keywords por agente (ponderadas opcionalmente).
- Conteo → normalización (ratio sobre longitud controlada) → ajustes estructurales.
- Umbrales: `0.55` (hint), `0.75` (missed tracking si no delega).

### 5.3 Ejemplo

```json
{
  "target": "apu-research",
  "score": 0.72,
  "scores": { "apu-research": 0.72, "ami-creative": 0.05 },
  "reasons": ["matched: research, fuentes", "score:0.72"]
}
```

## 6. Inyección de Hint Interno

Si `score >= 0.55` se agrega al System Prompt:

```text
INTERNAL DELEGATION HINT: The user's request likely maps to specialist agent 'X'. Consider calling tool delegate_to_X si añade capacidad única o velocidad. Explica brevemente si delegas.
```

No se muestran scores al modelo.

## 7. Asegurar Tools de Delegación

Antes de invocar el modelo: `ensureDelegationToolForAgent()` para cada agente (excepto supervisor) → garantiza presencia de `delegate_to_*`.

## 8. Tracking de Delegación Perdida

En `stream-handlers`: si ningún `delegate_to_*` fue usado y `score >= 0.75` → evento `delegation-missed` (optimización / métricas).

## 9. Debug y Flags

| Variable | Efecto |
|----------|--------|
| `DEBUG_DELEGATION_INTENT=true` | Emite `delegation-intent` (debug). |
| `CHAT_DELEGATION_ONLY=true` | Modo experimental: sólo herramientas de delegación + básicas. |

## 10. Front-End: Suscripción SSE (Ejemplo)

```ts
const es = new EventSource('/api/chat/stream?chatId=...')
es.onmessage = ev => {
  const data = JSON.parse(ev.data)
  switch (data.type) {
    case 'pending-confirmation': /* mostrar modal */ break
    case 'confirmation-resolved': /* cerrar modal */ break
    case 'delegation-intent': /* insignia debug */ break
    case 'delegation-missed': /* log analytics */ break
  }
}
```

## 11. Buenas Prácticas

1. Delegar solo si el agente añade capacidades exclusivas.
2. Explicar brevemente la razón al usuario.
3. Evitar múltiples delegaciones en un único turno.
4. Reintentar sólo si la primera delegación crítica falla.

## 12. Futuras Mejoras Potenciales

| Idea | Descripción | Impacto |
|------|-------------|---------|
| Re‑pesado dinámico | Ajustar pesos según falsos positivos | Medio |
| Feedback loop UX | Preguntar al usuario si faltó delegar | Alto |
| Embeddings ligeros | Similaridad semántica para reducir ruido lexical | Alto |
| Umbral adaptativo | Ajustar thresholds por longitud/contexto | Medio |
| Aprendizaje incremental | Recalibrar semanalmente con outcomes | Alto |

## 13. Resumen Rápido

- Confirmaciones unificadas + SSE.
- Delegación heurística no intrusiva (hint interno).
- Métricas: intent + missed para optimización.
- Extensible: añadir agente = keywords + tool.

---
**Última actualización:** 2025-09-22
