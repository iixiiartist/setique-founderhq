/**
 * Audit Log Viewer Component
 * 
 * Displays audit trail for CRM items with filtering
 */

import React, { useState } from 'react';
import { useCrmItemAuditLogs } from '../../lib/services/auditLogService';
import { formatDistanceToNow } from 'date-fns';

interface AuditLogViewerProps {
    workspaceId: string;
    crmItemId: string;
}

export function AuditLogViewer({ workspaceId, crmItemId }: AuditLogViewerProps) {
    const [showDetails, setShowDetails] = useState<string | null>(null);
    const { data: logs, isLoading } = useCrmItemAuditLogs(workspaceId, crmItemId);

    if (isLoading) {
        return (
            <div className="p-4 text-center text-gray-500">
                Loading audit trail...
            </div>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500">
                No activity logged yet
            </div>
        );
    }

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'bg-green-100 text-green-800 border-green-800';
            case 'update': return 'bg-blue-100 text-blue-800 border-blue-800';
            case 'delete': return 'bg-red-100 text-red-800 border-red-800';
            case 'restore': return 'bg-purple-100 text-purple-800 border-purple-800';
            default: return 'bg-gray-100 text-gray-800 border-gray-800';
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'create': return 'Created';
            case 'update': return 'Updated';
            case 'delete': return 'Deleted';
            case 'restore': return 'Restored';
            default: return action;
        }
    };

    const getChangedFields = (log: any) => {
        if (!log.oldValues || !log.newValues) return [];
        
        const changed: { field: string; old: any; new: any }[] = [];
        const oldVal = log.oldValues;
        const newVal = log.newValues;
        
        Object.keys(newVal).forEach(key => {
            if (key === 'updated_at' || key === 'id') return; // Skip metadata
            if (JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key])) {
                changed.push({
                    field: key,
                    old: oldVal[key],
                    new: newVal[key]
                });
            }
        });
        
        return changed;
    };

    return (
        <div className="space-y-2">
            <h3 className="font-bold text-lg mb-3">Activity Log</h3>
            
            <div className="space-y-2">
                {logs.map(log => {
                    const changes = getChangedFields(log);
                    
                    return (
                        <div 
                            key={log.id}
                            className="border-2 border-black bg-white p-3"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs font-bold border-2 ${getActionColor(log.action)}`}>
                                        {getActionLabel(log.action)}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                                
                                {changes.length > 0 && (
                                    <button
                                        onClick={() => setShowDetails(showDetails === log.id ? null : log.id)}
                                        className="text-xs underline hover:no-underline"
                                    >
                                        {showDetails === log.id ? 'Hide' : 'Show'} details
                                    </button>
                                )}
                            </div>

                            {log.action === 'update' && changes.length > 0 && (
                                <div className="text-sm text-gray-700">
                                    Changed {changes.length} field{changes.length > 1 ? 's' : ''}:
                                    <span className="font-semibold ml-1">
                                        {changes.map(c => c.field).join(', ')}
                                    </span>
                                </div>
                            )}

                            {showDetails === log.id && changes.length > 0 && (
                                <div className="mt-3 pt-3 border-t-2 border-gray-200 space-y-2">
                                    {changes.map((change, idx) => (
                                        <div key={idx} className="text-sm">
                                            <div className="font-semibold">{change.field}:</div>
                                            <div className="ml-4 space-y-1">
                                                <div className="text-red-600">
                                                    - {JSON.stringify(change.old) || '(empty)'}
                                                </div>
                                                <div className="text-green-600">
                                                    + {JSON.stringify(change.new) || '(empty)'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
