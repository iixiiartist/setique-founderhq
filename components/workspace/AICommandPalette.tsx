import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { DocType, DashboardData } from '../../types';
import { DOC_TYPE_LABELS } from '../../constants';
import { AIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';
import { getAiResponse } from '../../services/groqService';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';

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

interface AICommandPaletteProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
  workspaceContext: AIWorkspaceContext;
  docType: DocType;
  data: DashboardData;
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

export const AICommandPalette: React.FC<AICommandPaletteProps> = ({
  editor,
  position,
  onClose,
  workspaceContext,
  docType,
  data,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    
    // Token-optimized context summaries - only include if data exists
    const investorContext = data.investors.length > 0
      ? `Investors: ${data.investors.slice(0, 3).map(i => i.company).join(', ')}${data.investors.length > 3 ? ` (+${data.investors.length - 3} more)` : ''}`
      : '';
    if (investorContext) dataAvailability.push('investors');
    
    const customerContext = data.customers.length > 0
      ? `Key Customers: ${data.customers.slice(0, 3).map(c => c.company).join(', ')}${data.customers.length > 3 ? ` (+${data.customers.length - 3} more)` : ''}`
      : '';
    if (customerContext) dataAvailability.push('customers');
    
    const partnerContext = data.partners.length > 0
      ? `Partners: ${data.partners.slice(0, 3).map(p => p.company).join(', ')}${data.partners.length > 3 ? ` (+${data.partners.length - 3} more)` : ''}`
      : '';
    if (partnerContext) dataAvailability.push('partners');
    
    const marketingContext = data.marketing.length > 0
      ? `Recent Marketing: ${data.marketing.slice(0, 2).map(m => m.title).join(', ')}`
      : '';
    if (marketingContext) dataAvailability.push('marketing campaigns');
    
    // Calculate total MRR and GMV from financials array
    const latestFinancial = data.financials.length > 0 
      ? data.financials.reduce((latest, f) => f.date > latest.date ? f : latest, data.financials[0])
      : null;
    const revenueContext = latestFinancial
      ? `Revenue: $${latestFinancial.mrr.toLocaleString()} MRR, $${latestFinancial.gmv.toLocaleString()} GMV (as of ${latestFinancial.date})`
      : businessProfile.currentMrr
      ? `Revenue: $${businessProfile.currentMrr.toLocaleString()} MRR`
      : '';
    if (revenueContext) dataAvailability.push('financial metrics');
    
    const dataAvailabilitySummary = dataAvailability.length > 0
      ? `\nAVAILABLE DATA: ${dataAvailability.join(', ')}`
      : `\nAVAILABLE DATA: Business profile only (no CRM or financial data)`;

    return `You are a professional GTM content writer for ${companyName}.

Document Type: ${DOC_TYPE_LABELS[docType]}

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

CRITICAL GROUNDING RULES:
1. ONLY use data explicitly provided in the Business Context and Workspace Data Context above
2. NEVER invent, estimate, or hallucinate financial numbers, metrics, dates, or statistics
3. If specific data is not provided (revenue, customer counts, timelines), write strategically WITHOUT making up numbers
4. Use placeholder language like "our current metrics" or "based on performance" instead of fake numbers
5. If asked for financial projections or data you don't have, state clearly: "Financial data not available in workspace. Please add actual metrics to your workspace for accurate reporting."
6. Focus on strategy, positioning, and messaging - areas where you can add value without data
7. When real data IS provided above, use it accurately and cite it properly

Formatting Guidelines:
- Use HTML tags for formatting (<h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>)
- Be concise and professional
- Focus on GTM strategy and business outcomes
- Use data-driven insights ONLY when real data is available above

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
      const systemPrompt = buildSystemPrompt();
      
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
      
      // Check if response is a chart configuration
      const isChartRequest = prompt.toLowerCase().includes('chart') || 
                            prompt.toLowerCase().includes('graph') ||
                            prompt.toLowerCase().includes('visualization');
      
      if (isChartRequest) {
        try {
          // Try to parse as JSON chart config
          let chartConfig;
          
          // Remove markdown code blocks if present
          const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          
          // Try to extract JSON from the response
          const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            chartConfig = JSON.parse(jsonMatch[0]);
            
            // Validate chart config has required fields
            if (chartConfig.chartType && chartConfig.data && chartConfig.dataKeys) {
              // Insert chart using editor command
              editor.chain().focus().insertChart(chartConfig).run();
              onClose();
              return;
            }
          }
        } catch (parseError) {
          console.log('Not a valid chart config, treating as regular content');
        }
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

  const handleSuggestionClick = (suggestion: { label: string; prompt: string }) => {
    setPrompt(suggestion.prompt);
    textareaRef.current?.focus();
  };

  return (
    <div
      ref={paletteRef}
      className="fixed bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-[9999] w-[500px] max-h-[600px] flex flex-col"
      style={{ 
        top: Math.min(position.top, window.innerHeight - 620), 
        left: Math.min(position.left, window.innerWidth - 520) 
      }}
    >
      {/* Header */}
      <div className="p-4 border-b-2 border-black bg-gradient-to-r from-purple-100 to-pink-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black text-base">✨ AI Writing Assistant</h3>
          <button
            onClick={onClose}
            className="text-black hover:text-red-600 font-bold text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-gray-700">
          {DOC_TYPE_LABELS[docType]} • {workspaceContext.businessProfile?.companyName || 'Your workspace'}
        </p>
        {hasSelection && (
          <p className="text-xs text-purple-700 font-bold mt-1">
            📝 {selectedText.length} characters selected • Mode: {mode}
          </p>
        )}
      </div>

      {/* Prompt Input */}
      <div className="p-4 border-b-2 border-black">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What would you like to write? (e.g., 'Write an executive summary' or 'Improve this section to be more persuasive')"
          className="w-full px-3 py-2 border-2 border-black text-sm resize-none font-mono"
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-600">
            Cmd+Enter to generate • Esc to close
          </span>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="px-4 py-2 bg-purple-500 text-white border-2 border-black font-bold text-sm hover:bg-purple-600 disabled:bg-gray-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
          >
            {loading ? 'Generating...' : 'Generate ✨'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-100 border-b-2 border-black text-red-800 text-sm font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* Quick Suggestions */}
      {!loading && (
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="text-xs font-bold text-gray-700 uppercase mb-3">Content Suggestions</h4>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {QUICK_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-left px-3 py-2 bg-white border-2 border-black text-xs font-bold hover:bg-purple-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
          
          <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 mt-4">📊 Chart Generation</h4>
          <div className="grid grid-cols-2 gap-2">
            {CHART_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={`chart-${idx}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-left px-3 py-2 bg-blue-50 border-2 border-black text-xs font-bold hover:bg-blue-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
          
          <p className="text-xs text-gray-600 mt-3 italic">
            💡 Tip: AI will automatically detect chart requests and generate interactive charts based on your workspace data
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="inline-block animate-spin text-4xl mb-3">⚙️</div>
            <p className="text-sm font-bold">Generating content with full workspace context...</p>
            <p className="text-xs text-gray-600 mt-1">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-3 border-t-2 border-black bg-gray-50">
        <p className="text-xs text-gray-600">
          💡 This AI has access to your full business profile, workspace data (investors, customers, partners, marketing, financials), and can use formatting tools to create professionally styled content.
        </p>
      </div>
    </div>
  );
};
