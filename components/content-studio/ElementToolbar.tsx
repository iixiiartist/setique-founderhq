/**
 * Element Toolbar Component
 * Add shapes, text, media, and GTM-specific blocks to canvas
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fabric } from 'fabric';
import {
  MousePointer,
  Hand,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  ArrowRight,
  Image,
  Upload,
  Video,
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Quote,
  Users,
  TrendingUp,
  Layout,
  Layers,
  Star,
  Target,
  Zap,
  Award,
  Clock,
  CheckCircle,
  Grid3X3,
  Sparkles,
  Plus,
  ChevronDown,
  Heading1,
  Heading2,
  AlignLeft,
  FileText,
} from 'lucide-react';
import { useContentStudio } from './ContentStudioContext';
import { Button } from '../ui/Button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/Popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/Tooltip';
import { v4 as uuidv4 } from 'uuid';

interface ElementToolbarProps {
  className?: string;
}

interface ToolCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: ToolItem[];
}

interface ToolItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  action: () => void;
}

export function ElementToolbar({ className = '' }: ElementToolbarProps) {
  const { state, setActiveTool, addObject, canvasRef, toggleAIPanel } = useContentStudio();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Helper to create text objects
  const createText = useCallback((text: string, options: Partial<fabric.ITextOptions>) => {
    return new fabric.IText(text, {
      left: 100,
      top: 100,
      fontFamily: 'Inter',
      fill: '#1f2937',
      ...options,
    });
  }, []);

  // Helper to create shapes
  const createShape = useCallback((type: string) => {
    const defaultOptions = {
      left: 100,
      top: 100,
      fill: '#6366f1',
      stroke: '',
      strokeWidth: 0,
    };

    switch (type) {
      case 'rectangle':
        return new fabric.Rect({
          ...defaultOptions,
          width: 200,
          height: 150,
          rx: 8,
          ry: 8,
        });
      case 'circle':
        return new fabric.Circle({
          ...defaultOptions,
          radius: 75,
        });
      case 'triangle':
        return new fabric.Triangle({
          ...defaultOptions,
          width: 150,
          height: 130,
        });
      case 'line':
        return new fabric.Line([0, 0, 200, 0], {
          ...defaultOptions,
          stroke: '#1f2937',
          strokeWidth: 2,
          fill: '',
        });
      case 'arrow':
        // Create arrow as a group
        const line = new fabric.Line([0, 0, 150, 0], {
          stroke: '#1f2937',
          strokeWidth: 2,
        });
        const head = new fabric.Triangle({
          width: 15,
          height: 20,
          fill: '#1f2937',
          left: 150,
          top: -10,
          angle: 90,
        });
        return new fabric.Group([line, head], {
          left: 100,
          top: 100,
        });
      default:
        return new fabric.Rect(defaultOptions);
    }
  }, []);

  // Create metric card as a group
  const createMetricCard = useCallback(() => {
    const bg = new fabric.Rect({
      width: 200,
      height: 100,
      fill: '#ffffff',
      rx: 12,
      ry: 12,
      stroke: '#e5e7eb',
      strokeWidth: 1,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.1)',
        blur: 10,
        offsetX: 0,
        offsetY: 4,
      }),
    });

    const value = new fabric.IText('$125K', {
      left: 20,
      top: 20,
      fontSize: 32,
      fontWeight: 'bold',
      fontFamily: 'Inter',
      fill: '#1f2937',
    });

    const label = new fabric.IText('Revenue', {
      left: 20,
      top: 60,
      fontSize: 14,
      fontFamily: 'Inter',
      fill: '#6b7280',
    });

    const change = new fabric.IText('+12.5%', {
      left: 140,
      top: 25,
      fontSize: 14,
      fontFamily: 'Inter',
      fill: '#10b981',
    });

    const group = new fabric.Group([bg, value, label, change], {
      left: 100,
      top: 100,
    });
    (group as any).elementType = 'metric-card';
    (group as any).name = 'Metric Card';
    return group;
  }, []);

  // Create testimonial card
  const createTestimonialCard = useCallback(() => {
    const bg = new fabric.Rect({
      width: 400,
      height: 180,
      fill: '#f9fafb',
      rx: 16,
      ry: 16,
      stroke: '#e5e7eb',
      strokeWidth: 1,
    });

    const quote = new fabric.IText('"This product transformed our workflow. Highly recommended!"', {
      left: 20,
      top: 20,
      fontSize: 16,
      fontFamily: 'Inter',
      fill: '#374151',
      width: 360,
    });

    const avatar = new fabric.Circle({
      radius: 20,
      fill: '#6366f1',
      left: 20,
      top: 120,
    });

    const name = new fabric.IText('Jane Smith', {
      left: 70,
      top: 115,
      fontSize: 14,
      fontWeight: 'bold',
      fontFamily: 'Inter',
      fill: '#1f2937',
    });

    const title = new fabric.IText('CEO, TechCorp', {
      left: 70,
      top: 135,
      fontSize: 12,
      fontFamily: 'Inter',
      fill: '#6b7280',
    });

    const group = new fabric.Group([bg, quote, avatar, name, title], {
      left: 100,
      top: 100,
    });
    (group as any).elementType = 'testimonial';
    (group as any).name = 'Testimonial';
    return group;
  }, []);

  // Create CTA block
  const createCTABlock = useCallback(() => {
    const bg = new fabric.Rect({
      width: 500,
      height: 120,
      fill: '#6366f1',
      rx: 12,
      ry: 12,
    });

    const headline = new fabric.IText('Ready to get started?', {
      left: 30,
      top: 25,
      fontSize: 24,
      fontWeight: 'bold',
      fontFamily: 'Inter',
      fill: '#ffffff',
    });

    const subheadline = new fabric.IText('Join thousands of satisfied customers today.', {
      left: 30,
      top: 55,
      fontSize: 14,
      fontFamily: 'Inter',
      fill: 'rgba(255,255,255,0.8)',
    });

    const button = new fabric.Rect({
      width: 120,
      height: 40,
      fill: '#ffffff',
      rx: 8,
      ry: 8,
      left: 350,
      top: 35,
    });

    const buttonText = new fabric.IText('Get Started', {
      left: 370,
      top: 45,
      fontSize: 14,
      fontWeight: 'bold',
      fontFamily: 'Inter',
      fill: '#6366f1',
    });

    const group = new fabric.Group([bg, headline, subheadline, button, buttonText], {
      left: 100,
      top: 100,
    });
    (group as any).elementType = 'cta-block';
    (group as any).name = 'CTA Block';
    return group;
  }, []);

  // Create stats row
  const createStatsRow = useCallback(() => {
    const items = [
      { value: '99%', label: 'Uptime' },
      { value: '24/7', label: 'Support' },
      { value: '10K+', label: 'Customers' },
    ];

    const elements: fabric.Object[] = [];

    items.forEach((item, index) => {
      const value = new fabric.IText(item.value, {
        left: index * 150,
        top: 0,
        fontSize: 36,
        fontWeight: 'bold',
        fontFamily: 'Inter',
        fill: '#1f2937',
      });

      const label = new fabric.IText(item.label, {
        left: index * 150,
        top: 45,
        fontSize: 14,
        fontFamily: 'Inter',
        fill: '#6b7280',
      });

      elements.push(value, label);
    });

    const group = new fabric.Group(elements, {
      left: 100,
      top: 100,
    });
    (group as any).elementType = 'stats-row';
    (group as any).name = 'Stats Row';
    return group;
  }, []);

  // Create feature grid item
  const createFeatureCard = useCallback(() => {
    const bg = new fabric.Rect({
      width: 250,
      height: 150,
      fill: '#ffffff',
      rx: 12,
      ry: 12,
      stroke: '#e5e7eb',
      strokeWidth: 1,
    });

    const iconBg = new fabric.Circle({
      radius: 20,
      fill: '#ede9fe',
      left: 20,
      top: 20,
    });

    const title = new fabric.IText('Feature Title', {
      left: 20,
      top: 75,
      fontSize: 16,
      fontWeight: 'bold',
      fontFamily: 'Inter',
      fill: '#1f2937',
    });

    const description = new fabric.IText('Brief description of this amazing feature goes here.', {
      left: 20,
      top: 100,
      fontSize: 12,
      fontFamily: 'Inter',
      fill: '#6b7280',
      width: 210,
    });

    const group = new fabric.Group([bg, iconBg, title, description], {
      left: 100,
      top: 100,
    });
    (group as any).elementType = 'feature-grid';
    (group as any).name = 'Feature Card';
    return group;
  }, []);

  // Tool categories
  const categories: ToolCategory[] = [
    {
      id: 'text',
      label: 'Text',
      icon: <Type className="w-5 h-5" />,
      items: [
        {
          id: 'heading',
          label: 'Heading',
          icon: <Heading1 className="w-4 h-4" />,
          description: 'Large heading text',
          action: () => {
            const text = createText('Heading', {
              fontSize: 48,
              fontWeight: 'bold',
            });
            (text as any).elementType = 'heading';
            (text as any).name = 'Heading';
            addObject(text);
          },
        },
        {
          id: 'subheading',
          label: 'Subheading',
          icon: <Heading2 className="w-4 h-4" />,
          description: 'Medium subheading',
          action: () => {
            const text = createText('Subheading', {
              fontSize: 28,
              fontWeight: '600',
            });
            (text as any).elementType = 'subheading';
            (text as any).name = 'Subheading';
            addObject(text);
          },
        },
        {
          id: 'body',
          label: 'Body Text',
          icon: <AlignLeft className="w-4 h-4" />,
          description: 'Paragraph text',
          action: () => {
            const text = createText('Add your body text here. Click to edit.', {
              fontSize: 16,
            });
            (text as any).elementType = 'body-text';
            (text as any).name = 'Body Text';
            addObject(text);
          },
        },
        {
          id: 'caption',
          label: 'Caption',
          icon: <FileText className="w-4 h-4" />,
          description: 'Small caption text',
          action: () => {
            const text = createText('Caption text', {
              fontSize: 12,
              fill: '#6b7280',
            });
            (text as any).elementType = 'caption';
            (text as any).name = 'Caption';
            addObject(text);
          },
        },
      ],
    },
    {
      id: 'shapes',
      label: 'Shapes',
      icon: <Square className="w-5 h-5" />,
      items: [
        {
          id: 'rectangle',
          label: 'Rectangle',
          icon: <Square className="w-4 h-4" />,
          action: () => {
            const shape = createShape('rectangle');
            (shape as any).name = 'Rectangle';
            addObject(shape);
          },
        },
        {
          id: 'circle',
          label: 'Circle',
          icon: <Circle className="w-4 h-4" />,
          action: () => {
            const shape = createShape('circle');
            (shape as any).name = 'Circle';
            addObject(shape);
          },
        },
        {
          id: 'triangle',
          label: 'Triangle',
          icon: <Triangle className="w-4 h-4" />,
          action: () => {
            const shape = createShape('triangle');
            (shape as any).name = 'Triangle';
            addObject(shape);
          },
        },
        {
          id: 'line',
          label: 'Line',
          icon: <Minus className="w-4 h-4" />,
          action: () => {
            const shape = createShape('line');
            (shape as any).name = 'Line';
            addObject(shape);
          },
        },
        {
          id: 'arrow',
          label: 'Arrow',
          icon: <ArrowRight className="w-4 h-4" />,
          action: () => {
            const shape = createShape('arrow');
            (shape as any).name = 'Arrow';
            addObject(shape);
          },
        },
      ],
    },
    {
      id: 'media',
      label: 'Media',
      icon: <Image className="w-5 h-5" />,
      items: [
        {
          id: 'upload-image',
          label: 'Upload Image',
          icon: <Upload className="w-4 h-4" />,
          description: 'Upload from your device',
          action: () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  fabric.Image.fromURL(event.target?.result as string, (img) => {
                    // Scale to reasonable size
                    const maxSize = 400;
                    const scale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1), 1);
                    img.scale(scale);
                    img.set({ left: 100, top: 100 });
                    (img as any).name = file.name;
                    addObject(img);
                  });
                };
                reader.readAsDataURL(file);
              }
            };
            input.click();
          },
        },
        {
          id: 'placeholder-image',
          label: 'Placeholder',
          icon: <Image className="w-4 h-4" />,
          description: 'Image placeholder',
          action: () => {
            const rect = new fabric.Rect({
              width: 300,
              height: 200,
              fill: '#f3f4f6',
              rx: 8,
              ry: 8,
              left: 100,
              top: 100,
            });
            const icon = new fabric.IText('📷', {
              fontSize: 40,
              left: 230,
              top: 175,
            });
            const group = new fabric.Group([rect, icon], {
              left: 100,
              top: 100,
            });
            (group as any).name = 'Image Placeholder';
            addObject(group);
          },
        },
      ],
    },
    {
      id: 'gtm',
      label: 'GTM Blocks',
      icon: <Layout className="w-5 h-5" />,
      items: [
        {
          id: 'metric-card',
          label: 'Metric Card',
          icon: <TrendingUp className="w-4 h-4" />,
          description: 'Display key metrics',
          action: () => addObject(createMetricCard()),
        },
        {
          id: 'testimonial',
          label: 'Testimonial',
          icon: <Quote className="w-4 h-4" />,
          description: 'Customer quote card',
          action: () => addObject(createTestimonialCard()),
        },
        {
          id: 'cta',
          label: 'CTA Block',
          icon: <Target className="w-4 h-4" />,
          description: 'Call-to-action section',
          action: () => addObject(createCTABlock()),
        },
        {
          id: 'stats',
          label: 'Stats Row',
          icon: <BarChart3 className="w-4 h-4" />,
          description: 'Key statistics display',
          action: () => addObject(createStatsRow()),
        },
        {
          id: 'feature',
          label: 'Feature Card',
          icon: <Zap className="w-4 h-4" />,
          description: 'Feature highlight',
          action: () => addObject(createFeatureCard()),
        },
      ],
    },
    {
      id: 'charts',
      label: 'Charts',
      icon: <BarChart3 className="w-5 h-5" />,
      items: [
        {
          id: 'bar-chart',
          label: 'Bar Chart',
          icon: <BarChart3 className="w-4 h-4" />,
          description: 'Coming soon',
          action: () => {
            // Placeholder for chart integration
            const placeholder = new fabric.Rect({
              width: 300,
              height: 200,
              fill: '#f0fdf4',
              stroke: '#86efac',
              strokeWidth: 2,
              strokeDashArray: [5, 5],
              rx: 8,
              ry: 8,
              left: 100,
              top: 100,
            });
            const text = new fabric.IText('Bar Chart\n(Coming Soon)', {
              fontSize: 14,
              textAlign: 'center',
              left: 180,
              top: 180,
              fill: '#22c55e',
            });
            const group = new fabric.Group([placeholder, text], {
              left: 100,
              top: 100,
            });
            (group as any).name = 'Bar Chart';
            addObject(group);
          },
        },
        {
          id: 'line-chart',
          label: 'Line Chart',
          icon: <LineChart className="w-4 h-4" />,
          description: 'Coming soon',
          action: () => {},
        },
        {
          id: 'pie-chart',
          label: 'Pie Chart',
          icon: <PieChart className="w-4 h-4" />,
          description: 'Coming soon',
          action: () => {},
        },
      ],
    },
  ];

  return (
    <TooltipProvider>
      <div className={`flex flex-col bg-white border-r border-gray-200 py-2 ${className}`}>
        {/* Selection Tools */}
        <div className="px-2 pb-2 border-b border-gray-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={state.activeTool === 'select' ? 'secondary' : 'ghost'}
                size="sm"
                className="w-10 h-10 p-0"
                onClick={() => setActiveTool('select')}
              >
                <MousePointer className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Select (V)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={state.activeTool === 'pan' ? 'secondary' : 'ghost'}
                size="sm"
                className="w-10 h-10 p-0"
                onClick={() => setActiveTool('pan')}
              >
                <Hand className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Pan (H)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Element Categories */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {categories.map((category) => (
            <Popover
              key={category.id}
              open={expandedCategory === category.id}
              onOpenChange={(open) => setExpandedCategory(open ? category.id : null)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant={expandedCategory === category.id ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-10 h-10 p-0"
                    >
                      {category.icon}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{category.label}</p>
                </TooltipContent>
              </Tooltip>

              <PopoverContent side="right" align="start" className="w-56 p-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
                    {category.label}
                  </p>
                  {category.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action();
                        setExpandedCategory(null);
                      }}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>

        {/* AI Assistant Toggle */}
        <div className="px-2 pt-2 border-t border-gray-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={state.isAIPanelOpen ? 'primary' : 'ghost'}
                size="sm"
                className={`w-10 h-10 p-0 ${state.isAIPanelOpen ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                onClick={toggleAIPanel}
              >
                <Sparkles className={`w-5 h-5 ${state.isAIPanelOpen ? 'text-white' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>AI Assistant</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ElementToolbar;

