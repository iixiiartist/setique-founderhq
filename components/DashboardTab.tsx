import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, Briefcase, ChevronLeft, ChevronRight, ExternalLink, Megaphone, Newspaper, Wallet } from 'lucide-react';
import { DashboardData, BusinessProfile, SettingsData, AppActions } from '../types';
import { searchWeb } from '../src/lib/services/youSearchService';
import { useWorkspace } from '../contexts/WorkspaceContext';
import TeamActivityFeed from './team/TeamActivityFeed';

const QuickLinkItem: React.FC<{ href: string; text: string; iconChar?: string; iconBg?: string; iconColor?: string }> = ({ href, text, iconChar = '↗', iconBg = '#fff', iconColor = '#000' }) => (
    <li>
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 p-3 bg-gray-100 hover:bg-white border-2 border-black transition-all"
        >
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 border-2 border-black flex items-center justify-center font-mono text-lg"
                    style={{ backgroundColor: iconBg, color: iconColor }}
                >
                    {iconChar}
                </div>
                <span className="font-semibold text-sm sm:text-base">{text}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-600" />
        </a>
    </li>
);

type InsightIcon = 'briefcase' | 'megaphone' | 'wallet' | 'activity' | 'newspaper';

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

const NEWS_CACHE_KEY = 'setique-market-signal';

type CachedMarketSlide = {
    date: string;
    focus: string;
    origin: 'external' | 'fallback';
    slide: InsightSlide;
};

const DashboardTab: React.FC<{ 
    data: DashboardData; 
    actions: AppActions; 
    businessProfile?: BusinessProfile | null;
    settings?: SettingsData;
    onViewAllActivity?: () => void;
}> = ({ data, actions: _actions, businessProfile, settings, onViewAllActivity }) => {
    const { workspace } = useWorkspace();
    const [activeInsightIndex, setActiveInsightIndex] = useState(0);
    const [newsSlide, setNewsSlide] = useState<InsightSlide | null>(null);
    const [isNewsLoading, setIsNewsLoading] = useState(true);
    const [newsError, setNewsError] = useState<string | null>(null);

    const normalizedIndustry = businessProfile?.industry;
    const normalizedTargetMarket = (businessProfile as any)?.target_market ?? businessProfile?.targetMarket;

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

    const fallbackMarketSlide = useMemo<InsightSlide | null>(() => {
        const priorityDeal = pipelineData.topDeals?.[0];
        if (priorityDeal) {
            const dealValue = priorityDeal.totalValue ?? priorityDeal.value ?? 0;
            return {
                id: 'internal-focus-deal',
                label: 'Execution focus',
                title: priorityDeal.title || 'Priority opportunity',
                metric: dealValue ? formatCurrency(dealValue) : 'Deal value',
                metricHint: priorityDeal.probability ? `${priorityDeal.probability}% win chance` : undefined,
                detail: priorityDeal.expectedCloseDate
                    ? `Target close ${formatRelativeDate(priorityDeal.expectedCloseDate)}.`
                    : 'Drive next steps to keep the deal warm.',
                metaLabel: 'Owner',
                metaValue: priorityDeal.assignedToName || 'Unassigned',
                accent: 'text-indigo-600',
                icon: 'activity',
            };
        }

        if (marketingData.upcomingCampaign) {
            const campaign = marketingData.upcomingCampaign;
            return {
                id: 'internal-upcoming-campaign',
                label: 'Upcoming launch',
                title: campaign.title || 'Scheduled campaign',
                metric: formatRelativeDate(campaign.dueDate),
                metricHint: campaign.status,
                detail: campaign.goals || 'Align assets and approvals before launch.',
                metaLabel: 'Channels',
                metaValue: (campaign.channels && campaign.channels.length > 0)
                    ? campaign.channels.join(', ')
                    : 'Multichannel',
                accent: 'text-orange-600',
                icon: 'megaphone',
            };
        }

        return null;
    }, [formatCurrency, formatRelativeDate, marketingData, pipelineData]);

    useEffect(() => {
        let cancelled = false;
        const focus = normalizedIndustry || normalizedTargetMarket || 'startup founders';
        const today = new Date().toISOString().split('T')[0];

        const hydrateFromCache = () => {
            try {
                const cachedRaw = localStorage.getItem(NEWS_CACHE_KEY);
                if (!cachedRaw) return false;
                const cached: CachedMarketSlide = JSON.parse(cachedRaw);
                const cacheMatchesContext = cached?.date === today && cached?.focus === focus && cached?.slide;
                const cacheIsTrusted = cached?.origin === 'external';
                const cachedHref = cached?.slide?.action?.href;
                const hasSafeLink = !cachedHref || isTrustedExternalUrl(cachedHref);
                if (cacheMatchesContext && cacheIsTrusted && hasSafeLink) {
                    setNewsSlide(cached.slide);
                    setNewsError(null);
                    setIsNewsLoading(false);
                    return true;
                }
                localStorage.removeItem(NEWS_CACHE_KEY);
            } catch (error) {
                console.warn('[DashboardTab] Unable to read market intel cache', error);
            }
            return false;
        };

        const applyFallbackSlide = () => {
            if (fallbackMarketSlide) {
                setNewsSlide({ ...fallbackMarketSlide, id: `${fallbackMarketSlide.id}-fallback` });
                setNewsError(null);
            } else {
                setNewsSlide(null);
                setNewsError('Connect the market intel integration to surface live headlines.');
            }
            try {
                localStorage.removeItem(NEWS_CACHE_KEY);
            } catch (storageError) {
                console.warn('[DashboardTab] Unable to clear market intel cache', storageError);
            }
        };

        const fetchMarketNews = async () => {
            setIsNewsLoading(true);
            setNewsError(null);
            try {
                const query = `latest ${focus} market move for startup operators`;
                let results: Awaited<ReturnType<typeof searchWeb>> | null = null;
                let usedMode: 'news' | 'search' = 'news';

                try {
                    results = await searchWeb(query, 'news');
                } catch (newsError) {
                    console.warn('[DashboardTab] News mode failed, retrying with general search', newsError);
                    usedMode = 'search';
                    results = await searchWeb(query, 'search', { count: 5 });
                }

                if (!results) {
                    throw new Error('No market intel results returned');
                }

                let isMockNews = results.metadata?.provider === 'mock';
                let article = !isMockNews ? (results.news?.[0] ?? results.hits?.[0]) : undefined;

                if (!article && usedMode === 'news' && !isMockNews) {
                    console.warn('[DashboardTab] No headlines returned from news mode, falling back to general search results');
                    usedMode = 'search';
                    results = await searchWeb(query, 'search', { count: 5 });
                    isMockNews = results.metadata?.provider === 'mock';
                    article = !isMockNews ? (results.news?.[0] ?? results.hits?.[0]) : undefined;
                }

                const articleUrl = article && isTrustedExternalUrl(article.url) ? article.url : undefined;

                if (!cancelled) {
                    if (article) {
                        const slide: InsightSlide = {
                            id: 'news',
                            label: 'Market signal',
                            title: article.title,
                            metric: 'Live intel',
                            detail: article.description || 'Fresh market movement to monitor.',
                            metaLabel: 'Source',
                            metaValue: getDomainFromUrl(article.url) || 'External',
                            accent: 'text-indigo-600',
                            icon: 'newspaper',
                            action: articleUrl ? { label: 'Read briefing', href: articleUrl } : undefined,
                        };
                        setNewsSlide(slide);
                        if (articleUrl) {
                            try {
                                const cached: CachedMarketSlide = { date: today, focus, slide, origin: 'external' };
                                localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(cached));
                            } catch (storageError) {
                                console.warn('[DashboardTab] Unable to cache market intel slide', storageError);
                            }
                        } else {
                            try {
                                localStorage.removeItem(NEWS_CACHE_KEY);
                            } catch (storageError) {
                                console.warn('[DashboardTab] Unable to clear market intel cache', storageError);
                            }
                        }
                    } else {
                        if (isMockNews) {
                            console.info('[DashboardTab] Mock market intel detected; falling back to internal insight.');
                        }
                        applyFallbackSlide();
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn('[DashboardTab] Market intel fetch failed', error);
                    applyFallbackSlide();
                }
            } finally {
                if (!cancelled) {
                    setIsNewsLoading(false);
                }
            }
        };

        if (!hydrateFromCache()) {
            fetchMarketNews();
        }

        return () => {
            cancelled = true;
        };
    }, [normalizedIndustry, normalizedTargetMarket, getDomainFromUrl, fallbackMarketSlide, isTrustedExternalUrl]);

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

        if (newsSlide) {
            slides.push(newsSlide);
        } else if (isNewsLoading) {
            slides.push({
                id: 'news-loading',
                label: 'Market signal',
                title: 'Syncing live intel…',
                metric: '•••',
                detail: 'Pulling today’s most relevant headline.',
                accent: 'text-gray-500',
                icon: 'newspaper',
            });
        } else if (newsError) {
            slides.push({
                id: 'news-empty',
                label: 'Market signal',
                title: 'No live story yet',
                metric: '—',
                detail: newsError,
                accent: 'text-gray-500',
                icon: 'newspaper',
            });
        }

        return slides;
    }, [formatCurrency, formatRelativeDate, marketingData, newsError, newsSlide, pipelineData, financialData, isNewsLoading]);

    useEffect(() => {
        if (insightSlides.length === 0) {
            setActiveInsightIndex(0);
            return;
        }

        if (activeInsightIndex > insightSlides.length - 1) {
            setActiveInsightIndex(0);
        }
    }, [activeInsightIndex, insightSlides.length]);

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
            case 'newspaper':
            default:
                return <Newspaper className="w-6 h-6" />;
        }
    };

    return (
        <div>
            <div className="bg-white border-2 border-black shadow-neo mb-8">
                <div className="bg-black text-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="font-mono text-xl font-bold tracking-wider">OPERATIONAL INTEL</div>
                        <div className="hidden sm:block h-4 w-[1px] bg-gray-600"></div>
                        <div className="text-xs font-mono text-gray-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div>
                    </div>
                    <div className="text-xs font-mono text-gray-400">Updated live from your workspace</div>
                </div>

                <div className="relative overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-4">
                        <button
                            className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition disabled:opacity-40"
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
                                    className={`h-1 w-8 ${idx === activeInsightIndex ? 'bg-black' : 'bg-gray-300'}`}
                                />
                            ))}
                        </div>
                        <button
                            className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition disabled:opacity-40"
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
                                    <div className={`p-4 border-2 border-black bg-white shadow-neo ${slide.accent}`}>
                                        {renderSlideIcon(slide.icon)}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs uppercase font-mono tracking-widest text-gray-500">{slide.label}</p>
                                        <h3 className="text-2xl font-bold text-black">{slide.title}</h3>
                                        <div className="flex items-baseline gap-3 flex-wrap">
                                            <span className={`text-4xl font-mono ${slide.accent}`}>{slide.metric}</span>
                                            {slide.metricHint && (
                                                <span className="text-sm font-semibold text-gray-600">{slide.metricHint}</span>
                                            )}
                                        </div>
                                        <p className="text-gray-700 text-sm md:text-base">{slide.detail}</p>
                                        {(slide.metaLabel || slide.action) && (
                                            <div className="flex flex-wrap gap-4 text-sm font-semibold">
                                                {slide.metaLabel && (
                                                    <span className="uppercase font-mono text-gray-500">
                                                        {slide.metaLabel}: <span className="text-black">{slide.metaValue}</span>
                                                    </span>
                                                )}
                                                {slide.action && (
                                                    <a
                                                        href={slide.action.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-black border-b-2 border-black hover:bg-black hover:text-white transition px-2"
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
                    <div className="bg-white border-2 border-black shadow-neo p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-xs uppercase font-mono text-gray-500">Operating snapshot</p>
                                <h2 className="text-2xl font-bold text-black">Where attention drives impact</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {operatingMetrics.map((metric) => (
                                <div key={metric.label} className="border-2 border-black p-4 bg-gray-50">
                                    <p className="text-xs font-mono uppercase text-gray-500">{metric.label}</p>
                                    <p className="text-2xl font-bold text-black mt-1">{metric.primary}</p>
                                    {metric.secondary && <p className="text-sm text-gray-600 mt-1">{metric.secondary}</p>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border-2 border-black shadow-neo p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs uppercase font-mono text-gray-500">Pipeline radar</p>
                                <h2 className="text-xl font-bold text-black">Top opportunities on deck</h2>
                            </div>
                            <span className="text-sm font-semibold text-gray-600">{pipelineData.openDealsCount} active</span>
                        </div>
                        {pipelineData.topDeals.length > 0 ? (
                            <div className="space-y-4">
                                {pipelineData.topDeals.map((deal) => (
                                    <div key={deal.id} className="border-2 border-dashed border-gray-300 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <p className="text-lg font-semibold text-black">{deal.title}</p>
                                            <p className="text-sm text-gray-600">Stage: {deal.stage.replace('_', ' ')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-mono text-blue-600">{formatCurrency(deal.totalValue ?? deal.value ?? 0)}</p>
                                            <p className="text-xs font-mono text-gray-500">Prob: {deal.probability ?? 0}%</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-gray-300 p-6 text-center text-gray-500 font-semibold">
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
                            className="shadow-neo"
                        />
                    )}

                    {settings?.quickLinks && settings.quickLinks.length > 0 && (
                        <div className="bg-white p-6 border-2 border-black shadow-neo">
                            <h2 className="text-xl font-semibold text-black mb-4">Quick Links</h2>
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