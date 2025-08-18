# Guía de Base de Datos (Supabase + Postgres + pgvector)

Esta guía explica la estructura de la BD, los cambios recientes (RLS, funciones y extensiones), y cómo configurar Supabase para ejecutar el proyecto de forma segura.

## Resumen rápido
- Motor: Postgres (Supabase)
- Esquemas: `public` (principal) y `auth` (de Supabase)
- Extensiones: `pgcrypto`, `uuid-ossp`, `vector` (pgvector) — instalada en `public`
- Seguridad: RLS activado en todas las tablas de usuario. Acceso sólo con `auth.uid()` (multitenancy por usuario).
- RAG: columnas `vector` y funciones de búsqueda híbrida + exacta.
- Analytics: tablas de métricas por modelo, herramienta, sesión y conversación.

---

## Estructura de esquemas y extensiones

- Esquema `public`: todo el modelo de datos de la app.
- Esquema `auth`: lo gestiona Supabase (tabla `auth.users`).

Extensiones necesarias:
- `pgcrypto` (para `gen_random_uuid()`)
- `uuid-ossp` (para `uuid_generate_v4()`)
- `vector` (pgvector) — se instala y usa en el esquema `public`.

Nota importante sobre pgvector:
- El tipo `vector` y sus operadores (`<->`, `<=>`) se esperan en el esquema `public`.
- Nuestras funciones RAG usan `search_path = 'public'`. Si mueves `vector` a otro esquema, tendrás que actualizar funciones y tipos para evitar errores del tipo: `operator does not exist: extensions.vector <=> extensions.vector`.

---

## Tablas principales (public)

A continuación, un mapa funcional de las tablas más relevantes. Todas tienen RLS activado y están ligadas al usuario a través de `user_id` y/o relaciones.

### Conversaciones y mensajes
- `chats`
  - Campos: `id (uuid)`, `user_id (uuid)`, `project_id (uuid?)`, `title`, `model`, `system_prompt`, `public (bool)`, métricas agregadas (p.ej. `message_count`, `last_message_at`, `total_tokens`, `engagement_score`).
  - FKs: `user_id -> users.id`, `project_id -> projects.id`.
- `messages`
  - Campos: `id (serial)`, `chat_id (uuid)`, `user_id (uuid)`, `content`, `role` (check: `system|user|assistant|data`), `parts (jsonb)`, métricas (`response_time_ms`, `input_tokens`, `output_tokens`), `tools_invoked (text[])`, `personality_snapshot (jsonb)`.
  - FKs: `chat_id -> chats.id`, `user_id -> users.id`.
- `chat_attachments`
  - Archivos asociados a un chat. Relación cruzada valida que el adjunto pertenezca a chats del mismo `user_id`.

### Documentos y RAG
- `documents`
  - Documento fuente (subido, generado o externo). Tiene `user_id`, opcional `chat_id` y `project_id`, y contenidos (`content_md`, `content_html`).
  - FKs: `user_id -> users.id`, `chat_id -> chats.id`, `project_id -> projects.id`.
- `document_chunks`
  - Chunks tokenizados del documento para RAG.
  - Campos clave: `content`, `content_tokens`, `embedding vector`, `metadata jsonb`, `chunk_index`, `chunk_version` (v1/v2).
  - FKs: `document_id -> documents.id`, `user_id -> users.id`.
- `ingestion_jobs`
  - Tareas de ingestión/indexado con `status`, `error_message` y timestamps.

### Analytics (uso y rendimiento)
- `model_usage_analytics`
  - Métricas por día y por modelo: `message_count`, `total_input_tokens`, `total_output_tokens`, `total_cost_estimate`, `average_response_time_ms`, `successful_requests`, `failed_requests`, etc.
- `tool_usage_analytics`
  - Métricas de invocaciones de herramientas (`tool_name`, recuentos, tiempos, errores, parámetros populares).
- `feature_usage_analytics`
  - Uso de funcionalidades de la app por día (`feature_name`, `usage_count`, `success_rate`, `total_time_spent_minutes`).
- `user_session_analytics`
  - Métricas por sesión: tiempos, mensajes enviados/recibidos, modelos usados, herramientas, interacciones con canvas, ficheros, consultas RAG, etc.
- `conversation_analytics`
  - Métricas agregadas por chat: `total_messages`, `user_messages`, `assistant_messages`, `conversation_duration_minutes`, `models_switched`, `personality_changes`, `tools_used`, `avg_response_length`, `complexity_score`, `satisfaction_rating`.

### Usuarios, proyectos y configuración
- `users` (perfil y métricas agregadas del usuario; FK a `auth.users`)
- `projects` (agrupa chats y documentos por proyecto)
- `user_preferences` (tema, idioma, ajustes de personalidad, etc.)
- `user_keys` (API keys cifradas por proveedor; PK compuesta `user_id, provider`)
- `user_service_connections` (tokens OAuth/datos de conexión a Google, Notion, etc.)
- `feedback` (feedback del usuario)

---

## Relaciones clave (resumen)
- `users.id` ↔ `auth.users.id`
- `chats.user_id` → `users.id`
- `messages.chat_id` → `chats.id` y `messages.user_id` → `users.id`
- `documents.user_id` → `users.id`; opcional `chat_id` y `project_id`
- `document_chunks.document_id` → `documents.id` y `document_chunks.user_id` → `users.id`
- `ingestion_jobs.document_id` → `documents.id`; `ingestion_jobs.user_id` → `users.id`
- Todas las tablas de analytics referencian a `users.id` (y algunas a `chats.id`).

---

## RLS (Row Level Security)

- RLS habilitado en todas las tablas de datos de usuario.
- Patrón general de políticas: sólo el usuario autenticado (`auth.uid()`) puede ver/insertar/actualizar/eliminar sus filas.
- Validación cruzada en tablas con relaciones:
  - `chat_attachments`: sólo si el `chat_id` pertenece al `auth.uid()`.
  - `conversation_analytics`: sólo si `user_id = auth.uid()` y `chat_id` pertenece a ese usuario.
- Reglas especiales (si aplica):
  - Campos `public` en `chats` no rompen el aislamiento entre usuarios; sólo afectan a funcionalidades de compartir donde se apliquen endpoints específicos.

Si añades nuevas tablas, copia el patrón: políticas de `SELECT/INSERT/UPDATE/DELETE` con `user_id = auth.uid()` y valida relaciones por FK.

---

## Funciones y búsqueda RAG

Funciones principales:
- `public.match_document_chunks(p_user_id uuid, p_query_embedding vector, p_match_count int, p_document_id uuid default null, p_project_id uuid default null, p_min_similarity double precision default 0)`
  - Devuelve los chunks más similares por vector.
  - Usa `(1 - (dc.embedding <=> p_query_embedding))` como similitud.
  - `search_path = 'public'` (pgvector en `public`).
- `public.hybrid_search_document_chunks(p_user_id uuid, p_query_embedding vector, p_query_text text, p_match_count int, p_document_id uuid default null, p_project_id uuid default null, p_min_similarity double precision default 0, p_vector_weight double precision default 0.7, p_text_weight double precision default 0.3)`
  - Combina similitud vectorial y ranking de texto (`ts_rank`), retorna `hybrid_score`.
  - `search_path = 'public'`.

Requisitos pgvector:
- Tipo `vector` disponible en `public`.
- Operadores `<->` y `<=>` accesibles con `search_path = 'public'`.
- La columna `document_chunks.embedding` es de tipo `vector`.

Sugerido: mantén una dimensión fija (p.ej. 1536) para evitar mezclar embeddings de tamaños distintos.

---

## Cambios recientes (seguridad y estabilidad)

- RLS reforzado en todas las tablas (acceso sólo autenticado y por propietario).
- Validaciones cruzadas en `chat_attachments` y `conversation_analytics` para evitar filtraciones entre usuarios.
- pgvector asegurado en `public` para operadores y tipos sin fricciones.
- `search_path` explícito en funciones RAG a `public`.
- Funciones de analytics con `search_path` explícito recomendado a `public` (si tu proyecto aún muestra `search_path=""`, actualízalas para mayor seguridad/estabilidad).

---

## Cómo configurar la BD desde cero (Supabase)

1) Crea un proyecto en Supabase y anota:
- URL del proyecto y claves: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Clave de servicio (server): `SUPABASE_SERVICE_ROLE_KEY` (para tareas administrativas del backend).

2) Activa extensiones en SQL Editor (o CLI):
```sql
create extension if not exists pgcrypto with schema public;
create extension if not exists "uuid-ossp" with schema public;
create extension if not exists vector with schema public;
```

3) Aplica los esquemas SQL de este repo (en este orden recomendado):
- `supabase_schema.sql` (base)
- `supabase_schema_rag.sql` (RAG y documentos)
- `supabase_schema_hybrid_rag.sql` (búsqueda híbrida)
- `supabase_schema_analytics.sql` (tablas y funciones de analítica)
- `supabase_schema_add_documents.sql` (si procede en tu caso)

Si algún objeto ya existe, puedes ignorar el error o adaptar el script según tu estado.

4) Revisa RLS en Supabase Studio → Auth → Policies (o SQL):
- Todas las tablas listadas arriba deben tener políticas `FOR SELECT/INSERT/UPDATE/DELETE` usando `auth.uid()` y validando FKs.

5) Ajustes de Auth recomendados:
- Proveedor Email OTP: `expiry` ≤ 60 min (recomendado: 30 min).
- Habilita dominios/redirects según `.env` y tu despliegue.

6) Variables de entorno en la app:
- Cliente web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Servidor: `SUPABASE_SERVICE_ROLE_KEY` (no exponer en cliente).

---

## Buenas prácticas y troubleshooting

- Operadores vectoriales: si ves `operator does not exist: ... vector <=> ... vector`:
  - Verifica que `extension vector` está en `public` y que las funciones usan `search_path = 'public'`.
- RLS: si algo “desaparece”, suele ser por política que bloquea vistas; revisa `auth.uid()` y relaciones.
- Dimensión de embeddings: no mezcles tamaños; si cambias de proveedor, reindexa.
- Migraciones: aplica los `.sql` de este repo para mantener coherencia con el código.

---

## Apéndice: Tablas incluidas (resumen)

- Conversación: `chats`, `messages`, `chat_attachments`
- RAG: `documents`, `document_chunks`, `ingestion_jobs`
- Analytics: `model_usage_analytics`, `tool_usage_analytics`, `feature_usage_analytics`, `user_session_analytics`, `conversation_analytics`
- Usuario/config: `users`, `user_preferences`, `user_keys`, `user_service_connections`, `projects`, `feedback`

Todas con RLS ON y FKs a `users` (y donde aplica, a `chats`/`documents`/`projects`).

---

¿Falta algo en tu instancia? Abre un issue con tu `schema diff` o comparte el error del SQL Editor y lo añadimos a esta guía.
