import React from 'react';

const KpiCard: React.FC<{ title: string; value: string; description: string }> = ({ title, value, description }) => (
    <div className="bg-white p-6 border-2 border-black shadow-neo">
        <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wider font-mono">{title}</h2>
        <p className="text-4xl font-bold text-black mt-2">{value}</p>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
    </div>
);

export default KpiCard;
