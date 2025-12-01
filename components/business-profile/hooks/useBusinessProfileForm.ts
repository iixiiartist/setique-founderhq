// useBusinessProfileForm Hook
// Manages form state, validation, and persistence for business profile setup

import { useState, useEffect, useCallback } from 'react';
import { BusinessProfile } from '../../../types';
import { logger } from '../../../lib/logger';
import { SecureStorage, StorageKeys, StorageTTL } from '../../../lib/utils/secureStorage';
import { useDebounce } from '../../../hooks/useDebounce';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { DEFAULT_DEAL_TYPES, DEFAULT_BILLING_CYCLE, REQUIRED_FIELDS, TOTAL_STEPS } from '../constants';

type PricingTier = NonNullable<BusinessProfile['pricingTiers']>[number];
type CoreProduct = NonNullable<BusinessProfile['coreProducts']>[number];
type ServiceOffering = NonNullable<BusinessProfile['serviceOfferings']>[number];

interface UseBusinessProfileFormProps {
    initialData?: Partial<BusinessProfile>;
    onComplete: (profile: Partial<BusinessProfile>) => void;
}

// Utility functions for data sanitization
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

export function useBusinessProfileForm({ initialData = {}, onComplete }: UseBusinessProfileFormProps) {
    const { track } = useAnalytics();
    
    // Load draft from localStorage
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

    // Check if editing existing data
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

    // Clear draft when component unmounts if editing existing data
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

    // Debounced save
    const debouncedSave = useDebounce((data: Partial<BusinessProfile>) => {
        try {
            SecureStorage.setItem(
                StorageKeys.BUSINESS_PROFILE_DRAFT,
                data,
                StorageTTL.ONE_WEEK
            );
            logger.debug('Business profile draft saved to secure storage (debounced)');
        } catch (error) {
            logger.error('Failed to save business profile draft', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }, 2000);

    useEffect(() => {
        if (!hasExistingData) {
            debouncedSave(formData);
        }
    }, [formData, hasExistingData, debouncedSave]);

    // Field update
    const updateField = useCallback(<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K] | undefined) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, []);

    // Clear validation error
    const clearError = useCallback((field: string) => {
        setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }, []);

    // Helper for arrays
    const ensureArray = <T,>(value?: T[]): T[] => (value ? [...value] : []);

    // Pricing tier handlers
    const addPricingTier = useCallback(() => {
        setFormData(prev => {
            const tiers = ensureArray<PricingTier>(prev.pricingTiers);
            tiers.push({ name: '', price: 0, features: [], billingCycle: DEFAULT_BILLING_CYCLE });
            return { ...prev, pricingTiers: tiers };
        });
    }, []);

    const updatePricingTier = useCallback(<K extends keyof PricingTier>(index: number, field: K, value: PricingTier[K]) => {
        setFormData(prev => {
            const tiers = ensureArray<PricingTier>(prev.pricingTiers);
            tiers[index] = { ...tiers[index], [field]: value };
            return { ...prev, pricingTiers: tiers };
        });
    }, []);

    const removePricingTier = useCallback((index: number) => {
        setFormData(prev => {
            const tiers = ensureArray<PricingTier>(prev.pricingTiers);
            tiers.splice(index, 1);
            return { ...prev, pricingTiers: tiers.length ? tiers : undefined };
        });
    }, []);

    // Core product handlers
    const addCoreProduct = useCallback(() => {
        setFormData(prev => {
            const products = ensureArray<CoreProduct>(prev.coreProducts);
            products.push({ name: '', description: '', type: '', status: '' });
            return { ...prev, coreProducts: products };
        });
    }, []);

    const updateCoreProduct = useCallback(<K extends keyof CoreProduct>(index: number, field: K, value: string) => {
        setFormData(prev => {
            const products = ensureArray<CoreProduct>(prev.coreProducts);
            products[index] = { ...products[index], [field]: value };
            return { ...prev, coreProducts: products };
        });
    }, []);

    const removeCoreProduct = useCallback((index: number) => {
        setFormData(prev => {
            const products = ensureArray<CoreProduct>(prev.coreProducts);
            products.splice(index, 1);
            return { ...prev, coreProducts: products.length ? products : undefined };
        });
    }, []);

    // Service offering handlers
    const addServiceOffering = useCallback(() => {
        setFormData(prev => {
            const offerings = ensureArray<ServiceOffering>(prev.serviceOfferings);
            offerings.push({ name: '', description: '', pricing: '' });
            return { ...prev, serviceOfferings: offerings };
        });
    }, []);

    const updateServiceOffering = useCallback(<K extends keyof ServiceOffering>(index: number, field: K, value: string) => {
        setFormData(prev => {
            const offerings = ensureArray<ServiceOffering>(prev.serviceOfferings);
            offerings[index] = { ...offerings[index], [field]: value };
            return { ...prev, serviceOfferings: offerings };
        });
    }, []);

    const removeServiceOffering = useCallback((index: number) => {
        setFormData(prev => {
            const offerings = ensureArray<ServiceOffering>(prev.serviceOfferings);
            offerings.splice(index, 1);
            return { ...prev, serviceOfferings: offerings.length ? offerings : undefined };
        });
    }, []);

    // Navigation
    const nextStep = useCallback(() => {
        if (step < TOTAL_STEPS) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    }, [step]);

    const prevStep = useCallback(() => {
        if (step > 1) setStep(step - 1);
    }, [step]);

    // Missing fields calculation
    const missingFields = REQUIRED_FIELDS.filter(({ key }) => {
        const value = formData[key as keyof BusinessProfile];
        if (Array.isArray(value)) {
            return !value.length;
        }
        if (typeof value === 'string') {
            return value.trim().length === 0;
        }
        return value === undefined || value === null;
    });

    // Can proceed check
    const canProceed = useCallback(() => {
        if (step === 1) {
            return !!formData.companyName?.trim();
        }
        return true;
    }, [step, formData.companyName]);

    // Complete handler
    const handleComplete = useCallback(() => {
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
        });
        
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
    }, [formData, missingFields, onComplete, track]);

    return {
        // State
        step,
        formData,
        validationErrors,
        missingFields,
        hasExistingData,
        totalSteps: TOTAL_STEPS,
        
        // Field handlers
        updateField,
        clearError,
        
        // Pricing tier handlers
        addPricingTier,
        updatePricingTier,
        removePricingTier,
        
        // Product handlers
        addCoreProduct,
        updateCoreProduct,
        removeCoreProduct,
        
        // Service handlers
        addServiceOffering,
        updateServiceOffering,
        removeServiceOffering,
        
        // Navigation
        nextStep,
        prevStep,
        canProceed,
        handleComplete,
    };
}

export default useBusinessProfileForm;
