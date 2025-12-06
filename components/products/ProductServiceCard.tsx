import React from 'react';
import { ProductService } from '../../types';

interface ProductServiceCardProps {
    product: ProductService;
    viewMode: 'grid' | 'list';
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function ProductServiceCard({ 
    product, 
    viewMode,
    onClick,
    onEdit,
    onDelete 
}: ProductServiceCardProps) {
    const getCategoryIcon = () => {
        switch (product.category) {
            case 'product': return '📦';
            case 'service': return '⚡';
            case 'bundle': return '🎁';
            default: return '📋';
        }
    };

    const getStatusColor = () => {
        switch (product.status) {
            case 'active': return 'bg-green-300';
            case 'draft': return 'bg-yellow-300';
            case 'archived': return 'bg-gray-300';
            case 'out_of_stock': return 'bg-red-300';
            default: return 'bg-gray-200';
        }
    };

    const getPricingDisplay = () => {
        if (product.basePrice == null) return 'Price not set';
        
        switch (product.pricingModel) {
            case 'flat_rate':
                return `$${product.basePrice.toLocaleString()}`;
            case 'hourly':
                return `$${product.basePrice.toLocaleString()}/hr`;
            case 'daily':
                return `$${product.basePrice.toLocaleString()}/day`;
            case 'weekly':
                return `$${product.basePrice.toLocaleString()}/wk`;
            case 'monthly':
                return `$${product.basePrice.toLocaleString()}/mo`;
            case 'annual':
                return `$${product.basePrice.toLocaleString()}/yr`;
            case 'tiered':
                return 'Tiered pricing';
            case 'usage_based':
                return 'Usage-based';
            case 'custom':
                return 'Custom pricing';
            default:
                return `$${product.basePrice.toLocaleString()}`;
        }
    };

    const getInventoryStatus = () => {
        if (!product.inventoryTracked) return null;
        
        const available = product.quantityAvailable || 0;
        if (available === 0) {
            return { label: 'Out of stock', color: 'text-red-600' };
        } else if (available <= 10) {
            return { label: `${available} left`, color: 'text-orange-600' };
        } else {
            return { label: `${available} in stock`, color: 'text-green-600' };
        }
    };

    const getCapacityStatus = () => {
        if (!product.capacityTracked) return null;
        
        const available = product.capacityAvailable || 0;
        const total = product.capacityTotal || 0;
        if (total === 0) return null;
        
        const percentAvailable = (available / total) * 100;
        if (percentAvailable === 0) {
            return { label: 'Fully booked', color: 'text-red-600' };
        } else if (percentAvailable <= 25) {
            return { label: `${available}/${total} ${product.capacityUnit}`, color: 'text-orange-600' };
        } else {
            return { label: `${available}/${total} ${product.capacityUnit}`, color: 'text-green-600' };
        }
    };

    const inventoryStatus = getInventoryStatus();
    const capacityStatus = getCapacityStatus();

    if (viewMode === 'list') {
        return (
            <div 
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={onClick}
            >
                <div className="p-4 flex items-center gap-4">
                    {/* Image/Icon */}
                    <div className="w-16 h-16 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 shrink-0">
                        {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                            <span className="text-3xl">{getCategoryIcon()}</span>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-lg text-slate-900 truncate">{product.name}</h3>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor()}`}>
                                        {product.status}
                                    </span>
                                </div>
                                {product.sku && (
                                    <p className="text-sm text-gray-600 mb-1">SKU: {product.sku}</p>
                                )}
                                {product.description && (
                                    <p className="text-sm text-gray-700 line-clamp-1">{product.description}</p>
                                )}
                            </div>

                            {/* Price */}
                            <div className="text-right shrink-0">
                                <p className="text-xl font-bold text-slate-900">{getPricingDisplay()}</p>
                                {(inventoryStatus || capacityStatus) && (
                                    <p className={`text-sm font-semibold ${inventoryStatus?.color || capacityStatus?.color}`}>
                                        {inventoryStatus?.label || capacityStatus?.label}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Metrics */}
                        {(product.totalRevenue || product.totalUnitsSold) && (
                            <div className="flex gap-4 mt-2 text-sm text-gray-600">
                                {product.totalRevenue > 0 && (
                                    <span>Revenue: <strong className="text-slate-900">${product.totalRevenue.toLocaleString()}</strong></span>
                                )}
                                {product.totalUnitsSold > 0 && (
                                    <span>Sold: <strong className="text-slate-900">{product.totalUnitsSold}</strong></span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            className="px-3 py-1.5 bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="px-3 py-1.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Grid view
    return (
        <div 
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={onClick}
        >
            {/* Image */}
            <div className="w-full h-48 rounded-t-xl border-b border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-6xl">{getCategoryIcon()}</span>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg line-clamp-2 flex-grow">{product.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${getStatusColor()} ml-2 shrink-0`}>
                        {product.status}
                    </span>
                </div>

                {/* SKU */}
                {product.sku && (
                    <p className="text-sm text-gray-600 mb-2">SKU: {product.sku}</p>
                )}

                {/* Description */}
                {product.description && (
                    <p className="text-sm text-gray-700 line-clamp-2 mb-3">{product.description}</p>
                )}

                {/* Price */}
                <div className="mb-3">
                    <p className="text-2xl font-bold">{getPricingDisplay()}</p>
                </div>

                {/* Inventory/Capacity Status */}
                {(inventoryStatus || capacityStatus) && (
                    <div className={`text-sm font-semibold mb-3 ${inventoryStatus?.color || capacityStatus?.color}`}>
                        {inventoryStatus?.label || capacityStatus?.label}
                    </div>
                )}

                {/* Metrics */}
                {(product.totalRevenue > 0 || product.totalUnitsSold > 0) && (
                    <div className="border-t-2 border-black pt-3 mb-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {product.totalRevenue > 0 && (
                                <div>
                                    <p className="text-gray-600">Revenue</p>
                                    <p className="font-bold">${product.totalRevenue.toLocaleString()}</p>
                                </div>
                            )}
                            {product.totalUnitsSold > 0 && (
                                <div>
                                    <p className="text-gray-600">Sold</p>
                                    <p className="font-bold">{product.totalUnitsSold}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="flex-1 px-3 py-2 bg-zinc-900 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-zinc-800 transition-all"
                    >
                        Edit
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="px-3 py-2 bg-red-500 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-red-600 transition-all"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProductServiceCard;
