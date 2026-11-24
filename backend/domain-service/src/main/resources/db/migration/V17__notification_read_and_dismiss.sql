ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS notifications_user_visible_idx ON notifications(user_id, channel, dismissed_at);
