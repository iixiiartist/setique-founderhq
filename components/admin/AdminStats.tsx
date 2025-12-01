import React from 'react';
import { SignupStats } from './types';

interface AdminStatsProps {
    stats: SignupStats;
}

export const AdminStats: React.FC<AdminStatsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.total}</div>
                <div className="text-xs sm:text-sm text-slate-600">Total Users</div>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.today}</div>
                <div className="text-xs sm:text-sm text-slate-600">Today</div>
            </div>
            <div className="bg-gray-100 p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.thisWeek}</div>
                <div className="text-xs sm:text-sm text-slate-600">This Week</div>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.thisMonth}</div>
                <div className="text-xs sm:text-sm text-slate-600">This Month</div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.confirmed}</div>
                <div className="text-xs sm:text-sm text-slate-600">✓ Confirmed</div>
            </div>
            <div className="bg-gray-100 p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.unconfirmed}</div>
                <div className="text-xs sm:text-sm text-slate-600">⚠ Unconfirmed</div>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.freePlan}</div>
                <div className="text-xs sm:text-sm text-slate-600">Free Plan</div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.paidPlan}</div>
                <div className="text-xs sm:text-sm text-slate-600">Paid Plans</div>
            </div>
        </div>
    );
};
