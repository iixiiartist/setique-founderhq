import React, { useState } from 'react';
import { Subtask } from '../../types';
import { Plus, Check, X, Trash2 } from 'lucide-react';

interface SubtaskManagerProps {
    subtasks: Subtask[];
    onSubtasksChange: (subtasks: Subtask[]) => void;
    disabled?: boolean;
}

export function SubtaskManager({ subtasks = [], onSubtasksChange, disabled = false }: SubtaskManagerProps) {
    const [newSubtaskText, setNewSubtaskText] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddSubtask = () => {
        if (!newSubtaskText.trim()) return;

        const newSubtask: Subtask = {
            id: `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: newSubtaskText.trim(),
            completed: false,
            createdAt: Date.now(),
        };

        onSubtasksChange([...subtasks, newSubtask]);
        setNewSubtaskText('');
        setIsAdding(false);
    };

    const handleToggleSubtask = (subtaskId: string) => {
        const updated = subtasks.map(st =>
            st.id === subtaskId
                ? {
                      ...st,
                      completed: !st.completed,
                      completedAt: !st.completed ? Date.now() : undefined,
                  }
                : st
        );
        onSubtasksChange(updated);
    };

    const handleDeleteSubtask = (subtaskId: string) => {
        onSubtasksChange(subtasks.filter(st => st.id !== subtaskId));
    };

    const completedCount = subtasks.filter(st => st.completed).length;
    const totalCount = subtasks.length;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="font-mono text-sm font-semibold text-black">
                    Subtasks {totalCount > 0 && `(${completedCount}/${totalCount})`}
                </h4>
                {!isAdding && !disabled && (
                    <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-mono bg-white border border-black hover:bg-gray-50"
                    >
                        <Plus className="w-3 h-3" />
                        Add
                    </button>
                )}
            </div>

            {/* Subtask list */}
            {subtasks.length > 0 && (
                <ul className="space-y-1">
                    {subtasks.map(subtask => (
                        <li
                            key={subtask.id}
                            className="flex items-start gap-2 p-2 bg-gray-50 border border-gray-300"
                        >
                            <input
                                id={`subtask-${subtask.id}`}
                                name={`subtask-${subtask.id}`}
                                type="checkbox"
                                checked={subtask.completed}
                                onChange={() => handleToggleSubtask(subtask.id)}
                                disabled={disabled}
                                className="w-4 h-4 mt-0.5 accent-blue-500 border-2 border-black rounded-none disabled:opacity-50"
                            />
                            <span className={`flex-grow text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-black'}`}>
                                {subtask.text}
                            </span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteSubtask(subtask.id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Delete subtask"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* Add subtask form */}
            {isAdding && (
                <div className="flex gap-2 p-2 bg-gray-50 border-2 border-black">
                    <input
                        id="new-subtask-text"
                        name="new-subtask-text"
                        type="text"
                        value={newSubtaskText}
                        onChange={e => setNewSubtaskText(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubtask();
                            } else if (e.key === 'Escape') {
                                setIsAdding(false);
                                setNewSubtaskText('');
                            }
                        }}
                        placeholder="Enter subtask..."
                        className="flex-grow px-2 py-1 text-sm bg-white border border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={handleAddSubtask}
                        className="px-2 py-1 bg-green-600 text-white border border-black hover:bg-green-700"
                        title="Add subtask"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsAdding(false);
                            setNewSubtaskText('');
                        }}
                        className="px-2 py-1 bg-white border border-black hover:bg-gray-100"
                        title="Cancel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {subtasks.length === 0 && !isAdding && (
                <p className="text-xs text-gray-500 italic p-2">
                    No subtasks yet. Break down this task into smaller steps.
                </p>
            )}
        </div>
    );
}
