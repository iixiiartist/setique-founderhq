/**
 * Performance Monitor Service
 * 
 * Tracks and reports performance metrics for the CRM system
 */

import { logger } from '../utils/logger';

export interface PerformanceMetrics {
    operation: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface AggregatedMetrics {
    operation: string;
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    p99Duration: number;
}

class PerformanceMonitorService {
    private metrics: PerformanceMetrics[] = [];
    private maxMetrics = 1000; // Keep last 1000 measurements
    private observers: Map<string, PerformanceObserver> = new Map();

    /**
     * Measure execution time of an async function
     */
    async measure<T>(
        operation: string,
        fn: () => Promise<T>,
        metadata?: Record<string, any>
    ): Promise<T> {
        const start = performance.now();
        
        try {
            const result = await fn();
            const duration = performance.now() - start;
            
            this.recordMetric({
                operation,
                duration,
                timestamp: Date.now(),
                metadata
            });
            
            // Log slow operations
            if (duration > 1000) {
                logger.warn(`[Performance] Slow operation: ${operation}`, {
                    duration: `${duration.toFixed(2)}ms`,
                    metadata
                });
            }
            
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.recordMetric({
                operation: `${operation}_error`,
                duration,
                timestamp: Date.now(),
                metadata: { ...metadata, error: error instanceof Error ? error.message : 'Unknown' }
            });
            throw error;
        }
    }

    /**
     * Measure synchronous function execution
     */
    measureSync<T>(
        operation: string,
        fn: () => T,
        metadata?: Record<string, any>
    ): T {
        const start = performance.now();
        
        try {
            const result = fn();
            const duration = performance.now() - start;
            
            this.recordMetric({
                operation,
                duration,
                timestamp: Date.now(),
                metadata
            });
            
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.recordMetric({
                operation: `${operation}_error`,
                duration,
                timestamp: Date.now(),
                metadata: { ...metadata, error: error instanceof Error ? error.message : 'Unknown' }
            });
            throw error;
        }
    }

    /**
     * Record a performance metric
     */
    private recordMetric(metric: PerformanceMetrics): void {
        this.metrics.push(metric);
        
        // Keep only last N metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }
    }

    /**
     * Get aggregated metrics for an operation
     */
    getMetrics(operation?: string): AggregatedMetrics[] {
        const filtered = operation
            ? this.metrics.filter(m => m.operation === operation)
            : this.metrics;

        // Group by operation
        const grouped = new Map<string, number[]>();
        filtered.forEach(metric => {
            if (!grouped.has(metric.operation)) {
                grouped.set(metric.operation, []);
            }
            grouped.get(metric.operation)!.push(metric.duration);
        });

        // Calculate aggregates
        return Array.from(grouped.entries()).map(([op, durations]) => {
            const sorted = durations.sort((a, b) => a - b);
            const count = sorted.length;
            const sum = sorted.reduce((a, b) => a + b, 0);
            
            return {
                operation: op,
                count,
                avgDuration: sum / count,
                minDuration: sorted[0],
                maxDuration: sorted[count - 1],
                p95Duration: sorted[Math.floor(count * 0.95)],
                p99Duration: sorted[Math.floor(count * 0.99)]
            };
        });
    }

    /**
     * Monitor Web Vitals (LCP, FID, CLS)
     */
    observeWebVitals(): void {
        if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
            return;
        }

        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as any;
            
            logger.info('[Performance] LCP', {
                value: `${lastEntry.renderTime || lastEntry.loadTime}ms`,
                rating: this.rateWebVital(lastEntry.renderTime || lastEntry.loadTime, [2500, 4000])
            });
        });

        try {
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.set('lcp', lcpObserver);
        } catch (e) {
            // LCP not supported
        }

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
                logger.info('[Performance] FID', {
                    value: `${entry.processingStart - entry.startTime}ms`,
                    rating: this.rateWebVital(entry.processingStart - entry.startTime, [100, 300])
                });
            });
        });

        try {
            fidObserver.observe({ entryTypes: ['first-input'] });
            this.observers.set('fid', fidObserver);
        } catch (e) {
            // FID not supported
        }

        // Cumulative Layout Shift (CLS)
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
                if (!entry.hadRecentInput) {
                    clsScore += entry.value;
                }
            });
            
            logger.info('[Performance] CLS', {
                value: clsScore.toFixed(3),
                rating: this.rateWebVital(clsScore, [0.1, 0.25])
            });
        });

        try {
            clsObserver.observe({ entryTypes: ['layout-shift'] });
            this.observers.set('cls', clsObserver);
        } catch (e) {
            // CLS not supported
        }
    }

    /**
     * Rate Web Vital metric (good/needs-improvement/poor)
     */
    private rateWebVital(value: number, thresholds: [number, number]): string {
        if (value <= thresholds[0]) return 'good';
        if (value <= thresholds[1]) return 'needs-improvement';
        return 'poor';
    }

    /**
     * Generate performance report
     */
    generateReport(): string {
        const aggregated = this.getMetrics();
        
        let report = '=== Performance Report ===\n\n';
        
        aggregated.forEach(metric => {
            report += `${metric.operation}:\n`;
            report += `  Count: ${metric.count}\n`;
            report += `  Avg: ${metric.avgDuration.toFixed(2)}ms\n`;
            report += `  Min: ${metric.minDuration.toFixed(2)}ms\n`;
            report += `  Max: ${metric.maxDuration.toFixed(2)}ms\n`;
            report += `  P95: ${metric.p95Duration.toFixed(2)}ms\n`;
            report += `  P99: ${metric.p99Duration.toFixed(2)}ms\n\n`;
        });
        
        return report;
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics = [];
    }

    /**
     * Disconnect all observers
     */
    disconnect(): void {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
}

export const performanceMonitor = new PerformanceMonitorService();

// Auto-start Web Vitals monitoring
if (typeof window !== 'undefined') {
    performanceMonitor.observeWebVitals();
}
