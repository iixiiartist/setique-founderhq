import { FinancialLog, Expense, AnyCrmItem, MarketingItem, Task } from '../types';

/**
 * Transform financial logs into chart-ready data
 */
export const getFinancialChartData = (financialLogs: FinancialLog[]) => {
  return financialLogs
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(log => ({
      date: new Date(log.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'UTC' 
      }),
      mrr: log.mrr,
      gmv: log.gmv,
      signups: log.signups,
    }));
};

/**
 * Transform expenses into category breakdown
 */
export const getExpenseChartData = (expenses: Expense[]) => {
  const byCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(byCategory)
    .map(([category, amount]) => ({
      category,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * Transform CRM items into pipeline chart data
 */
export const getPipelineChartData = (crmItems: AnyCrmItem[]): Array<{ stage: string; count: number }> => {
  const byStatus = crmItems.reduce((acc, item) => {
    const status = item.status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(byStatus).map(([stage, count]) => ({
    stage,
    count: count as number,
  }));
};

/**
 * Transform marketing items into chart data
 */
export const getMarketingChartData = (marketing: MarketingItem[]) => {
  const byType = marketing.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(byType).map(([type, count]) => ({
    type,
    count,
  }));
};

/**
 * Transform tasks into completion chart data
 */
export const getTaskCompletionChartData = (tasks: Task[]) => {
  const byStatus = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(byStatus).map(([status, count]) => ({
    status,
    count,
  }));
};

/**
 * Get growth metrics over time (signups, customers, revenue)
 */
export const getGrowthChartData = (
  financialLogs: FinancialLog[],
  crmItems: AnyCrmItem[]
) => {
  const sortedLogs = [...financialLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  return sortedLogs.map(log => {
    // Count customers up to this date
    const customersUpToDate = crmItems.filter(
      item => item.status === 'Closed Won' && 
      new Date(item.createdAt || 0) <= new Date(log.date)
    ).length;
    
    return {
      month: new Date(log.date).toLocaleDateString('en-US', { 
        month: 'short',
        timeZone: 'UTC'
      }),
      signups: log.signups,
      customers: customersUpToDate,
      revenue: log.mrr,
    };
  });
};

/**
 * Get sample chart data for testing
 */
export const getSampleChartData = (chartType: string) => {
  switch (chartType) {
    case 'line':
      return [
        { month: 'Jan', revenue: 50000, expenses: 30000 },
        { month: 'Feb', revenue: 55000, expenses: 32000 },
        { month: 'Mar', revenue: 62000, expenses: 35000 },
        { month: 'Apr', revenue: 68000, expenses: 38000 },
        { month: 'May', revenue: 75000, expenses: 40000 },
        { month: 'Jun', revenue: 82000, expenses: 42000 },
      ];
    case 'bar':
      return [
        { stage: 'Lead', count: 45 },
        { stage: 'Qualified', count: 28 },
        { stage: 'Proposal', count: 15 },
        { stage: 'Negotiation', count: 8 },
        { stage: 'Closed Won', count: 12 },
      ];
    case 'pie':
      return [
        { category: 'Software/SaaS', amount: 15000 },
        { category: 'Marketing', amount: 8000 },
        { category: 'Office', amount: 3000 },
        { category: 'Legal', amount: 2000 },
        { category: 'Contractors', amount: 5000 },
      ];
    case 'area':
      return [
        { month: 'Jan', signups: 120, customers: 45, revenue: 50000 },
        { month: 'Feb', signups: 150, customers: 58, revenue: 55000 },
        { month: 'Mar', signups: 180, customers: 72, revenue: 62000 },
        { month: 'Apr', signups: 210, customers: 88, revenue: 68000 },
        { month: 'May', signups: 245, customers: 105, revenue: 75000 },
      ];
    default:
      return [];
  }
};
