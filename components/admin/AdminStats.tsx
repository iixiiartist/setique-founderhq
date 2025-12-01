import React from 'react';
import { SignupStats } from './types';

interface AdminStatsProps {
    stats: SignupStats;
}

export const AdminStats: React.FC<AdminStatsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-black font-mono">{stats.total}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-mono">Total Users</div>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-green-700 font-mono">{stats.today}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-mono">Today</div>
            </div>
            <div className="bg-blue-50 p-3 sm:p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-blue-700 font-mono">{stats.thisWeek}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-mono">This Week</div>
            </div>
            <div className="bg-purple-50 p-3 sm:p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-purple-700 font-mono">{stats.thisMonth}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-mono">This Month</div>
            </div>
            <div className="bg-emerald-50 p-3 sm:p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono">{stats.confirmed}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-mono">✓ Confirmed</div>
            </div>
            <div className="bg-red-50 p-3 sm:p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-red-700 font-mono">{stats.unconfirmed}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-mono">⚠ Unconfirmed</div>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-gray-700 font-mono">{stats.freePlan}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-mono">Free Plan</div>
            </div>
            <div className="bg-yellow-50 p-3 sm:p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-yellow-700 font-mono">{stats.paidPlan}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-mono">Paid Plans</div>
            </div>
        </div>
    );
};
