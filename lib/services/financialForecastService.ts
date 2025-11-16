/**
 * Financial Forecasting Service
 * 
 * Provides financial forecasting capabilities including:
 * - Cash runway calculation
 * - Revenue prediction
 * - Cash flow forecasting
 * - Burn rate analysis
 */

import { supabase } from '../supabase';
import { logger } from '../logger';

export interface RunwayData {
  currentCash: number;
  monthlyBurnRate: number;
  runwayMonths: number;
  runoutDate: Date;
  recommendations: string[];
}

export interface RevenueProjection {
  month: string;
  projectedRevenue: number;
  actualRevenue?: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface CashFlowForecast {
  month: string;
  openingBalance: number;
  income: number;
  expenses: number;
  closingBalance: number;
}

/**
 * Calculate runway based on current cash and burn rate
 */
export async function calculateRunway(workspaceId: string): Promise<RunwayData> {
  try {
    // Get current cash from financial logs (revenue transactions)
    const { data: revenueData, error: revenueError } = await supabase
      .from('revenue_transactions')
      .select('amount, transaction_type')
      .eq('workspace_id', workspaceId)
      .order('transaction_date', { ascending: false });

    if (revenueError) throw revenueError;

    // Calculate current cash (revenue - expenses)
    const currentCash = (revenueData || []).reduce((total, transaction) => {
      if (transaction.transaction_type === 'revenue') {
        return total + (transaction.amount || 0);
      } else if (transaction.transaction_type === 'expense') {
        return total - (transaction.amount || 0);
      }
      return total;
    }, 0);

    // Get recent expenses to calculate burn rate (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: expenseData, error: expenseError } = await supabase
      .from('revenue_transactions')
      .select('amount, transaction_date')
      .eq('workspace_id', workspaceId)
      .eq('transaction_type', 'expense')
      .gte('transaction_date', threeMonthsAgo.toISOString())
      .order('transaction_date', { ascending: false });

    if (expenseError) throw expenseError;

    // Calculate average monthly burn rate
    const totalExpenses = (expenseData || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const monthlyBurnRate = totalExpenses / 3;

    // Calculate runway
    const runwayMonths = monthlyBurnRate > 0 ? currentCash / monthlyBurnRate : Infinity;
    
    const runoutDate = new Date();
    runoutDate.setMonth(runoutDate.getMonth() + Math.floor(runwayMonths));

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (runwayMonths < 3) {
      recommendations.push('🚨 Critical: Less than 3 months runway. Seek funding or reduce expenses immediately.');
    } else if (runwayMonths < 6) {
      recommendations.push('⚠️ Warning: Less than 6 months runway. Start fundraising or implement cost-cutting measures.');
    } else if (runwayMonths < 12) {
      recommendations.push('✅ Healthy: 6-12 months runway. Consider planning for next funding round.');
    } else {
      recommendations.push('🎉 Excellent: 12+ months runway. Focus on growth and product development.');
    }

    if (monthlyBurnRate > 0) {
      const burnRateReduction = monthlyBurnRate * 0.2;
      const extendedRunway = currentCash / (monthlyBurnRate - burnRateReduction);
      const additionalMonths = extendedRunway - runwayMonths;
      recommendations.push(`💡 Tip: Reducing burn rate by 20% would extend runway by ${additionalMonths.toFixed(1)} months.`);
    }

    return {
      currentCash,
      monthlyBurnRate,
      runwayMonths,
      runoutDate,
      recommendations,
    };
  } catch (error) {
    logger.error('Error calculating runway:', error);
    throw error;
  }
}

/**
 * Predict future revenue based on historical data
 */
export async function predictRevenue(
  workspaceId: string,
  monthsAhead: number = 6
): Promise<RevenueProjection[]> {
  try {
    // Get historical revenue data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: revenueData, error } = await supabase
      .from('revenue_transactions')
      .select('amount, transaction_date')
      .eq('workspace_id', workspaceId)
      .eq('transaction_type', 'revenue')
      .gte('transaction_date', sixMonthsAgo.toISOString())
      .order('transaction_date', { ascending: true });

    if (error) throw error;

    // Group by month
    const monthlyRevenue: { [key: string]: number } = {};
    (revenueData || []).forEach(transaction => {
      const date = new Date(transaction.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (transaction.amount || 0);
    });

    // Calculate average monthly growth rate
    const months = Object.keys(monthlyRevenue).sort();
    let totalGrowthRate = 0;
    let growthCount = 0;

    for (let i = 1; i < months.length; i++) {
      const prevRevenue = monthlyRevenue[months[i - 1]];
      const currentRevenue = monthlyRevenue[months[i]];
      if (prevRevenue > 0) {
        const growthRate = (currentRevenue - prevRevenue) / prevRevenue;
        totalGrowthRate += growthRate;
        growthCount++;
      }
    }

    const avgGrowthRate = growthCount > 0 ? totalGrowthRate / growthCount : 0;
    
    // Get last month's revenue as baseline
    const lastMonth = months[months.length - 1];
    const lastRevenue = monthlyRevenue[lastMonth] || 0;

    // Generate projections
    const projections: RevenueProjection[] = [];
    let currentProjection = lastRevenue;

    for (let i = 1; i <= monthsAhead; i++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i);
      const monthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;

      // Apply growth rate with some variance
      currentProjection = currentProjection * (1 + avgGrowthRate);

      // Determine confidence based on data quality
      let confidence: 'high' | 'medium' | 'low' = 'medium';
      if (months.length >= 6 && avgGrowthRate > -0.1 && avgGrowthRate < 0.5) {
        confidence = 'high';
      } else if (months.length < 3 || Math.abs(avgGrowthRate) > 0.5) {
        confidence = 'low';
      }

      projections.push({
        month: monthKey,
        projectedRevenue: Math.round(currentProjection),
        actualRevenue: monthlyRevenue[monthKey],
        confidence,
      });
    }

    return projections;
  } catch (error) {
    logger.error('Error predicting revenue:', error);
    throw error;
  }
}

/**
 * Forecast cash flow for upcoming months
 */
export async function forecastCashFlow(
  workspaceId: string,
  monthsAhead: number = 6
): Promise<CashFlowForecast[]> {
  try {
    // Get current cash balance
    const { data: allTransactions, error } = await supabase
      .from('revenue_transactions')
      .select('amount, transaction_type, transaction_date')
      .eq('workspace_id', workspaceId)
      .order('transaction_date', { ascending: true });

    if (error) throw error;

    // Calculate current balance
    let currentBalance = 0;
    (allTransactions || []).forEach(transaction => {
      if (transaction.transaction_type === 'revenue') {
        currentBalance += transaction.amount || 0;
      } else if (transaction.transaction_type === 'expense') {
        currentBalance -= transaction.amount || 0;
      }
    });

    // Calculate average monthly income and expenses
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentTransactions = (allTransactions || []).filter(t => 
      new Date(t.transaction_date) >= threeMonthsAgo
    );

    const totalRevenue = recentTransactions
      .filter(t => t.transaction_type === 'revenue')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalExpenses = recentTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const avgMonthlyIncome = totalRevenue / 3;
    const avgMonthlyExpenses = totalExpenses / 3;

    // Generate forecast
    const forecasts: CashFlowForecast[] = [];
    let balance = currentBalance;

    for (let i = 1; i <= monthsAhead; i++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i);
      const monthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;

      const openingBalance = balance;
      const income = avgMonthlyIncome;
      const expenses = avgMonthlyExpenses;
      const closingBalance = openingBalance + income - expenses;

      forecasts.push({
        month: monthKey,
        openingBalance: Math.round(openingBalance),
        income: Math.round(income),
        expenses: Math.round(expenses),
        closingBalance: Math.round(closingBalance),
      });

      balance = closingBalance;
    }

    return forecasts;
  } catch (error) {
    logger.error('Error forecasting cash flow:', error);
    throw error;
  }
}

/**
 * Get comprehensive financial health metrics
 */
export async function getFinancialHealth(workspaceId: string) {
  try {
    const [runway, revenueProjections, cashFlowForecast] = await Promise.all([
      calculateRunway(workspaceId),
      predictRevenue(workspaceId, 6),
      forecastCashFlow(workspaceId, 6),
    ]);

    // Calculate additional metrics
    const burnMultiple = runway.monthlyBurnRate > 0 && revenueProjections.length > 0
      ? runway.monthlyBurnRate / (revenueProjections[0].projectedRevenue || 1)
      : 0;

    return {
      runway,
      revenueProjections,
      cashFlowForecast,
      metrics: {
        burnMultiple: burnMultiple.toFixed(2),
        currentCash: runway.currentCash,
        monthlyBurnRate: runway.monthlyBurnRate,
        projectedRevenueNextMonth: revenueProjections[0]?.projectedRevenue || 0,
      },
    };
  } catch (error) {
    logger.error('Error getting financial health:', error);
    throw error;
  }
}
