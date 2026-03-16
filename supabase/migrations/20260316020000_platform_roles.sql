-- Platform Roles: Separate platform access from customer tiers
-- Adds users.platform_role and accounts.is_system

-- Add platform_role to users (nullable — NULL = regular customer user)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS platform_role text DEFAULT NULL;

ALTER TABLE users
  ADD CONSTRAINT users_platform_role_check
  CHECK (platform_role IN ('super_admin', 'support', 'finance'));

-- Add is_system to accounts (NOT NULL, defaults false)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- Migrate existing data
UPDATE users SET platform_role = 'super_admin' WHERE is_superadmin = true;
UPDATE accounts SET is_system = true WHERE name = 'ConsignIQ System';

-- Partial index for platform role lookups
CREATE INDEX IF NOT EXISTS idx_users_platform_role
  ON users (platform_role) WHERE platform_role IS NOT NULL;
