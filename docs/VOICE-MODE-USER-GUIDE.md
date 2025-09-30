# 🎤 Guía de Uso: Voice Mode en Cleo

## Introducción

El Voice Mode de Cleo te permite tener conversaciones por voz con el asistente, similar a OpenAI, Perplexity o Grok. Habla naturalmente y Cleo te responderá con voz en tiempo real.

## ✨ Características Principales

### 🎯 Funcionalidades Core (Fases 1 y 2)

- **Conversación por voz en tiempo real**: Habla con Cleo como si fuera una llamada
- **Transcripción automática**: Todo se sincroniza con el chat de texto
- **Visualización de audio**: Barras animadas que muestran el nivel de audio
- **Control de micrófono**: Activa/desactiva tu micrófono durante la llamada
- **Tracking de costos**: Ve cuánto estás gastando en tiempo real
- **Rate limiting**: Control de uso por minutos mensuales según tu plan

### 🎨 UI Moderna y Limpia

- Diseño glassmorphism con degradados
- Animaciones fluidas con Framer Motion
- Indicadores visuales de estado (escuchando, hablando)
- Responsive para móvil y desktop

## 🚀 Cómo Usar

### 1. Activar Voice Mode

1. En cualquier chat, busca el **botón flotante de teléfono** (color púrpura-rosa)
2. Está ubicado en la esquina inferior derecha, encima del chat input
3. Haz clic para abrir el modal de Voice Mode

### 2. Iniciar una Conversación

1. Haz clic en **"Iniciar llamada"**
2. Otorga permisos de micrófono cuando se solicite
3. Espera a que se conecte (verás "Conectando...")
4. Cuando veas "Escuchando...", ¡ya puedes hablar!

### 3. Durante la Llamada

**Habla naturalmente:**
- No necesitas presionar ningún botón
- Cleo detecta automáticamente cuando hablas
- Puedes interrumpir a Cleo en cualquier momento

**Estados visuales:**
- 🟢 **Verde (Escuchando)**: Cleo está esperando tu mensaje
- 🔵 **Azul (Hablando)**: Cleo está respondiendo
- 🟡 **Amarillo (Conectando)**: Estableciendo conexión
- 🔴 **Rojo (Error)**: Problema de conexión

**Controles disponibles:**
- **Micrófono**: Activa/desactiva tu audio (mute)
- **Finalizar**: Termina la llamada

**Información en pantalla:**
- **Duración**: Tiempo transcurrido en formato MM:SS
- **Costo**: Costo acumulado de la sesión en USD

### 4. Finalizar

1. Haz clic en **"Finalizar"**
2. Se guardará un resumen de la sesión
3. El costo final se mostrará brevemente

## 💰 Costos y Límites

### Pricing Actual (OpenAI Realtime API)

- **Audio input**: $0.032/min
- **Audio output**: $0.064/min
- **Costo promedio**: ~$0.10/minuto de conversación

### Límites por Plan

| Plan | Minutos/Mes | Costo Mensual |
|------|-------------|---------------|
| **Free** | 5 min | ~$0.50 |
| **Starter** | 30 min | Incluido |
| **Creator** | 100 min | Incluido |
| **Pro** | 500 min | Incluido |

**Nota**: Los minutos adicionales se cobran a $0.10/min

## 🔒 Privacidad y Seguridad

- ✅ **Encriptación**: Toda la comunicación es WSS (WebSocket Secure)
- ✅ **Privacidad**: El audio NO se guarda por defecto
- ✅ **Autenticación**: Sesiones protegidas con tokens JWT
- ✅ **Rate Limiting**: Previene uso excesivo
- ✅ **GDPR Compatible**: Sin almacenamiento persistente de audio

## 🛠️ Solución de Problemas

### "No se puede acceder al micrófono"

**Solución:**
1. Verifica que hayas otorgado permisos de micrófono al navegador
2. En Chrome: Configuración > Privacidad > Configuración del sitio > Micrófono
3. Asegúrate de que ninguna otra app esté usando el micrófono

### "Error de conexión"

**Solución:**
1. Verifica tu conexión a internet
2. Intenta recargar la página
3. Si persiste, es posible que hayas alcanzado el límite mensual

### "Audio entrecortado o con lag"

**Solución:**
1. Verifica que tengas buena conexión a internet (mínimo 1 Mbps)
2. Cierra otras pestañas o apps que usen mucho ancho de banda
3. Prueba con audífonos para mejor calidad

### "El bot no me escucha"

**Solución:**
1. Verifica que el indicador muestre "Escuchando..." en verde
2. Habla más alto o acércate al micrófono
3. Comprueba el botón de mute (no debe estar activado)

## 💡 Consejos para Mejor Experiencia

### Audio

- Usa audífonos con micrófono para mejor calidad
- Habla en un ambiente silencioso
- Mantén una distancia de 15-30cm del micrófono

### Conversación

- Habla naturalmente, no necesitas ser formal
- Puedes interrumpir a Cleo si quieres
- Las pausas largas (>3 seg) indican fin de turno

### Costos

- Revisa tu uso en el dashboard antes de sesiones largas
- Las conversaciones concisas son más económicas
- Usa texto para consultas simples, voz para complejas

## 📊 Estadísticas de Uso

Puedes ver tus estadísticas en:
1. **Dashboard** > Configuración > Voice Usage
2. Durante la llamada (esquina superior)

Métricas disponibles:
- Total de minutos usados
- Costo acumulado
- Sesiones recientes
- Minutos restantes del mes

## 🔄 Próximas Mejoras (Fase 3)

- 🎭 **Voces personalizadas** con ElevenLabs
- 📝 **Transcripción mejorada** con puntuación
- 🌍 **Más idiomas** (actualmente solo español/inglés)
- 💾 **Grabación opcional** de conversaciones
- 🎚️ **Ajustes de voz**: velocidad, tono, estilo
- ⚡ **Deepgram integration** para menor costo

## 🆘 Soporte

Si encuentras problemas:

1. **Reportar bug**: Usa `/reportbug` en el chat
2. **Documentación**: [docs.cline.bot/voice-mode](https://docs.cline.bot)
3. **Comunidad**: Discord de Cleo

---

**¡Disfruta hablando con Cleo! 🎉**
