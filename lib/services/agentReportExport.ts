// lib/services/agentReportExport.ts
// Export agent reports to HTML, PDF, and save to file library

import { jsPDF } from 'jspdf';
import { DatabaseService } from './database';
import type { AgentReport } from './agentReportService';
import type { AgentSource } from './youAgentClient';

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
}

// ============================================================================
// Constants
// ============================================================================

const GOAL_INFO: Record<string, GoalInfo> = {
  icp: { label: 'ICP & Pain Points Analysis', color: '#10b981', emoji: '👥' },
  competitive: { label: 'Competitive Analysis', color: '#ef4444', emoji: '⚔️' },
  angles: { label: 'Outreach Angles', color: '#f59e0b', emoji: '💡' },
  market: { label: 'Market & Trends Brief', color: '#8b5cf6', emoji: '📈' },
};

const BRAND_YELLOW = '#facc15';
const BRAND_DARK = '#0f172a';

// ============================================================================
// Styles
// ============================================================================

const getReportStyles = (brandColor: string = BRAND_YELLOW) => `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.7;
    color: #1f2937;
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
  }

  .report-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 48px 40px;
  }

  /* Cover Page */
  .cover-page {
    min-height: 85vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 0;
    page-break-after: always;
  }

  .cover-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: linear-gradient(135deg, ${brandColor}20, ${brandColor}10);
    border: 1px solid ${brandColor};
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
    color: ${BRAND_DARK};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 24px;
    width: fit-content;
  }

  .cover-title {
    font-size: 42px;
    font-weight: 800;
    line-height: 1.15;
    color: ${BRAND_DARK};
    margin-bottom: 16px;
    letter-spacing: -0.02em;
  }

  .cover-subtitle {
    font-size: 20px;
    color: #64748b;
    margin-bottom: 32px;
    max-width: 600px;
  }

  .cover-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    font-size: 14px;
    color: #64748b;
    padding-top: 24px;
    border-top: 1px solid #e2e8f0;
  }

  .cover-meta-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cover-meta-label {
    font-weight: 500;
    color: #94a3b8;
  }

  .cover-accent-bar {
    height: 6px;
    width: 120px;
    background: linear-gradient(90deg, ${brandColor}, #facc15);
    border-radius: 100px;
    margin-top: 32px;
  }

  /* Content Section */
  .content-section {
    padding: 40px 0;
  }

  /* Headings */
  h1 {
    font-size: 28px;
    font-weight: 700;
    color: ${BRAND_DARK};
    margin: 48px 0 20px 0;
    padding-bottom: 12px;
    border-bottom: 2px solid #f1f5f9;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h1:first-child {
    margin-top: 0;
  }

  h2 {
    font-size: 22px;
    font-weight: 600;
    color: #1e293b;
    margin: 36px 0 16px 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #334155;
    margin: 28px 0 12px 0;
  }

  h4 {
    font-size: 16px;
    font-weight: 600;
    color: #475569;
    margin: 20px 0 10px 0;
  }

  /* Paragraphs */
  p {
    font-size: 15px;
    color: #374151;
    margin-bottom: 16px;
    line-height: 1.75;
  }

  /* Lists */
  ul, ol {
    margin: 16px 0 24px 0;
    padding-left: 0;
  }

  ul {
    list-style: none;
  }

  ul li {
    position: relative;
    padding-left: 24px;
    margin-bottom: 12px;
    font-size: 15px;
    color: #374151;
    line-height: 1.65;
  }

  ul li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    width: 8px;
    height: 8px;
    background: ${brandColor};
    border-radius: 50%;
  }

  ol {
    list-style: none;
    counter-reset: item;
  }

  ol li {
    position: relative;
    padding-left: 32px;
    margin-bottom: 12px;
    font-size: 15px;
    color: #374151;
    line-height: 1.65;
    counter-increment: item;
  }

  ol li::before {
    content: counter(item);
    position: absolute;
    left: 0;
    top: 0;
    width: 22px;
    height: 22px;
    background: ${brandColor};
    color: ${BRAND_DARK};
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  /* Strong/Bold */
  strong {
    font-weight: 600;
    color: #1e293b;
  }

  /* Emphasis/Italic */
  em {
    font-style: italic;
    color: #475569;
  }

  /* Links */
  a {
    color: #2563eb;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  /* Inline code */
  code {
    background: #f1f5f9;
    padding: 3px 8px;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: 13px;
    color: #be185d;
  }

  /* Code blocks */
  pre {
    background: #1e293b;
    color: #e2e8f0;
    padding: 20px 24px;
    border-radius: 12px;
    overflow-x: auto;
    margin: 20px 0;
    font-size: 13px;
    line-height: 1.6;
  }

  pre code {
    background: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }

  /* Blockquotes */
  blockquote {
    border-left: 4px solid ${brandColor};
    background: linear-gradient(90deg, ${brandColor}10, transparent);
    padding: 16px 24px;
    margin: 24px 0;
    border-radius: 0 8px 8px 0;
  }

  blockquote p {
    font-style: italic;
    color: #475569;
    margin: 0;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;
    font-size: 14px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }

  th {
    background: #f8fafc;
    font-weight: 600;
    text-align: left;
    padding: 14px 16px;
    color: #1e293b;
    border-bottom: 2px solid #e2e8f0;
  }

  td {
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #475569;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: #f8fafc;
  }

  /* Horizontal rules */
  hr {
    border: none;
    height: 1px;
    background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
    margin: 40px 0;
  }

  /* Sources Section */
  .sources-section {
    margin-top: 48px;
    padding-top: 32px;
    border-top: 2px solid #f1f5f9;
    page-break-inside: avoid;
  }

  .sources-title {
    font-size: 18px;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sources-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .source-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .source-card:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    text-decoration: none;
  }

  .source-icon {
    width: 32px;
    height: 32px;
    background: #e2e8f0;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 14px;
  }

  .source-content {
    flex: 1;
    min-width: 0;
  }

  .source-title {
    font-size: 13px;
    font-weight: 500;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }

  .source-domain {
    font-size: 12px;
    color: #94a3b8;
  }

  /* Footer */
  .report-footer {
    margin-top: 60px;
    padding-top: 24px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #94a3b8;
  }

  .footer-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }

  .footer-brand-icon {
    width: 20px;
    height: 20px;
    background: ${brandColor};
    border-radius: 4px;
  }

  /* Print styles */
  @media print {
    body {
      background: white;
    }

    .report-container {
      padding: 0;
      max-width: none;
    }

    .cover-page {
      min-height: auto;
      padding: 40px 0;
    }

    .sources-grid {
      grid-template-columns: 1fr;
    }

    a {
      color: #1e293b;
    }

    a::after {
      content: ' (' attr(href) ')';
      font-size: 11px;
      color: #64748b;
    }
  }

  @page {
    margin: 1in;
  }
`;

// ============================================================================
// Markdown to HTML Converter
// ============================================================================

function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML entities first (except for our markdown syntax)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (before other processing)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Tables
  html = html.replace(/^\|(.+)\|\n\|[-:| ]+\|\n((?:\|.+\|\n?)+)/gm, (match, headerRow, bodyRows) => {
    const headers = headerRow.split('|').map((h: string) => h.trim()).filter(Boolean);
    const headerHtml = headers.map((h: string) => `<th>${h}</th>`).join('');
    
    const rows = bodyRows.trim().split('\n').map((row: string) => {
      const cells = row.split('|').map((c: string) => c.trim()).filter(Boolean);
      return `<tr>${cells.map((c: string) => `<td>${c}</td>`).join('')}</tr>`;
    }).join('');

    return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Headers (must be at start of line)
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

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
    const isBlockElement = /^<(h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|pre|blockquote|hr|div)/.test(trimmed) ||
                           /<\/(h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|pre|blockquote|div)>$/.test(trimmed);

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
      <div class="cover-accent-bar"></div>
    </div>
  ` : '';

  const sourcesHtml = includeSources && report.sources && report.sources.length > 0 ? `
    <div class="sources-section">
      <h3 class="sources-title">
        <span>🔗</span>
        Sources (${report.sources.length})
      </h3>
      <div class="sources-grid">
        ${report.sources.slice(0, 12).map((source: AgentSource) => {
          const domain = getDomain(source.url);
          return `
            <a href="${escapeHtml(source.url)}" class="source-card" target="_blank" rel="noopener noreferrer">
              <div class="source-icon">🌐</div>
              <div class="source-content">
                <div class="source-title">${escapeHtml(source.title || domain)}</div>
                <div class="source-domain">${escapeHtml(domain)}</div>
              </div>
            </a>
          `;
        }).join('')}
      </div>
      ${report.sources.length > 12 ? `<p style="margin-top: 12px; font-size: 13px; color: #94a3b8;">+${report.sources.length - 12} more sources</p>` : ''}
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

  // Create a hidden container for rendering
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 800px;
    background: white;
  `;
  document.body.appendChild(container);

  // Wait for styles to apply
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;

    await pdf.html(container, {
      x: margin,
      y: margin,
      width: pageWidth - margin * 2,
      windowWidth: 800,
      html2canvas: {
        scale: 0.75,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      },
      autoPaging: 'text',
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
