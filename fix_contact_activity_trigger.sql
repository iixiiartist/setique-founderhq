-- Fix contact activity logging trigger
-- The contacts table doesn't have a 'type' field
-- Remove the reference to NEW.type from the metadata

CREATE OR REPLACE FUNCTION log_contact_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
    contact_name TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        action_type := 'contact_added';
        contact_name := COALESCE(NEW.name, NEW.email);
        
        INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
        VALUES (
            NEW.workspace_id,
            NEW.user_id,
            action_type,
            'contact',
            NEW.id,
            contact_name,
            jsonb_build_object(
                'email', NEW.email,
                'crm_item_id', NEW.crm_item_id
            )
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        action_type := 'contact_updated';
        contact_name := COALESCE(NEW.name, NEW.email);
        
        INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
        VALUES (
            NEW.workspace_id,
            NEW.user_id,
            action_type,
            'contact',
            NEW.id,
            contact_name,
            jsonb_build_object(
                'email', NEW.email,
                'crm_item_id', NEW.crm_item_id,
                'changed_fields', jsonb_build_object(
                    'name', CASE WHEN OLD.name != NEW.name THEN NEW.name ELSE NULL END,
                    'email', CASE WHEN OLD.email != NEW.email THEN NEW.email ELSE NULL END
                )
            )
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        action_type := 'contact_removed';
        contact_name := COALESCE(OLD.name, OLD.email);
        
        INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
        VALUES (
            OLD.workspace_id,
            OLD.user_id,
            action_type,
            'contact',
            OLD.id,
            contact_name,
            jsonb_build_object(
                'email', OLD.email,
                'crm_item_id', OLD.crm_item_id
            )
        );
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger should already exist, but let's recreate it to be safe
DROP TRIGGER IF EXISTS contact_activity_trigger ON contacts;
CREATE TRIGGER contact_activity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION log_contact_activity();
