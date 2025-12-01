import React from 'react';
import Modal from '../../shared/Modal';
import { Contact } from '../../../types';

// ============== CSV Import Modal ==============
interface CSVImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    isImporting: boolean;
    importProgress: number;
    importResult: {
        success: number;
        failed: number;
        errors: Array<{ row: number; error: string; data: any }>;
    } | null;
    onDownloadTemplate: () => void;
    onFileSelect: (file: File) => void;
}

export function CSVImportModal({
    isOpen,
    onClose,
    isImporting,
    importProgress,
    importResult,
    onDownloadTemplate,
    onFileSelect
}: CSVImportModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!isImporting) {
                    onClose();
                }
            }}
            title="Import Contacts from CSV"
        >
            <div className="space-y-4">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                    <h4 className="font-semibold text-slate-900 mb-2">📋 Instructions:</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside text-gray-700">
                        <li>CSV must include headers: name, email, phone, title, company</li>
                        <li>Name and email are required for each contact</li>
                        <li>Company field will create or link to existing accounts</li>
                        <li>Download the template below for correct format</li>
                    </ul>
                </div>

                {/* Download Template */}
                <button
                    onClick={onDownloadTemplate}
                    className="w-full bg-white text-slate-700 border border-gray-200 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                    📥 Download CSV Template
                </button>

                {/* File Upload */}
                {!isImporting && !importResult && (
                    <div>
                        <label htmlFor="csv-upload-file" className="block text-sm font-medium text-slate-700 mb-2">
                            Select CSV File
                        </label>
                        <input
                            id="csv-upload-file"
                            name="csv-upload-file"
                            type="file"
                            accept=".csv"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    onFileSelect(file);
                                }
                            }}
                            className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                        />
                    </div>
                )}

                {/* Progress Bar */}
                {isImporting && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">Importing contacts...</span>
                            <span className="text-sm font-semibold text-slate-900">{importProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-slate-900 h-full rounded-full transition-all duration-300"
                                style={{ width: `${importProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Import Results */}
                {importResult && !isImporting && (
                    <div className="space-y-3">
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                            <h4 className="font-semibold text-emerald-800 mb-2">✅ Import Complete</h4>
                            <div className="text-sm space-y-1">
                                <p className="text-green-700">
                                    <span className="font-semibold">Success:</span> {importResult.success} contacts imported
                                </p>
                                <p className="text-red-700">
                                    <span className="font-semibold">Failed:</span> {importResult.failed} contacts
                                </p>
                            </div>
                        </div>

                        {/* Error Details */}
                        {importResult.errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-xl max-h-60 overflow-y-auto">
                                <h4 className="font-semibold text-red-800 mb-2">❌ Errors:</h4>
                                <div className="space-y-2 text-sm">
                                    {importResult.errors.map((error, idx) => (
                                        <div key={idx} className="border-b border-red-200 pb-2 last:border-0">
                                            <p className="text-red-700">
                                                <span className="font-semibold">Row {error.row}:</span> {error.error}
                                            </p>
                                            <p className="text-gray-600 text-xs mt-1">
                                                {JSON.stringify(error.data)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="w-full font-semibold bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}

// ============== Bulk Actions Modal ==============
interface BulkActionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    action: 'tag' | 'delete' | 'export' | null;
    selectedCount: number;
    bulkTagToAdd: string;
    onBulkTagChange: (tag: string) => void;
    allTags: string[];
    onExecuteBulkTag: () => void;
    onExecuteBulkDelete: () => void;
    onExecuteBulkExport: () => void;
}

export function BulkActionsModal({
    isOpen,
    onClose,
    action,
    selectedCount,
    bulkTagToAdd,
    onBulkTagChange,
    allTags,
    onExecuteBulkTag,
    onExecuteBulkDelete,
    onExecuteBulkExport
}: BulkActionsModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Bulk ${action === 'tag' ? 'Tag' : action === 'delete' ? 'Delete' : 'Export'}`}
        >
            <div className="space-y-4">
                {action === 'tag' && (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Add a tag to {selectedCount} selected contact(s)
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={bulkTagToAdd}
                                onChange={(e) => onBulkTagChange(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onExecuteBulkTag();
                                    }
                                }}
                                placeholder="Enter tag name..."
                                className="flex-1 bg-white border border-gray-200 text-slate-900 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                            />
                            <button
                                onClick={onExecuteBulkTag}
                                className="bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                            >
                                Add Tag
                            </button>
                        </div>
                        {allTags.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-500 mb-2">Quick select:</p>
                                <div className="flex flex-wrap gap-2">
                                    {allTags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => onBulkTagChange(tag)}
                                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-sm text-slate-700 rounded-full hover:bg-slate-100 hover:border-slate-300 transition-all"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {action === 'delete' && (
                    <div className="space-y-3">
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                            <p className="text-sm text-red-800">
                                <strong>⚠️ Warning:</strong> You are about to delete {selectedCount} contact(s). 
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onExecuteBulkDelete}
                                className="flex-1 bg-red-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-red-600 transition-all"
                            >
                                Delete {selectedCount} Contact(s)
                            </button>
                            <button
                                onClick={onClose}
                                className="bg-white text-slate-700 border border-gray-200 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {action === 'export' && (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Export {selectedCount} selected contact(s) to CSV file
                        </p>
                        <button
                            onClick={onExecuteBulkExport}
                            className="w-full bg-slate-900 text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                        >
                            📥 Download CSV
                        </button>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full font-semibold bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                >
                    Close
                </button>
            </div>
        </Modal>
    );
}

// ============== Duplicate Detection Modal ==============
interface DuplicateModalProps {
    isOpen: boolean;
    onClose: () => void;
    duplicateGroups: Contact[][];
    selectedDuplicateGroup: Contact[] | null;
    primaryContact: Contact | null;
    onSelectPrimary: (contact: Contact) => void;
    onStartMergeWorkflow: (group: Contact[]) => void;
    onMergeContacts: () => void;
    onCancelMerge: () => void;
}

export function DuplicateModal({
    isOpen,
    onClose,
    duplicateGroups,
    selectedDuplicateGroup,
    primaryContact,
    onSelectPrimary,
    onStartMergeWorkflow,
    onMergeContacts,
    onCancelMerge
}: DuplicateModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Duplicate Contacts"
        >
            <div className="space-y-4">
                {selectedDuplicateGroup ? (
                    /* Merge Workflow */
                    <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                            <p className="text-sm text-amber-800">
                                <strong>⚠️ Merge Warning:</strong> Select the primary contact to keep. 
                                Other contacts will be deleted, but their data (tags, notes) will be merged into the primary.
                            </p>
                        </div>

                        <div className="space-y-2">
                            {selectedDuplicateGroup.map((contact) => (
                                <div
                                    key={contact.id}
                                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                                        primaryContact?.id === contact.id
                                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                                            : 'border-gray-200 bg-white hover:border-slate-300 hover:bg-gray-50'
                                    }`}
                                    onClick={() => onSelectPrimary(contact)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {primaryContact?.id === contact.id && (
                                                    <span className="text-emerald-600 font-bold text-sm">✓ PRIMARY</span>
                                                )}
                                                <h4 className="font-semibold text-slate-900">{contact.name}</h4>
                                            </div>
                                            <p className="text-sm text-gray-600">📧 {contact.email}</p>
                                            {contact.phone && (
                                                <p className="text-sm text-gray-600">📞 {contact.phone}</p>
                                            )}
                                            {contact.title && (
                                                <p className="text-sm text-gray-600">💼 {contact.title}</p>
                                            )}
                                            {contact.tags && contact.tags.length > 0 && (
                                                <div className="mt-2 flex gap-1 flex-wrap">
                                                    {contact.tags.map(tag => (
                                                        <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                                            🏷️ {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {contact.notes && contact.notes.length > 0 && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    📝 {contact.notes.length} note(s)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onMergeContacts}
                                disabled={!primaryContact}
                                className="flex-1 bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ✓ Merge Contacts
                            </button>
                            <button
                                onClick={onCancelMerge}
                                className="bg-white text-slate-700 border border-gray-200 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Duplicate Groups List */
                    <div className="space-y-4">
                        {duplicateGroups.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-emerald-600 font-semibold">
                                    ✓ No duplicate contacts found!
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    All contacts appear to be unique.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                                    <p className="text-sm font-semibold text-amber-800">
                                        Found {duplicateGroups.length} potential duplicate group(s)
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Click "Review & Merge" to combine duplicate contacts
                                    </p>
                                </div>

                                {duplicateGroups.map((group, idx) => (
                                    <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-slate-900">
                                                Duplicate Group {idx + 1} ({group.length} contacts)
                                            </h4>
                                            <button
                                                onClick={() => onStartMergeWorkflow(group)}
                                                className="bg-slate-900 text-white px-3 py-1.5 text-xs rounded-lg font-semibold shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                                            >
                                                Review & Merge
                                            </button>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            {group.map((contact) => (
                                                <div key={contact.id} className="text-gray-700">
                                                    • <strong>{contact.name}</strong> - {contact.email}
                                                    {contact.phone && ` - ${contact.phone}`}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full font-semibold bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
