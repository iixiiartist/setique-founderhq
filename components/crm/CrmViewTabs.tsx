import React from 'react';

export type CrmViewType = 'accounts' | 'contacts' | 'followups' | 'deals';

interface CrmViewTab {
  id: CrmViewType;
  label: string;
  icon: string;
}

const TABS: CrmViewTab[] = [
  { id: 'accounts', label: 'Accounts', icon: '📊' },
  { id: 'contacts', label: 'Contacts', icon: '👥' },
  { id: 'followups', label: 'Follow Ups', icon: '📋' },
  { id: 'deals', label: 'Deals', icon: '💼' },
];

interface CrmViewTabsProps {
  activeView: CrmViewType;
  onViewChange: (view: CrmViewType) => void;
}

export const CrmViewTabs: React.FC<CrmViewTabsProps> = ({
  activeView,
  onViewChange,
}) => {
  return (
    <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-3.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap ${
            activeView === tab.id
              ? 'text-black'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span>{tab.icon}</span>
          <span className="hidden xs:inline sm:inline">{tab.label}</span>
          {activeView === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
          )}
        </button>
      ))}
    </div>
  );
};

export default CrmViewTabs;
