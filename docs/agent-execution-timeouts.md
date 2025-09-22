# Agent Execution Timeout & Retry Strategy

## Objetivo
Garantizar que las herramientas y ejecuciones de agentes no queden colgadas indefinidamente y ofrezcan:
- Timeouts configurables y conscientes del tipo de tool
- Reintentos controlados y seguros
- Feedback temprano (warnings) y eventos de actividad
- Métricas básicas para observabilidad

## Fuentes y Buenas Prácticas
Basado en patrones usados por orquestadores de agentes (LangChain Agents, CrewAI, OpenAI Assistants patterns) y recomendaciones de:
- Evitar timeouts rígidos únicos para todos los casos
- Distinguir herramientas de larga duración (calendario, indexación, búsqueda externa) de herramientas rápidas
- Registrar actividad intermedia para prevenir falsos positivos de timeout

## Jerarquía de Timeout
Precedencia (el primero que exista aplica):
1. Timeout específico de la ejecución (`options.timeoutMs`)
2. Config del Agente (`agent.config.timeouts?.defaultMs` o bucket específico)
3. Variable de entorno (`process.env.AGENT_DEFAULT_TIMEOUT_MS`)
4. Bucket por tipo de tool (fallback heurístico)
5. Valor fijo de respaldo (por ahora 120s)

## Buckets / Heurística de Tools
Los nombres de herramientas se hacen match por patrones (case-insensitive):
- `calendar|schedule|event` → 180s
- `web|browser|search|crawl|serp` → 150s
- `notion|drive|doc|sheet` → 160s
- `shopify|order|product` → 160s
- `twitter|social` → 140s
- `default` → 120s

Puedes ajustar estos valores en el adaptador `orchestrator-adapter-enhanced.ts`.

## Warning Progresivo
Al 80% del timeout configurado se añade un mensaje de sistema y se emite el evento `execution_timeout_warning`.

## Detección de Actividad
Se vigila crecimiento de:
- `messages.length`
- `steps.length`

Cada incremento registra timestamp de actividad y emite `execution_activity`.

## Condición de Timeout
Se considera timeout si:
- `elapsed >= timeoutMs` y
- No se ha registrado actividad dentro de la ventana de gracia final (últimos 25% del timeout) o explícitamente forzado.

## Reintentos
Un solo reintento automático (si no hubo progreso suficiente):
- Estado anterior pasa a `timed_out`
- Se crea nueva ejecución clonando contexto
- Se marca `retryOf` y se incrementa `retryCount`
- Si el reintento también expira: estado final `failed`

Puedes ampliar a más reintentos añadiendo lógica condicional en `restartExecution` (buscar comentario `// Retry policy`).

## Métricas Almacenadas
Campo `metrics` dentro de la ejecución mantiene:
- `executionTimeMs` / `executionTime` (segundos redondeados)
- Futuro: `toolLatency`, `activityIntervals`, `retries`

## Eventos Emitidos
- `execution_timeout_warning`
- `execution_activity`
- `execution_timeout`
- `execution_retry`
- `execution_failed`

Suscríbete con los listeners registrados en el adaptador para telemetría en UI / logs.

## Ajustes Recomendados
1. Definir en `.env` un baseline: `AGENT_DEFAULT_TIMEOUT_MS=120000`
2. Exponer en UI avanzada la configuración de buckets y multiplicadores.
3. Registrar métricas en tu capa de observabilidad (Prometheus / OTEL) escuchando eventos.
4. Añadir cancelación manual: botón que marque ejecución como `cancelled` y limpie timers.
5. Añadir persistencia de `lastActivityAt` para tolerancia a reinicios del proceso.

## Próximos Pasos (Opcionales)
- Persistir ejecuciones y métricas en base de datos
- Soporte de cancelación cooperativa vía señal en context
- Backoff exponencial para más de 1 reintento
- Telemetría de tool granular (inicio/fin por llamada interna)

## Cómo Cambiar un Timeout Puntual
Al invocar ejecución puedes pasar:
```ts
createAndRunExecution(agent, { timeoutMs: 90_000 })
```
Esto ignora buckets y usa el valor directo.

## Señales de Salud
Para dashboards define umbrales:
- % de ejecuciones que expiran < 5%
- Tiempo medio < 60% de límite configurado
- Ratio de reintento éxito > 50%

Mantén observación y ajusta buckets según datos reales.

---
Última actualización: (auto)