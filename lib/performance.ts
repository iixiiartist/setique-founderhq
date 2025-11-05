import { APP_CONFIG } from './config'

class PerformanceMonitor {
  private metrics: Map<string, number> = new Map()
  private startTimes: Map<string, number> = new Map()

  // Start timing an operation
  startTiming(operation: string) {
    this.startTimes.set(operation, performance.now())
  }

  // End timing an operation and record the duration
  endTiming(operation: string) {
    const startTime = this.startTimes.get(operation)
    if (startTime) {
      const duration = performance.now() - startTime
      this.metrics.set(operation, duration)
      this.startTimes.delete(operation)
      
      if (APP_CONFIG.isDevelopment) {
        console.log(`⚡ ${operation}: ${duration.toFixed(2)}ms`)
      }
      
      return duration
    }
    return null
  }

  // Get all recorded metrics
  getMetrics() {
    return Object.fromEntries(this.metrics)
  }

  // Clear all metrics
  clearMetrics() {
    this.metrics.clear()
    this.startTimes.clear()
  }

  // Log a custom metric
  recordMetric(name: string, value: number) {
    this.metrics.set(name, value)
    
    if (APP_CONFIG.isDevelopment) {
      console.log(`📊 ${name}: ${value}`)
    }
  }

  // Monitor component render time
  withTiming<T>(operation: string, fn: () => T): T {
    this.startTiming(operation)
    try {
      const result = fn()
      this.endTiming(operation)
      return result
    } catch (error) {
      this.endTiming(operation)
      throw error
    }
  }

  // Monitor async operations
  async withAsyncTiming<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    this.startTiming(operation)
    try {
      const result = await fn()
      this.endTiming(operation)
      return result
    } catch (error) {
      this.endTiming(operation)
      throw error
    }
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor()

// Utility function to measure React component renders
export const measureRender = (componentName: string) => {
  return {
    onMount: () => perfMonitor.startTiming(`${componentName} mount`),
    onUnmount: () => perfMonitor.endTiming(`${componentName} mount`),
    onRender: () => {
      perfMonitor.endTiming(`${componentName} render`)
      perfMonitor.startTiming(`${componentName} render`)
    }
  }
}

// Web Vitals monitoring (if available)
export const monitorWebVitals = () => {
  if ('performance' in window && 'PerformanceObserver' in window) {
    // Monitor Largest Contentful Paint (LCP)
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            perfMonitor.recordMetric('LCP', entry.startTime)
          }
        }
      })
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (e) {
      console.warn('Could not observe LCP:', e)
    }

    // Monitor First Input Delay (FID)
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            perfMonitor.recordMetric('FID', (entry as any).processingStart - entry.startTime)
          }
        }
      })
      observer.observe({ entryTypes: ['first-input'] })
    } catch (e) {
      console.warn('Could not observe FID:', e)
    }
  }
}