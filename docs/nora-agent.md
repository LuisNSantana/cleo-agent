# Nora — Agente de Community Management

Resumen de la implementación, herramientas y flujo de trabajo para el agente "Nora" (Community Manager).

## Visión general
Nora es un agente especializado en gestión de comunidades y redes sociales. Su objetivo es coordinar la creación de contenido, programar y publicar en X/Twitter, monitorear tendencias y métricas.

**Enfoque:** Nora maneja todo el ciclo de social media end-to-end: estrategia → contenido → publicación → análisis. Usa credenciales por usuario para operar APIs reales de terceros de forma segura.

## Componentes principales
- Agente: `NORA_AGENT` (definido en `lib/agents/predefined/nora.ts`)
- UI de administración: `/app/agents/manage/page.tsx` (componente integrado `TwitterCredentialsManager`)
- Endpoints API: `app/api/twitter/credentials/route.ts` (CRUD), `app/api/twitter/test/route.ts` (test credenciales)
- Lógica de credenciales: `lib/twitter/credentials.ts` (acceso, encriptación/desencriptación, pruebas)
- Herramientas (tools): implementadas en `lib/tools/twitter.ts` y registradas en el registry central

## Tools disponibles
Detalle breve de cada tool y su propósito.

- **postTweet**
  - Publica un tweet usando las credenciales del usuario.
  - Input: { text, media?, reply_to?, scheduled_at? }
  - Output: { success, tweet_id, url } o error con código/mensaje.

- **generateTweet**
  - Genera textos optimizados para X/Twitter según brief y tono.
  - Input: { prompt, length, tone }
  - Output: texto sugerido(s).

- **hashtagResearch**
  - Busca y sugiere hashtags relevantes por tema o público objetivo.
  - Input: { topic, locale?, time_range? }
  - Output: lista de hashtags con volumen/score (cuando esté disponible).

- **twitterTrendsAnalysis**
  - Consulta tendencias (global/por región) y las interpreta para sugerir acciones.
  - Input: { woeid? | geo?, period? }
  - Output: tendencias y recomendaciones.

- **twitterAnalytics**
  - Recupera métricas (engagement, impresiones, CTR) para cuentas configuradas.
  - Input: { account_id, range }
  - Output: métricas agregadas, top posts.

- **Serp-related tools**
  - `serpGeneralSearch`, `serpNewsSearch`, `serpTrendsSearch`, `serpTrendingNow`, `webSearch` — usados para investigación y descubrimiento de contenido.

- **Google Workspace tools**
  - Google Docs para crear reportes y calendarios de contenido
  - Google Sheets para dashboards de analytics y tracking de KPIs

- **getCurrentDateTime**
  - Utilidad para planificar horarios óptimos de publicación.

- **complete_task**
  - Marca tareas como completadas y comunica resultado al orquestador.

## Arquitectura y Especialización

**Nora es un agente completo** que maneja todas las facetas de community management:

### Capacidades Core:
1. **Estrategia de Contenido** - Define pilares editoriales y calendarios
2. **Creación de Contenido** - Escribe tweets, hilos y copy optimizado
3. **Publicación y Scheduling** - Programa y publica contenido
4. **Analytics y Optimización** - Analiza métricas y ajusta estrategia
5. **Community Engagement** - Interactúa con la audiencia
6. **Trend Monitoring** - Monitorea y reacciona a tendencias

### Herramientas Especializadas:
- **Twitter/X:** postTweet, generateTweet, postTweetWithMedia, createTwitterThread
- **Research:** webSearch, serpAPI tools para trends y competencia
- **Analytics:** Google Sheets con fórmulas, gráficos y conditional formatting
- **Reporting:** Google Docs con formato profesional

## Gestión de credenciales
- Modelo: una fila por conexión en `user_service_connections` (tabla común del sistema).
- Migración añadida: índices y constraints para soportar tipo `twitter` y metadatos.
- CRUD Server: `app/api/twitter/credentials/route.ts` — crea, lista, elimina conexiones.
- Test endpoint: `app/api/twitter/test/route.ts` — valida credenciales con la API de Twitter antes de guardarlas.
- Seguridad: las claves se encriptan en la base de datos (misma estrategia usada para Notion/SerpAPI).
- UI: `components/twitter/twitter-credentials-manager.tsx` permite agregar, testear y eliminar credenciales desde la sección de agentes.

## Flujo de trabajo (ejemplo: publicar una campaña)
1. Usuario configura credenciales en el panel de agentes (`/app/agents/manage`).
2. Nora recibe un objetivo: "Lanzar campaña promocional sobre producto X".
3. Nora investiga tendencias relevantes usando serpAPI tools.
4. Nora genera contenido optimizado: tweets, threads, y variantes usando generateTweet.
5. Nora programa la publicación con postTweet o publica inmediatamente.
6. Nora crea dashboard en Google Sheets para tracking de métricas.
7. Después de publicar, Nora recopila métricas y genera reporte con recomendaciones.

## Contratos mínimos (inputs/outputs)
- **Inputs:**
  - Credenciales del usuario (almacenadas por `user_id`)
  - Objetivo/brief (texto estructurado) para generación
  - Contexto (audiencia, canal, restricciones legales)
- **Outputs:**
  - Publicaciones (tweet ids / urls)
  - Recomendaciones (hashtags, horarios)
  - Reportes de métricas
  - Calendarios de contenido
  - Dashboards de analytics
- **Modo fallo:**
  - Si faltan credenciales: la tool falla con mensaje y Nora solicita al usuario conectar credenciales.
  - Rate limit / API errors: retries exponenciales con backoff y fallback a acciones manuales (notificar al usuario).

## Casos borde y consideraciones
- **Múltiples cuentas:** el usuario puede tener varias conexiones; Nora escogerá la conexión etiquetada/activa.
- **Rate limits:** Implementación de backoff exponencial y queueing de publicaciones.
- **Validación de contenido:** Nora verifica longitud, menciones, y compliance antes de publicar.
- **Analytics históricos:** Mantiene tracking en Google Sheets para análisis longitudinal.
- Permisos insuficientes: si la app no tiene permisos de escritura, el sistema reporta el error y sugiere regenerar tokens.
- Contenido sensible: Nora incluye reglas de moderación. Los prompts pueden bloquear contenido no permitido.
- Fallos en la API: registrar incidentes y exponer una razón legible al usuario.

## Pruebas recomendadas
- Añadir credenciales reales en un entorno de pruebas y ejecutar un post de prueba corto.
- Validar flujo completo: investigación → generación → aprobación → publicación → reporte.
- Tests unitarios de las funciones de credenciales (encrypt/decrypt, listing, deletion).

## Ubicaciones clave en el repositorio
- Definición de agente: `lib/agents/predefined/nora.ts`
- Herramientas/Logic Twitter: `lib/tools/twitter.ts`
- Credenciales: `lib/twitter/credentials.ts`
- API routes: `app/api/twitter/credentials/route.ts`, `app/api/twitter/test/route.ts`
- UI credenciales: `components/twitter/twitter-credentials-manager.tsx`
- Página de gestión: `app/agents/manage/page.tsx`

## Siguientes pasos sugeridos
- Integrar una vista de historial de publicaciones para cada cuenta.
- Automatizar análisis semanal con reportes por correo.
- Añadir guard rails legales / política de contenido por organización.

---

Documento generado: resumen de la implementación de Nora y su ecosistema de tools. Mantener actualizado si se agregan nuevas herramientas o sub-agentes.
