import { ChartAttributes } from './tiptap/ChartNode';

export const CHART_TEMPLATES: Record<string, Omit<ChartAttributes, 'data'>> = {
  revenueTrends: {
    chartType: 'line',
    title: 'Revenue Trends',
    dataKeys: ['mrr', 'gmv'],
    xAxisKey: 'date',
    colors: ['#3b82f6', '#10b981'],
    showLegend: true,
    showGrid: true,
    width: 700,
    height: 350,
  },
  expenseBreakdown: {
    chartType: 'pie',
    title: 'Expense Breakdown by Category',
    dataKeys: ['amount'],
    xAxisKey: 'category',
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
    showLegend: true,
    showGrid: false,
    width: 600,
    height: 350,
  },
  salesPipeline: {
    chartType: 'bar',
    title: 'Sales Pipeline',
    dataKeys: ['count'],
    xAxisKey: 'stage',
    colors: ['#3b82f6'],
    showLegend: true,
    showGrid: true,
    width: 700,
    height: 350,
  },
  growthMetrics: {
    chartType: 'area',
    title: 'Growth Metrics',
    dataKeys: ['signups', 'customers', 'revenue'],
    xAxisKey: 'month',
    colors: ['#3b82f6', '#10b981', '#f59e0b'],
    showLegend: true,
    showGrid: true,
    width: 700,
    height: 350,
  },
};

export const applyTemplate = (
  templateName: keyof typeof CHART_TEMPLATES, 
  data: Array<Record<string, string | number>>
): ChartAttributes => {
  return {
    ...CHART_TEMPLATES[templateName],
    data,
  };
};

export const getTemplateNames = () => Object.keys(CHART_TEMPLATES);

export const getTemplateConfig = (templateName: string) => {
  return CHART_TEMPLATES[templateName as keyof typeof CHART_TEMPLATES];
};
