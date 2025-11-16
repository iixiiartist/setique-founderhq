import { DocType } from '../types';
import { DOC_TYPE_LABELS } from '../constants';
import { AIWorkspaceContext } from '../hooks/useAIWorkspaceContext';
import { PromptSanitizer } from '../lib/security/promptSanitizer';

export type AIAction = 
  | 'generate'
  | 'improve'
  | 'expand'
  | 'summarize'
  | 'rewrite'
  | 'create_outline'
  | 'fill_template'
  | 'complete_section'
  | 'generate_options'
  | 'generate_positioning'
  | 'suggest_messaging'
  | 'expand_audience'
  | 'generate_timeline'
  | 'suggest_tactics'
  | 'competitive_analysis'
  | 'objection_handling'
  | 'pain_points'
  | 'decision_makers'
  | 'buying_process'
  | 'generate_chart';

/**
 * Builds context-aware AI prompts with business profile and workspace data
 * SECURITY: Sanitizes all untrusted inputs (selection, customPrompt) to prevent prompt injection
 */
export function buildEmbeddedAIPrompt(
  action: AIAction,
  docType: DocType,
  currentContent: string,
  selection: string | null,
  context: AIWorkspaceContext,
  customPrompt?: string
): string {
  // SECURITY: Sanitize untrusted user inputs before prompt interpolation
  const sanitized = PromptSanitizer.sanitizeEmbeddedInput({
    selectedText: selection || '',
    customPrompt: customPrompt || '',
    documentTitle: '', // Add if available
    metadata: { action, docType }
  });

  // Block critical threats (e.g., jailbreak attempts in custom prompts)
  if (sanitized.sanitizationReport.shouldBlock) {
    console.error('[EmbeddedAI] BLOCKED critical prompt injection:', sanitized.sanitizationReport);
    throw new Error('Your input contains suspicious patterns. Please remove special instructions and try again.');
  }

  // Warn on medium/high risk
  if (sanitized.sanitizationReport.highestRiskLevel === 'high' || 
      sanitized.sanitizationReport.highestRiskLevel === 'medium') {
    console.warn('[EmbeddedAI] Detected potential injection attempt:', {
      riskLevel: sanitized.sanitizationReport.highestRiskLevel,
      threats: sanitized.sanitizationReport.totalThreats
    });
  }

  // Use sanitized values (wrapped in JSON data blocks for additional safety)
  const safeSelection = sanitized.selectedText;
  const safeCustomPrompt = sanitized.customPrompt;
  let prompt = `You are an embedded AI writing assistant for GTM (Go-To-Market) documents.

CRITICAL GROUNDING RULES - FOLLOW STRICTLY:
1. ONLY use the business information provided in the "ACTUAL BUSINESS INFORMATION" section below
2. DO NOT invent, assume, or hallucinate ANY company names, products, locations, or details
3. If a field shows "Not specified", write "[Company Name]" or "[To be defined]" as a placeholder - NEVER make up specifics
4. NEVER use example companies like "Cloud Nine", "Acme Corp", "TechStart", etc.
5. Your response must be 100% derived from the provided business profile data
6. If you don't have enough information, say "Please add [missing field] to your workspace settings to generate this section"

Document Type: ${DOC_TYPE_LABELS[docType]}
Current Document Length: ${currentContent.length} characters

`;

  // Add business context if available
  if (context.businessProfile) {
    const bp = context.businessProfile;
    prompt += `ACTUAL BUSINESS INFORMATION (use ONLY this data):
Company Name: "${bp.companyName}"
Industry: ${bp.industry || 'Not specified - use placeholder [Industry]'}
Business Description: ${bp.description || 'Not specified - use placeholder [Business Description]'}
Target Market: ${bp.targetMarket || 'Not specified - use placeholder [Target Market]'}
Value Proposition: ${bp.valueProposition || 'Not specified - use placeholder [Value Proposition]'}
Growth Stage: ${bp.growthStage || 'Not specified - use placeholder [Growth Stage]'}

⚠️ REMINDER: Use "${bp.companyName}" as the company name throughout your response. DO NOT substitute with examples.

`;
  } else {
    prompt += `❌ NO BUSINESS PROFILE FOUND

You cannot generate business-specific content without a business profile.

Please respond with:
"I need your business information to generate accurate content. Please complete your workspace settings by clicking your workspace name → Settings → Business Profile, then try again."

DO NOT generate generic example content.

`;
  }

  // Add related documents for context (if available)
  if (context.relatedDocs.length > 0) {
    prompt += `Related Team Documents (for reference):\n`;
    context.relatedDocs.forEach(d => {
      prompt += `- "${d.title}" (${d.docType})\n`;
    });
    prompt += '\n';
  }

  // Add action-specific instructions
  switch (action) {
    case 'improve':
      prompt += `The user has selected text and wants you to improve it. Make it more professional, clear, and compelling while preserving the core message. Use the business context above to ensure alignment with company positioning.

${safeSelection}

IMPORTANT: Return ONLY the improved text with proper formatting. Use markdown for formatting:
- **bold** for emphasis
- ## for headings
- * for bullet points
- No explanations, no meta-commentary, just the improved content.

Improved Version:`;
      break;

    case 'expand':
      prompt += `The user wants to expand on this section. Add relevant details, examples, and insights based on the document type and business context. Draw from the linked tasks, CRM data, and business profile to make it specific and actionable.

${safeSelection}

Return formatted content using markdown (headings, lists, bold). Be specific and reference the business context when relevant.

Expanded Version:`;
      break;

    case 'summarize':
      prompt += `Summarize the selected text concisely while preserving key points.

${safeSelection}

Summary:`;
      break;

    case 'rewrite':
      prompt += `Rewrite the selected text with fresh wording while maintaining the same message.

${safeSelection}

Rewritten Version:`;
      break;

    case 'generate':
      if (safeCustomPrompt && safeCustomPrompt.trim()) {
        prompt += `${safeCustomPrompt}

Based on the business context, linked data, and document type, generate relevant content. Use markdown formatting. Be specific and actionable.

Generated Content:`;
      }
      break;

    case 'fill_template':
      if (!context.businessProfile?.companyName) {
        return 'Cannot fill template - no business profile found. Please complete your workspace settings first.';
      }
      prompt += `Fill in this template with the ACTUAL business data provided above:
- Company: ${context.businessProfile.companyName}
- Business: ${context.businessProfile.description || '[Business Description - ask user to add]'}
- Target Market: ${context.businessProfile.targetMarket || '[Target Market - ask user to add]'}
- Value Proposition: ${context.businessProfile.valueProposition || '[Value Proposition - ask user to add]'}
- Industry: ${context.businessProfile.industry || '[Industry - ask user to add]'}

CRITICAL: Use "${context.businessProfile.companyName}" exactly as shown. Replace placeholders with real data where available, or use [brackets] where data is missing.

Generated Content:`;
      break;

    case 'complete_section':
      if (!context.businessProfile?.companyName) {
        return 'Cannot complete section - no business profile found. Please complete your workspace settings first.';
      }
      prompt += `Continue writing this section for ${context.businessProfile.companyName}. Use ONLY the business context provided above. Match the tone and style of the existing content. Write 2-3 paragraphs that flow naturally.

If the section is about:
- Target Audience: Expand using "${context.businessProfile.targetMarket || '[target market not defined]'}"
- Business/Solution: Expand using "${context.businessProfile.description || '[business description not defined]'}"
- Value Proposition: Expand using "${context.businessProfile.valueProposition || '[value proposition not defined]'}"

CRITICAL: Reference "${context.businessProfile.companyName}" as the business. Do NOT use generic examples.

Continued Content:`;
      break;

    case 'generate_options':
      if (!context.businessProfile?.companyName) {
        return 'Cannot generate options - no business profile found. Please complete your workspace settings first.';
      }
      prompt += `Generate 3 different variations for ${context.businessProfile.companyName}, each with a distinct approach:

Option 1: Direct and concise
Option 2: Detailed with examples  
Option 3: Storytelling/narrative style

CRITICAL: All 3 options must reference "${context.businessProfile.companyName}" and use the actual business data provided above. Do NOT create generic examples.

Generated Options:`;
      break;

    case 'create_outline':
      prompt += `Create a comprehensive outline for a ${DOC_TYPE_LABELS[docType]} based on best practices and the business context provided. Use markdown headings (##, ###) and bullet points.

Generate a structured outline that the user can fill in:`;
      break;

    // Doc-type-specific actions
    case 'generate_positioning':
      prompt += `Generate a positioning statement for ${context.businessProfile?.companyName || 'the company'} based on the business context. Use the format: "For [target market], [company] is the [category] that [unique value proposition] unlike [competitors/alternatives]."

Positioning Statement:`;
      break;

    case 'suggest_messaging':
      prompt += `Suggest 3-5 key marketing messages for ${context.businessProfile?.companyName || 'the company'} based on the value proposition and target market. Format as a bulleted list with brief explanations.

Key Messages:`;
      break;

    case 'expand_audience':
      prompt += `Expand on the target audience section. Based on "${context.businessProfile?.targetMarket || 'the target market'}", provide details about:
- Demographics
- Pain points
- Buying behavior
- Decision criteria

Target Audience Analysis:`;
      break;

    case 'generate_timeline':
      prompt += `Generate a campaign timeline based on the linked tasks and events. Create a week-by-week or phase-by-phase breakdown. Use markdown formatting.

Campaign Timeline:`;
      break;

    case 'suggest_tactics':
      prompt += `Suggest marketing tactics appropriate for ${context.businessProfile?.industry || 'this industry'} and ${context.businessProfile?.growthStage || 'this growth stage'}. Include channels, activities, and expected outcomes.

Suggested Tactics:`;
      break;

    case 'pain_points':
      prompt += `Based on the target market "${context.businessProfile?.targetMarket}" and business "${context.businessProfile?.description}", identify key pain points this business solves. Format as a bulleted list with explanations.

Pain Points:`;
      break;

    case 'decision_makers':
      prompt += `Identify typical decision makers and influencers for ${context.businessProfile?.targetMarket || 'this market'}. Include titles, roles, and what they care about.

Decision Makers:`;
      break;

    case 'buying_process':
      prompt += `Map out the typical buying process for ${context.businessProfile?.targetMarket || 'this market'}. Include stages, timeline, and key activities.

Buying Process:`;
      break;

    case 'competitive_analysis':
      prompt += `Provide a competitive analysis framework for ${context.businessProfile?.companyName || 'the company'}. Include key differentiators and competitive advantages based on the value proposition.

Competitive Analysis:`;
      break;

    case 'objection_handling':
      prompt += `Generate common objections prospects might have about ${context.businessProfile?.description || 'this business'} and how to handle them. Format as Q&A.

Objection Handling:`;
      break;

    case 'generate_chart':
      prompt += `Generate a chart configuration based on the user's request and available workspace data.

CRITICAL CHART GENERATION RULES:
1. You must respond with a valid JSON object that matches this exact structure:
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

2. Available workspace data you can reference:
${context.financialLogs.length > 0 ? `- Financial Logs: ${context.financialLogs.length} entries with MRR, GMV, signups data` : ''}
${context.expenses.length > 0 ? `- Expenses: ${context.expenses.length} entries by category` : ''}
${context.crmItems.length > 0 ? `- CRM Items: ${context.crmItems.length} deals across investor/customer/partner pipelines` : ''}
${context.marketingCampaigns.length > 0 ? `- Marketing: ${context.marketingCampaigns.length} campaigns by type` : ''}
${context.tasks.length > 0 ? `- Tasks: ${context.tasks.length} tasks by status and priority` : ''}

3. Chart type selection:
- Use "line" for trends over time (revenue, signups, growth metrics)
- Use "bar" for comparisons (pipeline stages, task counts by module)
- Use "pie" for distribution (expense breakdown, deal stages, campaign types)
- Use "area" for cumulative metrics (total revenue, customer growth)

4. Data format requirements:
- For line/bar/area charts: array of objects with xAxisKey and numeric dataKeys
- For pie charts: array of objects with category key (xAxisKey) and value key (dataKeys[0])
- All data must be derived from the workspace data listed above - DO NOT invent data

5. Color palette (use these hex codes):
- Blue: #3b82f6
- Green: #10b981
- Orange: #f59e0b
- Red: #ef4444
- Purple: #8b5cf6
- Pink: #ec4899

User Request: ${safeCustomPrompt || 'Create a relevant chart based on available data'}

Generate chart configuration JSON:`;
      break;

    default:
      if (safeCustomPrompt && safeCustomPrompt.trim()) {
        prompt += `${safeCustomPrompt}

Generated Content:`;
      }
  }

  // SECURITY: Final validation before returning prompt
  const validation = PromptSanitizer.validateSystemPrompt(prompt);
  if (!validation.isValid) {
    console.error('[EmbeddedAI] Final prompt validation failed:', validation);
    throw new Error('Unable to generate safe prompt. Please simplify your request and try again.');
  }

  return prompt;
}
