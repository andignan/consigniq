-- Cross-account pricing stats aggregation view
-- Used by Pro-tier users to see anonymized pricing intelligence across all accounts

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
