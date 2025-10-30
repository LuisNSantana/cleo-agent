# LangGraph Human-in-the-Loop (HITL) Implementation Guide

## Overview

This implementation adds **human-in-the-loop approval** for sensitive tool executions using **LangGraph's official interrupt() pattern**. Based on the reference implementation from [agent-chat-ui](https://github.com/langchain-ai/agent-chat-ui).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Zustand)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ Chat UI      │───▶│ useToolApp   │───▶│ ToolApprovalPanel│  │
│  │ Timeline     │    │ rovals Hook  │    │                  │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│          │                   │                       │           │
│          │                   ▼                       │           │
│          │         ┌─────────────────┐              │           │
│          │         │ ClientAgentStore│◀─────────────┘           │
│          │         │  (Zustand)      │                          │
│          │         └─────────────────┘                          │
│          │                   │                                   │
└──────────┼───────────────────┼───────────────────────────────────┘
           │                   │
           │ SSE Stream        │ POST /api/chat/resume
           │                   │
┌──────────▼───────────────────▼───────────────────────────────────┐
│                      Backend (Next.js API)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ /api/chat    │───▶│ Orchestrator │───▶│ ExecutionManager │  │
│  │ (SSE)        │    │ Adapter      │    │                  │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│                                                    │              │
│                                                    ▼              │
│                                          ┌──────────────────┐    │
│                                          │  LangGraph       │    │
│                                          │  - MemorySaver   │    │
│                                          │  - stream()      │    │
│                                          │  - interrupt()   │    │
│                                          └──────────────────┘    │
│                                                    │              │
│  ┌───────────────┐    ┌──────────────┐           │              │
│  │ /api/chat/    │◀───│ Interrupt    │◀──────────┘              │
│  │ resume        │    │ Manager      │                          │
│  └───────────────┘    └──────────────┘                          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Implementation Components

### 1. Core Types (`lib/agents/types/interrupt.ts`)

Defines TypeScript interfaces based on LangGraph's official schema:

- `HumanInterrupt`: Interrupt payload from graph
- `InterruptConfig`: Allowed actions (accept/edit/respond/ignore)
- `ActionRequest`: Tool call details
- `HumanResponse`: User's decision
- `InterruptState`: Client-side state management

### 2. Interrupt Manager (`lib/agents/core/interrupt-manager.ts`)

Server-side service managing interrupt lifecycle:

```typescript
// Store interrupt for user approval
InterruptManager.storeInterrupt(executionId, threadId, interrupt)

// Wait for user response (with timeout)
const response = await InterruptManager.waitForResponse(executionId)

// Clear after resume
InterruptManager.clearInterrupt(executionId)
```

### 3. Execution Manager Updates (`lib/agents/core/execution-manager.ts`)

Changed from `invoke()` to `stream()` to detect interrupts:

```typescript
// Stream events from graph
const stream = await compiledGraph.stream(initialState, {
  ...threadConfig,
  streamMode: 'values'
})

for await (const event of stream) {
  // Detect __interrupt__ event
  if (event && '__interrupt__' in event) {
    const interrupt = event.__interrupt__
    
    // Store and wait for user response
    await InterruptManager.storeInterrupt(...)
    const response = await InterruptManager.waitForResponse(...)
    
    // Resume with Command(resume=...)
    const resumeStream = await compiledGraph.stream(null, {
      ...threadConfig,
      input: { command: { resume: [response] } }
    })
  }
}
```

### 4. Resume API Endpoint (`app/api/chat/resume/route.ts`)

Handles approval responses from UI:

```typescript
POST /api/chat/resume
{
  "executionId": "exec_123",
  "response": {
    "type": "accept" | "edit" | "response" | "ignore",
    "args": ... // varies by type
  }
}
```

Updates `InterruptManager` state, allowing execution to continue.

### 5. UI Components

#### `ToolApprovalPanel` (`components/chat/tool-approval-panel.tsx`)

Displays approval request with:
- Tool name and arguments
- Action buttons (Accept/Edit/Respond/Ignore)
- Argument editing for "edit" mode
- Response textarea for "response" mode

#### `useToolApprovals` Hook (`hooks/use-tool-approvals.ts`)

React hook integrating interrupts with UI:

```typescript
const {
  pendingInterrupt,
  hasPendingApproval,
  handleApprovalResponse
} = useToolApprovals({ executionId })
```

Listens for `execution.interrupted` events and updates Zustand store.

### 6. Zustand Store Updates (`lib/agents/client-store.ts`)

Added interrupt state management:

```typescript
interface ClientAgentStore {
  activeInterrupts: Record<string, InterruptState>
  pendingApprovals: string[]
  
  addInterrupt: (executionId, interrupt) => void
  removeInterrupt: (executionId) => void
  submitApprovalResponse: (executionId, response) => Promise<void>
  getPendingInterrupt: (executionId) => InterruptState | undefined
}
```

## Usage Example

### 1. Configure Tool for Approval

In `lib/tools/tool-config.ts`:

```typescript
export const TOOL_APPROVAL_CONFIG = {
  sendGmailMessage: {
    requiresApproval: true,
    config: {
      allow_accept: true,
      allow_edit: true,
      allow_respond: true,
      allow_ignore: true
    },
    description: 'This will send an email. Please review before sending.'
  }
}
```

### 2. Approval Wrapper Applied

`lib/agents/core/graph-builder.ts` automatically wraps approved tools with `interrupt()`:

```typescript
async function wrapToolWithApproval(tool, config) {
  const result = await tool.invoke(args)
  
  // Pause execution for user approval
  const approval = interrupt({
    action_request: {
      action: tool.name,
      args
    },
    config,
    description: config.description
  })
  
  if (approval.type === 'accept') {
    return result
  } else if (approval.type === 'edit') {
    // Re-execute with edited args
    return await tool.invoke(approval.args.args)
  } else if (approval.type === 'ignore') {
    return 'Action cancelled by user'
  }
}
```

### 3. UI Integration

In chat component:

```typescript
import { useToolApprovals } from '@/hooks/use-tool-approvals'
import { ToolApprovalPanel } from '@/components/chat/tool-approval-panel'

function ChatTimeline({ executionId }) {
  const {
    pendingInterrupt,
    handleApprovalResponse
  } = useToolApprovals({ executionId })
  
  return (
    <div>
      {pendingInterrupt && (
        <ToolApprovalPanel
          executionId={executionId}
          threadId={pendingInterrupt.threadId}
          interrupt={pendingInterrupt.interrupt}
          onResponse={(response) => 
            handleApprovalResponse(executionId, response)
          }
        />
      )}
    </div>
  )
}
```

## Flow Diagram

```
User sends message
      │
      ▼
Agent executes with LangGraph
      │
      ▼
Wrapped tool encounters interrupt()
      │
      ▼
Graph pauses, emits __interrupt__ event
      │
      ▼
ExecutionManager detects interrupt
      │
      ▼
InterruptManager.storeInterrupt()
      │
      ▼
EventEmitter sends to frontend
      │
      ▼
useToolApprovals hook receives event
      │
      ▼
Zustand store updated
      │
      ▼
ToolApprovalPanel renders
      │
      ▼
User reviews and chooses action
      │
      ▼
POST /api/chat/resume with response
      │
      ▼
InterruptManager.updateInterruptResponse()
      │
      ▼
ExecutionManager polling detects response
      │
      ▼
Graph resumes with Command(resume=[response])
      │
      ▼
Execution continues/completes
```

## Configuration Options

### Interrupt Config

```typescript
interface InterruptConfig {
  allow_accept: boolean   // "Accept as-is" button
  allow_edit: boolean     // Edit arguments before execution
  allow_respond: boolean  // Provide custom response
  allow_ignore: boolean   // Cancel execution
}
```

### Response Types

- **accept**: Execute tool with original arguments
- **edit**: Execute tool with modified arguments
- **response**: Skip tool, return user's text response
- **ignore**: Cancel tool execution entirely

## Testing

1. **Local Development**:
```bash
pnpm dev
```

2. **Test Email Approval**:
```
User: "Send an email to test@example.com saying hello"
Expected: Approval panel shows before sending
```

3. **Check Interrupt State**:
```bash
GET /api/chat/resume?executionId=exec_123
```

## Troubleshooting

### Interrupt Not Triggering

1. Check tool is in `TOOL_APPROVAL_CONFIG`
2. Verify `requiresApproval: true`
3. Ensure `MemorySaver` checkpointer is used
4. Confirm `stream()` (not `invoke()`) is being called

### Execution Hangs

1. Check `InterruptManager.waitForResponse()` timeout (default 5min)
2. Verify frontend event listener is registered
3. Inspect browser console for event dispatch
4. Check `/api/chat/resume` endpoint logs

### Response Not Resuming

1. Verify executionId matches
2. Check thread_id consistency
3. Ensure `Command(resume=...)` format is correct
4. Inspect LangGraph stream for resume acknowledgment

## References

- [LangGraph Human-in-the-Loop Guide](https://langchain-ai.github.io/langgraph/how-tos/human-in-the-loop/)
- [Official Agent Chat UI](https://github.com/langchain-ai/agent-chat-ui)
- [interrupt() Documentation](https://langchain-ai.github.io/langgraph/reference/interrupts/)
- [MemorySaver Checkpointer](https://langchain-ai.github.io/langgraph/reference/checkpoints/#memorysaver)

## Next Steps

1. Add persistence for interrupts (Supabase)
2. Implement timeout handling UI
3. Add multi-approval batching
4. Create approval history/audit log
5. Add confirmation chips to timeline
