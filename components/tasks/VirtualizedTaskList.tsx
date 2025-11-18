/**
 * Virtualized Task List
 * High-performance virtualized scrolling for 1000+ tasks
 */

import React, { useEffect, useMemo } from 'react';
import { List } from 'react-window';
import type { RowComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Task, AppActions } from '../../types';
import { TaskItem } from './TaskItem.tsx';
import { logger } from '../../lib/logger';

interface TaskRowData {
    tasks: Task[];
    selectedTaskIds: Set<string>;
    bulkSelectMode: boolean;
    onTaskSelect: (taskId: string) => void;
    onTaskClick: (task: Task) => void;
    actions: AppActions;
    getLinkedEntityName: (task: Task) => string | null;
}

const ITEM_HEIGHT = 120;

const TaskRow = ({ index, style, tasks, selectedTaskIds, bulkSelectMode, onTaskSelect, onTaskClick, actions, getLinkedEntityName }: RowComponentProps<TaskRowData>): React.ReactElement | null => {
    const task = tasks[index];

    if (!task) {
        return null;
    }

    if (process.env.NODE_ENV !== 'production') {
        console.debug('[TaskRow] render', { index, taskId: task.id });
    }

    return (
        <div style={style}>
            <div className="px-1 pb-3">
                <TaskItem
                    task={task}
                    isSelected={selectedTaskIds.has(task.id)}
                    bulkSelectMode={bulkSelectMode}
                    onSelect={() => onTaskSelect(task.id)}
                    onClick={() => onTaskClick(task)}
                    actions={actions}
                    linkedEntityName={getLinkedEntityName(task)}
                />
            </div>
        </div>
    );
};

interface VirtualizedTaskListProps {
    tasks: Task[];
    selectedTaskIds: Set<string>;
    bulkSelectMode: boolean;
    onTaskSelect: (taskId: string) => void;
    onTaskClick: (task: Task) => void;
    actions: AppActions;
    getLinkedEntityName: (task: Task) => string | null;
}

export function VirtualizedTaskList({
    tasks = [],
    selectedTaskIds = new Set(),
    bulkSelectMode = false,
    onTaskSelect,
    onTaskClick,
    actions,
    getLinkedEntityName
}: VirtualizedTaskListProps) {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const hasTasks = safeTasks.length > 0;

    useEffect(() => {
        logger.info('[VirtualizedTaskList] props received', {
            taskCount: safeTasks.length,
            sampleTasks: safeTasks.slice(0, 5).map(task => ({ id: task.id, text: task.text, category: task.category, status: task.status })),
            selectedIds: Array.from(selectedTaskIds),
            bulkSelectMode
        });
    }, [safeTasks, selectedTaskIds, bulkSelectMode]);

    const rowData = useMemo<TaskRowData>(() => ({
        tasks: safeTasks,
        selectedTaskIds,
        bulkSelectMode,
        onTaskSelect,
        onTaskClick,
        actions,
        getLinkedEntityName
    }), [safeTasks, selectedTaskIds, bulkSelectMode, onTaskSelect, onTaskClick, actions, getLinkedEntityName]);

    if (!hasTasks) {
        logger.info('[VirtualizedTaskList] No tasks available for rendering');
        return (
            <div className="flex items-center justify-center h-full text-gray-500 text-center p-8">
                <div>
                    <p className="text-lg font-mono mb-2">No tasks found</p>
                    <p className="text-sm">Try adjusting your filters or create a new task</p>
                </div>
            </div>
        );
    }

    return (
        <AutoSizer>
            {({ height, width }) => {
                if (!height || !width || height <= 0 || width <= 0) {
                    logger.warn('[VirtualizedTaskList] AutoSizer provided invalid dimensions; falling back to non-virtualized list', { height, width, taskCount: safeTasks.length });
                    return (
                        <div className="space-y-3 p-3 overflow-y-auto" style={{ maxHeight: '100%' }}>
                            {safeTasks.map(task => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    isSelected={selectedTaskIds.has(task.id)}
                                    bulkSelectMode={bulkSelectMode}
                                    onSelect={() => onTaskSelect(task.id)}
                                    onClick={() => onTaskClick(task)}
                                    actions={actions}
                                    linkedEntityName={getLinkedEntityName(task)}
                                />
                            ))}
                        </div>
                    );
                }

                if (process.env.NODE_ENV !== 'production') {
                    logger.debug('[VirtualizedTaskList] Rendering list', {
                        height,
                        width,
                        taskCount: safeTasks.length,
                        itemHeight: ITEM_HEIGHT
                    });
                }
                logger.info('[VirtualizedTaskList] Rendering virtualized list', {
                    height,
                    width,
                    taskCount: safeTasks.length,
                    overscanCount: 5
                });

                return (
                    <List
                        style={{ height, width }}
                        rowCount={safeTasks.length}
                        rowHeight={ITEM_HEIGHT}
                        overscanCount={5}
                        rowProps={rowData}
                        rowComponent={TaskRow}
                    />
                );
            }}
        </AutoSizer>
    );
}
