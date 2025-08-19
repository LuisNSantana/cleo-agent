# Resumen de cambios recientes (Cleo Agent)

Última actualización: 2025-08-19

## API de Chat
- Refactor del endpoint `app/api/chat/route.ts` para modularidad y mantenibilidad.
- Se centralizó la construcción del prompt del sistema (incluye RAG y personalización) usando `lib/chat/prompt.ts` mediante `buildFinalSystemPrompt`.
- Conversión multimodal y filtrado de imágenes modular:
  - `lib/chat/convert-messages.ts`: normaliza mensajes (texto, imágenes, PDFs) para el modelo.
  - `lib/chat/image-filter.ts`: aplica límites por modelo para adjuntos visuales.
- Extracción de streaming/analytics a helper: `lib/chat/stream-handlers.ts` (maneja onError/onFinish, tokens reales/estimados y analytics RPC).
- Validaciones estrictas del payload con Zod en `app/api/chat/schema.ts`.
- Manejo de claves de proveedor y contexto de solicitud con `AsyncLocalStorage` (request context) y compatibilidad temporal con `globalThis`.
- Ajustes específicos por modelo (xAI Live Search, GPT‑5 reasoning_effort, defaults por modelo) y telemetría de uso.

## Recuperación de contexto (RAG)
- Recuperación y formateo de contexto unificados en `lib/chat/prompt.ts`.
- Auto-indexado de documentos recientes cuando faltan chunks y segundo pase para perfil del usuario.
- Registro analítico de uso de RAG con `trackFeatureUsage` cuando se usa contexto.

## Settings y preferencias de usuario
- Validación con Zod del endpoint `app/api/user-preferences/route.ts` usando el nuevo esquema en `app/api/user-preferences/schema.ts`.
- Defaults y endurecimiento de entrada para datos de personalización (personalidad, etc.).
- Integración directa de preferencias en prompts: `lib/chat/prompt.ts` obtiene `personality_settings` (o defaults) y genera un encabezado de personalidad con `lib/prompts/personality.ts`.

## Seguridad y robustez
- Endurecimiento previo: CSRF, saneamiento de inputs, cookies y límites de uso por modelo.
- Manejo de errores mejorado en streaming y almacenamiento de mensajes (tokens reales o estimados; tiempos de respuesta).

## Performance
- Cache de embeddings y recuperación adaptativa (topK/dinámica) en RAG.
- Filtrado inteligente de imágenes por límites de modelo para evitar errores de API.

## Pendientes recomendados (siguientes pasos)
- Tests unitarios mínimos: conversión multimodal y validación del esquema de preferencias.
- Afinar prompts por modelo y añadir toggles de razonamiento en UI si aplica.

```txt
Archivos clave tocados/añadidos:
- app/api/chat/route.ts (refactor y uso de buildFinalSystemPrompt)
- app/api/chat/schema.ts (Zod para ChatRequest)
- lib/chat/prompt.ts (builder unificado de prompt + RAG)
- lib/chat/convert-messages.ts (conversión multimodal)
- lib/chat/image-filter.ts (límite de imágenes por modelo)
- lib/chat/stream-handlers.ts (handlers de streaming/analytics)
- lib/prompts/personality.ts (plantillas de personalidad y generación de prompt personalizado)
- app/api/user-preferences/schema.ts (Zod para preferencias)
- app/api/user-preferences/route.ts (validación de payload)
```
