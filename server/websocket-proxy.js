#!/usr/bin/env node

/**
 * WebSocket Proxy Server for OpenAI Realtime API
 * 
 * This proxy allows browser clients to connect to OpenAI Realtime API
 * by adding the required Authorization header that browsers cannot set.
 */

const WebSocket = require('ws')
const http = require('http')

const PORT = process.env.WS_PROXY_PORT || 8080
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
  const model = url.searchParams.get('model') || 'gpt-4o-realtime-preview-2024-10-01'
  
  // Connect to OpenAI Realtime API
  const openaiUrl = `wss://api.openai.com/v1/realtime?model=${model}`
  const openaiWs = new WebSocket(openaiUrl, {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  })
  
  // Forward messages from client to OpenAI
  clientWs.on('message', (data) => {
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(data)
    }
  })
  
  // Forward messages from OpenAI to client
  openaiWs.on('message', (data) => {
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
