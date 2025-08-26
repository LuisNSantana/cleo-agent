# LangChain en Cleo Agent: Orquestación multi‑modelo, RAG y prompts de Cleo

Esta guía explica cómo funciona la integración de LangChain dentro de Cleo Agent, sus beneficios, y cómo se conecta con RAG/embeddings y los prompts de Cleo, incluyendo el streaming compatible con la UI.

## Qué aporta LangChain
- Orquestación multi‑modelo: elegir el mejor modelo por tarea para optimizar calidad/costo.
- Agentes especializados por proveedor: Groq para texto rápido y económico; OpenAI para multimodal/razonamiento.
- Encadenamiento y herramientas: fácil de extender con nuevas capacidades.
- Tipado y métricas: interfaces claras, logs y costos centralizados.

## Arquitectura en Cleo
- Router (`lib/langchain/router.ts`): decide el modelo según tipo de tarea (texto/imágenes), complejidad, etc.
- Agents (`lib/langchain/agents.ts`): instancia el LLM y procesa el input; inyecta contexto RAG y variantes de prompt de Cleo.
- Pipeline (`lib/langchain/pipeline.ts`): punto único de entrada. Normaliza metadata (useRAG, systemPromptVariant), llama al router y delega al agente.
- Tipos (`lib/langchain/types.ts`): contrato entre UI/API y la orquestación (TaskInput/Output/Metadata).
- Endpoint (`app/api/multi-model-chat/route.ts`): expone la orquestación con streaming SSE compatible con Vercel AI SDK v5.

Flujo: Request → Pipeline → Router → Agent → LLM → Streaming a la UI.

### Vista detallada del flujo
1) UI envía POST a `POST /api/chat`, que redirige a `POST /api/multi-model-chat` cuando eliges un modelo LangChain.
2) `multi-model-chat` valida el body con Zod, normaliza opciones y compone `metadata`:
	- `useRAG` se activa desde `options.enableSearch` (toggle de UI).
	- `systemPromptVariant` y `systemPrompt` personalizan el prompt de sistema.
3) `MultiModelPipeline.process` aplica defaults seguros y llama a `ModelRouter.route`.
4) El `AgentFactory` crea o reutiliza un agente según el proveedor (reutilización mejora la latencia).
5) El agente construye el prompt de sistema con `getCleoPrompt(...)`, añade contexto RAG si `useRAG` está activo, y llama al LLM.
6) La respuesta se devuelve con streaming SSE: `text-start` → múltiples `text-delta` → `finish` con uso de tokens.

## Modelos soportados
- Groq GPT‑120OSS: texto general/function calling, muy rápido y barato.
- OpenAI GPT‑4o‑mini (o 5‑mini): multimodal y mayor calidad para análisis de documentos/imágenes.

## RAG y embeddings
- Recuperación: `lib/rag/retrieve.ts` y `lib/rag/embeddings.ts`.
- Activación: desde la UI se usa `enableSearch`. El endpoint lo propaga como `metadata.useRAG`.
- Control: `metadata.maxContextChars` limita el tamaño del contexto que se inserta.
- Depuración: `metadata.debugRag` añade logs con fuentes y tamaños del contexto.

Cómo funciona:
1) Si `useRAG` es true, el agente consulta retrieve() con el mensaje del usuario.
2) Construye un bloque de contexto (trozos relevantes) y lo añade al prompt del modelo.
3) Respeta el límite `maxContextChars` para evitar sobre‑tokenizar.

Pipeline de recuperación en detalle:
- Indexación/documentos: chunking + embeddings (ver `lib/rag/chunking.ts`, `index-document.ts`).
- Búsqueda: hybrid (vector + lexical) con `useHybrid: true`.
- Re‑ranking: `useReranking: true` ajusta la relevancia; ver logs `[RERANK]`.
- Ensamblado de contexto: `buildContextBlock(chunks, maxContextChars)` produce un bloque con citas/sources.

## Prompts de Cleo
- Constructor de sistema: `lib/prompts/index.ts`.
- Variantes: seleccionar con `metadata.systemPromptVariant` (p. ej. "default", "coding", "assistant").
- Overwrite opcional: `metadata.systemPrompt` permite forzar un prompt de sistema específico.

## Streaming en la UI
- El endpoint emite eventos SSE: `text-start`, `text-delta` y `finish` con `usage`.
- La UI del chat ya consume estos eventos y renderiza el flujo de texto progresivamente.

Cabeceras usadas: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`.

## Cómo usarlo desde el cliente
- Selecciona el modelo LangChain en el selector de modelos (p. ej., "langchain:multi-model-smart").
- Para activar RAG desde la UI, habilita la opción de búsqueda/knowledge (`enableSearch`).
- Opcional: ajustar temperatura y `systemPromptVariant`.

## Variables de entorno
- GROQ_API_KEY, OPENAI_API_KEY.

## Solución de problemas
- No se ve streaming: revisa cabeceras SSE y que el endpoint use `text-delta`.
- 401/keys: comprueba variables GROQ/OPENAI y el mapeo de proveedor‑modelo.
- RAG no inyecta contexto: confirma `enableSearch=true`, índices poblados y `maxContextChars` suficiente.
- Prompt no cambia: verifica `systemPromptVariant` o `systemPrompt` en metadata.

### Interpretando los logs
- `[RERANK] ✅ Complete: X → Y docs` y `Scores:`: re‑ranqueo activo, con tiempos por fase; confirma que RAG está encendido.
- `[LangChain] Final system prompt prepared. length: NNNN`: tamaño del prompt final (sistema+contexto+usuario). Si N es muy alto, reduce `maxContextChars`.
- `⚡ Processing with LangChain`: inicio de procesamiento del request con resumen de tipo y tamaño.
- `🧭/🔍/🎯 ModelRouter`: análisis y decisión de routing; muestra modelo y fallback.
- `🏭/♻️ AgentFactory`: creación o reutilización de agentes (reutilización = menor latencia).
- `🚀 <Agent> processing task`: el agente seleccionado; `useRAG: true/false` indica si inyectó contexto.
- `📤 Sending request to <modelo>`: llamada al LLM del proveedor.
- `✅ <Agent> processing completed`: incluye tiempos, tokens estimados y costo.
- `✅ LangChain processing complete`: resumen final antes de emitir a la UI.

Si no aparecen logs `[RERANK]`, asegura `enableSearch=true` y que existan documentos indexados para ese `userId`/`documentId`.

## Extensión
- Añade nuevos agentes en `lib/langchain/agents.ts` siguiendo el patrón actual.
- Integra nuevos proveedores LangChain instalando su paquete y extendiendo el router.
- Agrega herramientas/pipelines adicionales sin tocar la UI.

## Parámetros y opciones soportadas
- `metadata.useRAG`: boolean. Activa recuperación de contexto (se mapea desde `options.enableSearch`).
- `metadata.maxContextChars`: número. Límite de caracteres del bloque de contexto RAG (default ~6000).
- `metadata.systemPromptVariant`: "default" | "journalism" | "developer" | "reasoning" | "minimal" | "debug".
- `metadata.systemPrompt`: string. Sobrescribe totalmente el prompt de sistema.
- `options.temperature`: número. Se pasa al modelo cuando está soportado.

## Métricas
`MultiModelPipeline.getMetrics()` expone:
- totalRequests, totalCost (estimado), averageResponseTime, modelUsage, costPerRequest y mostUsedModel.
Útil para dashboards y tuning de routing.
