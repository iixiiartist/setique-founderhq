import { supabase } from '../supabase';

/**
 * Automated Workflows Engine
 * Execute automated actions based on triggers
 */

export type TriggerType = 'task_completed' | 'deal_won' | 'deal_lost' | 'contact_added' | 'date_reached' | 'task_overdue';
export type ActionType = 'create_task' | 'send_notification' | 'update_field' | 'run_ai' | 'send_email';

export interface WorkflowTrigger {
    type: TriggerType;
    conditions?: Record<string, any>;
}

export interface WorkflowAction {
    type: ActionType;
    params: Record<string, any>;
}

export interface Workflow {
    id: string;
    workspace_id: string;
    name: string;
    description: string;
    enabled: boolean;
    trigger: WorkflowTrigger;
    actions: WorkflowAction[];
    created_at: string;
    created_by: string;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(
    workspaceId: string,
    userId: string,
    name: string,
    description: string,
    trigger: WorkflowTrigger,
    actions: WorkflowAction[]
): Promise<{ success: boolean; workflow?: Workflow; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('workflows')
            .insert({
                workspace_id: workspaceId,
                name,
                description,
                enabled: true,
                trigger,
                actions,
                created_by: userId,
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, workflow: data };
    } catch (error) {
        console.error('Error creating workflow:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Execute workflow actions when trigger is met
 */
export async function executeWorkflow(
    workflowId: string,
    triggerData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: workflow, error: fetchError } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single();

        if (fetchError || !workflow || !workflow.enabled) {
            return { success: false, error: 'Workflow not found or disabled' };
        }

        // Execute each action
        for (const action of workflow.actions) {
            await executeAction(workflow.workspace_id, action, triggerData);
        }

        return { success: true };
    } catch (error) {
        console.error('Error executing workflow:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Execute a single workflow action
 */
async function executeAction(
    workspaceId: string,
    action: WorkflowAction,
    triggerData: Record<string, any>
): Promise<void> {
    switch (action.type) {
        case 'create_task':
            await supabase.from('tasks').insert({
                workspace_id: workspaceId,
                text: action.params.title || 'Automated task',
                status: 'Todo',
                priority: action.params.priority || 'Medium',
                category: action.params.category || 'Other',
                assigned_to: action.params.assignedTo,
            });
            break;

        case 'send_notification':
            await supabase.from('notifications').insert({
                workspace_id: workspaceId,
                user_id: action.params.userId,
                type: 'workflow',
                title: action.params.title || 'Workflow notification',
                message: action.params.message || '',
            });
            break;

        case 'update_field':
            const { table, id, field, value } = action.params;
            if (table && id && field) {
                await supabase.from(table).update({ [field]: value }).eq('id', id);
            }
            break;

        default:
            console.log(`Action type ${action.type} not implemented yet`);
    }
}

/**
 * Get all workflows for a workspace
 */
export async function getWorkflows(
    workspaceId: string
): Promise<{ success: boolean; workflows?: Workflow[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, workflows: data || [] };
    } catch (error) {
        console.error('Error fetching workflows:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Toggle workflow enabled status
 */
export async function toggleWorkflow(
    workflowId: string,
    enabled: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('workflows')
            .update({ enabled })
            .eq('id', workflowId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error toggling workflow:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(
    workflowId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('workflows')
            .delete()
            .eq('id', workflowId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting workflow:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Pre-built workflow templates
 */
export const WORKFLOW_TEMPLATES = [
    {
        name: 'Deal Won → Create Onboarding Tasks',
        description: 'Automatically create onboarding tasks when a deal is won',
        trigger: { type: 'deal_won' as TriggerType },
        actions: [
            {
                type: 'create_task' as ActionType,
                params: {
                    title: 'Schedule kickoff call',
                    priority: 'High',
                    category: 'Customer Success',
                },
            },
            {
                type: 'create_task' as ActionType,
                params: {
                    title: 'Send welcome email',
                    priority: 'High',
                    category: 'Customer Success',
                },
            },
            {
                type: 'send_notification' as ActionType,
                params: {
                    title: 'New customer won!',
                    message: 'Onboarding tasks have been created',
                },
            },
        ],
    },
    {
        name: 'Task Overdue → Notify Manager',
        description: 'Send notification when a high-priority task becomes overdue',
        trigger: { type: 'task_overdue' as TriggerType, conditions: { priority: 'High' } },
        actions: [
            {
                type: 'send_notification' as ActionType,
                params: {
                    title: 'High-priority task overdue',
                    message: 'A high-priority task is now overdue',
                },
            },
        ],
    },
    {
        name: 'Contact Added → Generate Outreach Email',
        description: 'Generate AI outreach email when a new contact is added',
        trigger: { type: 'contact_added' as TriggerType },
        actions: [
            {
                type: 'run_ai' as ActionType,
                params: {
                    action: 'generate_email',
                    template: 'cold_outreach',
                },
            },
        ],
    },
];
