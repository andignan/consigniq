-- Fix price_history.priced_at and sold_at column types
-- These were created as numeric but the app writes ISO timestamp strings (from items table)
-- and the UI parses them as dates. Change to timestamptz for consistency.

-- Step 1: Drop the view that depends on these columns
DROP VIEW IF EXISTS cross_account_pricing_stats;

-- Step 2: Add new timestamptz columns
ALTER TABLE price_history ADD COLUMN priced_at_new timestamptz;
ALTER TABLE price_history ADD COLUMN sold_at_new timestamptz;

-- Step 3: Drop old numeric columns
ALTER TABLE price_history DROP COLUMN priced_at;
ALTER TABLE price_history DROP COLUMN sold_at;

-- Step 4: Rename new columns
ALTER TABLE price_history RENAME COLUMN priced_at_new TO priced_at;
ALTER TABLE price_history RENAME COLUMN sold_at_new TO sold_at;

-- Step 5: Add NOT NULL constraint on priced_at (matching original)
-- Can't add NOT NULL on existing rows with nulls, so set a default first
UPDATE price_history SET priced_at = created_at WHERE priced_at IS NULL;
ALTER TABLE price_history ALTER COLUMN priced_at SET NOT NULL;

-- Step 6: Recreate the cross_account_pricing_stats view
CREATE OR REPLACE VIEW cross_account_pricing_stats AS
SELECT
  category,
  name,
  condition,
  COUNT(*) AS sample_count,
  AVG(sold_price) AS avg_sold_price,
  MIN(sold_price) AS min_sold_price,
  MAX(sold_price) AS max_sold_price,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sold_price) AS median_sold_price,
  AVG(days_to_sell) AS avg_days_to_sell,
  COUNT(CASE WHEN sold = true THEN 1 END) AS sold_count,
  COUNT(CASE WHEN sold = false OR sold IS NULL THEN 1 END) AS unsold_count
FROM price_history
WHERE sold_price IS NOT NULL
GROUP BY category, name, condition;
