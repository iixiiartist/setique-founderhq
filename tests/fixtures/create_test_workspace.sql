-- Creates or updates a dedicated workspace for automated testing.
-- Assumes the emails from create_test_users.sql already exist.

DO $$
DECLARE
  owner_email text := 'test-owner@example.com';
  member_email text := 'test-member@example.com';
  workspace_label text := 'Playwright Test Workspace';
  owner_user_id uuid;
  member_user_id uuid;
  workspace_id uuid;
BEGIN
  SELECT id INTO owner_user_id FROM auth.users WHERE email = owner_email;
  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Owner user % not found. Run create_test_users.sql first.', owner_email;
  END IF;

  SELECT id INTO member_user_id FROM auth.users WHERE email = member_email;
  IF member_user_id IS NULL THEN
    RAISE EXCEPTION 'Member user % not found. Run create_test_users.sql first.', member_email;
  END IF;

  SELECT id INTO workspace_id FROM workspaces WHERE name = workspace_label LIMIT 1;

  IF workspace_id IS NULL THEN
    workspace_id := gen_random_uuid();
    INSERT INTO workspaces (
      id,
      name,
      owner_id,
      plan_type,
      seat_count,
      ai_usage_count,
      ai_usage_reset_date,
      storage_bytes_used,
      file_count,
      team_xp,
      team_level
    ) VALUES (
      workspace_id,
      workspace_label,
      owner_user_id,
      'team-pro',
      5,
      0,
      NOW(),
      0,
      0,
      0,
      1
    );
  ELSE
    UPDATE workspaces
    SET 
      owner_id = owner_user_id,
      plan_type = 'team-pro',
      seat_count = GREATEST(seat_count, 5)
    WHERE id = workspace_id;
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (workspace_id, owner_user_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (workspace_id, member_user_id, 'member')
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  RAISE NOTICE 'Workspace % is ready (id=%). Owner: %, Member: %', workspace_label, workspace_id, owner_email, member_email;
END $$;
