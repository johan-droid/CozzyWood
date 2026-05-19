-- ============================================
-- DATABASE SCHEMA FOR COZZYWOOD
-- PostgreSQL (Supabase)
-- Zero-Cost Stack Edition
-- 
-- This schema is optimized for Supabase's free tier:
-- - Uses Supabase Auth for authentication (no password_hash needed)
-- - Includes Row Level Security policies
-- - Supports OAuth integrations (Spotify, etc.)
-- - Tracks file uploads to Cloudflare R2
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- Note: Supabase Auth handles authentication
-- This table stores additional user metadata
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(50) DEFAULT 'user',
    
    -- OAuth provider links (Spotify, etc.)
    spotify_id VARCHAR(255),
    spotify_access_token TEXT,
    spotify_refresh_token TEXT,
    spotify_token_expires_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_spotify ON users(spotify_id);

-- Row Level Security (Supabase feature)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY users_select_own ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY users_update_own ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- ============================================
-- ROOMS TABLE
-- ============================================
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    host_id UUID REFERENCES users(id) ON DELETE SET NULL,
    room_code VARCHAR(10) UNIQUE NOT NULL,
    max_participants INTEGER DEFAULT 10,
    is_private BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_rooms_code ON rooms(room_code);
CREATE INDEX idx_rooms_host ON rooms(host_id);

-- RLS for rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Anyone can view active rooms
CREATE POLICY rooms_select_active ON rooms
    FOR SELECT
    USING (is_active = true);

-- Hosts can update their rooms
CREATE POLICY rooms_update_host ON rooms
    FOR UPDATE
    USING (auth.uid() = host_id);

-- ============================================
-- ROOM PARTICIPANTS TABLE
-- ============================================
CREATE TABLE room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    role VARCHAR(50) DEFAULT 'participant',
    is_online BOOLEAN DEFAULT true
);

CREATE INDEX idx_participants_room ON room_participants(room_id);
CREATE INDEX idx_participants_user ON room_participants(user_id);
CREATE INDEX idx_participants_online ON room_participants(is_online);

-- RLS for participants
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- Users can see who's in their rooms
CREATE POLICY participants_select ON room_participants
    FOR SELECT
    USING (
        user_id = auth.uid() OR 
        room_id IN (SELECT id FROM rooms WHERE host_id = auth.uid())
    );

-- ============================================
-- WATCH SESSIONS TABLE
-- ============================================
CREATE TABLE watch_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    media_type VARCHAR(50) NOT NULL, -- 'youtube', 'spotify', 'file', etc.
    media_id VARCHAR(255) NOT NULL,
    media_title VARCHAR(255),
    media_thumbnail TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    started_by UUID REFERENCES users(id) ON DELETE SET NULL,
    current_position INTEGER DEFAULT 0, -- milliseconds
    is_playing BOOLEAN DEFAULT false
);

CREATE INDEX idx_sessions_room ON watch_sessions(room_id);
CREATE INDEX idx_sessions_started ON watch_sessions(started_at);
CREATE INDEX idx_sessions_media ON watch_sessions(media_type, media_id);

-- RLS for watch sessions
ALTER TABLE watch_sessions ENABLE ROW LEVEL SECURITY;

-- Participants can view sessions in their rooms
CREATE POLICY sessions_select ON watch_sessions
    FOR SELECT
    USING (
        room_id IN (
            SELECT room_id FROM room_participants 
            WHERE user_id = auth.uid() AND is_online = true
        )
    );

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'gif', 'system'
    metadata JSONB, -- For GIFs, embeds, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_chat_room ON chat_messages(room_id);
CREATE INDEX idx_chat_created ON chat_messages(created_at);
CREATE INDEX idx_chat_user ON chat_messages(user_id);

-- RLS for chat messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Participants can read/write messages in their rooms
CREATE POLICY chat_select ON chat_messages
    FOR SELECT
    USING (
        room_id IN (
            SELECT room_id FROM room_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY chat_insert ON chat_messages
    FOR INSERT
    WITH CHECK (
        room_id IN (
            SELECT room_id FROM room_participants 
            WHERE user_id = auth.uid() AND is_online = true
        )
    );

-- ============================================
-- USER PREFERENCES TABLE
-- ============================================
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(50) DEFAULT 'dark', -- 'light', 'dark', 'system'
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true,
    auto_play BOOLEAN DEFAULT true,
    quality_preference VARCHAR(20) DEFAULT 'auto', -- 'low', 'medium', 'high', 'auto'
    volume_level INTEGER DEFAULT 80,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prefs_user ON user_preferences(user_id);

-- RLS for preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY prefs_select_own ON user_preferences
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY prefs_update_own ON user_preferences
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY prefs_insert_own ON user_preferences
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- USER TOKENS TABLE (OAuth)
-- ============================================
CREATE TABLE user_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'spotify', 'youtube', etc.
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

CREATE INDEX idx_tokens_user ON user_tokens(user_id);
CREATE INDEX idx_tokens_provider ON user_tokens(provider);

-- RLS for tokens
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY tokens_select_own ON user_tokens
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY tokens_update_own ON user_tokens
    FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================
-- ANALYTICS / USAGE STATS
-- ============================================
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);

-- RLS for analytics (service role only)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Service role can insert analytics
CREATE POLICY analytics_insert ON analytics_events
    FOR INSERT
    WITH CHECK (true);

-- Users can only see their own analytics
CREATE POLICY analytics_select_own ON analytics_events
    FOR SELECT
    USING (user_id = auth.uid());

-- ============================================
-- FILE UPLOADS (metadata for R2 storage)
-- ============================================
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_type VARCHAR(100),
    file_size BIGINT,
    storage_key TEXT NOT NULL, -- R2 object key
    public_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_files_user ON file_uploads(user_id);
CREATE INDEX idx_files_room ON file_uploads(room_id);

-- RLS for file uploads
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Users can see their own uploads and room uploads
CREATE POLICY files_select ON file_uploads
    FOR SELECT
    USING (
        user_id = auth.uid() OR 
        room_id IN (
            SELECT room_id FROM room_participants 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- TRIGGER: UPDATE updated_at TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tokens_updated_at
    BEFORE UPDATE ON user_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (OPTIONAL - FOR TESTING)
-- ============================================

-- Note: With Supabase Auth, users are created via the Auth API
-- No need to manually insert password hashes

-- Example: Create a test room (run after creating a user via Auth)
-- INSERT INTO rooms (name, description, host_id, room_code, max_participants)
-- VALUES (
--     'Test Room',
--     'A room for testing Cozzywood',
--     'your-user-uuid-here',
--     'TEST123',
--     10
-- );

-- ============================================
-- COMMENTS & DOCUMENTATION
-- ============================================

COMMENT ON TABLE users IS 'Stores user account information (linked to Supabase Auth)';
COMMENT ON TABLE rooms IS 'Video sync rooms where users gather';
COMMENT ON TABLE room_participants IS 'Tracks which users are in which rooms';
COMMENT ON TABLE watch_sessions IS 'History of videos/music watched in rooms';
COMMENT ON TABLE chat_messages IS 'Chat messages sent in rooms';
COMMENT ON TABLE user_preferences IS 'User-specific settings and preferences';
COMMENT ON TABLE user_tokens IS 'OAuth tokens for third-party integrations (Spotify, etc.)';
COMMENT ON TABLE analytics_events IS 'Event tracking for analytics';
COMMENT ON TABLE file_uploads IS 'Metadata for files stored in Cloudflare R2';

COMMENT ON COLUMN users.spotify_id IS 'Spotify user ID for OAuth integration';
COMMENT ON COLUMN watch_sessions.media_type IS 'Source: youtube, spotify, file, pexels';
COMMENT ON COLUMN chat_messages.metadata IS 'JSON data for GIFs, embeds, reactions';
COMMENT ON COLUMN file_uploads.storage_key IS 'Cloudflare R2 object key';
