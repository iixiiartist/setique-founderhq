import { Tab, TabType } from '../../constants';

export interface AssistantConfig {
  tab: TabType;
  title: string;
  icon: string;
  color: string;
  getSystemPrompt: (context: {
    companyName: string;
    businessContext: string;
    teamContext: string;
  }) => string;
}

export const ASSISTANT_CONFIGS: AssistantConfig[] = [
  {
    tab: Tab.Platform,
    title: 'Platform AI',
    icon: '🚀',
    color: 'blue',
    getSystemPrompt: ({ companyName, businessContext, teamContext }) => 
      `You are ${companyName}'s AI assistant for platform operations.

**Expertise:** Task management, team coordination, project tracking, workflow optimization.
**Tools:** Manage tasks, notes, files (module: platform).`,
  },
  {
    tab: Tab.Investors,
    title: 'Investor Relations AI',
    icon: '💼',
    color: 'purple',
    getSystemPrompt: ({ companyName, businessContext, teamContext }) =>
      `You are ${companyName}'s AI assistant for investor relations.

**Expertise:** Investor communication, pitch materials, cap table analysis, fundraising strategy.
**Tools:** Manage investors, tasks, notes, files (module: investors).`,
  },
  {
    tab: Tab.Customers,
    title: 'Customer Success AI',
    icon: '👥',
    color: 'indigo',
    getSystemPrompt: ({ companyName, businessContext, teamContext }) =>
      `You are ${companyName}'s AI assistant for customer success.

**Expertise:** Customer relationships, onboarding, retention, support workflows, feedback analysis.
**Tools:** Manage customers, tasks, notes, files (module: customers).`,
  },
  {
    tab: Tab.Partners,
    title: 'Partnership AI',
    icon: '🤝',
    color: 'teal',
    getSystemPrompt: ({ companyName, businessContext, teamContext }) =>
      `You are ${companyName}'s AI assistant for partnerships.

**Expertise:** Partnership strategy, vendor management, collaboration workflows, contract insights.
**Tools:** Manage partners, tasks, notes, files (module: partners).`,
  },
  {
    tab: Tab.Marketing,
    title: 'Marketing AI',
    icon: '📢',
    color: 'pink',
    getSystemPrompt: ({ companyName, businessContext, teamContext }) =>
      `You are ${companyName}'s AI assistant for marketing and growth.

**Expertise:** Campaign strategy, content creation, analytics, growth tactics.
**Tools:** Manage campaigns, tasks, notes, files (module: marketing).
**Reports:** Summarize metrics (reach/engagement/conversions), identify top performers, highlight issues, recommend actions.`,
  },
  {
    tab: Tab.Financials,
    title: 'Financial AI',
    icon: '💰',
    color: 'emerald',
    getSystemPrompt: ({ companyName, businessContext, teamContext }) =>
      `You are ${companyName}'s AI assistant for financial management.

**Expertise:** Financial analysis, CFO insights, growth metrics (MRR/GMV/Signups), trend tracking.
**Tools:** Manage financial logs, tasks, notes, files (module: financials).
**Reports:** Highlight latest metrics, calculate growth rates, summarize trends, provide insights.`,
  },
];

export const getAssistantConfig = (tab: TabType): AssistantConfig | undefined => {
  return ASSISTANT_CONFIGS.find(config => config.tab === tab);
};

export const getAssistantTitle = (tab: TabType): string => {
  const config = getAssistantConfig(tab);
  return config?.title || 'AI Assistant';
};

export const getAssistantIcon = (tab: TabType): string => {
  const config = getAssistantConfig(tab);
  return config?.icon || '✨';
};
