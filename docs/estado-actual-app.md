# Cleo Agent - Estado Actual y Cambios Recientes

## Resumen Ejecutivo

Cleo Agent es una aplicación de chat multi-agente desarrollada en Next.js con TypeScript que utiliza inteligencia artificial para proporcionar asistencia especializada a través de diferentes agentes. La aplicación cuenta con un pipeline de procesamiento en tiempo real, integración con múltiples proveedores de IA, y un sistema de agentes especializados.

## Arquitectura Actual

### Stack Tecnológico Principal
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, LangChain, streaming con SSE
- **Base de Datos**: Supabase (PostgreSQL con RLS)
- **Estado**: Zustand para manejo de estado global
- **Autenticación**: Google OAuth via Supabase Auth
- **Containerización**: Docker con docker-compose
- **Gestión de Paquetes**: pnpm

### Agentes Especializados

#### 1. Cleo (Agente Principal)
- **Rol**: Coordinador y delegador principal
- **Funciones**: Análisis de queries, delegación inteligente, respuestas generales
- **Herramientas**: Calculator, gestión de conversaciones

#### 2. Emma (Especialista Shopify)
- **Rol**: Gestión y análisis de tiendas Shopify
- **Herramientas**:
  - `getProducts`: Obtener listado de productos
  - `getOrders`: Consultar órdenes y ventas
  - `getAnalytics`: Métricas y análisis de rendimiento
  - `getCustomers`: Gestión de clientes
  - `searchProducts`: Búsqueda avanzada de productos
  - `updateProductPrice`: Actualización de precios

#### 3. Peter (Especialista Google Workspace)
- **Rol**: Gestión de documentos y productividad
- **Herramientas**:
  - `createDocument`: Creación de documentos
  - `getGoogleDriveFiles`: Gestión de archivos
  - `serpGeneralSearch`: Búsqueda web general
  - `serpScholarSearch`: Búsqueda académica
  - `calculator`: Cálculos matemáticos

#### 4. Apu (Investigador Web)
- **Rol**: Investigación web y análisis de información
- **Herramientas**:
  - `webSearch`: Búsqueda web avanzada
  - `calculator`: Cálculos de soporte

#### 5. Ami (Asistente Web)
- **Rol**: Asistencia web complementaria
- **Herramientas**:
  - `webSearch`: Búsqueda web
  - `calculator`: Cálculos de soporte

## Funcionalidades Principales

### Pipeline de Procesamiento en Tiempo Real
- **Streaming**: Respuestas en tiempo real usando Server-Sent Events (SSE)
- **Deduplicación**: Sistema automático para evitar pasos duplicados
- **Traducción**: Todos los pasos del pipeline se muestran en inglés para el usuario
- **Tipos de Pasos**: 
  - `thinking`: Análisis inicial
  - `delegation`: Proceso de delegación
  - `tool_use`: Uso de herramientas
  - `response`: Respuesta final

### Gestión de Conversaciones
- **Persistencia**: Almacenamiento en Supabase con RLS
- **Historial**: Acceso completo al historial de conversaciones
- **Contexto**: Mantenimiento de contexto entre mensajes

### Autenticación y Seguridad
- **OAuth Google**: Integración con Google para autenticación
- **RLS**: Row Level Security en Supabase
- **CSRF Protection**: Protección contra ataques CSRF
- **Encriptación**: Claves de encriptación para datos sensibles

## Cambios Recientes Implementados

### 1. Optimización del Pipeline de Agentes
- **Problema**: Pipeline no se mostraba en tiempo real, había duplicación de pasos
- **Solución**: 
  - Implementado streaming real con SSE
  - Sistema de deduplicación por ID único
  - Traducción automática a inglés
  - Nuevos tipos de pasos en la interfaz

### 2. Optimización de Prompts de Agentes
- **Emma (Shopify)**:
  - Prompt mejorado para mejor comprensión de contexto comercial
  - Instrucciones más claras para uso de herramientas
  - Enfoque en métricas de negocio y análisis de rendimiento
  
- **Peter (Google Workspace)**:
  - Prompt optimizado para productividad y gestión documental
  - Integración mejorada con herramientas de SerpAPI
  - Mejor delegación de tareas de investigación académica

### 3. Redistribución de Herramientas
- **SerpAPI**: Asignado exclusivamente a Peter para búsquedas especializadas
- **webSearch**: Limitado a Apu y Ami para investigación web general
- **Especialización**: Cada agente tiene herramientas específicas a su dominio

### 4. Optimización de Docker
- **Problema**: Crecimiento descontrolado del uso de disco (>560GB)
- **Causa**: Volúmenes Docker anónimos no se limpiaban automáticamente
- **Solución**:
  - Scripts mejorados con limpieza automática de volúmenes
  - Comando `docker:clean` y `docker:clean-all` optimizados
  - Limpieza automática en `docker:dev-down`
  - Eliminación de 3.85GB de volúmenes huérfanos

### 5. Configuración de Modelos
- **Simplificación**: Mantenidos solo modelos "fast" y "balanced"
- **Optimización**: Configuración streamlined para mejor UX

## Problemas Conocidos y Pendientes

### 1. OAuth con ngrok (PENDIENTE)
- **Problema**: Errores de redirección cuando se usa ngrok para desarrollo
- **Estado**: URL de ngrok configurada en `.env.local` pero requiere verificación
- **Solución Propuesta**: Verificar configuración de OAuth callback URLs

### 2. Logs de Desarrollo
- **Estado**: 16 console.log encontrados en `/app/api/chat/route.ts`
- **Recomendación**: Limpiar logs de desarrollo para producción

## Configuración de Desarrollo

### Variables de Entorno Críticas
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://etccfyceafebvryhdcme.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[clave_servicio]

# OAuth Google
GOOGLE_CLIENT_ID=[client_id]
GOOGLE_CLIENT_SECRET=[client_secret]

# URL de la aplicación (para ngrok)
NEXT_PUBLIC_APP_URL=https://[tunnel].ngrok-free.app
```

### Comandos Docker Optimizados
```bash
# Desarrollo
pnpm docker:dev          # Iniciar en modo desarrollo
pnpm docker:dev-down     # Parar y limpiar volúmenes
pnpm docker:clean        # Limpieza básica del sistema
pnpm docker:clean-all    # Limpieza completa (imágenes, cache, volúmenes)
pnpm docker:reset        # Reset completo del entorno
```

### Scripts de Desarrollo
```bash
# Compilación y desarrollo
pnpm dev                 # Servidor de desarrollo
pnpm build              # Compilación para producción
pnpm start              # Servidor de producción

# Análisis
pnpm analyze            # Análisis del bundle
pnpm type-check         # Verificación de tipos TypeScript
```

## Métricas de Performance

### Tamaño del Proyecto
- **Total**: ~1.2GB (principalmente node_modules)
- **Docker Limpio**: ~4GB (imágenes + volúmenes activos)
- **Build Cache**: ~44MB

### Tiempo de Respuesta
- **Pipeline Steps**: Tiempo real con SSE
- **Tool Execution**: Variable según herramienta (1-5 segundos)
- **Response Generation**: 2-8 segundos según complejidad

## Próximos Pasos Recomendados

### Corto Plazo
1. **Resolver OAuth con ngrok**: Verificar y corregir configuración
2. **Limpiar logs de desarrollo**: Remover console.log innecesarios
3. **Testing**: Verificar funcionamiento de todos los agentes y herramientas

### Mediano Plazo
1. **Monitoreo**: Implementar logging y métricas de production
2. **Performance**: Optimizar tiempos de respuesta de herramientas
3. **UI/UX**: Mejoras adicionales en la interfaz del pipeline

### Largo Plazo
1. **Escalabilidad**: Preparar para múltiples usuarios concurrentes
2. **Herramientas**: Expandir capacidades de agentes especializados
3. **Analytics**: Dashboard de métricas de uso y performance

## Conclusión

La aplicación se encuentra en un estado estable y funcional, con mejoras significativas en el pipeline de tiempo real, optimización de agentes, y gestión de recursos Docker. Los principales problemas técnicos han sido resueltos, quedando pendientes ajustes menores de configuración y limpieza de código de desarrollo.
