/**
 * Konva Asset Panel
 * Browse and manage assets from the workspace storage
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Upload,
  Trash2,
  X,
  Search,
  RefreshCw,
  FolderPlus,
  CloudUpload,
  Eye,
  Edit3,
  MoreVertical,
  CheckSquare,
  Square,
  Download,
  Copy,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { useKonvaContext } from './KonvaContext';
import { uploadImage, deleteAsset, validateImage } from '../../../lib/services/contentStudioStorage';
import { showSuccess, showError } from '../../../lib/utils/toast';
import { KonvaElement } from './types';
import { useConfirmDialog } from '../../ui/ConfirmDialog';

// ============================================================================
// Types
// ============================================================================

interface StorageAsset {
  id: string;
  name: string;
  path: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
  isFolder?: boolean;
}

interface AssetFolder {
  name: string;
  path: string;
  children?: AssetFolder[];
}

// ============================================================================
// Component
// ============================================================================

export function KonvaAssetPanel() {
  const { workspace } = useWorkspace();
  const { state, addCustomElement, dispatch } = useKonvaContext();
  const { isAssetsPanelOpen } = state as any;
  const { confirm, prompt } = useConfirmDialog();
  
  const [assets, setAssets] = useState<StorageAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<StorageAsset | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [previewAsset, setPreviewAsset] = useState<StorageAsset | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; asset: StorageAsset } | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [renamingAsset, setRenamingAsset] = useState<StorageAsset | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  
  const workspaceId = workspace?.id;
  const documentId = state.document?.id;
  
  // Build the full path for listing
  const fullPath = workspaceId 
    ? currentPath 
      ? `${workspaceId}/${currentPath}` 
      : workspaceId 
    : '';

  // ============================================================================
  // Data Loading
  // ============================================================================
  
  const loadAssets = useCallback(async () => {
    if (!workspaceId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('workspace-images')
        .list(fullPath, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' },
        });
      
      if (error) throw error;
      
      // Process the files and folders
      const processedAssets: StorageAsset[] = [];
      
      for (const item of data || []) {
        // Skip .emptyFolderPlaceholder files
        if (item.name === '.emptyFolderPlaceholder') continue;
        
        const isFolder = item.id === null; // Folders have null id
        const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
        
        if (isFolder) {
          processedAssets.push({
            id: item.name,
            name: item.name,
            path: itemPath,
            url: '',
            size: 0,
            type: 'folder',
            createdAt: item.created_at || new Date().toISOString(),
            isFolder: true,
          });
        } else {
          // Get public URL for images
          const { data: urlData } = supabase.storage
            .from('workspace-images')
            .getPublicUrl(`${fullPath}/${item.name}`);
          
          processedAssets.push({
            id: item.id || item.name,
            name: item.name,
            path: `${fullPath}/${item.name}`,
            url: urlData.publicUrl,
            size: item.metadata?.size || 0,
            type: item.metadata?.mimetype || 'image/jpeg',
            createdAt: item.created_at || new Date().toISOString(),
            isFolder: false,
          });
        }
      }
      
      // Sort: folders first, then files
      processedAssets.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setAssets(processedAssets);
    } catch (error) {
      console.error('[AssetPanel] Failed to load assets:', error);
      showError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, fullPath, currentPath]);
  
  useEffect(() => {
    if (isAssetsPanelOpen && workspaceId) {
      loadAssets();
    }
  }, [isAssetsPanelOpen, workspaceId, loadAssets]);

  // ============================================================================
  // Handlers
  // ============================================================================
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !workspaceId) return;
    
    setUploading(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const file of Array.from(files)) {
        // Validate
        const validation = validateImage(file);
        if (!validation.valid) {
          showError(`${file.name}: ${validation.error}`);
          errorCount++;
          continue;
        }
        
        // Upload to current folder (or use content-studio subfolder)
        const uploadPath = currentPath || 'content-studio';
        const result = await uploadImage(file, workspaceId, uploadPath, true);
        
        if (result.success) {
          successCount++;
        } else {
          showError(`${file.name}: ${result.error}`);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        showSuccess(`Uploaded ${successCount} file${successCount > 1 ? 's' : ''}`);
        loadAssets();
      }
    } catch (error) {
      console.error('[AssetPanel] Upload error:', error);
      showError('Upload failed');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleFolderClick = (folder: StorageAsset) => {
    setCurrentPath(folder.path);
    setSelectedAsset(null);
  };
  
  const handleNavigateUp = () => {
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
    setSelectedAsset(null);
  };
  
  const handleAssetClick = (asset: StorageAsset) => {
    if (asset.isFolder) {
      handleFolderClick(asset);
    } else {
      setSelectedAsset(asset);
    }
  };
  
  const handleAssetDoubleClick = (asset: StorageAsset) => {
    if (asset.isFolder) {
      handleFolderClick(asset);
    } else {
      // Insert as image element
      insertAsImage(asset);
    }
  };
  
  const insertAsImage = (asset: StorageAsset) => {
    if (!asset.url) return;
    
    // Create an image element with the asset URL
    const imageElement: KonvaElement = {
      id: `image-${Date.now()}`,
      type: 'image',
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      fill: 'transparent',
      stroke: '',
      strokeWidth: 0,
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false,
      name: asset.name,
      src: asset.url,
    } as KonvaElement;
    
    addCustomElement(imageElement);
    showSuccess('Image added to canvas');
    
    // Close the panel
    dispatch({ type: 'TOGGLE_ASSETS_PANEL' as any });
  };
  
  const handleDeleteAsset = async (asset: StorageAsset) => {
    if (!asset.path) return;
    
    const confirmed = await confirm({
      title: asset.isFolder ? 'Delete Folder' : 'Delete File',
      message: `Delete "${asset.name}"?${asset.isFolder ? ' All files inside will be deleted.' : ''} This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    
    if (!confirmed) return;
    
    try {
      if (asset.isFolder) {
        // Delete all files in the folder first
        const folderPath = `${fullPath}/${asset.name}`;
        const { data: folderContents } = await supabase.storage
          .from('workspace-images')
          .list(folderPath, { limit: 1000 });
        
        if (folderContents && folderContents.length > 0) {
          const filesToDelete = folderContents.map(f => `${folderPath}/${f.name}`);
          await supabase.storage.from('workspace-images').remove(filesToDelete);
        }
        showSuccess('Folder deleted');
      } else {
        const success = await deleteAsset(asset.path);
        if (success) {
          showSuccess('Asset deleted');
        } else {
          showError('Failed to delete asset');
          return;
        }
      }
      loadAssets();
      setSelectedAsset(null);
      setSelectedAssets(new Set());
    } catch (error) {
      console.error('[AssetPanel] Delete error:', error);
      showError('Delete failed');
    }
  };
  
  const handleBulkDelete = async () => {
    if (selectedAssets.size === 0) return;
    
    const count = selectedAssets.size;
    const confirmed = await confirm({
      title: 'Delete Selected Items',
      message: `Delete ${count} selected item${count > 1 ? 's' : ''}? This cannot be undone.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    
    if (!confirmed) return;
    
    try {
      const assetsToDelete = assets.filter(a => selectedAssets.has(a.id));
      
      for (const asset of assetsToDelete) {
        if (asset.isFolder) {
          // Delete folder contents
          const folderPath = `${fullPath}/${asset.name}`;
          const { data: folderContents } = await supabase.storage
            .from('workspace-images')
            .list(folderPath, { limit: 1000 });
          
          if (folderContents && folderContents.length > 0) {
            const filesToDelete = folderContents.map(f => `${folderPath}/${f.name}`);
            await supabase.storage.from('workspace-images').remove(filesToDelete);
          }
        } else {
          await deleteAsset(asset.path);
        }
      }
      
      showSuccess(`Deleted ${count} item${count > 1 ? 's' : ''}`);
      loadAssets();
      setSelectedAssets(new Set());
      setIsMultiSelectMode(false);
    } catch (error) {
      console.error('[AssetPanel] Bulk delete error:', error);
      showError('Some items could not be deleted');
      loadAssets();
    }
  };
  
  const handleRenameAsset = async (asset: StorageAsset, newName: string) => {
    if (!asset.path || !newName.trim() || asset.isFolder) return;
    
    // Validate new name
    const ext = asset.name.split('.').pop();
    const newFileName = newName.includes('.') ? newName : `${newName}.${ext}`;
    
    if (newFileName === asset.name) {
      setRenamingAsset(null);
      return;
    }
    
    try {
      // Download the file, delete old, upload with new name
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('workspace-images')
        .download(asset.path);
      
      if (downloadError) throw downloadError;
      
      // Get the new path
      const pathParts = asset.path.split('/');
      pathParts.pop();
      const newPath = [...pathParts, newFileName].join('/');
      
      // Upload with new name
      const { error: uploadError } = await supabase.storage
        .from('workspace-images')
        .upload(newPath, fileData, { upsert: false });
      
      if (uploadError) throw uploadError;
      
      // Delete old file
      await supabase.storage.from('workspace-images').remove([asset.path]);
      
      showSuccess('Renamed successfully');
      setRenamingAsset(null);
      loadAssets();
    } catch (error: any) {
      console.error('[AssetPanel] Rename error:', error);
      showError(error.message || 'Failed to rename');
    }
  };
  
  const handleContextMenu = (e: React.MouseEvent, asset: StorageAsset) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, asset });
  };
  
  const handleCopyUrl = (asset: StorageAsset) => {
    if (asset.url) {
      navigator.clipboard.writeText(asset.url);
      showSuccess('URL copied to clipboard');
    }
    setContextMenu(null);
  };
  
  const handleDownload = (asset: StorageAsset) => {
    if (asset.url && !asset.isFolder) {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = asset.name;
      link.click();
    }
    setContextMenu(null);
  };
  
  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };
  
  const selectAllAssets = () => {
    const allIds = new Set(assets.map(a => a.id));
    setSelectedAssets(allIds);
  };
  
  const deselectAllAssets = () => {
    setSelectedAssets(new Set());
  };
  
  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);
  
  // Focus rename input when renaming
  useEffect(() => {
    if (renamingAsset && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingAsset]);
  
  const handleCreateFolder = async () => {
    const folderName = await prompt({
      title: 'Create Folder',
      message: 'Enter a name for the new folder',
      placeholder: 'folder-name',
      confirmText: 'Create',
      cancelText: 'Cancel',
      validation: (value) => {
        if (!value.trim()) return 'Folder name is required';
        if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
          return 'Only letters, numbers, hyphens, and underscores allowed';
        }
        return null;
      },
    });
    
    if (!folderName || !workspaceId) return;
    
    try {
      // Create an empty file to create the folder
      const folderPath = currentPath 
        ? `${fullPath}/${folderName}/.emptyFolderPlaceholder`
        : `${fullPath}/${folderName}/.emptyFolderPlaceholder`;
      
      const { error } = await supabase.storage
        .from('workspace-images')
        .upload(folderPath, new Blob([''], { type: 'text/plain' }), {
          upsert: false,
        });
      
      if (error) throw error;
      
      showSuccess(`Folder "${folderName}" created`);
      loadAssets();
    } catch (error: any) {
      console.error('[AssetPanel] Create folder error:', error);
      showError(error.message || 'Failed to create folder');
    }
  };

  // ============================================================================
  // Filtered Assets
  // ============================================================================
  
  const filteredAssets = searchQuery
    ? assets.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assets;

  // ============================================================================
  // Render
  // ============================================================================
  
  if (!isAssetsPanelOpen) return null;
  
  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-600" />
            Assets
          </h3>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_ASSETS_PANEL' as any })}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Breadcrumbs */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1 text-xs text-gray-500 overflow-x-auto">
        <button
          onClick={() => setCurrentPath('')}
          className="hover:text-indigo-600 flex items-center gap-1"
        >
          <Folder className="w-3 h-3" />
          Root
        </button>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <span>/</span>
            <button
              onClick={() => setCurrentPath(breadcrumbs.slice(0, i + 1).join('/'))}
              className="hover:text-indigo-600 truncate max-w-[80px]"
              title={crumb}
            >
              {crumb}
            </button>
          </React.Fragment>
        ))}
      </div>
      
      {/* Actions */}
      <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-2">
        {isMultiSelectMode ? (
          <>
            <button
              onClick={selectAllAssets}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="Select all"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <button
              onClick={deselectAllAssets}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="Deselect all"
            >
              <Square className="w-4 h-4" />
            </button>
            {selectedAssets.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedAssets.size})
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => {
                setIsMultiSelectMode(false);
                setSelectedAssets(new Set());
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleUploadClick}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              Upload
            </button>
            <button
              onClick={handleCreateFolder}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="Create folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMultiSelectMode(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="Select multiple"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <button
              onClick={loadAssets}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      
      {/* Asset List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && assets.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <ImageIcon className="w-8 h-8 mb-2" />
            <p className="text-sm">
              {searchQuery ? 'No matching assets' : 'No assets yet'}
            </p>
            <button
              onClick={handleUploadClick}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
            >
              Upload your first image
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {/* Navigate Up */}
            {currentPath && (
              <button
                onClick={handleNavigateUp}
                className="aspect-square rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center gap-1"
              >
                <Folder className="w-8 h-8 text-gray-400" />
                <span className="text-xs text-gray-500">..</span>
              </button>
            )}
            
            {/* Assets Grid */}
            {filteredAssets.map((asset) => {
              const isSelected = isMultiSelectMode 
                ? selectedAssets.has(asset.id) 
                : selectedAsset?.id === asset.id;
              
              return (
                <div
                  key={asset.id}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      toggleAssetSelection(asset.id);
                    } else {
                      handleAssetClick(asset);
                    }
                  }}
                  onDoubleClick={() => !isMultiSelectMode && handleAssetDoubleClick(asset)}
                  onContextMenu={(e) => handleContextMenu(e, asset)}
                  className={`aspect-square rounded-lg border overflow-hidden flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-200' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Multi-select checkbox */}
                  {isMultiSelectMode && (
                    <div className="absolute top-1 left-1 z-10">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-600' 
                          : 'bg-white/80 border-gray-300'
                      }`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                  )}
                  
                  {asset.isFolder ? (
                    <>
                      <Folder className="w-10 h-10 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-gray-600 truncate max-w-full px-1">
                        {asset.name}
                      </span>
                    </>
                  ) : renamingAsset?.id === asset.id ? (
                    <div className="w-full h-full p-2 flex flex-col items-center justify-center bg-white">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameAsset(asset, renameValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameAsset(asset, renameValue);
                          if (e.key === 'Escape') setRenamingAsset(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-xs border border-indigo-500 rounded px-2 py-1 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full relative group">
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white text-xs bg-black/50 px-2 py-1 rounded truncate max-w-[90%]">
                          {asset.name}
                        </span>
                      </div>
                      {/* Quick actions on hover */}
                      {!isMultiSelectMode && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContextMenu(e, asset);
                            }}
                            className="p-1 bg-white/90 rounded shadow-sm hover:bg-white"
                          >
                            <MoreVertical className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Selected Asset Actions */}
      {selectedAsset && !selectedAsset.isFolder && !isMultiSelectMode && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <img
              src={selectedAsset.url}
              alt={selectedAsset.name}
              className="w-10 h-10 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedAsset.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedAsset.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => insertAsImage(selectedAsset)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <ImageIcon className="w-4 h-4" />
              Add to Canvas
            </button>
            <button
              onClick={() => setPreviewAsset(selectedAsset)}
              className="flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setRenamingAsset(selectedAsset);
                setRenameValue(selectedAsset.name.replace(/\.[^/.]+$/, ''));
              }}
              className="flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="Rename"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteAsset(selectedAsset)}
              className="flex items-center justify-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Preview Modal */}
      {previewAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewAsset(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => setPreviewAsset(null)}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewAsset.url}
              alt={previewAsset.name}
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-center text-white mt-2 text-sm">
              {previewAsset.name}
            </p>
          </div>
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]"
          style={{ 
            left: Math.min(contextMenu.x, window.innerWidth - 180), 
            top: Math.min(contextMenu.y, window.innerHeight - 250) 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!contextMenu.asset.isFolder && (
            <>
              <button
                onClick={() => {
                  insertAsImage(contextMenu.asset);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <ImageIcon className="w-4 h-4" />
                Add to Canvas
              </button>
              <button
                onClick={() => {
                  setPreviewAsset(contextMenu.asset);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => handleDownload(contextMenu.asset)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => handleCopyUrl(contextMenu.asset)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Copy className="w-4 h-4" />
                Copy URL
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  setRenamingAsset(contextMenu.asset);
                  setRenameValue(contextMenu.asset.name.replace(/\.[^/.]+$/, ''));
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Edit3 className="w-4 h-4" />
                Rename
              </button>
            </>
          )}
          <button
            onClick={() => {
              handleDeleteAsset(contextMenu.asset);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete{contextMenu.asset.isFolder ? ' Folder' : ''}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default KonvaAssetPanel;
