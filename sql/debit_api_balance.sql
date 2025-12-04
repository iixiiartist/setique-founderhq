-- Atomic API balance debit function
-- SECURITY: This function atomically decrements api_balance and prevents overdraft
-- It uses UPDATE with a WHERE predicate to ensure the balance cannot go negative

CREATE OR REPLACE FUNCTION debit_api_balance(
  p_workspace_id UUID,
  p_amount NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance NUMERIC,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_row workspaces%ROWTYPE;
BEGIN
  -- Atomically update the balance with a check
  UPDATE workspaces
  SET api_balance = api_balance - p_amount
  WHERE id = p_workspace_id
    AND api_balance >= p_amount
  RETURNING * INTO v_updated_row;

  IF FOUND THEN
    -- Successfully debited
    RETURN QUERY SELECT 
      TRUE::BOOLEAN AS success,
      v_updated_row.api_balance AS new_balance,
      NULL::TEXT AS error_message;
  ELSE
    -- Failed - either workspace doesn't exist or insufficient balance
    -- Check which error it is
    IF EXISTS (SELECT 1 FROM workspaces WHERE id = p_workspace_id) THEN
      RETURN QUERY SELECT 
        FALSE::BOOLEAN AS success,
        (SELECT api_balance FROM workspaces WHERE id = p_workspace_id)::NUMERIC AS new_balance,
        'Insufficient API balance'::TEXT AS error_message;
    ELSE
      RETURN QUERY SELECT 
        FALSE::BOOLEAN AS success,
        0::NUMERIC AS new_balance,
        'Workspace not found'::TEXT AS error_message;
    END IF;
  END IF;
END;
$$;

-- Grant execute to service role only (Edge Functions use service role)
REVOKE ALL ON FUNCTION debit_api_balance FROM PUBLIC;
GRANT EXECUTE ON FUNCTION debit_api_balance TO service_role;

COMMENT ON FUNCTION debit_api_balance IS 'Atomically debit api_balance from a workspace. Returns success=false if insufficient balance (no partial debit). Used by AI Edge Functions to prevent race-condition overdrafts.';
