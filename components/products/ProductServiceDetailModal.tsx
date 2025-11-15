import React, { useState } from 'react';
import { ProductService, ProductPriceHistory } from '../../types';

interface ProductServiceDetailModalProps {
    product: ProductService;
    priceHistory?: ProductPriceHistory[];
    onClose: () => void;
    onUpdate: (updates: Partial<ProductService>) => void;
    onDelete: () => void;
}

type TabType = 'overview' | 'pricing' | 'inventory' | 'analytics' | 'history';

export function ProductServiceDetailModal({ 
    product, 
    priceHistory = [],
    onClose, 
    onUpdate, 
    onDelete 
}: ProductServiceDetailModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [isEditing, setIsEditing] = useState(false);

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'product': return '📦';
            case 'service': return '⚡';
            case 'bundle': return '🎁';
            default: return '📦';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'inactive': return 'bg-gray-500';
            case 'discontinued': return 'bg-red-500';
            case 'draft': return 'bg-yellow-500';
            case 'archived': return 'bg-gray-400';
            case 'out_of_stock': return 'bg-red-400';
            default: return 'bg-gray-500';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const renderOverviewTab = () => (
        <div className="space-y-4">
            {/* Header with Status */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{getCategoryIcon(product.category)}</span>
                        <div>
                            <h3 className="text-xl font-bold">{product.name}</h3>
                            <p className="text-sm text-gray-600">{product.sku || 'No SKU'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 ${getStatusColor(product.status)} text-white text-xs font-bold border-2 border-black`}>
                            {product.status.toUpperCase()}
                        </span>
                        <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold border-2 border-black">
                            {product.type.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Description */}
            {product.description && (
                <div className="border-2 border-black p-4">
                    <h4 className="font-bold mb-2">Description</h4>
                    <p className="text-gray-700">{product.description}</p>
                </div>
            )}

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-black p-4">
                    <h4 className="font-bold mb-3">Basic Info</h4>
                    <div className="space-y-2">
                        <div>
                            <p className="text-xs text-gray-600">Category</p>
                            <p className="font-semibold">{product.category}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600">Type</p>
                            <p className="font-semibold">{product.type.replace('_', ' ')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600">Taxable</p>
                            <p className="font-semibold">{product.isTaxable ? 'Yes' : 'No'}</p>
                        </div>
                    </div>
                </div>

                <div className="border-2 border-black p-4">
                    <h4 className="font-bold mb-3">Financial</h4>
                    <div className="space-y-2">
                        <div>
                            <p className="text-xs text-gray-600">Base Price</p>
                            <p className="font-semibold text-lg">{formatCurrency(product.basePrice || 0)}</p>
                        </div>
                        {product.costOfGoods && (
                            <div>
                                <p className="text-xs text-gray-600">Cost</p>
                                <p className="font-semibold">{formatCurrency(product.costOfGoods)}</p>
                            </div>
                        )}
                        {product.basePrice && product.costOfGoods && (
                            <div>
                                <p className="text-xs text-gray-600">Margin</p>
                                <p className="font-semibold text-green-600">
                                    {((product.basePrice - product.costOfGoods) / product.basePrice * 100).toFixed(1)}%
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
                <div className="border-2 border-black p-4">
                    <h4 className="font-bold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                        {product.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-semibold border border-black">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Image URL */}
            {product.imageUrl && (
                <div className="border-2 border-black p-4">
                    <h4 className="font-bold mb-2">Image</h4>
                    <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="max-w-full h-auto border-2 border-black"
                    />
                </div>
            )}
        </div>
    );

    const renderPricingTab = () => (
        <div className="space-y-4">
            {/* Pricing Model */}
            <div className="border-2 border-black p-4">
                <h4 className="font-bold text-lg mb-3">Pricing Model</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Model Type</p>
                        <p className="font-semibold text-lg">{product.pricingModel.replace('_', ' ').toUpperCase()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Base Price</p>
                        <p className="font-bold text-xl text-green-600">{formatCurrency(product.basePrice || 0)}</p>
                    </div>
                </div>
            </div>

            {/* Cost Details */}
            <div className="border-2 border-black p-4">
                <h4 className="font-bold text-lg mb-3">Cost Structure</h4>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Cost Price</p>
                        <p className="font-semibold">{formatCurrency(product.costOfGoods || product.costOfService || 0)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Gross Profit</p>
                        <p className="font-semibold text-green-600">
                            {formatCurrency((product.basePrice || 0) - (product.costOfGoods || product.costOfService || 0))}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Margin</p>
                        <p className="font-semibold text-green-600">
                            {product.basePrice && (product.costOfGoods || product.costOfService) 
                                ? ((product.basePrice - (product.costOfGoods || product.costOfService || 0)) / product.basePrice * 100).toFixed(1) 
                                : '0'}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Tiered Pricing */}
            {product.tieredPricing && product.tieredPricing.length > 0 && (
                <div className="border-2 border-black p-4">
                    <h4 className="font-bold text-lg mb-3">Tiered Pricing</h4>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left py-2">Min Quantity</th>
                                <th className="text-left py-2">Max Quantity</th>
                                <th className="text-right py-2">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {product.tieredPricing.map((tier, idx) => (
                                <tr key={idx} className="border-b border-gray-300">
                                    <td className="py-2">{tier.minQuantity}</td>
                                    <td className="py-2">{tier.maxQuantity || '∞'}</td>
                                    <td className="text-right font-semibold">{formatCurrency(tier.price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Usage Pricing */}
            {product.usagePricing && product.usagePricing.length > 0 && (
                <div className="border-2 border-black p-4">
                    <h4 className="font-bold text-lg mb-3">Usage-Based Pricing</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Per Unit Price</p>
                            <p className="font-semibold">{formatCurrency(product.usagePricing[0].unitPrice)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Metric</p>
                            <p className="font-semibold">{product.usagePricing[0].metric}</p>
                        </div>
                        {product.usagePricing[0].overagePrice && (
                            <div>
                                <p className="text-sm text-gray-600">Overage Price</p>
                                <p className="font-semibold">{formatCurrency(product.usagePricing[0].overagePrice)}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Subscription Plan */}
            {product.subscriptionPlans && product.subscriptionPlans.length > 0 && (
                <div className="border-2 border-black p-4">
                    <h4 className="font-bold text-lg mb-3">Subscription Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Plan Name</p>
                            <p className="font-semibold">{product.subscriptionPlans[0].name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Billing Cycle</p>
                            <p className="font-semibold">{product.subscriptionPlans[0].billingCycle}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Price</p>
                            <p className="font-semibold">{formatCurrency(product.subscriptionPlans[0].price)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Features</p>
                            <p className="font-semibold">{product.subscriptionPlans[0].features.length} included</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );

    const renderInventoryTab = () => (
        <div className="space-y-4">
            {product.inventoryTracked ? (
                <>
                    {/* Stock Levels */}
                    <div className="border-2 border-black p-4">
                        <h4 className="font-bold text-lg mb-3">Stock Levels</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">On Hand</p>
                                <p className="font-bold text-2xl">{product.quantityOnHand || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Reserved</p>
                                <p className="font-bold text-2xl text-orange-600">{product.quantityReserved || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Available</p>
                                <p className="font-bold text-2xl text-green-600">{product.quantityAvailable || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* Thresholds */}
                    <div className="border-2 border-black p-4">
                        <h4 className="font-bold text-lg mb-3">Inventory Thresholds</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Reorder Point</p>
                                <p className="font-semibold">{product.reorderPoint || 'Not Set'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Reorder Quantity</p>
                                <p className="font-semibold">{product.reorderQuantity || 'Not Set'}</p>
                            </div>
                        </div>
                        {(product.quantityOnHand || 0) <= (product.reorderPoint || 0) && (
                            <div className="mt-3 p-3 bg-red-100 border-2 border-red-500">
                                <p className="font-bold text-red-700">⚠️ Stock Below Reorder Point</p>
                                <p className="text-sm text-red-600">Consider reordering soon</p>
                            </div>
                        )}
                    </div>
                </>
            ) : product.capacityTracked ? (
                <>
                    {/* Service Capacity */}
                    <div className="border-2 border-black p-4">
                        <h4 className="font-bold text-lg mb-3">Service Capacity</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Total Capacity</p>
                                <p className="font-bold text-2xl">{product.capacityTotal || 0}</p>
                                <p className="text-xs text-gray-500">{product.capacityUnit || 'units'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Booked</p>
                                <p className="font-bold text-2xl text-orange-600">{product.capacityBooked || 0}</p>
                                <p className="text-xs text-gray-500">{product.capacityUnit || 'units'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Available</p>
                                <p className="font-bold text-2xl text-green-600">{product.capacityAvailable || 0}</p>
                                <p className="text-xs text-gray-500">{product.capacityUnit || 'units'}</p>
                            </div>
                        </div>

                        {/* Capacity Bar */}
                        <div className="mt-4">
                            <div className="w-full h-6 bg-gray-200 border-2 border-black relative overflow-hidden">
                                <div 
                                    className="h-full bg-green-500 transition-all"
                                    style={{ 
                                        width: `${((product.capacityBooked || 0) / (product.capacityTotal || 1)) * 100}%` 
                                    }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                                    {((product.capacityBooked || 0) / (product.capacityTotal || 1) * 100).toFixed(1)}% Utilized
                                </span>
                            </div>
                        </div>
                    </div>

                </>
            ) : (
                <div className="border-2 border-black p-8 text-center">
                    <p className="text-gray-500 text-lg">No inventory or capacity tracking enabled</p>
                </div>
            )}
        </div>
    );

    const renderAnalyticsTab = () => {
        const cost = product.costOfGoods || product.costOfService || 0;
        const profitMargin = product.basePrice && cost 
            ? ((product.basePrice - cost) / product.basePrice * 100) 
            : 0;
        const avgRevenuePerUnit = product.totalUnitsSold > 0 
            ? (product.totalRevenue || 0) / product.totalUnitsSold 
            : 0;

        return (
            <div className="space-y-4">
                {/* Revenue Overview */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="border-2 border-black p-4 bg-green-50">
                        <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                        <p className="font-bold text-2xl text-green-600">{formatCurrency(product.totalRevenue || 0)}</p>
                    </div>
                    <div className="border-2 border-black p-4 bg-blue-50">
                        <p className="text-sm text-gray-600 mb-1">Units Sold</p>
                        <p className="font-bold text-2xl text-blue-600">{product.totalUnitsSold || 0}</p>
                    </div>
                    <div className="border-2 border-black p-4 bg-purple-50">
                        <p className="text-sm text-gray-600 mb-1">Avg Revenue/Unit</p>
                        <p className="font-bold text-2xl text-purple-600">{formatCurrency(avgRevenuePerUnit)}</p>
                    </div>
                </div>

                {/* Profitability */}
                <div className="border-2 border-black p-4">
                    <h4 className="font-bold text-lg mb-3">Profitability Analysis</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Profit Margin</p>
                            <p className="font-bold text-xl text-green-600">{profitMargin.toFixed(1)}%</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Est. Total Profit</p>
                            <p className="font-bold text-xl text-green-600">
                                {formatCurrency(((product.basePrice || 0) - cost) * (product.totalUnitsSold || 0))}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="border-2 border-black p-4">
                    <h4 className="font-bold text-lg mb-3">Performance Metrics</h4>
                    <div className="space-y-3">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm">Revenue Performance</span>
                                <span className="text-sm font-semibold">
                                    {product.totalRevenue > 0 ? 'Active' : 'No Sales'}
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-200 border border-black">
                                <div 
                                    className="h-full bg-green-500"
                                    style={{ width: `${Math.min((product.totalRevenue || 0) / 10000 * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm">Sales Volume</span>
                                <span className="text-sm font-semibold">{product.totalUnitsSold || 0} units</span>
                            </div>
                            <div className="w-full h-3 bg-gray-200 border border-black">
                                <div 
                                    className="h-full bg-blue-500"
                                    style={{ width: `${Math.min((product.totalUnitsSold || 0) / 100 * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription Metrics (if applicable) */}
                {product.pricingModel === 'monthly' || product.pricingModel === 'annual' ? (
                    <div className="border-2 border-black p-4 bg-blue-50">
                        <h4 className="font-bold text-lg mb-3">Recurring Revenue</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">MRR (if monthly)</p>
                                <p className="font-bold text-xl text-blue-600">
                                    {product.pricingModel === 'monthly' 
                                        ? formatCurrency(product.basePrice || 0)
                                        : formatCurrency((product.basePrice || 0) / 12)
                                    }
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">ARR</p>
                                <p className="font-bold text-xl text-blue-600">
                                    {formatCurrency((product.basePrice || 0) * (product.pricingModel === 'monthly' ? 12 : 1))}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Quick Stats */}
                <div className="border-2 border-black p-4">
                    <h4 className="font-bold text-lg mb-3">Quick Stats</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-semibold">{product.status}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Category:</span>
                            <span className="font-semibold">{product.category}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-semibold">{formatDate(product.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Last Updated:</span>
                            <span className="font-semibold">{formatDate(product.updatedAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderHistoryTab = () => (
        <div className="space-y-4">
            {/* Price History */}
            <div className="border-2 border-black p-4">
                <h4 className="font-bold text-lg mb-3">Price Change History</h4>
                {priceHistory.length > 0 ? (
                    <div className="space-y-2">
                        {priceHistory.map((history) => (
                            <div key={history.id} className="flex items-center justify-between p-3 border border-gray-300">
                                <div>
                                    <p className="font-semibold">
                                        {formatCurrency(history.oldPrice || 0)} → {formatCurrency(history.newPrice)}
                                    </p>
                                    <p className="text-xs text-gray-600">{formatDate(history.changedAt)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">Change</p>
                                    <p className={`font-semibold ${(history.newPrice - (history.oldPrice || 0)) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {((history.newPrice - (history.oldPrice || 0)) / (history.oldPrice || 1) * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">No price changes recorded</p>
                )}
            </div>

            {/* Metadata */}
            <div className="border-2 border-black p-4">
                <h4 className="font-bold text-lg mb-3">Record Information</h4>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-semibold">{formatDate(product.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="font-semibold">{formatDate(product.updatedAt)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Product ID:</span>
                        <span className="font-mono text-sm">{product.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Workspace ID:</span>
                        <span className="font-mono text-sm">{product.workspaceId}</span>
                    </div>
                </div>
            </div>

            {/* Activity Timeline Placeholder */}
            <div className="border-2 border-black p-4">
                <h4 className="font-bold text-lg mb-3">Activity Timeline</h4>
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500 border-2 border-black flex items-center justify-center text-white font-bold text-xs">
                            ✓
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold">Product Updated</p>
                            <p className="text-sm text-gray-600">{formatDate(product.updatedAt)}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-500 border-2 border-black flex items-center justify-center text-white font-bold text-xs">
                            +
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold">Product Created</p>
                            <p className="text-sm text-gray-600">{formatDate(product.createdAt)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-10 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-black shadow-neo max-w-5xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b-4 border-black">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{getCategoryIcon(product.category)}</span>
                            <div>
                                <h2 className="text-2xl font-bold">{product.name}</h2>
                                <p className="text-sm text-gray-600">{product.sku || 'No SKU'}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-3xl font-bold hover:text-red-500 transition-colors leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b-4 border-black bg-gray-50">
                    {(['overview', 'pricing', 'inventory', 'analytics', 'history'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-4 py-3 font-bold border-r-2 border-black transition-colors ${
                                activeTab === tab 
                                    ? 'bg-white border-b-4 border-b-white -mb-1' 
                                    : 'hover:bg-gray-100'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && renderOverviewTab()}
                    {activeTab === 'pricing' && renderPricingTab()}
                    {activeTab === 'inventory' && renderInventoryTab()}
                    {activeTab === 'analytics' && renderAnalyticsTab()}
                    {activeTab === 'history' && renderHistoryTab()}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t-4 border-black bg-gray-50">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-500 text-white font-bold border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="px-6 py-3 bg-blue-500 text-white font-bold border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                        >
                            {isEditing ? 'Cancel Edit' : 'Edit'}
                        </button>
                        <button
                            onClick={onDelete}
                            className="px-6 py-3 bg-red-500 text-white font-bold border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductServiceDetailModal;
