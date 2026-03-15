-- Subscription lifecycle: cancellation and grace period fields
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_cancelled_at timestamptz;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_period_end timestamptz;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cancelled_tier text;
-- account_type now also accepts: 'cancelled_grace', 'cancelled_limited'
