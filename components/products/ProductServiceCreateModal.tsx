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
    billingPeriod: 'one_time' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
    costOfGoods: number;
    costOfService: number;
    isTaxable: boolean;
    taxRate: number;
    taxCode: string;
    
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
        billingPeriod: 'one_time',
        costOfGoods: 0,
        costOfService: 0,
        isTaxable: true,
        taxRate: 0,
        taxCode: '',
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
        
        // Note: Do NOT include generated columns (quantityAvailable, capacityAvailable)
        // or analytics fields (totalRevenue, totalUnitsSold) as these are managed by the database
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
            billingPeriod: formData.billingPeriod,
            costOfGoods: formData.costOfGoods || undefined,
            costOfService: formData.costOfService || undefined,
            isTaxable: formData.isTaxable,
            taxRate: formData.taxRate || undefined,
            taxCode: formData.taxCode || undefined,
            inventoryTracked: formData.inventoryTracked,
            quantityOnHand: formData.inventoryTracked ? formData.quantityOnHand : undefined,
            // quantityAvailable is a GENERATED column - do not set
            reorderPoint: formData.inventoryTracked ? formData.reorderPoint : undefined,
            reorderQuantity: formData.inventoryTracked ? formData.reorderQuantity : undefined,
            capacityTracked: formData.capacityTracked,
            capacityUnit: formData.capacityTracked ? formData.capacityUnit : undefined,
            capacityTotal: formData.capacityTracked ? formData.capacityTotal : undefined,
            // capacityBooked and capacityAvailable are managed by the system - do not set
            capacityPeriod: formData.capacityTracked ? formData.capacityPeriod : undefined,
            tags: formData.tags,
            imageUrl: formData.imageUrl || undefined,
            tieredPricing: formData.tieredPricing.length > 0 ? formData.tieredPricing : undefined,
            usagePricing: formData.usagePricing.length > 0 ? formData.usagePricing : undefined,
            subscriptionPlans: formData.subscriptionPlans.length > 0 ? formData.subscriptionPlans : undefined,
            // totalRevenue and totalUnitsSold are analytics - do not set on creation
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
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Basic Information</h3>
            
            {/* Name */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                    placeholder="e.g., Premium Consulting Package"
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Category & Type */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Category *</label>
                    <select
                        value={formData.category}
                        onChange={(e) => updateField('category', e.target.value as ProductServiceCategory)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                    >
                        <option value="product">Product</option>
                        <option value="service">Service</option>
                        <option value="bundle">Bundle</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Type *</label>
                    <select
                        value={formData.type}
                        onChange={(e) => updateField('type', e.target.value as ProductServiceType)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
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
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">SKU *</label>
                    <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => updateField('sku', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                        placeholder="e.g., CONS-001"
                    />
                    {errors.sku && <p className="text-red-600 text-sm mt-1">{errors.sku}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                    <select
                        value={formData.status}
                        onChange={(e) => updateField('status', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                    >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all resize-none"
                    rows={3}
                    placeholder="Describe your product or service..."
                />
            </div>

            {/* Image URL */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Image URL</label>
                <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => updateField('imageUrl', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                    placeholder="https://example.com/image.jpg"
                />
            </div>

            {/* Tags */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags</label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                        placeholder="Add a tag..."
                    />
                    <button
                        type="button"
                        onClick={addTag}
                        className="px-4 py-2.5 bg-slate-900 text-white font-medium rounded-xl shadow-sm hover:bg-slate-800 hover:shadow-md transition-all"
                    >
                        Add
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 bg-gray-100 border border-gray-200 text-sm font-medium text-slate-700 rounded-full flex items-center gap-2">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="text-slate-500 hover:text-red-500">×</button>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Pricing</h3>
            
            {/* Pricing Model */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Pricing Model *</label>
                <select
                    value={formData.pricingModel}
                    onChange={(e) => updateField('pricingModel', e.target.value as PricingModel)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
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
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Price *</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.basePrice}
                        onChange={(e) => updateField('basePrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                        placeholder="0.00"
                    />
                    {errors.basePrice && <p className="text-red-600 text-sm mt-1">{errors.basePrice}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
                    <select
                        value={formData.currency}
                        onChange={(e) => updateField('currency', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                    >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                    </select>
                </div>
            </div>

            {/* Billing Period */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Billing Period</label>
                <select
                    value={formData.billingPeriod}
                    onChange={(e) => updateField('billingPeriod', e.target.value as FormData['billingPeriod'])}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                >
                    <option value="one_time">One-time</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="custom">Custom</option>
                </select>
            </div>

            {/* Cost Structure */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Cost of Goods</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costOfGoods}
                        onChange={(e) => updateField('costOfGoods', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                        placeholder="0.00"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Cost of Service</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costOfService}
                        onChange={(e) => updateField('costOfService', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                        placeholder="0.00"
                    />
                </div>
            </div>

            {/* Profit Margin Display */}
            {formData.basePrice > 0 && (formData.costOfGoods > 0 || formData.costOfService > 0) && (
                <div className="p-4 border border-green-200 bg-green-50 rounded-xl">
                    <p className="text-sm font-medium text-green-700">
                        Profit Margin: {(((formData.basePrice - (formData.costOfGoods || formData.costOfService)) / formData.basePrice) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-green-600">
                        Profit per unit: ${(formData.basePrice - (formData.costOfGoods || formData.costOfService)).toFixed(2)}
                    </p>
                </div>
            )}

            {/* Tax */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="isTaxable"
                        checked={formData.isTaxable}
                        onChange={(e) => updateField('isTaxable', e.target.checked)}
                        className="w-5 h-5 border border-gray-300 rounded accent-slate-900"
                    />
                    <label htmlFor="isTaxable" className="font-medium text-slate-700">Taxable</label>
                </div>
                {formData.isTaxable && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tax Rate (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={formData.taxRate}
                                onChange={(e) => updateField('taxRate', parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tax Code</label>
                            <input
                                type="text"
                                value={formData.taxCode}
                                onChange={(e) => updateField('taxCode', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                placeholder="e.g., EXEMPT, STANDARD"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Inventory & Capacity</h3>
            
            {/* Inventory Tracking */}
            <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <input
                        type="checkbox"
                        id="inventoryTracked"
                        checked={formData.inventoryTracked}
                        onChange={(e) => updateField('inventoryTracked', e.target.checked)}
                        className="w-5 h-5 border border-gray-300 rounded accent-slate-900"
                    />
                    <label htmlFor="inventoryTracked" className="font-medium text-slate-700">Track Inventory</label>
                </div>

                {formData.inventoryTracked && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity On Hand</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.quantityOnHand}
                                onChange={(e) => updateField('quantityOnHand', parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reorder Point</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.reorderPoint}
                                    onChange={(e) => updateField('reorderPoint', parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reorder Quantity</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.reorderQuantity}
                                    onChange={(e) => updateField('reorderQuantity', parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Capacity Tracking */}
            <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <input
                        type="checkbox"
                        id="capacityTracked"
                        checked={formData.capacityTracked}
                        onChange={(e) => updateField('capacityTracked', e.target.checked)}
                        className="w-5 h-5 border border-gray-300 rounded accent-slate-900"
                    />
                    <label htmlFor="capacityTracked" className="font-medium text-slate-700">Track Capacity (for Services)</label>
                </div>

                {formData.capacityTracked && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Capacity</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.capacityTotal}
                                    onChange={(e) => updateField('capacityTotal', parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit</label>
                                <select
                                    value={formData.capacityUnit}
                                    onChange={(e) => updateField('capacityUnit', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                >
                                    <option value="hours">Hours</option>
                                    <option value="days">Days</option>
                                    <option value="projects">Projects</option>
                                    <option value="seats">Seats</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Capacity Period</label>
                            <select
                                value={formData.capacityPeriod}
                                onChange={(e) => updateField('capacityPeriod', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
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
                <div className="text-center py-6 text-slate-600 border border-dashed border-gray-300 bg-gray-50 rounded-xl">
                    <p>No tracking enabled. You can skip this step.</p>
                </div>
            )}
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Advanced Options (Optional)</h3>
            
            <div className="text-center py-12 text-slate-600 border border-dashed border-gray-300 bg-gray-50 rounded-xl">
                <p className="mb-2">🎯 Advanced pricing options</p>
                <p className="text-sm">Tiered pricing, usage-based pricing, and subscription plans can be configured after creation.</p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-slate-900 to-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-white">Create Product/Service</h2>
                            <p className="text-sm text-slate-300">Step {step} of 4</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pt-4">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map((s) => (
                            <div
                                key={s}
                                className={`flex-1 h-1.5 rounded-full ${
                                    s <= step ? 'bg-slate-900' : 'bg-gray-200'
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
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white text-slate-700 font-medium border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 hover:shadow-md transition-all"
                        >
                            Cancel
                        </button>
                        
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="px-6 py-2.5 bg-gray-100 text-slate-700 font-medium border border-gray-200 rounded-xl shadow-sm hover:bg-gray-200 hover:shadow-md transition-all"
                            >
                                Back
                            </button>
                        )}
                        
                        <div className="flex-1" />
                        
                        {step < 4 ? (
                            <button
                                onClick={handleNext}
                                className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl shadow-sm hover:bg-slate-800 hover:shadow-md transition-all"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl shadow-sm hover:bg-slate-800 hover:shadow-md transition-all"
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
