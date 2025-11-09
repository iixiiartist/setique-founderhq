
import { Content, GenerateContentResponse, Part } from '@google/genai';
import { geminiTools } from './gemini/tools';
import { supabase } from '../lib/supabase';
import { DatabaseService } from '../lib/services/database';

// Now using Supabase Edge Function to keep API key secure
// The VITE_GEMINI_API_KEY is no longer needed in .env

// Helper function to serialize parts for transmission to edge function
// Ensures functionResponse.response is always a string (Gemini API requirement)
const serializePart = (part: Part): any => {
    // Handle text parts
    if ('text' in part) {
        return part;
    }
    
    // Handle inline data (images, files)
    if ('inlineData' in part) {
        return part;
    }
    
    // Handle function calls
    if ('functionCall' in part) {
        return part;
    }
    
    // Handle function responses - ensure response is string
    if ('functionResponse' in part) {
        const response = part.functionResponse.response;
        return {
            functionResponse: {
                name: part.functionResponse.name,
                response: typeof response === 'string' ? response : JSON.stringify(response)
            }
        };
    }
    
    // Pass through any other part types
    return part;
};

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

        // Serialize Content[] to preserve full conversation context
        // This maintains functionCall and functionResponse parts across turns
        const serializedHistory = history.map(content => ({
            role: content.role,
            parts: content.parts.map(part => serializePart(part))
        }));

        console.log('[Gemini] Sending history with', serializedHistory.length, 'entries');
        console.log('[Gemini] Last entry role:', serializedHistory[serializedHistory.length - 1]?.role);
        console.log('[Gemini] Last entry parts:', JSON.stringify(serializedHistory[serializedHistory.length - 1]?.parts, null, 2));

        // Prepare request body using new contents format
        const requestBody: any = {
            contents: serializedHistory,
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