import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ChartNodeView from './ChartNodeView';

export interface ChartAttributes {
  chartType: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: Array<Record<string, string | number>>;
  dataKeys: string[];
  xAxisKey?: string;
  colors?: string[];
  width?: number;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chart: {
      insertChart: (attributes: Partial<ChartAttributes>) => ReturnType;
      updateChart: (attributes: Partial<ChartAttributes>) => ReturnType;
    };
  }
}

const ChartNode = Node.create<{}>({
  name: 'chart',
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      chartType: {
        default: 'line',
      },
      title: {
        default: '',
      },
      data: {
        default: [],
      },
      dataKeys: {
        default: [],
      },
      xAxisKey: {
        default: null,
      },
      colors: {
        default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      },
      width: {
        default: 600,
      },
      height: {
        default: 300,
      },
      showLegend: {
        default: true,
      },
      showGrid: {
        default: true,
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-chart]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-chart': '' }), 0];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
  
  addCommands() {
    return {
      insertChart: (attributes: Partial<ChartAttributes>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
      updateChart: (attributes: Partial<ChartAttributes>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attributes);
      },
    };
  },
});

export default ChartNode;
