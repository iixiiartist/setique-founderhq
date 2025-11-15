import type { TabType } from './constants';

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

export interface Subtask {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
    completedAt?: number;
}

// TaskCollectionName is defined later in this file for AI Function Calling types
export interface Task {
    id: string;
    text: string;
    status: TaskStatus;
    priority: Priority;
    category: 'productsServicesTasks' | 'investorTasks' | 'customerTasks' | 'partnerTasks' | 'marketingTasks' | 'financialTasks'; // Required category for organizing tasks
    createdAt: number;
    completedAt?: number;
    dueDate?: string; // YYYY-MM-DD
    dueTime?: string; // HH:MM (24-hour format)
    notes: Note[];
    subtasks?: Subtask[]; // Nested subtasks for sophisticated task management
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
    tags?: string[];
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

export interface Deal {
    id: string;
    workspaceId: string;
    title: string;
    crmItemId?: string; // Link to company/CRM item
    contactId?: string; // Primary contact for deal
    value: number;
    currency: string;
    stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
    probability: number; // 0-100
    expectedCloseDate?: string; // YYYY-MM-DD
    actualCloseDate?: string; // YYYY-MM-DD
    source?: string; // How deal was sourced (referral, inbound, outbound, etc)
    category: 'investment' | 'customer_deal' | 'partnership' | 'other';
    priority: Priority;
    assignedTo?: string | null;
    assignedToName?: string | null;
    createdAt: number;
    updatedAt: number;
    notes: Note[];
    tags?: string[];
    customFields?: Record<string, any>;
    
    // NEW: Product/Service linking
    productServiceId?: string;
    productServiceName?: string;
    quantity?: number;
    unitPrice?: number;
    discountPercent?: number;
    discountAmount?: number;
    taxAmount?: number;
    totalValue?: number;
}

// ============================================================================
// NEW: Products & Services Types
// ============================================================================

export type ProductServiceCategory = 'product' | 'service' | 'bundle';

export type ProductServiceStatus = 'active' | 'inactive' | 'discontinued' | 'draft' | 'archived' | 'out_of_stock';

export type ProductServiceType = 
    | 'digital'      // Downloads, software, digital content
    | 'physical'     // Physical goods requiring shipping
    | 'saas'         // Software as a Service
    | 'consulting'   // Professional services
    | 'package'      // Service packages (bundles)
    | 'subscription' // Recurring service/product
    | 'booking';     // Appointments, reservations

export type PricingModel = 
    | 'flat_rate'    // One-time fixed price
    | 'hourly'       // $/hour
    | 'daily'        // $/day
    | 'weekly'       // $/week
    | 'monthly'      // $/month (subscription)
    | 'annual'       // $/year (subscription)
    | 'tiered'       // Volume-based pricing
    | 'usage_based'  // Pay per use (API calls, etc.)
    | 'custom';      // Negotiated/custom pricing

export interface TieredPrice {
    minQuantity: number;
    maxQuantity?: number; // null = unlimited
    price: number;
    label?: string; // e.g., "1-10 users", "Enterprise"
}

export interface UsagePricing {
    metric: string; // e.g., 'api_calls', 'storage_gb', 'users'
    unitPrice: number;
    includedUnits?: number; // Free tier
    overagePrice?: number; // Price after free tier
}

export interface SubscriptionPlan {
    name: string; // 'Basic', 'Pro', 'Enterprise'
    price: number;
    billingCycle: 'monthly' | 'annual';
    features: string[];
    limits?: Record<string, number>; // { users: 10, storage_gb: 100 }
    isPopular?: boolean;
}

export interface ProductService {
    // Core
    id: string;
    workspaceId: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    
    // Basic Info
    name: string;
    description?: string;
    sku?: string;
    category: ProductServiceCategory;
    type: ProductServiceType;
    status: ProductServiceStatus;
    
    // Pricing
    pricingModel: PricingModel;
    basePrice?: number;
    currency: string;
    
    // Cost Structure
    costOfGoods?: number;
    costOfService?: number;
    overheadAllocation?: number;
    profitMarginPercent?: number;
    
    // Pricing Variants
    tieredPricing?: TieredPrice[];
    usagePricing?: UsagePricing[];
    subscriptionPlans?: SubscriptionPlan[];
    
    // Inventory
    inventoryTracked: boolean;
    quantityOnHand?: number;
    quantityReserved?: number;
    quantityAvailable?: number; // Computed
    reorderPoint?: number;
    reorderQuantity?: number;
    
    // Service Capacity
    capacityTracked: boolean;
    capacityUnit?: 'hours' | 'days' | 'projects' | 'seats';
    capacityTotal?: number;
    capacityBooked?: number;
    capacityAvailable?: number; // Computed
    capacityPeriod?: 'weekly' | 'monthly' | 'quarterly';
    
    // Tax & Compliance
    taxCode?: string;
    tariffCode?: string;
    isTaxable: boolean;
    taxRate?: number;
    
    // Metadata
    tags: string[];
    documentIds?: string[];
    imageUrl?: string;
    externalUrl?: string;
    
    // Analytics
    totalRevenue?: number;
    totalUnitsSold?: number;
    averageSaleValue?: number;
    lastSoldDate?: string;
    
    // Custom
    customFields?: Record<string, any>;
}

export interface ProductPriceHistory {
    id: string;
    productServiceId: string;
    changedAt: string;
    changedBy?: string;
    oldPrice: number;
    newPrice: number;
    reason?: 'promotion' | 'cost_increase' | 'market_adjustment' | 'seasonal' | 'other';
    effectiveFrom?: string;
    effectiveTo?: string;
}

export interface ProductServiceBundle {
    id: string;
    bundleId: string;
    componentId: string;
    quantity: number;
    discountPercent?: number;
    isOptional: boolean;
    displayOrder: number;
}

export interface MarketingItem {
    id: string;
    title: string;
    type: 'Blog Post' | 'Newsletter' | 'Social Campaign' | 'Webinar' | 'Product Launch' | 'Event' | 'Other';
    status: 'Planned' | 'In Progress' | 'Completed' | 'Published' | 'Cancelled';
    createdAt: number;
    notes: Note[];
    dueDate?: string; // YYYY-MM-DD
    dueTime?: string; // HH:MM (24-hour format)
    assignedTo?: string;
    assignedToName?: string;
    
    // NEW: Campaign details
    workspaceId?: string;
    campaignBudget?: number;
    actualSpend?: number;
    targetAudience?: string;
    channels?: ('email' | 'social' | 'paid_ads' | 'content' | 'events')[];
    goals?: string;
    kpis?: {
        impressions?: number;
        clicks?: number;
        engagements?: number;
        conversions?: number;
        revenue?: number;
    };
    
    // Links
    documentIds?: string[]; // Linked campaign documents
    calendarEventIds?: string[]; // Linked calendar events
    tags?: string[];
    parentCampaignId?: string; // For sub-campaigns
    
    // NEW: Product/Service linking
    productServiceIds?: string[]; // Can promote multiple products
    targetRevenue?: number;
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
    
    // NEW: Attribution fields
    workspaceId?: string;
    crmItemId?: string;
    marketingItemId?: string;
    expenseType?: 'operating' | 'marketing' | 'sales' | 'rd';
    isRecurring?: boolean;
    recurrencePeriod?: 'monthly' | 'quarterly' | 'annual';
    tags?: string[];
    
    // Denormalized for display
    companyName?: string;
    campaignTitle?: string;
}

// ============================================================================
// NEW: Financial Enhancement Types
// ============================================================================

export interface RevenueTransaction {
    id: string;
    workspaceId: string;
    userId: string;
    transactionDate: string; // YYYY-MM-DD
    amount: number;
    currency: string;
    transactionType: 'invoice' | 'payment' | 'refund' | 'recurring';
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    
    // NEW: Product/Service linking
    productServiceId?: string;
    quantity?: number;
    unitPrice?: number;
    
    // Attribution
    crmItemId?: string;
    contactId?: string;
    dealStage?: string;
    companyName?: string; // Denormalized for display
    
    // Invoice details
    invoiceNumber?: string;
    paymentMethod?: string;
    paymentDate?: string;
    dueDate?: string;
    
    // Categorization
    revenueCategory?: 'product_sale' | 'service_fee' | 'subscription' | 'consulting' | 'partnership' | 'other';
    productLine?: string;
    
    description?: string;
    notes: Note[];
    documentIds?: string[];
    
    createdAt: number;
    updatedAt: number;
}

export interface FinancialForecast {
    id: string;
    workspaceId: string;
    userId: string;
    forecastMonth: string; // YYYY-MM-DD (first day of month)
    forecastType: 'revenue' | 'expense' | 'runway';
    forecastedAmount: number;
    confidenceLevel: 'low' | 'medium' | 'high';
    basedOnDeals?: string[]; // Array of CRM item IDs
    assumptions?: string;
    createdAt: number;
    updatedAt: number;
}

export interface BudgetPlan {
    id: string;
    workspaceId: string;
    userId: string;
    budgetName: string;
    budgetPeriodStart: string; // YYYY-MM-DD
    budgetPeriodEnd: string; // YYYY-MM-DD
    category: ExpenseCategory;
    allocatedAmount: number;
    spentAmount: number;
    remainingAmount: number; // Calculated
    alertThreshold: number; // 0-1 (e.g., 0.8 for 80%)
    notes?: string;
    createdAt: number;
    updatedAt: number;
}

// ============================================================================
// NEW: Marketing Enhancement Types
// ============================================================================

export interface CampaignAttribution {
    id: string;
    workspaceId: string;
    marketingItemId: string;
    crmItemId: string;
    contactId?: string;
    attributionType: 'first_touch' | 'last_touch' | 'multi_touch';
    attributionWeight: number;
    interactionDate: number;
    conversionDate?: number;
    revenueAttributed: number;
    
    // UTM parameters
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    
    // Denormalized for display
    campaignTitle?: string;
    companyName?: string;
    
    createdAt: number;
    updatedAt: number;
}

export interface MarketingAnalytics {
    id: string;
    workspaceId: string;
    marketingItemId: string;
    analyticsDate: string; // YYYY-MM-DD
    
    // Metrics
    impressions: number;
    clicks: number;
    engagements: number;
    conversions: number;
    leadsGenerated: number;
    revenueGenerated: number;
    
    // Costs
    adSpend: number;
    
    // Calculated
    ctr: number; // Click-through rate
    conversionRate: number;
    roi: number; // Return on investment
    
    channel?: 'email' | 'social' | 'paid_ads' | 'content' | 'events' | 'other';
    
    createdAt: number;
    updatedAt: number;
}

export interface MarketingCalendarLink {
    id: string;
    workspaceId: string;
    marketingItemId: string;
    linkedType: 'task' | 'calendar_event' | 'milestone';
    linkedId: string;
    relationshipType: 'related' | 'deliverable' | 'milestone' | 'deadline';
    createdAt: number;
}

export type WorkspaceRole = 'owner' | 'member';

export type PlanType = 
    | 'free' 
    | 'power-individual' 
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
    
    // Phase 2.1: Business Context & Positioning
    targetCustomerProfile?: string;
    competitiveAdvantages?: string[];
    keyDifferentiators?: string[];
    marketPositioning?: string;
    
    // Phase 2.1: Monetization & Pricing
    monetizationModel?: 'subscription' | 'one-time' | 'usage-based' | 'freemium' | 'enterprise' | 'marketplace' | 'advertising' | 'hybrid';
    pricingTiers?: Array<{
        name: string;
        price: number;
        features: string[];
        billingCycle: string;
    }>;
    dealTypes?: string[];
    averageDealSize?: number;
    salesCycleDays?: number;
    
    // Phase 2.1: Products & Services
    coreProducts?: Array<{
        name: string;
        description: string;
        type: string;
        status: string;
    }>;
    serviceOfferings?: Array<{
        name: string;
        description: string;
        pricing: string;
    }>;
    
    // Status
    isComplete: boolean;
    completedAt?: number;
}

export interface SettingsData {
    desktopNotifications: boolean;
    quickLinks?: QuickLink[];
    autoSaveAttachments?: boolean; // Auto-save chat file attachments to library (default: true)
    maxFileSizeMB?: number; // Max file size for uploads in MB (default: 10)
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

// GTM Docs - Rich text document authoring system
export type DocType = 
    | 'brief'
    | 'campaign'
    | 'meeting_notes'
    | 'battlecard'
    | 'outbound_template'
    | 'icp_sheet'
    | 'persona'
    | 'competitive_snapshot';

export type DocVisibility = 'private' | 'team';

export type LinkedEntityType = 'task' | 'event' | 'crm' | 'chat' | 'contact';

export interface GTMDoc {
    id: string;
    workspaceId: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    docType: DocType;
    contentJson: any; // Tiptap JSON format
    contentPlain: string; // Plain text for search and AI
    visibility: DocVisibility;
    isTemplate: boolean;
    templateCategory?: string;
    tags: string[];
    searchVector?: string; // Not typically used in frontend
}

// Metadata-only version without heavy content (for lists/previews)
export interface GTMDocMetadata extends Omit<GTMDoc, 'contentJson' | 'contentPlain'> {
    // Adds preview if needed
    contentPreview?: string;
}

export interface GTMDocLink {
    id: string;
    docId: string;
    linkedEntityType: LinkedEntityType;
    linkedEntityId: string;
    createdAt: string;
}

// For displaying linked docs with entity details
export interface LinkedDoc extends GTMDocMetadata {
    linkedAt: string;
    linkId: string; // The gtm_doc_links.id for unlinking
}

export interface DashboardData {
    productsServicesTasks: Task[];
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
    documentsMetadata: Omit<Document, 'content'>[]; // Lightweight metadata for AI context
    settings: SettingsData;
    
    // NEW: Financial enhancement data
    revenueTransactions: RevenueTransaction[];
    financialForecasts: FinancialForecast[];
    budgetPlans: BudgetPlan[];
    
    // NEW: Marketing enhancement data
    campaignAttributions: CampaignAttribution[];
    marketingAnalytics: MarketingAnalytics[];
    marketingCalendarLinks: MarketingCalendarLink[];
    
    // NEW: Deal/Opportunity tracking
    deals: Deal[];
    
    // NEW: Products & Services
    productsServices: ProductService[];
    productPriceHistory: ProductPriceHistory[];
    productBundles: ProductServiceBundle[];
}

// Types for AI Function Calling
export type CrmCollectionName = 'investors' | 'customers' | 'partners';
export type TaskCollectionName = 'productsServicesTasks' | 'investorTasks' | 'customerTasks' | 'partnerTasks' | 'marketingTasks' | 'financialTasks';
export type NoteableCollectionName = CrmCollectionName | TaskCollectionName | 'marketing' | 'contacts' | 'documents' | 'expenses';
export type DeletableCollectionName = NoteableCollectionName | 'financials';

export interface AppActions {
    createTask: (category: TaskCollectionName, text: string, priority: Priority, crmItemId?: string, contactId?: string, dueDate?: string, assignedTo?: string, dueTime?: string, subtasks?: Subtask[]) => Promise<{ success: boolean; message: string; }>;
    updateTask: (taskId: string, updates: Partial<Pick<Task, 'text' | 'status' | 'priority' | 'dueDate' | 'dueTime' | 'assignedTo' | 'category' | 'subtasks'>>) => Promise<{ success: boolean; message: string; }>;
    deleteTask: (taskId: string) => Promise<{ success: boolean; message: string; }>;
    addNote: (collection: NoteableCollectionName, itemId: string, noteText: string, crmItemId?: string) => Promise<{ success: boolean; message: string; }>;
    updateNote: (collection: NoteableCollectionName, itemId: string, noteTimestamp: number, newText: string, crmItemId?: string) => Promise<{ success: boolean; message: string; }>;
    deleteNote: (collection: NoteableCollectionName, itemId: string, noteTimestamp: number, crmItemId?: string) => Promise<{ success: boolean; message: string; }>;
    createCrmItem: (collection: CrmCollectionName, data: Partial<Omit<AnyCrmItem, 'id' | 'createdAt' | 'notes' | 'contacts'>>) => Promise<{ success: boolean; message: string; itemId?: string; }>;
    updateCrmItem: (collection: CrmCollectionName, itemId: string, updates: Partial<AnyCrmItem>) => Promise<{ success: boolean; message: string; }>;
    createContact: (collection: CrmCollectionName, crmItemId: string, contactData: Omit<Contact, 'id' | 'crmItemId' | 'notes' | 'meetings'>) => Promise<{ success: boolean; message: string; contactId?: string; }>;
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
    uploadDocument: (name: string, mimeType: string, content: string, module: TabType, companyId?: string, contactId?: string) => Promise<{ success: boolean; message: string; }>;
    updateDocument: (docId: string, name: string, mimeType: string, content: string) => Promise<{ success: boolean; message: string; }>;
    deleteDocument: (docId: string) => Promise<{ success: boolean; message: string; }>;
    getFileContent: (fileId: string) => Promise<{ success: boolean; message: string; content?: string; }>;
    
    // NEW: Revenue transaction actions
    createRevenueTransaction: (data: Omit<RevenueTransaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; message: string; transactionId?: string; }>;
    updateRevenueTransaction: (transactionId: string, updates: Partial<RevenueTransaction>) => Promise<{ success: boolean; message: string; }>;
    deleteRevenueTransaction: (transactionId: string) => Promise<{ success: boolean; message: string; }>;
    
    // NEW: Financial forecast actions
    createFinancialForecast: (data: Omit<FinancialForecast, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; message: string; forecastId?: string; }>;
    updateFinancialForecast: (forecastId: string, updates: Partial<FinancialForecast>) => Promise<{ success: boolean; message: string; }>;
    deleteFinancialForecast: (forecastId: string) => Promise<{ success: boolean; message: string; }>;
    
    // NEW: Budget plan actions
    createBudgetPlan: (data: Omit<BudgetPlan, 'id' | 'createdAt' | 'updatedAt' | 'spentAmount' | 'remainingAmount'>) => Promise<{ success: boolean; message: string; budgetId?: string; }>;
    updateBudgetPlan: (budgetId: string, updates: Partial<BudgetPlan>) => Promise<{ success: boolean; message: string; }>;
    deleteBudgetPlan: (budgetId: string) => Promise<{ success: boolean; message: string; }>;
    
    // NEW: Campaign attribution actions
    createCampaignAttribution: (data: Omit<CampaignAttribution, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; message: string; attributionId?: string; }>;
    updateCampaignAttribution: (attributionId: string, updates: Partial<CampaignAttribution>) => Promise<{ success: boolean; message: string; }>;
    deleteCampaignAttribution: (attributionId: string) => Promise<{ success: boolean; message: string; }>;
    
    // NEW: Marketing analytics actions
    createMarketingAnalytics: (data: Omit<MarketingAnalytics, 'id' | 'createdAt' | 'updatedAt' | 'ctr' | 'conversionRate' | 'roi'>) => Promise<{ success: boolean; message: string; analyticsId?: string; }>;
    updateMarketingAnalytics: (analyticsId: string, updates: Partial<MarketingAnalytics>) => Promise<{ success: boolean; message: string; }>;
    deleteMarketingAnalytics: (analyticsId: string) => Promise<{ success: boolean; message: string; }>;
    
    // NEW: Marketing calendar link actions
    createMarketingCalendarLink: (data: Omit<MarketingCalendarLink, 'id' | 'createdAt'>) => Promise<{ success: boolean; message: string; linkId?: string; }>;
    deleteMarketingCalendarLink: (linkId: string) => Promise<{ success: boolean; message: string; }>;
    
    // NEW: Deal/Opportunity actions
    createDeal: (data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'notes'>) => Promise<{ success: boolean; message: string; dealId?: string; }>;
    updateDeal: (dealId: string, updates: Partial<Deal>) => Promise<{ success: boolean; message: string; }>;
    deleteDeal: (dealId: string) => Promise<{ success: boolean; message: string; }>;
    
    // NEW: Products & Services actions
    createProductService: (data: Omit<ProductService, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; message: string; id?: string; }>;
    updateProductService: (id: string, updates: Partial<ProductService>) => Promise<{ success: boolean; message: string; }>;
    deleteProductService: (id: string) => Promise<{ success: boolean; message: string; }>;
    updateProductInventory: (id: string, quantityChange: number, reason?: string) => Promise<{ success: boolean; message: string; }>;
    reserveProductInventory: (id: string, quantity: number) => Promise<{ success: boolean; message: string; }>;
    releaseProductInventory: (id: string, quantity: number) => Promise<{ success: boolean; message: string; }>;
    updateServiceCapacity: (id: string, capacityChange: number, period: string) => Promise<{ success: boolean; message: string; }>;
    calculateProductProfitability: (id: string) => Promise<{ marginPercent: number; marginAmount: number; }>;
}
