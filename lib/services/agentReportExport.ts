// lib/services/agentReportExport.ts
// Export agent reports to HTML, PDF, and save to file library

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { DatabaseService } from './database';
import type { AgentReport } from './agentReportService';
import type { AgentSource } from './youAgentClient';

// Ensure html2canvas is available globally for jsPDF
declare global {
  interface Window {
    html2canvas?: typeof html2canvas;
  }
}

if (typeof window !== 'undefined') {
  window.html2canvas = html2canvas;
}

// ============================================================================
// Types
// ============================================================================

export interface ExportOptions {
  title?: string;
  filename?: string;
  includeSources?: boolean;
  includeCoverPage?: boolean;
  includeStyles?: boolean;
  brandColor?: string;
}

interface GoalInfo {
  label: string;
  color: string;
  emoji: string;
  iconColor: string;
}

// ============================================================================
// Constants - Match AgentResponsePresenter styling
// ============================================================================

const GOAL_INFO: Record<string, GoalInfo> = {
  icp: { label: 'ICP & Pain Points Analysis', color: '#10b981', emoji: '👥', iconColor: '#22c55e' },
  competitive: { label: 'Competitive Analysis', color: '#ef4444', emoji: '⚔️', iconColor: '#ef4444' },
  angles: { label: 'Outreach Angles', color: '#f59e0b', emoji: '💡', iconColor: '#ca8a04' },
  market: { label: 'Market & Trends Brief', color: '#8b5cf6', emoji: '📈', iconColor: '#a855f7' },
};

// Section icon colors that match AgentResponsePresenter
const SECTION_ICON_COLORS: Record<string, string> = {
  'snapshot': '#3b82f6',
  'overview': '#3b82f6',
  'company': '#3b82f6',
  'icp': '#22c55e',
  'customer': '#22c55e',
  'pain': '#f97316',
  'problem': '#f97316',
  'trend': '#a855f7',
  'market': '#a855f7',
  'competitive': '#ef4444',
  'landscape': '#ef4444',
  'angle': '#ca8a04',
  'outreach': '#ca8a04',
  'gtm': '#6366f1',
  'recommendation': '#ca8a04',
  'signal': '#f59e0b',
  'risk': '#ef4444',
  'summary': '#10b981',
  'takeaway': '#10b981',
  'how to use': '#3b82f6',
  'founderhq': '#3b82f6',
};

const BRAND_YELLOW = '#facc15';
const BRAND_DARK = '#0f172a';

// ============================================================================
// Styles - Match AgentResponsePresenter exactly
// ============================================================================

const getReportStyles = (brandColor: string = BRAND_YELLOW) => `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #374151;
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
    font-size: 14px;
  }

  .report-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  /* Cover Page */
  .cover-page {
    padding: 40px 0 32px 0;
    margin-bottom: 24px;
    border-bottom: 1px solid #e5e7eb;
  }

  .cover-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: linear-gradient(135deg, ${brandColor}20, ${brandColor}10);
    border: 1px solid ${brandColor};
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    color: ${BRAND_DARK};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 16px;
  }

  .cover-title {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
    color: #111827;
    margin-bottom: 8px;
  }

  .cover-subtitle {
    font-size: 16px;
    color: #6b7280;
    margin-bottom: 20px;
  }

  .cover-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: #6b7280;
  }

  .cover-meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cover-meta-label {
    font-weight: 500;
    color: #9ca3af;
  }

  /* Content Section - Match AgentResponsePresenter prose styles */
  .content-section {
    padding: 0;
  }

  /* Headings - Match AgentResponsePresenter exactly */
  h1, h2 {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    margin: 24px 0 12px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.4;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    margin: 20px 0 8px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.4;
  }

  h4 {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin: 16px 0 8px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.4;
  }

  .section-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  /* Paragraphs - Match prose-sm */
  p {
    font-size: 14px;
    color: #374151;
    margin-bottom: 8px;
    line-height: 1.6;
  }

  /* Lists - Match AgentResponsePresenter */
  ul, ol {
    margin: 12px 0;
    padding-left: 16px;
  }

  ul {
    list-style: disc;
  }

  ol {
    list-style: decimal;
  }

  li {
    font-size: 14px;
    color: #374151;
    line-height: 1.6;
    margin-bottom: 6px;
  }

  /* Strong/Bold */
  strong {
    font-weight: 600;
    color: #111827;
  }

  /* Emphasis/Italic */
  em {
    font-style: italic;
  }

  /* Links */
  a {
    color: #2563eb;
    text-decoration: underline;
  }

  a:hover {
    color: #1d4ed8;
  }

  /* Inline code */
  code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: 12px;
    color: #1f2937;
  }

  /* Code blocks */
  pre {
    background: #111827;
    color: #f3f4f6;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 12px 0;
    font-size: 13px;
    line-height: 1.5;
  }

  pre code {
    background: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }

  /* Blockquotes - Match AgentResponsePresenter */
  blockquote {
    border-left: 4px solid #93c5fd;
    background: rgba(239, 246, 255, 0.5);
    padding: 8px 16px;
    margin: 12px 0;
    border-radius: 0 8px 8px 0;
  }

  blockquote p {
    font-style: italic;
    color: #374151;
    margin: 0;
    font-size: 14px;
  }

  /* Tables - Match AgentResponsePresenter */
  .table-wrapper {
    overflow-x: auto;
    margin: 16px 0;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  th {
    background: #f9fafb;
    font-weight: 600;
    text-align: left;
    padding: 10px 16px;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
  }

  td {
    padding: 10px 16px;
    color: #6b7280;
    border-bottom: 1px solid #f3f4f6;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: #f9fafb;
  }

  /* Horizontal rules */
  hr {
    border: none;
    height: 1px;
    background: #e5e7eb;
    margin: 16px 0;
  }

  /* Sources Section - Match AgentResponsePresenter */
  .sources-section {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }

  .sources-title {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sources-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .source-card {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    background: #f9fafb;
    border: 1px solid #f3f4f6;
    border-radius: 8px;
    text-decoration: none;
    transition: background 0.15s ease;
  }

  .source-card:hover {
    background: #f3f4f6;
    text-decoration: none;
  }

  .source-icon {
    color: #9ca3af;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .source-content {
    flex: 1;
    min-width: 0;
  }

  .source-title {
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }

  .source-card:hover .source-title {
    color: #2563eb;
  }

  .source-domain {
    font-size: 12px;
    color: #9ca3af;
  }

  /* Footer */
  .report-footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #9ca3af;
  }

  .footer-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }

  .footer-brand-icon {
    width: 16px;
    height: 16px;
    background: ${brandColor};
    border-radius: 3px;
  }

  /* Print styles */
  @media print {
    body {
      background: white;
      font-size: 12px;
    }

    .report-container {
      padding: 0;
      max-width: none;
    }

    .sources-grid {
      grid-template-columns: 1fr;
    }

    a {
      color: #1f2937;
    }
  }

  @page {
    margin: 0.75in;
  }
`;

// ============================================================================
// SVG Icons - Match Lucide icons used in AgentResponsePresenter
// ============================================================================

const ICONS = {
  externalLink: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  target: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  users: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  trendingUp: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  lightbulb: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>`,
  building: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
  rocket: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
  alertTriangle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  bookOpen: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
};

// Get icon for a heading based on keywords
function getIconForHeading(heading: string): { icon: string; color: string } {
  const lower = heading.toLowerCase();
  
  const iconMappings: Array<{ keywords: string[]; icon: string; colorKey: string }> = [
    { keywords: ['snapshot', 'overview', 'how to use', 'founderhq'], icon: ICONS.fileText, colorKey: 'overview' },
    { keywords: ['company'], icon: ICONS.building, colorKey: 'company' },
    { keywords: ['icp', 'customer', 'persona'], icon: ICONS.users, colorKey: 'icp' },
    { keywords: ['pain', 'problem', 'challenge'], icon: ICONS.zap, colorKey: 'pain' },
    { keywords: ['trend', 'market', 'growth'], icon: ICONS.trendingUp, colorKey: 'market' },
    { keywords: ['competitive', 'landscape', 'competitor'], icon: ICONS.target, colorKey: 'competitive' },
    { keywords: ['angle', 'outreach', 'recommendation'], icon: ICONS.lightbulb, colorKey: 'angle' },
    { keywords: ['gtm', 'strategy', 'go-to-market'], icon: ICONS.rocket, colorKey: 'gtm' },
    { keywords: ['signal', 'warning'], icon: ICONS.alertTriangle, colorKey: 'signal' },
    { keywords: ['risk', 'threat'], icon: ICONS.alertTriangle, colorKey: 'risk' },
    { keywords: ['summary', 'takeaway', 'conclusion', 'key'], icon: ICONS.bookOpen, colorKey: 'summary' },
  ];

  for (const mapping of iconMappings) {
    if (mapping.keywords.some(kw => lower.includes(kw))) {
      return {
        icon: mapping.icon,
        color: SECTION_ICON_COLORS[mapping.colorKey] || '#9ca3af',
      };
    }
  }

  return { icon: ICONS.fileText, color: '#9ca3af' };
}

// ============================================================================
// Markdown to HTML Converter
// ============================================================================

function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Clean up citation references like [[1]](url) - we'll show sources separately
  html = html.replace(/\[\[(\d+)\]\]\([^)]+\)/g, '');

  // Code blocks (before other processing)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre><code class="language-${lang || 'text'}">${escaped}</code></pre>`;
  });

  // Tables
  html = html.replace(/^\|(.+)\|\n\|[-:| ]+\|\n((?:\|.+\|\n?)+)/gm, (match, headerRow, bodyRows) => {
    const headers = headerRow.split('|').map((h: string) => h.trim()).filter(Boolean);
    const headerHtml = headers.map((h: string) => `<th>${escapeHtml(h)}</th>`).join('');
    
    const rows = bodyRows.trim().split('\n').map((row: string) => {
      const cells = row.split('|').map((c: string) => c.trim()).filter(Boolean);
      return `<tr>${cells.map((c: string) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
    }).join('');

    return `<div class="table-wrapper"><table><thead><tr>${headerHtml}</tr></thead><tbody>${rows}</tbody></table></div>`;
  });

  // Headers with icons
  html = html.replace(/^#### (.+)$/gm, (_, content) => {
    const { icon, color } = getIconForHeading(content);
    return `<h4><span class="section-icon" style="color: ${color}">${icon}</span><span>${escapeHtml(content.replace(/\*\*/g, ''))}</span></h4>`;
  });
  html = html.replace(/^### (.+)$/gm, (_, content) => {
    const { icon, color } = getIconForHeading(content);
    return `<h3><span class="section-icon" style="color: ${color}">${icon}</span><span>${escapeHtml(content.replace(/\*\*/g, ''))}</span></h3>`;
  });
  html = html.replace(/^## (.+)$/gm, (_, content) => {
    const { icon, color } = getIconForHeading(content);
    return `<h2><span class="section-icon" style="color: ${color}">${icon}</span><span>${escapeHtml(content.replace(/\*\*/g, ''))}</span></h2>`;
  });
  html = html.replace(/^# (.+)$/gm, (_, content) => {
    const { icon, color } = getIconForHeading(content);
    return `<h1><span class="section-icon" style="color: ${color}">${icon}</span><span>${escapeHtml(content.replace(/\*\*/g, ''))}</span></h1>`;
  });

  // Horizontal rules
  html = html.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '<hr>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Ordered lists
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li data-ol>$2</li>');
  html = html.replace(/(<li data-ol>.*<\/li>\n?)+/g, (match) => {
    const items = match.replace(/ data-ol/g, '');
    return `<ol>${items}</ol>`;
  });

  // Unordered lists
  html = html.replace(/^[-*+] (.+)$/gm, '<li data-ul>$1</li>');
  html = html.replace(/(<li data-ul>.*<\/li>\n?)+/g, (match) => {
    const items = match.replace(/ data-ul/g, '');
    return `<ul>${items}</ul>`;
  });

  // Paragraphs (wrap remaining text blocks)
  const lines = html.split('\n');
  const result: string[] = [];
  let inParagraph = false;
  let paragraphContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if it's a block element
    const isBlockElement = /^<(h[1-4]|ul|ol|li|table|thead|tbody|tr|th|td|pre|blockquote|hr|div)/.test(trimmed) ||
                           /<\/(h[1-4]|ul|ol|li|table|thead|tbody|tr|th|td|pre|blockquote|div)>$/.test(trimmed);

    if (trimmed === '') {
      if (inParagraph && paragraphContent.length > 0) {
        result.push(`<p>${paragraphContent.join(' ')}</p>`);
        paragraphContent = [];
        inParagraph = false;
      }
      continue;
    }

    if (isBlockElement) {
      if (inParagraph && paragraphContent.length > 0) {
        result.push(`<p>${paragraphContent.join(' ')}</p>`);
        paragraphContent = [];
        inParagraph = false;
      }
      result.push(trimmed);
    } else {
      inParagraph = true;
      paragraphContent.push(trimmed);
    }
  }

  if (paragraphContent.length > 0) {
    result.push(`<p>${paragraphContent.join(' ')}</p>`);
  }

  return result.join('\n');
}

// ============================================================================
// HTML Builder
// ============================================================================

function buildReportHtml(report: AgentReport, options: ExportOptions = {}): string {
  const {
    title = report.target,
    includeSources = true,
    includeCoverPage = true,
    brandColor = BRAND_YELLOW,
  } = options;

  const goalInfo = GOAL_INFO[report.goal] || { label: report.goal, color: '#6b7280', emoji: '📋' };
  const createdDate = new Date(report.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const contentHtml = markdownToHtml(report.output);

  const coverHtml = includeCoverPage ? `
    <div class="cover-page">
      <div class="cover-badge">
        <span>${goalInfo.emoji}</span>
        <span>Research Report</span>
      </div>
      <h1 class="cover-title">${escapeHtml(title)}</h1>
      <p class="cover-subtitle">${escapeHtml(goalInfo.label)}</p>
      <div class="cover-meta">
        <div class="cover-meta-item">
          <span class="cover-meta-label">Generated:</span>
          <span>${createdDate}</span>
        </div>
        ${report.notes ? `
        <div class="cover-meta-item">
          <span class="cover-meta-label">Context:</span>
          <span>${escapeHtml(report.notes.slice(0, 100))}${report.notes.length > 100 ? '...' : ''}</span>
        </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  const sourcesHtml = includeSources && report.sources && report.sources.length > 0 ? `
    <div class="sources-section">
      <h4 class="sources-title">
        <span class="source-icon">${ICONS.externalLink}</span>
        Sources (${report.sources.length})
      </h4>
      <div class="sources-grid">
        ${report.sources.slice(0, 8).map((source: AgentSource) => {
          const domain = getDomain(source.url);
          return `
            <a href="${escapeHtml(source.url)}" class="source-card" target="_blank" rel="noopener noreferrer">
              <span class="source-icon">${ICONS.externalLink}</span>
              <div class="source-content">
                <div class="source-title">${escapeHtml(source.title || domain)}</div>
                <div class="source-domain">${escapeHtml(domain)}</div>
              </div>
            </a>
          `;
        }).join('')}
      </div>
      ${report.sources.length > 8 ? `<p style="margin-top: 8px; font-size: 12px; color: #9ca3af;">+${report.sources.length - 8} more sources</p>` : ''}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Research Report</title>
  <style>${getReportStyles(brandColor)}</style>
</head>
<body>
  <div class="report-container">
    ${coverHtml}
    <div class="content-section">
      ${contentHtml}
    </div>
    ${sourcesHtml}
    <div class="report-footer">
      <div class="footer-brand">
        <div class="footer-brand-icon"></div>
        <span>Generated by FounderHQ</span>
      </div>
      <span>${createdDate}</span>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// Helper Functions
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
}

// Create a visible render container for html2canvas
function createRenderContainer(html: string): HTMLElement {
  const container = document.createElement('div');
  // Use opacity and z-index - html2canvas needs element in viewport
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '800px';
  container.style.minHeight = '100px';
  container.style.backgroundColor = '#ffffff';
  container.style.opacity = '0';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

// Wait for browser render
function waitForRender(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export agent report to HTML file
 */
export function exportReportToHtml(report: AgentReport, options: ExportOptions = {}): void {
  const filename = options.filename || `${sanitizeFilename(report.target)}_report.html`;
  const html = buildReportHtml(report, options);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export agent report to PDF file
 */
export async function exportReportToPdf(report: AgentReport, options: ExportOptions = {}): Promise<void> {
  const filename = options.filename || `${sanitizeFilename(report.target)}_report.pdf`;
  const html = buildReportHtml(report, { ...options, includeCoverPage: true });

  // Create render container
  const container = createRenderContainer(html);

  try {
    // Wait for styles to apply
    await waitForRender();
    
    // Force layout calculation
    const containerWidth = container.scrollWidth || 800;
    const containerHeight = container.scrollHeight || 500;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const renderWidth = pageWidth - margin * 2;

    // Make container visible for html2canvas
    container.style.opacity = '1';
    await waitForRender();

    await pdf.html(container, {
      x: margin,
      y: margin,
      width: renderWidth,
      windowWidth: containerWidth,
      autoPaging: 'text',
      html2canvas: {
        scale: 0.85,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: containerWidth,
        windowHeight: containerHeight,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Ensure cloned element is fully visible
          const clonedContainer = clonedDoc.body.querySelector('div');
          if (clonedContainer) {
            (clonedContainer as HTMLElement).style.opacity = '1';
            (clonedContainer as HTMLElement).style.position = 'static';
          }
        }
      },
    });

    // Add page numbers
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(150);
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );
    }

    pdf.save(filename);
  } catch (error) {
    console.error('[agentReportExport] PDF export error:', error);
    throw new Error('Failed to export PDF. Please try the HTML export instead.');
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Save agent report to file library as a document
 */
export async function saveReportToFileLibrary(
  report: AgentReport,
  userId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string; documentId?: string }> {
  try {
    const goalInfo = GOAL_INFO[report.goal] || { label: report.goal, emoji: '📋' };
    
    // Generate styled HTML for the file library
    const styledHtml = buildReportHtml(report, { includeStyles: true });
    
    // Create document data matching the documents table schema
    const docData = {
      name: `${goalInfo.emoji} ${report.target} - Research Report.html`,
      module: 'workspace',
      mime_type: 'text/html',
      content: styledHtml,
      notes: {
        agent_slug: report.agent_slug,
        goal: report.goal,
        target: report.target,
        original_notes: report.notes,
        sources_count: report.sources?.length || 0,
        original_report_id: report.id,
        generated_at: report.created_at,
        source: 'research_agent',
        tags: ['research', 'agent-report', report.goal],
      },
    };

    const { data, error } = await DatabaseService.createDocument(userId, workspaceId, docData);

    if (error) {
      console.error('[agentReportExport] Error saving to file library:', error);
      return { success: false, error: 'Failed to save document to file library' };
    }

    return { success: true, documentId: data?.id };
  } catch (err) {
    console.error('[agentReportExport] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get HTML content for preview/display
 */
export function getReportHtmlContent(report: AgentReport, options: ExportOptions = {}): string {
  return buildReportHtml(report, options);
}
