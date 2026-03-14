-- RPC function to atomically increment AI lookups counter
CREATE OR REPLACE FUNCTION increment_ai_lookups(p_account_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE accounts
  SET ai_lookups_this_month = ai_lookups_this_month + 1
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
