// lib/config/youAgents.ts
// Map logical agent slugs in FounderHQ to concrete You.com agent IDs.

export type YouAgentSlug = 
  | 'research_briefing'
  | 'why_now'
  | 'deal_strategist'
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
  tier?: 'free' | 'pro'; // Plan tier requirement
}

export const YOU_AGENTS: Record<YouAgentSlug, YouAgentConfig> = {
  research_briefing: {
    id: '2c03ea4c-fcfd-483f-a1f3-52cde52b909c',
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
    tier: 'free',
  },
  why_now: {
    id: 'c140749d-9a3a-450f-bd9f-23edf5aae1c1',
    label: 'Why Now Agent',
    description: 'Detects timely buying signals—funding, hiring shifts, product moves, or GTM pressure—and explains why a prospect is more likely to buy now.',
    icon: '⚡',
    goals: [
      { value: 'timing', label: 'Timing analysis' },
      { value: 'signals', label: 'Buying signals' },
      { value: 'outreach', label: 'Outreach angles' },
      { value: 'full', label: 'Full timing check' },
    ],
    placeholder: 'e.g. Stripe, Series B fintech companies, AI procurement tools',
    enabled: true,
    tier: 'pro',
  },
  deal_strategist: {
    id: '4b9e6999-b675-4ce6-b18f-0185b5a3bde1',
    label: 'Deal & Account Strategist',
    description: 'Turns CRM opportunities, accounts, and notes into deal strategy, risk assessment, outreach guidance, and concrete next actions.',
    icon: '🎯',
    goals: [
      { value: 'strategy', label: 'Deal strategy' },
      { value: 'risks', label: 'Risks & gaps' },
      { value: 'outreach', label: 'Outreach guidance' },
      { value: 'next_steps', label: 'Next steps' },
    ],
    placeholder: 'Paste account details, opportunity info, or deal notes',
    enabled: true,
    tier: 'pro',
  },
  competitive_intel: {
    id: '',
    label: 'Competitive Intel Agent',
    description: 'Deep-dive competitive analysis with positioning recommendations and battlecard generation.',
    icon: '⚔️',
    goals: [
      { value: 'positioning', label: 'Positioning analysis' },
      { value: 'weaknesses', label: 'Competitor weaknesses' },
      { value: 'battlecard', label: 'Generate battlecard' },
    ],
    placeholder: 'e.g. Salesforce vs HubSpot for SMB',
    enabled: false,
  },
  outreach_angles: {
    id: '',
    label: 'Outreach Angles Agent',
    description: 'Generate personalized outreach angles based on prospect research and your value proposition.',
    icon: '✉️',
    goals: [
      { value: 'cold_email', label: 'Cold email angles' },
      { value: 'linkedin', label: 'LinkedIn approach' },
      { value: 'warm_intro', label: 'Warm intro request' },
    ],
    placeholder: 'e.g. VP Sales at enterprise fintech companies',
    enabled: false,
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
