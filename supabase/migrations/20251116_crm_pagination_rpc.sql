-- Migration: Add CRM pagination RPC function
-- Date: 2025-11-16
-- Purpose: Server-side pagination and filtering for CRM items to improve performance

-- Create function for paginated CRM queries with server-side filtering
CREATE OR REPLACE FUNCTION get_crm_items_paginated(
    p_workspace_id UUID,
    p_type TEXT DEFAULT NULL,              -- 'investor', 'customer', 'partner', or NULL for all
    p_status TEXT DEFAULT NULL,            -- Filter by status
    p_priority TEXT DEFAULT NULL,          -- Filter by priority
    p_search TEXT DEFAULT NULL,            -- Search company name, contacts
    p_assigned_to UUID DEFAULT NULL,       -- Filter by assignment
    p_sort_by TEXT DEFAULT 'created_at',   -- Sort field
    p_sort_order TEXT DEFAULT 'desc',      -- 'asc' or 'desc'
    p_page INT DEFAULT 1,                  -- Page number (1-indexed)
    p_page_size INT DEFAULT 50,            -- Items per page
    p_include_contacts BOOLEAN DEFAULT true,
    p_include_stats BOOLEAN DEFAULT false  -- Include aggregated stats
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INT;
    v_result JSON;
    v_total_count INT;
BEGIN
    v_offset := (p_page - 1) * p_page_size;
    
    -- Count total matching records
    SELECT COUNT(*)
    INTO v_total_count
    FROM crm_items
    WHERE workspace_id = p_workspace_id
        AND (p_type IS NULL OR type = p_type)
        AND (p_status IS NULL OR status = p_status)
        AND (p_priority IS NULL OR priority = p_priority)
        AND (p_assigned_to IS NULL OR assigned_to = p_assigned_to)
        AND (p_search IS NULL OR 
             company ILIKE '%' || p_search || '%' OR
             EXISTS (
                 SELECT 1 FROM contacts c 
                 WHERE c.crm_item_id = crm_items.id 
                 AND c.name ILIKE '%' || p_search || '%'
             ));
    
    -- Build result with pagination metadata
    SELECT json_build_object(
        'items', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', ci.id,
                    'type', ci.type,
                    'company', ci.company,
                    'status', ci.status,
                    'priority', ci.priority,
                    'nextAction', ci.next_action,
                    'nextActionDate', ci.next_action_date,
                    'nextActionTime', ci.next_action_time,
                    'assignedTo', ci.assigned_to,
                    'assignedToName', u.full_name,
                    'createdAt', ci.created_at,
                    'updatedAt', ci.updated_at,
                    'website', ci.website,
                    'industry', ci.industry,
                    'description', ci.description,
                    'notes', ci.notes,
                    'tags', ci.tags,
                    -- Type-specific fields
                    'checkSize', ci.check_size,
                    'stage', ci.stage,
                    'dealValue', ci.deal_value,
                    'dealStage', ci.deal_stage,
                    'opportunity', ci.opportunity,
                    'partnerType', ci.partner_type,
                    -- Aggregated counts
                    'contactCount', (SELECT COUNT(*) FROM contacts WHERE crm_item_id = ci.id),
                    'taskCount', (SELECT COUNT(*) FROM tasks WHERE crm_item_id = ci.id AND status != 'Done'),
                    'noteCount', COALESCE(array_length(ci.notes, 1), 0),
                    'documentCount', (SELECT COUNT(*) FROM documents WHERE crm_item_id = ci.id),
                    -- Contacts (if requested)
                    'contacts', CASE WHEN p_include_contacts THEN (
                        SELECT COALESCE(json_agg(json_build_object(
                            'id', c.id,
                            'name', c.name,
                            'email', c.email,
                            'phone', c.phone,
                            'title', c.title,
                            'linkedIn', c.linked_in,
                            'assignedTo', c.assigned_to,
                            'assignedToName', cu.full_name,
                            'crmItemId', c.crm_item_id
                        )), '[]'::json)
                        FROM contacts c
                        LEFT JOIN profiles cu ON cu.id = c.assigned_to
                        WHERE c.crm_item_id = ci.id
                    ) ELSE NULL END
                )
            ), '[]'::json)
            FROM crm_items ci
            LEFT JOIN profiles u ON u.id = ci.assigned_to
            WHERE ci.workspace_id = p_workspace_id
                AND (p_type IS NULL OR ci.type = p_type)
                AND (p_status IS NULL OR ci.status = p_status)
                AND (p_priority IS NULL OR ci.priority = p_priority)
                AND (p_assigned_to IS NULL OR ci.assigned_to = p_assigned_to)
                AND (p_search IS NULL OR 
                     ci.company ILIKE '%' || p_search || '%' OR
                     EXISTS (
                         SELECT 1 FROM contacts c 
                         WHERE c.crm_item_id = ci.id 
                         AND c.name ILIKE '%' || p_search || '%'
                     ))
            ORDER BY 
                CASE WHEN p_sort_by = 'company' AND p_sort_order = 'asc' THEN ci.company END ASC,
                CASE WHEN p_sort_by = 'company' AND p_sort_order = 'desc' THEN ci.company END DESC,
                CASE WHEN p_sort_by = 'status' AND p_sort_order = 'asc' THEN ci.status END ASC,
                CASE WHEN p_sort_by = 'status' AND p_sort_order = 'desc' THEN ci.status END DESC,
                CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'asc' THEN ci.priority END ASC,
                CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'desc' THEN ci.priority END DESC,
                CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN ci.created_at END ASC,
                CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN ci.created_at END DESC,
                CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'asc' THEN ci.updated_at END ASC,
                CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'desc' THEN ci.updated_at END DESC
            LIMIT p_page_size
            OFFSET v_offset
        ),
        'pagination', json_build_object(
            'page', p_page,
            'pageSize', p_page_size,
            'totalItems', v_total_count,
            'totalPages', CEIL(v_total_count::FLOAT / p_page_size),
            'hasNextPage', (p_page * p_page_size) < v_total_count,
            'hasPrevPage', p_page > 1
        ),
        'aggregations', CASE WHEN p_include_stats THEN
            json_build_object(
                'byStatus', (
                    SELECT COALESCE(json_object_agg(status, count), '{}'::json)
                    FROM (
                        SELECT status, COUNT(*) as count
                        FROM crm_items
                        WHERE workspace_id = p_workspace_id
                            AND (p_type IS NULL OR type = p_type)
                        GROUP BY status
                    ) s
                ),
                'byPriority', (
                    SELECT COALESCE(json_object_agg(priority, count), '{}'::json)
                    FROM (
                        SELECT priority, COUNT(*) as count
                        FROM crm_items
                        WHERE workspace_id = p_workspace_id
                            AND (p_type IS NULL OR type = p_type)
                        GROUP BY priority
                    ) p
                ),
                'byType', (
                    SELECT COALESCE(json_object_agg(type, count), '{}'::json)
                    FROM (
                        SELECT type, COUNT(*) as count
                        FROM crm_items
                        WHERE workspace_id = p_workspace_id
                        GROUP BY type
                    ) t
                ),
                'totalValue', (
                    SELECT COALESCE(SUM(COALESCE(check_size, 0) + COALESCE(deal_value, 0)), 0)
                    FROM crm_items
                    WHERE workspace_id = p_workspace_id
                        AND (p_type IS NULL OR type = p_type)
                ),
                'withContacts', (
                    SELECT COUNT(DISTINCT ci.id)
                    FROM crm_items ci
                    WHERE ci.workspace_id = p_workspace_id
                        AND (p_type IS NULL OR ci.type = p_type)
                        AND EXISTS (
                            SELECT 1 FROM contacts c 
                            WHERE c.crm_item_id = ci.id
                        )
                ),
                'overdueCount', (
                    SELECT COUNT(*)
                    FROM crm_items
                    WHERE workspace_id = p_workspace_id
                        AND (p_type IS NULL OR type = p_type)
                        AND next_action_date IS NOT NULL
                        AND next_action_date < CURRENT_DATE
                )
            )
        ELSE NULL END
    )
    INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_crm_items_paginated TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_items_workspace_type_status 
    ON crm_items(workspace_id, type, status);

CREATE INDEX IF NOT EXISTS idx_crm_items_workspace_assigned 
    ON crm_items(workspace_id, assigned_to) 
    WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_items_search 
    ON crm_items USING gin(to_tsvector('english', company));

CREATE INDEX IF NOT EXISTS idx_crm_items_next_action_date 
    ON crm_items(workspace_id, next_action_date) 
    WHERE next_action_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_crm_item 
    ON contacts(crm_item_id);

CREATE INDEX IF NOT EXISTS idx_contacts_search 
    ON contacts USING gin(to_tsvector('english', name));

-- Add comment
COMMENT ON FUNCTION get_crm_items_paginated IS 
'Paginated CRM items query with server-side filtering, sorting, and aggregations. 
Optimized for performance with large datasets (1000s of records).';
