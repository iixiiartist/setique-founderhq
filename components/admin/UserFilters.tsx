import React from 'react';

interface UserFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    filterPlan: string;
    onPlanFilterChange: (plan: string) => void;
    filterConfirmed: string;
    onConfirmedFilterChange: (confirmed: string) => void;
}

export const UserFilters: React.FC<UserFiltersProps> = ({
    searchQuery,
    onSearchChange,
    filterPlan,
    onPlanFilterChange,
    filterConfirmed,
    onConfirmedFilterChange
}) => {
    return (
        <div className="bg-white p-4 sm:p-6 border border-gray-200 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="sm:col-span-2 md:col-span-1">
                    <label className="block text-xs sm:text-sm font-bold font-mono text-black mb-1 sm:mb-2">
                        Search Users
                    </label>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Email or name..."
                        className="w-full px-3 sm:px-4 py-2 min-h-[44px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs sm:text-sm font-bold font-mono text-black mb-1 sm:mb-2">
                        Plan Type
                    </label>
                    <select
                        value={filterPlan}
                        onChange={(e) => onPlanFilterChange(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 min-h-[44px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm"
                    >
                        <option value="all">All Plans</option>
                        <option value="free">Free</option>
                        <option value="team-pro">Team Pro</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs sm:text-sm font-bold font-mono text-black mb-1 sm:mb-2">
                        Email Status
                    </label>
                    <select
                        value={filterConfirmed}
                        onChange={(e) => onConfirmedFilterChange(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 min-h-[44px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm"
                    >
                        <option value="all">All</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="unconfirmed">Unconfirmed</option>
                    </select>
                </div>
            </div>
        </div>
    );
};
