import React from 'react';
import { Eye, Pencil, Trash2, Users, FileText, Folder, Clock, Calendar } from 'lucide-react';
import { AnyCrmItem, Investor, Customer, Partner } from '../../../types';

interface AccountListItemProps {
    item: AnyCrmItem;
    isSelected?: boolean;
    bulkSelectMode?: boolean;
    onToggleSelection?: (itemId: string) => void;
    onViewAccount?: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function AccountListItem({
    item,
    isSelected = false,
    bulkSelectMode = false,
    onToggleSelection,
    onViewAccount,
    onEdit,
    onDelete
}: AccountListItemProps) {
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = item.nextActionDate && item.nextActionDate < todayStr;
    const lastNote = item.notes && item.notes.length > 0 
        ? [...item.notes].sort((a, b) => b.timestamp - a.timestamp)[0] 
        : null;
    const daysSinceContact = lastNote 
        ? Math.floor((Date.now() - lastNote.timestamp) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div
            className={`bg-white rounded-lg border p-4 hover:shadow-md transition-all ${
                isSelected 
                    ? 'border-black bg-gray-50 ring-2 ring-black ring-opacity-20' 
                    : isOverdue 
                        ? 'border-red-300 bg-red-50/30' 
                        : 'border-gray-200 hover:border-gray-300'
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                {bulkSelectMode && onToggleSelection && (
                    <div className="flex-shrink-0 pt-1">
                        <label htmlFor={`bulk-select-${item.id}`} className="sr-only">
                            Select {item.company}
                        </label>
                        <input
                            id={`bulk-select-${item.id}`}
                            name={`bulk-select-${item.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelection(item.id)}
                            className="w-4 h-4 cursor-pointer accent-black rounded"
                        />
                    </div>
                )}
                <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-grow min-w-0">
                            <h4 className="font-semibold text-base text-gray-900 truncate mb-1">
                                {item.company}
                            </h4>
                            {(item.contacts || []).length > 0 && (
                                <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {item.contacts![0].name}
                                    {item.contacts!.length > 1 && (
                                        <span className="text-gray-400 text-xs">+{item.contacts!.length - 1}</span>
                                    )}
                                </p>
                            )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                            {'checkSize' in item && (item as Investor).checkSize && (
                                <div className="bg-green-50 px-2.5 py-1 rounded-md">
                                    <div className="font-semibold text-sm text-green-700">
                                        ${((item as Investor).checkSize! / 1000).toFixed(0)}K
                                    </div>
                                    <div className="text-[10px] text-green-600">Check Size</div>
                                </div>
                            )}
                            {'dealValue' in item && (item as Customer).dealValue && (
                                <div className="bg-gray-100 px-2.5 py-1 rounded-md">
                                    <div className="font-semibold text-sm text-gray-800">
                                        ${((item as Customer).dealValue! / 1000).toFixed(0)}K
                                    </div>
                                    <div className="text-[10px] text-gray-500">Deal Value</div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Status badges row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.priority === 'High' 
                                ? 'bg-red-100 text-red-700' 
                                : item.priority === 'Medium' 
                                    ? 'bg-yellow-100 text-yellow-700' 
                                    : 'bg-gray-100 text-gray-600'
                        }`}>
                            {item.priority}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                            {item.status}
                        </span>
                        {item.assignedToName && (
                            <span className="px-2 py-0.5 bg-gray-50 rounded text-xs text-gray-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                {item.assignedToName}
                            </span>
                        )}
                        {isOverdue && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                Overdue
                            </span>
                        )}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>{(item.contacts || []).length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{(item.notes || []).length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Folder className="w-3.5 h-3.5" />
                            <span>{((item as any).documents || []).length}</span>
                        </div>
                        {daysSinceContact !== null && (
                            <div className={`flex items-center gap-1 ${daysSinceContact > 30 ? 'text-red-500 font-medium' : ''}`}>
                                <Clock className="w-3.5 h-3.5" />
                                <span>{daysSinceContact}d</span>
                            </div>
                        )}
                    </div>

                    {item.nextAction && (
                        <div className="bg-gray-50 rounded-md p-2.5 mb-2 border-l-2 border-gray-800">
                            <p className="text-sm text-gray-700">{item.nextAction}</p>
                            {item.nextActionDate && (
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(item.nextActionDate + 'T00:00:00').toLocaleDateString(undefined, { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric',
                                        timeZone: 'UTC' 
                                    })}
                                    {item.nextActionTime && ` at ${item.nextActionTime}`}
                                </p>
                            )}
                        </div>
                    )}
                    
                    {lastNote && (
                        <div className="bg-gray-50/50 rounded-md p-2 border-l-2 border-gray-300">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Latest Note</p>
                            <p className="text-xs text-gray-600 line-clamp-2">{lastNote.text}</p>
                        </div>
                    )}
                </div>
                
                {/* Action buttons */}
                <div className="flex flex-col gap-1.5 shrink-0">
                    {onViewAccount && (
                        <button
                            onClick={onViewAccount}
                            className="flex items-center justify-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 text-xs rounded-md font-medium hover:bg-gray-800 transition-colors"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            View
                        </button>
                    )}
                    <button
                        onClick={onEdit}
                        className="flex items-center justify-center gap-1.5 bg-white text-gray-700 border border-gray-200 px-3 py-1.5 text-xs rounded-md font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                    </button>
                    <button
                        onClick={onDelete}
                        className="flex items-center justify-center bg-white text-gray-400 border border-gray-200 px-3 py-1.5 text-xs rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AccountListItem;
