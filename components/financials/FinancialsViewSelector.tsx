import React from 'react';

export type FinancialsViewType = 'overview' | 'revenue' | 'cashflow' | 'metrics' | 'forecasting' | 'analytics' | 'marketing';

interface FinancialsViewSelectorProps {
    currentView: FinancialsViewType;
    onViewChange: (view: FinancialsViewType) => void;
}

const VIEW_OPTIONS: { id: FinancialsViewType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'cashflow', label: 'Cash Flow' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'forecasting', label: '📊 Forecasting' },
    { id: 'analytics', label: '💰 Analytics' },
    { id: 'marketing', label: '🎯 Marketing' },
];

export const FinancialsViewSelector: React.FC<FinancialsViewSelectorProps> = ({
    currentView,
    onViewChange
}) => {
    return (
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
                {VIEW_OPTIONS.map(view => (
                    <button
                        key={view.id}
                        type="button"
                        onClick={() => onViewChange(view.id)}
                        className={`min-h-[44px] sm:min-h-0 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                            currentView === view.id
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-white text-slate-700 border border-gray-200 hover:bg-gray-50 hover:shadow-sm'
                        }`}
                        aria-pressed={currentView === view.id}
                    >
                        {view.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
