#!/usr/bin/env node

/**
 * WebSocket Proxy Server for OpenAI Realtime API (v1.0.1)
 * 
 * This proxy allows browser clients to connect to OpenAI Realtime API
 * by adding the required Authorization header that browsers cannot set.
 * 
 * Features:
 * - Automatic retry on connection failures
 * - Detailed logging for debugging
 * - Support for Railway PORT environment variable
 */

const WebSocket = require('ws')
const http = require('http')
const fs = require('fs')
const path = require('path')

function loadEnvFiles() {
  const cwd = process.cwd()
  const envFiles = ['.env.local', '.env']

  for (const file of envFiles) {
    const filePath = path.join(cwd, file)
    if (!fs.existsSync(filePath)) {
      continue
    }

    const contents = fs.readFileSync(filePath, 'utf8')
    parseEnv(contents)
  }
}

function parseEnv(contents) {
  const lines = contents.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) {
      continue
    }

    const key = line.slice(0, eqIndex).trim()
    if (!key || process.env[key] !== undefined) {
      continue
    }

    let value = line.slice(eqIndex + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    } else if (value.startsWith('\'') && value.endsWith('\'')) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

loadEnvFiles()

const PORT = process.env.PORT || process.env.WS_PROXY_PORT || 8080
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is required')
  process.exit(1)
}

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('WebSocket Proxy Server Running\n')
})

// Create WebSocket server
const wss = new WebSocket.Server({ server })

// Track active connections for monitoring
let activeConnections = 0
const MAX_CONNECTIONS = 100 // Prevent resource exhaustion

// Heartbeat interval for detecting dead connections
const HEARTBEAT_INTERVAL = 30000 // 30 seconds
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.warn('⚠️ Client not responding to ping, terminating connection')
      return ws.terminate()
    }
    ws.isAlive = false
    ws.ping()
  })
}, HEARTBEAT_INTERVAL)

wss.on('connection', (clientWs, req) => {
  // Rate limiting: reject if too many connections
  if (activeConnections >= MAX_CONNECTIONS) {
    console.warn(`⚠️ Connection limit reached (${MAX_CONNECTIONS}), rejecting new connection`)
    clientWs.close(1008, 'Server at capacity, please try again later')
    return
  }

  activeConnections++
  console.log(`Client connected (active: ${activeConnections}/${MAX_CONNECTIONS})`)
  
  // Heartbeat tracking
  clientWs.isAlive = true
  clientWs.on('pong', () => {
    clientWs.isAlive = true
  })

  // Extract model from query params
  const url = new URL(req.url, `http://${req.headers.host}`)
  const model = url.searchParams.get('model') || 'gpt-4o-mini-realtime-preview-2024-12-17'
  
  // Connect to OpenAI with retry logic
  connectToOpenAI(clientWs, model, 0)
})

/**
 * Connect to OpenAI with exponential backoff retry logic
 */
function connectToOpenAI(clientWs, model, retryCount) {
  const MAX_RETRIES = 5
  const baseDelay = 1000 // 1 second
  const maxDelay = 30000 // 30 seconds
  const backoffMs = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)

  const openaiUrl = `wss://api.openai.com/v1/realtime?model=${model}`
  const openaiWs = new WebSocket(openaiUrl, {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    }
  })
  
  // Forward messages from client to OpenAI
  clientWs.on('message', (data) => {
    if (openaiWs.readyState === WebSocket.OPEN) {
      // Log session.update payloads for debugging
      try {
        const message = JSON.parse(data.toString())
        if (message.type === 'session.update') {
          console.log('📡 Forwarding session.update to OpenAI:', JSON.stringify(message, null, 2))
        }
      } catch (e) {
        // Not JSON or error parsing, skip logging
      }
      openaiWs.send(data)
    }
  })
  
  // Forward messages from OpenAI to client
  openaiWs.on('message', (data) => {
    try {
      const text = typeof data === 'string' ? data : data.toString()
      const msg = JSON.parse(text)
      if (msg?.type === 'error') {
        console.error('🚨 OpenAI ERROR message received via WS:', JSON.stringify(msg, null, 2))
        if (msg?.error) {
          console.error('🔎 OpenAI error.details:', msg.error)
        }
      }
    } catch (_) {
      // ignore non-JSON or parse failures
    }
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data)
    }
  })
  
  // Handle errors with retry logic
  clientWs.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error.message)
    activeConnections--
    openaiWs.close()
  })
  
  openaiWs.on('error', (error) => {
    console.error(`❌ OpenAI WebSocket error (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message)
    
    // Retry with exponential backoff
    if (retryCount < MAX_RETRIES && clientWs.readyState === WebSocket.OPEN) {
      console.log(`🔄 Retrying OpenAI connection in ${backoffMs}ms...`)
      setTimeout(() => {
        connectToOpenAI(clientWs, model, retryCount + 1)
      }, backoffMs)
    } else {
      console.error('❌ Max retries reached or client disconnected, closing connection')
      activeConnections--
      clientWs.close(1011, 'OpenAI connection failed after retries')
    }
  })
  
  openaiWs.on('open', () => {
    console.log(`✅ OpenAI connection opened successfully (attempt ${retryCount + 1})`)
  })
  
  openaiWs.on('unexpected-response', (req, res) => {
    console.error('❌ OpenAI unexpected response:', res.statusCode, res.statusMessage)
    let body = ''
    res.on('data', chunk => body += chunk)
    res.on('end', () => {
      console.error('Response body:', body)
    })
  })
  
  // Handle closures
  clientWs.on('close', () => {
    console.log(`Client disconnected (active: ${activeConnections - 1}/${MAX_CONNECTIONS})`)
    activeConnections--
    openaiWs.close()
  })
  
  openaiWs.on('close', () => {
    console.log('OpenAI connection closed')
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close()
    }
  })
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, closing connections gracefully...')
  clearInterval(heartbeatInterval)
  
  wss.clients.forEach(client => {
    client.close(1000, 'Server shutting down')
  })
  
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, closing connections gracefully...')
  clearInterval(heartbeatInterval)
  
  wss.clients.forEach(client => {
    client.close(1000, 'Server shutting down')
  })
  
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

server.listen(PORT, () => {
  console.log(`WebSocket Proxy Server listening on port ${PORT}`)
  console.log(`Clients should connect to: ws://localhost:${PORT}`)
})
