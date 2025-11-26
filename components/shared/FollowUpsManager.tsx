import React, { useState, useMemo } from 'react';
import { 
    Search, Clock, Calendar, AlertCircle, CheckCircle, CalendarClock, FileText, User
} from 'lucide-react';
import { AnyCrmItem, Priority } from '../../types';

interface FollowUpsManagerProps {
    allCrmItems: AnyCrmItem[];
    userId?: string;
}

export function FollowUpsManager({
    allCrmItems,
    userId
}: FollowUpsManagerProps) {
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
        if ('checkSize' in item) return 'Investor';
        if ('dealValue' in item) return 'Customer';
        if ('opportunity' in item) return 'Partner';
        return 'Account';
    };

    const getPriorityColor = (priority: Priority) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-700';
            case 'Medium': return 'bg-yellow-100 text-yellow-700';
            case 'Low': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const renderFollowUpCard = (item: AnyCrmItem) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const isOverdue = item.nextActionDate && item.nextActionDate < todayStr;
        const isToday = item.nextActionDate === todayStr;

        return (
            <div
                key={item.id}
                className={`bg-white rounded-lg border p-3 hover:shadow-sm transition-all ${
                    isOverdue 
                        ? 'border-red-200 bg-red-50/30' 
                        : isToday 
                            ? 'border-gray-300 bg-gray-50/30' 
                            : 'border-gray-200 hover:border-gray-300'
                }`}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs text-gray-400 uppercase tracking-wide">{getItemTypeLabel(item)}</span>
                            <h4 className="font-medium text-sm text-gray-900 truncate">
                                {item.company}
                            </h4>
                        </div>

                        <p className="text-sm text-gray-700 mb-2">
                            {item.nextAction}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                            </span>
                            {item.nextActionDate && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                                    isOverdue ? 'bg-red-100 text-red-700' :
                                    isToday ? 'bg-gray-900 text-white' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    <Calendar className="w-3 h-3" />
                                    {new Date(item.nextActionDate + 'T00:00:00').toLocaleDateString(undefined, { 
                                        month: 'short', 
                                        day: 'numeric',
                                        timeZone: 'UTC'
                                    })}
                                    {item.nextActionTime && ` ${item.nextActionTime}`}
                                </span>
                            )}
                            {item.assignedToName && (
                                <span className="px-2 py-0.5 bg-gray-50 rounded text-xs text-gray-500 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {item.assignedToName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderGroup = (title: string, items: AnyCrmItem[], icon: React.ReactNode, color: string) => {
        if (items.length === 0) return null;

        return (
            <div key={title} className="mb-6">
                <h4 className={`flex items-center gap-2 text-sm font-medium mb-3 ${color}`}>
                    {icon}
                    <span>{title}</span>
                    <span className="text-gray-400 font-normal">({items.length})</span>
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
                <div className="flex items-center gap-3">
                    <CalendarClock className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-lg text-gray-900">
                        Follow Ups
                    </h3>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {filteredItems.length}
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <label htmlFor="followups-search" className="sr-only">Search follow ups</label>
                    <input
                        id="followups-search"
                        name="followups-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search follow ups..."
                        className="w-full bg-white border border-gray-200 text-gray-900 pl-9 pr-3 py-2 rounded-md text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
                    />
                </div>
                <div>
                    <label htmlFor="followups-priority" className="sr-only">Filter by priority</label>
                    <select
                        id="followups-priority"
                        name="followups-priority"
                        value={filterByPriority}
                        onChange={(e) => setFilterByPriority(e.target.value)}
                        className="w-full bg-white border border-gray-200 text-gray-900 p-2 rounded-md text-sm focus:outline-none focus:border-gray-400"
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
                        className="w-full bg-white border border-gray-200 text-gray-900 p-2 rounded-md text-sm focus:outline-none focus:border-gray-400"
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
                            className="w-4 h-4 accent-red-500 rounded"
                        />
                        <span className="text-sm text-gray-600">
                            Overdue Only
                        </span>
                    </label>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Overdue', count: groupedItems.overdue.length, color: 'bg-red-50 border-red-200 text-red-700', icon: <AlertCircle className="w-4 h-4" /> },
                    { label: 'Today', count: groupedItems.today.length, color: 'bg-gray-100 border-gray-300 text-gray-800', icon: <Clock className="w-4 h-4" /> },
                    { label: 'Tomorrow', count: groupedItems.tomorrow.length, color: 'bg-green-50 border-green-200 text-green-700', icon: <Calendar className="w-4 h-4" /> },
                    { label: 'Upcoming', count: groupedItems.upcoming.length, color: 'bg-gray-50 border-gray-200 text-gray-600', icon: <CalendarClock className="w-4 h-4" /> },
                    { label: 'No Date', count: groupedItems.noDate.length, color: 'bg-gray-50 border-gray-200 text-gray-500', icon: <FileText className="w-4 h-4" /> }
                ].map(stat => (
                    <div key={stat.label} className={`border rounded-lg p-3 ${stat.color}`}>
                        <div className="flex items-center justify-between">
                            <div className="text-xl font-semibold">{stat.count}</div>
                            {stat.icon}
                        </div>
                        <div className="text-xs mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Follow Up Groups */}
            <div className="space-y-4">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No follow ups found</p>
                        <p className="text-xs mt-1">Add next actions to your accounts to see them here.</p>
                    </div>
                ) : (
                    <>
                        {renderGroup('Overdue', groupedItems.overdue, <AlertCircle className="w-4 h-4" />, 'text-red-600')}
                        {renderGroup('Today', groupedItems.today, <Clock className="w-4 h-4" />, 'text-gray-900')}
                        {renderGroup('Tomorrow', groupedItems.tomorrow, <Calendar className="w-4 h-4" />, 'text-green-600')}
                        {renderGroup('Upcoming', groupedItems.upcoming, <CalendarClock className="w-4 h-4" />, 'text-gray-600')}
                        {renderGroup('No Date Set', groupedItems.noDate, <FileText className="w-4 h-4" />, 'text-gray-500')}
                    </>
                )}
            </div>
        </div>
    );
};
