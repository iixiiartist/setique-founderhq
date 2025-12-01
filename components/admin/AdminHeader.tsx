import React from 'react';

interface AdminHeaderProps {
    activeTab: 'users' | 'automations';
    onTabChange: (tab: 'users' | 'automations') => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ activeTab, onTabChange }) => {
    return (
        <>
            {/* Header */}
            <div className="bg-black p-4 sm:p-6 border-2 border-black">
                <h1 className="text-xl sm:text-2xl font-bold text-yellow-400 font-mono">
                    🔐 ADMIN DASHBOARD
                </h1>
                <p className="text-white font-mono text-xs sm:text-sm mt-1">
                    User Signups, Analytics & Automation Monitoring
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto">
                <button
                    onClick={() => onTabChange('users')}
                    className={`font-mono px-3 sm:px-4 py-2 min-h-[44px] border border-gray-200 rounded-t-md font-semibold text-sm sm:text-base whitespace-nowrap ${
                        activeTab === 'users' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
                    }`}
                >
                    👥 Users
                </button>
                <button
                    onClick={() => onTabChange('automations')}
                    className={`font-mono px-3 sm:px-4 py-2 min-h-[44px] border border-gray-200 rounded-t-md font-semibold text-sm sm:text-base whitespace-nowrap ${
                        activeTab === 'automations' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
                    }`}
                >
                    ⚙️ Automations
                </button>
            </div>
        </>
    );
};
