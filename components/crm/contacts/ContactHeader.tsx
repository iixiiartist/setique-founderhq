import React from 'react';
import { Users, Download, Upload, Copy, CheckSquare, Plus } from 'lucide-react';

interface ContactHeaderProps {
    filteredCount: number;
    totalCount: number;
    bulkSelectMode: boolean;
    selectedCount: number;
    onExport: () => void;
    onImport: () => void;
    onDetectDuplicates: () => void;
    onToggleBulkSelect: () => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onBulkTag: () => void;
    onBulkExport: () => void;
    onBulkDelete: () => void;
    onAdd: () => void;
}

export function ContactHeader({
    filteredCount,
    totalCount,
    bulkSelectMode,
    selectedCount,
    onExport,
    onImport,
    onDetectDuplicates,
    onToggleBulkSelect,
    onSelectAll,
    onDeselectAll,
    onBulkTag,
    onBulkExport,
    onBulkDelete,
    onAdd
}: ContactHeaderProps) {
    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-lg text-gray-900">
                        Contact Management
                    </h3>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {filteredCount}
                    </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={onExport}
                        disabled={filteredCount === 0}
                        className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-1.5 rounded-md border border-gray-200 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={onImport}
                        className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-1.5 rounded-md border border-gray-200 hover:border-gray-300 transition-all"
                    >
                        <Upload className="w-4 h-4" />
                        Import
                    </button>
                    <button
                        onClick={onDetectDuplicates}
                        disabled={totalCount < 2}
                        className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-1.5 rounded-md border border-gray-200 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Copy className="w-4 h-4" />
                        Find Duplicates
                    </button>
                    <button
                        onClick={onToggleBulkSelect}
                        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-all ${
                            bulkSelectMode
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <CheckSquare className="w-4 h-4" />
                        {bulkSelectMode ? 'Exit Select' : 'Bulk Select'}
                    </button>
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Contact
                    </button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {bulkSelectMode && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">
                                {selectedCount} selected
                            </span>
                            <button
                                onClick={onSelectAll}
                                className="text-xs text-gray-500 hover:text-gray-700 underline"
                            >
                                Select All ({filteredCount})
                            </button>
                            {selectedCount > 0 && (
                                <button
                                    onClick={onDeselectAll}
                                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                                >
                                    Deselect All
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={onBulkTag}
                                disabled={selectedCount === 0}
                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:border-gray-300 transition-all disabled:opacity-50"
                            >
                                Tag
                            </button>
                            <button
                                onClick={onBulkExport}
                                disabled={selectedCount === 0}
                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:border-gray-300 transition-all disabled:opacity-50"
                            >
                                Export
                            </button>
                            <button
                                onClick={onBulkDelete}
                                disabled={selectedCount === 0}
                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-gray-200 text-red-500 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default ContactHeader;
