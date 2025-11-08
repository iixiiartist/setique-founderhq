/**
 * RLS Tests for Tasks Table
 * Verifies that Row-Level Security policies correctly enforce access control
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createAuthenticatedClient,
  createAnonymousClient,
  TEST_USERS,
  cleanupTestData,
} from './setup';

describe('Tasks RLS Policies', () => {
  let ownerClient: SupabaseClient;
  let memberClient: SupabaseClient;
  let nonMemberClient: SupabaseClient;
  let anonymousClient: SupabaseClient;
  let testWorkspaceId: string;
  let testTaskId: string;

  beforeAll(async () => {
    // Setup authenticated clients
    ownerClient = await createAuthenticatedClient(
      TEST_USERS.owner.email,
      TEST_USERS.owner.password
    );
    memberClient = await createAuthenticatedClient(
      TEST_USERS.member.email,
      TEST_USERS.member.password
    );
    nonMemberClient = await createAuthenticatedClient(
      TEST_USERS.nonMember.email,
      TEST_USERS.nonMember.password
    );
    anonymousClient = createAnonymousClient();

    // Create test workspace as owner
    const { data: workspace, error: workspaceError } = await ownerClient
      .from('workspaces')
      .insert({
        name: 'RLS Test Workspace',
        plan_type: 'free',
      })
      .select()
      .single();

    if (workspaceError) throw workspaceError;
    testWorkspaceId = workspace.id;
    TEST_USERS.owner.workspaceId = workspace.id;
    TEST_USERS.member.workspaceId = workspace.id;

    // Add member to workspace
    const { data: memberData } = await memberClient.auth.getUser();
    await ownerClient.from('workspace_members').insert({
      workspace_id: testWorkspaceId,
      user_id: memberData.user?.id,
      role: 'member',
    });
  });

  afterAll(async () => {
    if (testWorkspaceId) {
      await cleanupTestData(ownerClient, testWorkspaceId);
    }
  });

  describe('INSERT - Creating Tasks', () => {
    it('should allow workspace owner to create tasks', async () => {
      const { data, error } = await ownerClient
        .from('tasks')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Owner Task',
          status: 'pending',
          priority: 'medium',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.title).toBe('Owner Task');
      testTaskId = data?.id;
    });

    it('should allow workspace member to create tasks', async () => {
      const { data, error } = await memberClient
        .from('tasks')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Member Task',
          status: 'pending',
          priority: 'medium',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.title).toBe('Member Task');
    });

    it('should deny non-member from creating tasks', async () => {
      const { data, error } = await nonMemberClient
        .from('tasks')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Non-Member Task',
          status: 'pending',
          priority: 'medium',
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toContain('violates row-level security policy');
      expect(data).toBeNull();
    });

    it('should deny anonymous users from creating tasks', async () => {
      const { data, error } = await anonymousClient
        .from('tasks')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Anonymous Task',
          status: 'pending',
          priority: 'medium',
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('SELECT - Reading Tasks', () => {
    it('should allow workspace owner to view all tasks', async () => {
      const { data, error } = await ownerClient
        .from('tasks')
        .select('*')
        .eq('workspace_id', testWorkspaceId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('should allow workspace member to view all tasks', async () => {
      const { data, error } = await memberClient
        .from('tasks')
        .select('*')
        .eq('workspace_id', testWorkspaceId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('should deny non-member from viewing tasks', async () => {
      const { data, error } = await nonMemberClient
        .from('tasks')
        .select('*')
        .eq('workspace_id', testWorkspaceId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(0); // RLS filters out results
    });

    it('should deny anonymous users from viewing tasks', async () => {
      const { data, error } = await anonymousClient
        .from('tasks')
        .select('*')
        .eq('workspace_id', testWorkspaceId);

      expect(error).toBeNull();
      expect(data?.length).toBe(0);
    });
  });

  describe('UPDATE - Modifying Tasks', () => {
    it('should allow workspace owner to update any task', async () => {
      const { data, error } = await ownerClient
        .from('tasks')
        .update({ title: 'Updated by Owner' })
        .eq('id', testTaskId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe('Updated by Owner');
    });

    it('should allow member to update their own tasks', async () => {
      // Get member's user ID
      const { data: memberData } = await memberClient.auth.getUser();
      
      // Create a task as member
      const { data: memberTask } = await memberClient
        .from('tasks')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Member Own Task',
          status: 'pending',
          priority: 'medium',
          user_id: memberData.user?.id,
        })
        .select()
        .single();

      // Update their own task
      const { data, error } = await memberClient
        .from('tasks')
        .update({ title: 'Updated by Member' })
        .eq('id', memberTask?.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe('Updated by Member');
    });

    it('should deny non-member from updating tasks', async () => {
      const { data, error } = await nonMemberClient
        .from('tasks')
        .update({ title: 'Updated by Non-Member' })
        .eq('id', testTaskId)
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('DELETE - Removing Tasks', () => {
    it('should allow workspace owner to delete any task', async () => {
      // Create a task to delete
      const { data: taskToDelete } = await ownerClient
        .from('tasks')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Task to Delete',
          status: 'pending',
          priority: 'low',
        })
        .select()
        .single();

      const { error } = await ownerClient
        .from('tasks')
        .delete()
        .eq('id', taskToDelete?.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data: checkData } = await ownerClient
        .from('tasks')
        .select('*')
        .eq('id', taskToDelete?.id);

      expect(checkData?.length).toBe(0);
    });

    it('should allow member to delete their own tasks', async () => {
      const { data: memberData } = await memberClient.auth.getUser();
      
      const { data: taskToDelete } = await memberClient
        .from('tasks')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Member Task to Delete',
          status: 'pending',
          priority: 'low',
          user_id: memberData.user?.id,
        })
        .select()
        .single();

      const { error } = await memberClient
        .from('tasks')
        .delete()
        .eq('id', taskToDelete?.id);

      expect(error).toBeNull();
    });

    it('should deny non-member from deleting tasks', async () => {
      const { error } = await nonMemberClient
        .from('tasks')
        .delete()
        .eq('id', testTaskId);

      expect(error).toBeDefined();
    });
  });
});
