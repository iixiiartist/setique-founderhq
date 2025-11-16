/**
 * Feature Flags System
 * Provides runtime control over features without redeployment
 * 
 * Priority: CRITICAL for automation safety (kill switches)
 */

import { logger } from './logger';

// =====================================================
// Feature Flag Definitions
// =====================================================

export type FeatureFlagKey = 
    // Automation flags
    | 'automation.global-kill-switch'
    | 'automation.deal-to-revenue'
    | 'automation.inventory-reservation'
    | 'automation.auto-invoice'
    | 'automation.auto-tasks'
    | 'automation.auto-notifications'
    | 'automation.contract-renewal-reminders'
    
    // Analytics flags
    | 'analytics.revenue-forecasting'
    | 'analytics.churn-prediction'
    
    // AI flags
    | 'ai.groq-enabled'
    | 'ai.document-analysis'
    | 'ai.conversation-history'
    
    // UI features
    | 'ui.unified-accounts'
    | 'ui.paginated-crm'
    
    // Experimental features
    | 'experimental.new-dashboard'
    | 'experimental.advanced-charts';

interface FeatureFlagConfig {
    key: FeatureFlagKey;
    enabled: boolean;
    description: string;
    envVar?: string; // Optional environment variable override
}

// =====================================================
// Default Feature Flag Configuration
// =====================================================

const DEFAULT_FLAGS: FeatureFlagConfig[] = [
    // Automation flags
    {
        key: 'automation.global-kill-switch',
        enabled: false, // OFF by default - flip to true to disable ALL automations
        description: 'Emergency kill switch - disables all automations across all workspaces',
        envVar: 'VITE_AUTOMATION_KILL_SWITCH'
    },
    {
        key: 'automation.deal-to-revenue',
        enabled: true,
        description: 'Auto-create revenue transactions when deals close',
        envVar: 'VITE_AUTOMATION_DEAL_REVENUE'
    },
    {
        key: 'automation.inventory-reservation',
        enabled: true,
        description: 'Auto-reserve inventory when deals close',
        envVar: 'VITE_AUTOMATION_INVENTORY'
    },
    {
        key: 'automation.auto-invoice',
        enabled: false, // Disabled until implemented
        description: 'Auto-generate invoices on deal close or subscription renewal'
    },
    {
        key: 'automation.auto-tasks',
        enabled: true,
        description: 'Auto-create follow-up tasks based on triggers'
    },
    {
        key: 'automation.auto-notifications',
        enabled: true,
        description: 'Send automated notifications for important events'
    },
    {
        key: 'automation.contract-renewal-reminders',
        enabled: true,
        description: 'Send reminders before contracts expire'
    },
    
    // Analytics flags
    {
        key: 'analytics.revenue-forecasting',
        enabled: true,
        description: 'Show revenue forecasting charts'
    },
    {
        key: 'analytics.churn-prediction',
        enabled: false,
        description: 'Show churn prediction analytics (experimental)'
    },
    
    // AI flags
    {
        key: 'ai.groq-enabled',
        enabled: true,
        description: 'Enable Groq AI assistant',
        envVar: 'VITE_GROQ_ENABLED'
    },
    {
        key: 'ai.document-analysis',
        enabled: true,
        description: 'Enable AI document analysis and Q&A'
    },
    {
        key: 'ai.conversation-history',
        enabled: true,
        description: 'Persist AI conversation history'
    },
    
    // UI features
    {
        key: 'ui.unified-accounts',
        enabled: true,
        description: 'Show unified Accounts tab (combines Investors, Customers, Partners)',
        envVar: 'VITE_UNIFIED_ACCOUNTS'
    },
    {
        key: 'ui.paginated-crm',
        enabled: false, // Start disabled for testing
        description: 'Use server-side pagination and virtualized lists for CRM (scalability)',
        envVar: 'VITE_PAGINATED_CRM'
    },
    
    // Experimental
    {
        key: 'experimental.new-dashboard',
        enabled: false,
        description: 'New dashboard layout (under development)'
    },
    {
        key: 'experimental.advanced-charts',
        enabled: false,
        description: 'Advanced charting with drill-down'
    }
];

// =====================================================
// Feature Flag Manager
// =====================================================

class FeatureFlagManager {
    private flags = new Map<FeatureFlagKey, boolean>();
    private initialized = false;

    constructor() {
        this.initializeFlags();
    }

    /**
     * Initialize flags from default config and environment variables
     */
    private initializeFlags(): void {
        for (const config of DEFAULT_FLAGS) {
            let enabled = config.enabled;

            // Check for environment variable override
            if (config.envVar && import.meta.env[config.envVar] !== undefined) {
                const envValue = import.meta.env[config.envVar];
                enabled = envValue === 'true' || envValue === '1' || envValue === 'yes';
                logger.info(`Feature flag ${config.key} overridden by ${config.envVar}: ${enabled}`);
            }

            this.flags.set(config.key, enabled);
        }

        this.initialized = true;
        logger.info(`Feature flags initialized: ${this.flags.size} flags loaded`);
    }

    /**
     * Check if a feature is enabled
     */
    isEnabled(key: FeatureFlagKey): boolean {
        if (!this.initialized) {
            logger.warn('Feature flags accessed before initialization');
            this.initializeFlags();
        }

        // Global kill switch takes precedence for automation flags
        if (key.startsWith('automation.') && key !== 'automation.global-kill-switch') {
            const killSwitch = this.flags.get('automation.global-kill-switch');
            if (killSwitch) {
                logger.warn(`Automation ${key} blocked by global kill switch`);
                return false;
            }
        }

        return this.flags.get(key) ?? false;
    }

    /**
     * Dynamically enable/disable a feature (runtime control)
     */
    setEnabled(key: FeatureFlagKey, enabled: boolean): void {
        const previous = this.flags.get(key);
        this.flags.set(key, enabled);
        
        logger.info(`Feature flag ${key} changed: ${previous} -> ${enabled}`);

        // Special handling for kill switch
        if (key === 'automation.global-kill-switch' && enabled) {
            logger.error('🚨 AUTOMATION KILL SWITCH ACTIVATED - All automations disabled!');
        }
    }

    /**
     * Get all flags and their states (for admin UI)
     */
    getAllFlags(): Array<{ key: FeatureFlagKey; enabled: boolean; description: string }> {
        return DEFAULT_FLAGS.map(config => ({
            key: config.key,
            enabled: this.isEnabled(config.key),
            description: config.description
        }));
    }

    /**
     * Get flags by category
     */
    getFlagsByCategory(category: 'automation' | 'analytics' | 'ai' | 'experimental'): Array<{ key: FeatureFlagKey; enabled: boolean; description: string }> {
        return this.getAllFlags().filter(flag => flag.key.startsWith(`${category}.`));
    }

    /**
     * Reset all flags to defaults
     */
    reset(): void {
        this.flags.clear();
        this.initializeFlags();
        logger.info('Feature flags reset to defaults');
    }
}

// =====================================================
// Singleton Export
// =====================================================

export const featureFlags = new FeatureFlagManager();

// =====================================================
// Convenience Helpers
// =====================================================

/**
 * Check if automation is allowed to run
 * Returns { allowed: boolean, reason?: string }
 */
export function canRunAutomation(automationType: string): { allowed: boolean; reason?: string } {
    // Check global kill switch
    if (featureFlags.isEnabled('automation.global-kill-switch')) {
        return {
            allowed: false,
            reason: 'Global automation kill switch is active'
        };
    }

    // Check specific automation flag
    const flagKey = `automation.${automationType}` as FeatureFlagKey;
    if (!featureFlags.isEnabled(flagKey)) {
        return {
            allowed: false,
            reason: `Automation ${automationType} is disabled`
        };
    }

    return { allowed: true };
}

/**
 * Execute a function only if automation is allowed
 */
export async function withAutomationCheck<T>(
    automationType: string,
    fn: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
    const check = canRunAutomation(automationType);
    
    if (!check.allowed) {
        logger.warn(`Automation ${automationType} skipped: ${check.reason}`);
        return {
            success: false,
            error: check.reason
        };
    }

    try {
        const data = await fn();
        return { success: true, data };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
