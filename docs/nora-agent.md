# Nora — Agente de Community Management

Resumen de la implementación, herramientas, sub-agentes y flujo de trabajo para el agente "Nora" (Community Manager).

## Visión general
Nora es un agente especializado en gestión de comunidades y redes sociales. Su objetivo es coordinar la creación de contenido, programar y publicar en X/Twitter, monitorear tendencias y métricas, y delegar tareas a sub-agentes cuando convenga.

Enfoque: centralizar la estrategia social en un agente que orquesta creación (+Luna), análisis (+Zara) y publicación (+Viktor). Nora usa credenciales por usuario para operar APIs reales de terceros de forma segura.

## Componentes principales
- Agente: `NORA_AGENT` (definido en `lib/agents/predefined/nora.ts`)
- UI de administración: `/app/agents/manage/page.tsx` (componente integrado `TwitterCredentialsManager`)
- Endpoints API: `app/api/twitter/credentials/route.ts` (CRUD), `app/api/twitter/test/route.ts` (test credenciales)
- Lógica de credenciales: `lib/twitter/credentials.ts` (acceso, encriptación/desencriptación, pruebas)
- Herramientas (tools): implementadas en `lib/tools/twitter.ts` y registradas en el registry central

## Tools disponibles
Detalle breve de cada tool y su propósito.

- postTweet
  - Publica un tweet usando las credenciales del usuario.
  - Input: { text, media?, reply_to?, scheduled_at? }
  - Output: { success, tweet_id, url } o error con código/mensaje.

- generateTweet
  - Genera textos optimizados para X/Twitter según brief y tono.
  - Input: { prompt, length, tone }
  - Output: texto sugerido(s).

- hashtagResearch
  - Busca y sugiere hashtags relevantes por tema o público objetivo.
  - Input: { topic, locale?, time_range? }
  - Output: lista de hashtags con volumen/score (cuando esté disponible).

- twitterTrendsAnalysis
  - Consulta tendencias (global/por región) y las interpreta para sugerir acciones.
  - Input: { woeid? | geo?, period? }
  - Output: tendencias y recomendaciones.

- twitterAnalytics
  - Recupera métricas (engagement, impresiones, CTR) para cuentas configuradas.
  - Input: { account_id, range }
  - Output: métricas agregadas, top posts.

- Serp-related tools
  - `serpGeneralSearch`, `serpNewsSearch`, `serpTrendsSearch`, `serpTrendingNow`, `webSearch` — usados para investigación y descubrimiento de contenido.

- getCurrentDateTime
  - Utilidad para planificar horarios óptimos de publicación.

- delegate_to_luna / delegate_to_zara / delegate_to_viktor
  - Delegación a sub-agentes especializados (ver abajo).

- complete_task
  - Marca tareas como completadas y comunica resultado al orquestador.

## Sub-agentes y responsabilidades
- Luna — Content Creator
  - Generación de borradores, variantes de copy, ideas creativas y calendarios de contenido.
  - Interfaz con `generateTweet` y herramientas de búsqueda para briefing.

- Zara — Analytics & Trends
  - Analiza datos, detecta patrones, sugiere hashtags y horarios; ejecuta `twitterTrendsAnalysis` y `twitterAnalytics`.

- Viktor — Publishing & Scheduler
  - Encargado de programar y publicar (usa `postTweet`), manejo de colas y control de errores en la publicación.

Delegación: Nora decide cuándo mantener la acción y cuándo delegar. Cada sub-agente devuelve una respuesta estructurada que Nora incorpora en su plan.

## Gestión de credenciales
- Modelo: una fila por conexión en `user_service_connections` (tabla común del sistema).
- Migración añadida: índices y constraints para soportar tipo `twitter` y metadatos.
- CRUD Server: `app/api/twitter/credentials/route.ts` — crea, lista, elimina conexiones.
- Test endpoint: `app/api/twitter/test/route.ts` — valida credenciales con la API de Twitter antes de guardarlas.
- Seguridad: las claves se encriptan en la base de datos (misma estrategia usada para Notion/SerpAPI).
- UI: `components/serpapi/serpapi-credentials-manager` y el equivalente `components/twitter/twitter-credentials-manager.tsx` permiten agregar, testear y eliminar credenciales desde la sección de agentes.

## Flujo de trabajo (ejemplo: publicar una campaña)
1. Usuario configura credenciales en el panel de agentes (`/app/agents/manage`).
2. Nora recibe un objetivo: "Lanzar hilo promocional sobre X".
3. Nora consulta a Zara para investigar tendencias y hashtags.
4. Nora solicita a Luna 3 variantes de hilo (tono A/B/C) usando `generateTweet` y resultados de búsqueda.
5. Nora valida internamente la mejor variante y entrega a Viktor para programar la publicación con `postTweet` (o publicar inmediatamente).
6. Después de publicar, Zara recopila métricas con `twitterAnalytics` y Nora resume el rendimiento y sugiere optimizaciones.

## Contratos mínimos (inputs/outputs)
- Inputs:
  - Credenciales del usuario (almacenadas por `user_id`)
  - Objetivo/brief (texto estructurado) para generación
  - Contexto (audiencia, canal, restricciones legales)
- Outputs:
  - Publicaciones (tweet ids / urls)
  - Recomendaciones (hashtags, horarios)
  - Reportes de métricas
- Modo fallo:
  - Si faltan credenciales: la tool falla con mensaje y Nora solicita al usuario conectar credenciales.
  - Rate limit / API errors: retries exponenciales con backoff y fallback a acciones manuales (notificar al usuario).

## Casos borde y consideraciones
- Múltiples cuentas: el usuario puede tener varias conexiones; Nora escogerá la conexión etiquetada/activa.
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
