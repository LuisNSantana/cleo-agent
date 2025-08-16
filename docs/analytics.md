# Cleo Analytics - Implementación completa

Este documento describe cómo usar el nuevo sistema de analytics.

## Objetivos
- Métricas por modelo (tokens, latencia, coste)
- Uso de features y herramientas
- Métricas por conversación y sesión
- Vistas para dashboard
- RLS asegurando privacidad

## SQL
Ejecuta `supabase_schema_analytics.sql` en tu base de datos (orden único, idempotente).

## API de tracking (frontend/backend)

Expone utilidades simples para reportar eventos:

- trackModelUsage(userId, model, inputTokens, outputTokens, responseTimeMs)
- trackFeatureUsage(userId, featureName, { delta: 1, timeSpentMinutes: 0, successRate: null, metadata })
- trackToolUsage(userId, toolName, { ok: true, execMs, params, errorType })
- startUserSession(userId)
- endUserSession(userId)

La mayoría se actualiza automáticamente por triggers cuando se insertan mensajes de role `assistant`.

## Consultas útiles

- Resumen diario del usuario:
```
select * from user_daily_summary where user_id = :uid order by usage_date desc limit 30;
```

- Rendimiento por modelo (últimos 30 días):
```
select * from model_performance_summary where usage_date >= current_date - interval '30 days';
```

- Top features (últimos 7 días):
```
select * from popular_features_summary where total_usage > 0;
```

## Siguientes pasos
- Añadir endpoints REST en `/api/analytics/*` para exponer métricas del dashboard.
- Añadir un pequeño cliente en `lib/analytics.ts` con helpers.
- Integrar tracking de herramientas en `lib/tools/*`.
