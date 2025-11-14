import { supabase } from '../supabase';
import type { 
  RevenueTransaction, 
  FinancialForecast, 
  BudgetPlan,
  Expense 
} from '../../types';

// ============================================================================
// REVENUE TRANSACTIONS
// ============================================================================

export async function createRevenueTransaction(
  transaction: Omit<RevenueTransaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<RevenueTransaction | null> {
  try {
    const { data, error } = await supabase
      .from('revenue_transactions')
      .insert([transaction])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating revenue transaction:', error);
    return null;
  }
}

export async function updateRevenueTransaction(
  id: string,
  updates: Partial<Omit<RevenueTransaction, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<RevenueTransaction | null> {
  try {
    const { data, error } = await supabase
      .from('revenue_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating revenue transaction:', error);
    return null;
  }
}

export async function deleteRevenueTransaction(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('revenue_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting revenue transaction:', error);
    return false;
  }
}

export async function getRevenueTransactions(
  workspaceId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    transactionType?: string;
    crmItemId?: string;
  }
): Promise<RevenueTransaction[]> {
  try {
    let query = supabase
      .from('revenue_transactions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('transaction_date', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('transaction_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('transaction_date', filters.endDate);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.transactionType) {
      query = query.eq('transaction_type', filters.transactionType);
    }
    if (filters?.crmItemId) {
      query = query.eq('crm_item_id', filters.crmItemId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching revenue transactions:', error);
    return [];
  }
}

export async function getRevenueByCustomer(
  workspaceId: string,
  startDate?: string,
  endDate?: string
): Promise<Array<{
  crmItemId: string | null;
  customerName: string | null;
  totalRevenue: number;
  transactionCount: number;
  firstTransaction: string;
  latestTransaction: string;
}>> {
  try {
    let query = supabase
      .from('revenue_by_customer')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (startDate) {
      query = query.gte('first_transaction', startDate);
    }
    if (endDate) {
      query = query.lte('latest_transaction', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching revenue by customer:', error);
    return [];
  }
}

// ============================================================================
// FINANCIAL FORECASTS
// ============================================================================

export async function createFinancialForecast(
  forecast: Omit<FinancialForecast, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FinancialForecast | null> {
  try {
    const { data, error } = await supabase
      .from('financial_forecasts')
      .insert([forecast])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating financial forecast:', error);
    return null;
  }
}

export async function updateFinancialForecast(
  id: string,
  updates: Partial<Omit<FinancialForecast, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<FinancialForecast | null> {
  try {
    const { data, error } = await supabase
      .from('financial_forecasts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating financial forecast:', error);
    return null;
  }
}

export async function deleteFinancialForecast(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('financial_forecasts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting financial forecast:', error);
    return false;
  }
}

export async function getFinancialForecasts(
  workspaceId: string,
  forecastType?: 'revenue' | 'expense' | 'runway'
): Promise<FinancialForecast[]> {
  try {
    let query = supabase
      .from('financial_forecasts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('forecast_month', { ascending: true });

    if (forecastType) {
      query = query.eq('forecast_type', forecastType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching financial forecasts:', error);
    return [];
  }
}

// ============================================================================
// BUDGET PLANS
// ============================================================================

export async function createBudgetPlan(
  budget: Omit<BudgetPlan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<BudgetPlan | null> {
  try {
    const { data, error } = await supabase
      .from('budget_plans')
      .insert([budget])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating budget plan:', error);
    return null;
  }
}

export async function updateBudgetPlan(
  id: string,
  updates: Partial<Omit<BudgetPlan, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<BudgetPlan | null> {
  try {
    const { data, error } = await supabase
      .from('budget_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating budget plan:', error);
    return null;
  }
}

export async function deleteBudgetPlan(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('budget_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting budget plan:', error);
    return false;
  }
}

export async function getBudgetPlans(
  workspaceId: string,
  activePlansOnly = false
): Promise<BudgetPlan[]> {
  try {
    let query = supabase
      .from('budget_plans')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('budget_period_start', { ascending: false });

    if (activePlansOnly) {
      const today = new Date().toISOString().split('T')[0];
      query = query
        .lte('budget_period_start', today)
        .gte('budget_period_end', today);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching budget plans:', error);
    return [];
  }
}

export async function updateBudgetSpent(
  budgetId: string,
  additionalSpent: number
): Promise<BudgetPlan | null> {
  try {
    // First get current spent amount
    const { data: budget, error: fetchError } = await supabase
      .from('budget_plans')
      .select('spent_amount')
      .eq('id', budgetId)
      .single();

    if (fetchError) throw fetchError;

    const newSpentAmount = (budget.spent_amount || 0) + additionalSpent;

    // Update with new spent amount
    const { data, error } = await supabase
      .from('budget_plans')
      .update({ spent_amount: newSpentAmount })
      .eq('id', budgetId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating budget spent:', error);
    return null;
  }
}

// ============================================================================
// FINANCIAL CALCULATIONS
// ============================================================================

/**
 * Calculate Monthly Recurring Revenue (MRR) from revenue transactions
 */
export async function calculateMRR(
  workspaceId: string,
  month: string // Format: 'YYYY-MM-01'
): Promise<number> {
  try {
    const startDate = new Date(month);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const { data, error } = await supabase
      .from('revenue_transactions')
      .select('amount')
      .eq('workspace_id', workspaceId)
      .eq('transaction_type', 'recurring')
      .eq('status', 'paid')
      .gte('transaction_date', startDate.toISOString().split('T')[0])
      .lt('transaction_date', endDate.toISOString().split('T')[0]);

    if (error) throw error;

    const mrr = data?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) || 0;
    return mrr;
  } catch (error) {
    console.error('Error calculating MRR:', error);
    return 0;
  }
}

/**
 * Calculate Annual Recurring Revenue (ARR)
 */
export async function calculateARR(
  workspaceId: string,
  month: string
): Promise<number> {
  const mrr = await calculateMRR(workspaceId, month);
  return mrr * 12;
}

/**
 * Calculate Customer Acquisition Cost (CAC)
 */
export async function calculateCAC(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  try {
    // Get marketing and sales expenses
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('workspace_id', workspaceId)
      .in('expense_type', ['marketing', 'sales'])
      .gte('date', startDate)
      .lte('date', endDate);

    if (expenseError) throw expenseError;

    const totalExpenses = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

    // Get number of new customers (CRM items created in period with deal value)
    const { data: newCustomers, error: customerError } = await supabase
      .from('crm_items')
      .select('id')
      .eq('workspace_id', workspaceId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .not('deal_value', 'is', null);

    if (customerError) throw customerError;

    const customerCount = newCustomers?.length || 0;

    if (customerCount === 0) return 0;

    return totalExpenses / customerCount;
  } catch (error) {
    console.error('Error calculating CAC:', error);
    return 0;
  }
}

/**
 * Calculate Customer Lifetime Value (LTV)
 */
export async function calculateLTV(
  workspaceId: string,
  averageCustomerLifespanMonths = 24
): Promise<number> {
  try {
    // Get average revenue per customer
    const { data: revenueByCustomer, error } = await supabase
      .from('revenue_by_customer')
      .select('total_revenue')
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    if (!revenueByCustomer || revenueByCustomer.length === 0) return 0;

    const totalRevenue = revenueByCustomer.reduce((sum, customer) => sum + Number(customer.total_revenue), 0);
    const averageRevenuePerCustomer = totalRevenue / revenueByCustomer.length;

    // LTV = Average Revenue Per Customer
    // For more sophisticated calculation, multiply by average lifespan
    return averageRevenuePerCustomer;
  } catch (error) {
    console.error('Error calculating LTV:', error);
    return 0;
  }
}

/**
 * Calculate burn rate (monthly expenses)
 */
export async function calculateBurnRate(
  workspaceId: string,
  month: string // Format: 'YYYY-MM-01'
): Promise<number> {
  try {
    const startDate = new Date(month);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('workspace_id', workspaceId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lt('date', endDate.toISOString().split('T')[0]);

    if (error) throw error;

    const burnRate = data?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
    return burnRate;
  } catch (error) {
    console.error('Error calculating burn rate:', error);
    return 0;
  }
}

/**
 * Calculate runway (months until cash runs out)
 */
export async function calculateRunway(
  workspaceId: string,
  currentCashBalance: number
): Promise<number> {
  try {
    // Get average burn rate over last 3 months
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('workspace_id', workspaceId)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0])
      .lte('date', today.toISOString().split('T')[0]);

    if (error) throw error;

    if (!data || data.length === 0) return 0;

    const totalExpenses = data.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const averageMonthlyBurn = totalExpenses / 3;

    if (averageMonthlyBurn === 0) return Infinity;

    return currentCashBalance / averageMonthlyBurn;
  } catch (error) {
    console.error('Error calculating runway:', error);
    return 0;
  }
}

/**
 * Get cash flow summary for a date range
 */
export async function getCashFlowSummary(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalRevenue: number;
  totalExpenses: number;
  netCashFlow: number;
  operatingExpenses: number;
  marketingExpenses: number;
  salesExpenses: number;
  rdExpenses: number;
}> {
  try {
    // Get revenue
    const { data: revenue, error: revenueError } = await supabase
      .from('revenue_transactions')
      .select('amount')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (revenueError) throw revenueError;

    const totalRevenue = revenue?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

    // Get expenses by type
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, expense_type')
      .eq('workspace_id', workspaceId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (expenseError) throw expenseError;

    const totalExpenses = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

    const operatingExpenses = expenses
      ?.filter(exp => exp.expense_type === 'operating')
      .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

    const marketingExpenses = expenses
      ?.filter(exp => exp.expense_type === 'marketing')
      .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

    const salesExpenses = expenses
      ?.filter(exp => exp.expense_type === 'sales')
      .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

    const rdExpenses = expenses
      ?.filter(exp => exp.expense_type === 'rd')
      .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

    return {
      totalRevenue,
      totalExpenses,
      netCashFlow: totalRevenue - totalExpenses,
      operatingExpenses,
      marketingExpenses,
      salesExpenses,
      rdExpenses,
    };
  } catch (error) {
    console.error('Error getting cash flow summary:', error);
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netCashFlow: 0,
      operatingExpenses: 0,
      marketingExpenses: 0,
      salesExpenses: 0,
      rdExpenses: 0,
    };
  }
}

/**
 * Generate forecast based on historical data and pipeline
 */
export async function generateRevenueForecast(
  workspaceId: string,
  forecastMonths = 6
): Promise<FinancialForecast[]> {
  try {
    // Get historical revenue for trend analysis
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: historicalRevenue, error: histError } = await supabase
      .from('revenue_transactions')
      .select('transaction_date, amount')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid')
      .gte('transaction_date', sixMonthsAgo.toISOString().split('T')[0])
      .order('transaction_date', { ascending: true });

    if (histError) throw histError;

    // Calculate average monthly growth rate
    const monthlyRevenue: { [key: string]: number } = {};
    historicalRevenue?.forEach(tx => {
      const month = tx.transaction_date.substring(0, 7); // YYYY-MM
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(tx.amount);
    });

    const months = Object.keys(monthlyRevenue).sort();
    let averageGrowthRate = 0;

    if (months.length > 1) {
      const growthRates: number[] = [];
      for (let i = 1; i < months.length; i++) {
        const prevMonth = monthlyRevenue[months[i - 1]];
        const currentMonth = monthlyRevenue[months[i]];
        if (prevMonth > 0) {
          growthRates.push((currentMonth - prevMonth) / prevMonth);
        }
      }
      averageGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    }

    // Get pipeline deals for forecast
    const { data: pipelineDeals, error: pipelineError } = await supabase
      .from('crm_items')
      .select('deal_value, expected_close_date')
      .eq('workspace_id', workspaceId)
      .in('stage', ['Proposal', 'Negotiation', 'Verbal Commit'])
      .not('deal_value', 'is', null)
      .not('expected_close_date', 'is', null);

    if (pipelineError) throw pipelineError;

    // Generate forecasts
    const forecasts: Omit<FinancialForecast, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const lastMonthRevenue = months.length > 0 ? monthlyRevenue[months[months.length - 1]] : 0;
    const userId = (await supabase.auth.getUser()).data.user?.id || '';

    for (let i = 0; i < forecastMonths; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);
      forecastDate.setDate(1); // First day of month

      const forecastMonth = forecastDate.toISOString().split('T')[0];

      // Base forecast on growth trend
      const trendBasedForecast = lastMonthRevenue * Math.pow(1 + averageGrowthRate, i + 1);

      // Add pipeline deals for this month
      const pipelineForMonth = pipelineDeals
        ?.filter(deal => {
          const closeMonth = deal.expected_close_date?.substring(0, 7);
          const targetMonth = forecastMonth.substring(0, 7);
          return closeMonth === targetMonth;
        })
        .reduce((sum, deal) => sum + Number(deal.deal_value) * 0.5, 0) || 0; // 50% probability

      const forecastedAmount = trendBasedForecast + pipelineForMonth;
      const basedOnDeals = pipelineDeals
        ?.filter(deal => {
          const closeMonth = deal.expected_close_date?.substring(0, 7);
          const targetMonth = forecastMonth.substring(0, 7);
          return closeMonth === targetMonth;
        })
        .map(deal => deal.deal_value) || [];

      forecasts.push({
        workspaceId,
        userId,
        forecastMonth,
        forecastType: 'revenue',
        forecastedAmount,
        confidenceLevel: pipelineForMonth > 0 ? 'high' : 'medium',
        basedOnDeals,
        assumptions: `Based on ${(averageGrowthRate * 100).toFixed(1)}% average growth rate and pipeline deals`,
      });
    }

    return forecasts as FinancialForecast[];
  } catch (error) {
    console.error('Error generating revenue forecast:', error);
    return [];
  }
}
