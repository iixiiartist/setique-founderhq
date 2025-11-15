import React, { useState, useMemo } from 'react';
import { z } from 'zod';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { FinancialLog, Expense, ExpenseCategory, PaymentMethod, AppActions, Task, Document, BusinessProfile, WorkspaceMember, DashboardData, ProductService } from '../types';
import { Tab } from '../constants';
import TaskManagement from './shared/TaskManagement';
import { useWorkspace } from '../contexts/WorkspaceContext';
import KpiCard from './shared/KpiCard';
import { RevenueModule, CashFlowModule, MetricsModule } from './financials';
import { Form } from './forms/Form';
import { FormField } from './forms/FormField';
import { SelectField } from './forms/SelectField';
import { Button } from './ui/Button';

const EXPENSE_CATEGORY_OPTIONS: ExpenseCategory[] = [
    'Software/SaaS',
    'Marketing',
    'Office',
    'Legal',
    'Contractors',
    'Travel',
    'Meals',
    'Equipment',
    'Subscriptions',
    'Other'
];

const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
    'Credit Card',
    'Debit Card',
    'Bank Transfer',
    'Cash',
    'PayPal',
    'Other'
];

const currencyFormatterNoCents = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0
});

const formatDateLabel = (isoDate: string) =>
    new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

const formatMonthKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const monthKeyToLabel = (key: string) =>
    new Date(`${key}-01T00:00:00Z`).toLocaleDateString(undefined, {
        timeZone: 'UTC',
        month: 'long',
        year: 'numeric'
    });

const formatCurrency = (value?: number | null) => currencyFormatterNoCents.format(value ?? 0);
const formatNumber = (value?: number | null) => numberFormatter.format(value ?? 0);
const formatDelta = (value: number, isCurrency = false) => {
    if (value === 0) {
        return isCurrency ? `±${currencyFormatter.format(0)}` : '±0';
    }
    const formattedAbsolute = isCurrency
        ? currencyFormatter.format(Math.abs(value))
        : numberFormatter.format(Math.abs(value));
    const prefix = value > 0 ? '+' : '-';
    return `${prefix}${formattedAbsolute}`;
};

const formatSpend = (value: number) =>
    value === 0 ? currencyFormatter.format(0) : currencyFormatter.format(-Math.abs(value));

const getDefaultFinancialLogForm = (): Omit<FinancialLog, 'id'> => ({
    date: new Date().toISOString().split('T')[0],
    mrr: 0,
    gmv: 0,
    signups: 0
});

const getDefaultExpenseForm = (): Omit<Expense, 'id' | 'notes'> => ({
    date: new Date().toISOString().split('T')[0],
    category: 'Software/SaaS' as ExpenseCategory,
    amount: 0,
    description: '',
    vendor: '',
    paymentMethod: undefined
});

const sanitizeExpenseInput = (expense: Omit<Expense, 'id' | 'notes'>): Omit<Expense, 'id' | 'notes'> => {
    const trimmedDescription = expense.description.trim();
    const trimmedVendor = expense.vendor?.trim();

    return {
        ...expense,
        amount: Number.isFinite(expense.amount) ? Math.max(0, expense.amount) : 0,
        description: trimmedDescription || 'Expense',
        vendor: trimmedVendor ? trimmedVendor : undefined,
        paymentMethod: expense.paymentMethod || undefined
    };
};

const sanitizeExpenseUpdates = (
    updates: Partial<Omit<Expense, 'id' | 'notes'>>
): Partial<Omit<Expense, 'id' | 'notes'>> => {
    const sanitized: Partial<Omit<Expense, 'id' | 'notes'>> = {};

    if (typeof updates.date === 'string') {
        sanitized.date = updates.date;
    }

    if (updates.category) {
        sanitized.category = updates.category;
    }

    if (typeof updates.amount === 'number') {
        sanitized.amount = Number.isFinite(updates.amount) ? Math.max(0, updates.amount) : 0;
    }

    if (typeof updates.description === 'string') {
        const trimmedDescription = updates.description.trim();
        if (trimmedDescription) {
            sanitized.description = trimmedDescription;
        }
    }

    if (typeof updates.vendor === 'string') {
        const trimmedVendor = updates.vendor.trim();
        sanitized.vendor = trimmedVendor ? trimmedVendor : undefined;
    }

    if ('paymentMethod' in updates) {
        sanitized.paymentMethod = updates.paymentMethod || undefined;
    }

    return sanitized;
};

// Zod schemas for financial forms
const financialLogSchema = z.object({
    date: z.string().min(1, 'Date is required'),
    mrr: z.number().min(0, 'MRR must be positive').default(0),
    gmv: z.number().min(0, 'GMV must be positive').default(0),
    signups: z.number().int().min(0, 'Signups must be positive').default(0),
});

const expenseSchema = z.object({
    date: z.string().min(1, 'Date is required'),
    amount: z.number().min(0, 'Amount must be positive'),
    description: z.string().min(1, 'Description is required').max(500),
    category: z.enum(EXPENSE_CATEGORY_OPTIONS as [string, ...string[]]),
    vendor: z.string().max(200).optional(),
    paymentMethod: z.enum(PAYMENT_METHOD_OPTIONS as [string, ...string[]]).optional(),
});

type FinancialLogFormData = z.infer<typeof financialLogSchema>;
type ExpenseFormData = z.infer<typeof expenseSchema>;

const FinancialLogItem: React.FC<{ item: FinancialLog; onDelete: () => void; }> = ({ item, onDelete }) => (
    <li className="flex items-center justify-between p-3 bg-white border-2 border-black shadow-neo">
        <div className="flex-grow">
            <p className="font-semibold">{new Date(item.date + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                <span>MRR: <strong className="text-black">{currencyFormatterNoCents.format(item.mrr)}</strong></span>
                <span>GMV: <strong className="text-black">{currencyFormatterNoCents.format(item.gmv)}</strong></span>
                <span>Signups: <strong className="text-black">{numberFormatter.format(item.signups)}</strong></span>
            </div>
        </div>
        <button onClick={onDelete} className="text-xl font-bold hover:text-red-500 transition-colors shrink-0 ml-4" aria-label={`Delete financial log for ${item.date}`}>&times;</button>
    </li>
);

const ExpenseItem: React.FC<{ 
    item: Expense; 
    onDelete: () => void; 
    onUpdate: (updates: Partial<Omit<Expense, 'id' | 'notes'>>) => void;
}> = ({ item, onDelete, onUpdate }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editForm, setEditForm] = React.useState<Partial<Omit<Expense, 'id' | 'notes'>>>({
        date: item.date,
        category: item.category,
        amount: item.amount,
        description: item.description,
        vendor: item.vendor,
        paymentMethod: item.paymentMethod
    });

    const handleSave = () => {
        const sanitizedUpdates = sanitizeExpenseUpdates(editForm);
        if (Object.keys(sanitizedUpdates).length > 0) {
            onUpdate(sanitizedUpdates);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditForm({
            date: item.date,
            category: item.category,
            amount: item.amount,
            description: item.description,
            vendor: item.vendor,
            paymentMethod: item.paymentMethod
        });
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <li className="p-3 bg-yellow-50 border-2 border-black shadow-neo">
                <div className="space-y-2">
                    <input
                        type="text"
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full p-2 border-2 border-black font-semibold"
                        placeholder="Description"
                        required
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={editForm.amount ?? 0}
                            onChange={(e) => setEditForm({ ...editForm, amount: Math.max(0, Number(e.target.value)) })}
                            className="p-2 border-2 border-black font-mono"
                            placeholder="Amount"
                            required
                        />
                        <input
                            type="date"
                            value={editForm.date || ''}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="p-2 border-2 border-black"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={editForm.category || 'Other'}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value as ExpenseCategory })}
                            className="p-2 border-2 border-black"
                        >
                            {EXPENSE_CATEGORY_OPTIONS.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <select
                            value={editForm.paymentMethod || ''}
                            onChange={(e) => setEditForm({ ...editForm, paymentMethod: (e.target.value || undefined) as PaymentMethod | undefined })}
                            className="p-2 border-2 border-black"
                        >
                            <option value="">Payment Method</option>
                            {PAYMENT_METHOD_OPTIONS.map(pm => (
                                <option key={pm} value={pm}>{pm}</option>
                            ))}
                        </select>
                    </div>
                    <input
                        type="text"
                        value={editForm.vendor || ''}
                        onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })}
                        className="w-full p-2 border-2 border-black"
                        placeholder="Vendor (optional)"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-green-500 text-white border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-mono font-bold"
                        >
                            Save
                        </button>
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-gray-300 text-black border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-mono font-bold"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </li>
        );
    }

    return (
        <li className="flex items-center justify-between p-3 bg-white border-2 border-black shadow-neo">
            <div className="flex-grow">
                <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold">{item.description}</p>
                    <span className="font-mono font-bold text-lg text-red-600">{currencyFormatter.format(-Math.abs(item.amount))}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span>{new Date(item.date + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="font-semibold text-blue-600">{item.category}</span>
                    {item.vendor && <span>Vendor: <strong className="text-black">{item.vendor}</strong></span>}
                    {item.paymentMethod && <span>{item.paymentMethod}</span>}
                </div>
            </div>
            <div className="flex gap-2 shrink-0 ml-4">
                <button 
                    onClick={() => setIsEditing(true)} 
                    className="text-lg hover:text-blue-600 transition-colors" 
                    aria-label={`Edit expense: ${item.description}`}
                >
                    ✎
                </button>
                <button 
                    onClick={onDelete} 
                    className="text-xl font-bold hover:text-red-500 transition-colors" 
                    aria-label={`Delete expense: ${item.description}`}
                >
                    &times;
                </button>
            </div>
        </li>
    );
};

const FinancialsTab: React.FC<{
    items: FinancialLog[];
    expenses: Expense[];
    tasks: Task[];
    actions: AppActions;
    documents: Document[];
    businessProfile?: BusinessProfile | null;
    workspaceId?: string;
    onUpgradeNeeded?: () => void;
    workspaceMembers?: WorkspaceMember[];
    data?: DashboardData;
    productsServices?: ProductService[];
}> = React.memo(({ items, expenses, tasks, actions, documents, businessProfile, workspaceId, onUpgradeNeeded, workspaceMembers = [], data, productsServices = [] }) => {
    const { workspace } = useWorkspace();
    const [currentView, setCurrentView] = useState<'overview' | 'revenue' | 'cashflow' | 'metrics'>('overview');
    const [expenseFilter, setExpenseFilter] = useState<ExpenseCategory | 'All'>('All');
    const [expenseSortBy, setExpenseSortBy] = useState<'date' | 'amount'>('date');

    const expenseFilterOptions = useMemo<(ExpenseCategory | 'All')[]>(() => ['All', ...EXPENSE_CATEGORY_OPTIONS], []);

    const currentMonthKey = useMemo(() => formatMonthKey(new Date()), []);
    const previousMonthKey = useMemo(() => {
        const base = new Date();
        base.setUTCDate(1);
        base.setUTCMonth(base.getUTCMonth() - 1);
        return formatMonthKey(base);
    }, []);

    const currentMonthLabel = useMemo(() => monthKeyToLabel(currentMonthKey), [currentMonthKey]);
    const previousMonthLabel = useMemo(() => monthKeyToLabel(previousMonthKey), [previousMonthKey]);

    const handleLog = (data: FinancialLogFormData) => {
        const financialLog: Omit<FinancialLog, 'id'> = {
            date: data.date,
            mrr: data.mrr,
            gmv: data.gmv,
            signups: data.signups,
        };
        actions.logFinancials(financialLog);
    };

    const handleExpense = (data: ExpenseFormData) => {
        const expense: Omit<Expense, 'id' | 'notes'> = {
            date: data.date,
            amount: data.amount,
            description: data.description,
            category: data.category as ExpenseCategory,
            vendor: data.vendor || '',
            paymentMethod: data.paymentMethod as PaymentMethod | undefined,
        };
        actions.createExpense(expense);
    };

    // Expense calculations
    const filteredExpenses = useMemo(() => {
        let filtered = expenseFilter === 'All' ? expenses : expenses.filter(e => e.category === expenseFilter);
        return [...filtered].sort((a, b) => {
            if (expenseSortBy === 'date') {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            return b.amount - a.amount;
        });
    }, [expenses, expenseFilter, expenseSortBy]);

    const expensesByCategory = useMemo(() => {
        const categoryTotals: Record<string, number> = {};
        expenses.forEach(expense => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
        });
        return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
    }, [expenses]);

    const totalExpenses = useMemo(() => 
        expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]);

    const monthlyExpenses = useMemo(() =>
        expenses
            .filter(e => e.date.startsWith(currentMonthKey))
            .reduce((sum, e) => sum + e.amount, 0),
    [expenses, currentMonthKey]);

    const previousMonthExpenses = useMemo(() =>
        expenses
            .filter(e => e.date.startsWith(previousMonthKey))
            .reduce((sum, e) => sum + e.amount, 0),
    [expenses, previousMonthKey]);

    const monthlyExpenseDelta = monthlyExpenses - previousMonthExpenses;

    const sortedLogs = useMemo(() =>
        [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [items]);

    const chronologicalLogs = useMemo(() =>
        [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [items]);

    const chartData = useMemo(() =>
        chronologicalLogs.map(log => ({
            date: log.date,
            mrr: log.mrr,
            gmv: log.gmv
        })),
    [chronologicalLogs]);

    const latestFinancials = sortedLogs[0] ?? null;
    const previousFinancials = sortedLogs[1] ?? null;
    const latestLogDateLabel = latestFinancials ? formatDateLabel(latestFinancials.date) : '';

    const mrrDelta = latestFinancials && previousFinancials ? latestFinancials.mrr - previousFinancials.mrr : null;
    const gmvDelta = latestFinancials && previousFinancials ? latestFinancials.gmv - previousFinancials.gmv : null;
    const signupDelta = latestFinancials && previousFinancials ? latestFinancials.signups - previousFinancials.signups : null;

    const EXPENSE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

    const latestSignups = latestFinancials?.signups ?? 0;
    const latestMrr = latestFinancials?.mrr ?? 0;
    const latestGmv = latestFinancials?.gmv ?? 0;

    const snapshotDescription = latestFinancials
        ? `Latest entry: ${latestLogDateLabel}`
        : 'Log your first financial snapshot to unlock insights';

    const signupsDescription = latestFinancials
        ? `Latest entry: ${latestLogDateLabel}`
        : 'Log your first financial snapshot to track signups';

    const totalExpenseDescription = expenses.length > 0
        ? `${expenses.length} logged expense${expenses.length === 1 ? '' : 's'}`
        : 'Track your first expense';

    const monthlyExpenseDescription = `Spending in ${currentMonthLabel}`;

    const signupsTrend = signupDelta !== null
        ? {
            label: `${formatDelta(signupDelta)} vs prior entry`,
            tone: signupDelta >= 0 ? 'positive' : 'negative',
            direction: signupDelta === 0 ? 'flat' : undefined
        } as const
        : undefined;

    const mrrTrend = mrrDelta !== null
        ? {
            label: `${formatDelta(mrrDelta, true)} vs prior entry`,
            tone: mrrDelta >= 0 ? 'positive' : 'negative',
            direction: mrrDelta === 0 ? 'flat' : undefined
        } as const
        : undefined;

    const gmvTrend = gmvDelta !== null
        ? {
            label: `${formatDelta(gmvDelta, true)} vs prior entry`,
            tone: gmvDelta >= 0 ? 'positive' : 'negative',
            direction: gmvDelta === 0 ? 'flat' : undefined
        } as const
        : undefined;

    const monthlyExpenseTrend = previousMonthExpenses > 0
        ? {
            label: `${formatDelta(monthlyExpenseDelta, true)} vs ${previousMonthLabel}`,
            tone: monthlyExpenseDelta <= 0 ? 'positive' : 'negative',
            direction: monthlyExpenseDelta < 0 ? 'down' : monthlyExpenseDelta === 0 ? 'flat' : 'up'
        } as const
        : undefined;

    return (
        <div className="space-y-6">
            {/* View Selector */}
            <div className="bg-white p-4 border-2 border-black shadow-neo">
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setCurrentView('overview')}
                        className={`px-4 py-2 border-2 border-black font-mono font-semibold transition-all ${
                            currentView === 'overview'
                                ? 'bg-black text-white shadow-neo-btn'
                                : 'bg-white text-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                        }`}
                        aria-pressed={currentView === 'overview'}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentView('revenue')}
                        className={`px-4 py-2 border-2 border-black font-mono font-semibold transition-all ${
                            currentView === 'revenue'
                                ? 'bg-black text-white shadow-neo-btn'
                                : 'bg-white text-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                        }`}
                        aria-pressed={currentView === 'revenue'}
                    >
                        Revenue
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentView('cashflow')}
                        className={`px-4 py-2 border-2 border-black font-mono font-semibold transition-all ${
                            currentView === 'cashflow'
                                ? 'bg-black text-white shadow-neo-btn'
                                : 'bg-white text-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                        }`}
                        aria-pressed={currentView === 'cashflow'}
                    >
                        Cash Flow
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentView('metrics')}
                        className={`px-4 py-2 border-2 border-black font-mono font-semibold transition-all ${
                            currentView === 'metrics'
                                ? 'bg-black text-white shadow-neo-btn'
                                : 'bg-white text-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                        }`}
                        aria-pressed={currentView === 'metrics'}
                    >
                        Metrics
                    </button>
                </div>
            </div>

            {/* Render based on selected view */}
            {currentView === 'revenue' && data && (
                <RevenueModule
                    data={data}
                    actions={actions}
                    workspaceId={workspaceId}
                    productsServices={productsServices}
                />
            )}

            {currentView === 'cashflow' && data && (
                <CashFlowModule
                    data={data}
                    actions={actions}
                />
            )}

            {currentView === 'metrics' && data && (
                <MetricsModule
                    data={data}
                    actions={actions}
                    workspaceId={workspaceId}
                />
            )}

            {currentView === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KpiCard
                        title="Monthly Recurring Revenue"
                        value={formatCurrency(latestMrr)}
                        description={snapshotDescription}
                        trend={mrrTrend}
                    />
                    <KpiCard
                        title="Gross Merchandise Volume"
                        value={formatCurrency(latestGmv)}
                        description={snapshotDescription}
                        trend={gmvTrend}
                    />
                    <KpiCard
                        title="New Signups"
                        value={formatNumber(latestSignups)}
                        description={signupsDescription}
                        trend={signupsTrend}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <KpiCard
                        title="Total Expenses"
                        value={formatSpend(totalExpenses)}
                        description={totalExpenseDescription}
                    />
                    <KpiCard
                        title="Monthly Expenses"
                        value={formatSpend(monthlyExpenses)}
                        description={monthlyExpenseDescription}
                        trend={monthlyExpenseTrend}
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h2 className="text-xl font-semibold text-black mb-4">Revenue Trends</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}
                                        tickFormatter={(value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis
                                        tickFormatter={(value: number) => currencyFormatterNoCents.format(Number(value))}
                                        tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ fontFamily: "'Inter', sans-serif" }}
                                        labelFormatter={(value) => formatDateLabel(String(value))}
                                        formatter={(value: number, name: string) => [currencyFormatter.format(Number(value)), name]}
                                    />
                                    <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace" }} />
                                    <Line type="monotone" dataKey="mrr" name="MRR" stroke="#3b82f6" strokeWidth={2} />
                                    <Line type="monotone" dataKey="gmv" name="GMV" stroke="#10b981" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h2 className="text-xl font-semibold text-black mb-4">Expenses by Category</h2>
                        {expensesByCategory.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={expensesByCategory}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={(entry: any) => currencyFormatter.format(Number(entry.value))}
                                        >
                                            {expensesByCategory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => currencyFormatter.format(Number(value))} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-2 text-xs space-y-1">
                                    {expensesByCategory.slice(0, 3).map((cat, idx) => (
                                        <div key={cat.name} className="flex justify-between">
                                            <span className="flex items-center gap-1">
                                                <div className="w-3 h-3 border border-black" style={{ backgroundColor: EXPENSE_COLORS[idx] }}></div>
                                                {cat.name}
                                            </span>
                                            <span className="font-bold">{currencyFormatter.format(cat.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic text-center py-8">No expense data yet</p>
                        )}
                    </div>
                </div>

                {/* Forms Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h2 className="text-xl font-semibold text-black mb-4">Log Financial Snapshot</h2>
                        <Form
                            schema={financialLogSchema}
                            defaultValues={{
                                date: new Date().toISOString().split('T')[0],
                                mrr: 0,
                                gmv: 0,
                                signups: 0,
                            }}
                            onSubmit={handleLog}
                            className="space-y-3"
                        >
                            {({ watch, formState }) => {
                                const signups = watch('signups') || 0;
                                const calculatedXp = 10 + (signups * 2);
                                
                                return (
                                    <>
                                        <FormField
                                            name="date"
                                            label="Date"
                                            type="date"
                                            required
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField
                                                name="mrr"
                                                label="MRR ($)"
                                                type="number"
                                                min={0}
                                                placeholder="1000"
                                                required
                                            />
                                            <FormField
                                                name="gmv"
                                                label="GMV ($)"
                                                type="number"
                                                min={0}
                                                placeholder="10000"
                                                required
                                            />
                                        </div>
                                        <FormField
                                            name="signups"
                                            label="New Signups"
                                            type="number"
                                            min={0}
                                            step={1}
                                            placeholder="100"
                                            required
                                        />
                                        <div className="flex justify-end items-center gap-3 pt-2">
                                            <span className="font-mono text-sm font-semibold text-green-600">+{calculatedXp} XP</span>
                                            <Button type="submit" loading={formState.isSubmitting}>
                                                Log
                                            </Button>
                                        </div>
                                    </>
                                );
                            }}
                        </Form>
                    </div>

                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h2 className="text-xl font-semibold text-black mb-4">Log Expense</h2>
                        <Form
                            schema={expenseSchema}
                            defaultValues={{
                                date: new Date().toISOString().split('T')[0],
                                amount: 0,
                                description: '',
                                category: 'Other' as ExpenseCategory,
                                vendor: '',
                                paymentMethod: undefined,
                            }}
                            onSubmit={handleExpense}
                            className="space-y-3"
                        >
                            {({ formState }) => (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField
                                            name="date"
                                            label="Date"
                                            type="date"
                                            required
                                        />
                                        <FormField
                                            name="amount"
                                            label="Amount ($)"
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    <FormField
                                        name="description"
                                        label="Description"
                                        type="text"
                                        placeholder="AWS hosting"
                                        required
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <SelectField
                                            name="category"
                                            label="Category"
                                            required
                                            options={EXPENSE_CATEGORY_OPTIONS.map(cat => ({ value: cat, label: cat }))}
                                        />
                                        <FormField
                                            name="vendor"
                                            label="Vendor"
                                            type="text"
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <SelectField
                                        name="paymentMethod"
                                        label="Payment Method"
                                        options={[
                                            { value: '', label: 'Select' },
                                            ...PAYMENT_METHOD_OPTIONS.map(method => ({ value: method, label: method }))
                                        ]}
                                    />
                                    <div className="flex justify-end pt-2">
                                        <Button type="submit" variant="danger" loading={formState.isSubmitting}>
                                            Log
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </div>

                {/* History Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h2 className="text-xl font-semibold text-black mb-4">Financial Log History</h2>
                        <ul className="max-h-80 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                            {sortedLogs.length > 0 ? (
                                sortedLogs.map(item => <FinancialLogItem key={item.id} item={item} onDelete={() => actions.deleteItem('financials', item.id)} />)
                            ) : (
                                <p className="text-gray-500 italic text-sm">No financial data logged yet.</p>
                            )}
                        </ul>
                    </div>

                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-black">Expense History</h2>
                            <div className="flex gap-2">
                                <select
                                    value={expenseFilter}
                                    onChange={e => setExpenseFilter(e.target.value as ExpenseCategory | 'All')}
                                    className="bg-white border-2 border-black text-black px-2 py-1 text-xs font-mono rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    {expenseFilterOptions.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                                <select 
                                    value={expenseSortBy} 
                                    onChange={e => setExpenseSortBy(e.target.value as 'date' | 'amount')}
                                    className="bg-white border-2 border-black text-black px-2 py-1 text-xs font-mono rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="date">Date</option>
                                    <option value="amount">Amount</option>
                                </select>
                            </div>
                        </div>
                        <ul className="max-h-80 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                            {filteredExpenses.length > 0 ? (
                                filteredExpenses.map(item => (
                                    <ExpenseItem 
                                        key={item.id} 
                                        item={item} 
                                        onDelete={() => actions.deleteItem('expenses', item.id)}
                                        onUpdate={(updates) => actions.updateExpense(item.id, updates)}
                                    />
                                ))
                            ) : (
                                <p className="text-gray-500 italic text-sm">No expenses logged yet.</p>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Tasks Section */}
                <TaskManagement
                    tasks={tasks}
                    actions={actions}
                    taskCollectionName="financialTasks"
                    tag="Financials"
                    title="Financial Tasks"
                    placeholder="e.g., 'Prepare Q3 board deck'"
                />
            </div>
            </div>
            )}
        </div>
    );
});

export default FinancialsTab;
