/**
 * Export Modal Component
 * Export canvas content to various formats (PDF, PNG, SVG, HTML)
 */

import React, { useState, useCallback } from 'react';
import {
  X,
  Download,
  FileText,
  Image,
  Code,
  Presentation,
  Loader2,
  Check,
  FileImage,
} from 'lucide-react';
import { useContentStudio } from './ContentStudioContext';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog';
import { Select } from '../ui/Select';
import { RadioGroup, RadioGroupItem } from '../ui/RadioGroup';
import { ExportFormat } from './types';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

interface ExportFormatOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}

const FORMAT_OPTIONS: ExportFormatOption[] = [
  {
    id: 'pdf',
    label: 'PDF Document',
    description: 'Print-ready, multi-page document',
    icon: <FileText className="w-5 h-5" />,
    available: true,
  },
  {
    id: 'png',
    label: 'PNG Image',
    description: 'High-quality raster image',
    icon: <FileImage className="w-5 h-5" />,
    available: true,
  },
  {
    id: 'jpg',
    label: 'JPG Image',
    description: 'Compressed image format',
    icon: <Image className="w-5 h-5" />,
    available: true,
  },
  {
    id: 'svg',
    label: 'SVG Vector',
    description: 'Scalable vector graphics',
    icon: <Code className="w-5 h-5" />,
    available: true,
  },
  {
    id: 'html',
    label: 'HTML Page',
    description: 'Interactive web page',
    icon: <Code className="w-5 h-5" />,
    available: true,
  },
  {
    id: 'pptx',
    label: 'PowerPoint',
    description: 'Presentation slides',
    icon: <Presentation className="w-5 h-5" />,
    available: false,
  },
];

const QUALITY_OPTIONS = [
  { value: 'draft', label: 'Draft - Lower quality, smaller file' },
  { value: 'standard', label: 'Standard - Balanced quality and size' },
  { value: 'high', label: 'High - Best quality for digital' },
  { value: 'print', label: 'Print - Maximum quality for printing' },
];

export function ExportModal({ open, onClose }: ExportModalProps) {
  const { state, canvasRef } = useContentStudio();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [quality, setQuality] = useState<'draft' | 'standard' | 'high' | 'print'>('standard');
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [includeAllPages, setIncludeAllPages] = useState(true);

  const getQualityMultiplier = (q: string): number => {
    switch (q) {
      case 'draft': return 1;
      case 'standard': return 2;
      case 'high': return 3;
      case 'print': return 4;
      default: return 2;
    }
  };

  const handleExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !state.document) return;

    setIsExporting(true);
    setExportComplete(false);

    try {
      const multiplier = getQualityMultiplier(quality);
      const fileName = state.document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      switch (selectedFormat) {
        case 'png': {
          const dataUrl = canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier,
          });
          downloadFile(dataUrl, `${fileName}.png`);
          break;
        }

        case 'jpg': {
          const dataUrl = canvas.toDataURL({
            format: 'jpeg',
            quality: quality === 'print' ? 1 : 0.9,
            multiplier,
          });
          downloadFile(dataUrl, `${fileName}.jpg`);
          break;
        }

        case 'svg': {
          const svg = canvas.toSVG();
          const blob = new Blob([svg], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          downloadFile(url, `${fileName}.svg`);
          URL.revokeObjectURL(url);
          break;
        }

        case 'html': {
          const html = generateHTMLExport(canvas, state.document.title);
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          downloadFile(url, `${fileName}.html`);
          URL.revokeObjectURL(url);
          break;
        }

        case 'pdf': {
          await exportToPDF(canvas, fileName, multiplier);
          break;
        }

        default:
          console.warn('Format not yet supported:', selectedFormat);
      }

      setExportComplete(true);
      setTimeout(() => {
        setExportComplete(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [canvasRef, state.document, selectedFormat, quality, onClose]);

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateHTMLExport = (canvas: fabric.Canvas, title: string): string => {
    const svg = canvas.toSVG();
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      padding: 2rem;
    }
    .container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      padding: 2rem;
      max-width: 100%;
      overflow: auto;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    ${svg}
  </div>
</body>
</html>
    `.trim();
  };

  const exportToPDF = async (canvas: fabric.Canvas, fileName: string, multiplier: number) => {
    const { default: jsPDF } = await import('jspdf');
    
    const page = state.document?.pages[state.currentPageIndex];
    if (!page) return;

    const pdf = new jsPDF({
      orientation: page.canvas.width > page.canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [page.canvas.width, page.canvas.height],
    });

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier,
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, page.canvas.width, page.canvas.height);
    pdf.save(`${fileName}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            Export Document
          </DialogTitle>
          <DialogDescription>
            Choose a format and quality setting for your export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((format) => (
                <button
                  key={format.id}
                  onClick={() => format.available && setSelectedFormat(format.id)}
                  disabled={!format.available}
                  className={`
                    relative flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all
                    ${selectedFormat === format.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    ${!format.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${selectedFormat === format.id
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {format.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {format.label}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {format.description}
                    </p>
                  </div>
                  {selectedFormat === format.id && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4 text-indigo-600" />
                    </div>
                  )}
                  {!format.available && (
                    <span className="absolute top-2 right-2 text-xs text-gray-400">
                      Soon
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quality</Label>
            <Select
              value={quality}
              onChange={(e) => setQuality(e.target.value as typeof quality)}
              options={QUALITY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
              size="sm"
            />
          </div>

          {/* Page Options for PDF */}
          {selectedFormat === 'pdf' && state.document && state.document.pages.length > 1 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Pages</Label>
              <RadioGroup value={includeAllPages ? 'all' : 'current'} onValueChange={(v) => setIncludeAllPages(v === 'all')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="text-sm font-normal">
                    All pages ({state.document.pages.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current" id="current" />
                  <Label htmlFor="current" className="text-sm font-normal">
                    Current page only
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : exportComplete ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Exported!
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExportModal;
