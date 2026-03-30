-- Expand profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{
  "email_enabled": true,
  "daily_digest": false,
  "mentions": true,
  "task_assigned": true,
  "status_changed": true,
  "due_dates": true,
  "new_members": false,
  "desktop_enabled": true,
  "sound_enabled": true,
  "quiet_hours": null
}';

-- Expand boards
ALTER TABLE boards ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  date_format text DEFAULT 'dd/MM/yyyy',
  week_start text DEFAULT 'monday',
  number_format text DEFAULT 'pt-BR',
  sidebar_position text DEFAULT 'left',
  sidebar_auto_collapse boolean DEFAULT false,
  animations_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
