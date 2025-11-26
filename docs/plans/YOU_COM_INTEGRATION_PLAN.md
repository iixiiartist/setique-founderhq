# You.com API Integration Plan

## Overview

This plan outlines the integration of the You.com API to enhance the AI assistant with real-time web search capabilities. This will allow the assistant to perform research, fetch news, find images, and generate data-driven reports and charts using external sources.

## 1. Backend Infrastructure (Supabase Edge Functions)

We will create a new Supabase Edge Function `ai-search` to handle communication with the You.com API. This keeps the API key secure and centralizes the logic.

### 1.1. Environment Variables

- `YOUCOM_API_KEY`: Store this in Supabase Secrets.

### 1.2. Edge Function: `ai-search`

- **Endpoint:** `/functions/v1/ai-search`
- **Input:**
  - `query`: The user's search query.
  - `mode`: 'search' | 'news' | 'images' | 'rag' (Retrieval-Augmented Generation).
- **Logic:**
  - Call You.com API (`api.ydc-index.io`) based on the mode.
  - **Search/News:** Use `/search` or `/news` endpoints.
  - **Images:** Use `/images` endpoint (if available/applicable) or parse image results from search.
  - **RAG:** Use `/rag` endpoint if You.com provides a direct RAG endpoint, or perform a search and then feed snippets to the LLM (Groq) for synthesis. *Note: You.com has a `/rag` endpoint that returns generated text based on search results.*
- **Output:** JSON response containing search results (snippets, URLs, titles) or the generated answer.

## 2. Frontend Integration

### 2.1. Service Layer (`lib/services/youSearchService.ts`)

- Create a frontend service to call the `ai-search` Edge Function.
- Methods:
  - `searchWeb(query: string)`
  - `searchNews(query: string)`
  - `searchImages(query: string)`
  - `getResearchAnswer(query: string)` (Uses RAG)

### 2.2. AI Assistant UI (`components/workspace/AICommandPalette.tsx`)

- **Toggle Button:** Add a "🌐 Web Search" toggle button next to the input field.
- **State:** Track `isWebSearchEnabled`.
- **Logic Update:**
  - If `isWebSearchEnabled` is true:
    - Call `youSearchService.getResearchAnswer(prompt)` instead of the standard `getAiResponse`.
    - Or, perform a search first, append the results to the system prompt, and then call the existing LLM (Groq) to generate the final content. *Hybrid approach is often better for control.*
  - **Chart Generation:** If the user asks for a chart with external data (e.g., "Chart of Tesla stock last year"), the system should:
    1. Detect intent.
    2. Use You.com to find the data points.
    3. Format the data into the `chart-config` JSON format expected by the editor.

### 2.3. Document Editor Integration (`components/workspace/DocEditor.tsx`)

- The `AICommandPalette` is already integrated. The changes above will automatically empower the editor.
- **Image Insertion:** Add a specific command or button in the AI palette for "Find & Insert Image".
  - Flow: User types "Image of a modern office" -> AI calls You.com Images -> Displays a grid of results -> User selects one -> Inserts into editor.

## 3. Database Schema

- No major schema changes required for the search functionality itself.
- Optional: Log search usage or cache results in a `search_cache` table if costs become a concern, but likely not needed for V1.

## 4. Implementation Steps

1. **Setup Secrets:** Configure `YOUCOM_API_KEY` in Supabase.
2. **Develop Edge Function:** Create and deploy `supabase/functions/ai-search`.
3. **Frontend Service:** Implement `lib/services/youSearchService.ts`.
4. **UI Update:** Modify `AICommandPalette.tsx` to include the toggle and handle the new data flow.
5. **Prompt Engineering:** Update the system prompt to understand how to use the search context (e.g., "Based on the following search results...").
6. **Testing:** Verify search results, citation accuracy, and chart generation from external data.

## 5. Technical Considerations

- **Latency:** Web searches add latency. Show a "Searching the web..." loading state.
- **Citations:** You.com provides source URLs. The AI should be instructed to include these as footnotes or links.
- **Context Window:** Search results can be long. We may need to truncate or summarize snippets before passing them to the main LLM if using a hybrid approach.

## 6. Example User Flows

- **Research:** "Research the latest trends in B2B SaaS marketing for 2025." -> Assistant searches web -> Summarizes top 5 trends with sources.
- **Chart:** "Create a bar chart comparing iPhone sales vs Android sales in 2024." -> Assistant searches data -> Generates `chart-config` JSON -> Editor renders chart.
- **News:** "What's the latest news on our competitor X?" -> Assistant searches news -> Provides summary.
