/**
 * Document Picker Modal for Content Studio
 * List, search, and open existing documents
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Clock,
  Trash2,
  FolderOpen,
  Plus,
  LayoutTemplate,
  Image,
  X,
  Loader2,
  ChevronRight,
  MoreVertical,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useKonvaContext, KonvaDocument } from './konva';
import { 
  listDocuments, 
  loadDocument, 
  deleteDocument 
} from '../../lib/services/contentStudioService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ScrollArea } from '../ui/ScrollArea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import { Badge } from '../ui/Badge';
import { showError, showSuccess } from '../../lib/utils/toast';
import { formatDistanceToNow } from 'date-fns';

interface DocumentPickerModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

interface DocumentListItem {
  id: string;
  title: string;
  type: string;
  pageCount: number;
  updatedAt: string;
  createdAt: string;
  thumbnail?: string;
}

// Document type icons
const TYPE_ICONS: Record<string, React.ReactNode> = {
  'one-pager': <FileText className="w-4 h-4" />,
  'pitch-deck': <LayoutTemplate className="w-4 h-4" />,
  'social-post': <Image className="w-4 h-4" />,
  'email-template': <FileText className="w-4 h-4" />,
  'ad-creative': <Image className="w-4 h-4" />,
  'custom': <FileText className="w-4 h-4" />,
};

// Document type labels
const TYPE_LABELS: Record<string, string> = {
  'one-pager': 'One Pager',
  'pitch-deck': 'Pitch Deck',
  'social-post': 'Social Post',
  'email-template': 'Email Template',
  'ad-creative': 'Ad Creative',
  'custom': 'Custom Document',
};

export function DocumentPickerModal({ 
  open, 
  onClose, 
  workspaceId 
}: DocumentPickerModalProps) {
  // Use Konva context - may not be available if not wrapped in provider
  let loadDocumentFn: ((doc: any) => void) | null = null;
  let createNewDocumentFn: ((title?: string) => void) | null = null;
  
  try {
    const konvaContext = useKonvaContext();
    loadDocumentFn = konvaContext.loadDocument;
    createNewDocumentFn = konvaContext.createNewDocument;
  } catch {
    // Context not available - will use fallback behavior
  }
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  
  const PAGE_SIZE = 12;

  // Load documents
  const fetchDocuments = useCallback(async (reset = false) => {
    if (!workspaceId || workspaceId === 'offline') {
      setError('Please select a workspace to view documents');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newOffset = reset ? 0 : offset;
      const { documents: docs, total: totalCount } = await listDocuments(workspaceId, {
        limit: PAGE_SIZE,
        offset: newOffset,
        search: searchQuery || undefined,
      });

      // Transform to list items
      const items: DocumentListItem[] = docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        type: doc.metadata?.category || 'custom',
        pageCount: doc.pages.length,
        updatedAt: doc.updatedAt,
        createdAt: doc.createdAt,
        // Generate thumbnail from first page if available
        thumbnail: generateThumbnail(doc),
      }));

      if (reset) {
        setDocuments(items);
        setOffset(PAGE_SIZE);
      } else {
        setDocuments((prev) => [...prev, ...items]);
        setOffset(newOffset + PAGE_SIZE);
      }

      setTotal(totalCount);
      setHasMore(newOffset + PAGE_SIZE < totalCount);
    } catch (err: any) {
      console.error('[DocumentPicker] Fetch error:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, offset, searchQuery]);

  // Generate thumbnail preview (simplified - returns placeholder for now)
  const generateThumbnail = (doc: any): string | undefined => {
    // In a production app, we'd generate actual thumbnails server-side
    // For now, return undefined to show placeholder
    return undefined;
  };

  // Load documents when modal opens or workspace changes
  useEffect(() => {
    if (open && workspaceId) {
      fetchDocuments(true);
    }
  }, [open, workspaceId]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    
    const timeout = setTimeout(() => {
      fetchDocuments(true);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, selectedType]);

  // Filter documents by type
  const filteredDocuments = useMemo(() => {
    if (!selectedType) return documents;
    return documents.filter((doc) => doc.type === selectedType);
  }, [documents, selectedType]);

  // Open document
  const handleOpenDocument = async (docId: string) => {
    setIsLoading(true);
    try {
      const doc = await loadDocument(docId);
      if (doc) {
        if (loadDocumentFn) {
          // Convert to Konva document format if needed
          loadDocumentFn(doc as any);
        }
        onClose();
        showSuccess('Document opened');
      } else {
        showError('Document not found');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to open document');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId: string, title: string) => {
    // Use window.confirm for now (can be replaced with custom modal)
    const confirmed = window.confirm(
      `Delete "${title}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      const success = await deleteDocument(docId);
      if (success) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        setTotal((prev) => prev - 1);
        showSuccess('Document deleted');
      } else {
        showError('Failed to delete document');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to delete document');
    }
  };

  // Create new document
  const handleCreateNew = () => {
    if (createNewDocumentFn) {
      createNewDocumentFn();
    }
    onClose();
  };

  // Format relative time
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Open Document
          </DialogTitle>
          <DialogDescription>
            Browse and open your Content Studio documents
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex items-center gap-3 py-3 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Type filter buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant={selectedType === null ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedType(null)}
            >
              All
            </Button>
            {Object.entries(TYPE_LABELS).slice(0, 3).map(([type, label]) => (
              <Button
                key={type}
                variant={selectedType === type ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedType(type === selectedType ? null : type)}
                className="gap-1"
              >
                {TYPE_ICONS[type]}
                <span className="hidden md:inline">{label}</span>
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchDocuments(true)}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Document List */}
        <ScrollArea className="flex-1 min-h-0">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-gray-600 mb-4">{error}</p>
              <Button variant="outline" onClick={() => fetchDocuments(true)}>
                Try Again
              </Button>
            </div>
          ) : isLoading && documents.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-600 mb-2">No documents found</p>
              <p className="text-gray-400 text-sm mb-4">
                {searchQuery ? 'Try a different search term' : 'Create your first document'}
              </p>
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="w-4 h-4" />
                Create New Document
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              <AnimatePresence>
                {filteredDocuments.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer"
                    onClick={() => handleOpenDocument(doc.id)}
                  >
                    {/* Thumbnail / Preview */}
                    <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                      {doc.thumbnail ? (
                        <img 
                          src={doc.thumbnail} 
                          alt={doc.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-300">
                          {TYPE_ICONS[doc.type] || <FileText className="w-12 h-12" />}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {doc.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <Badge variant="outline" className="text-xs py-0">
                              {TYPE_LABELS[doc.type] || 'Document'}
                            </Badge>
                            <span>{doc.pageCount} page{doc.pageCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        
                        {/* Actions menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDocument(doc.id)}>
                              <FolderOpen className="w-4 h-4 mr-2" />
                              Open
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteDocument(doc.id, doc.title)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Updated time */}
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(doc.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Hover indicator */}
                    <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Load more */}
          {hasMore && !isLoading && (
            <div className="flex justify-center py-4">
              <Button variant="outline" onClick={() => fetchDocuments(false)}>
                Load More ({documents.length} of {total})
              </Button>
            </div>
          )}

          {/* Loading more indicator */}
          {isLoading && documents.length > 0 && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-500">
            {total} document{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="w-4 h-4" />
              New Document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
