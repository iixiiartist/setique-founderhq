import { TabType } from './constants';

// Re-export TabType to resolve import errors in other components.
export type { TabType };

export type Priority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Todo' | 'InProgress' | 'Done';

export interface Note {
    text: string;
    timestamp: number;
    userId?: string;  // Author of the note
    userName?: string;  // Display name of the author
}

export interface Meeting {
    id: string;
    timestamp: number;
    title: string;
    attendees: string;
    summary: string; // Markdown
}

// TaskCollectionName is defined later in this file for AI Function Calling types
export interface Task {
    id: string;
    text: string;
    status: TaskStatus;
    priority: Priority;
    category: 'platformTasks' | 'investorTasks' | 'customerTasks' | 'partnerTasks' | 'marketingTasks' | 'financialTasks'; // Required category for organizing tasks
    createdAt: number;
    completedAt?: number;
    dueDate?: string; // YYYY-MM-DD
    dueTime?: string; // HH:MM (24-hour format)
    notes: Note[];
    crmItemId?: string;
    contactId?: string;
    userId?: string; // User who created the task (for permission checks)
    assignedTo?: string; // User ID this task is assigned to
    assignedToName?: string; // Name of assigned user (for display)
}

export interface Contact {
    id: string;
    crmItemId: string;
    name: string;
    email: string;
    phone?: string;
    title?: string;
    linkedin: string;
    notes: Note[];
    meetings: Meeting[];
    assignedTo?: string | null;
    assignedToName?: string | null;
    createdByName?: string | null;
}

export interface BaseCrmItem {
    id: string;
    company: string;
    contacts: Contact[];
    priority: Priority;
    status: string;
    nextAction?: string;
    nextActionDate?: string;
    nextActionTime?: string; // HH:MM (24-hour format)
    createdAt: number;
    notes: Note[];
    assignedTo?: string | null;
    assignedToName?: string | null;
}

export interface Investor extends BaseCrmItem {
    checkSize: number;
}

export interface Customer extends BaseCrmItem {
    dealValue: number;
}

export interface Partner extends BaseCrmItem {
    opportunity: string;
}

export type AnyCrmItem = Investor | Customer | Partner;

export interface MarketingItem {
    id: string;
    title: string;
    type: 'Blog Post' | 'Newsletter' | 'Social Campaign' | 'Webinar' | 'Other';
    status: 'Planned' | 'In Progress' | 'Completed' | 'Published' | 'Cancelled';
    createdAt: number;
    notes: Note[];
    dueDate?: string; // YYYY-MM-DD
    dueTime?: string; // HH:MM (24-hour format)
}

export type CalendarTaskEvent = Task & {
    tag: string;
    type: 'task';
    title: string;
};

export type CalendarMarketingEvent = Omit<MarketingItem, 'type'> & {
    type: 'marketing';
    tag: string;
    contentType: MarketingItem['type']; // Stores the original marketing type (Blog Post, Newsletter, etc.)
};

export type CalendarMeetingEvent = Meeting & {
    dueDate: string;
    tag: string;
    type: 'meeting';
    companyName: string;
    contactName: string;
    crmItemId: string;
    contactId: string;
};

export type CalendarCrmEvent = BaseCrmItem & {
    dueDate: string; // Maps from nextActionDate
    tag: string; // 'Investor' | 'Customer' | 'Partner'
    type: 'crm-action';
    title: string; // Maps from nextAction
    companyName: string; // Maps from company
};

export type CalendarEvent =
    | CalendarTaskEvent
    | CalendarMarketingEvent
    | CalendarMeetingEvent
    | CalendarCrmEvent;

export interface FinancialLog {
    id: string;
    date: string; // YYYY-MM-DD
    mrr: number;
    gmv: number;
    signups: number;
    userId?: string; // User who created the log
    userName?: string; // Display name of user
}

export type ExpenseCategory = 
    'Software/SaaS' | 
    'Marketing' | 
    'Office' | 
    'Legal' | 
    'Contractors' | 
    'Travel' | 
    'Meals' | 
    'Equipment' | 
    'Subscriptions' | 
    'Other';

export type PaymentMethod = 
    'Credit Card' | 
    'Debit Card' | 
    'Bank Transfer' | 
    'Cash' | 
    'PayPal' | 
    'Other';

export interface Expense {
    id: string;
    date: string; // YYYY-MM-DD
    category: ExpenseCategory;
    amount: number;
    description: string;
    vendor?: string;
    paymentMethod?: PaymentMethod;
    receiptDocumentId?: string;
    notes: Note[];
}

export type WorkspaceRole = 'owner' | 'member';

export type PlanType = 
    | 'free' 
    | 'pro-individual' 
    | 'power-individual' 
    | 'team-starter' 
    | 'team-pro';

export interface Workspace {
    id: string;
    name: string;
    planType: PlanType;
    ownerId: string;
    createdAt: number;
    seatCount: number;
    aiUsageCount: number;
    aiUsageResetDate: number;
    storageBytesUsed: number;
    fileCount: number;
    teamXp: number;
    teamLevel: number;
}

export interface WorkspaceMember {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    joinedAt: number;
    invitedBy?: string;
    // Populated from profiles
    fullName?: string;
    email?: string;
    avatarUrl?: string;
}

export type TeamAchievementId = 
    // Team Building (6)
    | 'team_first_member'
    | 'team_5_members'
    | 'team_10_members'
    | 'team_first_week'
    | 'team_first_month'
    | 'team_first_year'
    // Collaboration (5)
    | 'collab_10_shared_tasks'
    | 'collab_50_shared_tasks'
    | 'collab_10_meetings'
    | 'collab_shared_contact'
    | 'collab_shared_deal'
    // Financial (5)
    | 'finance_10k_gmv'
    | 'finance_100k_gmv'
    | 'finance_1m_gmv'
    | 'finance_10k_mrr'
    | 'finance_expense_tracking'
    // Productivity (5)
    | 'productivity_100_tasks'
    | 'productivity_500_tasks'
    | 'productivity_daily_streak_7'
    | 'productivity_daily_streak_30'
    | 'productivity_10_documents'
    // Engagement (4)
    | 'engage_all_active_week'
    | 'engage_ai_power_users'
    | 'engage_marketing_launch'
    | 'engage_crm_100_contacts';

export interface TeamAchievement {
    id: TeamAchievementId;
    name: string;
    description: string;
    tier: 1 | 2 | 3 | 4; // Tier determines XP reward
    xpReward: number;
    category: 'team-building' | 'collaboration' | 'financial' | 'productivity' | 'engagement';
    icon?: string;
}

export interface WorkspaceAchievement {
    id: string;
    workspaceId: string;
    achievementId: TeamAchievementId;
    unlockedAt: number;
    unlockedByUserId?: string;
    metadata?: Record<string, any>;
    // Populated from achievement definition
    achievementName?: string;
    achievementDescription?: string;
    xpReward?: number;
    // Populated from user profile
    unlockedByName?: string;
    unlockedByEmail?: string;
}

export type CompanySize = 
    | '1-10 employees'
    | '11-50 employees'
    | '51-200 employees'
    | '201-500 employees'
    | '500+ employees'
    | 'Just me';

export type BusinessModel = 
    | 'B2B SaaS'
    | 'B2C SaaS'
    | 'Marketplace'
    | 'E-commerce'
    | 'Consulting/Services'
    | 'Agency'
    | 'Hardware'
    | 'Other';

export type GrowthStage = 
    | 'Idea Stage'
    | 'Building MVP'
    | 'Early Traction'
    | 'Growth Stage'
    | 'Scaling'
    | 'Mature';

export type PrimaryGoal = 
    | 'Acquire First Customers'
    | 'Achieve Product-Market Fit'
    | 'Grow Revenue'
    | 'Raise Funding'
    | 'Build Product'
    | 'Hire Team'
    | 'Expand Market';

export type RemotePolicy = 
    | 'Fully Remote'
    | 'Hybrid'
    | 'In-Office'
    | 'Remote-First';

// Subscription Types
export type SubscriptionStatus = 
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'trialing'
    | 'incomplete'
    | 'incomplete_expired';

export interface Subscription {
    id: string;
    workspaceId: string;
    createdAt: number;
    updatedAt: number;
    
    // Plan Information
    planType: PlanType;
    
    // Stripe Integration
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    
    // Subscription Status
    status: SubscriptionStatus;
    
    // Team Plan Details
    seatCount: number;
    usedSeats: number;
    
    // Billing Periods
    currentPeriodStart?: number;
    currentPeriodEnd?: number;
    trialStart?: number;
    trialEnd?: number;
    canceledAt?: number;
    cancelAtPeriodEnd: boolean;
    
    // Usage Tracking
    aiRequestsUsed: number;
    aiRequestsLimit?: number; // undefined = unlimited
    aiRequestsResetAt: number;
    
    storageBytesUsed: number;
    storageBytesLimit?: number; // undefined = unlimited
    
    fileCountUsed: number;
    fileCountLimit?: number; // undefined = unlimited
    
    // Metadata
    metadata?: Record<string, any>;
}

export interface BusinessProfile {
    id: string;
    workspaceId: string;
    createdAt: number;
    updatedAt: number;
    
    // Basic Information
    companyName: string;
    industry?: string;
    companySize?: CompanySize;
    foundedYear?: number;
    website?: string;
    
    // Business Model & Strategy
    businessModel?: BusinessModel;
    description?: string;
    targetMarket?: string;
    valueProposition?: string;
    
    // Goals & Challenges
    primaryGoal?: PrimaryGoal;
    keyChallenges?: string;
    growthStage?: GrowthStage;
    
    // Revenue & Metrics
    currentMrr?: number;
    targetMrr?: number;
    currentArr?: number;
    customerCount?: number;
    
    // Team & Culture
    teamSize?: number;
    remotePolicy?: RemotePolicy;
    companyValues?: string[];
    
    // Additional Context
    techStack?: string[];
    competitors?: string[];
    uniqueDifferentiators?: string;
    
    // Status
    isComplete: boolean;
    completedAt?: number;
}

export interface SettingsData {
    desktopNotifications: boolean;
    quickLinks?: QuickLink[];
}

export interface QuickLink {
    id: string;
    text: string;
    href: string;
    iconChar: string;
    iconBg: string;
    iconColor: string;
}

export interface Document {
    id: string;
    name: string;
    mimeType: string;
    content: string; // base64 encoded
    uploadedAt: number;
    module: TabType;
    companyId?: string;
    contactId?: string;
    uploadedBy?: string; // User ID who uploaded the document
    uploadedByName?: string; // Display name of uploader
    notes: Note[];
}

export type AchievementId = 
    'first-task' | 'first-investor' | 'first-customer' | 'first-partner' |
    'ten-tasks' | 'first-deal' | 'content-machine' |
    'streak-3' | 'streak-7' | 'streak-30' |
    'level-2' | 'level-5' | 'level-10';


export interface GamificationData {
    streak: number;
    lastActivityDate: string | null; // YYYY-MM-DD
    xp: number;
    level: number;
    achievements: AchievementId[];
}

export interface DashboardData {
    platformTasks: Task[];
    investors: Investor[];
    investorTasks: Task[];
    customers: Customer[];
    customerTasks: Task[];
    partners: Partner[];
    partnerTasks: Task[];
    marketing: MarketingItem[];
    marketingTasks: Task[];
    financials: FinancialLog[];
    expenses: Expense[];
    financialTasks: Task[];
    documents: Document[];
    settings: SettingsData;
    gamification: GamificationData;
}

// Types for AI Function Calling
export type CrmCollectionName = 'investors' | 'customers' | 'partners';
export type TaskCollectionName = 'platformTasks' | 'investorTasks' | 'customerTasks' | 'partnerTasks' | 'marketingTasks' | 'financialTasks';
export type NoteableCollectionName = CrmCollectionName | TaskCollectionName | 'marketing' | 'contacts' | 'documents' | 'expenses';
export type DeletableCollectionName = NoteableCollectionName | 'financials';

export interface AppActions {
    createTask: (category: TaskCollectionName, text: string, priority: Priority, crmItemId?: string, contactId?: string, dueDate?: string, assignedTo?: string, dueTime?: string) => Promise<{ success: boolean; message: string; }>;
    updateTask: (taskId: string, updates: Partial<Pick<Task, 'text' | 'status' | 'priority' | 'dueDate' | 'dueTime' | 'assignedTo' | 'category'>>) => Promise<{ success: boolean; message: string; }>;
    deleteTask: (taskId: string) => Promise<{ success: boolean; message: string; }>;
    addNote: (collection: NoteableCollectionName, itemId: string, noteText: string, crmItemId?: string) => Promise<{ success: boolean; message: string; }>;
    updateNote: (collection: NoteableCollectionName, itemId: string, noteTimestamp: number, newText: string, crmItemId?: string) => Promise<{ success: boolean; message: string; }>;
    deleteNote: (collection: NoteableCollectionName, itemId: string, noteTimestamp: number, crmItemId?: string) => Promise<{ success: boolean; message: string; }>;
    createCrmItem: (collection: CrmCollectionName, data: Partial<Omit<AnyCrmItem, 'id' | 'createdAt' | 'notes' | 'contacts'>>) => Promise<{ success: boolean; message: string; }>;
    updateCrmItem: (collection: CrmCollectionName, itemId: string, updates: Partial<AnyCrmItem>) => Promise<{ success: boolean; message: string; }>;
    createContact: (collection: CrmCollectionName, crmItemId: string, contactData: Omit<Contact, 'id' | 'crmItemId' | 'notes' | 'meetings'>) => Promise<{ success: boolean; message: string }>;
    updateContact: (collection: CrmCollectionName, crmItemId: string, contactId: string, updates: Partial<Contact>) => Promise<{ success: boolean; message: string }>;
    deleteContact: (collection: CrmCollectionName, crmItemId: string, contactId: string) => Promise<{ success: boolean; message: string }>;
    createMeeting: (collection: CrmCollectionName, crmItemId: string, contactId: string, meetingData: Omit<Meeting, 'id'>) => Promise<{ success: boolean; message: string; }>;
    updateMeeting: (collection: CrmCollectionName, crmItemId: string, contactId: string, meetingId: string, updates: Partial<Omit<Meeting, 'id'>>) => Promise<{ success: boolean; message: string; }>;
    deleteMeeting: (collection: CrmCollectionName, crmItemId: string, contactId: string, meetingId: string) => Promise<{ success: boolean; message: string; }>;
    logFinancials: (data: Omit<FinancialLog, 'id'>) => Promise<{ success: boolean; message: string; }>;
    createExpense: (data: Omit<Expense, 'id' | 'notes'>) => Promise<{ success: boolean; message: string; }>;
    updateExpense: (expenseId: string, updates: Partial<Omit<Expense, 'id' | 'notes'>>) => Promise<{ success: boolean; message: string; }>;
    deleteItem: (collection: DeletableCollectionName, itemId: string) => Promise<{ success: boolean; message: string; }>;
    createMarketingItem: (itemData: Omit<MarketingItem, 'id' | 'createdAt' | 'notes'>) => Promise<{ success: boolean; message: string; }>;
    updateMarketingItem: (itemId: string, updates: Partial<Omit<MarketingItem, 'id' | 'createdAt' | 'notes'>>) => Promise<{ success: boolean; message: string; }>;
    deleteMarketingItem: (itemId: string) => Promise<{ success: boolean; message: string; }>;
    updateSettings: (updates: Partial<SettingsData>) => Promise<{ success: boolean; message: string; }>;
    resetGamification: () => Promise<{ success: boolean; message: string; }>;
    uploadDocument: (name: string, mimeType: string, content: string, module: TabType, companyId?: string, contactId?: string) => Promise<{ success: boolean; message: string; }>;
    updateDocument: (docId: string, name: string, mimeType: string, content: string) => Promise<{ success: boolean; message: string; }>;
    deleteDocument: (docId: string) => Promise<{ success: boolean; message: string; }>;
    getFileContent: (fileId: string) => Promise<{ success: boolean; message: string; content?: string; }>;
}
