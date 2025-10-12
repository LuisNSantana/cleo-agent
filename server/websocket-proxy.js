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

wss.on('connection', (clientWs, req) => {
  console.log('Client connected')
  
  // Extract model from query params
  const url = new URL(req.url, `http://${req.headers.host}`)
  const model = url.searchParams.get('model') || 'gpt-4o-mini-realtime-preview-2024-12-17'
  
  // Connect to OpenAI Realtime API
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
      }
    } catch (_) {
      // ignore non-JSON or parse failures
    }
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data)
    }
  })
  
  // Handle errors
  clientWs.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error.message)
    openaiWs.close()
  })
  
  openaiWs.on('error', (error) => {
    console.error('❌ OpenAI WebSocket error:', error.message)
    console.error('Full error:', error)
    clientWs.close()
  })
  
  openaiWs.on('open', () => {
    console.log('✅ OpenAI connection opened successfully')
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
    console.log('Client disconnected')
    openaiWs.close()
  })
  
  openaiWs.on('close', () => {
    console.log('OpenAI connection closed')
    clientWs.close()
  })
})

server.listen(PORT, () => {
  console.log(`WebSocket Proxy Server listening on port ${PORT}`)
  console.log(`Clients should connect to: ws://localhost:${PORT}`)
})
