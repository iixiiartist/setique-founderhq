/**
 * User Profile Cache
 * ==================
 * In-memory cache for user profiles to reduce repeated fetches.
 * Used for displaying user names/avatars across components.
 */

import { supabase } from '../supabase';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CachedProfile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  fetchedAt: number;
}

export interface ProfileCacheConfig {
  /** TTL in milliseconds (default: 5 minutes) */
  ttl: number;
  /** Max entries in cache (default: 500) */
  maxSize: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: ProfileCacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 500,
};

// ============================================================================
// PROFILE CACHE
// ============================================================================

class ProfileCache {
  private cache: Map<string, CachedProfile> = new Map();
  private pendingFetches: Map<string, Promise<CachedProfile | null>> = new Map();
  private config: ProfileCacheConfig;

  constructor(config: ProfileCacheConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Get a profile from cache (returns immediately if cached)
   */
  get(userId: string): CachedProfile | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.fetchedAt > this.config.ttl) {
      this.cache.delete(userId);
      return null;
    }

    return cached;
  }

  /**
   * Set a profile in cache
   */
  set(profile: Omit<CachedProfile, 'fetchedAt'>): void {
    // Evict oldest entries if at max size
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(profile.id, {
      ...profile,
      fetchedAt: Date.now(),
    });
  }

  /**
   * Set multiple profiles at once
   */
  setMany(profiles: Array<Omit<CachedProfile, 'fetchedAt'>>): void {
    for (const profile of profiles) {
      this.set(profile);
    }
  }

  /**
   * Get a profile, fetching from DB if not cached
   * Deduplicates concurrent fetches for the same user
   */
  async getOrFetch(userId: string): Promise<CachedProfile | null> {
    // Return cached if available
    const cached = this.get(userId);
    if (cached) return cached;

    // Check if already fetching
    const pending = this.pendingFetches.get(userId);
    if (pending) return pending;

    // Fetch from database
    const fetchPromise = this.fetchProfile(userId);
    this.pendingFetches.set(userId, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.pendingFetches.delete(userId);
    }
  }

  /**
   * Bulk fetch profiles, returning cached + fetched
   */
  async getOrFetchMany(userIds: string[]): Promise<Map<string, CachedProfile>> {
    const results = new Map<string, CachedProfile>();
    const toFetch: string[] = [];

    // Check cache first
    for (const userId of userIds) {
      const cached = this.get(userId);
      if (cached) {
        results.set(userId, cached);
      } else {
        toFetch.push(userId);
      }
    }

    // Fetch missing profiles in bulk
    if (toFetch.length > 0) {
      const fetched = await this.fetchProfiles(toFetch);
      for (const profile of fetched) {
        results.set(profile.id, profile);
      }
    }

    return results;
  }

  /**
   * Preload profiles for a list of user IDs
   */
  async preload(userIds: string[]): Promise<void> {
    const uncached = userIds.filter(id => !this.get(id));
    if (uncached.length === 0) return;

    await this.fetchProfiles(uncached);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingFetches.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
    };
  }

  /**
   * Fetch a single profile from database
   */
  private async fetchProfile(userId: string): Promise<CachedProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        logger.warn('[ProfileCache] Error fetching profile:', error.message);
        return null;
      }

      if (data) {
        const profile: CachedProfile = {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          fetchedAt: Date.now(),
        };
        this.set(profile);
        return profile;
      }

      return null;
    } catch (error) {
      logger.error('[ProfileCache] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Fetch multiple profiles from database
   */
  private async fetchProfiles(userIds: string[]): Promise<CachedProfile[]> {
    if (userIds.length === 0) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);

      if (error) {
        logger.warn('[ProfileCache] Error fetching profiles:', error.message);
        return [];
      }

      const profiles: CachedProfile[] = (data || []).map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        fetchedAt: Date.now(),
      }));

      // Cache all fetched profiles
      this.setMany(profiles);

      return profiles;
    } catch (error) {
      logger.error('[ProfileCache] Unexpected error:', error);
      return [];
    }
  }
}

// Singleton instance
export const profileCache = new ProfileCache();

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to get a single user profile (with caching)
 */
export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<CachedProfile | null>(
    userId ? profileCache.get(userId) : null
  );
  const [isLoading, setIsLoading] = useState(!profile && !!userId);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = profileCache.get(userId);
    if (cached) {
      setProfile(cached);
      setIsLoading(false);
      return;
    }

    // Fetch if not cached
    setIsLoading(true);
    profileCache.getOrFetch(userId).then((result) => {
      setProfile(result);
      setIsLoading(false);
    });
  }, [userId]);

  return { profile, isLoading };
}

/**
 * Hook to get multiple user profiles (with caching)
 */
export function useProfiles(userIds: string[]) {
  const [profiles, setProfiles] = useState<Map<string, CachedProfile>>(new Map());
  const [isLoading, setIsLoading] = useState(userIds.length > 0);

  useEffect(() => {
    if (userIds.length === 0) {
      setProfiles(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    profileCache.getOrFetchMany(userIds).then((result) => {
      setProfiles(result);
      setIsLoading(false);
    });
  }, [userIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const getProfile = useCallback((userId: string) => {
    return profiles.get(userId) || null;
  }, [profiles]);

  return { profiles, getProfile, isLoading };
}

/**
 * Hook to preload profiles (for anticipating needs)
 */
export function usePreloadProfiles() {
  return useCallback((userIds: string[]) => {
    return profileCache.preload(userIds);
  }, []);
}

// ============================================================================
// WORKSPACE MEMBERS CACHE
// ============================================================================

interface WorkspaceMembersCache {
  workspaceId: string;
  members: Array<{
    userId: string;
    role: string;
    profile: CachedProfile;
  }>;
  fetchedAt: number;
}

let workspaceMembersCache: WorkspaceMembersCache | null = null;
const WORKSPACE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get workspace members with profiles (cached)
 */
export async function getWorkspaceMembersWithProfiles(workspaceId: string): Promise<Array<{
  userId: string;
  role: string;
  profile: CachedProfile;
}>> {
  // Check cache
  if (
    workspaceMembersCache &&
    workspaceMembersCache.workspaceId === workspaceId &&
    Date.now() - workspaceMembersCache.fetchedAt < WORKSPACE_CACHE_TTL
  ) {
    return workspaceMembersCache.members;
  }

  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        user_id,
        role,
        user:profiles(id, email, full_name, avatar_url)
      `)
      .eq('workspace_id', workspaceId);

    if (error) {
      logger.warn('[WorkspaceMembersCache] Error fetching members:', error.message);
      return workspaceMembersCache?.members || [];
    }

    const members = (data || []).map((m: any) => {
      const profile: CachedProfile = {
        id: m.user?.id || m.user_id,
        email: m.user?.email,
        full_name: m.user?.full_name,
        avatar_url: m.user?.avatar_url,
        fetchedAt: Date.now(),
      };

      // Also cache individual profiles
      if (profile.id) {
        profileCache.set(profile);
      }

      return {
        userId: m.user_id,
        role: m.role,
        profile,
      };
    });

    // Update cache
    workspaceMembersCache = {
      workspaceId,
      members,
      fetchedAt: Date.now(),
    };

    return members;
  } catch (error) {
    logger.error('[WorkspaceMembersCache] Unexpected error:', error);
    return workspaceMembersCache?.members || [];
  }
}

/**
 * Invalidate workspace members cache
 */
export function invalidateWorkspaceMembersCache(): void {
  workspaceMembersCache = null;
}

// ============================================================================
// DEBUG TOOLS
// ============================================================================

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

if (isDev && typeof window !== 'undefined') {
  (window as any).__profileCache = {
    get: (userId: string) => profileCache.get(userId),
    getStats: () => profileCache.getStats(),
    clear: () => profileCache.clear(),
    preload: (userIds: string[]) => profileCache.preload(userIds),
  };
  
  logger.info('👤 Profile cache tools available: window.__profileCache');
}
