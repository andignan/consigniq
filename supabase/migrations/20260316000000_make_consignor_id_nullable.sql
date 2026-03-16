-- Make consignor_id nullable on items table for Solo tier users
-- Solo users save items without a consignor (personal inventory)
ALTER TABLE items ALTER COLUMN consignor_id DROP NOT NULL;
