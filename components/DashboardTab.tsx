import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardData, BusinessProfile, SettingsData, AppActions } from '../types';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import TeamActivityFeed from './team/TeamActivityFeed';
import {
    InsightsCarousel,
    InsightSlide,
    OperatingMetricsGrid,
    OperatingMetric,
    PipelineRadar,
    QuickLinksCard,
    useDashboardData
} from './dashboard';

// Email message type for the spotlight
interface EmailSpotlightMessage {
    id: string;
    subject: string | null;
    snippet: string | null;
    from_address: string | null;
    received_at: string | null;
    is_read: boolean;
}

const DashboardTab: React.FC<{
    data: DashboardData;
    actions: AppActions;
    businessProfile?: BusinessProfile | null;
    settings?: SettingsData;
    onViewAllActivity?: () => void;
}> = ({ data, actions: _actions, businessProfile, settings, onViewAllActivity }) => {
    const { workspace } = useWorkspace();
    const { user } = useAuth();
    const [activeInsightIndex, setActiveInsightIndex] = useState(0);

    // Email spotlight state
    const [emailSlide, setEmailSlide] = useState<InsightSlide | null>(null);
    const [isEmailLoading, setIsEmailLoading] = useState(true);

    // Use custom hook for data processing
    const {
        pipelineData,
        marketingData,
        financialData,
        formatCurrency,
        formatRelativeDate,
        formatDistanceToNow
    } = useDashboardData(data);

    // Fetch email spotlight data
    useEffect(() => {
        let cancelled = false;

        const fetchEmailSpotlight = async () => {
            if (!workspace?.id || !user?.id) {
                setIsEmailLoading(false);
                return;
            }

            setIsEmailLoading(true);

            try {
                const { data: account, error: accountError } = await supabase
                    .from('integrated_accounts')
                    .select('id, email_address, status')
                    .eq('workspace_id', workspace.id)
                    .eq('user_id', user.id)
                    .eq('provider', 'gmail')
                    .eq('status', 'active')
                    .maybeSingle();

                if (accountError) console.warn('[DashboardTab] Error checking email account:', accountError);

                if (!account) {
                    if (!cancelled) {
                        setEmailSlide({
                            id: 'email-not-connected',
                            label: 'Email spotlight',
                            title: 'Connect your inbox',
                            metric: 'Not linked',
                            detail: 'Link your Gmail in Settings to see your latest emails here.',
                            metaLabel: 'Action',
                            metaValue: 'Go to Settings → Integrations',
                            accent: 'text-gray-500',
                            icon: 'mail',
                        });
                        setIsEmailLoading(false);
                    }
                    return;
                }

                const { data: emails, error: emailError } = await supabase
                    .from('email_messages')
                    .select('id, subject, snippet, from_address, received_at, is_read')
                    .eq('account_id', account.id)
                    .order('received_at', { ascending: false })
                    .limit(1);

                if (emailError) console.warn('[DashboardTab] Error fetching emails:', emailError);

                if (!cancelled) {
                    if (emails && emails.length > 0) {
                        const latestEmail = emails[0] as EmailSpotlightMessage;
                        const fromName = latestEmail.from_address?.split('<')[0]?.trim() || latestEmail.from_address || 'Unknown sender';
                        const timeAgo = latestEmail.received_at ? formatDistanceToNow(new Date(latestEmail.received_at)) : 'Recently';

                        setEmailSlide({
                            id: 'email-latest',
                            label: 'Email spotlight',
                            title: latestEmail.subject || '(No subject)',
                            metric: latestEmail.is_read ? 'Read' : 'Unread',
                            metricHint: timeAgo,
                            detail: latestEmail.snippet || 'No preview available.',
                            metaLabel: 'From',
                            metaValue: fromName,
                            accent: latestEmail.is_read ? 'text-gray-600' : 'text-blue-600',
                            icon: 'mail',
                        });
                    } else {
                        setEmailSlide({
                            id: 'email-empty',
                            label: 'Email spotlight',
                            title: 'Inbox empty',
                            metric: 'No emails',
                            detail: 'Your synced inbox is empty. New emails will appear here.',
                            metaLabel: 'Account',
                            metaValue: account.email_address || 'Connected',
                            accent: 'text-gray-500',
                            icon: 'mail',
                        });
                    }
                    setIsEmailLoading(false);
                }
            } catch (error) {
                console.warn('[DashboardTab] Email spotlight fetch failed:', error);
                if (!cancelled) {
                    setEmailSlide({
                        id: 'email-error',
                        label: 'Email spotlight',
                        title: 'Unable to load emails',
                        metric: 'Error',
                        detail: 'There was an issue loading your emails. Try refreshing the page.',
                        accent: 'text-gray-500',
                        icon: 'mail',
                    });
                    setIsEmailLoading(false);
                }
            }
        };

        fetchEmailSpotlight();
        return () => { cancelled = true; };
    }, [workspace?.id, user?.id, formatDistanceToNow]);

    // Build insight slides
    const insightSlides = useMemo<InsightSlide[]>(() => {
        const slides: InsightSlide[] = [
            {
                id: 'pipeline',
                label: 'Pipeline outlook',
                title: pipelineData.openDealsCount > 0 ? 'Active deal flow' : 'Seed the next wave',
                metric: pipelineData.openDealsCount > 0 ? formatCurrency(pipelineData.openValue) : 'No open deals',
                metricHint: pipelineData.openDealsCount > 0 ? `${pipelineData.openDealsCount} open opportunities` : 'Log your next target',
                detail: pipelineData.highProbabilityCount > 0
                    ? `${pipelineData.highProbabilityCount} deals are already ≥60% confidence.`
                    : 'No high-confidence deals yet — nurture top prospects.',
                metaLabel: 'Next close',
                metaValue: pipelineData.openDealsCount > 0 ? formatRelativeDate(pipelineData.nextCloseDeal?.expectedCloseDate) : 'Not scheduled',
                accent: 'text-blue-600',
                icon: 'briefcase',
            },
            {
                id: 'marketing',
                label: 'Marketing momentum',
                title: marketingData.activeCount > 0 ? 'Campaigns live' : 'Warm up the audience',
                metric: `${marketingData.activeCount} active`,
                metricHint: marketingData.overdueCount > 0 ? `${marketingData.overdueCount} overdue touches` : `${marketingData.plannedCount} queued next`,
                detail: marketingData.upcomingCampaign
                    ? `Next launch "${marketingData.upcomingCampaign.title}" ${formatRelativeDate(marketingData.upcomingCampaign.dueDate)}.`
                    : 'No launch scheduled — plan the next push.',
                metaLabel: 'Next launch',
                metaValue: formatRelativeDate(marketingData.upcomingCampaign?.dueDate),
                accent: 'text-orange-600',
                icon: 'megaphone',
            },
            {
                id: 'financial',
                label: 'Revenue pulse',
                title: financialData.latest ? 'MRR pace' : 'Log new revenue',
                metric: financialData.latest ? formatCurrency(financialData.latest.mrr) : 'No data',
                metricHint: financialData.latest ? `${financialData.latest.signups} signups` : 'Track growth daily',
                detail: financialData.mrrDelta
                    ? `${financialData.mrrDelta > 0 ? 'Up' : 'Down'} ${Math.abs(financialData.mrrDelta).toFixed(1)}% vs last log.`
                    : 'Log another update to watch momentum.',
                metaLabel: 'GMV delta',
                metaValue: financialData.gmvDelta ? `${financialData.gmvDelta > 0 ? '+' : ''}${formatCurrency(Math.abs(financialData.gmvDelta))}` : 'Flat',
                accent: 'text-emerald-600',
                icon: 'wallet',
            },
        ];

        // Email slide
        if (emailSlide) {
            slides.push(emailSlide);
        } else if (isEmailLoading) {
            slides.push({
                id: 'email-loading',
                label: 'Email spotlight',
                title: 'Checking inbox...',
                metric: '...',
                detail: 'Loading your latest email.',
                accent: 'text-gray-500',
                icon: 'mail',
            });
        } else {
            slides.push({
                id: 'email-empty',
                label: 'Email spotlight',
                title: 'Connect your inbox',
                metric: 'No email linked',
                metricHint: 'Stay on top of messages',
                detail: 'Link your Gmail or Outlook in Settings → Integrations to see your latest messages here.',
                metaLabel: 'Quick setup',
                metaValue: 'Settings → Integrations',
                accent: 'text-purple-600',
                icon: 'mail',
            });
        }

        return slides;
    }, [emailSlide, isEmailLoading, financialData, formatCurrency, formatRelativeDate, marketingData, pipelineData]);

    // Slide navigation handler
    const handleSlideChange = useCallback((direction: 'prev' | 'next') => {
        setActiveInsightIndex((prev) => {
            if (insightSlides.length === 0) return 0;
            return direction === 'next'
                ? (prev + 1) % insightSlides.length
                : (prev - 1 + insightSlides.length) % insightSlides.length;
        });
    }, [insightSlides.length]);

    // Operating metrics
    const operatingMetrics = useMemo<OperatingMetric[]>(() => [
        {
            label: 'Pipeline value',
            primary: pipelineData.openDealsCount > 0 ? formatCurrency(pipelineData.openValue) : 'Log a deal',
            secondary: pipelineData.openDealsCount > 0 ? `${pipelineData.openDealsCount} open` : 'No active pipeline',
        },
        {
            label: 'High-confidence deals',
            primary: `${pipelineData.highProbabilityCount}`,
            secondary: '≥60% probability',
        },
        {
            label: 'Avg. deal probability',
            primary: pipelineData.averageProbability ? `${pipelineData.averageProbability}%` : '0%',
            secondary: 'Weighted across pipeline',
        },
        {
            label: 'Active campaigns',
            primary: `${marketingData.activeCount}`,
            secondary: marketingData.plannedCount > 0 ? `${marketingData.plannedCount} queued next` : 'Plan the next push',
        },
        {
            label: 'Next launch',
            primary: formatRelativeDate(marketingData.upcomingCampaign?.dueDate),
            secondary: marketingData.upcomingCampaign?.title ?? 'No campaign scheduled',
        },
        {
            label: 'Monthly recurring revenue',
            primary: financialData.latest ? formatCurrency(financialData.latest.mrr) : 'Add a log',
            secondary: financialData.mrrDelta
                ? `${financialData.mrrDelta > 0 ? '+' : ''}${financialData.mrrDelta.toFixed(1)}% vs last entry`
                : 'Track at least twice monthly',
        },
    ], [financialData, formatCurrency, formatRelativeDate, marketingData, pipelineData]);

    return (
        <div>
            <InsightsCarousel
                slides={insightSlides}
                activeIndex={activeInsightIndex}
                onSlideChange={handleSlideChange}
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <OperatingMetricsGrid metrics={operatingMetrics} />
                    <PipelineRadar
                        topDeals={pipelineData.topDeals}
                        openDealsCount={pipelineData.openDealsCount}
                        formatCurrency={formatCurrency}
                    />
                </div>

                <div className="space-y-6">
                    {workspace && (
                        <TeamActivityFeed
                            workspaceId={workspace.id}
                            limit={12}
                            showFilters={false}
                            onViewAllActivity={onViewAllActivity}
                            className="shadow-sm"
                        />
                    )}
                    {settings?.quickLinks && <QuickLinksCard links={settings.quickLinks} />}
                </div>
            </div>
        </div>
    );
};

export default DashboardTab;
