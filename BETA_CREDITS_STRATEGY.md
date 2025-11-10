# 🎁 Estrategia de Créditos para Beta

## 📊 Distribución Actual

### **Usuarios en Base de Datos: 81**

| Tipo de Usuario | Créditos | Cantidad | Porcentaje |
|-----------------|----------|----------|------------|
| **Admin (tú)** | 5,000 | 1 | 1.23% |
| **Beta Testers** | 1,000 | 80 | 98.77% |

---

## 🎯 Configuración de Créditos

### **Plan Free (Beta)**
- **Créditos mensuales:** 1,000 (10x el plan normal)
- **Justificación:** Permitir testing extensivo sin limitaciones
- **Post-Beta:** Se reducirá a 100 créditos

### **Usuarios Existentes**
- ✅ Todos los 80 usuarios beta recibieron automáticamente **1,000 créditos**
- ✅ Migración aplicada: `increase_beta_user_credits`

### **Usuarios Nuevos**
- ✅ Default configurado en la base de datos: **1,000 créditos**
- ✅ Registros nuevos recibirán automáticamente este balance

---

## 🔧 Implementación Técnica

### **Base de Datos**
```sql
-- Columnas en public.users
total_credits DEFAULT 1000  -- Beta tier
used_credits DEFAULT 0

-- Comentario en columna
'Total credits available for user. Default 1000 for beta users, 
 will be 100 for free tier post-beta.'
```

### **Código Backend**
```typescript
// lib/credits/credit-tracker.ts
const planCredits = {
  free: 1000,  // Beta tier: 10x normal
  pro: 2500,
  'pro+': 7500,
  business: 999999
}
```

### **API de Balance**
```typescript
// app/api/credits/balance/route.ts
// Fallback si no hay datos
{
  plan: 'free',
  total_credits: 1000,  // Beta tier
  used_credits: 0,
  remaining_credits: 1000
}
```

---

## 📈 Capacidad de Testing

Con **1,000 créditos**, los beta testers pueden hacer:

| Modelo | Mensajes Aproximados |
|--------|---------------------|
| **Grok-4-Fast** | ~1,000,000 mensajes (ultra económico) |
| **GPT-4o-mini** | ~330,000 mensajes |
| **GPT-5** (futuro) | ~1,300 mensajes |

**Conclusión:** Los usuarios pueden usar la app extensivamente sin preocuparse por límites durante la beta.

---

## 🚀 Transición Post-Beta

### **Plan de Reducción**
Cuando salgas de beta, ejecutar esta migración:

```sql
-- Reducir créditos de free tier a valor normal
UPDATE public.users
SET total_credits = 100
WHERE subscription_tier = 'free' 
  AND total_credits = 1000;

-- Actualizar default para nuevos usuarios
ALTER TABLE public.users 
ALTER COLUMN total_credits SET DEFAULT 100;
```

### **Actualizar Código**
```typescript
// lib/credits/credit-tracker.ts
const planCredits = {
  free: 100,  // Post-beta: valor normal
  pro: 2500,
  'pro+': 7500,
  business: 999999
}
```

---

## 📝 Notas Importantes

1. **No hay enforcement durante beta** - Los usuarios pueden seguir usando la app aunque se queden sin créditos
2. **Tracking activo** - Todos los usos se registran en `credit_usage` table
3. **Reset mensual** - Los créditos se resetean el 1er día de cada mes
4. **Admin tiene 5,000** - Para testing sin limitaciones

---

## ✅ Estado Actual

- ✅ 80 usuarios beta tienen 1,000 créditos
- ✅ Nuevos registros recibirán 1,000 créditos automáticamente
- ✅ Código actualizado para reflejar valores beta
- ✅ Landing y pricing pages muestran "1,000 créditos (Beta)"
- ✅ Sistema de tracking funcionando correctamente

---

**Última actualización:** 2025-11-11  
**Migración aplicada:** `increase_beta_user_credits`, `update_default_credits_for_new_users`
