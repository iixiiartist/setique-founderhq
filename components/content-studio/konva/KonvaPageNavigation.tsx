/**
 * Konva Page Navigation
 * Multi-page navigation and management for Content Studio
 */

import React, { useCallback, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Copy,
  MoreHorizontal,
} from 'lucide-react';
import { useKonvaContext } from './KonvaContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { useConfirmDialog } from '../../ui/ConfirmDialog';

interface PageTabProps {
  index: number;
  name: string;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onRename?: (newName: string) => void;
  canDelete: boolean;
}

function PageTab({ 
  index, 
  name, 
  isActive, 
  onClick, 
  onDelete, 
  onDuplicate,
  onRename,
  canDelete 
}: PageTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);

  const handleDoubleClick = useCallback(() => {
    setEditName(name);
    setIsEditing(true);
  }, [name]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editName.trim() && editName !== name && onRename) {
      onRename(editName.trim());
    }
  }, [editName, name, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditName(name);
      setIsEditing(false);
    }
  }, [handleBlur, name]);

  return (
    <div
      className={`
        group relative flex items-center gap-1 px-3 py-1.5 rounded-t-lg cursor-pointer
        transition-all text-sm
        ${isActive 
          ? 'bg-white border-t border-l border-r border-gray-200 text-gray-900 font-medium' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
      `}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-20 px-1 py-0 text-sm bg-transparent border-b border-gray-400 focus:outline-none focus:border-gray-600"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="truncate max-w-[100px]">{name}</span>
      )}
      
      {/* Page menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36">
          <DropdownMenuItem onClick={() => { setEditName(name); setIsEditing(true); }}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="w-3 h-3 mr-2" />
            Duplicate
          </DropdownMenuItem>
          {canDelete && (
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface KonvaPageNavigationProps {
  className?: string;
}

export function KonvaPageNavigation({ className = '' }: KonvaPageNavigationProps) {
  const {
    state,
    dispatch,
    goToPage,
    addPage,
    deletePage,
    pushUndo,
  } = useKonvaContext();
  const { confirm } = useConfirmDialog();

  const pages = state.document?.pages || [];
  const currentPageIndex = state.currentPageIndex;

  const handleAddPage = useCallback(() => {
    addPage();
  }, [addPage]);

  const handleDeletePage = useCallback(async (index: number) => {
    if (pages.length <= 1) return;
    const confirmed = await confirm({
      title: 'Delete Page',
      message: 'Delete this page? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      deletePage(index);
    }
  }, [pages.length, deletePage, confirm]);

  const handleDuplicatePage = useCallback((index: number) => {
    const page = pages[index];
    if (!page) return;
    
    pushUndo();
    const newPage = {
      ...JSON.parse(JSON.stringify(page)),
      id: crypto.randomUUID(),
      name: `${page.name} (copy)`,
      order: pages.length,
    };
    dispatch({ type: 'ADD_PAGE', payload: newPage });
    goToPage(pages.length);
  }, [pages, pushUndo, dispatch, goToPage]);

  const handleRenamePage = useCallback((index: number, newName: string) => {
    dispatch({ 
      type: 'UPDATE_PAGE', 
      payload: { index, page: { name: newName } } 
    });
  }, [dispatch]);

  const handlePrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      goToPage(currentPageIndex - 1);
    }
  }, [currentPageIndex, goToPage]);

  const handleNextPage = useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      goToPage(currentPageIndex + 1);
    }
  }, [currentPageIndex, pages.length, goToPage]);

  if (!state.document || pages.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 bg-gray-100 border-b border-gray-200 ${className}`}>
      {/* Previous page button */}
      <button
        onClick={handlePrevPage}
        disabled={currentPageIndex === 0}
        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        title="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page tabs */}
      <div className="flex items-end gap-0.5 flex-1 overflow-x-auto">
        {pages.map((page, index) => (
          <PageTab
            key={page.id}
            index={index}
            name={page.name}
            isActive={index === currentPageIndex}
            onClick={() => goToPage(index)}
            onDelete={() => handleDeletePage(index)}
            onDuplicate={() => handleDuplicatePage(index)}
            onRename={(newName) => handleRenamePage(index, newName)}
            canDelete={pages.length > 1}
          />
        ))}
        
        {/* Add page button */}
        <button
          onClick={handleAddPage}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          title="Add page"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Next page button */}
      <button
        onClick={handleNextPage}
        disabled={currentPageIndex >= pages.length - 1}
        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Page indicator */}
      <div className="text-xs text-gray-500 px-2 whitespace-nowrap">
        Page {currentPageIndex + 1} of {pages.length}
      </div>
    </div>
  );
}

export default KonvaPageNavigation;
