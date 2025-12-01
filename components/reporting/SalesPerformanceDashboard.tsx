import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Trophy, TrendingUp, DollarSign, Target, Clock, Award } from 'lucide-react';

interface SalesMetrics {
    winRate: number;
    avgDealSize: number;
    avgSalesCycle: number; // days
    totalDeals: number;
    wonDeals: number;
    lostDeals: number;
    pipelineValue: number;
    leaderboard: Array<{
        userId: string;
        userName: string;
        dealsWon: number;
        totalValue: number;
    }>;
    pipeline: Array<{
        stage: string;
        count: number;
        value: number;
    }>;
}

const SalesPerformanceDashboard: React.FC = () => {
    const { workspace } = useWorkspace();
    const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
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
            // Get all deals
            const { data: deals } = await supabase
                .from('deals')
                .select('*')
                .eq('workspace_id', workspace.id);

            if (!deals) {
                setLoading(false);
                return;
            }

            // Calculate win rate
            const wonDeals = deals.filter(d => d.stage === 'Closed Won');
            const lostDeals = deals.filter(d => d.stage === 'Closed Lost');
            const closedDeals = wonDeals.length + lostDeals.length;
            const winRate = closedDeals > 0 ? (wonDeals.length / closedDeals) * 100 : 0;

            // Calculate average deal size
            const avgDealSize = wonDeals.length > 0
                ? wonDeals.reduce((sum, d) => sum + (d.value || 0), 0) / wonDeals.length
                : 0;

            // Calculate average sales cycle
            const dealsWithDates = wonDeals.filter(d => d.created_at && d.updated_at);
            const avgSalesCycle = dealsWithDates.length > 0
                ? dealsWithDates.reduce((sum, d) => {
                    const created = new Date(d.created_at).getTime();
                    const closed = new Date(d.updated_at).getTime();
                    return sum + (closed - created) / (1000 * 60 * 60 * 24);
                }, 0) / dealsWithDates.length
                : 0;

            // Calculate pipeline value
            const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
            const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);

            // Build leaderboard
            const userStats = new Map<string, { userName: string; dealsWon: number; totalValue: number }>();
            
            wonDeals.forEach(deal => {
                if (deal.owner_id) {
                    const existing = userStats.get(deal.owner_id) || {
                        userName: deal.owner_name || 'Unknown',
                        dealsWon: 0,
                        totalValue: 0,
                    };
                    existing.dealsWon++;
                    existing.totalValue += deal.value || 0;
                    userStats.set(deal.owner_id, existing);
                }
            });

            const leaderboard = Array.from(userStats.entries())
                .map(([userId, stats]) => ({ userId, ...stats }))
                .sort((a, b) => b.totalValue - a.totalValue);

            // Build pipeline funnel
            const stageOrder = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
            const pipelineByStage = new Map<string, { count: number; value: number }>();

            deals.forEach(deal => {
                const stage = deal.stage || 'Unknown';
                const existing = pipelineByStage.get(stage) || { count: 0, value: 0 };
                existing.count++;
                existing.value += deal.value || 0;
                pipelineByStage.set(stage, existing);
            });

            const pipeline = stageOrder
                .map(stage => ({
                    stage,
                    count: pipelineByStage.get(stage)?.count || 0,
                    value: pipelineByStage.get(stage)?.value || 0,
                }))
                .filter(p => p.count > 0);

            setMetrics({
                winRate,
                avgDealSize,
                avgSalesCycle,
                totalDeals: deals.length,
                wonDeals: wonDeals.length,
                lostDeals: lostDeals.length,
                pipelineValue,
                leaderboard,
                pipeline,
            });
        } catch (error) {
            console.error('Error loading sales metrics:', error);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-sm text-gray-500">Loading sales performance...</div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-sm text-gray-500">No sales data available</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="font-semibold text-2xl text-slate-900">Sales Performance</h2>
                <p className="text-sm text-gray-600 mt-1">Track deals, win rates, and team performance</p>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <Trophy size={20} className="text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{metrics.winRate.toFixed(1)}%</div>
                            <div className="text-xs text-gray-600">Win Rate</div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500">
                        {metrics.wonDeals} won / {metrics.wonDeals + metrics.lostDeals} closed
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <DollarSign size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.avgDealSize)}</div>
                            <div className="text-xs text-gray-600">Avg Deal Size</div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500">
                        {metrics.wonDeals} deals closed
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Clock size={20} className="text-purple-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{Math.round(metrics.avgSalesCycle)}</div>
                            <div className="text-xs text-gray-600">Avg Sales Cycle</div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500">days to close</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Target size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.pipelineValue)}</div>
                            <div className="text-xs text-gray-600">Pipeline Value</div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500">
                        {metrics.totalDeals - metrics.wonDeals - metrics.lostDeals} active deals
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leaderboard */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Award size={24} className="text-amber-600" />
                        <h3 className="font-semibold text-xl text-slate-900">Sales Leaderboard</h3>
                    </div>
                    {metrics.leaderboard.length > 0 ? (
                        <div className="space-y-3">
                            {metrics.leaderboard.map((member, index) => (
                                <div key={member.userId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className={`w-8 h-8 flex items-center justify-center font-semibold text-sm rounded-lg ${
                                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                        index === 1 ? 'bg-gray-300 text-gray-900' :
                                        index === 2 ? 'bg-amber-600 text-white' :
                                        'bg-gray-200 text-gray-700'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-slate-900">{member.userName}</div>
                                        <div className="text-xs text-gray-600">{member.dealsWon} deals won</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg text-green-600">
                                            {formatCurrency(member.totalValue)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            No deals closed yet
                        </div>
                    )}
                </div>

                {/* Pipeline funnel */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={24} className="text-blue-600" />
                        <h3 className="font-semibold text-xl text-slate-900">Deal Pipeline</h3>
                    </div>
                    <div className="space-y-4">
                        {metrics.pipeline.map((stage, index) => {
                            const maxValue = Math.max(...metrics.pipeline.map(p => p.value));
                            const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
                            
                            return (
                                <div key={stage.stage}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-sm text-slate-700">{stage.stage}</span>
                                        <span className="text-xs text-gray-600">
                                            {stage.count} deals • {formatCurrency(stage.value)}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <div className="w-full bg-gray-200 h-8 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full flex items-center justify-end pr-2 ${
                                                    stage.stage === 'Closed Won' ? 'bg-green-500' :
                                                    stage.stage === 'Closed Lost' ? 'bg-red-500' :
                                                    'bg-blue-500'
                                                }`}
                                                style={{ width: `${percentage}%` }}
                                            >
                                                <span className="text-xs font-bold text-white">
                                                    {percentage > 10 ? `${percentage.toFixed(0)}%` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesPerformanceDashboard;
