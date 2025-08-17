# Guía de Performance del Chat — Arquitectura y Playbook

> Implementación final: input inmediato, renders diferidos con useDeferredValue/useTransition, validación robusta, reintentos exponenciales y métricas seguras.

## 📊 Resumen Ejecutivo

El sistema de chat fue optimizado para ofrecer entrada fluida y UI responsiva sin stutter:
- Input del usuario: actualización inmediata (sin debounce en keystrokes).
- Cálculos pesados derivados del input: se diferencian con `useDeferredValue`.
- Actualizaciones no urgentes de UI/estado (mensajes, streaming): se envuelven en `useTransition`.
- Validación de archivos robusta y lógica de reintentos con backoff exponencial.
- Memoización y dependencias finas para reducir renders.
- Métricas y limpieza seguras (sin logs ruidosos en producción).

## 🚀 Mejoras Implementadas

### 1) Entrada inmediata + renders diferidos

Objetivo: evitar “input pegado” y mantener el cursor fluido.

Snippet de referencia:
```tsx
// Input inmediato
const [input, setInput] = useState('')
const deferredInput = useDeferredValue(input) // para consumidores pesados (sugerencias, tokens, previews)

// Uso recomendado en consumidores pesados
const suggestions = useMemo(() => buildSuggestions(deferredInput), [deferredInput])
```

Cuándo usar qué:
- setInput(value): siempre inmediato en onChange.
- useDeferredValue(input): para cualquier derivado costoso del input (p. ej., sugerencias, conteo de tokens, previews).
- useTransition: para actualizaciones no urgentes (insertar mensajes, reordenar listas, toggles costosos).

### 2) 🛡️ Validación robusta de archivos

Implementación de ejemplo:
```typescript
function validateFiles(files: File[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  for (const file of files) {
    // Size validation (10MB limit)
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File "${file.name}" exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
      continue
    }
    
    // Type validation
    const isValidType = isImageFile(file) || 
      file.type.startsWith('text/') || 
      file.type === 'application/pdf' ||
      file.type === 'application/json'
    
    if (!isValidType) {
      errors.push(`File "${file.name}" has unsupported type: ${file.type}`)
    }
  }

  return { isValid: errors.length === 0, errors }
}
```

**Ventajas:**
- **🔒 Seguridad**: Validación temprana previene uploads maliciosos
- **💡 UX mejorada**: Errores claros antes de procesamiento
- **⚡ Performance**: Early returns evitan procesamiento innecesario
- **📊 Logging**: Métricas detalladas para debugging
### 3) 🔄 Manejo de errores y reintentos (con debounce en toasts)

```ts
// Debounce solo para toasts de error (evitar spam)
const debouncedHandleError = useMemo(
  () => debounce((error: Error) => {
    // Mostrar un único toast consolidado
    toast({ title: 'Error', description: error.message, status: 'error' })
  }, ERROR_TOAST_DEBOUNCE_MS),
  []
)

// Exponential backoff para reintentos
if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
  retryCountRef.current++
  const retryDelay = RETRY_DELAY_BASE * Math.pow(2, retryCountRef.current - 1)
  setTimeout(() => {
    // Restaurar y reintentar la acción
  }, retryDelay)
}
```

Beneficios:
- Resiliencia ante fallos intermitentes de red.
- Evita saturación de UI por múltiples errores.
- Backoff protege servicios en picos.

### 4) 📊 Tracking de performance seguro

Recomendaciones:
- Usar `performance.mark/measure` o contadores en refs.
- No emitir logs ruidosos en producción. Si se requieren, proteger con `if (process.env.NODE_ENV !== 'production')`.
- Limpiar timers/debounces en unmount.

```ts
const perf = useRef({ inputChanges: 0, hookInitTime: performance.now() })
useEffect(() => () => { debouncedHandleError.cancel() }, [debouncedHandleError])
```

### 5) 🎯 Memoización y dependencias finas

Implementación de ejemplo:
```typescript
// Memoized user data to prevent recalculation
const memoizedUserData = useMemo(() => ({
  id: user?.id,
  system_prompt: user?.system_prompt
}), [user?.id, user?.system_prompt])

// Memoized personality settings
const memoizedPersonalitySettings = useMemo(() => 
  preferences.personalitySettings, 
  [preferences.personalitySettings?.personalityType, preferences.personalitySettings?.customStyle]
)
```

**Ventajas:**
- **🔄 Reduced recalculations**: Solo recalcula cuando datos realmente cambian
- **⚡ Faster renders**: Menos trabajo en cada render cycle
- **🧠 Smart dependencies**: Dependencias granulares vs objeto completo
- **📊 Tracking**: Logs indican cuando hay recalculación innecesaria
## 🧪 Testing y Validación

Pruebas recomendadas:
- React Profiler: typing sostenido no debe generar stutter; flamegraph estable.
- Performance tab: menos trabajo en consumidores pesados gracias a `useDeferredValue`.
- Network: sin ráfagas redundantes; reintentos con backoff ante fallos.
- Memory: timers/debounces limpios al desmontar.

## 📈 Impacto y Beneficios

- Input 100% fluido (sin debounce de tecleo).
- Renders pesados desplazados fuera del camino crítico de escritura.
- UI resistente a errores transitorios con reintentos.
- Menos cálculos y renders gracias a memoización y dependencias finas.

## 🔧 Notas de Implementación

### Dependencias
```json
{
  "lodash": "^4.17.21",
  "@types/lodash": "^4.14.x"
}
```

### Constantes
```ts
const ERROR_TOAST_DEBOUNCE_MS = 500    // debounce para errores (toasts)
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_RETRY_ATTEMPTS = 3           // reintentos máximos
const RETRY_DELAY_BASE = 1000          // 1s base para backoff
```

### Mapa de archivos y responsabilidades
- `app/components/chat/use-chat-core.ts`
  - Fuente de verdad de estado de chat.
  - Input inmediato; `useTransition` para actualizaciones no urgentes.
  - Manejo de errores con debounce de toasts y backoff exponencial.
  - Validación de archivos y limpieza de recursos.
- `app/components/chat-input/chat-input.tsx`
  - UI de entrada; usa `useDeferredValue` para consumidores pesados (sugerencias, previews, token count).
  - No aplica debounce a keystrokes.
- `app/components/chat/message-assistant.tsx`
  - Render de mensajes del asistente; sin logs en producción.

## �️ Flujos de trabajo relevantes

1) Flujo de tipeo
- onChange → setInput(value) inmediato.
- Consumidores pesados leen `deferredInput` (useDeferredValue(input)).
- UI mantiene el caret fluido aunque los cálculos tarden.

2) Envío de mensaje / streaming
- startTransition(() => aplicar cambios de mensajes/estado no urgentes).
- Previene bloqueos de UI durante inserciones/actualizaciones.

3) Adjuntos (files/images)
- UI → validateFiles → aceptación/rechazo temprano.
- Si válido: preparación/preview y continuación del flujo multimodal.

4) Errores y reintentos
- Se debouncean toasts (no el input).
- Reintentos con backoff hasta MAX_RETRY_ATTEMPTS.

## 🧰 Playbook de diagnóstico

- Input con lag: verificar que no exista debounce en onChange; mover trabajo pesado a `useDeferredValue`.
- UI se congela al enviar: envolver actualizaciones en `useTransition`.
- Spam de errores: aumentar `ERROR_TOAST_DEBOUNCE_MS` o consolidar fuentes de error.
- Rechazo de archivos: revisar `MAX_FILE_SIZE` y lista de MIME permitidos.
- Renders excesivos: revisar dependencias de `useMemo`/`useCallback` y evitar objetos inestables.

## 🚀 Futuras mejoras
1. Aplicar `useDeferredValue` a contadores de tokens/previews restantes.
2. Indicador visual opcional con `isUiPending` mientras corre una transición.
3. Web Workers para validaciones pesadas en lotes.
4. Caché local (IndexedDB) para borradores adjuntos grandes.

---

Fecha: August 17, 2025
Autoría: Nayo / HuminaryLabs
Estado: ✅ Production Ready
Próxima revisión: en 1 mes con métricas reales
