import React from 'react';
import { AnyCrmItem } from '../../../types';
import { AccountListItem } from './AccountListItem';

interface AccountListProps {
    items: AnyCrmItem[];
    selectedItemIds: Set<string>;
    bulkSelectMode: boolean;
    viewMode: 'grid' | 'list';
    crmType: string;
    onToggleSelection: (itemId: string) => void;
    onViewAccount?: (item: AnyCrmItem) => void;
    onEdit: (item: AnyCrmItem) => void;
    onDelete: (item: AnyCrmItem) => void;
    onAddClick: () => void;
}

export function AccountList({
    items,
    selectedItemIds,
    bulkSelectMode,
    viewMode,
    crmType,
    onToggleSelection,
    onViewAccount,
    onEdit,
    onDelete,
    onAddClick
}: AccountListProps) {
    if (items.length === 0) {
        return (
            <div className="text-center py-12 col-span-full">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <p className="text-gray-500 mb-3">No {crmType === 'accounts' ? 'accounts' : crmType} found</p>
                <button
                    onClick={onAddClick}
                    className="text-sm font-medium text-black hover:underline"
                >
                    Add your first {crmType === 'accounts' ? 'account' : crmType.slice(0, -1)}
                </button>
            </div>
        );
    }

    return (
        <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-3'} max-h-[500px] overflow-y-auto`}>
            {items.map(item => (
                <AccountListItem
                    key={item.id}
                    item={item}
                    isSelected={selectedItemIds.has(item.id)}
                    bulkSelectMode={bulkSelectMode}
                    onToggleSelection={onToggleSelection}
                    onViewAccount={onViewAccount ? () => onViewAccount(item) : undefined}
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item)}
                />
            ))}
        </div>
    );
}

export default AccountList;
