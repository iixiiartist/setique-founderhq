import { supabase } from '../supabase';

/**
 * Enhanced AI Context Service
 * Builds comprehensive workspace context for AI interactions
 */

export interface WorkspaceContext {
    recentTasks: Array<{
        id: string;
        text: string;
        status: string;
        priority: string;
        dueDate?: string;
    }>;
    upcomingDeadlines: Array<{
        type: 'task' | 'deal' | 'event';
        title: string;
        dueDate: string;
    }>;
    recentDeals: Array<{
        id: string;
        title: string;
        stage: string;
        value: number;
    }>;
    teamWorkload: Array<{
        userId: string;
        userName: string;
        activeTasks: number;
        overdueTasks: number;
    }>;
    financialMetrics: {
        monthlyRevenue: number;
        monthlyExpenses: number;
        runwayMonths: number;
    };
}

export async function buildEnhancedContext(
    workspaceId: string,
    userId?: string
): Promise<{ success: boolean; context?: WorkspaceContext; error?: string }> {
    try {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Get recent tasks
        const { data: tasks } = await supabase
            .from('tasks')
            .select('id, text, status, priority, due_date')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(10);

        // Get upcoming deadlines
        const upcomingTasks = tasks?.filter(t => 
            t.due_date && new Date(t.due_date) <= sevenDaysFromNow
        ) || [];

        // Get recent deals
        const { data: deals } = await supabase
            .from('deals')
            .select('id, title, stage, value')
            .eq('workspace_id', workspaceId)
            .neq('stage', 'Closed Won')
            .neq('stage', 'Closed Lost')
            .order('created_at', { ascending: false })
            .limit(5);

        // Get team workload
        const { data: members } = await supabase
            .from('workspace_members')
            .select('user_id, user_name')
            .eq('workspace_id', workspaceId);

        const teamWorkload = await Promise.all(
            (members || []).map(async (member) => {
                const { data: memberTasks } = await supabase
                    .from('tasks')
                    .select('id, status, due_date')
                    .eq('workspace_id', workspaceId)
                    .eq('assigned_to', member.user_id);

                const activeTasks = memberTasks?.filter(t => t.status !== 'Done').length || 0;
                const overdueTasks = memberTasks?.filter(t => 
                    t.status !== 'Done' && t.due_date && new Date(t.due_date) < now
                ).length || 0;

                return {
                    userId: member.user_id,
                    userName: member.user_name || 'Unknown',
                    activeTasks,
                    overdueTasks,
                };
            })
        );

        // Get financial metrics
        const { data: revenue } = await supabase
            .from('revenue_entries')
            .select('amount, date')
            .eq('workspace_id', workspaceId);

        const { data: expenses } = await supabase
            .from('expense_entries')
            .select('amount, date')
            .eq('workspace_id', workspaceId);

        const monthlyRevenue = revenue?.reduce((sum, r) => sum + r.amount, 0) || 0;
        const monthlyExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
        const runwayMonths = monthlyExpenses > 0 ? monthlyRevenue / monthlyExpenses : 12;

        const context: WorkspaceContext = {
            recentTasks: (tasks || []).map(t => ({
                id: t.id,
                text: t.text,
                status: t.status,
                priority: t.priority,
                dueDate: t.due_date,
            })),
            upcomingDeadlines: upcomingTasks.map(t => ({
                type: 'task' as const,
                title: t.text,
                dueDate: t.due_date!,
            })),
            recentDeals: (deals || []).map(d => ({
                id: d.id,
                title: d.title,
                stage: d.stage,
                value: d.value || 0,
            })),
            teamWorkload,
            financialMetrics: {
                monthlyRevenue,
                monthlyExpenses,
                runwayMonths,
            },
        };

        return { success: true, context };
    } catch (error) {
        console.error('Error building enhanced context:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Format context into a readable string for AI prompts
 */
export function formatContextForAI(context: WorkspaceContext): string {
    let formatted = '**Current Workspace Context:**\n\n';

    // Tasks
    formatted += `**Recent Tasks (${context.recentTasks.length}):**\n`;
    context.recentTasks.slice(0, 5).forEach(task => {
        formatted += `- ${task.text} (${task.status}, ${task.priority} priority)\n`;
    });

    // Deadlines
    if (context.upcomingDeadlines.length > 0) {
        formatted += `\n**Upcoming Deadlines:**\n`;
        context.upcomingDeadlines.forEach(deadline => {
            formatted += `- ${deadline.title} (${deadline.dueDate})\n`;
        });
    }

    // Deals
    if (context.recentDeals.length > 0) {
        formatted += `\n**Active Deals:**\n`;
        context.recentDeals.forEach(deal => {
            formatted += `- ${deal.title}: $${deal.value} (${deal.stage})\n`;
        });
    }

    // Team workload
    if (context.teamWorkload.length > 0) {
        formatted += `\n**Team Workload:**\n`;
        context.teamWorkload.forEach(member => {
            formatted += `- ${member.userName}: ${member.activeTasks} active tasks`;
            if (member.overdueTasks > 0) {
                formatted += ` (${member.overdueTasks} overdue)`;
            }
            formatted += '\n';
        });
    }

    // Financial metrics
    formatted += `\n**Financial Health:**\n`;
    formatted += `- Monthly Revenue: $${context.financialMetrics.monthlyRevenue.toFixed(0)}\n`;
    formatted += `- Monthly Expenses: $${context.financialMetrics.monthlyExpenses.toFixed(0)}\n`;
    formatted += `- Runway: ${context.financialMetrics.runwayMonths.toFixed(1)} months\n`;

    return formatted;
}
