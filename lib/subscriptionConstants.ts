import { PlanType } from '../types';

// Re-export PlanType for convenience
export type { PlanType };

// Plan pricing in cents
// Simplified pricing: Free + Team Pro ($49 base including owner, +$25/extra seat)
export const PLAN_PRICES = {
  'free': 0,
  'team-pro': 4900, // $49/month base (includes workspace owner)
} as const;

// Additional seat pricing for team plans (in cents)
// First seat (owner) is included in base price, extra seats are $25/month each
export const SEAT_PRICES = {
  'team-pro': 2500, // $25/extra seat/month
} as const;

// Minimum seats for team plans (1 = owner only, can add more)
export const MINIMUM_TEAM_SEATS = 1;

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
  'team-pro': {
    name: 'Team Pro',
    aiRequestsPerMonth: null, // Unlimited per user
    storageBytes: null, // Unlimited shared
    fileCount: null, // Unlimited per user
    maxSeats: 999,
    features: [
      'Unlimited AI Assistant',
      'Unlimited Tasks & CRM',
      'Full Document Management',
      'Advanced Analytics',
      'Team Collaboration',
      'Shared Workspaces',
      'Team Achievements',
      'Member Management',
      'Role-Based Access',
      'Priority Support',
      'API Access',
      'Custom Integrations'
    ]
  }
};

// Helper function to check if plan is a team plan
export function isTeamPlan(planType: PlanType): boolean {
  return planType === 'team-pro';
}

// Helper function to check if plan is a free plan
export function isFreePlan(planType: PlanType): boolean {
  return planType === 'free';
}

// Calculate total monthly price for team plans
// Base price ($49) includes owner, extra seats are $25 each
export function calculateTeamPlanPrice(planType: 'team-pro', seatCount: number): number {
  const basePriceInCents = PLAN_PRICES[planType] || 0;
  const seatPriceInCents = SEAT_PRICES['team-pro'] || 0;
  // Extra seats = total seats - 1 (owner is included in base)
  const extraSeats = Math.max(0, seatCount - 1);
  return basePriceInCents + (extraSeats * seatPriceInCents);
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
    'team-pro': 'Team Pro'
  };
  return names[planType];
}

// Get plan category (simplified - free or paid)
export function getPlanCategory(planType: PlanType): 'free' | 'paid' {
  return planType === 'free' ? 'free' : 'paid';
}

// Check if user can upgrade to a specific plan
export function canUpgradeToPlan(currentPlan: PlanType, targetPlan: PlanType): boolean {
  // Simple hierarchy: free -> team-pro
  if (currentPlan === 'free' && targetPlan === 'team-pro') {
    return true;
  }
  return false;
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
  // Only free users can upgrade to team-pro
  if (currentPlan === 'free') {
    return 'team-pro';
  }
  return null; // Already at highest plan
}

// Stripe Price IDs (to be set via environment variables)
// Simplified: only team-pro pricing (base + per-seat)
export const STRIPE_PRICE_IDS = {
  'team-pro-base': import.meta.env.VITE_STRIPE_PRICE_TEAM_PRO_BASE,
  'team-pro-seat': import.meta.env.VITE_STRIPE_PRICE_TEAM_PRO_SEAT,
} as const;
