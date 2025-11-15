import React, { useState, useMemo } from 'react';
import { ProductService } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import Modal from '../shared/Modal';

export type ProductServiceFilter = 'digital' | 'physical' | 'saas' | 'consulting' | 'package' | 'subscription' | 'booking' | 'all';

export interface ProductServicePickerProps {
  label?: string;
  productsServices: ProductService[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  filterType?: ProductServiceFilter;
  showInactive?: boolean;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onCreateNew?: () => void;
}

export function ProductServicePicker({
  label = 'Products/Services',
  productsServices,
  selectedIds,
  onSelect,
  filterType = 'all',
  showInactive = false,
  placeholder,
  helpText,
  disabled = false,
  required = false,
  className = '',
  onCreateNew,
}: ProductServicePickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilterType, setLocalFilterType] = useState<ProductServiceFilter>(filterType);

  const selectedItems = useMemo(
    () => productsServices.filter(p => selectedIds.includes(p.id)),
    [productsServices, selectedIds]
  );

  const filteredItems = useMemo(() => {
    let filtered = productsServices;

    // Filter by status
    if (!showInactive) {
      filtered = filtered.filter(p => p.status === 'active');
    }

    // Filter by type
    if (localFilterType !== 'all') {
      filtered = filtered.filter(p => p.type === localFilterType);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [productsServices, showInactive, localFilterType, searchTerm]);

  const handleToggle = (productId: string) => {
    const newSelection = selectedIds.includes(productId)
      ? selectedIds.filter(id => id !== productId)
      : [...selectedIds, productId];
    onSelect(newSelection);
  };

  const handleRemove = (productId: string) => {
    onSelect(selectedIds.filter(id => id !== productId));
  };

  const handleClear = () => {
    onSelect([]);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className={className}>
      {/* Label */}
      <div className="flex items-center justify-between mb-1">
        <label className="block font-mono text-sm font-semibold text-black">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        {selectedIds.length > 0 && (
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
      {selectedItems.length > 0 ? (
        <div className="mb-2 space-y-2">
          {selectedItems.map(item => {
            const typeIcon = item.type === 'physical' ? '📦' : 
                             item.type === 'digital' ? '💿' :
                             item.type === 'saas' ? '☁️' :
                             item.type === 'consulting' ? '🔧' :
                             item.type === 'subscription' ? '🔄' :
                             item.type === 'booking' ? '📅' : '📋';
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-blue-50 border-2 border-blue-500"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg">{typeIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-sm">{item.name}</p>
                  <p className="text-xs text-gray-600 truncate">
                    {item.category} • {formatPrice(item.basePrice)}
                  </p>
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="ml-2 text-red-600 hover:text-red-800 font-bold text-lg"
                  title="Remove"
                >
                  ×
                </button>
              )}
            </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-2 text-sm text-gray-500 italic">
          {placeholder || 'No products or services selected'}
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
          📦 Select Products/Services
        </Button>
        {onCreateNew && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreateNew}
            disabled={disabled}
            title="Create new product or service"
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
      {selectedIds.length > 0 && (
        <div className="mt-2 p-2 bg-gray-100 border-2 border-black">
          <p className="text-sm font-semibold">
            ✓ {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
          </p>
          {selectedItems.length > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              Total value: {formatPrice(selectedItems.reduce((sum, item) => sum + item.basePrice, 0))}
            </p>
          )}
        </div>
      )}

      {/* Selection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSearchTerm('');
          setLocalFilterType(filterType);
        }}
        title="Select Products/Services"
        size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setSearchTerm('');
                setLocalFilterType(filterType);
              }}
            >
              Done
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
              placeholder="Search by name, description, or category..."
              className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
              autoFocus
            />
            
            {filterType === 'all' && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLocalFilterType('all')}
                  className={`px-2 py-1 text-xs font-semibold border-2 transition-colors ${
                    localFilterType === 'all'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setLocalFilterType('physical')}
                  className={`px-2 py-1 text-xs font-semibold border-2 transition-colors ${
                    localFilterType === 'physical'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  📦 Physical
                </button>
                <button
                  type="button"
                  onClick={() => setLocalFilterType('digital')}
                  className={`px-2 py-1 text-xs font-semibold border-2 transition-colors ${
                    localFilterType === 'digital'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  💿 Digital
                </button>
                <button
                  type="button"
                  onClick={() => setLocalFilterType('saas')}
                  className={`px-2 py-1 text-xs font-semibold border-2 transition-colors ${
                    localFilterType === 'saas'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  ☁️ SaaS
                </button>
                <button
                  type="button"
                  onClick={() => setLocalFilterType('consulting')}
                  className={`px-2 py-1 text-xs font-semibold border-2 transition-colors ${
                    localFilterType === 'consulting'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  🔧 Consulting
                </button>
              </div>
            )}
          </div>

          {/* Product/Service List */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="font-semibold">No products or services found</p>
                {searchTerm && (
                  <p className="text-sm mt-1">Try a different search term</p>
                )}
                {!searchTerm && productsServices.length === 0 && onCreateNew && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsModalOpen(false);
                      onCreateNew();
                    }}
                    className="mt-4"
                  >
                    + Create Product/Service
                  </Button>
                )}
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedIds.includes(item.id);
                const typeIcon = item.type === 'physical' ? '📦' : 
                                 item.type === 'digital' ? '💿' :
                                 item.type === 'saas' ? '☁️' :
                                 item.type === 'consulting' ? '🔧' :
                                 item.type === 'subscription' ? '🔄' :
                                 item.type === 'booking' ? '📅' : '📋';
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(item.id)}
                      className="mt-1 w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{typeIcon}</span>
                        <span className="font-semibold">{item.name}</span>
                        {item.status !== 'active' && (
                          <Badge variant="warning" size="sm">
                            {item.status}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="font-mono font-semibold">
                          {item.category}
                        </span>
                        <span>•</span>
                        <span className="font-mono font-bold text-blue-700">
                          {formatPrice(item.basePrice)}
                        </span>
                        {item.pricingModel !== 'one_time' && (
                          <>
                            <span>•</span>
                            <span>{item.pricingModel.replace('_', ' ')}</span>
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
          {selectedIds.length > 0 && (
            <div className="pt-3 border-t-2 border-gray-200">
              <p className="text-sm font-semibold text-blue-900">
                {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
