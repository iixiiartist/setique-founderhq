import React from 'react';

export type MarketingViewType = 'calendar' | 'analytics' | 'attribution';

interface MarketingViewTab {
  id: MarketingViewType;
  label: string;
}

const VIEWS: MarketingViewTab[] = [
  { id: 'calendar', label: 'Content Calendar' },
  { id: 'analytics', label: 'Campaign Analytics' },
  { id: 'attribution', label: 'Attribution' },
];

interface MarketingViewSelectorProps {
  currentView: MarketingViewType;
  onViewChange: (view: MarketingViewType) => void;
}

export const MarketingViewSelector: React.FC<MarketingViewSelectorProps> = ({
  currentView,
  onViewChange,
}) => {
  return (
    <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`min-h-[44px] sm:min-h-0 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-all flex-shrink-0 ${
              currentView === view.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-gray-200 hover:bg-gray-50 hover:shadow-sm'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MarketingViewSelector;
