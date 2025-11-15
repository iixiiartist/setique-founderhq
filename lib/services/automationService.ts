/**
 * Automation Service
 * Declarative automation engine for FounderHQ
 * 
 * Handles rule evaluation, action execution, retry logic, and audit logging
 */

import { supabase } from '../supabase';
import { logger } from '../logger';

// =====================================================
// Type Definitions
// =====================================================

export type TriggerType = 
    | 'deal_stage_change'
    | 'contact_added'
    | 'meeting_scheduled'
    | 'date_based'
    | 'inventory_low'
    | 'contract_expiring'
    | 'revenue_milestone';

export type ActionType = 
    | 'create_task'
    | 'create_revenue'
    | 'send_notification'
    | 'update_field'
    | 'create_calendar_event'
    | 'send_email'
    | 'update_inventory';

export type ExecutionResult = 'success' | 'partial' | 'failed' | 'skipped';

export interface AutomationCondition {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'between';
    value: any;
}

export interface RetryConfig {
    maxAttempts: number;
    backoffMs: number;
}

export interface AutomationAction {
    type: ActionType;
    params: Record<string, any>;
    retryConfig?: RetryConfig;
}

export interface AutomationRule {
    id: string;
    workspace_id: string;
    name: string;
    description?: string;
    trigger_type: TriggerType;
    trigger_conditions: AutomationCondition[];
    actions: AutomationAction[];
    is_active: boolean;
    priority: number;
    max_executions_per_minute: number;
    execution_count: number;
    last_executed_at?: string;
}

export interface AutomationPreferences {
    workspace_id: string;
    auto_create_revenue_enabled: boolean;
    auto_create_tasks_enabled: boolean;
    auto_invoice_enabled: boolean;
    auto_notifications_enabled: boolean;
    inventory_reorder_threshold: number;
    contract_renewal_lead_time_days: number;
    deal_follow_up_days: number;
    notification_preferences: Record<string, boolean>;
    automation_enabled: boolean;
    max_automations_per_hour: number;
}

export interface TriggerContext {
    workspaceId: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    data: Record<string, any>;
    previousData?: Record<string, any>;
}

export interface ActionResult {
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
}

export interface ExecutionLog {
    rule_id: string;
    workspace_id: string;
    trigger_data: any;
    actions_executed: any[];
    result: ExecutionResult;
    error_details?: string;
    execution_time_ms: number;
    retry_count: number;
    related_entity_type?: string;
    related_entity_id?: string;
}

// =====================================================
// Rate Limiter
// =====================================================

class AutomationRateLimiter {
    private executions = new Map<string, number[]>();

    canExecute(ruleId: string, maxPerMinute: number): boolean {
        const now = Date.now();
        const recent = this.executions.get(ruleId)?.filter(t => now - t < 60000) || [];
        
        if (recent.length >= maxPerMinute) {
            logger.warn(`Rate limit exceeded for rule ${ruleId}: ${recent.length}/${maxPerMinute} per minute`);
            return false;
        }

        this.executions.set(ruleId, [...recent, now]);
        return true;
    }

    cleanup() {
        const now = Date.now();
        for (const [ruleId, timestamps] of this.executions.entries()) {
            const recent = timestamps.filter(t => now - t < 60000);
            if (recent.length === 0) {
                this.executions.delete(ruleId);
            } else {
                this.executions.set(ruleId, recent);
            }
        }
    }
}

// =====================================================
// Loop Detector
// =====================================================

class LoopDetector {
    private callStack = new Set<string>();
    private executionHistory = new Map<string, number[]>();

    async execute<T>(ruleId: string, fn: () => Promise<T>): Promise<T> {
        // Check for immediate recursion
        if (this.callStack.has(ruleId)) {
            throw new Error(`Infinite loop detected: Rule ${ruleId} is already executing`);
        }

        // Check for rapid repeated executions (potential loop)
        const now = Date.now();
        const recent = this.executionHistory.get(ruleId)?.filter(t => now - t < 5000) || [];
        
        if (recent.length >= 5) {
            throw new Error(`Potential loop detected: Rule ${ruleId} executed ${recent.length} times in 5 seconds`);
        }

        this.callStack.add(ruleId);
        this.executionHistory.set(ruleId, [...recent, now]);

        try {
            return await fn();
        } finally {
            this.callStack.delete(ruleId);
        }
    }

    cleanup() {
        const now = Date.now();
        for (const [ruleId, timestamps] of this.executionHistory.entries()) {
            const recent = timestamps.filter(t => now - t < 60000);
            if (recent.length === 0) {
                this.executionHistory.delete(ruleId);
            } else {
                this.executionHistory.set(ruleId, recent);
            }
        }
    }
}

// =====================================================
// Automation Engine
// =====================================================

export class AutomationEngine {
    private rateLimiter = new AutomationRateLimiter();
    private loopDetector = new LoopDetector();

    // Cleanup timers
    constructor() {
        setInterval(() => {
            this.rateLimiter.cleanup();
            this.loopDetector.cleanup();
        }, 60000); // Every minute
    }

    /**
     * Get workspace automation preferences
     */
    async getPreferences(workspaceId: string): Promise<AutomationPreferences | null> {
        const { data, error } = await supabase
            .from('automation_preferences')
            .select('*')
            .eq('workspace_id', workspaceId)
            .single();

        if (error) {
            logger.error('Failed to fetch automation preferences:', error);
            return null;
        }

        return data;
    }

    /**
     * Find rules matching a trigger type and context
     */
    async findMatchingRules(
        triggerType: TriggerType,
        context: TriggerContext
    ): Promise<AutomationRule[]> {
        const { data: rules, error } = await supabase
            .from('automation_rules')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .eq('trigger_type', triggerType)
            .eq('is_active', true)
            .order('priority', { ascending: false });

        if (error) {
            logger.error('Failed to fetch automation rules:', error);
            return [];
        }

        // Filter rules by evaluating conditions
        return rules.filter(rule => this.evaluateConditions(rule.trigger_conditions, context));
    }

    /**
     * Evaluate if conditions match the context
     */
    private evaluateConditions(
        conditions: AutomationCondition | AutomationCondition[],
        context: TriggerContext
    ): boolean {
        const conditionArray = Array.isArray(conditions) ? conditions : [conditions];

        return conditionArray.every(condition => {
            const value = this.getValueByPath(context.data, condition.field);

            switch (condition.operator) {
                case 'equals':
                    return value === condition.value;
                case 'not_equals':
                    return value !== condition.value;
                case 'contains':
                    return String(value).includes(String(condition.value));
                case 'greater_than':
                    return Number(value) > Number(condition.value);
                case 'less_than':
                    return Number(value) < Number(condition.value);
                case 'in':
                    return Array.isArray(condition.value) && condition.value.includes(value);
                case 'between':
                    return (
                        Array.isArray(condition.value) &&
                        condition.value.length === 2 &&
                        Number(value) >= Number(condition.value[0]) &&
                        Number(value) <= Number(condition.value[1])
                    );
                default:
                    logger.warn(`Unknown operator: ${condition.operator}`);
                    return false;
            }
        });
    }

    /**
     * Get nested object value by dot-notation path
     */
    private getValueByPath(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Execute a single action with retry logic
     */
    private async executeActionWithRetry(
        action: AutomationAction,
        context: TriggerContext,
        retryCount = 0
    ): Promise<ActionResult> {
        const maxAttempts = action.retryConfig?.maxAttempts || 1;
        const backoffMs = action.retryConfig?.backoffMs || 1000;

        try {
            return await this.executeAction(action, context);
        } catch (error) {
            if (retryCount < maxAttempts - 1) {
                logger.warn(`Action ${action.type} failed, retrying (${retryCount + 1}/${maxAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, backoffMs * (retryCount + 1)));
                return this.executeActionWithRetry(action, context, retryCount + 1);
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Execute a single action based on type
     */
    private async executeAction(
        action: AutomationAction,
        context: TriggerContext
    ): Promise<ActionResult> {
        logger.info(`Executing action: ${action.type}`, { workspaceId: context.workspaceId });

        switch (action.type) {
            case 'create_revenue':
                return this.createRevenueAction(action.params, context);
            
            case 'create_task':
                return this.createTaskAction(action.params, context);
            
            case 'send_notification':
                return this.sendNotificationAction(action.params, context);
            
            case 'update_field':
                return this.updateFieldAction(action.params, context);
            
            default:
                return {
                    success: false,
                    error: `Unknown action type: ${action.type}`
                };
        }
    }

    /**
     * Action: Create revenue transaction from deal
     */
    private async createRevenueAction(
        params: Record<string, any>,
        context: TriggerContext
    ): Promise<ActionResult> {
        try {
            // Dynamic import to avoid circular dependencies
            const { ProductIntegrationService } = await import('./productService');
            
            const deal = context.data;
            
            // Check if product link is required
            if (params.require_product_link && !deal.product_service_id) {
                return {
                    success: false,
                    error: 'Deal must be linked to a product/service'
                };
            }

            const closeDate = params.use_deal_close_date ? deal.actual_close_date : undefined;
            const result = await ProductIntegrationService.convertDealToRevenue(deal, closeDate);

            return {
                success: result.success,
                message: result.success ? 'Revenue transaction created' : 'Failed to create revenue',
                error: result.error,
                data: result.transaction
            };
        } catch (error) {
            logger.error('Failed to create revenue:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Action: Create task
     */
    private async createTaskAction(
        params: Record<string, any>,
        context: TriggerContext
    ): Promise<ActionResult> {
        // Implement task creation logic
        // This would integrate with your existing task creation system
        return {
            success: true,
            message: 'Task creation not yet implemented'
        };
    }

    /**
     * Action: Send notification
     */
    private async sendNotificationAction(
        params: Record<string, any>,
        context: TriggerContext
    ): Promise<ActionResult> {
        // Implement notification sending logic
        return {
            success: true,
            message: 'Notification sending not yet implemented'
        };
    }

    /**
     * Action: Update field
     */
    private async updateFieldAction(
        params: Record<string, any>,
        context: TriggerContext
    ): Promise<ActionResult> {
        // Implement field update logic
        return {
            success: true,
            message: 'Field update not yet implemented'
        };
    }

    /**
     * Log automation execution
     */
    private async logExecution(log: ExecutionLog): Promise<void> {
        const { error } = await supabase
            .from('automation_logs')
            .insert(log);

        if (error) {
            logger.error('Failed to log automation execution:', error);
        }
    }

    /**
     * Main execution entry point
     */
    async trigger(
        triggerType: TriggerType,
        context: TriggerContext
    ): Promise<{ success: boolean; executedRules: number; errors: string[] }> {
        const startTime = Date.now();
        const errors: string[] = [];
        let executedCount = 0;

        try {
            // Check if automations are globally enabled for workspace
            const prefs = await this.getPreferences(context.workspaceId);
            if (!prefs?.automation_enabled) {
                logger.info('Automations disabled for workspace', { workspaceId: context.workspaceId });
                return { success: true, executedRules: 0, errors: [] };
            }

            // Find matching rules
            const rules = await this.findMatchingRules(triggerType, context);
            logger.info(`Found ${rules.length} matching automation rules`, { triggerType });

            // Execute each rule
            for (const rule of rules) {
                try {
                    await this.loopDetector.execute(rule.id, async () => {
                        // Check rate limit
                        if (!this.rateLimiter.canExecute(rule.id, rule.max_executions_per_minute)) {
                            errors.push(`Rate limit exceeded for rule: ${rule.name}`);
                            return;
                        }

                        const ruleStartTime = Date.now();
                        const actionResults: ActionResult[] = [];
                        let ruleResult: ExecutionResult = 'success';

                        // Execute all actions
                        for (const action of rule.actions) {
                            const result = await this.executeActionWithRetry(action, context);
                            actionResults.push(result);

                            if (!result.success) {
                                ruleResult = actionResults.some(r => r.success) ? 'partial' : 'failed';
                            }
                        }

                        // Log execution
                        await this.logExecution({
                            rule_id: rule.id,
                            workspace_id: context.workspaceId,
                            trigger_data: context.data,
                            actions_executed: actionResults,
                            result: ruleResult,
                            error_details: actionResults
                                .filter(r => !r.success)
                                .map(r => r.error)
                                .join('; '),
                            execution_time_ms: Date.now() - ruleStartTime,
                            retry_count: 0,
                            related_entity_type: context.entityType,
                            related_entity_id: context.entityId
                        });

                        if (ruleResult !== 'failed') {
                            executedCount++;
                        } else {
                            errors.push(`Rule "${rule.name}" failed to execute`);
                        }
                    });
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    logger.error(`Failed to execute rule ${rule.name}:`, error);
                    errors.push(`Rule "${rule.name}": ${errorMsg}`);
                }
            }

            logger.info(`Automation trigger complete`, {
                triggerType,
                executedRules: executedCount,
                totalTime: Date.now() - startTime,
                errors: errors.length
            });

            return {
                success: errors.length === 0,
                executedRules: executedCount,
                errors
            };
        } catch (error) {
            logger.error('Automation trigger failed:', error);
            return {
                success: false,
                executedRules: executedCount,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }
}

// Singleton instance
export const automationEngine = new AutomationEngine();
