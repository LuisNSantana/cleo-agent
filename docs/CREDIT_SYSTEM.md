# 💰 Sistema de Créditos - Documentación Completa

## 📋 RESUMEN

Sistema completo de créditos basado en consumo de tokens de modelos LLM. Permite al usuario ver en tiempo real cuántos créditos consume cada interacción.

**Estado:** ✅ Implementado completamente (Beta - Sin límites activos)

---

## 🎯 CONVERSIÓN

```
1 crédito = $0.01 USD
```

### Planes y Créditos

| Plan | Créditos/Mes | Valor en USD | Agentes |
|------|--------------|--------------|---------|
| **Free** | 100 | $1.00 | 1 |
| **Pro** | 2,500 | $25.00 | 7 |
| **Pro+** | 7,500 | $75.00 | 15 |
| **Business** | Ilimitados | Custom | Ilimitados |

---

## 💵 PRECIOS POR MODELO (Nov 2025)

### OpenAI
| Modelo | Input (1M tokens) | Output (1M tokens) | Créditos (estimado) |
|--------|-------------------|-------------------|---------------------|
| GPT-4o | $2.50 | $10.00 | ~250-1000 |
| GPT-4o-mini | $0.15 | $0.30 | ~15-30 |
| o1-preview | $7.50 | $30.00 | ~750-3000 |
| o1-mini | $0.55 | $2.20 | ~55-220 |

### Anthropic
| Modelo | Input (1M tokens) | Output (1M tokens) | Créditos (estimado) |
|--------|-------------------|-------------------|---------------------|
| Claude 3.5 Sonnet | $3.00 | $15.00 | ~300-1500 |
| Claude 3.5 Haiku | $0.25 | $1.25 | ~25-125 |
| Claude 3 Opus | $15.00 | $75.00 | ~1500-7500 |

### xAI Grok (Más económico 🚀)
| Modelo | Input (1M tokens) | Output (1M tokens) | Créditos (estimado) |
|--------|-------------------|-------------------|---------------------|
| Grok-4-Fast | $0.02 | $0.08 | ~2-8 |
| Grok-Beta | $0.02 | $0.08 | ~2-8 |
| Grok-Code | $0.02 | $0.08 | ~2-8 |

### Google Gemini
| Modelo | Input (1M tokens) | Output (1M tokens) | Créditos (estimado) |
|--------|-------------------|-------------------|---------------------|
| Gemini 1.5 Pro | $3.50 | $10.50 | ~350-1050 |
| Gemini 1.5 Flash | $0.35 | $1.05 | ~35-105 |

---

## 🏗️ ARQUITECTURA

### Backend

#### 1. **Model Pricing** (`/lib/credits/model-pricing.ts`)
- Tabla completa de precios por modelo
- Funciones de cálculo de costos
- Conversión automática tokens → USD → créditos

#### 2. **Credit Tracker** (`/lib/credits/credit-tracker.ts`)
- `recordCreditUsage()` - Registra cada uso en DB
- `getUserCredits()` - Obtiene balance actual
- `getThreadCreditUsage()` - Resumen por conversación
- `checkCreditsAvailable()` - Verifica disponibilidad (beta: siempre permite)

#### 3. **Graph Builder Integration** (`/lib/agents/core/graph-builder.ts`)
- Captura `usage_metadata` automáticamente
- Registra créditos después de cada invocación LLM
- Non-blocking: no afecta performance

#### 4. **Database** (`/supabase/migrations/20251110_credit_system.sql`)
- Tabla `credit_usage` con historial completo
- Vista `user_credit_summary` para resúmenes
- Función `get_user_credit_balance()` para queries rápidos
- RLS policies configuradas

### Frontend

#### 1. **Credit Display** (`/app/components/credits/credit-display.tsx`)
- `CreditDisplay` - Componente completo con progress bar
- `CreditBadge` - Badge minimal para inline display
- `CostIndicator` - Muestra costo en USD
- 3 variantes: `compact`, `full`, `badge`

#### 2. **API Endpoints**
- `GET /api/credits/balance` - Balance actual del usuario

---

## 🚀 INSTALACIÓN Y SETUP

### Paso 1: Ejecutar Migración SQL

```bash
# Opción A: Usando Supabase CLI
supabase migration up

# Opción B: Ejecutar manualmente
# Copiar contenido de /supabase/migrations/20251110_credit_system.sql
# y ejecutar en Supabase Dashboard → SQL Editor
```

### Paso 2: Verificar Tablas Creadas

```sql
-- En Supabase SQL Editor
SELECT * FROM credit_usage LIMIT 1;
SELECT * FROM user_credit_summary;
SELECT * FROM public.get_user_credit_balance('<user_id>');
```

### Paso 3: Reiniciar Aplicación

```bash
npm run dev
```

---

## 📊 FLUJO DE DATOS

```mermaid
Usuario envía mensaje
    ↓
Cleo/Agent invoca modelo LLM
    ↓
Graph Builder captura usage_metadata
    ↓
Calcula créditos (tokens × precio × tasa)
    ↓
Registra en credit_usage table
    ↓
Frontend consulta balance
    ↓
Muestra en UI (Pipeline + Header)
```

---

## 🎨 USO EN UI

### Ejemplo 1: Mostrar Balance del Usuario

```tsx
import { CreditDisplay } from '@/app/components/credits/credit-display'

// En tu componente
const [balance, setBalance] = useState(null)

useEffect(() => {
  fetch('/api/credits/balance')
    .then(res => res.json())
    .then(data => setBalance(data))
}, [])

return <CreditDisplay balance={balance} variant="compact" />
```

### Ejemplo 2: Badge Inline en Pipeline

```tsx
import { CreditBadge, CostIndicator } from '@/app/components/credits/credit-display'

// Mostrar créditos consumidos
<CreditBadge credits={1.25} />

// Mostrar costo en USD
<CostIndicator usd={0.0125} />
```

### Ejemplo 3: Display Completo en Sidebar

```tsx
<CreditDisplay balance={balance} variant="full" />
```

---

## 🔧 CONFIGURACIÓN BETA

**Estado actual:** Sistema activo pero **SIN LÍMITES ENFORCED**

### En `credit-tracker.ts`:

```typescript
export async function checkCreditsAvailable(
  userId: string,
  requiredCredits: number
): Promise<{ available: boolean; remaining: number }> {
  // ... código ...
  
  if (!available) {
    console.warn(`User ${userId} has insufficient credits`)
    // 🟢 BETA: Siempre permite ejecución
    return { available: true, remaining: userCredits.remaining_credits }
  }
  
  return { available: true, remaining: userCredits.remaining_credits }
}
```

**Para activar límites (Producción):**

Cambiar línea 195 a:
```typescript
return { available: false, remaining: userCredits.remaining_credits }
```

---

## 📈 QUERIES ÚTILES

### Ver uso total por usuario

```sql
SELECT * FROM user_credit_summary
WHERE user_id = '<user_id>';
```

### Top modelos más usados

```sql
SELECT * FROM model_usage_stats
ORDER BY execution_count DESC
LIMIT 10;
```

### Créditos consumidos hoy

```sql
SELECT 
  COUNT(*) as executions,
  SUM(total_tokens) as tokens,
  SUM(credits_used) as credits,
  SUM(usd_cost) as cost_usd
FROM credit_usage
WHERE user_id = '<user_id>'
  AND created_at >= CURRENT_DATE;
```

### Usage por agente

```sql
SELECT 
  agent_id,
  COUNT(*) as calls,
  SUM(total_tokens) as tokens,
  ROUND(SUM(credits_used), 2) as credits
FROM credit_usage
WHERE user_id = '<user_id>'
  AND created_at >= date_trunc('month', NOW())
GROUP BY agent_id
ORDER BY credits DESC;
```

---

## 🎯 EJEMPLOS DE COSTOS REALES

### Conversación típica (3 mensajes):

**Usando Grok-4-Fast (económico):**
- Input: 1,000 tokens × $0.02/1M = $0.00002
- Output: 500 tokens × $0.08/1M = $0.00004
- **Total: $0.00006 ≈ 0.01 créditos**

**Usando GPT-4o-mini (medio):**
- Input: 1,000 tokens × $0.15/1M = $0.00015
- Output: 500 tokens × $0.30/1M = $0.00015
- **Total: $0.0003 ≈ 0.03 créditos**

**Usando GPT-4o (premium):**
- Input: 1,000 tokens × $2.50/1M = $0.0025
- Output: 500 tokens × $10.00/1M = $0.005
- **Total: $0.0075 ≈ 0.75 créditos**

### Conversación compleja (10 mensajes, con delegaciones):

**Plan Free (100 créditos):**
- Con Grok: ~100-1,000 conversaciones complejas ✅
- Con GPT-4o-mini: ~30-300 conversaciones ✅
- Con GPT-4o: ~13-133 conversaciones ⚠️

**Plan Pro (2,500 créditos):**
- Con Grok: ~2,500-25,000 conversaciones ✅
- Con GPT-4o-mini: ~830-8,300 conversaciones ✅
- Con GPT-4o: ~330-3,300 conversaciones ✅

---

## 🚨 ALERTAS Y NOTIFICACIONES

### Sistema de Alertas (Ya implementado en UI)

El componente `CreditDisplay` muestra automáticamente:

- **80-89% usado:** 💡 Alerta amarilla suave
- **90-100% usado:** ⚠️ Alerta roja crítica

### Personalizar Umbrales

En `/app/components/credits/credit-display.tsx`:

```typescript
const getStatusColor = () => {
  if (usage_percentage >= 90) return 'text-red-600'   // Crítico
  if (usage_percentage >= 70) return 'text-yellow-600' // Advertencia
  return 'text-green-600' // Normal
}
```

---

## 🔐 SEGURIDAD

### RLS (Row Level Security)

✅ Usuarios solo ven su propio historial
✅ Service role puede insertar registros
✅ Admins pueden ver estadísticas globales

### Rate Limiting (Futuro)

Para producción, considera agregar:

```typescript
// En /lib/credits/credit-tracker.ts
export async function checkRateLimit(userId: string) {
  const recentCalls = await supabase
    .from('credit_usage')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 60000)) // Last minute
  
  if (recentCalls.data.length > 60) {
    throw new Error('Rate limit exceeded')
  }
}
```

---

## 🎁 BONUS: Integración con Stripe (Futuro)

### Webhook para recargas automáticas

```typescript
// /app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const event = await stripe.webhooks.constructEvent(...)
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata.userId
    
    // Actualizar plan del usuario
    await supabase
      .from('profiles')
      .update({ subscription_tier: 'pro' })
      .eq('id', userId)
  }
}
```

---

## 📂 ARCHIVOS CREADOS/MODIFICADOS

### Nuevos Archivos:
1. ✅ `/lib/credits/model-pricing.ts` - Precios y cálculos
2. ✅ `/lib/credits/credit-tracker.ts` - Tracking system
3. ✅ `/app/components/credits/credit-display.tsx` - UI components
4. ✅ `/app/api/credits/balance/route.ts` - API endpoint
5. ✅ `/supabase/migrations/20251110_credit_system.sql` - Database schema
6. ✅ `/docs/CREDIT_SYSTEM.md` - Esta documentación

### Archivos Modificados:
7. ✅ `/lib/agents/core/graph-builder.ts` - Integración de tracking

---

## 🧪 TESTING

### Test 1: Verificar Registro de Créditos

```sql
-- Envía un mensaje en el chat, luego ejecuta:
SELECT * FROM credit_usage 
ORDER BY created_at DESC 
LIMIT 5;
```

### Test 2: API Balance

```bash
curl -X GET http://localhost:3000/api/credits/balance \
  -H "Cookie: your_session_cookie"
```

### Test 3: UI Components

```tsx
// En cualquier página
import { CreditDisplay } from '@/app/components/credits/credit-display'

<CreditDisplay 
  balance={{
    plan: 'pro',
    total_credits: 2500,
    used_credits: 1200,
    remaining_credits: 1300,
    usage_percentage: 48
  }}
  variant="full"
/>
```

---

## 🎓 FAQ

### ¿Por qué usar créditos en lugar de tokens?

Los créditos son más simples para el usuario final. En lugar de explicar "consumiste 1,234 tokens", decimos "consumiste 0.05 créditos ($0.0005)".

### ¿Qué pasa si el usuario se queda sin créditos en beta?

Nada. El sistema sigue funcionando pero muestra una advertencia. Ideal para recopilar datos sin frustrar usuarios.

### ¿Cómo se renuevan los créditos?

Automáticamente cada mes (1ro del mes). Implementado en la función `get_user_credit_balance()` que filtra por `date_trunc('month', NOW())`.

### ¿Se pueden comprar créditos adicionales?

En el futuro sí, con Stripe. Por ahora solo planes mensuales.

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Tabla de precios de modelos
- [x] Sistema de tracking en backend
- [x] Integración con graph builder
- [x] Migración SQL
- [x] Componentes UI
- [x] API endpoint para balance
- [x] Documentación completa
- [ ] **Ejecutar migración SQL** 👈 **PENDIENTE**
- [ ] Agregar a UI del header/sidebar
- [ ] Testing en producción
- [ ] Integración con Stripe (opcional)

---

**¿Preguntas? Revisa esta documentación o consulta el código fuente.**
