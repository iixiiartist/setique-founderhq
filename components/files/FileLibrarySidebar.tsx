import React from 'react';
import { Document, TabType, DocumentActivity } from '../../types';
import { NAV_ITEMS } from '../../constants';
import { Button } from '../ui/Button';
import {
    Upload,
    Clock,
    HardDrive,
    Folder,
    LayoutGrid,
    Star,
    User,
    Link2,
    RefreshCw,
    Tag,
    Activity as ActivityIcon
} from 'lucide-react';

export type QuickFilter = 'all' | 'starred' | 'recent' | 'mine' | 'linked';

interface FileLibrarySidebarProps {
    documents: Document[];
    quickFilter: QuickFilter;
    onQuickFilterChange: (filter: QuickFilter) => void;
    selectedModule: TabType | null;
    onModuleChange: (module: TabType | null) => void;
    tagFilters: string[];
    onTagFiltersChange: (tags: string[]) => void;
    availableTags: string[];
    recentActivity: DocumentActivity[];
    activityLoading: boolean;
    onUploadClick: () => void;
    onResetFilters: () => void;
    showMobileSidebar: boolean;
    onCloseMobileSidebar: () => void;
    // Stats
    totalFiles: number;
    recentCount: number;
    totalSize: number;
    starredCount: number;
    linkedCount: number;
    moduleCounts: Record<string, number>;
}

const QUICK_FILTERS: { id: QuickFilter; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All files', icon: <LayoutGrid size={16} /> },
    { id: 'starred', label: 'Starred', icon: <Star size={16} /> },
    { id: 'recent', label: 'Recent', icon: <Clock size={16} /> },
    { id: 'mine', label: 'My uploads', icon: <User size={16} /> },
    { id: 'linked', label: 'Linked', icon: <Link2 size={16} /> }
];

export function FileLibrarySidebar({
    quickFilter,
    onQuickFilterChange,
    selectedModule,
    onModuleChange,
    tagFilters,
    onTagFiltersChange,
    availableTags,
    recentActivity,
    activityLoading,
    onUploadClick,
    onResetFilters,
    showMobileSidebar,
    onCloseMobileSidebar,
    totalFiles,
    recentCount,
    totalSize,
    starredCount,
    linkedCount,
    moduleCounts
}: FileLibrarySidebarProps) {
    return (
        <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-[85vw] sm:w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-transform duration-300 lg:translate-x-0 ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Mobile close button */}
            <button
                onClick={onCloseMobileSidebar}
                className="lg:hidden absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 z-10"
            >
                ×
            </button>
            <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-yellow-300 border border-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HardDrive className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs tracking-[0.3em] font-black">Workspace</p>
                        <h2 className="text-xl sm:text-2xl font-black leading-none">File Library</h2>
                    </div>
                </div>
                <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-3">
                    <StatCard label="Files" value={totalFiles} helper={`${recentCount} added this week`} />
                    <StatCard label="Storage" value={formatSize(totalSize)} helper="Base64 storage" />
                    <StatCard label="Starred" value={starredCount} helper="Pinned favourites" />
                    <StatCard label="Linked" value={linkedCount} helper="Connected records" />
                </div>
                <div className="mt-4 sm:mt-5 flex gap-2 sm:gap-3">
                    <Button fullWidth className="justify-center gap-2 min-h-[44px] sm:min-h-0 text-sm" onClick={onUploadClick}>
                        <Upload size={16} /> Upload
                    </Button>
                    <Button fullWidth variant="secondary" className="justify-center gap-2 min-h-[44px] sm:min-h-0 text-sm" onClick={onResetFilters}>
                        <RefreshCw size={16} /> Reset
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4 space-y-6 bg-[#FEFBF3]">
                <div>
                    <p className="text-xs font-black tracking-[0.3em] mb-3">Quick filters</p>
                    <div className="space-y-2">
                        {QUICK_FILTERS.map(filter => (
                            <QuickFilterButton
                                key={filter.id}
                                icon={filter.icon}
                                label={filter.label}
                                active={quickFilter === filter.id}
                                onClick={() => onQuickFilterChange(filter.id)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <p className="text-xs font-black tracking-[0.3em] mb-3">Modules</p>
                    <div className="space-y-2">
                        {NAV_ITEMS.filter(item => item.id !== 'dashboard' && item.id !== 'settings').map(item => (
                            <button
                                key={item.id}
                                className={`w-full flex items-center justify-between px-3 py-2 border text-sm font-semibold rounded ${selectedModule === item.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}
                                onClick={() => onModuleChange(selectedModule === item.id ? null : (item.id as TabType))}
                            >
                                <span className="flex items-center gap-2"><Folder size={16} /> {item.label}</span>
                                <span className="text-xs font-black">{moduleCounts[item.id] || 0}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {availableTags.length > 0 && (
                    <div>
                        <p className="text-xs font-black tracking-[0.3em] mb-3">Tag filters</p>
                        <div className="flex flex-wrap gap-2">
                            {availableTags.map(tag => (
                                <TagToggle
                                    key={tag}
                                    label={tag}
                                    active={tagFilters.includes(tag)}
                                    onToggle={() =>
                                        onTagFiltersChange(tagFilters.includes(tag) ? tagFilters.filter(t => t !== tag) : [...tagFilters, tag])
                                    }
                                />
                            ))}
                            {tagFilters.length > 0 && (
                                <button className="text-xs uppercase" onClick={() => onTagFiltersChange([])}>
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div>
                    <p className="text-xs font-black tracking-[0.3em] mb-3">Team activity</p>
                    <ActivityList items={recentActivity} isLoading={activityLoading} compact />
                </div>
            </div>
        </aside>
    );
}

// Helper Components

function QuickFilterButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold border rounded ${active ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}
            onClick={onClick}
        >
            {icon}
            {label}
        </button>
    );
}

function TagToggle({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
    return (
        <button
            className={`px-2 py-1 border text-xs rounded ${active ? 'bg-black text-white' : 'bg-white'}`}
            onClick={onToggle}
        >
            <span className="flex items-center gap-1"><Tag size={12} /> {label}</span>
        </button>
    );
}

function StatCard({ label, value, helper }: { label: string; value: number | string; helper: string }) {
    return (
        <div className="border rounded px-3 py-2 bg-[#FFFBEB]">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-600">{label}</p>
            <p className="text-xl font-black">{value}</p>
            <p className="text-[10px] text-gray-600">{helper}</p>
        </div>
    );
}

function ActivityList({ items, isLoading, compact, emptyLabel }: { items: DocumentActivity[]; isLoading: boolean; compact?: boolean; emptyLabel?: string }) {
    if (isLoading) {
        return <p className="text-xs text-gray-500">Loading activity...</p>;
    }
    if (!items.length) {
        return <p className="text-xs text-gray-500">{emptyLabel || 'No activity yet'}</p>;
    }
    return (
        <ul className="space-y-2 text-xs">
            {items.map(item => (
                <li key={item.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 border rounded-full flex items-center justify-center bg-white">
                        <ActivityIcon size={12} />
                    </div>
                    <div>
                        <p><strong>{item.userName}</strong> {renderActionCopy(item)}</p>
                        {!compact && <p className="text-[10px] text-gray-500">{formatRelativeTime(item.createdAt)}</p>}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function renderActionCopy(activity: DocumentActivity) {
    switch (activity.action) {
        case 'uploaded':
            return 'uploaded this file';
        case 'downloaded':
            return 'downloaded this file';
        case 'shared':
            return 'shared this file';
        case 'tagged':
            return `tagged this file (${activity.details?.tag || ''})`;
        case 'starred':
            return activity.details?.value ? 'starred this file' : 'removed the star';
        case 'linked':
            return 'updated linked records';
        case 'viewed':
            return 'viewed this file';
        default:
            return activity.action;
    }
}

export function formatSize(bytes: number | undefined) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let size = bytes / 1024;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatRelativeTime(timestamp: number | undefined) {
    if (!timestamp) return 'N/A';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}
