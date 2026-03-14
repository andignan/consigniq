-- Add AI pricing lookup usage tracking to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_lookups_this_month integer DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_lookups_reset_at timestamptz DEFAULT now();
