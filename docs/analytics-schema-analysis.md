# Análisis de Schemas para Dashboard Analytics - Cleo Agent

## Resumen Ejecutivo

Después de analizar los schemas existentes de Cleo Agent, he identificado oportunidades clave para implementar un sistema completo de analytics que permitirá a los usuarios obtener insights detallados sobre su uso de la plataforma.

## Estado Actual de los Schemas

### Tablas Existentes con Potencial Analytics

#### 1. **users** - Perfil de Usuario y Límites
```sql
-- Campos actuales con valor analytics
- daily_message_count INTEGER
- daily_reset TIMESTAMPTZ
- daily_pro_message_count INTEGER  
- daily_pro_reset TIMESTAMPTZ
- message_count INTEGER
- last_active_at TIMESTAMPTZ
- created_at TIMESTAMPTZ
- favorite_models TEXT[]
```

#### 2. **messages** - Core de Interacciones
```sql
-- Campos actuales
- chat_id UUID
- user_id UUID
- role TEXT (system, user, assistant, data)
- created_at TIMESTAMPTZ
- model TEXT
- content TEXT
- parts JSONB
- experimental_attachments JSONB
```

#### 3. **chats** - Sesiones de Conversación
```sql
-- Campos actuales
- user_id UUID
- model TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
- title TEXT
```

#### 4. **user_preferences** - Configuraciones
```sql
-- Campos actuales + nuestras nuevas adiciones
- personality_settings JSONB
- layout TEXT
- multi_model_enabled BOOLEAN
- hidden_models TEXT[]
```

#### 5. **documents** y **document_chunks** - RAG Usage
```sql
-- Campos para analytics RAG
- tokens_estimated INTEGER
- created_at TIMESTAMPTZ
- content_tokens INT
```

## Propuesta de Nuevas Tablas Analytics

### 1. **user_session_analytics**
```sql
CREATE TABLE user_session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  session_duration_minutes INTEGER, -- Calculado automáticamente
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  models_used TEXT[] DEFAULT '{}',
  tools_invoked TEXT[] DEFAULT '{}',
  personality_used JSONB, -- Configuración de personalidad durante la sesión
  canvas_interactions INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  rag_queries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. **model_usage_analytics**
```sql
CREATE TABLE model_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER DEFAULT 0,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_estimate DECIMAL(10,4) DEFAULT 0, -- Estimación de costo
  average_response_time_ms INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  personality_type TEXT, -- Personalidad más usada con este modelo
  tool_calls_count INTEGER DEFAULT 0,
  reasoning_requests INTEGER DEFAULT 0, -- Para GPT-5 Nano
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, model_name, usage_date)
);
```

### 3. **feature_usage_analytics**
```sql
CREATE TABLE feature_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL, -- 'canvas_editor', 'rag_search', 'google_calendar', etc.
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INTEGER DEFAULT 0,
  total_time_spent_minutes INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0.00, -- Porcentaje de éxito
  metadata JSONB, -- Datos específicos por feature
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_name, usage_date)
);
```

### 4. **conversation_analytics**
```sql
CREATE TABLE conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_messages INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0,
  assistant_messages INTEGER DEFAULT 0,
  conversation_duration_minutes INTEGER DEFAULT 0,
  models_switched INTEGER DEFAULT 0, -- Cuántas veces cambió de modelo
  personality_changes INTEGER DEFAULT 0, -- Cuántas veces cambió personalidad
  tools_used TEXT[] DEFAULT '{}',
  avg_response_length INTEGER DEFAULT 0,
  complexity_score DECIMAL(3,2) DEFAULT 0.00, -- Basado en tokens y estructura
  satisfaction_rating INTEGER, -- 1-5 si implementamos rating
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. **tool_usage_analytics**
```sql
CREATE TABLE tool_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invocation_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_execution_time_ms INTEGER DEFAULT 0,
  total_execution_time_ms INTEGER DEFAULT 0,
  popular_parameters JSONB, -- Parámetros más usados
  error_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tool_name, usage_date)
);
```

## Modificaciones a Tablas Existentes

### 1. Tabla **messages** - Añadir campos analytics
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tools_invoked TEXT[] DEFAULT '{}';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS personality_snapshot JSONB;
```

### 2. Tabla **chats** - Añadir métricas de conversación
```sql
ALTER TABLE chats ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS engagement_score DECIMAL(3,2) DEFAULT 0.00;
```

### 3. Tabla **users** - Añadir métricas de usuario
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_session_time_minutes INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_features TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_daily_messages DECIMAL(5,2) DEFAULT 0.00;
```

## Funciones y Triggers Automáticos

### 1. Trigger para actualizar session analytics
```sql
CREATE OR REPLACE FUNCTION update_session_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Lógica para actualizar automáticamente las métricas de sesión
  -- cuando se inserta un nuevo mensaje
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Función para calcular engagement score
```sql
CREATE OR REPLACE FUNCTION calculate_engagement_score(user_id UUID, period_days INTEGER DEFAULT 7)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  engagement_score DECIMAL(3,2);
BEGIN
  -- Algoritmo para calcular score basado en:
  -- - Frecuencia de uso
  -- - Duración de sesiones
  -- - Variedad de features usadas
  -- - Consistencia de uso
  RETURN engagement_score;
END;
$$ LANGUAGE plpgsql;
```

## Vistas para Dashboard

### 1. Vista de resumen diario del usuario
```sql
CREATE VIEW user_daily_summary AS
SELECT 
  u.id as user_id,
  u.display_name,
  DATE(m.created_at) as usage_date,
  COUNT(CASE WHEN m.role = 'user' THEN 1 END) as messages_sent,
  COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as messages_received,
  COUNT(DISTINCT c.id) as conversations,
  COUNT(DISTINCT m.model) as models_used,
  SUM(m.input_tokens) as total_input_tokens,
  SUM(m.output_tokens) as total_output_tokens
FROM users u
LEFT JOIN messages m ON u.id = m.user_id
LEFT JOIN chats c ON m.chat_id = c.id
GROUP BY u.id, u.display_name, DATE(m.created_at);
```

### 2. Vista de métricas de modelos
```sql
CREATE VIEW model_performance_summary AS
SELECT 
  model,
  COUNT(*) as usage_count,
  AVG(response_time_ms) as avg_response_time,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  COUNT(DISTINCT user_id) as unique_users
FROM messages 
WHERE role = 'assistant' 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY model;
```

## Implementación Gradual Recomendada

### Fase 1: Campos Básicos (Inmediato)
- Añadir campos analytics a tablas existentes
- Implementar tracking básico de tokens y tiempo de respuesta

### Fase 2: Tablas de Analytics (Semana 1-2)
- Crear tablas `model_usage_analytics` y `feature_usage_analytics`
- Implementar triggers automáticos

### Fase 3: Analytics Avanzados (Semana 3-4)
- Crear `user_session_analytics` y `conversation_analytics`
- Implementar cálculos de engagement y scoring

### Fase 4: Dashboard UI (Semana 4-6)
- Crear componentes React para visualización
- Implementar gráficos y métricas en tiempo real

## Beneficios del Sistema Propuesto

### Para los Usuarios:
- **Insights Personales**: Comprender sus patrones de uso
- **Optimización**: Identificar qué modelos y features son más efectivos
- **Gamificación**: Streaks, achievements, progress tracking
- **Control de Costos**: Monitoreo de uso de tokens y estimación de costos

### Para el Desarrollo:
- **Product Analytics**: Entender qué features son más populares
- **Performance Monitoring**: Identificar cuellos de botella
- **User Behavior**: Optimizar UX basado en datos reales
- **Retention Analysis**: Identificar patrones de abandono y retención

## Consideraciones de Privacy y Performance

### Privacy:
- Todos los datos son agregados por usuario
- No almacenamiento de contenido sensible
- Opciones de opt-out para usuarios que prefieren privacidad total

### Performance:
- Índices optimizados para queries de dashboard
- Agregación de datos en background jobs
- Particionamiento de tablas por fecha para escalabilidad

## Próximos Pasos

1. **Implementar modificaciones básicas a schemas existentes**
2. **Crear sistema de tracking automático**
3. **Desarrollar API endpoints para dashboard**
4. **Crear componentes UI para visualización**
5. **Testing y optimización de performance**

Este sistema proporcionará insights valiosos tanto para usuarios individuales como para el desarrollo del producto, permitiendo decisiones basadas en datos reales de uso.
