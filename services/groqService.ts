import { supabase } from '../lib/supabase';
import { DatabaseService } from '../lib/services/database';
import { APP_CONFIG } from '../lib/config';
import { groqTools } from './groq/tools';

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
    return history.map(content => {
        // Handle user/model roles
        const role = content.role === 'model' ? 'assistant' : content.role;
        
        // Extract text from parts
        const textParts = content.parts
            .filter(p => 'text' in p && p.text)
            .map(p => p.text)
            .join('\n');
        
        // Check for function calls
        const functionCallPart = content.parts.find(p => 'functionCall' in p);
        
        // Check for function responses
        const functionResponsePart = content.parts.find(p => 'functionResponse' in p);
        
        if (functionResponsePart && 'functionResponse' in functionResponsePart) {
            // This is a tool response - must include tool_call_id
            return {
                role: 'tool',
                content: typeof functionResponsePart.functionResponse.response === 'string' 
                    ? functionResponsePart.functionResponse.response 
                    : JSON.stringify(functionResponsePart.functionResponse.response),
                tool_call_id: functionResponsePart.functionResponse.id || 'unknown',
                name: functionResponsePart.functionResponse.name,
            };
        }
        
        // For messages with no text content (like function calls), provide empty string
        return {
            role: role as 'user' | 'assistant' | 'tool',
            content: textParts || '',
        };
    });
};

export const getAiResponse = async (
    history: Content[],
    systemPrompt: string,
    useTools: boolean = true,
    workspaceId?: string
): Promise<GenerateContentResponse> => {
    try {
        // Get the current session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            throw new Error('User not authenticated');
        }

        // Check AI usage limit if workspaceId is provided
        if (workspaceId) {
            console.log('[Groq] Checking AI limit for workspace:', workspaceId);
            const limitCheck = await DatabaseService.checkAILimit(workspaceId);
            console.log('[Groq] Limit check result:', limitCheck);
            
            if (!limitCheck.allowed) {
                throw new AILimitError(
                    `AI usage limit reached. You've used ${limitCheck.usage}/${limitCheck.limit} requests on the ${limitCheck.planType} plan.`,
                    limitCheck.usage,
                    limitCheck.limit,
                    limitCheck.planType
                );
            }
        } else {
            console.warn('[Groq] No workspaceId provided, skipping limit check');
        }

        // Convert Content[] history to Message[] format
        const convertedMessages = convertContentToMessages(history);
        
        // Add system message at the beginning
        const messages: Message[] = [{
            role: 'system',
            content: systemPrompt
        }, ...convertedMessages];

        console.log('[Groq] Sending request with', messages.length, 'messages');
        console.log('[Groq] Last message:', JSON.stringify(messages[messages.length - 1], null, 2));
        console.log('[Groq] All messages:', JSON.stringify(messages, null, 2));

        // Prepare request body
        const requestBody: any = {
            messages,
            temperature: 0.7,
            max_tokens: 4096,
            model: APP_CONFIG.api.groq.defaultModel,
        };

        if (useTools) {
            requestBody.tools = groqTools;
            requestBody.tool_choice = 'auto';
        }

        // Call the secure Edge Function
        const { data, error } = await supabase.functions.invoke<EdgeFunctionResponse>('groq-chat', {
            body: requestBody,
        });

        console.log('[Groq] Edge Function response:', { data, error });

        if (error) {
            console.error('[Groq] Edge Function error:', error);
            throw new Error(`Failed to get AI response: ${error.message}`);
        }

        if (data?.error) {
            console.error('[Groq] API error:', data.details);
            throw new Error(data.error);
        }

        console.log('[Groq] Response text:', data?.response);
        console.log('[Groq] Function calls:', data?.functionCalls);

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
