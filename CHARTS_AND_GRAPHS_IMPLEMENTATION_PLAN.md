# Charts & Graphs Implementation Plan

**Created:** November 14, 2025  
**Status:** Ready for Implementation  
**Priority:** HIGH - Enhances both AI and document editor capabilities

---

## Executive Summary

This plan adds **interactive charts and graphs** to both:
1. **GTM Document Editor** - Allow users to create/customize charts in documents
2. **AI Document Assistant** - Enable AI to generate charts based on workspace data

### Key Benefits
- 📊 **Visual Data Storytelling** - Charts in pitch decks, exec summaries, sales decks
- 🤖 **AI-Generated Charts** - AI can create revenue trends, funnel conversions, expense breakdowns
- 📈 **Data-Driven Documents** - Pull live data from CRM, financials, marketing
- 🎨 **Customizable** - Users can edit chart data, colors, labels after AI generation

---

## Current State Analysis

### Existing Chart Infrastructure

**✅ Already Using Recharts:**
```typescript
// components/FinancialsTab.tsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
```

**✅ Installed Dependencies:**
- `recharts` - Already in package.json
- Chart types available: LineChart, BarChart, PieChart, AreaChart, RadarChart

**✅ Existing Data Sources:**
1. **Financial Logs** - MRR, GMV, signups trends over time
2. **Expenses** - Category breakdown, monthly spending
3. **CRM** - Deal pipeline stages, lead sources, conversion funnel
4. **Marketing** - Campaign performance, content types
5. **Tasks** - Completion rates, team workload

### Current Tiptap Extensions (24)
- ✅ StarterKit, Table, TaskList, ResizableImage, Youtube
- ❌ No chart/graph extension

---

## Architecture Design

### 1. Tiptap Chart Extension

Create a custom Tiptap extension that embeds Recharts components.

#### Extension Structure
```typescript
// lib/tiptap/ChartNode.ts
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ChartNodeView } from './ChartNodeView';

export interface ChartAttributes {
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'radar';
  title: string;
  data: Array<Record<string, string | number>>;
  dataKeys: string[]; // Which fields to plot
  xAxisKey?: string; // For x-axis (dates, categories)
  colors?: string[]; // Custom colors
  width?: number;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

export const ChartNode = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      chartType: { default: 'line' },
      title: { default: '' },
      data: { default: [] },
      dataKeys: { default: [] },
      xAxisKey: { default: null },
      colors: { default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] },
      width: { default: 600 },
      height: { default: 300 },
      showLegend: { default: true },
      showGrid: { default: true },
    };
  },
  
  parseHTML() {
    return [{ tag: 'div[data-chart]' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-chart': '' }), 0];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
  
  addCommands() {
    return {
      insertChart: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
      updateChart: (attributes) => ({ commands }) => {
        return commands.updateAttributes(this.name, attributes);
      },
    };
  },
});
```

#### Chart Node View Component
```typescript
// lib/tiptap/ChartNodeView.tsx
import React, { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

export const ChartNodeView = ({ node, updateAttributes, deleteNode, selected }) => {
  const { chartType, title, data, dataKeys, xAxisKey, colors, width, height, showLegend, showGrid } = node.attrs;
  const [isEditing, setIsEditing] = useState(false);
  
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };
    
    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            {dataKeys.map((key, idx) => (
              <Line 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={colors[idx % colors.length]} 
                strokeWidth={2} 
              />
            ))}
          </LineChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            {dataKeys.map((key, idx) => (
              <Bar key={key} dataKey={key} fill={colors[idx % colors.length]} />
            ))}
          </BarChart>
        );
      
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKeys[0]}
              nameKey={xAxisKey || 'name'}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            {showLegend && <Legend />}
          </PieChart>
        );
      
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            {dataKeys.map((key, idx) => (
              <Area 
                key={key} 
                type="monotone" 
                dataKey={key} 
                fill={colors[idx % colors.length]}
                stroke={colors[idx % colors.length]}
              />
            ))}
          </AreaChart>
        );
      
      default:
        return <div>Unsupported chart type</div>;
    }
  };
  
  return (
    <NodeViewWrapper className={`chart-node-wrapper ${selected ? 'selected' : ''}`}>
      <div className="chart-container border-2 border-black p-4 bg-white" style={{ width, height: height + 60 }}>
        {title && <h3 className="text-center font-bold mb-2">{title}</h3>}
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
        
        {selected && (
          <div className="chart-controls mt-2 flex gap-2 justify-end">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="px-2 py-1 bg-blue-500 text-white text-xs border border-black"
            >
              ✏️ Edit
            </button>
            <button 
              onClick={() => deleteNode()}
              className="px-2 py-1 bg-red-500 text-white text-xs border border-black"
            >
              🗑️ Delete
            </button>
          </div>
        )}
        
        {isEditing && (
          <ChartEditor
            attributes={node.attrs}
            onSave={(newAttrs) => {
              updateAttributes(newAttrs);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
};
```

#### Chart Editor Modal
```typescript
// components/workspace/ChartEditor.tsx
export const ChartEditor = ({ attributes, onSave, onCancel }) => {
  const [form, setForm] = useState(attributes);
  const [dataInput, setDataInput] = useState(JSON.stringify(attributes.data, null, 2));
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border-4 border-black p-6 max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Edit Chart</h2>
        
        {/* Chart Type Selector */}
        <div className="mb-4">
          <label className="block font-bold mb-1">Chart Type</label>
          <select 
            value={form.chartType}
            onChange={(e) => setForm({ ...form, chartType: e.target.value })}
            className="w-full p-2 border-2 border-black"
          >
            <option value="line">📈 Line Chart</option>
            <option value="bar">📊 Bar Chart</option>
            <option value="pie">🥧 Pie Chart</option>
            <option value="area">📉 Area Chart</option>
          </select>
        </div>
        
        {/* Title */}
        <div className="mb-4">
          <label className="block font-bold mb-1">Title</label>
          <input 
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full p-2 border-2 border-black"
            placeholder="Revenue Trends Q1 2025"
          />
        </div>
        
        {/* Data Editor (JSON) */}
        <div className="mb-4">
          <label className="block font-bold mb-1">Data (JSON)</label>
          <textarea 
            value={dataInput}
            onChange={(e) => setDataInput(e.target.value)}
            className="w-full p-2 border-2 border-black font-mono text-sm h-48"
            placeholder='[{"month": "Jan", "revenue": 50000}, ...]'
          />
        </div>
        
        {/* Data Keys */}
        <div className="mb-4">
          <label className="block font-bold mb-1">Data Keys (comma-separated)</label>
          <input 
            type="text"
            value={form.dataKeys.join(',')}
            onChange={(e) => setForm({ ...form, dataKeys: e.target.value.split(',').map(k => k.trim()) })}
            className="w-full p-2 border-2 border-black"
            placeholder="revenue,expenses,profit"
          />
        </div>
        
        {/* X-Axis Key */}
        <div className="mb-4">
          <label className="block font-bold mb-1">X-Axis Key</label>
          <input 
            type="text"
            value={form.xAxisKey || ''}
            onChange={(e) => setForm({ ...form, xAxisKey: e.target.value })}
            className="w-full p-2 border-2 border-black"
            placeholder="month, date, category"
          />
        </div>
        
        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block font-bold mb-1">Width (px)</label>
            <input 
              type="number"
              value={form.width}
              onChange={(e) => setForm({ ...form, width: parseInt(e.target.value) })}
              className="w-full p-2 border-2 border-black"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">Height (px)</label>
            <input 
              type="number"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: parseInt(e.target.value) })}
              className="w-full p-2 border-2 border-black"
            />
          </div>
        </div>
        
        {/* Toggle Options */}
        <div className="mb-4 flex gap-4">
          <label className="flex items-center">
            <input 
              type="checkbox"
              checked={form.showLegend}
              onChange={(e) => setForm({ ...form, showLegend: e.target.checked })}
              className="mr-2"
            />
            Show Legend
          </label>
          <label className="flex items-center">
            <input 
              type="checkbox"
              checked={form.showGrid}
              onChange={(e) => setForm({ ...form, showGrid: e.target.checked })}
              className="mr-2"
            />
            Show Grid
          </label>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 border-2 border-black"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              try {
                const parsedData = JSON.parse(dataInput);
                onSave({ ...form, data: parsedData });
              } catch (e) {
                alert('Invalid JSON data');
              }
            }}
            className="px-4 py-2 bg-green-500 text-white border-2 border-black"
          >
            Save Chart
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### 2. AI Chart Generation

Enable AI to generate chart configurations based on workspace data.

#### AI Chart Commands

Add to `utils/aiPromptBuilder.ts`:
```typescript
export type AIAction = 
  | 'generate'
  | 'improve'
  // ... existing actions
  | 'generate_revenue_chart'
  | 'generate_expense_chart'
  | 'generate_pipeline_chart'
  | 'generate_conversion_funnel'
  | 'generate_growth_chart'
  | 'generate_custom_chart';
```

#### AI Prompt Extensions

```typescript
// In buildEmbeddedAIPrompt()
case 'generate_revenue_chart':
  prompt += `Generate a revenue trends chart using the financial data:

Financial Logs: ${JSON.stringify(context.financialLogs, null, 2)}

Create a line chart showing MRR and GMV over time. Return ONLY valid JSON:
{
  "chartType": "line",
  "title": "Revenue Trends",
  "data": [...],
  "dataKeys": ["mrr", "gmv"],
  "xAxisKey": "date",
  "colors": ["#3b82f6", "#10b981"]
}`;
  break;

case 'generate_expense_chart':
  prompt += `Generate an expense breakdown chart using the expense data:

Expenses: ${JSON.stringify(context.expenses, null, 2)}

Create a pie chart showing expenses by category. Return ONLY valid JSON:
{
  "chartType": "pie",
  "title": "Expense Breakdown",
  "data": [...],
  "dataKeys": ["amount"],
  "xAxisKey": "category",
  "colors": ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
}`;
  break;

case 'generate_pipeline_chart':
  prompt += `Generate a pipeline chart using CRM data:

CRM Items: ${JSON.stringify(context.crmItems, null, 2)}

Create a bar chart showing deal counts by stage. Return ONLY valid JSON:
{
  "chartType": "bar",
  "title": "Sales Pipeline",
  "data": [...],
  "dataKeys": ["count"],
  "xAxisKey": "stage",
  "colors": ["#3b82f6"]
}`;
  break;

case 'generate_custom_chart':
  prompt += `User wants a custom chart: "${customPrompt}"

Available data:
- Financial Logs: ${context.financialLogs.length} entries
- Expenses: ${context.expenses.length} entries
- CRM Items: ${context.crmItems.length} entries
- Marketing Campaigns: ${context.marketing.length} entries
- Tasks: ${context.tasks.length} entries

Analyze the request and generate appropriate chart configuration. Return ONLY valid JSON with chartType, title, data, dataKeys, xAxisKey, colors.`;
  break;
```

#### AI Command Palette Integration

Add to `components/workspace/AICommandPalette.tsx`:
```typescript
const CHART_COMMANDS = [
  { 
    id: 'generate_revenue_chart', 
    label: '📈 Revenue Trends Chart', 
    icon: '📈',
    description: 'Create a line chart of MRR and GMV over time'
  },
  { 
    id: 'generate_expense_chart', 
    label: '🥧 Expense Breakdown Chart', 
    icon: '🥧',
    description: 'Create a pie chart of expenses by category'
  },
  { 
    id: 'generate_pipeline_chart', 
    label: '📊 Sales Pipeline Chart', 
    icon: '📊',
    description: 'Create a bar chart of deals by stage'
  },
  { 
    id: 'generate_conversion_funnel', 
    label: '🎯 Conversion Funnel', 
    icon: '🎯',
    description: 'Create a funnel chart showing lead-to-customer conversion'
  },
  { 
    id: 'generate_growth_chart', 
    label: '📉 Growth Chart', 
    icon: '📉',
    description: 'Create an area chart showing growth metrics'
  },
  { 
    id: 'generate_custom_chart', 
    label: '✨ Custom Chart', 
    icon: '✨',
    description: 'Describe what chart you want and AI will create it'
  },
];

// Add to command sections
<div className="border-b-2 border-black">
  <div className="px-3 py-2 bg-gray-100 font-bold text-xs">CHARTS & GRAPHS</div>
  {CHART_COMMANDS.map(cmd => (
    <button
      key={cmd.id}
      onClick={() => handleCommand(cmd.id)}
      className="w-full px-3 py-2 text-left hover:bg-yellow-300 border-b border-gray-200"
    >
      <div className="flex items-center gap-2">
        <span>{cmd.icon}</span>
        <div className="flex-1">
          <div className="font-bold">{cmd.label}</div>
          <div className="text-xs text-gray-600">{cmd.description}</div>
        </div>
      </div>
    </button>
  ))}
</div>
```

#### AI Chart Insertion Handler

```typescript
// In AICommandPalette.tsx
const handleAIChartGeneration = async (action: AIAction) => {
  setIsProcessing(true);
  
  try {
    // Build prompt with workspace data
    const prompt = buildEmbeddedAIPrompt(
      action,
      docType,
      editor.getText(),
      null,
      context,
      action === 'generate_custom_chart' ? customPrompt : undefined
    );
    
    // Call AI
    const response = await sendAIRequest(prompt);
    
    // Parse AI response (should be JSON chart config)
    const chartConfig = JSON.parse(response);
    
    // Validate chart config
    if (!chartConfig.chartType || !chartConfig.data || !chartConfig.dataKeys) {
      throw new Error('Invalid chart configuration from AI');
    }
    
    // Insert chart into document
    editor.chain().focus().insertChart(chartConfig).run();
    
    setShowCommandPalette(false);
  } catch (error) {
    console.error('Chart generation failed:', error);
    alert('Failed to generate chart. Please try again.');
  } finally {
    setIsProcessing(false);
  }
};
```

---

### 3. Data Connectors

#### Financial Data Connector
```typescript
// lib/chartDataConnectors.ts
export const getFinancialChartData = (financialLogs: FinancialLog[]) => {
  return financialLogs
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(log => ({
      date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mrr: log.mrr,
      gmv: log.gmv,
      signups: log.signups,
    }));
};

export const getExpenseChartData = (expenses: Expense[]) => {
  const byCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(byCategory).map(([category, amount]) => ({
    category,
    amount,
  }));
};

export const getPipelineChartData = (crmItems: CrmItem[]) => {
  const byStage = crmItems.reduce((acc, item) => {
    acc[item.stage] = (acc[item.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(byStage).map(([stage, count]) => ({
    stage,
    count,
  }));
};

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
```

---

### 4. Chart Templates

Pre-built chart templates for common use cases.

```typescript
// lib/chartTemplates.ts
export const CHART_TEMPLATES = {
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
    dataKeys: ['count', 'value'],
    xAxisKey: 'stage',
    colors: ['#3b82f6', '#10b981'],
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
  conversionFunnel: {
    chartType: 'bar',
    title: 'Conversion Funnel',
    dataKeys: ['count'],
    xAxisKey: 'stage',
    colors: ['#3b82f6'],
    showLegend: false,
    showGrid: true,
    width: 600,
    height: 350,
  },
};

export const applyTemplate = (templateName: keyof typeof CHART_TEMPLATES, data: any[]) => {
  return {
    ...CHART_TEMPLATES[templateName],
    data,
  };
};
```

---

## UI Integration

### 1. DocEditor Toolbar

Add chart button to format menu:
```typescript
// In DocEditor.tsx toolbar
<div className="border-b-2 border-black p-2">
  <div className="text-xs font-bold mb-2 text-gray-600">CHARTS & GRAPHS</div>
  <button 
    onClick={() => setShowChartMenu(!showChartMenu)}
    className="w-full px-3 py-2 text-left font-bold border-2 border-black bg-white hover:bg-gray-100"
  >
    📊 Insert Chart
  </button>
  
  {showChartMenu && (
    <div className="mt-2 flex flex-col gap-1">
      <button onClick={() => insertChartTemplate('revenueTrends')} className="px-2 py-1 text-sm text-left hover:bg-yellow-300">
        📈 Revenue Trends
      </button>
      <button onClick={() => insertChartTemplate('expenseBreakdown')} className="px-2 py-1 text-sm text-left hover:bg-yellow-300">
        🥧 Expense Breakdown
      </button>
      <button onClick={() => insertChartTemplate('salesPipeline')} className="px-2 py-1 text-sm text-left hover:bg-yellow-300">
        📊 Sales Pipeline
      </button>
      <button onClick={() => insertChartTemplate('growthMetrics')} className="px-2 py-1 text-sm text-left hover:bg-yellow-300">
        📉 Growth Metrics
      </button>
      <button onClick={() => setShowCustomChartModal(true)} className="px-2 py-1 text-sm text-left hover:bg-yellow-300">
        ✨ Custom Chart
      </button>
    </div>
  )}
</div>
```

### 2. Chart Quick Insert Modal

```typescript
// components/workspace/ChartQuickInsert.tsx
export const ChartQuickInsert = ({ onInsert, onClose, context }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('revenueTrends');
  
  const templates = [
    { id: 'revenueTrends', name: 'Revenue Trends', icon: '📈', preview: '...' },
    { id: 'expenseBreakdown', name: 'Expense Breakdown', icon: '🥧', preview: '...' },
    { id: 'salesPipeline', name: 'Sales Pipeline', icon: '📊', preview: '...' },
    { id: 'growthMetrics', name: 'Growth Metrics', icon: '📉', preview: '...' },
  ];
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border-4 border-black p-6 max-w-4xl">
        <h2 className="text-2xl font-bold mb-4">Insert Chart</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`p-4 border-2 border-black ${selectedTemplate === template.id ? 'bg-yellow-300' : 'bg-white'}`}
            >
              <div className="text-4xl mb-2">{template.icon}</div>
              <div className="font-bold">{template.name}</div>
            </button>
          ))}
        </div>
        
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 border-2 border-black">
            Cancel
          </button>
          <button 
            onClick={() => {
              const chart = createChartFromTemplate(selectedTemplate, context);
              onInsert(chart);
            }}
            className="px-4 py-2 bg-green-500 text-white border-2 border-black"
          >
            Insert Chart
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## Implementation Phases

### Phase 1: Core Chart Extension (6-8 hours)
**Priority:** HIGH  
**Files:**
- [ ] Create `lib/tiptap/ChartNode.ts` - Tiptap chart extension
- [ ] Create `lib/tiptap/ChartNodeView.tsx` - React chart renderer
- [ ] Create `components/workspace/ChartEditor.tsx` - Chart editing modal
- [ ] Update `components/workspace/DocEditor.tsx` - Add ChartNode to extensions
- [ ] Test: Insert chart manually, edit data, delete

**Deliverable:** Users can manually insert and edit charts in documents

---

### Phase 2: Chart Templates & Quick Insert (4-6 hours)
**Priority:** HIGH  
**Files:**
- [ ] Create `lib/chartTemplates.ts` - Pre-built chart configs
- [ ] Create `lib/chartDataConnectors.ts` - Data transformation helpers
- [ ] Create `components/workspace/ChartQuickInsert.tsx` - Template picker modal
- [ ] Update `DocEditor.tsx` toolbar - Add chart button with dropdown
- [ ] Test: Insert revenue chart, expense chart, pipeline chart

**Deliverable:** Users can quickly insert charts with live workspace data

---

### Phase 3: AI Chart Generation (8-10 hours)
**Priority:** HIGH  
**Files:**
- [ ] Update `utils/aiPromptBuilder.ts` - Add chart generation actions
- [ ] Update `components/workspace/AICommandPalette.tsx` - Add chart commands
- [ ] Update `hooks/useAIWorkspaceContext.ts` - Include financial/CRM data
- [ ] Add AI response parser for JSON chart configs
- [ ] Test: AI generates revenue chart, expense chart, custom chart

**Deliverable:** AI can generate charts based on user requests

---

### Phase 4: Export Support (2-3 hours)
**Priority:** MEDIUM  
**Files:**
- [ ] Update `lib/services/documentExport.ts` - Handle chart exports
  - PDF: Convert chart to image using html-to-image
  - HTML: Embed chart as SVG or base64 image
  - Markdown: Convert to table or link to chart image
- [ ] Test: Export document with charts to all formats

**Deliverable:** Charts export correctly in PDF, HTML, Markdown

---

### Phase 5: Enhanced Chart Types (4-6 hours)
**Priority:** LOW (Future Enhancement)  
**Optional Additions:**
- [ ] Radar charts for competitor analysis
- [ ] Stacked bar charts for multi-series comparisons
- [ ] Combo charts (line + bar)
- [ ] Gauge charts for KPIs
- [ ] Heatmaps for time-series data

---

## Testing Plan

### Unit Tests
- [ ] ChartNode parses and renders correctly
- [ ] ChartEditor validates JSON data
- [ ] Data connectors transform data correctly
- [ ] Chart templates apply properly

### Integration Tests
- [ ] Insert chart via toolbar
- [ ] Edit chart data and see changes
- [ ] Delete chart from document
- [ ] AI generates valid chart JSON
- [ ] AI inserts chart at cursor position
- [ ] Charts export to PDF/HTML/Markdown
- [ ] Charts render on document load

### User Acceptance Tests
- [ ] User creates revenue trends chart from financial data
- [ ] User edits chart colors and title
- [ ] AI generates expense breakdown pie chart
- [ ] User exports document with charts to PDF
- [ ] Charts display correctly in print layout

---

## Database Schema (No Changes Needed)

**✅ No new tables required**  
Charts are stored as JSON in existing `gtm_docs` table:
```sql
gtm_docs.content_json: JSONB
-- Contains Tiptap document with chart nodes
-- Chart data embedded in node attributes
```

---

## Dependencies

### New Packages (None)
**✅ All dependencies already installed:**
- `recharts` - Already in package.json for FinancialsTab
- `@tiptap/react`, `@tiptap/core` - Already installed
- `html-to-image` - Already installed for exports

### Existing Packages to Leverage
- `react` v19
- `typescript` v5.x
- `tailwindcss` v3.x

---

## AI System Prompt Updates

Add to `components/workspace/AICommandPalette.tsx` system prompt:
```typescript
**Chart Generation Capabilities:**
You can generate interactive charts and graphs in documents using workspace data:

Available Chart Types:
- Line Chart: For trends over time (revenue, signups, growth)
- Bar Chart: For comparisons (pipeline stages, categories)
- Pie Chart: For proportions (expense breakdown, lead sources)
- Area Chart: For cumulative trends (growth metrics)

Available Data Sources:
- Financial Logs: MRR, GMV, signups by date
- Expenses: Amount, category, date
- CRM Items: Stage, value, lead source
- Marketing: Campaign types, status, performance
- Tasks: Status, category, completion rate

When user requests a chart:
1. Analyze which data source to use
2. Transform data into chart format
3. Return ONLY valid JSON with: chartType, title, data, dataKeys, xAxisKey, colors
4. Ensure data array has consistent structure
5. Use descriptive labels for xAxisKey

Example Chart JSON:
{
  "chartType": "line",
  "title": "Revenue Trends Q1 2025",
  "data": [
    {"month": "Jan", "mrr": 50000, "gmv": 120000},
    {"month": "Feb", "mrr": 55000, "gmv": 135000},
    {"month": "Mar", "mrr": 62000, "gmv": 155000}
  ],
  "dataKeys": ["mrr", "gmv"],
  "xAxisKey": "month",
  "colors": ["#3b82f6", "#10b981"],
  "showLegend": true,
  "showGrid": true,
  "width": 700,
  "height": 350
}
```

---

## Documentation Updates

Update `EDITOR_FEATURES_GUIDE.md`:
```markdown
## Charts & Graphs

### Manual Chart Insertion
1. Click **📊 Insert Chart** in format menu
2. Select chart template or create custom
3. Chart appears with sample data
4. Click chart → **✏️ Edit** to customize

### Chart Editor
- **Chart Type:** Line, Bar, Pie, Area
- **Title:** Custom chart title
- **Data:** Edit JSON data directly
- **Data Keys:** Which fields to plot (e.g., "mrr,gmv")
- **X-Axis Key:** Category or date field
- **Dimensions:** Width and height in pixels
- **Options:** Show legend, show grid

### AI Chart Generation
1. Press **Cmd/Ctrl+K** to open AI assistant
2. Select chart command:
   - 📈 Revenue Trends Chart
   - 🥧 Expense Breakdown Chart
   - 📊 Sales Pipeline Chart
   - ✨ Custom Chart (describe what you want)
3. AI analyzes workspace data
4. Chart inserted at cursor position

### Chart Templates
- **Revenue Trends:** Line chart of MRR and GMV over time
- **Expense Breakdown:** Pie chart by category
- **Sales Pipeline:** Bar chart by stage
- **Growth Metrics:** Area chart of signups, customers, revenue
- **Conversion Funnel:** Bar chart of lead-to-customer flow

### Exporting Charts
- **PDF:** Charts exported as images
- **HTML:** Charts embedded as SVG
- **Markdown:** Charts converted to tables

### Keyboard Shortcuts
- **Click chart** → Select
- **Delete key** → Delete chart
- **Click ✏️** → Edit chart

---
```

---

## Success Metrics

### User Adoption
- 30%+ of pitch decks include charts by Week 2
- 50%+ of sales decks include charts by Week 4
- 20%+ of users use AI chart generation by Week 6

### AI Performance
- 90%+ of AI chart requests generate valid JSON
- 80%+ of AI-generated charts require no manual editing
- Average AI chart generation time < 3 seconds

### Technical Quality
- Zero TypeScript errors
- Charts render in < 500ms
- Export to PDF preserves chart quality

---

## Risk Mitigation

### Risk 1: AI Generates Invalid JSON
**Mitigation:**
- Add JSON schema validation
- Retry with corrected prompt if parsing fails
- Provide manual chart editor fallback

### Risk 2: Large Data Sets Slow Chart Rendering
**Mitigation:**
- Limit chart data to 100 points max
- Aggregate data if needed (monthly instead of daily)
- Use useMemo to cache chart rendering

### Risk 3: Charts Don't Export Well to PDF
**Mitigation:**
- Use html-to-image to convert charts to PNG
- Test export quality at 300 DPI
- Provide "Export Chart as Image" option

---

## Future Enhancements

### Phase 6: Advanced Features (Post-MVP)
- [ ] **Live Data Charts** - Charts auto-update when workspace data changes
- [ ] **Chart Animations** - Animate chart on load for presentations
- [ ] **Interactive Charts** - Hover tooltips, click-to-drill-down
- [ ] **Chart Themes** - Pre-styled color schemes (professional, vibrant, minimal)
- [ ] **Multi-Chart Dashboards** - Insert 2x2 grid of charts
- [ ] **Chart Templates Library** - 20+ pre-built templates
- [ ] **Export Chart as Image** - Download chart separately as PNG/SVG
- [ ] **Chart Collaboration** - Comments on specific data points

---

## Summary

**What We're Building:**
1. ✅ Tiptap chart extension with Recharts
2. ✅ Chart editor modal for customization
3. ✅ Chart templates with live workspace data
4. ✅ AI chart generation from natural language
5. ✅ Export charts to PDF/HTML/Markdown

**Why This Matters:**
- 📊 **Visual Storytelling** - Charts make data compelling
- 🤖 **AI-Powered** - Users don't need to build charts from scratch
- 📈 **Data-Driven** - Pull live data from CRM, financials, marketing
- 🎨 **Customizable** - Users can edit and refine AI-generated charts

**Technical Complexity:** **MEDIUM-HIGH**
- Tiptap extension development: **MEDIUM**
- Recharts integration: **LOW** (already using it)
- AI JSON generation/parsing: **MEDIUM-HIGH**
- Export handling: **MEDIUM**

**Estimated Timeline:** 24-32 hours total
- Phase 1 (Core): 6-8 hours
- Phase 2 (Templates): 4-6 hours
- Phase 3 (AI): 8-10 hours
- Phase 4 (Export): 2-3 hours
- Testing & Polish: 4-5 hours

**Next Steps:**
1. Review and approve plan
2. Start Phase 1: Create ChartNode extension
3. Test with sample data
4. Move to Phase 2 and 3 in parallel

---

**Status:** ✅ Ready for Implementation  
**Last Updated:** November 14, 2025  
**Document Version:** 1.0
