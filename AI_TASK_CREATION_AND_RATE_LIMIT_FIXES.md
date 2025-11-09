# AI Task Creation and Rate Limit Fixes

## Issues Fixed

### 1. Task Creation Error - Invalid UUID for assignedTo
**Error**: `invalid input syntax for type uuid: "joe@setique.com"`

**Root Cause**: The AI was passing `null` for the `assignedTo` parameter, but the tool schema defined it as `type: 'string'`, which doesn't allow null values in Groq's strict validation.

**Fix**: Updated `services/groq/tools.ts` - `createTaskTool`:
- Changed `assignedTo` type from `type: 'string'` to `type: ['string', 'null']`
- Updated description to clarify it expects a UUID, not an email address
- Made it clear that null is acceptable for unassigned tasks

```typescript
assignedTo: { 
    type: ['string', 'null'], 
    description: 'Optional. User ID (UUID) of the team member to assign this task to. Set to null or omit if the task should be unassigned. Do NOT use email addresses.' 
}
```

### 2. Groq Rate Limit Errors
**Error**: `Rate limit reached for model openai/gpt-oss-120b - 429 status`

**Current Limit**: 8,000 tokens per minute on Groq's free tier

**Fixes Applied**:

#### A. Edge Function (`supabase/functions/groq-chat/index.ts`)
- Added intelligent error parsing to detect rate limit errors
- Extracts retry time from error message
- Returns structured error response with `isRateLimit` flag and `retryAfter` seconds

```typescript
if (errorJson.error?.code === 'rate_limit_exceeded') {
    isRateLimit = true;
    // Extract retry time from error message
    const match = errorJson.error?.message?.match(/try again in (\d+\.?\d*)/i);
    if (match) {
        retryAfter = Math.ceil(parseFloat(match[1]));
    }
}
```

#### B. Client Service (`services/groqService.ts`)
- Enhanced error handling to detect rate limit responses
- Provides user-friendly error messages with wait time
- Allows UI to show appropriate retry countdown

```typescript
if ((data as any).isRateLimit) {
    const retryAfter = (data as any).retryAfter;
    const message = retryAfter 
        ? `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`
        : 'Rate limit exceeded. Please wait a moment before trying again.';
    throw new Error(message);
}
```

## Testing

### Test Task Creation with Null Assignment
1. Ask AI to create a task without specifying who it's assigned to
2. Should successfully create task with `assignedTo: null`
3. No more UUID validation errors

### Test Rate Limit Handling
1. Make multiple rapid AI requests
2. When rate limit is hit, error message should display:
   - "Rate limit exceeded. Please wait X seconds before trying again."
3. UI should show appropriate countdown/warning

## Related Files Modified

1. ✅ `services/groq/tools.ts` - Fixed createTask tool schema
2. ✅ `supabase/functions/groq-chat/index.ts` - Enhanced error parsing
3. ✅ `services/groqService.ts` - Better error handling

## Recommendations for Rate Limits

### Short Term
- The existing client-side rate limit (10 requests/minute) in `ModuleAssistant.tsx` helps
- Better error messages help users understand wait times

### Medium Term
Consider implementing:
1. **Exponential Backoff**: Automatically retry after rate limit with increasing delays
2. **Request Queuing**: Queue requests client-side when approaching limits
3. **Token Estimation**: Estimate tokens before sending to avoid hitting limits mid-conversation

### Long Term
Consider upgrading Groq plan:
- Free tier: 8,000 TPM
- Paid tiers: Higher limits available at https://console.groq.com/settings/billing

## Notes

- The tool schema validation is very strict - `type: 'string'` doesn't allow null
- Using `type: ['string', 'null']` properly handles optional nullable fields
- Rate limit errors are now user-friendly instead of showing raw API errors
- The AI should now understand to use UUIDs, not email addresses, for task assignment
