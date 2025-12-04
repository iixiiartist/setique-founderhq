-- ============================================
-- FIX: set_subscription_limits trigger
-- ============================================
-- This trigger sets seats on workspaces table based on plan_type
-- The old trigger referenced max_team_members which doesn't exist

CREATE OR REPLACE FUNCTION public.set_subscription_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Set seats based on plan type
  IF NEW.plan_type = 'free' THEN
    NEW.seats := 1;
  ELSIF NEW.plan_type = 'power-individual' THEN
    NEW.seats := 1;
  ELSIF NEW.plan_type = 'team-pro' THEN
    -- For team-pro, keep existing seats or default to 5
    NEW.seats := GREATEST(COALESCE(NEW.seats, 5), 2);
  ELSIF NEW.plan_type = 'team-starter' THEN
    -- For team-starter, keep existing seats or default to 3
    NEW.seats := GREATEST(COALESCE(NEW.seats, 3), 2);
  ELSE
    -- Legacy/unknown plans - preserve seats or default to 1
    NEW.seats := COALESCE(NEW.seats, 1);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Also ensure the trigger is attached to workspaces table (not subscriptions)
DROP TRIGGER IF EXISTS set_subscription_limits_trigger ON workspaces;
DROP TRIGGER IF EXISTS set_subscription_limits_trigger ON subscriptions;

CREATE TRIGGER set_subscription_limits_trigger
  BEFORE INSERT OR UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION set_subscription_limits();

SELECT 'Trigger function fixed - now sets seats on workspaces!' as status;
