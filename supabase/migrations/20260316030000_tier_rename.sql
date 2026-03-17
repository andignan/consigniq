-- Tier rename: starter/standard → shop, pro → enterprise
-- Solo unchanged

-- Migrate tier values
UPDATE accounts SET tier = 'shop' WHERE tier = 'standard';
UPDATE accounts SET tier = 'enterprise' WHERE tier = 'pro';
UPDATE accounts SET tier = 'shop' WHERE tier = 'starter';

-- Migrate complimentary_tier values
UPDATE accounts SET complimentary_tier = 'shop' WHERE complimentary_tier IN ('starter', 'standard');
UPDATE accounts SET complimentary_tier = 'enterprise' WHERE complimentary_tier = 'pro';

-- Migrate cancelled_tier values
UPDATE accounts SET cancelled_tier = 'shop' WHERE cancelled_tier IN ('starter', 'standard');
UPDATE accounts SET cancelled_tier = 'enterprise' WHERE cancelled_tier = 'pro';

-- Update CHECK constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_tier_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_tier_check CHECK (tier IN ('solo', 'shop', 'enterprise'));
