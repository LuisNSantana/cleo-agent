-- Credit System Tables
-- Created: 2025-11-10
-- Purpose: Track credit usage per user and provide balance management

-- =====================================================
-- Table: credit_usage
-- Purpose: Record every model invocation with token usage and credit cost
-- =====================================================
CREATE TABLE IF NOT EXISTS public.credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  execution_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  credits_used NUMERIC(10, 4) NOT NULL DEFAULT 0,
  usd_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON public.credit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_thread_id ON public.credit_usage(thread_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_created_at ON public.credit_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_created ON public.credit_usage(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own credit usage
CREATE POLICY "Users can view their own credit usage"
  ON public.credit_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert credit usage records
CREATE POLICY "Service role can insert credit usage"
  ON public.credit_usage
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- Add subscription_tier to profiles table if not exists
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN subscription_tier TEXT DEFAULT 'free' 
    CHECK (subscription_tier IN ('free', 'pro', 'pro+', 'business'));
    
    CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier 
    ON public.profiles(subscription_tier);
  END IF;
END $$;

-- =====================================================
-- Helpful views
-- =====================================================

-- View: user_credit_summary
-- Purpose: Quick summary of credit usage per user
CREATE OR REPLACE VIEW public.user_credit_summary AS
SELECT 
  user_id,
  COUNT(*) as total_executions,
  SUM(total_tokens) as total_tokens_used,
  SUM(credits_used) as total_credits_used,
  SUM(usd_cost) as total_usd_spent,
  MAX(created_at) as last_execution_at
FROM public.credit_usage
WHERE created_at >= date_trunc('month', NOW()) -- Current month only
GROUP BY user_id;

-- Grant access to authenticated users
GRANT SELECT ON public.user_credit_summary TO authenticated;

-- View: model_usage_stats
-- Purpose: Statistics by model for admins
CREATE OR REPLACE VIEW public.model_usage_stats AS
SELECT 
  model_name,
  COUNT(*) as execution_count,
  SUM(total_tokens) as total_tokens,
  AVG(total_tokens) as avg_tokens_per_execution,
  SUM(credits_used) as total_credits,
  SUM(usd_cost) as total_cost
FROM public.credit_usage
GROUP BY model_name
ORDER BY execution_count DESC;

-- =====================================================
-- Function: get_user_credit_balance
-- Purpose: Calculate remaining credits for a user
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_credit_balance(p_user_id UUID)
RETURNS TABLE (
  plan TEXT,
  total_credits INTEGER,
  used_credits NUMERIC,
  remaining_credits NUMERIC,
  usage_percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan TEXT;
  v_total_credits INTEGER;
  v_used_credits NUMERIC;
BEGIN
  -- Get user's plan
  SELECT subscription_tier INTO v_plan
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Default to free if not found
  v_plan := COALESCE(v_plan, 'free');
  
  -- Set total credits based on plan
  v_total_credits := CASE v_plan
    WHEN 'free' THEN 100
    WHEN 'pro' THEN 2500
    WHEN 'pro+' THEN 7500
    WHEN 'business' THEN 999999
    ELSE 100
  END;
  
  -- Calculate used credits this month
  SELECT COALESCE(SUM(credits_used), 0) INTO v_used_credits
  FROM public.credit_usage
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', NOW());
  
  -- Return results
  RETURN QUERY
  SELECT 
    v_plan,
    v_total_credits,
    v_used_credits,
    GREATEST(0, v_total_credits - v_used_credits) as remaining,
    CASE 
      WHEN v_total_credits > 0 THEN ROUND((v_used_credits / v_total_credits * 100), 2)
      ELSE 0
    END as percentage;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_credit_balance(UUID) TO authenticated;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE public.credit_usage IS 'Tracks credit consumption per LLM model invocation';
COMMENT ON COLUMN public.credit_usage.credits_used IS 'Credits consumed (1 credit = $0.01 USD)';
COMMENT ON COLUMN public.credit_usage.usd_cost IS 'Actual cost in USD based on model pricing';
COMMENT ON FUNCTION public.get_user_credit_balance IS 'Returns current credit balance for a user';
