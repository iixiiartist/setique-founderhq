// Step Components for Business Profile Setup
// Each step is extracted into its own component for better maintainability

import React from 'react';
import { BusinessProfile } from '../../../types';
import {
    INDUSTRIES,
    COMPANY_SIZES,
    BUSINESS_MODELS,
    PRIMARY_GOALS,
    GROWTH_STAGES,
    MONETIZATION_MODELS,
    BILLING_CYCLES,
    DEFAULT_BILLING_CYCLE
} from '../constants';

// Common field input component
interface FieldInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    error?: string;
    type?: 'text' | 'number';
    min?: number;
}

export function FieldInput({ label, value, onChange, placeholder, required, error, type = 'text', min }: FieldInputProps) {
    return (
        <div>
            <label className="block text-sm font-bold font-mono mb-2">
                {label} {required && '*'}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full px-4 py-3 border-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    error ? 'border-red-600' : 'border-black'
                }`}
                placeholder={placeholder}
                min={min}
            />
            {error && (
                <div className="mt-1 text-sm text-red-600 font-mono flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}

// Common textarea component
interface FieldTextareaProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
}

export function FieldTextarea({ label, value, onChange, placeholder, rows = 3 }: FieldTextareaProps) {
    return (
        <div>
            <label className="block text-sm font-bold font-mono mb-2">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                rows={rows}
                placeholder={placeholder}
            />
        </div>
    );
}

// Option button group
interface OptionButtonProps<T extends string> {
    label: string;
    options: { value: T; label: string; description?: string }[];
    value: T | undefined;
    onChange: (value: T) => void;
    grid?: boolean;
}

export function OptionButtons<T extends string>({ label, options, value, onChange, grid }: OptionButtonProps<T>) {
    return (
        <div>
            <label className="block text-sm font-bold font-mono mb-2">{label}</label>
            <div className={grid ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`${grid ? '' : 'w-full text-left'} px-4 py-3 border-2 border-black font-mono transition-colors ${
                            value === opt.value
                                ? 'bg-blue-600 text-white shadow-neo'
                                : 'bg-white hover:bg-gray-100'
                        } ${grid ? 'font-bold' : ''}`}
                    >
                        <div className="font-bold">{opt.label}</div>
                        {opt.description && (
                            <div className={`text-sm ${value === opt.value ? 'text-blue-100' : 'text-gray-600'}`}>
                                {opt.description}
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

// Step 1: Welcome & Basic Info
interface Step1Props {
    formData: Partial<BusinessProfile>;
    updateField: <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K] | undefined) => void;
    validationErrors: Record<string, string>;
    clearError: (field: string) => void;
}

export function Step1CompanyBasics({ formData, updateField, validationErrors, clearError }: Step1Props) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Welcome! Let's set up your business profile</h2>
                <p className="text-gray-600 font-mono">This helps the AI assistant understand your business and provide better recommendations.</p>
            </div>

            <FieldInput
                label="Company Name"
                value={formData.companyName || ''}
                onChange={(v) => {
                    updateField('companyName', v);
                    if (validationErrors.companyName) clearError('companyName');
                }}
                placeholder="Acme Inc."
                required
                error={validationErrors.companyName}
            />

            <div>
                <label className="block text-sm font-bold font-mono mb-2">Industry</label>
                <select
                    value={formData.industry || ''}
                    onChange={(e) => updateField('industry', e.target.value || undefined)}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                    <option value="">Select an industry...</option>
                    {INDUSTRIES.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                    ))}
                </select>
            </div>

            <OptionButtons
                label="Company Size"
                options={COMPANY_SIZES}
                value={formData.companySize}
                onChange={(v) => updateField('companySize', v)}
                grid
            />
        </div>
    );
}

// Step 2: Business Model & Strategy
interface Step2Props {
    formData: Partial<BusinessProfile>;
    updateField: <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K] | undefined) => void;
}

export function Step2BusinessModel({ formData, updateField }: Step2Props) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Business Model & Strategy</h2>
                <p className="text-gray-600 font-mono">Tell us about your business approach.</p>
            </div>

            <OptionButtons
                label="Business Model"
                options={BUSINESS_MODELS}
                value={formData.businessModel}
                onChange={(v) => updateField('businessModel', v)}
            />

            <FieldTextarea
                label="Business Description"
                value={formData.description || ''}
                onChange={(v) => updateField('description', v || undefined)}
                placeholder="What does your business do?"
            />

            <FieldInput
                label="Target Market"
                value={formData.targetMarket || ''}
                onChange={(v) => updateField('targetMarket', v || undefined)}
                placeholder="Who are your customers?"
            />

            <FieldInput
                label="Value Proposition"
                value={formData.valueProposition || ''}
                onChange={(v) => updateField('valueProposition', v || undefined)}
                placeholder="What makes you unique?"
            />
        </div>
    );
}

// Step 3: Goals & Growth Stage
interface Step3Props {
    formData: Partial<BusinessProfile>;
    updateField: <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K] | undefined) => void;
}

export function Step3GoalsGrowth({ formData, updateField }: Step3Props) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Goals & Growth Stage</h2>
                <p className="text-gray-600 font-mono">What are you working towards?</p>
            </div>

            <OptionButtons
                label="Growth Stage"
                options={GROWTH_STAGES}
                value={formData.growthStage}
                onChange={(v) => updateField('growthStage', v)}
            />

            <OptionButtons
                label="Primary Goal"
                options={PRIMARY_GOALS}
                value={formData.primaryGoal}
                onChange={(v) => updateField('primaryGoal', v)}
                grid
            />

            <FieldTextarea
                label="Key Challenges"
                value={formData.keyChallenges || ''}
                onChange={(v) => updateField('keyChallenges', v || undefined)}
                placeholder="What are your biggest challenges right now?"
            />
        </div>
    );
}

// Step 4: Metrics & Performance
interface Step4Props {
    formData: Partial<BusinessProfile>;
    updateField: <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K] | undefined) => void;
}

export function Step4Metrics({ formData, updateField }: Step4Props) {
    const handleNumberChange = (key: keyof BusinessProfile, value: string) => {
        updateField(key, value ? Number(value) : undefined);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Metrics & Performance (Optional)</h2>
                <p className="text-gray-600 font-mono">Help us understand your business scale.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FieldInput
                    label="Current MRR ($)"
                    type="number"
                    value={formData.currentMrr?.toString() || ''}
                    onChange={(v) => handleNumberChange('currentMrr', v)}
                    placeholder="0"
                    min={0}
                />
                <FieldInput
                    label="Target MRR ($)"
                    type="number"
                    value={formData.targetMrr?.toString() || ''}
                    onChange={(v) => handleNumberChange('targetMrr', v)}
                    placeholder="0"
                    min={0}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FieldInput
                    label="Customer Count"
                    type="number"
                    value={formData.customerCount?.toString() || ''}
                    onChange={(v) => handleNumberChange('customerCount', v)}
                    placeholder="0"
                    min={0}
                />
                <FieldInput
                    label="Team Size"
                    type="number"
                    value={formData.teamSize?.toString() || ''}
                    onChange={(v) => handleNumberChange('teamSize', v)}
                    placeholder="1"
                    min={1}
                />
            </div>

            <div className="bg-blue-100 border-2 border-black p-4">
                <p className="text-sm font-mono">
                    <span className="font-bold">💡 Pro tip:</span> This information helps the AI assistant provide better insights tailored to your business stage and goals.
                </p>
            </div>
        </div>
    );
}

// Step 5: Market Positioning
interface Step5Props {
    formData: Partial<BusinessProfile>;
    updateField: <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K] | undefined) => void;
}

export function Step5MarketPositioning({ formData, updateField }: Step5Props) {
    const handleArrayChange = (key: keyof BusinessProfile, value: string) => {
        const arr = value.split(',').map(s => s.trim()).filter(Boolean);
        updateField(key, arr.length ? arr as any : undefined);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Market Positioning (Optional)</h2>
                <p className="text-gray-600 font-mono">Define your target market and competitive advantages.</p>
            </div>

            <FieldTextarea
                label="Target Customer Profile"
                value={formData.targetCustomerProfile || ''}
                onChange={(v) => updateField('targetCustomerProfile', v)}
                placeholder="Describe your ideal customer (demographics, pain points, behaviors...)"
                rows={4}
            />

            <FieldTextarea
                label="Market Positioning"
                value={formData.marketPositioning || ''}
                onChange={(v) => updateField('marketPositioning', v)}
                placeholder="How do you position yourself in the market?"
                rows={3}
            />

            <FieldInput
                label="Competitive Advantages (comma-separated)"
                value={formData.competitiveAdvantages?.join(', ') || ''}
                onChange={(v) => handleArrayChange('competitiveAdvantages', v)}
                placeholder="Better pricing, faster delivery, superior quality..."
            />

            <FieldInput
                label="Key Differentiators (comma-separated)"
                value={formData.keyDifferentiators?.join(', ') || ''}
                onChange={(v) => handleArrayChange('keyDifferentiators', v)}
                placeholder="Unique features, proprietary tech, exclusive partnerships..."
            />

            <FieldInput
                label="Competitors (comma-separated)"
                value={formData.competitors?.join(', ') || ''}
                onChange={(v) => handleArrayChange('competitors', v)}
                placeholder="Competitor A, Competitor B, Competitor C"
            />

            <FieldTextarea
                label="Unique Differentiators Summary"
                value={formData.uniqueDifferentiators || ''}
                onChange={(v) => updateField('uniqueDifferentiators', v || undefined)}
                placeholder="Use narrative form to highlight why customers choose you."
                rows={4}
            />
        </div>
    );
}
