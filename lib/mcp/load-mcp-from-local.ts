// @ts-nocheck
// MCP experimental imports - may not be available in all AI SDK versions
// This file uses experimental features and should be skipped if imports fail

let createMCPClient: any
let StdioMCPTransport: any

try {
  const aiModule = require("ai")
  createMCPClient = aiModule.experimental_createMCPClient
  const mcpStdioModule = require("ai/mcp-stdio")
  StdioMCPTransport = mcpStdioModule.Experimental_StdioMCPTransport
} catch (e) {
  console.warn("[MCP] Experimental MCP features not available in this AI SDK version")
}

export async function loadMCPToolsFromLocal(
  command: string,
  env: Record<string, string> = {}
) {
  if (!createMCPClient || !StdioMCPTransport) {
    console.warn("[MCP] MCP client not available, returning empty tools")
    return { tools: {}, close: () => {} }
  }
  
  const mcpClient = await createMCPClient({
    transport: new StdioMCPTransport({
      command,
      args: ["stdio"],
      env,
    }),
  })

  const tools = await mcpClient.tools()
  return { tools, close: () => mcpClient.close() }
}

