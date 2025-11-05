
import { Content, GenerateContentResponse } from '@google/genai';
import { geminiTools } from './gemini/tools';
import { supabase } from '../lib/supabase';
import { DatabaseService } from '../lib/services/database';

// Now using Supabase Edge Function to keep API key secure
// The VITE_GEMINI_API_KEY is no longer needed in .env

interface EdgeFunctionResponse {
    response?: string;
    functionCalls?: any[];
    finishReason?: string;
    safetyRatings?: any[];
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
            console.log('[Gemini] Checking AI limit for workspace:', workspaceId);
            const limitCheck = await DatabaseService.checkAILimit(workspaceId);
            console.log('[Gemini] Limit check result:', limitCheck);
            
            if (!limitCheck.allowed) {
                throw new AILimitError(
                    `AI usage limit reached. You've used ${limitCheck.usage}/${limitCheck.limit} requests on the ${limitCheck.planType} plan.`,
                    limitCheck.usage,
                    limitCheck.limit,
                    limitCheck.planType
                );
            }
        } else {
            console.warn('[Gemini] No workspaceId provided, skipping limit check');
        }

        // Transform Content[] to message format
        const messages = history.map(content => ({
            role: content.role === 'model' ? 'assistant' as const : 'user' as const,
            content: content.parts.map(part => ('text' in part ? part.text : '')).join(''),
        }));

        // Prepare request body
        const requestBody: any = {
            messages,
            systemInstruction: systemPrompt,
            temperature: 0.7,
            maxTokens: 4096,
        };

        if (useTools) {
            requestBody.tools = [{ functionDeclarations: geminiTools }];
            requestBody.toolConfig = {
                functionCallingConfig: {
                    mode: 'AUTO',
                },
            };
        }

        // Call the secure Edge Function
        const { data, error } = await supabase.functions.invoke<EdgeFunctionResponse>('gemini-chat', {
            body: requestBody,
        });

        console.log('Edge Function response:', { data, error });

        if (error) {
            console.error('Edge Function error:', error);
            throw new Error(`Failed to get AI response: ${error.message}`);
        }

        if (data?.error) {
            console.error('Gemini API error:', data.details);
            throw new Error(data.error);
        }

        console.log('Response text:', data?.response);
        console.log('Function calls:', data?.functionCalls);

        // Increment AI usage after successful response (if workspaceId provided)
        if (workspaceId && session?.user?.id) {
            await DatabaseService.incrementAIUsage(workspaceId, session.user.id);
        }

        // Check for function calls
        if (data?.functionCalls && data.functionCalls.length > 0) {
            // Transform back to GenerateContentResponse format
            return {
                candidates: [{
                    content: {
                        role: 'model',
                        parts: data.functionCalls.map(fc => ({ functionCall: fc })),
                    },
                    finishReason: data.finishReason || 'STOP',
                    safetyRatings: data.safetyRatings || [],
                }],
            } as GenerateContentResponse;
        }

        // Transform text response back to GenerateContentResponse format
        return {
            candidates: [{
                content: {
                    role: 'model',
                    parts: [{ text: data?.response || '' }],
                },
                finishReason: data?.finishReason || 'STOP',
                safetyRatings: data?.safetyRatings || [],
            }],
        } as GenerateContentResponse;
    } catch (error) {
        console.error('Error calling Gemini API via Edge Function:', error);
        throw error;
    }
};