-- Creates or updates a dedicated workspace for automated testing.
-- Assumes the emails from create_test_users.sql already exist.

DO $$
DECLARE
  owner_email text := 'test-owner@example.com';
  member_email text := 'test-member@example.com';
  workspace_label text := 'Playwright Test Workspace';
  owner_user_id uuid;
  member_user_id uuid;
  target_workspace_id uuid;
  has_plan_type boolean := FALSE;
  has_seat_count boolean := FALSE;
  has_ai_usage_count boolean := FALSE;
  has_ai_usage_reset_date boolean := FALSE;
  has_storage_bytes_used boolean := FALSE;
  has_file_count boolean := FALSE;
  has_team_xp boolean := FALSE;
  has_team_level boolean := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'plan_type'
  ) INTO has_plan_type;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'seat_count'
  ) INTO has_seat_count;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'ai_usage_count'
  ) INTO has_ai_usage_count;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'ai_usage_reset_date'
  ) INTO has_ai_usage_reset_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'storage_bytes_used'
  ) INTO has_storage_bytes_used;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'file_count'
  ) INTO has_file_count;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'team_xp'
  ) INTO has_team_xp;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'team_level'
  ) INTO has_team_level;

  SELECT id INTO owner_user_id FROM auth.users WHERE email = owner_email;
  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Owner user % not found. Run create_test_users.sql first.', owner_email;
  END IF;

  SELECT id INTO member_user_id FROM auth.users WHERE email = member_email;
  IF member_user_id IS NULL THEN
    RAISE EXCEPTION 'Member user % not found. Run create_test_users.sql first.', member_email;
  END IF;

  SELECT id INTO target_workspace_id FROM workspaces WHERE name = workspace_label LIMIT 1;

  IF target_workspace_id IS NULL THEN
    target_workspace_id := gen_random_uuid();
    INSERT INTO workspaces (id, name, owner_id)
    VALUES (target_workspace_id, workspace_label, owner_user_id);
  ELSE
    UPDATE workspaces
    SET owner_id = owner_user_id
    WHERE id = target_workspace_id;
  END IF;

  IF has_plan_type THEN
    UPDATE workspaces
    SET plan_type = 'team-pro'
    WHERE id = target_workspace_id;
  END IF;

  IF has_seat_count THEN
    UPDATE workspaces
    SET seat_count = GREATEST(COALESCE(seat_count, 0), 5)
    WHERE id = target_workspace_id;
  END IF;

  IF has_ai_usage_count THEN
    UPDATE workspaces
    SET ai_usage_count = COALESCE(ai_usage_count, 0)
    WHERE id = target_workspace_id;
  END IF;

  IF has_ai_usage_reset_date THEN
    UPDATE workspaces
    SET ai_usage_reset_date = COALESCE(ai_usage_reset_date, NOW())
    WHERE id = target_workspace_id;
  END IF;

  IF has_storage_bytes_used THEN
    UPDATE workspaces
    SET storage_bytes_used = COALESCE(storage_bytes_used, 0)
    WHERE id = target_workspace_id;
  END IF;

  IF has_file_count THEN
    UPDATE workspaces
    SET file_count = COALESCE(file_count, 0)
    WHERE id = target_workspace_id;
  END IF;

  IF has_team_xp THEN
    UPDATE workspaces
    SET team_xp = COALESCE(team_xp, 0)
    WHERE id = target_workspace_id;
  END IF;

  IF has_team_level THEN
    UPDATE workspaces
    SET team_level = GREATEST(COALESCE(team_level, 1), 1)
    WHERE id = target_workspace_id;
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (target_workspace_id, owner_user_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (target_workspace_id, member_user_id, 'member')
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  RAISE NOTICE 'Workspace % is ready (id=%). Owner: %, Member: %', workspace_label, target_workspace_id, owner_email, member_email;
END $$;
