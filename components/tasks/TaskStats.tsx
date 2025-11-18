/**
 * Task Stats Component
 * Displays task statistics in a compact dashboard
 */

import React from 'react';

interface TaskStatsProps {
    stats: {
        total: number;
        todo: number;
        inProgress: number;
        done: number;
        overdue: number;
        myTasks: number;
        high: number;
    };
}

export function TaskStats({ stats }: TaskStatsProps) {
    return (
        <div className="mt-4 grid grid-cols-7 gap-2">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 p-2 text-center">
                <div className="text-xl font-bold font-mono text-gray-800">
                    {stats.total}
                </div>
                <div className="text-xs font-mono text-gray-600">Total</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 p-2 text-center">
                <div className="text-xl font-bold font-mono text-blue-800">
                    {stats.todo}
                </div>
                <div className="text-xs font-mono text-blue-600">To Do</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 p-2 text-center">
                <div className="text-xl font-bold font-mono text-yellow-800">
                    {stats.inProgress}
                </div>
                <div className="text-xs font-mono text-yellow-600">In Progress</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 p-2 text-center">
                <div className="text-xl font-bold font-mono text-green-800">
                    {stats.done}
                </div>
                <div className="text-xs font-mono text-green-600">Done</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 p-2 text-center">
                <div className="text-xl font-bold font-mono text-red-800">
                    {stats.overdue}
                </div>
                <div className="text-xs font-mono text-red-600">Overdue</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 p-2 text-center">
                <div className="text-xl font-bold font-mono text-purple-800">
                    {stats.myTasks}
                </div>
                <div className="text-xs font-mono text-purple-600">My Tasks</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 p-2 text-center">
                <div className="text-xl font-bold font-mono text-orange-800">
                    {stats.high}
                </div>
                <div className="text-xs font-mono text-orange-600">High Priority</div>
            </div>
        </div>
    );
}
