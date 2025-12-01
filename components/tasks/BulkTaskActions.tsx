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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="font-semibold text-slate-900">
                    {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCompleteAll}
                        className="px-4 py-2 bg-green-600 text-white rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-green-700 transition-all"
                    >
                        ✓ Complete All
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowReassignDropdown(!showReassignDropdown)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-blue-700 transition-all"
                        >
                            👤 Reassign All
                        </button>
                        {showReassignDropdown && (
                            <div className="absolute bottom-full mb-2 right-0 bg-white rounded-xl border border-gray-200 shadow-lg max-h-64 overflow-y-auto min-w-[200px]">
                                {workspaceMembers.map(member => (
                                    <button
                                        key={member.userId}
                                        onClick={() => handleReassign(member.userId)}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                                    >
                                        {member.fullName}
                                        {member.role && <span className="text-gray-500 ml-2">({member.role})</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleDelete}
                        className={`px-4 py-2 ${showDeleteConfirm ? 'bg-red-700' : 'bg-red-600'} text-white rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-red-700 transition-all`}
                    >
                        {showDeleteConfirm ? '⚠️ Click Again to Confirm' : '🗑️ Delete All'}
                    </button>

                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-100 text-slate-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
