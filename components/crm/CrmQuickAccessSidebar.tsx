import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnyCrmItem, Contact, Meeting } from '../../types';

interface ContactWithParent {
  contact: Contact;
  parentItem: AnyCrmItem;
}

interface MeetingWithContext extends Meeting {
  contactName: string;
  companyName: string;
  parentItem: AnyCrmItem;
  parentContact: Contact;
}

interface CrmQuickAccessSidebarProps {
  crmItems: AnyCrmItem[];
  userId?: string;
  onSelectAccount: (item: AnyCrmItem) => void;
  onSelectContact: (contact: Contact, parentItem: AnyCrmItem) => void;
}

export const CrmQuickAccessSidebar: React.FC<CrmQuickAccessSidebarProps> = ({
  crmItems,
  userId,
  onSelectAccount,
  onSelectContact,
}) => {
  const [showQuickAccess, setShowQuickAccess] = useState(false);

  const assignedAccounts = useMemo(() => {
    if (!userId) return [];
    const statusPriority: Record<string, number> = {
      'overdue': 0,
      'hot': 1,
      'warm': 2,
      'active': 3,
      'cold': 4,
      'inactive': 5
    };
    return crmItems
      .filter(item => item.assignedTo === userId)
      .sort((a, b) => {
        const aPriority = statusPriority[a.status?.toLowerCase() || ''] ?? 99;
        const bPriority = statusPriority[b.status?.toLowerCase() || ''] ?? 99;
        return aPriority - bPriority;
      });
  }, [crmItems, userId]);

  const assignedContacts = useMemo<ContactWithParent[]>(() => {
    if (!userId) return [];
    return crmItems
      .flatMap(item =>
        (item.contacts || [])
          .filter(contact => contact.assignedTo === userId)
          .map(contact => ({ contact, parentItem: item }))
      )
      .sort((a, b) => {
        const aMeetings = a.contact.meetings?.length || 0;
        const bMeetings = b.contact.meetings?.length || 0;
        if (aMeetings !== bMeetings) return bMeetings - aMeetings;
        return a.contact.name.localeCompare(b.contact.name);
      });
  }, [crmItems, userId]);

  const recentMeetings = useMemo<MeetingWithContext[]>(() => {
    if (!userId) return [];
    return crmItems
      .flatMap(item =>
        (item.contacts || []).flatMap(contact =>
          (contact.meetings || []).map(meeting => ({
            ...meeting,
            contactName: contact.name,
            companyName: item.company,
            parentItem: item,
            parentContact: contact
          }))
        )
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [crmItems, userId]);

  if (!userId) return null;

  return (
    <div className="space-y-4">
      {/* Mobile toggle header */}
      <button 
        onClick={() => setShowQuickAccess(!showQuickAccess)}
        className="w-full lg:hidden flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span>⚡</span> Quick Access
        </h2>
        <ChevronDown 
          size={18} 
          className={`text-gray-500 transition-transform ${showQuickAccess ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {/* Desktop always visible header */}
      <h2 className="hidden lg:flex text-sm font-semibold text-gray-500 uppercase tracking-wide items-center gap-2">
        <span>⚡</span> Quick Access
      </h2>
      
      {/* Content - always visible on desktop, toggled on mobile */}
      <div className={`space-y-4 ${showQuickAccess ? 'block' : 'hidden lg:block'}`}>
        {/* My Accounts */}
        <QuickAccessCard
          title="My Accounts"
          icon="📋"
          count={assignedAccounts.length}
          emptyMessage="No accounts assigned"
        >
          {assignedAccounts.slice(0, 5).map(item => (
            <button
              key={item.id}
              onClick={() => onSelectAccount(item)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group min-h-[52px]"
            >
              <div className="font-medium text-sm text-gray-900 truncate group-hover:text-black">
                {item.company}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  item.status === 'Active' ? 'bg-green-500' :
                  item.status === 'Hot' ? 'bg-red-500' :
                  item.status === 'Warm' ? 'bg-orange-500' :
                  'bg-gray-400'
                }`} />
                {item.status}
              </div>
            </button>
          ))}
        </QuickAccessCard>

        {/* My Contacts */}
        <QuickAccessCard
          title="My Contacts"
          icon="👤"
          count={assignedContacts.length}
          emptyMessage="No contacts assigned"
        >
          {assignedContacts.slice(0, 5).map(({ contact, parentItem }) => (
            <button
              key={contact.id}
              onClick={() => onSelectContact(contact, parentItem)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group min-h-[52px]"
            >
              <div className="font-medium text-sm text-gray-900 truncate group-hover:text-black">
                {contact.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">
                {parentItem.company}
              </div>
            </button>
          ))}
        </QuickAccessCard>

        {/* Recent Meetings */}
        <QuickAccessCard
          title="Recent Meetings"
          icon="📅"
          count={recentMeetings.length}
          emptyMessage="No meetings logged"
        >
          {recentMeetings.map(meeting => (
            <button
              key={meeting.id}
              onClick={() => onSelectContact(meeting.parentContact, meeting.parentItem)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group min-h-[52px]"
            >
              <div className="font-medium text-sm text-gray-900 truncate group-hover:text-black">
                {meeting.title}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <span className="truncate">{meeting.contactName}</span>
                <span>•</span>
                <span>{new Date(meeting.timestamp).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </QuickAccessCard>
      </div>
    </div>
  );
};

// Reusable card component for quick access sections
interface QuickAccessCardProps {
  title: string;
  icon: string;
  count: number;
  emptyMessage: string;
  children: React.ReactNode;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({
  title,
  icon,
  count,
  emptyMessage,
  children,
}) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <span>{icon}</span> {title}
        {count > 0 && (
          <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </h3>
    </div>
    <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
      {count > 0 ? (
        children
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </div>
      )}
    </div>
  </div>
);

export default CrmQuickAccessSidebar;
