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
        icon: MessageSquare,
        title: 'Huddle Team Chat',
        description: 'Real-time messaging with threaded conversations, file sharing, and AI-powered responses.',
        bgColor: 'bg-yellow-100'
    },
    {
        icon: Bot,
        title: 'AI Assistant',
        description: 'Create contacts, log expenses, track revenue, and manage tasks through natural conversation.',
        bgColor: 'bg-purple-100'
    },
    {
        icon: Users,
        title: 'CRM & Contacts',
        description: 'Manage leads, contacts, and accounts with a unified view. Track every interaction.',
        bgColor: 'bg-blue-100'
    },
    {
        icon: DollarSign,
        title: 'Financial Tracking',
        description: 'Log expenses, track revenue, and monitor cash flow with AI-assisted data entry.',
        bgColor: 'bg-green-100'
    },
    {
        icon: Calendar,
        title: 'Calendar & Events',
        description: 'Built-in calendar to track events, deadlines, and team schedules in one view.',
        bgColor: 'bg-orange-100'
    },
    {
        icon: BarChart3,
        title: 'Analytics & Reports',
        description: 'Customizable dashboards, sales forecasts, and performance metrics.',
        bgColor: 'bg-pink-100'
    },
    {
        icon: FileText,
        title: 'Document Library',
        description: 'Store, organize, and share files securely with smart filtering.',
        bgColor: 'bg-cyan-100'
    },
    {
        icon: Mail,
        title: 'Email Integration',
        description: 'Connect Gmail, send and receive emails, and manage communications in one place.',
        bgColor: 'bg-indigo-100'
    },
    {
        icon: Megaphone,
        title: 'Marketing & Campaigns',
        description: 'Plan and track marketing campaigns, content calendars, and outreach initiatives.',
        bgColor: 'bg-rose-100'
    },
    {
        icon: Sparkles,
        title: 'AI Research Agents',
        description: 'Specialized agents for market research, deal strategy, and competitive analysis.',
        bgColor: 'bg-violet-100'
    }
];

export const AI_CAPABILITIES = [
    { icon: UserPlus, label: 'Create Contacts', description: 'Add contacts through conversation' },
    { icon: Building2, label: 'Manage Accounts', description: 'Create and update company records' },
    { icon: CheckCircle2, label: 'Track Tasks', description: 'Create tasks and set reminders' },
    { icon: Receipt, label: 'Log Expenses', description: 'Record expenses with categorization' },
    { icon: TrendingUp, label: 'Record Revenue', description: 'Track income and deals closed' },
    { icon: Globe, label: 'Web Search', description: 'Research companies and contacts' },
];

export const FAQS = [
    {
        question: "What is FounderHQ and who is it for?",
        answer: "FounderHQ is an all-in-one GTM hub for founders, sales teams, and GTM consultants. It combines CRM, team chat, financial tracking, and AI assistance into a single platform."
    },
    {
        question: "How does the AI assistant work?",
        answer: "Our AI assistant in Huddle chat understands natural language. Just type what you need—create tasks, log expenses, record revenue, add contacts—and it handles the rest."
    },
    {
        question: "Can I import my existing data?",
        answer: "Yes! FounderHQ supports importing contacts, accounts, and historical data from popular CRMs and spreadsheets."
    },
    {
        question: "Is my data secure?",
        answer: "Absolutely. We use enterprise-grade security with encryption and row-level security policies. Your data is stored in isolated environments."
    },
    {
        question: "What integrations are available?",
        answer: "FounderHQ currently integrates with Gmail for email sync. More integrations are on our roadmap based on user feedback."
    },
    {
        question: "Can I try FounderHQ for free?",
        answer: "Yes! Our Free tier includes full access to core features. Upgrade anytime to unlock team collaboration and AI features."
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
            'Unlimited contacts & accounts',
            'Basic CRM features',
            'Huddle team chat',
            'Document storage (1GB)',
            'Built-in calendar',
            'Email support'
        ],
        cta: "START FREE",
        bgColor: "bg-white",
        popular: false
    },
    {
        name: "TEAM PRO",
        price: "$49",
        period: "/month base",
        description: "+ $25/month per additional user",
        features: [
            'Everything in Free, plus:',
            'Unlimited AI requests',
            'AI Assistant in Huddle',
            'Advanced analytics & reports',
            'Financial tracking (expenses & revenue)',
            'Custom fields & workflows',
            'API access',
            'Priority support'
        ],
        cta: "START 14-DAY TRIAL",
        bgColor: "bg-blue-100",
        popular: true
    }
];
