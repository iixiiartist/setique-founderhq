import React, { useMemo } from 'react';
import { ProductService, RevenueTransaction, Deal } from '../../types';
import { TrendingUp, TrendingDown, DollarSign, Package, BarChart3, Target } from 'lucide-react';

interface ProductAnalyticsDashboardProps {
    productsServices: ProductService[];
    revenueTransactions: RevenueTransaction[];
    deals: Deal[];
    timeRange?: '7d' | '30d' | '90d' | '1y' | 'all';
}

const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
};

const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export default function ProductAnalyticsDashboard({
    productsServices,
    revenueTransactions,
    deals,
    timeRange = '30d'
}: ProductAnalyticsDashboardProps) {
    
    // Calculate date range filter
    const dateFilter = useMemo(() => {
        const now = new Date();
        const cutoffDate = new Date();
        
        switch (timeRange) {
            case '7d':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                cutoffDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                cutoffDate.setDate(now.getDate() - 90);
                break;
            case '1y':
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                return () => true;
        }
        
        return (dateStr: string) => new Date(dateStr) >= cutoffDate;
    }, [timeRange]);
    
    // Calculate product analytics
    const analytics = useMemo(() => {
        return productsServices.map(product => {
            // Filter revenue for this product
            const productRevenue = revenueTransactions.filter(tx => 
                tx.productServiceId === product.id && 
                dateFilter(tx.transactionDate)
            );
            
            // Calculate revenue metrics
            const totalRevenue = productRevenue.reduce((sum, tx) => sum + tx.amount, 0);
            const totalUnits = productRevenue.reduce((sum, tx) => sum + (tx.quantity || 0), 0);
            
            // Calculate costs and margin
            const totalCost = totalUnits * (product.costOfGoods || 0);
            const totalProfit = totalRevenue - totalCost;
            const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
            
            // Calculate active deals
            const productDeals = deals.filter(d => 
                d.productServiceId === product.id &&
                d.stage !== 'closed_lost' &&
                d.stage !== 'closed_won'
            );
            const pipelineValue = productDeals.reduce((sum, d) => sum + (d.totalValue || d.value || 0), 0);
            
            // Inventory metrics
            const inventoryValue = product.inventoryTracked 
                ? (product.quantityOnHand || 0) * (product.costOfGoods || 0)
                : 0;
            const turnoverRate = product.inventoryTracked && (product.quantityOnHand || 0) > 0
                ? totalUnits / (product.quantityOnHand || 1)
                : 0;
            
            return {
                product,
                totalRevenue,
                totalUnits,
                totalCost,
                totalProfit,
                profitMargin,
                activeDeals: productDeals.length,
                pipelineValue,
                inventoryValue,
                turnoverRate,
                avgPrice: totalUnits > 0 ? totalRevenue / totalUnits : product.basePrice
            };
        });
    }, [productsServices, revenueTransactions, deals, dateFilter]);
    
    // Sort analytics for different views
    const topByRevenue = useMemo(() => 
        [...analytics].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10),
        [analytics]
    );
    
    const topByMargin = useMemo(() => 
        [...analytics]
            .filter(a => a.totalRevenue > 0)
            .sort((a, b) => b.profitMargin - a.profitMargin)
            .slice(0, 10),
        [analytics]
    );
    
    const topByUnits = useMemo(() => 
        [...analytics].sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 10),
        [analytics]
    );
    
    // Calculate summary metrics
    const summary = useMemo(() => {
        return analytics.reduce((acc, item) => ({
            totalRevenue: acc.totalRevenue + item.totalRevenue,
            totalProfit: acc.totalProfit + item.totalProfit,
            totalUnits: acc.totalUnits + item.totalUnits,
            totalInventoryValue: acc.totalInventoryValue + item.inventoryValue,
            totalPipelineValue: acc.totalPipelineValue + item.pipelineValue
        }), {
            totalRevenue: 0,
            totalProfit: 0,
            totalUnits: 0,
            totalInventoryValue: 0,
            totalPipelineValue: 0
        });
    }, [analytics]);
    
    const avgMargin = summary.totalRevenue > 0 
        ? (summary.totalProfit / summary.totalRevenue) * 100 
        : 0;
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6" />
                    <h2 className="text-2xl font-bold">Product Analytics</h2>
                </div>
            </div>
            
            {/* Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 border-2 border-black shadow-neo">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <DollarSign className="w-4 h-4" />
                        Total Revenue
                    </div>
                    <div className="text-2xl font-bold">
                        {formatCurrency(summary.totalRevenue)}
                    </div>
                </div>
                
                <div className="bg-green-50 p-4 border-2 border-green-600 shadow-neo">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        Total Profit
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                        {formatCurrency(summary.totalProfit)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                        {formatPercent(avgMargin)} margin
                    </div>
                </div>
                
                <div className="bg-blue-50 p-4 border-2 border-blue-600 shadow-neo">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Package className="w-4 h-4" />
                        Units Sold
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                        {summary.totalUnits.toLocaleString()}
                    </div>
                </div>
                
                <div className="bg-purple-50 p-4 border-2 border-purple-600 shadow-neo">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Target className="w-4 h-4" />
                        Pipeline Value
                    </div>
                    <div className="text-2xl font-bold text-purple-700">
                        {formatCurrency(summary.totalPipelineValue)}
                    </div>
                </div>
                
                <div className="bg-orange-50 p-4 border-2 border-orange-600 shadow-neo">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Package className="w-4 h-4" />
                        Inventory Value
                    </div>
                    <div className="text-2xl font-bold text-orange-700">
                        {formatCurrency(summary.totalInventoryValue)}
                    </div>
                </div>
            </div>
            
            {/* Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top by Revenue */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Top by Revenue
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                        {topByRevenue.map((item, index) => (
                            <div key={item.product.id} className="p-3 border-2 border-black">
                                <div className="flex items-start justify-between">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-mono font-bold">#{index + 1}</span>
                                            <span className="font-semibold">{item.product.name}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {item.totalUnits} units sold
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-green-700">
                                            {formatCurrency(item.totalRevenue)}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {formatPercent(item.profitMargin)} margin
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Top by Margin */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Top by Profit Margin
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                        {topByMargin.map((item, index) => (
                            <div key={item.product.id} className="p-3 border-2 border-black">
                                <div className="flex items-start justify-between">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-mono font-bold">#{index + 1}</span>
                                            <span className="font-semibold">{item.product.name}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {formatCurrency(item.totalRevenue)} revenue
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-green-700">
                                            {formatPercent(item.profitMargin)}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {formatCurrency(item.totalProfit)} profit
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Top by Volume */}
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Top by Volume
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                        {topByUnits.map((item, index) => (
                            <div key={item.product.id} className="p-3 border-2 border-black">
                                <div className="flex items-start justify-between">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-mono font-bold">#{index + 1}</span>
                                            <span className="font-semibold">{item.product.name}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {formatCurrency(item.avgPrice)} avg price
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-blue-700">
                                            {item.totalUnits} units
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {formatCurrency(item.totalRevenue)} revenue
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Detailed Table */}
            <div className="bg-white p-6 border-2 border-black shadow-neo">
                <h3 className="text-xl font-semibold mb-4">All Products Performance</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left p-2 font-semibold">Product</th>
                                <th className="text-right p-2 font-semibold">Revenue</th>
                                <th className="text-right p-2 font-semibold">Units</th>
                                <th className="text-right p-2 font-semibold">Profit</th>
                                <th className="text-right p-2 font-semibold">Margin</th>
                                <th className="text-right p-2 font-semibold">Pipeline</th>
                                <th className="text-right p-2 font-semibold">Inventory</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analytics
                                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                                .map((item) => (
                                <tr key={item.product.id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="p-2">
                                        <div className="font-semibold">{item.product.name}</div>
                                        <div className="text-xs text-gray-600">
                                            {item.product.category} • {item.product.type}
                                        </div>
                                    </td>
                                    <td className="p-2 text-right font-mono">
                                        {formatCurrency(item.totalRevenue)}
                                    </td>
                                    <td className="p-2 text-right font-mono">
                                        {item.totalUnits}
                                    </td>
                                    <td className="p-2 text-right font-mono">
                                        {formatCurrency(item.totalProfit)}
                                    </td>
                                    <td className="p-2 text-right">
                                        <span className={`font-semibold ${
                                            item.profitMargin >= 30 ? 'text-green-600' :
                                            item.profitMargin >= 15 ? 'text-blue-600' :
                                            item.profitMargin >= 0 ? 'text-gray-600' :
                                            'text-red-600'
                                        }`}>
                                            {formatPercent(item.profitMargin)}
                                        </span>
                                    </td>
                                    <td className="p-2 text-right font-mono">
                                        {formatCurrency(item.pipelineValue)}
                                    </td>
                                    <td className="p-2 text-right">
                                        {item.product.inventoryTracked ? (
                                            <div>
                                                <div className="font-mono text-sm">
                                                    {item.product.quantityOnHand || 0} units
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {formatCurrency(item.inventoryValue)}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">N/A</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
