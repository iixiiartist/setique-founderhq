import { supabase } from '../supabase';
import { Priority, DocType } from '../../types';

export interface WorkspaceTemplate {
    id: string;
    name: string;
    description: string;
    category: 'tech_startup' | 'consulting' | 'agency' | 'saas' | 'ecommerce' | 'custom';
    icon: string;
    tasks: TemplateTask[];
    contacts: TemplateContact[];
    documents: TemplateDocument[];
    financial_structure: TemplateFinancialStructure;
}

interface TemplateTask {
    category: string;
    text: string;
    priority: Priority;
    assignedTo?: string;
    dueOffset?: number; // Days from today
}

interface TemplateContact {
    name: string;
    email: string;
    company?: string;
    role?: string;
    tags?: string[];
    collection: 'investors' | 'customers' | 'partners';
}

interface TemplateDocument {
    title: string;
    docType: DocType;
    content: string;
}

interface TemplateFinancialStructure {
    revenue_categories: string[];
    expense_categories: string[];
    initial_metrics?: {
        monthly_revenue?: number;
        monthly_expenses?: number;
        runway_months?: number;
    };
}

/**
 * Built-in workspace templates
 */
export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
    {
        id: 'tech-startup',
        name: 'Tech Startup',
        description: 'Perfect for early-stage tech companies building and launching products',
        category: 'tech_startup',
        icon: '🚀',
        tasks: [
            { category: 'Product', text: 'Define MVP feature set', priority: 'High', dueOffset: 7 },
            { category: 'Product', text: 'Create product roadmap', priority: 'High', dueOffset: 14 },
            { category: 'Product', text: 'Set up development environment', priority: 'Medium', dueOffset: 3 },
            { category: 'Marketing', text: 'Build landing page', priority: 'High', dueOffset: 10 },
            { category: 'Marketing', text: 'Define target customer personas', priority: 'High', dueOffset: 7 },
            { category: 'Marketing', text: 'Create social media presence', priority: 'Medium', dueOffset: 14 },
            { category: 'Sales', text: 'Identify first 100 potential customers', priority: 'High', dueOffset: 14 },
            { category: 'Sales', text: 'Prepare demo script', priority: 'Medium', dueOffset: 21 },
            { category: 'Fundraising', text: 'Create pitch deck', priority: 'High', dueOffset: 14 },
            { category: 'Fundraising', text: 'Research potential investors', priority: 'Medium', dueOffset: 21 },
            { category: 'Operations', text: 'Set up company legal structure', priority: 'High', dueOffset: 7 },
            { category: 'Operations', text: 'Open business bank account', priority: 'Medium', dueOffset: 14 },
        ],
        contacts: [
            { name: 'Sample Investor', email: 'investor@example.com', company: 'VC Firm', role: 'Partner', tags: ['seed', 'tech'], collection: 'investors' },
            { name: 'Beta Customer', email: 'customer@example.com', company: 'Tech Corp', role: 'CTO', tags: ['early-adopter'], collection: 'customers' },
            { name: 'Tech Partner', email: 'partner@example.com', company: 'Service Provider', role: 'CEO', tags: ['integration'], collection: 'partners' },
        ],
        documents: [
            {
                title: 'Product Vision',
                docType: 'brief',
                content: '# Product Vision\n\n## Mission\n[Define your mission]\n\n## Target Market\n[Define your target customers]\n\n## Value Proposition\n[What makes you unique?]\n\n## Key Features\n1. Feature 1\n2. Feature 2\n3. Feature 3'
            },
            {
                title: 'Go-to-Market Strategy',
                docType: 'brief',
                content: '# Go-to-Market Strategy\n\n## Target Segments\n[Define customer segments]\n\n## Marketing Channels\n1. Channel 1\n2. Channel 2\n3. Channel 3\n\n## Sales Process\n[Describe your sales funnel]\n\n## Launch Plan\n[Timeline and milestones]'
            },
            {
                title: 'Investor Pitch Deck Outline',
                docType: 'brief',
                content: '# Pitch Deck Outline\n\n1. Problem\n2. Solution\n3. Market Size\n4. Business Model\n5. Traction\n6. Competitive Landscape\n7. Team\n8. Financial Projections\n9. The Ask\n10. Contact'
            },
        ],
        financial_structure: {
            revenue_categories: ['Product Sales', 'Subscriptions', 'Consulting', 'Other'],
            expense_categories: ['Salaries', 'Cloud Infrastructure', 'Marketing', 'Office', 'Legal', 'Other'],
            initial_metrics: {
                monthly_revenue: 0,
                monthly_expenses: 15000,
                runway_months: 12,
            },
        },
    },
    {
        id: 'saas-company',
        name: 'SaaS Company',
        description: 'Ideal for subscription-based software businesses',
        category: 'saas',
        icon: '💼',
        tasks: [
            { category: 'Product', text: 'Implement user onboarding flow', priority: 'High', dueOffset: 7 },
            { category: 'Product', text: 'Set up analytics tracking', priority: 'High', dueOffset: 3 },
            { category: 'Product', text: 'Build customer dashboard', priority: 'Medium', dueOffset: 14 },
            { category: 'Marketing', text: 'Launch content marketing strategy', priority: 'High', dueOffset: 7 },
            { category: 'Marketing', text: 'Set up email automation', priority: 'Medium', dueOffset: 10 },
            { category: 'Sales', text: 'Create pricing tiers', priority: 'High', dueOffset: 7 },
            { category: 'Sales', text: 'Build sales collateral', priority: 'Medium', dueOffset: 14 },
            { category: 'Customer Success', text: 'Create help center', priority: 'High', dueOffset: 14 },
            { category: 'Customer Success', text: 'Set up support ticketing system', priority: 'Medium', dueOffset: 7 },
        ],
        contacts: [
            { name: 'Enterprise Client', email: 'client@enterprise.com', company: 'Big Corp', role: 'VP Engineering', tags: ['enterprise'], collection: 'customers' },
            { name: 'Integration Partner', email: 'partner@api.com', company: 'API Platform', role: 'Partnerships', tags: ['integration'], collection: 'partners' },
        ],
        documents: [
            {
                title: 'Product Roadmap',
                docType: 'brief',
                content: '# Product Roadmap\n\n## Q1 Goals\n- Feature 1\n- Feature 2\n\n## Q2 Goals\n- Feature 3\n- Feature 4\n\n## Q3 Goals\n- Feature 5\n- Feature 6'
            },
            {
                title: 'Pricing Strategy',
                docType: 'brief',
                content: '# Pricing Strategy\n\n## Tier 1: Starter ($29/mo)\n- Feature set\n\n## Tier 2: Professional ($99/mo)\n- Feature set\n\n## Tier 3: Enterprise (Custom)\n- Feature set'
            },
        ],
        financial_structure: {
            revenue_categories: ['Monthly Subscriptions', 'Annual Subscriptions', 'Enterprise Contracts', 'Professional Services'],
            expense_categories: ['Salaries', 'Cloud Hosting', 'Marketing', 'Sales Commissions', 'Customer Support', 'R&D'],
            initial_metrics: {
                monthly_revenue: 5000,
                monthly_expenses: 25000,
                runway_months: 18,
            },
        },
    },
    {
        id: 'agency',
        name: 'Agency',
        description: 'For creative, marketing, or development agencies',
        category: 'agency',
        icon: '🎨',
        tasks: [
            { category: 'Business Development', text: 'Define service offerings', priority: 'High', dueOffset: 3 },
            { category: 'Business Development', text: 'Create agency portfolio', priority: 'High', dueOffset: 7 },
            { category: 'Marketing', text: 'Build case studies', priority: 'High', dueOffset: 14 },
            { category: 'Sales', text: 'Develop pricing packages', priority: 'High', dueOffset: 7 },
            { category: 'Sales', text: 'Create proposal templates', priority: 'Medium', dueOffset: 10 },
            { category: 'Operations', text: 'Set up project management system', priority: 'High', dueOffset: 3 },
            { category: 'Operations', text: 'Create client onboarding process', priority: 'Medium', dueOffset: 14 },
        ],
        contacts: [
            { name: 'Prospect Client', email: 'client@company.com', company: 'Client Co', role: 'Marketing Director', tags: ['prospect'], collection: 'customers' },
        ],
        documents: [
            {
                title: 'Service Offerings',
                docType: 'brief',
                content: '# Service Offerings\n\n## Service 1\n- Description\n- Deliverables\n- Timeline\n\n## Service 2\n- Description\n- Deliverables\n- Timeline'
            },
        ],
        financial_structure: {
            revenue_categories: ['Project Revenue', 'Retainer Revenue', 'Consulting'],
            expense_categories: ['Salaries', 'Contractors', 'Software Tools', 'Marketing', 'Office'],
        },
    },
];

/**
 * Apply a template to a workspace
 */
export async function applyTemplate(
    workspaceId: string,
    userId: string,
    userName: string,
    templateId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const template = WORKSPACE_TEMPLATES.find((t) => t.id === templateId);
        if (!template) {
            return { success: false, error: 'Template not found' };
        }

        // Insert tasks
        if (template.tasks.length > 0) {
            const tasksToInsert = template.tasks.map((task) => ({
                workspace_id: workspaceId,
                category: task.category,
                text: task.text,
                priority: task.priority,
                status: 'Not Started' as const,
                created_by: userId,
                assigned_to: task.assignedTo || userId,
                due_date: task.dueOffset
                    ? new Date(Date.now() + task.dueOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    : null,
            }));

            const { error: tasksError } = await supabase
                .from('tasks')
                .insert(tasksToInsert);

            if (tasksError) throw tasksError;
        }

        // Insert CRM contacts
        for (const contact of template.contacts) {
            // First check if contact exists
            const { data: existing } = await supabase
                .from(contact.collection)
                .select('id')
                .eq('email', contact.email)
                .eq('workspace_id', workspaceId)
                .single();

            if (!existing) {
                const { error: contactError } = await supabase
                    .from(contact.collection)
                    .insert({
                        workspace_id: workspaceId,
                        name: contact.name,
                        email: contact.email,
                        company: contact.company,
                        role: contact.role,
                        status: 'New',
                        tags: contact.tags || [],
                    });

                if (contactError) {
                    console.error(`Error inserting ${contact.collection} contact:`, contactError);
                }
            }
        }

        // Insert documents
        if (template.documents.length > 0) {
            const docsToInsert = template.documents.map((doc) => ({
                workspace_id: workspaceId,
                owner_id: userId,
                title: doc.title,
                doc_type: doc.docType,
                content_plain: doc.content,
                content_json: {}, // Empty Tiptap JSON
                visibility: 'team',
            }));

            const { error: docsError } = await supabase
                .from('gtm_docs')
                .insert(docsToInsert);

            if (docsError) throw docsError;
        }

        // Note: Financial structure would need to be applied based on your financials schema
        // This is a simplified version - you may need to adapt based on actual structure

        return { success: true };
    } catch (error) {
        console.error('Error applying template:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Export current workspace as a custom template
 */
export async function exportWorkspaceAsTemplate(
    workspaceId: string,
    templateName: string,
    templateDescription: string
): Promise<{ success: boolean; template?: Partial<WorkspaceTemplate>; error?: string }> {
    try {
        // Fetch workspace data
        const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('category, text, priority')
            .eq('workspace_id', workspaceId)
            .limit(50);

        if (tasksError) throw tasksError;

        const { data: documents, error: docsError } = await supabase
            .from('gtm_docs')
            .select('title, doc_type, content_plain')
            .eq('workspace_id', workspaceId)
            .limit(10);

        if (docsError) throw docsError;

        // Fetch CRM data
        const { data: investors, error: investorsError } = await supabase
            .from('investors')
            .select('name, email, company, role, tags')
            .eq('workspace_id', workspaceId)
            .limit(20);

        if (investorsError) throw investorsError;

        const { data: customers, error: customersError } = await supabase
            .from('customers')
            .select('name, email, company, role, tags')
            .eq('workspace_id', workspaceId)
            .limit(20);

        if (customersError) throw customersError;

        const { data: partners, error: partnersError } = await supabase
            .from('partners')
            .select('name, email, company, role, tags')
            .eq('workspace_id', workspaceId)
            .limit(20);

        if (partnersError) throw partnersError;

        // Build template
        const template: Partial<WorkspaceTemplate> = {
            name: templateName,
            description: templateDescription,
            category: 'custom',
            icon: '📦',
            tasks: tasks?.map((t) => ({
                category: t.category,
                text: t.text,
                priority: t.priority,
            })) || [],
            contacts: [
                ...(investors?.map((i) => ({ ...i, collection: 'investors' as const })) || []),
                ...(customers?.map((c) => ({ ...c, collection: 'customers' as const })) || []),
                ...(partners?.map((p) => ({ ...p, collection: 'partners' as const })) || []),
            ],
            documents: documents?.map((d) => ({
                title: d.title,
                docType: d.doc_type || 'brief',
                content: d.content_plain || '',
            })) || [],
            financial_structure: {
                revenue_categories: [],
                expense_categories: [],
            },
        };

        return { success: true, template };
    } catch (error) {
        console.error('Error exporting workspace as template:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
