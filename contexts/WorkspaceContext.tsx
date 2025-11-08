import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { DatabaseService } from '../lib/services/database';
import { BusinessProfile, Workspace, WorkspaceMember } from '../types';
import { withTimeout } from '../lib/utils/promiseHelpers';

interface WorkspaceContextType {
    workspace: Workspace | null;
    businessProfile: BusinessProfile | null;
    workspaceMembers: WorkspaceMember[];
    isLoadingWorkspace: boolean;
    isLoadingProfile: boolean;
    isLoadingMembers: boolean;
    refreshWorkspace: () => Promise<void>;
    refreshBusinessProfile: () => Promise<void>;
    refreshMembers: () => Promise<void>;
    saveBusinessProfile: (profile: Partial<BusinessProfile>) => Promise<void>;
    showOnboarding: boolean;
    dismissOnboarding: () => void;
    canEditTask: (taskUserId: string, assignedTo?: string) => boolean;
    canCompleteTask: (assignedTo?: string) => boolean;
    isWorkspaceOwner: () => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace must be used within WorkspaceProvider');
    }
    return context;
};

interface WorkspaceProviderProps {
    children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
    const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    const refreshWorkspace = useCallback(async () => {
        if (!user || isRetrying) return;

        try {
            setIsLoadingWorkspace(true);
            console.log('[WorkspaceContext] Loading workspace for user:', user.id);
            
            // Add timeout to prevent infinite loading with automatic cleanup
            const { data: workspaces, error } = await withTimeout(
                DatabaseService.getWorkspaces(user.id),
                10000,
                'Workspace loading timeout'
            );
            
            console.log('[WorkspaceContext] Workspace loaded:', { workspaces, error });
            
            if (workspaces && workspaces.length > 0) {
                // Single workspace model - just use the one workspace
                setWorkspace(workspaces[0] as any);
                console.log('[WorkspaceContext] Set workspace:', workspaces[0]);
            } else {
                // No workspace found - wait and retry once (trigger might have just created it)
                console.log('[WorkspaceContext] No workspace found - waiting and retrying once');
                setIsRetrying(true);
                await new Promise(resolve => setTimeout(resolve, 2000));
                const { data: retryData } = await DatabaseService.getWorkspaces(user.id);
                
                if (retryData && retryData.length > 0) {
                    console.log('[WorkspaceContext] Found workspace on retry:', retryData[0]);
                    setWorkspace(retryData[0] as any);
                } else {
                    console.log('[WorkspaceContext] Still no workspace after retry - workspace should auto-create on signup');
                }
                setIsRetrying(false);
            }
        } catch (error) {
            console.error('Error loading workspace:', error);
            setIsRetrying(false);
        } finally {
            setIsLoadingWorkspace(false);
        }
    }, [user, isRetrying]);

    const refreshBusinessProfile = useCallback(async () => {
        if (!workspace || !user) {
            console.log('[WorkspaceContext] No workspace or user, skipping profile load');
            return;
        }

        try {
            setIsLoadingProfile(true);
            console.log('[WorkspaceContext] Loading business profile for workspace:', workspace.id);
            
            // Check if current user is the workspace owner (reuse user from AuthContext)
            // Handle both snake_case (from DB) and camelCase (from types)
            const workspaceOwnerId = (workspace as any).owner_id || workspace.ownerId;
            const isOwner = user.id === workspaceOwnerId;
            console.log('[WorkspaceContext] User is owner?', isOwner, { userId: user.id, workspaceOwnerId });
            
            const { data: profile, error } = await DatabaseService.getBusinessProfile(workspace.id);
            
            console.log('[WorkspaceContext] Business profile loaded:', { profile, error });
            
            if (profile) {
                setBusinessProfile(profile as any);
                
                // Sync workspace name with company name if they don't match
                const companyName = profile.company_name;
                if (companyName && workspace.name !== companyName) {
                    console.log('[WorkspaceContext] Syncing workspace name:', workspace.name, '->', companyName);
                    await DatabaseService.updateWorkspaceName(workspace.id, companyName);
                    // Update local state instead of reloading - prevents unnecessary database call
                    setWorkspace({ ...workspace, name: companyName });
                }
                
                // Only show onboarding to owners if profile is incomplete
                if (!profile.is_complete && isOwner) {
                    console.log('[WorkspaceContext] Profile incomplete, showing onboarding to owner');
                    setShowOnboarding(true);
                } else if (!profile.is_complete && !isOwner) {
                    console.log('[WorkspaceContext] Profile incomplete but user is member, skipping onboarding');
                    setShowOnboarding(false);
                }
            } else {
                // No profile exists - only show onboarding to owners
                if (isOwner) {
                    console.log('[WorkspaceContext] No profile found, showing onboarding to owner');
                    setShowOnboarding(true);
                } else {
                    console.log('[WorkspaceContext] No profile found but user is member, skipping onboarding');
                    setShowOnboarding(false);
                }
            }
        } catch (error) {
            console.error('Error loading business profile:', error);
            // Only show onboarding to owners on error (reuse user from AuthContext)
            if (user) {
                const workspaceOwnerId = (workspace as any).owner_id || workspace.ownerId;
                const isOwner = user.id === workspaceOwnerId;
                if (isOwner) {
                    setShowOnboarding(true);
                }
            }
        } finally {
            setIsLoadingProfile(false);
        }
    }, [workspace, user]); // Add user to dependency array

    const saveBusinessProfile = useCallback(async (profileData: Partial<BusinessProfile>) => {
        if (!workspace) {
            console.error('No workspace available');
            return;
        }

        try {
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

            if (businessProfile) {
                // Update existing profile
                await DatabaseService.updateBusinessProfile(workspace.id, dbData);
            } else {
                // Create new profile
                await DatabaseService.createBusinessProfile({ workspace_id: workspace.id, ...dbData } as any);
            }

            // Update workspace name to match business name if company name is provided
            if (profileData.companyName) {
                await DatabaseService.updateWorkspaceName(workspace.id, profileData.companyName);
            }

            // Refresh the profile and workspace
            await refreshBusinessProfile();
            await refreshWorkspace();
            
            // Hide onboarding if profile is complete
            if (profileData.isComplete) {
                setShowOnboarding(false);
            }
        } catch (error) {
            console.error('Error saving business profile:', error);
            throw error;
        }
    }, [workspace, businessProfile, refreshBusinessProfile, refreshWorkspace]);

    const dismissOnboarding = () => {
        setShowOnboarding(false);
        // Store dismissal in localStorage so it doesn't show again this session
        if (workspace) {
            localStorage.setItem(`onboarding_dismissed_${workspace.id}`, 'true');
        }
    };

    const canEditTask = (taskUserId: string, assignedTo?: string): boolean => {
        if (!user || !workspace) return false;
        
        // User can edit their own tasks
        if (taskUserId === user.id) return true;
        
        // User can edit tasks assigned to them
        if (assignedTo === user.id) return true;
        
        // Check if user is workspace owner
        const workspaceOwnerId = (workspace as any).owner_id || workspace.ownerId;
        const isOwner = user.id === workspaceOwnerId;
        
        // Owners can edit all tasks in their workspace
        if (isOwner) return true;
        
        // Members can only edit their own tasks or tasks assigned to them
        return false;
    };

    const canCompleteTask = (assignedTo?: string): boolean => {
        if (!user || !workspace) return false;
        
        // Check if user is workspace owner
        const workspaceOwnerId = (workspace as any).owner_id || workspace.ownerId;
        const isOwner = user.id === workspaceOwnerId;
        
        // Owners can complete any task
        if (isOwner) return true;
        
        // Members can only complete tasks assigned to them
        if (assignedTo === user.id) return true;
        
        // If task is unassigned, no one can complete it (except owner, already checked)
        return false;
    };

    const isWorkspaceOwner = (): boolean => {
        if (!user || !workspace) return false;
        const workspaceOwnerId = (workspace as any).owner_id || workspace.ownerId;
        return user.id === workspaceOwnerId;
    };

    const refreshMembers = useCallback(async () => {
        if (!workspace) {
            console.log('[WorkspaceContext] No workspace, skipping members load');
            return;
        }

        try {
            setIsLoadingMembers(true);
            console.log('[WorkspaceContext] Loading workspace members for:', workspace.id);
            
            const { data: members, error } = await DatabaseService.getWorkspaceMembers(workspace.id);
            
            if (error) {
                console.error('[WorkspaceContext] Error loading members:', error);
                return;
            }
            
            console.log('[WorkspaceContext] Loaded members (raw):', members);
            
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
            
            console.log('[WorkspaceContext] Transformed members:', transformedMembers);
            setWorkspaceMembers(transformedMembers);
        } catch (error) {
            console.error('[WorkspaceContext] Error loading members:', error);
        } finally {
            setIsLoadingMembers(false);
        }
    }, [workspace]);

    // Load workspace when user changes
    useEffect(() => {
        if (user) {
            refreshWorkspace();
        } else {
            setWorkspace(null);
            setBusinessProfile(null);
            setIsLoadingWorkspace(false);
            setIsLoadingProfile(false);
        }
    }, [user?.id]); // Only depend on user.id, not refreshWorkspace

    // Load business profile when workspace changes
    useEffect(() => {
        if (workspace) {
            refreshBusinessProfile();
            refreshMembers(); // Load members when workspace is set
            
            // Check if onboarding was dismissed this session
            const dismissed = localStorage.getItem(`onboarding_dismissed_${workspace.id}`);
            if (dismissed) {
                setShowOnboarding(false);
            }

            // Refresh members every 5 minutes
            const memberRefreshInterval = setInterval(refreshMembers, 5 * 60 * 1000);
            return () => clearInterval(memberRefreshInterval);
        } else {
            setBusinessProfile(null);
            setWorkspaceMembers([]);
            setIsLoadingProfile(false);
            setIsLoadingMembers(false);
        }
    }, [workspace?.id]); // Only depend on workspace.id to prevent infinite loops

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
        showOnboarding,
        dismissOnboarding,
        canEditTask,
        canCompleteTask,
        isWorkspaceOwner
    };

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};
