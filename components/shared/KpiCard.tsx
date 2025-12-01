import React from 'react';

interface TrendMeta {
    label: string;
    tone: 'positive' | 'negative';
    direction?: 'up' | 'down' | 'flat';
}

const KpiCard: React.FC<{ title: string; value: string; description: string; trend?: TrendMeta }> = ({ title, value, description, trend }) => {
    const trendIcon = trend?.direction || (trend?.tone === 'positive' ? 'up' : 'down');
    const iconSymbol = trendIcon === 'up' ? '▲' : trendIcon === 'down' ? '▼' : '→';
    const toneClass = trend?.tone === 'positive' ? 'text-black' : 'text-gray-600';

    return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wider font-mono">{title}</h2>
        <p className="text-4xl font-bold text-black mt-2">{value}</p>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        {trend && (
            <p className={`text-sm font-semibold mt-2 flex items-center gap-1 ${toneClass}`}>
                <span aria-hidden="true">{iconSymbol}</span>
                {trend.label}
            </p>
        )}
    </div>
    );
};

export default KpiCard;
