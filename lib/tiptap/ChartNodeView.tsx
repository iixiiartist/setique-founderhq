import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const ChartNodeView: React.FC<NodeViewProps> = ({ 
  node, 
  updateAttributes, 
  deleteNode, 
  selected 
}) => {
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
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
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
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
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
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
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
        return <div className="p-4 text-center text-gray-500">Unsupported chart type</div>;
    }
  };
  
  return (
    <NodeViewWrapper className={`chart-node-wrapper ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <div 
        className="chart-container border-2 border-black p-4 bg-white my-4" 
        style={{ width: width || '100%', minHeight: height + 60 }}
      >
        {title && <h3 className="text-center font-bold mb-2 text-lg">{title}</h3>}
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
        
        {selected && (
          <div className="chart-controls mt-2 flex gap-2 justify-end border-t-2 border-gray-200 pt-2">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1 bg-blue-500 text-white text-xs border-2 border-black hover:bg-blue-600"
              title="Edit chart"
            >
              ✏️ Edit
            </button>
            <button 
              onClick={() => {
                if (confirm('Delete this chart?')) {
                  deleteNode();
                }
              }}
              className="px-3 py-1 bg-red-500 text-white text-xs border-2 border-black hover:bg-red-600"
              title="Delete chart"
            >
              🗑️ Delete
            </button>
          </div>
        )}
        
        {isEditing && (
          <div className="mt-4 p-4 bg-gray-50 border-2 border-black">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Edit Mode:</strong> Use the chart editor modal to customize this chart. 
              <button 
                onClick={() => setIsEditing(false)}
                className="ml-2 text-blue-600 underline"
              >
                Close
              </button>
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Type:</strong> {chartType}</div>
              <div><strong>Data Points:</strong> {data.length}</div>
              <div><strong>Keys:</strong> {dataKeys.join(', ')}</div>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default ChartNodeView;
