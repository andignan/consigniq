-- Add pricing_venue column to accounts so the AI pricing engine can switch
-- between online-resale framing and brick-and-mortar consignment-shop framing.
-- Solo users default to online_resale; shop pricers can opt into brick_and_mortar.

ALTER TABLE accounts
  ADD COLUMN pricing_venue text NOT NULL DEFAULT 'online_resale'
  CHECK (pricing_venue IN ('online_resale', 'brick_and_mortar'));

COMMENT ON COLUMN accounts.pricing_venue IS
  'Pricing context for AI suggestions. online_resale (eBay/Poshmark/etc) is the default; brick_and_mortar applies a consignment-shop framing with ~30% discount vs eBay sold prices.';
