# Configuración de Autenticación Local

**Fecha**: 24 de octubre de 2025  
**Problema resuelto**: Login redirige a producción (imcleo.com) en lugar de localhost

## 🎯 Problema

Cuando se iniciaba sesión en desarrollo local, el callback de OAuth de Google redirigía a `https://www.imcleo.com` en lugar de `http://localhost:3000`, causando que las pruebas locales fallaran.

## ✅ Solución implementada

### 1. Nueva utilidad centralizada de URLs
Se creó `lib/utils/app-url.ts` con funciones helpers para manejar URLs dinámicamente:

```typescript
export function getAppBaseUrl(): string {
  // Priority 1: Explicit NEXT_PUBLIC_APP_URL (ngrok, tunnels, custom)
  // Priority 2: Browser window.location.origin
  // Priority 3: Development localhost (NODE_ENV === 'development')
  // Priority 4: Vercel preview/production URL
  // Priority 5: Production fallback (imcleo.com)
}
```

**Jerarquía de resolución**:
1. ✅ `NEXT_PUBLIC_APP_URL` (si está definido)
2. ✅ `window.location.origin` (en cliente)
3. ✅ `http://localhost:3000` (si `NODE_ENV === 'development'`)
4. ✅ `https://${VERCEL_URL}` (si está en Vercel)
5. ✅ `https://www.imcleo.com` (fallback producción)

### 2. Actualización del flujo de autenticación

#### `lib/api.ts` - `signInWithGoogle()`
**Antes** ❌:
- Lógica inline compleja para determinar URL
- No usaba consistentemente `NODE_ENV`

**Después** ✅:
```typescript
const { getAuthCallbackUrl } = await import('./utils/app-url')
const callbackUrl = getAuthCallbackUrl()

console.log('🔐 [AUTH] Starting Google OAuth:', {
  callbackUrl,
  nodeEnv: process.env.NODE_ENV
})

await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: callbackUrl, // Usa helper centralizado
    scopes: "openid email profile",
    queryParams: {
      access_type: "offline",
      prompt: "consent",
    },
  },
})
```

#### `app/auth/callback/route.ts`
**Antes** ❌:
- Dependía de `request.headers.get("host")` manualmente
- Lógica duplicada de detección de protocolo

**Después** ✅:
```typescript
import { getAppBaseUrl } from "@/lib/utils/app-url"

const baseUrl = getAppBaseUrl()

console.log('🔐 [AUTH CALLBACK] Processing OAuth callback:', {
  hasCode: !!code,
  next,
  baseUrl,
  nodeEnv: process.env.NODE_ENV
})

// Todas las redirecciones usan baseUrl consistentemente
return NextResponse.redirect(`${baseUrl}${next}`)
```

### 3. Actualización de `.env.example`
Se agregó documentación clara sobre cuándo configurar `NEXT_PUBLIC_APP_URL`:

```bash
# Application URL Configuration
# Leave empty for automatic detection:
# - Local dev: http://localhost:3000
# - Production: https://www.imcleo.com
# - Vercel preview: auto-detected from VERCEL_URL
# Only set this if using ngrok, tunnels, or custom domains for OAuth callbacks
NEXT_PUBLIC_APP_URL=
```

## 📋 Configuración para desarrollo local

### Opción 1: Sin variable de entorno (recomendado)
En `.env.local`, **deja vacío** o **comenta** `NEXT_PUBLIC_APP_URL`:

```bash
# NEXT_PUBLIC_APP_URL=  # Comentado o vacío = auto-detección
```

El sistema detectará automáticamente:
- `http://localhost:3000` en desarrollo
- `https://www.imcleo.com` en producción

### Opción 2: Con ngrok o túnel
Si usas ngrok u otro túnel para OAuth de Google:

```bash
NEXT_PUBLIC_APP_URL=https://tu-dominio.ngrok.io
```

### Configurar redirect URI en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Proyecto → APIs & Services → Credentials
3. OAuth 2.0 Client IDs → Tu aplicación
4. **Authorized redirect URIs**, agrega:
   ```
   http://localhost:3000/auth/callback
   https://www.imcleo.com/auth/callback
   ```

## 🧪 Cómo probar

### Test 1: Login local
```bash
# 1. Asegúrate que .env.local NO tiene NEXT_PUBLIC_APP_URL definido
# 2. Inicia el servidor
pnpm dev

# 3. Abre http://localhost:3000
# 4. Click en "Sign in with Google"
# 5. Verifica en consola del navegador:
```

Deberías ver:
```
🔐 [AUTH] Starting Google OAuth: {
  callbackUrl: "http://localhost:3000/auth/callback",
  nodeEnv: "development"
}
```

### Test 2: Callback correcto
Después de autenticarte con Google, verifica en los logs del servidor:

```
🔐 [AUTH CALLBACK] Processing OAuth callback: {
  hasCode: true,
  next: "/",
  baseUrl: "http://localhost:3000",
  nodeEnv: "development"
}

✅ [AUTH CALLBACK] Exchange code successful: {
  hasUser: true,
  userId: "...",
  userEmail: "..."
}

🔐 [AUTH CALLBACK] Redirecting to: http://localhost:3000/
```

### Test 3: Producción
En Vercel, sin `NEXT_PUBLIC_APP_URL`:
```
callbackUrl: "https://www.imcleo.com/auth/callback"
baseUrl: "https://www.imcleo.com"
```

## 🐛 Troubleshooting

### Problema: Sigue redirigiendo a imcleo.com en local

**Causa**: `NEXT_PUBLIC_APP_URL` está configurado con el dominio de producción.

**Solución**:
```bash
# En .env.local, comenta o elimina:
# NEXT_PUBLIC_APP_URL=https://www.imcleo.com
```

Reinicia el servidor:
```bash
pnpm dev
```

### Problema: "Redirect URI mismatch" de Google

**Causa**: El redirect URI no está autorizado en Google Cloud Console.

**Solución**:
1. Ve a Google Cloud Console
2. Agrega `http://localhost:3000/auth/callback` a Authorized redirect URIs
3. Espera 5 minutos para que se propague

### Problema: Variables de entorno no se actualizan

**Causa**: Next.js cachea variables en tiempo de build.

**Solución**:
```bash
# Limpia caché y reinicia
rm -rf .next
pnpm dev
```

## 📊 Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `lib/utils/app-url.ts` | ✨ Nuevo - Utilidad centralizada de URLs |
| `lib/api.ts` | ♻️ Usa `getAuthCallbackUrl()` |
| `app/auth/callback/route.ts` | ♻️ Usa `getAppBaseUrl()` + logs mejorados |
| `.env.example` | 📝 Documentación de `NEXT_PUBLIC_APP_URL` |

## 🎯 Ventajas de la nueva implementación

1. **Single Source of Truth**: Una sola función determina la URL base
2. **Environment-aware**: Detecta automáticamente dev vs prod
3. **Flexible**: Soporta ngrok, túneles, custom domains
4. **Logging mejorado**: Logs claros para debugging
5. **Backward compatible**: No rompe configuraciones existentes

## 🚀 Despliegue

No requiere cambios en producción. El sistema detecta automáticamente el entorno:

- **Vercel Production**: Usa `VERCEL_URL` o fallback a `imcleo.com`
- **Vercel Preview**: Usa `VERCEL_URL` (auto-detectado)
- **Localhost**: Usa `http://localhost:3000`

## 📝 Notas adicionales

- **Security**: El sistema valida el origen en el callback para evitar redirects maliciosos
- **Performance**: La detección de URL es instantánea (sin API calls)
- **Testing**: Los helpers son unit-testables por separado

---

**Status**: ✅ Completado y listo para pruebas locales
