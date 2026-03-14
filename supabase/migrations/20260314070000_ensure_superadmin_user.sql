-- Ensure the superadmin user row exists in the users table.
-- The auth.users entry must already exist (created via Supabase Dashboard).
-- This migration inserts the users table row with is_superadmin = true.
-- If the admin user already exists, this is a no-op.
--
-- IMPORTANT: Update the id value below to match the auth.users.id for admin@getconsigniq.com
-- You can find it in Supabase Dashboard → Authentication → Users

-- The account_id should be set to an existing account. The superadmin
-- needs a valid account_id since the column is NOT NULL.
-- Run this AFTER creating the admin auth user and at least one account.

INSERT INTO users (id, email, full_name, role, account_id, is_superadmin)
SELECT
  au.id,
  'admin@getconsigniq.com',
  'ConsignIQ Admin',
  'owner',
  (SELECT id FROM accounts LIMIT 1),
  true
FROM auth.users au
WHERE au.email = 'admin@getconsigniq.com'
ON CONFLICT (id) DO UPDATE SET is_superadmin = true;
