-- Migration: Add task_notifications table for inbox system
-- Created: 2025-01-XX
-- Description: Centralized notification system for agent task results

-- Create task_notifications table
CREATE TABLE IF NOT EXISTS public.task_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.agent_tasks(task_id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    agent_avatar TEXT,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('task_completed', 'task_failed', 'task_scheduled', 'task_reminder')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    task_result JSONB,
    error_details TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    action_buttons JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_notifications_user_id ON public.task_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_task_id ON public.task_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_read ON public.task_notifications(read);
CREATE INDEX IF NOT EXISTS idx_task_notifications_type ON public.task_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_task_notifications_priority ON public.task_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_task_notifications_created_at ON public.task_notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_notifications
CREATE POLICY "Users can view their own notifications"
    ON public.task_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
    ON public.task_notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.task_notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON public.task_notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic updated_at
CREATE TRIGGER trigger_update_task_notifications_updated_at
    BEFORE UPDATE ON public.task_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_task_notifications_updated_at();

-- Function to auto-expire old notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM public.task_notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_notifications TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comment on table
COMMENT ON TABLE public.task_notifications IS 'Centralized notification inbox system for agent task results and updates';
COMMENT ON COLUMN public.task_notifications.action_buttons IS 'JSON array of action buttons for the notification UI';
COMMENT ON COLUMN public.task_notifications.metadata IS 'Additional metadata for notification context';
COMMENT ON COLUMN public.task_notifications.expires_at IS 'Optional expiration date for auto-cleanup of notifications';
