import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, Task, AppActions, Priority, BusinessProfile, SettingsData } from '../types';
import type { QuickLink } from '../types';
import { getAiResponse } from '../services/groqService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TASK_TAG_BG_COLORS } from '../constants';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from './shared/Modal';
import { TaskComments } from './shared/TaskComments';
import { SubtaskManager } from './shared/SubtaskManager';
import KpiCard from './shared/KpiCard';
import TeamActivityFeed from './team/TeamActivityFeed';

const TaskItem: React.FC<{ 
    task: Task & { tag: string; collection: string }; 
    onUpdateTask: AppActions['updateTask']; 
    onDeleteTask: AppActions['deleteItem']; 
    canEdit: boolean; 
    canComplete: boolean;
    onTaskClick?: (task: Task) => void 
}> = ({ task, onUpdateTask, onDeleteTask, canEdit, canComplete, onTaskClick }) => {
    const isOverdue = task.status !== 'Done' && task.dueDate && task.dueDate < new Date().toISOString().split('T')[0];
    const tagColorClass = TASK_TAG_BG_COLORS[task.tag] || 'bg-gray-300';
    return (
        <li className={`flex items-stretch bg-white border-2 shadow-neo mb-2 ${isOverdue ? 'border-red-500' : 'border-black'}`}>
            <div className={`w-2 shrink-0 ${tagColorClass}`}></div>
            <div 
                className="flex items-center justify-between p-3 flex-grow overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onTaskClick?.(task)}
            >
                <div className="flex items-center flex-grow overflow-hidden">
                    <input 
                        type="checkbox" 
                        checked={task.status === 'Done'}
                        onChange={(e) => {
                            e.stopPropagation(); // Prevent triggering card click
                            onUpdateTask(task.id, { status: e.target.checked ? 'Done' : 'Todo' });
                        }}
                        disabled={!canComplete}
                        className="w-5 h-5 mr-3 accent-blue-500 shrink-0 border-2 border-black rounded-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        title={!canComplete ? 'You cannot complete this task' : ''}
                    />
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-mono text-xs font-semibold text-gray-600">{task.tag}</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-black truncate ${task.status === 'Done' ? 'line-through' : ''} ${!canEdit ? 'opacity-50' : ''}`}>{task.text}</span>
                            {task.subtasks && task.subtasks.length > 0 && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-300 shrink-0">
                                    📋 {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                                </span>
                            )}
                        </div>
                        {task.assignedToName && (
                            <span className="font-mono text-xs text-blue-600 mt-1">
                                👤 {task.assignedToName}
                            </span>
                        )}
                    </div>
                </div>
                <div className="shrink-0 ml-2 flex items-center gap-2">
                    {isOverdue && <span className="font-mono text-xs font-bold text-red-600">OVERDUE</span>}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering card click
                            if (!canEdit) {
                                alert('You do not have permission to delete this task');
                                return;
                            }
                            if (window.confirm('Delete this task?')) {
                                onDeleteTask(task.collection as any, task.id);
                            }
                        }}
                        disabled={!canEdit}
                        className="text-xl font-bold hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Delete task: ${task.text}`}
                    >
                        &times;
                    </button>
                </div>
            </div>
        </li>
    );
};

const QuickLink: React.FC<{ href: string, text: string, iconChar: string, iconBg: string, iconColor: string }> = ({ href, text }) => (
    <li>
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-gray-100 hover:bg-gray-200 border-2 border-black transition-colors">
            <div className="text-xl mr-3">
                🌐
            </div>
            <span>{text}</span>
        </a>
    </li>
);

const LS_BRIEFING_DATE_KEY = 'setique-lastBriefingDate';
const LS_BRIEFING_CONTENT_KEY = 'setique-dailyBriefing';

const DashboardTab: React.FC<{ 
    data: DashboardData; 
    actions: AppActions; 
    businessProfile?: BusinessProfile | null;
    settings?: SettingsData;
}> = ({ data, actions, businessProfile, settings }) => {
    const { canEditTask, canCompleteTask, workspaceMembers, workspace } = useWorkspace();
    const { user } = useAuth();
    const [sortOption, setSortOption] = useState<'createdAt' | 'tag'>('createdAt');
    const [filterTag, setFilterTag] = useState<string>('All');
    const [filterAssignment, setFilterAssignment] = useState<string>('all');
    const [showCompleted, setShowCompleted] = useState(false);
    const [dailyBriefing, setDailyBriefing] = useState<string | null>(null);
    const [isBriefingLoading, setIsBriefingLoading] = useState<boolean>(true);
    
    // Task detail modal state
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [editingTask, setEditingTask] = useState(false);
    const [editText, setEditText] = useState('');
    const [editPriority, setEditPriority] = useState<Priority>('Medium');
    const [editDueDate, setEditDueDate] = useState('');
    const [editAssignedTo, setEditAssignedTo] = useState('');
    const [editSubtasks, setEditSubtasks] = useState<Task['subtasks']>([]);

    const generateBriefing = async () => {
        setIsBriefingLoading(true);
        
        // Debug: Log the business profile to see what we're working with
        console.log('📊 [DashboardTab] Generating briefing with business profile:', businessProfile);
        
        // Build business context if available
        let businessContext = '';
        if (businessProfile) {
            // Note: Database returns snake_case, not camelCase
            const profile = businessProfile as any;
            const contextParts = [
                `**Business Context:**`,
                `- Company: ${profile.company_name || profile.companyName || 'Your Company'}`,
                `- Industry: ${profile.industry || 'Not specified'}`,
                `- Business Model: ${profile.business_model || profile.businessModel || 'Not specified'}`,
                `- Description: ${profile.description || 'Not specified'}`,
                `- Target Market: ${profile.target_market || profile.targetMarket || 'Not specified'}`,
                `- Primary Goal: ${profile.primary_goal || profile.primaryGoal || 'Not specified'}`,
                `- Key Challenges: ${profile.key_challenges || profile.keyChallenges || 'Not specified'}`,
                `- Growth Stage: ${profile.growth_stage || profile.growthStage || 'Not specified'}`
            ];

            // Phase 2: Enhanced context fields
            if (profile.target_customer_profile || profile.targetCustomerProfile) {
                contextParts.push(`- Target Customer: ${profile.target_customer_profile || profile.targetCustomerProfile}`);
            }
            if (profile.market_positioning || profile.marketPositioning) {
                contextParts.push(`- Market Positioning: ${profile.market_positioning || profile.marketPositioning}`);
            }
            if (profile.competitive_advantages || profile.competitiveAdvantages) {
                const advantages = profile.competitive_advantages || profile.competitiveAdvantages;
                contextParts.push(`- Competitive Advantages: ${Array.isArray(advantages) ? advantages.join(', ') : advantages}`);
            }
            if (profile.monetization_model || profile.monetizationModel) {
                contextParts.push(`- Monetization Model: ${profile.monetization_model || profile.monetizationModel}`);
            }
            if (profile.average_deal_size || profile.averageDealSize) {
                contextParts.push(`- Avg Deal Size: $${profile.average_deal_size || profile.averageDealSize}`);
            }
            if (profile.sales_cycle_days || profile.salesCycleDays) {
                contextParts.push(`- Sales Cycle: ${profile.sales_cycle_days || profile.salesCycleDays} days`);
            }

            businessContext = contextParts.join('\n');
        }
        
        // Get company name from either snake_case or camelCase
        const companyName = businessProfile 
            ? ((businessProfile as any).company_name || (businessProfile as any).companyName || 'their business')
            : 'their business';
        
        const systemPrompt = `You are a Chief of Staff AI for a solo founder building "${companyName}". Your goal is to provide a concise, actionable daily briefing based on the provided dashboard data and business context.

${businessContext}
        
        **Analysis Guidelines:**
        - Start with a friendly, encouraging opening that references their business.
        - Highlight any calendar events scheduled for today (meetings, tasks with due dates).
        - Point out any overdue tasks or CRM actions. Be specific.
        - **Subtask Progress:** When relevant, mention tasks with subtasks and their completion status (e.g., "The 'Launch MVP' task has 3/5 subtasks completed").
        - Mention upcoming calendar events for the next few days.
        - Summarize the number of active items in each key CRM pipeline (Investors, Customers, Partners).
        - Briefly mention the latest financial metrics (MRR, GMV) and any trends if there's enough data.
        - **Reference their business context when relevant** (industry, goals, challenges, target market).
        - Conclude with a motivational closing statement tailored to their business goals.
        - Use markdown for clear formatting (headings, bold text, lists).
        - Keep the entire briefing concise and easy to scan.
        - Today's date is ${new Date().toISOString().split('T')[0]}.

        **Response Accuracy:**
        - Do not make up or hallucinate information. All responses must be based on real-world information and the data provided.
        - If you do not have an answer to a question, explicitly state that you don't know the answer at this time.
        `;

        // Calculate subtask statistics
        const allTasksForStats = [
            ...data.productsServicesTasks,
            ...data.investorTasks,
            ...data.customerTasks,
            ...data.partnerTasks,
            ...data.marketingTasks,
            ...data.financialTasks
        ];
        
        const tasksWithSubtasks = allTasksForStats.filter(t => t.subtasks && t.subtasks.length > 0);
        const totalSubtasks = tasksWithSubtasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
        const completedSubtasks = tasksWithSubtasks.reduce((sum, t) => 
            sum + (t.subtasks?.filter(st => st.completed).length || 0), 0
        );
        
        const subtaskStats = {
            tasksWithSubtasks: tasksWithSubtasks.length,
            totalSubtasks,
            completedSubtasks,
            percentComplete: totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0
        };

        const userPrompt = `Here is the current state of my dashboard. Please provide my daily briefing.
        
        **Subtask Progress Summary:** ${subtaskStats.tasksWithSubtasks} tasks have subtasks. Overall subtask completion: ${subtaskStats.completedSubtasks}/${subtaskStats.totalSubtasks} (${subtaskStats.percentComplete}%)
        
        Dashboard Data:
        ${JSON.stringify(data, null, 2)}
        `;

        try {
            const response = await getAiResponse(
                [{ role: 'user', parts: [{ text: userPrompt }] }],
                systemPrompt,
                false, // Do not use tools for the briefing
                workspace?.id // Pass workspaceId for rate limiting
            );
            // Extract text from the GenerateContentResponse format
            const briefingText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "Could not generate a briefing at this time.";
            setDailyBriefing(briefingText);
            localStorage.setItem(LS_BRIEFING_CONTENT_KEY, briefingText);
        } catch (error) {
            console.error("Failed to generate daily briefing:", error);
            setDailyBriefing("Sorry, I couldn't generate your briefing due to an error. Please try again later.");
        } finally {
            setIsBriefingLoading(false);
        }
    };

    useEffect(() => {
        // Skip briefing generation for free users
        if (workspace?.planType === 'free') {
            setIsBriefingLoading(false);
            setDailyBriefing(null);
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const lastBriefingDate = localStorage.getItem(LS_BRIEFING_DATE_KEY);
        const cachedBriefing = localStorage.getItem(LS_BRIEFING_CONTENT_KEY);

        if (lastBriefingDate === today && cachedBriefing) {
            setDailyBriefing(cachedBriefing);
            setIsBriefingLoading(false);
        } else {
            generateBriefing();
            localStorage.setItem(LS_BRIEFING_DATE_KEY, today);
        }
    }, [workspace?.planType]); // Re-run if plan changes

    const allTasks = useMemo(() => [
        ...data.productsServicesTasks.map(t => ({ ...t, tag: 'Products & Services', collection: 'productsServicesTasks' as const })),
        ...data.investorTasks.map(t => ({ ...t, tag: 'Investor', collection: 'investorTasks' as const })),
        ...data.customerTasks.map(t => ({ ...t, tag: 'Customer', collection: 'customerTasks' as const })),
        ...data.partnerTasks.map(t => ({ ...t, tag: 'Partner', collection: 'partnerTasks' as const })),
        ...data.marketingTasks.map(t => ({ ...t, tag: 'Marketing', collection: 'marketingTasks' as const })),
        ...data.financialTasks.map(t => ({ ...t, tag: 'Financials', collection: 'financialTasks' as const })),
    ], [data]);

    const processedTasks = useMemo(() => {
        const incomplete = allTasks.filter(t => t.status !== 'Done');
        
        // Apply tag filter
        const filtered = filterTag === 'All' 
            ? incomplete 
            : incomplete.filter(t => t.tag === filterTag);

        // Apply assignment filter
        let assignmentFiltered = filtered;
        if (filterAssignment === 'assigned-to-me') {
            console.log('[DashboardTab] Filtering for assigned-to-me. User ID:', user?.id);
            console.log('[DashboardTab] Tasks before filter:', filtered.map(t => ({ id: t.id, text: t.text, assignedTo: t.assignedTo, assignedToName: t.assignedToName })));
            assignmentFiltered = filtered.filter(t => t.assignedTo === user?.id);
            console.log('[DashboardTab] Tasks after filter:', assignmentFiltered.map(t => ({ id: t.id, text: t.text, assignedTo: t.assignedTo })));
        } else if (filterAssignment === 'unassigned') {
            assignmentFiltered = filtered.filter(t => !t.assignedTo);
        } else if (filterAssignment === 'created-by-me') {
            assignmentFiltered = filtered.filter(t => t.userId === user?.id);
        }

        return [...assignmentFiltered].sort((a, b) => {
            if (sortOption === 'tag') {
                const tagCompare = a.tag.localeCompare(b.tag);
                if (tagCompare !== 0) return tagCompare;
            }
            // Default/fallback sort is by date
            return b.createdAt - a.createdAt;
        });
    }, [allTasks, filterTag, filterAssignment, sortOption, user?.id]);

    const completedTasks = useMemo(() => {
        const completed = allTasks.filter(t => t.status === 'Done');
        return [...completed].sort((a, b) => b.createdAt - a.createdAt);
    }, [allTasks]);

    const completedCount = completedTasks.length;
    
    const tagOptions = ['All', 'Platform', 'Investor', 'Customer', 'Partner', 'Marketing', 'Financials'];

    // Task detail modal handlers
    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setEditText(task.text);
        setEditPriority(task.priority);
        setEditDueDate(task.dueDate || '');
        setEditAssignedTo(task.assignedTo || '');
        setEditSubtasks(task.subtasks || []);
        setEditingTask(false);
    };

    const handleSaveTask = () => {
        if (selectedTask && editText.trim()) {
            actions.updateTask(selectedTask.id, {
                text: editText.trim(),
                priority: editPriority,
                dueDate: editDueDate || null,
                assignedTo: editAssignedTo || null,
                subtasks: editSubtasks,
            });
            setEditingTask(false);
        }
    };

    const handleCloseModal = () => {
        setSelectedTask(null);
        setEditingTask(false);
    };

    const canEditSelectedTask = selectedTask && canEditTask(selectedTask.userId, selectedTask.assignedTo);

    // Check if user has AI access (not on free plan)
    const hasAiAccess = workspace?.planType !== 'free';

    return (
        <div>
            {/* Only show Daily Briefing for paid plans */}
            {hasAiAccess && (
                <div className="bg-white p-4 sm:p-6 border-2 border-black shadow-neo mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                        <h2 className="text-xl font-semibold text-black">Daily Briefing</h2>
                        <button 
                            onClick={generateBriefing} 
                            disabled={isBriefingLoading}
                            className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-2 px-4 rounded-none font-semibold shadow-neo-btn transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                        >
                            {isBriefingLoading ? 'Generating...' : 'Regenerate'}
                        </button>
                    </div>
                    {isBriefingLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                        </div>
                    ) : (
                        <ReactMarkdown className="markdown-content" remarkPlugins={[remarkGfm]}>
                            {dailyBriefing || ''}
                        </ReactMarkdown>
                    )}
                </div>
            )}

            <div className="mb-8">
                <KpiCard title="Tasks Completed" value={`${completedCount} / ${allTasks.length}`} description="Across all modules" />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <h2 className="text-xl font-semibold text-black">All Incomplete Tasks</h2>
                            <div className="flex flex-wrap gap-2">
                                <select 
                                    value={filterTag} 
                                    onChange={(e) => setFilterTag(e.target.value)}
                                    className="bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    {tagOptions.map(tag => <option key={tag} value={tag}>Filter: {tag}</option>)}
                                </select>
                                <select 
                                    value={filterAssignment} 
                                    onChange={(e) => setFilterAssignment(e.target.value)}
                                    className="bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="all">All Tasks</option>
                                    <option value="assigned-to-me">Assigned to Me</option>
                                    <option value="unassigned">Unassigned</option>
                                    <option value="created-by-me">Created by Me</option>
                                </select>
                                <select 
                                    value={sortOption} 
                                    onChange={(e) => setSortOption(e.target.value as 'createdAt' | 'tag')}
                                    className="bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="createdAt">Sort: Date</option>
                                    <option value="tag">Sort: Tag</option>
                                </select>
                            </div>
                        </div>
                        <ul className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                           {processedTasks.length > 0 ? (
                                processedTasks.map(task => <TaskItem key={task.id} task={task} onUpdateTask={actions.updateTask} onDeleteTask={actions.deleteItem} canEdit={!task.userId || canEditTask(task.userId, task.assignedTo)} canComplete={canCompleteTask(task.assignedTo)} onTaskClick={handleTaskClick} />)
                           ) : (
                               <li className="text-gray-500 italic p-4">No matching tasks found.</li>
                           )}
                        </ul>
                    </div>

                    {/* Completed Tasks Section */}
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <button
                            onClick={() => setShowCompleted(!showCompleted)}
                            className="w-full flex items-center justify-between text-left hover:opacity-70 transition-opacity"
                        >
                            <h2 className="text-xl font-semibold text-black">
                                Completed Tasks ({completedCount})
                            </h2>
                            <span className="text-2xl font-bold text-black">
                                {showCompleted ? '−' : '+'}
                            </span>
                        </button>
                        
                        {showCompleted && (
                            <ul className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2 mt-4">
                                {completedTasks.length > 0 ? (
                                    completedTasks.map(task => <TaskItem key={task.id} task={task} onUpdateTask={actions.updateTask} onDeleteTask={actions.deleteItem} canEdit={!task.userId || canEditTask(task.userId, task.assignedTo)} canComplete={canCompleteTask(task.assignedTo)} onTaskClick={handleTaskClick} />)
                                ) : (
                                    <li className="text-gray-500 italic p-4">No completed tasks yet.</li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-8">
                    {/* Team Activity Feed */}
                    {workspace && (
                        <TeamActivityFeed 
                            workspaceId={workspace.id}
                            limit={15}
                            showFilters={true}
                        />
                    )}
                    
                    {settings?.quickLinks && settings.quickLinks.length > 0 && (
                        <div className="bg-white p-6 border-2 border-black shadow-neo">
                            <h2 className="text-xl font-semibold text-black mb-4">Quick Links</h2>
                            <ul className="space-y-3">
                                {settings.quickLinks.map((link) => (
                                    <QuickLink 
                                        key={link.id}
                                        href={link.href}
                                        text={link.text}
                                        iconChar={link.iconChar}
                                        iconBg={link.iconBg}
                                        iconColor={link.iconColor}
                                    />
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Task Detail Modal */}
            {selectedTask && (
                <Modal
                    isOpen={true}
                    onClose={handleCloseModal}
                    title="Task Details"
                >
                    <div className="space-y-4">
                        {/* Task Info */}
                        <div className="space-y-3">
                            {editingTask ? (
                                <>
                                    <input
                                        type="text"
                                        value={editText || ''}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="w-full px-3 py-2 border-2 border-black rounded-none focus:outline-none focus:border-blue-500"
                                        placeholder="Task description"
                                    />
                                    <div className="grid grid-cols-3 gap-3">
                                        <select
                                            value={editPriority || 'Medium'}
                                            onChange={(e) => setEditPriority(e.target.value as Priority)}
                                            className="px-3 py-2 border-2 border-black rounded-none focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                        </select>
                                        <select
                                            value={editAssignedTo || ''}
                                            onChange={(e) => setEditAssignedTo(e.target.value)}
                                            className="px-3 py-2 border-2 border-black rounded-none focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="">Unassigned</option>
                                            {workspaceMembers.map(member => (
                                                <option key={member.id} value={member.userId}>
                                                    {member.fullName || member.email}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="date"
                                            value={editDueDate || ''}
                                            onChange={(e) => setEditDueDate(e.target.value)}
                                            className="px-3 py-2 border-2 border-black rounded-none focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-semibold text-black">{selectedTask.text}</h3>
                                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <strong>Priority:</strong> {selectedTask.priority}
                                        </span>
                                        {selectedTask.assignedToName && (
                                            <span className="flex items-center gap-1">
                                                <strong>Assigned to:</strong> {selectedTask.assignedToName}
                                            </span>
                                        )}
                                        {selectedTask.dueDate && (
                                            <span className="flex items-center gap-1">
                                                <strong>Due:</strong> {new Date(selectedTask.dueDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Subtasks Display in View Mode */}
                                    {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                                            <h4 className="font-semibold text-sm mb-2">Subtasks ({selectedTask.subtasks.filter(st => st.completed).length}/{selectedTask.subtasks.length} completed)</h4>
                                            <ul className="space-y-1">
                                                {selectedTask.subtasks.map((subtask, idx) => (
                                                    <li key={idx} className="flex items-center gap-2 text-sm">
                                                        <span className={subtask.completed ? 'text-green-600' : 'text-gray-500'}>
                                                            {subtask.completed ? '✓' : '○'}
                                                        </span>
                                                        <span className={subtask.completed ? 'line-through text-gray-500' : ''}>
                                                            {subtask.text}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Subtask Editor in Edit Mode */}
                        {editingTask && (
                            <div className="border-t-2 border-gray-200 pt-4">
                                <SubtaskManager
                                    subtasks={editSubtasks || []}
                                    onSubtasksChange={setEditSubtasks}
                                />
                            </div>
                        )}

                        {/* Action Buttons */}
                        {canEditSelectedTask && (
                            <div className="flex gap-2 pt-2 border-t-2 border-gray-200">
                                {editingTask ? (
                                    <>
                                        <button
                                            onClick={handleSaveTask}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-none font-semibold hover:bg-blue-700 transition-colors"
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={() => setEditingTask(false)}
                                            className="px-4 py-2 bg-gray-300 text-black rounded-none font-semibold hover:bg-gray-400 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setEditingTask(true)}
                                        className="px-4 py-2 bg-white border-2 border-black text-black rounded-none font-semibold shadow-neo-btn hover:shadow-none transition-all"
                                    >
                                        Edit Task
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Comments Section */}
                        {workspace && user && (
                            <div className="pt-4 border-t-2 border-gray-200">
                                <TaskComments
                                    taskId={selectedTask.id}
                                    taskName={selectedTask.text}
                                    workspaceId={workspace.id}
                                    userId={user.id}
                                    workspaceMembers={workspaceMembers.map(m => ({
                                        id: m.id,
                                        name: m.fullName || m.email || 'Unknown User',
                                        avatar: m.avatarUrl
                                    }))}
                                />
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DashboardTab;