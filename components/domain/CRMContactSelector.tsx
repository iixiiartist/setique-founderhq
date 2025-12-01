import React, { useState, useMemo } from 'react';
import { CrmItem, Contact } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import Modal from '../shared/Modal';

export interface CRMContactSelectorProps {
  label?: string;
  crmItems?: CrmItem[];
  contacts?: Contact[];
  selectedContactIds: string[];
  onSelectContacts: (ids: string[]) => void;
  mode?: 'single' | 'multi';
  filterByCrmType?: 'investor' | 'customer' | 'partner' | 'all';
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onCreateNew?: () => void;
}

export function CRMContactSelector({
  label = 'Contacts',
  crmItems = [],
  contacts = [],
  selectedContactIds,
  onSelectContacts,
  mode = 'multi',
  filterByCrmType = 'all',
  placeholder,
  helpText,
  disabled = false,
  required = false,
  className = '',
  onCreateNew,
}: CRMContactSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilterType, setLocalFilterType] = useState<'investor' | 'customer' | 'partner' | 'all'>(filterByCrmType);

  const selectedContacts = useMemo(
    () => contacts.filter(c => selectedContactIds.includes(c.id)),
    [contacts, selectedContactIds]
  );

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    // Filter by CRM type
    if (localFilterType !== 'all') {
      filtered = filtered.filter(contact => {
        if (!contact.crmItemId) return false;
        const crmItem = crmItems.find(item => item.id === contact.crmItemId);
        return crmItem?.type === localFilterType;
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(term) ||
        contact.email?.toLowerCase().includes(term) ||
        contact.title?.toLowerCase().includes(term) ||
        contact.phone?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [contacts, crmItems, localFilterType, searchTerm]);

  const handleToggle = (contactId: string) => {
    if (mode === 'single') {
      onSelectContacts([contactId]);
      setIsModalOpen(false);
    } else {
      const newSelection = selectedContactIds.includes(contactId)
        ? selectedContactIds.filter(id => id !== contactId)
        : [...selectedContactIds, contactId];
      onSelectContacts(newSelection);
    }
  };

  const handleRemove = (contactId: string) => {
    onSelectContacts(selectedContactIds.filter(id => id !== contactId));
  };

  const handleClear = () => {
    onSelectContacts([]);
  };

  const getCrmCompany = (contact: Contact) => {
    if (!contact.crmItemId) return null;
    return crmItems.find(item => item.id === contact.crmItemId);
  };

  return (
    <div className={className}>
      {/* Label */}
      <div className="flex items-center justify-between mb-1">
        <label className="block font-mono text-sm font-semibold text-black">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        {mode === 'multi' && selectedContactIds.length > 0 && (
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

      {/* Selected Contacts Display */}
      {selectedContacts.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedContacts.map(contact => {
            const company = getCrmCompany(contact);
            return (
              <Badge
                key={contact.id}
                variant="primary"
                onRemove={disabled ? undefined : () => handleRemove(contact.id)}
              >
                👤 {contact.name}
                {company && <span className="text-xs ml-1">@ {company.company}</span>}
              </Badge>
            );
          })}
        </div>
      ) : (
        <div className="mb-2 text-sm text-gray-500 italic">
          {placeholder || 'No contacts selected'}
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
          👤 {mode === 'single' ? 'Select' : 'Add'} Contact
        </Button>
        {onCreateNew && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreateNew}
            disabled={disabled}
            title="Create new contact"
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
      {selectedContactIds.length > 0 && (
        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-sm font-semibold">
            ✓ {selectedContactIds.length} contact{selectedContactIds.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}

      {/* Selection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSearchTerm('');
          setLocalFilterType(filterByCrmType);
        }}
        title={`Select Contact${mode === 'multi' ? 's' : ''}`}
        size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setSearchTerm('');
                setLocalFilterType(filterByCrmType);
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
              placeholder="Search by name, email, title, or phone..."
              className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
              autoFocus
            />
            
            {filterByCrmType === 'all' && (
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
                  onClick={() => setLocalFilterType('investor')}
                  className={`px-3 py-1 text-sm font-semibold border-2 transition-colors ${
                    localFilterType === 'investor'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  💰 Investors
                </button>
                <button
                  type="button"
                  onClick={() => setLocalFilterType('customer')}
                  className={`px-3 py-1 text-sm font-semibold border-2 transition-colors ${
                    localFilterType === 'customer'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  🏢 Customers
                </button>
                <button
                  type="button"
                  onClick={() => setLocalFilterType('partner')}
                  className={`px-3 py-1 text-sm font-semibold border-2 transition-colors ${
                    localFilterType === 'partner'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  🤝 Partners
                </button>
              </div>
            )}
          </div>

          {/* Contact List */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="font-semibold">No contacts found</p>
                {searchTerm && (
                  <p className="text-sm mt-1">Try a different search term</p>
                )}
                {!searchTerm && contacts.length === 0 && onCreateNew && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsModalOpen(false);
                      onCreateNew();
                    }}
                    className="mt-4"
                  >
                    + Create Contact
                  </Button>
                )}
              </div>
            ) : (
              filteredContacts.map(contact => {
                const isSelected = selectedContactIds.includes(contact.id);
                const company = getCrmCompany(contact);
                return (
                  <label
                    key={contact.id}
                    className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <input
                      type={mode === 'single' ? 'radio' : 'checkbox'}
                      checked={isSelected}
                      onChange={() => handleToggle(contact.id)}
                      className="mt-1 w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👤</span>
                        <span className="font-semibold">{contact.name}</span>
                      </div>
                      {contact.title && (
                        <p className="text-sm text-gray-600 mt-1">{contact.title}</p>
                      )}
                      {company && (
                        <p className="text-sm font-semibold text-blue-700 mt-1">
                          @ {company.company}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                        {contact.email && (
                          <span className="font-mono">✉️ {contact.email}</span>
                        )}
                        {contact.phone && (
                          <span className="font-mono">📞 {contact.phone}</span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Selection Summary */}
          {selectedContactIds.length > 0 && (
            <div className="pt-3 border-t-2 border-gray-200">
              <p className="text-sm font-semibold text-blue-900">
                {selectedContactIds.length} contact{selectedContactIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
