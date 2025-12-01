import React, { useState, useEffect } from 'react';
import { ProductService, ProductPriceHistory } from '../../types';
import { showSuccess, showError } from '../../lib/utils/toast';

interface ProductServiceDetailModalProps {
    product: ProductService;
    priceHistory?: ProductPriceHistory[];
    onClose: () => void;
    onUpdate: (updates: Partial<ProductService>) => void;
    onDelete: () => void;
    onAdjustInventory?: (quantityChange: number, reason?: string) => Promise<{ success: boolean; message: string }>;
    onReserveInventory?: (quantity: number) => Promise<{ success: boolean; message: string }>;
    onReleaseInventory?: (quantity: number) => Promise<{ success: boolean; message: string }>;
}

type TabType = 'overview' | 'pricing' | 'inventory' | 'analytics' | 'history';

export function ProductServiceDetailModal({ 
    product, 
    priceHistory = [],
    onClose, 
    onUpdate, 
    onDelete,
    onAdjustInventory,
    onReserveInventory,
    onReleaseInventory
}: ProductServiceDetailModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Editable form state - initialize with product values
    const [formData, setFormData] = useState({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        category: product.category || 'product',
        type: product.type || 'physical',
        status: product.status || 'draft',
        basePrice: product.basePrice || 0,
        costOfGoods: product.costOfGoods || 0,
        costOfService: product.costOfService || 0,
        pricingModel: product.pricingModel || 'flat_rate',
        billingPeriod: product.billingPeriod || null,
        isTaxable: product.isTaxable ?? true,
        taxCode: product.taxCode || '',
        imageUrl: product.imageUrl || '',
        tags: product.tags || [],
        // Inventory
        inventoryTracked: product.inventoryTracked ?? false,
        quantityOnHand: product.quantityOnHand || 0,
        reorderPoint: product.reorderPoint || 0,
        reorderQuantity: product.reorderQuantity || 0,
        // Capacity (services)
        capacityTracked: product.capacityTracked ?? false,
        capacityTotal: product.capacityTotal || 0,
        capacityUnit: product.capacityUnit || 'hours',
    });
    
    // Tag input state
    const [tagInput, setTagInput] = useState('');
    
    // Reset form when product changes
    useEffect(() => {
        setFormData({
            name: product.name || '',
            sku: product.sku || '',
            description: product.description || '',
            category: product.category || 'product',
            type: product.type || 'physical',
            status: product.status || 'draft',
            basePrice: product.basePrice || 0,
            costOfGoods: product.costOfGoods || 0,
            costOfService: product.costOfService || 0,
            pricingModel: product.pricingModel || 'flat_rate',
            billingPeriod: product.billingPeriod || null,
            isTaxable: product.isTaxable ?? true,
            taxCode: product.taxCode || '',
            imageUrl: product.imageUrl || '',
            tags: product.tags || [],
            inventoryTracked: product.inventoryTracked ?? false,
            quantityOnHand: product.quantityOnHand || 0,
            reorderPoint: product.reorderPoint || 0,
            reorderQuantity: product.reorderQuantity || 0,
            capacityTracked: product.capacityTracked ?? false,
            capacityTotal: product.capacityTotal || 0,
            capacityUnit: product.capacityUnit || 'hours',
        });
    }, [product]);
    
    // Inventory adjustment state
    const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
    const [adjustReason, setAdjustReason] = useState<string>('');
    const [reserveQuantity, setReserveQuantity] = useState<number>(0);
    const [releaseQuantity, setReleaseQuantity] = useState<number>(0);
    const [isAdjusting, setIsAdjusting] = useState(false);
    
    // Update form field helper
    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    // Add tag helper
    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
            setTagInput('');
        }
    };
    
    // Remove tag helper
    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
    };
    
    // Save changes
    const handleSave = async () => {
        if (!formData.name.trim()) {
            showError('Product name is required');
            return;
        }
        
        setIsSaving(true);
        try {
            await onUpdate(formData);
            showSuccess('Product updated successfully!');
            setIsEditing(false);
        } catch (err: any) {
            showError(err.message || 'Failed to update product');
        } finally {
            setIsSaving(false);
        }
    };
    
    // Cancel editing
    const handleCancelEdit = () => {
        // Reset form to original product values
        setFormData({
            name: product.name || '',
            sku: product.sku || '',
            description: product.description || '',
            category: product.category || 'product',
            type: product.type || 'physical',
            status: product.status || 'draft',
            basePrice: product.basePrice || 0,
            costOfGoods: product.costOfGoods || 0,
            costOfService: product.costOfService || 0,
            pricingModel: product.pricingModel || 'flat_rate',
            billingPeriod: product.billingPeriod || null,
            isTaxable: product.isTaxable ?? true,
            taxCode: product.taxCode || '',
            imageUrl: product.imageUrl || '',
            tags: product.tags || [],
            inventoryTracked: product.inventoryTracked ?? false,
            quantityOnHand: product.quantityOnHand || 0,
            reorderPoint: product.reorderPoint || 0,
            reorderQuantity: product.reorderQuantity || 0,
            capacityTracked: product.capacityTracked ?? false,
            capacityTotal: product.capacityTotal || 0,
            capacityUnit: product.capacityUnit || 'hours',
        });
        setIsEditing(false);
    };

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

    const formatDate = (date: string | undefined) => {
        if (!date) return 'N/A';
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) return 'N/A';
        return parsed.toLocaleDateString('en-US', {
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
                        <span className="text-3xl">{getCategoryIcon(isEditing ? formData.category : product.category)}</span>
                        <div className="flex-1">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className="text-xl font-bold w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Product Name"
                                />
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold">{product.name}</h3>
                                    <p className="text-sm text-gray-600">{product.sku || 'No SKU'}</p>
                                </>
                            )}
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="flex items-center gap-2 mt-2">
                            <select
                                value={formData.status}
                                onChange={(e) => updateField('status', e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="discontinued">Discontinued</option>
                                <option value="archived">Archived</option>
                                <option value="out_of_stock">Out of Stock</option>
                            </select>
                            <select
                                value={formData.type}
                                onChange={(e) => updateField('type', e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="physical">Physical</option>
                                <option value="digital">Digital</option>
                                <option value="subscription">Subscription</option>
                                <option value="time_based">Time Based</option>
                                <option value="project_based">Project Based</option>
                                <option value="retainer">Retainer</option>
                            </select>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 ${getStatusColor(product.status || 'draft')} text-white text-xs font-semibold rounded-full`}>
                                {(product.status || 'draft').toUpperCase()}
                            </span>
                            <span className="px-3 py-1 bg-slate-700 text-white text-xs font-semibold rounded-full">
                                {(product.type || 'digital').replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* SKU Field (only in edit mode) */}
            {isEditing && (
                <div className="border border-gray-200 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-slate-900 mb-2">SKU</label>
                    <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => updateField('sku', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Product SKU (optional)"
                    />
                </div>
            )}

            {/* Description */}
            <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                {isEditing ? (
                    <textarea
                        value={formData.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Product description..."
                    />
                ) : (
                    <p className="text-gray-700">{product.description || 'No description'}</p>
                )}
            </div>

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">Basic Info</h4>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-gray-600 mb-1">Category</p>
                            {isEditing ? (
                                <select
                                    value={formData.category}
                                    onChange={(e) => updateField('category', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="product">Product</option>
                                    <option value="service">Service</option>
                                    <option value="bundle">Bundle</option>
                                </select>
                            ) : (
                                <p className="font-semibold">{product.category}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 mb-1">Taxable</p>
                            {isEditing ? (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isTaxable}
                                        onChange={(e) => updateField('isTaxable', e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="font-semibold">{formData.isTaxable ? 'Yes' : 'No'}</span>
                                </label>
                            ) : (
                                <p className="font-semibold">{product.isTaxable ? 'Yes' : 'No'}</p>
                            )}
                        </div>
                        {isEditing && formData.isTaxable && (
                            <div>
                                <p className="text-xs text-gray-600 mb-1">Tax Code</p>
                                <input
                                    type="text"
                                    value={formData.taxCode}
                                    onChange={(e) => updateField('taxCode', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., txcd_99999999"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">Financial</h4>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-gray-600 mb-1">Base Price</p>
                            {isEditing ? (
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.basePrice}
                                        onChange={(e) => updateField('basePrice', parseFloat(e.target.value) || 0)}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            ) : (
                                <p className="font-semibold text-lg">{formatCurrency(product.basePrice || 0)}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 mb-1">Cost</p>
                            {isEditing ? (
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.category === 'service' ? formData.costOfService : formData.costOfGoods}
                                        onChange={(e) => updateField(
                                            formData.category === 'service' ? 'costOfService' : 'costOfGoods',
                                            parseFloat(e.target.value) || 0
                                        )}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            ) : (
                                <p className="font-semibold">{formatCurrency(product.costOfGoods || product.costOfService || 0)}</p>
                            )}
                        </div>
                        {(isEditing ? formData.basePrice : product.basePrice) && (isEditing ? (formData.costOfGoods || formData.costOfService) : (product.costOfGoods || product.costOfService)) && (
                            <div>
                                <p className="text-xs text-gray-600">Margin</p>
                                <p className="font-semibold text-green-600">
                                    {(() => {
                                        const price = isEditing ? formData.basePrice : (product.basePrice || 0);
                                        const cost = isEditing 
                                            ? (formData.category === 'service' ? formData.costOfService : formData.costOfGoods)
                                            : (product.costOfGoods || product.costOfService || 0);
                                        return price > 0 ? ((price - cost) / price * 100).toFixed(1) : '0';
                                    })()}%
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Image URL */}
            <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 mb-2">Image</h4>
                {isEditing ? (
                    <div className="space-y-2">
                        <input
                            type="url"
                            value={formData.imageUrl}
                            onChange={(e) => updateField('imageUrl', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="https://example.com/image.jpg"
                        />
                        {formData.imageUrl && (
                            <img 
                                src={formData.imageUrl} 
                                alt="Preview"
                                className="max-w-xs h-auto rounded-lg border border-gray-200"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        )}
                    </div>
                ) : product.imageUrl ? (
                    <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="max-w-full h-auto rounded-lg border border-gray-200"
                    />
                ) : (
                    <p className="text-gray-500">No image</p>
                )}
            </div>

            {/* Tags */}
            <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 mb-2">Tags</h4>
                {isEditing ? (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Add a tag..."
                            />
                            <button
                                type="button"
                                onClick={addTag}
                                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.tags.map((tag, idx) => (
                                <span key={idx} className="px-3 py-1 bg-gray-100 text-slate-700 text-xs font-medium rounded-full flex items-center gap-1">
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        className="text-red-500 hover:text-red-700 font-bold"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                ) : product.tags && product.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {product.tags.map((tag, idx) => (
                            <span key={idx} className="px-3 py-1 bg-gray-100 text-slate-700 text-xs font-medium rounded-full">
                                {tag}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No tags</p>
                )}
            </div>
        </div>
    );

    const renderPricingTab = () => (
        <div className="space-y-4">
            {/* Pricing Model */}
            <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 text-lg mb-3">Pricing Model</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Model Type</p>
                        {isEditing ? (
                            <select
                                value={formData.pricingModel}
                                onChange={(e) => updateField('pricingModel', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="flat_rate">Flat Rate</option>
                                <option value="hourly">Hourly</option>
                                <option value="per_unit">Per Unit</option>
                                <option value="tiered">Tiered</option>
                                <option value="subscription">Subscription</option>
                                <option value="usage_based">Usage Based</option>
                            </select>
                        ) : (
                            <p className="font-semibold text-lg">{(product.pricingModel || 'flat_rate').replace('_', ' ').toUpperCase()}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Base Price</p>
                        {isEditing ? (
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.basePrice}
                                    onChange={(e) => updateField('basePrice', parseFloat(e.target.value) || 0)}
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        ) : (
                            <p className="font-bold text-xl text-green-600">{formatCurrency(product.basePrice || 0)}</p>
                        )}
                    </div>
                </div>
                
                {/* Billing Period for Subscriptions */}
                {(isEditing ? formData.pricingModel === 'subscription' : product.pricingModel === 'subscription') && (
                    <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-1">Billing Period</p>
                        {isEditing ? (
                            <select
                                value={formData.billingPeriod || ''}
                                onChange={(e) => updateField('billingPeriod', e.target.value || null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select billing period</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annual">Annual</option>
                            </select>
                        ) : (
                            <p className="font-semibold">{product.billingPeriod ? product.billingPeriod.charAt(0).toUpperCase() + product.billingPeriod.slice(1) : 'Not set'}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Cost Details */}
            <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 text-lg mb-3">Cost Structure</h4>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Cost Price</p>
                        {isEditing ? (
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.category === 'service' ? formData.costOfService : formData.costOfGoods}
                                    onChange={(e) => updateField(
                                        formData.category === 'service' ? 'costOfService' : 'costOfGoods',
                                        parseFloat(e.target.value) || 0
                                    )}
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        ) : (
                            <p className="font-semibold">{formatCurrency(product.costOfGoods || product.costOfService || 0)}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Gross Profit</p>
                        <p className="font-semibold text-green-600">
                            {formatCurrency(
                                (isEditing ? formData.basePrice : (product.basePrice || 0)) - 
                                (isEditing 
                                    ? (formData.category === 'service' ? formData.costOfService : formData.costOfGoods)
                                    : (product.costOfGoods || product.costOfService || 0))
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Margin</p>
                        <p className="font-semibold text-green-600">
                            {(() => {
                                const price = isEditing ? formData.basePrice : (product.basePrice || 0);
                                const cost = isEditing 
                                    ? (formData.category === 'service' ? formData.costOfService : formData.costOfGoods)
                                    : (product.costOfGoods || product.costOfService || 0);
                                return price > 0 ? ((price - cost) / price * 100).toFixed(1) : '0';
                            })()}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Tiered Pricing */}
            {product.tieredPricing && product.tieredPricing.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-900 text-lg mb-3">Tiered Pricing</h4>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
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
                <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-900 text-lg mb-3">Usage-Based Pricing</h4>
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
                <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-900 text-lg mb-3">Subscription Details</h4>
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

    const handleAdjustInventory = async () => {
        if (adjustQuantity === 0 || !onAdjustInventory) return;
        setIsAdjusting(true);
        try {
            const result = await onAdjustInventory(adjustQuantity, adjustReason);
            if (result.success) {
                showSuccess(result.message);
                setAdjustQuantity(0);
                setAdjustReason('');
            } else {
                showError(result.message);
            }
        } catch (err: any) {
            showError(err.message || 'Failed to adjust inventory');
        } finally {
            setIsAdjusting(false);
        }
    };

    const handleReserveInventory = async () => {
        if (reserveQuantity <= 0 || !onReserveInventory) return;
        setIsAdjusting(true);
        try {
            const result = await onReserveInventory(reserveQuantity);
            if (result.success) {
                showSuccess(result.message);
                setReserveQuantity(0);
            } else {
                showError(result.message);
            }
        } catch (err: any) {
            showError(err.message || 'Failed to reserve inventory');
        } finally {
            setIsAdjusting(false);
        }
    };

    const handleReleaseInventory = async () => {
        if (releaseQuantity <= 0 || !onReleaseInventory) return;
        setIsAdjusting(true);
        try {
            const result = await onReleaseInventory(releaseQuantity);
            if (result.success) {
                showSuccess(result.message);
                setReleaseQuantity(0);
            } else {
                showError(result.message);
            }
        } catch (err: any) {
            showError(err.message || 'Failed to release inventory');
        } finally {
            setIsAdjusting(false);
        }
    };

    const renderInventoryTab = () => (
        <div className="space-y-4">
            {/* Inventory Tracking Toggle (Edit Mode) */}
            {isEditing && formData.category !== 'service' && (
                <div className="border border-gray-200 rounded-xl p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.inventoryTracked}
                            onChange={(e) => updateField('inventoryTracked', e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <span className="font-semibold text-slate-900">Track Inventory</span>
                            <p className="text-sm text-gray-600">Enable stock tracking for this product</p>
                        </div>
                    </label>
                </div>
            )}
            
            {/* Capacity Tracking Toggle for Services (Edit Mode) */}
            {isEditing && formData.category === 'service' && (
                <div className="border border-gray-200 rounded-xl p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.capacityTracked}
                            onChange={(e) => updateField('capacityTracked', e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <span className="font-semibold text-slate-900">Track Capacity</span>
                            <p className="text-sm text-gray-600">Enable capacity tracking for this service</p>
                        </div>
                    </label>
                </div>
            )}

            {(isEditing ? formData.inventoryTracked : product.inventoryTracked) ? (
                <>
                    {/* Stock Levels */}
                    <div className="border border-gray-200 rounded-xl p-4">
                        <h4 className="font-semibold text-slate-900 text-lg mb-3">Stock Levels</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">On Hand</p>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.quantityOnHand}
                                        onChange={(e) => updateField('quantityOnHand', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-xl focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="font-bold text-2xl">{product.quantityOnHand || 0}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Reserved</p>
                                <p className="font-bold text-2xl text-orange-600">{product.quantityReserved || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Available</p>
                                <p className="font-bold text-2xl text-green-600">
                                    {isEditing 
                                        ? (formData.quantityOnHand - (product.quantityReserved || 0))
                                        : (product.quantityAvailable || 0)
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Inventory Management Controls (only when not editing) */}
                    {!isEditing && (onAdjustInventory || onReserveInventory || onReleaseInventory) && (
                        <div className="border border-gray-200 rounded-xl p-4">
                            <h4 className="font-semibold text-slate-900 text-lg mb-3">Inventory Management</h4>
                            
                            {/* Adjust Stock */}
                            {onAdjustInventory && (
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Adjust Stock (add or remove)</p>
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                value={adjustQuantity}
                                                onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                placeholder="e.g. +50 or -10"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={adjustReason}
                                                onChange={(e) => setAdjustReason(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                placeholder="Reason (optional)"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAdjustInventory}
                                            disabled={adjustQuantity === 0 || isAdjusting}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isAdjusting ? '...' : 'Adjust'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Reserve / Release */}
                            <div className="grid grid-cols-2 gap-4">
                                {onReserveInventory && (
                                    <div className="p-3 bg-orange-50 rounded-lg">
                                        <p className="text-sm font-medium text-orange-700 mb-2">Reserve for Order</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={reserveQuantity}
                                                onChange={(e) => setReserveQuantity(parseInt(e.target.value) || 0)}
                                                className="flex-1 px-3 py-2 border border-orange-200 rounded-lg text-sm"
                                                placeholder="Qty"
                                            />
                                            <button
                                                onClick={handleReserveInventory}
                                                disabled={reserveQuantity <= 0 || isAdjusting}
                                                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Reserve
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {onReleaseInventory && (product.quantityReserved || 0) > 0 && (
                                    <div className="p-3 bg-green-50 rounded-lg">
                                        <p className="text-sm font-medium text-green-700 mb-2">Release Reserved</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max={product.quantityReserved || 0}
                                                value={releaseQuantity}
                                                onChange={(e) => setReleaseQuantity(parseInt(e.target.value) || 0)}
                                                className="flex-1 px-3 py-2 border border-green-200 rounded-lg text-sm"
                                                placeholder="Qty"
                                            />
                                            <button
                                                onClick={handleReleaseInventory}
                                                disabled={releaseQuantity <= 0 || isAdjusting}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Release
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Thresholds */}
                    <div className="border border-gray-200 rounded-xl p-4">
                        <h4 className="font-semibold text-slate-900 text-lg mb-3">Inventory Thresholds</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Reorder Point</p>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.reorderPoint}
                                        onChange={(e) => updateField('reorderPoint', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Low stock alert level"
                                    />
                                ) : (
                                    <p className="font-semibold">{product.reorderPoint || 'Not Set'}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Reorder Quantity</p>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.reorderQuantity}
                                        onChange={(e) => updateField('reorderQuantity', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Suggested reorder amount"
                                    />
                                ) : (
                                    <p className="font-semibold">{product.reorderQuantity || 'Not Set'}</p>
                                )}
                            </div>
                        </div>
                        {!isEditing && (product.quantityOnHand || 0) <= (product.reorderPoint || 0) && (product.reorderPoint || 0) > 0 && (
                            <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <p className="font-semibold text-red-700">⚠️ Stock Below Reorder Point</p>
                                <p className="text-sm text-red-600">Consider reordering soon</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (isEditing ? formData.capacityTracked : product.capacityTracked) ? (
                <>
                    {/* Service Capacity */}
                    <div className="border border-gray-200 rounded-xl p-4">
                        <h4 className="font-semibold text-slate-900 text-lg mb-3">Service Capacity</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Total Capacity</p>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.capacityTotal}
                                        onChange={(e) => updateField('capacityTotal', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="font-bold text-2xl">{product.capacityTotal || 0}</p>
                                )}
                                {isEditing ? (
                                    <select
                                        value={formData.capacityUnit}
                                        onChange={(e) => updateField('capacityUnit', e.target.value)}
                                        className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                    >
                                        <option value="hours">hours</option>
                                        <option value="sessions">sessions</option>
                                        <option value="slots">slots</option>
                                        <option value="units">units</option>
                                    </select>
                                ) : (
                                    <p className="text-xs text-gray-500">{product.capacityUnit || 'units'}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Booked</p>
                                <p className="font-bold text-2xl text-orange-600">{product.capacityBooked || 0}</p>
                                <p className="text-xs text-gray-500">{isEditing ? formData.capacityUnit : (product.capacityUnit || 'units')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Available</p>
                                <p className="font-bold text-2xl text-green-600">
                                    {isEditing 
                                        ? (formData.capacityTotal - (product.capacityBooked || 0))
                                        : (product.capacityAvailable || 0)
                                    }
                                </p>
                                <p className="text-xs text-gray-500">{isEditing ? formData.capacityUnit : (product.capacityUnit || 'units')}</p>
                            </div>
                        </div>

                        {/* Capacity Bar */}
                        <div className="mt-4">
                            <div className="w-full h-6 bg-gray-200 rounded-full relative overflow-hidden">
                                <div 
                                    className="h-full bg-green-500 transition-all rounded-full"
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
                <div className="border border-gray-200 rounded-xl p-8 text-center">
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
                    <div className="border border-green-200 rounded-xl p-4 bg-green-50">
                        <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                        <p className="font-bold text-2xl text-green-600">{formatCurrency(product.totalRevenue || 0)}</p>
                    </div>
                    <div className="border border-blue-200 rounded-xl p-4 bg-blue-50">
                        <p className="text-sm text-gray-600 mb-1">Units Sold</p>
                        <p className="font-bold text-2xl text-blue-600">{product.totalUnitsSold || 0}</p>
                    </div>
                    <div className="border border-purple-200 rounded-xl p-4 bg-purple-50">
                        <p className="text-sm text-gray-600 mb-1">Avg Revenue/Unit</p>
                        <p className="font-bold text-2xl text-purple-600">{formatCurrency(avgRevenuePerUnit)}</p>
                    </div>
                </div>

                {/* Profitability */}
                <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-900 text-lg mb-3">Profitability Analysis</h4>
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
                <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-900 text-lg mb-3">Performance Metrics</h4>
                    <div className="space-y-3">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm">Revenue Performance</span>
                                <span className="text-sm font-semibold">
                                    {product.totalRevenue > 0 ? 'Active' : 'No Sales'}
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-200 rounded-full">
                                <div 
                                    className="h-full bg-green-500 rounded-full"
                                    style={{ width: `${Math.min((product.totalRevenue || 0) / 10000 * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm">Sales Volume</span>
                                <span className="text-sm font-semibold">{product.totalUnitsSold || 0} units</span>
                            </div>
                            <div className="w-full h-3 bg-gray-200 rounded-full">
                                <div 
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${Math.min((product.totalUnitsSold || 0) / 100 * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription Metrics (if applicable) */}
                {product.pricingModel === 'monthly' || product.pricingModel === 'annual' ? (
                    <div className="border border-blue-200 rounded-xl p-4 bg-blue-50">
                        <h4 className="font-semibold text-slate-900 text-lg mb-3">Recurring Revenue</h4>
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
                <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-900 text-lg mb-3">Quick Stats</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-semibold">{product.status || 'draft'}</span>
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
            <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 text-lg mb-3">Price Change History</h4>
                {priceHistory.length > 0 ? (
                    <div className="space-y-2">
                        {priceHistory.map((history) => (
                            <div key={history.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
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
            <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 text-lg mb-3">Record Information</h4>
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
            <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 text-lg mb-3">Activity Timeline</h4>
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            ✓
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold">Product Updated</p>
                            <p className="text-sm text-gray-600">{formatDate(product.updatedAt)}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{getCategoryIcon(isEditing ? formData.category : product.category)}</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold">{isEditing ? formData.name || 'Untitled' : product.name}</h2>
                                    {isEditing && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                            EDITING
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600">{(isEditing ? formData.sku : product.sku) || 'No SKU'}</p>
                            </div>
                        </div>
                        <button
                            onClick={isEditing ? handleCancelEdit : onClose}
                            className="text-3xl font-bold hover:text-red-500 transition-colors leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                    {(['overview', 'pricing', 'inventory', 'analytics', 'history'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                                activeTab === tab 
                                    ? 'bg-white border-b-2 border-slate-900 text-slate-900' 
                                    : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'
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
                <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-green-700 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={onDelete}
                                    className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-red-700 transition-all"
                                >
                                    Delete
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductServiceDetailModal;
