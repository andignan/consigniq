-- Add 'archived' as a valid item status
-- Drop any existing CHECK constraint on status column and recreate with archived
DO $$
BEGIN
  -- Try to drop existing check constraint (name may vary)
  BEGIN
    ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check1;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE items DROP CONSTRAINT IF EXISTS check_status;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Add new constraint including 'archived'
ALTER TABLE items ADD CONSTRAINT items_status_check
  CHECK (status IN ('pending', 'priced', 'sold', 'donated', 'returned', 'archived'));
