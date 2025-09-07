# Sistema de Sub-Agentes - Documentación

## 📋 Resumen Ejecutivo

El Sistema de Sub-Agentes es una arquitectura avanzada que permite a los agentes principales (como Cleo) crear y gestionar agentes especializados dinámicamente. Los sub-agentes se almacenan persistentemente en Supabase y se integran automáticamente con el sistema de delegación.

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **SubAgentManager** (`/lib/agents/core/sub-agent-manager.ts`)
   - Gestiona el ciclo de vida completo de los sub-agentes
   - Implementa cache en memoria para rendimiento
   - Registra automáticamente tools de delegación
   - Emite eventos para notificaciones de delegación

2. **SubAgentService** (`/lib/agents/services/sub-agent-service.ts`)
   - Capa de servicio para operaciones CRUD con Supabase
   - Maneja validaciones y transformaciones de datos
   - Proporciona estadísticas y métricas

3. **API REST** (`/app/api/agents/sub-agents/route.ts`)
   - Endpoints para gestión completa de sub-agentes
   - Integración con autenticación de usuario
   - Manejo de errores y validaciones

4. **Orchestrator Integration** (`/lib/agents/core/orchestrator.ts`)
   - Integración con el sistema de ejecución de agentes
   - Manejo de delegaciones a sub-agentes
   - Procesamiento de resultados de delegación

## 🔄 Flujo de Funcionamiento

### 1. Creación de Sub-Agentes

```typescript
// El agente principal puede crear sub-agentes especializados
const subAgent = await orchestrator.createSubAgent(parentAgentId, {
  name: "Data Analyst Assistant",
  description: "Especialista en análisis de datos",
  specialization: "data_analysis",
  model: "gpt-4o-mini",
  temperature: 0.3
});
```

### 2. Registro Automático de Tools

Cuando se crea un sub-agente, el sistema automáticamente:
- Genera un nombre único para el tool de delegación
- Registra el tool en el sistema de herramientas del agente
- Actualiza el cache en memoria

### 3. Delegación Dinámica

```typescript
// Los agentes pueden delegar tareas usando el tool generado
await agent.callTool('delegate_to_data_analyst', {
  task: "Analizar el dataset de ventas del último trimestre",
  context: "Necesito insights sobre tendencias de crecimiento",
  priority: "high"
});
```

### 4. Procesamiento de Delegación

1. El orchestrator recibe la solicitud de delegación
2. Verifica si el target es un sub-agente o agente principal
3. Ejecuta el sub-agente correspondiente
4. Procesa y devuelve el resultado

## 🗄️ Esquema de Base de Datos

### Tabla `sub_agents`

```sql
CREATE TABLE public.sub_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    parent_agent_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL,
    delegation_tool_name VARCHAR(255) NOT NULL UNIQUE,
    sub_agent_config JSONB DEFAULT '{}'::jsonb,
    system_prompt TEXT NOT NULL,
    model VARCHAR(100) DEFAULT 'gpt-4o-mini',
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Funciones Utilitarias

- `get_sub_agents_for_parent()`: Obtiene sub-agentes de un agente padre
- `get_sub_agent_stats()`: Estadísticas del sistema de sub-agentes
- `generate_unique_delegation_tool_name()`: Genera nombres únicos para tools

## 🔒 Seguridad y Permisos

### Row Level Security (RLS)

- Los usuarios solo pueden acceder a sus propios sub-agentes
- Políticas de seguridad implementadas en Supabase
- Autenticación requerida para todas las operaciones

### Validaciones

- Nombres de tools únicos y con formato específico
- Validación de prompts y descripciones
- Constraints de integridad referencial

## 🚀 Instalación y Configuración

### 1. Ejecutar Migración

```bash
# Ejecutar en Supabase SQL Editor o CLI
psql -f migrations/supabase_schema_sub_agents.sql
```

### 2. Verificar Instalación

```sql
-- Verificar que la tabla existe
SELECT * FROM information_schema.tables WHERE table_name = 'sub_agents';

-- Verificar RLS
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'sub_agents';
```

## 📊 API Endpoints

### Crear Sub-Agente
```
POST /api/agents/sub-agents
```

### Listar Sub-Agentes
```
GET /api/agents/sub-agents?parentAgentId={id}
```

### Actualizar Sub-Agente
```
PUT /api/agents/sub-agents/{id}
```

### Eliminar Sub-Agente
```
DELETE /api/agents/sub-agents/{id}
```

## 🔧 Configuración de Entorno

Asegurarse de que las siguientes variables estén configuradas:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Usuario para operaciones (se obtiene de auth)
USER_ID=authenticated_user_id
```

## 🎯 Casos de Uso

### 1. Análisis de Datos
- Sub-agente especializado en análisis estadístico
- Genera visualizaciones y reportes
- Procesa datasets grandes

### 2. Revisión de Código
- Especialista en calidad y seguridad de código
- Identifica bugs y vulnerabilidades
- Sugiere mejoras de performance

### 3. Investigación
- Sub-agente para búsqueda y síntesis de información
- Análisis de documentos y papers
- Generación de resúmenes ejecutivos

### 4. Automatización
- Sub-agentes para tareas repetitivas
- Integración con APIs externas
- Procesamiento de workflows

## 📈 Monitoreo y Métricas

### Estadísticas Disponibles

- Número total de sub-agentes por usuario
- Sub-agentes activos vs inactivos
- Agentes padre con más sub-agentes
- Fecha de creación más reciente

### Eventos del Sistema

- `delegation-request`: Nueva solicitud de delegación
- `delegation.completed`: Delegación completada exitosamente
- `delegation.failed`: Error en delegación

## 🔄 Ciclo de Vida

1. **Creación**: Sub-agente se crea y registra en Supabase
2. **Activación**: Tool de delegación se registra automáticamente
3. **Uso**: Agente padre delega tareas al sub-agente
4. **Ejecución**: Sub-agente procesa la tarea
5. **Resultado**: Resultado se devuelve al agente padre
6. **Actualización**: Estadísticas y métricas se actualizan
7. **Desactivación**: Sub-agente puede ser desactivado si no se usa

## 🐛 Solución de Problemas

### Problemas Comunes

1. **Tool no encontrado**: Verificar que el sub-agente esté activo
2. **Error de permisos**: Verificar autenticación del usuario
3. **Duplicado de tool name**: El sistema genera nombres únicos automáticamente

### Logs y Debugging

Los logs del sistema incluyen:
- Creación y eliminación de sub-agentes
- Solicitudes de delegación
- Errores de ejecución
- Métricas de performance

## 📚 Referencias

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/functions.html)
