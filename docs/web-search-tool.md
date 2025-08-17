# Web Search Tool para Cleo Agent

## Descripción
La herramienta `webSearchTool` permite al agente Cleo buscar información actualizada en internet usando la Brave Search API con fallback automático a Tavily cuando no se encuentran resultados o Brave no responde. Es ideal para obtener datos recientes, noticias, documentación técnica y cualquier consulta que requiera información actualizada de la web.

## Configuración

### 1. API Key de Brave Search (fallback / alternativa)
1. Ve a [Brave Search API](https://api-dashboard.search.brave.com/register)
2. Regístrate y obtén tu API key
3. Agrega la clave en tu archivo `.env.local`:
```bash
BRAVE_SEARCH_API_KEY=tu_api_key_aqui
```

Opcionalmente, también se aceptan estas variables alternativas si usas otros entornos:

```bash
BRAVE_API_KEY=tu_api_key_aqui
SEARCH_API_KEY=tu_api_key_aqui
```

### 2. API Key de Tavily (primaria por defecto)
1. Ve a [Tavily](https://tavily.com) y crea una API key
2. Agrega la clave en tu archivo `.env.local`:

```bash
TAVILY_API_KEY=tu_api_key_tavily
# Alternativa aceptada por el código
TAVILYAPIKEY=tu_api_key_tavily
```

### 2. Precios de Brave Search API
- **Free Plan**: 5,000 consultas/mes gratis
- **Base AI**: $5.00 por 1,000 requests
- **Pro AI**: $9.00 por 1,000 requests

## Parámetros

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `query` | string | ✅ | - | La consulta de búsqueda |
| `count` | number | ❌ | 15 | Número de resultados (1-50) |
| `freshness` | enum | ❌ | - | Recencia: d=día, w=semana, m=mes, y=año; también pd/pw/pm/py |
| `language` | enum | ❌ | 'en' | Idioma preferido ('es' o 'en') |
| `goggles_id` | enum | ❌ | - | Filtros Brave (code, research, news, discussions) |
| `use_summarizer` | boolean | ❌ | true | Intentar resumen AI (Brave/Tavily) |
| `primary` | enum | ❌ | 'tavily' | API primaria ('tavily' o 'brave') |

## Respuesta

La herramienta devuelve un objeto con enriquecimiento visual (favicon, thumbnail) e insights/clusterización ligera:
```typescript
{
  success: boolean,
  message: string,
  query: string,
  results: Array<{
    title: string,
    url: string,
    description: string,
    snippet?: string,
    hostname: string,
    age: string,
    thumbnail?: string,
    favicon?: string
  }>,
  total_results?: number,
  ai_summary?: string,
  suggested_query?: string,
  insights?: string[],
  clusters?: Array<{ title: string, results: number[] }>,
  source: 'brave' | 'tavily'
}
```

## Ejemplos de Uso

### Búsqueda Básica
```typescript
// El agente puede buscar información actual
"Busca información sobre el precio del Bitcoin hoy"
// Ejecutará: webSearchTool({ query: "precio Bitcoin hoy", count: 10 })
```

### Búsqueda con Filtros
```typescript
// Búsqueda de noticias recientes con fallback
"Busca noticias de la última semana sobre inteligencia artificial"
// Ejecutará: webSearchTool({
//   query: "noticias inteligencia artificial",
//   freshness: "pw",
//   count: 15,
//   language: 'es',
//   primary: 'tavily'
// }) // Si Tavily no encuentra resultados, caerá a Brave automáticamente
```

### Búsqueda Específica por País
```typescript
// Información específica de un país
"Busca información sobre el clima en Madrid, España"
// Ejecutará: webSearchTool({
//   query: "clima Madrid España",
//   language: "es"
// })
```

## Ventajas de Brave Search API

1. **Independiente**: No depende de Google o Bing
2. **Privacidad**: Respetuoso con la privacidad del usuario
3. **Actualizado**: Índice fresco con millones de actualizaciones diarias
4. **Asequible**: Precios competitivos comparado con otras APIs
5. **Flexible**: Múltiples endpoints y opciones de filtrado
6. **Calidad**: Resultados de alta calidad con menos spam SEO

## Casos de Uso Ideales

- 📰 **Noticias recientes**: "¿Qué pasó ayer en...?"
- 💰 **Información financiera**: "Precio actual de..."
- 🔍 **Datos específicos**: "Horarios de...", "Dirección de..."
- 📊 **Estadísticas actuales**: "Población de...", "Datos de..."
- 🌐 **Información general**: Cualquier consulta que requiera datos web actualizados

## Integración en el Chat

La herramienta se integra automáticamente en el sistema de tools del agente (`lib/tools/index.ts`) y está disponible en `/api/chat`. Para modelos como xAI Grok con Live Search nativo, el endpoint usa la búsqueda nativa y omite este tool; para el resto, este tool se ofrece y se ejecuta según las reglas del prompt. Si Brave devuelve 0 resultados o hay error, se intenta automáticamente con Tavily (si hay API key configurada).

## Monitoreo y Límites

- Revisa tu uso en el [dashboard de Brave Search API](https://api-dashboard.search.brave.com/) y Tavily
- Configura alertas para evitar exceder tu cuota
- Considera implementar caché local para consultas frecuentes

## Notas

- El código soporta variables de entorno alternativas para Tavily: `TAVILY_API_KEY` o `TAVILYAPIKEY`.
- Para Brave, también se intentan `BRAVE_API_KEY` y `SEARCH_API_KEY` si no existe `BRAVE_SEARCH_API_KEY`.
- El tool aplica cache LRU y límites por request para evitar abuso.
