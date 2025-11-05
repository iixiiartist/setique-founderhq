import { CompanySize, BusinessModel, GrowthStage, PrimaryGoal, RemotePolicy } from '../types';

// Company Size Options
export const COMPANY_SIZE_OPTIONS: CompanySize[] = [
    'Just me',
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '500+ employees',
];

// Business Model Options
export const BUSINESS_MODEL_OPTIONS: BusinessModel[] = [
    'B2B SaaS',
    'B2C SaaS',
    'Marketplace',
    'E-commerce',
    'Consulting/Services',
    'Agency',
    'Hardware',
    'Other',
];

// Growth Stage Options
export const GROWTH_STAGE_OPTIONS: GrowthStage[] = [
    'Idea Stage',
    'Building MVP',
    'Early Traction',
    'Growth Stage',
    'Scaling',
    'Mature',
];

// Primary Goal Options
export const PRIMARY_GOAL_OPTIONS: PrimaryGoal[] = [
    'Acquire First Customers',
    'Achieve Product-Market Fit',
    'Grow Revenue',
    'Raise Funding',
    'Build Product',
    'Hire Team',
    'Expand Market',
];

// Remote Policy Options
export const REMOTE_POLICY_OPTIONS: RemotePolicy[] = [
    'Fully Remote',
    'Hybrid',
    'In-Office',
    'Remote-First',
];

// Industry Options (common industries)
export const INDUSTRY_OPTIONS = [
    'SaaS/Software',
    'E-commerce',
    'FinTech',
    'HealthTech',
    'EdTech',
    'Marketing/AdTech',
    'Real Estate',
    'Manufacturing',
    'Consulting',
    'Retail',
    'Media/Entertainment',
    'Food & Beverage',
    'Travel & Hospitality',
    'Energy',
    'Legal',
    'Nonprofit',
    'Other',
] as const;

// Common Company Values
export const COMMON_COMPANY_VALUES = [
    'Innovation',
    'Customer First',
    'Transparency',
    'Integrity',
    'Excellence',
    'Collaboration',
    'Diversity & Inclusion',
    'Work-Life Balance',
    'Sustainability',
    'Continuous Learning',
    'Accountability',
    'Speed',
    'Quality',
    'Empathy',
    'Data-Driven',
] as const;

// Common Tech Stack Options
export const COMMON_TECH_STACK = [
    'React',
    'Vue.js',
    'Angular',
    'Next.js',
    'Node.js',
    'Python',
    'Django',
    'Flask',
    'Ruby on Rails',
    'Java',
    'Spring Boot',
    '.NET',
    'PHP',
    'Laravel',
    'Go',
    'Rust',
    'Swift',
    'Kotlin',
    'Flutter',
    'React Native',
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Redis',
    'Elasticsearch',
    'AWS',
    'Google Cloud',
    'Azure',
    'Vercel',
    'Docker',
    'Kubernetes',
    'GraphQL',
    'REST API',
    'TypeScript',
    'JavaScript',
] as const;

// Helper function to check if business profile is complete
export function isBusinessProfileComplete(profile: {
    companyName?: string;
    industry?: string;
    businessModel?: string;
    description?: string;
    targetMarket?: string;
    primaryGoal?: string;
    growthStage?: string;
}): boolean {
    return !!(
        profile.companyName &&
        profile.industry &&
        profile.businessModel &&
        profile.description &&
        profile.targetMarket &&
        profile.primaryGoal &&
        profile.growthStage
    );
}

// Get progress percentage for onboarding
export function getProfileCompletionPercentage(profile: {
    companyName?: string;
    industry?: string;
    businessModel?: string;
    description?: string;
    targetMarket?: string;
    valueProposition?: string;
    primaryGoal?: string;
    growthStage?: string;
    keyChallenges?: string;
    companySize?: string;
    teamSize?: number;
}): number {
    const fields = [
        'companyName',
        'industry',
        'businessModel',
        'description',
        'targetMarket',
        'valueProposition',
        'primaryGoal',
        'growthStage',
        'keyChallenges',
        'companySize',
        'teamSize',
    ];

    const filledFields = fields.filter(field => {
        const value = profile[field as keyof typeof profile];
        return value !== undefined && value !== null && value !== '';
    }).length;

    return Math.round((filledFields / fields.length) * 100);
}
