// Step 6 & 7: Monetization, Pricing, Products & Tech Stack
// Extracted for better maintainability

import React from 'react';
import { BusinessProfile } from '../../../types';
import {
    MONETIZATION_MODELS,
    BILLING_CYCLES,
    DEFAULT_BILLING_CYCLE
} from '../constants';
import { FieldInput, FieldTextarea } from './StepComponents';

type PricingTier = NonNullable<BusinessProfile['pricingTiers']>[number];
type CoreProduct = NonNullable<BusinessProfile['coreProducts']>[number];
type ServiceOffering = NonNullable<BusinessProfile['serviceOfferings']>[number];

// Pricing Tier Item
interface PricingTierItemProps {
    tier: PricingTier;
    index: number;
    onUpdate: <K extends keyof PricingTier>(index: number, field: K, value: PricingTier[K]) => void;
    onRemove: (index: number) => void;
}

export function PricingTierItem({ tier, index, onUpdate, onRemove }: PricingTierItemProps) {
    return (
        <div className="border-2 border-black p-3 space-y-2">
            <div className="flex justify-between items-center">
                <h4 className="font-bold font-mono">Tier {index + 1}</h4>
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-sm text-red-600 font-mono"
                >
                    Remove
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                    type="text"
                    value={tier.name || ''}
                    onChange={(e) => onUpdate(index, 'name', e.target.value)}
                    placeholder="Tier name (e.g., Pro, Enterprise)"
                    className="w-full px-3 py-2 border-2 border-black font-mono"
                />
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={tier.price ?? ''}
                        onChange={(e) => {
                            const raw = e.target.value;
                            const nextValue = raw === '' ? undefined : Number(raw);
                            onUpdate(index, 'price', nextValue as PricingTier['price']);
                        }}
                        placeholder="Price"
                        className="w-full px-3 py-2 border-2 border-black font-mono"
                        min="0"
                    />
                    <select
                        value={tier.billingCycle || DEFAULT_BILLING_CYCLE}
                        onChange={(e) => onUpdate(index, 'billingCycle', e.target.value)}
                        className="px-3 py-2 border-2 border-black font-mono bg-white"
                    >
                        {BILLING_CYCLES.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            <input
                type="text"
                value={tier.features?.join(', ') || ''}
                onChange={(e) => onUpdate(index, 'features', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Key features (comma-separated)"
                className="w-full px-3 py-2 border-2 border-black font-mono"
            />
        </div>
    );
}

// Step 6: Monetization & Pricing
interface Step6Props {
    formData: Partial<BusinessProfile>;
    updateField: <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K] | undefined) => void;
    onAddTier: () => void;
    onUpdateTier: <K extends keyof PricingTier>(index: number, field: K, value: PricingTier[K]) => void;
    onRemoveTier: (index: number) => void;
}

export function Step6Monetization({ formData, updateField, onAddTier, onUpdateTier, onRemoveTier }: Step6Props) {
    const handleNumberChange = (key: keyof BusinessProfile, value: string) => {
        updateField(key, value ? Number(value) : undefined);
    };

    const handleArrayChange = (key: keyof BusinessProfile, value: string) => {
        const arr = value.split(',').map(s => s.trim()).filter(Boolean);
        updateField(key, arr.length ? arr as any : undefined);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Monetization & Pricing (Optional)</h2>
                <p className="text-gray-600 font-mono">How do you make money?</p>
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">Monetization Model</label>
                <select
                    value={formData.monetizationModel || ''}
                    onChange={(e) => updateField('monetizationModel', e.target.value as any || undefined)}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                    <option value="">Select a model...</option>
                    {MONETIZATION_MODELS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FieldInput
                    label="Average Deal Size ($)"
                    type="number"
                    value={formData.averageDealSize?.toString() || ''}
                    onChange={(v) => handleNumberChange('averageDealSize', v)}
                    placeholder="0"
                    min={0}
                />
                <FieldInput
                    label="Sales Cycle (days)"
                    type="number"
                    value={formData.salesCycleDays?.toString() || ''}
                    onChange={(v) => handleNumberChange('salesCycleDays', v)}
                    placeholder="30"
                    min={0}
                />
            </div>

            <FieldInput
                label="Deal Types (comma-separated)"
                value={formData.dealTypes?.join(', ') || ''}
                onChange={(v) => handleArrayChange('dealTypes', v)}
                placeholder="new_business, expansion, renewal"
            />

            {/* Pricing Tiers */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold font-mono">Pricing Tiers</label>
                    <button
                        type="button"
                        onClick={onAddTier}
                        className="text-sm font-mono border-2 border-black px-3 py-1 bg-white hover:bg-gray-100"
                    >
                        + Add Tier
                    </button>
                </div>
                {(!formData.pricingTiers || formData.pricingTiers.length === 0) && (
                    <p className="text-sm text-gray-500 font-mono border-2 border-dashed border-black p-3">
                        Add your pricing tiers so Copilot can recommend the right plans in summaries and follow-ups.
                    </p>
                )}
                <div className="space-y-3">
                    {(formData.pricingTiers || []).map((tier, index) => (
                        <PricingTierItem
                            key={index}
                            tier={tier}
                            index={index}
                            onUpdate={onUpdateTier}
                            onRemove={onRemoveTier}
                        />
                    ))}
                </div>
            </div>

            <div className="bg-yellow-50 border-2 border-black p-4">
                <p className="text-sm font-mono">
                    <span className="font-bold">💰 Note:</span> Pricing tiers and deal types power AI recommendations in CRM and automation emails.
                </p>
            </div>
        </div>
    );
}

// Core Product Item
interface CoreProductItemProps {
    product: CoreProduct;
    index: number;
    onUpdate: <K extends keyof CoreProduct>(index: number, field: K, value: string) => void;
    onRemove: (index: number) => void;
}

export function CoreProductItem({ product, index, onUpdate, onRemove }: CoreProductItemProps) {
    return (
        <div className="border-2 border-black p-3 space-y-2">
            <div className="flex justify-between items-center">
                <h4 className="font-bold font-mono">Product {index + 1}</h4>
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-sm text-red-600 font-mono"
                >
                    Remove
                </button>
            </div>
            <input
                type="text"
                value={product.name || ''}
                onChange={(e) => onUpdate(index, 'name', e.target.value)}
                placeholder="Product name"
                className="w-full px-3 py-2 border-2 border-black font-mono"
            />
            <textarea
                value={product.description || ''}
                onChange={(e) => onUpdate(index, 'description', e.target.value)}
                placeholder="Short description"
                className="w-full px-3 py-2 border-2 border-black font-mono h-20"
            />
            <div className="grid grid-cols-2 gap-3">
                <input
                    type="text"
                    value={product.type || ''}
                    onChange={(e) => onUpdate(index, 'type', e.target.value)}
                    placeholder="Type (e.g., SaaS, Mobile)"
                    className="w-full px-3 py-2 border-2 border-black font-mono"
                />
                <input
                    type="text"
                    value={product.status || ''}
                    onChange={(e) => onUpdate(index, 'status', e.target.value)}
                    placeholder="Status (Idea, Beta, GA...)"
                    className="w-full px-3 py-2 border-2 border-black font-mono"
                />
            </div>
        </div>
    );
}

// Service Offering Item
interface ServiceOfferingItemProps {
    service: ServiceOffering;
    index: number;
    onUpdate: <K extends keyof ServiceOffering>(index: number, field: K, value: string) => void;
    onRemove: (index: number) => void;
}

export function ServiceOfferingItem({ service, index, onUpdate, onRemove }: ServiceOfferingItemProps) {
    return (
        <div className="border-2 border-black p-3 space-y-2">
            <div className="flex justify-between items-center">
                <h4 className="font-bold font-mono">Service {index + 1}</h4>
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-sm text-red-600 font-mono"
                >
                    Remove
                </button>
            </div>
            <input
                type="text"
                value={service.name || ''}
                onChange={(e) => onUpdate(index, 'name', e.target.value)}
                placeholder="Service name"
                className="w-full px-3 py-2 border-2 border-black font-mono"
            />
            <textarea
                value={service.description || ''}
                onChange={(e) => onUpdate(index, 'description', e.target.value)}
                placeholder="What does this service include?"
                className="w-full px-3 py-2 border-2 border-black font-mono h-20"
            />
            <input
                type="text"
                value={service.pricing || ''}
                onChange={(e) => onUpdate(index, 'pricing', e.target.value)}
                placeholder="Pricing notes (hourly, retainer, per project)"
                className="w-full px-3 py-2 border-2 border-black font-mono"
            />
        </div>
    );
}

// Step 7: Products & Tech Stack
interface Step7Props {
    formData: Partial<BusinessProfile>;
    updateField: <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K] | undefined) => void;
    onAddProduct: () => void;
    onUpdateProduct: <K extends keyof CoreProduct>(index: number, field: K, value: string) => void;
    onRemoveProduct: (index: number) => void;
    onAddService: () => void;
    onUpdateService: <K extends keyof ServiceOffering>(index: number, field: K, value: string) => void;
    onRemoveService: (index: number) => void;
}

export function Step7ProductsTech({
    formData,
    updateField,
    onAddProduct,
    onUpdateProduct,
    onRemoveProduct,
    onAddService,
    onUpdateService,
    onRemoveService
}: Step7Props) {
    const handleArrayChange = (key: keyof BusinessProfile, value: string) => {
        const arr = value.split(',').map(s => s.trim()).filter(Boolean);
        updateField(key, arr.length ? arr as any : undefined);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Products & Tech Stack (Optional)</h2>
                <p className="text-gray-600 font-mono">What do you build with?</p>
            </div>

            <FieldInput
                label="Tech Stack (comma-separated)"
                value={formData.techStack?.join(', ') || ''}
                onChange={(v) => handleArrayChange('techStack', v)}
                placeholder="React, Node.js, PostgreSQL, AWS..."
            />

            {/* Core Products */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold font-mono">Core Products</label>
                    <button
                        type="button"
                        onClick={onAddProduct}
                        className="text-sm font-mono border-2 border-black px-3 py-1 bg-white hover:bg-gray-100"
                    >
                        + Add Product
                    </button>
                </div>
                {(!formData.coreProducts || formData.coreProducts.length === 0) && (
                    <p className="text-sm text-gray-500 font-mono border-2 border-dashed border-black p-3">
                        List flagship products so Copilot can reference them in briefs and updates.
                    </p>
                )}
                <div className="space-y-3">
                    {(formData.coreProducts || []).map((product, index) => (
                        <CoreProductItem
                            key={index}
                            product={product}
                            index={index}
                            onUpdate={onUpdateProduct}
                            onRemove={onRemoveProduct}
                        />
                    ))}
                </div>
            </div>

            {/* Service Offerings */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold font-mono">Service Offerings</label>
                    <button
                        type="button"
                        onClick={onAddService}
                        className="text-sm font-mono border-2 border-black px-3 py-1 bg-white hover:bg-gray-100"
                    >
                        + Add Service
                    </button>
                </div>
                {(!formData.serviceOfferings || formData.serviceOfferings.length === 0) && (
                    <p className="text-sm text-gray-500 font-mono border-2 border-dashed border-black p-3">
                        Document retainers or add-on services so Copilot knows what you can deliver.
                    </p>
                )}
                <div className="space-y-3">
                    {(formData.serviceOfferings || []).map((service, index) => (
                        <ServiceOfferingItem
                            key={index}
                            service={service}
                            index={index}
                            onUpdate={onUpdateService}
                            onRemove={onRemoveService}
                        />
                    ))}
                </div>
            </div>

            <div className="bg-green-50 border-2 border-black p-4">
                <p className="text-sm font-mono">
                    <span className="font-bold">🎉 Almost done!</span> This enhanced profile will help the AI provide highly personalized insights and recommendations.
                </p>
            </div>
        </div>
    );
}
