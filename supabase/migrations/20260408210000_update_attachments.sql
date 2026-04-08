ALTER TABLE item_files ADD COLUMN IF NOT EXISTS update_id UUID REFERENCES updates(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_item_files_update_id ON item_files(update_id);
