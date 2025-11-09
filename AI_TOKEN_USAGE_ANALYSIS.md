# AI Token Usage Analysis & Optimization Plan

## Current Implementation Overview

### Model: `openai/gpt-oss-120b` via Groq API
- **Provider**: Groq (ultra-fast LPU infrastructure)
- **Context Window**: ~128K tokens
- **Pricing**: Free tier available (rate limited)
- **Speed**: ~280 tokens/second

---

## Token Usage Breakdown by Component

### 1. **System Prompts** (Sent with EVERY request)

| Context | Approximate Tokens | Content |
|---------|-------------------|---------|
| **Platform AI** | ~250-300 tokens | Base prompt + business context + team context + reporting guidelines + file handling instructions |
| **Investor CRM** | ~200-250 tokens | Base prompt + business context + team context + expertise areas + file handling |
| **Customer CRM** | ~200-250 tokens | Similar to Investor CRM |
| **Partnership** | ~200-250 tokens | Similar to other CRMs |
| **Marketing AI** | ~220-270 tokens | Base prompt + reporting guidelines + metrics analysis |
| **Financial AI** | ~220-270 tokens | Base prompt + CFO expertise + reporting guidelines |

**Issue**: System prompts are repetitive and bloated with instructions that could be cached or simplified.

---

### 2. **Business Context** (Injected into every system prompt)

```typescript
**Business Context: ${companyName}**
- **Company:** ${companyName}
- **Industry:** ${industry}
- **Business Model:** ${businessModel}
- **Primary Goal:** ${primaryGoal}
```

**Estimated**: ~50-100 tokens per request

**Issue**: This is sent with EVERY message, even though business context rarely changes.

---

### 3. **Team Context** (Injected into every system prompt)

```typescript
**Team Members (${workspaceMembers.length}):**
${workspaceMembers.map(member => 
  `- ${member.fullName || member.email} (${member.email}) - Role: ${member.role}`
).join('\n')}
```

**Estimated**: ~20-50 tokens per member = ~100-500 tokens for teams of 5-10 people

**Issue**: Team roster is sent with EVERY request but rarely referenced.

---

### 4. **Function/Tool Definitions** (21 tools)

Tool definitions sent with every request when `useTools=true`:

| Tool | Parameter Count | Estimated Tokens |
|------|----------------|------------------|
| createTask | 5 params + enums | ~80 tokens |
| updateTask | Complex nested object | ~70 tokens |
| addNote | 4 params + enums | ~60 tokens |
| updateNote | 5 params | ~50 tokens |
| deleteNote | 4 params | ~40 tokens |
| createCrmItem | 8 params + enums | ~90 tokens |
| updateCrmItem | Complex nested | ~80 tokens |
| createContact | 5 params | ~60 tokens |
| updateContact | Complex nested | ~60 tokens |
| deleteContact | 3 params | ~40 tokens |
| createMeeting | 5 params | ~60 tokens |
| updateMeeting | Complex nested | ~60 tokens |
| deleteMeeting | 3 params | ~40 tokens |
| logFinancials | 5 params | ~60 tokens |
| deleteItem | 2 params + enum | ~50 tokens |
| createMarketingItem | 6 params + enum | ~70 tokens |
| updateMarketingItem | Complex nested | ~70 tokens |
| updateSettings | Complex nested | ~60 tokens |
| uploadDocument | 4 params | ~60 tokens |
| updateDocument | 4 params | ~60 tokens |
| getFileContent | 1 param | ~40 tokens |

**Total Tool Definitions**: ~1,300-1,500 tokens per request

**Issue**: All 21 tools are sent with EVERY request, even when most are irrelevant to the current conversation.

---

### 5. **Conversation History** (Persistent per tab)

- **Storage**: localStorage per tab context
- **Max Messages**: 100 messages per context
- **Max Size**: 1MB per context
- **Cleanup**: 30 days auto-delete

**Token Usage Pattern**:
- First message: ~2,000 tokens (system + tools + business context + user message)
- 5-message conversation: ~3,500-4,000 tokens (includes all history)
- 10-message conversation: ~5,000-6,000 tokens
- 20-message conversation: ~8,000-10,000 tokens

**Issue**: Full conversation history is sent with EVERY new message. Long conversations can consume 10K+ tokens even for simple follow-ups.

---

### 6. **Function Call Responses**

When AI calls a function, the response is added to history:

```typescript
{
  role: 'tool',
  content: JSON.stringify(functionResponse),
  tool_call_id: 'call_abc123',
  name: 'createTask'
}
```

**Estimated**: ~50-200 tokens per function call (depending on response size)

**Issue**: Large function responses (e.g., list of tasks, CRM items) bloat conversation history.

---

## Total Token Usage Per Request

### Scenario A: First message (cold start)
```
System Prompt:          ~250 tokens
Business Context:       ~75 tokens
Team Context:           ~150 tokens
Tool Definitions:       ~1,400 tokens
User Message:           ~50 tokens
------------------------
TOTAL:                  ~1,925 tokens (input)
Response:               ~200 tokens (output)
TOTAL COST:            ~2,125 tokens
```

### Scenario B: 5th message in conversation
```
System Prompt:          ~250 tokens
Business Context:       ~75 tokens
Team Context:           ~150 tokens
Tool Definitions:       ~1,400 tokens
Conversation History:   ~1,500 tokens (4 previous exchanges)
User Message:           ~50 tokens
------------------------
TOTAL:                  ~3,425 tokens (input)
Response:               ~200 tokens (output)
TOTAL COST:            ~3,625 tokens
```

### Scenario C: 20th message (long conversation)
```
System Prompt:          ~250 tokens
Business Context:       ~75 tokens
Team Context:           ~150 tokens
Tool Definitions:       ~1,400 tokens
Conversation History:   ~6,000 tokens (19 previous exchanges)
User Message:           ~50 tokens
------------------------
TOTAL:                  ~7,925 tokens (input)
Response:               ~200 tokens (output)
TOTAL COST:            ~8,125 tokens
```

---

## Wasteful Patterns Identified

### 🔴 **Critical Waste**

1. **Redundant Business Context** (75 tokens × every request)
   - Sent with every message even though it never changes during a session
   - Could be cached or sent once per session

2. **Redundant Team Context** (150 tokens × every request)
   - Full team roster sent every time
   - Rarely referenced by AI
   - Could be provided only when explicitly needed

3. **Excessive Tool Definitions** (1,400 tokens × every request)
   - All 21 tools sent with EVERY request
   - Most conversations only use 1-3 tools
   - No context-aware tool filtering

4. **Bloated System Prompts** (250+ tokens × every request)
   - Repetitive instructions ("File Handling", "Reporting Guidelines")
   - Could be condensed significantly

### 🟡 **Moderate Waste**

5. **Full Conversation History** (grows unbounded)
   - No summarization or pruning strategy
   - Old messages remain in context forever (up to 100 messages)
   - Could implement sliding window or smart pruning

6. **Large Function Responses** (50-200 tokens each)
   - AI receives full task lists, CRM data dumps
   - Could summarize large responses before adding to history

### 🟢 **Minor Waste**

7. **Verbose Tool Descriptions**
   - Each tool has detailed descriptions and examples
   - Could be shortened without losing functionality

---

## Optimization Recommendations

### Phase 1: Quick Wins (30-40% reduction)

#### 1. **Context-Aware Tool Filtering**
```typescript
// Only send relevant tools based on current tab
const getRelevantTools = (tab: TabType): GroqTool[] => {
  const commonTools = [addNoteTool, updateNoteTool, deleteNoteTool];
  
  switch(tab) {
    case Tab.Platform:
      return [createTaskTool, updateTaskTool, deleteItemTool, ...commonTools];
    case Tab.Investors:
    case Tab.Customers:
    case Tab.Partners:
      return [createCrmItemTool, updateCrmItemTool, createContactTool, 
              updateContactTool, deleteContactTool, createMeetingTool, 
              updateMeetingTool, deleteMeetingTool, ...commonTools];
    case Tab.Marketing:
      return [createMarketingItemTool, updateMarketingItemTool, 
              deleteItemTool, ...commonTools];
    case Tab.Financials:
      return [logFinancialsTool, deleteItemTool, ...commonTools];
    default:
      return commonTools;
  }
};
```
**Savings**: ~800-1,000 tokens per request (reduce from 21 tools to 6-10 tools)

#### 2. **Simplify System Prompts**
Remove redundant instructions, consolidate guidelines:

```typescript
// BEFORE (250+ tokens)
`You are an expert engineering manager for ${companyName}.

${businessContext}
${teamContext}

**Reporting Guidelines:**
When asked for a report, analyze...
- Summarize the number of tasks...
- Calculate the overall completion...
- Highlight any tasks that seem...
- Conclude with a brief...

**File Handling & Global Knowledge Base:**
- The application has a central File Library...
- Use the information in these documents...
- When a user attaches a new file...
- Set module to '${Tab.Platform}'.

**Current Context:**
You are helping with platform development...`

// AFTER (120-150 tokens)
`You are ${companyName}'s AI assistant for platform development.

Context: ${industry} company, ${businessModel} model, goal: ${primaryGoal}

Tools: Create/update tasks, add notes, manage files (module: ${Tab.Platform}).
Reports: Summarize task status, completion %, highlight bottlenecks, suggest actions.`
```
**Savings**: ~100-130 tokens per request

#### 3. **Remove Redundant Context Injection**
Don't repeat business/team context in every system prompt:

```typescript
// Send business context ONCE at start of conversation
// Then reference it implicitly
```
**Savings**: ~225 tokens per request (after first message)

---

### Phase 2: Smart Conversation Management (40-50% reduction)

#### 4. **Sliding Window History**
Only keep last N relevant messages:

```typescript
const getRelevantHistory = (history: Content[], maxMessages: number = 10): Content[] => {
  // Keep system message + last N exchanges
  if (history.length <= maxMessages) return history;
  
  // Keep important messages (user questions, function calls)
  return history.slice(-maxMessages);
};
```
**Savings**: ~3,000-4,000 tokens for long conversations

#### 5. **Conversation Summarization**
After every 10 messages, summarize and compress:

```typescript
// Periodically call AI to summarize conversation
// Replace old messages with summary
```
**Savings**: ~2,000-3,000 tokens for very long conversations

#### 6. **Function Response Pruning**
Summarize large function responses before adding to history:

```typescript
// Instead of adding full task list (500 tokens)
// Add: "Retrieved 15 tasks: 5 todo, 7 in-progress, 3 done" (20 tokens)
```
**Savings**: ~50-150 tokens per function call

---

### Phase 3: Advanced Optimizations (50-60% reduction)

#### 7. **Semantic Caching** (if supported by provider)
Cache static content (tool definitions, business context):
- System prompts
- Tool schemas
- Business profile

**Savings**: ~1,500 tokens per request (after caching)

#### 8. **Lazy Context Loading**
Only inject business/team context when AI explicitly needs it:

```typescript
// Add tool: "getBusinessContext" - only called when needed
// Add tool: "getTeamMembers" - only called when needed
```
**Savings**: ~225 tokens per request (when not needed)

#### 9. **Model Downgrade for Simple Tasks**
Use smaller/faster models for simple responses:

```typescript
// Use llama-3.1-8b-instant for simple Q&A
// Use llama-3.3-70b for complex function calling
```
**Savings**: 60-70% cost reduction for ~40% of requests

---

## Estimated Impact

### Current Average Request
```
First Message:    2,125 tokens
5th Message:      3,625 tokens
20th Message:     8,125 tokens
```

### After Phase 1 Optimizations
```
First Message:    ~1,100 tokens (-48%)
5th Message:      ~2,000 tokens (-45%)
20th Message:     ~5,400 tokens (-34%)
```

### After Phase 1 + Phase 2
```
First Message:    ~1,100 tokens (-48%)
5th Message:      ~1,800 tokens (-50%)
20th Message:     ~2,500 tokens (-69%)
```

### After All Phases (with caching)
```
First Message:    ~600 tokens (-72%)
5th Message:      ~800 tokens (-78%)
20th Message:     ~1,500 tokens (-82%)
```

---

## Priority Implementation Order

1. ✅ **Context-Aware Tool Filtering** (HIGH IMPACT, LOW EFFORT)
   - Reduce 21 tools to 6-10 per context
   - ~800 token savings per request

2. ✅ **Simplify System Prompts** (HIGH IMPACT, LOW EFFORT)
   - Remove verbose instructions
   - ~100-130 token savings per request

3. ✅ **Sliding Window History** (HIGH IMPACT, MEDIUM EFFORT)
   - Limit to last 10-15 messages
   - ~3,000 token savings for long conversations

4. ⚠️ **Function Response Pruning** (MEDIUM IMPACT, MEDIUM EFFORT)
   - Summarize large responses
   - ~100 token savings per function call

5. ⚠️ **Lazy Context Loading** (MEDIUM IMPACT, HIGH EFFORT)
   - Make business/team context on-demand
   - ~225 token savings when not needed

6. 🔮 **Model Selection Strategy** (HIGH IMPACT, HIGH EFFORT)
   - Route simple requests to smaller models
   - ~60% cost savings for simple queries

---

## Next Steps

1. Implement Phase 1 optimizations immediately
2. Monitor token usage after changes
3. Evaluate Phase 2 based on real-world patterns
4. Consider Phase 3 if scaling requires further optimization
