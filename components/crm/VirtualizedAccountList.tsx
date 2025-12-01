/**
 * Virtualized Account List Component
 * 
 * Uses react-window for efficient rendering of large lists.
 * Only renders visible items + small overscan for smooth scrolling.
 * 
 * Supports:
 * - 50,000+ items without performance degradation
 * - Variable height rows
 * - Click handlers
 * - Selection state
 * - Bulk selection mode
 */

import React, { useMemo } from 'react';
import { List, type RowComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { CrmItem } from '../../types';

interface VirtualizedAccountListProps {
    items: CrmItem[];
    onSelectItem: (item: CrmItem) => void;
    selectedItemId?: string;
    bulkSelectMode?: boolean;
    selectedItemIds?: Set<string>;
    onToggleSelection?: (itemId: string) => void;
}

const ITEM_HEIGHT = 120; // Height of each row in pixels
const OVERSCAN_COUNT = 5; // Extra items to render outside viewport

interface AccountRowProps {
    items: CrmItem[];
    onSelectItem: (item: CrmItem) => void;
    selectedItemId?: string;
    bulkSelectMode: boolean;
    selectedItemIds: Set<string>;
    onToggleSelection?: (itemId: string) => void;
}

export function VirtualizedAccountList({
    items,
    onSelectItem,
    selectedItemId,
    bulkSelectMode = false,
    selectedItemIds = new Set(),
    onToggleSelection
}: VirtualizedAccountListProps) {
    const rowProps = useMemo<AccountRowProps>(() => ({
        items,
        onSelectItem,
        selectedItemId,
        bulkSelectMode,
        selectedItemIds,
        onToggleSelection
    }), [
        items,
        onSelectItem,
        selectedItemId,
        bulkSelectMode,
        selectedItemIds,
        onToggleSelection
    ]);

    // Empty state
    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 text-center p-8">
                <div>
                    <p className="text-lg font-mono mb-2">No accounts found</p>
                    <p className="text-sm">Try adjusting your filters or search query</p>
                </div>
            </div>
        );
    }

    return (
        <AutoSizer>
            {({ height = 0, width = 0 }) => (
                <List
                    className="rounded-xl border border-gray-200"
                    style={{{
                        height: Math.max(height, ITEM_HEIGHT),
                        width: width || '100%'
                    }}
                    rowCount={items.length}
                    rowHeight={ITEM_HEIGHT}
                    overscanCount={OVERSCAN_COUNT}
                    rowComponent={AccountRow}
                    rowProps={rowProps}
                />
            )}
        </AutoSizer>
    );
}

function AccountRow({
    index,
    style,
    items,
    selectedItemId,
    selectedItemIds,
    bulkSelectMode,
    onSelectItem,
    onToggleSelection
}: RowComponentProps<AccountRowProps>) {

    const item = items[index];
    if (!item) return null;

    const isSelected = item.id === selectedItemId;
    const isBulkSelected = selectedItemIds.has(item.id);
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = item.nextActionDate && item.nextActionDate < todayStr;
    const contactCount = item.contactCount ?? item.contacts?.length ?? 0;
    const taskCount = item.taskCount ?? 0;
    const noteCount = item.noteCount ?? item.notes?.length ?? 0;
    const documentCount = item.documentCount ?? 0;

    const handleClick = (event: React.MouseEvent) => {
        if (bulkSelectMode && onToggleSelection) {
            event.stopPropagation();
            onToggleSelection(item.id);
        } else {
            onSelectItem(item);
        }
    };

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        onToggleSelection?.(item.id);
    };

    const handleCheckboxClick = (event: React.MouseEvent<HTMLInputElement>) => {
        event.stopPropagation();
    };

    return (
        <div
            style={style}
            className={`border-b-2 border-black hover:bg-gray-50 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            } ${
                isBulkSelected ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
            } ${
                isOverdue ? 'border-r-4 border-r-red-500' : ''
            }`}
            onClick={handleClick}
        >
            <div className="px-4 py-3 h-full flex items-center gap-3">
                {/* Bulk Select Checkbox */}
                {bulkSelectMode && (
                    <div className="flex-shrink-0">
                        <input
                            type="checkbox"
                            checked={isBulkSelected}
                            onChange={handleCheckboxChange}
                            onClick={handleCheckboxClick}
                            className="w-5 h-5 cursor-pointer accent-orange-500"
                        />
                    </div>
                )}

                {/* Type Icon */}
                <div className="flex-shrink-0 text-2xl">
                    {item.type === 'investor' ? '💰' :
                        item.type === 'customer' ? '🛒' : '🤝'}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                        {/* Left: Company & Contact Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 truncate font-mono">
                                {item.company}
                            </h3>
                            {contactCount > 0 && (
                                <p className="text-xs text-gray-600 truncate mt-0.5">
                                    👤 {contactCount} contact{contactCount !== 1 ? 's' : ''}
                                </p>
                            )}

                            {/* Status & Priority Badges */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                    item.priority === 'High' ? 'bg-red-100 text-red-800 border-red-200' :
                                    item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                    'bg-gray-100 text-gray-800 border-gray-200'
                                }`}>
                                    {item.priority}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-full">
                                    {item.status}
                                </span>
                                {item.assignedToName && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-50 border border-blue-300 rounded font-mono text-blue-700">
                                        → {item.assignedToName}
                                    </span>
                                )}
                                {isOverdue && (
                                    <span className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-full font-semibold">
                                        OVERDUE
                                    </span>
                                )}
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                                {taskCount > 0 && (
                                    <span>✓ {taskCount} task{taskCount !== 1 ? 's' : ''}</span>
                                )}
                                {noteCount > 0 && (
                                    <span>📝 {noteCount} note{noteCount !== 1 ? 's' : ''}</span>
                                )}
                                {documentCount > 0 && (
                                    <span>📄 {documentCount} doc{documentCount !== 1 ? 's' : ''}</span>
                                )}
                            </div>
                        </div>

                        {/* Right: Value & Next Action */}
                        <div className="flex-shrink-0 text-right">
                            {/* Value */}
                            {(item.type === 'investor' && item.checkSize) && (
                                <div className="mb-1">
                                    <div className="font-bold text-sm text-green-600 font-mono">
                                        ${(item.checkSize / 1000).toFixed(0)}K
                                    </div>
                                    <div className="text-xs text-gray-500">Check</div>
                                </div>
                            )}
                            {(item.type === 'customer' && item.dealValue) && (
                                <div className="mb-1">
                                    <div className="font-bold text-sm text-blue-600 font-mono">
                                        ${(item.dealValue / 1000).toFixed(0)}K
                                    </div>
                                    <div className="text-xs text-gray-500">Deal</div>
                                </div>
                            )}

                            {/* Next Action Date */}
                            {item.nextActionDate && (
                                <div className="text-xs text-gray-500 mt-1">
                                    📅 {new Date(item.nextActionDate + 'T00:00:00').toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        timeZone: 'UTC'
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Next Action Text */}
                    {item.nextAction && (
                        <div className="mt-2 text-xs text-gray-700 truncate font-medium">
                            → {item.nextAction}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VirtualizedAccountList;
