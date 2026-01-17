// @ts-nocheck
// MCP experimental imports - may not be available in all AI SDK versions
// This file uses experimental features and should be skipped if imports fail

let createMCPClient: any

try {
  const aiModule = require("ai")
  createMCPClient = aiModule.experimental_createMCPClient
} catch (e) {
  console.warn("[MCP] Experimental MCP features not available in this AI SDK version")
}

export async function loadMCPToolsFromURL(url: string) {
  if (!createMCPClient) {
    console.warn("[MCP] MCP client not available, returning empty tools")
    return { tools: {}, close: () => {} }
  }
  
  const mcpClient = await createMCPClient({
    transport: {
      type: "sse",
      url,
    },
  })

  const tools = await mcpClient.tools()
  return { tools, close: () => mcpClient.close() }
}

