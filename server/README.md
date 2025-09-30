# WebSocket Proxy Server

Servidor proxy WebSocket para OpenAI Realtime API.

## ¿Por qué es necesario?

Los navegadores **no pueden enviar headers personalizados** en conexiones WebSocket, pero OpenAI Realtime API **requiere** el header `Authorization: Bearer <API_KEY>`.

Este proxy:
1. Recibe conexiones WebSocket del browser
2. Conecta a OpenAI con los headers correctos
3. Hace pipe de mensajes bidireccionales

## Desarrollo Local

```bash
# Instalar dependencia
npm install ws

# Configurar .env.local
echo "OPENAI_API_KEY=sk-proj-..." >> .env.local

# Ejecutar
node server/websocket-proxy.js
```

El servidor escuchará en `ws://localhost:8080`

## Producción

### Opción 1: Railway (Recomendado)

```bash
# Instalar CLI
npm install -g @railway/cli

# Login y crear proyecto
railway login
railway init

# Deploy
railway up

# Configurar variables de entorno en Railway dashboard
OPENAI_API_KEY=sk-proj-...
```

Railway generará una URL como `wss://your-app.up.railway.app`

### Opción 2: Render

1. Crear Web Service en Render.com
2. Conectar repositorio
3. Build Command: `npm install`
4. Start Command: `node server/websocket-proxy.js`
5. Agregar variable `OPENAI_API_KEY`

### Opción 3: Fly.io

```bash
fly launch
fly secrets set OPENAI_API_KEY=sk-proj-...
fly deploy
```

### Opción 4: VPS

```bash
# En tu servidor
npm install ws pm2 -g

# Ejecutar con PM2
pm2 start server/websocket-proxy.js --name voice-proxy
pm2 save
pm2 startup
```

## Configurar en Vercel

Una vez deployado el proxy, actualiza la variable de entorno en tu app Next.js:

```bash
vercel env add NEXT_PUBLIC_WS_PROXY_URL
# Valor: wss://your-proxy-url.com

vercel --prod
```

## Seguridad

### Rate Limiting
El servidor incluye rate limiting básico (10 conexiones/minuto por IP).

### Origin Check
En producción, verifica el origin de las conexiones.

### Health Check
Disponible en `http://your-server/health`

## Monitoreo

### Logs
```bash
# Railway
railway logs

# Render
Ver en dashboard

# PM2
pm2 logs voice-proxy
```

### Métricas
Health endpoint incluye:
- Estado del servidor
- Tiempo de actividad
- Conexiones activas

## Troubleshooting

### Error: OPENAI_API_KEY not found
Asegúrate de configurar la variable de entorno en tu plataforma de hosting.

### Conexiones fallando
1. Verifica que el servidor esté corriendo
2. Verifica logs del servidor
3. Confirma que la URL en NEXT_PUBLIC_WS_PROXY_URL es correcta
4. Usa `wss://` en producción (no `ws://`)

### Performance
El proxy maneja múltiples conexiones simultáneas. Para alta carga:
- Usa múltiples instancias
- Implementa load balancing
- Monitorea uso de memoria

## Costos Estimados

- **Railway**: ~$5/mes (Hobby plan)
- **Render**: Free tier disponible, $7/mes (Starter)
- **Fly.io**: ~$5/mes
- **VPS**: $6-12/mes (DigitalOcean/Linode)

## Arquitectura

```
Browser → Proxy → OpenAI Realtime API
         (agrega Authorization header)
```

El proxy es stateless y puede escalar horizontalmente.
