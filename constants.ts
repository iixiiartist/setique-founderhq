import { DashboardData, AchievementId, TeamAchievementId, TeamAchievement } from './types';

export const Tab = {
    Dashboard: 'dashboard',
    Calendar: 'calendar',
    Platform: 'platform-dev',
    Investors: 'investor-crm',
    Customers: 'customer-crm',
    Partners: 'partnerships',
    Marketing: 'marketing',
    Financials: 'financials',
    Documents: 'documents',
    Achievements: 'achievements',
    Settings: 'settings',
    Admin: 'admin',
} as const;

export type TabType = typeof Tab[keyof typeof Tab];

export interface NavItem {
    id: TabType;
    label: string;
}

export const NAV_ITEMS: NavItem[] = [
    { id: Tab.Dashboard, label: 'Dashboard' },
    { id: Tab.Calendar, label: 'Calendar' },
    { id: Tab.Platform, label: 'Platform Development' },
    { id: Tab.Investors, label: 'Investor CRM' },
    { id: Tab.Customers, label: 'Customer CRM' },
    { id: Tab.Partners, label: 'Partnerships' },
    { id: Tab.Marketing, label: 'Marketing' },
    { id: Tab.Financials, label: 'Financials' },
    { id: Tab.Documents, label: 'File Library' },
    { id: Tab.Achievements, label: 'Achievements' },
    { id: Tab.Settings, label: 'Settings' },
    { id: Tab.Admin, label: '🔐 Admin' },
];

export const EMPTY_DASHBOARD_DATA: DashboardData = {
    platformTasks: [],
    investors: [],
    investorTasks: [],
    customers: [],
    customerTasks: [],
    partners: [],
    partnerTasks: [],
    marketing: [],
    marketingTasks: [],
    financials: [],
    expenses: [],
    financialTasks: [],
    documents: [],
    documentsMetadata: [],
    settings: {
        desktopNotifications: false,
        autoSaveAttachments: true, // Auto-save by default
        maxFileSizeMB: 10, // 10MB limit to control storage costs
    },
    gamification: {
        streak: 0,
        lastActivityDate: null,
        xp: 0,
        level: 1,
        achievements: [],
    }
};

export const ACHIEVEMENTS: Record<AchievementId, { title: string; description: string; icon: string; }> = {
    'first-task': { title: 'Getting Started', description: 'You completed your first task!', icon: '✅' },
    'ten-tasks': { title: 'Task Master', description: 'You completed 10 tasks.', icon: '🏆' },
    'first-investor': { title: 'On the Radar', description: 'Added your first potential investor.', icon: '📈' },
    'first-customer': { title: 'Open for Business', description: 'Added your first potential customer.', icon: '💼' },
    'first-partner': { title: 'Stronger Together', description: 'Added your first potential partner.', icon: '🤝' },
    'first-deal': { title: 'Deal Closer', description: 'You won your first customer deal!', icon: '💰' },
    'content-machine': { title: 'Content Machine', description: 'You published 5 marketing items.', icon: '✍️' },
    'streak-3': { title: 'Heating Up', description: 'Maintain a 3-day activity streak.', icon: '🔥' },
    'streak-7': { title: 'On Fire', description: 'Maintain a 7-day activity streak.', icon: '🔥🔥' },
    'streak-30': { title: 'Unstoppable', description: 'Maintain a 30-day activity streak!', icon: '🔥🔥🔥' },
    'level-2': { title: 'Level Up!', description: 'You reached Founder Level 2.', icon: '🥈' },
    'level-5': { title: 'Seasoned Founder', description: 'You reached Founder Level 5.', icon: '🏅' },
    'level-10': { title: 'Veteran Founder', description: 'You reached Founder Level 10.', icon: '🎖️' },
};

export const TEAM_ACHIEVEMENTS: Record<TeamAchievementId, TeamAchievement> = {
    // Team Building (6 achievements)
    'team_first_member': {
        id: 'team_first_member',
        name: 'First Teammate',
        description: 'Invited your first team member to the workspace',
        tier: 1,
        xpReward: 50,
        category: 'team-building',
        icon: '👥'
    },
    'team_5_members': {
        id: 'team_5_members',
        name: 'Growing Team',
        description: 'Reached 5 team members in your workspace',
        tier: 2,
        xpReward: 100,
        category: 'team-building',
        icon: '👨‍👩‍👧‍👦'
    },
    'team_10_members': {
        id: 'team_10_members',
        name: 'Full Squad',
        description: 'Built a team of 10+ members',
        tier: 3,
        xpReward: 250,
        category: 'team-building',
        icon: '🎖️'
    },
    'team_first_week': {
        id: 'team_first_week',
        name: 'First Week Together',
        description: 'Your team has been active for 1 week',
        tier: 1,
        xpReward: 75,
        category: 'team-building',
        icon: '📅'
    },
    'team_first_month': {
        id: 'team_first_month',
        name: 'One Month Strong',
        description: 'Your team has been collaborating for 1 month',
        tier: 2,
        xpReward: 150,
        category: 'team-building',
        icon: '🗓️'
    },
    'team_first_year': {
        id: 'team_first_year',
        name: 'Anniversary!',
        description: 'Your team has been working together for 1 year',
        tier: 4,
        xpReward: 500,
        category: 'team-building',
        icon: '🎂'
    },

    // Collaboration (5 achievements)
    'collab_10_shared_tasks': {
        id: 'collab_10_shared_tasks',
        name: 'Task Sharers',
        description: 'Team completed 10 shared tasks together',
        tier: 1,
        xpReward: 50,
        category: 'collaboration',
        icon: '✅'
    },
    'collab_50_shared_tasks': {
        id: 'collab_50_shared_tasks',
        name: 'Collaboration Champions',
        description: 'Team completed 50 shared tasks together',
        tier: 3,
        xpReward: 200,
        category: 'collaboration',
        icon: '🏆'
    },
    'collab_10_meetings': {
        id: 'collab_10_meetings',
        name: 'Meeting Mavens',
        description: 'Logged 10 team meetings with notes',
        tier: 2,
        xpReward: 100,
        category: 'collaboration',
        icon: '📝'
    },
    'collab_shared_contact': {
        id: 'collab_shared_contact',
        name: 'Shared Network',
        description: 'Team shared their first contact/lead',
        tier: 1,
        xpReward: 50,
        category: 'collaboration',
        icon: '🤝'
    },
    'collab_shared_deal': {
        id: 'collab_shared_deal',
        name: 'Team Victory',
        description: 'Team closed a deal together',
        tier: 2,
        xpReward: 150,
        category: 'collaboration',
        icon: '💼'
    },

    // Financial (5 achievements)
    'finance_10k_gmv': {
        id: 'finance_10k_gmv',
        name: 'First $10K',
        description: 'Team reached $10K in total GMV',
        tier: 2,
        xpReward: 100,
        category: 'financial',
        icon: '💵'
    },
    'finance_100k_gmv': {
        id: 'finance_100k_gmv',
        name: 'Six Figures',
        description: 'Team reached $100K in total GMV',
        tier: 3,
        xpReward: 300,
        category: 'financial',
        icon: '💰'
    },
    'finance_1m_gmv': {
        id: 'finance_1m_gmv',
        name: 'Million Dollar Team',
        description: 'Team reached $1M in total GMV!',
        tier: 4,
        xpReward: 1000,
        category: 'financial',
        icon: '🎯'
    },
    'finance_10k_mrr': {
        id: 'finance_10k_mrr',
        name: 'Recurring Revenue',
        description: 'Team reached $10K MRR',
        tier: 3,
        xpReward: 250,
        category: 'financial',
        icon: '📈'
    },
    'finance_expense_tracking': {
        id: 'finance_expense_tracking',
        name: 'Financial Discipline',
        description: 'Team tracked 50+ expenses',
        tier: 2,
        xpReward: 100,
        category: 'financial',
        icon: '💳'
    },

    // Productivity (5 achievements)
    'productivity_100_tasks': {
        id: 'productivity_100_tasks',
        name: 'Century Club',
        description: 'Team completed 100 total tasks',
        tier: 2,
        xpReward: 100,
        category: 'productivity',
        icon: '💯'
    },
    'productivity_500_tasks': {
        id: 'productivity_500_tasks',
        name: 'Task Force',
        description: 'Team completed 500 total tasks',
        tier: 3,
        xpReward: 300,
        category: 'productivity',
        icon: '🚀'
    },
    'productivity_daily_streak_7': {
        id: 'productivity_daily_streak_7',
        name: 'Week Warriors',
        description: 'All team members active for 7 days straight',
        tier: 2,
        xpReward: 150,
        category: 'productivity',
        icon: '🔥'
    },
    'productivity_daily_streak_30': {
        id: 'productivity_daily_streak_30',
        name: 'Monthly Marathon',
        description: 'All team members active for 30 days straight',
        tier: 4,
        xpReward: 500,
        category: 'productivity',
        icon: '🔥🔥🔥'
    },
    'productivity_10_documents': {
        id: 'productivity_10_documents',
        name: 'Document Library',
        description: 'Team uploaded 10+ shared documents',
        tier: 1,
        xpReward: 50,
        category: 'productivity',
        icon: '📚'
    },

    // Engagement (4 achievements)
    'engage_all_active_week': {
        id: 'engage_all_active_week',
        name: 'Full Team Active',
        description: 'All team members active in the same week',
        tier: 2,
        xpReward: 100,
        category: 'engagement',
        icon: '⚡'
    },
    'engage_ai_power_users': {
        id: 'engage_ai_power_users',
        name: 'AI Power Team',
        description: 'Team used AI assistant 100+ times',
        tier: 3,
        xpReward: 200,
        category: 'engagement',
        icon: '🤖'
    },
    'engage_marketing_launch': {
        id: 'engage_marketing_launch',
        name: 'Marketing Launch',
        description: 'Team launched their first marketing campaign',
        tier: 2,
        xpReward: 100,
        category: 'engagement',
        icon: '🎉'
    },
    'engage_crm_100_contacts': {
        id: 'engage_crm_100_contacts',
        name: 'Network Builders',
        description: 'Team added 100+ total CRM contacts',
        tier: 3,
        xpReward: 200,
        category: 'engagement',
        icon: '📇'
    },
};

export const TASK_TAG_BG_COLORS: Record<string, string> = {
    Platform: 'bg-blue-300',
    Investor: 'bg-green-300',
    Customer: 'bg-orange-300',
    Partner: 'bg-purple-300',
    Marketing: 'bg-pink-300',
    Financials: 'bg-yellow-300',
};

export const TASK_TAG_BORDER_COLORS: Record<string, string> = {
    Platform: 'border-t-blue-400',
    Investor: 'border-t-green-400',
    Customer: 'border-t-orange-400',
    Partner: 'border-t-purple-400',
    Marketing: 'border-t-pink-400',
    Financials: 'border-t-yellow-400',
};