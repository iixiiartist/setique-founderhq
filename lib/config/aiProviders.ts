// lib/config/aiProviders.ts
// Unified AI provider configuration for FounderHQ
// Supports both Groq and You.com with intelligent routing

export type AIProvider = 'groq' | 'youcom';
export type TaskType = 
  | 'web_search'      // Live web search
  | 'research'        // Deep research with sources
  | 'analysis'        // Document/data analysis
  | 'strategy'        // Deal/account strategy
  | 'timing'          // Why-now signals
  | 'chat'            // General conversation
  | 'moderation';     // Content safety

export interface ProviderCapability {
  supportsWebSearch: boolean;
  supportsStreaming: boolean;
  supportsCustomAgents: boolean;
  supportsReasoning: boolean;
  avgLatencyMs: number;
  costTier: 'free' | 'low' | 'medium' | 'high';
}

export interface AIProviderConfig {
  id: AIProvider;
  label: string;
  capabilities: ProviderCapability;
  models: string[];
  defaultModel: string;
}

/**
 * Groq provider configuration (Dev Tier)
 * - Access to all models including Compound for web search
 * - Very fast inference (sub-second latency)
 * - Built-in web search via Compound models
 */
export const GROQ_PROVIDER: AIProviderConfig = {
  id: 'groq',
  label: 'Groq (Dev Tier)',
  capabilities: {
    supportsWebSearch: true,  // via Compound models
    supportsStreaming: true,
    supportsCustomAgents: false,
    supportsReasoning: true,
    avgLatencyMs: 200,
    costTier: 'low',
  },
  models: [
    // Compound models (with built-in web search)
    'groq/compound',
    'groq/compound-mini',
    // Production models
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    // Reasoning models
    'kimi-k2-instruct',
    'qwen3-32b',
  ],
  defaultModel: 'llama-3.3-70b-versatile',
};

/**
 * You.com provider configuration
 * - Custom agents for specialized tasks
 * - Live web search via Search API
 * - Higher latency but more specialized
 */
export const YOUCOM_PROVIDER: AIProviderConfig = {
  id: 'youcom',
  label: 'You.com',
  capabilities: {
    supportsWebSearch: true,
    supportsStreaming: true,
    supportsCustomAgents: true,
    supportsReasoning: false,
    avgLatencyMs: 2000,
    costTier: 'medium',
  },
  models: [
    'research_briefing',
    'why_now',
    'deal_strategist',
  ],
  defaultModel: 'research_briefing',
};

export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  groq: GROQ_PROVIDER,
  youcom: YOUCOM_PROVIDER,
};

/**
 * Task-to-provider routing configuration
 * Defines which provider to use for each task type
 */
export interface TaskRouting {
  primary: AIProvider;
  fallback?: AIProvider;
  preferredModel?: string;
  reasoning?: 'low' | 'medium' | 'high';
}

export const TASK_ROUTING: Record<TaskType, TaskRouting> = {
  web_search: {
    // Use Groq Compound for fast web search
    primary: 'groq',
    fallback: 'youcom',
    preferredModel: 'groq/compound-mini',
  },
  research: {
    // Use You.com agents for deep research (custom prompts)
    primary: 'youcom',
    fallback: 'groq',
    preferredModel: 'research_briefing',
  },
  analysis: {
    // Use Groq's powerful models for analysis
    primary: 'groq',
    preferredModel: 'openai/gpt-oss-120b',
    reasoning: 'high',
  },
  strategy: {
    // Use You.com deal strategist agent
    primary: 'youcom',
    fallback: 'groq',
    preferredModel: 'deal_strategist',
  },
  timing: {
    // Use You.com why-now agent
    primary: 'youcom',
    fallback: 'groq',
    preferredModel: 'why_now',
  },
  chat: {
    // Use Groq for fast chat
    primary: 'groq',
    preferredModel: 'llama-3.3-70b-versatile',
  },
  moderation: {
    // Use Groq's Llama Guard
    primary: 'groq',
    preferredModel: 'meta-llama/llama-guard-4-12b',
  },
};

/**
 * Get the recommended routing for a task type
 */
export function getTaskRouting(taskType: TaskType): TaskRouting {
  return TASK_ROUTING[taskType] || TASK_ROUTING.chat;
}

/**
 * Get provider config by ID
 */
export function getProviderConfig(provider: AIProvider): AIProviderConfig {
  return AI_PROVIDERS[provider];
}

/**
 * Check if a provider supports a specific capability
 */
export function providerSupports(
  provider: AIProvider, 
  capability: keyof ProviderCapability
): boolean {
  const config = AI_PROVIDERS[provider];
  return Boolean(config?.capabilities?.[capability]);
}

/**
 * Get the best model for a task from a provider
 */
export function getBestModelForTask(
  taskType: TaskType,
  provider?: AIProvider
): { provider: AIProvider; model: string; reasoning?: 'low' | 'medium' | 'high' } {
  const routing = getTaskRouting(taskType);
  const selectedProvider = provider || routing.primary;
  const providerConfig = getProviderConfig(selectedProvider);
  
  // Use preferred model if it exists in the provider's model list
  const model = routing.preferredModel && providerConfig.models.includes(routing.preferredModel)
    ? routing.preferredModel
    : providerConfig.defaultModel;
    
  return {
    provider: selectedProvider,
    model,
    reasoning: routing.reasoning,
  };
}

/**
 * Detect task type from user input/context
 */
export function detectTaskType(input: string, context?: Record<string, unknown>): TaskType {
  const lowerInput = input.toLowerCase();
  
  // Check explicit context hints
  if (context?.taskType && typeof context.taskType === 'string') {
    const explicit = context.taskType as TaskType;
    if (TASK_ROUTING[explicit]) return explicit;
  }
  
  // Web search patterns
  if (
    lowerInput.includes('search') ||
    lowerInput.includes('find online') ||
    lowerInput.includes('look up') ||
    lowerInput.includes('what is the latest')
  ) {
    return 'web_search';
  }
  
  // Research patterns
  if (
    lowerInput.includes('research') ||
    lowerInput.includes('market analysis') ||
    lowerInput.includes('competitor') ||
    lowerInput.includes('industry trend')
  ) {
    return 'research';
  }
  
  // Strategy patterns
  if (
    lowerInput.includes('deal') ||
    lowerInput.includes('account') ||
    lowerInput.includes('strategy') ||
    lowerInput.includes('pipeline')
  ) {
    return 'strategy';
  }
  
  // Timing/signal patterns
  if (
    lowerInput.includes('why now') ||
    lowerInput.includes('signal') ||
    lowerInput.includes('timing') ||
    lowerInput.includes('trigger')
  ) {
    return 'timing';
  }
  
  // Analysis patterns
  if (
    lowerInput.includes('analyze') ||
    lowerInput.includes('review') ||
    lowerInput.includes('explain') ||
    lowerInput.includes('summarize')
  ) {
    return 'analysis';
  }
  
  // Default to chat
  return 'chat';
}
