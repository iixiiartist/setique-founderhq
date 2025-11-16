import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatabaseService } from '../lib/services/database';
import { logger } from '../lib/logger';
import type { Workspace, BusinessProfile, WorkspaceMember } from '../types';

// ============================================================================
// Query Keys
// ============================================================================

export const workspaceKeys = {
  all: ['workspaces'] as const,
  user: (userId: string) => [...workspaceKeys.all, userId] as const,
};

export const profileKeys = {
  all: ['businessProfiles'] as const,
  workspace: (workspaceId: string) => [...profileKeys.all, workspaceId] as const,
};

export const memberKeys = {
  all: ['workspaceMembers'] as const,
  workspace: (workspaceId: string) => [...memberKeys.all, workspaceId] as const,
};

// ============================================================================
// Workspace Queries
// ============================================================================

/**
 * Fetch workspace for a user with automatic retry
 */
export function useWorkspace(userId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.user(userId || ''),
    queryFn: async (): Promise<Workspace | null> => {
      if (!userId) return null;

      logger.info('[useWorkspace] Loading workspace for user:', userId);
      
      const { data, error } = await DatabaseService.getWorkspaces(userId);
      
      if (error) {
        logger.error('[useWorkspace] Error loading workspace:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        logger.warn('[useWorkspace] No workspace found for user:', userId);
        return null;
      }
      
      const workspace = data[0];
      logger.info('[useWorkspace] Loaded workspace:', workspace.id);
      
      // Database already returns camelCase, so use planType not plan_type
      return {
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.ownerId || workspace.owner_id,
        createdAt: workspace.createdAt || new Date(workspace.created_at).getTime(),
        planType: workspace.planType || workspace.plan_type as any,
        seatCount: workspace.seatCount || workspace.seat_count || 0,
        aiUsageCount: workspace.aiUsageCount || workspace.ai_usage_count || 0,
        aiUsageResetDate: workspace.aiUsageResetDate || (workspace.ai_usage_reset_date ? new Date(workspace.ai_usage_reset_date).getTime() : Date.now()),
        storageBytesUsed: workspace.storageBytesUsed || workspace.storage_bytes_used || 0,
        fileCount: workspace.fileCount || workspace.file_count || 0,
        teamXp: workspace.teamXp || workspace.team_xp || 0,
        teamLevel: workspace.teamLevel || workspace.team_level || 1
      };
    },
    enabled: !!userId,
    retry: 1, // Retry once if initial load fails
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime)
  });
}

// ============================================================================
// Business Profile Queries
// ============================================================================

/**
 * Fetch business profile for a workspace
 */
export function useBusinessProfile(workspaceId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.workspace(workspaceId || ''),
    queryFn: async (): Promise<BusinessProfile | null> => {
      if (!workspaceId) return null;

      logger.info('[useBusinessProfile] Loading profile for workspace:', workspaceId);
      
      const { data, error } = await DatabaseService.getBusinessProfile(workspaceId);
      
      if (error) {
        logger.error('[useBusinessProfile] Error loading profile:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        logger.info('[useBusinessProfile] No profile found for workspace:', workspaceId);
        return null;
      }
      
      const profile = data[0];
      logger.info('[useBusinessProfile] Loaded profile:', profile);
      
      return {
        id: profile.id,
        workspaceId: profile.workspace_id,
        createdAt: new Date(profile.created_at).getTime(),
        updatedAt: new Date(profile.updated_at).getTime(),
        companyName: profile.company_name || '',
        industry: profile.industry,
        companySize: profile.company_size,
        foundedYear: profile.founded_year,
        website: profile.website,
        businessModel: profile.business_model,
        description: profile.description,
        targetMarket: profile.target_market,
        valueProposition: profile.value_proposition,
        primaryGoal: profile.primary_goal,
        keyChallenges: profile.key_challenges,
        growthStage: profile.growth_stage,
        currentMrr: profile.current_mrr,
        targetMrr: profile.target_mrr,
        currentArr: profile.current_arr,
        customerCount: profile.customer_count,
        teamSize: profile.team_size,
        remotePolicy: profile.remote_policy,
        companyValues: profile.company_values,
        techStack: profile.tech_stack,
        competitors: profile.competitors,
        uniqueDifferentiators: profile.unique_differentiators,
        isComplete: profile.is_complete,
        completedAt: profile.completed_at ? new Date(profile.completed_at).getTime() : undefined
      } as BusinessProfile;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Save (create or update) business profile
 */
export function useSaveBusinessProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      profileData,
      existingProfile
    }: {
      workspaceId: string;
      profileData: Partial<BusinessProfile>;
      existingProfile: BusinessProfile | null | undefined;
    }) => {
      logger.info('[useSaveBusinessProfile] Saving profile for workspace:', workspaceId);

      // Convert frontend types to database types
      const dbData = {
        company_name: profileData.companyName || '',
        industry: profileData.industry,
        company_size: profileData.companySize,
        founded_year: profileData.foundedYear,
        website: profileData.website,
        business_model: profileData.businessModel,
        description: profileData.description,
        target_market: profileData.targetMarket,
        value_proposition: profileData.valueProposition,
        primary_goal: profileData.primaryGoal,
        key_challenges: profileData.keyChallenges,
        growth_stage: profileData.growthStage,
        current_mrr: profileData.currentMrr,
        target_mrr: profileData.targetMrr,
        current_arr: profileData.currentArr,
        customer_count: profileData.customerCount,
        team_size: profileData.teamSize,
        remote_policy: profileData.remotePolicy,
        company_values: profileData.companyValues,
        tech_stack: profileData.techStack,
        competitors: profileData.competitors,
        unique_differentiators: profileData.uniqueDifferentiators,
        is_complete: profileData.isComplete || false,
        completed_at: profileData.completedAt ? new Date(profileData.completedAt).toISOString() : null
      };

      if (existingProfile) {
        // Update existing profile
        await DatabaseService.updateBusinessProfile(workspaceId, dbData as any);
      } else {
        // Create new profile (will auto-update if already exists due to race condition)
        const result = await DatabaseService.createBusinessProfile({ workspace_id: workspaceId, ...dbData } as any);
        if (result.error) {
          logger.error('[useSaveBusinessProfile] Error from createBusinessProfile:', result.error);
          throw result.error;
        }
      }

      // Update workspace name to match business name if company name is provided
      if (profileData.companyName) {
        await DatabaseService.updateWorkspaceName(workspaceId, profileData.companyName);
      }

      return { workspaceId, profileData };
    },
    onSuccess: ({ workspaceId, profileData }) => {
      logger.info('[useSaveBusinessProfile] Profile saved successfully');
      
      // Invalidate both profile and workspace queries
      queryClient.invalidateQueries({ queryKey: profileKeys.workspace(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      
      // Store onboarding dismissal if profile is complete
      if (profileData.isComplete) {
        localStorage.setItem(`onboarding_dismissed_${workspaceId}`, 'true');
      }
    },
    onError: (error) => {
      logger.error('[useSaveBusinessProfile] Error saving profile:', error);
    }
  });
}

// ============================================================================
// Workspace Members Queries
// ============================================================================

/**
 * Fetch workspace members with profile data
 */
export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: memberKeys.workspace(workspaceId || ''),
    queryFn: async (): Promise<WorkspaceMember[]> => {
      if (!workspaceId) return [];

      logger.info('[useWorkspaceMembers] Loading members for workspace:', workspaceId);
      
      const { data: members, error } = await DatabaseService.getWorkspaceMembers(workspaceId);
      
      if (error) {
        logger.error('[useWorkspaceMembers] Error loading members:', error);
        throw error;
      }
      
      logger.info('[useWorkspaceMembers] Loaded members (raw):', members);
      
      // Transform database response to match WorkspaceMember interface
      const transformedMembers: WorkspaceMember[] = (members || []).map((m: any) => ({
        id: m.id,
        workspaceId: m.workspace_id,
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at ? new Date(m.joined_at).getTime() : Date.now(),
        invitedBy: m.invited_by || undefined,
        fullName: m.profiles?.full_name || undefined,
        email: m.profiles?.email || undefined,
        avatarUrl: m.profiles?.avatar_url || undefined
      }));
      
      logger.info('[useWorkspaceMembers] Transformed members:', transformedMembers);
      return transformedMembers;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

// ============================================================================
// Workspace Permissions Hook
// ============================================================================

export interface WorkspacePermissions {
  canEditTask: (taskUserId: string, assignedTo?: string) => boolean;
  canCompleteTask: (assignedTo?: string) => boolean;
  isWorkspaceOwner: () => boolean;
}

/**
 * Hook for workspace permissions logic
 * Separated from queries to avoid unnecessary re-renders
 */
export function useWorkspacePermissions(
  userId: string | undefined,
  workspaceId: string | undefined,
  workspace: Workspace | null | undefined
): WorkspacePermissions {
  
  const canEditTask = (taskUserId: string, assignedTo?: string): boolean => {
    if (!userId || !workspace) return false;
    
    // User can edit their own tasks
    if (taskUserId === userId) return true;
    
    // User can edit tasks assigned to them
    if (assignedTo === userId) return true;
    
    // Owners can edit all tasks in their workspace
    if (userId === workspace.ownerId) return true;
    
    // Members can only edit their own tasks or tasks assigned to them
    return false;
  };

  const canCompleteTask = (assignedTo?: string): boolean => {
    if (!userId || !workspace) return false;
    
    // Owners can complete any task
    if (userId === workspace.ownerId) return true;
    
    // Members can only complete tasks assigned to them
    if (assignedTo === userId) return true;
    
    // If task is unassigned, no one can complete it (except owner, already checked)
    return false;
  };

  const isWorkspaceOwner = (): boolean => {
    if (!userId || !workspace) return false;
    return userId === workspace.ownerId;
  };

  return {
    canEditTask,
    canCompleteTask,
    isWorkspaceOwner
  };
}

// ============================================================================
// Onboarding State Hook
// ============================================================================

export interface OnboardingState {
  showOnboarding: boolean;
  dismissOnboarding: () => void;
}

/**
 * Hook for managing onboarding state
 * Separate from workspace queries for independent state management
 */
export function useOnboardingState(
  workspaceId: string | undefined,
  businessProfile: BusinessProfile | null | undefined
): OnboardingState {
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  React.useEffect(() => {
    if (!workspaceId) {
      setShowOnboarding(false);
      return;
    }

    // Check if onboarding was dismissed this session
    const dismissed = localStorage.getItem(`onboarding_dismissed_${workspaceId}`);
    if (dismissed) {
      setShowOnboarding(false);
      return;
    }

    // Show onboarding if profile is incomplete
    if (businessProfile && !businessProfile.isComplete) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [workspaceId, businessProfile?.isComplete]);

  const dismissOnboarding = React.useCallback(() => {
    setShowOnboarding(false);
    if (workspaceId) {
      localStorage.setItem(`onboarding_dismissed_${workspaceId}`, 'true');
    }
  }, [workspaceId]);

  return {
    showOnboarding,
    dismissOnboarding
  };
}


