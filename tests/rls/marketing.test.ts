/**
 * RLS Tests for Marketing Items Table
 * Verifies Row-Level Security policies for marketing item access control
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createAuthenticatedClient,
  createAnonymousClient,
  TEST_USERS,
  cleanupTestData,
} from './setup';

describe('Marketing Items RLS Policies', () => {
  let ownerClient: SupabaseClient;
  let memberClient: SupabaseClient;
  let nonMemberClient: SupabaseClient;
  let anonymousClient: SupabaseClient;
  let testWorkspaceId: string;
  let testMarketingItemId: string;

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

    // Create test workspace
    const { data: workspace, error: workspaceError } = await ownerClient
      .from('workspaces')
      .insert({
        name: 'Marketing RLS Test Workspace',
        plan_type: 'free',
      })
      .select()
      .single();

    if (workspaceError) throw workspaceError;
    testWorkspaceId = workspace.id;

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

  describe('INSERT - Creating Marketing Items', () => {
    it('should allow workspace owner to create marketing items', async () => {
      const { data, error } = await ownerClient
        .from('marketing_items')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Owner Marketing Item',
          description: 'Test description',
          status: 'draft',
          type: 'social_post',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.title).toBe('Owner Marketing Item');
      testMarketingItemId = data?.id;
    });

    it('should allow workspace member to create marketing items', async () => {
      const { data, error } = await memberClient
        .from('marketing_items')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Member Marketing Item',
          description: 'Test description',
          status: 'draft',
          type: 'blog_post',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.title).toBe('Member Marketing Item');
    });

    it('should deny non-member from creating marketing items', async () => {
      const { data, error } = await nonMemberClient
        .from('marketing_items')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Non-Member Marketing Item',
          description: 'Test description',
          status: 'draft',
          type: 'email',
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should deny anonymous users from creating marketing items', async () => {
      const { data, error } = await anonymousClient
        .from('marketing_items')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Anonymous Marketing Item',
          description: 'Test description',
          status: 'draft',
          type: 'ad',
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('SELECT - Reading Marketing Items', () => {
    it('should allow workspace owner to view all marketing items', async () => {
      const { data, error } = await ownerClient
        .from('marketing_items')
        .select('*')
        .eq('workspace_id', testWorkspaceId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('should allow workspace member to view all marketing items', async () => {
      const { data, error } = await memberClient
        .from('marketing_items')
        .select('*')
        .eq('workspace_id', testWorkspaceId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('should deny non-member from viewing marketing items', async () => {
      const { data, error } = await nonMemberClient
        .from('marketing_items')
        .select('*')
        .eq('workspace_id', testWorkspaceId);

      expect(error).toBeNull();
      expect(data?.length).toBe(0);
    });

    it('should deny anonymous users from viewing marketing items', async () => {
      const { data, error } = await anonymousClient
        .from('marketing_items')
        .select('*')
        .eq('workspace_id', testWorkspaceId);

      expect(error).toBeNull();
      expect(data?.length).toBe(0);
    });
  });

  describe('UPDATE - Modifying Marketing Items', () => {
    it('should allow workspace owner to update any marketing item', async () => {
      const { data, error } = await ownerClient
        .from('marketing_items')
        .update({ 
          title: 'Updated by Owner',
          status: 'published',
        })
        .eq('id', testMarketingItemId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe('Updated by Owner');
      expect(data?.status).toBe('published');
    });

    it('should allow workspace member to update marketing items', async () => {
      const { data, error } = await memberClient
        .from('marketing_items')
        .update({ 
          title: 'Updated by Member',
          status: 'in_progress',
        })
        .eq('id', testMarketingItemId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe('Updated by Member');
    });

    it('should deny non-member from updating marketing items', async () => {
      const { data, error } = await nonMemberClient
        .from('marketing_items')
        .update({ title: 'Updated by Non-Member' })
        .eq('id', testMarketingItemId)
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('DELETE - Removing Marketing Items', () => {
    it('should allow workspace owner to delete any marketing item', async () => {
      const { data: itemToDelete } = await ownerClient
        .from('marketing_items')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Item to Delete',
          description: 'Test',
          status: 'draft',
          type: 'social_post',
        })
        .select()
        .single();

      const { error } = await ownerClient
        .from('marketing_items')
        .delete()
        .eq('id', itemToDelete?.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data: checkData } = await ownerClient
        .from('marketing_items')
        .select('*')
        .eq('id', itemToDelete?.id);

      expect(checkData?.length).toBe(0);
    });

    it('should allow workspace member to delete marketing items', async () => {
      const { data: itemToDelete } = await memberClient
        .from('marketing_items')
        .insert({
          workspace_id: testWorkspaceId,
          title: 'Member Item to Delete',
          description: 'Test',
          status: 'draft',
          type: 'blog_post',
        })
        .select()
        .single();

      const { error } = await memberClient
        .from('marketing_items')
        .delete()
        .eq('id', itemToDelete?.id);

      expect(error).toBeNull();
    });

    it('should deny non-member from deleting marketing items', async () => {
      const { error } = await nonMemberClient
        .from('marketing_items')
        .delete()
        .eq('id', testMarketingItemId);

      expect(error).toBeDefined();
    });
  });
});
