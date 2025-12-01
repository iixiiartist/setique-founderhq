import React, { useState, useMemo } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import Modal from '../shared/Modal';

export type EntityType = 'deal' | 'campaign' | 'event' | 'task' | 'document' | 'contact' | 'crm';

export interface Entity {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  metadata?: Record<string, any>;
}

export interface EntityLinkFieldProps {
  label: string;
  entityType: EntityType;
  entities: Entity[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  mode?: 'single' | 'multi';
  placeholder?: string;
  helpText?: string;
  onCreate?: () => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const ENTITY_ICONS: Record<EntityType, string> = {
  deal: '💰',
  campaign: '📢',
  event: '📅',
  task: '✓',
  document: '📄',
  contact: '👤',
  crm: '🏢',
};

const ENTITY_LABELS: Record<EntityType, string> = {
  deal: 'Deal',
  campaign: 'Campaign',
  event: 'Event',
  task: 'Task',
  document: 'Document',
  contact: 'Contact',
  crm: 'Company',
};

export function EntityLinkField({
  label,
  entityType,
  entities,
  selectedIds,
  onSelect,
  mode = 'multi',
  placeholder,
  helpText,
  onCreate,
  disabled = false,
  required = false,
  className = '',
}: EntityLinkFieldProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedEntities = useMemo(
    () => entities.filter(e => selectedIds.includes(e.id)),
    [entities, selectedIds]
  );

  const filteredEntities = useMemo(() => {
    if (!searchTerm.trim()) return entities;
    const term = searchTerm.toLowerCase();
    return entities.filter(e =>
      e.title.toLowerCase().includes(term) ||
      e.subtitle?.toLowerCase().includes(term)
    );
  }, [entities, searchTerm]);

  const handleToggle = (entityId: string) => {
    if (mode === 'single') {
      onSelect([entityId]);
      setIsModalOpen(false);
    } else {
      const newSelection = selectedIds.includes(entityId)
        ? selectedIds.filter(id => id !== entityId)
        : [...selectedIds, entityId];
      onSelect(newSelection);
    }
  };

  const handleRemove = (entityId: string) => {
    onSelect(selectedIds.filter(id => id !== entityId));
  };

  const handleClear = () => {
    onSelect([]);
  };

  const icon = ENTITY_ICONS[entityType];
  const entityLabel = ENTITY_LABELS[entityType];
  const pluralLabel = entityLabel + (mode === 'multi' ? 's' : '');

  return (
    <div className={className}>
      {/* Label */}
      <div className="flex items-center justify-between mb-1">
        <label className="block font-mono text-sm font-semibold text-black">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        {mode === 'multi' && selectedIds.length > 0 && (
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

      {/* Selected Items Display */}
      {selectedEntities.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedEntities.map(entity => (
            <Badge
              key={entity.id}
              variant="primary"
              onRemove={disabled ? undefined : () => handleRemove(entity.id)}
            >
              {icon} {entity.title}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="mb-2 text-sm text-gray-500 italic">
          {placeholder || `No ${pluralLabel.toLowerCase()} selected`}
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
          {icon} {mode === 'single' ? 'Select' : 'Add'} {entityLabel}
        </Button>
        {onCreate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreate}
            disabled={disabled}
            title={`Create new ${entityLabel.toLowerCase()}`}
          >
            + New
          </Button>
        )}
      </div>

      {/* Help Text */}
      {helpText && (
        <p className="mt-1 text-xs text-gray-600">{helpText}</p>
      )}

      {/* Selection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSearchTerm('');
        }}
        title={`Select ${pluralLabel}`}
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setSearchTerm('');
              }}
            >
              {mode === 'single' ? 'Cancel' : 'Done'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Search */}
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={`Search ${pluralLabel.toLowerCase()}...`}
            className="w-full bg-white rounded-xl border border-gray-200 text-black p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />

          {/* Entity List */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
            {filteredEntities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="font-semibold">No {pluralLabel.toLowerCase()} found</p>
                {searchTerm && (
                  <p className="text-sm mt-1">Try a different search term</p>
                )}
                {!searchTerm && entities.length === 0 && onCreate && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsModalOpen(false);
                      onCreate();
                    }}
                    className="mt-4"
                  >
                    + Create {entityLabel}
                  </Button>
                )}
              </div>
            ) : (
              filteredEntities.map(entity => {
                const isSelected = selectedIds.includes(entity.id);
                return (
                  <label
                    key={entity.id}
                    className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <input
                      type={mode === 'single' ? 'radio' : 'checkbox'}
                      checked={isSelected}
                      onChange={() => handleToggle(entity.id)}
                      className="mt-1 w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{entity.icon || icon}</span>
                        <span className="font-semibold truncate">{entity.title}</span>
                      </div>
                      {entity.subtitle && (
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {entity.subtitle}
                        </p>
                      )}
                      {entity.metadata && (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {Object.entries(entity.metadata).map(([key, value]) => (
                            <span
                              key={key}
                              className="text-xs text-gray-500 font-mono"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Selection Summary */}
          {mode === 'multi' && selectedIds.length > 0 && (
            <div className="pt-3 border-t-2 border-gray-200">
              <p className="text-sm font-semibold text-blue-900">
                {selectedIds.length} {pluralLabel.toLowerCase()} selected
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
