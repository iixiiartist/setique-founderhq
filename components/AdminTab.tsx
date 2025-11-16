import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useDebounce } from '../lib/hooks/usePerformance';
import { AutomationMonitor } from './admin/AutomationMonitor';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface UserSignup {
    id: string;
    email: string;
    fullName: string;
    createdAt: string;
    emailConfirmed: boolean;
    planType: string;
    workspaceId: string;
    workspaceName: string;
    lastSignIn: string | null;
    isAdmin: boolean;
}

type PlanType = 'free' | 'power-individual' | 'team-pro';

interface SignupStats {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    confirmed: number;
    unconfirmed: number;
    freePlan: number;
    paidPlan: number;
}

function AdminTab() {
    const { workspace, refreshWorkspace } = useWorkspace();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'users' | 'automations'>('users');
    const [users, setUsers] = useState<UserSignup[]>([]);
    const [stats, setStats] = useState<SignupStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [filterConfirmed, setFilterConfirmed] = useState<string>('all');
    const [editingPlanFor, setEditingPlanFor] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
    const [selectedSeats, setSelectedSeats] = useState<number>(5);
    const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

    // Debounce search query to prevent excessive filtering on every keystroke
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    useEffect(() => {
        loadUserData();
    }, []);

    const updateUserPlan = async (userId: string, newPlan: PlanType, seats?: number) => {
        try {
            setIsUpdatingPlan(true);
            
            console.log('[AdminTab] Updating plan for user:', userId, 'to:', newPlan, 'seats:', seats);
            
            const { data, error } = await supabase
                .rpc('admin_update_user_plan', {
                    target_user_id: userId,
                    new_plan_type: newPlan,
                    new_seats: newPlan === 'team-pro' ? seats : null
                });

            console.log('[AdminTab] Update response:', { data, error });

            if (error) throw error;

            const result = data as { success: boolean; message: string };
            
            if (!result.success) {
                alert(`Error: ${result.message}`);
                console.error('[AdminTab] Update failed:', result.message);
                return;
            }

            console.log('[AdminTab] Plan updated successfully');
            const seatsMsg = newPlan === 'team-pro' ? ` with ${seats} seats` : '';
            alert(`Plan updated successfully to ${newPlan}${seatsMsg}!`);
            setEditingPlanFor(null);
            
            // Reload user data to reflect changes
            console.log('[AdminTab] Reloading user data...');
            await loadUserData();
            
            // If updating own plan, invalidate workspace cache and refresh
            if (userId === user?.id) {
                console.log('[AdminTab] Invalidating workspace cache for current user');
                // Invalidate all workspace queries to force refetch
                await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
                refreshWorkspace();
                console.log('[AdminTab] Workspace cache invalidated');
            }
            
        } catch (error) {
            console.error('Error updating user plan:', error);
            alert('Failed to update plan. Check console for details.');
        } finally {
            setIsUpdatingPlan(false);
        }
    };

    const deleteUser = async (userId: string, userEmail: string) => {
        const confirmed = window.confirm(
            `⚠️ DELETE USER: ${userEmail}\n\n` +
            `This will permanently delete:\n` +
            `• User account and profile\n` +
            `• All CRM data (investors, customers, partners)\n` +
            `• All contacts and meetings\n` +
            `• All tasks and marketing items\n` +
            `• All financial data\n` +
            `• All documents\n\n` +
            `This action CANNOT be undone!\n\n` +
            `Click OK to continue.`
        );

        if (!confirmed) return;

        const emailConfirm = window.prompt(`Type "${userEmail}" to confirm deletion:`);
        
        if (emailConfirm !== userEmail) {
            alert('Email does not match. Deletion cancelled.');
            return;
        }

        try {
            setIsUpdatingPlan(true); // Reuse loading state
            
            // Step 1: Prepare user for deletion by removing all app data
            const { data, error } = await supabase
                .rpc('admin_prepare_user_deletion', {
                    target_user_id: userId
                });

            if (error) throw error;

            const result = data as { success: boolean; message: string; user_id?: string };
            
            if (!result.success) {
                alert(`Error preparing deletion: ${result.message}`);
                return;
            }

            // Step 2: Delete the auth user using admin API
            const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

            if (deleteError) {
                console.error('Error deleting auth user:', deleteError);
                alert(`User data cleaned up, but auth deletion failed: ${deleteError.message}\n\nYou may need to delete this user manually from Supabase Auth dashboard.`);
                return;
            }

            alert('User deleted successfully!');
            
            // Reload user data to reflect changes
            await loadUserData();
            
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user. Check console for details.');
        } finally {
            setIsUpdatingPlan(false);
        }
    };

    const loadUserData = async () => {
        try {
            setIsLoading(true);

            // Call the database function to get all users including those without profiles
            const { data: usersData, error } = await supabase
                .rpc('get_all_users_for_admin');

            if (error) throw error;

            // Transform the data
            const transformedUsers: UserSignup[] = (usersData || []).map((user: any) => ({
                id: user.user_id,
                email: user.email,
                fullName: user.full_name,
                createdAt: user.created_at,
                emailConfirmed: !!user.email_confirmed_at,
                planType: user.plan_type || 'free',
                workspaceId: user.workspace_id || '',
                workspaceName: user.workspace_name || (user.has_profile ? 'No workspace' : '⚠️ Missing profile'),
                lastSignIn: user.last_sign_in_at,
                isAdmin: user.user_is_admin || false
            }));

            setUsers(transformedUsers);

            // Calculate stats
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

            const stats: SignupStats = {
                total: transformedUsers.length,
                today: transformedUsers.filter(u => new Date(u.createdAt) >= today).length,
                thisWeek: transformedUsers.filter(u => new Date(u.createdAt) >= weekAgo).length,
                thisMonth: transformedUsers.filter(u => new Date(u.createdAt) >= monthAgo).length,
                confirmed: transformedUsers.filter(u => u.emailConfirmed).length,
                unconfirmed: transformedUsers.filter(u => !u.emailConfirmed).length,
                freePlan: transformedUsers.filter(u => u.planType === 'free').length,
                paidPlan: transformedUsers.filter(u => u.planType !== 'free').length
            };

            setStats(stats);
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Memoize filtered users to prevent recalculation on every render
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = 
                user.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                user.fullName.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            
            const matchesPlan = filterPlan === 'all' || user.planType === filterPlan;
            
            const matchesConfirmed = 
                filterConfirmed === 'all' || 
                (filterConfirmed === 'confirmed' && user.emailConfirmed) ||
                (filterConfirmed === 'unconfirmed' && !user.emailConfirmed);

            return matchesSearch && matchesPlan && matchesConfirmed;
        });
    }, [users, debouncedSearchQuery, filterPlan, filterConfirmed]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimeSince = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return formatDate(dateString);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg font-mono">Loading admin data...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-black p-6 border-2 border-black">
                <h1 className="text-2xl font-bold text-yellow-400 font-mono">
                    🔐 ADMIN DASHBOARD
                </h1>
                <p className="text-white font-mono text-sm mt-1">
                    User Signups, Analytics & Automation Monitoring
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b-2 border-black">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`font-mono px-4 py-2 border-2 border-black font-semibold ${
                        activeTab === 'users' ? 'bg-black text-white' : 'bg-white text-black'
                    }`}
                >
                    👥 Users
                </button>
                <button
                    onClick={() => setActiveTab('automations')}
                    className={`font-mono px-4 py-2 border-2 border-black font-semibold ${
                        activeTab === 'automations' ? 'bg-black text-white' : 'bg-white text-black'
                    }`}
                >
                    ⚙️ Automations
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'automations' ? (
                workspace && <AutomationMonitor workspaceId={workspace.id} />
            ) : (
                <>

            {/* Stats Grid */}
                        {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 border-2 border-black shadow-neo">
                        <div className="text-3xl font-bold text-black font-mono">{stats.total}</div>
                        <div className="text-sm text-gray-600 font-mono">Total Users</div>
                    </div>
                    <div className="bg-green-50 p-4 border-2 border-black shadow-neo">
                        <div className="text-3xl font-bold text-green-700 font-mono">{stats.today}</div>
                        <div className="text-sm text-gray-600 font-mono">Today</div>
                    </div>
                    <div className="bg-blue-50 p-4 border-2 border-black shadow-neo">
                        <div className="text-3xl font-bold text-blue-700 font-mono">{stats.thisWeek}</div>
                        <div className="text-sm text-gray-600 font-mono">This Week</div>
                    </div>
                    <div className="bg-purple-50 p-4 border-2 border-black shadow-neo">
                        <div className="text-3xl font-bold text-purple-700 font-mono">{stats.thisMonth}</div>
                        <div className="text-sm text-gray-600 font-mono">This Month</div>
                    </div>
                    <div className="bg-emerald-50 p-4 border-2 border-black shadow-neo">
                        <div className="text-3xl font-bold text-emerald-700 font-mono">{stats.confirmed}</div>
                        <div className="text-sm text-gray-600 font-mono">✓ Confirmed</div>
                    </div>
                    <div className="bg-red-50 p-4 border-2 border-black shadow-neo">
                        <div className="text-3xl font-bold text-red-700 font-mono">{stats.unconfirmed}</div>
                        <div className="text-sm text-gray-600 font-mono">⚠ Unconfirmed</div>
                    </div>
                    <div className="bg-gray-50 p-4 border-2 border-black shadow-neo">
                        <div className="text-3xl font-bold text-gray-700 font-mono">{stats.freePlan}</div>
                        <div className="text-sm text-gray-600 font-mono">Free Plan</div>
                    </div>
                    <div className="bg-yellow-50 p-4 border-2 border-black shadow-neo">
                        <div className="text-3xl font-bold text-yellow-700 font-mono">{stats.paidPlan}</div>
                        <div className="text-sm text-gray-600 font-mono">Paid Plans</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-6 border-2 border-black shadow-neo">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-bold font-mono text-black mb-2">
                            Search Users
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Email or name..."
                            className="w-full px-4 py-2 border-2 border-black focus:outline-none focus:border-yellow-400 font-mono text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold font-mono text-black mb-2">
                            Plan Type
                        </label>
                        <select
                            value={filterPlan}
                            onChange={(e) => setFilterPlan(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-black focus:outline-none focus:border-yellow-400 font-mono text-sm"
                        >
                            <option value="all">All Plans</option>
                            <option value="free">Free</option>
                            <option value="power-individual">Power</option>
                            <option value="team-pro">Team Pro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold font-mono text-black mb-2">
                            Email Status
                        </label>
                        <select
                            value={filterConfirmed}
                            onChange={(e) => setFilterConfirmed(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-black focus:outline-none focus:border-yellow-400 font-mono text-sm"
                        >
                            <option value="all">All</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="unconfirmed">Unconfirmed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white border-2 border-black shadow-neo overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-black text-white">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-mono">User</th>
                                <th className="px-4 py-3 text-left text-sm font-mono">Email</th>
                                <th className="px-4 py-3 text-left text-sm font-mono">Signed Up</th>
                                <th className="px-4 py-3 text-left text-sm font-mono">Status</th>
                                <th className="px-4 py-3 text-left text-sm font-mono">Plan</th>
                                <th className="px-4 py-3 text-left text-sm font-mono">Last Sign In</th>
                                <th className="px-4 py-3 text-left text-sm font-mono">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="font-mono text-sm font-semibold text-black">
                                                {user.fullName}
                                            </div>
                                            {user.isAdmin && (
                                                <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-mono border border-black">
                                                    ADMIN
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm text-gray-700">
                                        {user.email}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                        {getTimeSince(user.createdAt)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.emailConfirmed ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-mono border-2 border-black">
                                                ✓ Confirmed
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-mono border-2 border-black">
                                                ⚠ Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-mono border-2 border-black ${
                                            user.planType === 'free' ? 'bg-gray-100 text-gray-800' :
                                            user.planType === 'power-individual' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-purple-100 text-purple-800'
                                        }`}>
                                            {user.planType === 'free' ? 'FREE' :
                                             user.planType === 'power-individual' ? 'POWER' :
                                             user.planType === 'team-pro' ? 'TEAM PRO' :
                                             user.planType.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                        {user.lastSignIn ? getTimeSince(user.lastSignIn) : 'Never'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingPlanFor === user.id ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={selectedPlan}
                                                    onChange={(e) => setSelectedPlan(e.target.value as PlanType)}
                                                    disabled={isUpdatingPlan}
                                                    className="px-2 py-1 border-2 border-black focus:outline-none focus:border-yellow-400 font-mono text-xs"
                                                >
                                                    <option value="free">Free</option>
                                                    <option value="power-individual">Power</option>
                                                    <option value="team-pro">Team Pro</option>
                                                </select>
                                                {selectedPlan === 'team-pro' && (
                                                    <input
                                                        type="number"
                                                        min="2"
                                                        max="100"
                                                        value={selectedSeats}
                                                        onChange={(e) => setSelectedSeats(parseInt(e.target.value) || 5)}
                                                        disabled={isUpdatingPlan}
                                                        className="w-16 px-2 py-1 border-2 border-black focus:outline-none focus:border-yellow-400 font-mono text-xs"
                                                        placeholder="Seats"
                                                    />
                                                )}
                                                <button
                                                    onClick={() => updateUserPlan(user.id, selectedPlan, selectedSeats)}
                                                    disabled={isUpdatingPlan}
                                                    className="px-2 py-1 bg-green-500 text-white text-xs font-mono border-2 border-black hover:bg-green-600 disabled:opacity-50"
                                                >
                                                    {isUpdatingPlan ? '...' : '✓'}
                                                </button>
                                                <button
                                                    onClick={() => setEditingPlanFor(null)}
                                                    disabled={isUpdatingPlan}
                                                    className="px-2 py-1 bg-gray-300 text-black text-xs font-mono border-2 border-black hover:bg-gray-400 disabled:opacity-50"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingPlanFor(user.id);
                                                        setSelectedPlan(user.planType as PlanType);
                                                        setSelectedSeats(5); // Default to 5 seats for team plans
                                                    }}
                                                    className="px-3 py-1 bg-yellow-400 text-black text-xs font-mono border-2 border-black hover:bg-yellow-500"
                                                >
                                                    Change Plan
                                                </button>
                                                {!user.isAdmin && (
                                                    <button
                                                        onClick={() => deleteUser(user.id, user.email)}
                                                        className="px-3 py-1 bg-red-500 text-white text-xs font-mono border-2 border-black hover:bg-red-600"
                                                        title="Delete user"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="p-12 text-center text-gray-500 font-mono">
                        No users found matching your filters.
                    </div>
                )}
            </div>

                {/* Footer Info */}
                <div className="bg-gray-50 p-4 border-2 border-black text-center">
                    <p className="text-sm font-mono text-gray-600">
                        Showing {filteredUsers.length} of {users.length} users
                    </p>
                </div>
            </>
            )}
        </div>
    );
}

export default AdminTab;
