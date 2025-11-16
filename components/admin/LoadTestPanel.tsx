/**
 * Load Testing Admin Panel Component
 * 
 * Tools for performance testing and monitoring
 */

import React, { useState } from 'react';
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
        if (!confirm('This will delete all test data. Continue?')) return;
        
        setIsRunning(true);
        try {
            const count = await cleanupTestData(workspaceId);
            alert(`Deleted ${count} test records`);
        } catch (error) {
            console.error('Cleanup failed:', error);
        } finally {
            setIsRunning(false);
        }
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
        <div className="p-6 bg-white border-4 border-black space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">⚡ Load Testing & Performance</h2>
                <button
                    onClick={downloadReport}
                    className="px-4 py-2 bg-blue-500 text-white border-2 border-black hover:bg-blue-600 font-bold"
                >
                    📊 Download Report
                </button>
            </div>

            {/* Test Selection */}
            <div className="grid grid-cols-4 gap-2">
                <button
                    onClick={() => setTestType('create')}
                    className={`px-4 py-2 border-2 border-black font-bold ${
                        testType === 'create' ? 'bg-black text-white' : 'bg-white'
                    }`}
                >
                    Create Data
                </button>
                <button
                    onClick={() => setTestType('pagination')}
                    className={`px-4 py-2 border-2 border-black font-bold ${
                        testType === 'pagination' ? 'bg-black text-white' : 'bg-white'
                    }`}
                >
                    Pagination
                </button>
                <button
                    onClick={() => setTestType('search')}
                    className={`px-4 py-2 border-2 border-black font-bold ${
                        testType === 'search' ? 'bg-black text-white' : 'bg-white'
                    }`}
                >
                    Search
                </button>
                <button
                    onClick={() => setTestType('concurrent')}
                    className={`px-4 py-2 border-2 border-black font-bold ${
                        testType === 'concurrent' ? 'bg-black text-white' : 'bg-white'
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
                    className="px-6 py-3 bg-green-500 text-white border-2 border-black hover:bg-green-600 font-bold disabled:opacity-50"
                >
                    {isRunning ? '⏳ Running...' : '▶️ Run Test'}
                </button>
                
                <button
                    onClick={handleCleanup}
                    disabled={isRunning}
                    className="px-6 py-3 bg-red-500 text-white border-2 border-black hover:bg-red-600 font-bold disabled:opacity-50"
                >
                    🗑️ Cleanup Test Data
                </button>
            </div>

            {/* Results Display */}
            {results && (
                <div className="p-4 bg-gray-100 border-2 border-gray-300 font-mono text-sm">
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
        </div>
    );
}
