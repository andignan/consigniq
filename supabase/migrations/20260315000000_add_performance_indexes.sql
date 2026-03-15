-- I4: Add composite indexes for frequently filtered columns
-- Improves query performance for multi-tenant data access patterns

-- Items indexes
CREATE INDEX IF NOT EXISTS idx_items_account_status ON items (account_id, status);
CREATE INDEX IF NOT EXISTS idx_items_account_location ON items (account_id, location_id);
CREATE INDEX IF NOT EXISTS idx_items_location_status ON items (location_id, status);

-- Consignors indexes
CREATE INDEX IF NOT EXISTS idx_consignors_account_status ON consignors (account_id, status);
CREATE INDEX IF NOT EXISTS idx_consignors_account_location ON consignors (account_id, location_id);

-- Price history index
CREATE INDEX IF NOT EXISTS idx_price_history_account ON price_history (account_id);

-- Users index
CREATE INDEX IF NOT EXISTS idx_users_account ON users (account_id);

-- Locations index
CREATE INDEX IF NOT EXISTS idx_locations_account ON locations (account_id);

-- Accounts index (Stripe webhook lookups)
CREATE INDEX IF NOT EXISTS idx_accounts_stripe_customer ON accounts (stripe_customer_id);
