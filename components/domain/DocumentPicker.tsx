import React, { useState, useMemo } from 'react';
import { GTMDocMetadata } from '../../types';
import { DOC_TYPE_ICONS, DOC_TYPE_LABELS } from '../../constants';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import Modal from '../shared/Modal';

export interface DocumentPickerProps {
  label?: string;
  documents: GTMDocMetadata[];
  selectedDocIds: string[];
  onSelect: (ids: string[]) => void;
  mode?: 'single' | 'multi';
  filterByType?: 'template' | 'user_doc' | 'all';
  filterByDocType?: string[];
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onCreateNew?: () => void;
  showPreview?: boolean;
}

export function DocumentPicker({
  label = 'Documents',
  documents,
  selectedDocIds,
  onSelect,
  mode = 'multi',
  filterByType = 'all',
  filterByDocType = [],
  placeholder,
  helpText,
  disabled = false,
  required = false,
  className = '',
  onCreateNew,
  showPreview = false,
}: DocumentPickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilterType, setLocalFilterType] = useState<'template' | 'user_doc' | 'all'>(filterByType);

  const selectedDocs = useMemo(
    () => documents.filter(d => selectedDocIds.includes(d.id)),
    [documents, selectedDocIds]
  );

  const filteredDocs = useMemo(() => {
    let filtered = documents;

    // Filter by template vs user doc
    if (localFilterType === 'template') {
      filtered = filtered.filter(d => d.isTemplate);
    } else if (localFilterType === 'user_doc') {
      filtered = filtered.filter(d => !d.isTemplate);
    }

    // Filter by document type
    if (filterByDocType.length > 0) {
      filtered = filtered.filter(d => filterByDocType.includes(d.docType));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(term) ||
        d.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Sort: templates first, then by updated date
    filtered.sort((a, b) => {
      if (a.isTemplate && !b.isTemplate) return -1;
      if (!a.isTemplate && b.isTemplate) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return filtered;
  }, [documents, localFilterType, filterByDocType, searchTerm]);

  const handleToggle = (docId: string) => {
    if (mode === 'single') {
      onSelect([docId]);
      setIsModalOpen(false);
    } else {
      const newSelection = selectedDocIds.includes(docId)
        ? selectedDocIds.filter(id => id !== docId)
        : [...selectedDocIds, docId];
      onSelect(newSelection);
    }
  };

  const handleRemove = (docId: string) => {
    onSelect(selectedDocIds.filter(id => id !== docId));
  };

  const handleClear = () => {
    onSelect([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={className}>
      {/* Label */}
      <div className="flex items-center justify-between mb-1">
        <label className="block font-mono text-sm font-semibold text-black">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        {mode === 'multi' && selectedDocIds.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-red-600 hover:text-red-800 font-semibold"
            disabled={disabled}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected Documents Display */}
      {selectedDocs.length > 0 ? (
        <div className="mb-2 space-y-2">
          {selectedDocs.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2 bg-purple-50 border-2 border-purple-500"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">{DOC_TYPE_ICONS[doc.docType] || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-sm">{doc.title}</p>
                  <p className="text-xs text-gray-600 truncate">
                    {DOC_TYPE_LABELS[doc.docType]} {doc.isTemplate && '• Template'}
                  </p>
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(doc.id)}
                  className="ml-2 text-red-600 hover:text-red-800 font-bold text-lg"
                  title="Remove"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-2 text-sm text-gray-500 italic">
          {placeholder || 'No documents selected'}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          disabled={disabled}
          className="flex-1"
        >
          📄 {mode === 'single' ? 'Select' : 'Add'} Document
        </Button>
        {onCreateNew && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreateNew}
            disabled={disabled}
            title="Create new document"
          >
            + New
          </Button>
        )}
      </div>

      {/* Help Text */}
      {helpText && (
        <p className="mt-1 text-xs text-gray-600">{helpText}</p>
      )}

      {/* Selection Summary */}
      {selectedDocIds.length > 0 && (
        <div className="mt-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm font-medium">
            ✓ {selectedDocIds.length} document{selectedDocIds.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}

      {/* Selection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSearchTerm('');
          setLocalFilterType(filterByType);
        }}
        title={`Select Document${mode === 'multi' ? 's' : ''}`}
        size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setSearchTerm('');
                setLocalFilterType(filterByType);
              }}
            >
              {mode === 'single' ? 'Cancel' : 'Done'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="space-y-2">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by title or tags..."
              className="w-full bg-white rounded-xl border border-gray-200 text-black p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            
            {filterByType === 'all' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocalFilterType('all')}
                  className={`px-3 py-1 text-sm font-semibold border-2 transition-colors ${
                    localFilterType === 'all'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setLocalFilterType('template')}
                  className={`px-3 py-1 text-sm font-semibold border-2 transition-colors ${
                    localFilterType === 'template'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  📋 Templates
                </button>
                <button
                  type="button"
                  onClick={() => setLocalFilterType('user_doc')}
                  className={`px-3 py-1 text-sm font-semibold border-2 transition-colors ${
                    localFilterType === 'user_doc'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  📄 My Documents
                </button>
              </div>
            )}
          </div>

          {/* Document List */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="font-semibold">No documents found</p>
                {searchTerm && (
                  <p className="text-sm mt-1">Try a different search term</p>
                )}
                {!searchTerm && documents.length === 0 && onCreateNew && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsModalOpen(false);
                      onCreateNew();
                    }}
                    className="mt-4"
                  >
                    + Create Document
                  </Button>
                )}
              </div>
            ) : (
              filteredDocs.map(doc => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <input
                      type={mode === 'single' ? 'radio' : 'checkbox'}
                      checked={isSelected}
                      onChange={() => handleToggle(doc.id)}
                      className="mt-1 w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{DOC_TYPE_ICONS[doc.docType] || '📄'}</span>
                        <span className="font-semibold">{doc.title}</span>
                        {doc.isTemplate && (
                          <Badge variant="info" size="sm">
                            Template
                          </Badge>
                        )}
                        {doc.visibility === 'private' && (
                          <Badge variant="default" size="sm">
                            Private
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {DOC_TYPE_LABELS[doc.docType]}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>Updated {formatDate(doc.updatedAt)}</span>
                        {doc.tags && doc.tags.length > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex flex-wrap gap-1">
                              {doc.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-1 py-0.5 bg-gray-200 border border-gray-400 font-mono"
                                >
                                  {tag}
                                </span>
                              ))}
                              {doc.tags.length > 3 && (
                                <span className="text-gray-400">+{doc.tags.length - 3}</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Selection Summary */}
          {selectedDocIds.length > 0 && (
            <div className="pt-3 border-t-2 border-gray-200">
              <p className="text-sm font-semibold text-purple-900">
                {selectedDocIds.length} document{selectedDocIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
