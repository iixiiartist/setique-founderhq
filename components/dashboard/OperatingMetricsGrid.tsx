import React from 'react';

export interface OperatingMetric {
    label: string;
    primary: string;
    secondary?: string;
}

interface OperatingMetricsGridProps {
    metrics: OperatingMetric[];
}

export const OperatingMetricsGrid: React.FC<OperatingMetricsGridProps> = ({ metrics }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-xs uppercase text-gray-500">Operating snapshot</p>
                    <h2 className="text-2xl font-bold text-gray-900">Where attention drives impact</h2>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {metrics.map((metric) => (
                    <div key={metric.label} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                        <p className="text-xs uppercase text-gray-500">{metric.label}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{metric.primary}</p>
                        {metric.secondary && <p className="text-sm text-gray-500 mt-1">{metric.secondary}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
};
