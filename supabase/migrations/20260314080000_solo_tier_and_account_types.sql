-- Migration: Solo tier and account types
-- Adds account_type (paid/trial/complimentary), trial support, bonus lookups

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_complimentary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS complimentary_tier text,
  ADD COLUMN IF NOT EXISTS bonus_lookups integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_lookups_used integer NOT NULL DEFAULT 0;

-- Add check constraint for account_type
ALTER TABLE accounts
  ADD CONSTRAINT accounts_account_type_check
  CHECK (account_type IN ('paid', 'trial', 'complimentary'));

-- Add check constraint for complimentary_tier
ALTER TABLE accounts
  ADD CONSTRAINT accounts_complimentary_tier_check
  CHECK (complimentary_tier IS NULL OR complimentary_tier IN ('solo', 'starter', 'standard', 'pro'));

-- Update tier check to include 'solo'
-- First drop existing constraint if any, then add new one
DO $$
BEGIN
  -- Try to drop existing tier constraint
  ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_tier_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Allow solo tier
ALTER TABLE accounts
  ADD CONSTRAINT accounts_tier_check
  CHECK (tier IN ('solo', 'starter', 'standard', 'pro'));
