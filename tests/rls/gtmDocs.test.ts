/**
 * RLS Tests for gtm_docs
 * Verifies workspace-scoped access and blocks_metadata persistence
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createAuthenticatedClient,
  createAnonymousClient,
  TEST_USERS,
  cleanupTestData,
} from './setup';

type StructuredBlock = {
  id: string;
  type: 'textbox' | 'signature';
  position: { x: number; y: number; zIndex: number };
  size: { width: number; height: number };
  rotation?: number;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type BlocksMetadata = Record<string, StructuredBlock>;

const createBlockMetadata = (id: string, type: 'textbox' | 'signature'): BlocksMetadata => {
  const timestamp = new Date().toISOString();
  return {
    [id]: {
      id,
      type,
      position: { x: 24, y: 48, zIndex: 0 },
      size: { width: 360, height: 200 },
      rotation: 0,
      data: type === 'signature' ? { strokeColor: '#111827' } : { placeholder: 'Notes' },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
};

describe('gtm_docs RLS policies', () => {
  let ownerClient: SupabaseClient;
  let memberClient: SupabaseClient;
  let nonMemberClient: SupabaseClient;
  let anonymousClient: SupabaseClient;
  let ownerUserId: string;
  let memberUserId: string;
  let workspaceId: string;
  let ownerDocId: string;
  let memberDocId: string;

  beforeAll(async () => {
    ownerClient = await createAuthenticatedClient(TEST_USERS.owner.email, TEST_USERS.owner.password);
    memberClient = await createAuthenticatedClient(TEST_USERS.member.email, TEST_USERS.member.password);
    nonMemberClient = await createAuthenticatedClient(TEST_USERS.nonMember.email, TEST_USERS.nonMember.password);
    anonymousClient = createAnonymousClient();

    const { data: ownerUser } = await ownerClient.auth.getUser();
    const { data: memberUser } = await memberClient.auth.getUser();

    ownerUserId = ownerUser.user?.id ?? '';
    memberUserId = memberUser.user?.id ?? '';

    const { data: workspace, error: workspaceError } = await ownerClient
      .from('workspaces')
      .insert({ name: 'RLS Docs Workspace', plan_type: 'free' })
      .select()
      .single();

    if (workspaceError) throw workspaceError;
    workspaceId = workspace.id;
    TEST_USERS.owner.workspaceId = workspaceId;
    TEST_USERS.member.workspaceId = workspaceId;

    await ownerClient.from('workspace_members').insert({
      workspace_id: workspaceId,
      user_id: memberUserId,
      role: 'member',
    });
  });

  afterAll(async () => {
    if (workspaceId) {
      await cleanupTestData(ownerClient, workspaceId);
    }
  });

  describe('INSERT', () => {
    it('allows workspace owner to create docs with blocks metadata', async () => {
      const metadata = createBlockMetadata('owner-block', 'textbox');
      const { data, error } = await ownerClient
        .from('gtm_docs')
        .insert({
          workspace_id: workspaceId,
          owner_id: ownerUserId,
          title: 'Owner Doc',
          doc_type: 'brief',
          content_json: { type: 'doc', content: [] },
          content_plain: 'Owner content',
          visibility: 'team',
          blocks_metadata: metadata,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.blocks_metadata?.['owner-block']).toMatchObject({ id: 'owner-block' });
      ownerDocId = data?.id as string;
    });

    it('allows workspace member to create docs for their team', async () => {
      const metadata = createBlockMetadata('member-block', 'signature');
      const { data, error } = await memberClient
        .from('gtm_docs')
        .insert({
          workspace_id: workspaceId,
          owner_id: memberUserId,
          title: 'Member Doc',
          doc_type: 'brief',
          content_json: { type: 'doc', content: [] },
          content_plain: 'Member content',
          visibility: 'team',
          blocks_metadata: metadata,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.blocks_metadata?.['member-block']?.data?.strokeColor).toBe('#111827');
      memberDocId = data?.id as string;
    });

    it('denies non-members from inserting docs into the workspace', async () => {
      const { data, error } = await nonMemberClient
        .from('gtm_docs')
        .insert({
          workspace_id: workspaceId,
          owner_id: memberUserId,
          title: 'Non-member Doc',
          doc_type: 'brief',
          content_json: {},
          content_plain: 'blocked',
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error?.message).toContain('row-level security policy');
    });

    it('denies anonymous users from inserting docs', async () => {
      const { data, error } = await anonymousClient
        .from('gtm_docs')
        .insert({ workspace_id: workspaceId, owner_id: ownerUserId, title: 'Anon Doc' })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });
  });

  describe('SELECT', () => {
    it('allows owners to read their docs with metadata intact', async () => {
      const { data, error } = await ownerClient
        .from('gtm_docs')
        .select('id, blocks_metadata')
        .eq('id', ownerDocId)
        .single();

      expect(error).toBeNull();
      expect(data?.blocks_metadata?.['owner-block']).toBeTruthy();
    });

    it('allows workspace members to read shared docs', async () => {
      const { data, error } = await memberClient
        .from('gtm_docs')
        .select('id')
        .eq('id', ownerDocId)
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBe(ownerDocId);
    });

    it('filters docs for non-members', async () => {
      const { data, error } = await nonMemberClient
        .from('gtm_docs')
        .select('id')
        .eq('id', ownerDocId);

      expect(error).toBeNull();
      expect(data?.length ?? 0).toBe(0);
    });
  });

  describe('UPDATE', () => {
    it('allows owner to update blocks metadata', async () => {
      const updatedMetadata = createBlockMetadata('owner-block', 'signature');
      const { data, error } = await ownerClient
        .from('gtm_docs')
        .update({ blocks_metadata: updatedMetadata })
        .eq('id', ownerDocId)
        .eq('workspace_id', workspaceId)
        .select('blocks_metadata')
        .single();

      expect(error).toBeNull();
      expect(data?.blocks_metadata?.['owner-block']?.type).toBe('signature');
    });

    it('allows member to update docs they created', async () => {
      const nextMetadata = createBlockMetadata('member-block', 'textbox');
      const { data, error } = await memberClient
        .from('gtm_docs')
        .update({ blocks_metadata: nextMetadata })
        .eq('id', memberDocId)
        .eq('workspace_id', workspaceId)
        .select('blocks_metadata')
        .single();

      expect(error).toBeNull();
      expect(data?.blocks_metadata?.['member-block']?.type).toBe('textbox');
    });

    it('denies non-members from updating docs', async () => {
      const { data, error } = await nonMemberClient
        .from('gtm_docs')
        .update({ title: 'Hacked' })
        .eq('id', ownerDocId)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error?.message).toContain('row-level security');
    });
  });

  describe('DELETE', () => {
    it('allows owner to delete their doc', async () => {
      const { error } = await ownerClient
        .from('gtm_docs')
        .delete()
        .eq('id', ownerDocId)
        .eq('workspace_id', workspaceId);

      expect(error).toBeNull();
    });

    it('denies non-members from deleting docs', async () => {
      const { error } = await nonMemberClient
        .from('gtm_docs')
        .delete()
        .eq('id', memberDocId)
        .eq('workspace_id', workspaceId);

      expect(error).toBeDefined();
    });
  });
});
