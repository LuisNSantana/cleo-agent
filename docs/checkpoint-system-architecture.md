# Checkpoint System Architecture

## Overview

LangGraph checkpoints are **system data** used for state persistence, replay, and debugging. They are not user-facing data and should not be subject to Row Level Security (RLS).

## Architecture Decision

### Admin Client Pattern ✅

**Implementation**: `lib/agents/core/graph-builder.ts`
```typescript
const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
const adminClient = getSupabaseAdmin()
this.checkpointSaver = new SupabaseCheckpointSaver(adminClient)
```

**Rationale**:
- Checkpoints are internal LangGraph execution state
- Not modified or accessed directly by users
- Using admin client (service role) bypasses RLS automatically
- Simpler and more maintainable than managing RLS policies

### User Attribution

Even with admin client, we maintain proper auditing:

**Implementation**: `lib/agents/core/checkpoint-manager.ts`
```typescript
private async deriveUserIdFromThread(threadId: string): Promise<string | null> {
  // 1. Try agent_threads table lookup
  const { data } = await this.supabase
    .from('agent_threads')
    .select('user_id')
    .eq('id', threadId)
    .single();
  
  // 2. Fallback to AsyncLocalStorage context
  const contextUserId = getCurrentUserId();
  
  // 3. Allow null for system-initiated operations
  return data?.user_id || contextUserId || null;
}
```

This ensures:
- ✅ Checkpoints always have `user_id` when possible (for analytics/debugging)
- ✅ No dependency on fragile AsyncLocalStorage in LangGraph callbacks
- ✅ System operations (cleanup, migrations) can proceed with `null` user_id

## Historical Context

### Problem (Production Error 42501)

```
❌ Failed to save checkpoint: {
  code: '42501',
  message: 'new row violates row-level security policy for table "checkpoints"'
}
```

**Root Cause**:
1. Original implementation used authenticated client (`createClient()` from `lib/supabase/server.ts`)
2. RLS policies required `user_id = auth.uid()`
3. AsyncLocalStorage context was lost in LangGraph async operations
4. Checkpoint saves with `user_id: null` violated RLS policy

### Why AsyncLocalStorage Failed

LangGraph executes in complex async contexts:
- Multiple graph nodes with async transitions
- Event emitters executing in different stacks
- Timeout handlers and Promise.race() operations
- Checkpoint saves triggered from deep callback chains

AsyncLocalStorage is not preserved across these boundaries, causing `getCurrentUserId()` to return `undefined`.

## Alternative Approaches (Not Chosen)

### ❌ Option 1: Service Role RLS Policy

```sql
CREATE POLICY "Service role bypass" ON checkpoints
  FOR ALL TO service_role USING (true);
```

**Why not chosen**:
- Still requires managing RLS policies
- Mixes authenticated + service_role access patterns (confusing)
- Doesn't solve the AsyncLocalStorage fragility issue
- Admin client achieves the same result more cleanly

### ❌ Option 3: Permissive RLS Policy

```sql
CREATE POLICY "Allow null user_id" ON checkpoints
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
```

**Why not chosen**:
- Security concern: allows `null` user_id from any authenticated user
- Doesn't reflect the reality that checkpoints are system data
- Still subject to RLS overhead for no security benefit

## Data Classification

| Data Type | Access Pattern | RLS Required? | Client Type |
|-----------|----------------|---------------|-------------|
| User messages | User-specific | ✅ Yes | Authenticated |
| User documents | User-specific | ✅ Yes | Authenticated |
| Agent threads | User-specific | ✅ Yes | Authenticated |
| **Checkpoints** | System internal | ❌ No | **Admin** |
| Analytics logs | System internal | ❌ No | Admin |
| Migrations | System internal | ❌ No | Admin |

## Testing

Verify checkpoint saves succeed:

```typescript
// In production logs, should see:
✅ Checkpoint saver initialized with admin client (RLS bypassed)
💾 Checkpoint saved { threadId, checkpointId, nodeId, step }

// Should NOT see:
❌ Failed to save checkpoint: { code: '42501' } // RLS violation
⚠️ No userId in request context // AsyncLocalStorage warning
```

## Migration Notes

Migration `20251107_fix_checkpoints_rls.sql` is **optional**. The code changes alone resolve the issue.

The migration adds a service_role policy as defense-in-depth, but since the code now uses admin client, RLS is bypassed automatically.

## Future Considerations

If adding new system tables (e.g., `execution_logs`, `performance_metrics`):

1. ✅ Use admin client for writes
2. ✅ Derive user_id from thread/execution context for auditing
3. ✅ Allow null user_id for system operations
4. ❌ Don't rely on AsyncLocalStorage for critical system operations
5. ❌ Don't use RLS for internal system data

---

**Last Updated**: November 7, 2025
**Related Files**:
- `lib/agents/core/graph-builder.ts` (admin client initialization)
- `lib/agents/core/checkpoint-manager.ts` (user_id derivation)
- `migrations/20251107_fix_checkpoints_rls.sql` (optional defense-in-depth)
