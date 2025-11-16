import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Workspace, BusinessProfile, WorkspaceMember } from '../types';
import {
  useWorkspace as useWorkspaceQuery,
  useBusinessProfile as useBusinessProfileQuery,
  useWorkspaceMembers as useWorkspaceMembersQuery,
  useSaveBusinessProfile,
  useWorkspacePermissions,
  useOnboardingState
} from '../hooks/useWorkspaceQueries';

// ============================================================================
// Context Type
// ============================================================================

interface WorkspaceContextType {
  workspace: Workspace | null | undefined;
  businessProfile: BusinessProfile | null | undefined;
  workspaceMembers: WorkspaceMember[];
  isLoadingWorkspace: boolean;
  isLoadingProfile: boolean;
  isLoadingMembers: boolean;
  refreshWorkspace: () => void;
  refreshBusinessProfile: () => void;
  refreshMembers: () => void;
  saveBusinessProfile: (profile: Partial<BusinessProfile>) => Promise<void>;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  canEditTask: (taskUserId: string, assignedTo?: string) => boolean;
  canCompleteTask: (assignedTo?: string) => boolean;
  isWorkspaceOwner: () => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// ============================================================================
// Hook
// ============================================================================

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};

// ============================================================================
// Provider
// ============================================================================

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // Query workspace data
  const {
    data: workspace,
    isLoading: isLoadingWorkspace,
    refetch: refetchWorkspace
  } = useWorkspaceQuery(user?.id);
  
  // Query business profile
  const {
    data: businessProfile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile
  } = useBusinessProfileQuery(workspace?.id);
  
  // Query workspace members
  const {
    data: workspaceMembers = [],
    isLoading: isLoadingMembers,
    refetch: refetchMembers
  } = useWorkspaceMembersQuery(workspace?.id);
  
  // Save business profile mutation
  const saveProfileMutation = useSaveBusinessProfile();
  
  // Permission helpers
  const permissions = useWorkspacePermissions(user?.id, workspace?.id, workspace);
  
  // Onboarding state
  const onboarding = useOnboardingState(workspace?.id, businessProfile);
  
  // Backward-compatible refresh functions (React Query makes these simple)
  const refreshWorkspace = () => {
    refetchWorkspace();
  };
  
  const refreshBusinessProfile = () => {
    refetchProfile();
  };
  
  const refreshMembers = () => {
    refetchMembers();
  };
  
  // Backward-compatible save function
  const saveBusinessProfile = async (profileData: Partial<BusinessProfile>) => {
    await saveProfileMutation.mutateAsync({
      workspaceId: workspace?.id || '',
      profileData,
      existingProfile: businessProfile
    });
  };
  
  const value: WorkspaceContextType = {
    workspace,
    businessProfile,
    workspaceMembers,
    isLoadingWorkspace,
    isLoadingProfile,
    isLoadingMembers,
    refreshWorkspace,
    refreshBusinessProfile,
    refreshMembers,
    saveBusinessProfile,
    showOnboarding: onboarding.showOnboarding,
    dismissOnboarding: onboarding.dismissOnboarding,
    canEditTask: permissions.canEditTask,
    canCompleteTask: permissions.canCompleteTask,
    isWorkspaceOwner: permissions.isWorkspaceOwner
  };
  
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
