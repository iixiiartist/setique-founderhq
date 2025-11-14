import { DashboardData } from './types';

export const Tab = {
    Dashboard: 'dashboard',
    Calendar: 'calendar',
    Platform: 'platform-dev',
    Investors: 'investor-crm',
    Customers: 'customer-crm',
    Partners: 'partnerships',
    Marketing: 'marketing',
    Financials: 'financials',
    Workspace: 'workspace',
    Documents: 'documents',
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
    { id: Tab.Workspace, label: 'GTM Docs' },
    { id: Tab.Documents, label: 'File Library' },
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
    revenueTransactions: [],
    financialForecasts: [],
    budgetPlans: [],
    campaignAttributions: [],
    marketingAnalytics: [],
    marketingCalendarLinks: [],
    deals: []
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

// GTM Docs Constants
export const DOC_TYPE_LABELS: Record<string, string> = {
    brief: 'GTM Brief',
    campaign: 'Campaign Plan',
    meeting_notes: 'Meeting Notes',
    battlecard: 'Battlecard',
    outbound_template: 'Outbound Template',
    icp_sheet: 'ICP Sheet',
    persona: 'Persona Profile',
    competitive_snapshot: 'Competitive Snapshot',
};

export const DOC_TYPE_ICONS: Record<string, string> = {
    brief: '📋',
    campaign: '🚀',
    meeting_notes: '📝',
    battlecard: '⚔️',
    outbound_template: '✉️',
    icp_sheet: '🎯',
    persona: '👤',
    competitive_snapshot: '🔍',
};

export const DOC_TYPE_DESCRIPTIONS: Record<string, string> = {
    brief: 'Comprehensive GTM strategy and launch brief',
    campaign: 'Marketing campaign planning and execution',
    meeting_notes: 'Meeting notes, action items, and decisions',
    battlecard: 'Competitive positioning and objection handling',
    outbound_template: 'Email templates and outbound messaging',
    icp_sheet: 'Ideal Customer Profile definition',
    persona: 'Detailed buyer persona and use cases',
    competitive_snapshot: 'Competitive landscape analysis',
};