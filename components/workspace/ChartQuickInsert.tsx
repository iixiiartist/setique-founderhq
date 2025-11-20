import React, { useState, useMemo, useEffect } from 'react';
import { X, TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Table as TableIcon, Palette, Settings, Plus, Trash2 } from 'lucide-react';
import { Editor } from '@tiptap/react';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { getTemplateConfig, type ChartTemplateName } from '../../lib/chartTemplates';
import { 
    getFinancialChartData,
    getExpenseChartData,
    getPipelineChartData,
    getGrowthChartData,
    getSampleChartData
} from '../../lib/chartDataConnectors';
import { DashboardData } from '../../types';
import { HexColorPicker } from 'react-colorful';

interface ChartQuickInsertProps {
    editor: Editor;
    onClose: () => void;
    data: DashboardData;
}

type ChartType = 'line' | 'bar' | 'pie' | 'area';

export const ChartQuickInsert: React.FC<ChartQuickInsertProps> = ({ editor, onClose, data }) => {
    const [mode, setMode] = useState<'template' | 'manual'>('template');
    const [selectedTemplate, setSelectedTemplate] = useState<ChartTemplateName>('revenueTrends');
    const [useRealData, setUseRealData] = useState(true);
    
    // Manual Mode State
    const [manualDataInput, setManualDataInput] = useState<string>('[\n  {"name": "Jan", "Revenue": 4000, "Expenses": 2400},\n  {"name": "Feb", "Revenue": 3000, "Expenses": 1398},\n  {"name": "Mar", "Revenue": 2000, "Expenses": 9800},\n  {"name": "Apr", "Revenue": 2780, "Expenses": 3908}\n]');
    const [manualChartType, setManualChartType] = useState<ChartType>('bar');
    const [manualTitle, setManualTitle] = useState('Monthly Performance');
    const [manualXKey, setManualXKey] = useState('name');
    const [manualDataKeys, setManualDataKeys] = useState<string[]>(['Revenue', 'Expenses']);
    const [manualColors, setManualColors] = useState<string[]>(['#000000', '#9ca3af', '#f59e0b', '#ef4444']);
    const [showColorPicker, setShowColorPicker] = useState<number | null>(null);

    // Get chart configuration for template mode
    const templateConfig = getTemplateConfig(selectedTemplate);

    // Get chart data based on template and data source selection
    const templateData = useMemo(() => {
        if (!useRealData) {
            return getSampleChartData(templateConfig.chartType);
        }

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
                return getSampleChartData(templateConfig.chartType);
        }
    }, [selectedTemplate, useRealData, data, templateConfig.chartType]);

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

    // Parse manual data
    const parsedManualData = useMemo(() => {
        try {
            const parsed = JSON.parse(manualDataInput);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }, [manualDataInput]);

    // Determine active config based on mode
    const activeConfig = mode === 'template' ? {
        ...templateConfig,
        data: templateData
    } : {
        chartType: manualChartType,
        title: manualTitle,
        data: parsedManualData,
        dataKeys: manualDataKeys,
        xAxisKey: manualXKey,
        colors: manualColors,
        width: 700,
        height: 350,
        showLegend: true,
        showGrid: true
    };

    const handleInsert = () => {
        editor.chain().focus().insertChart(activeConfig).run();
        onClose();
    };

    const renderPreview = () => {
        const commonProps = {
            width: 500,
            height: 300,
            data: activeConfig.data,
            margin: { top: 5, right: 30, left: 20, bottom: 5 }
        };

        if (activeConfig.data.length === 0) {
            return <div className="h-[300px] flex items-center justify-center text-gray-400">Invalid Data</div>;
        }

        switch (activeConfig.chartType) {
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey={activeConfig.xAxisKey} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend />
                            {activeConfig.dataKeys.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={activeConfig.colors[index % activeConfig.colors.length]}
                                    strokeWidth={2}
                                    dot={{ r: 4, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey={activeConfig.xAxisKey} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend />
                            {activeConfig.dataKeys.map((key, index) => (
                                <Bar 
                                    key={key} 
                                    dataKey={key} 
                                    fill={activeConfig.colors[index % activeConfig.colors.length]} 
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={activeConfig.data}
                                dataKey={activeConfig.dataKeys[0]}
                                nameKey={activeConfig.xAxisKey}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                label
                            >
                                {activeConfig.data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={activeConfig.colors[index % activeConfig.colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'area':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey={activeConfig.xAxisKey} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend />
                            {activeConfig.dataKeys.map((key, index) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    fill={activeConfig.colors[index % activeConfig.colors.length]}
                                    stroke={activeConfig.colors[index % activeConfig.colors.length]}
                                    fillOpacity={0.2}
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl">📊</div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Insert Chart</h2>
                            <p className="text-xs text-gray-500">Visualize your data</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar */}
                    <div className="w-full md:w-80 bg-gray-50 border-r border-gray-100 flex flex-col overflow-y-auto">
                        <div className="p-4">
                            <div className="flex p-1 bg-gray-200/50 rounded-xl mb-6">
                                <button
                                    onClick={() => setMode('template')}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'template' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Templates
                                </button>
                                <button
                                    onClick={() => setMode('manual')}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'manual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Manual Data
                                </button>
                            </div>

                            {mode === 'template' ? (
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Select Template</div>
                                    {templates.map((template) => {
                                        const Icon = template.icon;
                                        const isSelected = selectedTemplate === template.name;
                                        return (
                                            <button
                                                key={template.name}
                                                onClick={() => setSelectedTemplate(template.name)}
                                                className={`w-full p-3 rounded-xl text-left transition-all border ${
                                                    isSelected
                                                        ? 'bg-white border-gray-300 shadow-sm ring-1 ring-gray-200'
                                                        : 'bg-transparent border-transparent hover:bg-white hover:border-gray-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-500'}`}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{template.label}</div>
                                                        <div className="text-[11px] text-gray-400">{template.description}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}

                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Data Source</div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white cursor-pointer hover:border-gray-300 transition-colors">
                                                <input
                                                    type="radio"
                                                    checked={useRealData}
                                                    onChange={() => setUseRealData(true)}
                                                    disabled={!hasRealData}
                                                    className="w-4 h-4 text-black focus:ring-black"
                                                />
                                                <div className={!hasRealData ? 'opacity-50' : ''}>
                                                    <div className="text-sm font-semibold text-gray-900">Workspace Data</div>
                                                    <div className="text-[10px] text-gray-500">{!hasRealData ? 'No data available' : 'Use live data'}</div>
                                                </div>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white cursor-pointer hover:border-gray-300 transition-colors">
                                                <input
                                                    type="radio"
                                                    checked={!useRealData}
                                                    onChange={() => setUseRealData(false)}
                                                    className="w-4 h-4 text-black focus:ring-black"
                                                />
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">Sample Data</div>
                                                    <div className="text-[10px] text-gray-500">For preview/testing</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chart Title</label>
                                        <input 
                                            type="text" 
                                            value={manualTitle} 
                                            onChange={(e) => setManualTitle(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chart Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['line', 'bar', 'pie', 'area'] as ChartType[]).map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setManualChartType(type)}
                                                    className={`px-3 py-2 text-xs font-semibold rounded-lg border capitalize ${
                                                        manualChartType === type 
                                                            ? 'bg-gray-900 text-white border-gray-900' 
                                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                    }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data (JSON)</label>
                                        <textarea
                                            value={manualDataInput}
                                            onChange={(e) => setManualDataInput(e.target.value)}
                                            className="w-full h-40 px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                                            placeholder='[{"name": "A", "val": 10}, ...]'
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">X-Axis Key</label>
                                        <input 
                                            type="text" 
                                            value={manualXKey} 
                                            onChange={(e) => setManualXKey(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Keys (comma sep)</label>
                                        <input 
                                            type="text" 
                                            value={manualDataKeys.join(', ')} 
                                            onChange={(e) => setManualDataKeys(e.target.value.split(',').map(k => k.trim()))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Colors</label>
                                        <div className="flex flex-wrap gap-2">
                                            {manualColors.map((color, idx) => (
                                                <div key={idx} className="relative">
                                                    <button
                                                        onClick={() => setShowColorPicker(showColorPicker === idx ? null : idx)}
                                                        className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                    {showColorPicker === idx && (
                                                        <div className="absolute bottom-full left-0 mb-2 z-50">
                                                            <div className="fixed inset-0" onClick={() => setShowColorPicker(null)} />
                                                            <div className="relative z-50">
                                                                <HexColorPicker color={color} onChange={(newColor) => {
                                                                    const newColors = [...manualColors];
                                                                    newColors[idx] = newColor;
                                                                    setManualColors(newColors);
                                                                }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => setManualColors([...manualColors, '#000000'])}
                                                className="w-8 h-8 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 bg-white p-8 flex flex-col">
                        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-100 p-8 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                            <div className="w-full max-w-2xl relative z-10">
                                <h3 className="text-center font-bold text-gray-900 mb-6 text-lg">{activeConfig.title}</h3>
                                {renderPreview()}
                            </div>
                        </div>
                        
                        <div className="mt-6 flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                                <span className="font-semibold text-gray-900">{activeConfig.data.length}</span> data points • {activeConfig.chartType} chart
                            </div>
                            <button
                                onClick={handleInsert}
                                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-900/20 flex items-center gap-2"
                            >
                                <Plus size={16} /> Insert Chart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
