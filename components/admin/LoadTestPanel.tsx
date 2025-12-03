/**
 * Load Testing Admin Panel Component
 * 
 * Tools for performance testing and monitoring
 */

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useDeleteConfirm } from '../../hooks';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { 
    createTestData, 
    cleanupTestData, 
    testPaginationPerformance,
    testSearchPerformance,
    testConcurrentRequests,
    LoadTestResult 
} from '../../lib/services/loadTestService';
import { performanceMonitor } from '../../lib/services/performanceMonitor';

interface LoadTestPanelProps {
    workspaceId: string;
    userId: string;
}

export function LoadTestPanel({ workspaceId, userId }: LoadTestPanelProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [testType, setTestType] = useState<'create' | 'pagination' | 'search' | 'concurrent'>('create');
    
    // Cleanup confirmation
    const cleanupConfirm = useDeleteConfirm<void>('test data');

    const runCreateTest = async () => {
        setIsRunning(true);
        setResults(null);
        
        try {
            const result = await createTestData(workspaceId, userId, {
                numItems: 1000,
                batchSize: 100,
                delay: 0
            });
            setResults(result);
        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            setIsRunning(false);
        }
    };

    const runPaginationTest = async () => {
        setIsRunning(true);
        setResults(null);
        
        try {
            const result = await testPaginationPerformance(workspaceId, 10);
            setResults(result);
        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            setIsRunning(false);
        }
    };

    const runSearchTest = async () => {
        setIsRunning(true);
        setResults(null);
        
        try {
            const result = await testSearchPerformance(workspaceId, [
                'Test',
                'Company',
                'Technology',
                'test company 1',
                'nonexistent query'
            ]);
            setResults(result);
        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            setIsRunning(false);
        }
    };

    const runConcurrentTest = async () => {
        setIsRunning(true);
        setResults(null);
        
        try {
            const result = await testConcurrentRequests(workspaceId, 20);
            setResults(result);
        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            setIsRunning(false);
        }
    };

    const handleCleanup = async () => {
        cleanupConfirm.requestConfirm(undefined, async () => {
            setIsRunning(true);
            try {
                const count = await cleanupTestData(workspaceId);
                toast.success(`Deleted ${count} test records`);
            } catch (error) {
                console.error('Cleanup failed:', error);
                toast.error('Cleanup failed');
            } finally {
                setIsRunning(false);
            }
        });
    };

    const downloadReport = () => {
        const report = performanceMonitor.generateReport();
        const blob = new Blob([report], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `performance_report_${new Date().toISOString()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">⚡ Load Testing & Performance</h2>
                <button
                    onClick={downloadReport}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl border border-blue-600 hover:bg-blue-600 hover:shadow-md font-bold transition-all"
                >
                    📊 Download Report
                </button>
            </div>

            {/* Test Selection */}
            <div className="grid grid-cols-4 gap-2">
                <button
                    onClick={() => setTestType('create')}
                    className={`px-4 py-2 rounded-xl border border-gray-200 font-bold transition-all ${
                        testType === 'create' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-gray-50'
                    }`}
                >
                    Create Data
                </button>
                <button
                    onClick={() => setTestType('pagination')}
                    className={`px-4 py-2 rounded-xl border border-gray-200 font-bold transition-all ${
                        testType === 'pagination' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-gray-50'
                    }`}
                >
                    Pagination
                </button>
                <button
                    onClick={() => setTestType('search')}
                    className={`px-4 py-2 rounded-xl border border-gray-200 font-bold transition-all ${
                        testType === 'search' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-gray-50'
                    }`}
                >
                    Search
                </button>
                <button
                    onClick={() => setTestType('concurrent')}
                    className={`px-4 py-2 rounded-xl border border-gray-200 font-bold transition-all ${
                        testType === 'concurrent' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-gray-50'
                    }`}
                >
                    Concurrent
                </button>
            </div>

            {/* Test Controls */}
            <div className="flex gap-2">
                <button
                    onClick={() => {
                        if (testType === 'create') runCreateTest();
                        else if (testType === 'pagination') runPaginationTest();
                        else if (testType === 'search') runSearchTest();
                        else if (testType === 'concurrent') runConcurrentTest();
                    }}
                    disabled={isRunning}
                    className="px-6 py-3 bg-green-500 text-white rounded-xl border border-green-600 hover:bg-green-600 hover:shadow-md font-bold disabled:opacity-50 transition-all"
                >
                    {isRunning ? '⏳ Running...' : '▶️ Run Test'}
                </button>
                
                <button
                    onClick={handleCleanup}
                    disabled={isRunning}
                    className="px-6 py-3 bg-red-500 text-white rounded-xl border border-red-600 hover:bg-red-600 hover:shadow-md font-bold disabled:opacity-50 transition-all"
                >
                    🗑️ Cleanup Test Data
                </button>
            </div>

            {/* Results Display */}
            {results && (
                <div className="p-4 bg-gray-100 rounded-xl border border-gray-200 font-mono text-sm">
                    <h3 className="font-bold mb-2">Test Results:</h3>
                    <pre className="whitespace-pre-wrap">
                        {JSON.stringify(results, null, 2)}
                    </pre>
                </div>
            )}

            {/* Real-time Metrics */}
            <div className="grid grid-cols-3 gap-4">
                {performanceMonitor.getMetrics().slice(0, 3).map(metric => (
                    <div key={metric.operation} className="p-4 bg-blue-50 border-2 border-blue-300">
                        <div className="font-bold text-sm mb-2">{metric.operation}</div>
                        <div className="text-xs space-y-1">
                            <div>Count: {metric.count}</div>
                            <div>Avg: {metric.avgDuration.toFixed(2)}ms</div>
                            <div>P95: {metric.p95Duration.toFixed(2)}ms</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Warning */}
            <div className="p-4 bg-yellow-100 border-2 border-yellow-600">
                <strong>⚠️ Warning:</strong> Load testing can impact database performance. 
                Run during off-peak hours or in development environment only.
            </div>

            {/* Cleanup Confirmation Dialog */}
            <ConfirmDialog
                isOpen={cleanupConfirm.isOpen}
                onClose={cleanupConfirm.cancel}
                onConfirm={cleanupConfirm.confirm}
                title={cleanupConfirm.title}
                message="This will delete all test data. This action cannot be undone."
                confirmLabel={cleanupConfirm.confirmLabel}
                cancelLabel={cleanupConfirm.cancelLabel}
                variant={cleanupConfirm.variant}
                isLoading={cleanupConfirm.isProcessing}
            />
        </div>
    );
}
