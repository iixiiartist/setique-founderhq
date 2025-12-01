// LandingPage Constants
// Feature data, pricing plans, FAQs, and AI capabilities

import {
    MessageSquare,
    Users,
    Calendar,
    DollarSign,
    BarChart3,
    Bot,
    FileText,
    Mail,
    Megaphone,
    Sparkles,
    UserPlus,
    Building2,
    CheckCircle2,
    Receipt,
    TrendingUp,
    Globe
} from 'lucide-react';

export const FEATURES = [
    {
        icon: Users,
        title: 'CRM & Pipeline',
        description: 'Manage leads, contacts, and accounts with AI-powered insights. Track deals from first touch to close.',
        bgColor: 'bg-cyan-50',
        gradient: 'from-cyan-400 to-teal-500'
    },
    {
        icon: MessageSquare,
        title: 'Huddle Team Chat',
        description: 'Real-time messaging with AI assistance. Collaborate, share files, and get instant answers from your data.',
        bgColor: 'bg-amber-50',
        gradient: 'from-amber-400 to-orange-500'
    },
    {
        icon: Megaphone,
        title: 'Marketing & Campaigns',
        description: 'Plan campaigns, generate content with AI, and track outreach—all connected to your pipeline.',
        bgColor: 'bg-rose-50',
        gradient: 'from-rose-400 to-pink-500'
    },
    {
        icon: Mail,
        title: 'Email & Outreach',
        description: 'Integrated email with AI-drafted responses, templates, and automatic CRM logging.',
        bgColor: 'bg-indigo-50',
        gradient: 'from-indigo-400 to-violet-500'
    },
    {
        icon: FileText,
        title: 'Documents & Files',
        description: 'Centralized document hub with smart search, version control, and AI summaries.',
        bgColor: 'bg-sky-50',
        gradient: 'from-sky-400 to-blue-500'
    },
    {
        icon: Calendar,
        title: 'Calendar & Scheduling',
        description: 'Unified calendar for meetings, deadlines, and follow-ups. AI helps you stay on track.',
        bgColor: 'bg-orange-50',
        gradient: 'from-orange-400 to-red-500'
    },
    {
        icon: DollarSign,
        title: 'Financial Tracking',
        description: 'Log expenses, track revenue, monitor cash flow. AI auto-categorizes and surfaces trends.',
        bgColor: 'bg-emerald-50',
        gradient: 'from-emerald-400 to-green-500'
    },
    {
        icon: BarChart3,
        title: 'Analytics & Reports',
        description: 'AI-generated insights, customizable dashboards, and forecasts that guide your strategy.',
        bgColor: 'bg-pink-50',
        gradient: 'from-pink-400 to-rose-500'
    },
    {
        icon: Bot,
        title: 'AI Research Agents',
        description: 'Specialized agents for market research, competitive analysis, and deal strategy.',
        bgColor: 'bg-purple-50',
        gradient: 'from-purple-400 to-pink-500'
    },
    {
        icon: Sparkles,
        title: 'AI Content Creation',
        description: 'Generate emails, proposals, marketing copy, and more—all trained on your business context.',
        bgColor: 'bg-violet-50',
        gradient: 'from-violet-400 to-purple-500'
    }
];

export const AI_CAPABILITIES = [
    { icon: Sparkles, label: 'Content Creation', description: 'Generate emails, proposals, and copy' },
    { icon: TrendingUp, label: 'Strategic Insights', description: 'AI-powered forecasts and analysis' },
    { icon: UserPlus, label: 'Smart Data Entry', description: 'Auto-create contacts and log data' },
    { icon: Globe, label: 'Market Research', description: 'Research prospects and competitors' },
    { icon: CheckCircle2, label: 'Task Automation', description: 'Auto-assign and track workflows' },
    { icon: Building2, label: 'Deal Intelligence', description: 'AI scoring and next-step suggestions' },
];

export const FAQS = [
    {
        question: "What is FounderHQ and who is it for?",
        answer: "FounderHQ is a complete GTM workspace that brings together CRM, pipeline, marketing, email, documents, calendar, financials, and team chat—all powered by AI. It's built for founders, sales teams, and GTM consultants who want one unified platform instead of juggling 10+ tools."
    },
    {
        question: "How is AI integrated throughout FounderHQ?",
        answer: "AI isn't just a chatbot—it's woven into every workflow. Generate marketing content, get strategic insights on deals, automate data entry, research prospects, draft emails, and get AI-powered analytics. The more you use it, the smarter it gets about your business."
    },
    {
        question: "What GTM tools does FounderHQ replace?",
        answer: "FounderHQ can replace your CRM (like HubSpot or Pipedrive), team chat (Slack, Microsoft Teams), task management (Asana, Monday.com), documents and wikis (Notion, Google Docs), email client, calendar app, expense tracker, and various AI tools. Everything lives in one workspace."
    },
    {
        question: "Can I import my existing data?",
        answer: "Yes! FounderHQ supports importing contacts, accounts, deals, and historical data from popular CRMs and spreadsheets. Our AI helps map and clean your data during import."
    },
    {
        question: "Is my data secure?",
        answer: "Absolutely. We use enterprise-grade security with end-to-end encryption and row-level security policies. Your data is stored in isolated environments and never used to train AI models."
    },
    {
        question: "Can my team collaborate in FounderHQ?",
        answer: "Yes! FounderHQ is built for teams. Collaborate in real-time via Huddle chat, share documents, assign tasks, and get AI assistance together. The Team Pro plan includes advanced collaboration features."
    }
];

export const PRICING_PLANS = [
    {
        name: "FREE",
        price: "$0",
        period: "/month",
        description: "Perfect for solo founders getting started",
        features: [
            '25 AI requests per month',
            'Full CRM & pipeline',
            'Huddle team chat',
            'Document library (1GB)',
            'Built-in calendar',
            'Basic email integration',
            'Email support'
        ],
        cta: "START FREE",
        gradient: "from-gray-50 to-white",
        popular: false
    },
    {
        name: "TEAM PRO",
        price: "$49",
        period: "/month base",
        description: "+ $25/month per additional user",
        features: [
            'Everything in Free, plus:',
            'Unlimited AI across all features',
            'AI content generation & insights',
            'Advanced analytics & reports',
            'Full financial tracking',
            'Marketing campaign tools',
            'AI research agents',
            'API access & priority support'
        ],
        cta: "GET STARTED",
        gradient: "from-cyan-50 to-teal-50",
        popular: true
    }
];
