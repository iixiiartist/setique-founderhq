# AI Security Hardening - Implementation Complete

## Overview
This document summarizes the comprehensive security hardening applied to the Huddle AI system, addressing all identified vulnerabilities.

## Changes Implemented

### 1. Streaming Timeout & Abort Support (`huddle-ai-run/index.ts`)

**Problem:** AI streams ran without timeouts; if Groq stalled, the SSE stayed open indefinitely.

**Solution:**
- Added `STREAMING_CONFIG` with 60-second hard timeout for Groq API
- Implemented `AbortController` that listens for client disconnect (`req.signal`)
- Added heartbeat events every 15 seconds to keep connections alive through proxies
- Client can now cancel in-flight requests cleanly

```typescript
const STREAMING_CONFIG = {
  GROQ_TIMEOUT_MS: 60000,
  HEARTBEAT_INTERVAL_MS: 15000,
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,
};
```

### 2. Moderation Fail-Closed (`huddle-ai-run/index.ts`, `huddle-send/index.ts`)

**Problem:** Moderation was fail-open; Llama Guard errors resulted in `flagged: false`.

**Solution:**
- **User input moderation:** Now fails CLOSED on API errors (blocks message)
- **AI output moderation:** Fails open (allows response but logs warning)
- Added timeout to moderation API calls (10 seconds)
- High-severity categories (S1, S3, S4, S9, S11) always block
- Moderation results stored in message metadata for UI display

### 3. Tool Execution Idempotency (`huddle-ai-run/index.ts`)

**Problem:** SSE replays could re-run tool calls, creating duplicate records.

**Solution:**
- Generate deterministic `tool_call_hash` using SHA-256 of `requestId + toolName + arguments`
- Check `ai_tool_executions` table before executing
- Return cached results for duplicate calls
- Persist all executions with full audit trail

```sql
CREATE TABLE ai_tool_executions (
  tool_call_hash VARCHAR(64) UNIQUE,
  request_id UUID,
  workspace_id UUID,
  user_id UUID,
  tool_name VARCHAR(100),
  tool_arguments JSONB,
  result JSONB,
  success BOOLEAN,
  created_at TIMESTAMPTZ
);
```

### 4. Server-Side Tool Authorization (`huddle-ai-run/index.ts`)

**Problem:** `ai_can_write` only gated tool inclusion; any user could execute tools via service role.

**Solution:**
- Added `TOOL_PERMISSIONS` map by role:
  - `owner/admin`: All tools
  - `member`: Create task/note/contact/calendar/web_search
  - `viewer`: Web search only
- Server-side permission check in `executeToolCall()` before any DB operation
- Logs permission denials with full context

### 5. Context Budgeting & PII Redaction (`huddle-ai-run/index.ts`)

**Problem:** Documents and form submissions dropped wholesale into prompts without filtering.

**Solution:**
- Added `CONTEXT_LIMITS` for total context, per-entity, per-document
- Implemented `PII_PATTERNS` for SSN, credit cards, emails, phone numbers
- Added `redactPII()` and `redactObjectPII()` functions
- Form submission data automatically redacted before context injection
- Documents truncated with `_truncated` flag

### 6. Web Search Sanitization (`huddle-ai-run/index.ts`)

**Problem:** Web search snippets appended verbatim, enabling prompt injection.

**Solution:**
- Added `sanitizeUntrustedContent()` function that:
  - Removes instruction-like patterns ("ignore previous instructions")
  - Strips HTML/script tags
  - Wraps content in provenance markers: `[From example.com]: "..."`
  - Truncates to 500 chars
- Added 10-second timeout for web search API calls

### 7. Rate Limiting (`huddle-send/index.ts`)

**Problem:** No per-user/room rate limits; spam could blow up realtime.

**Solution:**
- Added `RATE_LIMITS` configuration:
  - 20 messages per minute per user
  - 200 messages per hour per user
  - 10,000 max message length
  - 10 max attachments, 10MB max size
- Added `ALLOWED_MIME_TYPES` for attachment filtering
- Returns 429 with `Retry-After` header on limit exceeded

### 8. Audit Logging (`huddle-ai-run/index.ts`)

**Problem:** No structured logging of tool executions, moderation decisions, or usage.

**Solution:**
- Added structured `log()` function with JSON output
- Logs include: `requestId`, `workspaceId`, `userId`, `timestamp`
- Logged events:
  - Request start/complete with latency
  - Token usage estimates
  - Moderation decisions (pre/post)
  - Tool executions with outcomes
  - Rate limit decisions
  - Errors with full context
- API balance decremented after each request

### 9. User Message Insert Validation (`huddle-ai-run/index.ts`)

**Problem:** AI work could proceed even if user message insert failed, corrupting threads.

**Solution:**
- Added explicit error check after user message insert
- Returns 500 immediately if insert fails
- Logs the error with full context
- AI processing never starts without valid root message

### 10. Client Abort & Realtime Backoff (`huddleService.ts`, `useHuddle.ts`)

**Problem:** Client couldn't cancel in-flight AI runs; realtime thrashed on errors.

**Solution:**
- Added `abortSignal` parameter to `invokeAI()`
- `useInvokeAI` hook now has `cancel()` method
- Cleanup on component unmount aborts pending requests
- `useRealtimeMessages` implements exponential backoff:
  - Max 5 retry attempts
  - 1s base delay, 30s max delay
  - Resets on successful message

### 11. UI Safety Indicators (`MessageBubble.tsx`)

**Problem:** Moderation results and tool errors not visible to users.

**Solution:**
- Added moderation status badges:
  - Green shield: Content passed safety review
  - Amber shield: Content was flagged (with category tooltip)
- Tool call cards now show:
  - Success with "cached" indicator for idempotent returns
  - Failure with error message in red card
- Added new icons: `ShieldAlert`, `ShieldCheck`, `XCircle`

### 12. Model Selection Guardrails (`huddle-ai-run/index.ts`)

**Problem:** Free-form model names could cause malformed requests or costly models.

**Solution:**
- Added `ALLOWED_MODELS` server-side allowlist
- Validates selected model before API call
- Falls back to default (`llama-3.3-70b-versatile`) if invalid
- Logs model selection decisions

## Database Migration Required

Run the following SQL to create the tool executions table:

```sql
-- See sql/create_ai_tool_executions_table.sql
```

## Configuration

### Environment Variables (unchanged)
- `GROQ_API_KEY`: Required for AI and moderation
- `YOUCOM_API_KEY` or `YOU_COM_API_KEY`: Optional for web search

### New Timeouts
- Groq API: 60 seconds
- Moderation API: 10 seconds
- Web search: 10 seconds
- Client-side backup: 5 minutes

## Testing Recommendations

1. **Moderation gating:** Test with known-bad content to verify blocking
2. **Tool idempotency:** Trigger same tool call twice, verify only one record created
3. **Rate limiting:** Send rapid messages, verify 429 after limit
4. **Timeout handling:** Slow network simulation to test abort behavior
5. **Realtime backoff:** Kill Supabase connection to verify retry behavior
6. **PII redaction:** Submit forms with emails/phones, verify redaction in context

## Remaining Considerations

1. **Attachment virus scanning:** Currently MIME/size checked only; consider ClamAV integration
2. **Voice transcription moderation:** Not yet implemented for audio messages
3. **Data retention:** Context fetching doesn't yet respect `retention_days` setting
4. **Integration tests:** Should be added for critical security paths
