/**
 * CSV Export Button Component
 * 
 * Provides server-side CSV export with progress indicator
 */

import React, { useState } from 'react';
import { exportCrmItemsToCsv, getExportRowCount, CsvExportOptions } from '../../lib/services/csvExportService';

interface CsvExportButtonProps {
    workspaceId: string;
    options?: CsvExportOptions;
    className?: string;
}

export function CsvExportButton({ workspaceId, options = {}, className }: CsvExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [rowCount, setRowCount] = useState<number | null>(null);

    const handleExport = async () => {
        if (isExporting) return;
        
        setIsExporting(true);
        try {
            await exportCrmItemsToCsv(workspaceId, options);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const checkRowCount = async () => {
        const count = await getExportRowCount(workspaceId, options);
        setRowCount(count);
    };

    return (
        <div className="inline-flex items-center gap-2">
            <button
                onClick={handleExport}
                disabled={isExporting}
                className={`
                    px-4 py-2 bg-white border-2 border-black 
                    hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
                    font-bold flex items-center gap-2
                    ${className || ''}
                `}
                onMouseEnter={checkRowCount}
            >
                {isExporting ? (
                    <>
                        <span className="animate-spin">⏳</span>
                        Exporting...
                    </>
                ) : (
                    <>
                        📥 Export CSV
                        {rowCount !== null && (
                            <span className="text-xs text-gray-600">
                                ({rowCount.toLocaleString()} rows)
                            </span>
                        )}
                    </>
                )}
            </button>
        </div>
    );
}

/**
 * Advanced Export Dialog with Filters
 */
interface AdvancedExportDialogProps {
    workspaceId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function AdvancedExportDialog({ workspaceId, isOpen, onClose }: AdvancedExportDialogProps) {
    const [options, setOptions] = useState<CsvExportOptions>({
        type: 'all',
        includeContacts: true,
        maxRows: 10000
    });
    const [rowCount, setRowCount] = useState<number | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            getExportRowCount(workspaceId, options).then(setRowCount);
        }
    }, [isOpen, workspaceId, options]);

    if (!isOpen) return null;

    const handleExport = async () => {
        await exportCrmItemsToCsv(workspaceId, options);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white border-4 border-black p-6 max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Export CRM Data</h2>
                
                <div className="space-y-4">
                    {/* Type Filter */}
                    <div>
                        <label className="block font-bold mb-2">Type</label>
                        <select
                            value={options.type || 'all'}
                            onChange={(e) => setOptions({ ...options, type: e.target.value as any })}
                            className="w-full border-2 border-black p-2"
                        >
                            <option value="all">All Types</option>
                            <option value="investor">Investors Only</option>
                            <option value="customer">Customers Only</option>
                            <option value="partner">Partners Only</option>
                        </select>
                    </div>

                    {/* Include Contacts */}
                    <div>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={options.includeContacts ?? true}
                                onChange={(e) => setOptions({ ...options, includeContacts: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <span className="font-bold">Include Contacts</span>
                        </label>
                    </div>

                    {/* Row Count */}
                    {rowCount !== null && (
                        <div className="p-3 bg-gray-100 border-2 border-gray-300">
                            <strong>{rowCount.toLocaleString()}</strong> rows will be exported
                            {rowCount > 10000 && (
                                <p className="text-sm text-red-600 mt-1">
                                    ⚠️ Limited to 10,000 rows maximum
                                </p>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 justify-end pt-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border-2 border-black hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={rowCount === 0}
                            className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-gray-800 disabled:opacity-50"
                        >
                            📥 Export
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
