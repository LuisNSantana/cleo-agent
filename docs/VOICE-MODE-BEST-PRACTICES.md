# Voice Mode - Best Practices & Troubleshooting

**Basado en:** OpenAI Realtime API Documentation + WebRTC Best Practices

## 🎯 Arquitectura Óptima

### Flujo de conexión (Unified Interface)

```
Browser → App Server → OpenAI Realtime API
   ↑                           ↓
   └──── WebRTC P2P ────────────┘
```

**Ventajas:**
- ✅ API key segura en el servidor (nunca expuesta al cliente)
- ✅ Más simple que ephemeral tokens
- ✅ Control del servidor sobre configuración de sesión

---

## 📋 Orden Correcto de Operaciones

```javascript
// 1. Crear peer connection CON STUN servers (CRÍTICO)
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
});

// 2. Configurar listeners ANTES de crear offer
pc.ontrack = (e) => { /* recibir audio */ };
pc.onicecandidate = (e) => { /* debug */ };
pc.oniceconnectionstatechange = () => { /* monitor ICE */ };

// 3. Agregar audio track
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
pc.addTrack(stream.getTracks()[0], stream);

// 4. Crear data channel ANTES de createOffer
const dc = pc.createDataChannel('oai-events', { ordered: true });

// 5. Configurar data channel listeners
dc.onopen = () => { /* ready to send events */ };
dc.onmessage = (e) => { /* handle server events */ };

// 6. Crear y enviar offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// 7. Enviar offer al backend, recibir answer
const sdpResponse = await fetch('/api/voice/webrtc/session', {
  method: 'POST',
  body: JSON.stringify({ sdp: offer.sdp }),
  headers: { 'Content-Type': 'application/json' }
});

// 8. Aplicar answer
const answer = { type: 'answer', sdp: await sdpResponse.text() };
await pc.setRemoteDescription(answer);

// 9. AHORA el data channel debería abrirse automáticamente
```

---

## 🔧 Configuraciones Críticas

### 1. STUN + TURN Servers (OBLIGATORIO)

**Sin STUN/TURN servers:**
- ❌ ICE connection puede fallar
- ❌ Data channel nunca se abre
- ❌ Solo funciona en localhost

**Con STUN servers (básico):**
- ✅ Funciona detrás de NAT simple
- ⚠️ Puede fallar en NAT simétrico
- ⚠️ Puede fallar en redes corporativas

**Con STUN + TURN servers (producción):**
- ✅ Funciona detrás de cualquier NAT
- ✅ Funciona en redes corporativas restrictivas
- ✅ Máxima compatibilidad

```javascript
const pc = new RTCPeerConnection({
  iceServers: [
    // STUN servers (para NAT traversal)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    
    // TURN servers (fallback cuando STUN no es suficiente)
    { 
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  // Optimizaciones para audio en tiempo real
  iceTransportPolicy: 'all', // Intenta todos los tipos (relay, srflx, host)
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
});
```

**TURN Servers para Producción:**

Para mayor confiabilidad, considera usar tu propio TURN server:

1. **Twilio TURN (Recomendado)**: Incluido en plan gratuito
2. **Metered.ca**: 50GB gratis/mes
3. **CoTURN (Self-hosted)**: Gratis pero requiere servidor

**Configuración de CoTURN:**
```bash
# Instalar en servidor
sudo apt-get install coturn

# Configurar /etc/turnserver.conf
listening-port=3478
realm=yourdomain.com
external-ip=YOUR_SERVER_IP

# Iniciar
sudo systemctl start coturn
```

### 2. Audio Constraints

```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,      // Reduce eco
    noiseSuppression: true,       // Reduce ruido ambiente
    autoGainControl: true,        // Normaliza volumen
    channelCount: 1,              // Mono (suficiente para voz)
    sampleRate: { ideal: 48000 }  // OpenAI recomienda 24kHz o 48kHz
  }
});
```

### 3. Session Update Event

Enviar configuración DESPUÉS de que data channel se abra:

```javascript
dc.onopen = () => {
  // Enviar configuración de VAD
  dc.send(JSON.stringify({
    type: 'session.update',
    session: {
      turn_detection: {
        type: 'server_vad',
        silence_duration_ms: 500  // 500-700ms es óptimo
      },
      instructions: '...',  // Instrucciones del sistema
    }
  }));
};
```

---

## 🐛 Troubleshooting

### Data Channel no se abre

**Síntomas:**
```
✅ Microphone access granted
✅ WebRTC connection established
❌ Data channel timeout
```

**Causas y soluciones:**

| Causa | Síntoma | Solución |
|-------|---------|----------|
| **Falta STUN servers** | ICE state stuck en `checking` | Agregar `iceServers` al RTCPeerConnection |
| **Firewall bloquea UDP** | ICE connection failed | Usar TURN server con TCP |
| **NAT simétrico** | No ICE candidates | Configurar TURN server |
| **SDP sin data channel** | `m=application` missing | Verificar backend forwarding |
| **Data channel creado después de offer** | Never opens | Crear ANTES de `createOffer()` |

### ICE Connection Failed

**Logs a revisar:**
```javascript
pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('ICE candidate type:', event.candidate.type);
    // Tipos: 'host', 'srflx', 'relay'
  }
};
```

**Qué buscar:**
- ✅ **host** candidate → Local network OK
- ✅ **srflx** candidate → STUN working, NAT traversal OK
- ⚠️ **relay** candidate → Usando TURN (más latencia pero funciona)
- ❌ **Solo host** → STUN/TURN no accesible, firewall bloqueando

### Micrófono no detecta audio

**Causas comunes:**
1. AudioContext suspended → `await audioContext.resume()`
2. Micrófono Bluetooth tardando en activarse → Agregar delay de 300ms
3. Track disabled → Verificar `audioTrack.enabled === true`
4. Permisos denegados → Mostrar error claro al usuario

---

## 📊 Logs de Debugging

### Logs esenciales a implementar:

```javascript
// 1. Audio access
console.log('🎤 Microphone access:', { granted, tracks, label });

// 2. Peer connection
console.log('🔗 Peer connection:', { connectionState, iceConnectionState });

// 3. ICE candidates
console.log('🧊 ICE candidate:', { type, protocol, address });

// 4. Data channel
console.log('📡 Data channel:', { readyState });

// 5. SDP verification
console.log('📥 SDP answer includes data channel:', answerSdp.includes('m=application'));
```

### Estados normales:

```
🎤 Requesting microphone access...
✅ Microphone access granted
🔗 Peer connection created with STUN servers
🧊 ICE gathering state: gathering
🧊 ICE candidate: {type: "host", ...}
🧊 ICE candidate: {type: "srflx", ...}
🧊 ICE gathering complete
📤 Sending SDP offer to backend...
📥 SDP answer includes data channel: true
🧊 ICE connection state: checking
🧊 ICE connection state: connected ← CRÍTICO
✅ ICE connection established
📡 Data channel state: connecting
✅ Data channel opened ← CRÍTICO
🎤 User can now speak
```

---

## 🚀 Optimizaciones de Producción

### 1. Timeout Strategy

```javascript
// Timeout para data channel: 5 segundos
setTimeout(() => {
  if (dc.readyState !== 'open') {
    // Si ICE connected pero data channel no abre → error crítico
    if (pc.iceConnectionState === 'connected') {
      throw new Error('Data channel failed to open despite ICE connection');
    }
    // Si ICE no connected → esperar más o usar fallback
  }
}, 5000);
```

### 2. Reconnection Logic

```javascript
pc.oniceconnectionstatechange = () => {
  if (pc.iceConnectionState === 'disconnected') {
    // Intentar reconectar
    pc.restartIce();
  }
  if (pc.iceConnectionState === 'failed') {
    // Recrear sesión completa
    cleanup();
    startSession();
  }
};
```

### 3. Gestión de Recursos

```javascript
const cleanup = () => {
  // Orden correcto de limpieza
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (dataChannel) dataChannel.close();
  if (peerConnection) peerConnection.close();
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  if (audioElement) audioElement.srcObject = null;
};
```

---

## 📚 Referencias

- [OpenAI Realtime API - WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc)
- [OpenAI Realtime API - Conversations](https://platform.openai.com/docs/guides/realtime-conversations)
- [MDN WebRTC Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [WebRTC Troubleshooting](https://blog.addpipe.com/troubleshooting-webrtc-connection-issues/)

---

## ✅ Checklist de Implementación

- [x] RTCPeerConnection con STUN servers
- [x] Data channel creado ANTES de createOffer
- [x] Listeners configurados ANTES de operaciones async
- [x] Monitoring de ICE states
- [x] Monitoring de data channel states
- [x] AudioContext resume si suspended
- [x] Delay para micrófonos Bluetooth
- [x] Error handling específico para cada tipo de fallo
- [x] Cleanup correcto de recursos
- [x] Logs exhaustivos para debugging
