// lib/config/youAgents.ts
// Map logical agent slugs in FounderHQ to concrete You.com agent IDs.

export type YouAgentSlug = 
  | 'research_briefing'
  | 'competitive_intel'
  | 'outreach_angles';

export interface YouAgentConfig {
  id: string;
  label: string;
  description: string;
  icon: string;
  goals: { value: string; label: string }[];
  placeholder: string;
  enabled: boolean;
}

export const YOU_AGENTS: Record<YouAgentSlug, YouAgentConfig> = {
  research_briefing: {
    id: '2c03ea4c-fcfd-483f-a1f3-52cde52b909c', // Replace with your actual You.com agent ID
    label: 'Research & Briefing Agent',
    description: 'Perform focused external research on companies, markets, and trends, then get concise GTM-ready briefs and outreach angles.',
    icon: '🔬',
    goals: [
      { value: 'icp', label: 'Understand ICP & pains' },
      { value: 'competitive', label: 'Competitive snapshot' },
      { value: 'angles', label: 'Outreach angles' },
      { value: 'market', label: 'Market / trend brief' },
    ],
    placeholder: 'e.g. Notion, B2B SaaS for CFOs, AI procurement tools',
    enabled: true,
  },
  competitive_intel: {
    id: '', // Configure when you create this agent in You.com
    label: 'Competitive Intel Agent',
    description: 'Deep-dive competitive analysis with positioning recommendations and battlecard generation.',
    icon: '⚔️',
    goals: [
      { value: 'positioning', label: 'Positioning analysis' },
      { value: 'weaknesses', label: 'Competitor weaknesses' },
      { value: 'battlecard', label: 'Generate battlecard' },
    ],
    placeholder: 'e.g. Salesforce vs HubSpot for SMB',
    enabled: false, // Enable when agent is configured
  },
  outreach_angles: {
    id: '', // Configure when you create this agent in You.com
    label: 'Outreach Angles Agent',
    description: 'Generate personalized outreach angles based on prospect research and your value proposition.',
    icon: '✉️',
    goals: [
      { value: 'cold_email', label: 'Cold email angles' },
      { value: 'linkedin', label: 'LinkedIn approach' },
      { value: 'warm_intro', label: 'Warm intro request' },
    ],
    placeholder: 'e.g. VP Sales at enterprise fintech companies',
    enabled: false, // Enable when agent is configured
  },
};

export const getEnabledAgents = (): YouAgentSlug[] => {
  return (Object.keys(YOU_AGENTS) as YouAgentSlug[]).filter(
    (slug) => YOU_AGENTS[slug].enabled && YOU_AGENTS[slug].id
  );
};

export const getAgentConfig = (slug: YouAgentSlug): YouAgentConfig | undefined => {
  return YOU_AGENTS[slug];
};
