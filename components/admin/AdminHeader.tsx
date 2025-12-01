import React from 'react';

interface AdminHeaderProps {
    activeTab: 'users' | 'automations';
    onTabChange: (tab: 'users' | 'automations') => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ activeTab, onTabChange }) => {
    return (
        <>
            {/* Header */}
            <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                    🔐 Admin Dashboard
                </h1>
                <p className="text-gray-300 text-xs sm:text-sm mt-1">
                    User Signups, Analytics & Automation Monitoring
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto mt-4">
                <button
                    onClick={() => onTabChange('users')}
                    className={`px-3 sm:px-4 py-2 min-h-[44px] rounded-t-xl font-semibold text-sm sm:text-base whitespace-nowrap transition-colors ${
                        activeTab === 'users' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-gray-100 border border-gray-200 border-b-0'
                    }`}
                >
                    👥 Users
                </button>
                <button
                    onClick={() => onTabChange('automations')}
                    className={`px-3 sm:px-4 py-2 min-h-[44px] rounded-t-xl font-semibold text-sm sm:text-base whitespace-nowrap transition-colors ${
                        activeTab === 'automations' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-gray-100 border border-gray-200 border-b-0'
                    }`}
                >
                    ⚙️ Automations
                </button>
            </div>
        </>
    );
};
