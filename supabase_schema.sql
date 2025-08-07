-- Zola Database Schema for Supabase
-- Execute this SQL in your Supabase SQL Editor

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY NOT NULL, -- Assuming the PK is from auth.users, typically not nullable
  email TEXT NOT NULL,
  anonymous BOOLEAN,
  daily_message_count INTEGER,
  daily_reset TIMESTAMPTZ,
  display_name TEXT,
  favorite_models TEXT[],
  message_count INTEGER,
  premium BOOLEAN,
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  daily_pro_message_count INTEGER,
  daily_pro_reset TIMESTAMPTZ,
  system_prompt TEXT,
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE -- Explicit FK definition
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  project_id UUID,
  title TEXT,
  model TEXT,
  system_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  public BOOLEAN DEFAULT FALSE NOT NULL,
  CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chats_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY, -- Using SERIAL for auto-incrementing integer ID
  chat_id UUID NOT NULL,
  user_id UUID,
  content TEXT,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'data')), -- Added CHECK constraint
  experimental_attachments JSONB, -- Storing Attachment[] as JSONB
  parts JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  message_group_id TEXT,
  model TEXT
);

-- Chat attachments table
CREATE TABLE chat_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER, -- Assuming INTEGER for file size
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User keys table for BYOK (Bring Your Own Key) integration
CREATE TABLE user_keys (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, provider)
);

-- User preferences table
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  layout TEXT DEFAULT 'fullscreen',
  prompt_suggestions BOOLEAN DEFAULT true,
  show_tool_invocations BOOLEAN DEFAULT true,
  show_conversation_previews BOOLEAN DEFAULT true,
  multi_model_enabled BOOLEAN DEFAULT false,
  hidden_models TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: keep updated_at in sync for user_preferences
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_timestamp
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE PROCEDURE update_user_preferences_updated_at();

-- User service connections table
CREATE TABLE user_service_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_id TEXT NOT NULL,
  connected BOOLEAN DEFAULT FALSE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  account_info JSONB,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_service_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, service_id)
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_service_connections ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
-- Users can view and update their own data
CREATE POLICY "Users can view their own data." ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data." ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own data." ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view their own projects." ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own projects." ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects." ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects." ON projects FOR DELETE USING (auth.uid() = user_id);

-- Chats policies
CREATE POLICY "Users can view their own chats." ON chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chats." ON chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chats." ON chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chats." ON chats FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view their own messages." ON messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own messages." ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own messages." ON messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages." ON messages FOR DELETE USING (auth.uid() = user_id);

-- Chat attachments policies
CREATE POLICY "Users can view their own attachments." ON chat_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own attachments." ON chat_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own attachments." ON chat_attachments FOR DELETE USING (auth.uid() = user_id);

-- Feedback policies
CREATE POLICY "Users can view their own feedback." ON feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own feedback." ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User keys policies
CREATE POLICY "Users can view their own keys." ON user_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own keys." ON user_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own keys." ON user_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own keys." ON user_keys FOR DELETE USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view their own preferences." ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences." ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences." ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- User service connections policies
CREATE POLICY "Users can view their own service connections." ON user_service_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own service connections." ON user_service_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own service connections." ON user_service_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own service connections." ON user_service_connections FOR DELETE USING (auth.uid() = user_id);
