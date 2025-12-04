// ============================================================================
// Groq Model Configuration - Dev Tier (December 2024)
// ============================================================================
// Intelligent model selection based on task type, cost optimization,
// and capability requirements.

export interface GroqModel {
  id: string;
  name: string;
  speed: number; // tokens per second
  contextWindow: number;
  maxOutput: number;
  costInput: number; // per million tokens
  costOutput: number;
  capabilities: ModelCapability[];
  tier: 'production' | 'preview' | 'system' | 'deprecated';
  bestFor: string[];
}

export type ModelCapability = 
  | 'chat'
  | 'function-calling'
  | 'parallel-tools'
  | 'reasoning'
  | 'vision'
  | 'audio-transcription'
  | 'text-to-speech'
  | 'web-search'
  | 'code-execution'
  | 'browser-automation'
  | 'moderation'
  | 'long-context';

export type TaskType =
  | 'general-chat'
  | 'quick-response'
  | 'complex-reasoning'
  | 'function-calling'
  | 'agentic-web-search'
  | 'code-generation'
  | 'summarization'
  | 'content-moderation'
  | 'audio-transcription'
  | 'text-to-speech'
  | 'batch-processing';

// ============================================================================
// Model Registry
// ============================================================================

export const GROQ_MODELS: Record<string, GroqModel> = {
  // === Production Models ===
  'llama-3.3-70b-versatile': {
    id: 'llama-3.3-70b-versatile',
    name: 'Meta Llama 3.3 70B',
    speed: 280,
    contextWindow: 131072,
    maxOutput: 32768,
    costInput: 0.59,
    costOutput: 0.79,
    capabilities: ['chat', 'function-calling', 'parallel-tools'],
    tier: 'production',
    bestFor: ['general-chat', 'function-calling', 'summarization'],
  },
  'llama-3.1-8b-instant': {
    id: 'llama-3.1-8b-instant',
    name: 'Meta Llama 3.1 8B Instant',
    speed: 560,
    contextWindow: 131072,
    maxOutput: 131072,
    costInput: 0.05,
    costOutput: 0.08,
    capabilities: ['chat', 'function-calling', 'parallel-tools'],
    tier: 'production',
    bestFor: ['quick-response', 'simple-queries', 'high-volume'],
  },
  'openai/gpt-oss-120b': {
    id: 'openai/gpt-oss-120b',
    name: 'OpenAI GPT-OSS 120B',
    speed: 500,
    contextWindow: 131072,
    maxOutput: 65536,
    costInput: 0.15,
    costOutput: 0.60,
    capabilities: ['chat', 'function-calling', 'reasoning', 'web-search', 'code-execution'],
    tier: 'production',
    bestFor: ['complex-reasoning', 'function-calling', 'agentic-web-search', 'code-generation'],
  },
  'openai/gpt-oss-20b': {
    id: 'openai/gpt-oss-20b',
    name: 'OpenAI GPT-OSS 20B',
    speed: 1000,
    contextWindow: 131072,
    maxOutput: 65536,
    costInput: 0.075,
    costOutput: 0.30,
    capabilities: ['chat', 'function-calling', 'reasoning', 'web-search', 'code-execution'],
    tier: 'production',
    bestFor: ['quick-reasoning', 'cost-effective-reasoning'],
  },
  'meta-llama/llama-guard-4-12b': {
    id: 'meta-llama/llama-guard-4-12b',
    name: 'Meta Llama Guard 4 12B',
    speed: 1200,
    contextWindow: 131072,
    maxOutput: 1024,
    costInput: 0.20,
    costOutput: 0.20,
    capabilities: ['moderation', 'vision'],
    tier: 'production',
    bestFor: ['content-moderation'],
  },
  'whisper-large-v3': {
    id: 'whisper-large-v3',
    name: 'OpenAI Whisper Large V3',
    speed: 0, // N/A for audio
    contextWindow: 448,
    maxOutput: 0,
    costInput: 0.111, // per hour
    costOutput: 0,
    capabilities: ['audio-transcription'],
    tier: 'production',
    bestFor: ['audio-transcription'],
  },
  'whisper-large-v3-turbo': {
    id: 'whisper-large-v3-turbo',
    name: 'OpenAI Whisper Large V3 Turbo',
    speed: 0,
    contextWindow: 448,
    maxOutput: 0,
    costInput: 0.04, // per hour - 3x cheaper than v3
    costOutput: 0,
    capabilities: ['audio-transcription'],
    tier: 'production',
    bestFor: ['audio-transcription'],
  },

  // === Compound Systems (Agentic AI) ===
  'groq/compound': {
    id: 'groq/compound',
    name: 'Groq Compound',
    speed: 450,
    contextWindow: 131072,
    maxOutput: 8192,
    costInput: 0, // Pricing not specified
    costOutput: 0,
    capabilities: ['chat', 'web-search', 'code-execution', 'browser-automation'],
    tier: 'system',
    bestFor: ['agentic-web-search', 'multi-tool-tasks'],
  },
  'groq/compound-mini': {
    id: 'groq/compound-mini',
    name: 'Groq Compound Mini',
    speed: 450,
    contextWindow: 131072,
    maxOutput: 8192,
    costInput: 0,
    costOutput: 0,
    capabilities: ['chat', 'web-search', 'code-execution', 'browser-automation'],
    tier: 'system',
    bestFor: ['quick-web-search', 'single-tool-tasks'],
  },

  // === Preview Models ===
  'meta-llama/llama-4-maverick-17b-128e-instruct': {
    id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    name: 'Meta Llama 4 Maverick',
    speed: 600,
    contextWindow: 131072,
    maxOutput: 8192,
    costInput: 0.20,
    costOutput: 0.60,
    capabilities: ['chat', 'function-calling', 'parallel-tools', 'vision'],
    tier: 'preview',
    bestFor: ['vision-tasks', 'multimodal'],
  },
  'meta-llama/llama-4-scout-17b-16e-instruct': {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Meta Llama 4 Scout',
    speed: 750,
    contextWindow: 131072,
    maxOutput: 8192,
    costInput: 0.11,
    costOutput: 0.34,
    capabilities: ['chat', 'function-calling', 'parallel-tools', 'vision'],
    tier: 'preview',
    bestFor: ['fast-vision', 'cost-effective-multimodal'],
  },
  'moonshotai/kimi-k2-instruct-0905': {
    id: 'moonshotai/kimi-k2-instruct-0905',
    name: 'Moonshot Kimi K2',
    speed: 200,
    contextWindow: 262144, // 262K context!
    maxOutput: 16384,
    costInput: 1.00,
    costOutput: 3.00,
    capabilities: ['chat', 'function-calling', 'parallel-tools', 'long-context'],
    tier: 'preview',
    bestFor: ['code-generation', 'long-context-analysis'],
  },
  'qwen/qwen3-32b': {
    id: 'qwen/qwen3-32b',
    name: 'Alibaba Qwen3 32B',
    speed: 400,
    contextWindow: 131072,
    maxOutput: 40960,
    costInput: 0.29,
    costOutput: 0.59,
    capabilities: ['chat', 'function-calling', 'parallel-tools', 'reasoning'],
    tier: 'preview',
    bestFor: ['summarization', 'reasoning', 'multilingual'],
  },
  'playai-tts': {
    id: 'playai-tts',
    name: 'PlayAI TTS',
    speed: 0,
    contextWindow: 8192,
    maxOutput: 8192,
    costInput: 50.00, // per 1M characters
    costOutput: 0,
    capabilities: ['text-to-speech'],
    tier: 'preview',
    bestFor: ['text-to-speech'],
  },
};

// ============================================================================
// Model Selection Logic
// ============================================================================

export interface ModelSelectionOptions {
  taskType: TaskType;
  contextLength?: number;
  requiresToolCalling?: boolean;
  requiresVision?: boolean;
  preferSpeed?: boolean;
  preferCost?: boolean;
  requiresReasoning?: boolean;
  useProductionOnly?: boolean;
}

/**
 * Intelligently select the best model for a given task
 */
export function selectModel(options: ModelSelectionOptions): GroqModel {
  const {
    taskType,
    contextLength = 0,
    requiresToolCalling = false,
    requiresVision = false,
    preferSpeed = false,
    preferCost = false,
    requiresReasoning = false,
    useProductionOnly = true,
  } = options;

  // Get eligible models based on tier preference
  let candidates = Object.values(GROQ_MODELS).filter(m => 
    useProductionOnly ? (m.tier === 'production' || m.tier === 'system') : true
  );

  // Filter by context window
  if (contextLength > 0) {
    candidates = candidates.filter(m => m.contextWindow >= contextLength);
  }

  // Filter by capabilities
  if (requiresToolCalling) {
    candidates = candidates.filter(m => m.capabilities.includes('function-calling'));
  }
  if (requiresVision) {
    candidates = candidates.filter(m => m.capabilities.includes('vision'));
  }
  if (requiresReasoning) {
    candidates = candidates.filter(m => m.capabilities.includes('reasoning'));
  }

  // Task-specific selection
  switch (taskType) {
    case 'quick-response':
      // Fastest model
      return GROQ_MODELS['llama-3.1-8b-instant'];
      
    case 'complex-reasoning':
      // Best reasoning model
      return GROQ_MODELS['openai/gpt-oss-120b'];
      
    case 'agentic-web-search':
      // Compound for automatic web search
      return GROQ_MODELS['groq/compound'];
      
    case 'code-generation':
      // Kimi K2 for code (262K context)
      if (!useProductionOnly) {
        return GROQ_MODELS['moonshotai/kimi-k2-instruct-0905'];
      }
      return GROQ_MODELS['openai/gpt-oss-120b'];
      
    case 'summarization':
      // Qwen for summarization with reasoning
      if (!useProductionOnly) {
        return GROQ_MODELS['qwen/qwen3-32b'];
      }
      return GROQ_MODELS['llama-3.3-70b-versatile'];
      
    case 'content-moderation':
      return GROQ_MODELS['meta-llama/llama-guard-4-12b'];
      
    case 'audio-transcription':
      return GROQ_MODELS['whisper-large-v3-turbo'];
      
    case 'text-to-speech':
      return GROQ_MODELS['playai-tts'];
      
    case 'function-calling':
      // GPT-OSS for best function calling
      return GROQ_MODELS['openai/gpt-oss-120b'];
      
    case 'batch-processing':
      // Cheapest capable model for batch
      return GROQ_MODELS['llama-3.1-8b-instant'];
      
    case 'general-chat':
    default:
      // Default selection with preferences
      if (preferSpeed) {
        candidates.sort((a, b) => b.speed - a.speed);
      } else if (preferCost) {
        candidates.sort((a, b) => (a.costInput + a.costOutput) - (b.costInput + b.costOutput));
      } else {
        // Balance of speed and capability
        candidates.sort((a, b) => {
          const scoreA = a.speed * 0.3 + (1 / (a.costInput + 0.01)) * 0.3 + a.capabilities.length * 10;
          const scoreB = b.speed * 0.3 + (1 / (b.costInput + 0.01)) * 0.3 + b.capabilities.length * 10;
          return scoreB - scoreA;
        });
      }
      return candidates[0] || GROQ_MODELS['llama-3.3-70b-versatile'];
  }
}

/**
 * Get reasoning configuration for a model
 */
export function getReasoningConfig(modelId: string, intensity: 'low' | 'medium' | 'high' = 'medium') {
  const model = GROQ_MODELS[modelId];
  if (!model?.capabilities.includes('reasoning')) {
    return {};
  }

  if (modelId.startsWith('openai/gpt-oss')) {
    return {
      reasoning_effort: intensity,
      include_reasoning: true,
    };
  }

  if (modelId.startsWith('qwen/')) {
    return {
      reasoning_effort: intensity === 'low' ? 'none' : 'default',
    };
  }

  return {};
}

/**
 * Check if model supports Compound built-in tools
 */
export function supportsBuiltInTools(modelId: string): boolean {
  const model = GROQ_MODELS[modelId];
  return model?.tier === 'system' || 
         modelId.startsWith('openai/gpt-oss');
}

/**
 * Get service tier recommendation
 */
export function getServiceTier(taskType: TaskType, isUrgent: boolean = true): string {
  if (!isUrgent && taskType === 'batch-processing') {
    return 'flex'; // Lower cost, may queue
  }
  if (isUrgent) {
    return 'performance'; // Fastest
  }
  return 'on_demand'; // Default
}
