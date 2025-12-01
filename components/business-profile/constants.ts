// BusinessProfileSetup Constants
// Option lists and type definitions for business profile form

import { CompanySize, BusinessModel, PrimaryGoal, GrowthStage } from '../../types';

export const INDUSTRIES = [
    'SaaS', 'E-commerce', 'Fintech', 'Healthcare', 'Education', 
    'Marketing', 'Real Estate', 'Consulting', 'Manufacturing', 'Other'
];

export const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
    { value: 'Just me', label: 'Just me' },
    { value: '1-10 employees', label: '1-10 employees' },
    { value: '11-50 employees', label: '11-50 employees' },
    { value: '51-200 employees', label: '51-200 employees' },
    { value: '201-500 employees', label: '201-500 employees' },
    { value: '500+ employees', label: '500+ employees' }
];

export const BUSINESS_MODELS: { value: BusinessModel; label: string; description: string }[] = [
    { value: 'B2B SaaS', label: 'B2B SaaS', description: 'Software for businesses' },
    { value: 'B2C SaaS', label: 'B2C SaaS', description: 'Software for consumers' },
    { value: 'Marketplace', label: 'Marketplace', description: 'Connecting buyers and sellers' },
    { value: 'E-commerce', label: 'E-commerce', description: 'Online retail' },
    { value: 'Consulting/Services', label: 'Consulting/Services', description: 'Professional services' },
    { value: 'Agency', label: 'Agency', description: 'Creative or marketing agency' },
    { value: 'Hardware', label: 'Hardware', description: 'Physical products' },
    { value: 'Other', label: 'Other', description: 'Different business model' }
];

export const PRIMARY_GOALS: { value: PrimaryGoal; label: string }[] = [
    { value: 'Grow Revenue', label: 'Grow Revenue' },
    { value: 'Acquire First Customers', label: 'Acquire First Customers' },
    { value: 'Achieve Product-Market Fit', label: 'Achieve Product-Market Fit' },
    { value: 'Build Product', label: 'Build Product' },
    { value: 'Hire Team', label: 'Hire Team' },
    { value: 'Raise Funding', label: 'Raise Funding' },
    { value: 'Expand Market', label: 'Expand Market' }
];

export const GROWTH_STAGES: { value: GrowthStage; label: string; description: string }[] = [
    { value: 'Idea Stage', label: 'Idea Stage', description: 'Still validating the concept' },
    { value: 'Building MVP', label: 'Building MVP', description: 'Building first version' },
    { value: 'Early Traction', label: 'Early Traction', description: 'First customers, finding PMF' },
    { value: 'Growth Stage', label: 'Growth Stage', description: 'Scaling what works' },
    { value: 'Scaling', label: 'Scaling', description: 'Rapid expansion' },
    { value: 'Mature', label: 'Mature', description: 'Established business' }
];

export const MONETIZATION_MODELS = [
    { value: 'subscription', label: 'Subscription (Recurring)' },
    { value: 'one-time', label: 'One-time Purchase' },
    { value: 'usage-based', label: 'Usage-based' },
    { value: 'freemium', label: 'Freemium' },
    { value: 'enterprise', label: 'Enterprise Sales' },
    { value: 'marketplace', label: 'Marketplace (Commission)' },
    { value: 'advertising', label: 'Advertising' },
    { value: 'hybrid', label: 'Hybrid Model' }
];

export const DEFAULT_DEAL_TYPES = ['new_business', 'expansion', 'renewal'];
export const DEFAULT_BILLING_CYCLE = 'monthly';

export const BILLING_CYCLES = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annual', label: 'Annual' },
    { value: 'lifetime', label: 'Lifetime' },
    { value: 'usage-based', label: 'Usage based' }
];

export const TOTAL_STEPS = 7;

export const REQUIRED_FIELDS: { key: string; label: string }[] = [
    { key: 'companyName', label: 'Company name' },
    { key: 'industry', label: 'Industry' },
    { key: 'targetCustomerProfile', label: 'Target customer profile' },
    { key: 'marketPositioning', label: 'Market positioning' },
    { key: 'monetizationModel', label: 'Monetization model' },
    { key: 'competitiveAdvantages', label: 'Competitive advantages' },
    { key: 'keyDifferentiators', label: 'Key differentiators' },
];
