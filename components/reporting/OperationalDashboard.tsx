import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Activity, CheckCircle2, AlertCircle, Clock, Users, TrendingUp } from 'lucide-react';

interface OperationalMetrics {
    taskVelocity: number; // tasks completed per week
    overdueRate: number; // percentage of tasks overdue
    teamCapacity: Array<{
        userId: string;
        userName: string;
        assignedTasks: number;
        completedTasks: number;
        overdueTasks: number;
    }>;
    taskBreakdown: {
        notStarted: number;
        inProgress: number;
        done: number;
        overdue: number;
    };
    categoryDistribution: Array<{
        category: string;
        count: number;
        completed: number;
    }>;
    weeklyTrend: Array<{
        week: string;
        completed: number;
    }>;
}

const OperationalDashboard: React.FC = () => {
    const { workspace } = useWorkspace();
    const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (workspace) {
            loadMetrics();
        }
    }, [workspace]);

    const loadMetrics = async () => {
        if (!workspace) return;

        setLoading(true);

        try {
            // Get all tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('workspace_id', workspace.id);

            if (!tasks) {
                setLoading(false);
                return;
            }

            const now = new Date();

            // Calculate task velocity (last 7 days)
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const recentCompletedTasks = tasks.filter(t => 
                t.status === 'Done' && 
                t.completed_at && 
                new Date(t.completed_at) >= sevenDaysAgo
            );
            const taskVelocity = recentCompletedTasks.length;

            // Calculate overdue rate
            const overdueTasks = tasks.filter(t => 
                t.status !== 'Done' && 
                t.due_date && 
                new Date(t.due_date) < now
            );
            const overdueRate = tasks.length > 0 ? (overdueTasks.length / tasks.length) * 100 : 0;

            // Task breakdown
            const taskBreakdown = {
                notStarted: tasks.filter(t => t.status === 'Todo').length,
                inProgress: tasks.filter(t => t.status === 'InProgress').length,
                done: tasks.filter(t => t.status === 'Done').length,
                overdue: overdueTasks.length,
            };

            // Get workspace members for capacity analysis
            const { data: members } = await supabase
                .from('workspace_members')
                .select('user_id, user_name')
                .eq('workspace_id', workspace.id);

            // Build team capacity
            const teamCapacity = (members || []).map(member => {
                const assignedTasks = tasks.filter(t => t.assigned_to === member.user_id);
                const completedTasks = assignedTasks.filter(t => t.status === 'Done');
                const memberOverdueTasks = assignedTasks.filter(t => 
                    t.status !== 'Done' && 
                    t.due_date && 
                    new Date(t.due_date) < now
                );

                return {
                    userId: member.user_id,
                    userName: member.user_name || 'Unknown',
                    assignedTasks: assignedTasks.length,
                    completedTasks: completedTasks.length,
                    overdueTasks: memberOverdueTasks.length,
                };
            }).filter(m => m.assignedTasks > 0);

            // Category distribution
            const categoryMap = new Map<string, { count: number; completed: number }>();
            tasks.forEach(task => {
                const category = task.category || 'Other';
                const existing = categoryMap.get(category) || { count: 0, completed: 0 };
                existing.count++;
                if (task.status === 'Done') existing.completed++;
                categoryMap.set(category, existing);
            });

            const categoryDistribution = Array.from(categoryMap.entries())
                .map(([category, stats]) => ({ category, ...stats }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 6);

            // Weekly trend (last 4 weeks)
            const weeklyTrend: Array<{ week: string; completed: number }> = [];
            for (let i = 3; i >= 0; i--) {
                const weekStart = new Date(now.getTime() - (i * 7 + 7) * 24 * 60 * 60 * 1000);
                const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
                
                const weekCompleted = tasks.filter(t => 
                    t.status === 'Done' && 
                    t.completed_at && 
                    new Date(t.completed_at) >= weekStart &&
                    new Date(t.completed_at) < weekEnd
                ).length;

                weeklyTrend.push({
                    week: `Week ${4 - i}`,
                    completed: weekCompleted,
                });
            }

            setMetrics({
                taskVelocity,
                overdueRate,
                teamCapacity,
                taskBreakdown,
                categoryDistribution,
                weeklyTrend,
            });
        } catch (error) {
            console.error('Error loading operational metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="font-mono text-sm text-gray-500">Loading operational dashboard...</div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="font-mono text-sm text-gray-500">No operational data available</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="font-mono font-bold text-2xl text-black">Operational Dashboard</h2>
                <p className="font-mono text-sm text-gray-600 mt-1">Track team productivity and task completion</p>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 border-2 border-black rounded flex items-center justify-center">
                            <Activity size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <div className="font-mono text-3xl font-bold text-black">{metrics.taskVelocity}</div>
                            <div className="font-mono text-xs text-gray-600">Task Velocity</div>
                        </div>
                    </div>
                    <div className="font-mono text-xs text-gray-500">tasks completed this week</div>
                </div>

                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 border-2 border-black rounded flex items-center justify-center ${
                            metrics.overdueRate < 10 ? 'bg-green-100' : metrics.overdueRate < 25 ? 'bg-amber-100' : 'bg-red-100'
                        }`}>
                            <AlertCircle size={20} className={
                                metrics.overdueRate < 10 ? 'text-green-600' : metrics.overdueRate < 25 ? 'text-amber-600' : 'text-red-600'
                            } />
                        </div>
                        <div>
                            <div className="font-mono text-3xl font-bold text-black">{metrics.overdueRate.toFixed(1)}%</div>
                            <div className="font-mono text-xs text-gray-600">Overdue Rate</div>
                        </div>
                    </div>
                    <div className="font-mono text-xs text-gray-500">{metrics.taskBreakdown.overdue} tasks overdue</div>
                </div>

                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 border-2 border-black rounded flex items-center justify-center">
                            <CheckCircle2 size={20} className="text-green-600" />
                        </div>
                        <div>
                            <div className="font-mono text-3xl font-bold text-black">
                                {metrics.taskBreakdown.done + metrics.taskBreakdown.inProgress + metrics.taskBreakdown.notStarted}
                            </div>
                            <div className="font-mono text-xs text-gray-600">Total Tasks</div>
                        </div>
                    </div>
                    <div className="font-mono text-xs text-gray-500">{metrics.taskBreakdown.done} completed</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Task breakdown */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <h3 className="font-mono font-bold text-xl mb-4">Task Status</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-sm font-semibold">Done</span>
                                <span className="font-mono text-sm text-gray-600">{metrics.taskBreakdown.done}</span>
                            </div>
                            <div className="w-full bg-gray-200 h-6 border-2 border-black">
                                <div className="bg-green-500 h-full" style={{ width: `${(metrics.taskBreakdown.done / (metrics.taskBreakdown.done + metrics.taskBreakdown.inProgress + metrics.taskBreakdown.notStarted)) * 100}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-sm font-semibold">In Progress</span>
                                <span className="font-mono text-sm text-gray-600">{metrics.taskBreakdown.inProgress}</span>
                            </div>
                            <div className="w-full bg-gray-200 h-6 border-2 border-black">
                                <div className="bg-blue-500 h-full" style={{ width: `${(metrics.taskBreakdown.inProgress / (metrics.taskBreakdown.done + metrics.taskBreakdown.inProgress + metrics.taskBreakdown.notStarted)) * 100}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-sm font-semibold">Not Started</span>
                                <span className="font-mono text-sm text-gray-600">{metrics.taskBreakdown.notStarted}</span>
                            </div>
                            <div className="w-full bg-gray-200 h-6 border-2 border-black">
                                <div className="bg-gray-400 h-full" style={{ width: `${(metrics.taskBreakdown.notStarted / (metrics.taskBreakdown.done + metrics.taskBreakdown.inProgress + metrics.taskBreakdown.notStarted)) * 100}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-sm font-semibold">Overdue</span>
                                <span className="font-mono text-sm text-gray-600">{metrics.taskBreakdown.overdue}</span>
                            </div>
                            <div className="w-full bg-gray-200 h-6 border-2 border-black">
                                <div className="bg-red-500 h-full" style={{ width: `${(metrics.taskBreakdown.overdue / (metrics.taskBreakdown.done + metrics.taskBreakdown.inProgress + metrics.taskBreakdown.notStarted)) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Weekly trend */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={24} className="text-blue-600" />
                        <h3 className="font-mono font-bold text-xl">Completion Trend</h3>
                    </div>
                    <div className="space-y-3">
                        {metrics.weeklyTrend.map((week, index) => {
                            const maxCompleted = Math.max(...metrics.weeklyTrend.map(w => w.completed));
                            const percentage = maxCompleted > 0 ? (week.completed / maxCompleted) * 100 : 0;
                            
                            return (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono text-sm font-semibold">{week.week}</span>
                                        <span className="font-mono text-sm text-gray-600">{week.completed} tasks</span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-8 border-2 border-black">
                                        <div
                                            className="bg-blue-500 h-full flex items-center justify-end pr-2"
                                            style={{ width: `${percentage}%` }}
                                        >
                                            {percentage > 15 && (
                                                <span className="font-mono text-xs font-bold text-white">
                                                    {week.completed}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Team capacity */}
            {metrics.teamCapacity.length > 0 && (
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={24} className="text-purple-600" />
                        <h3 className="font-mono font-bold text-xl">Team Capacity</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {metrics.teamCapacity.map(member => (
                            <div key={member.userId} className="p-4 bg-gray-50 border-2 border-gray-300 rounded">
                                <div className="font-mono font-bold text-lg mb-3">{member.userName}</div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs text-gray-600">Assigned</span>
                                        <span className="font-mono text-sm font-bold">{member.assignedTasks}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs text-gray-600">Completed</span>
                                        <span className="font-mono text-sm font-bold text-green-600">{member.completedTasks}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs text-gray-600">Overdue</span>
                                        <span className="font-mono text-sm font-bold text-red-600">{member.overdueTasks}</span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-300">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono text-xs text-gray-600">Completion Rate</span>
                                            <span className="font-mono text-xs font-bold">
                                                {member.assignedTasks > 0 ? Math.round((member.completedTasks / member.assignedTasks) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 h-2 border border-black">
                                            <div
                                                className="bg-green-600 h-full"
                                                style={{ width: `${member.assignedTasks > 0 ? (member.completedTasks / member.assignedTasks) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Category distribution */}
            {metrics.categoryDistribution.length > 0 && (
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <h3 className="font-mono font-bold text-xl mb-4">Tasks by Category</h3>
                    <div className="space-y-3">
                        {metrics.categoryDistribution.map((cat, index) => {
                            const completionRate = cat.count > 0 ? (cat.completed / cat.count) * 100 : 0;
                            
                            return (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-sm font-semibold">{cat.category}</span>
                                        <span className="font-mono text-sm text-gray-600">
                                            {cat.completed}/{cat.count} ({completionRate.toFixed(0)}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-6 border-2 border-black">
                                        <div
                                            className={`h-full ${completionRate >= 75 ? 'bg-green-500' : completionRate >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                            style={{ width: `${completionRate}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OperationalDashboard;
