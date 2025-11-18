/**
 * Bulk Task Actions Toolbar
 * Bottom toolbar for batch operations
 */

import React, { useState } from 'react';
import { WorkspaceMember } from '../../types';

interface BulkTaskActionsProps {
    selectedCount: number;
    workspaceMembers: WorkspaceMember[];
    onCompleteAll: () => void;
    onDeleteAll: () => void;
    onReassignAll: (userId: string) => void;
    onCancel: () => void;
}

export function BulkTaskActions({
    selectedCount,
    workspaceMembers,
    onCompleteAll,
    onDeleteAll,
    onReassignAll,
    onCancel
}: BulkTaskActionsProps) {
    const [showReassignDropdown, setShowReassignDropdown] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleReassign = (userId: string) => {
        onReassignAll(userId);
        setShowReassignDropdown(false);
    };

    const handleDelete = () => {
        if (showDeleteConfirm) {
            onDeleteAll();
            setShowDeleteConfirm(false);
        } else {
            setShowDeleteConfirm(true);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black shadow-[0_-8px_0_0_rgba(0,0,0,1)] p-4 z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="font-mono font-bold">
                    {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCompleteAll}
                        className="px-4 py-2 bg-green-500 text-white border-2 border-black rounded-none font-mono font-semibold shadow-neo-btn hover:bg-green-600 transition-colors"
                    >
                        ✓ Complete All
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowReassignDropdown(!showReassignDropdown)}
                            className="px-4 py-2 bg-blue-500 text-white border-2 border-black rounded-none font-mono font-semibold shadow-neo-btn hover:bg-blue-600 transition-colors"
                        >
                            👤 Reassign All
                        </button>
                        {showReassignDropdown && (
                            <div className="absolute bottom-full mb-2 right-0 bg-white border-2 border-black shadow-neo max-h-64 overflow-y-auto min-w-[200px]">
                                {workspaceMembers.map(member => (
                                    <button
                                        key={member.userId}
                                        onClick={() => handleReassign(member.userId)}
                                        className="w-full px-4 py-2 text-left font-mono text-sm hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                                    >
                                        {member.fullName}
                                        {member.role && <span className="text-gray-600 ml-2">({member.role})</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleDelete}
                        className={`px-4 py-2 ${showDeleteConfirm ? 'bg-red-700' : 'bg-red-500'} text-white border-2 border-black rounded-none font-mono font-semibold shadow-neo-btn hover:bg-red-600 transition-colors`}
                    >
                        {showDeleteConfirm ? '⚠️ Click Again to Confirm' : '🗑️ Delete All'}
                    </button>

                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-300 text-black border-2 border-black rounded-none font-mono font-semibold shadow-neo-btn hover:bg-gray-400 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
