import React from 'react';
import Modal from '../../shared/Modal';
import { AnyCrmItem } from '../../../types';

interface BulkActionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    bulkAction: 'tag' | 'delete' | 'export' | null;
    selectedCount: number;
    onConfirmDelete: () => void;
    onConfirmExport: () => void;
}

export function BulkActionsModal({
    isOpen,
    onClose,
    bulkAction,
    selectedCount,
    onConfirmDelete,
    onConfirmExport
}: BulkActionsModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Bulk ${bulkAction === 'delete' ? 'Delete' : 'Export'}`}
        >
            <div className="space-y-4">
                {bulkAction === 'delete' && (
                    <div>
                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to delete {selectedCount} account(s)? This action cannot be undone and will also delete all associated contacts, tasks, and data.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={onConfirmDelete}
                                className="flex-1 font-mono bg-red-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-red-600 transition-all"
                            >
                                Confirm Delete
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 font-mono bg-gray-200 text-black border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-gray-300 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {bulkAction === 'export' && (
                    <div>
                        <p className="text-sm text-gray-600 mb-4">
                            Export {selectedCount} selected account(s) to CSV file.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={onConfirmExport}
                                className="flex-1 font-mono bg-blue-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-blue-600 transition-all"
                            >
                                Export to CSV
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 font-mono bg-gray-200 text-black border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-gray-300 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

interface DuplicateModalProps {
    isOpen: boolean;
    onClose: () => void;
    duplicateGroups: AnyCrmItem[][];
}

export function DuplicateModal({
    isOpen,
    onClose,
    duplicateGroups
}: DuplicateModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Duplicate Accounts Detected"
        >
            <div className="space-y-4">
                {duplicateGroups.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-green-600 font-semibold text-lg">✓ No duplicates found!</p>
                        <p className="text-sm text-gray-600 mt-2">All accounts appear to be unique.</p>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-gray-600 mb-4">
                            Found {duplicateGroups.length} group(s) of potential duplicate accounts. Review and manage them individually in the detailed account view.
                        </p>
                        <div className="max-h-96 overflow-y-auto space-y-3">
                            {duplicateGroups.map((group, index) => (
                                <div key={index} className="bg-yellow-50 border-2 border-yellow-400 p-3">
                                    <h4 className="font-mono font-semibold text-sm mb-2">
                                        Duplicate Group {index + 1} ({group.length} accounts)
                                    </h4>
                                    <ul className="space-y-1">
                                        {group.map(item => (
                                            <li key={item.id} className="text-sm">
                                                • {item.company} ({item.status})
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full mt-4 font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default BulkActionsModal;
