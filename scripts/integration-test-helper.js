/**
 * Integration Test Helper Script
 * 
 * Run this in the browser console to test CRM features
 */

// ============================================================================
// SETUP & CONFIGURATION
// ============================================================================

console.log('🧪 CRM Integration Test Helper Loaded');
console.log('=====================================\n');

// Check feature flags
const checkFeatureFlags = () => {
    console.log('📊 Feature Flags Status:');
    console.log('- ui.unified-accounts:', localStorage.getItem('VITE_UNIFIED_ACCOUNTS') || 'default (true)');
    console.log('- ui.paginated-crm:', localStorage.getItem('VITE_PAGINATED_CRM') || 'default (false)');
    console.log('');
};

// Enable paginated CRM
const enablePaginatedCRM = () => {
    localStorage.setItem('VITE_PAGINATED_CRM', 'true');
    console.log('✅ Paginated CRM enabled');
    console.log('🔄 Reload page to apply changes');
    return 'Run: window.location.reload()';
};

// Disable paginated CRM
const disablePaginatedCRM = () => {
    localStorage.setItem('VITE_PAGINATED_CRM', 'false');
    console.log('❌ Paginated CRM disabled');
    console.log('🔄 Reload page to apply changes');
    return 'Run: window.location.reload()';
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

const startPerformanceMonitoring = () => {
    console.log('📈 Starting performance monitoring...');
    console.log('Metrics will be logged every 30 seconds\n');
    
    // Import needed (assumes performanceMonitor is exported globally or accessible)
    window.perfInterval = setInterval(() => {
        console.log('\n⏱️ Performance Metrics Update:');
        console.log('Time:', new Date().toLocaleTimeString());
        
        // Try to access performance metrics
        if (window.performanceMonitor) {
            const metrics = window.performanceMonitor.getMetrics();
            console.table(metrics);
        } else {
            console.log('⚠️ Performance monitor not available. Check if module is loaded.');
        }
    }, 30000);
    
    return 'Performance monitoring started';
};

const stopPerformanceMonitoring = () => {
    if (window.perfInterval) {
        clearInterval(window.perfInterval);
        console.log('⏹️ Performance monitoring stopped');
    }
};

// ============================================================================
// NETWORK MONITORING
// ============================================================================

const monitorNetwork = () => {
    console.log('🌐 Monitoring network requests...');
    console.log('Watch for: POST /rest/v1/rpc/get_crm_items_paginated\n');
    
    const originalFetch = window.fetch;
    let requestCount = 0;
    
    window.fetch = async (...args) => {
        const url = args[0];
        const options = args[1] || {};
        
        // Log CRM-related requests
        if (url.includes('crm') || url.includes('rpc')) {
            requestCount++;
            const startTime = performance.now();
            console.log(`📤 [${requestCount}] Request:`, {
                url: typeof url === 'string' ? url.split('/').pop() : 'complex',
                method: options.method || 'GET',
                time: new Date().toLocaleTimeString()
            });
            
            const response = await originalFetch(...args);
            const duration = (performance.now() - startTime).toFixed(2);
            
            console.log(`📥 [${requestCount}] Response:`, {
                status: response.status,
                duration: `${duration}ms`,
                ok: response.ok ? '✅' : '❌'
            });
            
            return response;
        }
        
        return originalFetch(...args);
    };
    
    return 'Network monitoring active';
};

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

const getTestData = () => {
    return {
        company: `Test Corp ${Date.now()}`,
        type: 'customer',
        status: 'active',
        priority: 'high',
        description: 'Test account for integration testing',
        website: 'https://test.com'
    };
};

// ============================================================================
// VERIFICATION TESTS
// ============================================================================

const verifyPaginationActive = () => {
    console.log('🔍 Checking if pagination is active...\n');
    
    // Check for pagination controls in DOM
    const paginationControls = document.querySelector('[class*="pagination"]') || 
                               document.querySelector('button:contains("Next")');
    
    if (paginationControls) {
        console.log('✅ Pagination controls found in DOM');
    } else {
        console.log('❌ Pagination controls not found');
        console.log('💡 Make sure you\'re on the Accounts tab');
    }
    
    // Check for virtualized list
    const virtualizedList = document.querySelector('[class*="virtualized"]') ||
                           document.querySelector('[style*="transform: translate"]');
    
    if (virtualizedList) {
        console.log('✅ Virtualized list detected');
    } else {
        console.log('⚠️ Virtualized list not detected');
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Open Network tab in DevTools');
    console.log('2. Look for: POST /rest/v1/rpc/get_crm_items_paginated');
    console.log('3. If found, pagination is working! 🎉');
};

const checkMemoryUsage = () => {
    console.log('💾 Memory Usage Check:\n');
    
    if (performance.memory) {
        const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
        const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(2);
        const limit = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2);
        
        console.log(`Used: ${used} MB`);
        console.log(`Total: ${total} MB`);
        console.log(`Limit: ${limit} MB`);
        console.log(`Usage: ${((used / limit) * 100).toFixed(1)}%`);
        
        if (used < 50) {
            console.log('✅ Memory usage is good');
        } else if (used < 100) {
            console.log('⚠️ Memory usage is moderate');
        } else {
            console.log('❌ Memory usage is high');
        }
    } else {
        console.log('⚠️ Memory API not available (only in Chrome)');
    }
};

// ============================================================================
// AUDIT LOG CHECKER
// ============================================================================

const checkAuditLogs = async (limit = 10) => {
    console.log('📜 Fetching recent audit logs...\n');
    
    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('table_name', 'crm_items')
            .order('performed_at', { ascending: false })
            .limit(limit);
        
        if (error) {
            console.error('❌ Error fetching audit logs:', error);
            return;
        }
        
        if (!data || data.length === 0) {
            console.log('⚠️ No audit logs found');
            console.log('💡 Try creating/updating an account first');
            return;
        }
        
        console.log(`✅ Found ${data.length} recent audit log entries:`);
        console.table(data.map(log => ({
            operation: log.operation,
            user: log.user_id.substring(0, 8) + '...',
            time: new Date(log.performed_at).toLocaleString(),
            changes: log.new_values ? Object.keys(log.new_values).join(', ') : 'N/A'
        })));
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
};

// ============================================================================
// DATABASE VERIFICATION
// ============================================================================

const verifyDatabaseSetup = async () => {
    console.log('🔧 Verifying database setup...\n');
    
    const checks = [
        {
            name: 'Pagination RPC Function',
            query: `SELECT proname FROM pg_proc WHERE proname = 'get_crm_items_paginated'`
        },
        {
            name: 'CSV Export RPC Function',
            query: `SELECT proname FROM pg_proc WHERE proname = 'export_crm_items_csv'`
        },
        {
            name: 'Audit Logs Table',
            query: `SELECT table_name FROM information_schema.tables WHERE table_name = 'audit_logs'`
        },
        {
            name: 'Performance Indexes',
            query: `SELECT indexname FROM pg_indexes WHERE tablename = 'crm_items' AND indexname LIKE 'idx_crm%'`
        }
    ];
    
    console.log('⚠️ Note: Run these queries in Supabase SQL Editor:\n');
    checks.forEach((check, i) => {
        console.log(`${i + 1}. ${check.name}:`);
        console.log(`   ${check.query}`);
        console.log('');
    });
    
    console.log('✅ All should return results if migrations applied correctly');
};

// ============================================================================
// QUICK TEST SUITE
// ============================================================================

const runQuickTest = () => {
    console.log('🚀 Running Quick Integration Test\n');
    console.log('================================\n');
    
    checkFeatureFlags();
    console.log('');
    
    verifyPaginationActive();
    console.log('');
    
    checkMemoryUsage();
    console.log('\n================================');
    console.log('Quick test complete!');
    console.log('\nFor detailed tests, run:');
    console.log('- checkAuditLogs() - Check audit trail');
    console.log('- monitorNetwork() - Watch API calls');
    console.log('- startPerformanceMonitoring() - Track metrics');
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

window.crmTest = {
    // Setup
    enablePaginatedCRM,
    disablePaginatedCRM,
    checkFeatureFlags,
    
    // Monitoring
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
    monitorNetwork,
    
    // Verification
    verifyPaginationActive,
    checkMemoryUsage,
    checkAuditLogs,
    verifyDatabaseSetup,
    
    // Quick test
    runQuickTest,
    
    // Helpers
    getTestData
};

// ============================================================================
// WELCOME MESSAGE
// ============================================================================

console.log('✨ CRM Test Helper Ready!\n');
console.log('Available commands:');
console.log('==================');
console.log('crmTest.runQuickTest()           - Run quick integration test');
console.log('crmTest.enablePaginatedCRM()     - Enable paginated CRM feature');
console.log('crmTest.disablePaginatedCRM()    - Disable paginated CRM feature');
console.log('crmTest.verifyPaginationActive() - Check if pagination is working');
console.log('crmTest.checkMemoryUsage()       - Check memory consumption');
console.log('crmTest.checkAuditLogs(10)       - View recent audit log entries');
console.log('crmTest.monitorNetwork()         - Log all CRM API requests');
console.log('crmTest.startPerformanceMonitoring() - Track performance metrics');
console.log('crmTest.verifyDatabaseSetup()    - Get database check queries');
console.log('\n💡 Start with: crmTest.runQuickTest()');
