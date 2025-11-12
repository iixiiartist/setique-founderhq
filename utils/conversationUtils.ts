// Conversation history utilities for token optimization

interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { id?: string; name: string; args: any };
  functionResponse?: { id?: string; name: string; response: any };
}

interface Content {
  role: 'user' | 'model' | 'tool';
  parts: Part[];
}

/**
 * Get relevant conversation history for AI context.
 * Uses a sliding window approach to limit token usage while preserving important context.
 * 
 * Strategy:
 * - Keep last 8-10 messages (most recent context)
 * - Always preserve function calls and their responses (they're essential for multi-step operations)
 * - For long conversations, older messages are dropped
 * 
 * OPTIMIZATION: Reduced from 15 to 10 messages to save ~30-40% tokens on long conversations
 * 
 * @param history Full conversation history
 * @param maxMessages Maximum number of messages to include (default: 10, reduced from 15)
 * @returns Filtered history array
 */
export function getRelevantHistory(
  history: Content[],
  maxMessages: number = 10
): Content[] {
  if (history.length <= maxMessages) {
    return history;
  }

  // Strategy: Keep the most recent messages
  // Function calls are part of the natural flow, so we just take the tail
  const recentHistory = history.slice(-maxMessages);
  
  // Ensure we don't split function call/response pairs
  // If the first message is a function response, include its corresponding call
  const firstMessage = recentHistory[0];
  if (firstMessage.role === 'tool') {
    // Look back in the full history for the corresponding function call
    const callIndex = history.findIndex(msg => 
      msg.parts.some(part => 
        part.functionCall && 
        firstMessage.parts.some(respPart => 
          respPart.functionResponse?.name === part.functionCall?.name
        )
      )
    );
    
    if (callIndex !== -1 && callIndex < history.length - maxMessages) {
      // Include the function call that corresponds to this response
      return [history[callIndex], ...recentHistory];
    }
  }

  return recentHistory;
}

/**
 * Estimate token count for a message (rough approximation).
 * Used for debugging and optimization analysis.
 * 
 * @param message Message content
 * @returns Estimated token count
 */
export function estimateTokens(message: Content): number {
  let count = 0;
  
  for (const part of message.parts) {
    if (part.text) {
      // Rough approximation: 1 token ~= 4 characters
      count += Math.ceil(part.text.length / 4);
    }
    if (part.inlineData) {
      // Base64 encoded data, rough approximation
      count += Math.ceil(part.inlineData.data.length / 4);
    }
    if (part.functionCall) {
      // Function call overhead + args
      count += 10 + Math.ceil(JSON.stringify(part.functionCall.args).length / 4);
    }
    if (part.functionResponse) {
      // Function response overhead + response data
      count += 10 + Math.ceil(JSON.stringify(part.functionResponse.response).length / 4);
    }
  }
  
  return count;
}

/**
 * Prune large function responses to reduce token usage.
 * Detects responses over 200 tokens and creates concise summaries.
 * 
 * @param response Function response data
 * @param functionName Name of the function
 * @returns Pruned response (original if small, summary if large)
 */
export function pruneFunctionResponse(response: any, functionName: string): any {
  const responseStr = JSON.stringify(response);
  const estimatedTokens = Math.ceil(responseStr.length / 4);
  
  // If response is small enough, return as-is
  if (estimatedTokens <= 200) {
    return response;
  }
  
  // Create summaries based on function type
  if (functionName === 'getTasks' || functionName === 'listTasks') {
    if (Array.isArray(response)) {
      return {
        summary: `Retrieved ${response.length} tasks`,
        sample: response.slice(0, 2), // First 2 tasks as examples
        total: response.length
      };
    }
  }
  
  if (functionName === 'getInvestors' || functionName === 'listInvestors' ||
      functionName === 'getCustomers' || functionName === 'listCustomers' ||
      functionName === 'getPartners' || functionName === 'listPartners') {
    if (Array.isArray(response)) {
      return {
        summary: `Retrieved ${response.length} records`,
        sample: response.slice(0, 2),
        total: response.length
      };
    }
  }
  
  if (functionName === 'getCampaigns' || functionName === 'listCampaigns') {
    if (Array.isArray(response)) {
      return {
        summary: `Retrieved ${response.length} campaigns`,
        sample: response.slice(0, 2),
        total: response.length
      };
    }
  }
  
  if (functionName === 'getFinancialLogs' || functionName === 'listFinancialLogs') {
    if (Array.isArray(response)) {
      return {
        summary: `Retrieved ${response.length} financial logs`,
        sample: response.slice(0, 2),
        total: response.length
      };
    }
  }
  
  if (functionName === 'getNotes' || functionName === 'listNotes') {
    if (Array.isArray(response)) {
      return {
        summary: `Retrieved ${response.length} notes`,
        sample: response.slice(0, 2),
        total: response.length
      };
    }
  }
  
  // Generic fallback: truncate large objects
  if (typeof response === 'object') {
    return {
      summary: `Large response from ${functionName}`,
      truncated: true,
      tokenEstimate: estimatedTokens
    };
  }
  
  return response;
}
