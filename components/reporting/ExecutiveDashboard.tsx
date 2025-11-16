import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface ExecutiveMetrics {
    revenue: {
        current: number;
        previous: number;
        trend: number;
    };
    mrr: {
        current: number;
        previous: number;
        trend: number;
    };
    customers: {
        current: number;
        previous: number;
        trend: number;
    };
    pipeline: {
        value: number;
        count: number;
        trend: number;
    };
    tasks: {
        completed: number;
        total: number;
        onTime: number;
    };
    runway: number; // months
}

const ExecutiveDashboard: React.FC = () => {
    const { workspace } = useWorkspace();
    const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    useEffect(() => {
        if (workspace) {
            loadMetrics();
        }
    }, [workspace, timeRange]);

    const loadMetrics = async () => {
        if (!workspace) return;

        setLoading(true);

        try {
            const now = new Date();
            const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            const previousStartDate = new Date(startDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);

            // Get revenue data
            const { data: revenue } = await supabase
                .from('revenue_entries')
                .select('amount, date')
                .eq('workspace_id', workspace.id);

            const currentRevenue = revenue?.filter(r => new Date(r.date) >= startDate).reduce((sum, r) => sum + r.amount, 0) || 0;
            const previousRevenue = revenue?.filter(r => new Date(r.date) >= previousStartDate && new Date(r.date) < startDate).reduce((sum, r) => sum + r.amount, 0) || 0;

            // Get customer count
            const { data: customers } = await supabase
                .from('customers')
                .select('id, created_at')
                .eq('workspace_id', workspace.id);

            const currentCustomers = customers?.filter(c => new Date(c.created_at) >= startDate).length || 0;
            const totalCustomers = customers?.length || 0;
            const previousCustomers = customers?.filter(c => new Date(c.created_at) >= previousStartDate && new Date(c.created_at) < startDate).length || 0;

            // Get deal pipeline
            const { data: deals } = await supabase
                .from('deals')
                .select('value, stage, created_at')
                .eq('workspace_id', workspace.id)
                .neq('stage', 'Closed Won')
                .neq('stage', 'Closed Lost');

            const pipelineValue = deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
            const pipelineCount = deals?.length || 0;

            // Get task completion
            const { data: tasks } = await supabase
                .from('tasks')
                .select('status, due_date, completed_at, created_at')
                .eq('workspace_id', workspace.id);

            const recentTasks = tasks?.filter(t => new Date(t.created_at) >= startDate) || [];
            const completedTasks = recentTasks.filter(t => t.status === 'Done').length;
            const onTimeTasks = recentTasks.filter(t => 
                t.status === 'Done' && 
                t.due_date && 
                t.completed_at && 
                new Date(t.completed_at) <= new Date(t.due_date)
            ).length;

            // Calculate MRR (simplified - assumes recurring revenue)
            const monthlyRevenue = currentRevenue / (daysAgo / 30);
            const previousMonthlyRevenue = previousRevenue / (daysAgo / 30);

            // Calculate runway
            const { data: expenses } = await supabase
                .from('expense_entries')
                .select('amount, date')
                .eq('workspace_id', workspace.id);

            const monthlyExpenses = expenses?.filter(e => new Date(e.date) >= startDate).reduce((sum, e) => sum + e.amount, 0) / (daysAgo / 30) || 0;
            const cashBalance = currentRevenue - (expenses?.reduce((sum, e) => sum + e.amount, 0) || 0);
            const runwayMonths = monthlyExpenses > 0 ? cashBalance / monthlyExpenses : 12;

            setMetrics({
                revenue: {
                    current: currentRevenue,
                    previous: previousRevenue,
                    trend: previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
                },
                mrr: {
                    current: monthlyRevenue,
                    previous: previousMonthlyRevenue,
                    trend: previousMonthlyRevenue > 0 ? ((monthlyRevenue - previousMonthlyRevenue) / previousMonthlyRevenue) * 100 : 0,
                },
                customers: {
                    current: totalCustomers,
                    previous: totalCustomers - currentCustomers + previousCustomers,
                    trend: previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 0,
                },
                pipeline: {
                    value: pipelineValue,
                    count: pipelineCount,
                    trend: 0, // Could calculate based on historical data
                },
                tasks: {
                    completed: completedTasks,
                    total: recentTasks.length,
                    onTime: onTimeTasks,
                },
                runway: Math.max(0, runwayMonths),
            });
        } catch (error) {
            console.error('Error loading executive metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatPercent = (value: number) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="font-mono text-sm text-gray-500">Loading executive dashboard...</div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="font-mono text-sm text-gray-500">No data available</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with time range selector */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-mono font-bold text-2xl text-black">Executive Dashboard</h2>
                    <p className="font-mono text-sm text-gray-600 mt-1">Key performance metrics at a glance</p>
                </div>
                <div className="flex border-2 border-black">
                    {(['7d', '30d', '90d'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`py-2 px-4 font-mono font-semibold ${
                                timeRange === range ? 'bg-black text-white' : 'bg-white text-black'
                            } ${range !== '7d' ? 'border-l-2 border-black' : ''}`}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key metrics grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 border-2 border-black rounded flex items-center justify-center">
                            <DollarSign size={24} className="text-green-600" />
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded font-mono text-xs font-bold ${
                            metrics.revenue.trend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {metrics.revenue.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {formatPercent(metrics.revenue.trend)}
                        </div>
                    </div>
                    <div className="font-mono text-3xl font-bold text-black mb-1">
                        {formatCurrency(metrics.revenue.current)}
                    </div>
                    <div className="font-mono text-sm text-gray-600">Total Revenue</div>
                </div>

                {/* MRR */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 border-2 border-black rounded flex items-center justify-center">
                            <TrendingUp size={24} className="text-blue-600" />
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded font-mono text-xs font-bold ${
                            metrics.mrr.trend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {metrics.mrr.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {formatPercent(metrics.mrr.trend)}
                        </div>
                    </div>
                    <div className="font-mono text-3xl font-bold text-black mb-1">
                        {formatCurrency(metrics.mrr.current)}
                    </div>
                    <div className="font-mono text-sm text-gray-600">Monthly Recurring Revenue</div>
                </div>

                {/* Customers */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 border-2 border-black rounded flex items-center justify-center">
                            <Users size={24} className="text-purple-600" />
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded font-mono text-xs font-bold ${
                            metrics.customers.trend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {metrics.customers.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {formatPercent(metrics.customers.trend)}
                        </div>
                    </div>
                    <div className="font-mono text-3xl font-bold text-black mb-1">
                        {metrics.customers.current}
                    </div>
                    <div className="font-mono text-sm text-gray-600">Total Customers</div>
                </div>

                {/* Pipeline */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-100 border-2 border-black rounded flex items-center justify-center">
                            <Target size={24} className="text-amber-600" />
                        </div>
                        <div className="px-2 py-1 rounded font-mono text-xs font-bold bg-gray-100 text-gray-800">
                            {metrics.pipeline.count} deals
                        </div>
                    </div>
                    <div className="font-mono text-3xl font-bold text-black mb-1">
                        {formatCurrency(metrics.pipeline.value)}
                    </div>
                    <div className="font-mono text-sm text-gray-600">Deal Pipeline</div>
                </div>
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Task completion */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 size={20} className="text-green-600" />
                        <h3 className="font-mono font-bold text-lg">Task Completion</h3>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-mono text-sm text-gray-600">Completion Rate</span>
                                <span className="font-mono font-bold text-black">
                                    {metrics.tasks.total > 0 ? Math.round((metrics.tasks.completed / metrics.tasks.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 border border-black">
                                <div
                                    className="bg-green-600 h-full"
                                    style={{ width: `${metrics.tasks.total > 0 ? (metrics.tasks.completed / metrics.tasks.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-sm text-gray-600">On-Time</span>
                            <span className="font-mono font-semibold text-black">
                                {metrics.tasks.onTime} / {metrics.tasks.completed}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Runway */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center gap-3 mb-4">
                        <Clock size={20} className="text-blue-600" />
                        <h3 className="font-mono font-bold text-lg">Cash Runway</h3>
                    </div>
                    <div className="font-mono text-4xl font-bold text-black mb-2">
                        {metrics.runway.toFixed(1)}
                    </div>
                    <div className="font-mono text-sm text-gray-600">months remaining</div>
                    {metrics.runway < 6 && (
                        <div className="mt-3 flex items-center gap-2 text-amber-600">
                            <AlertTriangle size={16} />
                            <span className="font-mono text-xs font-semibold">Low runway warning</span>
                        </div>
                    )}
                </div>

                {/* Health score */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <div className="flex items-center gap-3 mb-4">
                        <Target size={20} className="text-purple-600" />
                        <h3 className="font-mono font-bold text-lg">Business Health</h3>
                    </div>
                    <div className="space-y-2">
                        {[
                            { label: 'Revenue Growth', score: metrics.revenue.trend >= 0 ? 100 : 50 },
                            { label: 'Customer Growth', score: metrics.customers.trend >= 0 ? 100 : 50 },
                            { label: 'Task Completion', score: metrics.tasks.total > 0 ? (metrics.tasks.completed / metrics.tasks.total) * 100 : 50 },
                            { label: 'Financial Health', score: metrics.runway >= 12 ? 100 : metrics.runway >= 6 ? 75 : 50 },
                        ].map((metric, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono text-xs text-gray-600">{metric.label}</span>
                                    <span className="font-mono text-xs font-bold text-black">{Math.round(metric.score)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 h-1.5 border border-black">
                                    <div
                                        className={`h-full ${metric.score >= 75 ? 'bg-green-600' : metric.score >= 50 ? 'bg-amber-600' : 'bg-red-600'}`}
                                        style={{ width: `${metric.score}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
