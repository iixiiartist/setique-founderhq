import React from 'react';

interface KPICard {
    title: string;
    value: string;
    change: string;
    positive: boolean;
}

interface FinancialsKPISectionProps {
    kpiCards: KPICard[];
}

export const FinancialsKPISection: React.FC<FinancialsKPISectionProps> = ({ kpiCards }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {kpiCards.map((kpi, i) => (
                <div
                    key={i}
                    className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-sm text-center"
                >
                    <div className="text-xs text-gray-500 mb-1 truncate">
                        {kpi.title}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                        {kpi.value}
                    </div>
                    <div
                        className={`text-xs font-medium ${
                            kpi.positive ? 'text-green-600' : 'text-red-600'
                        }`}
                    >
                        {kpi.change}
                    </div>
                </div>
            ))}
        </div>
    );
};
