import { TeamAchievement, TeamAchievementId } from '../types';

// XP Rewards by Tier
export const ACHIEVEMENT_XP_REWARDS = {
    1: 100,   // Tier 1: First milestones
    2: 250,   // Tier 2: Growth milestones
    3: 500,   // Tier 3: Major milestones
    4: 1000,  // Tier 4: Epic milestones
} as const;

// Team Level Thresholds
export const TEAM_LEVEL_THRESHOLDS = [
    { level: 1, xp: 0 },
    { level: 2, xp: 500 },
    { level: 3, xp: 1500 },
    { level: 4, xp: 3500 },
    { level: 5, xp: 7000 },
    { level: 6, xp: 12000 },
    { level: 7, xp: 18500 },
    { level: 8, xp: 27000 },
    { level: 9, xp: 37500 },
    { level: 10, xp: 50000 },
] as const;

export function calculateTeamLevel(xp: number): number {
    for (let i = TEAM_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= TEAM_LEVEL_THRESHOLDS[i].xp) {
            return TEAM_LEVEL_THRESHOLDS[i].level;
        }
    }
    return 1;
}

export function getXpForNextLevel(currentLevel: number): number {
    const nextLevelThreshold = TEAM_LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);
    return nextLevelThreshold?.xp ?? TEAM_LEVEL_THRESHOLDS[TEAM_LEVEL_THRESHOLDS.length - 1].xp;
}

// Team Achievement Definitions (25 total)
export const TEAM_ACHIEVEMENTS: Record<TeamAchievementId, TeamAchievement> = {
    // TEAM BUILDING (6 achievements)
    'team_first_member': {
        id: 'team_first_member',
        name: 'Welcome Aboard!',
        description: 'Invite your first team member',
        tier: 1,
        xpReward: ACHIEVEMENT_XP_REWARDS[1],
        category: 'team-building',
        icon: '👋',
    },
    'team_5_members': {
        id: 'team_5_members',
        name: 'Growing Team',
        description: 'Reach 5 team members',
        tier: 2,
        xpReward: ACHIEVEMENT_XP_REWARDS[2],
        category: 'team-building',
        icon: '👥',
    },
    'team_10_members': {
        id: 'team_10_members',
        name: 'Dream Team',
        description: 'Reach 10 team members',
        tier: 3,
        xpReward: ACHIEVEMENT_XP_REWARDS[3],
        category: 'team-building',
        icon: '🏆',
    },
    'team_first_week': {
        id: 'team_first_week',
        name: 'Week One',
        description: 'Team active for 7 days',
        tier: 1,
        xpReward: ACHIEVEMENT_XP_REWARDS[1],
        category: 'team-building',
        icon: '📅',
    },
    'team_first_month': {
        id: 'team_first_month',
        name: 'Monthly Milestone',
        description: 'Team active for 30 days',
        tier: 2,
        xpReward: ACHIEVEMENT_XP_REWARDS[2],
        category: 'team-building',
        icon: '🗓️',
    },
    'team_first_year': {
        id: 'team_first_year',
        name: 'Anniversary',
        description: 'Team active for 365 days',
        tier: 4,
        xpReward: ACHIEVEMENT_XP_REWARDS[4],
        category: 'team-building',
        icon: '🎉',
    },

    // COLLABORATION (5 achievements)
    'collab_10_shared_tasks': {
        id: 'collab_10_shared_tasks',
        name: 'Task Master',
        description: 'Complete 10 shared tasks as a team',
        tier: 1,
        xpReward: ACHIEVEMENT_XP_REWARDS[1],
        category: 'collaboration',
        icon: '✅',
    },
    'collab_50_shared_tasks': {
        id: 'collab_50_shared_tasks',
        name: 'Collaboration Champion',
        description: 'Complete 50 shared tasks as a team',
        tier: 3,
        xpReward: ACHIEVEMENT_XP_REWARDS[3],
        category: 'collaboration',
        icon: '🤝',
    },
    'collab_10_meetings': {
        id: 'collab_10_meetings',
        name: 'Meeting Mavens',
        description: 'Log 10 team meetings',
        tier: 1,
        xpReward: ACHIEVEMENT_XP_REWARDS[1],
        category: 'collaboration',
        icon: '📞',
    },
    'collab_shared_contact': {
        id: 'collab_shared_contact',
        name: 'Connected',
        description: 'Share your first contact with the team',
        tier: 1,
        xpReward: ACHIEVEMENT_XP_REWARDS[1],
        category: 'collaboration',
        icon: '🔗',
    },
    'collab_shared_deal': {
        id: 'collab_shared_deal',
        name: 'Deal Flow',
        description: 'Share your first deal with the team',
        tier: 1,
        xpReward: ACHIEVEMENT_XP_REWARDS[1],
        category: 'collaboration',
        icon: '💼',
    },

    // FINANCIAL (5 achievements)
    'finance_10k_gmv': {
        id: 'finance_10k_gmv',
        name: 'First $10K GMV',
        description: 'Reach $10,000 in GMV as a team',
        tier: 2,
        xpReward: ACHIEVEMENT_XP_REWARDS[2],
        category: 'financial',
        icon: '💰',
    },
    'finance_100k_gmv': {
        id: 'finance_100k_gmv',
        name: 'Six Figures!',
        description: 'Reach $100,000 in GMV',
        tier: 3,
        xpReward: ACHIEVEMENT_XP_REWARDS[3],
        category: 'financial',
        icon: '💎',
    },
    'finance_1m_gmv': {
        id: 'finance_1m_gmv',
        name: 'Million Dollar Team',
        description: 'Reach $1,000,000 in GMV',
        tier: 4,
        xpReward: ACHIEVEMENT_XP_REWARDS[4],
        category: 'financial',
        icon: '🚀',
    },
    'finance_10k_mrr': {
        id: 'finance_10k_mrr',
        name: 'Recurring Revenue',
        description: 'Reach $10,000 MRR',
        tier: 3,
        xpReward: ACHIEVEMENT_XP_REWARDS[3],
        category: 'financial',
        icon: '📈',
    },
    'finance_expense_tracking': {
        id: 'finance_expense_tracking',
        name: 'Budget Conscious',
        description: 'Track 50 team expenses',
        tier: 2,
        xpReward: ACHIEVEMENT_XP_REWARDS[2],
        category: 'financial',
        icon: '📊',
    },

    // PRODUCTIVITY (5 achievements)
    'productivity_100_tasks': {
        id: 'productivity_100_tasks',
        name: 'Century Club',
        description: 'Complete 100 tasks as a team',
        tier: 2,
        xpReward: ACHIEVEMENT_XP_REWARDS[2],
        category: 'productivity',
        icon: '💯',
    },
    'productivity_500_tasks': {
        id: 'productivity_500_tasks',
        name: 'Task Force',
        description: 'Complete 500 tasks as a team',
        tier: 3,
        xpReward: ACHIEVEMENT_XP_REWARDS[3],
        category: 'productivity',
        icon: '⚡',
    },
    'productivity_daily_streak_7': {
        id: 'productivity_daily_streak_7',
        name: 'Week Warrior',
        description: '7-day team activity streak',
        tier: 2,
        xpReward: ACHIEVEMENT_XP_REWARDS[2],
        category: 'productivity',
        icon: '🔥',
    },
    'productivity_daily_streak_30': {
        id: 'productivity_daily_streak_30',
        name: 'Monthly Momentum',
        description: '30-day team activity streak',
        tier: 3,
        xpReward: ACHIEVEMENT_XP_REWARDS[3],
        category: 'productivity',
        icon: '🌟',
    },
    'productivity_10_documents': {
        id: 'productivity_10_documents',
        name: 'Documentation Masters',
        description: 'Upload 10 shared documents',
        tier: 1,
        xpReward: ACHIEVEMENT_XP_REWARDS[1],
        category: 'productivity',
        icon: '📄',
    },

    // ENGAGEMENT (4 achievements)
    'engage_all_active_week': {
        id: 'engage_all_active_week',
        name: 'All Hands',
        description: 'All team members active in one week',
        tier: 2,
        xpReward: ACHIEVEMENT_XP_REWARDS[2],
        category: 'engagement',
        icon: '🙌',
    },
    'engage_ai_power_users': {
        id: 'engage_ai_power_users',
        name: 'AI Enthusiasts',
        description: 'Team uses 1000 AI sessions',
        tier: 3,
        xpReward: ACHIEVEMENT_XP_REWARDS[3],
        category: 'engagement',
        icon: '🤖',
    },
    'engage_marketing_launch': {
        id: 'engage_marketing_launch',
        name: 'Launch Party',
        description: 'Complete first marketing campaign as team',
        tier: 1,
        xpReward: ACHIEVEMENT_XP_REWARDS[1],
        category: 'engagement',
        icon: '🎯',
    },
    'engage_crm_100_contacts': {
        id: 'engage_crm_100_contacts',
        name: 'Network Effect',
        description: 'Reach 100 CRM contacts as team',
        tier: 2,
        xpReward: ACHIEVEMENT_XP_REWARDS[2],
        category: 'engagement',
        icon: '🌐',
    },
};

// Helper to get achievement by ID
export function getTeamAchievement(id: TeamAchievementId): TeamAchievement {
    return TEAM_ACHIEVEMENTS[id];
}

// Get all achievements by category
export function getAchievementsByCategory(category: TeamAchievement['category']): TeamAchievement[] {
    return Object.values(TEAM_ACHIEVEMENTS).filter(a => a.category === category);
}

// Get all achievements as array
export function getAllTeamAchievements(): TeamAchievement[] {
    return Object.values(TEAM_ACHIEVEMENTS);
}
