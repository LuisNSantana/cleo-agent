# Sistema de Tasks - Documentación

## 📋 Resumen Ejecutivo

El Sistema de Tasks es un gestor universal de tareas para todos los agentes del sistema Cleo. Permite crear, programar y ejecutar tareas de forma manual o automática, con capacidades de scheduling avanzado.

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **Tasks Database** (`/lib/agent-tasks/tasks-db.ts`)
   - Operaciones CRUD completas con Supabase
   - Gestión de estados y metadatos de tareas
   - Sistema de filtros avanzado

2. **Task Executor** (`/lib/agent-tasks/task-executor.ts`)
   - Ejecuta tareas usando el sistema de agentes
   - Maneja resultados y errores
   - Genera metadatos de ejecución

3. **Scheduler** (`/lib/agent-tasks/scheduler.ts`)
   - Servicio en background que procesa tareas programadas
   - Ejecuta tareas automáticamente según schedule
   - Monitoreo y estadísticas

4. **API Endpoints**
   - `/api/agent-tasks` - CRUD de tareas
   - `/api/agent-tasks/execute` - Ejecución manual
   - `/api/agent-tasks/scheduler` - Control del scheduler

## 🔄 Estados de las Tareas

- `pending` - Esperando ejecución
- `scheduled` - Programada para futuro
- `running` - En ejecución
- `completed` - Completada exitosamente
- `failed` - Falló durante ejecución
- `cancelled` - Cancelada por usuario

## 📅 Programación de Tareas

### 1. Tareas Manuales (Inmediatas)

```typescript
// Crear tarea para ejecución inmediata
const task = await createAgentTask({
  title: "Analizar ventas del mes",
  description: "Generar reporte de ventas mensuales",
  agent_id: "apu-research",
  task_type: "manual",
  priority: 8,
  task_config: {
    query: "ventas mensuales enero 2025",
    format: "report"
  }
});
```

### 2. Tareas Programadas (Fecha/Hora Específica)

```typescript
// Programar tarea para una fecha/hora específica
const task = await createAgentTask({
  title: "Backup semanal",
  description: "Realizar backup de base de datos",
  agent_id: "wex-automation",
  task_type: "scheduled",
  scheduled_at: "2025-01-15T09:00:00Z", // 15 enero 2025, 9:00 AM UTC
  priority: 9,
  task_config: {
    backup_type: "full",
    destination: "s3://backups"
  }
});
```

### 3. Tareas Recurrentes (Cron)

```typescript
// Programar tarea recurrente con expresión cron
const task = await createAgentTask({
  title: "Limpieza diaria",
  description: "Limpiar archivos temporales",
  agent_id: "system-cleaner",
  task_type: "recurring",
  cron_expression: "0 2 * * *", // Todos los días a las 2:00 AM
  timezone: "America/New_York",
  priority: 7,
  task_config: {
    cleanup_age_days: 7,
    exclude_patterns: ["*.log"]
  }
});
```

## ⏰ Expresiones Cron

| Expresión | Significado | Ejemplo |
|-----------|-------------|---------|
| `0 9 * * *` | Todos los días a las 9:00 | Backup diario |
| `0 */2 * * *` | Cada 2 horas | Monitoreo frecuente |
| `0 9 * * 1` | Lunes a las 9:00 | Reporte semanal |
| `0 0 1 * *` | Primer día del mes | Reporte mensual |
| `0 0 * * 0` | Domingos a medianoche | Mantenimiento semanal |

## 🚀 Ejecución de Tareas

### Ejecución Manual

```typescript
// Ejecutar tarea específica inmediatamente
const result = await fetch('/api/agent-tasks/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ task_id: 'abc123...' })
});
```

### Ejecución Automática (Scheduler)

```typescript
// Iniciar scheduler
const response = await fetch('/api/agent-tasks/scheduler', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'start' })
});

// Verificar estado del scheduler
const status = await fetch('/api/agent-tasks/scheduler');
```

## 📊 Respuestas y Resultados

### Estructura de Resultado

```typescript
interface TaskExecutionResult {
  success: boolean;
  result?: any; // Datos del resultado del agente
  error?: string; // Mensaje de error si falló
  tool_calls?: Array<{ // Tools utilizados durante ejecución
    tool: string;
    input: any;
    output: any;
    timestamp: string;
  }>;
  agent_messages?: Array<{ // Mensajes del agente
    role: string;
    content: string;
    timestamp: string;
  }>;
  execution_metadata?: {
    start_time: string;
    end_time: string;
    duration_ms: number;
    memory_usage?: number;
  };
}
```

### Ejemplo de Respuesta Exitosa

```json
{
  "success": true,
  "result": {
    "report": "Análisis completado",
    "insights": ["Venta aumentó 15%", "Producto X es el más vendido"],
    "recommendations": ["Incrementar inventario de X"]
  },
  "execution_metadata": {
    "start_time": "2025-01-15T09:00:00Z",
    "end_time": "2025-01-15T09:02:30Z",
    "duration_ms": 150000
  }
}
```

### Ejemplo de Respuesta con Error

```json
{
  "success": false,
  "error": "Failed to connect to external API",
  "execution_metadata": {
    "start_time": "2025-01-15T09:00:00Z",
    "end_time": "2025-01-15T09:00:05Z",
    "duration_ms": 5000
  }
}
```

## 🔔 Sistema de Notificaciones

### Configuración de Notificaciones

```typescript
const task = await createAgentTask({
  title: "Tarea crítica",
  description: "Procesamiento importante",
  notify_on_completion: true, // Notificar cuando complete
  notify_on_failure: true,    // Notificar si falla
  // ... otros campos
});
```

### Tipos de Notificación

- **Completada**: Tarea ejecutada exitosamente
- **Fallida**: Tarea falló durante ejecución
- **Cancelada**: Tarea cancelada por usuario

## 📊 API Endpoints

### Crear Tarea
```http
POST /api/agent-tasks
Content-Type: application/json

{
  "title": "Mi tarea",
  "description": "Descripción detallada",
  "agent_id": "apu-research",
  "task_type": "scheduled",
  "scheduled_at": "2025-01-15T09:00:00Z",
  "task_config": { "param1": "value1" }
}
```

### Listar Tareas
```http
GET /api/agent-tasks?status=pending&agent_id=apu-research&limit=10
```

### Ejecutar Tarea Manualmente
```http
POST /api/agent-tasks/execute
Content-Type: application/json

{ "task_id": "abc123..." }
```

### Control del Scheduler
```http
POST /api/agent-tasks/scheduler
Content-Type: application/json

{ "action": "start" } // o "stop"
```

## 🗄️ Esquema de Base de Datos

### Tabla `agent_tasks`

```sql
CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id TEXT UNIQUE,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  task_type TEXT DEFAULT 'manual',
  priority INTEGER DEFAULT 5,
  task_config JSONB,
  context_data JSONB,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  cron_expression TEXT,
  timezone TEXT DEFAULT 'UTC',
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  result_data JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  max_retries INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  notify_on_completion BOOLEAN DEFAULT false,
  notify_on_failure BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Configuración

### Variables de Entorno

```env
# Scheduler
TASK_SCHEDULER_INTERVAL_MS=60000  # Chequear cada 60 segundos

# Notificaciones
NOTIFICATION_ENABLED=true
NOTIFICATION_WEBHOOK_URL=https://api.example.com/webhooks/tasks
```

### Inicio del Scheduler

El scheduler debe iniciarse al arranque de la aplicación:

```typescript
import { getScheduler } from '@/lib/agent-tasks/scheduler';

// Iniciar scheduler en el arranque
getScheduler().start();
```

## 📈 Monitoreo

### Estadísticas del Scheduler

```typescript
const scheduler = getScheduler();
const stats = scheduler.getStatus();

console.log({
  isRunning: stats.isRunning,
  tasksProcessed: stats.tasksProcessed,
  tasksSucceeded: stats.tasksSucceeded,
  tasksFailed: stats.tasksFailed,
  lastRunAt: stats.lastRunAt
});
```

### Logs de Ejecución

- Creación y actualización de tareas
- Inicio y fin de ejecución
- Errores y reintentos
- Notificaciones enviadas

## 🚨 Solución de Problemas

### Tarea no se ejecuta automáticamente
- Verificar que el scheduler esté corriendo
- Comprobar que `scheduled_at` esté en el futuro
- Revisar logs del scheduler

### Tarea falla repetidamente
- Verificar configuración del agente
- Comprobar conectividad a servicios externos
- Revisar límites de `max_retries`

### Notificaciones no llegan
- Verificar configuración de notificaciones
- Comprobar estado de `notification_sent`
- Revisar logs de envío de notificaciones
