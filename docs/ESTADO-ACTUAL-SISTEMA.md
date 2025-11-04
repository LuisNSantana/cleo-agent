# Cleo — Estado actual (nov 2025)

Guía de referencia para entender cómo funciona hoy la plataforma multi‑agente, qué aporta la integración con LangChain/LangGraph, y cómo escalar y extender el sistema. Este documento está basado en el código actual del repositorio.

---

## 1) Resumen ejecutivo

- Chat global y por proyecto sobre Next.js 15 (App Router) + React 19 con SSE.
- Orquestación multi‑agente usando LangGraph (nodos: agente → aprobaciones → tools), con timeouts, paralelismo y checkpoints.
- Tool calling nativo (LangChain) con modelos xAI (ChatXAI) y otros proveedores.
- Delegaciones robustas (Cleo → especialistas → sub‑agentes) con fixes clave: resolvers cross‑context y canonicalización de IDs.
- Persistencia de pipeline/timeline en Supabase y RAG con caché L2 (Redis Upstash).

Resultado: una arquitectura clara, extensible y observable, lista para añadir agentes, tools y proveedores sin fricción.

---

## 2) Arquitectura de alto nivel

- Endpoint principal de chat: `app/api/chat/route.ts` (runtime `nodejs`, `maxDuration = 300`).
- Núcleo de agentes (LangGraph): `lib/agents/core/` (builder del grafo, ejecución, herramientas, delegación, checkpoints, métricas).
- Models: `lib/agents/core/model-factory.ts` (ChatXAI, ChatOpenAI, ChatAnthropic, ChatGroq, ChatMistralAI, ChatOllama).
- Tools: `lib/tools/index.ts` (registro central, Zod schemas, inyección de contexto de usuario).
- RAG: `lib/rag/*` (retrieval híbrido + caché Redis); loader de contexto inteligente.
- UI: timeline y chips de tools persistidos en `messages.parts` (DB), renderizados en componentes de chat.

---

## 3) Flujo del chat global (end‑to‑end)

1) `POST /api/chat` (`app/api/chat/route.ts`):

- Valida payload, normaliza modelo y construye el system prompt final (incluye hints de delegación y banderas de RAG).
- Carga contexto de la conversación con un smart loader respetando budget de tokens.
- Obtiene el orquestador central (`getGlobalOrchestrator`) y ejecuta el grafo de LangGraph.
- Emite eventos SSE con pasos de pipeline, tool invocations, delegaciones y reasoning.

1) Persistencia:

- Guarda el mensaje assistant final y `parts` (JSONB) para reconstruir timeline/chips tras recargas (UI y analytics).
- Checkpoints de ejecución en Supabase para reanudar flujos largos o aprobados por humanos.

1) Respuesta:

- Streaming SSE + mensaje final consistente con el pipeline ejecutado.

Beneficios: UX fluida, pipeline auditable y reproducible, delegaciones y tools visibles, y continuidad en flujos largos.

---

## 4) Núcleo de orquestación (LangGraph)

Ubicación: `lib/agents/core/`

- `orchestrator.ts`: ciclo de vida del orquestador, memoria, métricas, registro global de ejecuciones y coordinación de eventos.
- `graph-builder.ts`: grafo por agente con nodos estándar:
  - `agent` → `check_approval` → `tools` (con lazos limitados por rol: supervisor vs especialista).
  - Presupuestos por ejecución (`timeout-manager.ts`): tiempo total, nº de tools y ciclos del agente.
  - Ejecución paralela de herramientas (`tool-executor.ts`) con timeouts por llamada.
  - Aprobaciones HITL (`approval-node.ts`) para herramientas sensibles.
  - Checkpoints (`checkpoint-manager.ts`) para continuidad y recuperación.
- `execution-manager.ts`, `execution-registry.ts`, `event-emitter.ts`: control de estado, catálogo global y difusión de eventos.

¿Por qué LangGraph? Define explícitamente el flujo (nodos) y los límites, facilita componer aprobaciones/tooling/delegación, y aporta control y observabilidad finos.

---

## 5) Modelos y tool calling

Ubicación: `lib/agents/core/model-factory.ts`

- Integraciones oficiales de LangChain:
  - xAI `ChatXAI` (e.g., `grok-4-fast-reasoning`) — reemplaza wrappers custom y habilita tool calling nativo.
  - `ChatOpenAI`, `ChatAnthropic`, `ChatGroq`, `ChatMistralAI`, `ChatOllama`.
- Enlace de tools (crítico): el `graph-builder` usa `bindTools(lcTools, { tool_choice: 'auto' })` si el modelo lo soporta.
- Caching: `InMemoryCache` reduce latencia/coste.
- Fallbacks: soporte para alternar proveedor si falta credencial o se agotan límites.

Resultado: llamadas a herramientas nativas (no XML), proveedores intercambiables y coste/latencia optimizados.

---

## 6) Herramientas (tools) y contexto de usuario

Ubicación: `lib/tools/index.ts`

- Registro central con Zod schemas.
- Inyección de contexto (CRÍTICO): `ensureToolsHaveRequestContext()`/`wrapToolExecuteWithRequestContext()` propagan `userId`, `requestId` y `model` a cada ejecución (auditoría y rate‑limits por usuario).
- Catálogo: Google Workspace (Gmail/Drive/Docs/Sheets), Notion, SerpAPI, Skyvern, utilidades, y `completeTaskTool` (señala cierre de tarea tras ejecutar acciones reales).
- Ejecución paralela: `tool-executor.ts` con timeouts per‑tool y reporting al timeline.
- Aprobaciones HITL: vía `approval-node.ts` para acciones sensibles.

Ventajas: seguridad, trazabilidad, y velocidad (paralelismo) sin perder control de usuario y cuotas.

---

## 7) Delegaciones y sub‑agentes (fixes incluidos)

- Decisión: router hints y reglas de orquestación sugieren especialista (p. ej., Ami para correo), luego el modelo confirma.
- Ejecución:
  - `delegation-handler.ts`: single‑flight (dedup por clave), seguimiento y espera de finalización.
  - `delegation-coordinator.ts`: enlaza ejecuciones hijas con el padre, emite progreso y resuelve la promesa original.
- Fixes clave (nov 2025):
  1) Cross‑async context: los resolvers se guardan también en un **Map global** (además de AsyncLocalStorage) para que el coordinador pueda resolver aunque cambie el contexto async.
  2) Clave canónica: `createDelegationKey()` **canonicaliza** el `targetAgent` (ej. `ami` → `ami-creative`) para que la key usada al registrar y al buscar coincidan.
- Sub‑agentes: `sub-agent-manager.ts` carga sub‑agentes (p. ej., Astra) y aplica el mismo patrón de grafo con tools/approvals/timeouts.

Impacto: delegaciones confiables (sin timeouts fantasma), progreso visible (“starting → in_progress → finalizing → completed”) y resultados integrados.

---

## 8) RAG, persistencia y analítica

- RAG (`lib/rag/*`): retrieval híbrido con reranking opcional; caché L2 (Redis Upstash) y L1 en memoria.
- Loader de contexto: ajusta la historia incluida según presupuesto de tokens (evita desbordes de prompt).
- Persistencia de pipeline: `messages.parts` (JSONB) almacena pasos del pipeline y chips de tools para rehidratación en UI y análisis.
- Checkpoints (Supabase): continuidad de ejecuciones largas, aprobaciones HITL y recuperación tras fallos.

Resultado: contexto eficiente y persistente; UX consistente tras recargas; datos listos para analítica.

---

## 9) Frontend y chat por proyecto

- Chat global: componentes de timeline/chips consumen eventos SSE y renderizan el pipeline con estados.
- Chat por proyecto: `app/p/[projectId]/project-view.tsx` usa `useChat` (AI SDK v5) del lado cliente y convierte mensajes al formato requerido. Integra adjuntos, toggles (p. ej., `enableSearch`) y `getProjectSystemPrompt(...)` para contextualizar.
- Backend compartido: ambos flujos usan el mismo endpoint `/api/chat`, por lo que heredan tools, delegación y persistencia del pipeline.

Ventajas: coherencia UX, reutilización de lógica, y fácil especialización por proyecto.

---

## 10) Escalabilidad, confiabilidad y observabilidad

- Escalabilidad:
  - Presupuestos por ejecución (`timeout-manager.ts`): tiempo total, nº de tools y ciclos de agente.
  - Paralelismo de tools con timeouts y aislamiento.
  - Caches: modelos (InMemory) y RAG (Redis).
  - LRU en registros de ejecución (limpieza automática para memoria estable).
- Confiabilidad:
  - `error-handler.ts` con políticas de reintento y circuit breaker.
  - Límites diarios por usuario/modelo (`lib/daily-limits.ts`).
  - Aprobaciones HITL para acciones sensibles.
- Observabilidad:
  - Eventos de pipeline detallados, logs con marcas (routing, RAG, tools, delegations) y OpenTelemetry opcional.
  - Vistas/Materialized Views para timelines y uso de tools (migraciones en `migrations/*`).

Beneficio: operación predecible en carga, menor latencia/costes, y diagnósticos rápidos.

---

## 11) Beneficios concretos de LangChain/LangGraph

- Tool calling nativo multi‑proveedor: una sola abstracción para xAI/OpenAI/Anthropic/Groq/Mistral/Ollama.
- Grafo declarativo por agente: composición clara de aprobaciones, tools, timeouts, y delegación.
- Menos “pegamento” ad hoc y más garantías de tipo/contrato; integración de nuevos modelos/tools con mínima fricción.
- Mejor depuración: cada nodo es una unidad trazable; se pueden aislar problemas de tools, aprobaciones o delegación.

Resultado: velocidad para integrar/iterar, confiabilidad en producción y base sólida para escalar el sistema de agentes.

---

## 12) Cómo extender (ruta práctica)

- Agente nuevo:
  1) Defínelo en `lib/agents/predefined/` y expórtalo en `lib/agents/predefined/index.ts`.
  2) (Opcional) Añade palabras clave al router para early routing.
- Tool nueva:
  1) Implementa en `lib/tools/*` y expórtala en `lib/tools/index.ts`.
  2) Envuélvela con `ensureToolsHaveRequestContext(...)` (CRÍTICO para auditoría y límites).
  3) Marca aprobación HITL si es sensible.
- Proveedor/modelo nuevo:
  1) Añádelo en `lib/agents/core/model-factory.ts` usando la clase oficial de LangChain.
  2) Si soporta tools, respeta `bindTools(..., { tool_choice: 'auto' })`.
- Delegación:
  1) Usa tools `delegate_to_*` o nodos del grafo.
  2) Mantén canonicalización de IDs y el resolver global para evitar timeouts por claves desalineadas.

---

## 13) Próximos pasos sugeridos

1) Actualizar `@langchain/core` a ^1.x en ventana de mantenimiento (hoy funciona con 0.3.x, pero hay peer warnings).
2) Tests focalizados:
   - Delegación cross‑context (resolver global + canonicalización de keys).
   - Ejecución paralela de tools y aprobaciones.
   - RAG: cache hit/miss y límites de contexto.
3) Documentación viva:
   - Mantener un changelog de arquitectura y una guía “cookbook” de tareas comunes (añadir tool/agente/modelo, depurar delegación, etc.).
4) Observabilidad:
   - Paneles de métrica por nodo (tiempos), tasa de delegaciones resueltas, fallos por tool/proveedor.

---

### Referencias rápidas (rutas)

- Endpoint chat: `app/api/chat/route.ts`
- Orquestación (núcleo): `lib/agents/core/` → `graph-builder.ts`, `orchestrator.ts`, `tool-executor.ts`, `timeout-manager.ts`, `approval-node.ts`, `checkpoint-manager.ts`, `delegation-handler.ts`, `delegation-coordinator.ts`
- Modelos: `lib/agents/core/model-factory.ts`
- Tools: `lib/tools/index.ts` (+ submódulos)
- RAG: `lib/rag/*`
- Chat por proyecto: `app/p/[projectId]/project-view.tsx`
- Persistencia de pipeline: `messages.parts` (DB)
