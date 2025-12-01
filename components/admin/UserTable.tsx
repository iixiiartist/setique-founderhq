import React from 'react';
import { UserSignup, PlanType, getTimeSince } from './types';

interface UserTableProps {
    users: UserSignup[];
    totalUsers: number;
    editingPlanFor: string | null;
    selectedPlan: PlanType;
    selectedSeats: number;
    isUpdatingPlan: boolean;
    onEditPlan: (userId: string, currentPlan: PlanType) => void;
    onCancelEdit: () => void;
    onPlanChange: (plan: PlanType) => void;
    onSeatsChange: (seats: number) => void;
    onUpdatePlan: (userId: string) => void;
    onDeleteUser: (userId: string, email: string) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
    users,
    totalUsers,
    editingPlanFor,
    selectedPlan,
    selectedSeats,
    isUpdatingPlan,
    onEditPlan,
    onCancelEdit,
    onPlanChange,
    onSeatsChange,
    onUpdatePlan,
    onDeleteUser
}) => {
    return (
        <>
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
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
                        <tbody className="divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="font-mono text-sm font-semibold text-black">
                                                {user.fullName}
                                            </div>
                                            {user.isAdmin && (
                                                <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-mono border border-red-700 rounded">
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
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-mono border border-green-300 rounded">
                                                ✓ Confirmed
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-mono border border-red-300 rounded">
                                                ⚠ Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-mono border border-gray-300 rounded ${
                                            user.planType === 'free' ? 'bg-gray-100 text-gray-800' :
                                            'bg-purple-100 text-purple-800'
                                        }`}>
                                            {user.planType === 'free' ? 'FREE' :
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
                                                    onChange={(e) => onPlanChange(e.target.value as PlanType)}
                                                    disabled={isUpdatingPlan}
                                                    className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black font-mono text-xs"
                                                >
                                                    <option value="free">Free</option>
                                                    <option value="team-pro">Team Pro</option>
                                                </select>
                                                {selectedPlan === 'team-pro' && (
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="100"
                                                        value={selectedSeats}
                                                        onChange={(e) => onSeatsChange(parseInt(e.target.value) || 1)}
                                                        disabled={isUpdatingPlan}
                                                        className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black font-mono text-xs"
                                                        placeholder="Seats"
                                                    />
                                                )}
                                                <button
                                                    onClick={() => onUpdatePlan(user.id)}
                                                    disabled={isUpdatingPlan}
                                                    className="px-2 py-1 bg-green-500 text-white text-xs font-mono border border-green-600 rounded hover:bg-green-600 disabled:opacity-50"
                                                >
                                                    {isUpdatingPlan ? '...' : '✓'}
                                                </button>
                                                <button
                                                    onClick={onCancelEdit}
                                                    disabled={isUpdatingPlan}
                                                    className="px-2 py-1 bg-gray-300 text-black text-xs font-mono border border-gray-400 rounded hover:bg-gray-400 disabled:opacity-50"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => onEditPlan(user.id, user.planType as PlanType)}
                                                    className="px-3 py-1 bg-yellow-400 text-black text-xs font-mono border border-yellow-500 rounded hover:bg-yellow-500"
                                                >
                                                    Change Plan
                                                </button>
                                                {!user.isAdmin && (
                                                    <button
                                                        onClick={() => onDeleteUser(user.id, user.email)}
                                                        className="px-3 py-1 bg-red-500 text-white text-xs font-mono border border-red-600 rounded hover:bg-red-600"
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

                {users.length === 0 && (
                    <div className="p-12 text-center text-gray-500 font-mono">
                        No users found matching your filters.
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg text-center">
                <p className="text-sm font-mono text-gray-600">
                    Showing {users.length} of {totalUsers} users
                </p>
            </div>
        </>
    );
};
