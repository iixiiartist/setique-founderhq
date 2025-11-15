import React, { useState, useMemo } from 'react';
import { X, TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { Editor } from '@tiptap/react';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { CHART_TEMPLATES, getTemplateConfig, type ChartTemplateName } from '../../lib/chartTemplates';
import { 
    getFinancialChartData,
    getExpenseChartData,
    getPipelineChartData,
    getMarketingChartData,
    getTaskCompletionChartData,
    getGrowthChartData,
    getSampleChartData
} from '../../lib/chartDataConnectors';
import { DashboardData } from '../../types';

interface ChartQuickInsertProps {
    editor: Editor;
    onClose: () => void;
    data: DashboardData;
}

export const ChartQuickInsert: React.FC<ChartQuickInsertProps> = ({ editor, onClose, data }) => {
    const [selectedTemplate, setSelectedTemplate] = useState<ChartTemplateName>('revenueTrends');
    const [useRealData, setUseRealData] = useState(true);

    // Get chart configuration
    const chartConfig = getTemplateConfig(selectedTemplate);

    // Get chart data based on template and data source selection
    const chartData = useMemo(() => {
        if (!useRealData) {
            return getSampleChartData(chartConfig.chartType);
        }

        // Map templates to data connectors
        switch (selectedTemplate) {
            case 'revenueTrends':
                return getFinancialChartData(data.financials || []);
            case 'expenseBreakdown':
                return getExpenseChartData(data.expenses || []);
            case 'salesPipeline':
                return getPipelineChartData(data.customers || []);
            case 'growthMetrics':
                return getGrowthChartData(
                    data.financials || [],
                    data.customers || []
                );
            default:
                return getSampleChartData(chartConfig.chartType);
        }
    }, [selectedTemplate, useRealData, data, chartConfig.chartType]);

    const hasRealData = useMemo(() => {
        switch (selectedTemplate) {
            case 'revenueTrends':
                return (data.financials?.length || 0) > 0;
            case 'expenseBreakdown':
                return (data.expenses?.length || 0) > 0;
            case 'salesPipeline':
            case 'growthMetrics':
                return (data.customers?.length || 0) > 0;
            default:
                return false;
        }
    }, [selectedTemplate, data]);

    const handleInsert = () => {
        editor.chain().focus().insertChart({
            chartType: chartConfig.chartType,
            title: chartConfig.title,
            data: chartData,
            dataKeys: chartConfig.dataKeys,
            xAxisKey: chartConfig.xAxisKey,
            colors: chartConfig.colors,
            width: chartConfig.width,
            height: chartConfig.height,
            showLegend: chartConfig.showLegend,
            showGrid: chartConfig.showGrid,
        }).run();
        onClose();
    };

    const renderPreview = () => {
        const commonProps = {
            width: 500,
            height: 250,
            data: chartData,
        };

        switch (chartConfig.chartType) {
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={chartConfig.xAxisKey} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {chartConfig.dataKeys.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={chartConfig.colors[index]}
                                    strokeWidth={2}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={chartConfig.xAxisKey} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {chartConfig.dataKeys.map((key, index) => (
                                <Bar key={key} dataKey={key} fill={chartConfig.colors[index]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey={chartConfig.dataKeys[0]}
                                nameKey={chartConfig.xAxisKey}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label
                            >
                                {chartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={chartConfig.colors[index % chartConfig.colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'area':
                return (
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={chartConfig.xAxisKey} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {chartConfig.dataKeys.map((key, index) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    fill={chartConfig.colors[index]}
                                    stroke={chartConfig.colors[index]}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                );
        }
    };

    const templates = [
        { name: 'revenueTrends' as ChartTemplateName, icon: TrendingUp, label: 'Revenue Trends', description: 'MRR & GMV over time' },
        { name: 'expenseBreakdown' as ChartTemplateName, icon: PieChartIcon, label: 'Expense Breakdown', description: 'Spending by category' },
        { name: 'salesPipeline' as ChartTemplateName, icon: BarChart3, label: 'Sales Pipeline', description: 'Deals by stage' },
        { name: 'growthMetrics' as ChartTemplateName, icon: Activity, label: 'Growth Metrics', description: 'Signups & customers' },
    ];

    return (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-10 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-black shadow-neo-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-yellow-300 border-b-4 border-black p-4 flex items-center justify-between sticky top-0">
                    <h2 className="text-2xl font-bold">📊 Insert Chart</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black hover:text-white border-2 border-black transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-6">
                    {/* Left Side - Template Selection */}
                    <div>
                        <h3 className="text-lg font-bold mb-4">Select Template</h3>
                        <div className="space-y-2">
                            {templates.map((template) => {
                                const Icon = template.icon;
                                const isSelected = selectedTemplate === template.name;
                                return (
                                    <button
                                        key={template.name}
                                        onClick={() => setSelectedTemplate(template.name)}
                                        className={`w-full p-4 border-2 border-black text-left transition-all ${
                                            isSelected
                                                ? 'bg-blue-100 shadow-neo'
                                                : 'bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="w-6 h-6" />
                                            <div>
                                                <div className="font-bold">{template.label}</div>
                                                <div className="text-sm text-gray-600">{template.description}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Data Source Toggle */}
                        <div className="mt-6 p-4 bg-gray-50 border-2 border-black">
                            <h4 className="font-bold mb-2">Data Source</h4>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={useRealData}
                                        onChange={() => setUseRealData(true)}
                                        disabled={!hasRealData}
                                        className="w-4 h-4"
                                    />
                                    <span className={!hasRealData ? 'text-gray-400' : ''}>
                                        Your workspace data {!hasRealData && '(no data)'}
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={!useRealData}
                                        onChange={() => setUseRealData(false)}
                                        className="w-4 h-4"
                                    />
                                    <span>Sample data</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Preview */}
                    <div>
                        <h3 className="text-lg font-bold mb-4">Preview</h3>
                        <div className="border-2 border-black bg-white p-4">
                            <h4 className="font-bold text-center mb-4">{chartConfig.title}</h4>
                            {renderPreview()}
                        </div>

                        {/* Chart Info */}
                        <div className="mt-4 p-4 bg-blue-50 border-2 border-black text-sm">
                            <div className="font-bold mb-2">Chart Details:</div>
                            <div>Type: {chartConfig.chartType}</div>
                            <div>Data points: {chartData.length}</div>
                            <div>Dimensions: {chartConfig.width}x{chartConfig.height}px</div>
                        </div>

                        {/* Insert Button */}
                        <button
                            onClick={handleInsert}
                            className="w-full mt-4 px-6 py-3 bg-black text-white border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-bold text-lg"
                        >
                            Insert Chart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
