import React from 'react';
import { Star, StarOff, Tag, Trash2 } from 'lucide-react';

interface BulkActionsBarProps {
    selectedCount: number;
    isBusy: boolean;
    onStar: () => void;
    onUnstar: () => void;
    onAddTag: () => void;
    onDelete: () => void;
}

export function BulkActionsBar({
    selectedCount,
    isBusy,
    onStar,
    onUnstar,
    onAddTag,
    onDelete
}: BulkActionsBarProps) {
    if (selectedCount === 0) return null;
    
    return (
        <div className="flex items-center justify-between bg-black text-white px-6 py-3 text-sm uppercase tracking-tight">
            <span>{selectedCount} selected</span>
            <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-white text-black rounded flex items-center gap-1" disabled={isBusy} onClick={onStar}>
                    <Star size={14} /> Star
                </button>
                <button className="px-3 py-1 bg-white text-black rounded flex items-center gap-1" disabled={isBusy} onClick={onUnstar}>
                    <StarOff size={14} /> Unstar
                </button>
                <button className="px-3 py-1 bg-white text-black rounded flex items-center gap-1" disabled={isBusy} onClick={onAddTag}>
                    <Tag size={14} /> Add tag
                </button>
                <button className="px-3 py-1 bg-red-500 text-white rounded flex items-center gap-1" disabled={isBusy} onClick={onDelete}>
                    <Trash2 size={14} /> Delete
                </button>
            </div>
        </div>
    );
}
