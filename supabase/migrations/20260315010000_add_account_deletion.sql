-- Add account deletion tracking columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deletion_reason text;
