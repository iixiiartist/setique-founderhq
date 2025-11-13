import React, { useState, useMemo } from 'react';
import { AnyCrmItem, Priority } from '../../types';

interface FollowUpsManagerProps {
    allCrmItems: AnyCrmItem[];
    userId?: string;
}

export const FollowUpsManager: React.FC<FollowUpsManagerProps> = ({
    allCrmItems,
    userId
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterByPriority, setFilterByPriority] = useState<string>('');
    const [filterOverdue, setFilterOverdue] = useState(false);
    const [filterAssignment, setFilterAssignment] = useState<'all' | 'my' | 'unassigned'>('all');
    const [showCompleted, setShowCompleted] = useState(false);

    // Filter items with next actions
    const followUpItems = useMemo(() => {
        return allCrmItems.filter(item => item.nextAction && item.nextAction.trim());
    }, [allCrmItems]);

    // Apply filters
    const filteredItems = useMemo(() => {
        let filtered = followUpItems;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.company.toLowerCase().includes(query) ||
                (item.nextAction && item.nextAction.toLowerCase().includes(query))
            );
        }

        // Priority filter
        if (filterByPriority) {
            filtered = filtered.filter(item => item.priority === filterByPriority);
        }

        // Assignment filter
        if (filterAssignment === 'my') {
            filtered = filtered.filter(item => item.assignedTo === userId);
        } else if (filterAssignment === 'unassigned') {
            filtered = filtered.filter(item => !item.assignedTo);
        }

        // Overdue filter
        if (filterOverdue) {
            const todayStr = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(item => item.nextActionDate && item.nextActionDate < todayStr);
        }

        // Sort by date (closest first)
        filtered.sort((a, b) => {
            if (!a.nextActionDate && !b.nextActionDate) return 0;
            if (!a.nextActionDate) return 1;
            if (!b.nextActionDate) return -1;
            return a.nextActionDate.localeCompare(b.nextActionDate);
        });

        return filtered;
    }, [followUpItems, searchQuery, filterByPriority, filterAssignment, filterOverdue, userId]);

    // Group by date
    const groupedItems = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const groups: { [key: string]: AnyCrmItem[] } = {
            overdue: [],
            today: [],
            tomorrow: [],
            upcoming: [],
            noDate: []
        };

        filteredItems.forEach(item => {
            if (!item.nextActionDate) {
                groups.noDate.push(item);
            } else if (item.nextActionDate < todayStr) {
                groups.overdue.push(item);
            } else if (item.nextActionDate === todayStr) {
                groups.today.push(item);
            } else if (item.nextActionDate === tomorrowStr) {
                groups.tomorrow.push(item);
            } else {
                groups.upcoming.push(item);
            }
        });

        return groups;
    }, [filteredItems]);

    const getItemTypeLabel = (item: AnyCrmItem) => {
        if ('checkSize' in item) return '💼 Investor';
        if ('dealValue' in item) return '🛍️ Customer';
        if ('opportunity' in item) return '🤝 Partner';
        return '📊 Account';
    };

    const getPriorityColor = (priority: Priority) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-800 border-red-400';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-400';
            case 'Low': return 'bg-green-100 text-green-800 border-green-400';
            default: return 'bg-gray-100 text-gray-800 border-gray-400';
        }
    };

    const renderFollowUpCard = (item: AnyCrmItem) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const isOverdue = item.nextActionDate && item.nextActionDate < todayStr;
        const isToday = item.nextActionDate === todayStr;

        return (
            <div
                key={item.id}
                className={`bg-white border-2 p-4 shadow-neo hover:shadow-neo-lg transition-all ${
                    isOverdue ? 'border-red-500' : isToday ? 'border-blue-500' : 'border-black'
                }`}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-sm">{getItemTypeLabel(item)}</span>
                            <h4 className="font-bold text-lg text-black truncate">
                                {item.company}
                            </h4>
                        </div>

                        <p className="text-gray-800 font-semibold mb-2">
                            {item.nextAction}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-1 border text-xs font-mono font-semibold ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                            </span>
                            {item.nextActionDate && (
                                <span className={`px-2 py-1 border text-xs font-mono ${
                                    isOverdue ? 'bg-red-500 text-white border-red-700 font-bold' :
                                    isToday ? 'bg-blue-500 text-white border-blue-700 font-bold' :
                                    'bg-gray-100 text-gray-700 border-gray-400'
                                }`}>
                                    📅 {new Date(item.nextActionDate + 'T00:00:00').toLocaleDateString(undefined, { 
                                        month: 'short', 
                                        day: 'numeric',
                                        timeZone: 'UTC'
                                    })}
                                    {item.nextActionTime && ` at ${item.nextActionTime}`}
                                </span>
                            )}
                            {item.assignedToName && (
                                <span className="px-2 py-1 bg-purple-50 border border-purple-300 text-xs font-mono text-purple-700">
                                    → {item.assignedToName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderGroup = (title: string, items: AnyCrmItem[], emoji: string, color: string) => {
        if (items.length === 0) return null;

        return (
            <div key={title} className="mb-6">
                <h4 className={`font-mono font-bold text-lg mb-3 ${color} flex items-center gap-2`}>
                    <span>{emoji}</span>
                    <span>{title}</span>
                    <span className="text-sm font-normal">({items.length})</span>
                </h4>
                <div className="space-y-2">
                    {items.map(renderFollowUpCard)}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="font-mono font-bold text-xl">
                    📋 Follow Ups ({filteredItems.length})
                </h3>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                    <label htmlFor="followups-search" className="sr-only">Search follow ups</label>
                    <input
                        id="followups-search"
                        name="followups-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search follow ups..."
                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="followups-priority" className="sr-only">Filter by priority</label>
                    <select
                        id="followups-priority"
                        name="followups-priority"
                        value={filterByPriority}
                        onChange={(e) => setFilterByPriority(e.target.value)}
                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                    >
                        <option value="">All Priorities</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="followups-assignment" className="sr-only">Filter by assignment</label>
                    <select
                        id="followups-assignment"
                        name="followups-assignment"
                        value={filterAssignment}
                        onChange={(e) => setFilterAssignment(e.target.value as any)}
                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">All Follow Ups</option>
                        <option value="my">My Follow Ups</option>
                        <option value="unassigned">Unassigned</option>
                    </select>
                </div>
                <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filterOverdue}
                            onChange={(e) => setFilterOverdue(e.target.checked)}
                            className="w-4 h-4 accent-red-500 border-2 border-black rounded-none"
                        />
                        <span className="text-sm font-mono font-semibold">
                            Overdue Only
                        </span>
                    </label>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Overdue', count: groupedItems.overdue.length, color: 'bg-red-100 border-red-400 text-red-800' },
                    { label: 'Today', count: groupedItems.today.length, color: 'bg-blue-100 border-blue-400 text-blue-800' },
                    { label: 'Tomorrow', count: groupedItems.tomorrow.length, color: 'bg-green-100 border-green-400 text-green-800' },
                    { label: 'Upcoming', count: groupedItems.upcoming.length, color: 'bg-purple-100 border-purple-400 text-purple-800' },
                    { label: 'No Date', count: groupedItems.noDate.length, color: 'bg-gray-100 border-gray-400 text-gray-800' }
                ].map(stat => (
                    <div key={stat.label} className={`border-2 p-3 text-center ${stat.color}`}>
                        <div className="text-2xl font-bold font-mono">{stat.count}</div>
                        <div className="text-xs font-mono">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Follow Up Groups */}
            <div className="space-y-4">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p className="text-lg font-semibold">No follow ups found</p>
                        <p className="text-sm mt-2">Add next actions to your accounts to see them here.</p>
                    </div>
                ) : (
                    <>
                        {renderGroup('🚨 Overdue', groupedItems.overdue, '🚨', 'text-red-600')}
                        {renderGroup('📍 Today', groupedItems.today, '📍', 'text-blue-600')}
                        {renderGroup('📅 Tomorrow', groupedItems.tomorrow, '📅', 'text-green-600')}
                        {renderGroup('🗓️ Upcoming', groupedItems.upcoming, '🗓️', 'text-purple-600')}
                        {renderGroup('📝 No Date Set', groupedItems.noDate, '📝', 'text-gray-600')}
                    </>
                )}
            </div>
        </div>
    );
};
