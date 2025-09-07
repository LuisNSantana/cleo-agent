# 🗄️ Database Migrations Guide

Esta carpeta contiene todas las migraciones SQL necesarias para configurar la base de datos del sistema Cleo Agent.

## 📋 Orden de Ejecución

Ejecutar las migraciones en el siguiente orden:

### 1. Base Schema
```bash
# Esquema base del sistema
supabase_schema.sql
```

### 2. Componentes Core
```bash
# Agentes y configuración
supabase_schema_agents.sql

# Sistema de chat
supabase_schema_agents_chat.sql

# Gestión de tareas
supabase_schema_agent_tasks.sql

# Notificaciones de tareas
supabase_schema_task_notifications.sql
```

### 3. Funcionalidades Especializadas
```bash
# Sistema RAG
supabase_schema_rag.sql

# Sistema híbrido RAG
supabase_schema_hybrid_rag.sql

# Documentos y gestión
supabase_schema_add_documents.sql

# Analytics y métricas
supabase_schema_analytics.sql
```

### 4. Sistema de Sub-Agentes (NUEVO)
```bash
# 🚀 SUB-AGENTS SYSTEM - Ejecutar último
supabase_schema_sub_agents.sql
```

### 5. Integraciones Externas
```bash
# Skyvern integration
supabase_schema_skyvern.sql
supabase_schema_skyvern_tasks.sql

# Notificaciones de tareas
supabase_schema_task_notifications.sql
```

### 5. 🚀 SUB-AGENTS SYSTEM (NUEVO)
```bash
# Sistema de sub-agentes - EJECUTAR ÚLTIMO
supabase_schema_sub_agents.sql
```

## 🛠️ Cómo Ejecutar las Migraciones

### Opción 1: Supabase Dashboard
1. Ir a tu proyecto Supabase
2. Abrir el SQL Editor
3. Copiar y pegar el contenido de cada archivo SQL
4. Ejecutar en orden

### Opción 2: CLI de Supabase
```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
supabase login

# Ejecutar migraciones
supabase db push
```

### Opción 3: psql directo
```bash
# Conectar a tu base de datos
psql -h your-supabase-host -U postgres -d postgres

# Ejecutar cada archivo
\i migrations/supabase_schema.sql
\i migrations/supabase_schema_agents.sql
# ... continuar con el resto
```

## 🔍 Verificación de Instalación

Después de ejecutar todas las migraciones, verifica:

```sql
-- Verificar tablas principales
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar RLS
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar permisos
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'sub_agents';
```
````markdown
# �️ Guía de migraciones (completa y práctica)

Esta carpeta contiene las migraciones SQL para preparar la base de datos de Cleo Agent: esquema base, sistema de agentes (SAFE), chat/tareas, RAG/analytics, integraciones y siembra de agentes por defecto con prompts actualizados.

## 🚀 TL;DR — Orden recomendado

1) Base del producto
- `supabase_schema.sql`

2) Sistema de agentes (SAFE)
- `supabase_schema_agents_safe.sql`
- `supabase_cleanup_agents_recursion.sql` (normaliza RLS/triggers si vienes de versiones previas)

3) Chat y tareas
- `supabase_schema_agents_chat.sql`
- `supabase_schema_agent_tasks.sql`
- `supabase_schema_task_notifications.sql`

4) RAG y analítica
- `supabase_schema_rag.sql`
- `supabase_schema_hybrid_rag.sql`
- `supabase_schema_add_documents.sql`
- `supabase_schema_analytics.sql`

5) Integraciones
- `supabase_schema_skyvern.sql`
- `supabase_schema_skyvern_tasks.sql`

6) Sub‑agentes (SAFE)
- `supabase_schema_sub_agents_safe.sql` (funciones y columnas usando la tabla `agents`)

7) Siembra de agentes por defecto (prompts nuevos)
- `2025-09-07_seed_default_agents_prompts.sql`
  - Crea/actualiza Cleo, Wex, Toby, Ami, Peter, Emma y Apu con prompts y configuraciones alineadas al código.
  - Incluye `initialize_default_agents(user_id)` para sembrar por usuario.
  - Idempotente (puedes re‑ejecutarlo sin duplicar filas).

Nota: Los scripts antiguos de ejemplo para añadir agentes por separado quedaron obsoletos y fueron retirados. Usa la siembra unificada.

## 🛠️ Cómo ejecutar

Opción A — Supabase SQL Editor
1. Abre el editor SQL del proyecto.
2. Ejecuta cada archivo en el orden sugerido.

Opción B — psql
```sql
-- Conéctate y ejecuta en orden
\i migrations/supabase_schema.sql
\i migrations/supabase_schema_agents_safe.sql
\i migrations/supabase_cleanup_agents_recursion.sql
\i migrations/supabase_schema_agents_chat.sql
\i migrations/supabase_schema_agent_tasks.sql
\i migrations/supabase_schema_task_notifications.sql
\i migrations/supabase_schema_rag.sql
\i migrations/supabase_schema_hybrid_rag.sql
\i migrations/supabase_schema_add_documents.sql
\i migrations/supabase_schema_analytics.sql
\i migrations/supabase_schema_skyvern.sql
\i migrations/supabase_schema_skyvern_tasks.sql
\i migrations/supabase_schema_sub_agents_safe.sql
\i migrations/2025-09-07_seed_default_agents_prompts.sql
```

Opción C — Supabase CLI
- Si ya usas un pipeline de migraciones, importa estos archivos y ejecuta `supabase db push`.

## 🌱 Siembra por usuario (post‑signup)

Tras crear un usuario, ejecuta:
```sql
SELECT initialize_default_agents('<USER_UUID>'::uuid);
```
El script de siembra también trae un bloque opcional que recorre `users` para inicializar a todos los usuarios existentes.

## � Verificación rápida

Agentes por defecto (conteo):
```sql
SELECT name, COUNT(*) AS total
FROM agents
WHERE is_default = true AND COALESCE(is_sub_agent,false)=false AND parent_agent_id IS NULL
GROUP BY name ORDER BY name;
```

Snapshot de prompts:
```sql
SELECT name, length(system_prompt) AS len, left(system_prompt, 180) AS preview
FROM agents
WHERE is_default = true
ORDER BY name;
```

Funciones de sub‑agentes (SAFE):
```sql
SELECT proname FROM pg_proc WHERE proname IN (
  'get_sub_agents_for_parent', 'get_sub_agent_stats', 'generate_unique_delegation_tool_name'
);
```

## ❓ FAQ breve

- ¿Por qué “SAFE”? Evitan recursiones en RLS/triggers y unifican sub‑agentes en la tabla `agents` (sin tabla `sub_agents`).
- ¿Puedo re‑ejecutar la siembra? Sí, es idempotente; actualiza prompts/configs sin duplicar filas.
- ¿Cómo conecto la siembra al alta de usuarios? Llama `initialize_default_agents(user_id)` desde tu backend/trigger post‑signup.

## 🆘 Troubleshooting

- permission denied: revisa RLS; para depurar temporalmente (no en prod):
  ```sql
  ALTER TABLE public.agents DISABLE ROW LEVEL SECURITY;  -- debug
  ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;   -- restaurar
  ```
- relation does not exist: confirma el orden de ejecución.
- duplicate key value: usa la siembra unificada; evita scripts legacy.

—

Para una versión resumida, mira `migrations/README.md`.

Última actualización: Septiembre 2025
````
-- Obtener estadísticas
