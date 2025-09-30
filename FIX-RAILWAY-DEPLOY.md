# 🔧 Fix Railway Deploy - Paso a Paso

## ❌ Problema Identificado

Railway estaba intentando construir **toda la app Next.js** en lugar de solo el servidor proxy, causando el error de Supabase.

## ✅ Solución Aplicada

He creado 3 archivos para decirle a Railway que solo construya el servidor:

1. `.railwayignore` - Ignora todo excepto /server
2. `nixpacks.toml` - Configuración explícita de build
3. `railway.json` actualizado - Mejor configuración

## 📝 Pasos para Re-Deploy

### 1. Commit los Cambios

```bash
git add .railwayignore nixpacks.toml railway.json server/package.json
git commit -m "fix: Configure Railway to deploy only voice proxy server"
git push
```

### 2. Re-Deploy a Railway

```bash
railway up
```

Ahora Railway debería:
- ✅ Ignorar el proyecto Next.js
- ✅ Solo instalar dependencias en /server
- ✅ Solo ejecutar node websocket-proxy.js
- ✅ Deploy exitoso en ~30 segundos

### 3. Configurar API Key (si no lo has hecho)

```bash
railway variables set OPENAI_API_KEY=sk-proj-TU_KEY_AQUI
```

### 4. Obtener URL

```bash
railway domain
```

### 5. Ver Logs para Confirmar

```bash
railway logs --tail
```

Deberías ver:
```
WebSocket Proxy Server listening on port 8080
Clients should connect to: ws://localhost:8080
```

## ✅ Verificación

Una vez deployado:

```bash
# Verificar que responde
curl https://TU-URL.up.railway.app

# Deberías ver:
# WebSocket Proxy Server Running
```

## 🎯 Siguiente Paso

Una vez que `railway up` sea exitoso:

1. Copia la URL que Railway te da
2. Configúrala en Vercel:
   ```bash
   vercel env add NEXT_PUBLIC_WS_PROXY_URL production
   # Pegar: wss://TU-URL.up.railway.app
   ```
3. Re-deploy tu app:
   ```bash
   vercel --prod
   ```

## 🐛 Si Aún Falla

Si después de `railway up` aún hay error:

1. Ver logs completos:
   ```bash
   railway logs
   ```

2. Ver qué está construyendo:
   ```bash
   railway status
   ```

3. Si sigue intentando construir Next.js, prueba:
   ```bash
   # Eliminar build cache
   railway down
   railway up --no-cache
   ```

## 💡 Explicación Técnica

**Antes:**
- Railway detectaba `package.json` en la raíz
- Intentaba `pnpm build` (Next.js)
- Fallaba por falta de variables de Supabase

**Ahora:**
- `.railwayignore` solo permite /server
- `nixpacks.toml` dice explícitamente cómo construir
- Solo ejecuta `cd server && npm install && node websocket-proxy.js`

## 🚀 Resumen

```bash
# 1. Commit
git add .railwayignore nixpacks.toml railway.json server/package.json
git commit -m "fix: Railway deploy only proxy server"
git push

# 2. Deploy
railway up

# 3. Verificar
railway logs --tail

# 4. Obtener URL
railway domain

# 5. Configurar en Vercel
vercel env add NEXT_PUBLIC_WS_PROXY_URL production
# Valor: wss://TU-URL.up.railway.app

# 6. Deploy app
vercel --prod
```

---

**¡Ejecuta estos comandos y el deploy debería funcionar!** 🎯
