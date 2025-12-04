-- ============================================================================
-- SERVER-SIDE AGGREGATION FUNCTIONS
-- ============================================================================
-- Date: 2025-12-03
-- Purpose: Move heavy fan-out queries to database functions
-- Benefits: Reduced client connections, better performance, response shaping
-- ============================================================================

-- ============================================================================
-- 1. DASHBOARD SUMMARY (replaces multiple client queries)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_summary(p_workspace_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Verify workspace access
    IF NOT is_workspace_member(p_workspace_id) THEN
        RAISE EXCEPTION 'Access denied to workspace';
    END IF;

    SELECT json_build_object(
        -- Task counts
        'tasks', json_build_object(
            'total', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id),
            'todo', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND status = 'To Do'),
            'inProgress', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND status = 'In Progress'),
            'done', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND status = 'Done'),
            'overdue', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND status != 'Done' AND due_date < CURRENT_DATE),
            'dueToday', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND status != 'Done' AND due_date = CURRENT_DATE),
            'dueThisWeek', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND status != 'Done' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')
        ),
        -- CRM counts by type
        'crm', json_build_object(
            'investors', (SELECT COUNT(*) FROM crm_items WHERE workspace_id = p_workspace_id AND type = 'investor'),
            'customers', (SELECT COUNT(*) FROM crm_items WHERE workspace_id = p_workspace_id AND type = 'customer'),
            'partners', (SELECT COUNT(*) FROM crm_items WHERE workspace_id = p_workspace_id AND type = 'partner'),
            'totalContacts', (SELECT COUNT(*) FROM contacts WHERE workspace_id = p_workspace_id),
            'overdueFollowups', (SELECT COUNT(*) FROM crm_items WHERE workspace_id = p_workspace_id AND next_action_date < CURRENT_DATE)
        ),
        -- Marketing summary
        'marketing', json_build_object(
            'activeCampaigns', (SELECT COUNT(*) FROM marketing_campaigns WHERE workspace_id = p_workspace_id AND status = 'active'),
            'pendingItems', (SELECT COUNT(*) FROM marketing_items WHERE workspace_id = p_workspace_id AND status = 'pending'),
            'inProgressItems', (SELECT COUNT(*) FROM marketing_items WHERE workspace_id = p_workspace_id AND status = 'in_progress')
        ),
        -- Documents
        'documents', json_build_object(
            'total', (SELECT COUNT(*) FROM documents WHERE workspace_id = p_workspace_id),
            'recentActivity', (SELECT COUNT(*) FROM document_activity WHERE workspace_id = p_workspace_id AND created_at > NOW() - INTERVAL '7 days')
        ),
        -- Huddle (if exists)
        'huddle', json_build_object(
            'activeRooms', (SELECT COUNT(*) FROM huddle_rooms WHERE workspace_id = p_workspace_id AND archived_at IS NULL),
            'unreadTotal', (
                SELECT COALESCE(SUM(unread_count), 0)
                FROM get_huddle_unread_counts(p_workspace_id)
            )
        ),
        -- Recent activity (last 24 hours)
        'recentActivity', json_build_object(
            'tasksCreated', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND created_at > NOW() - INTERVAL '24 hours'),
            'tasksCompleted', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND status = 'Done' AND updated_at > NOW() - INTERVAL '24 hours'),
            'crmItemsCreated', (SELECT COUNT(*) FROM crm_items WHERE workspace_id = p_workspace_id AND created_at > NOW() - INTERVAL '24 hours'),
            'documentsEdited', (SELECT COUNT(DISTINCT document_id) FROM document_activity WHERE workspace_id = p_workspace_id AND created_at > NOW() - INTERVAL '24 hours')
        ),
        'generatedAt', NOW()
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_summary TO authenticated;

-- ============================================================================
-- 2. CRM OVERVIEW (pipeline + recent activity)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_crm_overview(
    p_workspace_id UUID,
    p_type TEXT DEFAULT NULL  -- 'investor', 'customer', 'partner', or NULL for all
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_workspace_member(p_workspace_id) THEN
        RAISE EXCEPTION 'Access denied to workspace';
    END IF;

    RETURN json_build_object(
        -- Pipeline stages
        'pipeline', (
            SELECT json_object_agg(stage, count)
            FROM (
                SELECT COALESCE(stage, 'No Stage') as stage, COUNT(*) as count
                FROM crm_items
                WHERE workspace_id = p_workspace_id
                    AND (p_type IS NULL OR type = p_type)
                GROUP BY stage
            ) s
        ),
        -- Priority distribution
        'byPriority', (
            SELECT json_object_agg(priority, count)
            FROM (
                SELECT COALESCE(priority, 'none') as priority, COUNT(*) as count
                FROM crm_items
                WHERE workspace_id = p_workspace_id
                    AND (p_type IS NULL OR type = p_type)
                GROUP BY priority
            ) p
        ),
        -- Value metrics
        'metrics', json_build_object(
            'totalItems', (SELECT COUNT(*) FROM crm_items WHERE workspace_id = p_workspace_id AND (p_type IS NULL OR type = p_type)),
            'totalContacts', (
                SELECT COUNT(*)
                FROM contacts c
                JOIN crm_items ci ON c.crm_item_id = ci.id
                WHERE ci.workspace_id = p_workspace_id
                    AND (p_type IS NULL OR ci.type = p_type)
            ),
            'totalValue', (
                SELECT COALESCE(SUM(COALESCE(check_size, 0) + COALESCE(deal_value, 0)), 0)
                FROM crm_items
                WHERE workspace_id = p_workspace_id
                    AND (p_type IS NULL OR type = p_type)
            ),
            'overdueCount', (
                SELECT COUNT(*)
                FROM crm_items
                WHERE workspace_id = p_workspace_id
                    AND (p_type IS NULL OR type = p_type)
                    AND next_action_date < CURRENT_DATE
            ),
            'upcomingActions', (
                SELECT COUNT(*)
                FROM crm_items
                WHERE workspace_id = p_workspace_id
                    AND (p_type IS NULL OR type = p_type)
                    AND next_action_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
            )
        ),
        -- Recent items (top 5)
        'recentItems', (
            SELECT COALESCE(json_agg(item ORDER BY created_at DESC), '[]'::json)
            FROM (
                SELECT json_build_object(
                    'id', id,
                    'company', company,
                    'type', type,
                    'stage', stage,
                    'createdAt', created_at
                ) as item, created_at
                FROM crm_items
                WHERE workspace_id = p_workspace_id
                    AND (p_type IS NULL OR type = p_type)
                ORDER BY created_at DESC
                LIMIT 5
            ) r
        ),
        -- Assignment distribution
        'byAssignment', (
            SELECT COALESCE(json_agg(json_build_object(
                'userId', user_id,
                'userName', full_name,
                'count', count
            )), '[]'::json)
            FROM (
                SELECT ci.assigned_to as user_id, p.full_name, COUNT(*) as count
                FROM crm_items ci
                LEFT JOIN profiles p ON ci.assigned_to = p.id
                WHERE ci.workspace_id = p_workspace_id
                    AND (p_type IS NULL OR ci.type = p_type)
                    AND ci.assigned_to IS NOT NULL
                GROUP BY ci.assigned_to, p.full_name
                ORDER BY count DESC
                LIMIT 10
            ) a
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_crm_overview TO authenticated;

-- ============================================================================
-- 3. TASK SUMMARY BY CATEGORY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_task_summary(
    p_workspace_id UUID,
    p_user_id UUID DEFAULT NULL  -- Filter by assigned user, or NULL for all
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_workspace_member(p_workspace_id) THEN
        RAISE EXCEPTION 'Access denied to workspace';
    END IF;

    RETURN json_build_object(
        -- By status
        'byStatus', (
            SELECT json_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*) as count
                FROM tasks
                WHERE workspace_id = p_workspace_id
                    AND (p_user_id IS NULL OR assigned_to = p_user_id)
                GROUP BY status
            ) s
        ),
        -- By category
        'byCategory', (
            SELECT json_object_agg(category, count)
            FROM (
                SELECT COALESCE(category, 'General') as category, COUNT(*) as count
                FROM tasks
                WHERE workspace_id = p_workspace_id
                    AND (p_user_id IS NULL OR assigned_to = p_user_id)
                GROUP BY category
            ) c
        ),
        -- By priority
        'byPriority', (
            SELECT json_object_agg(priority, count)
            FROM (
                SELECT COALESCE(priority, 'none') as priority, COUNT(*) as count
                FROM tasks
                WHERE workspace_id = p_workspace_id
                    AND (p_user_id IS NULL OR assigned_to = p_user_id)
                GROUP BY priority
            ) p
        ),
        -- Due date breakdown
        'dueDates', json_build_object(
            'overdue', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND (p_user_id IS NULL OR assigned_to = p_user_id) AND status != 'Done' AND due_date < CURRENT_DATE),
            'today', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND (p_user_id IS NULL OR assigned_to = p_user_id) AND status != 'Done' AND due_date = CURRENT_DATE),
            'thisWeek', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND (p_user_id IS NULL OR assigned_to = p_user_id) AND status != 'Done' AND due_date BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 7),
            'later', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND (p_user_id IS NULL OR assigned_to = p_user_id) AND status != 'Done' AND due_date > CURRENT_DATE + 7),
            'noDueDate', (SELECT COUNT(*) FROM tasks WHERE workspace_id = p_workspace_id AND (p_user_id IS NULL OR assigned_to = p_user_id) AND status != 'Done' AND due_date IS NULL)
        ),
        -- Completion trend (last 7 days)
        'completionTrend', (
            SELECT COALESCE(json_agg(json_build_object(
                'date', date,
                'completed', completed
            ) ORDER BY date), '[]'::json)
            FROM (
                SELECT DATE(updated_at) as date, COUNT(*) as completed
                FROM tasks
                WHERE workspace_id = p_workspace_id
                    AND (p_user_id IS NULL OR assigned_to = p_user_id)
                    AND status = 'Done'
                    AND updated_at > NOW() - INTERVAL '7 days'
                GROUP BY DATE(updated_at)
            ) t
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_task_summary TO authenticated;

-- ============================================================================
-- 4. OPTIMIZED UNREAD COUNTS (single query, not per-room)
-- ============================================================================

-- Enhanced version that also returns room metadata for sidebar
CREATE OR REPLACE FUNCTION get_huddle_sidebar_data(p_workspace_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN json_build_object(
        'rooms', (
            SELECT COALESCE(json_agg(room ORDER BY last_message_at DESC NULLS LAST), '[]'::json)
            FROM (
                SELECT json_build_object(
                    'id', r.id,
                    'type', r.type,
                    'name', r.name,
                    'slug', r.slug,
                    'isPrivate', r.is_private,
                    'lastMessageAt', r.last_message_at,
                    'unreadCount', COALESCE(
                        (SELECT COUNT(*)
                         FROM huddle_messages m
                         LEFT JOIN huddle_reads rd ON rd.room_id = r.id AND rd.user_id = auth.uid()
                         WHERE m.room_id = r.id
                           AND m.deleted_at IS NULL
                           AND (rd.last_read_at IS NULL OR m.created_at > rd.last_read_at)
                        ), 0
                    ),
                    'memberCount', (SELECT COUNT(*) FROM huddle_members WHERE room_id = r.id),
                    'lastMessage', (
                        SELECT json_build_object(
                            'body', SUBSTRING(m.body, 1, 100),
                            'isAi', m.is_ai,
                            'createdAt', m.created_at,
                            'userName', COALESCE(p.full_name, 'AI')
                        )
                        FROM huddle_messages m
                        LEFT JOIN profiles p ON m.user_id = p.id
                        WHERE m.room_id = r.id AND m.deleted_at IS NULL
                        ORDER BY m.created_at DESC
                        LIMIT 1
                    )
                ) as room, r.last_message_at
                FROM huddle_rooms r
                WHERE r.workspace_id = p_workspace_id
                    AND r.archived_at IS NULL
                    AND can_access_huddle_room(r.id)
                ORDER BY r.last_message_at DESC NULLS LAST
                LIMIT 50
            ) rooms
        ),
        'totalUnread', (
            SELECT COALESCE(SUM(unread_count), 0)
            FROM get_huddle_unread_counts(p_workspace_id)
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_huddle_sidebar_data TO authenticated;

-- ============================================================================
-- 5. DOCUMENT LIBRARY SUMMARY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_document_library_summary(p_workspace_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_workspace_member(p_workspace_id) THEN
        RAISE EXCEPTION 'Access denied to workspace';
    END IF;

    RETURN json_build_object(
        -- By module
        'byModule', (
            SELECT COALESCE(json_object_agg(module, count), '{}'::json)
            FROM (
                SELECT COALESCE(module, 'general') as module, COUNT(*) as count
                FROM documents
                WHERE workspace_id = p_workspace_id
                GROUP BY module
            ) m
        ),
        -- Total count
        'totalDocuments', (SELECT COUNT(*) FROM documents WHERE workspace_id = p_workspace_id),
        -- Recent documents
        'recentDocuments', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', id,
                'title', title,
                'module', module,
                'updatedAt', updated_at,
                'createdBy', created_by
            ) ORDER BY updated_at DESC), '[]'::json)
            FROM (
                SELECT id, title, module, updated_at, created_by
                FROM documents
                WHERE workspace_id = p_workspace_id
                ORDER BY updated_at DESC
                LIMIT 10
            ) d
        ),
        -- Top contributors (last 30 days)
        'topContributors', (
            SELECT COALESCE(json_agg(json_build_object(
                'userId', user_id,
                'userName', user_name,
                'editCount', edit_count
            ) ORDER BY edit_count DESC), '[]'::json)
            FROM (
                SELECT da.user_id, da.user_name, COUNT(*) as edit_count
                FROM document_activity da
                WHERE da.workspace_id = p_workspace_id
                    AND da.created_at > NOW() - INTERVAL '30 days'
                    AND da.action IN ('created', 'updated')
                GROUP BY da.user_id, da.user_name
                ORDER BY edit_count DESC
                LIMIT 5
            ) c
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_document_library_summary TO authenticated;

-- ============================================================================
-- 6. CURSOR-BASED MESSAGE PAGINATION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_messages_cursor(
    p_room_id UUID,
    p_cursor UUID DEFAULT NULL,  -- Message ID to paginate from
    p_limit INT DEFAULT 50,
    p_direction TEXT DEFAULT 'before'  -- 'before' or 'after'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cursor_time TIMESTAMPTZ;
BEGIN
    -- Verify access
    IF NOT can_access_huddle_room(p_room_id) THEN
        RAISE EXCEPTION 'Access denied to room';
    END IF;

    -- Get cursor timestamp if provided
    IF p_cursor IS NOT NULL THEN
        SELECT created_at INTO v_cursor_time
        FROM huddle_messages
        WHERE id = p_cursor;
    END IF;

    RETURN json_build_object(
        'messages', (
            SELECT COALESCE(json_agg(msg), '[]'::json)
            FROM (
                SELECT json_build_object(
                    'id', m.id,
                    'roomId', m.room_id,
                    'userId', m.user_id,
                    'body', m.body,
                    'bodyFormat', m.body_format,
                    'threadRootId', m.thread_root_id,
                    'replyCount', m.reply_count,
                    'metadata', m.metadata,
                    'attachments', m.attachments,
                    'isSystem', m.is_system,
                    'isAi', m.is_ai,
                    'isPinned', m.is_pinned,
                    'createdAt', m.created_at,
                    'editedAt', m.edited_at,
                    'user', CASE WHEN m.user_id IS NOT NULL THEN json_build_object(
                        'id', p.id,
                        'fullName', p.full_name,
                        'avatarUrl', p.avatar_url
                    ) ELSE NULL END,
                    'reactions', (
                        SELECT COALESCE(json_agg(json_build_object(
                            'emoji', r.emoji,
                            'userId', r.user_id,
                            'userName', rp.full_name
                        )), '[]'::json)
                        FROM huddle_message_reactions r
                        LEFT JOIN profiles rp ON r.user_id = rp.id
                        WHERE r.message_id = m.id
                    )
                ) as msg
                FROM huddle_messages m
                LEFT JOIN profiles p ON m.user_id = p.id
                WHERE m.room_id = p_room_id
                    AND m.deleted_at IS NULL
                    AND m.thread_root_id IS NULL  -- Main timeline only
                    AND (
                        p_cursor IS NULL
                        OR (p_direction = 'before' AND m.created_at < v_cursor_time)
                        OR (p_direction = 'after' AND m.created_at > v_cursor_time)
                    )
                ORDER BY 
                    CASE WHEN p_direction = 'before' THEN m.created_at END DESC,
                    CASE WHEN p_direction = 'after' THEN m.created_at END ASC
                LIMIT p_limit
            ) sub
        ),
        'hasMore', (
            SELECT EXISTS (
                SELECT 1 FROM huddle_messages m
                WHERE m.room_id = p_room_id
                    AND m.deleted_at IS NULL
                    AND m.thread_root_id IS NULL
                    AND (
                        p_cursor IS NULL
                        OR (p_direction = 'before' AND m.created_at < v_cursor_time)
                        OR (p_direction = 'after' AND m.created_at > v_cursor_time)
                    )
                OFFSET p_limit
            )
        ),
        'cursor', (
            SELECT id FROM huddle_messages
            WHERE room_id = p_room_id AND deleted_at IS NULL AND thread_root_id IS NULL
            ORDER BY 
                CASE WHEN p_direction = 'before' THEN created_at END DESC,
                CASE WHEN p_direction = 'after' THEN created_at END ASC
            LIMIT 1 OFFSET p_limit - 1
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_messages_cursor TO authenticated;

-- ============================================================================
-- 7. ATOMIC DM ROOM CREATION (race-condition safe)
-- ============================================================================

-- Drop existing function if it has different signature
DROP FUNCTION IF EXISTS get_or_create_dm_room(UUID, UUID[]);

-- NOTE: This function is defined in 20251203_huddle_dm_room_rpc.sql
-- which uses the dm_member_ids column for indexed lookups.
-- DO NOT redefine here to avoid breaking the unique index.
-- 
-- If you need to modify the DM creation logic, update the function in
-- 20251203_huddle_dm_room_rpc.sql instead.

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_dashboard_summary IS 
'Server-side aggregation of dashboard metrics. Replaces 10+ client queries with 1 RPC call.';

COMMENT ON FUNCTION get_crm_overview IS 
'CRM pipeline and metrics summary. Supports filtering by type for focused views.';

COMMENT ON FUNCTION get_task_summary IS 
'Task breakdown by status, category, priority, and due dates.';

COMMENT ON FUNCTION get_huddle_sidebar_data IS 
'Complete sidebar data including rooms with unread counts and last messages.';

COMMENT ON FUNCTION get_messages_cursor IS 
'Cursor-based pagination for chat messages. More efficient than offset pagination for large datasets.';

COMMENT ON FUNCTION get_or_create_dm_room(UUID, UUID[], UUID) IS 
'Atomic DM room creation with advisory locking to prevent race conditions.';
