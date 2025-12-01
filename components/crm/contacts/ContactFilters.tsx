import React from 'react';
import { Search, Filter, ChevronDown, X } from 'lucide-react';

interface ContactFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    filterBy: 'all' | 'linked' | 'unlinked';
    onFilterByChange: (filter: 'all' | 'linked' | 'unlinked') => void;
    filterByTag: string;
    onFilterByTagChange: (tag: string) => void;
    allTags: string[];
    crmTypeLabel: string;
    // Advanced filters
    showAdvancedFilters: boolean;
    onToggleAdvancedFilters: () => void;
    filterByTitle: string;
    onFilterByTitleChange: (title: string) => void;
    filterByNoteCount: 'any' | 'none' | 'has';
    onFilterByNoteCountChange: (filter: 'any' | 'none' | 'has') => void;
    filterByMeetingCount: 'any' | 'none' | 'has';
    onFilterByMeetingCountChange: (filter: 'any' | 'none' | 'has') => void;
    onClearAdvancedFilters: () => void;
    hasActiveAdvancedFilters: boolean;
}

export function ContactFilters({
    searchQuery,
    onSearchChange,
    filterBy,
    onFilterByChange,
    filterByTag,
    onFilterByTagChange,
    allTags,
    crmTypeLabel,
    showAdvancedFilters,
    onToggleAdvancedFilters,
    filterByTitle,
    onFilterByTitleChange,
    filterByNoteCount,
    onFilterByNoteCountChange,
    filterByMeetingCount,
    onFilterByMeetingCountChange,
    onClearAdvancedFilters,
    hasActiveAdvancedFilters
}: ContactFiltersProps) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label htmlFor="contact-search" className="sr-only">Search contacts</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        id="contact-search"
                        name="contact-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search contacts..."
                        className="w-full bg-white border border-gray-200 text-gray-900 pl-9 pr-3 py-2 rounded-md text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
                    />
                </div>
                <label htmlFor="contact-filter-by" className="sr-only">Filter by status</label>
                <select
                    id="contact-filter-by"
                    name="contact-filter-by"
                    value={filterBy}
                    onChange={(e) => onFilterByChange(e.target.value as any)}
                    className="w-full bg-white border border-gray-200 text-gray-900 p-2 rounded-md text-sm focus:outline-none focus:border-gray-400"
                >
                    <option value="all">All Contacts</option>
                    <option value="linked">Linked to {crmTypeLabel}s</option>
                    <option value="unlinked">Unlinked Contacts</option>
                </select>
                <label htmlFor="contact-filter-tag" className="sr-only">Filter by tag</label>
                <select
                    id="contact-filter-tag"
                    name="contact-filter-tag"
                    value={filterByTag}
                    onChange={(e) => onFilterByTagChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-900 p-2 rounded-md text-sm focus:outline-none focus:border-gray-400"
                >
                    <option value="">All Tags</option>
                    {allTags.map(tag => (
                        <option key={tag} value={tag}>
                            {tag}
                        </option>
                    ))}
                </select>
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onToggleAdvancedFilters}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                    <Filter className="w-3.5 h-3.5" />
                    {showAdvancedFilters ? 'Hide Advanced Filters' : 'Advanced Filters'}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                </button>
                {hasActiveAdvancedFilters && (
                    <button
                        onClick={onClearAdvancedFilters}
                        className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                    >
                        <X className="w-3 h-3" />
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label htmlFor="filter-by-title" className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Title Contains
                        </label>
                        <input
                            id="filter-by-title"
                            name="filter-by-title"
                            type="text"
                            value={filterByTitle}
                            onChange={(e) => onFilterByTitleChange(e.target.value)}
                            placeholder="e.g., CEO, Manager..."
                            className="w-full bg-white border border-gray-200 text-gray-900 p-2 text-sm rounded-md focus:outline-none focus:border-gray-400"
                        />
                    </div>
                    <div>
                        <label htmlFor="filter-by-note-count" className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Notes
                        </label>
                        <select
                            id="filter-by-note-count"
                            name="filter-by-note-count"
                            value={filterByNoteCount}
                            onChange={(e) => onFilterByNoteCountChange(e.target.value as any)}
                            className="w-full bg-white border border-gray-200 text-gray-900 p-2 text-sm rounded-md focus:outline-none focus:border-gray-400"
                        >
                            <option value="any">Any</option>
                            <option value="has">Has Notes</option>
                            <option value="none">No Notes</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filter-by-meeting-count" className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Meetings
                        </label>
                        <select
                            id="filter-by-meeting-count"
                            name="filter-by-meeting-count"
                            value={filterByMeetingCount}
                            onChange={(e) => onFilterByMeetingCountChange(e.target.value as any)}
                            className="w-full bg-white border border-gray-200 text-gray-900 p-2 text-sm rounded-md focus:outline-none focus:border-gray-400"
                        >
                            <option value="any">Any</option>
                            <option value="has">Has Meetings</option>
                            <option value="none">No Meetings</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ContactFilters;
