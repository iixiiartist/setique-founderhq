-- Enforce workspace seat limits and secure AI usage updates
-- This migration adds automatic seat tracking for workspace members
-- and ensures AI usage counters can be incremented by any authenticated
-- workspace member without violating RLS policies.

-- 1. Ensure used_seats defaults to 0 so owners can be added first
ALTER TABLE subscriptions
  ALTER COLUMN used_seats SET DEFAULT 0;

-- 2. Recreate the default subscription trigger to start with zero seats used
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subscriptions (
        workspace_id,
        plan_type,
        status,
        ai_requests_used,
        ai_requests_reset_at,
        storage_bytes_used,
        file_count_used,
        seat_count,
        used_seats
    ) VALUES (
        NEW.id,
        'free',
        'active',
        0,
        NOW(),
        0,
        0,
        1,
        0
    )
    ON CONFLICT (workspace_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Backfill used_seats to match the actual number of members
WITH member_totals AS (
    SELECT workspace_id, COUNT(*) AS member_count
    FROM workspace_members
    GROUP BY workspace_id
)
UPDATE subscriptions s
SET used_seats = COALESCE(mt.member_count, 0)
FROM member_totals mt
WHERE s.workspace_id = mt.workspace_id;

-- Ensure every subscription reports at least one available seat entry
UPDATE subscriptions
SET used_seats = 0
WHERE used_seats IS NULL OR used_seats < 0;

-- 4. Trigger function to maintain seat usage when members change
CREATE OR REPLACE FUNCTION enforce_workspace_seat_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_workspace_id UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.workspace_id ELSE NEW.workspace_id END;
    v_subscription RECORD;
BEGIN
    -- Lock the subscription row to avoid race conditions
    SELECT seat_count, used_seats
    INTO v_subscription
    FROM subscriptions
    WHERE workspace_id = v_workspace_id
    FOR UPDATE;

    -- Create a default subscription if it does not exist
    IF NOT FOUND THEN
        INSERT INTO subscriptions (workspace_id, plan_type, status, seat_count, used_seats, ai_requests_used, ai_requests_reset_at, storage_bytes_used, file_count_used)
        VALUES (v_workspace_id, 'free', 'active', 1, 0, 0, NOW(), 0, 0)
        ON CONFLICT (workspace_id) DO NOTHING;

        SELECT seat_count, used_seats
        INTO v_subscription
        FROM subscriptions
        WHERE workspace_id = v_workspace_id
        FOR UPDATE;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Prevent exceeding purchased seats
        IF v_subscription.seat_count IS NOT NULL AND v_subscription.used_seats >= v_subscription.seat_count THEN
            RAISE EXCEPTION 'Workspace has reached its seat limit. Purchase additional seats to add more members.'
            USING ERRCODE = 'P0001';
        END IF;

        UPDATE subscriptions
        SET used_seats = v_subscription.used_seats + 1,
            updated_at = NOW()
        WHERE workspace_id = v_workspace_id;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE subscriptions
        SET used_seats = GREATEST(v_subscription.used_seats - 1, 0),
            updated_at = NOW()
        WHERE workspace_id = v_workspace_id;

        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_workspace_seat_limit_insert ON workspace_members;
CREATE TRIGGER enforce_workspace_seat_limit_insert
    BEFORE INSERT ON workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION enforce_workspace_seat_limit();

DROP TRIGGER IF EXISTS enforce_workspace_seat_limit_delete ON workspace_members;
CREATE TRIGGER enforce_workspace_seat_limit_delete
    AFTER DELETE ON workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION enforce_workspace_seat_limit();

-- 5. Prevent invitations when no seats are available
CREATE OR REPLACE FUNCTION enforce_workspace_invitation_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_workspace_id UUID := COALESCE(NEW.workspace_id, OLD.workspace_id);
    v_subscription RECORD;
    v_pending_invites INTEGER := 0;
BEGIN
    SELECT seat_count, used_seats
    INTO v_subscription
    FROM subscriptions
    WHERE workspace_id = v_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Only enforce limit for pending invitations
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending') THEN
        SELECT COUNT(*)
        INTO v_pending_invites
        FROM workspace_invitations
        WHERE workspace_id = v_workspace_id
          AND status = 'pending';

        IF v_subscription.seat_count IS NOT NULL
           AND (v_subscription.used_seats + v_pending_invites) >= v_subscription.seat_count THEN
            RAISE EXCEPTION 'All seats are already allocated. Increase your seat count before inviting new members.'
            USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_workspace_invitation_limit_insert ON workspace_invitations;
CREATE TRIGGER enforce_workspace_invitation_limit_insert
    BEFORE INSERT ON workspace_invitations
    FOR EACH ROW
    EXECUTE FUNCTION enforce_workspace_invitation_limit();

DROP TRIGGER IF EXISTS enforce_workspace_invitation_limit_update ON workspace_invitations;
CREATE TRIGGER enforce_workspace_invitation_limit_update
    BEFORE UPDATE ON workspace_invitations
    FOR EACH ROW
    EXECUTE FUNCTION enforce_workspace_invitation_limit();

-- 6. Secure AI usage increment function so members can update usage counters
CREATE OR REPLACE FUNCTION increment_ai_usage(p_workspace_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'P0001';
    END IF;

    -- Ensure caller belongs to the workspace (owner or member)
    IF NOT EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = p_workspace_id AND owner_id = auth.uid()
    ) AND NOT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You are not allowed to update AI usage for this workspace.'
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE subscriptions
    SET ai_requests_used = COALESCE(ai_requests_used, 0) + 1,
        updated_at = NOW()
    WHERE workspace_id = p_workspace_id
      AND status IN ('active', 'trialing');
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION increment_ai_usage(UUID) TO authenticated;
