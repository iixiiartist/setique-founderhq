import React, { useState } from 'react';
import { ProductService, ProductServiceCategory, ProductServiceType, PricingModel, TieredPrice, UsagePricing, SubscriptionPlan } from '../../types';

interface ProductServiceCreateModalProps {
    workspaceId: string;
    onClose: () => void;
    onCreate: (product: Omit<ProductService, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

type Step = 1 | 2 | 3 | 4;

interface FormData {
    // Step 1: Basic Info
    name: string;
    description: string;
    sku: string;
    category: ProductServiceCategory;
    type: ProductServiceType;
    status: 'active' | 'inactive' | 'draft';
    imageUrl: string;
    tags: string[];
    
    // Step 2: Pricing
    pricingModel: PricingModel;
    basePrice: number;
    currency: string;
    costOfGoods: number;
    costOfService: number;
    isTaxable: boolean;
    taxRate: number;
    
    // Step 3: Inventory/Capacity
    inventoryTracked: boolean;
    quantityOnHand: number;
    reorderPoint: number;
    reorderQuantity: number;
    capacityTracked: boolean;
    capacityUnit: 'hours' | 'days' | 'projects' | 'seats';
    capacityTotal: number;
    capacityPeriod: 'weekly' | 'monthly' | 'quarterly';
    
    // Step 4: Advanced (Optional)
    tieredPricing: TieredPrice[];
    usagePricing: UsagePricing[];
    subscriptionPlans: SubscriptionPlan[];
}

export function ProductServiceCreateModal({ workspaceId, onClose, onCreate }: ProductServiceCreateModalProps) {
    const [step, setStep] = useState<Step>(1);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [tagInput, setTagInput] = useState('');
    
    const [formData, setFormData] = useState<FormData>({
        name: '',
        description: '',
        sku: '',
        category: 'product',
        type: 'digital',
        status: 'draft',
        imageUrl: '',
        tags: [],
        pricingModel: 'flat_rate',
        basePrice: 0,
        currency: 'USD',
        costOfGoods: 0,
        costOfService: 0,
        isTaxable: true,
        taxRate: 0,
        inventoryTracked: false,
        quantityOnHand: 0,
        reorderPoint: 0,
        reorderQuantity: 0,
        capacityTracked: false,
        capacityUnit: 'hours',
        capacityTotal: 0,
        capacityPeriod: 'monthly',
        tieredPricing: [],
        usagePricing: [],
        subscriptionPlans: [],
    });

    const updateField = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validateStep = (stepNum: Step): boolean => {
        const newErrors: Record<string, string> = {};
        
        if (stepNum === 1) {
            if (!formData.name.trim()) newErrors.name = 'Name is required';
            if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
        }
        
        if (stepNum === 2) {
            if (formData.basePrice <= 0) newErrors.basePrice = 'Price must be greater than 0';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep((step + 1) as Step);
        }
    };

    const handleBack = () => {
        setStep((step - 1) as Step);
    };

    const handleSubmit = () => {
        if (!validateStep(step)) return;
        
        const product: Omit<ProductService, 'id' | 'createdAt' | 'updatedAt'> = {
            workspaceId,
            name: formData.name,
            description: formData.description || undefined,
            sku: formData.sku || undefined,
            category: formData.category,
            type: formData.type,
            status: formData.status,
            pricingModel: formData.pricingModel,
            basePrice: formData.basePrice,
            currency: formData.currency,
            costOfGoods: formData.costOfGoods || undefined,
            costOfService: formData.costOfService || undefined,
            isTaxable: formData.isTaxable,
            taxRate: formData.taxRate || undefined,
            inventoryTracked: formData.inventoryTracked,
            quantityOnHand: formData.inventoryTracked ? formData.quantityOnHand : undefined,
            quantityAvailable: formData.inventoryTracked ? formData.quantityOnHand : undefined,
            reorderPoint: formData.inventoryTracked ? formData.reorderPoint : undefined,
            reorderQuantity: formData.inventoryTracked ? formData.reorderQuantity : undefined,
            capacityTracked: formData.capacityTracked,
            capacityUnit: formData.capacityTracked ? formData.capacityUnit : undefined,
            capacityTotal: formData.capacityTracked ? formData.capacityTotal : undefined,
            capacityBooked: formData.capacityTracked ? 0 : undefined,
            capacityAvailable: formData.capacityTracked ? formData.capacityTotal : undefined,
            capacityPeriod: formData.capacityTracked ? formData.capacityPeriod : undefined,
            tags: formData.tags,
            imageUrl: formData.imageUrl || undefined,
            tieredPricing: formData.tieredPricing.length > 0 ? formData.tieredPricing : undefined,
            usagePricing: formData.usagePricing.length > 0 ? formData.usagePricing : undefined,
            subscriptionPlans: formData.subscriptionPlans.length > 0 ? formData.subscriptionPlans : undefined,
            totalRevenue: 0,
            totalUnitsSold: 0,
        };
        
        onCreate(product);
    };

    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            updateField('tags', [...formData.tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        updateField('tags', formData.tags.filter(t => t !== tag));
    };

    const renderStep1 = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Basic Information</h3>
            
            {/* Name */}
            <div>
                <label className="block text-sm font-bold mb-2">Name *</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Premium Consulting Package"
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Category & Type */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold mb-2">Category *</label>
                    <select
                        value={formData.category}
                        onChange={(e) => updateField('category', e.target.value as ProductServiceCategory)}
                        className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="product">Product</option>
                        <option value="service">Service</option>
                        <option value="bundle">Bundle</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2">Type *</label>
                    <select
                        value={formData.type}
                        onChange={(e) => updateField('type', e.target.value as ProductServiceType)}
                        className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="digital">Digital</option>
                        <option value="physical">Physical</option>
                        <option value="saas">SaaS</option>
                        <option value="consulting">Consulting</option>
                        <option value="package">Package</option>
                        <option value="subscription">Subscription</option>
                        <option value="booking">Booking</option>
                    </select>
                </div>
            </div>

            {/* SKU & Status */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold mb-2">SKU *</label>
                    <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => updateField('sku', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., CONS-001"
                    />
                    {errors.sku && <p className="text-red-600 text-sm mt-1">{errors.sku}</p>}
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2">Status</label>
                    <select
                        value={formData.status}
                        onChange={(e) => updateField('status', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Describe your product or service..."
                />
            </div>

            {/* Image URL */}
            <div>
                <label className="block text-sm font-bold mb-2">Image URL</label>
                <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => updateField('imageUrl', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/image.jpg"
                />
            </div>

            {/* Tags */}
            <div>
                <label className="block text-sm font-bold mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        className="flex-1 px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add a tag..."
                    />
                    <button
                        type="button"
                        onClick={addTag}
                        className="px-4 py-2 bg-blue-500 text-white font-bold border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                    >
                        Add
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 bg-gray-200 border border-black text-sm font-semibold flex items-center gap-2">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="text-red-600 hover:text-red-800">×</button>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Pricing</h3>
            
            {/* Pricing Model */}
            <div>
                <label className="block text-sm font-bold mb-2">Pricing Model *</label>
                <select
                    value={formData.pricingModel}
                    onChange={(e) => updateField('pricingModel', e.target.value as PricingModel)}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="flat_rate">Flat Rate</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="tiered">Tiered</option>
                    <option value="usage_based">Usage Based</option>
                    <option value="custom">Custom</option>
                </select>
            </div>

            {/* Base Price & Currency */}
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-bold mb-2">Base Price *</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.basePrice}
                        onChange={(e) => updateField('basePrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                    />
                    {errors.basePrice && <p className="text-red-600 text-sm mt-1">{errors.basePrice}</p>}
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2">Currency</label>
                    <select
                        value={formData.currency}
                        onChange={(e) => updateField('currency', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                    </select>
                </div>
            </div>

            {/* Cost Structure */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold mb-2">Cost of Goods</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costOfGoods}
                        onChange={(e) => updateField('costOfGoods', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2">Cost of Service</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costOfService}
                        onChange={(e) => updateField('costOfService', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                    />
                </div>
            </div>

            {/* Profit Margin Display */}
            {formData.basePrice > 0 && (formData.costOfGoods > 0 || formData.costOfService > 0) && (
                <div className="p-4 border-2 border-green-500 bg-green-50">
                    <p className="text-sm font-bold text-green-700">
                        Profit Margin: {(((formData.basePrice - (formData.costOfGoods || formData.costOfService)) / formData.basePrice) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-green-600">
                        Profit per unit: ${(formData.basePrice - (formData.costOfGoods || formData.costOfService)).toFixed(2)}
                    </p>
                </div>
            )}

            {/* Tax */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="isTaxable"
                        checked={formData.isTaxable}
                        onChange={(e) => updateField('isTaxable', e.target.checked)}
                        className="w-5 h-5 border-2 border-black"
                    />
                    <label htmlFor="isTaxable" className="font-bold">Taxable</label>
                </div>
                {formData.isTaxable && (
                    <div>
                        <label className="block text-sm font-bold mb-2">Tax Rate (%)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={formData.taxRate}
                            onChange={(e) => updateField('taxRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                        />
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Inventory & Capacity</h3>
            
            {/* Inventory Tracking */}
            <div className="border-2 border-black p-4">
                <div className="flex items-center gap-2 mb-4">
                    <input
                        type="checkbox"
                        id="inventoryTracked"
                        checked={formData.inventoryTracked}
                        onChange={(e) => updateField('inventoryTracked', e.target.checked)}
                        className="w-5 h-5 border-2 border-black"
                    />
                    <label htmlFor="inventoryTracked" className="font-bold">Track Inventory</label>
                </div>

                {formData.inventoryTracked && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-bold mb-2">Quantity On Hand</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.quantityOnHand}
                                onChange={(e) => updateField('quantityOnHand', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-2">Reorder Point</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.reorderPoint}
                                    onChange={(e) => updateField('reorderPoint', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">Reorder Quantity</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.reorderQuantity}
                                    onChange={(e) => updateField('reorderQuantity', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Capacity Tracking */}
            <div className="border-2 border-black p-4">
                <div className="flex items-center gap-2 mb-4">
                    <input
                        type="checkbox"
                        id="capacityTracked"
                        checked={formData.capacityTracked}
                        onChange={(e) => updateField('capacityTracked', e.target.checked)}
                        className="w-5 h-5 border-2 border-black"
                    />
                    <label htmlFor="capacityTracked" className="font-bold">Track Capacity (for Services)</label>
                </div>

                {formData.capacityTracked && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-2">Total Capacity</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.capacityTotal}
                                    onChange={(e) => updateField('capacityTotal', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">Unit</label>
                                <select
                                    value={formData.capacityUnit}
                                    onChange={(e) => updateField('capacityUnit', e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="hours">Hours</option>
                                    <option value="days">Days</option>
                                    <option value="projects">Projects</option>
                                    <option value="seats">Seats</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Capacity Period</label>
                            <select
                                value={formData.capacityPeriod}
                                onChange={(e) => updateField('capacityPeriod', e.target.value)}
                                className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {!formData.inventoryTracked && !formData.capacityTracked && (
                <div className="text-center py-6 text-gray-600 border-2 border-gray-300 bg-gray-50">
                    <p>No tracking enabled. You can skip this step.</p>
                </div>
            )}
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Advanced Options (Optional)</h3>
            
            <div className="text-center py-12 text-gray-600 border-2 border-gray-300 bg-gray-50">
                <p className="mb-2">🎯 Advanced pricing options</p>
                <p className="text-sm">Tiered pricing, usage-based pricing, and subscription plans can be configured after creation.</p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-black shadow-neo max-w-3xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b-4 border-black">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Create Product/Service</h2>
                            <p className="text-sm text-gray-600">Step {step} of 4</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-3xl font-bold hover:text-red-500 transition-colors leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pt-4">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map((s) => (
                            <div
                                key={s}
                                className={`flex-1 h-2 border-2 border-black ${
                                    s <= step ? 'bg-blue-500' : 'bg-gray-200'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </div>

                {/* Footer */}
                <div className="p-6 border-t-4 border-black bg-gray-50">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-gray-500 text-white font-bold border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                        >
                            Cancel
                        </button>
                        
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="px-6 py-3 bg-gray-300 text-black font-bold border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                            >
                                Back
                            </button>
                        )}
                        
                        <div className="flex-1" />
                        
                        {step < 4 ? (
                            <button
                                onClick={handleNext}
                                className="px-6 py-3 bg-blue-500 text-white font-bold border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                className="px-6 py-3 bg-green-500 text-white font-bold border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                            >
                                Create Product
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductServiceCreateModal;
