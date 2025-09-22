# Cleo Agent — Guía General del Proyecto (Agosto 2025)

> Visión global de cómo funciona el agente: arquitectura, prompts y personalidades, RAG/embeddings, herramientas (tools), memoria, streaming, optimización de tokens/caché y extensibilidad.

---

## 1) Objetivo del agente
Cleo es un asistente conversacional con personalidad configurable que integra búsqueda web, edición de documentos, Google Calendar/Drive y un sistema RAG para usar tu información personal y de documentos. Priorizamos:
- Respuestas útiles, estructuradas y empáticas en tu idioma.
- Integraciones prácticas (Drive/Calendar, documentos, web).
- Memoria personalizable que mejora con el uso.

---

## 2) Arquitectura y stack
- Framework: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- AI SDK v5 (streaming, tool calling, reasoning opcional)
- DB: Supabase (PostgreSQL + pgvector) con RLS
- Autenticación: Supabase Auth
- Estado: React Context + IndexedDB
- Docker: dev/prod con pnpm

Estructura de carpetas relevante:
- `app/` — rutas (API de chat, preferencias), UI principal y componentes de chat.
- `lib/` — modelos, tools, RAG, prompts, utilidades y proveedores.
- `components/` — componentes UI (chat, canvas, etc.).
- `docs/` — documentación (esta guía).

---

## 3) Flujo end‑to‑end de una conversación
1) El usuario envía un mensaje desde la UI (`useChatCore`).
2) En el servidor (`app/api/chat/route.ts`):
   - Se valida uso/llaves.
   - Se construye el System Prompt combinando personalidad + reglas generales; si RAG está activo, se antepone un bloque de contexto recuperado de tus documentos.
   - El modelo (vía AI SDK) puede invocar herramientas (webSearch, Drive, Calendar, Document, Memory…).
   - Tras las herramientas, el servidor exige síntesis final en Markdown con “Puntos clave” y “Fuentes” cuando aplica.
3) Streaming de la respuesta a la UI. Si el modelo no emite texto tras usar tools, el cliente genera un fallback rico (resumen + fuentes) para no dejar al usuario sin respuesta.
4) El mensaje del asistente y métricas quedan almacenados.

---

## 4) Modelos y proveedores
- Registro de modelos y proveedores en `lib/models` y `lib/openproviders`.
- Gestión de API keys por usuario/entorno en `lib/user-keys.ts` (desencriptación y fallback a variables de entorno).
- Soporte de “reasoning” cuando el modelo lo permite (p. ej., GPT‑5 Nano) con `reasoning_effort`.

Notas:
- Gestión de imágenes con límites por modelo (`MODEL_IMAGE_LIMITS`) y filtrado inteligente para no exceder topes.

---

## 5) Tools (herramientas)
Ubicación: `lib/tools/`. Registro central en `lib/tools/index.ts`.

Herramientas principales:
- Web Search (`webSearch`): Brave Search. Ahora incluye caché de 10 min, resumen e insights automáticos para síntesis eficiente.
- Google Calendar: listar/crear eventos, con formato de tabla y sugerencias.
- Google Drive: listar/buscar/crear carpetas, subir archivos. Respuestas estructuradas (árbol, totales, actividad).
- Create Document (`createDocument`): crea documentos largos para el canvas/editor usando marcadores ocultos `<!--FILE:...-->`.
- Utilidades: clima, hora, calculadora, precio cripto, random facts.
- Memoria (`memoryAddNote`): NUEVO. Guarda hechos/preferencias del usuario en `user_memory_auto.md` y re‑indexa en RAG.

Reglas de respuesta tras tools:
- Siempre sintetizar en Markdown: resumen 1 línea, “Puntos clave” (≤3), y “Fuentes” (cuando hay enlaces).
- Deduplicar y ser compacto.

---

## 6) Prompts y Personalidades
Archivos clave: `lib/prompts/index.ts`, `lib/prompts/personality.ts`.

- `generatePersonalizedPrompt(modelName, personalitySettings)` construye un bloque de personalidad (empathetic/playful/professional/creative/analytical/friendly) ajustado por sliders: creatividad, formalidad, entusiasmo, helpfulness, emojis, modo proactivo y `customStyle`.
- Luego anexa el Prompt Principal (Core Identity + Comunicación + Formato de herramientas + Razonamiento + Integración de tools + Reglas de eficiencia).
- Resultado: un único System Prompt coherente con personalidad + reglas base.

Formato y estilo:
- Markdown conciso con encabezados y listas.
- Para webSearch: resumen breve + “Puntos clave” + “Fuentes”.
- Para Drive/Calendar: respuestas inline (no se envuelven en FILE), con tablas/árboles y sugerencias prácticas.
- Contenido largo (ensayos/informes) se devuelve oculto en FILE markers para el canvas.

---

## 7) RAG: indexación, embeddings y retrieval
Carpetas: `lib/rag/*`.

- Documentos y chunks en Supabase (`documents`, `document_chunks`).
- Chunking y embeddings: `index-document.ts`, `chunking.ts`, `embeddings.ts` (OpenAI embeddings por defecto). Incluye solapamiento y estimación de tokens por chunk.
- Búsqueda híbrida: `retrieve.ts` combina vector + full‑text vía RPC `hybrid_search_document_chunks`, con fallback a vector-only y reranking cruzado (`reranking.ts`).
- `buildContextBlock()` genera un bloque de contexto (≤ ~8k chars) que se PREPENDE al System Prompt para mayor saliencia.

Personalización automática:
- Al guardar tus preferencias se upsertea `user_profile_auto.md` y se re‑indexa, de modo que el retrieval ya “recuerda” tu estilo y configuración.
- Si el retrieval inicial trae pocos chunks, se ejecuta una consulta secundaria enfocada a tu perfil para mejorar el contexto.

Observabilidad (logs):
- `[CHUNK]`, `[HYBRID]`, `[RERANK]`, `[RAG]` con conteos, puntajes y previsualizaciones.

---

## 8) Memoria de largo plazo
- Perfil automático: `user_profile_auto.md` — generado al guardar preferencias (tipo de personalidad, sliders, customStyle). Indexado para RAG.
- Memorias activas: `memoryAddNote` — cuando dices “recuerda que…”, se agrega/actualiza `user_memory_auto.md` con una nota corta (tema, frase, importancia) y se re‑indexa. Esto se recupera automáticamente en charlas futuras.

Buenas prácticas:
- Pedir confirmación antes de guardar datos sensibles.
- Mantener las notas concisas para facilitar el retrieval.

---

## 9) Streaming, fallbacks y formato
- AI SDK v5 con `streamText()` y eventos (texto, reasoning, tool‑calls).
- `maxSteps` ajustado para que el modelo tenga espacio a usar tools y sintetizar.
- Cliente (`use-chat-core.ts`): si hubo tools pero el modelo no emitió texto, se genera un fallback rico con resumen, puntos clave y fuentes.
- Servidor (`/api/chat/route.ts`): instrucción explícita para siempre sintetizar respuesta post‑tools, en Markdown, con deduplicación.
 - UI: el panel de reasoning aparece colapsado por defecto al terminar el streaming para dejar más espacio al contenido principal; se puede expandir bajo demanda.

---

## 10) Optimización de tokens y caché
- Caché de webSearch (10 min) y resumen/insights para ahorrar tokens.
- Reglas de formato compacto: listas/encabezados, evitar redundancia.
- Dedupe de enlaces y top‑N de fuentes.
- RAG con topK balanceado + reranking para maximizar señal por token.
- Filtrado inteligente de imágenes por modelo.
- “Cache hint” en prompt: reusar conclusiones y actualizar solo deltas.
 - Presupuesto dinámico por modelo: GPT‑5 mini (400k) y Nano (128k) mapeados explícitamente; se reserva más output (~3k tokens) en GPT‑5 para respuestas más ricas e interactivas.
 - Conteo aproximado de tokens por longitud (chars/4) y recorte de contexto RAG por `ragMaxChars`.

---

## 11) Seguridad, llaves y errores
- Llaves por proveedor y por usuario vía `lib/user-keys.ts` (desencriptación segura + fallback a env vars). AES‑256‑GCM para claves almacenadas.
- RLS en Supabase para aislar datos por usuario.
- Manejo de errores con mensajes claros (tamaño de documentos, límites de tokens/minuto, etc.).

---

## 12) Cómo ejecutar
(Referencial; ver `README.md` para detalles).

```bash
# Desarrollo
pnpm install
pnpm dev

# Docker dev
pnpm docker:dev

# Producción
pnpm docker:prod
```

Variables importantes: `OPENAI_API_KEY`, `XAI_API_KEY`, `GROQ_API_KEY`, `BRAVE_SEARCH_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENWEATHER_API_KEY`, Google OAuth vars, etc. Consulta `.env.example`/`README`.

---

## 13) Extensibilidad
- Añadir tools: crea archivo en `lib/tools/`, exporta con `tool()`, registra en `lib/tools/index.ts`, y (si procede) añade reglas de formato al prompt principal.
- Añadir modelos: agrega config en `lib/models` y actualiza el registro/selector UI.
- Ajustar prompts: modifica `lib/prompts/index.ts` (formato/guías) o `lib/prompts/personality.ts` (plantillas y sliders).
- RAG: ajustar chunking, embeddings o ranking en `lib/rag/`.

---

## 14) Estado actual y próximos pasos sugeridos
- Estado:
  - Personalidades integradas con el prompt principal.
  - RAG híbrido con reranking + perfil automático.
  - webSearch con caché + resumen/insights.
  - Fallbacks cliente/servidor para garantizar respuesta con formato.
  - Memoria persistente de usuario vía `memoryAddNote`.
- Próximos pasos:
  - UI para confirmar “¿Quieres que recuerde esto?” al detectar preferencias.
  - Panel de memoria para editar/borrar notas.
  - Métricas de calidad de retrieval (precision/recall) y trazabilidad de fuentes.
  - Soporte de múltiples proyectos/carpetas para RAG.

---

## 15) Referencias rápidas de archivos
- Prompt principal: `lib/prompts/index.ts`
- Personalidades: `lib/prompts/personality.ts`
- API de chat: `app/api/chat/route.ts`
- Tools: `lib/tools/*` (registro en `lib/tools/index.ts`)
- RAG: `lib/rag/*`
- Preferencias de usuario: `app/api/user-preferences/route.ts`
- Gestión de llaves: `lib/user-keys.ts`
- Hook de chat (cliente): `app/components/chat/use-chat-core.ts`

### 15.1) Delegación y Confirmaciones

- Documento detallado de eventos SSE, confirmaciones y heurística de delegación: `docs/delegation-and-confirmation-events.md`

---

¿Dudas o mejoras? Abre un issue/PR con el apartado de esta guía que quieras ampliar.
