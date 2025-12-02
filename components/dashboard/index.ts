// Components
export { InsightsCarousel, type InsightSlide, type InsightIcon } from './InsightsCarousel';
export { OperatingMetricsGrid, type OperatingMetric } from './OperatingMetricsGrid';
export { PipelineRadar } from './PipelineRadar';
export { QuickLinksCard, QuickLinkItem, type QuickLink } from './QuickLinksCard';

// Hooks - useDashboardMetrics is the primary export, useDashboardData is a backwards-compat alias
export { useDashboardMetrics, useDashboardData, type PipelineData, type MarketingData, type FinancialData } from './useDashboardMetrics';
