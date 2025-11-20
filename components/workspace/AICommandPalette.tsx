import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { DocType, DashboardData } from '../../types';
import { DOC_TYPE_LABELS } from '../../constants';
import { AIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';
import { getAiResponse } from '../../services/groqService';
import { searchWeb } from '@/src/lib/services/youSearchService';
import type { YouSearchImageResult, YouSearchMetadata } from '@/src/lib/services/youSearch.types';

// Helper to extract text from AI response
function extractTextFromResponse(response: any): string {
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('No response from AI');
  }
  
  const candidate = response.candidates[0];
  const parts = candidate.content.parts;
  
  if (!parts || parts.length === 0) {
    throw new Error('No content in AI response');
  }
  
  // Extract text from parts
  const textParts = parts
    .filter((part: any) => part.text)
    .map((part: any) => part.text)
    .join('\n');
  
  return textParts || '';
}

// Convert HTML to clean text for AI context
function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeUrl = (value?: string | null) => {
  if (!value) return '';
  try {
    return new URL(value).toString();
  } catch {
    try {
      return new URL(`https://${value}`).toString();
    } catch {
      return value;
    }
  }
};

const buildImageInsertHtml = (image: YouSearchImageResult) => {
  if (!image.imageUrl) return '';
  const caption = escapeHtml(image.title || 'Research visual');
  const imageUrl = escapeHtml(image.imageUrl);
  const normalizedSource = normalizeUrl(image.url);
  const safeSource = escapeHtml(normalizedSource);
  const displayUrl = normalizedSource ? escapeHtml(normalizedSource.replace(/^https?:\/\//, '')) : '';
  const sourceLink = normalizedSource
    ? ` · <a href="${safeSource}" target="_blank" rel="noopener noreferrer">${displayUrl || safeSource}</a>`
    : '';

  return `<figure class="doc-research-image" data-source-url="${safeSource}">
    <img src="${imageUrl}" alt="${caption}" />
    <figcaption>${caption}${sourceLink}</figcaption>
  </figure>`;
};

const formatHostname = (value?: string | null) => {
  if (!value) return '';
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    try {
      return new URL(`https://${value}`).hostname.replace(/^www\./, '');
    } catch {
      return value;
    }
  }
};

const formatRelativeTime = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

interface AICommandPaletteProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
  workspaceContext: AIWorkspaceContext;
  docType: DocType;
  data: DashboardData;
  docTitle: string;
  workspaceName?: string | null;
  tags: string[];
}

// Quick suggestion buttons for common prompts
const QUICK_SUGGESTIONS = [
  { label: '📋 Executive Summary', prompt: 'Write an executive summary for this document based on our business context' },
  { label: '🎯 Key Messages', prompt: 'Generate 3-5 key messages that align with our value proposition and target market' },
  { label: '👥 Target Audience', prompt: 'Describe our target audience with pain points and buying behaviors' },
  { label: '💡 Value Props', prompt: 'List our key value propositions and competitive differentiators' },
  { label: '🚀 Go-to-Market', prompt: 'Outline a go-to-market strategy based on our business model and target market' },
  { label: '⚔️ Competitive Analysis', prompt: 'Analyze our competitive landscape and positioning' },
  { label: '💬 Messaging Framework', prompt: 'Create a messaging framework with tagline, positioning, and key messages' },
  { label: '📈 Launch Timeline', prompt: 'Create a product launch timeline with milestones and activities' },
];

// Chart generation quick commands
const CHART_SUGGESTIONS = [
  { label: '📈 Revenue Chart', prompt: 'Create a line chart showing our revenue trends over time using financial data' },
  { label: '🥧 Expense Breakdown', prompt: 'Create a pie chart breaking down our expenses by category' },
  { label: '📊 Sales Pipeline', prompt: 'Create a bar chart showing our customer pipeline by stage' },
  { label: '📉 Growth Metrics', prompt: 'Create an area chart showing signups, customers, and revenue growth' },
];

const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional', icon: '👔' },
  { id: 'persuasive', label: 'Persuasive', icon: '🔥' },
  { id: 'casual', label: 'Casual', icon: '👋' },
  { id: 'technical', label: 'Technical', icon: '⚙️' },
];

const FORMAT_OPTIONS = [
  { id: 'auto', label: 'Auto', icon: '✨' },
  { id: 'list', label: 'Bullet Points', icon: '•' },
  { id: 'table', label: 'Table', icon: '▦' },
  { id: 'summary', label: 'Summary', icon: '📝' },
];

export const AICommandPalette: React.FC<AICommandPaletteProps> = ({
  editor,
  position,
  onClose,
  workspaceContext,
  docType,
  data,
  docTitle,
  workspaceName,
  tags,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState('professional');
  const [format, setFormat] = useState('auto');
  const [showOptions, setShowOptions] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [webSearchMode, setWebSearchMode] = useState<'text' | 'images'>('text');
  const [imageResults, setImageResults] = useState<YouSearchImageResult[]>([]);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);
  const [lastImageQuery, setLastImageQuery] = useState<string | null>(null);
  const [imageSearchMetadata, setImageSearchMetadata] = useState<YouSearchMetadata | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Get selection state
  const hasSelection = !editor.state.selection.empty;
  const selectedText = hasSelection
    ? htmlToText(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to))
    : '';

  // Determine mode based on selection
  const mode: 'insert' | 'replace' | 'improve' = hasSelection 
    ? (prompt.toLowerCase().includes('improve') || prompt.toLowerCase().includes('rewrite') || prompt.toLowerCase().includes('enhance')
        ? 'improve'
        : 'replace')
    : 'insert';

  const safeDocTitle = docTitle?.trim() || 'Untitled Document';
  const derivedWorkspaceName = workspaceName?.trim() || workspaceContext.businessProfile?.companyName || 'Workspace';
  const tagSignature = (tags ?? []).slice(0, 3).join('|');
  const primaryTag = (tags ?? [])[0] || 'top competitors';
  const currentYear = new Date().getFullYear();
  const quickPrompts = useMemo(
    () => [
      `Latest market news about ${safeDocTitle || 'our product'}`,
      `Key stats for ${derivedWorkspaceName || 'our company'} ${currentYear}`,
      `Competitor analysis for ${primaryTag}`,
      'Customer sentiment trends this quarter',
      'Top 5 industry benchmarks to cite',
    ],
    [safeDocTitle, derivedWorkspaceName, tagSignature, primaryTag, currentYear],
  );

  const fetchImageReferences = useCallback(
    async (customQuery?: string): Promise<YouSearchImageResult[]> => {
      const effectiveQuery = (customQuery ?? prompt).trim();
      if (!effectiveQuery) {
        setImageSearchError('Enter a prompt before fetching visuals.');
        setImageResults([]);
        setImageSearchMetadata(null);
        return [];
      }

      try {
        setImageSearchLoading(true);
        setImageSearchError(null);
        const payload = await searchWeb(effectiveQuery, 'images');
        const visuals = payload.images ?? [];
        setImageResults(visuals);
        setLastImageQuery(effectiveQuery);
        setImageSearchMetadata(payload.metadata ?? null);
        if (!visuals.length) {
          setImageSearchError('No visuals found for this query. Try a more specific description.');
        }
        return visuals;
      } catch (err: any) {
        console.error('[AICommandPalette] image search failed', err);
        setImageSearchError(err?.message ?? 'Image search failed.');
        setImageSearchMetadata(null);
        return [];
      } finally {
        setImageSearchLoading(false);
      }
    },
    [prompt],
  );

  const insertImageResult = useCallback(
    (image: YouSearchImageResult) => {
      if (!editor || !image?.imageUrl) return;
      const html = buildImageInsertHtml(image);
      if (!html) return;
      editor.chain().focus().insertContent(html).run();
    },
    [editor],
  );

  useEffect(() => {
    // Focus textarea on mount
    textareaRef.current?.focus();

    // Close on Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Generate on Cmd+Enter / Ctrl+Enter
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
    };

    // Close on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, prompt]);

  useEffect(() => {
    if (!isWebSearchEnabled && webSearchMode !== 'text') {
      setWebSearchMode('text');
    }
    if (!isWebSearchEnabled || webSearchMode !== 'images') {
      setImageResults([]);
      setImageSearchError(null);
      setLastImageQuery(null);
      setImageSearchLoading(false);
      setImageSearchMetadata(null);
    }
  }, [isWebSearchEnabled, webSearchMode]);

  // Build system prompt with full workspace context
  const buildSystemPrompt = (): string => {
    const { businessProfile } = workspaceContext;
    
    if (!businessProfile) {
      return `You are a professional GTM content writer. Generate high-quality content in HTML format. Be concise and professional.

CRITICAL: You have NO business data available. Write strategically without inventing metrics, numbers, or timelines. Focus on frameworks and best practices.`;
    }

    const { companyName, description, targetMarket, valueProposition, businessModel } = businessProfile;

    // Build data availability summary for AI awareness
    const dataAvailability: string[] = [];
    
    // Token-optimized context summaries - compact counts only, no full data dumps
    const investorCount = data.investors?.length || 0;
    const investorContext = investorCount > 0
      ? `${investorCount} investor${investorCount !== 1 ? 's' : ''} tracked`
      : '';
    if (investorContext) dataAvailability.push('investors');
    
    const customerCount = data.customers?.length || 0;
    const customerContext = customerCount > 0
      ? `${customerCount} customer${customerCount !== 1 ? 's' : ''} tracked`
      : '';
    if (customerContext) dataAvailability.push('customers');
    
    const partnerCount = data.partners?.length || 0;
    const partnerContext = partnerCount > 0
      ? `${partnerCount} partner${partnerCount !== 1 ? 's' : ''} tracked`
      : '';
    if (partnerContext) dataAvailability.push('partners');
    
    const marketingCount = data.marketing?.length || 0;
    const marketingContext = marketingCount > 0
      ? `${marketingCount} marketing campaign${marketingCount !== 1 ? 's' : ''} tracked`
      : '';
    if (marketingContext) dataAvailability.push('marketing campaigns');
    
    // Calculate total MRR and GMV from financials array
    const latestFinancial = data.financials?.length > 0 
      ? data.financials.reduce((latest, f) => f.date > latest.date ? f : latest, data.financials[0])
      : null;
    const revenueContext = latestFinancial
      ? `Revenue: $${latestFinancial.mrr.toLocaleString()} MRR, $${latestFinancial.gmv.toLocaleString()} GMV (as of ${latestFinancial.date})`
      : businessProfile.currentMrr
      ? `Revenue: $${businessProfile.currentMrr.toLocaleString()} MRR`
      : '';
    if (revenueContext) dataAvailability.push('financial metrics');

    // Add expenses context
    const expenseCount = data.expenses?.length || 0;
    const totalExpenses = data.expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const expenseContext = expenseCount > 0
      ? `${expenseCount} expense${expenseCount !== 1 ? 's' : ''} tracked (Total: $${totalExpenses.toLocaleString()})`
      : '';
    if (expenseContext) dataAvailability.push('expenses');
    
    const dataAvailabilitySummary = dataAvailability.length > 0
      ? `\nAVAILABLE DATA: ${dataAvailability.join(', ')}`
      : `\nAVAILABLE DATA: Business profile only (no CRM or financial data)`;

    return `You are a professional GTM content writer for ${companyName}.

Document Type: ${DOC_TYPE_LABELS[docType]}
Selected Tone: ${tone.toUpperCase()}
Requested Format: ${format.toUpperCase()}

Business Context:
- Product: ${description || 'N/A'}
- Target Market: ${targetMarket || 'N/A'}
- Value Prop: ${valueProposition || 'N/A'}
- Business Model: ${businessModel || 'N/A'}
${dataAvailabilitySummary}

Workspace Data Context (ONLY USE THESE - DO NOT INVENT):
${investorContext ? `- ${investorContext}` : '- No investor data available'}
${customerContext ? `- ${customerContext}` : '- No customer data available'}
${partnerContext ? `- ${partnerContext}` : '- No partner data available'}
${marketingContext ? `- ${marketingContext}` : '- No marketing campaign data available'}
${revenueContext ? `- ${revenueContext}` : '- No financial data available'}
${expenseContext ? `- ${expenseContext}` : '- No expense data available'}

For Chart Generation - Available Data Counts:
- Financial Logs: ${data.financials?.length || 0} entries
- Expenses: ${data.expenses?.length || 0} entries
- CRM Items: ${(data.investors?.length || 0) + (data.customers?.length || 0) + (data.partners?.length || 0)} total (${data.investors?.length || 0} investors, ${data.customers?.length || 0} customers, ${data.partners?.length || 0} partners)
- Marketing Campaigns: ${data.marketing?.length || 0} campaigns
- Tasks: ${(data.productsServicesTasks?.length || 0) + (data.investorTasks?.length || 0) + (data.customerTasks?.length || 0) + (data.partnerTasks?.length || 0) + (data.marketingTasks?.length || 0) + (data.financialTasks?.length || 0)} tasks

CRITICAL GROUNDING RULES:
1. ONLY use data explicitly provided in the Business Context and Workspace Data Context above
2. NEVER invent, estimate, or hallucinate financial numbers, metrics, dates, or statistics
3. If specific data is not provided (revenue, customer counts, timelines), write strategically WITHOUT making up numbers
4. Use placeholder language like "our current metrics" or "based on performance" instead of fake numbers
5. If asked for financial projections or data you don't have, state clearly: "Financial data not available in workspace. Please add actual metrics to your workspace for accurate reporting."
6. Focus on strategy, positioning, and messaging - areas where you can add value without data
7. When real data IS provided above, use it accurately and cite it properly

CHART GENERATION CAPABILITY:
If the user requests a chart, graph, or data visualization, respond with:
\`\`\`chart-config
{
  "chartType": "line" | "bar" | "pie" | "area",
  "title": "Chart Title",
  "data": [{"key": "value", ...}],
  "dataKeys": ["key1", "key2"],
  "xAxisKey": "key",
  "colors": ["#3b82f6", "#10b981"],
  "width": 700,
  "height": 350,
  "showLegend": true,
  "showGrid": true
}
\`\`\`

Chart type guidance:
- "line": For trends over time (revenue growth, signups over months)
- "bar": For comparisons (pipeline stages, counts by category)
- "pie": For distribution/breakdown (expense categories, deal stages)
- "area": For cumulative metrics (total revenue, customer growth)

Use the available workspace data listed above to populate the chart. DO NOT invent data.

Formatting Guidelines:
- Tone: Adopt a ${tone} tone.
- Format: ${format === 'list' ? 'Use bullet points or numbered lists.' : format === 'table' ? 'Format the output as a table.' : format === 'summary' ? 'Keep it concise and summarized.' : 'Use appropriate HTML structure.'}
- Use HTML tags for styling: <h2>, <h3> for headings, <p> for paragraphs, <ul>/<li> for lists, <strong> for emphasis, <em> for italics.
- Use <blockquote> for key takeaways or quotes.
- Be concise and professional.
- Focus on GTM strategy and business outcomes.
- Use data-driven insights ONLY when real data is available above.

Important: Only return the content to insert/replace. Do not include explanations or meta-commentary.`;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build system prompt with full context
      let systemPrompt = buildSystemPrompt();
      
      // Add web search context if enabled
      if (isWebSearchEnabled) {
        if (webSearchMode === 'text') {
          try {
            const searchResults = await searchWeb(prompt, 'search');
            if (searchResults.hits && searchResults.hits.length > 0) {
              const webContext = `\n\nWEB SEARCH RESULTS (Use these to answer the user's request):\n${searchResults.hits.map((hit, i) => `[${i + 1}] ${hit.title}: ${hit.description} (${hit.url})`).join('\n')}`;

              const snippets = searchResults.hits
                .map((hit, i) => (hit.snippets ? `[${i + 1}] Snippets: ${hit.snippets.join(' ')}` : ''))
                .filter(Boolean)
                .join('\n');

              systemPrompt += webContext;
              if (snippets) {
                systemPrompt += `\n\nSnippets:\n${snippets}`;
              }

              const providerLabel = searchResults.metadata?.provider ? ` via ${searchResults.metadata.provider}` : '';
              const fetchedLabel = searchResults.metadata?.fetchedAt
                ? ` (fetched ${formatRelativeTime(searchResults.metadata.fetchedAt)})`
                : '';

              systemPrompt += `\n\nCITATION INSTRUCTIONS:
             1. You MUST cite your sources when using information from the WEB SEARCH RESULTS.
             2. Use inline citations like [1], [2] corresponding to the source numbers.
             3. At the end of your response, include a "Sources" section with links to the URLs provided in the search results.
             4. Format the sources as an HTML list: <ul><li><a href="url">Title</a></li></ul>.
             ${providerLabel}${fetchedLabel}`;
            }
          } catch (e) {
            console.error('Web search failed', e);
          }
        } else if (webSearchMode === 'images') {
          const visuals = imageResults;
          if (visuals.length > 0) {
            const visualContext = visuals
              .slice(0, 4)
              .map((image, index) => {
                const label = image.title || formatHostname(image.url) || formatHostname(image.source) || `Image ${index + 1}`;
                const source = formatHostname(image.url) || image.source || '';
                return `[Image ${index + 1}] ${label}${source ? ` (source: ${source})` : ''}`;
              })
              .join('\n');

            const providerLabel = imageSearchMetadata?.provider
              ? `Provided by ${imageSearchMetadata.provider}`
              : 'Pulled from live image search';
            const fetchedLabel = formatRelativeTime(imageSearchMetadata?.fetchedAt);
            systemPrompt += `\n\nIMAGE REFERENCES AVAILABLE:\n${visualContext}\n${providerLabel}${fetchedLabel ? ` · ${fetchedLabel}` : ''}\nIncorporate these visuals when relevant and mention which reference number pairs with the copy.`;
          } else {
            systemPrompt += '\n\nThe user enabled image mode but no visuals have been fetched yet. Recommend imagery concepts that should accompany the copy.';
          }
        }
      }
      
      // Build user prompt based on mode
      let userPrompt = '';
      if (mode === 'replace' && selectedText) {
        userPrompt = `Replace the following text based on this request: "${prompt}"\n\nCurrent text:\n${selectedText}`;
      } else if (mode === 'improve' && selectedText) {
        userPrompt = `Improve the following text: "${prompt}"\n\nCurrent text:\n${selectedText}`;
      } else {
        userPrompt = prompt;
      }

      // Call AI with same service as main assistant
      const response = await getAiResponse(
        [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemPrompt,
        false,
        workspaceContext.workspaceId
      );

      // Extract and clean response
      let responseText = extractTextFromResponse(response);
      
      console.log('AI Response:', responseText);
      
      // Check if response contains chart JSON in fenced code block
      // Use stricter sentinel to avoid false positives from prose containing braces
      try {
        // Look for ```chart-config fenced code block

        const chartMatch = responseText.match(/```chart-config\s*\n([\s\S]*?)\n```/);
        if (chartMatch) {
          const chartConfig = JSON.parse(chartMatch[1]);;
          
          // Validate chart config has required fields
          if (chartConfig.chartType && chartConfig.data && chartConfig.dataKeys) {
            // Insert chart using editor command
            editor.chain().focus().insertChart(chartConfig).run();
            onClose();
            return;
          }
        }
      } catch (parseError) {
        // Treat as regular content if chart parsing fails
      }
      
      // Remove markdown code blocks if present
      responseText = responseText.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Insert or replace content in editor
      if (hasSelection && (mode === 'replace' || mode === 'improve')) {
        editor.chain()
          .focus()
          .deleteSelection()
          .insertContent(responseText)
          .run();
      } else {
        editor.chain()
          .focus()
          .insertContent(responseText)
          .run();
      }

      onClose();
    } catch (err: any) {
      console.error('AI generation failed:', err);
      setError(err.message || 'Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestionPrompt: string) => {
    setPrompt(suggestionPrompt);
    textareaRef.current?.focus();
  };

  return (
    <div
      ref={paletteRef}
      className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] w-[500px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      style={{ 
        top: Math.min(position.top, window.innerHeight - 200), 
        left: Math.min(position.left, window.innerWidth - 520) 
      }}
    >
      {/* Minimal Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100 flex items-center justify-between">
         <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <span className="text-lg">✨</span>
            <span>AI Assistant</span>
         </div>
         <div className="flex items-center gap-2">
             <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-white/60 rounded-full border border-gray-200/50">
               {derivedWorkspaceName}
             </span>
             <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
             >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
         </div>
      </div>

      {/* Options Toggle */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1"
            >
              <span className="text-lg">⚙️</span> {showOptions ? 'Hide Options' : 'Show Options'}
            </button>
            
            {!showOptions && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                 <span>{TONE_OPTIONS.find(t => t.id === tone)?.icon} {TONE_OPTIONS.find(t => t.id === tone)?.label}</span>
                 <span>•</span>
                 <span>{FORMAT_OPTIONS.find(f => f.id === format)?.icon} {FORMAT_OPTIONS.find(f => f.id === format)?.label}</span>
              </div>
            )}
        </div>

        {/* Web Search Toggle */}
        <button
            onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
            className={`text-xs font-medium px-2 py-1 rounded-full border flex items-center gap-1 transition-all ${
                isWebSearchEnabled 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
        >
            <span>🌐</span> Web Search {isWebSearchEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Expanded Options */}
      {showOptions && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tone</label>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTone(opt.id)}
                  className={`text-xs px-2 py-1.5 rounded-md border text-left flex items-center gap-2 transition-all ${
                    tone === opt.id 
                      ? 'bg-white border-purple-500 text-purple-700 shadow-sm ring-1 ring-purple-500/20' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFormat(opt.id)}
                  className={`text-xs px-2 py-1.5 rounded-md border text-left flex items-center gap-2 transition-all ${
                    format === opt.id 
                      ? 'bg-white border-purple-500 text-purple-700 shadow-sm ring-1 ring-purple-500/20' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white space-y-3">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">
          <span>Jump-start ideas</span>
          <span className="tracking-normal text-[10px] text-gray-500 font-medium">
            {safeDocTitle === 'Untitled Document' ? 'Use workspace context' : safeDocTitle}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((promptOption) => (
            <button
              key={promptOption}
              onClick={() => handleSuggestionClick(promptOption)}
              className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-[11px] text-gray-600 hover:border-gray-500"
            >
              {promptOption}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.label}
              onClick={() => handleSuggestionClick(suggestion.prompt)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:bg-white hover:border-gray-300"
            >
              <div className="text-[13px] font-semibold text-gray-800">{suggestion.label}</div>
              <p className="mt-1 text-[11px] text-gray-500 leading-snug">{suggestion.prompt}</p>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {CHART_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.label}
              onClick={() => handleSuggestionClick(suggestion.prompt)}
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] text-blue-700 hover:bg-blue-100"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>

      {/* Web Search Mode Controls */}
      {isWebSearchEnabled && (
        <div className="px-4 py-3 border-b border-gray-100 bg-white space-y-3">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">
            <span>Research focus</span>
            {webSearchMode === 'images' && lastImageQuery && (
              <span className="tracking-normal text-[10px] text-gray-500">Last visuals: “{lastImageQuery}”</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {[
              { id: 'text', label: 'Text answers', description: 'Adds citations + snippets' },
              { id: 'images', label: 'Image references', description: 'Insert ready-to-use visuals' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setWebSearchMode(option.id as 'text' | 'images')}
                className={`flex-1 rounded-xl border px-3 py-2 text-left transition ${
                  webSearchMode === option.id ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-semibold">{option.label}</div>
                <p className="text-[11px] text-gray-500">{option.description}</p>
              </button>
            ))}
          </div>

          {webSearchMode === 'text' ? (
            <p className="text-xs text-gray-500">
              We'll enrich your system prompt with the latest articles and snippets so the AI can cite live sources.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => fetchImageReferences()}
                  disabled={imageSearchLoading}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    imageSearchLoading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-900'
                  }`}
                >
                  {imageSearchLoading ? (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle className="opacity-25" cx="12" cy="12" r="10" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8" />
                    </svg>
                  ) : (
                    'Fetch visuals'
                  )}
                </button>
                {imageResults.length > 0 && (
                  <button
                    onClick={() => imageResults[0] && insertImageResult(imageResults[0])}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400"
                  >
                    Insert top visual
                  </button>
                )}
                {lastImageQuery && (
                  <button
                    onClick={() => fetchImageReferences(lastImageQuery)}
                    disabled={imageSearchLoading}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400 disabled:opacity-50"
                  >
                    Refresh last search
                  </button>
                )}
              </div>
              {imageSearchError && <p className="text-xs text-red-500">{imageSearchError}</p>}
              {imageSearchMetadata && (
                <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                    Provider: {imageSearchMetadata.provider || 'You.com'}
                  </span>
                  {imageSearchMetadata.fetchedAt && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                      {formatRelativeTime(imageSearchMetadata.fetchedAt)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                    {imageSearchMetadata.count ?? imageResults.length} results
                  </span>
                </div>
              )}
              <div className="max-h-64 overflow-y-auto">
                {imageResults.length === 0 && !imageSearchError ? (
                  <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-xs text-gray-500">
                    Describe the visual you need above, then tap “Fetch visuals” to preview research-grade images.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {imageResults.slice(0, 6).map((image) => {
                      const sourceHost = formatHostname(image.url) || image.source || 'Source';
                      return (
                        <div key={`${image.imageUrl}-${image.url}`} className="rounded-xl border border-gray-200 bg-gray-50 p-2 space-y-2">
                          <div className="overflow-hidden rounded-lg bg-gray-200 aspect-video">
                            <img src={image.thumbnail || image.imageUrl} alt={image.title || 'Research visual'} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800 leading-snug max-h-10 overflow-hidden">{image.title || 'Untitled visual'}</p>
                            <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                              <span>{sourceHost}</span>
                              <button
                                onClick={() => insertImageResult(image)}
                                className="text-purple-600 font-semibold hover:text-purple-800"
                              >
                                Insert
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="p-3">
        <div className="relative flex items-center">
            <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={hasSelection ? "How should I change this text?" : "Describe what you want to write or visualize..."}
                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
                rows={1}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                    }
                    // Auto-resize
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                }}
                style={{ minHeight: '46px', maxHeight: '200px' }}
            />
            <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className={`absolute right-2 p-2 rounded-lg transition-all ${
                    loading || !prompt.trim() 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                  }`}
            >
                {loading ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                )}
            </button>
        </div>
        
        {error && (
            <div className="mt-2 text-xs text-red-500 px-1">
                {error}
            </div>
        )}
      </div>
      
      {/* Minimal Footer */}
       <div className="px-4 pb-3 pt-0 flex justify-between items-center">
          <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${hasSelection ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {hasSelection ? (mode === 'improve' ? 'IMPROVE' : 'REPLACE') : 'INSERT'}
              </span>
              <span className="text-[10px] text-gray-400">
                Context: {[
                  (data.investors?.length || 0) > 0 ? 'Investors' : null,
                  (data.customers?.length || 0) > 0 ? 'Customers' : null,
                  (data.financials?.length || 0) > 0 ? 'Revenue' : null,
                  (data.expenses?.length || 0) > 0 ? 'Expenses' : null
                ].filter(Boolean).length} sources
              </span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">
             Enter to run
          </span>
       </div>
    </div>
  );
};
