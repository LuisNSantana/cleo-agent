-- Telegram Channels Table
-- Stores Telegram channels configured by users for publishing
-- Bot must be admin of these channels to publish content

CREATE TABLE IF NOT EXISTS telegram_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Channel identification (can be username @channel or numeric chat_id)
  channel_username TEXT NOT NULL, -- e.g., @mychannel
  channel_name TEXT NOT NULL, -- Human-readable name
  chat_id TEXT, -- Numeric ID (populated after first successful publish)
  
  -- Channel metadata
  member_count INTEGER, -- Number of subscribers
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure user can't add same channel twice
  UNIQUE(user_id, channel_username)
);

-- Index for faster user lookups
CREATE INDEX idx_telegram_channels_user_id ON telegram_channels(user_id);

-- Index for active channels
CREATE INDEX idx_telegram_channels_active ON telegram_channels(user_id, is_active) WHERE is_active = true;

-- RLS Policies: Users can only access their own channels
ALTER TABLE telegram_channels ENABLE ROW LEVEL SECURITY;

-- Users can read their own channels
CREATE POLICY "Users can view own telegram channels"
  ON telegram_channels
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own channels
CREATE POLICY "Users can insert own telegram channels"
  ON telegram_channels
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own channels
CREATE POLICY "Users can update own telegram channels"
  ON telegram_channels
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own channels (soft delete via is_active)
CREATE POLICY "Users can delete own telegram channels"
  ON telegram_channels
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_telegram_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER telegram_channels_updated_at
  BEFORE UPDATE ON telegram_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_channels_updated_at();

-- Comments for documentation
COMMENT ON TABLE telegram_channels IS 'Telegram channels configured by users for content publishing. Bot must be admin.';
COMMENT ON COLUMN telegram_channels.channel_username IS 'Channel username (e.g., @mychannel) or numeric chat_id';
COMMENT ON COLUMN telegram_channels.chat_id IS 'Numeric chat ID obtained after first successful publish';
COMMENT ON COLUMN telegram_channels.member_count IS 'Number of channel subscribers (updated periodically)';
