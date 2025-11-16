import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BusinessProfile, CompanySize, BusinessModel, PrimaryGoal, GrowthStage, RemotePolicy } from '../types';
import { logger } from '../lib/logger';
import { SecureStorage, StorageKeys, StorageTTL } from '../lib/utils/secureStorage';
import { useDebounce } from '../hooks/useDebounce';
import { validateStep } from '../lib/validation/businessProfileSchema';
import { useAnalytics } from '../hooks/useAnalytics';

interface BusinessProfileSetupProps {
    onComplete: (profile: Partial<BusinessProfile>) => void;
    onSkip?: () => void;
    initialData?: Partial<BusinessProfile>;
}

// Local storage key for draft data
const DRAFT_STORAGE_KEY = 'businessProfileDraft';

const INDUSTRIES = [
    'SaaS', 'E-commerce', 'Fintech', 'Healthcare', 'Education', 
    'Marketing', 'Real Estate', 'Consulting', 'Manufacturing', 'Other'
];

const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
    { value: 'Just me', label: 'Just me' },
    { value: '1-10 employees', label: '1-10 employees' },
    { value: '11-50 employees', label: '11-50 employees' },
    { value: '51-200 employees', label: '51-200 employees' },
    { value: '201-500 employees', label: '201-500 employees' },
    { value: '500+ employees', label: '500+ employees' }
];

const BUSINESS_MODELS: { value: BusinessModel; label: string; description: string }[] = [
    { value: 'B2B SaaS', label: 'B2B SaaS', description: 'Software for businesses' },
    { value: 'B2C SaaS', label: 'B2C SaaS', description: 'Software for consumers' },
    { value: 'Marketplace', label: 'Marketplace', description: 'Connecting buyers and sellers' },
    { value: 'E-commerce', label: 'E-commerce', description: 'Online retail' },
    { value: 'Consulting/Services', label: 'Consulting/Services', description: 'Professional services' },
    { value: 'Agency', label: 'Agency', description: 'Creative or marketing agency' },
    { value: 'Hardware', label: 'Hardware', description: 'Physical products' },
    { value: 'Other', label: 'Other', description: 'Different business model' }
];

const PRIMARY_GOALS: { value: PrimaryGoal; label: string }[] = [
    { value: 'Grow Revenue', label: 'Grow Revenue' },
    { value: 'Acquire First Customers', label: 'Acquire First Customers' },
    { value: 'Achieve Product-Market Fit', label: 'Achieve Product-Market Fit' },
    { value: 'Build Product', label: 'Build Product' },
    { value: 'Hire Team', label: 'Hire Team' },
    { value: 'Raise Funding', label: 'Raise Funding' },
    { value: 'Expand Market', label: 'Expand Market' }
];

const GROWTH_STAGES: { value: GrowthStage; label: string; description: string }[] = [
    { value: 'Idea Stage', label: 'Idea Stage', description: 'Still validating the concept' },
    { value: 'Building MVP', label: 'Building MVP', description: 'Building first version' },
    { value: 'Early Traction', label: 'Early Traction', description: 'First customers, finding PMF' },
    { value: 'Growth Stage', label: 'Growth Stage', description: 'Scaling what works' },
    { value: 'Scaling', label: 'Scaling', description: 'Rapid expansion' },
    { value: 'Mature', label: 'Mature', description: 'Established business' }
];

export const BusinessProfileSetup: React.FC<BusinessProfileSetupProps> = ({
    onComplete,
    onSkip,
    initialData = {}
}) => {
    const { track } = useAnalytics()
    
    // Load draft from localStorage if available
    const loadDraft = (): Partial<BusinessProfile> => {
        try {
            const draft = SecureStorage.getItem<Partial<BusinessProfile>>(
                StorageKeys.BUSINESS_PROFILE_DRAFT
            );
            if (draft) {
                logger.debug('Business profile draft loaded from secure storage');
                return draft;
            }
        } catch (error) {
            logger.error('Failed to load business profile draft', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
        return {};
    };

    // Check if we have existing complete data (editing mode)
    const hasExistingData = initialData.isComplete || Object.keys(initialData).length > 1;
    
    const [step, setStep] = useState(1);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState<Partial<BusinessProfile>>({
        companyName: '',
        industry: undefined,
        companySize: undefined,
        businessModel: undefined,
        description: '',
        targetMarket: '',
        valueProposition: '',
        primaryGoal: undefined,
        keyChallenges: '',
        growthStage: undefined,
        currentMrr: undefined,
        targetMrr: undefined,
        customerCount: undefined,
        teamSize: undefined,
        // If we have existing complete data, prioritize it over draft
        // Otherwise, load draft first, then apply any initial data
        ...(hasExistingData ? initialData : { ...loadDraft(), ...initialData })
    });
    
    // Clear draft when component unmounts if we loaded existing data
    useEffect(() => {
        if (hasExistingData) {
            try {
                SecureStorage.removeItem(StorageKeys.BUSINESS_PROFILE_DRAFT);
                logger.debug('Business profile draft cleared - editing existing profile');
            } catch (error) {
                logger.error('Failed to clear business profile draft', { error: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
    }, [hasExistingData]);

    // Debounced save function - saves 2 seconds after last change
    const debouncedSave = useDebounce((data: Partial<BusinessProfile>) => {
        try {
            SecureStorage.setItem(
                StorageKeys.BUSINESS_PROFILE_DRAFT,
                data,
                StorageTTL.ONE_WEEK // Auto-expire after 7 days
            );
            logger.debug('Business profile draft saved to secure storage (debounced)');
        } catch (error) {
            logger.error('Failed to save business profile draft', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }, 2000); // 2 second delay

    // Save draft to encrypted storage with debouncing to reduce localStorage writes
    useEffect(() => {
        if (!hasExistingData) {
            debouncedSave(formData);
        }
    }, [formData, hasExistingData, debouncedSave]);

    const totalSteps = 7;

    const updateField = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K] | undefined) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const nextStep = () => {
        // Validate current step before proceeding
        const validation = validateStep(step, formData);
        
        if (!validation.success) {
            setValidationErrors(validation.errors);
            logger.debug('Validation failed for step', { step, errors: validation.errors });
            track('business_profile_validation_error', { step, errors: Object.keys(validation.errors) })
            return;
        }
        
        // Clear validation errors on successful validation
        setValidationErrors({});
        track('business_profile_step_completed', { step, data_fields: Object.keys(formData) })
        
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleComplete = () => {
        track('business_profile_completed', { 
            total_fields: Object.keys(formData).length,
            has_company_name: !!formData.companyName,
            has_industry: !!formData.industry,
            has_mrr: !!formData.currentMrr
        })
        onComplete({
            ...formData,
            isComplete: true,
            completedAt: Date.now()
        });
        
        // Clear draft after successful completion
        try {
            SecureStorage.removeItem(StorageKeys.BUSINESS_PROFILE_DRAFT);
            logger.debug('Business profile draft cleared after completion');
        } catch (error) {
            logger.error('Failed to clear business profile draft after completion', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                    key={idx}
                    className={`h-3 w-12 border-2 border-black transition-colors ${
                        idx + 1 === step
                            ? 'bg-blue-600'
                            : idx + 1 < step
                            ? 'bg-green-600'
                            : 'bg-white'
                    }`}
                />
            ))}
        </div>
    );

    // Helper to render field error
    const renderFieldError = (fieldName: string) => {
        const error = validationErrors[fieldName];
        if (!error) return null;
        
        return (
            <div className="mt-1 text-sm text-red-600 font-mono flex items-center gap-1">
                <span>⚠️</span>
                <span>{error}</span>
            </div>
        );
    };

    const renderStep1 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Welcome! Let's set up your business profile</h2>
                <p className="text-gray-600 font-mono">This helps the AI assistant understand your business and provide better recommendations.</p>
            </div>

            <div>
                <label htmlFor="company-name" className="block text-sm font-bold font-mono mb-2">
                    Company Name *
                </label>
                <input
                    id="company-name"
                    name="company-name"
                    type="text"
                    value={formData.companyName || ''}
                    onChange={(e) => {
                        updateField('companyName', e.target.value);
                        // Clear error on change
                        if (validationErrors.companyName) {
                            setValidationErrors(prev => ({ ...prev, companyName: '' }));
                        }
                    }}
                    className={`w-full px-4 py-3 border-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                        validationErrors.companyName ? 'border-red-600' : 'border-black'
                    }`}
                    placeholder="Acme Inc."
                    required
                    aria-invalid={!!validationErrors.companyName}
                    aria-describedby={validationErrors.companyName ? 'company-name-error' : undefined}
                />
                {renderFieldError('companyName')}
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Industry
                </label>
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

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Company Size
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {COMPANY_SIZES.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => updateField('companySize', value)}
                            className={`px-4 py-3 border-2 border-black font-mono font-bold transition-colors ${
                                formData.companySize === value
                                    ? 'bg-blue-600 text-white shadow-neo'
                                    : 'bg-white hover:bg-gray-100'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Business Model & Strategy</h2>
                <p className="text-gray-600 font-mono">Tell us about your business approach.</p>
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Business Model
                </label>
                <div className="space-y-2">
                    {BUSINESS_MODELS.map(({ value, label, description }) => (
                        <button
                            key={value}
                            onClick={() => updateField('businessModel', value)}
                            className={`w-full text-left px-4 py-3 border-2 border-black font-mono transition-colors ${
                                formData.businessModel === value
                                    ? 'bg-blue-600 text-white shadow-neo'
                                    : 'bg-white hover:bg-gray-100'
                            }`}
                        >
                            <div className="font-bold">{label}</div>
                            <div className={`text-sm ${formData.businessModel === value ? 'text-blue-100' : 'text-gray-600'}`}>
                                {description}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Business Description
                </label>
                <textarea
                    value={formData.description || ''}
                    onChange={(e) => updateField('description', e.target.value || undefined)}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                    rows={3}
                    placeholder="What does your business do?"
                />
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Target Market
                </label>
                <input
                    type="text"
                    value={formData.targetMarket || ''}
                    onChange={(e) => updateField('targetMarket', e.target.value || undefined)}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Who are your customers?"
                />
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Value Proposition
                </label>
                <input
                    type="text"
                    value={formData.valueProposition || ''}
                    onChange={(e) => updateField('valueProposition', e.target.value || undefined)}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="What makes you unique?"
                />
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Goals & Growth Stage</h2>
                <p className="text-gray-600 font-mono">What are you working towards?</p>
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Growth Stage
                </label>
                <div className="space-y-2">
                    {GROWTH_STAGES.map(({ value, label, description }) => (
                        <button
                            key={value}
                            onClick={() => updateField('growthStage', value)}
                            className={`w-full text-left px-4 py-3 border-2 border-black font-mono transition-colors ${
                                formData.growthStage === value
                                    ? 'bg-blue-600 text-white shadow-neo'
                                    : 'bg-white hover:bg-gray-100'
                            }`}
                        >
                            <div className="font-bold">{label}</div>
                            <div className={`text-sm ${formData.growthStage === value ? 'text-blue-100' : 'text-gray-600'}`}>
                                {description}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Primary Goal
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {PRIMARY_GOALS.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => updateField('primaryGoal', value)}
                            className={`px-4 py-3 border-2 border-black font-mono font-bold transition-colors ${
                                formData.primaryGoal === value
                                    ? 'bg-blue-600 text-white shadow-neo'
                                    : 'bg-white hover:bg-gray-100'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Key Challenges
                </label>
                <textarea
                    value={formData.keyChallenges || ''}
                    onChange={(e) => updateField('keyChallenges', e.target.value || undefined)}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                    rows={3}
                    placeholder="What are your biggest challenges right now?"
                />
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Metrics & Performance (Optional)</h2>
                <p className="text-gray-600 font-mono">Help us understand your business scale.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold font-mono mb-2">
                        Current MRR ($)
                    </label>
                    <input
                        type="number"
                        value={formData.currentMrr || ''}
                        onChange={(e) => updateField('currentMrr', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="0"
                        min="0"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold font-mono mb-2">
                        Target MRR ($)
                    </label>
                    <input
                        type="number"
                        value={formData.targetMrr || ''}
                        onChange={(e) => updateField('targetMrr', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="0"
                        min="0"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold font-mono mb-2">
                        Customer Count
                    </label>
                    <input
                        type="number"
                        value={formData.customerCount || ''}
                        onChange={(e) => updateField('customerCount', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="0"
                        min="0"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold font-mono mb-2">
                        Team Size
                    </label>
                    <input
                        type="number"
                        value={formData.teamSize || ''}
                        onChange={(e) => updateField('teamSize', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="1"
                        min="1"
                    />
                </div>
            </div>

            <div className="bg-blue-100 border-2 border-black p-4">
                <p className="text-sm font-mono">
                    <span className="font-bold">💡 Pro tip:</span> This information helps the AI assistant provide better insights tailored to your business stage and goals.
                </p>
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Market Positioning (Optional)</h2>
                <p className="text-gray-600 font-mono">Define your target market and competitive advantages.</p>
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Target Customer Profile
                </label>
                <textarea
                    value={formData.targetCustomerProfile || ''}
                    onChange={(e) => updateField('targetCustomerProfile', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 h-24"
                    placeholder="Describe your ideal customer (demographics, pain points, behaviors...)"
                />
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Market Positioning
                </label>
                <textarea
                    value={formData.marketPositioning || ''}
                    onChange={(e) => updateField('marketPositioning', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 h-20"
                    placeholder="How do you position yourself in the market?"
                />
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Competitive Advantages (comma-separated)
                </label>
                <input
                    type="text"
                    value={formData.competitiveAdvantages?.join(', ') || ''}
                    onChange={(e) => updateField('competitiveAdvantages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Better pricing, faster delivery, superior quality..."
                />
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Key Differentiators (comma-separated)
                </label>
                <input
                    type="text"
                    value={formData.keyDifferentiators?.join(', ') || ''}
                    onChange={(e) => updateField('keyDifferentiators', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Unique features, proprietary tech, exclusive partnerships..."
                />
            </div>
        </div>
    );

    const renderStep6 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Monetization & Pricing (Optional)</h2>
                <p className="text-gray-600 font-mono">How do you make money?</p>
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Monetization Model
                </label>
                <select
                    value={formData.monetizationModel || ''}
                    onChange={(e) => updateField('monetizationModel', e.target.value as any || undefined)}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                    <option value="">Select a model...</option>
                    <option value="subscription">Subscription (Recurring)</option>
                    <option value="one-time">One-time Purchase</option>
                    <option value="usage-based">Usage-based</option>
                    <option value="freemium">Freemium</option>
                    <option value="enterprise">Enterprise Sales</option>
                    <option value="marketplace">Marketplace (Commission)</option>
                    <option value="advertising">Advertising</option>
                    <option value="hybrid">Hybrid Model</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold font-mono mb-2">
                        Average Deal Size ($)
                    </label>
                    <input
                        type="number"
                        value={formData.averageDealSize || ''}
                        onChange={(e) => updateField('averageDealSize', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="0"
                        min="0"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold font-mono mb-2">
                        Sales Cycle (days)
                    </label>
                    <input
                        type="number"
                        value={formData.salesCycleDays || ''}
                        onChange={(e) => updateField('salesCycleDays', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="30"
                        min="0"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Deal Types (comma-separated)
                </label>
                <input
                    type="text"
                    value={formData.dealTypes?.join(', ') || 'new_business, expansion, renewal'}
                    onChange={(e) => updateField('dealTypes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="new_business, expansion, renewal"
                />
            </div>

            <div className="bg-yellow-50 border-2 border-black p-4">
                <p className="text-sm font-mono">
                    <span className="font-bold">💰 Note:</span> Pricing tiers can be managed later in Settings. This helps the AI understand your revenue model.
                </p>
            </div>
        </div>
    );

    const renderStep7 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-mono mb-2">Products & Tech Stack (Optional)</h2>
                <p className="text-gray-600 font-mono">What do you build with?</p>
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Tech Stack (comma-separated)
                </label>
                <input
                    type="text"
                    value={formData.techStack?.join(', ') || ''}
                    onChange={(e) => updateField('techStack', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="React, Node.js, PostgreSQL, AWS..."
                />
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Service Offerings (comma-separated)
                </label>
                <textarea
                    value={formData.serviceOfferings?.map(s => `${s.name}: ${s.description}`).join(', ') || ''}
                    onChange={(e) => {
                        const services = e.target.value.split(',').map(s => {
                            const parts = s.trim().split(':');
                            return {
                                name: parts[0]?.trim() || '',
                                description: parts[1]?.trim() || '',
                                pricing: ''
                            };
                        }).filter(s => s.name);
                        updateField('serviceOfferings', services.length > 0 ? services : undefined);
                    }}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 h-24"
                    placeholder="Consulting: Strategy sessions, Development: Custom apps, Design: Brand identity..."
                />
                <p className="text-xs text-gray-500 mt-1 font-mono">Format: Service Name: Description, ...</p>
            </div>

            <div className="bg-green-50 border-2 border-black p-4">
                <p className="text-sm font-mono">
                    <span className="font-bold">🎉 Almost done!</span> This enhanced profile will help the AI provide highly personalized insights and recommendations.
                </p>
            </div>
        </div>
    );

    const canProceed = () => {
        if (step === 1) {
            return !!formData.companyName?.trim();
        }
        return true; // Other steps are optional
    };

    return (
        <div 
            className="fixed inset-0 flex items-center justify-center z-[100] p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={(e) => {
                // Prevent closing when clicking the backdrop
                e.stopPropagation();
            }}
        >
            <div 
                className="bg-white border-2 border-black shadow-neo max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => {
                    // Prevent click from bubbling to backdrop
                    e.stopPropagation();
                }}
            >
                {/* Header */}
                <div className="border-b-2 border-black p-6 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <h1 className="text-xl font-bold font-mono">Business Profile Setup</h1>
                        <p className="text-sm font-mono text-gray-600">
                            Step {step} of {totalSteps} • 
                            <span className="text-green-600 ml-1">✓ Draft auto-saved</span>
                        </p>
                    </div>
                    {onSkip && (
                        <button
                            onClick={onSkip}
                            className="p-2 hover:bg-gray-100 transition-colors"
                            title="Skip for now"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {renderStepIndicator()}
                    
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                    {step === 5 && renderStep5()}
                    {step === 6 && renderStep6()}
                    {step === 7 && renderStep7()}
                </div>

                {/* Footer */}
                <div className="border-t-2 border-black p-6 flex items-center justify-between sticky bottom-0 bg-white">
                    <div>
                        {step > 1 && (
                            <button
                                onClick={prevStep}
                                className="px-6 py-3 border-2 border-black bg-white font-mono font-bold hover:bg-gray-100 transition-colors"
                            >
                                ← Back
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {onSkip && step === 1 && (
                            <button
                                onClick={onSkip}
                                className="px-6 py-3 border-2 border-black bg-white font-mono font-bold hover:bg-gray-100 transition-colors"
                            >
                                Skip for now
                            </button>
                        )}
                        <button
                            onClick={nextStep}
                            disabled={!canProceed()}
                            className={`px-6 py-3 border-2 border-black font-mono font-bold transition-colors ${
                                canProceed()
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-neo'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {step === totalSteps ? 'Complete Setup →' : 'Next →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
