/**
 * RLS Tests for Activity Log Table
 * Verifies Row-Level Security policies for activity logging access control
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createAuthenticatedClient,
  createAnonymousClient,
  TEST_USERS,
  cleanupTestData,
} from './setup';

describe('Activity Log RLS Policies', () => {
  let ownerClient: SupabaseClient;
  let memberClient: SupabaseClient;
  let nonMemberClient: SupabaseClient;
  let anonymousClient: SupabaseClient;
  let testWorkspaceId: string;
  let ownerUserId: string;
  let memberUserId: string;

  beforeAll(async () => {
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

    // Get user IDs
    const { data: ownerData } = await ownerClient.auth.getUser();
    const { data: memberData } = await memberClient.auth.getUser();
    ownerUserId = ownerData.user?.id || '';
    memberUserId = memberData.user?.id || '';

    // Create test workspace
    const { data: workspace, error: workspaceError } = await ownerClient
      .from('workspaces')
      .insert({
        name: 'Activity Log RLS Test Workspace',
        plan_type: 'free',
      })
      .select()
      .single();

    if (workspaceError) throw workspaceError;
    testWorkspaceId = workspace.id;

    // Add member to workspace
    await ownerClient.from('workspace_members').insert({
      workspace_id: testWorkspaceId,
      user_id: memberUserId,
      role: 'member',
    });
  });

  afterAll(async () => {
    if (testWorkspaceId) {
      await cleanupTestData(ownerClient, testWorkspaceId);
    }
  });

  describe('INSERT - Creating Activity Logs', () => {
    it('should allow workspace owner to create activity logs', async () => {
      const { data, error } = await ownerClient
        .from('activity_log')
        .insert({
          workspace_id: testWorkspaceId,
          user_id: ownerUserId,
          action: 'created',
          entity_type: 'task',
          entity_id: '00000000-0000-0000-0000-000000000000',
          details: 'Owner created a task',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.action).toBe('created');
    });

    it('should allow workspace member to create activity logs', async () => {
      const { data, error } = await memberClient
        .from('activity_log')
        .insert({
          workspace_id: testWorkspaceId,
          user_id: memberUserId,
          action: 'updated',
          entity_type: 'marketing_item',
          entity_id: '00000000-0000-0000-0000-000000000000',
          details: 'Member updated a marketing item',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.action).toBe('updated');
    });

    it('should deny non-member from creating activity logs', async () => {
      const { data: nonMemberData } = await nonMemberClient.auth.getUser();
      
      const { data, error } = await nonMemberClient
        .from('activity_log')
        .insert({
          workspace_id: testWorkspaceId,
          user_id: nonMemberData.user?.id,
          action: 'deleted',
          entity_type: 'task',
          entity_id: '00000000-0000-0000-0000-000000000000',
          details: 'Non-member tried to log activity',
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should deny anonymous users from creating activity logs', async () => {
      const { data, error } = await anonymousClient
        .from('activity_log')
        .insert({
          workspace_id: testWorkspaceId,
          action: 'viewed',
          entity_type: 'task',
          entity_id: '00000000-0000-0000-0000-000000000000',
          details: 'Anonymous tried to log activity',
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('SELECT - Reading Activity Logs', () => {
    it('should allow workspace owner to view all activity logs', async () => {
      const { data, error } = await ownerClient
        .from('activity_log')
        .select('*')
        .eq('workspace_id', testWorkspaceId)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('should allow workspace member to view activity logs', async () => {
      const { data, error } = await memberClient
        .from('activity_log')
        .select('*')
        .eq('workspace_id', testWorkspaceId)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('should deny non-member from viewing activity logs', async () => {
      const { data, error } = await nonMemberClient
        .from('activity_log')
        .select('*')
        .eq('workspace_id', testWorkspaceId);

      expect(error).toBeNull();
      expect(data?.length).toBe(0); // RLS filters out results
    });

    it('should deny anonymous users from viewing activity logs', async () => {
      const { data, error } = await anonymousClient
        .from('activity_log')
        .select('*')
        .eq('workspace_id', testWorkspaceId);

      expect(error).toBeNull();
      expect(data?.length).toBe(0);
    });
  });

  describe('Activity Log Integrity', () => {
    it('should not allow updating activity logs (audit trail protection)', async () => {
      // First create a log entry
      const { data: logEntry } = await ownerClient
        .from('activity_log')
        .insert({
          workspace_id: testWorkspaceId,
          user_id: ownerUserId,
          action: 'created',
          entity_type: 'task',
          entity_id: '00000000-0000-0000-0000-000000000000',
          details: 'Original details',
        })
        .select()
        .single();

      // Try to update it (should fail if UPDATE policy doesn't exist)
      const { data, error } = await ownerClient
        .from('activity_log')
        .update({ details: 'Modified details' })
        .eq('id', logEntry?.id)
        .select()
        .single();

      // Activity logs should be immutable - either error or no rows affected
      if (!error) {
        expect(data).toBeNull();
      }
    });

    it('should not allow deleting activity logs (audit trail protection)', async () => {
      const { data: logEntry } = await ownerClient
        .from('activity_log')
        .insert({
          workspace_id: testWorkspaceId,
          user_id: ownerUserId,
          action: 'deleted',
          entity_type: 'marketing_item',
          entity_id: '00000000-0000-0000-0000-000000000000',
          details: 'Activity to delete',
        })
        .select()
        .single();

      // Try to delete it (should fail if DELETE policy doesn't exist)
      const { error } = await ownerClient
        .from('activity_log')
        .delete()
        .eq('id', logEntry?.id);

      // Activity logs should not be deletable
      if (!error) {
        // Verify it still exists
        const { data } = await ownerClient
          .from('activity_log')
          .select('*')
          .eq('id', logEntry?.id);
        
        expect(data?.length).toBeGreaterThan(0);
      }
    });
  });
});
