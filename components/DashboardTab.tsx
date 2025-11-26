import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, Briefcase, ChevronLeft, ChevronRight, ExternalLink, Mail, Megaphone, Wallet } from 'lucide-react';
import { DashboardData, BusinessProfile, SettingsData, AppActions } from '../types';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import TeamActivityFeed from './team/TeamActivityFeed';

const QuickLinkItem: React.FC<{ href: string; text: string; iconChar?: string; iconBg?: string; iconColor?: string }> = ({ href, text, iconChar = '↗', iconBg = '#fff', iconColor = '#000' }) => (
    <li>
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 p-3 bg-gray-50 hover:bg-white border border-gray-200 rounded-lg transition-all shadow-sm"
        >
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: iconBg, color: iconColor }}
                >
                    {iconChar}
                </div>
                <span className="font-medium text-sm sm:text-base text-gray-900">{text}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
        </a>
    </li>
);

type InsightIcon = 'briefcase' | 'megaphone' | 'wallet' | 'activity' | 'mail';

type InsightSlide = {
    id: string;
    label: string;
    title: string;
    metric: string;
    metricHint?: string;
    detail: string;
    metaLabel?: string;
    metaValue?: string;
    accent: string;
    icon: InsightIcon;
    action?: {
        label: string;
        href: string;
    };
};

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
    const [hasEmailConnected, setHasEmailConnected] = useState(false);

    const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }), []);

    const formatCurrency = useCallback((value: number) => {
        if (!Number.isFinite(value)) return '--';
        return currencyFormatter.format(Math.round(value));
    }, [currencyFormatter]);

    const formatRelativeDate = useCallback((iso?: string) => {
        if (!iso) return 'Not scheduled';
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return 'Not scheduled';
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        if (diffDays > 1 && diffDays <= 14) return `In ${diffDays}d`;
        if (diffDays < -1 && diffDays >= -14) return `${Math.abs(diffDays)}d ago`;

        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }, []);

    const getDomainFromUrl = useCallback((url?: string) => {
        if (!url) return '';
        try {
            const domain = new URL(url).hostname;
            return domain.replace(/^www\./i, '');
        } catch (error) {
            return '';
        }
    }, []);

    const isTrustedExternalUrl = useCallback((url?: string) => {
        if (!url) return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch (error) {
            return false;
        }
    }, []);

    const pipelineData = useMemo(() => {
        const openDeals = (data.deals || []).filter(deal => deal.stage !== 'closed_won' && deal.stage !== 'closed_lost');
        const openValue = openDeals.reduce((sum, deal) => sum + (deal.totalValue ?? deal.value ?? 0), 0);
        const highProbabilityCount = openDeals.filter(deal => (deal.probability ?? 0) >= 60).length;
        const averageProbability = openDeals.length > 0
            ? Math.round(openDeals.reduce((sum, deal) => sum + (deal.probability ?? 0), 0) / openDeals.length)
            : 0;
        const nextCloseDeal = [...openDeals]
            .filter(deal => !!deal.expectedCloseDate)
            .sort((a, b) => new Date(a.expectedCloseDate || '').getTime() - new Date(b.expectedCloseDate || '').getTime())[0] || null;
        const topDeals = [...openDeals]
            .sort((a, b) => (b.totalValue ?? b.value ?? 0) - (a.totalValue ?? a.value ?? 0))
            .slice(0, 3);

        return {
            openDealsCount: openDeals.length,
            openValue,
            highProbabilityCount,
            averageProbability,
            nextCloseDeal,
            topDeals,
        };
    }, [data.deals]);

    const marketingData = useMemo(() => {
        const campaigns = data.marketing || [];
        const activeCampaigns = campaigns.filter(item => ['In Progress', 'Published'].includes(item.status));
        const plannedCampaigns = campaigns.filter(item => item.status === 'Planned');
        const now = Date.now();
        const upcomingCampaign = [...campaigns]
            .filter(item => item.dueDate && new Date(item.dueDate).getTime() >= now)
            .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())[0];
        const overdueCampaigns = campaigns.filter(item => item.dueDate && new Date(item.dueDate).getTime() < now);

        return {
            activeCount: activeCampaigns.length,
            plannedCount: plannedCampaigns.length,
            overdueCount: overdueCampaigns.length,
            upcomingCampaign,
        };
    }, [data.marketing]);

    const financialData = useMemo(() => {
        const logs = [...(data.financials || [])].sort((a, b) => b.date.localeCompare(a.date));
        const latest = logs[0];
        const previous = logs[1];
        const mrrDelta = latest && previous && previous.mrr
            ? ((latest.mrr - previous.mrr) / previous.mrr) * 100
            : 0;
        const gmvDelta = latest && previous ? latest.gmv - previous.gmv : 0;

        return { latest, previous, mrrDelta, gmvDelta };
    }, [data.financials]);

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
                // First check if user has a connected email account
                const { data: account, error: accountError } = await supabase
                    .from('integrated_accounts')
                    .select('id, email_address, status')
                    .eq('workspace_id', workspace.id)
                    .eq('user_id', user.id)
                    .eq('provider', 'gmail')
                    .eq('status', 'active')
                    .maybeSingle();

                if (accountError) {
                    console.warn('[DashboardTab] Error checking email account:', accountError);
                }

                if (!account) {
                    // No connected email account
                    if (!cancelled) {
                        setHasEmailConnected(false);
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

                setHasEmailConnected(true);

                // Fetch the most recent email
                const { data: emails, error: emailError } = await supabase
                    .from('email_messages')
                    .select('id, subject, snippet, from_address, received_at, is_read')
                    .eq('account_id', account.id)
                    .order('received_at', { ascending: false })
                    .limit(1);

                if (emailError) {
                    console.warn('[DashboardTab] Error fetching emails:', emailError);
                }

                if (!cancelled) {
                    if (emails && emails.length > 0) {
                        const latestEmail = emails[0] as EmailSpotlightMessage;
                        const fromName = latestEmail.from_address?.split('<')[0]?.trim() || latestEmail.from_address || 'Unknown sender';
                        const timeAgo = latestEmail.received_at
                            ? formatDistanceToNow(new Date(latestEmail.received_at))
                            : 'Recently';

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
                        // Connected but no emails
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

        return () => {
            cancelled = true;
        };
    }, [workspace?.id, user?.id]);

    // Helper function for relative time formatting
    const formatDistanceToNow = (date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const insightSlides = useMemo(() => {
        const slides: InsightSlide[] = [];

        slides.push({
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
        });

        slides.push({
            id: 'marketing',
            label: 'Marketing momentum',
            title: marketingData.activeCount > 0 ? 'Campaigns live' : 'Warm up the audience',
            metric: `${marketingData.activeCount} active`,
            metricHint: marketingData.overdueCount > 0
                ? `${marketingData.overdueCount} overdue touches`
                : `${marketingData.plannedCount} queued next`,
            detail: marketingData.upcomingCampaign
                ? `Next launch "${marketingData.upcomingCampaign.title}" ${formatRelativeDate(marketingData.upcomingCampaign.dueDate)}.`
                : 'No launch scheduled — plan the next push.',
            metaLabel: 'Next launch',
            metaValue: formatRelativeDate(marketingData.upcomingCampaign?.dueDate),
            accent: 'text-orange-600',
            icon: 'megaphone',
        });

        slides.push({
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
        });

        // Email spotlight slide
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
            // No email connected - show empty state
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

    const handleSlideChange = useCallback((direction: 'prev' | 'next') => {
        setActiveInsightIndex((prev) => {
            if (insightSlides.length === 0) return 0;
            const nextIndex = direction === 'next'
                ? (prev + 1) % insightSlides.length
                : (prev - 1 + insightSlides.length) % insightSlides.length;
            return nextIndex;
        });
    }, [insightSlides.length]);

    const operatingMetrics = useMemo(() => ([
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
    ]), [financialData, formatCurrency, formatRelativeDate, marketingData, pipelineData]);

    const renderSlideIcon = (icon: InsightIcon) => {
        switch (icon) {
            case 'briefcase':
                return <Briefcase className="w-6 h-6" />;
            case 'megaphone':
                return <Megaphone className="w-6 h-6" />;
            case 'wallet':
                return <Wallet className="w-6 h-6" />;
            case 'activity':
                return <Activity className="w-6 h-6" />;
            case 'mail':
            default:
                return <Mail className="w-6 h-6" />;
        }
    };

    return (
        <div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
                <div className="bg-black text-white p-4 rounded-t-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="text-xl font-bold tracking-wide">OPERATIONAL INTEL</div>
                        <div className="hidden sm:block h-4 w-[1px] bg-gray-600"></div>
                        <div className="text-xs text-gray-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div>
                    </div>
                    <div className="text-xs text-gray-400">Updated live from your workspace</div>
                </div>

                <div className="relative overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-4">
                        <button
                            className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-black hover:text-white transition disabled:opacity-40"
                            onClick={() => handleSlideChange('prev')}
                            disabled={insightSlides.length <= 1}
                            aria-label="Previous insight"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex gap-2">
                            {insightSlides.map((slide, idx) => (
                                <span
                                    key={slide.id}
                                    className={`h-1 w-8 rounded-full ${idx === activeInsightIndex ? 'bg-black' : 'bg-gray-200'}`}
                                />
                            ))}
                        </div>
                        <button
                            className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-black hover:text-white transition disabled:opacity-40"
                            onClick={() => handleSlideChange('next')}
                            disabled={insightSlides.length <= 1}
                            aria-label="Next insight"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="overflow-hidden">
                        <div
                            className="flex transition-transform duration-500"
                            style={{ transform: `translateX(-${activeInsightIndex * 100}%)` }}
                        >
                            {insightSlides.map((slide) => (
                                <div key={slide.id} className="w-full flex-shrink-0 p-6 grid gap-4 md:grid-cols-[auto,1fr] items-center">
                                    <div className={`p-4 border border-gray-200 rounded-xl bg-white shadow-sm ${slide.accent}`}>
                                        {renderSlideIcon(slide.icon)}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-widest text-gray-500">{slide.label}</p>
                                        <h3 className="text-2xl font-bold text-gray-900">{slide.title}</h3>
                                        <div className="flex items-baseline gap-3 flex-wrap">
                                            <span className={`text-4xl font-bold ${slide.accent}`}>{slide.metric}</span>
                                            {slide.metricHint && (
                                                <span className="text-sm font-medium text-gray-600">{slide.metricHint}</span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 text-sm md:text-base">{slide.detail}</p>
                                        {(slide.metaLabel || slide.action) && (
                                            <div className="flex flex-wrap gap-4 text-sm font-medium">
                                                {slide.metaLabel && (
                                                    <span className="uppercase text-gray-500">
                                                        {slide.metaLabel}: <span className="text-gray-900">{slide.metaValue}</span>
                                                    </span>
                                                )}
                                                {slide.action && (
                                                    <a
                                                        href={slide.action.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-gray-900 border-b border-gray-900 hover:bg-black hover:text-white transition px-2 rounded"
                                                    >
                                                        {slide.action.label}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-xs uppercase text-gray-500">Operating snapshot</p>
                                <h2 className="text-2xl font-bold text-gray-900">Where attention drives impact</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {operatingMetrics.map((metric) => (
                                <div key={metric.label} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                                    <p className="text-xs uppercase text-gray-500">{metric.label}</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{metric.primary}</p>
                                    {metric.secondary && <p className="text-sm text-gray-500 mt-1">{metric.secondary}</p>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs uppercase text-gray-500">Pipeline radar</p>
                                <h2 className="text-xl font-bold text-gray-900">Top opportunities on deck</h2>
                            </div>
                            <span className="text-sm font-medium text-gray-500">{pipelineData.openDealsCount} active</span>
                        </div>
                        {pipelineData.topDeals.length > 0 ? (
                            <div className="space-y-4">
                                {pipelineData.topDeals.map((deal) => (
                                    <div key={deal.id} className="border border-dashed border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900">{deal.title}</p>
                                            <p className="text-sm text-gray-500">Stage: {deal.stage.replace('_', ' ')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(deal.totalValue ?? deal.value ?? 0)}</p>
                                            <p className="text-xs text-gray-500">Prob: {deal.probability ?? 0}%</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500 font-medium">
                                No open deals yet — log your next opportunity to populate this radar.
                            </div>
                        )}
                    </div>
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

                    {settings?.quickLinks && settings.quickLinks.length > 0 && (
                        <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
                            <ul className="space-y-3">
                                {settings.quickLinks.map((link) => (
                                    <QuickLinkItem 
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
