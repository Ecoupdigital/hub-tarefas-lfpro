-- Workspace settings columns
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS privacy text DEFAULT 'open'
  CHECK (privacy IN ('open', 'closed', 'hidden'));
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS cover_url text;
