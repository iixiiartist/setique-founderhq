/**
 * RLS Test Setup
 * Creates Supabase clients with different user contexts for testing RLS policies
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables for testing');
}

const DEFAULT_TEST_USERS = {
  owner: {
    email: 'test-owner@example.com',
    password: 'test-password-123',
  },
  member: {
    email: 'test-member@example.com',
    password: 'test-password-123',
  },
  nonMember: {
    email: 'test-nonmember@example.com',
    password: 'test-password-123',
  },
} as const;

const resolveCredential = (envKey: string, fallback: string): string => {
  return process.env[envKey] ?? fallback;
};

const resolvedCreds = {
  owner: {
    email: resolveCredential('SUPABASE_TEST_OWNER_EMAIL', DEFAULT_TEST_USERS.owner.email),
    password: resolveCredential('SUPABASE_TEST_OWNER_PASSWORD', DEFAULT_TEST_USERS.owner.password),
    workspaceId: process.env.SUPABASE_TEST_OWNER_WORKSPACE_ID || '',
  },
  member: {
    email: resolveCredential('SUPABASE_TEST_MEMBER_EMAIL', DEFAULT_TEST_USERS.member.email),
    password: resolveCredential('SUPABASE_TEST_MEMBER_PASSWORD', DEFAULT_TEST_USERS.member.password),
    workspaceId: process.env.SUPABASE_TEST_MEMBER_WORKSPACE_ID || '',
  },
  nonMember: {
    email: resolveCredential('SUPABASE_TEST_NON_MEMBER_EMAIL', DEFAULT_TEST_USERS.nonMember.email),
    password: resolveCredential('SUPABASE_TEST_NON_MEMBER_PASSWORD', DEFAULT_TEST_USERS.nonMember.password),
  },
};

const missingCredKeys = Object.entries(resolvedCreds)
  .flatMap(([role, creds]) =>
    Object.entries(creds)
      .filter(([field, value]) => field !== 'workspaceId' && !value)
      .map(([field]) => `${role}.${field}`)
  );

if (missingCredKeys.length > 0) {
  throw new Error(
    `Missing Supabase test credentials: ${missingCredKeys.join(', ')}. ` +
    'See tests/fixtures/create_test_users.sql and update your .env to include these values.'
  );
}

/**
 * Create a Supabase client authenticated as a specific user
 */
export const createAuthenticatedClient = async (
  email: string,
  password: string
): Promise<SupabaseClient> => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to authenticate: ${error.message}`);
  }

  return client;
};

/**
 * Create an anonymous (unauthenticated) client
 */
export const createAnonymousClient = (): SupabaseClient => {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
};

/**
 * Test user credentials
 * These should be created manually in your Supabase project for testing
 */
export const TEST_USERS = {
  owner: resolvedCreds.owner,
  member: resolvedCreds.member,
  nonMember: resolvedCreds.nonMember,
};

/**
 * Cleanup helper to delete test data
 */
export const cleanupTestData = async (
  client: SupabaseClient,
  workspaceId: string
) => {
  // Delete in order to respect foreign key constraints
  await client.from('tasks').delete().eq('workspace_id', workspaceId);
  await client.from('marketing_items').delete().eq('workspace_id', workspaceId);
  await client.from('crm_items').delete().eq('workspace_id', workspaceId);
  await client.from('gtm_docs').delete().eq('workspace_id', workspaceId);
  await client.from('activity_log').delete().eq('workspace_id', workspaceId);
  await client.from('workspace_members').delete().eq('workspace_id', workspaceId);
  await client.from('workspaces').delete().eq('id', workspaceId);
};
