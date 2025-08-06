# Web Search Tool para Cleo Agent

## Descripción
La herramienta `webSearchTool` permite al agente Cleo buscar información actualizada en internet usando la Brave Search API. Es útil para obtener datos recientes, noticias, información específica o cualquier consulta que requiera información actualizada de la web.

## Configuración

### 1. API Key de Brave Search
1. Ve a [Brave Search API](https://api-dashboard.search.brave.com/register)
2. Regístrate y obtén tu API key
3. Agrega la clave en tu archivo `.env.local`:
```bash
BRAVE_SEARCH_API_KEY=tu_api_key_aqui
```

### 2. Precios de Brave Search API
- **Free Plan**: 5,000 consultas/mes gratis
- **Base AI**: $5.00 por 1,000 requests
- **Pro AI**: $9.00 por 1,000 requests

## Parámetros

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `query` | string | ✅ | - | La consulta de búsqueda |
| `count` | number | ❌ | 10 | Número de resultados (1-20) |
| `country` | string | ❌ | 'us' | Código de país para la búsqueda |
| `search_lang` | string | ❌ | 'es' | Idioma de búsqueda |
| `freshness` | enum | ❌ | - | Filtro de tiempo: pd=día, pw=semana, pm=mes, py=año |
| `safesearch` | enum | ❌ | 'moderate' | Nivel de búsqueda segura: strict, moderate, off |

## Respuesta

La herramienta devuelve un objeto con:
```typescript
{
  success: boolean,
  message: string,
  query: string,
  results: Array<{
    title: string,
    url: string,
    description: string,
    hostname: string,
    age: string
  }>,
  total_results?: number
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
// Búsqueda de noticias recientes
"Busca noticias de la última semana sobre inteligencia artificial"
// Ejecutará: webSearchTool({ 
//   query: "noticias inteligencia artificial", 
//   freshness: "pw",
//   count: 15 
// })
```

### Búsqueda Específica por País
```typescript
// Información específica de un país
"Busca información sobre el clima en Madrid, España"
// Ejecutará: webSearchTool({ 
//   query: "clima Madrid España", 
//   country: "es",
//   search_lang: "es" 
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

La herramienta se integra automáticamente en el sistema de tools del agente. Cuando un usuario hace una pregunta que requiere información actualizada, el agente puede decidir usar esta herramienta automáticamente.

## Monitoreo y Límites

- Revisa tu uso en el [dashboard de Brave Search API](https://api-dashboard.search.brave.com/)
- Configura alertas para evitar exceder tu cuota
- Considera implementar caché local para consultas frecuentes
