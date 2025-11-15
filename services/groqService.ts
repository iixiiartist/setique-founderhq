import { supabase } from '../lib/supabase';
import { DatabaseService } from '../lib/services/database';
import { APP_CONFIG } from '../lib/config';
import { groqTools, getRelevantTools } from './groq/tools';

// Local type definitions (previously from @google/genai)
interface Part {
    text?: string;
    inlineData?: { mimeType: string; data: string };
    functionCall?: { id?: string; name: string; args: any };
    functionResponse?: { id?: string; name: string; response: any };
}

export interface Content {
    role: 'user' | 'model' | 'tool';
    parts: Part[];
}

export interface GenerateContentResponse {
    candidates?: Array<{
        content: Content;
        finishReason: string;
    }>;
    functionCalls?: any[];
}

interface EdgeFunctionResponse {
    response?: string;
    functionCalls?: any[];
    finishReason?: string;
    error?: string;
    details?: string;
}

export class AILimitError extends Error {
    constructor(
        message: string,
        public usage: number,
        public limit: number,
        public planType: string
    ) {
        super(message);
        this.name = 'AILimitError';
    }
}

interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
}

// Convert Content[] format (used by UI) to Message[] format (used by Groq API)
const convertContentToMessages = (history: Content[]): Message[] => {
    return history
        .map(content => {
            // Handle user/model roles
            const role = content.role === 'model' ? 'assistant' : content.role;

            // Extract text from parts
            const textParts = content.parts
                .filter(p => 'text' in p && p.text)
                .map(p => p.text as string)
                .join('\n');

        // Check for function calls (an assistant message may contain multiple)
        const functionCallParts = content.parts.filter(
            (p): p is Part & { functionCall: NonNullable<Part['functionCall']> } =>
                'functionCall' in p && !!p.functionCall
        );

        if (functionCallParts.length > 0) {
            return {
                role: 'assistant' as const,
                content: textParts || '',
                tool_calls: functionCallParts.map(tc => ({
                    id: tc.functionCall?.id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto
                        ? crypto.randomUUID()
                        : `call_${Math.random().toString(36).slice(2)}`),
                    type: 'function' as const,
                    function: {
                        name: tc.functionCall.name,
                        arguments: typeof tc.functionCall.args === 'string'
                            ? tc.functionCall.args
                            : JSON.stringify(tc.functionCall.args ?? {}),
                    },
                })),
            };
        }

        // Check for function responses
        const functionResponsePart = content.parts.find(
            (p): p is Part & { functionResponse: NonNullable<Part['functionResponse']> } =>
                'functionResponse' in p && !!p.functionResponse
        );

        if (functionResponsePart) {
            // This is a tool response - must include tool_call_id
            return {
                role: 'tool' as const,
                content: typeof functionResponsePart.functionResponse.response === 'string'
                    ? functionResponsePart.functionResponse.response
                    : JSON.stringify(functionResponsePart.functionResponse.response),
                tool_call_id: functionResponsePart.functionResponse.id || 'unknown',
                name: functionResponsePart.functionResponse.name,
            };
        }

        // For messages with no text content (like empty assistant acknowledgements), provide empty string
        return {
            role: role as 'user' | 'assistant' | 'tool',
            content: textParts || '',
        };
    })
    .filter(msg => {
        // Filter out empty assistant messages (they cause 400 errors in API)
        if (msg.role === 'assistant' && !msg.content && !('tool_calls' in msg)) {
            console.warn('[Groq] Filtering out empty assistant message from history');
            return false;
        }
        return true;
    });
};

export const getAiResponse = async (
    history: Content[],
    systemPrompt: string,
    useTools: boolean = true,
    workspaceId?: string,
    currentTab?: string
): Promise<GenerateContentResponse> => {
    try {
        // Get the current session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            throw new Error('User not authenticated');
        }

        // Check AI usage limit if workspaceId is provided
        if (workspaceId) {
            const limitCheck = await DatabaseService.checkAILimit(workspaceId);
            
            if (!limitCheck.allowed) {
                throw new AILimitError(
                    `AI usage limit reached. You've used ${limitCheck.usage}/${limitCheck.limit} requests on the ${limitCheck.planType} plan.`,
                    limitCheck.usage,
                    limitCheck.limit,
                    limitCheck.planType
                );
            }
        } else if (process.env.NODE_ENV === 'development') {
            console.warn('[Groq] No workspaceId provided, skipping limit check');
        }

        // Convert Content[] history to Message[] format
        const convertedMessages = convertContentToMessages(history);
        
        // Add system message at the beginning
        const messages: Message[] = [{
            role: 'system',
            content: systemPrompt
        }, ...convertedMessages];

        // Prepare request body
        const requestBody: any = {
            messages,
            temperature: 0.7,
            max_tokens: 4096,
            model: APP_CONFIG.api.groq.defaultModel,
        };

        if (useTools) {
            // Use context-aware tool filtering to reduce token usage
            const tools = currentTab ? getRelevantTools(currentTab) : groqTools;
            requestBody.tools = tools;
            requestBody.tool_choice = 'auto';
        }

        // Call the secure Edge Function
        const { data, error } = await supabase.functions.invoke<EdgeFunctionResponse>('groq-chat', {
            body: requestBody,
        });

        if (error) {
            throw new Error(`Failed to get AI response: ${error.message}`);
        }

        if (data?.error) {
            console.error('[Groq] API error:', data.details);
            
            // Check if it's a rate limit error
            if ((data as any).isRateLimit) {
                const retryAfter = (data as any).retryAfter;
                const message = retryAfter 
                    ? `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`
                    : 'Rate limit exceeded. Please wait a moment before trying again.';
                throw new Error(message);
            }
            
            throw new Error(data.error);
        }

        // Increment AI usage after successful response (if workspaceId provided)
        if (workspaceId && session?.user?.id) {
            await DatabaseService.incrementAIUsage(workspaceId, session.user.id);
        }

        // Check for function calls
        if (data?.functionCalls && data.functionCalls.length > 0) {
            // Transform to format expected by ModuleAssistant
            return {
                functionCalls: data.functionCalls,
                candidates: [{
                    content: {
                        role: 'model',
                        parts: data.functionCalls.map(fc => ({ functionCall: fc })),
                    },
                    finishReason: (data.finishReason || 'STOP') as any,
                }],
            } as GenerateContentResponse;
        }

        // Transform text response to expected format
        return {
            candidates: [{
                content: {
                    role: 'model',
                    parts: [{ text: data?.response || '' }],
                },
                finishReason: (data?.finishReason || 'STOP') as any,
            }],
        } as GenerateContentResponse;
    } catch (error) {
        console.error('[Groq] Error calling API via Edge Function:', error);
        throw error;
    }
};
