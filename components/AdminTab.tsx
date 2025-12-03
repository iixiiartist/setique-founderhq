import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useDebouncedValue } from '../hooks';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
    UserSignup,
    PlanType,
    SignupStats,
    calculateStats,
    AdminHeader,
    AdminStats,
    UserFilters,
    UserTable,
    AutomationMonitor
} from './admin';
import { ConfirmWithInputDialog } from './shared/ConfirmWithInputDialog';

function AdminTab() {
    const { workspace, refreshWorkspace } = useWorkspace();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    
    // Tab state
    const [activeTab, setActiveTab] = useState<'users' | 'automations'>('users');
    
    // User data state
    const [users, setUsers] = useState<UserSignup[]>([]);
    const [stats, setStats] = useState<SignupStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [filterConfirmed, setFilterConfirmed] = useState<string>('all');
    
    // Plan editing state
    const [editingPlanFor, setEditingPlanFor] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
    const [selectedSeats, setSelectedSeats] = useState<number>(5);
    const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

    // Delete user confirmation state
    const [deleteUserDialog, setDeleteUserDialog] = useState<{ isOpen: boolean; userId: string; userEmail: string }>({ isOpen: false, userId: '', userEmail: '' });

    // Debounce search query
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data: usersData, error } = await supabase.rpc('get_all_users_for_admin');

            if (error) throw error;

            const transformedUsers: UserSignup[] = (usersData || []).map((u: any) => ({
                id: u.user_id,
                email: u.email,
                fullName: u.full_name,
                createdAt: u.created_at,
                emailConfirmed: !!u.email_confirmed_at,
                planType: u.plan_type || 'free',
                workspaceId: u.workspace_id || '',
                workspaceName: u.workspace_name || (u.has_profile ? 'No workspace' : '⚠️ Missing profile'),
                lastSignIn: u.last_sign_in_at,
                isAdmin: u.user_is_admin || false
            }));

            setUsers(transformedUsers);
            setStats(calculateStats(transformedUsers));
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateUserPlan = useCallback(async (userId: string) => {
        try {
            setIsUpdatingPlan(true);
            
            const { data, error } = await supabase.rpc('admin_update_user_plan', {
                target_user_id: userId,
                new_plan_type: selectedPlan,
                new_seats: selectedPlan === 'team-pro' ? selectedSeats : null
            });

            if (error) throw error;

            const result = data as { success: boolean; message: string };
            
            if (!result.success) {
                toast.error(`Error: ${result.message}`);
                return;
            }

            const seatsMsg = selectedPlan === 'team-pro' ? ` with ${selectedSeats} seats` : '';
            toast.success(`Plan updated successfully to ${selectedPlan}${seatsMsg}!`);
            setEditingPlanFor(null);
            
            await loadUserData();
            
            if (userId === user?.id) {
                await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
                refreshWorkspace();
            }
        } catch (error) {
            console.error('Error updating user plan:', error);
            toast.error('Failed to update plan. Check console for details.');
        } finally {
            setIsUpdatingPlan(false);
        }
    }, [selectedPlan, selectedSeats, user?.id, queryClient, refreshWorkspace, loadUserData]);

    const deleteUser = useCallback(async (userId: string, userEmail: string) => {
        // Open the confirmation dialog
        setDeleteUserDialog({ isOpen: true, userId, userEmail });
    }, []);

    const handleConfirmDeleteUser = useCallback(async () => {
        const { userId, userEmail } = deleteUserDialog;
        setDeleteUserDialog({ isOpen: false, userId: '', userEmail: '' });

        try {
            setIsUpdatingPlan(true);
            
            const { data, error } = await supabase.rpc('admin_prepare_user_deletion', {
                target_user_id: userId
            });

            if (error) throw error;

            const result = data as { success: boolean; message: string };
            
            if (!result.success) {
                toast.error(`Error preparing deletion: ${result.message}`);
                return;
            }

            const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

            if (deleteError) {
                toast.error(`User data cleaned up, but auth deletion failed: ${deleteError.message}. You may need to delete this user manually from Supabase Auth dashboard.`);
                return;
            }

            toast.success('User deleted successfully!');
            await loadUserData();
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Failed to delete user. Check console for details.');
        } finally {
            setIsUpdatingPlan(false);
        }
    }, [deleteUserDialog, loadUserData]);

    // Memoize filtered users
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = 
                u.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                u.fullName.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            
            const matchesPlan = filterPlan === 'all' || u.planType === filterPlan;
            
            const matchesConfirmed = 
                filterConfirmed === 'all' || 
                (filterConfirmed === 'confirmed' && u.emailConfirmed) ||
                (filterConfirmed === 'unconfirmed' && !u.emailConfirmed);

            return matchesSearch && matchesPlan && matchesConfirmed;
        });
    }, [users, debouncedSearchQuery, filterPlan, filterConfirmed]);

    const handleEditPlan = useCallback((userId: string, currentPlan: PlanType) => {
        setEditingPlanFor(userId);
        setSelectedPlan(currentPlan);
        setSelectedSeats(5);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg font-mono">Loading admin data...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AdminHeader activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'automations' ? (
                workspace && <AutomationMonitor workspaceId={workspace.id} />
            ) : (
                <>
                    {stats && <AdminStats stats={stats} />}
                    
                    <UserFilters
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        filterPlan={filterPlan}
                        onPlanFilterChange={setFilterPlan}
                        filterConfirmed={filterConfirmed}
                        onConfirmedFilterChange={setFilterConfirmed}
                    />
                    
                    <UserTable
                        users={filteredUsers}
                        totalUsers={users.length}
                        editingPlanFor={editingPlanFor}
                        selectedPlan={selectedPlan}
                        selectedSeats={selectedSeats}
                        isUpdatingPlan={isUpdatingPlan}
                        onEditPlan={handleEditPlan}
                        onCancelEdit={() => setEditingPlanFor(null)}
                        onPlanChange={setSelectedPlan}
                        onSeatsChange={setSelectedSeats}
                        onUpdatePlan={updateUserPlan}
                        onDeleteUser={deleteUser}
                    />
                </>
            )}

            {/* Delete User Confirmation Dialog */}
            <ConfirmWithInputDialog
                isOpen={deleteUserDialog.isOpen}
                onClose={() => setDeleteUserDialog({ isOpen: false, userId: '', userEmail: '' })}
                onConfirm={handleConfirmDeleteUser}
                title="Delete User Account"
                message={`This will permanently delete:\n• User account and profile\n• All CRM data (investors, customers, partners)\n• All contacts and meetings\n• All tasks and marketing items\n• All financial data\n• All documents\n\nThis action CANNOT be undone!`}
                confirmationText={deleteUserDialog.userEmail}
                inputLabel="Type the email address to confirm deletion:"
                confirmLabel="Delete User"
                cancelLabel="Cancel"
                variant="danger"
                isLoading={isUpdatingPlan}
            />
        </div>
    );
}

export default AdminTab;
