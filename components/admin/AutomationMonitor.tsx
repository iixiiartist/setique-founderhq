/**
 * Automation Monitor Component
 * Admin dashboard for viewing automation execution logs, failures, and performance
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { featureFlags } from '../../lib/featureFlags';
import type { AutomationRule, ExecutionResult } from '../../lib/services/automationService';

interface AutomationLog {
    id: string;
    rule_id: string;
    workspace_id: string;
    triggered_at: string;
    trigger_data: any;
    actions_executed: any[];
    result: ExecutionResult;
    error_details?: string;
    execution_time_ms: number;
    retry_count: number;
    related_entity_type?: string;
    related_entity_id?: string;
    rule?: AutomationRule;
}

interface AutomationStats {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    failedLast24h: number;
    activeRules: number;
}

interface AutomationMonitorProps {
    workspaceId: string;
}

export function AutomationMonitor({ workspaceId }: AutomationMonitorProps) {
    const [logs, setLogs] = useState<AutomationLog[]>([]);
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [stats, setStats] = useState<AutomationStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'partial'>('all');
    const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
    const [selectedLog, setSelectedLog] = useState<AutomationLog | null>(null);

    const loadLogs = async () => {
        let query = supabase
            .from('automation_logs')
            .select('*, automation_rules!inner(name, description)')
            .eq('workspace_id', workspaceId)
            .order('triggered_at', { ascending: false })
            .limit(100);

        // Apply filter
        if (filter !== 'all') {
            query = query.eq('result', filter);
        }

        // Apply time range
        const now = new Date();
        const timeRanges = {
            '1h': new Date(now.getTime() - 60 * 60 * 1000),
            '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
            '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        };
        query = query.gte('triggered_at', timeRanges[timeRange].toISOString());

        const { data, error } = await query;

        if (error) throw error;
        setLogs(data || []);
    };

    const loadRules = async () => {
        const { data, error } = await supabase
            .from('automation_rules')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('priority', { ascending: false });

        if (error) throw error;
        setRules(data || []);
    };

    const loadStats = async () => {
        const { data, error } = await supabase
            .rpc('get_automation_stats', { workspace_id_param: workspaceId });

        if (error) {
            // Fallback to manual calculation if function doesn't exist
            const { data: logsData } = await supabase
                .from('automation_logs')
                .select('result, execution_time_ms, triggered_at')
                .eq('workspace_id', workspaceId)
                .gte('triggered_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

            if (logsData) {
                const totalExecutions = logsData.length;
                const successCount = logsData.filter(l => l.result === 'success').length;
                const failedLast24h = logsData.filter(l => 
                    l.result === 'failed' && 
                    new Date(l.triggered_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
                ).length;
                const avgExecutionTime = logsData.reduce((sum, l) => sum + (l.execution_time_ms || 0), 0) / totalExecutions;

                setStats({
                    totalExecutions,
                    successRate: totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0,
                    avgExecutionTime,
                    failedLast24h,
                    activeRules: rules.filter(r => r.is_active).length
                });
            }
        } else {
            setStats(data);
        }
    };

    const toggleRule = async (ruleId: string, isActive: boolean) => {
        const { error } = await supabase
            .from('automation_rules')
            .update({ is_active: !isActive })
            .eq('id', ruleId);

        if (error) {
            logger.error('Failed to toggle rule:', error);
            alert('Failed to toggle automation rule');
        } else {
            await loadRules();
        }
    };

    const retryFailed = async (log: AutomationLog) => {
        if (!confirm('Retry this failed automation?')) return;

        try {
            const { automationEngine } = await import('../../lib/services/automationService');
            
            const result = await automationEngine.trigger(
                log.rule?.trigger_type || 'deal_stage_change',
                {
                    workspaceId: log.workspace_id,
                    entityType: log.related_entity_type,
                    entityId: log.related_entity_id,
                    data: log.trigger_data
                }
            );

            if (result.success) {
                alert('Automation retried successfully');
                await loadLogs();
            } else {
                alert(`Retry failed: ${result.errors.join(', ')}`);
            }
        } catch (error) {
            logger.error('Failed to retry automation:', error);
            alert('Failed to retry automation');
        }
    };

    const getResultColor = (result: ExecutionResult) => {
        switch (result) {
            case 'success': return 'bg-green-100 text-green-800 border-green-300';
            case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'failed': return 'bg-red-100 text-red-800 border-red-300';
            case 'skipped': return 'bg-gray-100 text-gray-800 border-gray-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                loadLogs(),
                loadRules(),
                loadStats()
            ]);
        } catch (error) {
            logger.error('Failed to load automation data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [workspaceId, filter, timeRange]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-gray-500">Loading automation data...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Kill Switch */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-mono">Automation Monitor</h2>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            const killSwitch = featureFlags.isEnabled('automation.global-kill-switch');
                            if (!killSwitch || confirm('Are you sure you want to ' + (killSwitch ? 'DISABLE' : 'ENABLE') + ' the global automation kill switch?')) {
                                featureFlags.setEnabled('automation.global-kill-switch', !killSwitch);
                                window.location.reload();
                            }
                        }}
                        className={`font-mono px-4 py-2 border-2 border-black font-semibold ${
                            featureFlags.isEnabled('automation.global-kill-switch')
                                ? 'bg-red-500 text-white'
                                : 'bg-white text-black'
                        }`}
                    >
                        {featureFlags.isEnabled('automation.global-kill-switch') ? '🚨 Kill Switch: ON' : 'Kill Switch: OFF'}
                    </button>
                    <button
                        onClick={loadData}
                        className="font-mono px-4 py-2 bg-black text-white border-2 border-black font-semibold hover:bg-gray-800"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-white border-2 border-black p-4">
                        <div className="text-sm font-mono text-gray-600">Total Executions</div>
                        <div className="text-3xl font-bold font-mono">{stats.totalExecutions}</div>
                    </div>
                    <div className="bg-white border-2 border-black p-4">
                        <div className="text-sm font-mono text-gray-600">Success Rate</div>
                        <div className="text-3xl font-bold font-mono">{stats.successRate.toFixed(1)}%</div>
                    </div>
                    <div className="bg-white border-2 border-black p-4">
                        <div className="text-sm font-mono text-gray-600">Avg Time</div>
                        <div className="text-3xl font-bold font-mono">{stats.avgExecutionTime.toFixed(0)}ms</div>
                    </div>
                    <div className="bg-white border-2 border-black p-4">
                        <div className="text-sm font-mono text-gray-600">Failed (24h)</div>
                        <div className="text-3xl font-bold font-mono text-red-600">{stats.failedLast24h}</div>
                    </div>
                    <div className="bg-white border-2 border-black p-4">
                        <div className="text-sm font-mono text-gray-600">Active Rules</div>
                        <div className="text-3xl font-bold font-mono">{stats.activeRules}</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="flex gap-2">
                    <label className="font-mono text-sm font-semibold">Filter:</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="font-mono border-2 border-black px-2 py-1"
                    >
                        <option value="all">All</option>
                        <option value="success">Success</option>
                        <option value="failed">Failed</option>
                        <option value="partial">Partial</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    <label className="font-mono text-sm font-semibold">Time:</label>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as any)}
                        className="font-mono border-2 border-black px-2 py-1"
                    >
                        <option value="1h">Last Hour</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                </div>
            </div>

            {/* Active Rules */}
            <div className="bg-white border-2 border-black p-4">
                <h3 className="text-lg font-bold font-mono mb-4">Active Automation Rules</h3>
                <div className="space-y-2">
                    {rules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between border-2 border-gray-300 p-3">
                            <div className="flex-grow">
                                <div className="font-mono font-semibold">{rule.name}</div>
                                <div className="text-sm text-gray-600">{rule.description}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Trigger: {rule.trigger_type} | Priority: {rule.priority} | 
                                    Executions: {rule.execution_count}
                                </div>
                            </div>
                            <button
                                onClick={() => toggleRule(rule.id, rule.is_active)}
                                className={`font-mono px-3 py-1 border-2 border-black font-semibold ${
                                    rule.is_active
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-300 text-gray-700'
                                }`}
                            >
                                {rule.is_active ? 'Active' : 'Inactive'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Execution Logs */}
            <div className="bg-white border-2 border-black p-4">
                <h3 className="text-lg font-bold font-mono mb-4">Execution Logs ({logs.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {logs.map(log => (
                        <div
                            key={log.id}
                            className={`border-2 p-3 cursor-pointer hover:shadow-md transition-shadow ${getResultColor(log.result)}`}
                            onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-grow">
                                    <div className="font-mono font-semibold">
                                        {(log as any).automation_rules?.name || 'Unknown Rule'}
                                    </div>
                                    <div className="text-sm">
                                        {formatTimestamp(log.triggered_at)} | 
                                        {log.execution_time_ms}ms | 
                                        {log.actions_executed?.length || 0} actions
                                        {log.retry_count > 0 && ` | ${log.retry_count} retries`}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`font-mono px-2 py-1 border-2 ${getResultColor(log.result)}`}>
                                        {log.result}
                                    </span>
                                    {log.result === 'failed' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                retryFailed(log);
                                            }}
                                            className="font-mono px-2 py-1 bg-blue-500 text-white border-2 border-black text-sm"
                                        >
                                            Retry
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {/* Expanded Details */}
                            {selectedLog?.id === log.id && (
                                <div className="mt-3 pt-3 border-t-2 border-current">
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <strong>Trigger Data:</strong>
                                            <pre className="mt-1 p-2 bg-white border-2 border-black overflow-x-auto">
                                                {JSON.stringify(log.trigger_data, null, 2)}
                                            </pre>
                                        </div>
                                        <div>
                                            <strong>Actions Executed:</strong>
                                            <pre className="mt-1 p-2 bg-white border-2 border-black overflow-x-auto">
                                                {JSON.stringify(log.actions_executed, null, 2)}
                                            </pre>
                                        </div>
                                        {log.error_details && (
                                            <div>
                                                <strong>Error:</strong>
                                                <pre className="mt-1 p-2 bg-red-50 border-2 border-red-500 text-red-800 overflow-x-auto">
                                                    {log.error_details}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {logs.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            No automation logs found for the selected filters
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
