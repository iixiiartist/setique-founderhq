import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, BusinessProfile, SettingsData } from '../types';
import type { QuickLink } from '../types';
import { getAiResponse } from '../services/groqService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWorkspace } from '../contexts/WorkspaceContext';
import KpiCard from './shared/KpiCard';
import TeamActivityFeed from './team/TeamActivityFeed';

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
    onViewAllActivity?: () => void;
}> = ({ data, actions, businessProfile, settings, onViewAllActivity }) => {
    const { workspace } = useWorkspace();
    const [dailyBriefing, setDailyBriefing] = useState<string | null>(null);
    const [isBriefingLoading, setIsBriefingLoading] = useState<boolean>(true);

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

    // Calculate task completion stats for KPI
    const allTasks = useMemo(() => [
        ...data.productsServicesTasks,
        ...data.investorTasks,
        ...data.customerTasks,
        ...data.partnerTasks,
        ...data.marketingTasks,
        ...data.financialTasks,
    ], [data]);

    const completedCount = useMemo(() => 
        allTasks.filter(t => t.status === 'Done').length,
    [allTasks]);

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
                    {/* Task Management Info Card */}
                    <div className="bg-blue-50 p-8 border-2 border-black shadow-neo text-center">
                        <div className="text-6xl mb-4">✅</div>
                        <h2 className="text-2xl font-bold text-black mb-2">Task Management</h2>
                        <p className="text-gray-700 mb-4">
                            Manage all your tasks in the dedicated <span className="font-semibold">Tasks</span> tab.
                        </p>
                        <p className="text-sm text-gray-600">
                            Create, organize, and track tasks across all modules with advanced filtering, bulk operations, and virtualized performance.
                        </p>
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-8">
                    {/* Team Activity Feed */}
                    {workspace && (
                        <TeamActivityFeed 
                            workspaceId={workspace.id}
                            limit={15}
                            showFilters={true}
                            onViewAllActivity={onViewAllActivity}
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

        </div>
    );
};

export default DashboardTab;