import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

// Demo data
const revenueTrendData = [
    { month: 'Jan', revenue: 4000 },
    { month: 'Feb', revenue: 6000 },
    { month: 'Mar', revenue: 5500 },
    { month: 'Apr', revenue: 7000 },
    { month: 'May', revenue: 8000 },
    { month: 'Jun', revenue: 9500 },
];

const expenseBreakdownData = [
    { name: 'Salaries', value: 4500 },
    { name: 'Marketing', value: 1500 },
    { name: 'Software', value: 800 },
    { name: 'Office', value: 600 },
    { name: 'Other', value: 400 },
];

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

const currencyFormatterNoCents = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

export const FinancialsCharts: React.FC = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Revenue Trend Chart */}
            <div className="bg-white p-3 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
                    Revenue Trend
                </h3>
                <div className="h-[200px] sm:h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={revenueTrendData}
                            margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
                        >
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                            />
                            <YAxis
                                tickFormatter={(value) =>
                                    `$${(value / 1000).toFixed(0)}k`
                                }
                                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                            />
                            <Tooltip
                                formatter={(value: number) => [
                                    currencyFormatterNoCents.format(value),
                                    'Revenue',
                                ]}
                            />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#000"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Expense Breakdown Chart */}
            <div className="bg-white p-3 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
                    Expense Breakdown
                </h3>
                <div className="h-[200px] sm:h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={expenseBreakdownData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={60}
                                label={({ name, percent }) =>
                                    `${name} ${(percent * 100).toFixed(0)}%`
                                }
                                labelLine={false}
                            >
                                {expenseBreakdownData.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => [
                                    currencyFormatterNoCents.format(value),
                                    'Amount',
                                ]}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
