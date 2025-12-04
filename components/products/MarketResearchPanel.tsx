import React, { useMemo, useState, useCallback } from 'react';
import { useCopyToClipboard } from '../../hooks';
import { Globe, Copy, Download, Sparkles, Check, FileText, ChevronDown, Save, Share2, Loader2 } from 'lucide-react';
import { saveMarketBrief, type SavedMarketBrief } from '../../lib/services/reportSharingService';
import { ShareReportDialog } from '../shared/ShareReportDialog';
import { showSuccess, showError } from '../../lib/utils/toast';

interface MarketResearchPanelProps {
  query: string;
  rawReport: string | null;
  isLoading?: boolean;
  onClose: () => void;
  workspaceId?: string;
  productId?: string;
}

/**
 * Escapes HTML special characters to prevent XSS in exported files
 */
const escapeHtml = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Sanitizes URLs to only allow safe protocols
 */
const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  // Only allow http, https, and mailto protocols
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:')) {
    return escapeHtml(trimmed);
  }
  // Block javascript:, data:, and other potentially dangerous protocols
  return '#';
};

// Convert markdown to styled HTML (with security-safe escaping)
const markdownToHtml = (markdown: string): string => {
  let html = markdown;
  
  // Escape HTML first using our secure escapeHtml function
  html = escapeHtml(html);
  
  // Process code blocks first (before other transformations)
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.slice(3, -3).trim();
    return `<pre class="md-code-block"><code>${code}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  
  // Headers (must come before bold processing)
  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^#{3}\s+(.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^#{2}\s+(.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^#{1}\s+(.+)$/gm, '<h1 class="md-h1">$1</h1>');
  
  // Horizontal rules
  html = html.replace(/^[-*_]{3,}$/gm, '<hr class="md-hr">');
  
  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Links - convert &lt;url&gt; back to proper links (with URL sanitization)
  html = html.replace(/&lt;(https?:\/\/[^&]+)&gt;/g, (_, url) => {
    const safeUrl = sanitizeUrl(url.replace(/&amp;/g, '&'));
    return `<a href="${safeUrl}" class="md-link" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const safeUrl = sanitizeUrl(url);
    return `<a href="${safeUrl}" class="md-link" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  
  // Tables - complex parsing
  const tableRegex = /(\|.+\|[\r\n]+\|[-:\s|]+\|[\r\n]+(?:\|.+\|[\r\n]*)+)/g;
  html = html.replace(tableRegex, (tableMatch) => {
    const rows = tableMatch.trim().split('\n').filter(row => row.trim());
    if (rows.length < 2) return tableMatch;
    
    // Header row
    const headerCells = rows[0].split('|').filter(cell => cell.trim());
    // Skip separator row (index 1)
    const bodyRows = rows.slice(2);
    
    let tableHtml = '<div class="md-table-wrapper"><table class="md-table"><thead><tr>';
    headerCells.forEach(cell => {
      tableHtml += `<th>${cell.trim()}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    
    bodyRows.forEach(row => {
      const cells = row.split('|').filter(cell => cell.trim() !== '');
      if (cells.length > 0) {
        tableHtml += '<tr>';
        cells.forEach(cell => {
          tableHtml += `<td>${cell.trim()}</td>`;
        });
        tableHtml += '</tr>';
      }
    });
    
    tableHtml += '</tbody></table></div>';
    return tableHtml;
  });
  
  // Lists - unordered
  html = html.replace(/^[-*•]\s+(.+)$/gm, '<li class="md-li">$1</li>');
  html = html.replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul">$&</ul>');
  
  // Lists - ordered
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="md-li-ordered">$1</li>');
  html = html.replace(/(<li class="md-li-ordered">.*<\/li>\n?)+/g, '<ol class="md-ol">$&</ol>');
  
  // Blockquotes
  html = html.replace(/^&gt;\s*(.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');
  
  // Paragraphs - wrap remaining text blocks
  html = html.split('\n\n').map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // Don't wrap if already has block-level element
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || 
        trimmed.startsWith('<table') || trimmed.startsWith('<div') || trimmed.startsWith('<pre') ||
        trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr')) {
      return trimmed;
    }
    return `<p class="md-p">${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('\n\n');
  
  return html;
};

// Generate beautiful HTML report (with proper escaping for security)
const generateHtmlReport = (
  query: string,
  keyFacts: { label: string; value: string }[],
  pricingHighlights: string[],
  insightSections: { title: string; bullets: string[] }[],
  heroLine: string,
  rawReport: string
) => {
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Escape all user-controlled content to prevent XSS
  const safeQuery = escapeHtml(query);
  const safeHeroLine = escapeHtml(heroLine);
  const safeKeyFacts = keyFacts.map(f => ({
    label: escapeHtml(f.label),
    value: escapeHtml(f.value)
  }));
  const safePricingHighlights = pricingHighlights.map(p => escapeHtml(p));
  const safeInsightSections = insightSections.map(s => ({
    title: escapeHtml(s.title),
    bullets: s.bullets.map(b => escapeHtml(b))
  }));
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market Research Brief: ${safeQuery}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      min-height: 100vh;
      padding: 40px 20px;
      color: #1e293b;
      line-height: 1.6;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #3730a3 50%, #2563eb 100%);
      color: white;
      padding: 48px;
      position: relative;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    
    .header-content { position: relative; z-index: 1; }
    
    .label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      opacity: 0.7;
      margin-bottom: 8px;
    }
    
    .title {
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 12px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .subtitle {
      font-size: 16px;
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .subtitle svg {
      width: 18px;
      height: 18px;
    }
    
    .meta {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.2);
      display: flex;
      gap: 32px;
      font-size: 13px;
      opacity: 0.8;
    }
    
    .content {
      padding: 48px;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .section-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, #e2e8f0, transparent);
    }
    
    .facts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }
    
    .fact-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
    }
    
    .fact-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 8px;
    }
    
    .fact-value {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .pricing-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fce7f3 100%);
      border: 1px solid #fcd34d;
      border-radius: 20px;
      padding: 28px;
    }
    
    .pricing-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #b45309;
      margin-bottom: 16px;
    }
    
    .pricing-list {
      list-style: none;
    }
    
    .pricing-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(180, 83, 9, 0.1);
    }
    
    .pricing-item:last-child {
      border-bottom: none;
    }
    
    .pricing-dot {
      width: 8px;
      height: 8px;
      background: #f59e0b;
      border-radius: 50%;
      margin-top: 6px;
      flex-shrink: 0;
    }
    
    .pricing-text {
      font-size: 15px;
      color: #78350f;
      line-height: 1.5;
    }
    
    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .insight-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border: 2px solid #f1f5f9;
      border-radius: 20px;
      padding: 24px;
    }
    
    .insight-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 16px;
    }
    
    .insight-list {
      list-style: none;
    }
    
    .insight-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 8px 0;
    }
    
    .insight-dot {
      width: 6px;
      height: 6px;
      background: #94a3b8;
      border-radius: 50%;
      margin-top: 8px;
      flex-shrink: 0;
    }
    
    .insight-text {
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
    }
    
    .raw-report {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 32px;
      margin-top: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    
    .raw-report-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #3730a3;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .raw-report-content {
      font-size: 15px;
      color: #334155;
      line-height: 1.8;
    }
    
    /* Markdown Styled Elements */
    .md-h1 {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin: 32px 0 16px 0;
      padding-bottom: 12px;
      border-bottom: 3px solid #3730a3;
    }
    
    .md-h2 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 28px 0 14px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .md-h3 {
      font-size: 18px;
      font-weight: 600;
      color: #334155;
      margin: 24px 0 12px 0;
    }
    
    .md-h4 {
      font-size: 15px;
      font-weight: 600;
      color: #475569;
      margin: 20px 0 10px 0;
    }
    
    .md-p {
      margin: 16px 0;
      color: #475569;
    }
    
    .md-hr {
      border: none;
      height: 2px;
      background: linear-gradient(90deg, #e2e8f0, #3730a3, #e2e8f0);
      margin: 32px 0;
    }
    
    .md-table-wrapper {
      overflow-x: auto;
      margin: 24px 0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    
    .md-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      background: white;
    }
    
    .md-table th {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      color: white;
      font-weight: 600;
      text-align: left;
      padding: 14px 16px;
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    
    .md-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      color: #475569;
    }
    
    .md-table tr:nth-child(even) {
      background: #f8fafc;
    }
    
    .md-table tr:hover {
      background: #f1f5f9;
    }
    
    .md-ul, .md-ol {
      margin: 16px 0;
      padding-left: 24px;
    }
    
    .md-li, .md-li-ordered {
      margin: 8px 0;
      color: #475569;
      line-height: 1.6;
    }
    
    .md-li::marker {
      color: #3730a3;
    }
    
    .md-blockquote {
      border-left: 4px solid #3730a3;
      background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 0 12px 12px 0;
      font-style: italic;
      color: #475569;
    }
    
    .md-link {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px solid #93c5fd;
      transition: all 0.2s;
    }
    
    .md-link:hover {
      color: #1d4ed8;
      border-bottom-color: #2563eb;
    }
    
    .md-code-block {
      background: #1e293b;
      color: #e2e8f0;
      padding: 20px;
      border-radius: 12px;
      overflow-x: auto;
      margin: 20px 0;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    
    .md-inline-code {
      background: #f1f5f9;
      color: #be185d;
      padding: 2px 8px;
      border-radius: 6px;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.9em;
    }
    
    strong {
      font-weight: 600;
      color: #1e293b;
    }
    
    em {
      font-style: italic;
      color: #475569;
    }
    
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px 48px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    
    .footer-logo {
      font-weight: 700;
      color: #3730a3;
    }
    
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; border-radius: 0; }
      .header { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .pricing-box { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
    
    @media (max-width: 600px) {
      .header { padding: 32px 24px; }
      .title { font-size: 28px; }
      .content { padding: 24px; }
      .meta { flex-direction: column; gap: 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="header-content">
        <p class="label">Market Research Brief</p>
        <h1 class="title">${safeQuery}</h1>
        <p class="subtitle">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          ${safeHeroLine}
        </p>
        <div class="meta">
          <span>📅 Generated: ${date}</span>
          <span>🔍 Source: Live Web Research</span>
          <span>📊 Powered by AI</span>
        </div>
      </div>
    </header>
    
    <div class="content">
      ${safeKeyFacts.length > 0 ? `
      <section class="section">
        <h2 class="section-title">Key Facts</h2>
        <div class="facts-grid">
          ${safeKeyFacts.map(fact => `
          <div class="fact-card">
            <p class="fact-label">${fact.label}</p>
            <p class="fact-value">${fact.value}</p>
          </div>
          `).join('')}
        </div>
      </section>
      ` : ''}
      
      ${safePricingHighlights.length > 0 ? `
      <section class="section">
        <div class="pricing-box">
          <h2 class="pricing-title">💰 Pricing Signals</h2>
          <ul class="pricing-list">
            ${safePricingHighlights.map(line => `
            <li class="pricing-item">
              <span class="pricing-dot"></span>
              <span class="pricing-text">${line}</span>
            </li>
            `).join('')}
          </ul>
        </div>
      </section>
      ` : ''}
      
      ${safeInsightSections.length > 0 ? `
      <section class="section">
        <h2 class="section-title">Insights & Analysis</h2>
        <div class="insights-grid">
          ${safeInsightSections.map(section => `
          <div class="insight-card">
            <h3 class="insight-title">${section.title}</h3>
            <ul class="insight-list">
              ${section.bullets.map(bullet => `
              <li class="insight-item">
                <span class="insight-dot"></span>
                <span class="insight-text">${bullet}</span>
              </li>
              `).join('')}
            </ul>
          </div>
          `).join('')}
        </div>
      </section>
      ` : ''}
      
      <div class="raw-report">
        <h3 class="raw-report-title">📝 Full Research Notes</h3>
        <div class="raw-report-content">${markdownToHtml(rawReport)}</div>
      </div>
    </div>
    
    <footer class="footer">
      <p>Generated by <span class="footer-logo">Setique FounderHQ</span> • Market Intelligence Platform</p>
      <p style="margin-top: 8px; opacity: 0.7;">This report was compiled from live web sources. Verify critical data before making business decisions.</p>
    </footer>
  </div>
</body>
</html>`;
};

const sanitizeReport = (raw: string) =>
  raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/```/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    // Remove Jina reader/summarizer disclaimers and notices
    .replace(/r\.jina\.ai[^\n]*/gi, '')
    .replace(/jina\.ai[^\n]*/gi, '')
    .replace(/\[via jina[^\]]*\]/gi, '')
    .replace(/\(via jina[^\)]*\)/gi, '')
    .replace(/powered by jina[^\n]*/gi, '')
    .replace(/source:\s*jina[^\n]*/gi, '')
    .replace(/summarized by[^\n]*jina[^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const stripMarkdownTokens = (value: string) =>
  value
    .replace(/^[#>*\s|]+/g, '')
    .replace(/[*_`]/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+\|\s*$/g, '')
    .replace(/\s+/g, ' ')
    // Remove any Jina references in stripped content
    .replace(/r\.jina\.ai/gi, '')
    .replace(/jina\.ai/gi, '')
    .trim();

const extractKeyFacts = (normalized: string) => {
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !line.includes('|') && !/^[-]{3,}$/.test(line));

  const facts: { label: string; value: string }[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const cleaned = line.replace(/^[•\-*\t]+/g, '').trim();
    const colonIndex = cleaned.indexOf(':');

    if (colonIndex > 2 && colonIndex < 60) {
      const label = cleaned.slice(0, colonIndex).trim();
      const value = cleaned.slice(colonIndex + 1).trim();

      const cleanLabel = stripMarkdownTokens(label);
      const cleanValue = stripMarkdownTokens(value);
      const isPricingFact = /\$|price|pricing|cost/i.test(cleanLabel) || /\$|price|pricing|cost/i.test(cleanValue);

      const key = `${cleanLabel}|${cleanValue}`;
      if (cleanLabel && cleanValue && !isPricingFact && !cleanLabel.match(/^(Aspect|Details)$/i) && !seen.has(key)) {
        facts.push({ label: cleanLabel, value: cleanValue });
        seen.add(key);
      }
    }
  }

  return facts.slice(0, 8);
};

const extractPricingHighlights = (normalized: string) => {
  const seen = new Set<string>();
  return normalized
    .split('\n')
    .map((line) => stripMarkdownTokens(line))
    .map((line) => line.replace(/^[-•*\s]+/, ''))
    .filter((line) => /\$|%/.test(line) && !line.includes('|'))
    .filter((line) => {
      if (!line) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
};

interface InsightSection {
  title: string;
  bullets: string[];
}

const buildInsightSections = (normalized: string): InsightSection[] => {
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const sections: InsightSection[] = [];
  let current: InsightSection | null = null;
  const seenBullets = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.includes('|') || /^[-]{3,}$/.test(line)) continue;

    const headingMatch = line.match(/^#{1,4}\s+(.*)/);
    if (headingMatch) {
      const title = stripMarkdownTokens(headingMatch[1]);
      current = { title: title || 'Insights', bullets: [] };
      sections.push(current);
      continue;
    }

    const bulletText = stripMarkdownTokens(line.replace(/^(?:[-•*]|[0-9]+\.)\s+/, ''));
    if (!current) {
      current = { title: 'Insights', bullets: [] };
      sections.push(current);
    }
    if (bulletText) {
      const key = bulletText.toLowerCase();
      if (!seenBullets.has(key)) {
        current.bullets.push(bulletText);
        seenBullets.add(key);
      }
    }
  }

  const seenTitles = new Set<string>();

  return sections
    .map((section) => {
      let title = section.title || 'Insights';
      if (seenTitles.has(title)) {
        let suffix = 2;
        while (seenTitles.has(`${title} ${suffix}`)) suffix++;
        title = `${title} ${suffix}`;
      }
      seenTitles.add(title);
      return {
        title,
        bullets: section.bullets.filter(Boolean).slice(0, 5),
      };
    })
    .filter((section) => section.bullets.length > 0)
    .slice(0, 3);
};

export const MarketResearchPanel: React.FC<MarketResearchPanelProps> = ({
  query,
  rawReport,
  isLoading,
  onClose,
  workspaceId,
  productId,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedBrief, setSavedBrief] = useState<SavedMarketBrief | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const normalized = useMemo(() => sanitizeReport(rawReport ?? ''), [rawReport]);
  const keyFacts = useMemo(() => extractKeyFacts(normalized), [normalized]);
  const pricingHighlights = useMemo(() => extractPricingHighlights(normalized), [normalized]);
  const insightSections = useMemo(() => buildInsightSections(normalized), [normalized]);

  const heroLine = useMemo(() => {
    const firstMeaningful = normalized
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('Aspect') && !line.includes('Market Research'));

    const cleaned = firstMeaningful ? stripMarkdownTokens(firstMeaningful) : '';
    return cleaned || 'Fresh insights generated from live sources and product context.';
  }, [normalized]);

  const { isCopied, copy } = useCopyToClipboard();

  const handleCopy = async () => {
    if (!rawReport) return;
    await copy(rawReport);
  };

  const handleDownloadMarkdown = () => {
    if (!rawReport) return;
    const blob = new Blob([rawReport], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${query.replace(/\s+/g, '_')}_market_research.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleDownloadHtml = () => {
    if (!rawReport) return;
    const html = generateHtmlReport(query, keyFacts, pricingHighlights, insightSections, heroLine, rawReport);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${query.replace(/\s+/g, '_')}_market_research.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleDownloadPdf = () => {
    if (!rawReport) return;
    const html = generateHtmlReport(query, keyFacts, pricingHighlights, insightSections, heroLine, rawReport);
    
    // Open in new window for printing to PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Wait for content to load then trigger print dialog
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
    setShowExportMenu(false);
  };

  const handleOpenInNewTab = () => {
    if (!rawReport) return;
    const html = generateHtmlReport(query, keyFacts, pricingHighlights, insightSections, heroLine, rawReport);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setShowExportMenu(false);
  };

  const handleSaveBrief = useCallback(async () => {
    if (!rawReport || !workspaceId) {
      showError('Cannot save: missing report or workspace');
      return;
    }
    
    setIsSaving(true);
    try {
      const result = await saveMarketBrief({
        workspaceId,
        productId,
        query,
        rawReport,
        keyFacts,
        pricingHighlights: pricingHighlights.map(h => ({ label: 'Pricing', value: h })),
        insightSections,
        heroLine,
      });

      if (result.success && result.brief) {
        setSavedBrief(result.brief);
        showSuccess('Market brief saved!');
        setShowExportMenu(false);
      } else {
        showError(result.error || 'Failed to save brief');
      }
    } catch (err) {
      showError('Failed to save brief');
    } finally {
      setIsSaving(false);
    }
  }, [rawReport, workspaceId, productId, query, keyFacts, pricingHighlights, insightSections, heroLine]);

  const handleShareBrief = useCallback(() => {
    if (!savedBrief) {
      // Need to save first
      handleSaveBrief().then(() => {
        // After saving, check if it was successful
        // The savedBrief state will be updated
      });
      return;
    }
    setShowShareDialog(true);
    setShowExportMenu(false);
  }, [savedBrief, handleSaveBrief]);

  return (
    <div className="relative rounded-2xl border border-gray-200 shadow-lg bg-white overflow-hidden animate-fadeIn">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-800 to-blue-600 text-white px-6 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Market Research Brief</p>
          <h3 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">{query}</h3>
          <p className="text-blue-100 text-sm mt-1 flex items-center gap-2">
            <Globe className="w-4 h-4" /> {heroLine}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
          >
            {isCopied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
          
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
            >
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden z-50">
                {/* Save Brief Button */}
                {workspaceId && (
                  <button
                    onClick={handleSaveBrief}
                    disabled={isSaving || !!savedBrief}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <div className="text-left">
                      <div className="font-medium">{savedBrief ? 'Saved ✓' : 'Save Brief'}</div>
                      <div className="text-xs text-slate-500">{savedBrief ? 'Brief is saved' : 'Save to workspace'}</div>
                    </div>
                  </button>
                )}
                
                {/* Share Brief Button */}
                {workspaceId && (
                  <button
                    onClick={() => {
                      if (!savedBrief) {
                        // Save first, then open share
                        handleSaveBrief().then(() => {
                          setTimeout(() => setShowShareDialog(true), 100);
                        });
                      } else {
                        setShowShareDialog(true);
                        setShowExportMenu(false);
                      }
                    }}
                    disabled={isSaving}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors border-t border-slate-100 disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">Share Brief</div>
                      <div className="text-xs text-slate-500">{savedBrief ? 'Create share link' : 'Save & share'}</div>
                    </div>
                  </button>
                )}
                
                {workspaceId && <div className="border-t border-slate-200 my-1" />}
                
                <button
                  onClick={handleDownloadHtml}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">Download HTML</div>
                    <div className="text-xs text-slate-500">Beautiful styled report</div>
                  </div>
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-t border-slate-100"
                >
                  <FileText className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">Save as PDF</div>
                    <div className="text-xs text-slate-500">Print dialog for PDF</div>
                  </div>
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-t border-slate-100"
                >
                  <Globe className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">Open in New Tab</div>
                    <div className="text-xs text-slate-500">View full report</div>
                  </div>
                </button>
                <button
                  onClick={handleDownloadMarkdown}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-t border-slate-100"
                >
                  <Download className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">Download Markdown</div>
                    <div className="text-xs text-slate-500">Plain text format</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="rounded-full border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
          >
            Close
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {isLoading && !rawReport && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold">
              <Sparkles className="w-4 h-4 animate-pulse" /> Running market scan...
            </div>
            <p className="text-xs mt-2">We search real distributor data, analyst notes and news before summarizing.</p>
          </div>
        )}

        {rawReport && isLoading && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">
            Updating this brief with the freshest data...
          </div>
        )}

        {(!isLoading || !!rawReport) && (
          <>
            {keyFacts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {keyFacts.map((fact) => (
                  <div
                    key={`${fact.label}-${fact.value}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-inner"
                  >
                    <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">{fact.label}</p>
                    <p className="text-base font-medium text-slate-800 mt-2 leading-snug">{fact.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 px-4 py-4 text-center text-sm text-slate-500">
                We’ll add brand snapshots here once we detect non-pricing facts.
              </div>
            )}

            {pricingHighlights.length > 0 ? (
              <div className="rounded-3xl border border-black/10 bg-gradient-to-r from-amber-50 to-rose-50 p-5 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600">Pricing Signals</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-800">
                  {pricingHighlights.map((line, index) => (
                    <li key={`${line}-${index}`} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                      <span className="leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-amber-200 p-5 text-center text-sm text-amber-700">
                No live pricing trends detected yet. Try refining the query with a SKU or retailer.
              </div>
            )}

            {insightSections.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {insightSections.map((section) => (
                  <div key={section.title} className="rounded-3xl border-2 border-slate-900/5 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{section.title}</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-800">
                      {section.bullets.map((bullet, idx) => (
                        <li key={`${section.title}-${idx}`} className="flex gap-3">
                          <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-slate-400" />
                          <span className="leading-relaxed text-slate-700">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 p-6 text-center text-slate-500">
                {rawReport ? 'Insights ready, but the formatter could not extract highlighted sections.' : 'No findings yet. Ask another question to build a research brief.'}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Share Dialog */}
      {savedBrief && (
        <ShareReportDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          reportId={savedBrief.id}
          reportType="brief"
          reportTitle={query}
          existingToken={savedBrief.share_token}
        />
      )}
    </div>
  );
};
