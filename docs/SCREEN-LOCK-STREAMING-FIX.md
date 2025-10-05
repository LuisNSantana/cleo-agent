# Fix: Streaming Se Detiene al Bloquear Pantalla

## Problema Reportado

Cuando el usuario bloquea la pantalla durante una conversación con un tool ejecutándose, **el streaming se detiene** y la respuesta queda incompleta.

## Causa Raíz

### Comportamiento del Navegador

Los navegadores modernos (Chrome, Safari, Firefox) **suspenden conexiones activas** cuando una pestaña pierde visibilidad para ahorrar recursos:

1. **Page Visibility API**: El navegador detecta cuando la pantalla se bloquea/desbloquea
2. **Suspensión de fetch**: Las conexiones `fetch()` con streaming se pausan o abortan
3. **Sin reconexión**: El código no detectaba ni manejaba esta situación
4. **Usuario confundido**: La respuesta aparece incompleta sin explicación

### Evidencia Técnica

```javascript
// Antes (sin manejo):
const response = await fetch(endpoint, {
  body: JSON.stringify({ ... }),
  signal: abortController.signal
});

const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read(); // ⚠️ Se suspende aquí
  if (done) break;
  // ...
}
```

Cuando se bloquea la pantalla:
- `reader.read()` se congela indefinidamente
- No hay timeout ni detección de estado
- El usuario no recibe feedback

## Solución Implementada

### 1. Hook de Page Visibility

Creado `/hooks/use-page-visibility.ts` que detecta cambios de visibilidad:

```typescript
export function usePageVisibility(options: {
  onVisible?: (state: VisibilityState) => void
  onHidden?: (state: VisibilityState) => void
  minHiddenDuration?: number
})
```

**Características**:
- ✅ Detecta lock/unlock de pantalla
- ✅ Calcula duración de ocultamiento
- ✅ Permite threshold mínimo (ignora switches rápidos)
- ✅ Callbacks para visible/hidden/change

### 2. Tracking de Estado de Streaming

Modificado `use-chat-core.ts` para rastrear streams activos:

```typescript
// Track if there was an active stream that was interrupted
const wasStreamingRef = useRef(false)
const lastStreamMessageRef = useRef<string>('')

// Marcar cuando comienza streaming
wasStreamingRef.current = true
lastStreamMessageRef.current = text

// Resetear cuando termina
wasStreamingRef.current = false
```

### 3. Notificación al Usuario

Cuando la página vuelve a ser visible después del bloqueo:

```typescript
usePageVisibility({
  onVisible: (state) => {
    // Si página estuvo oculta >5s y había stream activo
    if (state.hiddenDuration > 5000 && wasStreamingRef.current) {
      toast({
        title: 'Connection may have been interrupted',
        description: 'Your screen was locked during streaming. If the response is incomplete, try resending.',
        status: 'warning'
      })
      wasStreamingRef.current = false
    }
  },
  minHiddenDuration: 1000 // Ignorar switches rápidos
})
```

## Flujo Completo

```
Usuario envía mensaje → Stream inicia
                ↓
    wasStreamingRef = true
                ↓
    Usuario bloquea pantalla → Browser suspende fetch
                ↓
    Pantalla se desbloquea → Page Visibility API detecta
                ↓
    onVisible callback → Revisa wasStreamingRef
                ↓
    Si true → Toast de advertencia al usuario
                ↓
    Usuario puede re-enviar el mensaje
```

## Limitaciones y Trade-offs

### Lo Que NO Podemos Hacer

❌ **Mantener la conexión activa durante el bloqueo**
- Los navegadores suspenden por diseño (ahorro energía)
- No hay forma de bypass sin service workers complejos

❌ **Reanudar automáticamente el streaming**
- El stream del servidor ya terminó/abortó
- Necesitaría arquitectura con resumable requests (muy complejo)

### Lo Que SÍ Hacemos

✅ **Detectar la interrupción**
✅ **Notificar al usuario**
✅ **Dar feedback claro para re-intentar**
✅ **Evitar confusión sobre respuestas incompletas**

## Mejoras Futuras Posibles

### Opción 1: Polling en Background (Complejo)

```typescript
// Implementar WebSocket o SSE con heartbeat
const ws = new WebSocket(endpoint)
ws.onmessage = (event) => {
  // Guardar estado en localStorage
  localStorage.setItem('streaming-state', JSON.stringify({
    chatId,
    lastChunk: event.data,
    timestamp: Date.now()
  }))
}

// Al volver a visible, recuperar desde localStorage
```

**Pros**: Stream continúa en background
**Contras**: Complejo, más recursos, necesita WebSocket

### Opción 2: Server-Side Buffering

```typescript
// Backend guarda respuesta parcial
POST /api/chat/resume
{
  "chatId": "...",
  "messageId": "...",
  "lastReceivedChunk": 42
}

// Retorna chunks desde ese punto
```

**Pros**: Más robusto
**Contras**: Requiere cambios backend significativos

### Opción 3: Service Worker (Muy Complejo)

Usar service worker para mantener conexión activa incluso con pantalla bloqueada.

**Pros**: Conexión persistente
**Contras**: 
- Muy complejo
- No soportado en todos navegadores
- Puede causar drain de batería

## Para Probar

1. **Iniciar conversación con tool largo**:
```
User: "Research the latest AI developments and write a detailed summary"
```

2. **Durante el streaming**: Bloquear pantalla (Cmd+Ctrl+Q en Mac)

3. **Esperar 10+ segundos**: Dejar bloqueada

4. **Desbloquear**: 
   - ✅ Deberías ver toast de advertencia
   - ✅ Mensaje indica que la respuesta puede estar incompleta
   - ✅ Usuario sabe que puede re-enviar

## Archivos Modificados

1. **`/hooks/use-page-visibility.ts`** (NUEVO)
   - Hook para detectar visibilidad de página
   - Calcula duración de ocultamiento
   - Callbacks para eventos

2. **`/app/components/chat/use-chat-core.ts`**
   - Import del hook
   - Tracking de `wasStreamingRef`
   - Notificación al usuario
   - Reset del flag en done/error

## Recomendaciones para Usuarios

En la documentación, agregar:

> **💡 Tip**: Si bloqueas tu pantalla durante una conversación, es posible que la respuesta se interrumpa. Si esto sucede, simplemente re-envía tu mensaje o pregunta "continúa" para obtener el resto de la respuesta.

## Métricas de Éxito

- ✅ Usuario recibe notificación clara cuando hay interrupción
- ✅ No más confusión sobre respuestas incompletas
- ✅ Experiencia degradada gracefully (graceful degradation)
- ✅ Performance sin impacto (hook ligero)

## Referencias

- [MDN: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Chrome: Page Lifecycle](https://developers.google.com/web/updates/2018/07/page-lifecycle-api)
- [Streams API: Interruptions](https://streams.spec.whatwg.org/#rs-model)
