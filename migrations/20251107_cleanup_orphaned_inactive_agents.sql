-- Migration: Cleanup orphaned inactive agents
-- Date: 2025-11-07
-- Purpose: Remove soft-deleted agents that have no associated data
--
-- Context: Previously, all agent deletions were soft-deletes (is_active = false).
--          This caused accumulation of orphaned records that prevented name reuse.
--
-- Solution: One-time cleanup of inactive agents with no dependencies, plus
--           ongoing smart delete strategy in API (hard delete when no data exists)

-- Clean up inactive agents that have no associated data (executions, analytics, etc.)
-- This is a one-time cleanup to remove orphaned soft-deleted agents
-- Going forward, the API will use smart delete (hard delete when no data exists)

DO $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Delete inactive agents with no executions, analytics, or other dependencies
    WITH agents_to_delete AS (
        SELECT a.id
        FROM agents a
        LEFT JOIN agent_executions ae ON ae.agent_id = a.id
        LEFT JOIN conversation_analytics ca ON ca.primary_agent_id = a.id
        LEFT JOIN model_usage_analytics mua ON mua.agent_id = a.id
        WHERE a.is_active = false
        AND ae.id IS NULL
        AND ca.id IS NULL
        AND mua.id IS NULL
        -- Don't delete agents created in the last 24 hours (might have pending data)
        AND a.created_at < NOW() - INTERVAL '24 hours'
    )
    DELETE FROM agents
    WHERE id IN (SELECT id FROM agents_to_delete);
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % orphaned inactive agents', cleanup_count;
END $$;
