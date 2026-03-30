-- =============================================================================
-- MIGRATION: Database-Level Rate Limiting
-- Date: 2026-02-17
-- Description: Rate limiting via PostgreSQL for all authenticated mutations
-- Issue: LOW-02
-- =============================================================================

-- Table to track request counts per user per action
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count int NOT NULL DEFAULT 1,
  UNIQUE(user_id, action, window_start)
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action, window_start DESC);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own rate limit entries
CREATE POLICY "Users manage own rate limits"
ON rate_limits FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Cleanup old entries automatically (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Core rate limiting function
-- Returns true if request is allowed, false if rate limited
-- Default: 60 requests per minute per action per user
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_requests int DEFAULT 60,
  p_window_seconds int DEFAULT 60
)
RETURNS boolean AS $$
DECLARE
  v_window_start timestamptz;
  v_current_count int;
BEGIN
  -- Calculate window start (truncate to window boundary)
  v_window_start := date_trunc('minute', now());

  -- Cleanup old entries periodically (1% chance per call to avoid overhead)
  IF random() < 0.01 THEN
    PERFORM cleanup_old_rate_limits();
  END IF;

  -- Upsert: increment counter or create new entry
  INSERT INTO rate_limits (user_id, action, window_start, request_count)
  VALUES (p_user_id, p_action, v_window_start, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  -- Check if over limit
  RETURN v_current_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Convenience function that raises an exception when rate limited
-- Use this in triggers or RPC functions
CREATE OR REPLACE FUNCTION enforce_rate_limit(
  p_action text,
  p_max_requests int DEFAULT 60,
  p_window_seconds int DEFAULT 60
)
RETURNS void AS $$
BEGIN
  IF NOT check_rate_limit(auth.uid(), p_action, p_max_requests, p_window_seconds) THEN
    RAISE EXCEPTION 'Rate limit exceeded for action: %. Max % requests per % seconds.',
      p_action, p_max_requests, p_window_seconds
    USING ERRCODE = 'P0001';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Rate limit triggers for high-risk tables
-- =============================================================================

-- Items: max 120 mutations/min (create, update, delete)
CREATE OR REPLACE FUNCTION trigger_rate_limit_items()
RETURNS trigger AS $$
BEGIN
  PERFORM enforce_rate_limit('items_mutation', 120, 60);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER rate_limit_items_insert
  BEFORE INSERT ON items
  FOR EACH ROW EXECUTE FUNCTION trigger_rate_limit_items();

CREATE TRIGGER rate_limit_items_update
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION trigger_rate_limit_items();

-- Column values: max 200 mutations/min (frequent inline edits)
CREATE OR REPLACE FUNCTION trigger_rate_limit_column_values()
RETURNS trigger AS $$
BEGIN
  PERFORM enforce_rate_limit('column_values_mutation', 200, 60);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER rate_limit_cv_insert
  BEFORE INSERT ON column_values
  FOR EACH ROW EXECUTE FUNCTION trigger_rate_limit_column_values();

CREATE TRIGGER rate_limit_cv_update
  BEFORE UPDATE ON column_values
  FOR EACH ROW EXECUTE FUNCTION trigger_rate_limit_column_values();

-- Boards: max 30 mutations/min
CREATE OR REPLACE FUNCTION trigger_rate_limit_boards()
RETURNS trigger AS $$
BEGIN
  PERFORM enforce_rate_limit('boards_mutation', 30, 60);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER rate_limit_boards_insert
  BEFORE INSERT ON boards
  FOR EACH ROW EXECUTE FUNCTION trigger_rate_limit_boards();

CREATE TRIGGER rate_limit_boards_update
  BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION trigger_rate_limit_boards();

-- Workspaces: max 10 mutations/min
CREATE OR REPLACE FUNCTION trigger_rate_limit_workspaces()
RETURNS trigger AS $$
BEGIN
  PERFORM enforce_rate_limit('workspaces_mutation', 10, 60);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER rate_limit_workspaces_insert
  BEFORE INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION trigger_rate_limit_workspaces();

CREATE TRIGGER rate_limit_workspaces_update
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION trigger_rate_limit_workspaces();

-- File uploads: max 20/min
CREATE OR REPLACE FUNCTION trigger_rate_limit_files()
RETURNS trigger AS $$
BEGIN
  PERFORM enforce_rate_limit('file_upload', 20, 60);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER rate_limit_files_insert
  BEFORE INSERT ON item_files
  FOR EACH ROW EXECUTE FUNCTION trigger_rate_limit_files();
