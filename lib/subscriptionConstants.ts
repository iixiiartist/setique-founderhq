import { PlanType } from '../types';

// Re-export PlanType for convenience
export type { PlanType };

// Plan pricing in cents
export const PLAN_PRICES = {
  'free': 0,
  'power-individual': 4900, // $49/month
  'team-pro': 9900, // $99/month base
} as const;

// Additional seat pricing for team plans (in cents)
export const SEAT_PRICES = {
  'team-pro': 2500, // $25/seat/month
} as const;

// Minimum seats for team plans
export const MINIMUM_TEAM_SEATS = 2;

// Plan limits
export interface PlanLimits {
  name: string;
  aiRequestsPerMonth: number | null; // null = unlimited
  storageBytes: number | null; // null = unlimited
  fileCount: number | null; // null = unlimited
  maxSeats: number;
  features: string[];
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  'free': {
    name: 'Free',
    aiRequestsPerMonth: 25, // 25 AI requests/month
    storageBytes: null, // Unlimited storage
    fileCount: null, // Unlimited files
    maxSeats: 1,
    features: [
      'Task Management',
      'CRM (limited)',
      'Basic Analytics',
      '25 AI Assistant requests/month'
    ]
  },
  'power-individual': {
    name: 'Power',
    aiRequestsPerMonth: null, // Unlimited
    storageBytes: null, // Unlimited
    fileCount: null, // Unlimited
    maxSeats: 1,
    features: [
      'Unlimited AI Assistant',
      'Unlimited Tasks',
      'Full CRM Features',
      'Unlimited Documents',
      'Advanced Analytics',
      'Priority Support',
      'Export Data',
      'API Access',
      'Custom Integrations'
    ]
  },
  'team-pro': {
    name: 'Team Pro',
    aiRequestsPerMonth: null, // Unlimited per user
    storageBytes: null, // Unlimited shared
    fileCount: null, // Unlimited per user
    maxSeats: 999,
    features: [
      'All Power Features',
      'Team Collaboration',
      'Shared Workspaces',
      'Team Achievements',
      'Member Management',
      'Unlimited Documents',
      'Team Analytics',
      'Role-Based Access',
      'Advanced Permissions',
      'Priority Team Support',
      'Custom Onboarding'
    ]
  }
};

// Helper function to check if plan is a team plan
export function isTeamPlan(planType: PlanType): boolean {
  return planType === 'team-pro';
}

// Helper function to check if plan is an individual plan
export function isIndividualPlan(planType: PlanType): boolean {
  return planType === 'free' || planType === 'power-individual';
}

// Calculate total monthly price for team plans
export function calculateTeamPlanPrice(planType: 'team-pro', seatCount: number): number {
  const basePriceInCents = PLAN_PRICES[planType] || 0;
  const seatPriceInCents = SEAT_PRICES['team-pro'] || 0;
  return basePriceInCents + (seatCount * seatPriceInCents);
}

// Format price in cents to USD string
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(dollars);
}

// Get plan display name
export function getPlanDisplayName(planType: PlanType): string {
  const names: Record<PlanType, string> = {
    'free': 'Free',
    'power-individual': 'Power',
    'team-pro': 'Team Pro'
  };
  return names[planType];
}

// Get plan category
export function getPlanCategory(planType: PlanType): 'individual' | 'team' {
  return isTeamPlan(planType) ? 'team' : 'individual';
}

// Check if user can upgrade to a specific plan
export function canUpgradeToPlan(currentPlan: PlanType, targetPlan: PlanType): boolean {
  const planHierarchy: PlanType[] = [
    'free',
    'power-individual',
    'team-pro'
  ];
  
  const currentIndex = planHierarchy.indexOf(currentPlan);
  const targetIndex = planHierarchy.indexOf(targetPlan);
  
  return targetIndex > currentIndex;
}

// Format bytes to human-readable string
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Get usage percentage
export function getUsagePercentage(used: number, limit: number | null): number {
  if (limit === null) return 0; // Unlimited
  if (limit === 0) return 100;
  return Math.min(Math.round((used / limit) * 100), 100);
}

// Check if approaching limit (>80%)
export function isApproachingLimit(used: number, limit: number | null): boolean {
  if (limit === null) return false; // Unlimited
  return getUsagePercentage(used, limit) >= 80;
}

// Check if limit exceeded
export function isLimitExceeded(used: number, limit: number | null): boolean {
  if (limit === null) return false; // Unlimited
  return used >= limit;
}

// Get recommended upgrade plan
export function getRecommendedUpgrade(currentPlan: PlanType): PlanType | null {
  const upgrades: Record<PlanType, PlanType | null> = {
    'free': 'power-individual',
    'power-individual': 'team-pro',
    'team-pro': null // Already at highest plan
  };
  
  return upgrades[currentPlan];
}

// Stripe Price IDs (to be set via environment variables)
// Note: Only active plans are included. Deprecated plans (pro-individual, team-starter) have been removed.
export const STRIPE_PRICE_IDS = {
  'power-individual': import.meta.env.VITE_STRIPE_PRICE_POWER_INDIVIDUAL,
  'team-pro-base': import.meta.env.VITE_STRIPE_PRICE_TEAM_PRO_BASE,
  'team-pro-seat': import.meta.env.VITE_STRIPE_PRICE_TEAM_PRO_SEAT,
} as const;
