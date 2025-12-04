import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { DatabaseService } from '../../lib/services/database';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { FontFamily } from '@tiptap/extension-font-family';
import { Typography } from '@tiptap/extension-typography';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Focus } from '@tiptap/extension-focus';
import { Youtube } from '@tiptap/extension-youtube';
import { ResizableImage } from '../../lib/tiptap/ResizableImage';
import { FontSize } from '../../lib/tiptap/FontSize';
import { PageBreak } from '../../lib/tiptap/PageBreak';
import ChartNode from '../../lib/tiptap/ChartNode';
import TextBoxNode from '../../lib/tiptap/TextBoxNode';
import SignatureNode from '../../lib/tiptap/SignatureNode';
import ShapeNode, { ShapeType } from '../../lib/tiptap/ShapeNode';
import FrameNode from '../../lib/tiptap/FrameNode';
import { HexColorPicker } from 'react-colorful';
import EmojiPicker from 'emoji-picker-react';
import DOMPurify from 'dompurify';
import { showSuccess, showError } from '../../lib/utils/toast';
import { withRetry } from '../../lib/utils/retry';
import { GTMDoc, DocType, DocVisibility, AppActions, DashboardData, StructuredBlock, StructuredBlockMap, PlanType, WorkspaceRole } from '../../types';
import { DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '../../constants';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { AICommandPalette } from './AICommandPalette';
import { ImageUploadModal } from './ImageUploadModal';
import { ChartQuickInsert } from './ChartQuickInsert';
import { ResearchCopilot } from '../docs/ResearchCopilot';
import { useAIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';
import { uploadToSupabase, validateImageFile } from '../../lib/services/imageUploadService';
import { exportToMarkdown, exportToPDF, exportToHTML, exportToText, generateFilename } from '../../lib/services/documentExport';
import { GTM_TEMPLATES, type DocumentTemplate } from '../../lib/templates/gtmTemplates';
import { DocShareModal } from './DocShareModal';
import { DocEditorExportModal } from './DocEditorExportModal';
import { DocEditorBubbleMenu } from './DocEditorBubbleMenu';
import { DocEditorToolbar } from './DocEditorToolbar';
import {
    ExportSettings,
    ExportPreset,
    createDefaultExportSettings,
    loadWorkspaceExportPreferences,
    saveWorkspaceExportSettings,
    saveWorkspaceExportPresets,
} from '../../lib/services/documentExportPreferences';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import { useFeatureFlags } from '../../contexts/FeatureFlagContext';
import { GridOverlay } from '../docs/canvas/GridOverlay';
import { ProGridOverlay } from '../docs/canvas/ProGridOverlay';
import { ProCanvasToolbar, CanvasTool as ProCanvasTool } from '../docs/canvas/ProCanvasToolbar';
import { ZoomControls, Minimap } from '../docs/canvas/ZoomControls';
import { SnapLinesOverlay } from '../../lib/docs/snapUtils';
import { telemetry } from '../../lib/services/telemetry';
import { useDocCollab } from '../../hooks/useDocCollab';
import { v4 as uuidv4 } from 'uuid';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { ConfirmDialog } from '../shared/ConfirmDialog';

// Configure DOMPurify for safe HTML storage
const SANITIZE_CONFIG = {
    ALLOWED_TAGS: [
        'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 's',
        'blockquote', 'pre', 'code', 'span', 'div',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img', 'figure', 'figcaption', 'hr',
        'sub', 'sup', 'mark',
    ],
    ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
        'style', 'width', 'height', 'data-*', 'colspan', 'rowspan',
    ],
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'textarea', 'select'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

type CanvasTool = 'select' | 'text' | 'signature' | 'shape' | 'frame' | 'inspect';

interface DocEditorProps {
    workspaceId: string;
    userId: string;
    docId?: string; // undefined for new doc
    onClose: () => void;
    onSave: (doc: GTMDoc) => void;
    onReloadList?: () => void; // Callback to reload docs list in sidebar
    actions: AppActions;
    data: DashboardData;
    onUpgradeNeeded?: () => void;
}

import { 
    Maximize2, Minimize2, Layout, ChevronDown as ChevronDownIcon,
    Undo, Redo, Printer, Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
    AlignLeft, AlignCenter, AlignRight, AlignJustify, 
    List, ListOrdered, CheckSquare, Link as LinkIcon, Image as ImageIcon, 
    Table as TableIcon, Type, MoreHorizontal, FileText, Download, Settings,
    Palette, Highlighter, Plus, Minus, X, Save, Share2, Info,
    Scissors, Copy, Clipboard, FilePlus, Trash2, CornerUpLeft,
    Subscript as SubscriptIcon, Superscript as SuperscriptIcon, Youtube as YoutubeIcon,
    Search as SearchIcon,
    Sparkles, Globe, AlertTriangle, RefreshCw
} from 'lucide-react';

export const DocEditor: React.FC<DocEditorProps> = ({
    workspaceId,
    userId,
    docId,
    onClose,
    onSave,
    onReloadList,
    actions,
    data,
    onUpgradeNeeded,
}) => {
    const { workspace } = useWorkspace();
    const { isFeatureEnabled } = useFeatureFlags();
    const planType: PlanType = workspace?.planType ?? 'free';
    const workspaceRole: WorkspaceRole = workspace?.ownerId === userId ? 'owner' : 'member';
    const isCanvasModeEnabled = isFeatureEnabled('docs.canvas-mode');
    const isAIPaletteEnabled = isFeatureEnabled('docs.ai-palette');
    const [title, setTitle] = useState('Untitled Document');
    const [docType, setDocType] = useState<DocType>('brief');
    const [visibility, setVisibility] = useState<DocVisibility>('team');
    const [tags, setTags] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!!docId);
    const [, setBlocksMetadata] = useState<StructuredBlockMap>({});
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [lineSpacing, setLineSpacing] = useState(1.5);
    const [zoomLevel, setZoomLevel] = useState(110);
    const [inlineAISuggestion, setInlineAISuggestion] = useState({ visible: false, top: 0, left: 0, text: '' });
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');
    const [, setPagePreviews] = useState<string[]>([]);
    const [showDocSettings, setShowDocSettings] = useState(false);
    const [docOwnerId, setDocOwnerId] = useState<string | null>(null); // Track document owner for permission checks
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    
    // Collaboration state via hook
    const {
        ydoc,
        provider,
        collabStatus,
        activeUsers,
        collabWarning,
        clearCollabWarning,
        yjsInitialSyncComplete,
        yjsHasContent,
    } = useDocCollab({
        docId,
        workspaceId,
        userId,
        tableName: 'gtm_docs',
        columnName: 'content',
    });

    // AI Command Palette state
    const [showAICommandPalette, setShowAICommandPalette] = useState(false);
    const [aiPalettePosition, setAIPalettePosition] = useState({ top: 0, left: 0 });
    
    // Toolbar state
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [showAdvancedColorPicker, setShowAdvancedColorPicker] = useState(false);
    const [showAdvancedHighlightPicker, setShowAdvancedHighlightPicker] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [selectedHighlight, setSelectedHighlight] = useState('#FFFF00');
    const [showChartQuickInsert, setShowChartQuickInsert] = useState(false);
    const [showResearchSidebar, setShowResearchSidebar] = useState(false);
    const [showExportSettingsModal, setShowExportSettingsModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [exportSettings, setExportSettings] = useState<ExportSettings>(() => createDefaultExportSettings(workspace?.name));
    const [exportPresets, setExportPresets] = useState<ExportPreset[]>([]);
    const [defaultPresetId, setDefaultPresetId] = useState<string | null>(null);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [newPresetName, setNewPresetName] = useState('');
    const [presetFormError, setPresetFormError] = useState<string | null>(null);
    const [isCanvasGridVisible, setIsCanvasGridVisible] = useState(true);
    const [canvasGridSize, setCanvasGridSize] = useState(16);
    const [activeCanvasTool, setActiveCanvasTool] = useState<CanvasTool>('select');
    const [gridAnnouncement, setGridAnnouncement] = useState('');
    
    // Professional canvas state
    const [showRulers, setShowRulers] = useState(true);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [showMinimap, setShowMinimap] = useState(false);
    const [canvasGuides, setCanvasGuides] = useState<Array<{ id: string; position: number; orientation: 'horizontal' | 'vertical' }>>([]);
    const [activeSnapLines, setActiveSnapLines] = useState<Array<{ position: number; orientation: 'horizontal' | 'vertical'; type: string }>>([]);
    const [selectedElements, setSelectedElements] = useState<string[]>([]);
    const [canvasScrollPosition, setCanvasScrollPosition] = useState({ x: 0, y: 0 });
    
    const gridAnnouncementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const blocksMetadataRef = useRef<StructuredBlockMap>({});
    const blockMetadataSubscribers = useRef<Map<string, Set<(metadata?: StructuredBlock) => void>>>(new Map());
    const editorRef = useRef<Editor | null>(null);
    const canvasScrollRef = useRef<HTMLDivElement | null>(null);
    const bootStartRef = useRef<number>(Date.now());
    const bootTrackedRef = useRef(false);
    const loadedDocIdRef = useRef<string | null>(null); // Track which doc has been loaded to prevent double-loading
    
    // Autosave and dirty state tracking
    const isDirtyRef = useRef(false);
    const autosaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContentHashRef = useRef<string | null>(null);
    const AUTOSAVE_INTERVAL_MS = 30_000; // 30 seconds
    const AUTOSAVE_DEBOUNCE_MS = 2_000; // 2 seconds after last edit

    const exportPageSizeOptions: { value: ExportSettings['pageSize']; label: string }[] = [
        { value: 'a4', label: 'A4 • 210 × 297 mm' },
        { value: 'letter', label: 'US Letter • 8.5 × 11 in' },
        { value: 'legal', label: 'US Legal • 8.5 × 14 in' },
    ];

    const exportOrientationOptions: { value: ExportSettings['orientation']; label: string }[] = [
        { value: 'portrait', label: 'Portrait' },
        { value: 'landscape', label: 'Landscape' },
    ];

    const workspaceDefaultPreset = useMemo(
        () => exportPresets.find((preset) => preset.id === defaultPresetId) ?? null,
        [exportPresets, defaultPresetId],
    );

    const notifyBlockMetadata = useCallback((blockId: string, metadata?: StructuredBlock) => {
        const listeners = blockMetadataSubscribers.current.get(blockId);
        if (!listeners || !listeners.size) {
            return;
        }
        listeners.forEach((listener) => {
            try {
                listener(metadata);
            } catch (error) {
                console.warn('Block metadata listener error', error);
            }
        });
    }, []);

    const subscribeToBlockMetadata = useCallback(
        (blockId: string, listener: (metadata?: StructuredBlock) => void) => {
            if (!blockId) {
                return () => undefined;
            }
            const map = blockMetadataSubscribers.current;
            let listeners = map.get(blockId);
            if (!listeners) {
                listeners = new Set();
                map.set(blockId, listeners);
            }
            listeners.add(listener);

            const snapshot = blocksMetadataRef.current[blockId];
            if (snapshot) {
                listener(snapshot);
            }

            return () => {
                const nextListeners = map.get(blockId);
                if (!nextListeners) {
                    return;
                }
                nextListeners.delete(listener);
                if (!nextListeners.size) {
                    map.delete(blockId);
                }
            };
        },
        [],
    );

    const persistBlockMetadata = useCallback((block?: StructuredBlock) => {
        if (!block?.id) {
            return;
        }

        setBlocksMetadata((prev) => {
            const next = { ...prev, [block.id]: block };
            blocksMetadataRef.current = next;
            return next;
        });
        notifyBlockMetadata(block.id, block);
    }, [notifyBlockMetadata]);

    const removeBlockMetadata = useCallback((blockId?: string) => {
        if (!blockId) {
            return;
        }

        setBlocksMetadata((prev) => {
            if (!prev[blockId]) {
                return prev;
            }
            const next = { ...prev };
            delete next[blockId];
            blocksMetadataRef.current = next;
            return next;
        });
        notifyBlockMetadata(blockId, undefined);
    }, [notifyBlockMetadata]);

    const getBlocksMetadataPayload = useCallback(() => {
        return Object.keys(blocksMetadataRef.current).length ? blocksMetadataRef.current : {};
    }, []);

    const trackStorageFailure = useCallback(
        (stage: 'load' | 'save', error: unknown, metadata?: Record<string, unknown>) => {
            const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
            telemetry.track('doc_storage_failure', {
                workspaceId,
                userId,
                docId: docId ?? null,
                metadata: {
                    stage,
                    message,
                    ...(metadata ?? {}),
                },
            });
        },
        [docId, userId, workspaceId],
    );

    const emitBootTelemetry = useCallback(
        (metadata?: Record<string, unknown>) => {
            if (bootTrackedRef.current) {
                return;
            }
            const startedAt = bootStartRef.current ?? Date.now();
            const durationMs = Math.max(0, Date.now() - startedAt);
            telemetry.track('doc_editor_boot', {
                workspaceId,
                userId,
                docId: docId ?? null,
                metadata: {
                    durationMs,
                    ...(metadata ?? {}),
                },
            });
            bootTrackedRef.current = true;
        },
        [docId, userId, workspaceId],
    );

    const emitCanvasTelemetry = useCallback(
        (event: 'canvas_shell_toggled' | 'canvas_palette_interaction', metadata?: Record<string, unknown>) => {
            telemetry.track(event, {
                workspaceId,
                userId,
                docId,
                metadata,
            });
        },
        [docId, userId, workspaceId],
    );

    const announceGridState = useCallback((message: string) => {
        setGridAnnouncement(message);
        if (gridAnnouncementTimeoutRef.current) {
            clearTimeout(gridAnnouncementTimeoutRef.current);
        }
        gridAnnouncementTimeoutRef.current = setTimeout(() => setGridAnnouncement(''), 1800);
    }, []);

    const toggleCanvasGrid = useCallback(
        (nextState?: boolean) => {
            if (!isCanvasModeEnabled) {
                return;
            }
            setIsCanvasGridVisible((prev) => {
                const next = typeof nextState === 'boolean' ? nextState : !prev;
                announceGridState(next ? 'Grid overlay enabled' : 'Grid overlay disabled');
                emitCanvasTelemetry('canvas_palette_interaction', {
                    action: 'grid_toggle',
                    value: next,
                });
                return next;
            });
        },
        [announceGridState, emitCanvasTelemetry, isCanvasModeEnabled],
    );

    const handleToggleRulers = useCallback(() => {
        setShowRulers(prev => !prev);
        emitCanvasTelemetry('canvas_palette_interaction', { action: 'rulers_toggle', value: !showRulers });
    }, [showRulers, emitCanvasTelemetry]);

    const handleToggleSnap = useCallback(() => {
        setSnapEnabled(prev => !prev);
        emitCanvasTelemetry('canvas_palette_interaction', { action: 'snap_toggle', value: !snapEnabled });
    }, [snapEnabled, emitCanvasTelemetry]);

    const handleToggleMinimap = useCallback(() => {
        setShowMinimap(prev => !prev);
    }, []);

    const handleAddGuide = useCallback((guide: { id: string; position: number; orientation: 'horizontal' | 'vertical' }) => {
        setCanvasGuides(prev => [...prev, guide]);
        emitCanvasTelemetry('canvas_palette_interaction', { action: 'guide_add', value: guide.orientation });
    }, [emitCanvasTelemetry]);

    const handleRemoveGuide = useCallback((id: string) => {
        setCanvasGuides(prev => prev.filter(g => g.id !== id));
        emitCanvasTelemetry('canvas_palette_interaction', { action: 'guide_remove' });
    }, [emitCanvasTelemetry]);

    const handleMoveGuide = useCallback((id: string, position: number) => {
        setCanvasGuides(prev => prev.map(g => g.id === id ? { ...g, position } : g));
    }, []);

    const handleCanvasNavigate = useCallback((x: number, y: number) => {
        if (canvasScrollRef.current) {
            canvasScrollRef.current.scrollTo({ left: x, top: y, behavior: 'smooth' });
        }
    }, []);

    const handleGridSizeChange = useCallback(
        (nextSize: number) => {
            if (!isCanvasModeEnabled) {
                return;
            }
            const sanitized = Math.max(4, Math.min(64, Math.round(nextSize)));
            setCanvasGridSize(sanitized);
            announceGridState(`Grid spacing set to ${sanitized}px`);
            emitCanvasTelemetry('canvas_palette_interaction', {
                action: 'grid_size_change',
                value: sanitized,
            });
        },
        [announceGridState, emitCanvasTelemetry, isCanvasModeEnabled],
    );

    const handleInsertTextBox = useCallback(() => {
        const instance = editorRef.current;
        if (!instance || !isCanvasModeEnabled) {
            return;
        }

        const blockId = uuidv4();
        const now = new Date().toISOString();
        const siblings = Object.keys(blocksMetadataRef.current).length;
        const newBlock: StructuredBlock = {
            id: blockId,
            type: 'textbox',
            position: {
                x: 0,
                y: siblings * 24,
                zIndex: siblings,
            },
            size: {
                width: 360,
                height: 200,
            },
            rotation: 0,
            data: {
                placeholder: 'Type your notes',
            },
            createdAt: now,
            updatedAt: now,
        };

        persistBlockMetadata(newBlock);
        emitCanvasTelemetry('canvas_palette_interaction', {
            action: 'insert_textbox',
            value: blockId,
        });

        instance
            .chain()
            .focus()
            .insertTextBox({
                blockId,
                width: newBlock.size.width,
                height: newBlock.size.height,
                x: newBlock.position.x,
                y: newBlock.position.y,
                zIndex: newBlock.position.zIndex,
                placeholder: 'Type your notes',
                createdAt: now,
            })
            .run();
    }, [editorRef, emitCanvasTelemetry, isCanvasModeEnabled, persistBlockMetadata]);

    const handleInsertSignature = useCallback(() => {
        const instance = editorRef.current;
        if (!instance || !isCanvasModeEnabled) {
            return;
        }

        const blockId = uuidv4();
        const now = new Date().toISOString();
        const siblings = Object.keys(blocksMetadataRef.current).length;
        const defaultStroke = '#111827';
        const block: StructuredBlock = {
            id: blockId,
            type: 'signature',
            position: {
                x: 0,
                y: siblings * 24,
                zIndex: siblings,
            },
            size: {
                width: 360,
                height: 220,
            },
            rotation: 0,
            data: {
                strokeColor: defaultStroke,
                strokeWidth: 3,
                assetUrl: null,
                assetPath: null,
            },
            createdAt: now,
            updatedAt: now,
        };

        persistBlockMetadata(block);
        emitCanvasTelemetry('canvas_palette_interaction', {
            action: 'insert_signature',
            value: blockId,
        });

        instance
            .chain()
            .focus()
            .insertSignature({
                blockId,
                width: block.size.width,
                height: block.size.height,
                x: block.position.x,
                y: block.position.y,
                zIndex: block.position.zIndex,
                strokeColor: defaultStroke,
                strokeWidth: 3,
                createdAt: now,
                updatedAt: now,
            })
        .run();
    }, [editorRef, emitCanvasTelemetry, isCanvasModeEnabled, persistBlockMetadata]);

    const handleInsertShape = useCallback((shapeType: ShapeType) => {
        const instance = editorRef.current;
        if (!instance || !isCanvasModeEnabled) {
            return;
        }

        const blockId = uuidv4();
        const now = new Date().toISOString();
        const siblings = Object.keys(blocksMetadataRef.current).length;
        const block: StructuredBlock = {
            id: blockId,
            type: 'shape',
            position: {
                x: 0,
                y: siblings * 24,
                zIndex: siblings,
            },
            size: {
                width: 200,
                height: 150,
            },
            rotation: 0,
            data: {
                shapeType,
                fillColor: '#3b82f6',
                strokeColor: '#1e40af',
                strokeWidth: 2,
            },
            createdAt: now,
            updatedAt: now,
        };

        persistBlockMetadata(block);
        emitCanvasTelemetry('canvas_palette_interaction', {
            action: 'insert_shape',
            value: { blockId, shapeType },
        });

        instance
            .chain()
            .focus()
            .insertShape({
                blockId,
                shapeType,
                width: block.size.width,
                height: block.size.height,
                x: block.position.x,
                y: block.position.y,
                zIndex: block.position.zIndex,
                fillColor: '#3b82f6',
                strokeColor: '#1e40af',
                strokeWidth: 2,
                createdAt: now,
            })
            .run();
    }, [editorRef, emitCanvasTelemetry, isCanvasModeEnabled, persistBlockMetadata]);

    const handleInsertFrame = useCallback(() => {
        const instance = editorRef.current;
        if (!instance || !isCanvasModeEnabled) {
            return;
        }

        const blockId = uuidv4();
        const now = new Date().toISOString();
        const siblings = Object.keys(blocksMetadataRef.current).length;
        const block: StructuredBlock = {
            id: blockId,
            type: 'frame',
            position: {
                x: 0,
                y: siblings * 24,
                zIndex: siblings,
            },
            size: {
                width: 400,
                height: 300,
            },
            rotation: 0,
            data: {
                label: 'Frame',
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb',
            },
            createdAt: now,
            updatedAt: now,
        };

        persistBlockMetadata(block);
        emitCanvasTelemetry('canvas_palette_interaction', {
            action: 'insert_frame',
            value: blockId,
        });

        instance
            .chain()
            .focus()
            .insertFrame({
                blockId,
                width: block.size.width,
                height: block.size.height,
                x: block.position.x,
                y: block.position.y,
                zIndex: block.position.zIndex,
                label: 'Frame',
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb',
                createdAt: now,
            })
            .run();
    }, [editorRef, emitCanvasTelemetry, isCanvasModeEnabled, persistBlockMetadata]);

    const handleToolChange = useCallback((tool: CanvasTool) => {
        setActiveCanvasTool(tool);
        emitCanvasTelemetry('canvas_palette_interaction', {
            action: 'tool_change',
            value: tool,
        });
    }, [emitCanvasTelemetry]);

    // Collaboration is now handled by useDocCollab hook

    const canvasModeEnabledRef = useRef(isCanvasModeEnabled);
    const aiPaletteEnabledRef = useRef(isAIPaletteEnabled);

    useEffect(() => {
        aiPaletteEnabledRef.current = isAIPaletteEnabled;
        if (!isAIPaletteEnabled) {
            setShowAICommandPalette(false);
        }
    }, [isAIPaletteEnabled]);

    useEffect(() => {
        canvasModeEnabledRef.current = isCanvasModeEnabled;
        if (!isCanvasModeEnabled) {
            setShowTemplateMenu(false);
        }
    }, [isCanvasModeEnabled]);

    useEffect(() => {
        bootStartRef.current = Date.now();
        bootTrackedRef.current = false;
    }, [docId]);

    const getRelativeTimeLabel = useCallback((date: Date) => {
        const diffMs = Date.now() - date.getTime();
        const seconds = Math.max(0, Math.floor(diffMs / 1000));
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
        return date.toLocaleDateString();
    }, []);

    const lastSavedLabel = useMemo(() => {
        if (isSaving) return 'Saving changes…';
        if (!lastSavedAt) return 'Not saved yet';
        return `Saved ${getRelativeTimeLabel(lastSavedAt)}`;
    }, [getRelativeTimeLabel, isSaving, lastSavedAt]);

    useEffect(() => {
        const prefs = loadWorkspaceExportPreferences(workspaceId, workspace?.name);
        setExportSettings(prefs.settings);
        setExportPresets(prefs.presets);
        setDefaultPresetId(prefs.defaultPresetId);
        setSelectedPresetId(prefs.defaultPresetId);
    }, [workspaceId, workspace?.name]);
    
    // Fetch workspace context for AI
    const { context: workspaceContext, loading: contextLoading, error: contextError } = useAIWorkspaceContext(
        docId,
        workspaceId,
        userId
    );

    // NOTE: Collab provider is initialized in the first useEffect (lines ~658-742)
    // which includes heartbeat monitoring, telemetry, and proper cleanup.
    // Do NOT add a duplicate provider setup here.

    // Initialize Tiptap editor with premium extensions
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // The History extension is included in StarterKit, but we need to disable it
                // when using Collaboration to avoid conflicts.
                // In recent versions, it uses 'undoRedo'.
                undoRedo: docId ? false : undefined, 
            }),
            Placeholder.configure({
                placeholder: 'Start writing your document...',
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            Underline,
            Subscript,
            Superscript,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableCell,
            TableHeader,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline hover:text-blue-800',
                },
            }),
            ResizableImage.configure({
                inline: false,
                allowBase64: false,
                enableResize: true,
                defaultAlignment: 'center',
            }),
            FontFamily.configure({
                types: ['textStyle'],
            }),
            FontSize.configure({
                types: ['textStyle'],
            }),
            PageBreak,
            Typography,
            CharacterCount,
            Focus.configure({
                className: 'has-focus',
                mode: 'all',
            }),
            Youtube.configure({
                controls: true,
                nocookie: true,
            }),
            ChartNode,
            TextBoxNode.configure({
                onMetadataChange: persistBlockMetadata,
                onBlockRemoved: removeBlockMetadata,
                subscribeToBlockMetadata,
            }),
            SignatureNode.configure({
                workspaceId,
                docId,
                onMetadataChange: persistBlockMetadata,
                onBlockRemoved: removeBlockMetadata,
                subscribeToBlockMetadata,
            }),
            ShapeNode.configure({
                onMetadataChange: persistBlockMetadata,
                onBlockRemoved: removeBlockMetadata,
                subscribeToBlockMetadata,
            }),
            FrameNode.configure({
                onMetadataChange: persistBlockMetadata,
                onBlockRemoved: removeBlockMetadata,
                subscribeToBlockMetadata,
            }),
            BubbleMenuExtension.configure({
                pluginKey: 'bubbleMenu',
            }),
            // Collaboration extensions
            ...(docId && ydoc && provider ? [
                Collaboration.configure({ document: ydoc }),
                // CollaborationCursor causes a crash on save/load in some environments
                // Disabling temporarily to ensure stability
                /*
                CollaborationCursor.configure({ 
                    provider, 
                    user: { 
                        name: 'User', 
                        color: '#' + Math.floor(Math.random()*16777215).toString(16) 
                    } 
                })
                */
            ] : []),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-full p-4',
            },
            handleKeyDown: (view, event) => {
                // Cmd+K or Ctrl+K to open AI command palette
                if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                    if (!aiPaletteEnabledRef.current) {
                        return false;
                    }
                    event.preventDefault();
                    const coords = view.coordsAtPos(view.state.selection.from);
                    setAIPalettePosition({ 
                        top: coords.top + window.scrollY + 30, 
                        left: coords.left + window.scrollX 
                    });
                    setShowAICommandPalette(true);
                    return true;
                }
                if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 't') {
                    if (!canvasModeEnabledRef.current) {
                        return false;
                    }
                    event.preventDefault();
                    setShowTemplateMenu((prev) => !prev);
                    return true;
                }
                if ((event.metaKey || event.ctrlKey) && event.key === "'") {
                    if (!canvasModeEnabledRef.current) {
                        return false;
                    }
                    event.preventDefault();
                    toggleCanvasGrid();
                    return true;
                }
                return false;
            },
            handlePaste: (view, event) => {
                // Handle pasted images
                const items = event.clipboardData?.items;
                if (!items) return false;

                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        event.preventDefault();
                        const file = items[i].getAsFile();
                        if (file) {
                            // Upload and insert the pasted image
                            handlePastedImage(file);
                        }
                        return true;
                    }
                }
                return false;
            },
        },
    }, [docId, provider, removeBlockMetadata, persistBlockMetadata, subscribeToBlockMetadata, workspaceId, ydoc]);

    useEffect(() => {
        editorRef.current = editor;
    }, [editor]);

    // Reset loaded doc ref when docId changes (navigating to different doc)
    // or when ydoc changes (editor is recreated with Collaboration)
    useEffect(() => {
        // Only reset if we're loading a different document
        if (docId && loadedDocIdRef.current !== docId) {
            loadedDocIdRef.current = null;
        }
        // Also reset on unmount
        return () => {
            loadedDocIdRef.current = null;
        };
    }, [docId]);

    // Reset loadedDocIdRef when ydoc changes - the editor is recreated
    useEffect(() => {
        if (ydoc && loadedDocIdRef.current === docId) {
            // Editor was recreated with new ydoc, need to re-hydrate
            console.log('[DocEditor] Ydoc changed, resetting loadedDocIdRef to allow re-hydration');
            loadedDocIdRef.current = null;
        }
    }, [ydoc, docId]);

    // Load document content - waits briefly for Yjs sync in collab mode
    // to determine if we should hydrate from content_json or let Yjs be authoritative
    useEffect(() => {
        if (docId && editor) {
            // CRITICAL: Don't load content until the editor is stable
            // The editor is recreated when ydoc/provider change from null to real values
            // We need to wait for the collab-enabled editor to be ready
            const isCollabMode = Boolean(ydoc && provider);
            
            // If we have a docId but ydoc/provider aren't ready yet, wait for them
            // The useEditor hook will recreate the editor when ydoc becomes available
            if (docId && !ydoc) {
                console.log('[DocEditor] Waiting for Yjs provider to initialize...');
                return; // Wait for ydoc to be available
            }
            
            if (isCollabMode && !yjsInitialSyncComplete) {
                console.log('[DocEditor] Waiting for Yjs initial sync...');
                // Wait for sync or timeout after 3 seconds
                const timeout = setTimeout(() => {
                    console.log('[DocEditor] Yjs sync timeout - loading from DB');
                    loadDoc();
                }, 3000);
                
                // If sync completes before timeout, load immediately
                const checkSync = setInterval(() => {
                    if (yjsInitialSyncComplete) {
                        console.log('[DocEditor] Yjs sync complete - loading doc');
                        clearTimeout(timeout);
                        clearInterval(checkSync);
                        loadDoc();
                    }
                }, 100);
                
                return () => {
                    clearTimeout(timeout);
                    clearInterval(checkSync);
                };
            } else {
                loadDoc();
            }
        }
    }, [docId, editor, ydoc, provider, yjsInitialSyncComplete]); // Re-run when editor is ready or sync status changes

    useEffect(() => {
        if (!docId && editor && !bootTrackedRef.current) {
            emitBootTelemetry({ source: 'new_doc', docType });
        }
    }, [docId, docType, editor, emitBootTelemetry]);

    const loadDoc = async () => {
        // Load document content from database and hydrate editor
        // This should be called once when opening a document
        if (!editor || !docId) return;
        
        // Prevent double-loading the same document (React StrictMode can cause double-mount)
        if (loadedDocIdRef.current === docId) {
            return;
        }
        loadedDocIdRef.current = docId;
        
        setIsLoading(true);
        try {
            const { data, error } = await DatabaseService.loadGTMDocById(docId!, workspaceId);
            
            // Debug: Log raw database response
            console.log('[DocEditor] Raw doc data from DB:', {
                docId,
                title: data?.title,
                isTemplate: data?.isTemplate,
                contentJsonType: typeof data?.contentJson,
                contentJsonEmpty: data?.contentJson === null || data?.contentJson === undefined || (typeof data?.contentJson === 'object' && Object.keys(data?.contentJson || {}).length === 0),
                contentPlainLength: data?.contentPlain?.length || 0,
                contentPlainPreview: data?.contentPlain?.slice(0, 200),
            });
            
            if (error) {
                console.error('Error loading doc:', error);
                trackStorageFailure('load', error, { operation: 'loadGTMDocById' });
                showError('Failed to load document. It may have been deleted or you may not have access.');
                return;
            } else if (data) {
                // Set document metadata (always load regardless of content source)
                setTitle(data.title);
                setDocType(data.docType as DocType);
                setVisibility(data.visibility as DocVisibility);
                setTags(data.tags);
                // Track document owner for permission checks
                setDocOwnerId((data as GTMDoc).ownerId || null);
                const updatedAtValue = (data as GTMDoc).updatedAt || (data as any).updated_at;
                if (updatedAtValue) {
                    setLastSavedAt(new Date(updatedAtValue));
                    // Initialize content hash for autosave comparison
                    if (data.contentJson) {
                        lastSavedContentHashRef.current = JSON.stringify(data.contentJson);
                    }
                }

                const metadata = (data as GTMDoc).blocksMetadata || {};
                blocksMetadataRef.current = metadata;
                setBlocksMetadata(metadata);
                Object.values(metadata).forEach((block) => {
                    if (block?.id) {
                        notifyBlockMetadata(block.id, block);
                    }
                });
                
                // Hydrate editor with database content ONLY if:
                // 1. Not in collab mode (no Yjs), OR
                // 2. Yjs hasn't synced yet (safe to hydrate since Yjs state is unknown), OR
                // 3. Yjs has synced but is empty (no collaborative content to preserve)
                // 
                // If Yjs has synced and HAS content, the Yjs state is authoritative
                // and we should NOT override it with potentially stale content_json
                const isCollabMode = Boolean(docId && ydoc && provider);
                // Fix: Hydrate if Yjs hasn't synced yet OR if Yjs is empty
                // Previously we blocked hydration when isCollabMode && !yjsInitialSyncComplete
                const shouldHydrateFromDb = !isCollabMode || 
                    !yjsInitialSyncComplete ||  // Yjs hasn't synced - safe to hydrate from DB
                    (yjsInitialSyncComplete && !yjsHasContent);  // Yjs synced but empty
                
                let contentSource = 'skipped_yjs_authoritative';
                
                // Debug: Log hydration decision
                console.log('[DocEditor] Hydration decision:', {
                    docId,
                    isCollabMode: Boolean(docId && ydoc && provider),
                    yjsInitialSyncComplete,
                    yjsHasContent,
                    shouldHydrateFromDb: !Boolean(docId && ydoc && provider) || 
                        !yjsInitialSyncComplete ||
                        (yjsInitialSyncComplete && !yjsHasContent),
                    hasContentJson: !!data.contentJson,
                    contentJsonType: typeof data.contentJson,
                    contentJsonKeys: data.contentJson ? Object.keys(data.contentJson) : [],
                    hasContentPlain: !!data.contentPlain,
                    contentPlainLength: data.contentPlain?.length || 0,
                    contentPlainPreview: data.contentPlain?.slice(0, 100),
                });
                
                if (shouldHydrateFromDb) {
                    contentSource = 'database_empty';
                    // Check if contentJson has actual content (not just an empty doc structure)
                    const hasValidJsonContent = data.contentJson && 
                        typeof data.contentJson === 'object' &&
                        data.contentJson.content && 
                        Array.isArray(data.contentJson.content) &&
                        data.contentJson.content.length > 0 &&
                        // Check it's not just empty paragraphs
                        data.contentJson.content.some((node: any) => 
                            node.content || (node.type !== 'paragraph')
                        );
                    
                    console.log('[DocEditor] Content validation:', {
                        hasValidJsonContent,
                        contentJsonContent: data.contentJson?.content,
                    });
                    
                    if (hasValidJsonContent) {
                        console.log('[DocEditor] Setting content from contentJson');
                        editor.commands.setContent(data.contentJson);
                        contentSource = 'database_json';
                    } else if (data.contentPlain && data.contentPlain.trim()) {
                        // Use contentPlain (which contains HTML for templates)
                        console.log('[DocEditor] Setting content from contentPlain (HTML)');
                        editor.commands.setContent(data.contentPlain);
                        contentSource = 'database_plain';
                    }
                    
                    // Debug: Log editor state after setContent
                    setTimeout(() => {
                        console.log('[DocEditor] Editor content after setContent:', {
                            isEmpty: editor.isEmpty,
                            textLength: editor.state.doc.textContent.length,
                            textPreview: editor.state.doc.textContent.slice(0, 100),
                        });
                    }, 100);
                }

                emitBootTelemetry({
                    source: 'existing_doc',
                    docType: data.docType,
                    contentSource,
                    yjsSynced: yjsInitialSyncComplete,
                    yjsHasContent: yjsHasContent,
                });
                
                // Mark as clean after initial load
                isDirtyRef.current = false;
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading doc:', error);
            trackStorageFailure('load', error, { operation: 'loadGTMDocById', phase: 'exception' });
            showError('Unexpected error loading document. Please try again.');
            setIsLoading(false);
        }
    };

    const handlePastedImage = async (file: File) => {
        if (!editor) return;

        try {
            // Validate the file
            const validation = validateImageFile(file);
            if (validation !== true) {
                showError(validation.error);
                return;
            }

            // Upload to Supabase
            const result = await uploadToSupabase(file, workspaceId, docId);

            // Insert image into editor at current cursor position
            editor.chain().focus().setResizableImage({ 
                src: result.url,
                alt: `Pasted image ${new Date().toISOString()}`
            }).run();

        } catch (error: any) {
            console.error('Paste image error:', error);
            showError(`Failed to upload pasted image: ${error.message || 'Unknown error'}`);
        }
    };

    const generatePresetId = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    const persistPresetState = (nextPresets: ExportPreset[], nextDefaultId: string | null) => {
        setExportPresets(nextPresets);
        setDefaultPresetId(nextDefaultId);
        saveWorkspaceExportPresets(workspaceId, nextPresets, nextDefaultId);
    };

    const handleApplyPreset = (presetId: string) => {
        const preset = exportPresets.find((item) => item.id === presetId);
        if (!preset) return;
        setExportSettings(preset.settings);
        setSelectedPresetId(presetId);
        setPresetFormError(null);
    };

    const handleCreatePreset = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedName = newPresetName.trim();
        if (!trimmedName) {
            setPresetFormError('Give the preset a descriptive name.');
            return;
        }

        if (exportPresets.some((preset) => preset.name.toLowerCase() === trimmedName.toLowerCase())) {
            setPresetFormError('A preset with that name already exists.');
            return;
        }

        const newPreset: ExportPreset = {
            id: generatePresetId(),
            name: trimmedName,
            settings: exportSettings,
            updatedAt: Date.now(),
        };

        const nextPresets = [...exportPresets, newPreset];
        persistPresetState(nextPresets, defaultPresetId);
        setSelectedPresetId(newPreset.id);
        setNewPresetName('');
        setPresetFormError(null);
        saveWorkspaceExportSettings(workspaceId, exportSettings);
    };

    const handleUpdateSelectedPreset = () => {
        if (!selectedPresetId) return;
        const nextPresets = exportPresets.map((preset) =>
            preset.id === selectedPresetId
                ? { ...preset, settings: exportSettings, updatedAt: Date.now() }
                : preset
        );
        persistPresetState(nextPresets, defaultPresetId);
        saveWorkspaceExportSettings(workspaceId, exportSettings);
    };

    const handleDeleteSelectedPreset = () => {
        if (!selectedPresetId) return;
        const nextPresets = exportPresets.filter((preset) => preset.id !== selectedPresetId);
        const nextDefaultId = defaultPresetId === selectedPresetId ? null : defaultPresetId;
        persistPresetState(nextPresets, nextDefaultId);
        setSelectedPresetId(null);
    };

    const handleSetDefaultPreset = (presetId: string) => {
        const preset = exportPresets.find((item) => item.id === presetId);
        if (!preset) return;
        persistPresetState(exportPresets, presetId);
        setSelectedPresetId(presetId);
        setExportSettings(preset.settings);
    };

    const handleExportSettingChange = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
        setExportSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
        setSelectedPresetId(null);
    };

    const handleResetExportSettings = () => {
        if (defaultPresetId) {
            const defaultPreset = exportPresets.find((preset) => preset.id === defaultPresetId);
            if (defaultPreset) {
                setExportSettings(defaultPreset.settings);
                setSelectedPresetId(defaultPresetId);
                return;
            }
        }
        setExportSettings(createDefaultExportSettings(workspace?.name));
        setSelectedPresetId(null);
    };

    const handleSaveExportPreferences = () => {
        saveWorkspaceExportSettings(workspaceId, exportSettings);
        setShowExportSettingsModal(false);
    };

    const handleExport = async (format: 'markdown' | 'pdf' | 'html' | 'text') => {
        if (!editor) return;

        try {
            const resolvedTitle = title?.trim() ? title : 'Document';
            const extension = format === 'markdown' ? 'md' : format;
            const filename = generateFilename(resolvedTitle, extension);

            switch (format) {
                case 'markdown':
                    exportToMarkdown(editor, filename);
                    break;
                case 'pdf':
                    await exportToPDF(editor, {
                        title: resolvedTitle,
                        filename,
                        includePageNumbers: exportSettings.includePageNumbers,
                        pageSize: exportSettings.pageSize,
                        orientation: exportSettings.orientation,
                        margin: exportSettings.margin,
                        includeCoverPage: exportSettings.includeCoverPage,
                        coverSubtitle: exportSettings.coverSubtitle,
                        coverMeta: exportSettings.coverMeta,
                        brandColor: exportSettings.brandColor,
                        footerNote: exportSettings.footerNote,
                    });
                    saveWorkspaceExportSettings(workspaceId, exportSettings);
                    break;
                case 'html':
                    exportToHTML(editor, filename, resolvedTitle);
                    break;
                case 'text':
                    exportToText(editor, filename);
                    break;
            }
        } catch (error: any) {
            console.error('Export error:', error);
            showError(`Failed to export document: ${error.message || 'Unknown error'}`);
        }
    };

    // Confirmation dialog for applying template
    const applyTemplateConfirm = useConfirmAction<DocumentTemplate>({
        title: 'Apply Template',
        message: (template) => `Applying a template will replace all current content.\n\nTemplate: ${template.name}\n\nAre you sure you want to continue?`,
        confirmLabel: 'Apply Template',
        variant: 'warning'
    });

    const handleApplyTemplate = (template: DocumentTemplate) => {
        if (!editor) return;
        
        // Confirm if document has content
        const currentContent = editor.getText().trim();
        if (currentContent.length > 0) {
            applyTemplateConfirm.requestConfirm(template, (t) => {
                // Apply template content
                editor.commands.setContent(t.content);
                
                // Update document title if it's still "Untitled Document"
                if (title === 'Untitled Document') {
                    setTitle(t.name);
                }
                
                // Close menu
                setShowTemplateMenu(false);
                
                // Focus editor
                editor.commands.focus();
            });
        } else {
            // No content, apply directly without confirmation
            editor.commands.setContent(template.content);
            
            if (title === 'Untitled Document') {
                setTitle(template.name);
            }
            
            setShowTemplateMenu(false);
            editor.commands.focus();
        }
    };

    // Removed handleSendToAI - use AI Command Palette (Cmd+K) instead
    const handleOpenAIPalette = () => {
        // Gate on editor, feature flag, and context readiness
        if (!editor || !aiPaletteEnabledRef.current || contextLoading || !workspaceContext) return;
        const { view } = editor;
        const coords = view.coordsAtPos(view.state.selection.from);
        setAIPalettePosition({ top: coords.top + window.scrollY + 30, left: coords.left + window.scrollX });
        setShowAICommandPalette(true);
    };

    const handleSave = async () => {
        if (!editor) return;
        
        setIsSaving(true);
        try {
            // Extract content from editor
            const contentJson = editor.getJSON();
            const contentPlain = editor.getText();
            
            if (docId) {
                // Update existing doc
                const { data, error } = await DatabaseService.updateGTMDoc(docId, workspaceId, {
                    title,
                    docType,
                    visibility,
                    contentJson,
                    contentPlain,
                    tags,
                    blocksMetadata: getBlocksMetadataPayload(),
                });
                
                if (error) {
                    console.error('Error updating doc:', error);
                    trackStorageFailure('save', error, { operation: 'updateGTMDoc' });
                    showError('Failed to save document. Please try again.');
                    return;
                } else if (data) {
                    onSave(data as GTMDoc);
                    setLastSavedAt(new Date());
                    isDirtyRef.current = false;
                    lastSavedContentHashRef.current = JSON.stringify(contentJson);
                }
            } else {
                // Create new doc
                const { data, error } = await DatabaseService.createGTMDoc({
                    workspaceId,
                    userId,
                    title,
                    docType,
                    visibility,
                    contentJson,
                    contentPlain,
                    tags,
                    blocksMetadata: getBlocksMetadataPayload(),
                });
                
                if (error) {
                    console.error('Error creating doc:', error);
                    trackStorageFailure('save', error, { operation: 'createGTMDoc' });
                    showError('Failed to create document. Please try again.');
                    return;
                } else if (data) {
                    onSave(data as GTMDoc);
                    setLastSavedAt(new Date());
                    // Set the current user as doc owner for the newly created doc
                    setDocOwnerId(userId);
                    isDirtyRef.current = false;
                    lastSavedContentHashRef.current = JSON.stringify(contentJson);
                }
            }
        } catch (error) {
            console.error('Error saving doc:', error);
            trackStorageFailure('save', error, { operation: docId ? 'updateGTMDoc' : 'createGTMDoc', phase: 'exception' });
            showError('An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    // Autosave function - silent save without UI blocking
    const performAutosave = useCallback(async () => {
        if (!editor || !docId || isSaving) return;
        
        const contentJson = editor.getJSON();
        const contentPlain = editor.getText();
        const currentHash = JSON.stringify(contentJson);
        
        // Skip if content hasn't changed since last save
        if (currentHash === lastSavedContentHashRef.current) {
            isDirtyRef.current = false;
            return;
        }
        
        try {
            // Use retry wrapper for autosave - 2 attempts with short delays
            const { error } = await withRetry(
                () => DatabaseService.updateGTMDoc(docId, workspaceId, {
                    contentJson,
                    contentPlain,
                }),
                {
                    maxAttempts: 2,
                    initialDelayMs: 500,
                    maxDelayMs: 2000,
                    onRetry: (attempt, err) => {
                        console.log(`[autosave] Retry attempt ${attempt}`, err);
                    },
                }
            );
            
            if (!error) {
                setLastSavedAt(new Date());
                isDirtyRef.current = false;
                lastSavedContentHashRef.current = currentHash;
                telemetry.track('doc_autosave', {
                    workspaceId,
                    userId,
                    docId,
                    metadata: { success: true },
                });
            } else {
                console.warn('Autosave failed:', error);
                telemetry.track('doc_autosave', {
                    workspaceId,
                    userId,
                    docId,
                    metadata: { success: false, error: error.message || 'Unknown error' },
                });
            }
        } catch (error) {
            console.warn('Autosave error (after retries):', error);
        }
    }, [editor, docId, workspaceId, userId, isSaving]);

    // Autosave effect - periodic save and beforeunload guard
    useEffect(() => {
        if (!editor || !docId) return;

        // Track content changes to mark dirty state
        const handleUpdate = () => {
            isDirtyRef.current = true;
            
            // Debounced autosave after edits stop
            if (autosaveDebounceRef.current) {
                clearTimeout(autosaveDebounceRef.current);
            }
            autosaveDebounceRef.current = setTimeout(() => {
                performAutosave();
            }, AUTOSAVE_DEBOUNCE_MS);
        };

        editor.on('update', handleUpdate);

        // Periodic autosave interval
        autosaveIntervalRef.current = setInterval(() => {
            if (isDirtyRef.current) {
                performAutosave();
            }
        }, AUTOSAVE_INTERVAL_MS);

        // Beforeunload guard for unsaved changes
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirtyRef.current) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            editor.off('update', handleUpdate);
            
            if (autosaveIntervalRef.current) {
                clearInterval(autosaveIntervalRef.current);
                autosaveIntervalRef.current = null;
            }
            
            if (autosaveDebounceRef.current) {
                clearTimeout(autosaveDebounceRef.current);
                autosaveDebounceRef.current = null;
            }
            
            window.removeEventListener('beforeunload', handleBeforeUnload);
            
            // Final save attempt on cleanup if dirty
            if (isDirtyRef.current && docId) {
                performAutosave();
            }
        };
    }, [editor, docId, performAutosave]);

    // Confirmation dialog for saving to file library
    const saveToLibraryConfirm = useConfirmAction<void>({
        title: 'Save to File Library',
        message: 'Save this document to the File Library? This will create an HTML version that can be shared and attached to tasks.',
        confirmLabel: 'Save to Library',
        variant: 'info'
    });

    const handleSaveToFileLibrary = async () => {
        if (!editor) {
            showError('Editor not ready');
            return;
        }

        saveToLibraryConfirm.requestConfirm(undefined, async () => {
            try {
                // Get the HTML content and sanitize it to prevent XSS
                const rawHtml = editor.getHTML();
                const sanitizedHtml = DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG) as unknown as string;
            
                // Create a document entry in the file library
                const { data, error } = await DatabaseService.createDocument(userId, workspaceId, {
                    name: `${title}.html`,
                    module: 'workspace', // GTM Docs workspace
                    mime_type: 'text/html',
                    content: sanitizedHtml,
                    notes: {
                        gtmDocId: docId || null,
                        docType: docType,
                        tags: tags,
                        source: 'gtm_docs'
                    }
                });

                if (error) {
                    console.error('Error saving to file library:', error);
                    showError('Failed to save to file library: ' + error.message);
                } else {
                    showSuccess('Document saved to File Library!');
                    // Reload the docs list to show the new file
                    onReloadList?.();
                }
            } catch (error) {
                console.error('Error saving to file library:', error);
                showError('Failed to save to file library');
            }
        });
    };

    const characterCountStorage = (editor?.storage as any)?.characterCount;
    const wordCount = characterCountStorage?.words ? characterCountStorage.words() : 0;
    const characterCount = characterCountStorage?.characters ? characterCountStorage.characters() : 0;
    const estimatedReadMinutes = Math.max(1, Math.ceil(Math.max(1, wordCount) / 220));
    const displayedTags = tags.slice(0, 3);
    const extraTagCount = Math.max(0, tags.length - displayedTags.length);
    const docTypeLabel = DOC_TYPE_LABELS[docType] ?? 'GTM Doc';
    const docTypeIcon = DOC_TYPE_ICONS[docType] ?? '📄';
    const collaboratorCount = activeUsers.length;
    const docStatusLabel = isSaving
        ? 'Saving to cloud'
        : collabStatus === 'connected'
            ? 'Live collaboration'
            : 'Offline draft';
    const docStatusBadgeClass = isSaving
        ? 'bg-yellow-200 text-yellow-900'
        : collabStatus === 'connected'
            ? 'bg-green-200 text-green-900'
            : 'bg-gray-200 text-gray-800';
    const visibilityBadgeClass = visibility === 'private'
        ? 'bg-white text-gray-900'
        : 'bg-green-200 text-green-900';
    const workspaceName = workspace?.name ?? 'Workspace';
    const docSummaryCards = [
        {
            icon: '📝',
            title: 'Word Count',
            value: wordCount.toLocaleString(),
            helper: `${characterCount.toLocaleString()} characters`
        },
        {
            icon: '🧭',
            title: 'Doc Context',
            value: `${estimatedReadMinutes} min read`,
            helper: tags.length
                ? `Tags: ${displayedTags.join(', ')}${extraTagCount ? ` +${extraTagCount}` : ''}`
                : 'Add tags to guide AI'
        },
        {
            icon: '🤝',
            title: 'Collaboration',
            value: collaboratorCount ? `${collaboratorCount} active` : 'Solo draft',
            helper: docStatusLabel
        }
    ];
    const fontFamilyOptions = [
        { id: 'system', label: 'System Sans', stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', isDefault: true },
        { id: 'arial', label: 'Arial', stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
        { id: 'times', label: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
        { id: 'calibri', label: 'Calibri', stack: 'Calibri, "Segoe UI", Arial, sans-serif' },
        { id: 'comic-sans', label: 'Comic Sans', stack: '"Comic Sans MS", "Comic Sans", cursive' },
        { id: 'impact', label: 'Impact', stack: 'Impact, "Arial Black", sans-serif' },
        { id: 'georgia', label: 'Georgia', stack: 'Georgia, "Times New Roman", Times, serif' },
        { id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
        { id: 'trebuchet', label: 'Trebuchet MS', stack: '"Trebuchet MS", "Lucida Grande", sans-serif' },
        { id: 'palatino', label: 'Palatino', stack: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
        { id: 'garamond', label: 'Garamond', stack: 'Garamond, "Times New Roman", Times, serif' },
        { id: 'inter', label: 'Inter', stack: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
        { id: 'roboto', label: 'Roboto', stack: 'Roboto, "Helvetica Neue", Arial, sans-serif' },
        { id: 'raleway', label: 'Raleway', stack: 'Raleway, "Helvetica Neue", Arial, sans-serif' },
        { id: 'open-sans', label: 'Open Sans', stack: '"Open Sans", "Helvetica Neue", Arial, sans-serif' },
        { id: 'lato', label: 'Lato', stack: 'Lato, "Helvetica Neue", Arial, sans-serif' },
        { id: 'montserrat', label: 'Montserrat', stack: 'Montserrat, "Helvetica Neue", Arial, sans-serif' },
        { id: 'poppins', label: 'Poppins', stack: 'Poppins, "Helvetica Neue", Arial, sans-serif' },
        { id: 'nunito', label: 'Nunito', stack: 'Nunito, "Helvetica Neue", Arial, sans-serif' },
        { id: 'oswald', label: 'Oswald', stack: 'Oswald, "Arial Narrow", sans-serif' },
        { id: 'space-grotesk', label: 'Space Grotesk', stack: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif' },
        { id: 'ibm-plex', label: 'IBM Plex Sans', stack: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif' },
        { id: 'source-serif', label: 'Source Serif Pro', stack: '"Source Serif Pro", Georgia, serif' },
        { id: 'merriweather', label: 'Merriweather', stack: 'Merriweather, Georgia, serif' },
        { id: 'playfair', label: 'Playfair Display', stack: '"Playfair Display", Georgia, serif' },
        { id: 'dm-sans', label: 'DM Sans', stack: '"DM Sans", "Helvetica Neue", Arial, sans-serif' },
        { id: 'courier-prime', label: 'Courier Prime', stack: '"Courier Prime", "Courier New", monospace' },
        { id: 'courier-new', label: 'Courier New', stack: '"Courier New", Courier, monospace' },
        { id: 'consolas', label: 'Consolas', stack: 'Consolas, Monaco, "Courier New", monospace' },
        { id: 'monaco', label: 'Monaco', stack: 'Monaco, Consolas, "Courier New", monospace' }
    ];
    const fontSizeOptions = ['8px', '9px', '10px', '11px', '12px', '13px', '14px', '15px', '16px', '17px', '18px', '20px', '22px', '24px', '28px', '32px', '36px', '42px', '48px', '56px', '72px'];
    const lineSpacingOptions = [
        { label: 'Compact', value: 1.35 },
        { label: 'Editorial', value: 1.5 },
        { label: 'Comfort', value: 1.65 },
        { label: 'Roomy', value: 1.85 },
        { label: 'Wide', value: 2.05 }
    ];
    const resolveFontFamilyId = (fontAttr?: string | null) => {
        if (!fontAttr) return 'system';
        const exact = fontFamilyOptions.find((option) => option.stack === fontAttr);
        if (exact) return exact.id;
        const loose = fontFamilyOptions.find((option) => option.stack.startsWith(fontAttr));
        return loose ? loose.id : 'system';
    };
    const getFontStackById = (id: string) => fontFamilyOptions.find((option) => option.id === id)?.stack;
    const zoomOptions = [90, 100, 110, 125, 150];
    const inchInPx = 96;
    const zoomScale = zoomLevel / 100;
    const pageWidthPx = 8.5 * inchInPx * zoomScale;
    const pageHeightPx = 11 * inchInPx * zoomScale;
    const marginPx = 1 * inchInPx * zoomScale;
    const wordsPerPage = 520;
    const totalPages = Math.max(1, Math.ceil(Math.max(1, wordCount) / wordsPerPage));
    const displayedPreviewCount = Math.min(totalPages, 6);
    const rulerInterval = zoomLevel >= 140 ? 0.25 : zoomLevel >= 120 ? 0.5 : 1;
    const rulerTicks = useMemo(() => {
        const ticks: number[] = [];
        const width = 8.5;
        for (let position = 0; position <= width + 0.001; position += rulerInterval) {
            ticks.push(Number(position.toFixed(2)));
        }
        return ticks;
    }, [rulerInterval]);
    const paragraphSpacing = useMemo(() => Number(Math.max(0.85, lineSpacing * 0.72).toFixed(2)), [lineSpacing]);
    const showInlineAIFab = inlineAISuggestion.visible && !isFocusMode;
    const filteredTemplates = useMemo(() => {
        const query = templateSearch.trim().toLowerCase();
        if (!query) return GTM_TEMPLATES;
        return GTM_TEMPLATES.filter((template) =>
            template.name.toLowerCase().includes(query) ||
            template.description.toLowerCase().includes(query)
        );
    }, [templateSearch]);
    const pageGapPx = 48;
    const handleScrollToPage = useCallback((pageNumber: number) => {
        if (!canvasScrollRef.current) return;
        const target = Math.max(0, (pageNumber - 1) * (pageHeightPx + pageGapPx));
        canvasScrollRef.current.scrollTo({ top: target, behavior: 'smooth' });
    }, [pageHeightPx]);

    useEffect(() => {
        if (!editor) {
            setPagePreviews([]);
            return;
        }
        const rawText = editor.getText?.() ?? '';
        if (!rawText.trim()) {
            setPagePreviews([]);
            return;
        }
        const words = rawText.trim().split(/\s+/);
        const previews: string[] = [];
        for (let page = 0; page < totalPages; page++) {
            const start = page * wordsPerPage;
            if (start >= words.length) break;
            const snippet = words.slice(start, start + 40).join(' ');
            previews.push(snippet);
        }
        setPagePreviews(previews);
    }, [editor, totalPages, wordCount]);

    useEffect(() => {
        if (!editor || typeof window === 'undefined') return;
        const handleSelectionUpdate = () => {
            const { view, state } = editor;
            if (!view || !state) return;
            const { from, to } = state.selection;
            if (from === to) {
                setInlineAISuggestion((current) => current.visible ? { ...current, visible: false } : current);
                return;
            }
            try {
                const coords = view.coordsAtPos(Math.min(to, view.state.doc.content.size));
                setInlineAISuggestion({
                    visible: true,
                    top: coords.top + window.scrollY - 36,
                    left: coords.left + window.scrollX,
                    text: state.doc.textBetween(from, to).slice(0, 120)
                });
            } catch (error) {
                setInlineAISuggestion((current) => current.visible ? { ...current, visible: false } : current);
            }
        };
        const handleBlur = () => {
            setInlineAISuggestion((current) => current.visible ? { ...current, visible: false } : current);
        };
        editor.on('selectionUpdate', handleSelectionUpdate);
        editor.on('blur', handleBlur);
        return () => {
            editor.off('selectionUpdate', handleSelectionUpdate);
            editor.off('blur', handleBlur);
        };
    }, [editor]);
    const workspaceBackdrop = isFocusMode
        ? undefined
        : ({ backgroundImage: 'linear-gradient(120deg, #fffdf3 0%, #fef3c7 35%, #e0f2fe 100%)' } as React.CSSProperties);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-[#fffdf3]">
                <div className="flex flex-col items-center gap-4">
                    {/* Square spinner animation */}
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-4 border-black animate-spin" style={{ animationDuration: '1.2s' }} />
                        <div className="absolute inset-2 border-2 border-gray-400 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
                    </div>
                    <p className="text-black font-mono text-sm font-medium">Loading document...</p>
                </div>
            </div>
        );
    }

    const currentFontFamilyAttr = editor ? editor.getAttributes('textStyle').fontFamily : undefined;
    const currentFontFamilyId = resolveFontFamilyId(currentFontFamilyAttr);
    const currentFontSizeValue = editor ? (editor.getAttributes('textStyle').fontSize || 'default') : 'default';

    return (
        <div
            data-testid="doc-editor"
            className={`h-full flex flex-col ${isFocusMode ? 'fixed inset-0 z-50 bg-white' : ''}`}
            style={workspaceBackdrop}
        >
            {/* Hero Header */}
            {!isFocusMode && (
                <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-5">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={onClose}
                                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-full text-[11px] font-semibold uppercase tracking-wide hover:bg-gray-100"
                            >
                                <CornerUpLeft size={16} />
                                Back
                            </button>
                            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                                <div className="w-12 h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center text-xl">
                                    {docTypeIcon}
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full text-2xl font-semibold bg-transparent border-b border-transparent focus:border-gray-400 focus:outline-none focus:ring-0 px-0"
                                        placeholder="Untitled GTM Doc"
                                    />
                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-semibold text-gray-600">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                            {docTypeIcon} {docTypeLabel}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${visibilityBadgeClass}`}>
                                            {visibility === 'private' ? '🔒 Private' : '👥 Team Share'}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                            📍 {workspaceName}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <div className="flex items-center gap-1 text-xs font-semibold text-gray-600">
                                    <span className={`w-2 h-2 rounded-full ${isSaving ? 'bg-yellow-400' : collabStatus === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                    {docStatusLabel}
                                </div>
                                {activeUsers.length > 0 && (
                                    <div className="flex -space-x-2">
                                        {activeUsers.map((user, i) => (
                                            <div
                                                key={i}
                                                className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] text-white"
                                                title={user.user?.name || 'Collaborator'}
                                            >
                                                {(user.user?.name || 'U')[0]}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowShareModal(true)}
                                    disabled={!docId}
                                    title={!docId ? 'Save this doc before sharing with the workspace' : undefined}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Share2 size={16} /> Share
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full ${isSaving ? 'bg-gray-200 text-gray-500' : 'bg-[#1c1b1f] text-white hover:bg-black'}`}
                                >
                                    <Save size={16} /> {isSaving ? 'Saving…' : 'Save' }
                                </button>
                            </div>
                        </div>

                        {collabWarning && (
                            <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 shadow-sm">
                                <AlertTriangle size={16} />
                                <span>{collabWarning}</span>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 justify-between text-xs text-gray-600">
                            <div className="flex flex-wrap gap-2">
                                {displayedTags.length ? (
                                    displayedTags.map((tag) => (
                                        <span key={tag} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-mono">
                                            #{tag}
                                        </span>
                                    ))
                                ) : (
                                    <span className="px-3 py-1 rounded-full border border-dashed border-gray-300 text-gray-500">
                                        + Add tags for smarter AI prompts
                                    </span>
                                )}
                                {extraTagCount > 0 && (
                                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-mono">
                                        +{extraTagCount} more
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setShowDocSettings(true)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 hover:bg-gray-100"
                                >
                                    <Settings size={14} /> Doc settings
                                </button>
                                <button
                                    onClick={handleSaveToFileLibrary}
                                    disabled={!docId}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                                >
                                    <FilePlus size={14} /> Save to library
                                </button>
                                <button
                                    onClick={() => setShowResearchSidebar(true)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 hover:bg-gray-100"
                                >
                                    <Globe size={14} /> Research
                                </button>
                                {isAIPaletteEnabled && (
                                    <button
                                        onClick={handleOpenAIPalette}
                                        disabled={contextLoading || !workspaceContext}
                                        title={contextError ? `Context load failed: ${contextError.message}` : contextLoading ? 'Loading context...' : undefined}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 ${
                                            contextLoading || !workspaceContext
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:bg-gray-100'
                                        }`}
                                    >
                                        {contextLoading ? (
                                            <RefreshCw size={14} className="animate-spin" />
                                        ) : contextError ? (
                                            <AlertTriangle size={14} className="text-amber-500" />
                                        ) : (
                                            <Sparkles size={14} />
                                        )}
                                        AI Copilot
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsFocusMode(true)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 hover:bg-gray-100"
                                >
                                    <Maximize2 size={14} /> Focus mode
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 ${showExportMenu ? 'ring-2 ring-gray-200' : ''}`}
                                    aria-expanded={showExportMenu}
                                >
                                    <Download size={16} /> Export
                                    <ChevronDownIcon size={16} />
                                </button>
                                {showExportMenu && (
                                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-60 py-2">
                                        <button onClick={() => { handleExport('pdf'); setShowExportMenu(false); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm">
                                            <Download size={14} /> PDF (.pdf)
                                        </button>
                                        <button onClick={() => { handleExport('markdown'); setShowExportMenu(false); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm">
                                            <FileText size={14} /> Markdown (.md)
                                        </button>
                                        <button onClick={() => { handleExport('html'); setShowExportMenu(false); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm">
                                            <Layout size={14} /> HTML (.html)
                                        </button>
                                        <button onClick={() => { handleExport('text'); setShowExportMenu(false); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm">
                                            <Type size={14} /> Plain text (.txt)
                                        </button>
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                            <button
                                                onClick={() => {
                                                    setShowExportSettingsModal(true);
                                                    setShowExportMenu(false);
                                                }}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex flex-col text-sm"
                                            >
                                                <span className="inline-flex items-center gap-2 font-semibold">
                                                    <Settings size={14} /> Advanced PDF settings
                                                </span>
                                                <span className="text-xs text-gray-500">Page size, cover page, branding</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {isCanvasModeEnabled && (
                                <button
                                    onClick={() => setShowTemplateMenu(true)}
                                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-dashed border-gray-300 bg-white hover:bg-gray-50 transition ${showTemplateMenu ? 'shadow-md border-gray-400' : ''}`}
                                >
                                    <Layout size={16} /> Template shelf
                                    <span className="text-[11px] uppercase tracking-[0.3em] text-gray-400">⌘ + Shift + T</span>
                                </button>
                            )}
                        </div>

                        {isCanvasModeEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {docSummaryCards.map((card) => (
                                    <div key={card.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                                        <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                                            {card.icon} {card.title}
                                        </div>
                                        <div className="text-2xl font-semibold mt-1">{card.value}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{card.helper}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Toolbar */}
            {editor && !isFocusMode && (
                <DocEditorToolbar
                    editor={editor}
                    fontFamilyOptions={fontFamilyOptions}
                    fontSizeOptions={fontSizeOptions}
                    lineSpacingOptions={lineSpacingOptions}
                    currentFontFamilyId={currentFontFamilyId}
                    currentFontSizeValue={currentFontSizeValue}
                    lineSpacing={lineSpacing}
                    getFontStackById={getFontStackById}
                    onLineSpacingChange={setLineSpacing}
                    selectedColor={selectedColor}
                    selectedHighlight={selectedHighlight}
                    showAdvancedColorPicker={showAdvancedColorPicker}
                    showAdvancedHighlightPicker={showAdvancedHighlightPicker}
                    onColorChange={setSelectedColor}
                    onHighlightChange={setSelectedHighlight}
                    onToggleColorPicker={() => setShowAdvancedColorPicker(!showAdvancedColorPicker)}
                    onToggleHighlightPicker={() => setShowAdvancedHighlightPicker(!showAdvancedHighlightPicker)}
                    showLinkInput={showLinkInput}
                    linkUrl={linkUrl}
                    onLinkUrlChange={setLinkUrl}
                    onToggleLinkInput={() => setShowLinkInput(!showLinkInput)}
                    onAddLink={() => { if(linkUrl) editor.chain().focus().setLink({ href: linkUrl }).run(); setShowLinkInput(false); }}
                    onOpenImageUpload={() => setShowImageUploadModal(true)}
                    onOpenChartInsert={() => setShowChartQuickInsert(true)}
                />
            )}

            {/* Focus Mode Exit Button */}
            {isFocusMode && (
                <button
                    onClick={() => setIsFocusMode(false)}
                    className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-yellow-400 text-slate-900 rounded-xl shadow-lg font-semibold text-sm hover:bg-yellow-500 hover:shadow-xl transition-all"
                >
                    <Minimize2 size={24} />
                </button>
            )}

            {/* Main Content */}
            <div 
                className={`flex-1 relative ${isFocusMode ? 'bg-white overflow-auto' : 'bg-[#f7f7fb] overflow-hidden'}`}
                onContextMenu={(e) => {
                    if (isFocusMode) {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY });
                    }
                }}
                onClick={() => setContextMenu(null)}
            >
                {!isFocusMode && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle at 25% 20%, rgba(148, 163, 184, 0.18), transparent 60%), radial-gradient(circle at 75% 0%, rgba(226, 232, 240, 0.45), transparent 55%)'
                        }}
                    />
                )}
                {/* Editor Area */}
                <div ref={canvasScrollRef} className="flex-1 overflow-y-auto overflow-x-visible w-full flex justify-center px-4 lg:px-12 py-6">
                    <style key={`editor-styles-${lineSpacing}-${paragraphSpacing}`}>{`
                        /* Page Break Styles */
                        .ProseMirror .page-break {
                            margin: 2rem 0;
                            padding: 1rem 0;
                            border: none;
                            border-top: 2px dashed #ccc;
                            border-bottom: 2px dashed #ccc;
                            position: relative;
                            page-break-after: always;
                            break-after: page;
                        }
                        .ProseMirror .page-break::before {
                            content: '📄 Page Break';
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            background: white;
                            padding: 0.25rem 0.75rem;
                            font-size: 0.75rem;
                            font-weight: bold;
                            color: #999;
                            border: 1px solid #ccc;
                            border-radius: 4px;
                        }
                        @media print {
                            .ProseMirror .page-break {
                                border: none;
                                margin: 0;
                                padding: 0;
                            }
                            .ProseMirror .page-break::before {
                                display: none;
                            }
                        }
                        
                        /* Table Styles */
                        .ProseMirror table {
                            border-collapse: collapse;
                            table-layout: fixed;
                            width: 100%;
                            margin: 1rem 0;
                            overflow: hidden;
                        }
                        .ProseMirror table td,
                        .ProseMirror table th {
                            min-width: 1em;
                            border: 1px solid #ced4da;
                            padding: 0.5rem;
                            vertical-align: top;
                            box-sizing: border-box;
                            position: relative;
                        }
                        .ProseMirror table th {
                            background-color: #f8f9fa;
                            font-weight: bold;
                            text-align: left;
                        }
                        .ProseMirror table .selectedCell {
                            background-color: #e9ecef;
                        }
                        
                        /* Task List Styles */
                        .ProseMirror ul[data-type="taskList"] {
                            list-style: none;
                            padding: 0;
                        }
                        .ProseMirror ul[data-type="taskList"] li {
                            display: flex;
                            align-items: flex-start;
                            margin: 0.25rem 0;
                        }
                        .ProseMirror ul[data-type="taskList"] li > label {
                            flex: 0 0 auto;
                            margin-right: 0.5rem;
                            user-select: none;
                        }
                        .ProseMirror ul[data-type="taskList"] li > div {
                            flex: 1 1 auto;
                        }
                        .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
                            width: 1.2rem;
                            height: 1.2rem;
                            cursor: pointer;
                            margin-top: 0.15rem;
                        }
                        
                        /* Image Styles */
                        .ProseMirror img {
                            max-width: 100%;
                            height: auto;
                            display: block;
                            margin: 1rem auto;
                        }
                        
                        /* Link Styles */
                        .ProseMirror a {
                            color: #2563eb;
                            text-decoration: underline;
                            cursor: pointer;
                        }
                        .ProseMirror a:hover {
                            color: #1d4ed8;
                        }

                        /* Citation Styles */
                        .doc-citation {
                            font-size: 0.75rem;
                            vertical-align: super;
                            margin-left: 0.15rem;
                        }
                        .doc-citation a {
                            color: #4338ca;
                            text-decoration: none;
                            font-weight: 600;
                        }
                        .doc-citation a:hover {
                            text-decoration: underline;
                        }

                        .doc-reference-divider {
                            margin-top: 2rem;
                            margin-bottom: 1rem;
                            border: none;
                            border-top: 1px solid #e5e7eb;
                        }

                        .doc-footnote {
                            font-size: 0.95rem;
                            color: #475467;
                            margin-top: 0.5rem;
                            line-height: 1.5;
                        }
                        .doc-footnote a {
                            color: #2563eb;
                            text-decoration: underline;
                        }
                        
                        /* Highlight Styles */
                        .ProseMirror mark {
                            padding: 0.125rem 0.25rem;
                            border-radius: 0.25rem;
                        }
                        
                        /* Focus Styles */
                        .ProseMirror .has-focus {
                            border-radius: 4px;
                            box-shadow: 0 0 0 2px #93c5fd;
                        }
                        
                        /* Resizable Image Styles */
                        .resizable-image-container {
                            margin: 1rem 0;
                            text-align: center;
                        }
                        .resizable-image-container[data-alignment="left"] {
                            text-align: left;
                        }
                        .resizable-image-container[data-alignment="right"] {
                            text-align: right;
                        }
                        .resizable-image-container[data-alignment="center"] {
                            text-align: center;
                        }
                        .resizable-image-wrapper {
                            display: inline-block;
                            position: relative;
                        }
                        
                        /* YouTube Embed Styles */
                        .ProseMirror iframe[data-youtube-video] {
                            aspect-ratio: 16 / 9;
                            width: 100%;
                            border: none;
                            margin: 1rem 0;
                            border-radius: 8px;
                        }
                        
                        /* Dropcursor Styles */
                        .ProseMirror .ProseMirror-dropcursor {
                            background-color: #2563eb;
                            width: 2px;
                        }
                        .ProseMirror {
                            font-family: 'Inter', 'Google Sans', 'Helvetica Neue', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            font-size: 1.05rem;
                            line-height: ${lineSpacing} !important;
                            letter-spacing: 0.01em;
                            color: #1c1d21;
                        }
                        .ProseMirror p,
                        .ProseMirror li,
                        .ProseMirror blockquote {
                            line-height: ${lineSpacing} !important;
                        }
                        .ProseMirror h1 {
                            font-size: 2.35rem;
                            font-weight: 600;
                            letter-spacing: -0.01em;
                            margin: 3rem 0 1.25rem;
                        }
                        .ProseMirror h2 {
                            font-size: 1.85rem;
                            font-weight: 600;
                            margin: 2.5rem 0 1rem;
                        }
                        .ProseMirror h3 {
                            font-size: 1.35rem;
                            font-weight: 600;
                            margin: 2rem 0 0.75rem;
                        }
                        .ProseMirror p {
                            margin: 0 0 ${paragraphSpacing}rem;
                        }
                        .ProseMirror blockquote {
                            border-left: 4px solid #d1d5db;
                            padding-left: 1rem;
                            font-style: italic;
                            color: #475467;
                        }
                        .ProseMirror ul,
                        .ProseMirror ol {
                            margin: 0 0 ${Math.max(paragraphSpacing - 0.2, 0.8)}rem 1.5rem;
                        }
                        .ProseMirror code {
                            font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                            font-size: 0.95em;
                            background: #f1f5f9;
                            padding: 0.15rem 0.4rem;
                            border-radius: 0.375rem;
                        }
                        .ProseMirror ::selection {
                            background: rgba(129, 140, 248, 0.45);
                        }
                    `}</style>

                    <div className="w-full max-w-[1100px] flex flex-col gap-5 overflow-visible">
                        <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 font-medium px-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="uppercase tracking-[0.35em] text-gray-400">Canvas</span>
                                <span>{wordCount.toLocaleString()} words</span>
                                <span className="text-gray-300">•</span>
                                <span>{estimatedReadMinutes} min read</span>
                                <span className="hidden lg:inline text-gray-300">•</span>
                                <span className="hidden lg:inline">{characterCount.toLocaleString()} characters</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span>{lastSavedLabel}</span>
                                <div className="flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${collabStatus === 'connected' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                    {collabStatus === 'connected' ? 'Live sync on' : 'Offline editing'}
                                </div>
                            </div>
                        </div>

                        {/* Professional Canvas Toolbar */}
                        {isCanvasModeEnabled && (
                            <ProCanvasToolbar
                                activeTool={activeCanvasTool as ProCanvasTool}
                                onToolChange={(tool) => setActiveCanvasTool(tool as CanvasTool)}
                                zoom={zoomLevel}
                                onZoomChange={setZoomLevel}
                                canUndo={editor?.can().undo() ?? false}
                                canRedo={editor?.can().redo() ?? false}
                                onUndo={() => editor?.chain().focus().undo().run()}
                                onRedo={() => editor?.chain().focus().redo().run()}
                                gridVisible={isCanvasGridVisible}
                                onToggleGrid={() => toggleCanvasGrid()}
                                rulersVisible={showRulers}
                                onToggleRulers={handleToggleRulers}
                                snapEnabled={snapEnabled}
                                onToggleSnap={handleToggleSnap}
                                selectedCount={selectedElements.length}
                                onInsertTextBox={handleInsertTextBox}
                                onInsertSignature={handleInsertSignature}
                                onInsertShape={handleInsertShape}
                                onInsertFrame={handleInsertFrame}
                                onDelete={() => editor?.chain().focus().deleteSelection().run()}
                                onDuplicate={() => {
                                    // TODO: Implement duplicate
                                }}
                            />
                        )}

                        {/* Document Info Bar - Minimized */}
                        <div className="flex items-center justify-between px-4 py-2 text-[11px] text-gray-500 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <span>Doc: 8.5" × 11"</span>
                                <span>•</span>
                                <span>Margins: 1"</span>
                                <span>•</span>
                                <span>{docTypeLabel}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{wordCount.toLocaleString()} words</span>
                                <span>•</span>
                                <span>{estimatedReadMinutes} min read</span>
                            </div>
                        </div>

                        {/* Professional Canvas Area */}
                        <div className="relative flex-1 overflow-auto" ref={canvasScrollRef}>
                            <ProGridOverlay
                                show={isCanvasModeEnabled && isCanvasGridVisible}
                                zoom={zoomLevel}
                                gridSize={canvasGridSize}
                                showRulers={showRulers}
                                showGuides={true}
                                guides={canvasGuides}
                                onAddGuide={handleAddGuide}
                                onRemoveGuide={handleRemoveGuide}
                                onMoveGuide={handleMoveGuide}
                                snapThreshold={snapEnabled ? 8 : 0}
                                pageWidth={816}
                                pageHeight={1056}
                                className="min-h-full p-8"
                            >
                                {/* Snap Lines Overlay */}
                                {activeSnapLines.length > 0 && (
                                    <SnapLinesOverlay
                                        lines={activeSnapLines as any}
                                        zoom={zoomLevel}
                                        offsetX={showRulers ? 24 : 0}
                                        offsetY={showRulers ? 24 : 0}
                                    />
                                )}

                                {/* Document Page */}
                                <div 
                                    className="relative mx-auto bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-transform"
                                    style={{
                                        width: 816 * (zoomLevel / 100),
                                        minHeight: 1056 * (zoomLevel / 100),
                                        transformOrigin: 'top center',
                                    }}
                                >
                                    {/* Page Header */}
                                    <div className="absolute top-4 left-8 right-8 flex items-center justify-between text-[10px] text-gray-400 font-medium tracking-wide pointer-events-none select-none">
                                        <span>{workspaceName}</span>
                                        <span>Page 1</span>
                                    </div>

                                    {/* Editor Content */}
                                    <div className="px-12 py-16" style={{ fontSize: `${14 * (zoomLevel / 100)}px` }}>
                                        <EditorContent 
                                            editor={editor} 
                                            className="h-full min-h-[800px] focus:outline-none prose prose-sm max-w-none text-gray-900"
                                            style={{ 
                                                lineHeight: lineSpacing,
                                            }}
                                        />
                                    </div>

                                    {/* Page Footer */}
                                    <div className="absolute bottom-4 left-8 right-8 flex items-center justify-center text-[10px] text-gray-400 font-medium pointer-events-none select-none">
                                        <span>1</span>
                                    </div>
                                </div>
                            </ProGridOverlay>
                        </div>

                        {/* Bottom Status Bar */}
                        <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-white">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-700">{characterCount.toLocaleString()} characters</span>
                                <span>•</span>
                                <span>{lastSavedLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">⌘K</kbd>
                                <span>AI Assistant</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Zoom Controls */}
            {isCanvasModeEnabled && !isFocusMode && (
                <ZoomControls
                    zoom={zoomLevel}
                    onZoomChange={setZoomLevel}
                    showMinimap={true}
                    onToggleMinimap={handleToggleMinimap}
                    minimapVisible={showMinimap}
                />
            )}

            {/* Minimap */}
            {isCanvasModeEnabled && showMinimap && (
                <Minimap
                    visible={showMinimap}
                    canvasWidth={816}
                    canvasHeight={1056}
                    viewportWidth={800}
                    viewportHeight={600}
                    scrollX={canvasScrollPosition.x}
                    scrollY={canvasScrollPosition.y}
                    zoom={zoomLevel}
                    onNavigate={handleCanvasNavigate}
                    elements={Object.values(blocksMetadataRef.current).map(block => ({
                        x: block.position?.x ?? 0,
                        y: block.position?.y ?? 0,
                        width: block.size?.width ?? 100,
                        height: block.size?.height ?? 50,
                        type: block.type,
                    }))}
                />
            )}

            {/* Template Shelf - Top Floating */}
            {!isFocusMode && isCanvasModeEnabled && (
                <div
                    className={`fixed left-1/2 z-30 w-full max-w-[1200px] px-4 transition-all duration-300 ${showTemplateMenu ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-6 pointer-events-none'}`}
                    style={{ top: '140px', transform: 'translateX(-50%)' }}
                    aria-hidden={!showTemplateMenu}
                >
                    <div className="rounded-3xl border border-gray-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
                        <div className="flex flex-wrap gap-3 items-center px-5 py-3 border-b border-gray-100">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                <Layout size={16} /> Template Shelf
                                <span className="text-[11px] uppercase tracking-[0.35em] text-gray-400">⌘ + Shift + T</span>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={templateSearch}
                                        onChange={(e) => setTemplateSearch(e.target.value)}
                                        placeholder="Search templates"
                                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                    />
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
                                {['All', 'Launch', 'Persona', 'Campaign', 'Ops'].map((chip) => (
                                    <button
                                        key={chip}
                                        onClick={() => setTemplateSearch(chip === 'All' ? '' : chip)}
                                        className={`px-3 py-1 rounded-full border ${templateSearch === chip || (chip === 'All' && !templateSearch) ? 'border-gray-900 text-gray-900 bg-gray-100' : 'border-gray-200 hover:border-gray-400'}`}
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowTemplateMenu(false)}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                                aria-label="Close template shelf"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="px-5 py-4 overflow-hidden">
                            {filteredTemplates.length === 0 ? (
                                <div className="text-center text-sm text-gray-500 py-6">
                                    No templates match that search.
                                </div>
                            ) : (
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {filteredTemplates.slice(0, 40).map((template) => (
                                        <div key={template.id} className="min-w-[220px] max-w-[240px] flex-shrink-0 border border-gray-200 rounded-2xl p-3 bg-white hover:border-gray-400 transition">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                                <span className="text-lg">{template.icon}</span>
                                                <span className="truncate">{template.name}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                                            <div className="flex items-center justify-between mt-3 text-[11px] text-gray-400">
                                                <span>GTM Doc</span>
                                                <button
                                                    onClick={() => { handleApplyTemplate(template); setShowTemplateMenu(false); }}
                                                    className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-900 text-white hover:bg-black"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Document Settings Modal */}
            {showDocSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Document Settings</h3>
                            <button onClick={() => setShowDocSettings(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                                <select
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value as DocType)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    {Object.entries(DOC_TYPE_LABELS).map(([type, label]) => (
                                        <option key={type} value={type}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setVisibility('team')}
                                        className={`flex-1 px-3 py-2 rounded-md border ${visibility === 'team' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        👥 Team
                                    </button>
                                    <button
                                        onClick={() => setVisibility('private')}
                                        className={`flex-1 px-3 py-2 rounded-md border ${visibility === 'private' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        🔒 Private
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                                <input
                                    type="text"
                                    placeholder="Add tags (comma separated)"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const input = e.currentTarget;
                                            const newTags = input.value.split(',').map(t => t.trim()).filter(Boolean);
                                            setTags([...tags, ...newTags]);
                                            input.value = '';
                                        }
                                    }}
                                />
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {tags.map((tag, idx) => (
                                        <span key={idx} className="px-2 py-1 text-xs bg-gray-100 rounded-full flex items-center gap-1">
                                            {tag}
                                            <button onClick={() => setTags(tags.filter((_, i) => i !== idx))} className="text-gray-500 hover:text-red-500">×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-gray-200">
                                <button
                                    onClick={handleSaveToFileLibrary}
                                    disabled={!docId}
                                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> Save to File Library
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {docId && showShareModal && (
                <DocShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    workspaceId={workspaceId}
                    docId={docId}
                    docTitle={title}
                    visibility={visibility}
                    data={data}
                    onVisibilityChange={(next) => setVisibility(next)}
                    onLinksUpdated={onReloadList}
                    isDocOwner={!docOwnerId || docOwnerId === userId}
                    workspaceRole={workspaceRole}
                    planType={planType}
                />
            )}

            {/* AI Command Palette */}
            {showAICommandPalette && isAIPaletteEnabled && editor && workspaceContext && (
                <AICommandPalette
                    editor={editor}
                    position={aiPalettePosition}
                    onClose={() => setShowAICommandPalette(false)}
                    workspaceContext={workspaceContext}
                    docType={docType}
                    data={data}
                    docTitle={title}
                    workspaceName={workspace?.name || null}
                    tags={tags}
                    planType={planType}
                    workspaceRole={workspaceRole}
                    onUpgradeNeeded={onUpgradeNeeded}
                />
            )}

            {/* Image Upload Modal */}
            {showImageUploadModal && editor && (
                <ImageUploadModal
                    workspaceId={workspaceId}
                    docId={docId}
                    onInsert={(url, alt) => {
                        editor.chain().focus().setResizableImage({ src: url, alt }).run();
                    }}
                    onClose={() => setShowImageUploadModal(false)}
                />
            )}

            {/* Chart Quick Insert Modal */}
            {showChartQuickInsert && editor && (
                <ChartQuickInsert
                    editor={editor}
                    onClose={() => setShowChartQuickInsert(false)}
                    data={data}
                />
            )}

            {/* Export Settings Modal */}
            <DocEditorExportModal
                isOpen={showExportSettingsModal}
                onClose={() => setShowExportSettingsModal(false)}
                title={title}
                exportSettings={exportSettings}
                exportPresets={exportPresets}
                selectedPresetId={selectedPresetId}
                defaultPresetId={defaultPresetId}
                workspaceDefaultPreset={workspaceDefaultPreset}
                newPresetName={newPresetName}
                presetFormError={presetFormError}
                onExportSettingChange={handleExportSettingChange}
                onApplyPreset={handleApplyPreset}
                onCreatePreset={handleCreatePreset}
                onUpdateSelectedPreset={handleUpdateSelectedPreset}
                onDeleteSelectedPreset={handleDeleteSelectedPreset}
                onSetDefaultPreset={handleSetDefaultPreset}
                onResetSettings={handleResetExportSettings}
                onSavePreferences={handleSaveExportPreferences}
                onNewPresetNameChange={setNewPresetName}
                onExport={handleExport}
            />

            {/* Research Copilot */}
            <ResearchCopilot
                isOpen={showResearchSidebar && !isFocusMode}
                onClose={() => setShowResearchSidebar(false)}
                editor={editor}
                docTitle={title}
                docTypeLabel={docTypeLabel}
                workspaceName={workspaceName}
                tags={tags}
                workspaceId={workspaceId}
                docId={docId}
            />

            {/* Context Menu (Focus Mode) */}
            {contextMenu && (
                <div 
                    className="fixed z-50 bg-white shadow-xl border border-gray-200 rounded-lg p-2 flex flex-col gap-1 min-w-[200px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <div className="text-xs font-semibold text-gray-500 px-3 py-1 uppercase">Quick Actions</div>
                    <button onClick={() => { editor?.chain().focus().toggleBold().run(); setContextMenu(null); }} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-sm text-left"><Bold size={14} /> Bold</button>
                    <button onClick={() => { editor?.chain().focus().toggleItalic().run(); setContextMenu(null); }} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-sm text-left"><Italic size={14} /> Italic</button>
                    <button onClick={() => { editor?.chain().focus().toggleStrike().run(); setContextMenu(null); }} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-sm text-left"><Strikethrough size={14} /> Strikethrough</button>
                    <div className="h-px bg-gray-200 my-1"></div>
                    {isAIPaletteEnabled && (
                        <button onClick={() => { handleOpenAIPalette(); setContextMenu(null); }} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-sm text-left text-purple-600"><span className="text-lg">✨</span> AI Assistant</button>
                    )}
                </div>
            )}

            {/* Bubble Menu - Full Toolbar */}
            <DocEditorBubbleMenu
                editor={editor}
                fontFamilyOptions={fontFamilyOptions}
                fontSizeOptions={fontSizeOptions}
                currentFontFamilyId={currentFontFamilyId}
                currentFontSizeValue={currentFontSizeValue}
                isAIPaletteEnabled={isAIPaletteEnabled}
                onOpenAIPalette={handleOpenAIPalette}
                getFontStackById={getFontStackById}
            />

            {isCanvasModeEnabled && (
                <div aria-live="polite" className="sr-only">
                    {gridAnnouncement}
                </div>
            )}

            {/* Apply Template Confirmation Dialog */}
            <ConfirmDialog
                isOpen={applyTemplateConfirm.isOpen}
                onClose={applyTemplateConfirm.cancel}
                onConfirm={applyTemplateConfirm.confirm}
                title={applyTemplateConfirm.title}
                message={applyTemplateConfirm.message}
                confirmLabel={applyTemplateConfirm.confirmLabel}
                cancelLabel={applyTemplateConfirm.cancelLabel}
                variant={applyTemplateConfirm.variant}
                isLoading={applyTemplateConfirm.isProcessing}
            />

            {/* Save to File Library Confirmation Dialog */}
            <ConfirmDialog
                isOpen={saveToLibraryConfirm.isOpen}
                onClose={saveToLibraryConfirm.cancel}
                onConfirm={saveToLibraryConfirm.confirm}
                title={saveToLibraryConfirm.title}
                message={saveToLibraryConfirm.message}
                confirmLabel={saveToLibraryConfirm.confirmLabel}
                cancelLabel={saveToLibraryConfirm.cancelLabel}
                variant={saveToLibraryConfirm.variant}
                isLoading={saveToLibraryConfirm.isProcessing}
            />

        </div>
    );
};
