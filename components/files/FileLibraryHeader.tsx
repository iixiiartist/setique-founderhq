import React from 'react';
import { TabType } from '../../types';
import { NAV_ITEMS } from '../../constants';
import {
    Grid,
    List,
    Search,
    ChevronRight,
    Filter,
    HardDrive
} from 'lucide-react';

export type ViewMode = 'grid' | 'list';
export type SortOption = 'newest' | 'name' | 'size' | 'views';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
    { id: 'newest', label: 'Newest first' },
    { id: 'name', label: 'Name (A-Z)' },
    { id: 'size', label: 'File size' },
    { id: 'views', label: 'Most viewed' }
];

interface FileLibraryHeaderProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    sortOption: SortOption;
    onSortChange: (option: SortOption) => void;
    selectedModule: TabType | null;
    onResetFilters: () => void;
    onOpenMobileSidebar: () => void;
}

export function FileLibraryHeader({
    searchQuery,
    onSearchChange,
    viewMode,
    onViewModeChange,
    sortOption,
    onSortChange,
    selectedModule,
    onResetFilters,
    onOpenMobileSidebar
}: FileLibraryHeaderProps) {
    return (
        <header className="min-h-[64px] sm:h-20 bg-white border-b border-gray-200 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-6 px-3 sm:px-8 py-2 sm:py-0">
            {/* Mobile menu button */}
            <button
                onClick={onOpenMobileSidebar}
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center border border-gray-200 rounded-lg"
            >
                <HardDrive size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm font-semibold uppercase tracking-tight">
                <span className="cursor-pointer" onClick={onResetFilters}>Drive</span>
                {selectedModule && (
                    <>
                        <ChevronRight size={16} />
                        <span className="truncate max-w-[100px]">{NAV_ITEMS.find(item => item.id === selectedModule)?.label}</span>
                    </>
                )}
            </div>
            <div className="flex-1 relative max-w-xl min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                <input
                    value={searchQuery}
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 min-h-[44px] sm:min-h-0 border rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex items-center gap-2">
                    <Filter size={16} />
                    <select
                        value={sortOption}
                        onChange={e => onSortChange(e.target.value as SortOption)}
                        className="bg-white border px-2 py-1 text-sm rounded"
                    >
                        {SORT_OPTIONS.map(option => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div className="flex border rounded overflow-hidden">
                    <button
                        className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 px-3 py-2 border-r flex items-center justify-center ${viewMode === 'list' ? 'bg-black text-white' : 'bg-white'}`}
                        onClick={() => onViewModeChange('list')}
                    >
                        <List size={16} />
                    </button>
                    <button
                        className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 px-3 py-2 flex items-center justify-center ${viewMode === 'grid' ? 'bg-black text-white' : 'bg-white'}`}
                        onClick={() => onViewModeChange('grid')}
                    >
                        <Grid size={16} />
                    </button>
                </div>
            </div>
        </header>
    );
}
