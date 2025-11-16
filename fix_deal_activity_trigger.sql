-- Fix deal activity trigger - remove non-existent user_id reference
-- The deals table doesn't have a user_id column, only assigned_to

CREATE OR REPLACE FUNCTION log_deal_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
    deal_name TEXT;
    acting_user_id UUID;
BEGIN
    -- Get the current user from auth context
    acting_user_id := auth.uid();
    
    -- Determine action type
    IF (TG_OP = 'INSERT') THEN
        action_type := 'deal_created';
        deal_name := NEW.title;
        
        INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
        VALUES (
            NEW.workspace_id,
            COALESCE(acting_user_id, NEW.assigned_to),
            action_type,
            'deal',
            NEW.id,
            deal_name,
            jsonb_build_object(
                'stage', NEW.stage,
                'value', NEW.value,
                'currency', NEW.currency
            )
        );
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        deal_name := NEW.title;
        
        -- Log stage change
        IF (OLD.stage <> NEW.stage) THEN
            IF (NEW.stage = 'closed_won') THEN
                action_type := 'deal_won';
            ELSIF (NEW.stage = 'closed_lost') THEN
                action_type := 'deal_lost';
            ELSE
                action_type := 'deal_stage_changed';
            END IF;
            
            INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
            VALUES (
                NEW.workspace_id,
                COALESCE(acting_user_id, NEW.assigned_to),
                action_type,
                'deal',
                NEW.id,
                deal_name,
                jsonb_build_object(
                    'old_stage', OLD.stage,
                    'new_stage', NEW.stage,
                    'value', NEW.value,
                    'currency', NEW.currency
                )
            );
        END IF;
        
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        action_type := 'deal_deleted';
        deal_name := OLD.title;
        
        INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
        VALUES (
            OLD.workspace_id,
            COALESCE(acting_user_id, OLD.assigned_to),
            action_type,
            'deal',
            OLD.id,
            deal_name,
            jsonb_build_object(
                'stage', OLD.stage,
                'value', OLD.value
            )
        );
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS deal_activity_trigger ON deals;
CREATE TRIGGER deal_activity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION log_deal_activity();

COMMENT ON FUNCTION log_deal_activity() IS 'Fixed: Logs deal activity using auth.uid() instead of non-existent user_id column';
