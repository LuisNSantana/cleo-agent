-- Voice Mode Tables Migration
-- Adds support for voice sessions and voice messages

-- Create voice_sessions table
CREATE TABLE IF NOT EXISTS voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  audio_input_tokens INTEGER DEFAULT 0,
  audio_output_tokens INTEGER DEFAULT 0,
  text_input_tokens INTEGER DEFAULT 0,
  text_output_tokens INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0.0,
  provider VARCHAR(50) DEFAULT 'openai',
  model VARCHAR(100) DEFAULT 'gpt-4o-realtime-preview',
  voice VARCHAR(50) DEFAULT 'alloy',
  quality VARCHAR(20) DEFAULT 'standard',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'error', 'cancelled')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create voice_messages table (for transcription and audio storage)
CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  transcription TEXT,
  audio_url TEXT,
  audio_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_chat_id ON voice_sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status ON voice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_created_at ON voice_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_messages_session_id ON voice_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_message_id ON voice_messages(message_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_voice_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER voice_sessions_updated_at
  BEFORE UPDATE ON voice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_sessions_updated_at();

-- RLS Policies
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own voice sessions
CREATE POLICY "Users can view own voice sessions"
  ON voice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice sessions"
  ON voice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice sessions"
  ON voice_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only see voice messages from their sessions
CREATE POLICY "Users can view own voice messages"
  ON voice_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voice_sessions
      WHERE voice_sessions.id = voice_messages.session_id
      AND voice_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own voice messages"
  ON voice_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM voice_sessions
      WHERE voice_sessions.id = voice_messages.session_id
      AND voice_sessions.user_id = auth.uid()
    )
  );

-- Add voice_mode preference to user preferences (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences'
    AND column_name = 'voice_mode_enabled'
  ) THEN
    ALTER TABLE user_preferences
    ADD COLUMN voice_mode_enabled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add voice_minutes_limit to user preferences for rate limiting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences'
    AND column_name = 'voice_minutes_limit'
  ) THEN
    ALTER TABLE user_preferences
    ADD COLUMN voice_minutes_limit INTEGER DEFAULT 5;
  END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE voice_sessions IS 'Stores voice conversation sessions with usage tracking';
COMMENT ON TABLE voice_messages IS 'Stores individual voice messages with transcriptions';
COMMENT ON COLUMN voice_sessions.provider IS 'Voice API provider: openai, deepgram, elevenlabs';
COMMENT ON COLUMN voice_sessions.quality IS 'Audio quality: standard, hd';
COMMENT ON COLUMN voice_sessions.metadata IS 'Additional session metadata (JSON)';
