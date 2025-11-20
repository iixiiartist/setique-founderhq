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

type PricingTier = NonNullable<BusinessProfile['pricingTiers']>[number];
type CoreProduct = NonNullable<BusinessProfile['coreProducts']>[number];
type ServiceOffering = NonNullable<BusinessProfile['serviceOfferings']>[number];

const DEFAULT_DEAL_TYPES = ['new_business', 'expansion', 'renewal'];
const DEFAULT_BILLING_CYCLE = 'monthly';

const trimOrUndefined = (value?: string | null) => {
    const next = value?.trim();
    return next && next.length > 0 ? next : undefined;
};

const sanitizeStringArray = (values?: string[]) => {
    if (!values) return undefined;
    const cleaned = values
        .map(value => value?.trim())
        .filter((value): value is string => Boolean(value && value.length > 0));
    return cleaned.length ? cleaned : undefined;
};

const sanitizePricingTiers = (tiers?: PricingTier[]) => {
    if (!tiers) return undefined;
    const cleaned = tiers
        .map((tier) => {
            const name = tier.name?.trim();
            const billingCycle = tier.billingCycle || DEFAULT_BILLING_CYCLE;
            const price = tier.price === undefined || tier.price === null || Number.isNaN(tier.price)
                ? undefined
                : Number(tier.price);
            const features = sanitizeStringArray(tier.features) || [];
            return {
                name: name && name.length > 0 ? name : undefined,
                price,
                billingCycle,
                features,
            };
        })
        .filter(tier => tier.name || tier.price !== undefined || tier.features.length);
    return cleaned.length ? cleaned : undefined;
};

const sanitizeCoreProducts = (products?: CoreProduct[]) => {
    if (!products) return undefined;
    const cleaned = products
        .map(product => ({
            name: trimOrUndefined(product.name),
            description: trimOrUndefined(product.description),
            type: trimOrUndefined(product.type),
            status: trimOrUndefined(product.status)
        }))
        .filter(product => product.name || product.description || product.type || product.status);
    return cleaned.length ? cleaned : undefined;
};

const sanitizeServiceOfferings = (offerings?: ServiceOffering[]) => {
    if (!offerings) return undefined;
    const cleaned = offerings
        .map(offering => ({
            name: trimOrUndefined(offering.name),
            description: trimOrUndefined(offering.description),
            pricing: trimOrUndefined(offering.pricing)
        }))
        .filter(offering => offering.name || offering.description || offering.pricing);
    return cleaned.length ? cleaned : undefined;
};

const prepareProfilePayload = (data: Partial<BusinessProfile>): Partial<BusinessProfile> => ({
    ...data,
    companyName: data.companyName?.trim() || '',
    industry: trimOrUndefined(data.industry),
    companySize: data.companySize,
    businessModel: data.businessModel,
    description: trimOrUndefined(data.description),
    targetMarket: trimOrUndefined(data.targetMarket),
    valueProposition: trimOrUndefined(data.valueProposition),
    primaryGoal: data.primaryGoal,
    keyChallenges: trimOrUndefined(data.keyChallenges),
    growthStage: data.growthStage,
    currentMrr: data.currentMrr,
    targetMrr: data.targetMrr,
    customerCount: data.customerCount,
    teamSize: data.teamSize,
    targetCustomerProfile: trimOrUndefined(data.targetCustomerProfile),
    marketPositioning: trimOrUndefined(data.marketPositioning),
    competitiveAdvantages: sanitizeStringArray(data.competitiveAdvantages),
    keyDifferentiators: sanitizeStringArray(data.keyDifferentiators),
    competitors: sanitizeStringArray(data.competitors),
    uniqueDifferentiators: trimOrUndefined(data.uniqueDifferentiators),
    monetizationModel: data.monetizationModel,
    dealTypes: sanitizeStringArray(data.dealTypes),
    techStack: sanitizeStringArray(data.techStack),
    pricingTiers: sanitizePricingTiers(data.pricingTiers),
    coreProducts: sanitizeCoreProducts(data.coreProducts),
    serviceOfferings: sanitizeServiceOfferings(data.serviceOfferings),
});

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
    const [formData, setFormData] = useState<Partial<BusinessProfile>>(() => {
        const baseForm: Partial<BusinessProfile> = {
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
            targetCustomerProfile: '',
            marketPositioning: '',
            competitiveAdvantages: [],
            keyDifferentiators: [],
            uniqueDifferentiators: '',
            dealTypes: DEFAULT_DEAL_TYPES,
            pricingTiers: [],
            coreProducts: [],
            serviceOfferings: [],
            techStack: [],
        };
        const draftData = hasExistingData ? {} : loadDraft();
        const initialValues = {
            ...baseForm,
            ...(hasExistingData ? {} : draftData),
            ...initialData,
        } as Partial<BusinessProfile>;

        if (!initialValues.dealTypes || initialValues.dealTypes.length === 0) {
            initialValues.dealTypes = DEFAULT_DEAL_TYPES;
        }

        return initialValues;
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
    const requiredFields: { key: keyof BusinessProfile; label: string }[] = [
        { key: 'companyName', label: 'Company name' },
        { key: 'industry', label: 'Industry' },
        { key: 'targetCustomerProfile', label: 'Target customer profile' },
        { key: 'marketPositioning', label: 'Market positioning' },
        { key: 'monetizationModel', label: 'Monetization model' },
        { key: 'competitiveAdvantages', label: 'Competitive advantages' },
        { key: 'keyDifferentiators', label: 'Key differentiators' },
    ];

    const updateField = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K] | undefined) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const ensureArray = <T,>(value?: T[]): T[] => (value ? [...value] : []);

    const addPricingTier = () => {
        setFormData(prev => {
            const tiers = ensureArray<PricingTier>(prev.pricingTiers);
            tiers.push({ name: '', price: 0, features: [], billingCycle: DEFAULT_BILLING_CYCLE });
            return { ...prev, pricingTiers: tiers };
        });
    };

    const updatePricingTier = <K extends keyof PricingTier>(index: number, field: K, value: PricingTier[K]) => {
        setFormData(prev => {
            const tiers = ensureArray<PricingTier>(prev.pricingTiers);
            tiers[index] = { ...tiers[index], [field]: value };
            return { ...prev, pricingTiers: tiers };
        });
    };

    const removePricingTier = (index: number) => {
        setFormData(prev => {
            const tiers = ensureArray<PricingTier>(prev.pricingTiers);
            tiers.splice(index, 1);
            return { ...prev, pricingTiers: tiers.length ? tiers : undefined };
        });
    };

    const addCoreProduct = () => {
        setFormData(prev => {
            const products = ensureArray<CoreProduct>(prev.coreProducts);
            products.push({ name: '', description: '', type: '', status: '' });
            return { ...prev, coreProducts: products };
        });
    };

    const updateCoreProduct = <K extends keyof CoreProduct>(index: number, field: K, value: CoreProduct[K]) => {
        setFormData(prev => {
            const products = ensureArray<CoreProduct>(prev.coreProducts);
            products[index] = { ...products[index], [field]: value };
            return { ...prev, coreProducts: products };
        });
    };

    const removeCoreProduct = (index: number) => {
        setFormData(prev => {
            const products = ensureArray<CoreProduct>(prev.coreProducts);
            products.splice(index, 1);
            return { ...prev, coreProducts: products.length ? products : undefined };
        });
    };

    const addServiceOffering = () => {
        setFormData(prev => {
            const services = ensureArray<ServiceOffering>(prev.serviceOfferings);
            services.push({ name: '', description: '', pricing: '' });
            return { ...prev, serviceOfferings: services };
        });
    };

    const updateServiceOffering = <K extends keyof ServiceOffering>(index: number, field: K, value: ServiceOffering[K]) => {
        setFormData(prev => {
            const services = ensureArray<ServiceOffering>(prev.serviceOfferings);
            services[index] = { ...services[index], [field]: value };
            return { ...prev, serviceOfferings: services };
        });
    };

    const removeServiceOffering = (index: number) => {
        setFormData(prev => {
            const services = ensureArray<ServiceOffering>(prev.serviceOfferings);
            services.splice(index, 1);
            return { ...prev, serviceOfferings: services.length ? services : undefined };
        });
    };

    const nextStep = () => {
        // Validate current step before proceeding
        const validation = validateStep(step, formData);
        
        if (!validation.success) {
            setValidationErrors(validation.errors);
            logger.debug('Validation failed for step', { step, errors: validation.errors });
            const errorFields = Object.keys(validation.errors);
            track('business_profile_validation_error', {
                step,
                error_fields: errorFields.join(','),
                error_count: errorFields.length,
            })
            return;
        }
        
        // Clear validation errors on successful validation
        setValidationErrors({});
        const fieldKeys = Object.keys(formData);
        track('business_profile_step_completed', {
            step,
            data_fields: fieldKeys.join(','),
            field_count: fieldKeys.length,
        })
        
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const missingFields = requiredFields.filter(({ key }) => {
        const value = formData[key];
        if (Array.isArray(value)) {
            return !value.length;
        }
        if (typeof value === 'string') {
            return value.trim().length === 0;
        }
        return value === undefined || value === null;
    });

    const handleComplete = () => {
        if (missingFields.length > 0) {
            track('business_profile_missing_required_fields', {
                missing_fields: missingFields.map(field => field.key).join(','),
            });
            alert(
                `Please complete the following fields before finishing the AI context:\n\n${missingFields
                    .map(field => `• ${field.label}`)
                    .join('\n')}`
            );
            return;
        }

        track('business_profile_completed', { 
            total_fields: Object.keys(formData).length,
            has_company_name: !!formData.companyName,
            has_industry: !!formData.industry,
            has_mrr: !!formData.currentMrr
        })
        const sanitizedProfile = prepareProfilePayload(formData);
        onComplete({
            ...sanitizedProfile,
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

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Competitors (comma-separated)
                </label>
                <input
                    type="text"
                    value={formData.competitors?.join(', ') || ''}
                    onChange={(e) => updateField('competitors', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Competitor A, Competitor B, Competitor C"
                />
            </div>

            <div>
                <label className="block text-sm font-bold font-mono mb-2">
                    Unique Differentiators Summary
                </label>
                <textarea
                    value={formData.uniqueDifferentiators || ''}
                    onChange={(e) => updateField('uniqueDifferentiators', e.target.value || undefined)}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 h-24"
                    placeholder="Use narrative form to highlight why customers choose you."
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
                    value={formData.dealTypes?.join(', ') || ''}
                    onChange={(e) => updateField('dealTypes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="new_business, expansion, renewal"
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold font-mono">Pricing Tiers</label>
                    <button
                        type="button"
                        onClick={addPricingTier}
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
                        <div key={index} className="border-2 border-black p-3 space-y-2">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold font-mono">Tier {index + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removePricingTier(index)}
                                    className="text-sm text-red-600 font-mono"
                                >
                                    Remove
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={tier.name || ''}
                                    onChange={(e) => updatePricingTier(index, 'name', e.target.value)}
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
                                            updatePricingTier(index, 'price', nextValue as PricingTier['price']);
                                        }}
                                        placeholder="Price"
                                        className="w-full px-3 py-2 border-2 border-black font-mono"
                                        min="0"
                                    />
                                    <select
                                        value={tier.billingCycle || DEFAULT_BILLING_CYCLE}
                                        onChange={(e) => updatePricingTier(index, 'billingCycle', e.target.value)}
                                        className="px-3 py-2 border-2 border-black font-mono bg-white"
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annual">Annual</option>
                                        <option value="lifetime">Lifetime</option>
                                        <option value="usage-based">Usage based</option>
                                    </select>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={tier.features?.join(', ') || ''}
                                onChange={(e) => updatePricingTier(index, 'features', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                placeholder="Key features (comma-separated)"
                                className="w-full px-3 py-2 border-2 border-black font-mono"
                            />
                        </div>
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
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold font-mono">Core Products</label>
                    <button
                        type="button"
                        onClick={addCoreProduct}
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
                        <div key={index} className="border-2 border-black p-3 space-y-2">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold font-mono">Product {index + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removeCoreProduct(index)}
                                    className="text-sm text-red-600 font-mono"
                                >
                                    Remove
                                </button>
                            </div>
                            <input
                                type="text"
                                value={product.name || ''}
                                onChange={(e) => updateCoreProduct(index, 'name', e.target.value)}
                                placeholder="Product name"
                                className="w-full px-3 py-2 border-2 border-black font-mono"
                            />
                            <textarea
                                value={product.description || ''}
                                onChange={(e) => updateCoreProduct(index, 'description', e.target.value)}
                                placeholder="Short description"
                                className="w-full px-3 py-2 border-2 border-black font-mono h-20"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={product.type || ''}
                                    onChange={(e) => updateCoreProduct(index, 'type', e.target.value)}
                                    placeholder="Type (e.g., SaaS, Mobile)"
                                    className="w-full px-3 py-2 border-2 border-black font-mono"
                                />
                                <input
                                    type="text"
                                    value={product.status || ''}
                                    onChange={(e) => updateCoreProduct(index, 'status', e.target.value)}
                                    placeholder="Status (Idea, Beta, GA...)"
                                    className="w-full px-3 py-2 border-2 border-black font-mono"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold font-mono">Service Offerings</label>
                    <button
                        type="button"
                        onClick={addServiceOffering}
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
                        <div key={index} className="border-2 border-black p-3 space-y-2">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold font-mono">Service {index + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removeServiceOffering(index)}
                                    className="text-sm text-red-600 font-mono"
                                >
                                    Remove
                                </button>
                            </div>
                            <input
                                type="text"
                                value={service.name || ''}
                                onChange={(e) => updateServiceOffering(index, 'name', e.target.value)}
                                placeholder="Service name"
                                className="w-full px-3 py-2 border-2 border-black font-mono"
                            />
                            <textarea
                                value={service.description || ''}
                                onChange={(e) => updateServiceOffering(index, 'description', e.target.value)}
                                placeholder="What does this service include?"
                                className="w-full px-3 py-2 border-2 border-black font-mono h-20"
                            />
                            <input
                                type="text"
                                value={service.pricing || ''}
                                onChange={(e) => updateServiceOffering(index, 'pricing', e.target.value)}
                                placeholder="Pricing notes (hourly, retainer, per project)"
                                className="w-full px-3 py-2 border-2 border-black font-mono"
                            />
                        </div>
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
                    {missingFields.length > 0 && (
                        <div className="mb-6 border-2 border-yellow-400 bg-yellow-50 p-4">
                            <h2 className="font-mono font-semibold text-yellow-800 mb-2">Almost there ⏱️</h2>
                            <p className="text-sm font-mono text-yellow-700">
                                These fields power Copilot personalization. Please fill them in before finishing:
                            </p>
                            <ul className="list-disc pl-5 text-sm font-mono text-yellow-900 mt-2 space-y-1">
                                {missingFields.map(field => (
                                    <li key={field.key}>{field.label}</li>
                                ))}
                            </ul>
                        </div>
                    )}
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
