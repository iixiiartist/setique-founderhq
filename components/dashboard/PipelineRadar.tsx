import React from 'react';

interface Deal {
    id: string;
    title: string;
    stage: string;
    value?: number;
    totalValue?: number;
    probability?: number;
}

interface PipelineRadarProps {
    topDeals: Deal[];
    openDealsCount: number;
    formatCurrency: (value: number) => string;
}

export const PipelineRadar: React.FC<PipelineRadarProps> = ({
    topDeals,
    openDealsCount,
    formatCurrency
}) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-xs uppercase text-gray-500">Pipeline radar</p>
                    <h2 className="text-xl font-bold text-gray-900">Top opportunities on deck</h2>
                </div>
                <span className="text-sm font-medium text-gray-500">{openDealsCount} active</span>
            </div>
            {topDeals.length > 0 ? (
                <div className="space-y-4">
                    {topDeals.map((deal) => (
                        <div
                            key={deal.id}
                            className="border border-dashed border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                            <div>
                                <p className="text-lg font-semibold text-gray-900">{deal.title}</p>
                                <p className="text-sm text-gray-500">Stage: {deal.stage.replace('_', ' ')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatCurrency(deal.totalValue ?? deal.value ?? 0)}
                                </p>
                                <p className="text-xs text-gray-500">Prob: {deal.probability ?? 0}%</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500 font-medium">
                    No open deals yet — log your next opportunity to populate this radar.
                </div>
            )}
        </div>
    );
};
