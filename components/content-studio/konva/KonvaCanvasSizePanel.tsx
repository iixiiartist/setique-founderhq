/**
 * Konva Canvas Size Panel
 * Allows resizing the canvas with presets for popular social media and print sizes
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Monitor,
  Smartphone,
  Image,
  FileText,
  Megaphone,
  Newspaper,
  Square,
  RectangleHorizontal,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  ChevronDown,
  ChevronRight,
  RotateCw,
  Check,
  Lock,
  Unlock,
  X,
} from 'lucide-react';
import { useKonvaContext } from './KonvaContext';

// ============================================================================
// Canvas Size Templates
// ============================================================================

export interface CanvasSizeTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  category: CanvasSizeCategory;
  icon?: string;
  description?: string;
}

export type CanvasSizeCategory = 
  | 'social-instagram'
  | 'social-facebook'
  | 'social-linkedin'
  | 'social-twitter'
  | 'social-youtube'
  | 'social-pinterest'
  | 'social-tiktok'
  | 'print'
  | 'presentation'
  | 'display'
  | 'custom';

export const CANVAS_SIZE_CATEGORIES: { id: CanvasSizeCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'social-instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" /> },
  { id: 'social-facebook', label: 'Facebook', icon: <Facebook className="w-4 h-4" /> },
  { id: 'social-linkedin', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" /> },
  { id: 'social-twitter', label: 'Twitter / X', icon: <Twitter className="w-4 h-4" /> },
  { id: 'social-youtube', label: 'YouTube', icon: <Youtube className="w-4 h-4" /> },
  { id: 'social-pinterest', label: 'Pinterest', icon: <Image className="w-4 h-4" /> },
  { id: 'social-tiktok', label: 'TikTok', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'print', label: 'Print & Documents', icon: <FileText className="w-4 h-4" /> },
  { id: 'presentation', label: 'Presentations', icon: <Monitor className="w-4 h-4" /> },
  { id: 'display', label: 'Ads & Display', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'custom', label: 'Custom Size', icon: <Square className="w-4 h-4" /> },
];

export const CANVAS_SIZE_TEMPLATES: CanvasSizeTemplate[] = [
  // ========== INSTAGRAM ==========
  { id: 'ig-post-square', name: 'Post (Square)', width: 1080, height: 1080, category: 'social-instagram', description: '1:1 ratio' },
  { id: 'ig-post-portrait', name: 'Post (Portrait)', width: 1080, height: 1350, category: 'social-instagram', description: '4:5 ratio' },
  { id: 'ig-post-landscape', name: 'Post (Landscape)', width: 1080, height: 608, category: 'social-instagram', description: '1.91:1 ratio' },
  { id: 'ig-story', name: 'Story / Reel', width: 1080, height: 1920, category: 'social-instagram', description: '9:16 ratio' },
  { id: 'ig-profile', name: 'Profile Photo', width: 320, height: 320, category: 'social-instagram', description: 'Circular crop' },
  { id: 'ig-carousel', name: 'Carousel', width: 1080, height: 1080, category: 'social-instagram', description: 'Multi-slide' },
  
  // ========== FACEBOOK ==========
  { id: 'fb-post', name: 'Post', width: 1200, height: 630, category: 'social-facebook', description: 'Link share image' },
  { id: 'fb-post-square', name: 'Post (Square)', width: 1080, height: 1080, category: 'social-facebook', description: '1:1 ratio' },
  { id: 'fb-cover', name: 'Cover Photo', width: 820, height: 312, category: 'social-facebook', description: 'Profile cover' },
  { id: 'fb-event', name: 'Event Cover', width: 1920, height: 1005, category: 'social-facebook', description: 'Event banner' },
  { id: 'fb-story', name: 'Story', width: 1080, height: 1920, category: 'social-facebook', description: '9:16 ratio' },
  { id: 'fb-profile', name: 'Profile Photo', width: 170, height: 170, category: 'social-facebook', description: 'Circular crop' },
  { id: 'fb-ad', name: 'Ad Image', width: 1200, height: 628, category: 'social-facebook', description: 'Sponsored post' },
  
  // ========== LINKEDIN ==========
  { id: 'li-post', name: 'Post', width: 1200, height: 627, category: 'social-linkedin', description: 'Feed image' },
  { id: 'li-post-square', name: 'Post (Square)', width: 1080, height: 1080, category: 'social-linkedin', description: '1:1 ratio' },
  { id: 'li-cover', name: 'Profile Banner', width: 1584, height: 396, category: 'social-linkedin', description: 'Personal profile' },
  { id: 'li-company-cover', name: 'Company Banner', width: 1128, height: 191, category: 'social-linkedin', description: 'Company page' },
  { id: 'li-profile', name: 'Profile Photo', width: 400, height: 400, category: 'social-linkedin', description: 'Circular crop' },
  { id: 'li-article', name: 'Article Cover', width: 1200, height: 644, category: 'social-linkedin', description: 'Blog header' },
  { id: 'li-ad', name: 'Sponsored Content', width: 1200, height: 627, category: 'social-linkedin', description: 'Ad image' },
  { id: 'li-carousel', name: 'Document/Carousel', width: 1080, height: 1080, category: 'social-linkedin', description: 'PDF slides' },
  
  // ========== TWITTER / X ==========
  { id: 'tw-post', name: 'Post Image', width: 1200, height: 675, category: 'social-twitter', description: '16:9 ratio' },
  { id: 'tw-post-square', name: 'Post (Square)', width: 1080, height: 1080, category: 'social-twitter', description: '1:1 ratio' },
  { id: 'tw-header', name: 'Header/Banner', width: 1500, height: 500, category: 'social-twitter', description: 'Profile header' },
  { id: 'tw-profile', name: 'Profile Photo', width: 400, height: 400, category: 'social-twitter', description: 'Circular crop' },
  { id: 'tw-card', name: 'Summary Card', width: 800, height: 418, category: 'social-twitter', description: 'Link preview' },
  
  // ========== YOUTUBE ==========
  { id: 'yt-thumbnail', name: 'Video Thumbnail', width: 1280, height: 720, category: 'social-youtube', description: '16:9 HD' },
  { id: 'yt-banner', name: 'Channel Banner', width: 2560, height: 1440, category: 'social-youtube', description: 'Safe area: 1546x423' },
  { id: 'yt-profile', name: 'Profile Photo', width: 800, height: 800, category: 'social-youtube', description: 'Channel icon' },
  { id: 'yt-shorts', name: 'Shorts Thumbnail', width: 1080, height: 1920, category: 'social-youtube', description: '9:16 ratio' },
  { id: 'yt-endscreen', name: 'End Screen', width: 1920, height: 1080, category: 'social-youtube', description: 'Video outro' },
  
  // ========== PINTEREST ==========
  { id: 'pin-standard', name: 'Standard Pin', width: 1000, height: 1500, category: 'social-pinterest', description: '2:3 ratio' },
  { id: 'pin-long', name: 'Long Pin', width: 1000, height: 2100, category: 'social-pinterest', description: 'Infographic' },
  { id: 'pin-square', name: 'Square Pin', width: 1000, height: 1000, category: 'social-pinterest', description: '1:1 ratio' },
  { id: 'pin-story', name: 'Story Pin', width: 1080, height: 1920, category: 'social-pinterest', description: '9:16 ratio' },
  
  // ========== TIKTOK ==========
  { id: 'tt-video', name: 'Video', width: 1080, height: 1920, category: 'social-tiktok', description: '9:16 ratio' },
  { id: 'tt-profile', name: 'Profile Photo', width: 200, height: 200, category: 'social-tiktok', description: 'Circular crop' },
  
  // ========== PRINT & DOCUMENTS ==========
  { id: 'print-letter', name: 'Letter', width: 2550, height: 3300, category: 'print', description: '8.5" × 11" @ 300dpi' },
  { id: 'print-a4', name: 'A4', width: 2480, height: 3508, category: 'print', description: '210mm × 297mm @ 300dpi' },
  { id: 'print-a5', name: 'A5', width: 1748, height: 2480, category: 'print', description: '148mm × 210mm @ 300dpi' },
  { id: 'print-a3', name: 'A3', width: 3508, height: 4961, category: 'print', description: '297mm × 420mm @ 300dpi' },
  { id: 'print-legal', name: 'Legal', width: 2550, height: 4200, category: 'print', description: '8.5" × 14" @ 300dpi' },
  { id: 'print-tabloid', name: 'Tabloid', width: 3300, height: 5100, category: 'print', description: '11" × 17" @ 300dpi' },
  { id: 'print-postcard', name: 'Postcard', width: 1800, height: 1200, category: 'print', description: '6" × 4" @ 300dpi' },
  { id: 'print-businesscard', name: 'Business Card', width: 1050, height: 600, category: 'print', description: '3.5" × 2" @ 300dpi' },
  { id: 'print-poster-18x24', name: 'Poster (18×24)', width: 5400, height: 7200, category: 'print', description: '18" × 24" @ 300dpi' },
  { id: 'print-flyer', name: 'Flyer', width: 2550, height: 3300, category: 'print', description: '8.5" × 11" @ 300dpi' },
  { id: 'print-brochure', name: 'Brochure (Tri-fold)', width: 3300, height: 2550, category: 'print', description: '11" × 8.5" @ 300dpi' },
  { id: 'print-magazine', name: 'Magazine Cover', width: 2550, height: 3300, category: 'print', description: '8.5" × 11" @ 300dpi' },
  
  // ========== PRESENTATIONS ==========
  { id: 'pres-16-9', name: 'Widescreen (16:9)', width: 1920, height: 1080, category: 'presentation', description: 'Full HD' },
  { id: 'pres-4-3', name: 'Standard (4:3)', width: 1024, height: 768, category: 'presentation', description: 'Classic slides' },
  { id: 'pres-4k', name: '4K UHD', width: 3840, height: 2160, category: 'presentation', description: 'Ultra HD' },
  { id: 'pres-1-1', name: 'Square (1:1)', width: 1080, height: 1080, category: 'presentation', description: 'Social slides' },
  
  // ========== ADS & DISPLAY ==========
  { id: 'ad-leaderboard', name: 'Leaderboard', width: 728, height: 90, category: 'display', description: 'Banner ad' },
  { id: 'ad-rectangle', name: 'Medium Rectangle', width: 300, height: 250, category: 'display', description: 'Display ad' },
  { id: 'ad-skyscraper', name: 'Wide Skyscraper', width: 160, height: 600, category: 'display', description: 'Sidebar ad' },
  { id: 'ad-billboard', name: 'Billboard', width: 970, height: 250, category: 'display', description: 'Large banner' },
  { id: 'ad-mobile-banner', name: 'Mobile Banner', width: 320, height: 50, category: 'display', description: 'Mobile ad' },
  { id: 'ad-large-rectangle', name: 'Large Rectangle', width: 336, height: 280, category: 'display', description: 'Display ad' },
  { id: 'ad-half-page', name: 'Half Page', width: 300, height: 600, category: 'display', description: 'Large sidebar' },
  { id: 'email-header', name: 'Email Header', width: 600, height: 200, category: 'display', description: 'Newsletter' },
  { id: 'email-banner', name: 'Email Banner', width: 600, height: 300, category: 'display', description: 'Email image' },
];

// ============================================================================
// Size Panel Component
// ============================================================================

interface KonvaCanvasSizePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KonvaCanvasSizePanel({ isOpen, onClose }: KonvaCanvasSizePanelProps) {
  const { state, getCurrentPage, dispatch, pushUndo } = useKonvaContext();
  const [expandedCategory, setExpandedCategory] = useState<CanvasSizeCategory | null>('social-instagram');
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1920 / 1080);
  const [searchQuery, setSearchQuery] = useState('');

  const currentPage = getCurrentPage();
  const currentWidth = currentPage?.canvas.width || 1920;
  const currentHeight = currentPage?.canvas.height || 1080;

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return CANVAS_SIZE_TEMPLATES;
    const query = searchQuery.toLowerCase();
    return CANVAS_SIZE_TEMPLATES.filter(
      t => t.name.toLowerCase().includes(query) || 
           t.description?.toLowerCase().includes(query) ||
           t.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<CanvasSizeCategory, CanvasSizeTemplate[]> = {} as any;
    CANVAS_SIZE_CATEGORIES.forEach(cat => {
      grouped[cat.id] = filteredTemplates.filter(t => t.category === cat.id);
    });
    return grouped;
  }, [filteredTemplates]);

  // Apply canvas size
  const applySize = useCallback((width: number, height: number) => {
    if (!state.document) return;
    
    pushUndo();
    dispatch({
      type: 'UPDATE_PAGE',
      payload: {
        index: state.currentPageIndex,
        page: {
          canvas: {
            ...currentPage!.canvas,
            width,
            height,
          },
        },
      },
    });
    dispatch({ type: 'MARK_DIRTY' });
  }, [state.document, state.currentPageIndex, currentPage, dispatch, pushUndo]);

  // Handle custom size input
  const handleWidthChange = useCallback((value: number) => {
    setCustomWidth(value);
    if (maintainAspectRatio) {
      setCustomHeight(Math.round(value / aspectRatio));
    }
  }, [maintainAspectRatio, aspectRatio]);

  const handleHeightChange = useCallback((value: number) => {
    setCustomHeight(value);
    if (maintainAspectRatio) {
      setCustomWidth(Math.round(value * aspectRatio));
    }
  }, [maintainAspectRatio, aspectRatio]);

  // Toggle aspect ratio lock
  const toggleAspectRatio = useCallback(() => {
    if (!maintainAspectRatio) {
      setAspectRatio(customWidth / customHeight);
    }
    setMaintainAspectRatio(!maintainAspectRatio);
  }, [maintainAspectRatio, customWidth, customHeight]);

  // Swap dimensions
  const swapDimensions = useCallback(() => {
    setCustomWidth(customHeight);
    setCustomHeight(customWidth);
    if (maintainAspectRatio) {
      setAspectRatio(customHeight / customWidth);
    }
  }, [customWidth, customHeight, maintainAspectRatio]);

  // Sync custom fields with current canvas size
  React.useEffect(() => {
    setCustomWidth(currentWidth);
    setCustomHeight(currentHeight);
    setAspectRatio(currentWidth / currentHeight);
  }, [currentWidth, currentHeight]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Canvas Size</h2>
            <p className="text-sm text-gray-500">
              Current: {currentWidth} × {currentHeight}px
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Custom Size Section */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Square className="w-4 h-4" />
                Custom Size
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Width (px)</label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={customWidth}
                    onChange={(e) => handleWidthChange(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex flex-col items-center gap-1 pt-4">
                  <button
                    onClick={toggleAspectRatio}
                    className={`p-1.5 rounded-lg transition-colors ${
                      maintainAspectRatio 
                        ? 'bg-indigo-100 text-indigo-600' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={maintainAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  >
                    {maintainAspectRatio ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={swapDimensions}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                    title="Swap dimensions"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Height (px)</label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={customHeight}
                    onChange={(e) => handleHeightChange(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <button
                  onClick={() => applySize(customWidth, customHeight)}
                  className="px-4 py-2 mt-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Template Categories */}
            {CANVAS_SIZE_CATEGORIES.filter(cat => cat.id !== 'custom').map((category) => {
              const templates = templatesByCategory[category.id];
              if (templates.length === 0) return null;
              
              const isExpanded = expandedCategory === category.id;
              
              return (
                <div key={category.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600">{category.icon}</span>
                      <span className="font-medium text-gray-900">{category.label}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {templates.length}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border-t border-gray-100">
                      {templates.map((template) => {
                        const isActive = currentWidth === template.width && currentHeight === template.height;
                        return (
                          <button
                            key={template.id}
                            onClick={() => applySize(template.width, template.height)}
                            className={`flex items-center justify-between p-3 rounded-lg text-left transition-all ${
                              isActive
                                ? 'bg-indigo-100 border-2 border-indigo-500'
                                : 'bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm truncate ${isActive ? 'text-indigo-700' : 'text-gray-900'}`}>
                                  {template.name}
                                </span>
                                {isActive && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                                  {template.width} × {template.height}
                                </span>
                                {template.description && (
                                  <span className="text-xs text-gray-400">
                                    • {template.description}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Preview aspect ratio */}
                            <div 
                              className={`ml-3 rounded border flex-shrink-0 ${isActive ? 'border-indigo-400 bg-indigo-200' : 'border-gray-300 bg-gray-100'}`}
                              style={{
                                width: Math.min(40, 40 * (template.width / template.height)),
                                height: Math.min(40, 40 * (template.height / template.width)),
                                minWidth: 20,
                                minHeight: 20,
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default KonvaCanvasSizePanel;
