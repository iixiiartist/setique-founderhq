import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
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
import { HexColorPicker } from 'react-colorful';
import EmojiPicker from 'emoji-picker-react';
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
import * as Y from 'yjs';
import SupabaseProvider from 'y-supabase';
import { supabase } from '../../lib/supabase';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import { useFeatureFlags } from '../../contexts/FeatureFlagContext';
import { GridOverlay } from '../docs/canvas/GridOverlay';
import { CanvasPalette } from '../docs/canvas/CanvasPalette';
import { telemetry } from '../../lib/services/telemetry';
import { startHeartbeatMonitor, COLLAB_RESYNC_INTERVAL_MS, CollabBackoffController } from '../../lib/collab/supabaseProviderConfig';
import { v4 as uuidv4 } from 'uuid';

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
    Sparkles, Globe, AlertTriangle
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
    
    // Collaboration state
    const [provider, setProvider] = useState<SupabaseProvider | null>(null);
    const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
    const [collabStatus, setCollabStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [collabWarning, setCollabWarning] = useState<string | null>(null);

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
    const [isCanvasPaletteOpen, setIsCanvasPaletteOpen] = useState(isCanvasModeEnabled);
    const [isCanvasGridVisible, setIsCanvasGridVisible] = useState(true);
    const [canvasGridSize, setCanvasGridSize] = useState(16);
    const [gridAnnouncement, setGridAnnouncement] = useState('');
    const gridAnnouncementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const blocksMetadataRef = useRef<StructuredBlockMap>({});
    const blockMetadataSubscribers = useRef<Map<string, Set<(metadata?: StructuredBlock) => void>>>(new Map());
    const editorRef = useRef<Editor | null>(null);
    const canvasScrollRef = useRef<HTMLDivElement | null>(null);
    const heartbeatCleanupRef = useRef<(() => void) | null>(null);
    const offlineSinceRef = useRef<number | null>(null);
    const lastHeartbeatOnlineRef = useRef<boolean | null>(null);
    const offlineWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const offlineWarningBackoffRef = useRef(new CollabBackoffController([8000, 20000, 45000]));
    const lastStatusTelemetryRef = useRef<string | null>(null);
    const collabWarningLatchedRef = useRef(false);
    const bootStartRef = useRef<number>(Date.now());
    const bootTrackedRef = useRef(false);
    const handshakeStartRef = useRef<number | null>(null);
    const handshakeTrackedRef = useRef(false);

    const setLatchedCollabWarning = useCallback((message: string) => {
        collabWarningLatchedRef.current = true;
        setCollabWarning(message);
    }, []);

    const clearCollabWarning = useCallback(() => {
        collabWarningLatchedRef.current = false;
        setCollabWarning(null);
    }, []);

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

    const toggleCanvasPalette = useCallback(() => {
        if (!isCanvasModeEnabled) {
            return;
        }
        setIsCanvasPaletteOpen((prev) => {
            const next = !prev;
            emitCanvasTelemetry('canvas_shell_toggled', { open: next });
            return next;
        });
    }, [emitCanvasTelemetry, isCanvasModeEnabled]);

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

    useEffect(() => {
        if (docId) {
            const doc = new Y.Doc();
            const providerInstance = new SupabaseProvider(doc, supabase, {
                channel: `doc-collab-${docId}`,
                id: docId,
                tableName: 'gtm_docs',
                columnName: 'content',
                resyncInterval: COLLAB_RESYNC_INTERVAL_MS,
            });

            const connectionStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
            let handshakeLogged = false;
            handshakeStartRef.current = Date.now();
            handshakeTrackedRef.current = false;
            const statusListener = (event: any) => {
                setCollabStatus(event.status);

                if (lastStatusTelemetryRef.current !== event.status) {
                    lastStatusTelemetryRef.current = event.status;
                    telemetry.track('collab_channel_health', {
                        workspaceId,
                        userId,
                        docId,
                        metadata: {
                            event: 'status',
                            status: event.status,
                        },
                    });
                }

                if (!handshakeLogged && event.status === 'connected') {
                    handshakeLogged = true;
                    const latencySource = typeof performance !== 'undefined' ? performance.now() : Date.now();
                    telemetry.track('collab_channel_health', {
                        workspaceId,
                        userId,
                        docId,
                        metadata: {
                            event: 'handshake',
                            latencyMs: Math.round(latencySource - connectionStartedAt),
                        },
                    });
                }

                if (event.status === 'connected' && !handshakeTrackedRef.current) {
                    const durationMs = Math.max(0, Date.now() - (handshakeStartRef.current ?? Date.now()));
                    telemetry.track('yjs_handshake_latency', {
                        workspaceId,
                        userId,
                        docId,
                        metadata: {
                            durationMs,
                        },
                    });
                    handshakeTrackedRef.current = true;
                }
            };

            providerInstance.on('status', statusListener);

            const heartbeatCleanup = startHeartbeatMonitor({
                provider: providerInstance,
                onBeat: ({ online, timestamp }) => {
                    if (lastHeartbeatOnlineRef.current !== online) {
                        telemetry.track('collab_channel_health', {
                            workspaceId,
                            userId,
                            docId,
                            metadata: {
                                event: 'heartbeat',
                                online,
                                offlineDurationMs:
                                    !online && offlineSinceRef.current
                                        ? timestamp - offlineSinceRef.current
                                        : 0,
                            },
                        });
                        lastHeartbeatOnlineRef.current = online;
                    }

                    if (online) {
                        offlineSinceRef.current = null;
                        if (offlineWarningTimeoutRef.current) {
                            clearTimeout(offlineWarningTimeoutRef.current);
                            offlineWarningTimeoutRef.current = null;
                        }
                        offlineWarningBackoffRef.current.reset();
                        clearCollabWarning();
                    } else if (offlineSinceRef.current === null) {
                        offlineSinceRef.current = timestamp;
                        const delay = offlineWarningBackoffRef.current.nextDelay();
                        if (offlineWarningTimeoutRef.current) {
                            clearTimeout(offlineWarningTimeoutRef.current);
                        }
                        offlineWarningTimeoutRef.current = setTimeout(() => {
                            setLatchedCollabWarning('Realtime sync is offline. Edits remain local until we reconnect.');
                        }, delay);
                    } else if (offlineSinceRef.current) {
                        const offlineDuration = timestamp - offlineSinceRef.current;
                        if (offlineDuration > 60_000) {
                            setLatchedCollabWarning('Realtime sync lost for over a minute. Consider refreshing to reconnect.');
                        }
                    }
                },
            });

            heartbeatCleanupRef.current?.();
            heartbeatCleanupRef.current = heartbeatCleanup;

            const awarenessListener = () => {
                const states = Array.from(providerInstance.awareness.getStates().values());
                setActiveUsers(states);
            };
            providerInstance.awareness.on('change', awarenessListener);

            setYdoc(doc);
            setProvider(providerInstance);

            return () => {
                heartbeatCleanupRef.current?.();
                heartbeatCleanupRef.current = null;
                if (offlineWarningTimeoutRef.current) {
                    clearTimeout(offlineWarningTimeoutRef.current);
                    offlineWarningTimeoutRef.current = null;
                }
                offlineSinceRef.current = null;
                lastHeartbeatOnlineRef.current = null;
                clearCollabWarning();

                if (typeof providerInstance.awareness?.off === 'function') {
                    providerInstance.awareness.off('change', awarenessListener);
                }

                if (typeof providerInstance.off === 'function') {
                    providerInstance.off('status', statusListener);
                } else {
                    providerInstance.removeListener('status', statusListener);
                }

                providerInstance.destroy();
                doc.destroy();
            };
        }

        setYdoc(null);
        setProvider(null);
        setCollabStatus('disconnected');
        setActiveUsers([]);
        heartbeatCleanupRef.current?.();
        heartbeatCleanupRef.current = null;
        if (offlineWarningTimeoutRef.current) {
            clearTimeout(offlineWarningTimeoutRef.current);
            offlineWarningTimeoutRef.current = null;
        }
        offlineSinceRef.current = null;
        lastHeartbeatOnlineRef.current = null;
        clearCollabWarning();
    }, [docId, userId, workspaceId, clearCollabWarning, setLatchedCollabWarning]);
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

    useEffect(() => {
        if (docId) {
            const doc = new Y.Doc();
            
            // Initialize Supabase Provider for Yjs
            // Note: This requires Realtime to be enabled on the Supabase project
            // Constructor: (doc, supabase, config)
            const p = new SupabaseProvider(doc, supabase, {
                channel: `doc-collab-${docId}`,
                id: docId,
                tableName: 'gtm_docs',
                columnName: 'content',
            });
            
            p.on('status', (event: any) => {
                setCollabStatus(event.status);
            });

            p.awareness.on('change', () => {
                const states = Array.from(p.awareness.getStates().values());
                setActiveUsers(states);
            });

            setYdoc(doc);
            setProvider(p);

            return () => {
                p.destroy();
                doc.destroy();
            };
        } else {
            setYdoc(null);
            setProvider(null);
            setCollabStatus('disconnected');
            setActiveUsers([]);
        }
    }, [docId]);

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

    // Load document content
    useEffect(() => {
        if (docId && editor) {
            loadDoc();
        }
    }, [docId, editor]); // Re-run when editor is ready

    useEffect(() => {
        if (!docId && editor && !bootTrackedRef.current) {
            emitBootTelemetry({ source: 'new_doc', docType });
        }
    }, [docId, docType, editor, emitBootTelemetry]);

    const loadDoc = async () => {
        // If we already have content (from Yjs), don't overwrite it with DB content
        // unless the Yjs doc is empty (first load)
        if (!editor) return;
        
        // Check if Yjs has content. 
        // Note: editor.isEmpty is true for empty paragraph, but we want to know if Yjs has *any* updates.
        // If we are connected and Yjs has content, we trust Yjs.
        // But initially Yjs is empty until it syncs.
        
        setIsLoading(true);
        try {
            const { data, error } = await DatabaseService.loadGTMDocById(docId!, workspaceId);
            
            if (error) {
                console.error('Error loading doc:', error);
                trackStorageFailure('load', error, { operation: 'loadGTMDocById' });
                alert('Failed to load document. It may have been deleted or you may not have access.\n\nError: ' + (error as Error).message);
                return;
            } else if (data) {
                setTitle(data.title);
                setDocType(data.docType as DocType);
                setVisibility(data.visibility as DocVisibility);
                setTags(data.tags);
                const updatedAtValue = (data as GTMDoc).updatedAt || (data as any).updated_at;
                if (updatedAtValue) {
                    setLastSavedAt(new Date(updatedAtValue));
                }

                const metadata = (data as GTMDoc).blocksMetadata || {};
                blocksMetadataRef.current = metadata;
                setBlocksMetadata(metadata);
                Object.values(metadata).forEach((block) => {
                    if (block?.id) {
                        notifyBlockMetadata(block.id, block);
                    }
                });
                
                // Only set content if the editor is empty to avoid overwriting collaborative changes
                // or if we are sure we want to load from DB (e.g. initial load)
                const editorWasEmpty = editor.isEmpty;
                if (editorWasEmpty) {
                    if (data.contentJson) {
                        editor.commands.setContent(data.contentJson);
                    } else if (data.contentPlain) {
                        editor.commands.setContent(data.contentPlain);
                    }
                }

                emitBootTelemetry({
                    source: 'existing_doc',
                    docType: data.docType,
                    contentSource: editorWasEmpty
                        ? data.contentJson
                            ? 'database_json'
                            : data.contentPlain
                                ? 'database_plain'
                                : 'database_empty'
                        : 'yjs',
                });
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading doc:', error);
            trackStorageFailure('load', error, { operation: 'loadGTMDocById', phase: 'exception' });
            alert('Unexpected error loading document. Please try again.');
            setIsLoading(false);
        }
    };

    const handlePastedImage = async (file: File) => {
        if (!editor) return;

        try {
            // Validate the file
            const validation = validateImageFile(file);
            if (validation !== true) {
                alert(validation.error);
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
            alert(`Failed to upload pasted image: ${error.message || 'Unknown error'}`);
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
            alert(`Failed to export document: ${error.message || 'Unknown error'}`);
        }
    };

    const handleApplyTemplate = (template: DocumentTemplate) => {
        if (!editor) return;
        
        // Confirm if document has content
        const currentContent = editor.getText().trim();
        if (currentContent.length > 0) {
            const confirmed = window.confirm(
                `Applying a template will replace all current content.\n\nTemplate: ${template.name}\n\nAre you sure you want to continue?`
            );
            if (!confirmed) {
                setShowTemplateMenu(false);
                return;
            }
        }
        
        // Apply template content
        editor.commands.setContent(template.content);
        
        // Update document title if it's still "Untitled Document"
        if (title === 'Untitled Document') {
            setTitle(template.name);
        }
        
        // Close menu
        setShowTemplateMenu(false);
        
        // Focus editor
        editor.commands.focus();
    };

    // Removed handleSendToAI - use AI Command Palette (Cmd+K) instead
    const handleOpenAIPalette = () => {
        if (!editor || !aiPaletteEnabledRef.current) return;
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
                    alert('Failed to save document. Please try again.');
                    return;
                } else if (data) {
                    onSave(data as GTMDoc);
                    setLastSavedAt(new Date());
                    // Show success feedback (could be a toast, but for now alert or just console)
                    // We'll rely on the "Saved to cloud" text in the header updating
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
                    alert('Failed to create document. Please try again.');
                    return;
                } else if (data) {
                    onSave(data as GTMDoc);
                    setLastSavedAt(new Date());
                }
            }
        } catch (error) {
            console.error('Error saving doc:', error);
            trackStorageFailure('save', error, { operation: docId ? 'updateGTMDoc' : 'createGTMDoc', phase: 'exception' });
            alert('An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveToFileLibrary = async () => {
        if (!editor) {
            alert('Editor not ready');
            return;
        }

        const confirmed = window.confirm(
            'Save this document to the File Library? This will create an HTML version that can be shared and attached to tasks.'
        );
        
        if (!confirmed) return;

        try {
            // Get the HTML content
            const htmlContent = editor.getHTML();
            
            // Create a document entry in the file library
            const { data, error } = await DatabaseService.createDocument(userId, workspaceId, {
                name: `${title}.html`,
                module: 'workspace', // GTM Docs workspace
                mime_type: 'text/html',
                content: htmlContent,
                notes: {
                    gtmDocId: docId || null,
                    docType: docType,
                    tags: tags,
                    source: 'gtm_docs'
                }
            });

            if (error) {
                console.error('Error saving to file library:', error);
                alert('Failed to save to file library: ' + error.message);
            } else {
                alert('✅ Document saved to File Library!');
                // Reload the docs list to show the new file
                onReloadList?.();
            }
        } catch (error) {
            console.error('Error saving to file library:', error);
            alert('Failed to save to file library');
        }
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
        { id: 'inter', label: 'Inter', stack: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
        { id: 'roboto', label: 'Roboto', stack: 'Roboto, "Helvetica Neue", Arial, sans-serif' },
        { id: 'space-grotesk', label: 'Space Grotesk', stack: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif' },
        { id: 'ibm-plex', label: 'IBM Plex Sans', stack: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif' },
        { id: 'source-serif', label: 'Source Serif Pro', stack: '"Source Serif Pro", Georgia, serif' },
        { id: 'merriweather', label: 'Merriweather', stack: 'Merriweather, Georgia, serif' },
        { id: 'playfair', label: 'Playfair Display', stack: '"Playfair Display", Georgia, serif' },
        { id: 'dm-sans', label: 'DM Sans', stack: '"DM Sans", "Helvetica Neue", Arial, sans-serif' },
        { id: 'courier-prime', label: 'Courier Prime', stack: '"Courier Prime", "Courier New", monospace' }
    ];
    const fontSizeOptions = ['11px', '12px', '13px', '14px', '15px', '16px', '17px', '18px', '20px', '22px', '24px', '28px', '32px'];
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
                <div className="px-6 py-4 border-4 border-black rounded-3xl shadow-neo-sm bg-white text-gray-700 font-mono text-sm">
                    Loading your GTM doc...
                </div>
            </div>
        );
    }

    const currentFontFamilyAttr = editor ? editor.getAttributes('textStyle').fontFamily : undefined;
    const currentFontFamilyId = resolveFontFamilyId(currentFontFamilyAttr);
    const currentFontSizeValue = editor ? (editor.getAttributes('textStyle').fontSize || 'default') : 'default';

    return (
        <div
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
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 hover:bg-gray-100"
                                    >
                                        <Sparkles size={14} /> AI Copilot
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
                <div className="sticky top-4 z-20 mx-4 mt-4 bg-white/90 backdrop-blur border-2 border-black px-4 py-2 flex items-center gap-1 flex-wrap shadow-neo-sm rounded-2xl">
                    {/* Undo/Redo */}
                    <div className="flex items-center gap-0.5 border-r border-gray-300 pr-2 mr-1">
                        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-700"><Undo size={16} /></button>
                        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-700"><Redo size={16} /></button>
                        <button onClick={() => window.print()} className="p-1.5 rounded hover:bg-gray-200 text-gray-700"><Printer size={16} /></button>
                    </div>
                    
                    {/* Text Style */}
                    <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-1">
                        <select 
                            className="h-7 px-2 text-sm bg-transparent hover:bg-gray-200 rounded border-none focus:ring-0 cursor-pointer text-gray-700 font-medium"
                            onChange={(e) => {
                                if (e.target.value.startsWith('h')) {
                                    editor.chain().focus().toggleHeading({ level: parseInt(e.target.value.substring(1)) as any }).run();
                                } else {
                                    editor.chain().focus().setParagraph().run();
                                }
                            }}
                            value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
                        >
                            <option value="p">Normal text</option>
                            <option value="h1">Heading 1</option>
                            <option value="h2">Heading 2</option>
                            <option value="h3">Heading 3</option>
                        </select>
                        
                        <select 
                            className="h-7 px-2 text-sm bg-transparent hover:bg-gray-200 rounded border-none focus:ring-0 cursor-pointer w-28 text-gray-700"
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === 'system') {
                                    editor.chain().focus().unsetFontFamily().run();
                                } else {
                                    const stack = getFontStackById(value);
                                    if (stack) {
                                        editor.chain().focus().setFontFamily(stack).run();
                                    }
                                }
                            }}
                            value={currentFontFamilyId}
                        >
                            {fontFamilyOptions.map((option) => (
                                <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                        </select>

                        <select
                            className="h-7 px-2 text-sm bg-transparent hover:bg-gray-200 rounded border-none focus:ring-0 cursor-pointer w-24 text-gray-700"
                            value={currentFontSizeValue}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === 'default') {
                                    editor.chain().focus().unsetFontSize().run();
                                } else {
                                    editor.chain().focus().setFontSize(value).run();
                                }
                            }}
                        >
                            <option value="default">Font size</option>
                            {fontSizeOptions.map((size) => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>

                        <select
                            className="h-7 px-2 text-sm bg-transparent hover:bg-gray-200 rounded border-none focus:ring-0 cursor-pointer w-28 text-gray-700"
                            value={lineSpacing.toFixed(2)}
                            onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                        >
                            {lineSpacingOptions.map((option) => (
                                <option key={option.value} value={option.value.toString()}>{option.label} ({option.value.toFixed(2)})</option>
                            ))}
                        </select>
                    </div>

                    {/* Formatting */}
                    <div className="flex items-center gap-0.5 border-r border-gray-300 pr-2 mr-1">
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><Bold size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><Italic size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><UnderlineIcon size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><Strikethrough size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('subscript') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><SubscriptIcon size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('superscript') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><SuperscriptIcon size={16} /></button>
                        
                        <div className="relative">
                            <button onClick={() => setShowAdvancedColorPicker(!showAdvancedColorPicker)} className="p-1.5 rounded hover:bg-gray-200 flex items-center gap-1 text-gray-700">
                                <Palette size={16} />
                                <div className="w-3 h-3 border border-gray-300 rounded-sm" style={{ backgroundColor: selectedColor }}></div>
                            </button>
                            {showAdvancedColorPicker && (
                                <div className="absolute top-full left-0 mt-1 z-50 bg-white p-2 shadow-xl border border-gray-200 rounded-lg w-48">
                                    <HexColorPicker color={selectedColor} onChange={(color) => { setSelectedColor(color); editor.chain().focus().setColor(color).run(); }} />
                                    <button onClick={() => setShowAdvancedColorPicker(false)} className="w-full mt-2 text-xs bg-gray-100 hover:bg-gray-200 py-1 rounded">Close</button>
                                </div>
                            )}
                        </div>
                        
                        <div className="relative">
                            <button onClick={() => setShowAdvancedHighlightPicker(!showAdvancedHighlightPicker)} className="p-1.5 rounded hover:bg-gray-200 flex items-center gap-1 text-gray-700">
                                <Highlighter size={16} className={editor.isActive('highlight') ? 'text-yellow-500' : ''} />
                            </button>
                            {showAdvancedHighlightPicker && (
                                <div className="absolute top-full left-0 mt-1 z-50 bg-white p-2 shadow-xl border border-gray-200 rounded-lg w-48">
                                    <HexColorPicker color={selectedHighlight} onChange={(color) => { setSelectedHighlight(color); editor.chain().focus().toggleHighlight({ color }).run(); }} />
                                    <button onClick={() => setShowAdvancedHighlightPicker(false)} className="w-full mt-2 text-xs bg-gray-100 hover:bg-gray-200 py-1 rounded">Close</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alignment & Lists */}
                    <div className="flex items-center gap-0.5 border-r border-gray-300 pr-2 mr-1">
                        <button onClick={() => setShowLinkInput(!showLinkInput)} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><LinkIcon size={16} /></button>
                        {showLinkInput && (
                            <div className="absolute top-full mt-1 bg-white p-2 shadow-lg border border-gray-200 rounded z-50 flex gap-1">
                                <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="border rounded px-2 py-1 text-sm" placeholder="https://..." />
                                <button onClick={() => { if(linkUrl) editor.chain().focus().setLink({ href: linkUrl }).run(); setShowLinkInput(false); }} className="bg-blue-500 text-white px-2 py-1 rounded text-xs">Add</button>
                            </div>
                        )}
                        <button onClick={() => setShowImageUploadModal(true)} className="p-1.5 rounded hover:bg-gray-200 text-gray-700"><ImageIcon size={16} /></button>
                        
                        <div className="w-px h-4 bg-gray-300 mx-1"></div>
                        
                        <button 
                            onClick={() => {
                                if (editor.isActive('resizableImage')) {
                                    editor.chain().focus().updateAttributes('resizableImage', { alignment: 'left' }).run();
                                } else {
                                    editor.chain().focus().setTextAlign('left').run();
                                }
                            }} 
                            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) || editor.isActive('resizableImage', { alignment: 'left' }) ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}
                        >
                            <AlignLeft size={16} />
                        </button>
                        <button 
                            onClick={() => {
                                if (editor.isActive('resizableImage')) {
                                    editor.chain().focus().updateAttributes('resizableImage', { alignment: 'center' }).run();
                                } else {
                                    editor.chain().focus().setTextAlign('center').run();
                                }
                            }} 
                            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) || editor.isActive('resizableImage', { alignment: 'center' }) ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}
                        >
                            <AlignCenter size={16} />
                        </button>
                        <button 
                            onClick={() => {
                                if (editor.isActive('resizableImage')) {
                                    editor.chain().focus().updateAttributes('resizableImage', { alignment: 'right' }).run();
                                } else {
                                    editor.chain().focus().setTextAlign('right').run();
                                }
                            }} 
                            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) || editor.isActive('resizableImage', { alignment: 'right' }) ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}
                        >
                            <AlignRight size={16} />
                        </button>
                        
                        <div className="w-px h-4 bg-gray-300 mx-1"></div>
                        
                        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><List size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><ListOrdered size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('taskList') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><CheckSquare size={16} /></button>
                    </div>
                    
                    {/* Insert */}
                    <div className="flex items-center gap-0.5">
                        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-1.5 rounded hover:bg-gray-200 text-gray-700"><TableIcon size={16} /></button>
                        <button onClick={() => editor.chain().focus().setPageBreak().run()} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Page Break"><FilePlus size={16} /></button>
                        <button onClick={() => {
                            const url = prompt('Enter YouTube URL');
                            if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
                        }} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Insert YouTube"><YoutubeIcon size={16} /></button>
                        <button onClick={() => setShowChartQuickInsert(true)} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Insert Chart"><span className="text-sm">📊</span></button>
                        <button onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Clear Formatting"><span className="text-xs font-bold">Tx</span></button>
                    </div>
                </div>
            )}

            {/* Focus Mode Exit Button */}
            {isFocusMode && (
                <button
                    onClick={() => setIsFocusMode(false)}
                    className="fixed top-4 right-4 z-50 px-4 py-2 bg-yellow-300 border-2 border-black shadow-neo-sm rounded-full font-black text-sm hover:-translate-y-0.5 transition-all"
                >
                    <Minimize2 size={24} />
                </button>
            )}

            {isCanvasModeEnabled && !isFocusMode && (
                <CanvasPalette
                    isOpen={isCanvasPaletteOpen}
                    gridVisible={isCanvasGridVisible}
                    gridSize={canvasGridSize}
                    onToggleOpen={toggleCanvasPalette}
                    onToggleGrid={() => toggleCanvasGrid()}
                    onGridSizeChange={handleGridSizeChange}
                    onInsertTextBox={handleInsertTextBox}
                    onInsertSignature={handleInsertSignature}
                    activeUsers={activeUsers}
                    collabStatus={collabStatus}
                    collabWarning={collabWarning}
                />
            )}

            {/* Main Content */}
            <div 
                className={`flex-1 overflow-hidden relative ${isFocusMode ? 'bg-white' : 'bg-[#f7f7fb]'}`}
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
                <div ref={canvasScrollRef} className="flex-1 overflow-y-auto w-full flex justify-center px-4 lg:px-12 py-6">
                    <style>{`
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
                            line-height: ${lineSpacing};
                            letter-spacing: 0.01em;
                            color: #1c1d21;
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

                    <div className="w-full max-w-[1100px] flex flex-col gap-5">
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

                        <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur px-4 py-3 shadow-sm flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-gray-500">
                            <span>Doc width 8.5"</span>
                            <span className="text-gray-300">•</span>
                            <span>Margins 1"</span>
                            <span className="text-gray-300">•</span>
                            <span>Line height {lineSpacing.toFixed(2)}</span>
                            <span className="text-gray-300">•</span>
                            <span>{docTypeLabel}</span>
                            <div className="flex items-center gap-2 ml-auto tracking-normal text-[10px] text-gray-400">
                                <span className="uppercase">Zoom</span>
                                <select
                                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                                    className="text-[12px] font-semibold text-gray-700 border border-gray-300 rounded-lg px-2 py-1 bg-white"
                                >
                                    {zoomOptions.map((option) => (
                                        <option key={option} value={option}>{option}%</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-x-14 -top-8 h-8 rounded-t-2xl border border-gray-200 bg-gradient-to-b from-white via-white to-gray-50 shadow-sm flex items-end px-6 gap-6 overflow-hidden">
                                {Array.from({ length: 9 }).map((_, idx) => (
                                    <div key={idx} className="flex-1 relative h-full flex justify-center">
                                        <span className="absolute -top-4 text-[10px] text-gray-400 font-semibold">{idx}"</span>
                                        <span className="w-px h-4 bg-gray-300" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4">
                                <div className="hidden xl:flex flex-col items-center pt-10">
                                    <div className="text-[10px] uppercase tracking-[0.35em] text-gray-400 mb-2">Margin</div>
                                    <div className="w-12 rounded-2xl border border-gray-200 bg-white shadow-inner overflow-hidden">
                                        <div
                                            className="h-full w-full"
                                            style={{ backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '100% 16px' }}
                                        />
                                    </div>
                                </div>
                                <GridOverlay
                                    show={isCanvasModeEnabled && isCanvasGridVisible}
                                    gridSize={canvasGridSize}
                                    zoom={zoomLevel}
                                    className="flex-1"
                                >
                                    <div className="relative bg-white rounded-[32px] border border-gray-200 shadow-[0_40px_80px_rgba(15,23,42,0.12)] px-10 sm:px-14 py-14 sm:py-16">
                                        <div className="absolute inset-x-10 top-10 border-b border-dashed border-gray-200 text-[11px] text-gray-400 uppercase tracking-[0.35em] pb-2 flex items-center justify-between pointer-events-none select-none">
                                            <span>{workspaceName}</span>
                                            <span>Page 1</span>
                                        </div>
                                        <EditorContent 
                                            editor={editor} 
                                            className="mt-12 h-full min-h-[900px] focus:outline-none prose prose-lg max-w-none text-[#1c1d21] leading-[1.75]"
                                        />
                                    </div>
                                </GridOverlay>
                            </div>
                        </div>

                        <div className="sticky bottom-4 self-end flex flex-wrap items-center gap-3 bg-white/90 border border-gray-200 rounded-full px-5 py-2 text-xs text-gray-600 shadow-lg backdrop-blur">
                            <span className="font-semibold text-gray-900">{wordCount.toLocaleString()} words</span>
                            <span className="text-gray-300">•</span>
                            <span>{estimatedReadMinutes} min read</span>
                            <span className="text-gray-300">•</span>
                            <span>{characterCount.toLocaleString()} chars</span>
                            <span className="text-gray-300">•</span>
                            <span>{lastSavedLabel}</span>
                        </div>
                    </div>
                </div>
            </div>

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
            {showExportSettingsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-6 md:p-8 space-y-6">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400 font-semibold">Export</p>
                                <h3 className="text-2xl font-bold mt-2">Professional PDF settings</h3>
                                <p className="text-sm text-gray-600 mt-1">Pick the layout, cover, and branding that matches your investor updates and board-ready docs.</p>
                            </div>
                            <button
                                onClick={() => setShowExportSettingsModal(false)}
                                className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-500"
                                aria-label="Close export settings"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400 font-semibold">Workspace presets</p>
                                    <p className="text-sm text-gray-600">Save investor-ready layouts and reuse them across docs.</p>
                                </div>
                                {workspaceDefaultPreset && (
                                    <span className="text-xs font-semibold text-gray-600">Default: {workspaceDefaultPreset.name}</span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {exportPresets.length === 0 ? (
                                    <span className="text-xs text-gray-500">No presets yet—dial in your layout then save it below.</span>
                                ) : (
                                    exportPresets.map((preset) => (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => handleApplyPreset(preset.id)}
                                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                                selectedPresetId === preset.id
                                                    ? 'border-black bg-black text-white shadow-neo-btn'
                                                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                            }`}
                                        >
                                            {preset.name}
                                            {preset.id === defaultPresetId && <span className="text-amber-400">★</span>}
                                        </button>
                                    ))
                                )}
                            </div>
                            <form onSubmit={handleCreatePreset} className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    type="text"
                                    value={newPresetName}
                                    onChange={(event) => setNewPresetName(event.target.value)}
                                    className="flex-1 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
                                    placeholder="Preset name (e.g. Board Update)"
                                />
                                <button
                                    type="submit"
                                    className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-neo-btn disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={!newPresetName.trim()}
                                >
                                    Save preset
                                </button>
                            </form>
                            {presetFormError && <p className="text-xs text-red-500">{presetFormError}</p>}
                            {selectedPresetId && exportPresets.some((preset) => preset.id === selectedPresetId) && (
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={handleUpdateSelectedPreset}
                                        className="rounded-full border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:border-gray-500"
                                    >
                                        Update selected preset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSetDefaultPreset(selectedPresetId)}
                                        disabled={selectedPresetId === defaultPresetId}
                                        className="rounded-full border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Mark as workspace default
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteSelectedPreset}
                                        className="rounded-full border border-red-200 px-3 py-1.5 font-semibold text-red-600 hover:bg-red-50"
                                    >
                                        Delete preset
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-6">
                            <div className="space-y-4">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                                        Page size
                                        <select
                                            className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                                            value={exportSettings.pageSize}
                                            onChange={(e) => handleExportSettingChange('pageSize', e.target.value as ExportSettings['pageSize'])}
                                        >
                                            {exportPageSizeOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                                        Orientation
                                        <select
                                            className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                                            value={exportSettings.orientation}
                                            onChange={(e) => handleExportSettingChange('orientation', e.target.value as ExportSettings['orientation'])}
                                        >
                                            {exportOrientationOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                                        Margins (pts)
                                        <input
                                            type="number"
                                            min={36}
                                            max={96}
                                            step={2}
                                            value={exportSettings.margin}
                                            onChange={(e) => handleExportSettingChange('margin', Math.min(120, Math.max(24, Number(e.target.value) || 0)))}
                                            className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                                        />
                                        <span className="text-xs text-gray-500">Higher values leave more white space for headers/footers.</span>
                                    </label>
                                    <div className="text-sm font-semibold text-gray-700 flex flex-col gap-2">
                                        Options
                                        <label className="inline-flex items-center gap-2 text-sm font-normal text-gray-700">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-black focus:ring-black"
                                                checked={exportSettings.includeCoverPage}
                                                onChange={(e) => handleExportSettingChange('includeCoverPage', e.target.checked)}
                                            />
                                            Include cover page
                                        </label>
                                        <label className="inline-flex items-center gap-2 text-sm font-normal text-gray-700">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-black focus:ring-black"
                                                checked={exportSettings.includePageNumbers}
                                                onChange={(e) => handleExportSettingChange('includePageNumbers', e.target.checked)}
                                            />
                                            Include page numbers
                                        </label>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                                        Cover subtitle
                                        <input
                                            type="text"
                                            value={exportSettings.coverSubtitle}
                                            onChange={(e) => handleExportSettingChange('coverSubtitle', e.target.value)}
                                            className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                                            placeholder="Investor update • Q4"
                                        />
                                    </label>
                                    <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                                        Cover meta
                                        <input
                                            type="text"
                                            value={exportSettings.coverMeta}
                                            onChange={(e) => handleExportSettingChange('coverMeta', e.target.value)}
                                            className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                                            placeholder="Prepared for Board & Strategic Advisors"
                                        />
                                    </label>
                                </div>

                                <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-center">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-3">
                                        Brand color
                                        <input
                                            type="color"
                                            value={exportSettings.brandColor}
                                            onChange={(e) => handleExportSettingChange('brandColor', e.target.value)}
                                            className="h-10 w-16 rounded-xl border border-gray-200 cursor-pointer"
                                        />
                                    </label>
                                    <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                                        Footer note
                                        <input
                                            type="text"
                                            value={exportSettings.footerNote}
                                            onChange={(e) => handleExportSettingChange('footerNote', e.target.value)}
                                            className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                                            placeholder="FounderHQ • setique.com"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-4 flex flex-col gap-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-400">Preview</div>
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-inner p-5 space-y-3">
                                    <div
                                        className="h-2 w-16 rounded-full"
                                        style={{ backgroundColor: exportSettings.brandColor }}
                                    ></div>
                                    <h4 className="text-lg font-semibold text-gray-900">{title || 'Untitled document'}</h4>
                                    <p className="text-sm text-gray-600">{exportSettings.coverSubtitle}</p>
                                    <p className="text-xs text-gray-500">{exportSettings.coverMeta}</p>
                                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-gray-500">
                                        <span className="px-2 py-0.5 border border-gray-200 rounded-full">{exportSettings.pageSize.toUpperCase()}</span>
                                        <span className="px-2 py-0.5 border border-gray-200 rounded-full">{exportSettings.orientation}</span>
                                        {exportSettings.includeCoverPage && (
                                            <span className="px-2 py-0.5 border border-gray-200 rounded-full">Cover</span>
                                        )}
                                        {exportSettings.includePageNumbers && (
                                            <span className="px-2 py-0.5 border border-gray-200 rounded-full">Page #</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 border-t border-dashed border-gray-200 pt-3">
                                        {exportSettings.footerNote}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Settings apply to PDF exports. Markdown/HTML/Text use their own balanced formatting.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={handleResetExportSettings}
                                className="text-sm font-semibold text-gray-600 hover:text-black"
                            >
                                Reset to defaults
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowExportSettingsModal(false)}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveExportPreferences}
                                    className="px-5 py-2 rounded-xl bg-black text-white text-sm font-semibold shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                                >
                                    Save settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Bubble Menu */}
            {editor && (
                <BubbleMenu editor={editor}>
                    <div className="bg-white shadow-xl border border-gray-200 rounded-lg p-1 flex items-center gap-1">
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}><Bold size={14} /></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}><Italic size={14} /></button>
                        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('strike') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}><Strikethrough size={14} /></button>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 1 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>H1</button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>H2</button>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        {isAIPaletteEnabled && (
                            <button onClick={handleOpenAIPalette} className="p-1.5 rounded hover:bg-purple-50 text-purple-600 font-medium text-xs flex items-center gap-1">✨ AI</button>
                        )}
                    </div>
                </BubbleMenu>
            )}

            {isCanvasModeEnabled && (
                <div aria-live="polite" className="sr-only">
                    {gridAnnouncement}
                </div>
            )}

        </div>
    );
};
