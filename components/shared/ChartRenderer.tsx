import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Maximize2, Minimize2, Copy, Download, FileText } from 'lucide-react';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';

interface ChartData {
  type: 'bar' | 'pie' | 'line' | 'area';
  title?: string;
  data: any[];
  dataKey: string; // The key for the value to plot
  nameKey?: string; // The key for the label (x-axis or pie slice name)
  colors?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

interface ChartRendererProps {
  config: ChartData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const ChartRenderer: React.FC<ChartRendererProps> = ({ config }) => {
  const { type, title, data, dataKey, nameKey = 'name', colors = COLORS, xAxisLabel, yAxisLabel } = config;
  const [isExpanded, setIsExpanded] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    if (chartRef.current) {
      try {
        const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: 'white' });
        const blob = await (await fetch(dataUrl)).blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        toast.success('Chart copied to clipboard');
      } catch (err) {
        console.error('Failed to copy chart', err);
        toast.error('Failed to copy chart');
      }
    }
  };

  const handleDownload = async () => {
    if (chartRef.current) {
      try {
        const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: 'white' });
        const link = document.createElement('a');
        link.download = `${title || 'chart'}.png`;
        link.href = dataUrl;
        link.click();
        toast.success('Chart downloaded');
      } catch (err) {
        console.error('Failed to download chart', err);
        toast.error('Failed to download chart');
      }
    }
  };

  const handleSaveToDocs = async () => {
    // For now, we'll copy to clipboard and inform the user
    // In a full implementation, this would create a file in the library
    await handleCopy();
    toast.success('Chart copied! Paste it into the Document Editor.');
  };

  const renderChart = (height: number | string = 300) => {
    const ChartComponent = (
      <ResponsiveContainer width="100%" height={height as any}>
        {(() => {
          switch (type) {
            case 'bar':
              return (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={nameKey} label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined} />
                  <YAxis label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={dataKey} fill={colors[0]} />
                </BarChart>
              );
            case 'pie':
              return (
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={isExpanded ? 200 : 80}
                    fill="#8884d8"
                    dataKey={dataKey}
                    nameKey={nameKey}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              );
            case 'line':
              return (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={nameKey} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={dataKey} stroke={colors[0]} activeDot={{ r: 8 }} />
                </LineChart>
              );
            case 'area':
              return (
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={nameKey} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey={dataKey} stroke={colors[0]} fill={colors[0]} />
                </AreaChart>
              );
            default:
              return <div>Unsupported chart type</div>;
          }
        })()}
      </ResponsiveContainer>
    );

    return ChartComponent;
  };

  const Toolbar = () => (
    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-md shadow-sm backdrop-blur-sm z-10">
      <button
        onClick={handleSaveToDocs}
        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors"
        title="Save to Docs (Copy)"
      >
        <FileText size={16} />
      </button>
      <button
        onClick={handleCopy}
        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors"
        title="Copy to Clipboard"
      >
        <Copy size={16} />
      </button>
      <button
        onClick={handleDownload}
        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors"
        title="Download PNG"
      >
        <Download size={16} />
      </button>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors"
        title={isExpanded ? "Minimize" : "Expand"}
      >
        {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  );

  const ExpandedView = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-8">
      <div 
        ref={chartRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] p-6 relative flex flex-col"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSaveToDocs}
              className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-2"
            >
              <FileText size={20} />
              <span className="text-sm font-medium">Save to Docs</span>
            </button>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-2"
            >
              <Copy size={20} />
              <span className="text-sm font-medium">Copy</span>
            </button>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-2"
            >
              <Download size={20} />
              <span className="text-sm font-medium">Download</span>
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-red-600 transition-colors"
            >
              <Minimize2 size={24} />
            </button>
          </div>
        </div>
        <div className="flex-1 w-full min-h-0">
          {renderChart("100%")}
        </div>
      </div>
    </div>
  );

  if (isExpanded) {
    return createPortal(<ExpandedView />, document.body);
  }

  return (
    <div 
      ref={chartRef}
      className="group relative bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all my-4"
    >
      {title && <h4 className="text-sm font-semibold text-gray-700 mb-4 text-center">{title}</h4>}
      <Toolbar />
      {renderChart(300)}
    </div>
  );
};

