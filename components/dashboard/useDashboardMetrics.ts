import { useMemo, useCallback } from 'react';
import { DashboardData } from '../../types';

export interface PipelineData {
    openDealsCount: number;
    openValue: number;
    highProbabilityCount: number;
    averageProbability: number;
    nextCloseDeal: DashboardData['deals'][0] | null;
    topDeals: DashboardData['deals'];
}

export interface MarketingData {
    activeCount: number;
    plannedCount: number;
    overdueCount: number;
    upcomingCampaign: DashboardData['marketing'][0] | undefined;
}

export interface FinancialData {
    latest: DashboardData['financials'][0] | undefined;
    previous: DashboardData['financials'][0] | undefined;
    mrrDelta: number;
    gmvDelta: number;
}

/**
 * useDashboardMetrics
 * 
 * Transforms raw DashboardData into computed presentation values for the dashboard.
 * This hook handles:
 * - Pipeline metrics (open deals, values, probabilities)
 * - Marketing metrics (campaign counts, upcoming campaigns)
 * - Financial metrics (MRR/GMV deltas)
 * - Date and currency formatting utilities
 * 
 * Note: This hook was renamed from useDashboardData to avoid naming collision
 * with hooks/useDashboardData.ts which handles data fetching/persistence.
 */
export const useDashboardMetrics = (data: DashboardData) => {
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

    const formatDistanceToNow = useCallback((date: Date): string => {
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
    }, []);

    const pipelineData = useMemo<PipelineData>(() => {
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

    const marketingData = useMemo<MarketingData>(() => {
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

    const financialData = useMemo<FinancialData>(() => {
        const logs = [...(data.financials || [])].sort((a, b) => b.date.localeCompare(a.date));
        const latest = logs[0];
        const previous = logs[1];
        const mrrDelta = latest && previous && previous.mrr
            ? ((latest.mrr - previous.mrr) / previous.mrr) * 100
            : 0;
        const gmvDelta = latest && previous ? latest.gmv - previous.gmv : 0;

        return { latest, previous, mrrDelta, gmvDelta };
    }, [data.financials]);

    return {
        pipelineData,
        marketingData,
        financialData,
        formatCurrency,
        formatRelativeDate,
        formatDistanceToNow,
    };
};

// Backwards compatibility alias - allows existing consumers to keep using useDashboardData
export const useDashboardData = useDashboardMetrics;
