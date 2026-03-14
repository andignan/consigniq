-- Add payout tracking fields to items table
-- paid_at: when the consignor was paid for this sold item
-- payout_note: optional note for payout records
ALTER TABLE items ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE items ADD COLUMN IF NOT EXISTS payout_note text;
