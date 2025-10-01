# Task Timeout Flow Diagram

## Before Fix (❌ Failing)

```
┌─────────────────────────────────────────────────────────────┐
│ Scheduled Task System                                       │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │ Task Executor                                │           │
│  │ Timeout: 240s (4 min)                        │           │
│  │                                              │           │
│  │  ┌────────────────────────────────────┐     │           │
│  │  │ Cleo Supervisor Agent              │     │           │
│  │  │ • Analyzes task (30s)              │     │           │
│  │  │ • Decides to delegate              │     │           │
│  │  │                                    │     │           │
│  │  │  ┌──────────────────────────┐     │     │           │
│  │  │  │ delegate_to_astra        │     │     │           │
│  │  │  │ Timeout: 300s (5 min)    │     │     │           │
│  │  │  │                          │     │     │           │
│  │  │  │  ┌────────────────┐     │     │     │           │
│  │  │  │  │ Astra Agent    │     │     │     │           │
│  │  │  │  │ Timeout: 180s  │     │     │     │           │
│  │  │  │  │                │     │     │     │           │
│  │  │  │  │  ┌──────────┐  │     │     │     │           │
│  │  │  │  │  │ Exec Mgr │  │     │     │     │           │
│  │  │  │  │  │ 120s ❌  │  │     │     │     │           │
│  │  │  │  │  │ TIMEOUT! │  │     │     │     │           │
│  │  │  │  │  └──────────┘  │     │     │     │           │
│  │  │  │  │                │     │     │     │           │
│  │  │  │  └────────────────┘     │     │     │           │
│  │  │  │                          │     │     │           │
│  │  │  └──────────────────────────┘     │     │           │
│  │  │                                    │     │           │
│  │  └────────────────────────────────────┘     │           │
│  │                                              │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  Result: Task timeout after 240s ❌                         │
│  Astra never completed (timed out at 120s)                  │
└─────────────────────────────────────────────────────────────┘

Timeline:
0s    ──────────────────────────────────────────────────────> 240s
      │         │                    │                    │
      Start     Delegate (30s)       Astra timeout (150s) Task timeout
                                     ❌ 120s exec timeout
```

## After Fix (✅ Working)

```
┌─────────────────────────────────────────────────────────────┐
│ Scheduled Task System                                       │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │ Task Executor                                │           │
│  │ Timeout: 480s (8 min) ✅                     │           │
│  │                                              │           │
│  │  ┌────────────────────────────────────┐     │           │
│  │  │ Cleo Supervisor Agent              │     │           │
│  │  │ • Analyzes task (30s)              │     │           │
│  │  │ • Decides to delegate              │     │           │
│  │  │                                    │     │           │
│  │  │  ┌──────────────────────────┐     │     │           │
│  │  │  │ delegate_to_astra        │     │     │           │
│  │  │  │ Timeout: 360s (6 min) ✅ │     │     │           │
│  │  │  │                          │     │     │           │
│  │  │  │  ┌────────────────┐     │     │     │           │
│  │  │  │  │ Astra Agent    │     │     │     │           │
│  │  │  │  │ Timeout: 240s ✅│     │     │     │           │
│  │  │  │  │                │     │     │     │           │
│  │  │  │  │  ┌──────────┐  │     │     │     │           │
│  │  │  │  │  │ Exec Mgr │  │     │     │     │           │
│  │  │  │  │  │ 240s ✅  │  │     │     │     │           │
│  │  │  │  │  │ SUCCESS  │  │     │     │     │           │
│  │  │  │  │  └──────────┘  │     │     │     │           │
│  │  │  │  │                │     │     │     │           │
│  │  │  │  └────────────────┘     │     │     │           │
│  │  │  │                          │     │     │           │
│  │  │  └──────────────────────────┘     │     │           │
│  │  │                                    │     │           │
│  │  └────────────────────────────────────┘     │           │
│  │                                              │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  Result: Task completed in ~220s ✅                         │
│  All agents completed successfully                          │
└─────────────────────────────────────────────────────────────┘

Timeline:
0s    ──────────────────────────────────────────────────────> 480s
      │         │              │                    │
      Start     Delegate (30s) Astra done (210s)   Task done (220s)
                               ✅ Completed         ✅ Success
```

## Timeout Hierarchy

```
Level 1: Task Executor (480s)
         └─ Enough time for multiple delegations
            │
            ├─ Level 2: Delegation Tool (360s)
            │           └─ Polls for sub-agent completion
            │              │
            │              └─ Level 3: Sub-Agent (240s)
            │                          └─ Executes actual work
            │                             │
            │                             └─ Level 4: Execution Manager (240s)
            │                                         └─ Graph execution with tools
            │
            └─ Safety margin at each level (20%+)
```

## Real-World Example: "Research and Email" Task

### Task Flow
```
User Request: "Investiga ofertas empleo sector comercio y envía correo a X"

┌─────────────────────────────────────────────────────────────┐
│ Step 1: Task Executor starts (480s budget)                  │
│   ↓                                                          │
│ Step 2: Cleo receives task (30s)                            │
│   • Analyzes: Need research + email                         │
│   • Decision: Use webSearch + delegate_to_astra             │
│   ↓                                                          │
│ Step 3: Cleo performs web search (60s)                      │
│   • Query: "ofertas empleo comercio exterior 2025"          │
│   • Extracts: 3-5 job offers with details                   │
│   ↓                                                          │
│ Step 4: Cleo delegates to Astra (360s budget)               │
│   • Task: "Send email with job offers"                      │
│   • Context: Research findings                              │
│   • Recipient: moisescorpamag2020@gmail.com                 │
│   ↓                                                          │
│ Step 5: Astra executes (240s budget)                        │
│   • Composes professional email (90s)                       │
│   • Formats job offers in email (30s)                       │
│   • Sends via Gmail API (30s)                               │
│   • Returns confirmation (10s)                              │
│   ↓                                                          │
│ Step 6: Cleo receives result (220s elapsed)                 │
│   • Calls complete_task with summary                        │
│   ↓                                                          │
│ Step 7: Task Executor completes (220s total) ✅             │
│   • Creates success notification                            │
│   • Updates task status in database                         │
└─────────────────────────────────────────────────────────────┘

Total Time: ~220s (well under 480s limit)
Remaining Budget: 260s (54% margin)
```

## Timeout Budget Breakdown

| Phase | Time Used | Cumulative | Budget Remaining |
|-------|-----------|------------|------------------|
| Task Start | 0s | 0s | 480s |
| Cleo Analysis | 30s | 30s | 450s |
| Web Search | 60s | 90s | 390s |
| Delegation Setup | 10s | 100s | 380s |
| Astra Email Composition | 90s | 190s | 290s |
| Email Formatting | 30s | 220s | 260s |
| Email Sending | 30s | 250s | 230s |
| Result Processing | 20s | 270s | 210s |
| **Task Complete** | **270s** | **270s** | **210s** ✅ |

## Error Scenarios

### Scenario 1: Slow LLM Response
```
Normal: 90s for email composition
Slow: 150s for email composition
Budget: 240s (Astra) → Still completes ✅
```

### Scenario 2: Multiple Retries
```
First attempt: 120s (fails)
Retry: 120s (succeeds)
Total: 240s
Budget: 360s (Delegation) → Completes ✅
```

### Scenario 3: Complex Research
```
Research: 180s (multiple searches)
Email: 120s
Total: 300s
Budget: 480s (Cleo) → Completes ✅
```

## Monitoring Queries

### Check for timeout issues
```sql
SELECT 
  task_id,
  title,
  agent_id,
  status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as duration_seconds
FROM agent_tasks
WHERE status = 'failed'
  AND error_message LIKE '%timeout%'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Check delegation success rate
```sql
SELECT 
  agent_id,
  COUNT(*) as total_tasks,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
FROM agent_tasks
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_id
ORDER BY total_tasks DESC;
```

## Key Takeaways

1. **Timeout Hierarchy**: Each parent must have more time than children
2. **Safety Margins**: 20%+ buffer between levels
3. **Context Awareness**: Scheduled tasks get more time than chat
4. **Proper Integration**: Use ExecutionManager for timeout handling
5. **Monitoring**: Track timeout patterns for optimization
