/**
 * Export Modal Component
 * Export canvas content to various formats (PDF, PNG, SVG, HTML)
 * Supports multi-page PDF export with CORS-safe image handling
 */

import React, { useState, useCallback } from 'react';
import {
  Download,
  FileText,
  Image,
  Code,
  Presentation,
  Loader2,
  Check,
  FileImage,
  AlertCircle,
} from 'lucide-react';
import * as fabric from 'fabric';
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
import { ExportFormat, ContentPage } from './types';
import { showError, showSuccess } from '../../lib/utils/toast';

/**
 * Preload all images in canvas objects with CORS handling
 * This prevents "tainted canvas" errors during export
 */
async function preloadCanvasImages(canvas: fabric.Canvas): Promise<void> {
  const objects = canvas.getObjects();
  const imageObjects = objects.filter(obj => obj.type === 'image') as fabric.FabricImage[];
  
  if (imageObjects.length === 0) return;

  const loadPromises = imageObjects.map(async (imgObj) => {
    const src = imgObj.getSrc?.() || (imgObj as any)._element?.src;
    if (!src || src.startsWith('data:')) return; // Skip base64 images
    
    try {
      // Reload image with crossOrigin to avoid tainting
      const newImg = await fabric.FabricImage.fromURL(src, {
        crossOrigin: 'anonymous'
      });
      
      // Copy properties from original
      newImg.set({
        left: imgObj.left,
        top: imgObj.top,
        scaleX: imgObj.scaleX,
        scaleY: imgObj.scaleY,
        angle: imgObj.angle,
        opacity: imgObj.opacity,
        flipX: imgObj.flipX,
        flipY: imgObj.flipY,
      });
      
      // Replace the object
      const index = objects.indexOf(imgObj);
      canvas.remove(imgObj);
      canvas.insertAt(index, newImg);
    } catch (e) {
      console.warn('[Export] Failed to reload image for CORS:', src, e);
    }
  });
  
  await Promise.allSettled(loadPromises);
  canvas.renderAll();
}

/**
 * Pre-load fonts used in canvas before export
 * This ensures text renders correctly in exported files
 */
async function preloadFonts(canvas: fabric.Canvas): Promise<void> {
  const objects = canvas.getObjects();
  const textObjects = objects.filter(
    obj => obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text'
  ) as fabric.IText[];
  
  const fontFamilies = new Set<string>();
  textObjects.forEach(obj => {
    if (obj.fontFamily) {
      fontFamilies.add(obj.fontFamily);
    }
  });
  
  // Use document.fonts API to ensure fonts are loaded
  if (fontFamilies.size > 0 && 'fonts' in document) {
    const loadPromises = Array.from(fontFamilies).map(async (font) => {
      try {
        await document.fonts.load(`16px "${font}"`);
      } catch (e) {
        console.warn('[Export] Font not available:', font);
      }
    });
    await Promise.allSettled(loadPromises);
  }
}

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
  const [exportError, setExportError] = useState<string | null>(null);
  const [includeAllPages, setIncludeAllPages] = useState(true);
  const [exportProgress, setExportProgress] = useState<string>('');

  const getQualityMultiplier = (q: string): number => {
    switch (q) {
      case 'draft': return 1;
      case 'standard': return 2;
      case 'high': return 3;
      case 'print': return 4;
      default: return 2;
    }
  };

  // Render a page to a temporary canvas and get data URL
  const renderPageToDataUrl = useCallback(async (
    page: ContentPage,
    format: 'png' | 'jpeg',
    multiplier: number
  ): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Create a temporary canvas element
        const tempCanvasEl = document.createElement('canvas');
        const tempCanvas = new fabric.Canvas(tempCanvasEl, {
          width: page.canvas.width,
          height: page.canvas.height,
          backgroundColor: page.canvas.backgroundColor || '#ffffff',
        });

        const loadAndRender = async () => {
          if (page.canvas.json) {
            tempCanvas.loadFromJSON(JSON.parse(page.canvas.json), async () => {
              // Preload images and fonts before export
              await preloadCanvasImages(tempCanvas);
              await preloadFonts(tempCanvas);
              
              tempCanvas.renderAll();
              const dataUrl = tempCanvas.toDataURL({
                format,
                quality: 1,
                multiplier,
              });
              tempCanvas.dispose();
              resolve(dataUrl);
            });
          } else {
            // Empty page - just export background
            tempCanvas.renderAll();
            const dataUrl = tempCanvas.toDataURL({
              format,
              quality: 1,
              multiplier,
            });
            tempCanvas.dispose();
            resolve(dataUrl);
          }
        };

        // Small delay to ensure canvas is initialized
        setTimeout(loadAndRender, 50);
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  // Export multi-page PDF
  const exportMultiPagePDF = useCallback(async (
    pages: ContentPage[],
    fileName: string,
    multiplier: number,
    onProgress: (msg: string) => void
  ) => {
    const { default: jsPDF } = await import('jspdf');
    
    // Use first page dimensions for initial PDF setup
    let pdf: InstanceType<typeof jsPDF> | null = null;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      onProgress(`Rendering page ${i + 1} of ${pages.length}...`);

      // Render page to data URL
      const dataUrl = await renderPageToDataUrl(page, 'png', multiplier);

      // Get dimensions with defaults
      const pageWidth = page.canvas.width ?? 1920;
      const pageHeight = page.canvas.height ?? 1080;
      const orientation: 'landscape' | 'portrait' = pageWidth > pageHeight ? 'landscape' : 'portrait';

      if (i === 0) {
        // Create PDF with first page dimensions
        pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [pageWidth, pageHeight],
        });
      } else if (pdf) {
        // Add new page with correct dimensions
        pdf.addPage([pageWidth, pageHeight], orientation);
      }

      if (pdf) {
        pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
      }
    }

    if (pdf) {
      onProgress('Saving PDF...');
      pdf.save(`${fileName}.pdf`);
    }
  }, [renderPageToDataUrl]);

  // Export single page PDF
  const exportToPDF = useCallback(async (
    canvas: fabric.Canvas,
    fileName: string,
    multiplier: number,
    page: ContentPage
  ) => {
    const { default: jsPDF } = await import('jspdf');

    // Get dimensions with defaults
    const pageWidth = page.canvas.width ?? 1920;
    const pageHeight = page.canvas.height ?? 1080;
    const orientation: 'landscape' | 'portrait' = pageWidth > pageHeight ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [pageWidth, pageHeight],
    });

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier,
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.save(`${fileName}.pdf`);
  }, []);

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

  const handleExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !state.document) return;

    setIsExporting(true);
    setExportComplete(false);
    setExportError(null);
    setExportProgress('');

    try {
      // Preload images and fonts for CORS-safe export
      setExportProgress('Preparing assets...');
      await preloadCanvasImages(canvas);
      await preloadFonts(canvas);
      
      const multiplier = getQualityMultiplier(quality);
      const fileName = state.document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      switch (selectedFormat) {
        case 'png': {
          setExportProgress('Generating PNG...');
          const dataUrl = canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier,
          });
          downloadFile(dataUrl, `${fileName}.png`);
          break;
        }

        case 'jpg': {
          setExportProgress('Generating JPG...');
          const dataUrl = canvas.toDataURL({
            format: 'jpeg',
            quality: quality === 'print' ? 1 : 0.9,
            multiplier,
          });
          downloadFile(dataUrl, `${fileName}.jpg`);
          break;
        }

        case 'svg': {
          setExportProgress('Generating SVG...');
          const svg = canvas.toSVG();
          const blob = new Blob([svg], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          downloadFile(url, `${fileName}.svg`);
          URL.revokeObjectURL(url);
          break;
        }

        case 'html': {
          setExportProgress('Generating HTML...');
          const html = generateHTMLExport(canvas, state.document.title);
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          downloadFile(url, `${fileName}.html`);
          URL.revokeObjectURL(url);
          break;
        }

        case 'pdf': {
          const currentPage = state.document.pages[state.currentPageIndex];
          
          if (includeAllPages && state.document.pages.length > 1) {
            // Multi-page PDF export
            await exportMultiPagePDF(
              state.document.pages,
              fileName,
              multiplier,
              setExportProgress
            );
          } else {
            // Single page PDF export
            setExportProgress('Generating PDF...');
            await exportToPDF(canvas, fileName, multiplier, currentPage);
          }
          break;
        }

        default:
          throw new Error(`Format not yet supported: ${selectedFormat}`);
      }

      setExportComplete(true);
      showSuccess(`Exported ${fileName}.${selectedFormat}`);
      setTimeout(() => {
        setExportComplete(false);
        setExportProgress('');
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Export failed:', error);
      setExportError(error.message || 'Export failed');
      showError(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [canvasRef, state.document, state.currentPageIndex, selectedFormat, quality, includeAllPages, onClose, exportMultiPagePDF, exportToPDF]);

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

          {/* Export Error */}
          {exportError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          {/* Export Progress */}
          {exportProgress && (
            <div className="text-sm text-gray-600 text-center">
              {exportProgress}
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
